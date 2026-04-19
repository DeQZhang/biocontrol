# Linux 远程部署执行版

本文档只保留运维执行所需的最小步骤。

## 1. 服务器准备

```bash
sudo apt update
sudo apt install -y git docker.io docker-compose-plugin
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
newgrp docker
sudo ufw allow 8080/tcp
sudo ufw status
```

云服务器还需要在安全组中放行 TCP `8080`。

## 2. 首次部署

```bash
mkdir -p ~/apps
cd ~/apps
git clone 你的仓库地址 biocontrol
cd biocontrol
cp .env.server.example .env
docker compose -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```

访问地址：

```text
http://你的Linux服务器公网IP:8080
```

## 3. 默认数据库配置

```env
BIOCONTROL_DB_HOST=mysql
BIOCONTROL_DB_PORT=3306
BIOCONTROL_DB_NAME=biocontrol
BIOCONTROL_DB_USER=zdq
BIOCONTROL_DB_PASSWORD=19931012buSHI110
BIOCONTROL_MYSQL_ROOT_PASSWORD=root123456
BIOCONTROL_MYSQL_VOLUME_NAME=biocontrol-mysql-data
```

推荐服务器 .env 最小配置：

```env
BIOCONTROL_FRONTEND_CONTAINER_NAME=biocontrol-frontend-prod
BIOCONTROL_FRONTEND_IMAGE_NAME=biocontrol-frontend:latest
BIOCONTROL_BACKEND_CONTAINER_NAME=biocontrol-backend-prod
BIOCONTROL_BACKEND_IMAGE_NAME=biocontrol-backend:latest
BIOCONTROL_MYSQL_CONTAINER_NAME=biocontrol-mysql-prod
BIOCONTROL_HTTP_ADDR=0.0.0.0
BIOCONTROL_HTTP_PORT=8080
BIOCONTROL_FRONTEND_PUBLISHED_PORT=8080
BIOCONTROL_DB_HOST=mysql
BIOCONTROL_DB_PORT=3306
BIOCONTROL_DB_NAME=biocontrol
BIOCONTROL_DB_USER=zdq
BIOCONTROL_DB_PASSWORD=19931012buSHI110
BIOCONTROL_MYSQL_ROOT_PASSWORD=root123456
BIOCONTROL_MYSQL_VOLUME_NAME=biocontrol-mysql-data
BIOCONTROL_TZ=Asia/Shanghai
BIOCONTROL_LOG_MAX_SIZE=20m
BIOCONTROL_LOG_MAX_FILE=5
```

如果你有历史 SQLite 数据，需要单独做一次导入迁移；当前部署脚本不会再直接挂载 biocontrol.db。

## 4. 开机自启

仓库已提供 systemd 自启动安装脚本：

```bash
cd ~/apps/biocontrol
bash scripts/install-systemd-service.sh $(pwd) biocontrol-compose
```

常用检查命令：

```bash
systemctl status biocontrol-compose --no-pager
systemctl is-enabled biocontrol-compose
journalctl -u biocontrol-compose -n 100 --no-pager
```

## 5. 更新

```bash
cd ~/apps/biocontrol
git pull
docker compose -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.prod.yml logs -f
```

## 6. 回滚

查看提交记录：

```bash
cd ~/apps/biocontrol
git log --oneline -n 10
```

回滚到指定提交：

```bash
cd ~/apps/biocontrol
git checkout 指定提交ID
docker compose -f docker-compose.prod.yml up --build -d
```

如果只想回到上一个版本：

```bash
cd ~/apps/biocontrol
git checkout HEAD~1
docker compose -f docker-compose.prod.yml up --build -d
```

查看回滚后状态：

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```