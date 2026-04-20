#!/usr/bin/env bash
set -euo pipefail
cd "$(cd "$(dirname "$0")" && pwd)"
service_name="${1:-biocontrol-local}"
temp_file="$(mktemp)"
trap 'rm -f "$temp_file"' EXIT
sed "s|__BIOCONTROL_PROJECT_DIR__|$(pwd)|g" systemd/biocontrol-local.service.example > "$temp_file"
sudo install -m 0644 "$temp_file" "/etc/systemd/system/${service_name}.service"
sudo systemctl daemon-reload
sudo systemctl enable --now "${service_name}.service"
sudo systemctl status "${service_name}.service" --no-pager
