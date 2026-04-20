#!/usr/bin/env bash
set -euo pipefail
cd "$(cd "$(dirname "$0")" && pwd)"
[ -f .env.local ] || cp .env.local.example .env.local
set -a
. ./.env.local
set +a
arch="$(uname -m)"
case "$arch" in
  x86_64|amd64) bin="./bin/biocontrol-linux-amd64" ;;
  aarch64|arm64) bin="./bin/biocontrol-linux-arm64" ;;
  *) echo "Unsupported Linux arch: $arch" >&2; exit 1 ;;
esac
exec "$bin"
