# 韬冠律所全流程综合管理系统（TaoGuan LawLink）

**事有经纬，案有始终；多所协同，全端直达。**

本项目基于优秀开源律所底座 **[LawLink v2.0.1](https://github.com/lawflow-boop/LawLink)**（MIT License）深度二开扩展，严格融合中国本土合伙制/提成制律所《管理软件开发需求说明书 9.10 版》全套业务与财务规范，提供 **公网 HTTPS 一键服务端 + Web + Windows 桌面版 + macOS 桌面版 + Android / iOS 手机 App（及免商店 PWA）** 的全栈一体化交付。

---

## 一、全端覆盖与公网使用架构

本项目采用**中心化公网/私有化大数据库（PostgreSQL 16）+ 多端原生客户端直连**架构，确保总所、各分所办公室、管理委员会在多端实时共享全域利益冲突检索、案卷与财务数据：

| 终端 | 形态与产物 | 获取与使用方式 |
|---|---|---|
| **公网 Web 服务端** | Next.js 16 + PostgreSQL 16 + Caddy 2 自动 HTTPS | 支持阿里云/腾讯云/自有 Linux 服务器一键部署，浏览器即开即用 |
| **Windows 桌面端** | Electron 原生安装版 (`Setup.exe`) & 绿色便携版 (`Portable.exe`) | 从本仓库 **GitHub Releases** 直接下载安装，支持保存/切换多套公网服务器地址、原生打印与文书下载 |
| **macOS 桌面端** | Electron Apple Silicon (`arm64.dmg`) & Intel (`x64.dmg`) | 从本仓库 **GitHub Releases** 直接下载 `.dmg` 拖入应用程序，支持 Apple Silicon 与 Intel Mac |
| **Android 手机 App** | Capacitor 6 原生安装包 (`.apk`) | 从本仓库 **GitHub Releases** 直接下载 `.apk` 安装到安卓手机，支持拍照直传证据/发票与公网直连 |
| **iOS 手机端** | Capacitor 6 iOS Xcode 工程包 + Safari 免商店 PWA | Releases 提供完整 Xcode 工程包供 Apple 开发者账号签名上架；亦可在 iPhone Safari 打开公网地址点击「添加到主屏幕」零商店全屏运行 |

---

## 二、核心功能矩阵（上游 LawLink 全部能力 + 韬冠 9.10 六大企业级扩展）

### 1. 完整继承 LawLink v2.0.1 生产级底座（84 张表）
- 案件全生命周期管理（多程序/多阶段、证据目录、财产保全续封提醒、法定时限+中国法定节假日顺延）。
- 法院来件/短信解析、附件提取与可选 OCR/AI 整理建议、元典企业与案例查询、快递轨迹追踪。
- `docxtemplater` 文书模板变量套打、带防伪水印预览与下载、归档快照与限时只读借阅、AES-256-GCM 证件加密存储与审计日志、TOTP 两步验证。

### 2. 韬冠律所深度扩展模块（新增 22 张表与 8 个专属工作台）
1. **多办公室 + 唯一最高管理委员会 + 超管紧急暂停**（`/admin/offices`）
   - 总所、独立分所与唯一最高「管理委员会」共用一个大数据库，独立核算、全域协同；支持一键克隆新分所费率与规则；超级管理员可在任意业务模块/单据节点触发或解除紧急暂停锁。
2. **刑事辩护 7 选 1 专项收案、全域无空格利冲与双路径签章**（`/criminal-intake`）
   - **全域便捷利冲窗口**：强制禁止空格输入防绕过，实时检索全所正式案/在途收案/刑辩专项。
   - **刑事辩护专项填报**：7 选 1 委托收费模式（含“仅会见按次 = 单价 × 次数自动算”、法援二选一）、实时人民币中文大写、18 项委托阶段、数罪多选、强制措施与办理机关、涉外/涉黑/敏感标识、他人代为发起与案件负责人 4 项处置（同意/接管/退回/换主办）。
   - **30 天草稿自动清理**：草稿逾期自动清理，但暂存主体保留在个人主体库，未正式收案不进入全所客户大库。
   - **真假利冲非对称裁决平台**：提交利冲即永久锁定主表；初级审核无权单方驳回真利冲，必须上呈管理委员会终审，并完整留存多方会议纪要。
   - **双签章路径**：路径 A（委托人先签章）与路径 B（律所先电子用印、客户回寄实体原件），三件一致核验确认收到后自动赋正式收案号。
3. **内部流水账财务 ABCD 四表与上下联尺子式银行拆单**（`/finance-abcd`）
   - **A 首席观察表（律所账号）**：A1–A14 全口径十进制分精度勾稽，同时披露律所自有留存净余额与银行托管总余额双口径（满足 `银行托管总额 = 律所自有留存 + 全体律师账面余额` 恒等式）。
   - **B 个人观察表（律师虚拟账户）**：B1 个人创收、B2 管理费（默认 15%）、B3/B4 互转、B5 附加管理费（3%）、B6–B13 薪税险与结差报销、B14 账面余额；单列**已开票未上传发票扫描件冻结额**与**实际可支配余额**（上传即解冻）。
   - **C 月度操作表 & D 单次操作表**：严格三步闭环「草稿 → 预备保存（A/B 表实时展示预备变化值并解锁下载）→ 登记第 N 次下载 → 确认已办理原子落账」。
   - **自由互转与我的财务**：律师间免审核自由互转，收款确认自动扣 3% 附加管理费入 B5/A3；内置 6 类个人资金申请与定期对账。
   - **银行网银流水 CSV 导入与尺子式核销**：支持单笔相符、部分入账、一笔拆多案防超额与防重复推送，律师逐笔确认后自动落账 B1/B2。
   - **A/B/C/D 开票与 30 天红警**：C 类先开票后入账超 30 天未收款自动触发红色预警。
4. **人事入离职档案、规章水印确认与一般行政**（`/hr-admin`）
   - 入职选分所建档、规章制度多版本并列留存与带防伪水印编码的已阅承诺回执；离职须先线下谈妥由审批岗解锁线上离职通道，办结后生成编号人事电子档案并完整保留历史账务关联；涵盖采购/对外签合约/对外付款/人员招聘一般行政审批。
5. **电子办案函证批量红章签发与对外免登录门户**（`/e-certificates` & `/public/*`）
   - 电子函证批量申请、单案出函超限报警、批量电子红章签发、打印次数留痕（第 N 次打印）。
   - 公开免登录 H5 门户（可直接转发微信）：
     - `/public/card/[userId]`：韬冠律所律师电子名片
     - `/public/invoice/[token]`：客户免登录自助填报/核对开票抬头与税号
     - `/public/verify/[certNo]`：扫描电子函证二维码实时防伪验真

---

## 三、公网云服务器一键部署（自动申请 HTTPS 证书）

准备一台带公网 IP 的 Linux 服务器（推荐 Ubuntu 22.04/24.04，2C4G 及以上，已安装 Docker 与 Docker Compose），将域名解析至服务器 IP：

```bash
git clone https://github.com/woshiyuyanjia123/taoguan-lawlink.git
cd taoguan-lawlink
chmod +x deploy/install-ubuntu.sh
./deploy/install-ubuntu.sh
```

脚本会自动生成高强度随机数据库密码、`NEXTAUTH_SECRET` 与 `STORAGE_ENCRYPTION_KEY`，通过 `docker-compose.prod.yml` 拉起 **PostgreSQL 16 + TaoGuan LawLink + Caddy 2 自动 HTTPS**，并自动完成数据库迁移和初始管理员账号创建。

> **客户端连接方式**：部署完成后，打开 Windows / macOS 桌面客户端或 Android / iOS 手机 App，在首次启动向导中填入您的公网 HTTPS 地址（例如 `https://os.taoguanlaw.cn`）即可全端协同使用。

---

## 四、本地开发与多端自行编译

### 1. Web 服务端（支持 Windows / macOS / Linux）
```bash
cp .env.example .env
# 在 .env 中填好 DATABASE_URL / NEXTAUTH_SECRET / STORAGE_ENCRYPTION_KEY
docker compose up -d db
npm ci
npm run prisma:generate
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

### 2. 编译桌面客户端（Windows / macOS）
```bash
cd clients/desktop
npm install
npm run dist:win   # Windows 生成 NSIS 安装包与绿色便携版 .exe
npm run dist:mac   # macOS 生成 arm64 + x64 .dmg 安装包
```

### 3. 编译手机客户端（Android / iOS）
```bash
cd clients/mobile
npm install
npx cap add android && npx cap sync   # Android Studio 打开并编译 APK/AAB
npx cap add ios && npx cap sync       # macOS Xcode 打开并签名 IPA
```

---

## 五、质量验证与合规声明

- 本仓库配套完整 CI（`.github/workflows/ci.yml`）验证 `lint`、`typecheck`、`prisma validate`、`prisma migrate diff` 零漂移校验、全新安装初始化验证、780+ 项自动化单元测试与生产构建。
- **电子印章合规提示**：系统内置电子防伪红章与公开二维码验真用于内部流转与防伪核验；对外签署需具备《中华人民共和国电子签名法》司法效力的可靠电子签章场景，正式上线前请接入持牌 CA（CFCA / 江苏CA / e签宝 / 法大大）。
- **开源协议与上游致谢**：本项目遵循 [MIT License](./LICENSE)，核心基础架构源自 [lawflow-boop/LawLink](https://github.com/lawflow-boop/LawLink)，特此致谢。
