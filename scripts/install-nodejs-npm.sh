#!/usr/bin/env bash

set -euo pipefail

NODE_MAJOR="${1:-20}"

if [[ ! -r /etc/os-release ]]; then
  echo "Cannot detect Linux distribution: /etc/os-release is missing" >&2
  exit 1
fi

# shellcheck disable=SC1091
source /etc/os-release

SUDO=""
if [[ "${EUID}" -ne 0 ]]; then
  SUDO="sudo"
fi

install_with_apt() {
  ${SUDO} apt-get update
  ${SUDO} apt-get install -y ca-certificates curl gnupg
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | ${SUDO} -E bash -
  ${SUDO} apt-get install -y nodejs build-essential
}

install_with_dnf() {
  curl -fsSL "https://rpm.nodesource.com/setup_${NODE_MAJOR}.x" | ${SUDO} bash -
  ${SUDO} dnf install -y nodejs gcc-c++ make
}

install_with_yum() {
  curl -fsSL "https://rpm.nodesource.com/setup_${NODE_MAJOR}.x" | ${SUDO} bash -
  ${SUDO} yum install -y nodejs gcc-c++ make
}

case "${ID:-}" in
  ubuntu|debian|linuxmint)
    install_with_apt
    ;;
  *)
    if [[ "${ID_LIKE:-}" == *"debian"* ]] && command -v apt-get >/dev/null 2>&1; then
      install_with_apt
    elif command -v dnf >/dev/null 2>&1; then
      install_with_dnf
    elif command -v yum >/dev/null 2>&1; then
      install_with_yum
    else
      echo "Unsupported distribution: ${PRETTY_NAME:-unknown}" >&2
      echo "Install Node.js ${NODE_MAJOR}.x manually, then rerun verification." >&2
      exit 1
    fi
    ;;
esac

echo
echo "Installed versions:"
node -v
npm -v
