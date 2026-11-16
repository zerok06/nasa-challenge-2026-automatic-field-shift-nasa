[CmdletBinding()]
param(
    [string]$ProjectId = "project-59be27c2-c126-4ea7-b01",
    [string]$Region = "us-central1",
    [string]$Domain
)

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
[System.Net.ServicePointManager]::Expect100Continue = $false

if (-not $Domain) {
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $ip = (gcloud compute addresses describe anden-ip --region=$Region `
            --project=$ProjectId --format="value(address)").Trim()
    }
    finally {
        $ErrorActionPreference = $prevEap
    }
    if ($LASTEXITCODE -ne 0) { throw "No pude obtener la IP estatica" }
    $Domain = ($ip -replace '\.', '-') + ".sslip.io"
}
$base = "https://$Domain"

function Invoke-Post($Path, $Body, $Headers = @{}) {
    Invoke-RestMethod -Method Post -Uri "$base$Path" -Headers $Headers `
        -ContentType "application/json" -Body ($Body | ConvertTo-Json -Compress)
}

$ready = Invoke-RestMethod -Uri "$base/api/v1/ready"
if ($ready.status -ne "ready") {
    throw "ready=$($ready.status) checks=$($ready.checks | ConvertTo-Json -Compress)"
}

# The same domain must serve the PWA shell, its manifest and the service worker.
# NOTE: for non-HTML content types (manifest, sw.js) PS returns Content as
# bytes, so decode explicitly before matching.
function Get-Text($Uri) {
    $response = Invoke-WebRequest -Uri $Uri -UseBasicParsing
    if ($response.StatusCode -ne 200) { throw "GET $Uri -> $($response.StatusCode)" }
    $content = $response.Content
    if ($content -is [byte[]]) { $content = [System.Text.Encoding]::UTF8.GetString($content) }
    return $content
}

$shell = Get-Text "$base/"
if ($shell -notmatch "Anden") {
    throw "El PWA no se sirve en /"
}
$manifest = Get-Text "$base/manifest.webmanifest"
if ($manifest -notmatch '"name"') {
    throw "manifest.webmanifest invalido"
}
$sw = Get-Text "$base/sw.js"
if ($sw -notmatch "precacheAndRoute") {
    throw "service worker invalido"
}
# A deep link must fall back to index.html (SPA), not 404.
$deep = Get-Text "$base/parcela/ficha"
if ($deep -notmatch "Anden") {
    throw "SPA fallback roto en /parcela/ficha"
}

$auth = Invoke-Post "/api/v1/auth/anonymous" @{
    display_name    = "Smoke"
    consent_version = "v1"
}
$authHeaders = @{ Authorization = "Bearer $($auth.access_token)" }
$parcel = Invoke-RestMethod -Method Post -Uri "$base/api/v1/demo/parcel" -Headers $authHeaders
$thread = Invoke-Post "/api/v1/agent/threads" @{ parcel_id = $parcel.id } $authHeaders

# Primer turno: saludo proactivo (no debe crear propuesta en modo chat).
$greeting = Invoke-Post "/api/v1/agent/threads/$($thread.thread_id)/messages" @{
    message = "Hola"
    mode    = "chat"
} $authHeaders
if (-not $greeting.answer) { throw "Saludo vacio" }
if ($greeting.pending_proposal_id) { throw "El modo chat no debe crear propuesta en el saludo" }

$compare = Invoke-Post "/api/v1/agent/threads/$($thread.thread_id)/messages" @{
    message = "Compara rotaciones que usen menos agua"
    mode    = "chat"
} $authHeaders
if (-not $compare.answer) { throw "Respuesta vacia" }
if (-not $compare.tool_trace) { throw "Sin tool_trace" }
$compareActions = @($compare.ui_actions)
if ($compareActions.Count -eq 0 -or $compareActions[0].action -ne "open_comparison") {
    throw "Accion inesperada: $($compare.ui_actions | ConvertTo-Json -Compress)"
}
if ($compare.warnings -contains "gemini_fallback") {
    throw "Gemini fallo: $($compare.warnings -join ',')"
}
if ($compare.answer.Length -gt 420) {
    throw "Respuesta > 420 caracteres: $($compare.answer.Length)"
}

$save = Invoke-Post "/api/v1/agent/threads/$($thread.thread_id)/messages" @{
    message = "Guarda un borrador"
} $authHeaders
$saveActions = @($save.ui_actions)
if ($saveActions.Count -eq 0 -or -not ($saveActions.action -contains "save_plan_draft")) {
    throw "Guardado inesperado: $($save.ui_actions | ConvertTo-Json -Compress)"
}

Write-Host "health=ok ready=ready compare=$($compare.answer.Length) chars save=save_plan_draft"
Write-Host "URL $base"
