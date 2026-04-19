# BioControl

## 架构

当前项目已调整为纯 Beego + Vue 3 架构：

- Go 后端使用 Beego 提供 HTTP 服务
- Vue 前端继续使用 Vite 构建
- 前端通过 frontend/src/api/services 下的 API 模块直接调用 Beego 分组接口
- 数据层使用 GORM + MySQL

## 开发运行

开发模式使用前后端双服务：

- Beego 单独提供 API，默认监听 http://0.0.0.0:8080
- Vite dev server 单独提供前端页面，默认监听 http://0.0.0.0:5173
- MySQL 默认监听 127.0.0.1:3306
- 前端发往 /api 的请求会自动代理到后端

一条命令同时启动前后端：

```bash
make dev
```

这条命令会：

- 自动检查 frontend/node_modules，不存在时先安装前端依赖
- 在后台启动 Beego API
- 在前台启动 Vite dev server
- 退出时自动结束后端进程

启动后端：

```bash
go run .
```

本机直跑后端前，请先准备 MySQL，并设置或确认以下环境变量：

```bash
BIOCONTROL_DB_HOST=127.0.0.1
BIOCONTROL_DB_PORT=3306
BIOCONTROL_DB_NAME=biocontrol
BIOCONTROL_DB_USER=zdq
BIOCONTROL_DB_PASSWORD=19931012buSHI110
```

启动前端开发服务器：

```bash
cd frontend
npm install
npm run dev
```

本机开发时在浏览器打开：

```bash
http://127.0.0.1:5173
```

如果你在 Linux 服务器上调试并希望局域网或公网机器直接访问开发页，开放服务器端口后使用：

```bash
cd frontend
VITE_DEV_HOST=0.0.0.0 npm run dev
```

然后从远端浏览器访问：

```text
http://你的Linux服务器IP:5173
```

如果后端也需要明确监听公网网卡，可以这样启动：

```bash
BIOCONTROL_HTTP_ADDR=0.0.0.0 go run .
```

如果后端不是运行在 8080，可以在启动前端前指定代理目标：

```bash
cd frontend
VITE_API_TARGET=http://127.0.0.1:9000 npm run dev
```

如果你希望一条命令启动并改掉后端地址，也可以这样运行：

```bash
make dev API_ADDR=http://127.0.0.1:9000
```

## 生产构建

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

生产环境默认拆为 3 个容器：

- frontend：Nginx 提供静态页面并反向代理 /api
- backend：Beego API 服务
- mysql：MySQL 8 数据库

## Docker 部署

如果你要在 Linux 服务器上通过公网远程访问部署，直接看：

- [DEPLOY_LINUX_REMOTE.md](DEPLOY_LINUX_REMOTE.md)
- [DEPLOY_LINUX_REMOTE_OPS.md](DEPLOY_LINUX_REMOTE_OPS.md)

项目已补齐 Linux 可用的 Docker 构建文件，推荐直接用 Docker Compose 一键构建并运行：

先准备环境变量文件：

```bash
cp .env.example .env
```

然后按需修改：

- `BIOCONTROL_FRONTEND_PUBLISHED_PORT`：宿主机暴露端口
- `BIOCONTROL_HTTP_PORT`：容器内 Beego 监听端口
- `BIOCONTROL_DB_HOST` / `BIOCONTROL_DB_PORT`：后端连接的 MySQL 地址
- `BIOCONTROL_DB_NAME` / `BIOCONTROL_DB_USER` / `BIOCONTROL_DB_PASSWORD`：MySQL 库配置
- `BIOCONTROL_MYSQL_ROOT_PASSWORD`：MySQL root 密码
- `BIOCONTROL_TZ`：时区

```bash
docker compose up --build -d
```

如果你习惯走 Makefile，也可以直接：

```bash
make docker-up
```

启动后访问：

```bash
http://127.0.0.1:8080
```

常用命令：

```bash
make docker-logs
make docker-down
```

如果要使用更收紧的生产版 Compose：

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

或者：

```bash
make docker-up-prod
```

说明：

- Docker Compose 会同时启动 frontend、backend、mysql 三个容器
- 前端镜像会在构建阶段自动执行 `npm run build`
- MySQL 数据存放在命名卷 `biocontrol-mysql-data` 中，避免容器重建后数据丢失
- 默认对外入口是 frontend 容器，浏览器访问 frontend，由它转发 `/api` 到 backend
- backend 容器默认仅在 Compose 内网暴露，不直接对公网开放
- 容器内默认监听地址为 `0.0.0.0`，可通过 `BIOCONTROL_HTTP_ADDR` 覆盖
- 生产版 compose 额外收紧了容器名、时区、日志轮转、`no-new-privileges`、`cap_drop` 和 `pids_limit`

服务器部署建议：

- 复制 `.env.server.example` 为 `.env` 后再启动，更适合 Linux 服务器直接部署
- 当前仓库包含 `scripts/install-nodejs-npm.sh`，可在 Debian、Ubuntu、Linux Mint 上安装 Node.js 20 和 npm
- 当前仓库包含 `deploy/systemd/biocontrol-compose.service.example` 和 `scripts/install-systemd-service.sh`，可把生产 compose 注册为开机自启服务

安装 Node.js 和 npm：

```bash
bash scripts/install-nodejs-npm.sh
```

安装 systemd 开机自启：

```bash
cp .env.server.example .env
docker compose -f docker-compose.prod.yml up --build -d
bash scripts/install-systemd-service.sh $(pwd) biocontrol-compose
```

查看自启动状态：

```bash
systemctl status biocontrol-compose --no-pager
systemctl is-enabled biocontrol-compose
```

## 测试

后端测试：

```bash
go test ./...
```

前端测试：

```bash
cd frontend
npm test
```

## 数据库

当前默认数据库为 MySQL。

后端默认读取以下环境变量：

```bash
BIOCONTROL_DB_HOST=127.0.0.1
BIOCONTROL_DB_PORT=3306
BIOCONTROL_DB_NAME=biocontrol
BIOCONTROL_DB_USER=zdq
BIOCONTROL_DB_PASSWORD=19931012buSHI110
```

如果你还保留旧的 SQLite 文件，需要自行做一次数据迁移；当前仓库已不再直接使用 biocontrol.db 作为运行数据库。
