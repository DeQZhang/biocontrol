# BioControl Windows 发布包

这个目录是 Windows 专用部署包，不包含源码。

统一脚本入口：

- 启动本机：powershell -ExecutionPolicy Bypass -File .\start-local.ps1
- 停止本机：powershell -ExecutionPolicy Bypass -File .\stop-local.ps1
- 查看本机状态：powershell -ExecutionPolicy Bypass -File .\status-local.ps1
- 查看本机日志：powershell -ExecutionPolicy Bypass -File .\logs-local.ps1
- 启动 Docker：powershell -ExecutionPolicy Bypass -File .\start-docker.ps1
- 停止 Docker：powershell -ExecutionPolicy Bypass -File .\stop-docker.ps1
- 查看 Docker 状态：powershell -ExecutionPolicy Bypass -File .\status-docker.ps1
- 查看 Docker 日志：powershell -ExecutionPolicy Bypass -File .\logs-docker.ps1
- 安装本机服务：powershell -ExecutionPolicy Bypass -File .\install-service-local.ps1
- 安装 Docker 服务：powershell -ExecutionPolicy Bypass -File .\install-service-docker.ps1

Windows 不支持 systemd；同名服务脚本仅用于给出明确提示。

详细步骤见：

- win/快速开始-中文.md
