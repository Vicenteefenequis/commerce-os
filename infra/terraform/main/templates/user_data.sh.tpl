#!/bin/bash
set -euo pipefail

dnf install -y docker unzip
systemctl enable --now docker
usermod -aG docker ec2-user

mkdir -p /usr/libexec/docker/cli-plugins
curl -fsSL "https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-linux-x86_64" \
  -o /usr/libexec/docker/cli-plugins/docker-compose
chmod +x /usr/libexec/docker/cli-plugins/docker-compose

curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
unzip -q /tmp/awscliv2.zip -d /tmp
/tmp/aws/install
rm -rf /tmp/awscliv2.zip /tmp/aws

CADDY_VERSION="2.8.4"
curl -fsSL "https://github.com/caddyserver/caddy/releases/download/v$${CADDY_VERSION}/caddy_$${CADDY_VERSION}_linux_amd64.tar.gz" \
  -o /tmp/caddy.tar.gz
tar -xzf /tmp/caddy.tar.gz -C /usr/local/bin caddy
chmod +x /usr/local/bin/caddy
rm -f /tmp/caddy.tar.gz

mkdir -p /etc/caddy /opt/commerce-os/app /opt/commerce-os/releases /opt/commerce-os/backup

# --- Caddy: reverse proxy to the app, TLS via sslip.io + Let's Encrypt ---

cat >/opt/commerce-os/render-caddyfile.sh <<'EOS'
#!/bin/bash
set -euo pipefail
TOKEN=$(curl -fsSL -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 60")
PUBLIC_IP=$(curl -fsSL -H "X-aws-ec2-metadata-token: $TOKEN" \
  "http://169.254.169.254/latest/meta-data/public-ipv4")
HOSTNAME="$${PUBLIC_IP}.sslip.io"

cat >/etc/caddy/Caddyfile <<CADDYFILE
$${HOSTNAME} {
	handle /webhooks/* {
		reverse_proxy 127.0.0.1:4000
	}
	handle /health {
		reverse_proxy 127.0.0.1:4000
	}
	handle {
		reverse_proxy 127.0.0.1:3000
	}
}
CADDYFILE
EOS
chmod +x /opt/commerce-os/render-caddyfile.sh

cat >/etc/systemd/system/caddy.service <<'EOS'
[Unit]
Description=Caddy (commerce-os)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStartPre=/opt/commerce-os/render-caddyfile.sh
ExecStart=/usr/local/bin/caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
ExecReload=/usr/local/bin/caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOS

systemctl daemon-reload
systemctl enable --now caddy

# --- Scheduled pg_dump -> S3 backups/ (5 backups or 15 days, whichever first) ---

cat >/opt/commerce-os/backup/run.sh <<'EOS'
#!/bin/bash
set -euo pipefail
cd /opt/commerce-os/app

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
FILE="/opt/commerce-os/backup/backup-$${STAMP}.sql.gz"

docker compose exec -T postgres sh -c \
  'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip >"$${FILE}"

aws s3 cp "$${FILE}" "s3://${artifacts_bucket}/backups/$(basename "$${FILE}")"
rm -f "$${FILE}"

# Keep at most 5 backups in S3; the bucket lifecycle rule separately
# expires anything older than 15 days regardless of count.
KEYS=$(aws s3api list-objects-v2 --bucket "${artifacts_bucket}" --prefix "backups/" \
  --query 'sort_by(Contents, &LastModified)[].Key' --output text)
COUNT=$(echo "$${KEYS}" | wc -w)
if [ "$${COUNT}" -gt 5 ]; then
  echo "$${KEYS}" | tr '\t' '\n' | head -n "$((COUNT - 5))" | while read -r KEY; do
    [ -n "$${KEY}" ] && aws s3 rm "s3://${artifacts_bucket}/$${KEY}"
  done
fi
EOS
chmod +x /opt/commerce-os/backup/run.sh

cat >/etc/systemd/system/commerce-os-backup.service <<'EOS'
[Unit]
Description=commerce-os pg_dump backup to S3
After=docker.service

[Service]
Type=oneshot
ExecStart=/opt/commerce-os/backup/run.sh
EOS

cat >/etc/systemd/system/commerce-os-backup.timer <<'EOS'
[Unit]
Description=Daily commerce-os pg_dump backup

[Timer]
OnCalendar=*-*-* 03:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOS

systemctl daemon-reload
systemctl enable --now commerce-os-backup.timer
