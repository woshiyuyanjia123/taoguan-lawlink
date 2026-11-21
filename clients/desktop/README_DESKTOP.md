# 韬冠律所桌面客户端（Windows & macOS）

基于 Electron 35 + electron-builder 26 构建的跨平台原生桌面客户端。

## 核心能力
- 首次启动自动展示「韬冠律所服务器连接向导」，支持填写公网 HTTPS 地址（如 `https://os.taoguanlaw.cn`）或局域网地址，并内置 `/api/health` 连通性探测。
- 记住最近连接的多套律所服务器（如总所公网、分所内网、测试环境），按 `Ctrl+Shift+S`（macOS `Cmd+Shift+S`）随时切换。
- 原生支持打印表单/合同（`Ctrl+P` / `Cmd+P`）与 PDF/Word/Excel/ZIP 电子卷宗下载。

## 本地打包命令
```bash
npm install
npm run dist:win    # 生成 Windows NSIS 安装包 (.exe) 与绿色便携版 (.exe)
npm run dist:mac    # 在 macOS 上生成 arm64 + x64 (.dmg) 安装包
npm run dist:linux  # 生成 Linux AppImage
```
