# Layout System Documentation

Sistem layout yang konsisten dan reusable untuk seluruh aplikasi Simpaskor Platform.

## 📁 Layout Components

### 1. **DashboardLayout**

Layout utama untuk semua halaman dashboard dengan sidebar navigation.

#### Features:

- ✅ **Sidebar Navigation** - Menu dinamis berdasarkan role user
- ✅ **Responsive Design** - Mobile-friendly dengan hamburger menu
- ✅ **User Profile Dropdown** - Quick access ke profile dan logout
- ✅ **Role-based Menu** - Menu items menyesuaikan role (SuperAdmin, Panitia, Peserta, Juri, Pelatih)
- ✅ **Active State Indication** - Highlight menu yang sedang aktif
- ✅ **Logo Branding** - Consistent logo placement

#### Usage:

```tsx
import { DashboardLayout } from "../../layouts/DashboardLayout";

const MyDashboard = () => {
	return (
		<DashboardLayout>
			<h1>Dashboard Content</h1>
			{/* Your page content here */}
		</DashboardLayout>
	);
};
```

#### Menu Structure by Role:

**SUPERADMIN:**

- Dashboard
- Kelola Pengguna
- Kelola Event
- Statistik
- Pengaturan

**PANITIA:**

- Dashboard
- Event Saya
- Peserta
- Laporan

**PESERTA:**

- Dashboard
- Event Tersedia
- Pendaftaran Saya
- Riwayat

**JURI:**

- Dashboard
- Event Saya
- Penilaian
- Jadwal

**PELATIH:**

- Dashboard
- Atlet Saya
- Event
- Performa

---

### 2. **AuthLayout**

Layout untuk halaman authentication (Login, Register, Forgot Password, dll).

#### Features:

- ✅ **Centered Card Design** - Focus pada form authentication
- ✅ **Logo Header** - Branding di bagian atas
- ✅ **Gradient Background** - Modern visual design
- ✅ **Footer** - Copyright information
- ✅ **Responsive** - Works on all screen sizes

#### Usage:

```tsx
import { AuthLayout } from "../layouts/AuthLayout";

const Login = () => {
	return (
		<AuthLayout
			title="Masuk ke Akun Anda"
			subtitle="Sistem Informasi Simpaskor Platform"
		>
			<form>{/* Your login form here */}</form>
		</AuthLayout>
	);
};
```

#### Props:

- `title` (required): Main heading text
- `subtitle` (optional): Descriptive text below title
- `children`: Form content

---

### 3. **MainLayout**

Layout untuk halaman public/landing pages dengan navbar dan footer.

#### Features:

- ✅ **Sticky Navbar** - Always visible navigation
- ✅ **Conditional Auth Buttons** - Show login/register or dashboard link
- ✅ **Navigation Links** - Beranda, Event, Tentang, Kontak
- ✅ **Rich Footer** - Multi-column footer dengan links dan contact info
- ✅ **Responsive** - Mobile-friendly navigation

#### Usage:

```tsx
import { MainLayout } from "../layouts/MainLayout";

const LandingPage = () => {
	return (
		<MainLayout showNavbar={true} showFooter={true}>
			<section>{/* Your landing page content */}</section>
		</MainLayout>
	);
};
```

#### Props:

- `showNavbar` (optional, default: true): Show/hide navbar
- `showFooter` (optional, default: true): Show/hide footer
- `children`: Page content

---

## 🎨 Design System

### Colors:

