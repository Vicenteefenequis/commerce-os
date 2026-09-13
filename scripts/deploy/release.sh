#!/bin/bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
source ./lib.sh

SHA="$(require_sha "${1:-}")"

log "=== release $SHA: build -> package -> upload -> deploy -> roundtrip ==="

./build.sh "$SHA"
./package.sh "$SHA"
./upload.sh "$SHA"
./deploy.sh "$SHA"

if ./roundtrip.sh "$SHA"; then
  log "=== release $SHA complete ==="
else
  log "=== release $SHA FAILED roundtrip - app may be in a bad state ==="
  log "review manually, then run ./rollback.sh <previous-sha> if needed"
  exit 1
fi
