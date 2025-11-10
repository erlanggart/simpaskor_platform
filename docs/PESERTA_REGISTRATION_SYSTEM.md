# Dashboard Peserta - Sistem Pendaftaran Event dengan Multiple Groups

## Overview

Dashboard Peserta memungkinkan peserta untuk mendaftar ke event Paskibra dengan sistem grup/tim yang fleksibel. Setiap peserta dapat mendaftarkan **multiple tim** dalam satu event.

## Fitur Utama

### 1. Dashboard Peserta (`/peserta/dashboard`)

- **List Semua Event**: Menampilkan semua event Paskibra yang tersedia
- **Search & Filter**: Cari event berdasarkan nama, lokasi, atau deskripsi
- **Filter Kategori**: Filter event berdasarkan kategori sekolah (SD, SMP, SMA, PURNA)
- **Status Pendaftaran**: Badge menunjukkan apakah sudah terdaftar
- **Informasi Event**: Tanggal, lokasi, kuota, biaya, deadline

### 2. Pendaftaran Event

- **Multiple Groups**: Dapat mendaftarkan lebih dari 1 tim (Tim A, Tim B, Tim C, dst)
- **Detail Per Tim**:
  - Nama tim (bisa dikustomisasi)
  - Jumlah anggota per tim
  - Catatan tambahan (opsional)
- **Validasi Otomatis**:
  - Cek kuota kategori sekolah
  - Cek deadline pendaftaran
  - Cek duplikasi pendaftaran
  - Validasi nama tim unik

### 3. Kelola Pendaftaran (`/peserta/registrations`)

- **List Pendaftaran**: Semua event yang sudah didaftarkan
- **Detail Grup**: Lihat semua tim yang didaftarkan per event
- **Tambah Tim**: Tambahkan tim baru ke pendaftaran yang sudah ada
- **Batalkan Tim**: Batalkan pendaftaran tim tertentu
- **Batalkan Event**: Batalkan semua pendaftaran untuk event tertentu

## Struktur Database

### Model `EventParticipation`

```prisma
model EventParticipation {
  id               String
  eventId          String
  userId           String
  schoolCategoryId String
  schoolName       String
  status           String  // REGISTERED, CONFIRMED, CANCELLED
  groups           ParticipationGroup[]
}
```

### Model `ParticipationGroup`

```prisma
model ParticipationGroup {
  id              String
  participationId String
  groupName       String      // "Tim A", "Tim B", etc
  teamMembers     Int         // Jumlah anggota
  status          String      // ACTIVE, CANCELLED
  notes           String?
}
```

## API Endpoints

### Registration Endpoints

#### GET `/api/registrations/my`

Mendapatkan semua pendaftaran user yang sedang login.

**Response:**

```json
[
  {
    "id": "uuid",
    "eventId": "uuid",
    "schoolName": "SMA Negeri 1 Jakarta",
    "status": "REGISTERED",
    "event": { ... },
    "schoolCategory": { ... },
    "groups": [
      {
        "id": "uuid",
        "groupName": "Tim A",
        "teamMembers": 15,
        "status": "ACTIVE"
      },
      {
        "id": "uuid",
        "groupName": "Tim B",
        "teamMembers": 12,
        "status": "ACTIVE"
      }
    ]
  }
]
```

#### POST `/api/registrations`

Mendaftar event dengan multiple groups.

**Request:**

```json
{
	"eventId": "uuid",
	"schoolCategoryId": "uuid",
	"schoolName": "SMA Negeri 1 Jakarta",
	"groups": [
		{
			"groupName": "Tim A",
			"teamMembers": 15,
			"notes": "Tim utama"
		},
		{
			"groupName": "Tim B",
			"teamMembers": 12,
			"notes": "Tim cadangan"
		}
	]
}
```

**Response:**

```json
{
  "message": "Registration successful",
  "registration": { ... }
}
```

#### POST `/api/registrations/:id/groups`

Menambahkan tim baru ke pendaftaran yang sudah ada.

**Request:**

```json
[
	{
		"groupName": "Tim C",
		"teamMembers": 10,
		"notes": "Tim baru"
	}
]
```

#### DELETE `/api/registrations/:id/groups/:groupId`

Membatalkan satu tim dari pendaftaran.

#### DELETE `/api/registrations/:id`

