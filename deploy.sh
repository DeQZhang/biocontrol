#!/usr/bin/env bash
# ============================================================
#  BioControl 一键部署脚本 (Release 版)
#  用法:  bash deploy.sh          # 首次部署 / 更新部署
#         bash deploy.sh stop     # 停止所有服务
#         bash deploy.sh status   # 查看运行状态
#         bash deploy.sh logs     # 查看实时日志
#         bash deploy.sh restart  # 重启所有服务
#         bash deploy.sh down     # 停止并移除容器
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"
ENV_EXAMPLE=".env.example"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

check_docker() {
  command -v docker &>/dev/null || error "未检测到 Docker，请先安装"
  docker info &>/dev/null       || error "Docker 未运行，请启动后重试"
  docker compose version &>/dev/null || error "未检测到 Docker Compose V2"
  ok "Docker 环境检查通过"
}

gen_password() {
  LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 24 2>/dev/null || true
}

init_env() {
  if [ -f "$ENV_FILE" ]; then
    info "检测到已有 $ENV_FILE，跳过生成"
    return
  fi
  [ -f "$ENV_EXAMPLE" ] || error "缺少 $ENV_EXAMPLE 模板文件"

  DB_PASS="$(gen_password)"
  ROOT_PASS="$(gen_password)"

  sed \
    -e "s/BIOCONTROL_DB_PASSWORD=AUTO_GENERATED/BIOCONTROL_DB_PASSWORD=${DB_PASS}/" \
    -e "s/BIOCONTROL_MYSQL_ROOT_PASSWORD=AUTO_GENERATED/BIOCONTROL_MYSQL_ROOT_PASSWORD=${ROOT_PASS}/" \
    "$ENV_EXAMPLE" > "$ENV_FILE"

  ok "已生成 $ENV_FILE（数据库密码已自动随机生成）"
}

init_conf() {
  if [ ! -f conf/app.conf ] && [ -f conf/app.conf.example ]; then
    cp conf/app.conf.example conf/app.conf
    ok "已从模板创建 conf/app.conf"
  fi
}

do_deploy() {
  check_docker
  init_env
  init_conf
  info "构建并启动服务..."
  docker compose -f "$COMPOSE_FILE" up --build -d
  echo ""
  ok "部署完成！"
  docker compose -f "$COMPOSE_FILE" ps
  echo ""
  PORT=$(grep -oP 'BIOCONTROL_FRONTEND_PUBLISHED_PORT=\K\d+' "$ENV_FILE" 2>/dev/null || echo "8080")
  info "访问地址: http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo 'localhost'):${PORT}"
}

case "${1:-}" in
  stop)    docker compose -f "$COMPOSE_FILE" stop ;;
  status)  docker compose -f "$COMPOSE_FILE" ps ;;
  logs)    docker compose -f "$COMPOSE_FILE" logs -f ;;
  restart) docker compose -f "$COMPOSE_FILE" restart ;;
  down)    docker compose -f "$COMPOSE_FILE" down ;;
  *)       do_deploy ;;
esac
