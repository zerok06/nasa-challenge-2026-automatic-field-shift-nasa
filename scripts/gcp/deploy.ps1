[CmdletBinding()]
param(
    [string]$ProjectId = "project-59be27c2-c126-4ea7-b01",
    [string]$Region = "us-central1",
    [string]$Zone = "us-central1-a",
    [string]$VmName = "anden-vm",
    [string]$BuilderSa = "anden-builder",
    [string]$Repository = "anden",
    # Dominio canónico. Ej: anden.duckdns.org. Si se omite, usa <ip>.sslip.io.
    [string]$Domain,
    # Dominio anterior que debe redirigir 301 al canónico (opcional).
    [string]$LegacyDomain,
    [string]$Tag,
    [switch]$SkipTests,
    [switch]$SkipMobile,
    [switch]$NoSmoke
)

$ErrorActionPreference = "Stop"
# gcloud writes informational warnings to stderr (for example the project
# environment-tag notice); Windows PowerShell 5.1 turns those into terminating
# errors when ErrorActionPreference is Stop. Keep gcloud output to errors only.
$env:CLOUDSDK_CORE_VERBOSITY = "error"
$env:CLOUDSDK_CORE_DISABLE_PROMPTS = "1"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

function Assert-LastExit([string]$What) {
    if ($LASTEXITCODE -ne 0) {
        throw "$What fallo (exit $LASTEXITCODE)"
    }
}

function Invoke-Gcloud {
    # gcloud escribe avisos informativos en stderr (p. ej. el notice
    # "[environment: untagged]"). Con $ErrorActionPreference = "Stop" esos
    # avisos se vuelven errores terminantes; aquí se ejecutan con "Continue"
    # para que solo el exit code decida (vía Assert-LastExit).
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        & gcloud @args
    }
    finally {
        $ErrorActionPreference = $prev
    }
}

Invoke-Gcloud config set project $ProjectId | Out-Null
Assert-LastExit "gcloud config"

if (-not $SkipTests) {
    Write-Host "==> Tests backend"
    & "$Root\backend\.venv\Scripts\python.exe" -m pytest "$Root\backend\tests" -q
    Assert-LastExit "pytest"

    # La app móvil no se despliega a GCP (solo api + web); sus tests se pueden
    # omitir con -SkipMobile para no bloquear la salida del frontend.
    if (-not $SkipMobile) {
        Write-Host "==> Tests mobile"
        Push-Location "$Root\application"
        try {
            pnpm typecheck
            Assert-LastExit "pnpm typecheck"
            pnpm test
            Assert-LastExit "pnpm test"
            pnpm lint
            Assert-LastExit "pnpm lint"
        }
        finally {
            Pop-Location
        }
    }

    Write-Host "==> Tests PWA"
    Push-Location "$Root\frontend"
    try {
        pnpm typecheck
        Assert-LastExit "pnpm typecheck (PWA)"
        pnpm test
        Assert-LastExit "pnpm test (PWA)"
        pnpm build
        Assert-LastExit "pnpm build (PWA)"
    }
    finally {
        Pop-Location
    }
}

if ($Tag) {
    $image = "us-central1-docker.pkg.dev/$ProjectId/$Repository/api:$Tag"
    $webImage = "us-central1-docker.pkg.dev/$ProjectId/$Repository/web:$Tag"
    Write-Host "==> Reutilizando imagenes $image y $webImage"
}
else {
    $tag = "gcp-" + (Get-Date -Format "yyyyMMdd-HHmmss")
    $image = "us-central1-docker.pkg.dev/$ProjectId/$Repository/api:$tag"
    $webImage = "us-central1-docker.pkg.dev/$ProjectId/$Repository/web:$tag"
    Write-Host "==> Build $image y $webImage"
    Invoke-Gcloud builds submit $Root `
        --config="$Root\deploy\gcp\cloudbuild.yaml" `
        --substitutions="_IMAGE=$image,_WEB_IMAGE=$webImage,_VITE_API_URL=" `
        --service-account="projects/$ProjectId/serviceAccounts/$BuilderSa@$ProjectId.iam.gserviceaccount.com" `
        --project=$ProjectId
    Assert-LastExit "Cloud Build"
}