Membatalkan seluruh pendaftaran (semua tim).

## Business Rules

### 1. Kuota Per Kategori

- Setiap event memiliki limit per kategori sekolah
- Setiap **grup/tim** dihitung sebagai 1 slot
- Contoh: Limit SMA = 20, maka maksimal 20 tim SMA bisa mendaftar
- Validasi otomatis mencegah over-booking

### 2. Sistem Grup

- **1 pendaftaran** = 1 user mendaftar ke 1 event
- **1 pendaftaran** dapat memiliki **multiple groups**
- Contoh: Satu sekolah bisa daftarkan Tim A, Tim B, Tim C
- Setiap tim dihitung sebagai 1 peserta event

### 3. Status Management

- **Pendaftaran Status**: REGISTERED, CONFIRMED, ATTENDED, CANCELLED
- **Group Status**: ACTIVE, CANCELLED
- Membatalkan grup → kuota event berkurang
- Membatalkan pendaftaran → semua grup dibatalkan

## UI Components

### 1. Dashboard Event Card

- Thumbnail event
- Badge status (Terdaftar/Belum)
- Informasi lengkap event
- Tombol "Daftar Sekarang" atau "Sudah Terdaftar"

### 2. RegisterEventModal

- Form kategori sekolah
- Input nama sekolah
- Dynamic group management:
  - Tambah tim (button +)
  - Hapus tim (button trash)
  - Input per tim: nama, jumlah anggota, notes
- Summary total tim
- Validasi real-time

### 3. Registration List

- Accordion per event
- Detail pendaftaran (kategori, sekolah, total tim)
- Expand/collapse untuk lihat detail tim
- Actions: Tambah tim, Batalkan tim, Batalkan semua

## Contoh Use Case

### Scenario 1: Sekolah Mendaftarkan 3 Tim

1. User (guru/pelatih) login sebagai PESERTA
2. Browse event di Dashboard
3. Klik "Daftar Sekarang" pada event
4. Pilih kategori: SMA
5. Input nama sekolah: "SMA Negeri 1 Jakarta"
6. Tambahkan 3 tim:
   - Tim A (15 anggota) - Tim utama
   - Tim B (12 anggota) - Tim cadangan
   - Tim C (10 anggota) - Tim pemula
7. Submit → Event `currentParticipants` bertambah 3

### Scenario 2: Tambah Tim Setelah Registrasi

1. User masuk ke halaman "Pendaftaran Saya"
2. Klik expand pada event tertentu
3. Klik tombol "Tambah Tim"
4. Input Tim D (8 anggota)
5. Submit → Tim D ditambahkan ke pendaftaran yang sama

### Scenario 3: Batalkan Satu Tim

1. User masuk ke halaman "Pendaftaran Saya"
2. Expand detail event
3. Klik icon trash pada Tim B
4. Konfirmasi → Tim B status = CANCELLED
5. Event `currentParticipants` berkurang 1
6. Tim A dan Tim C tetap aktif

## Migration

Database migration sudah dibuat:

```
prisma/migrations/20251108041413_add_participation_groups/
```

Model `ParticipationGroup` ditambahkan dengan relasi one-to-many ke `EventParticipation`.

## Testing

### Manual Testing Steps:

1. **Create Event (as PANITIA)**

   - Login sebagai panitia
   - Buat event dengan kategori SMA (limit: 10 tim)

2. **Register Event (as PESERTA)**

   - Login sebagai peserta
   - Browse dashboard
   - Daftar event dengan 2 tim
   - Verify badge "Terdaftar" muncul

3. **Add Group**

   - Masuk ke "Pendaftaran Saya"
   - Tambahkan tim ke-3
   - Verify total tim bertambah

4. **Cancel Group**

   - Batalkan 1 tim
   - Verify tim status = CANCELLED
   - Verify kuota event berkurang

5. **Quota Validation**
   - Coba daftarkan lebih dari limit
   - Verify error muncul

## Notes

- Setiap grup/tim dihitung sebagai 1 participant dalam event
- `event.currentParticipants` di-increment sesuai jumlah groups yang didaftarkan
- Peserta bisa melihat hanya pendaftaran mereka sendiri
- Admin/Panitia bisa melihat semua pendaftaran (endpoint berbeda)
