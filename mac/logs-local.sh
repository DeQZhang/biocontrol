#!/usr/bin/env bash
set -euo pipefail
cd "$(cd "$(dirname "$0")" && pwd)"
mkdir -p logs
touch logs/biocontrol.log
tail -f logs/biocontrol.log
