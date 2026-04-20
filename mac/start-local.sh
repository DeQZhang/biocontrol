#!/usr/bin/env bash
set -euo pipefail
cd "$(cd "$(dirname "$0")" && pwd)"
[ -f .env.local ] || cp .env.local.example .env.local
mkdir -p logs
nohup bash ./start-local-foreground.sh > logs/biocontrol.log 2>&1 &
echo $! > biocontrol.pid
echo "Started BioControl locally, PID=$(cat biocontrol.pid)"
