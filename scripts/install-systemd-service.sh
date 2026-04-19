#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="${1:-$(pwd)}"
SERVICE_NAME="${2:-biocontrol-compose}"
TEMPLATE_PATH="${PROJECT_DIR}/deploy/systemd/biocontrol-compose.service.example"
TARGET_PATH="/etc/systemd/system/${SERVICE_NAME}.service"

if [[ ! -d "${PROJECT_DIR}" ]]; then
  echo "Project directory not found: ${PROJECT_DIR}" >&2
  exit 1
fi

if [[ ! -f "${PROJECT_DIR}/docker-compose.prod.yml" ]]; then
  echo "docker-compose.prod.yml not found in: ${PROJECT_DIR}" >&2
  exit 1
fi

if [[ ! -f "${TEMPLATE_PATH}" ]]; then
  echo "Service template not found: ${TEMPLATE_PATH}" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker command not found" >&2
  exit 1
fi

REAL_PROJECT_DIR="$(cd "${PROJECT_DIR}" && pwd)"
SUDO=""
if [[ "${EUID}" -ne 0 ]]; then
  SUDO="sudo"
fi

TEMP_FILE="$(mktemp)"
trap 'rm -f "${TEMP_FILE}"' EXIT

sed "s|__BIOCONTROL_PROJECT_DIR__|${REAL_PROJECT_DIR}|g" "${TEMPLATE_PATH}" > "${TEMP_FILE}"

${SUDO} install -m 0644 "${TEMP_FILE}" "${TARGET_PATH}"
${SUDO} systemctl daemon-reload
${SUDO} systemctl enable --now "${SERVICE_NAME}.service"
${SUDO} systemctl status "${SERVICE_NAME}.service" --no-pager
