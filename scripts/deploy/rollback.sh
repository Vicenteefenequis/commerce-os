#!/bin/bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
source ./lib.sh

SHA="$(require_sha "${1:-}")"

log "rolling back to $SHA"
log "note: this re-runs 'migrate up' for $SHA's migrations, it does not run 'migrate:down' - only roll back to a sha whose schema is backward-compatible with what's currently applied"

./deploy.sh "$SHA"
./roundtrip.sh "$SHA"

log "rollback to $SHA complete"
