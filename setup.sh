#!/bin/bash
set -e

# Warna untuk output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}   Simpaskor Platform - Setup Script    ${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# ─── 1. Git Pull ─────────────────────────────────────────────
echo -e "${YELLOW}[1/5] Mengambil perubahan terbaru dari repository...${NC}"
git pull origin main
echo -e "${GREEN}✓ Repository berhasil diperbarui${NC}"
echo ""

# ─── 2. npm install (root) ────────────────────────────────────
if [ -f "./package.json" ]; then
    echo -e "${YELLOW}[2/5] Instalasi dependencies root...${NC}"
    npm install
    echo -e "${GREEN}✓ Dependencies root terinstal${NC}"
    echo ""
fi

# ─── 3. npm install backend ──────────────────────────────────
echo -e "${YELLOW}[3/5] Instalasi dependencies backend...${NC}"
cd backend
npm install
echo -e "${GREEN}✓ Dependencies backend terinstal${NC}"
echo ""

# ─── 4. Prisma generate ──────────────────────────────────────
echo -e "${YELLOW}[4/5] Menjalankan prisma generate...${NC}"
npx prisma generate
echo -e "${GREEN}✓ Prisma client berhasil digenerate${NC}"
echo ""

# ─── 5. Prisma db push ───────────────────────────────────────
echo -e "${YELLOW}[5/5] Menjalankan prisma db push...${NC}"
npx prisma db push --accept-data-loss
echo -e "${GREEN}✓ Schema database berhasil disinkronkan${NC}"
echo ""

cd ..

# ─── 6. npm install frontend ─────────────────────────────────
echo -e "${YELLOW}[+] Instalasi dependencies frontend...${NC}"
cd frontend
npm install
echo -e "${GREEN}✓ Dependencies frontend terinstal${NC}"
cd ..
echo ""

echo -e "${BLUE}=========================================${NC}"
echo -e "${GREEN}  Setup selesai! Jalankan ./dev.sh      ${NC}"
echo -e "${BLUE}=========================================${NC}"
