# Linux 远程部署文档

本文档用于把当前项目部署到 Linux 服务器，并通过公网远程访问。

当前生产编排固定为 3 个容器：

- frontend：Nginx 提供页面并转发 /api
- backend：Beego API
- mysql：MySQL 8 数据库

如果你只需要给运维一份最短执行版，直接看 [DEPLOY_LINUX_REMOTE_OPS.md](DEPLOY_LINUX_REMOTE_OPS.md)。

## 1. 部署前准备

Linux 服务器需要具备：

- Git
- Docker
- Docker Compose Plugin
- 可开放的公网端口，例如 8080

如果服务器还没装 Docker，可先执行：

```bash
sudo apt update
sudo apt install -y git docker.io docker-compose-plugin
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
newgrp docker
```

## 2. 上传代码到 Git

在本机项目根目录执行：

```bash
git add .
git commit -m "switch sqlite to mysql deployment"
git push
```

## 3. Linux 首次拉取部署

登录 Linux 后执行：

```bash
mkdir -p ~/apps
cd ~/apps
git clone 你的仓库地址 biocontrol
cd biocontrol
cp .env.server.example .env
docker compose -f docker-compose.prod.yml up --build -d
```

查看状态：

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```

## 4. 远程访问配置

默认通过宿主机 8080 端口对外提供服务，访问地址为：

```text
http://你的Linux服务器公网IP:8080
```

如果服务器启用了 ufw：

```bash
sudo ufw allow 8080/tcp
sudo ufw status
```

如果你使用的是云服务器，还需要在云平台安全组中放行入站 TCP 8080。

如果你不想用 8080，修改 .env：

```env
BIOCONTROL_FRONTEND_PUBLISHED_PORT=9000
```

然后重启：

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

## 5. MySQL 配置

默认 .env.server.example 已提供一套可直接启动的 MySQL 配置：

```env
BIOCONTROL_DB_HOST=mysql
BIOCONTROL_DB_PORT=3306
BIOCONTROL_DB_NAME=biocontrol
BIOCONTROL_DB_USER=zdq
BIOCONTROL_DB_PASSWORD=19931012buSHI110
BIOCONTROL_MYSQL_ROOT_PASSWORD=root123456
BIOCONTROL_MYSQL_VOLUME_NAME=biocontrol-mysql-data
```

MySQL 数据保存在 Docker 命名卷里，容器重建不会丢。

## 6. 旧 SQLite 数据说明

当前运行时已经不再使用 biocontrol.db。

如果你有历史 SQLite 数据，需要自行做一次导入迁移；当前仓库这次改动只负责把运行数据库切换到 MySQL，并自动在 MySQL 中建表。

## 7. 后续更新

以后项目更新，Linux 上执行：

```bash
cd ~/apps/biocontrol
git pull
docker compose -f docker-compose.prod.yml up --build -d
```

## 8. 常用运维命令

启动：

```bash
cd ~/apps/biocontrol
docker compose -f docker-compose.prod.yml up --build -d
```

查看日志：

```bash
cd ~/apps/biocontrol
docker compose -f docker-compose.prod.yml logs -f
```

停止：

```bash
cd ~/apps/biocontrol
docker compose -f docker-compose.prod.yml down
```

重启：

```bash
cd ~/apps/biocontrol
docker compose -f docker-compose.prod.yml restart
```

查看健康接口：

```bash
curl http://127.0.0.1:8080/api/health
```

## 9. 开机自启

可直接把生产编排注册为 systemd 服务：

```bash
cd ~/apps/biocontrol
bash scripts/install-systemd-service.sh $(pwd) biocontrol-compose
```

## 10. 常见问题

浏览器打不开时，优先检查：

- 容器是否启动成功
- Linux 防火墙是否放行 8080
- 云服务器安全组是否放行 8080
- 访问地址是否为公网 IP 加端口

修改 .env 后没生效时，重新执行：

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

```bash
cd ~/apps/biocontrol
git pull
docker compose -f docker-compose.prod.yml up --build -d
```