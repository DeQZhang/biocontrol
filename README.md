# BioControl Deploy Repository

这个仓库只包含可部署产物，不包含业务源码。

推荐下载方式：

- Linux 包：`biocontrol-linux-20260420.tar.gz`
- Linux 无 Logo 包：`biocontrol-linux-no-logo-20260420.tar.gz`
- macOS 包：`biocontrol-mac-20260420.tar.gz`
- Windows 包：`biocontrol-win-20260420.zip`
- 客户安装卡片：`biocontrol-client-card-zh-20260420.md`
- 售后短卡：`biocontrol-client-card-short-zh-20260420.md`
- 微信消息版：`biocontrol-wechat-message-zh-20260420.txt`
- 常见问题：`biocontrol-faq-short-zh-20260420.md`

Release 页面：

`https://github.com/DeQZhang/biocontrol/releases/tag/deploy-20260420`

下载后直接解压即可。

授权说明：

- 安装完成后默认可试用 1 个月，无需先激活
- 试用期结束后，系统激活界面会显示服务器物理地址（MAC）
- 将该物理地址发送给管理员后即可获取正式许可证

统一脚本入口：

- 本机启动：`start-local`
- 本机停止：`stop-local`
- 本机状态：`status-local`
- 本机日志：`logs-local`
- Docker 启动：`start-docker`
- Docker 停止：`stop-docker`
- Docker 状态：`status-docker`
- Docker 日志：`logs-docker`
- 服务安装：`install-service-local` / `install-service-docker`

Linux/macOS 使用 `.sh`，Windows 使用 `.ps1`。

详细说明见 `DEPLOY.md`、`快速开始-中文.md`、客户安装卡片、售后短卡、微信消息版和常见问题。
