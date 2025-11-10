# Event Management - SuperAdmin

## Overview

Halaman Event Management untuk SuperAdmin memungkinkan admin untuk mengelola event dan mengatur event mana yang akan ditampilkan di carousel landing page.

## Features

### 1. **Pin/Unpin Event**

- SuperAdmin dapat mem-pin event untuk menampilkannya di carousel landing page
- Maksimal 10 event dapat di-pin secara bersamaan
- Event yang di-pin akan ditampilkan di carousel dengan urutan berdasarkan `pinnedOrder`

### 2. **Manage Pin Order**

- Gunakan tombol panah (↑↓) untuk mengubah urutan event di carousel
- Event dengan `pinnedOrder` lebih kecil akan tampil lebih dulu
- Urutan dapat diubah dengan swap antara dua event

### 3. **Filter Events**

- **All Events**: Menampilkan semua event
- **Pinned**: Hanya menampilkan event yang di-pin
- **Unpinned**: Hanya menampilkan event yang tidak di-pin

### 4. **View Event Details**

- Setiap card menampilkan:
  - Thumbnail event
  - Status pin (badge kuning dengan nomor urutan)
  - Title, category, dan status event
  - Tanggal dan lokasi
  - Pembatasan per kategori sekolah (SD/MI, SMP/MTs, SMA/SMK/MA)
  - Informasi pembuat event (Panitia)
- Link "Lihat Event" untuk melihat halaman detail event

## Routes

### Frontend

- **Admin Dashboard**: `/admin/dashboard`
- **Event Management**: `/admin/events`

### Backend API

- **GET `/api/events`**: Get all events
- **GET `/api/events/pinned/carousel`**: Get pinned events for carousel
- **PATCH `/api/events/:id/pin`**: Pin/unpin event (SuperAdmin only)

## Usage

### Pin an Event

1. Buka halaman Event Management (`/admin/events`)
2. Cari event yang ingin di-pin
3. Klik tombol "Pin ke Carousel"
4. Event akan muncul di section "Pinned Events" dengan badge kuning

### Unpin an Event

1. Cari event yang sudah di-pin
2. Klik tombol "Unpin"
3. Event akan kembali ke section "Event Lainnya"

### Change Pin Order

1. Di section "Pinned Events", gunakan tombol panah:
   - **↑ (Arrow Up)**: Pindahkan event ke atas (order lebih kecil)
   - **↓ (Arrow Down)**: Pindahkan event ke bawah (order lebih besar)
2. Perubahan urutan akan langsung terlihat di carousel

## Backend Implementation

### Database Schema

```prisma
model Event {
  id           String   @id @default(uuid())
  isPinned     Boolean  @default(false)
  pinnedOrder  Int?
  // ... other fields
}
```

### Pin/Unpin Endpoint

```typescript
PATCH /api/events/:id/pin
Authorization: Bearer <token> (SuperAdmin only)

Request Body:
{
  "isPinned": true,      // boolean
  "pinnedOrder": 1       // number (optional, null to unpin)
}

Response:
{
  "message": "Event pinned successfully",
  "data": {
    "id": "event-id",
    "title": "Event Title",
    "isPinned": true,
    "pinnedOrder": 1
  }
}
```

### Get Pinned Events for Carousel

```typescript
GET / api / events / pinned / carousel;

Response: [
	{
		id: "event-id",
		title: "Event Title",
		description: "...",
		thumbnail: "/uploads/events/...",
		slug: "event-slug",
		startDate: "2025-11-10",
		endDate: "2025-11-12",
		location: "...",
		venue: "...",
		pinnedOrder: 1,
	},
	// ... max 10 events
];
```

## Component Structure

```
EventManagement.tsx
├── Header
│   ├── Title & Description
│   └── Back to Dashboard Link
├── Filters (All/Pinned/Unpinned)
├── Pinned Events Section
│   ├── Info Banner
│   └── EventCard[] (sortable)
└── Unpinned Events Section
    └── EventCard[]

EventCard Component
├── Thumbnail (with pin badge if pinned)
├── Event Info
│   ├── Title & Status Badge
│   ├── Category Badge
│   ├── Description
│   ├── Date & Location
│   └── School Category Limits
└── Actions
    ├── Pin/Unpin Button
    ├── Order Controls (↑↓) [only for pinned]
    └── View Event Link
```

## Notes

- Hanya SuperAdmin yang dapat mengakses halaman ini
- Event yang di-pin akan otomatis tampil di carousel landing page
- Urutan di carousel mengikuti `pinnedOrder` (ascending)
- Jika lebih dari 10 event di-pin, hanya 10 yang akan tampil di carousel
- Perubahan pin status dan order langsung ter-apply tanpa perlu refresh
