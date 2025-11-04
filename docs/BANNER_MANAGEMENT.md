# Banner Management

## Overview

Fitur manajemen banner untuk SuperAdmin yang memungkinkan pengelolaan banner carousel di landing page.

## Fitur

### 1. **Tambah Banner Baru**

- Judul banner (wajib)
- Deskripsi banner (opsional)
- URL gambar (wajib)
- URL link tujuan (opsional)
- Teks tombol CTA (opsional)
- Urutan tampilan (default: 0)
- Status aktif/nonaktif
- Tanggal mulai dan selesai (opsional - untuk penjadwalan banner)

### 2. **Edit Banner**

- Ubah semua properti banner
- Preview gambar saat input URL
- Update status aktif/nonaktif

### 3. **Hapus Banner**

- Konfirmasi sebelum menghapus
- Penghapusan permanen dari database

### 4. **Toggle Status**

- Aktifkan/nonaktifkan banner dengan satu klik
- Banner nonaktif tidak ditampilkan di landing page

### 5. **Filter & Pencarian**

- Filter berdasarkan status (Semua/Aktif/Nonaktif)
- Pencarian berdasarkan judul atau deskripsi
- Tab button untuk navigasi filter

### 6. **Tampilan Grid**

- Preview gambar banner
- Badge status dan urutan
- Info link dan jadwal
- Tombol aksi (Aktifkan/Nonaktifkan, Edit, Hapus)

## API Endpoints

### Public

- `GET /api/banners` - Ambil banner aktif untuk landing page

### Protected (SuperAdmin Only)

- `GET /api/banners/all` - Ambil semua banner
- `POST /api/banners` - Buat banner baru
- `PATCH /api/banners/:id` - Update banner
- `DELETE /api/banners/:id` - Hapus banner
- `GET /api/banners/:id` - Ambil banner by ID

## Database Schema

```prisma
model Banner {
  id          String    @id @default(uuid())
  title       String
  description String?
  imageUrl    String
  linkUrl     String?
  buttonText  String?
  order       Int       @default(0)
  isActive    Boolean   @default(true)
  startDate   DateTime?
  endDate     DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

## Cara Menggunakan

### Akses Halaman

1. Login sebagai SuperAdmin
2. Dari Dashboard, klik "Manage Banners" atau
3. Klik menu "Kelola Banner" di sidebar
4. URL: `/admin/banners`

### Menambah Banner

1. Klik tombol "Tambah Banner"
2. Isi form:
   - **Judul**: Nama banner yang jelas
   - **Deskripsi**: Info tambahan (opsional)
   - **URL Gambar**: Link ke gambar banner (akan muncul preview)
   - **URL Link**: Halaman tujuan saat banner diklik (opsional)
   - **Teks Tombol**: Teks CTA seperti "Daftar Sekarang" (opsional)
   - **Urutan**: Nomor urutan tampilan (semakin kecil = semakin awal)
   - **Status**: Aktif (tampil) atau Nonaktif (tersembunyi)
   - **Tanggal**: Jadwal tampil banner (opsional)
3. Klik "Tambah Banner"

### Mengedit Banner

1. Klik tombol "Edit" pada banner yang ingin diubah
2. Ubah data yang diperlukan
3. Klik "Perbarui Banner"

### Menghapus Banner

1. Klik tombol "Hapus" (ikon trash)
2. Konfirmasi penghapusan
3. Banner akan terhapus permanen

### Mengaktifkan/Menonaktifkan

1. Klik tombol "Aktifkan" atau "Nonaktifkan" pada banner
2. Status akan berubah otomatis
3. Banner nonaktif tidak tampil di landing page

## Tips

- Gunakan gambar dengan rasio 16:9 untuk hasil terbaik
- Atur urutan dengan angka (0, 1, 2, dst) untuk kontrol tampilan
- Gunakan jadwal untuk banner event yang memiliki periode tertentu
- Banner dengan `isActive: false` akan tersembunyi dari public
- Banner dengan tanggal expired otomatis tidak tampil meski statusnya aktif

## File Terkait

- **Frontend**: `frontend/src/pages/admin/BannerManagement.tsx`
- **Backend**: `backend/src/routes/banners.ts`
- **Schema**: `backend/prisma/schema.prisma`
- **Layout**: Sidebar menu di `frontend/src/layouts/DashboardLayout.tsx`
- **Routes**: `frontend/src/App.tsx`
