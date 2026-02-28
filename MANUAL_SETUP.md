# 🚀 Panduan Setup Manual Simpaskor Platform (Laragon + Node.js)

Panduan ini untuk menjalankan Simpaskor Platform **tanpa Docker**, menggunakan **Laragon** untuk PostgreSQL dan **Node.js** yang sudah terinstall di komputer Anda.

## ✅ Prerequisites

Pastikan sudah terinstall:
- ✅ **Laragon** dengan PostgreSQL aktif
- ✅ **Node.js** versi 18+ (cek: `node --version`)
- ✅ **npm** versi 8+ (cek: `npm --version`)
- ✅ **Git** (optional, jika clone dari repository)

---

## 📖 Langkah-Langkah Setup

### **Step 1: Setup Database PostgreSQL di Laragon**

1. **Buka Laragon** dan klik **Start All**
2. **Pastikan PostgreSQL aktif** (lampu hijau)
3. **Buka Database Manager**:
   - Klik **Database** → **PostgreSQL: Connect**
   - Atau buka **HeidiSQL** / **pgAdmin** dari Laragon

4. **Buat Database Baru**:
   ```sql
   CREATE DATABASE simpaskor_db;
   ```

5. **Cek Kredensial PostgreSQL Laragon** (biasanya):
   - **Host**: `localhost`
   - **Port**: `5432`
   - **Username**: `postgres`
   - **Password**: `root` atau kosong
   - **Database**: `simpaskor_db`

⚠️ **PENTING**: Jika kredensial PostgreSQL Anda berbeda, edit file `backend\.env` sesuaikan `DATABASE_URL`.

---

### **Step 2: Setup Backend**

Buka **Command Prompt** atau **PowerShell** di folder project:

```bash
# Masuk ke folder backend
cd c:\laragon\www\simpaskor_platform\backend

# Install dependencies (pertama kali saja)
npm install

# Generate Prisma Client
npx prisma generate

# Push database schema (membuat tabel-tabel)
npx prisma db push

# Seed database (isi data awal)
npx prisma db seed
```

**Jika ada error pada prisma db seed**, jalankan manual:

```bash
node -r ts-node/register src/database/seed.ts
```

Atau jika ts-node belum ada:

```bash
npm install -D ts-node
npx ts-node src/database/seed.ts
```

---

### **Step 3: Setup Frontend**

Buka **Command Prompt** atau **PowerShell** baru (jangan tutup yang backend):

```bash
# Masuk ke folder frontend
cd c:\laragon\www\simpaskor_platform\frontend

# Install dependencies (pertama kali saja)
npm install
```

---

### **Step 4: Jalankan Backend**

Di terminal **backend** yang sudah dibuka sebelumnya:

```bash
# Pastikan masih di folder backend
cd c:\laragon\www\simpaskor_platform\backend

# Jalankan development server
npm run dev
```

✅ **Backend berhasil jika muncul pesan**:
```
🚀 Server running on port 3001
✅ Database connected successfully
```

Backend akan berjalan di: **http://localhost:3001**

---

### **Step 5: Jalankan Frontend**

Di terminal **frontend** yang sudah dibuka sebelumnya:

```bash
# Pastikan masih di folder frontend
cd c:\laragon\www\simpaskor_platform\frontend

# Jalankan development server
npm run dev
```

✅ **Frontend berhasil jika muncul**:
```
  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Frontend akan berjalan di: **http://localhost:5173**

---

## 🌐 Akses Aplikasi

Buka browser dan akses:

### 🎯 **Frontend**: http://localhost:5173

### 🔌 **Backend API**: http://localhost:3001/api

### 🏥 **Health Check**: http://localhost:3001/api/health

---

## 🔑 Login Credentials

Setelah seed database berhasil, gunakan akun default berikut:

| Role          | Email                    | Password    | Dashboard URL                         |
| ------------- | ------------------------ | ----------- | ------------------------------------- |
| 🔴 SuperAdmin | superadmin@simpaskor.com | Admin123!   | http://localhost:5173/admin/dashboard   |
| 🟣 Panitia    | panitia@simpaskor.com    | Panitia123! | http://localhost:5173/panitia/dashboard |
| 🔵 Juri       | juri@simpaskor.com       | Juri123!    | http://localhost:5173/juri/dashboard    |
| 🟡 Peserta    | demo@simpaskor.com       | password123 | http://localhost:5173/peserta/dashboard |
| 🟢 Pelatih    | pelatih@simpaskor.com    | Pelatih123! | http://localhost:5173/pelatih/dashboard |

---

## 🛠️ Commands Penting

### Backend Commands

```bash
# Jalankan development server
npm run dev

# Build untuk production
npm run build

# Jalankan production build
npm start

