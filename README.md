# BioControl Deploy Repository

这个仓库只包含可部署产物，不包含业务源码。

可选版本分支：

- `linux`：Linux 物理机、Docker Compose、systemd
- `mac`：macOS 物理机、Docker Compose
- `win`：Windows 物理机、Docker Compose

如果你只想拉取其中一个版本，直接按分支拉取：

```bash
git clone --depth 1 --single-branch -b linux https://github.com/DeQZhang/biocontrol.git
```

将 `linux` 替换成 `mac` 或 `win` 即可。

`main` 分支只保留索引说明，不包含运行产物。详细说明见 `DEPLOY.md`。
