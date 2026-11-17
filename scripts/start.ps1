$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath '.env')) {
    Copy-Item -LiteralPath '.env.example' -Destination '.env'
    Write-Host 'Arquivo .env criado. Revise as credenciais e informe OPENAI_API_KEY quando necessário.'
}

docker compose up --build -d
docker compose ps
