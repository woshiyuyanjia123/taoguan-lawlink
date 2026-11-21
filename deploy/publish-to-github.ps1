# 韬冠律所全流程综合管理系统 — 一键创建 GitHub 公开仓库并触发全端（Win/Mac/Android/iOS/Docker）Releases 自动编译
param(
  [string]$RepoName = "taoguan-lawlink",
  [string]$Tag = "v2.1.0"
)

$ErrorActionPreference = "Stop"
$gh = "C:\Program Files\GitHub CLI\gh.exe"
if (-not (Test-Path $gh)) {
  $gh = "gh"
}

Write-Host "=== 1. 检查 GitHub CLI 登录状态 ==="
& $gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "尚未完成 GitHub CLI 授权，即将启动浏览器一次性设备码登录..."
  & $gh auth login -h github.com -p https -w
}

Write-Host "=== 2. 创建公开仓库 $RepoName 并推送 main 分支 ==="
& $gh repo view $RepoName 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  & $gh repo create $RepoName --public --description "韬冠律所全流程综合管理系统 (TaoGuan LawLink) — 基于 LawLink MIT 扩展，支持公网 HTTPS + Web/Windows/macOS/Android/iOS 全端协同" --source . --remote origin --push
} else {
  git push -u origin main
}

Write-Host "=== 3. 推送发布标签 $Tag 以自动触发 Windows/macOS/Android/iOS/Docker 多端编译 ==="
git tag -f $Tag
git push -f origin $Tag

Write-Host "=== 发布完成！请前往 GitHub Actions 与 Releases 查看多端安装包 ==="
& $gh repo view $RepoName --web
