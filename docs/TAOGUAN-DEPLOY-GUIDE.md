# 韬冠律所全流程综合管理系统（TaoGuan LawLink）公网部署与全端使用手册

## 1. 公网云服务器一键部署（推荐：Ubuntu 22.04 / 24.04）

### 1.1 前置条件
1. 一台具备公网 IP 的 Linux 云服务器（阿里云 / 腾讯云 / 华为云 / AWS 等，建议配置 2 核 4G、硬盘 ≥ 40GB）。
2. 安全组 / 防火墙放行 `80/tcp` 与 `443/tcp` 端口（数据库 `5432` 端口**切勿**对公网暴露）。
3. 准备一个已解析至服务器公网 IP 的域名（如 `os.taoguanlaw.cn`），系统内置的 Caddy 2 会自动申请并续期 Let's Encrypt HTTPS 证书。

### 1.2 一键安装命令
```bash
git clone https://github.com/woshiyuyanjia123/taoguan-lawlink.git
cd taoguan-lawlink
chmod +x deploy/install-ubuntu.sh
./deploy/install-ubuntu.sh
```

脚本自动完成以下步骤：
1. 生成高强度随机 `POSTGRES_PASSWORD`、`NEXTAUTH_SECRET` 与 `STORAGE_ENCRYPTION_KEY`（写入权限 `600` 的 `.env`）。
2. 启动 `docker-compose.prod.yml`（PostgreSQL 16 + TaoGuan LawLink App + Caddy 2 自动 HTTPS）。
3. 执行 `prisma migrate deploy` 与 `prisma db seed` 初始化韬冠总所、管理委员会、案由库、期限规则、内置文书模板与初始超级管理员。

> **极其重要**：请妥善离线保管 `.env` 中的 `STORAGE_ENCRYPTION_KEY`。该密钥用于 AES-256-GCM 加密律所证件与案卷材料，独立于数据库备份，一旦丢失已加密附件不可恢复。

---

## 2. 全端客户端安装与连接公网服务器

所有桌面端与手机端安装包均由 GitHub Actions 自动编译并托管于本仓库 **Releases** 页面：

### 2.1 Windows 电脑客户端
- 下载 `TaoGuan-LawLink-Setup-x.y.z-win-x64.exe`（标准安装版）或 `TaoGuan-LawLink-Portable-x.y.z-win-x64.exe`（免安装绿色版）。
- 首次启动在「连接律所服务器」界面输入公网 HTTPS 地址（如 `https://os.taoguanlaw.cn`），点击「检测连通性」确认返回 `韬冠律所` 后点击「保存并进入工作台」。
- 快捷键 `Ctrl + Shift + S` 可随时切换总所/分所/测试服务器；`Ctrl + P` 原生打印合同与财务表。

### 2.2 macOS 电脑客户端
- Apple Silicon（M1/M2/M3/M4）下载 `TaoGuan-LawLink-x.y.z-mac-arm64.dmg`；Intel Mac 下载 `x64.dmg`。
- 打开 `.dmg` 将应用拖入 `Applications` 文件夹；首次打开如遇 macOS 未公证提示，右键点击图标选择「打开」即可。

### 2.3 Android 手机 App
- 下载 `TaoGuan-LawLink-Android.apk` 直接安装到安卓手机。
- 首次打开填写公网 HTTPS 地址并连接，后续自动记住直达工作台，支持手机相册/现场拍照直传证据、合同扫描件与增值税发票。

### 2.4 iOS（iPhone / iPad）手机端
- **方案 A（免商店、零签名、立即可用）**：使用 iPhone 自带 Safari 浏览器访问公网地址（如 `https://os.taoguanlaw.cn`）→ 点击底部「分享」按钮 → 选择「添加到主屏幕」，即可在桌面获得无地址栏全屏独立 App。
- **方案 B（原生上架 App Store / TestFlight）**：从 Releases 下载 `TaoGuan-LawLink-iOS-Xcode-Project.zip`，在 macOS Xcode 中打开 `ios/App/App.xcworkspace`，选择您的 Apple Developer Team 签名后 Archive 上传即可。

---

## 3. 首次上线初始化清单
1. 使用初始管理员账号登录并立刻修改默认密码，在 `/settings/profile` 开启 TOTP 两步验证。
2. 进入 `/admin/offices` 创建各分所办公室（支持一键克隆费率与阈值），确认管理费率（默认 15%）、互转附加费率（默认 3%）、先开票未回款红警天数（默认 30 天）与单案函证超限阈值。
3. 进入 `/admin/users` 创建各办公室律师与行政审核账号，并配置 `/admin/approval-permissions` 审批岗位。
4. 进入 `/hr-admin` 发布本所规章制度，组织全员在线签署带防伪水印编码的已阅确认回执。

---

## 4. 数据备份与电子印章合规说明
- **自动备份**：容器每天 `02:30` 自动执行数据库 `pg_dump` 与文件存储备份至宿主机 `./data/backups`，建议配合定时任务同步至阿里云 OSS / 腾讯云 COS / 异地存储。
- **持牌 CA 电子签章对接**：系统内置电子防伪红章与 `/public/verify/[certNo]` 二维码公开核验，用于内部审批与防伪留痕；对外签署需要具备《中华人民共和国电子签名法》司法效力的可靠电子签名时，请在正式上线后对接国内持牌 CA（CFCA / 江苏CA / e签宝 / 法大大）实时签章 API。