- **Primary**: Blue (#2563eb) - Links, buttons, accents
- **Background**: Gray-50 (#f9fafb) - Page background
- **White**: #ffffff - Cards, sidebar, navbar
- **Success**: Green - Success states
- **Warning**: Yellow - Warning states
- **Error**: Red - Error states, logout button

### Typography:

- **Headings**: Font-bold, Gray-900
- **Body**: Font-medium/normal, Gray-700
- **Captions**: Text-sm, Gray-600/500

### Spacing:

- **Container**: max-w-7xl mx-auto
- **Padding**: px-4 sm:px-6 lg:px-8
- **Gaps**: gap-3, gap-4, space-y-4

---

## 📱 Responsive Behavior

### DashboardLayout:

- **Desktop (md+)**: Fixed sidebar on left, main content on right
- **Mobile (<md)**: Hamburger menu, overlay sidebar

### AuthLayout:

- **All Sizes**: Centered card with max-width constraint

### MainLayout:

- **Desktop**: Full horizontal navbar
- **Mobile**: Collapsible menu (to be implemented)

---

## 🔧 Implementation Examples

### Example 1: Update Dashboard Page

```tsx
// Before
const Dashboard = () => {
	const { user, logout } = useAuth();

	return (
		<div className="min-h-screen">
			<header>...</header>
			<main>
				<h1>Dashboard Content</h1>
			</main>
		</div>
	);
};

// After
import { DashboardLayout } from "../../layouts/DashboardLayout";

const Dashboard = () => {
	return (
		<DashboardLayout>
			<div className="mb-6">
				<h1 className="text-2xl font-bold">Dashboard</h1>
				<p className="text-gray-600">Welcome message</p>
			</div>
			{/* Your content */}
		</DashboardLayout>
	);
};
```

### Example 2: Create New Auth Page

```tsx
import { AuthLayout } from "../layouts/AuthLayout";

const ForgotPassword = () => {
	return (
		<AuthLayout
			title="Lupa Password?"
			subtitle="Masukkan email untuk reset password"
		>
			<form className="space-y-6">
				<input type="email" placeholder="Email" />
				<button type="submit">Reset Password</button>
			</form>
		</AuthLayout>
	);
};
```

### Example 3: Create Landing Page

```tsx
import { MainLayout } from "../layouts/MainLayout";

const AboutPage = () => {
	return (
		<MainLayout>
			<section className="py-20">
				<div className="max-w-7xl mx-auto px-4">
					<h1 className="text-4xl font-bold mb-4">Tentang Kami</h1>
					<p>Description here...</p>
				</div>
			</section>
		</MainLayout>
	);
};
```

---

## 🚀 Migration Guide

### Step 1: Import Layout

```tsx
import { DashboardLayout } from "../../layouts/DashboardLayout";
```

### Step 2: Remove Old Layout Code

Remove:

- Header/navbar components
- Sidebar navigation
- Logout button
- User profile display

### Step 3: Wrap Content

```tsx
return <DashboardLayout>{/* Keep only your main content */}</DashboardLayout>;
```

### Step 4: Clean Up

- Remove unused imports (`useAuth` if only for logout)
- Remove manual navigation code
- Remove header/footer components

---

## 📋 Checklist: Pages to Update

### Dashboard Pages:

- [x] `/peserta/Dashboard.tsx` - ✅ Updated
- [ ] `/admin/Dashboard.tsx`
- [ ] `/panitia/Dashboard.tsx`
- [ ] `/juri/Dashboard.tsx`
- [ ] `/pelatih/Dashboard.tsx`
- [ ] `/Dashboard.tsx` (legacy)

### Auth Pages:

- [x] `/Login.tsx` - ✅ Updated
- [x] `/Register.tsx` - ✅ Updated
- [ ] `/ForgotPassword.tsx` (jika ada)

### Public Pages:

- [ ] `/LandingPage.tsx` - Use MainLayout
- [ ] `/About.tsx` (jika ada)
- [ ] `/Contact.tsx` (jika ada)

---

## 🎯 Benefits

1. **Consistency**: Semua halaman punya look & feel yang sama
2. **DRY Principle**: No code duplication untuk navigation/header/footer
3. **Maintainability**: Update layout di satu tempat, berlaku ke semua
4. **Responsive**: Built-in mobile support
5. **Role-based**: Automatic menu adaptation based on user role
6. **Accessibility**: Proper semantic HTML structure

---

## 🔍 Troubleshooting

### Issue: Sidebar tidak muncul

**Solution**: Pastikan component dibungkus dengan `<DashboardLayout>`

### Issue: Menu tidak sesuai role

**Solution**: Check `useAuth()` hook apakah return correct user role

### Issue: Layout terlalu lebar

**Solution**: Content sudah auto max-w-7xl, pastikan tidak ada override width

### Issue: Logout tidak work

**Solution**: Logout sudah built-in di layout, hapus manual logout code

---

## 📚 Related Files

- `/frontend/src/layouts/DashboardLayout.tsx`
- `/frontend/src/layouts/AuthLayout.tsx`
- `/frontend/src/layouts/MainLayout.tsx`
- `/frontend/src/layouts/index.ts`
- `/frontend/src/components/Logo.tsx`
- `/frontend/src/components/DashboardNavbar.tsx` (deprecated, use DashboardLayout)

---

## 🎨 Customization

### Add New Menu Item:

Edit `DashboardLayout.tsx` → `getMenuItems()` function:

```tsx
roleSpecificItems.push({
	name: "New Page",
	icon: NewIcon,
	path: "/role/new-page",
});
```

### Change Footer Content:

Edit `MainLayout.tsx` → footer section

### Modify Navbar Links:

Edit `MainLayout.tsx` → navigation links section

---

**Last Updated**: October 30, 2025  
**Version**: 1.0.0
