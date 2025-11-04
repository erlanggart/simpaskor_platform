# Event Poster Upload Feature

## Overview

Fitur upload poster/thumbnail event dengan rasio 4:5 pada form Create Event untuk Panitia.

## Changes Made

### Backend Changes

#### 1. Upload Middleware (`backend/src/middleware/upload.ts`)

- **Added**: `eventThumbnailStorage` configuration

  - Destination: `uploads/events/`
  - Filename pattern: `event-{timestamp}-{random}.{ext}`
  - Auto-create directory with `ensureDir()` function

- **Added**: `uploadEventThumbnail` multer instance
  - Max file size: 10MB
  - Allowed types: JPG, JPEG, PNG
  - File filter validation

#### 2. Events Routes (`backend/src/routes/events.ts`)

- **New Endpoint**: `POST /api/events/upload-thumbnail`

  - Authentication: Required (Panitia role)
  - Upload single file with key `thumbnail`
  - Returns: `{ message, thumbnailUrl }`
  - Thumbnail URL format: `/uploads/events/{filename}`

- **Updated**: Event creation endpoint
  - Added `thumbnail` field to request body
  - Saves thumbnail URL to database

### Frontend Changes

#### 1. CreateEvent Form (`frontend/src/pages/panitia/CreateEvent.tsx`)

**Added State:**

```typescript
const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
```

**Added to EventFormData:**

```typescript
interface EventFormData {
	// ... existing fields
	thumbnail: string; // NEW: thumbnail URL
}
```

**New Functions:**

- `handleThumbnailUpload()`: Upload image to server
  - File validation (type & size)
  - Image preview with FileReader
  - Upload via FormData to API
  - Save thumbnail URL to form state
- `removeThumbnail()`: Clear uploaded thumbnail

**New UI Section:**

- Drag & drop upload area
- Image preview with 4:5 aspect ratio
- Remove button
- Loading state during upload
- Success/error messages
- File size and format info

### Features

1. **Upload Area**

   - Dashed border hover effect
   - Icon and text guidance
   - File input hidden, triggered by label click
   - Disabled during upload

2. **Image Preview**

   - Display uploaded image (4:5 ratio)
   - Fixed size: 256x320px (w-64 h-80)
   - Remove button (top-right corner)
   - Success message

3. **Validation**

   - File type: Only images
   - File size: Max 10MB
   - User-friendly error messages via SweetAlert

4. **Aspect Ratio Guide**
   - Recommended: 800x1000px or 1600x2000px
   - Display ratio: 4:5 (portrait poster)
   - CSS: `aspectRatio: "4/5"`

## Usage Flow

### 1. Create Event (Panitia)

```
1. Navigate to /panitia/create-event
2. Fill event details
3. Click "Klik untuk upload poster"
4. Select image file (JPG/PNG, max 10MB)
5. Preview appears with remove option
6. Submit form with thumbnail URL
```

### 2. API Flow

```
1. User selects image
2. Frontend validates file
3. POST /api/events/upload-thumbnail
4. Backend saves to uploads/events/
5. Returns thumbnail URL
6. Frontend saves URL to form
7. POST /api/events with thumbnail URL
8. Event created with thumbnail
```

## File Structure

```
backend/
  src/
    middleware/
      upload.ts           # ✅ Updated: Added eventThumbnailStorage
    routes/
      events.ts           # ✅ Updated: Added upload endpoint & thumbnail field
  uploads/
    banners/              # Existing (unused now)
    events/               # NEW: Auto-created on first upload
      event-{timestamp}-{random}.{ext}

frontend/
  src/
    pages/
      panitia/
        CreateEvent.tsx   # ✅ Updated: Added poster upload UI
```

## API Endpoints

### Upload Thumbnail

```http
POST /api/events/upload-thumbnail
Authorization: Bearer {token}
Content-Type: multipart/form-data

Body: FormData with 'thumbnail' file

Response:
{
  "message": "Thumbnail uploaded successfully",
  "thumbnailUrl": "/uploads/events/event-1730701234567-123456789.jpg"
}
```

### Create Event

```http
POST /api/events
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "couponId": "uuid",
  "title": "Event Title",
  "description": "...",
  "thumbnail": "/uploads/events/event-1730701234567-123456789.jpg", // NEW
  "assessmentCategoryIds": ["uuid1", "uuid2"],
  "startDate": "2024-12-01",
  "endDate": "2024-12-05",
  "location": "Jakarta",
  "venue": "Stadium",
  "schoolCategoryLimits": [...],
  "registrationFee": 0,
  "organizer": "Org Name",
  "contactEmail": "email@example.com",
  "contactPhone": "08123456789",
  "status": "PUBLISHED"
}
```

## UI Components

### Upload Area (Empty State)

```tsx
- Icon: PhotoIcon (gray)
- Text: "Klik untuk upload poster"
- Subtext: "Rekomendasi: 800x1000px atau 1600x2000px"
- Border: Dashed, hover effect
- Loading: "Mengupload..." when uploading
```

### Preview State

```tsx
- Image: 256x320px (4:5 ratio)
- Border: Indigo
- Remove Button: Top-right, red circular
- Success Message: Green text with checkmark
```

## Error Handling

**Frontend Validation:**

- File type not image → "File harus berupa gambar!"
- File size > 10MB → "Ukuran file maksimal 10MB!"
- Upload failed → "Gagal upload gambar. Silakan coba lagi."

**Backend Validation:**

- No file uploaded → 400: "No file uploaded"
- Invalid file type → Error from multer fileFilter
- File too large → Error from multer size limit

## Environment Variables

No new environment variables required. Uses existing:

- `VITE_API_URL` - For API calls
- `VITE_BACKEND_URL` - For image display in carousel

## Testing

```bash
# 1. Login as Panitia
# Navigate to http://localhost:5173/panitia/create-event

# 2. Test upload
- Select image (JPG/PNG)
- Verify preview appears
- Check console for API response

# 3. Test validation
- Try uploading non-image → Should show error
- Try uploading >10MB file → Should show error

# 4. Test remove
- Click X button on preview
- Verify preview clears

# 5. Test form submission
- Fill all required fields
- Upload poster
- Submit form
- Check event created with thumbnail URL

# 6. Verify file storage
docker exec simpaskor_backend ls -la uploads/events/
# Should show uploaded files
```

## Benefits

1. **Visual Appeal**: Events now have eye-catching posters
2. **Consistency**: 4:5 ratio works well for mobile & desktop
3. **User-Friendly**: Drag & drop with instant preview
4. **Validation**: Proper file type & size checks
5. **Carousel Ready**: Thumbnails displayed in pinned events carousel
6. **Storage**: Organized in separate events directory

## Future Improvements

- [ ] Image compression before upload
- [ ] Crop/resize tool in browser
- [ ] Multiple image upload (gallery)
- [ ] Drag & drop from desktop
- [ ] Progress bar for large files
- [ ] Aspect ratio enforcement (strict 4:5)
- [ ] Watermark option
- [ ] Image optimization on server

---

**Feature Date**: November 4, 2025  
**Status**: ✅ Completed  
**Tested**: Backend ✅ | Frontend ✅ | Upload ✅
