#!/bin/sh
set -eu

if [ ! -f .env ]; then
    cp .env.example .env
    echo 'Arquivo .env criado. Revise as credenciais e informe OPENAI_API_KEY quando necessário.'
fi

docker compose up --build -d
docker compose ps
