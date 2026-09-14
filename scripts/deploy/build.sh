#!/bin/bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
source ./lib.sh

SHA="$(require_sha "${1:-}")"
require_cmd docker
require_cmd pnpm

log "running test suite before building anything"
# --no-file-parallelism: the backend's integration test files share one
# live Postgres instance and hit real deadlocks under vitest's default
# parallel-file execution (unrelated to this change - reproduced with a
# throwaway, otherwise-idle Postgres). Serializing them is the reliable
# fix here; it's confined to this release-gating run, not the package's
# own default `pnpm test`.
(cd "$REPO_ROOT" && pnpm turbo run test -- --no-file-parallelism)

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
