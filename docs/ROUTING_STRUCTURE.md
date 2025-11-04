# Routing Structure

## Overview

Aplikasi ini menggunakan React Router v7 dengan pattern **Outlet** untuk nested routing. Setiap layout (MainLayout, AuthLayout, DashboardLayout) bertindak sebagai parent route yang membungkus child routes-nya.

## Route Hierarchy

```
App
├── MainLayout (/)
│   ├── LandingPage (/)
│   └── Unauthorized (/unauthorized)
│
├── AuthLayout (/login, /register)
│   ├── Login (/login)
│   └── Register (/register)
│
├── DashboardLayout (Protected Routes)
│   ├── SuperAdmin (/admin/*)
│   │   ├── Dashboard (/admin/dashboard)
│   │   └── Profile (/admin/profile)
│   │
│   ├── Panitia (/panitia/*)
│   │   ├── Dashboard (/panitia/dashboard)
│   │   └── Profile (/panitia/profile)
│   │
│   ├── Peserta (/peserta/*)
│   │   ├── Dashboard (/peserta/dashboard)
│   │   └── Profile (/peserta/profile)
│   │
│   ├── Juri (/juri/*)
│   │   ├── Dashboard (/juri/dashboard)
│   │   └── Profile (/juri/profile)
│   │
│   └── Pelatih (/pelatih/*)
│       ├── Dashboard (/pelatih/dashboard)
│       └── Profile (/pelatih/profile)
│
└── NotFound (*)
```

## Layout Components

### MainLayout

- **Purpose**: Public pages wrapper
- **Features**: Navbar, Footer
- **Routes**: /, /unauthorized
- **Location**: `frontend/src/layouts/MainLayout.tsx`

### AuthLayout

- **Purpose**: Authentication pages wrapper
- **Features**: Centered card design, Logo, Footer
- **Routes**: /login, /register
- **Location**: `frontend/src/layouts/AuthLayout.tsx`

### DashboardLayout

- **Purpose**: Protected dashboard pages wrapper
- **Features**: Sidebar navigation (role-based), User profile dropdown, Mobile responsive
- **Routes**: All role-based dashboard routes
- **Location**: `frontend/src/layouts/DashboardLayout.tsx`

## Protected Routes

Semua dashboard routes dilindungi oleh `ProtectedRoute` component yang:

- Memverifikasi autentikasi user
- Mengecek role user sesuai dengan `allowedRoles`
- Redirect ke `/unauthorized` jika user tidak memiliki akses
- Redirect ke `/login` jika user belum login

**Example:**

```tsx
<Route
	element={
		<ProtectedRoute allowedRoles={["SUPERADMIN"]}>
			<DashboardLayout />
		</ProtectedRoute>
	}
>
	<Route path="admin">
		<Route path="dashboard" element={<AdminDashboard />} />
		<Route path="profile" element={<Profile />} />
	</Route>
</Route>
```

## Error Pages

### Unauthorized (403)

- **Route**: `/unauthorized`
- **Purpose**: Ditampilkan ketika user mencoba mengakses halaman yang tidak sesuai dengan role-nya
- **Features**:
  - Menampilkan role user saat ini
  - Button "Kembali" untuk navigasi mundur
  - Link ke dashboard sesuai role user
  - Link ke login jika belum authenticate
- **Location**: `frontend/src/pages/Unauthorized.tsx`

### Not Found (404)

- **Route**: `*` (catch-all)
- **Purpose**: Ditampilkan ketika user mengakses route yang tidak ada
- **Features**:
  - Button "Kembali" untuk navigasi mundur
  - Link ke beranda (/)
  - Contact information
- **Location**: `frontend/src/pages/NotFound.tsx`

## Role-Based Navigation

Setiap role memiliki dashboard path-nya sendiri:

| Role       | Dashboard Path       |
| ---------- | -------------------- |
| SUPERADMIN | `/admin/dashboard`   |
| PANITIA    | `/panitia/dashboard` |
| PESERTA    | `/peserta/dashboard` |
| JURI       | `/juri/dashboard`    |
| PELATIH    | `/pelatih/dashboard` |

## Adding New Routes

### 1. Public Route (MainLayout)

```tsx
<Route element={<MainLayout />}>
	<Route path="about" element={<About />} />
</Route>
```

### 2. Auth Route (AuthLayout)

```tsx
<Route element={<AuthLayout />}>
	<Route path="forgot-password" element={<ForgotPassword />} />
</Route>
```

### 3. Protected Route (DashboardLayout)

```tsx
<Route
	element={
		<ProtectedRoute allowedRoles={["PESERTA"]}>
			<DashboardLayout />
		</ProtectedRoute>
	}
>
	<Route path="peserta">
		<Route path="events" element={<Events />} />
		<Route path="competitions" element={<Competitions />} />
	</Route>
</Route>
```

## Best Practices

1. **Page Components**: Jangan wrap page component dengan layout lagi, karena layout sudah diterapkan di parent route
2. **Protected Routes**: Selalu gunakan `ProtectedRoute` untuk halaman yang memerlukan autentikasi
3. **Role-Based Access**: Tentukan `allowedRoles` sesuai dengan akses yang dibutuhkan
4. **Error Handling**: Gunakan NotFound untuk catch-all route di akhir routing tree
5. **Route Grouping**: Group routes berdasarkan role untuk maintainability yang lebih baik

## Migration Notes

Jika Anda memiliki page component yang masih menggunakan layout wrapper langsung:

**Before:**

```tsx
// pages/Login.tsx
return (
	<AuthLayout title="Login">
		<form>...</form>
	</AuthLayout>
);
```

**After:**

```tsx
// pages/Login.tsx
return (
	<>
		<div className="text-center mb-8">
			<h2>Login</h2>
		</div>
		<form>...</form>
	</>
);
```

Layout sudah diterapkan di parent route, jadi page component hanya perlu mengembalikan content-nya saja.
