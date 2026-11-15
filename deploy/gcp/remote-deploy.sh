#!/usr/bin/env bash
# Se ejecuta en la VM después de copiar docker-compose.yml, Caddyfile y .env.
set -euo pipefail
cd /opt/anden

TOKEN=$(curl -fsS -H 'Metadata-Flavor: Google' \
  http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token |
  python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
echo "$TOKEN" | sudo docker login -u oauth2accesstoken --password-stdin us-central1-docker.pkg.dev

sudo docker compose --env-file .env pull
sudo docker compose --env-file .env up -d

# Recarga Caddy si el Caddyfile cambió; valida antes de reiniciar.
if sudo docker compose --env-file .env ps --services --status running | grep -qx caddy; then
  sudo docker compose --env-file .env exec -T caddy \
    caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
  sudo docker compose --env-file .env restart caddy
fi

sudo docker compose --env-file .env ps
