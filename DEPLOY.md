# BioControl 三平台部署说明

## 目录选择

- Linux 服务器：使用 `linux/`
- macOS 主机：使用 `mac/`
- Windows 主机：使用 `win/`

## 支持方式

- Docker / Docker Compose：三个版本均支持
- 物理机直接运行：三个版本均支持
- systemd：仅 Linux 支持，这是 systemd 的平台限制

## 统一脚本入口

- `start-local`：本机后台启动
- `stop-local`：停止本机进程
- `status-local`：查看本机进程状态
- `logs-local`：查看本机日志
- `start-docker`：启动 Docker Compose
- `stop-docker`：停止 Docker Compose
- `status-docker`：查看 Docker Compose 状态
- `logs-docker`：查看 Docker Compose 日志
- `install-service-local`：安装本机服务
- `install-service-docker`：安装 Docker 服务

脚本扩展名规则：

- Linux/macOS：`.sh`
- Windows：`.ps1`

## 快速开始

### 1. Docker 方式

进入对应平台目录后执行：

- Linux/macOS: `bash start-docker.sh`
- Windows: `powershell -ExecutionPolicy Bypass -File .\start-docker.ps1`

首次执行会自动根据 `.env.example` 生成 `.env`。

### 2. 物理机方式

要求本机或可访问的 MySQL 已准备好。

- Linux/macOS: `bash start-local.sh`
- Windows: `powershell -ExecutionPolicy Bypass -File .\start-local.ps1`

首次执行会自动根据 `.env.local.example` 生成 `.env.local`，你只需要补齐数据库连接信息即可。

### 3. systemd 方式

仅 Linux：

- Docker Compose 开机自启：`bash install-service-docker.sh`
- 物理机开机自启：`bash install-service-local.sh`

## 说明

- Docker 目录中包含 Linux AMD64 和 ARM64 二进制，Docker 构建会自动按宿主架构选择。
- 物理机目录中包含对应平台二进制，启动脚本会自动根据架构选择。
- 前端已预构建为 dist，物理机模式下由后端直接托管。
- 安装完成后默认可试用 1 个月；试用期结束后可在系统激活页查看物理地址（MAC）并申请正式授权。
