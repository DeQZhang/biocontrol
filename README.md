# BioControl Linux 发布包

这个目录是 Linux 专用部署包，不包含源码。

统一脚本入口：

- 启动本机：bash start-local.sh
- 停止本机：bash stop-local.sh
- 查看本机状态：bash status-local.sh
- 查看本机日志：bash logs-local.sh
- 启动 Docker：bash start-docker.sh
- 停止 Docker：bash stop-docker.sh
- 查看 Docker 状态：bash status-docker.sh
- 查看 Docker 日志：bash logs-docker.sh
- 安装本机服务：bash install-service-local.sh
- 安装 Docker 服务：bash install-service-docker.sh

Linux 额外支持 systemd；这两个安装脚本可直接注册为开机自启服务。

详细步骤见：

- linux/快速开始-中文.md
