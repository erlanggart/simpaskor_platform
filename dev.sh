#!/bin/bash

# Script untuk menjalankan Frontend dan Backend (tanpa Docker)
# Simpaskor Platform Development Environment

# Warna untuk output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}  Simpaskor Platform - Development Mode ${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Cek apakah node tersedia
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js tidak ditemukan!${NC}"
    echo -e "${YELLOW}Mohon install Node.js terlebih dahulu.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js tersedia: $(node --version)${NC}"

# Cek apakah npm tersedia
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm tidak ditemukan!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ npm tersedia: $(npm --version)${NC}"
echo ""

# Function untuk cleanup saat script dihentikan
cleanup() {
    echo ""
    echo -e "${YELLOW}Menghentikan servers...${NC}"
    # Kill semua child processes
    jobs -p | xargs -r kill 2>/dev/null
    echo -e "${GREEN}✓ Servers dihentikan${NC}"
    exit 0
}

# Trap SIGINT dan SIGTERM untuk cleanup
trap cleanup SIGINT SIGTERM

# Cek apakah .env files ada
if [ ! -f "./backend/.env" ]; then
    echo -e "${YELLOW}⚠ File backend/.env tidak ditemukan${NC}"
    echo -e "${YELLOW}Membuat file .env dari template...${NC}"
    if [ -f "./backend/.env.example" ]; then
        cp ./backend/.env.example ./backend/.env
        echo -e "${GREEN}✓ File backend/.env dibuat${NC}"
    else
        echo -e "${YELLOW}⚠ File .env.example tidak ditemukan. Pastikan backend/.env sudah dikonfigurasi.${NC}"
    fi
fi

if [ ! -f "./frontend/.env" ]; then
    echo -e "${YELLOW}⚠ File frontend/.env tidak ditemukan${NC}"
    echo -e "${YELLOW}Membuat file .env dari template...${NC}"
    if [ -f "./frontend/.env.example" ]; then
        cp ./frontend/.env.example ./frontend/.env
        echo -e "${GREEN}✓ File frontend/.env dibuat${NC}"
    else
        echo -e "${YELLOW}⚠ File .env.example tidak ditemukan. Pastikan frontend/.env sudah dikonfigurasi.${NC}"
    fi
fi

echo ""

# Cek apakah node_modules sudah terinstall
if [ ! -d "./backend/node_modules" ]; then
    echo -e "${BLUE}Installing backend dependencies...${NC}"
    cd backend
    npm install
    cd ..
    echo -e "${GREEN}✓ Backend dependencies installed${NC}"
    echo ""
fi

if [ ! -d "./frontend/node_modules" ]; then
    echo -e "${BLUE}Installing frontend dependencies...${NC}"
    cd frontend
    npm install
    cd ..
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
    echo ""
fi

echo -e "${BLUE}Memulai Backend dan Frontend...${NC}"
echo ""
echo -e "${GREEN}Backend: http://localhost:3001${NC}"
echo -e "${GREEN}Frontend: http://localhost:5173${NC}"
echo ""
echo -e "${YELLOW}Tekan Ctrl+C untuk menghentikan${NC}"
echo ""
echo -e "${BLUE}=========================================${NC}"
echo ""

# Jalankan backend di background
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Tunggu sebentar
sleep 2

# Jalankan frontend di background
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Tunggu kedua process
wait