Write-Host "==> Leyendo secretos e IP"
$dbUrl = (Invoke-Gcloud secrets versions access latest --secret=anden-database-url --project=$ProjectId).Trim()
Assert-LastExit "secreto DATABASE_URL"
$jwtSecret = (Invoke-Gcloud secrets versions access latest --secret=anden-jwt-secret --project=$ProjectId).Trim()
Assert-LastExit "secreto JWT"
$dbPassword = ($dbUrl -replace '^.*://automatic:', '') -replace '@db:5432/automatic$', ''
$ip = (Invoke-Gcloud compute addresses describe anden-ip --region=$Region --project=$ProjectId `
        --format="value(address)").Trim()
Assert-LastExit "IP estatica"
$canonical = if ($Domain) { ($Domain -replace '^https?://', '').TrimEnd('/') } else { ($ip -replace '\.', '-') + ".sslip.io" }

Write-Host "==> Firewall 80/443"
$rule = (Invoke-Gcloud compute firewall-rules list --filter="name=anden-web" --format="value(name)" --project=$ProjectId 2>$null)
if (-not $rule) {
    Invoke-Gcloud compute firewall-rules create anden-web `
        --allow tcp:80,tcp:443 `
        --source-ranges=0.0.0.0/0 `
        --description="Anden PWA + API (Caddy)" `
        --project=$ProjectId | Out-Null
    Assert-LastExit "firewall"
}
else {
    Write-Host "    regla anden-web ya existe"
}

$envFile = Join-Path $env:TEMP "anden.env"
$envContent = @"
APP_ENV=demo
API_PORT=8000
POSTGRES_DB=automatic
POSTGRES_USER=automatic
POSTGRES_PASSWORD=$dbPassword
DATABASE_URL=$dbUrl
JWT_SECRET=$jwtSecret
JWT_EXPIRE_MINUTES=10080
CORS_ORIGINS=https://$canonical,http://localhost:8081,http://localhost:19006,http://localhost:5173,http://localhost:4173
LLM_PROVIDER=gemini
GOOGLE_CLOUD_PROJECT=$ProjectId
GOOGLE_CLOUD_LOCATION=global
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_MAX_OUTPUT_TOKENS=512
GEMINI_MAX_TOOL_CALLS=4
GEMINI_TEMPERATURE=0
AGENT_MAX_ANSWER_CHARS=220
LLM_TIMEOUT_SECONDS=8
DATASETS_DIR=/app/datasets
API_IMAGE=$image
WEB_IMAGE=$webImage
DOMAIN=$canonical
"@
[System.IO.File]::WriteAllText($envFile, $envContent)

# El Caddyfile se monta en la VM. Si hay un dominio anterior, se agrega un
# bloque 301 para no partir el origen del PWA (los service workers son por origen).
$caddyFile = Join-Path $env:TEMP "Caddyfile"
$caddyContent = Get-Content "$Root\deploy\gcp\Caddyfile" -Raw
if ($LegacyDomain) {
    $legacy = ($LegacyDomain -replace '^https?://', '').TrimEnd('/')
    $caddyContent += @"

# Dominio anterior: redirige al canónico para conservar un solo origen PWA.
https://$legacy {
	redir https://$canonical{uri} permanent
}
"@
}
[System.IO.File]::WriteAllText($caddyFile, $caddyContent)

try {
    Write-Host "==> Copiando compose, Caddyfile, remote-deploy y .env"
    Invoke-Gcloud compute scp `
        "$Root\deploy\gcp\docker-compose.yml" `
        $caddyFile `
        "$Root\deploy\gcp\remote-deploy.sh" `
        $envFile `
        "$VmName`:/tmp/" `
        --zone=$Zone --tunnel-through-iap --project=$ProjectId
    Assert-LastExit "scp"

    Write-Host "==> Actualizando la VM"
    $remote = "set -e; sudo mv /tmp/docker-compose.yml /tmp/Caddyfile /tmp/remote-deploy.sh /opt/anden/; sudo chmod +x /opt/anden/remote-deploy.sh; sudo install -m 600 -o root -g root /tmp/anden.env /opt/anden/.env; rm -f /tmp/anden.env; /opt/anden/remote-deploy.sh"
    Invoke-Gcloud compute ssh $VmName --zone=$Zone --tunnel-through-iap --project=$ProjectId `
        --command=$remote --quiet
    Assert-LastExit "deploy remoto"

    if (-not $NoSmoke) {
        Write-Host "==> Smoke"
        & "$PSScriptRoot\smoke.ps1" -ProjectId $ProjectId -Region $Region -Domain $canonical
        Assert-LastExit "smoke"
    }
}
finally {
    Remove-Item $envFile -Force -ErrorAction SilentlyContinue
    Remove-Item $caddyFile -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "OK $image"
Write-Host "OK $webImage"
Write-Host "URL https://$canonical"
if (-not $Domain) {
    Write-Host ""
    Write-Host "Para usar DuckDNS:"
    Write-Host "  1) Crea el subdominio en https://www.duckdns.org y apunta la IP $ip"
    Write-Host "  2) Vuelve a desplegar con: .\scripts\gcp\deploy.ps1 -Domain anden.duckdns.org"
    Write-Host "  3) Si ya tenías el PWA instalado en el dominio viejo, reinstálalo: el origen cambió."
}

