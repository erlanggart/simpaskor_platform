#!/bin/bash
set -e

DEPLOY_DIR="/root/simpaskor"
LOG_FILE="/root/webhook/deploy.log"
ERROR_PAGE_SOURCE="$DEPLOY_DIR/nginx/error-pages/system-update.html"
ERROR_PAGE_TARGET="/var/www/simpaskor/system-update.html"
NGINX_SNIPPET_SOURCE="$DEPLOY_DIR/nginx/snippets/simpaskor-error-pages.conf"
NGINX_SNIPPET_TARGET="/etc/nginx/snippets/simpaskor-error-pages.conf"

echo "============================================" >> "$LOG_FILE"
echo "Deploy started at $(date)" >> "$LOG_FILE"

cd "$DEPLOY_DIR"

echo "Pulling latest changes..." >> "$LOG_FILE"
git pull origin main >> "$LOG_FILE" 2>&1

if [ -f "$ERROR_PAGE_SOURCE" ]; then
  echo "Installing custom Nginx update page..." >> "$LOG_FILE"
  mkdir -p "$(dirname "$ERROR_PAGE_TARGET")"
  cp "$ERROR_PAGE_SOURCE" "$ERROR_PAGE_TARGET"
fi

if [ -f "$NGINX_SNIPPET_SOURCE" ]; then
  echo "Installing custom Nginx error page snippet..." >> "$LOG_FILE"
  mkdir -p "$(dirname "$NGINX_SNIPPET_TARGET")"
  cp "$NGINX_SNIPPET_SOURCE" "$NGINX_SNIPPET_TARGET"
fi

echo "Restarting containers..." >> "$LOG_FILE"
docker compose down >> "$LOG_FILE" 2>&1
docker compose up -d --build -V >> "$LOG_FILE" 2>&1

echo "Deploy completed at $(date)" >> "$LOG_FILE"
echo "============================================" >> "$LOG_FILE"
