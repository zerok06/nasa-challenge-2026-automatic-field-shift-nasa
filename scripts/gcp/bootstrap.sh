#!/usr/bin/env bash
# Provisiona la infraestructura base de Anden en GCP.
# Requiere: gcloud autenticado, proyecto con billing, bash + openssl.
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-project-59be27c2-c126-4ea7-b01}"
REGION="${REGION:-us-central1}"
ZONE="${ZONE:-us-central1-a}"
VM_NAME="${VM_NAME:-anden-vm}"
MACHINE_TYPE="${MACHINE_TYPE:-e2-small}"
IP_NAME="${IP_NAME:-anden-ip}"
API_SA="${API_SA:-anden-api}"
BUILDER_SA="${BUILDER_SA:-anden-builder}"
AR_REPO="${AR_REPO:-anden}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

command -v gcloud >/dev/null || { echo "Falta gcloud"; exit 1; }
command -v openssl >/dev/null || { echo "Falta openssl"; exit 1; }

gcloud config set project "$PROJECT_ID" >/dev/null

echo "==> APIs"
gcloud services enable \
  compute.googleapis.com \
  aiplatform.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  cloudresourcemanager.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  iap.googleapis.com \
  --project="$PROJECT_ID"

ensure_sa() {
  local email="$1" display="$2"
  if ! gcloud iam service-accounts describe "$email" --project="$PROJECT_ID" >/dev/null 2>&1; then
    gcloud iam service-accounts create "${email%%@*}" \
      --display-name="$display" --project="$PROJECT_ID"
  fi
}

echo "==> Service accounts"
ensure_sa "$API_SA@$PROJECT_ID.iam.gserviceaccount.com" "Anden API runtime"
ensure_sa "$BUILDER_SA@$PROJECT_ID.iam.gserviceaccount.com" "Anden Cloud Build"

bind_role() {
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$1" --role="$2" >/dev/null
}

echo "==> IAM"
bind_role "$API_SA@$PROJECT_ID.iam.gserviceaccount.com" roles/aiplatform.user
bind_role "$API_SA@$PROJECT_ID.iam.gserviceaccount.com" roles/artifactregistry.reader
bind_role "$API_SA@$PROJECT_ID.iam.gserviceaccount.com" roles/logging.logWriter
bind_role "$API_SA@$PROJECT_ID.iam.gserviceaccount.com" roles/monitoring.metricWriter
bind_role "$BUILDER_SA@$PROJECT_ID.iam.gserviceaccount.com" roles/cloudbuild.builds.builder
bind_role "$BUILDER_SA@$PROJECT_ID.iam.gserviceaccount.com" roles/artifactregistry.writer

echo "==> Artifact Registry"
if ! gcloud artifacts repositories describe "$AR_REPO" --location="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$AR_REPO" \
    --repository-format=docker --location="$REGION" \
    --description="Anden API" --project="$PROJECT_ID"
fi

echo "==> IP estática"
if ! gcloud compute addresses describe "$IP_NAME" --region="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud compute addresses create "$IP_NAME" --region="$REGION" --project="$PROJECT_ID"
fi
IP=$(gcloud compute addresses describe "$IP_NAME" --region="$REGION" \
  --project="$PROJECT_ID" --format="value(address)")
DOMAIN="${IP//./-}.sslip.io"
echo "IP=$IP"
echo "DOMAIN=$DOMAIN"

echo "==> Firewall"
if ! gcloud compute firewall-rules describe anden-web --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud compute firewall-rules create anden-web \
    --allow="tcp:80,tcp:443" --target-tags=anden-web \
    --source-ranges=0.0.0.0/0 --description="Anden HTTPS" \
    --project="$PROJECT_ID"
fi
if ! gcloud compute firewall-rules describe anden-ssh-iap --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud compute firewall-rules create anden-ssh-iap \
    --allow=tcp:22 --target-tags=anden-web \
    --source-ranges=35.235.240.0/20 --description="SSH via IAP" \
    --project="$PROJECT_ID"
fi
# El VPC default abre SSH/RDP al mundo; en este proyecto no los necesitamos.
for rule in default-allow-ssh default-allow-rdp; do
  if gcloud compute firewall-rules describe "$rule" --project="$PROJECT_ID" >/dev/null 2>&1; then
    gcloud compute firewall-rules delete "$rule" --quiet --project="$PROJECT_ID"
  fi
done

secret_has_version() {
  local name="$1"
  local count
  count=$(gcloud secrets versions list "$name" --project="$PROJECT_ID" \
    --format='value(name)' 2>/dev/null | wc -l)
  [ "$count" -gt 0 ]
}

echo "==> Secretos"
if ! gcloud secrets describe anden-database-url --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud secrets create anden-database-url \
    --replication-policy=automatic --project="$PROJECT_ID" >/dev/null
fi
if ! secret_has_version anden-database-url; then
  DB_PASSWORD=$(openssl rand -hex 16)
  printf '%s' "postgresql+psycopg://automatic:${DB_PASSWORD}@db:5432/automatic" |
    gcloud secrets versions add anden-database-url --data-file=- --project="$PROJECT_ID" >/dev/null
fi
if ! gcloud secrets describe anden-jwt-secret --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud secrets create anden-jwt-secret \
    --replication-policy=automatic --project="$PROJECT_ID" >/dev/null
fi
if ! secret_has_version anden-jwt-secret; then
  openssl rand -hex 32 |
    gcloud secrets versions add anden-jwt-secret --data-file=- --project="$PROJECT_ID" >/dev/null
fi

echo "==> VM"
if ! gcloud compute instances describe "$VM_NAME" --zone="$ZONE" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud compute instances create "$VM_NAME" \
    --zone="$ZONE" \
    --machine-type="$MACHINE_TYPE" \
    --image-family=debian-12 \
    --image-project=debian-cloud \
    --boot-disk-size=20GB \
    --boot-disk-type=pd-standard \
    --address="$IP_NAME" \
    --service-account="$API_SA@$PROJECT_ID.iam.gserviceaccount.com" \
    --scopes=cloud-platform \
    --tags=anden-web \
    --metadata-from-file=startup-script="$ROOT/deploy/gcp/startup.sh" \
    --project="$PROJECT_ID"
fi

echo
echo "Listo."
echo "  IP:     $IP"
echo "  Dominio: $DOMAIN"
echo "  Imagen: us-central1-docker.pkg.dev/$PROJECT_ID/$AR_REPO/api:<tag>"
