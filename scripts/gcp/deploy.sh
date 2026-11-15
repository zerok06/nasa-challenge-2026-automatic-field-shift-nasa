#!/usr/bin/env bash
# Construye la imagen y despliega el stack en la VM.
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-project-59be27c2-c126-4ea7-b01}"
REGION="${REGION:-us-central1}"
ZONE="${ZONE:-us-central1-a}"
VM_NAME="${VM_NAME:-anden-vm}"
BUILDER_SA="${BUILDER_SA:-anden-builder}"
AR_REPO="${AR_REPO:-anden}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TAG="${TAG:-$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M)}"
IMAGE="us-central1-docker.pkg.dev/$PROJECT_ID/$AR_REPO/api:$TAG"

echo "==> Build $IMAGE"
gcloud builds submit "$ROOT" \
  --config="$ROOT/deploy/gcp/cloudbuild.yaml" \
  --substitutions="_IMAGE=$IMAGE" \
  --service-account="projects/$PROJECT_ID/serviceAccounts/$BUILDER_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --project="$PROJECT_ID"

echo "==> Secretos"
DB_URL=$(gcloud secrets versions access latest --secret=anden-database-url --project="$PROJECT_ID")
JWT_SECRET=$(gcloud secrets versions access latest --secret=anden-jwt-secret --project="$PROJECT_ID")
DB_PASSWORD=${DB_URL#*://automatic:}
DB_PASSWORD=${DB_PASSWORD%%@db:*}

IP=$(gcloud compute addresses describe anden-ip --region="$REGION" \
  --project="$PROJECT_ID" --format="value(address)")
DOMAIN="${IP//./-}.sslip.io"

ENV_FILE=$(mktemp)
trap 'rm -f "$ENV_FILE"' EXIT
cat > "$ENV_FILE" <<EOF
APP_ENV=demo
API_PORT=8000
POSTGRES_DB=automatic
POSTGRES_USER=automatic
POSTGRES_PASSWORD=$DB_PASSWORD
DATABASE_URL=$DB_URL
JWT_SECRET=$JWT_SECRET
JWT_EXPIRE_MINUTES=10080
CORS_ORIGINS=https://$DOMAIN,http://localhost:8081
LLM_PROVIDER=gemini
GOOGLE_CLOUD_PROJECT=$PROJECT_ID
GOOGLE_CLOUD_LOCATION=global
GEMINI_MODEL=gemini-3.5-flash
GEMINI_MAX_OUTPUT_TOKENS=512
GEMINI_MAX_TOOL_CALLS=4
GEMINI_TEMPERATURE=0
LLM_TIMEOUT_SECONDS=20
DATASETS_DIR=/app/datasets
API_IMAGE=$IMAGE
DOMAIN=$DOMAIN
EOF

echo "==> Esperando SSH y Docker"
gcloud compute ssh "$VM_NAME" --zone="$ZONE" --tunnel-through-iap \
  --project="$PROJECT_ID" \
  --command="for i in \$(seq 1 60); do command -v docker >/dev/null 2>&1 && break; sleep 5; done; docker --version" \
  --quiet

echo "==> Subiendo archivos"
gcloud compute scp \
  "$ROOT/deploy/gcp/docker-compose.yml" \
  "$ROOT/deploy/gcp/Caddyfile" \
  "$ROOT/deploy/gcp/remote-deploy.sh" \
  "$ENV_FILE" \
  "$VM_NAME:/tmp/" --zone="$ZONE" --tunnel-through-iap --project="$PROJECT_ID"

echo "==> Desplegando"
gcloud compute ssh "$VM_NAME" --zone="$ZONE" --tunnel-through-iap \
  --project="$PROJECT_ID" --command="
    set -e
    sudo mkdir -p /opt/anden
    sudo mv /tmp/docker-compose.yml /tmp/Caddyfile /tmp/remote-deploy.sh /opt/anden/
    sudo chmod +x /opt/anden/remote-deploy.sh
    sudo install -m 600 -o root -g root /tmp/$(basename "$ENV_FILE") /opt/anden/.env
    rm -f /tmp/$(basename "$ENV_FILE")
    /opt/anden/remote-deploy.sh
  "

echo "==> Esperando HTTPS"
for _ in $(seq 1 30); do
  if curl -fsS "https://$DOMAIN/api/v1/health" >/dev/null 2>&1; then
    echo "OK https://$DOMAIN"
    exit 0
  fi
  sleep 5
done
echo "No respondió aún. Revisa:"
echo "  gcloud compute ssh $VM_NAME --zone=$ZONE --tunnel-through-iap --command='sudo docker compose -f /opt/anden/docker-compose.yml logs --tail=120'"
exit 1
