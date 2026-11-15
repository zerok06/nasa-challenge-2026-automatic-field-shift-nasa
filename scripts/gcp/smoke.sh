#!/usr/bin/env bash
# Smoke test contra el backend desplegado.
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-project-59be27c2-c126-4ea7-b01}"
REGION="${REGION:-us-central1}"
PY="${PY:-python3}"

IP=$(gcloud compute addresses describe anden-ip --region="$REGION" \
  --project="$PROJECT_ID" --format="value(address)")
DOMAIN="${DOMAIN:-${IP//./-}.sslip.io}"
BASE="https://$DOMAIN"

echo "==> $BASE"
curl -fsS "$BASE/api/v1/health" >/dev/null
echo "health OK"
curl -fsS "$BASE/api/v1/ready"
echo
TOKEN=$(curl -fsS -X POST "$BASE/api/v1/auth/anonymous" \
  -H "Content-Type: application/json" \
  -d '{"display_name":"Smoke","consent_version":"v1"}' |
  "$PY" -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')
PARCEL=$(curl -fsS -X POST "$BASE/api/v1/demo/parcel" \
  -H "Authorization: Bearer $TOKEN" |
  "$PY" -c 'import sys,json; print(json.load(sys.stdin)["id"])')
THREAD=$(curl -fsS -X POST "$BASE/api/v1/agent/threads" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"parcel_id\":\"$PARCEL\"}" |
  "$PY" -c 'import sys,json; print(json.load(sys.stdin)["thread_id"])')
BODY=$(curl -fsS -X POST "$BASE/api/v1/agent/threads/$THREAD/messages" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"message":"Compara rotaciones que usen menos agua"}')
echo "$BODY" | "$PY" -c '
import sys, json
body = json.load(sys.stdin)
assert body["answer"], "respuesta vacía"
assert body["tool_trace"], "sin trazas"
assert body["ui_actions"][0]["action"] == "open_comparison", body["ui_actions"]
assert "gemini_fallback" not in body["warnings"], body["warnings"]
print("agent OK:", body["answer"])
'
