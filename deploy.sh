#!/bin/bash
set -e

DEPLOY_DIR="/root/simpaskor"
LOG_FILE="/root/webhook/deploy.log"

echo "============================================" >> "$LOG_FILE"
echo "Deploy started at $(date)" >> "$LOG_FILE"

cd "$DEPLOY_DIR"

echo "Pulling latest changes..." >> "$LOG_FILE"
git pull origin main >> "$LOG_FILE" 2>&1

echo "Restarting containers..." >> "$LOG_FILE"
docker compose down >> "$LOG_FILE" 2>&1
docker compose up -d --build -V >> "$LOG_FILE" 2>&1

echo "Deploy completed at $(date)" >> "$LOG_FILE"
echo "============================================" >> "$LOG_FILE"
