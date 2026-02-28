# 🔐 Setup Google OAuth untuk Simpaskor Platform

Panduan untuk mengaktifkan fitur "Daftar dengan Google" di aplikasi Simpaskor Platform.

---

## 📋 Prerequisites

- Google Cloud Platform account
- Akses ke Google Cloud Console

---

## 🚀 Langkah-Läng Käh Setup

### **Step 1: Buat Project di Google Cloud Console**

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Klik dropdown project di atas, klik **"New Project"**
3. Nama project: **Simpaskor Platform**
4. Klik **Create**

---

### **Step 2: Enable Google OAuth API**

1. Di sidebar, pilih **APIs & Services** → **Library**
2. Cari **"Google+ API"** atau **"Google Identity"**
3. Klik dan enable API tersebut

---

### **Step 3: Buat OAuth Client ID**

1. Di sidebar, pilih **APIs & Services** → **Credentials**
2. Klik **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. Jika diminta, configure OAuth consent screen terlebih dahulu:

#### **Configure OAuth Consent Screen:**

- **User Type**: External (pilih External untuk testing)
- **App name**: Simpaskor Platform
- **User support email**: email Anda
- **Developer contact**: email Anda
- Klik **Save and Continue**
- **Scopes**: Skip (klik Save and Continue)
- **Test users** (untuk External): Tambah email Anda sebagai test user
- Klik **Save and Continue** → **Back to Dashboard**

#### **Create OAuth Client ID:**

1. Kembali ke ** Credentials** → **+ CREATE CREDENTIALS** → **OAuth client ID**
2. **Application type**: **Web application**
3. **Name**: Simpaskor Web Client
4. **Authorized JavaScript origins**:
   - `http://localhost:5173` (untuk development)
   - `http://localhost:3000` (jika menggunakan port lain)
   - `https://yourdomain.com` (untuk production)
   
5. **Authorized redirect URIs**:
   - `http://localhost:5173` (untuk development)
   - `https://yourdomain.com` (untuk production)

6. Klik **CREATE**

7. **SIMPAN** Client ID yang muncul! Contoh:
   ```
   123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com
   ```

---

### **Step 4: Konfigurasi Frontend**

Edit file **`frontend/.env`**:

```env
# Google OAuth Client ID
VITE_GOOGLE_CLIENT_ID="123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com"
```

**Ganti** `123456789012-...` dengan Client ID Anda yang sebenarnya.

---

### **Step 5: Restart Frontend**

```bash
# Stop frontend (Ctrl+C)
# Start ulang
cd frontend
npm run dev
```

---

## ✅ Testing Google OAuth

1. Buka aplikasi: http://localhost:5173/register
2. Klik tombol **"Daftar dengan Google"**
3. Popup Google Sign-In akan muncul
4. Pilih akun Google Anda
5. Jika berhasil, Anda akan otomatis login dan diarahkan ke dashboard

---

## 🔍 Troubleshooting

### ❌ Error: "Invalid Client ID"
**Solusi**: 
- Pastikan `VITE_GOOGLE_CLIENT_ID` di `frontend/.env` sudah benar
- Restart frontend setelah ubah .env

### ❌ Error: "Unauthorized JavaScript origin"
**Solusi**:
- Pastikan `http://localhost:5173` ada di **Authorized JavaScript origins**
- Tambah origin di Google Cloud Console → Credentials → Edit OAuth Client

### ❌ Error: "Access blocked: This app's request is invalid"
**Solusi**:
- Configure OAuth consent screen dengan lengkap
- Tambah email Anda sebagai **Test User** di OAuth consent screen
- Jika App Status masih "Testing", hanya test users yang bisa login

### ❌ Popup Google Sign-In tidak muncul
**Solusi**:
- Check browser console untuk error
- Pastikan browser tidak block popups
- Refresh halaman dan coba lagi
- Clear browser cache

---

## 📱 Production Setup

Untuk production, Anda perlu:

1. **Verify domain** di Google Cloud Console
2. **Publish OAuth App**:
   - OAuth consent screen → **Publish App**
   - Submit for verification (jika diperlukan)
3. **Update Authorized Origins**:
   - Tambah production domain: `https://yourdomain.com`
4. **Update .env production**:
   ```env
   VITE_GOOGLE_CLIENT_ID="production-client-id"
   ```

---

## 🔐 Keamanan

### Backend Verification
Backend menggunakan Google's tokeninfo endpoint untuk verifikasi:
```
https://oauth2.googleapis.com/tokeninfo?id_token={token}
```

Ini memastikan token yang diterima dari frontend adalah valid dan berasal dari Google.

### Data Yang Disimpan
Saat user register dengan Google:
- ✅ Email (dari Google)
- ✅ Nama lengkap (dari Google)
- ✅ Avatar/foto profil (dari Google)
- ✅ Email verified status
- ✅ Role: PESERTA (default)
- ✅ Status: ACTIVE (immediate)
- ❌ Password: Kosong (tidak diperlukan untuk Google OAuth)

---

## 📊 Flow Diagram

```
┌─────────────┐
│   User      │
│  Clicks     │
│  Google     │
│  Button     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Google    │
│   Sign-In   │
│   Popup     │
└──────┬──────┘
       │
       │ (User selects account)
       │
       ▼
┌──────────────┐
│  Frontend    │
│  Receives    │
│  ID Token    │
└──────┬───────┘
       │
       │ POST /auth/google
       │ { credential: "token..." }
       │
       ▼
┌──────────────┐
│  Backend     │
│  Verifies    │
│  with Google │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Find/Create │
│  User in DB  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Return JWT  │
│  Token       │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Frontend    │
│  Save Token  │
│  Navigate to │
│  Dashboard   │
└──────────────┘
```

---

## 🎯 Fitur Google OAuth

✅ **Auto Register**: User baru otomatis didaftarkan sebagai PESERTA
✅ **Auto Login**: User existing langsung login
✅ **Email Verified**: Email dari Google otomatis terverifikasi
✅ **No Password**: Tidak perlu ingat password
✅ **Secure**: Token diverifikasi langsung dengan Google
✅ **Fast**: One-click registration/login

---

## 📚 Resources

- [Google Identity Documentation](https://developers.google.com/identity)
- [Google OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [Google Sign-In for Web](https://developers.google.com/identity/gsi/web)
- [Google Cloud Console](https://console.cloud.google.com/)

---

## 💡 Notes

- Google Sign-In **hanya untuk PESERTA** role
- Jika ingin daftar sebagai JURI, PANITIA, atau PELATIH, gunakan form registrasi biasa
- SuperAdmin tidak bisa menggunakan Google Sign-In
- **Test Mode**: Hanya test users yang bisa login (configure di OAuth consent screen)
- **Production**: Perlu verification dari Google jika app sudah published

---

**Setup selesai!** Fitur "Daftar dengan Google" sekarang sudah aktif! 🎉
