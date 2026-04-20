#!/usr/bin/env bash
set -euo pipefail
cd "$(cd "$(dirname "$0")" && pwd)"
if [ -f biocontrol.pid ] && kill -0 "$(cat biocontrol.pid)" >/dev/null 2>&1; then
  echo "BioControl is running, PID=$(cat biocontrol.pid)"
else
  echo "BioControl is not running"
fi
