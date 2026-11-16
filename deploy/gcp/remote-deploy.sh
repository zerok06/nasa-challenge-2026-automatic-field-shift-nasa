#!/usr/bin/env bash
# Se ejecuta en la VM después de copiar docker-compose.yml y .env.
set -euo pipefail
cd /opt/anden

TOKEN=$(curl -fsS -H 'Metadata-Flavor: Google' \
  http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token |
  python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
echo "$TOKEN" | sudo docker login -u oauth2accesstoken --password-stdin us-central1-docker.pkg.dev

sudo docker compose --env-file .env pull
# --remove-orphans limpia servicios renombrados (p. ej. el antiguo `caddy`,
# hoy `web`); sin esto el huérfano retiene los puertos 80/443 y `web` no arranca.
sudo docker compose --env-file .env up -d --remove-orphans

# El Caddyfile se monta desde /opt/anden/Caddyfile; si cambió, se valida y se
# recrea el servicio web sin reconstruir la imagen.
if sudo docker compose --env-file .env ps --services --status running | grep -qx web; then
  sudo docker compose --env-file .env exec -T web \
    caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
  sudo docker compose --env-file .env up -d --force-recreate web
fi

sudo docker compose --env-file .env ps
