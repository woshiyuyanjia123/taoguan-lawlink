# 韬冠律所手机客户端（Android & iOS）

基于 Capacitor 6 构建的跨平台移动 App 壳层，自动连接部署在公网或局域网的韬冠律所全流程综合管理系统服务端。

## 方式一：直接下载安装包（推荐）
前往本仓库 **GitHub Releases** 页面下载：
- **Android 手机**：下载 `TaoGuan-LawLink-Android.apk` 直接安装。
- **iPhone（零商店免签名方案）**：用 Safari 浏览器打开您的公网地址（如 `https://os.taoguanlaw.cn`），点击底部「分享」→「添加到主屏幕」，即获得全屏无地址栏独立 App 体验。
- **iPhone（App Store / 企业签名 IPA）**：下载 Releases 中的 `TaoGuan-LawLink-iOS-Xcode-Project.zip`，在 macOS Xcode 中配置您的 Apple Developer Team 证书即可签名打包上传 TestFlight / App Store。

## 方式二：本地从源码编译
```bash
npm install
npx cap add android && npx cap sync
npx cap open android   # 在 Android Studio 中构建签名版 APK / AAB

# macOS 环境构建 iOS：
npx cap add ios && npx cap sync
npx cap open ios       # 在 Xcode 中签名导出 IPA
```
