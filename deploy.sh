#!/bin/bash
set -e

DEPLOY_DIR="/root/simpaskor"
LOG_FILE="/root/webhook/deploy.log"
ERROR_PAGE_SOURCE="$DEPLOY_DIR/nginx/error-pages/system-update.html"
ERROR_PAGE_TARGET="/var/www/simpaskor/system-update.html"
NGINX_SNIPPET_SOURCE="$DEPLOY_DIR/nginx/snippets/simpaskor-error-pages.conf"
NGINX_SNIPPET_TARGET="/etc/nginx/snippets/simpaskor-error-pages.conf"
NGINX_INCLUDE_LINE="include /etc/nginx/snippets/simpaskor-error-pages.conf;"

install_nginx_update_page() {
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

  if ! command -v nginx >/dev/null 2>&1; then
    echo "Nginx command not found, skipping Nginx reload." >> "$LOG_FILE"
    return 0
  fi

  echo "Checking active Nginx site config for custom error page include..." >> "$LOG_FILE"
  NGINX_CONFIGS=$(grep -rlE "server_name .*simpaskor\.id|proxy_pass http://(127\.0\.0\.1|localhost):5173" /etc/nginx/sites-enabled /etc/nginx/sites-available 2>/dev/null || true)

  for NGINX_CONFIG in $NGINX_CONFIGS; do
    if [ -f "$NGINX_CONFIG" ] && ! grep -Fq "$NGINX_INCLUDE_LINE" "$NGINX_CONFIG"; then
      echo "Adding custom error page include to $NGINX_CONFIG" >> "$LOG_FILE"

      if grep -qE "server_name .*simpaskor\.id" "$NGINX_CONFIG"; then
        sed -i "/server_name .*simpaskor\.id/a\\    $NGINX_INCLUDE_LINE" "$NGINX_CONFIG"
      else
        sed -i "0,/^[[:space:]]*server[[:space:]]*{/s//&\\n    $NGINX_INCLUDE_LINE/" "$NGINX_CONFIG"
      fi
    fi
  done

  if nginx -t >> "$LOG_FILE" 2>&1; then
    echo "Reloading Nginx after custom error page setup..." >> "$LOG_FILE"
    systemctl reload nginx >> "$LOG_FILE" 2>&1 || nginx -s reload >> "$LOG_FILE" 2>&1 || true
  else
    echo "Nginx config test failed after custom error page setup." >> "$LOG_FILE"
  fi
}

echo "============================================" >> "$LOG_FILE"
echo "Deploy started at $(date)" >> "$LOG_FILE"

cd "$DEPLOY_DIR"

echo "Pulling latest changes..." >> "$LOG_FILE"
git pull origin main >> "$LOG_FILE" 2>&1

install_nginx_update_page

echo "Restarting containers..." >> "$LOG_FILE"
docker compose down >> "$LOG_FILE" 2>&1
docker compose up -d --build -V >> "$LOG_FILE" 2>&1

echo "Deploy completed at $(date)" >> "$LOG_FILE"
echo "============================================" >> "$LOG_FILE"
