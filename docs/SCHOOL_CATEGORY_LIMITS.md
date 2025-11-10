# School Category Limits - Dokumentasi

## Overview

Sistem kuota peserta per kategori sekolah memungkinkan panitia untuk mengatur jumlah maksimal peserta dari setiap kategori sekolah (SD, SMP, SMA, PURNA) dalam sebuah event.

## Database Structure

### Tabel: `event_school_category_limits`

```sql
CREATE TABLE event_school_category_limits (
    id UUID PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    school_category_id UUID REFERENCES school_categories(id) ON DELETE CASCADE,
    max_participants INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(event_id, school_category_id)
);
```

### Relasi

- **Event** (One-to-Many) → **EventSchoolCategoryLimit**: Satu event bisa punya banyak limit per kategori
- **SchoolCategory** (One-to-Many) → **EventSchoolCategoryLimit**: Satu kategori bisa dipakai di banyak event

## Cara Kerja

### 1. Frontend - Create Event Form

Ketika panitia membuat event:

```typescript
// State untuk menyimpan kuota per kategori
const [formData, setFormData] = useState({
	schoolCategoryLimits: [
		{ categoryId: "uuid-sd", maxParticipants: 20 },
		{ categoryId: "uuid-smp", maxParticipants: 30 },
		// ...
	],
});
```

**Minimum Peserta**: 20 orang per kategori

### 2. Backend - API Endpoint

**POST** `/api/events`

Request Body:

```json
{
  "title": "Lomba Paskibra 2025",
  "assessmentCategoryIds": [...],
  "schoolCategoryLimits": [
    {
      "categoryId": "550e8400-e29b-41d4-a716-446655440000",
      "maxParticipants": 20
    },
    {
      "categoryId": "660e8400-e29b-41d4-a716-446655440001",
      "maxParticipants": 50
    }
  ],
  ...
}
```

### 3. Database - Penyimpanan

Ketika event dibuat, data disimpan di **2 tabel**:

#### a. Tabel `events`

```sql
-- Data event utama
INSERT INTO events (id, title, location, ...)
VALUES ('event-uuid', 'Lomba Paskibra 2025', 'Jakarta', ...);
```

#### b. Tabel `event_school_category_limits`

```sql
-- Kuota untuk kategori SD
INSERT INTO event_school_category_limits
(id, event_id, school_category_id, max_participants)
VALUES (
  'limit-uuid-1',
  'event-uuid',
  'category-sd-uuid',
  20
);

-- Kuota untuk kategori SMP
INSERT INTO event_school_category_limits
(id, event_id, school_category_id, max_participants)
VALUES (
  'limit-uuid-2',
  'event-uuid',
  'category-smp-uuid',
  50
);
```

## Query Examples

### 1. Get Event dengan Limits

```typescript
const event = await prisma.event.findUnique({
	where: { id: eventId },
	include: {
		schoolCategoryLimits: {
			include: {
				schoolCategory: true,
			},
		},
	},
});
```

Response:

```json
{
	"id": "event-uuid",
	"title": "Lomba Paskibra 2025",
	"schoolCategoryLimits": [
		{
			"id": "limit-uuid-1",
			"maxParticipants": 20,
			"schoolCategory": {
				"id": "category-sd-uuid",
				"name": "SD",
				"description": "Sekolah Dasar"
			}
		},
		{
			"id": "limit-uuid-2",
			"maxParticipants": 50,
			"schoolCategory": {
				"id": "category-smp-uuid",
				"name": "SMP",
				"description": "Sekolah Menengah Pertama"
			}
		}
	]
}
```

### 2. Check Available Slots

```sql
SELECT
  escl.max_participants,
  COUNT(ep.id) as current_participants,
  (escl.max_participants - COUNT(ep.id)) as available_slots
FROM event_school_category_limits escl
LEFT JOIN event_participations ep
  ON ep.event_id = escl.event_id
  AND ep.school_category_id = escl.school_category_id
WHERE escl.event_id = 'event-uuid'
GROUP BY escl.id, escl.max_participants;
```

## Flow Diagram

```
┌─────────────────┐
│  Panitia fills  │
│  Create Event   │
│     Form        │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Select School Categories:       │
│ ☑ SD  → Max: 20 peserta         │
│ ☑ SMP → Max: 50 peserta         │
│ ☐ SMA                           │
│ ☐ PURNA                         │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ POST /api/events                │
│ Body: {                         │
│   schoolCategoryLimits: [...]   │
│ }                               │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Database Transaction:           │
│ 1. INSERT INTO events           │
│ 2. INSERT INTO                  │
│    event_assessment_categories  │
│ 3. INSERT INTO                  │
│    event_school_category_limits │
│    (Multiple rows)              │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ ✅ Event Created with Limits    │
│                                 │
│ events table:                   │
│ - id: event-123                 │
│ - title: "Lomba..."             │
│                                 │
│ event_school_category_limits:   │
│ - event_id: event-123           │
│   category_id: SD               │
│   max: 20                       │
│                                 │
│ - event_id: event-123           │
│   category_id: SMP              │
│   max: 50                       │
└─────────────────────────────────┘
```

## Validasi

### Frontend

- Minimum: 20 peserta per kategori
- Input type: number dengan min="20"
- Default value: 20 saat kategori dipilih

### Backend

- Validasi array schoolCategoryLimits
- Setiap item harus punya categoryId dan maxParticipants
- maxParticipants minimum: 1 (bisa diubah sesuai kebutuhan)

## Migration

Migration file: `20251104063210_add_event_school_category_limits/migration.sql`

```sql
CREATE TABLE "event_school_category_limits" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "school_category_id" TEXT NOT NULL,
    "max_participants" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_school_category_limits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "event_school_category_limits_event_id_school_category_id_key"
ON "event_school_category_limits"("event_id", "school_category_id");

ALTER TABLE "event_school_category_limits"
ADD CONSTRAINT "event_school_category_limits_event_id_fkey"
FOREIGN KEY ("event_id") REFERENCES "events"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "event_school_category_limits"
ADD CONSTRAINT "event_school_category_limits_school_category_id_fkey"
FOREIGN KEY ("school_category_id") REFERENCES "school_categories"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
```

## Use Cases

### 1. Registrasi Peserta

Ketika peserta mendaftar, sistem akan:

1. Cek kategori sekolah peserta (SD/SMP/SMA/PURNA)
2. Cek apakah kategori tersebut ada limit di event ini
3. Hitung jumlah peserta yang sudah terdaftar di kategori tersebut
4. Jika belum penuh, izinkan registrasi
5. Jika penuh, tampilkan error "Kuota kategori SD sudah penuh"

### 2. Dashboard Panitia

Panitia bisa melihat:

- Kuota total per kategori
- Peserta terdaftar per kategori
- Sisa slot per kategori

### 3. Landing Page Event

Tampilkan informasi:

```
Kategori Peserta:
- SD: 15/20 peserta (5 slot tersisa)
- SMP: 50/50 peserta (PENUH)
```

## Notes

- Unique constraint pada (event_id, school_category_id) memastikan tidak ada duplikasi limit untuk kategori yang sama dalam satu event
- CASCADE DELETE: Jika event dihapus, semua limit-nya ikut terhapus otomatis
- Panitia bisa tidak mengisi limit untuk kategori tertentu = tidak ada batasan untuk kategori tersebut
