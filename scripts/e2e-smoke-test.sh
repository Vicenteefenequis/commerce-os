#!/usr/bin/env bash
# End-to-end smoke test for the Foundation phase (openspec/changes/add-foundation-monolith).
# Run against a live docker-compose stack: `docker compose up -d` first.
#
# Covers tasks 11.1/11.2: create org -> venue -> login -> change config ->
# audit entry recorded, plus cross-tenant isolation (a second org cannot
# see/modify the first org's venue, configuration, or organization).
#
# Requires: curl, node (for tiny JSON field extraction), docker compose.
set -euo pipefail

BACKEND_URL="${BACKEND_URL:-http://localhost:4000}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/../apps/backend"
COOKIES_A="$(mktemp)"
COOKIES_B="$(mktemp)"
trap 'rm -f "$COOKIES_A" "$COOKIES_B"' EXIT

json_field() {
  node -e "process.stdin.on('data',d=>console.log(JSON.parse(d)['$1']))"
}

echo "== creating two organizations =="
ORG_A_ID=$(curl -sf -X POST "$BACKEND_URL/organizations" -H 'Content-Type: application/json' \
  -d '{"name":"E2E Org A"}' | json_field id)
ORG_B_ID=$(curl -sf -X POST "$BACKEND_URL/organizations" -H 'Content-Type: application/json' \
  -d '{"name":"E2E Org B"}' | json_field id)
echo "org A: $ORG_A_ID"
echo "org B: $ORG_B_ID"

echo "== seeding one owner user per organization =="
PASSWORD_HASH=$(cd "$BACKEND_DIR" && SEED_PASSWORD=supersecret123 node scripts/seed-test-user.mjs)
USER_A_ID="$(node -e 'console.log(require("crypto").randomUUID())')"
USER_B_ID="$(node -e 'console.log(require("crypto").randomUUID())')"

docker compose exec -T postgres psql -U "${POSTGRES_USER:-commerce_os}" -d "${POSTGRES_DB:-commerce_os}" -v ON_ERROR_STOP=1 <<SQL
INSERT INTO users (id, tenant_id, email, password_hash) VALUES
  ('$USER_A_ID', '$ORG_A_ID', 'owner-a@e2e.test', '$PASSWORD_HASH'),
  ('$USER_B_ID', '$ORG_B_ID', 'owner-b@e2e.test', '$PASSWORD_HASH');
INSERT INTO role_assignments (tenant_id, user_id, role) VALUES
  ('$ORG_A_ID', '$USER_A_ID', 'owner'),
  ('$ORG_B_ID', '$USER_B_ID', 'owner');
SQL

echo "== logging in as each owner =="
curl -sf -c "$COOKIES_A" -X POST "$BACKEND_URL/auth/login" -H 'Content-Type: application/json' \
  -d "{\"tenantId\":\"$ORG_A_ID\",\"email\":\"owner-a@e2e.test\",\"password\":\"supersecret123\"}" > /dev/null
curl -sf -c "$COOKIES_B" -X POST "$BACKEND_URL/auth/login" -H 'Content-Type: application/json' \
  -d "{\"tenantId\":\"$ORG_B_ID\",\"email\":\"owner-b@e2e.test\",\"password\":\"supersecret123\"}" > /dev/null

echo "== org A creates a venue and changes configuration =="
curl -sf -b "$COOKIES_A" -X POST "$BACKEND_URL/venues" -H 'Content-Type: application/json' \
  -d '{"name":"E2E Venue"}' > /dev/null
curl -sf -b "$COOKIES_A" -X PUT "$BACKEND_URL/configuration/e2e.flag" -H 'Content-Type: application/json' \
  -d '{"value":"true"}' > /dev/null

echo "== waiting for the outbox worker to record the audit entry =="
for _ in $(seq 1 15); do
  COUNT=$(docker compose exec -T postgres psql -U "${POSTGRES_USER:-commerce_os}" -d "${POSTGRES_DB:-commerce_os}" -t -c \
    "SELECT count(*) FROM audit_log WHERE tenant_id = '$ORG_A_ID' AND action = 'configuration.changed';" | tr -d '[:space:]')
  [ "$COUNT" = "1" ] && break
  sleep 1
done
[ "$COUNT" = "1" ] || { echo "FAIL: expected exactly 1 audit entry for org A, got $COUNT"; exit 1; }
echo "OK: audit entry recorded for org A's configuration change"

echo "== isolation: org B must not see org A's venue =="
VENUES_B=$(curl -sf -b "$COOKIES_B" "$BACKEND_URL/venues")
[ "$VENUES_B" = '{"venues":[]}' ] || { echo "FAIL: org B saw venues: $VENUES_B"; exit 1; }
echo "OK: org B sees no venues"

echo "== isolation: org B must not read org A's organization =="
STATUS=$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIES_B" "$BACKEND_URL/organizations/$ORG_A_ID")
[ "$STATUS" = "404" ] || { echo "FAIL: expected 404, got $STATUS"; exit 1; }
echo "OK: org B cannot read org A's organization (404)"

echo "== isolation: org B must not read org A's configuration key =="
STATUS=$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIES_B" "$BACKEND_URL/configuration/e2e.flag")
[ "$STATUS" = "404" ] || { echo "FAIL: expected 404, got $STATUS"; exit 1; }
echo "OK: org B cannot read org A's configuration (404)"

echo
echo "E2E smoke test passed."
