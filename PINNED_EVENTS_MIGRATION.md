# Pinned Events Migration - Banner Carousel Update

## Overview

Banner carousel sekarang menggunakan sistem **Pinned Events** sebagai pengganti model Banner yang terpisah. Event yang di-pin akan muncul di carousel pada landing page.

## Changes Made

### 1. Database Schema Changes

#### Removed:

- **Banner Model** - Tabel `banners` dihapus dari database

#### Added to Event Model:

```prisma
isPinned      Boolean  @default(false) @map("is_pinned")
pinnedOrder   Int?     @map("pinned_order")
```

**Migration:**

```bash
20251104053405_add_pinned_events_remove_banners
```

### 2. Backend Changes

#### Removed:

- `backend/src/routes/banners.ts` - Route untuk banner management
- `backend/src/middleware/upload.ts` - Masih ada untuk upload thumbnail event
- Banner routes dari `server.ts`

#### Added/Updated:

- **New Endpoint**: `GET /api/events/pinned/carousel`

  - Fetch events dengan `isPinned = true`
  - Sorted by `pinnedOrder` ASC, `createdAt` DESC
  - Limit: 10 events maksimal
  - Returns: id, title, description, thumbnail, slug, startDate, endDate, location, venue, pinnedOrder

- **New Endpoint**: `PATCH /api/events/:id/pin` (SuperAdmin only)
  - Toggle pin status event
  - Update pinnedOrder
  - Body: `{ isPinned: boolean, pinnedOrder: number }`

### 3. Frontend Changes

#### Updated Components:

- **BannerCarousel.tsx**:
  - Props changed: `banners` → `events`
  - Interface changed: `Banner[]` → `PinnedEvent[]`
  - Shows event thumbnail, title, description, location, startDate
  - Button links to `/events/:slug`
  - Hover overlay with event details

#### Updated Hooks:

- **useLandingData.ts**:
  - Fetches from `/api/events/pinned/carousel` instead of `/api/banners`
  - Returns `pinnedEvents` instead of `banners`

#### Removed:

- `frontend/src/pages/admin/BannerManagement.tsx` - Admin page untuk banner
- Banner route dari `App.tsx`
- "Kelola Banner" menu dari `DashboardLayout.tsx`

## How to Pin Events

### Option 1: Using API Endpoint (SuperAdmin)

```bash
# Pin event
curl -X PATCH http://localhost:3001/api/events/{event-id}/pin \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "isPinned": true,
    "pinnedOrder": 1
  }'

# Unpin event
curl -X PATCH http://localhost:3001/api/events/{event-id}/pin \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "isPinned": false
  }'
```

### Option 2: Direct Database Update

```sql
-- Pin event with order
UPDATE events
SET is_pinned = true, pinned_order = 1
WHERE id = 'event-uuid';

-- Unpin event
UPDATE events
SET is_pinned = false, pinned_order = NULL
WHERE id = 'event-uuid';

-- View pinned events
SELECT id, title, is_pinned, pinned_order
FROM events
WHERE is_pinned = true
ORDER BY pinned_order ASC;
```

## Benefits

1. **Single Source of Truth**: Event data tidak duplikat
2. **Simpler Management**: Tidak perlu upload gambar terpisah untuk banner
3. **Automatic Updates**: Perubahan event otomatis update di carousel
4. **Better SEO**: Link langsung ke event detail page
5. **Reduced Code**: Menghapus banner management system yang redundant

## Carousel Behavior

- **Image Source**: Event thumbnail (`thumbnail` field)
- **Default Display**: Hidden caption
- **On Hover**: Shows title, description, location, date, and "Lihat Detail Event" button
- **Aspect Ratio**: 3:1 (same as before)
- **Auto-play**: 5 seconds interval
- **Max Events**: 10 pinned events in carousel
- **Sorting**: By pinnedOrder (ascending), then createdAt (descending)

## Migration Steps (Completed)

1. ✅ Add `isPinned` and `pinnedOrder` fields to Event model
2. ✅ Drop Banner model and table
3. ✅ Generate and apply migration
4. ✅ Remove banner routes from backend
5. ✅ Add pinned events endpoints
6. ✅ Update BannerCarousel component
7. ✅ Update useLandingData hook
8. ✅ Remove BannerManagement page
9. ✅ Update navigation menus
10. ✅ Test endpoints and UI

## TODO: Future Improvements

- [ ] Add UI in SuperAdmin dashboard to pin/unpin events
- [ ] Bulk pin/unpin events
- [ ] Drag & drop to reorder pinned events
- [ ] Preview pinned events before publishing
- [ ] Analytics for carousel click-through rates

## Testing

```bash
# Test pinned events endpoint
curl http://localhost:3001/api/events/pinned/carousel

# Expected response: Empty array (no pinned events yet)
[]

# Pin an event manually via database
psql -U simpaskor_user -d simpaskor_db -c "UPDATE events SET is_pinned = true, pinned_order = 1 WHERE status = 'PUBLISHED' LIMIT 1;"

# Test again
curl http://localhost:3001/api/events/pinned/carousel
```

## Environment Variables

No new environment variables required. Uses existing:

- `VITE_API_URL` - Backend API URL
- `VITE_BACKEND_URL` - For image URLs

## Rollback (If Needed)

If issues arise, restore from backup or:

1. Revert migration: `npx prisma migrate resolve --rolled-back 20251104053405_add_pinned_events_remove_banners`
2. Checkout previous commit with banner system
3. Run old migrations

---

**Migration Date**: November 4, 2025  
**Status**: ✅ Completed  
**Tested**: Backend ✅ | Frontend ✅ | Database ✅
