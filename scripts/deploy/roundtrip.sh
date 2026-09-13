#!/bin/bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
source ./lib.sh

SHA="$(require_sha "${1:-}")"
require_cmd curl
require_cmd ssh

URL="https://$INSTANCE_HOST/health"
log "polling $URL (timeout ${ROUNDTRIP_TIMEOUT_SECONDS}s)"

DEADLINE=$((SECONDS + ROUNDTRIP_TIMEOUT_SECONDS))
until curl -fsS --max-time 5 "$URL" >/dev/null 2>&1; do
  if [ "$SECONDS" -ge "$DEADLINE" ]; then
    fail "timed out waiting for $URL to respond"
  fi
  sleep 2
done
log "app is reachable"

# There is no HTTP version endpoint (deliberately - this change adds no
# application code). Confirm the deployed sha by asking the instance
# what image tag the running backend/web containers actually use.
log "confirming running containers are tagged $SHA"
RUNNING_TAGS="$(ssh_app "docker inspect --format '{{.Config.Image}}' \
  \$(docker compose -f $REMOTE_APP_DIR/docker-compose.prod.yml ps -q backend web)")"

echo "$RUNNING_TAGS" | grep -q ":$SHA\$" || fail "running containers are not tagged $SHA (got: $RUNNING_TAGS)"
echo "$RUNNING_TAGS" | grep -c ":$SHA\$" | grep -q "^2\$" || fail "expected both backend and web tagged $SHA (got: $RUNNING_TAGS)"

log "roundtrip OK - $SHA is live at https://$INSTANCE_HOST"
