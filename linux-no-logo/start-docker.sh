#!/usr/bin/env bash
set -euo pipefail
cd "$(cd "$(dirname "$0")" && pwd)"

gen_password() { LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 24 2>/dev/null || true; }

if [ ! -f .env ]; then
  db_pass="$(gen_password)"
  root_pass="$(gen_password)"
  sed -e "s/BIOCONTROL_DB_PASSWORD=AUTO_GENERATED/BIOCONTROL_DB_PASSWORD=${db_pass}/" \
      -e "s/BIOCONTROL_MYSQL_ROOT_PASSWORD=AUTO_GENERATED/BIOCONTROL_MYSQL_ROOT_PASSWORD=${root_pass}/" \
      .env.example > .env
fi

docker compose up --build -d
docker compose ps
