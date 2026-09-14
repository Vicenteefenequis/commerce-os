#!/bin/bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
source ./lib.sh

SHA="$(require_sha "${1:-}")"
require_cmd ssh
require_cmd scp

TARBALL_NAME="$(release_tarball_name "$SHA")"
S3_KEY="$(release_s3_key "$SHA")"

log "syncing docker-compose.prod.yml to $INSTANCE_HOST:$REMOTE_APP_DIR (no secrets in this file)"
scp -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=accept-new \
  "$REPO_ROOT/docker-compose.prod.yml" \
  "$SSH_USER@$INSTANCE_HOST:$REMOTE_APP_DIR/docker-compose.prod.yml"

# The remote steps run from an uploaded script file, not a `bash -s`
# heredoc piped over ssh's stdin - `docker compose run` (and anything
# else that touches stdin/tty) previously competed with that same
# stdin stream for the rest of the script, so lines after it silently
# never ran even though ssh still exited 0. Found by deploying for
# real: containers stayed on the old tag after a "successful" deploy.
REMOTE_SCRIPT="$DIST_DIR/remote-deploy-$SHA.sh"
cat >"$REMOTE_SCRIPT" <<EOF
#!/bin/bash
set -euo pipefail

mkdir -p "$REMOTE_RELEASES_DIR"
cd "$REMOTE_RELEASES_DIR"

if [ ! -f "$TARBALL_NAME" ]; then
  echo "[remote] fetching $S3_KEY from s3://$ARTIFACTS_BUCKET (via instance role)"
  aws s3 cp "s3://$ARTIFACTS_BUCKET/$S3_KEY" "$TARBALL_NAME"
fi

echo "[remote] docker load"
docker load -i "$TARBALL_NAME"

cd "$REMOTE_APP_DIR"
[ -f .env ] || { echo "[remote] missing $REMOTE_APP_DIR/.env - bootstrap it once from .env.production.example" >&2; exit 1; }

if grep -q '^RELEASE_SHA=' .env; then
  sed -i "s/^RELEASE_SHA=.*/RELEASE_SHA=$SHA/" .env
else
  echo "RELEASE_SHA=$SHA" >>.env
fi

echo "[remote] running pending migrations"
docker compose -f docker-compose.prod.yml --env-file .env run --rm -T migrate

echo "[remote] starting release $SHA"
docker compose -f docker-compose.prod.yml --env-file .env up -d postgres backend outbox-worker web

echo "[remote] pruning local releases beyond the $LOCAL_RELEASES_KEPT_ON_INSTANCE most recent"
cd "$REMOTE_RELEASES_DIR"
ls -t release-*.tar.gz 2>/dev/null | tail -n +\$(($LOCAL_RELEASES_KEPT_ON_INSTANCE + 1)) | while read -r OLD; do
  echo "[remote] removing \$OLD"
  rm -f "\$OLD"
done
docker image prune -f >/dev/null
EOF

log "deploying $SHA on $INSTANCE_HOST"
scp -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=accept-new \
  "$REMOTE_SCRIPT" "$SSH_USER@$INSTANCE_HOST:/tmp/deploy-$SHA.sh"
ssh_app "chmod +x /tmp/deploy-$SHA.sh && /tmp/deploy-$SHA.sh && rm -f /tmp/deploy-$SHA.sh"
rm -f "$REMOTE_SCRIPT"

log "deployed $SHA"
