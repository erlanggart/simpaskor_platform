@echo off
REM Script untuk menjalankan Frontend dan Backend (tanpa Docker)
REM Simpaskor Platform Development Environment

echo =========================================
echo   Simpaskor Platform - Development Mode
echo =========================================
echo.

REM Cek apakah node tersedia
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js tidak ditemukan!
    echo Mohon install Node.js terlebih dahulu.
    pause
    exit /b 1
)

echo [OK] Node.js tersedia
echo.

REM Cek apakah npm tersedia
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm tidak ditemukan!
    pause
    exit /b 1
)

echo [OK] npm tersedia
echo.

REM Cek apakah .env files ada
if not exist "backend\.env" (
    echo [WARNING] File backend\.env tidak ditemukan
    if exist "backend\.env.example" (
        echo Membuat file .env dari template...
        copy "backend\.env.example" "backend\.env" >nul
        echo [OK] File backend\.env dibuat
    ) else (
        echo [WARNING] File .env.example tidak ditemukan. Pastikan backend\.env sudah dikonfigurasi.
    )
)

if not exist "frontend\.env" (
    echo [WARNING] File frontend\.env tidak ditemukan
    if exist "frontend\.env.example" (
        echo Membuat file .env dari template...
        copy "frontend\.env.example" "frontend\.env" >nul
        echo [OK] File frontend\.env dibuat
    ) else (
        echo [WARNING] File .env.example tidak ditemukan. Pastikan frontend\.env sudah dikonfigurasi.
    )
)

echo.
REM Cek apakah node_modules sudah terinstall
if not exist "backend\node_modules" (
    echo [INFO] Installing backend dependencies...
    cd backend
    call npm install
    cd ..
    echo [OK] Backend dependencies installed
    echo.
)

if not exist "frontend\node_modules" (
    echo [INFO] Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
    echo [OK] Frontend dependencies installed
    echo.
)

echo Memulai Backend dan Frontend...
echo.
echo [INFO] Backend akan berjalan di http://localhost:3001
echo [INFO] Frontend akan berjalan di http://localhost:5173
echo.
echo Tekan Ctrl+C di masing-masing terminal untuk menghentikan
echo.

REM Jalankan backend di terminal baru
echo [INFO] Membuka Backend Server...
start "Simpaskor Backend" cmd /k "cd backend && npm run dev"

REM Tunggu 2 detik
timeout /t 2 /nobreak >nul

REM Jalankan frontend di terminal baru
echo [INFO] Membuka Frontend Server...
start "Simpaskor Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo [OK] Backend dan Frontend telah dijalankan di terminal terpisah
echo.
echo Tutup window ini jika sudah selesai development
echo.
pause
