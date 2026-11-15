[CmdletBinding()]
param(
    [string]$ProjectId = "project-59be27c2-c126-4ea7-b01",
    [string]$Region = "us-central1",
    [string]$Zone = "us-central1-a",
    [string]$VmName = "anden-vm"
)

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$ip = (gcloud compute addresses describe anden-ip --region=$Region `
    --project=$ProjectId --format="value(address)").Trim()
$domain = ($ip -replace '\.', '-') + ".sslip.io"

Write-Host "==> VM"
gcloud compute instances describe $VmName --zone=$Zone --project=$ProjectId `
    --format="value(name,machineType,status,networkInterfaces[0].accessConfigs[0].natIP)"

Write-Host "==> Contenedores y recursos"
gcloud compute ssh $VmName --zone=$Zone --tunnel-through-iap --project=$ProjectId `
    --command="sudo docker compose -f /opt/anden/docker-compose.yml --env-file /opt/anden/.env ps; free -m | head -2; df -h / | tail -1" `
    --quiet

Write-Host "==> Ready"
Invoke-RestMethod -Uri "https://$domain/api/v1/ready" | ConvertTo-Json -Compress
