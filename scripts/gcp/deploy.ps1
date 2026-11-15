[CmdletBinding()]
param(
    [string]$ProjectId = "project-59be27c2-c126-4ea7-b01",
    [string]$Region = "us-central1",
    [string]$Zone = "us-central1-a",
    [string]$VmName = "anden-vm",
    [string]$BuilderSa = "anden-builder",
    [string]$Repository = "anden",
    [string]$Tag,
    [switch]$SkipTests,
    [switch]$NoSmoke
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

function Assert-LastExit([string]$What) {
    if ($LASTEXITCODE -ne 0) {
        throw "$What fallo (exit $LASTEXITCODE)"
    }
}

gcloud config set project $ProjectId | Out-Null
Assert-LastExit "gcloud config"

if (-not $SkipTests) {
    Write-Host "==> Tests backend"
    & "$Root\backend\.venv\Scripts\python.exe" -m pytest "$Root\backend\tests" -q
    Assert-LastExit "pytest"

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

if ($Tag) {
    $image = "us-central1-docker.pkg.dev/$ProjectId/$Repository/api:$Tag"
    Write-Host "==> Reutilizando imagen $image"
}
else {
    $tag = "gcp-" + (Get-Date -Format "yyyyMMdd-HHmmss")
    $image = "us-central1-docker.pkg.dev/$ProjectId/$Repository/api:$tag"
    Write-Host "==> Build $image"
    gcloud builds submit $Root `
        --config="$Root\deploy\gcp\cloudbuild.yaml" `
        --substitutions="_IMAGE=$image" `
        --service-account="projects/$ProjectId/serviceAccounts/$BuilderSa@$ProjectId.iam.gserviceaccount.com" `
        --project=$ProjectId
    Assert-LastExit "Cloud Build"
}

Write-Host "==> Leyendo secretos e IP"
$dbUrl = (gcloud secrets versions access latest --secret=anden-database-url --project=$ProjectId).Trim()
Assert-LastExit "secreto DATABASE_URL"
$jwtSecret = (gcloud secrets versions access latest --secret=anden-jwt-secret --project=$ProjectId).Trim()
Assert-LastExit "secreto JWT"
$dbPassword = ($dbUrl -replace '^.*://automatic:', '') -replace '@db:5432/automatic$', ''
$ip = (gcloud compute addresses describe anden-ip --region=$Region --project=$ProjectId `
        --format="value(address)").Trim()
Assert-LastExit "IP estatica"
$domain = ($ip -replace '\.', '-') + ".sslip.io"

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
CORS_ORIGINS=https://$domain,http://localhost:8081
LLM_PROVIDER=gemini
GOOGLE_CLOUD_PROJECT=$ProjectId
GOOGLE_CLOUD_LOCATION=global
GEMINI_MODEL=gemini-3.5-flash
GEMINI_MAX_OUTPUT_TOKENS=512
GEMINI_MAX_TOOL_CALLS=4
GEMINI_TEMPERATURE=0
AGENT_MAX_ANSWER_CHARS=220
LLM_TIMEOUT_SECONDS=8
DATASETS_DIR=/app/datasets
API_IMAGE=$image
DOMAIN=$domain
"@
[System.IO.File]::WriteAllText($envFile, $envContent)

try {
    Write-Host "==> Copiando compose, Caddyfile, remote-deploy y .env"
    gcloud compute scp `
        "$Root\deploy\gcp\docker-compose.yml" `
        "$Root\deploy\gcp\Caddyfile" `
        "$Root\deploy\gcp\remote-deploy.sh" `
        $envFile `
        "$VmName`:/tmp/" `
        --zone=$Zone --tunnel-through-iap --project=$ProjectId
    Assert-LastExit "scp"

    Write-Host "==> Actualizando la VM"
    $remote = "set -e; sudo mv /tmp/docker-compose.yml /tmp/Caddyfile /tmp/remote-deploy.sh /opt/anden/; sudo chmod +x /opt/anden/remote-deploy.sh; sudo install -m 600 -o root -g root /tmp/anden.env /opt/anden/.env; rm -f /tmp/anden.env; /opt/anden/remote-deploy.sh"
    gcloud compute ssh $VmName --zone=$Zone --tunnel-through-iap --project=$ProjectId `
        --command=$remote --quiet
    Assert-LastExit "deploy remoto"

    if (-not $NoSmoke) {
        Write-Host "==> Smoke"
        & "$PSScriptRoot\smoke.ps1" -ProjectId $ProjectId -Region $Region
        Assert-LastExit "smoke"
    }
}
finally {
    Remove-Item $envFile -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "OK $image"
Write-Host "URL https://$domain"
