# Profile Settings Component

Komponen lengkap untuk mengelola pengaturan profil pengguna.

## Features

✅ **Profil Lengkap**

- Edit nama depan & belakang
- Update nomor telepon
- Bio/deskripsi diri
- Institusi/organisasi
- Alamat lengkap (jalan, kota, provinsi)
- Tanggal lahir
- Jenis kelamin

✅ **Keamanan**

- Ganti password
- Validasi password lama
- Konfirmasi password baru
- Minimum 6 karakter

✅ **Foto Profil**

- Upload foto profil
- Preview sebelum upload
- Hapus foto profil
- Validasi: Max 2MB, format gambar

✅ **Logout**

- Button logout dengan konfirmasi

## Usage

### 1. Import Component

```tsx
import { ProfileSettings } from "../components/ProfileSettings";
```

### 2. Use in Page

```tsx
const ProfilePage = () => {
	return <ProfileSettings />;
};
```

### 3. Add to Router

```tsx
import Profile from "./pages/Profile";

<Route
	path="/profile"
	element={
		<ProtectedRoute>
			<Profile />
		</ProtectedRoute>
	}
/>;
```

### 4. Link from Dashboard

Gunakan `DashboardNavbar` component yang sudah include dropdown menu dengan link ke profile:

```tsx
import { DashboardNavbar } from "../../components/DashboardNavbar";

const Dashboard = () => {
	return (
		<div>
			<DashboardNavbar title="Dashboard Peserta" />
			{/* Dashboard content */}
		</div>
	);
};
```

## API Endpoints

Komponen ini menggunakan endpoints berikut:

### Update Profile

```
PUT /api/users/profile
Body: {
  firstName, lastName, phone,
  bio, institution, address,
  city, province, birthDate, gender
}
```

### Update Password

```
PUT /api/users/password
Body: {
  currentPassword,
  newPassword
}
```

### Upload Avatar

```
POST /api/users/avatar
Content-Type: multipart/form-data
Body: FormData with 'avatar' file
```

### Delete Avatar

```
DELETE /api/users/avatar
```

## Styling

Component menggunakan Tailwind CSS dengan:

- Responsive design (mobile-first)
- Tab navigation (Profil, Password, Foto)
- Form validation
- Loading states
- Success/error messages

## Features Detail

### Tab 1: Profil

- Form dengan grid layout (2 kolom di desktop)
- Email field disabled (tidak bisa diubah)
- Semua field opsional kecuali nama
- Auto-save ke localStorage setelah berhasil

### Tab 2: Ganti Password

- Validasi password lama
- Password baru minimal 6 karakter
- Konfirmasi password match
- Form reset setelah sukses

### Tab 3: Foto Profil

- File picker dengan preview
- Validasi type (image/\*)
- Validasi size (max 2MB)
- Option untuk hapus foto

## Security

- ✅ Protected route (requires authentication)
- ✅ JWT token in request headers
- ✅ Password verification for update
- ✅ File type & size validation
- ✅ Owner-only access (user can only edit own profile)

## Examples

### Access Profile Page

```
http://localhost:5173/profile
```

### From Dashboard

User menu dropdown → "Profil Saya" atau "Pengaturan"

### Programmatically Navigate

```tsx
import { useNavigate } from "react-router-dom";

const navigate = useNavigate();
navigate("/profile");
```

## Notes

⚠️ **Avatar Upload**: Currently returns placeholder URL. In production:

1. Install `multer` for file upload
2. Validate file type & size
3. Upload to cloud storage (S3/Cloudinary)
4. Save URL to database

⚠️ **Email Update**: Email tidak bisa diubah untuk keamanan. Jika perlu ubah email, implementasikan flow verifikasi email baru.

## Backend Requirements

Pastikan backend endpoints sudah tersedia:

- ✅ `PUT /api/users/profile` - Update user & profile data
- ✅ `PUT /api/users/password` - Change password
- ✅ `POST /api/users/avatar` - Upload avatar
- ✅ `DELETE /api/users/avatar` - Delete avatar

Endpoints sudah tersedia di `/backend/src/routes/users.ts`