# Generate Prisma Client (setelah ubah schema)
npx prisma generate

# Push schema changes ke database
npx prisma db push

# Reset database (HATI-HATI: menghapus semua data)
npx prisma db reset

# Buka Prisma Studio (UI untuk manage database)
npx prisma studio

# Create migration baru
npx prisma migrate dev --name nama_migration
```

### Frontend Commands

```bash
# Jalankan development server
npm run dev

# Build untuk production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

---

## 🐛 Troubleshooting

### ❌ Error: "Port 3001 already in use"

```bash
# Windows: Matikan process yang menggunakan port 3001
netstat -ano | findstr :3001
taskkill /PID <PID_NUMBER> /F
```

### ❌ Error: "Cannot connect to database"

1. Pastikan Laragon sudah **Start All**
2. Pastikan PostgreSQL **aktif** (lampu hijau)
3. Cek kredensial di `backend\.env`:
   ```env
   DATABASE_URL="postgresql://postgres:root@localhost:5432/simpaskor_db"
   ```
4. Test koneksi:
   ```bash
   cd backend
   npx prisma db push
   ```

### ❌ Error: "Module not found"

```bash
# Reinstall dependencies
cd backend
rm -rf node_modules package-lock.json
npm install

cd ../frontend
rm -rf node_modules package-lock.json
npm install
```

### ❌ Error: "Prisma Client tidak ter-generate"

```bash
cd backend
npx prisma generate
npx prisma db push
```

### ❌ Error: "CORS blocked" atau "Network Error"

1. Pastikan backend sudah running di port 3001
2. Cek `backend\.env`:
   ```env
   FRONTEND_URL="http://localhost:5173"
   ```
3. Cek `frontend\.env`:
   ```env
   VITE_API_URL=http://localhost:3001/api
   VITE_BACKEND_URL=http://localhost:3001
   ```

### ❌ Frontend tidak bisa akses API

1. Cek backend console untuk error
2. Test API manual:
   ```bash
   curl http://localhost:3001/api/health
   ```
3. Clear browser cache atau buka Incognito mode

---

## 📁 Struktur File Penting

```
simpaskor_platform/
├── backend/
│   ├── .env                    # ✅ Sudah dibuat
│   ├── package.json
│   ├── prisma/
│   │   └── schema.prisma       # Database schema
│   └── src/
│       ├── server.ts           # Main backend file
│       └── database/
│           └── seed.ts         # Seed data
│
└── frontend/
    ├── .env                    # ✅ Sudah dibuat
    ├── package.json
    └── src/
        └── main.tsx            # Main frontend file
```

---

## 🔄 Workflow Development

### Saat Pertama Kali Setup:
1. ✅ Install dependencies (`npm install`)
2. ✅ Generate Prisma Client (`npx prisma generate`)
3. ✅ Push database schema (`npx prisma db push`)
4. ✅ Seed database (`npx prisma db seed`)
5. ✅ Run backend (`npm run dev`)
6. ✅ Run frontend (`npm run dev`)

### Saat Development Sehari-hari:
1. Start Laragon (PostgreSQL)
2. Run backend: `cd backend && npm run dev`
3. Run frontend: `cd frontend && npm run dev`
4. Develop! 🚀

### Saat Ubah Database Schema:
1. Edit `backend/prisma/schema.prisma`
2. Run: `npx prisma generate`
3. Run: `npx prisma db push` atau `npx prisma migrate dev`
4. Restart backend

---

## 📚 Resources

- **Backend API Docs**: [README.md](../README.md#-api-documentation)
- **Prisma Docs**: https://www.prisma.io/docs
- **Express.js Docs**: https://expressjs.com
- **React Docs**: https://react.dev
- **Vite Docs**: https://vitejs.dev

---

## 🎉 Selesai!

Aplikasi Simpaskor Platform sekarang sudah berjalan di komputer Anda tanpa Docker!

### Next Steps:
- 🔐 Login dengan salah satu akun default
- 📊 Explore dashboard sesuai role
- 🛠️ Mulai development
- 📖 Baca dokumentasi di folder `docs/`

---

## 💡 Tips

1. **Gunakan 2 terminal** - satu untuk backend, satu untuk frontend
2. **Jangan tutup terminal** saat development
3. **Gunakan Prisma Studio** untuk manage database: `npx prisma studio`
4. **Hot reload aktif** - perubahan code langsung ter-reload otomatis
5. **Check console** - backend & frontend console untuk debugging

---

## 📞 Bantuan

Jika ada masalah:
1. Cek bagian **Troubleshooting** di atas
2. Lihat console error (backend & frontend)
3. Restart backend/frontend
4. Restart Laragon
5. Cek dokumentasi: `docs/` folder

---

**Made with ❤️ for Local Development**
