#!/bin/bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
source ./lib.sh

SHA="$(require_sha "${1:-}")"
require_cmd docker

TARBALL="$DIST_DIR/$(release_tarball_name "$SHA")"

log "saving $BACKEND_IMAGE:$SHA and $WEB_IMAGE:$SHA -> $TARBALL"
docker save "$BACKEND_IMAGE:$SHA" "$WEB_IMAGE:$SHA" | gzip >"$TARBALL"

log "verifying tarball loads locally"
docker load -i "$TARBALL" >/dev/null

log "packaged $TARBALL"
