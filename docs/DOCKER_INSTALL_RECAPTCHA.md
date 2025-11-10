# 🚀 Langkah-langkah Install reCAPTCHA di Docker

## ✅ Yang Sudah Dilakukan

1. ✅ Dependencies sudah ditambahkan ke `package.json` (axios & react-google-recaptcha-v3)
2. ✅ Middleware reCAPTCHA & rate limiting sudah dibuat
3. ✅ Environment variables sudah dikonfigurasi di `docker-compose.yml` dengan test keys
4. ✅ Script helper `docker-rebuild.sh` sudah dibuat
5. ✅ Backend dan Frontend `.env.example` sudah berisi konfigurasi reCAPTCHA

## 📋 Yang Perlu Anda Lakukan

### Langkah 1: Pastikan File .env Ada (Opsional untuk Development)

Untuk development, Docker sudah menggunakan test keys dari `docker-compose.yml`. Jika ingin menggunakan keys sendiri:

**Backend:**

```bash
cp backend/.env.example backend/.env
nano backend/.env  # Edit RECAPTCHA_SECRET_KEY
```

**Frontend:**

```bash
cp frontend/.env.example frontend/.env
nano frontend/.env  # Edit VITE_RECAPTCHA_SITE_KEY
```

**Note:** Test keys sudah ada di `docker-compose.yml`:

- Backend: `RECAPTCHA_SECRET_KEY=6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe`
- Frontend: `VITE_RECAPTCHA_SITE_KEY=6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI`

**⚠️ WARNING:** Ini adalah test keys dari Google yang selalu return success. **JANGAN dipakai di production!**

### Langkah 2: Rebuild Docker Container

Pilih salah satu metode:

#### Metode 1: Menggunakan Script (Paling Mudah) ⭐ Recommended

```bash
./docker-rebuild.sh
```

Pilih option `1` untuk quick rebuild.

#### Metode 2: Manual

```bash
# Stop containers
docker-compose down

# Rebuild dengan dependencies baru
docker-compose up --build -d
```

### Langkah 3: Verifikasi Instalasi

#### Cek apakah dependencies terinstall:

```bash
# Cek axios di backend
docker exec simpaskor_backend npm list axios

# Cek react-google-recaptcha-v3 di frontend
docker exec simpaskor_frontend npm list react-google-recaptcha-v3
```

Expected output:

```
simpaskor-backend@1.0.0 /app
└── axios@1.13.2

simpaskor-frontend@0.0.0 /app
└── react-google-recaptcha-v3@1.11.0
```

#### Cek environment variables:

```bash
# Cek backend
docker exec simpaskor_backend env | grep RECAPTCHA

# Cek frontend
docker exec simpaskor_frontend env | grep RECAPTCHA
```

Expected output:

```
RECAPTCHA_SECRET_KEY=6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe
VITE_RECAPTCHA_SITE_KEY=6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
```

### Langkah 4: Test reCAPTCHA

1. Buka browser: http://localhost:5173/register
2. Isi form registrasi
3. Klik tombol "Daftar"
4. Cek logs backend:

```bash
docker-compose logs backend | grep reCAPTCHA
```

Expected output:

```
simpaskor_backend | reCAPTCHA verified successfully - Score: 0.9, Action: register, IP: 172.18.0.1
```

### Langkah 5: Test Rate Limiting

Coba register 4 kali dalam 1 jam dari IP yang sama. Attempt ke-4 akan ditolak dengan error:

```
"Terlalu banyak percobaan registrasi dari IP ini. Silakan coba lagi setelah 1 jam."
```

## 🐛 Troubleshooting

### Problem: Dependencies tidak terinstall

**Solusi:**

```bash
docker-compose down
docker image rm simpaskor_backend simpaskor_frontend
docker-compose up --build -d
```

### Problem: Environment variables tidak tersedia

**Solusi:**

1. Environment variables sudah di-hardcode di `docker-compose.yml` dengan test keys
2. Jika ingin menggunakan keys sendiri, buat `backend/.env` dan `frontend/.env`
3. Restart containers:

```bash
docker-compose down
docker-compose up -d
```

### Problem: reCAPTCHA error "tidak tersedia"

**Solusi:**

1. Cek `VITE_RECAPTCHA_SITE_KEY` di frontend:

```bash
docker exec simpaskor_frontend env | grep VITE_RECAPTCHA_SITE_KEY
```

2. Jika tidak ada, rebuild frontend:

```bash
docker-compose up --build -d frontend
```

### Problem: Backend error "RECAPTCHA_SECRET_KEY is not configured"

**Solusi:**

1. Cek `RECAPTCHA_SECRET_KEY` di backend:

```bash
docker exec simpaskor_backend env | grep RECAPTCHA_SECRET_KEY
```

2. Jika tidak ada, rebuild backend:

```bash
docker-compose up --build -d backend
```

## 🎯 Next Steps

### Untuk Development

✅ Sudah siap digunakan dengan test keys dari `docker-compose.yml`!

### Untuk Production

1. **Dapatkan reCAPTCHA Keys:**

   - Buka: https://www.google.com/recaptcha/admin
   - Pilih reCAPTCHA v3
   - Tambahkan domain Anda
   - Copy Site Key & Secret Key

2. **Update environment files:**

**Backend (`backend/.env`):**

```env
RECAPTCHA_SECRET_KEY=your-real-secret-key-here
```

**Frontend (`frontend/.env`):**

```env
VITE_RECAPTCHA_SITE_KEY=your-real-site-key-here
```

3. **Update docker-compose.yml:**
   Ganti hardcoded test keys dengan variabel yang membaca dari file .env

4. **Rebuild containers:**

```bash
docker-compose down
docker-compose up --build -d
```

## 📖 Dokumentasi Lengkap

- [docs/RECAPTCHA_SETUP.md](./RECAPTCHA_SETUP.md) - Setup guide lengkap
- [docs/REGISTRATION_SECURITY.md](./REGISTRATION_SECURITY.md) - Dokumentasi security
- [docs/DOCKER_RECAPTCHA_SETUP.md](./DOCKER_RECAPTCHA_SETUP.md) - Docker troubleshooting

## ✨ Fitur Security yang Aktif

✅ **reCAPTCHA v3** - Bot detection dengan score system (threshold: 0.5)
✅ **Rate Limiting** - Maximum 3 registrasi per jam per IP
✅ **IP Detection** - Proxy-aware (mendukung X-Forwarded-For)
✅ **Custom Error Messages** - Pesan error dalam Bahasa Indonesia
✅ **Logging** - Semua aktivitas ter-log untuk monitoring

## 🎉 Selesai!

reCAPTCHA dan rate limiting sudah aktif di Docker environment Anda!

Untuk melihat logs real-time:

```bash
docker-compose logs -f
```

---

**Butuh bantuan?** Lihat dokumentasi atau check logs untuk troubleshooting.
