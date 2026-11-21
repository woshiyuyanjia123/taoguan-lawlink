#!/usr/bin/env bash
# 韬冠律所全流程综合管理系统 — 公网 Linux/Ubuntu 服务器一键部署脚本
set -euo pipefail

echo "============================================================"
echo "  韬冠律所全流程综合管理系统 (TaoGuan LawLink) 公网一键部署"
echo "============================================================"

if ! command -v docker >/dev/null 2>&1; then
  echo "[ERROR] 未检测到 docker，请先安装 Docker Engine 与 docker compose 插件。"
  exit 1
fi

read -rp "请输入公网访问域名（如 os.taoguanlaw.cn；若仅IP试用请直接回车）: " DOMAIN
DOMAIN="${DOMAIN:-:80}"

if [ "$DOMAIN" = ":80" ]; then
  read -rp "请输入服务器公网 IP 或访问基地址（如 http://1.2.3.4）: " NEXTAUTH_URL
  NEXTAUTH_URL="${NEXTAUTH_URL:-http://localhost}"
else
  NEXTAUTH_URL="https://${DOMAIN}"
fi

if [ ! -f .env ]; then
  echo "[INFO] 正在生成高强度随机密钥并创建 .env ..."
  DB_PASS="$(openssl rand -hex 16)"
  AUTH_SECRET="$(openssl rand -base64 32)"
  STORAGE_KEY="$(openssl rand -base64 32)"
  cat > .env <<EOF
PUBLIC_DOMAIN=${DOMAIN}
NEXTAUTH_URL=${NEXTAUTH_URL}
POSTGRES_DB=taoguan_lawlink
POSTGRES_USER=taoguan
POSTGRES_PASSWORD=${DB_PASS}
NEXTAUTH_SECRET=${AUTH_SECRET}
STORAGE_ENCRYPTION_KEY=${STORAGE_KEY}
SEED_ADMIN_EMAIL=admin@taoguanlaw.cn
SEED_ADMIN_PASSWORD=ChangeMe!2026
SEED_ADMIN_NAME=韬冠超级管理员
EOF
  chmod 600 .env
  echo "[OK] .env 已生成，默认管理员 admin@taoguanlaw.cn / ChangeMe!2026（首次登录后请立即修改密码）"
fi

mkdir -p data/postgres data/storage data/backups data/caddy_data data/caddy_config

echo "[INFO] 正在构建并启动服务..."
docker compose -f docker-compose.prod.yml up -d --build

echo "[INFO] 等待数据库就绪并执行结构迁移与初始化..."
sleep 6
docker compose -f docker-compose.prod.yml exec -T app npx prisma migrate deploy
docker compose -f docker-compose.prod.yml exec -T app npx prisma db seed

echo "============================================================"
echo "  部署完成！访问地址：${NEXTAUTH_URL}"
echo "  桌面端(Win/Mac)与手机端 App 连接地址填写：${NEXTAUTH_URL}"
echo "============================================================"
