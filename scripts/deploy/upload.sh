#!/bin/bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
source ./lib.sh

SHA="$(require_sha "${1:-}")"
require_cmd aws

TARBALL="$DIST_DIR/$(release_tarball_name "$SHA")"
[ -f "$TARBALL" ] || fail "missing $TARBALL - run package.sh $SHA first"

KEY="$(release_s3_key "$SHA")"
log "uploading $TARBALL -> s3://$ARTIFACTS_BUCKET/$KEY"
aws_cli s3 cp "$TARBALL" "s3://$ARTIFACTS_BUCKET/$KEY"

log "pruning builds/ beyond the $MAX_S3_BUILDS most recent (15-day lifecycle rule handles age-based expiry)"
KEYS_NEWEST_FIRST="$(aws_cli s3api list-objects-v2 \
  --bucket "$ARTIFACTS_BUCKET" --prefix "builds/" \
  --query 'reverse(sort_by(Contents, &LastModified))[].Key' --output text)"

INDEX=0
for KEY_TO_CHECK in $KEYS_NEWEST_FIRST; do
  INDEX=$((INDEX + 1))
  if [ "$INDEX" -gt "$MAX_S3_BUILDS" ]; then
    log "deleting old build s3://$ARTIFACTS_BUCKET/$KEY_TO_CHECK"
    aws_cli s3 rm "s3://$ARTIFACTS_BUCKET/$KEY_TO_CHECK"
  fi
done

log "uploaded $KEY"
