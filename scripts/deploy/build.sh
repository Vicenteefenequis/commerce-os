#!/bin/bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
source ./lib.sh

SHA="$(require_sha "${1:-}")"
require_cmd docker
require_cmd pnpm

log "running test suite before building anything"
(cd "$REPO_ROOT" && pnpm turbo run test)

log "building $BACKEND_IMAGE:$SHA"
docker build \
  -f "$REPO_ROOT/apps/backend/Dockerfile" \
  -t "$BACKEND_IMAGE:$SHA" \
  "$REPO_ROOT"

log "building $WEB_IMAGE:$SHA"
docker build \
  -f "$REPO_ROOT/apps/web/Dockerfile" \
  --build-arg "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:-}" \
  -t "$WEB_IMAGE:$SHA" \
  "$REPO_ROOT"

log "built $BACKEND_IMAGE:$SHA and $WEB_IMAGE:$SHA"
