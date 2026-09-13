#!/bin/bash
# Shared helpers sourced by every script in scripts/deploy/. Not meant
# to be run directly.
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$DEPLOY_DIR/../.." && pwd)"

log() {
  echo "[deploy] $*" >&2
}

fail() {
  echo "[deploy] ERROR: $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "required command not found: $1"
}

require_sha() {
  [ -n "${1:-}" ] || fail "usage: $(basename "$0") <short-git-sha>"
  echo "$1"
}

CONFIG_FILE="$DEPLOY_DIR/config.env"
[ -f "$CONFIG_FILE" ] || fail "missing $CONFIG_FILE - copy config.env.example and fill it in"
# shellcheck disable=SC1090
source "$CONFIG_FILE"

: "${AWS_REGION:?set in scripts/deploy/config.env}"
: "${AWS_PROFILE:?set in scripts/deploy/config.env}"
: "${ARTIFACTS_BUCKET:?set in scripts/deploy/config.env}"
: "${INSTANCE_HOST:?set in scripts/deploy/config.env}"
: "${SSH_USER:?set in scripts/deploy/config.env}"
: "${SSH_KEY_PATH:?set in scripts/deploy/config.env}"
: "${BACKEND_IMAGE:?set in scripts/deploy/config.env}"
: "${WEB_IMAGE:?set in scripts/deploy/config.env}"
: "${REMOTE_APP_DIR:?set in scripts/deploy/config.env}"
: "${REMOTE_RELEASES_DIR:?set in scripts/deploy/config.env}"
: "${MAX_S3_BUILDS:?set in scripts/deploy/config.env}"
: "${LOCAL_RELEASES_KEPT_ON_INSTANCE:?set in scripts/deploy/config.env}"
: "${ROUNDTRIP_TIMEOUT_SECONDS:?set in scripts/deploy/config.env}"

DIST_DIR="$DEPLOY_DIR/dist"
mkdir -p "$DIST_DIR"

aws_cli() {
  aws --region "$AWS_REGION" --profile "$AWS_PROFILE" "$@"
}

ssh_app() {
  ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=accept-new \
    "$SSH_USER@$INSTANCE_HOST" "$@"
}

release_tarball_name() {
  echo "release-$1.tar.gz"
}

release_s3_key() {
  echo "builds/$(release_tarball_name "$1")"
}
