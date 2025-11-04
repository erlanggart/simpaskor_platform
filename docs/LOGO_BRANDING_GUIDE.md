# 🎨 Logo & Branding Guide - Simpaskor Platform

## 📁 Struktur Folder Public

```
frontend/public/
├── logo.svg                 # Logo utama (SVG - scalable)
├── logo.png                 # Logo PNG untuk compatibility
├── logo-white.png           # Logo untuk dark background
├── favicon.ico              # Browser tab icon
├── apple-touch-icon.png     # iOS home screen icon
├── icon-192.png             # PWA icon (192x192)
├── icon-512.png             # PWA icon (512x512)
├── og-image.jpg             # Social media preview image
├── manifest.json            # PWA manifest file
├── robots.txt               # SEO robots file
└── README.md               # Documentation
```

## 🖼️ Logo Component Usage

### Import Logo Component

```tsx
import { Logo, LogoWhite } from "../components/Logo";
```

### Basic Usage

```tsx
// Simple logo (default size: medium)
<Logo />

// Logo with text
<Logo showText />

// Different sizes
<Logo size="sm" />   // Small (32px)
<Logo size="md" />   // Medium (48px) - default
<Logo size="lg" />   // Large (64px)
<Logo size="xl" />   // Extra Large (96px)

// Non-clickable logo (for footer, etc)
<Logo clickable={false} showText />

// White variant for dark backgrounds
<LogoWhite showText />
```

### Real-world Examples

#### Navigation Header

```tsx
function Header() {
	return (
		<nav className="bg-white shadow">
			<div className="container mx-auto px-4">
				<Logo showText size="md" />
			</div>
		</nav>
	);
}
```

#### Footer

```tsx
function Footer() {
	return (
		<footer className="bg-gray-900 text-white">
			<LogoWhite showText clickable={false} />
		</footer>
	);
}
```

#### Authentication Pages

```tsx
function LoginPage() {
	return (
		<div className="min-h-screen flex items-center justify-center">
			<div className="text-center">
				<Logo size="xl" showText />
				<h2>Welcome Back</h2>
				{/* ... form ... */}
			</div>
		</div>
	);
}
```

## 🎨 Menambahkan Logo Anda Sendiri

### 1. Siapkan File Logo

**Format yang direkomendasikan:**

#### SVG (Terbaik untuk web)

- ✅ Scalable tanpa kehilangan kualitas
- ✅ File size kecil
- ✅ Mudah diubah warnanya
- 📏 Optimal: Vector format
- 🎯 Use case: Logo utama di web

#### PNG (Untuk compatibility)

- 📏 Recommended size: 512x512px atau 1024x1024px
- 🎨 Background: Transparent
- 📦 File size: < 100KB (gunakan [TinyPNG](https://tinypng.com/))
- 🎯 Use case: Fallback, social sharing

### 2. Optimasi Logo

```bash
# Optimasi PNG dengan TinyPNG CLI
npm install -g tinypng-cli
tinypng logo.png --key YOUR_API_KEY

# Atau gunakan ImageOptim (Mac)
# Atau Squoosh (Web): https://squoosh.app/
```

### 3. Copy Logo ke Folder Public

```bash
# Copy logo Anda
cp /path/to/your/logo.svg frontend/public/logo.svg
cp /path/to/your/logo.png frontend/public/logo.png
cp /path/to/your/logo-white.png frontend/public/logo-white.png
```

### 4. Generate Favicons

Gunakan [Favicon Generator](https://realfavicongenerator.net/):

1. Upload logo Anda
2. Download generated icons
3. Copy ke `frontend/public/`

File yang dibutuhkan:

- `favicon.ico` (16x16, 32x32, 48x48)
- `apple-touch-icon.png` (180x180)
- `icon-192.png` (192x192)
- `icon-512.png` (512x512)

### 5. Update index.html

File `frontend/index.html` sudah configured untuk semua icons:

```html
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

## 🎨 Logo Design Guidelines

### Logo Requirements

1. **Format**

   - Primary: SVG (vector)
   - Secondary: PNG with transparent background
   - Size: Minimum 512x512px

2. **Colors**

   - Primary: `#2563eb` (Blue-600)
   - Secondary: `#fbbf24` (Yellow-400)
   - Text: `#111827` (Gray-900)
   - White: `#ffffff`

3. **Clear Space**

   - Minimum clear space: 20% of logo height
   - Don't place other elements too close

4. **Minimum Size**
   - Web: 32px height minimum
   - Print: 1 inch minimum

### Logo Variants

1. **Full Logo** (logo.svg)

   - Logo mark + text
   - Use for: Headers, landing page

2. **Logo Mark Only** (logo-icon.svg)

   - Just the icon/symbol
   - Use for: Favicon, app icons

3. **White Version** (logo-white.png)
   - For dark backgrounds
   - Use for: Dark mode, footer

## 📱 Social Media & SEO

### Open Graph Image

Create an OG image for social sharing:

```bash
# Dimensions: 1200x630px
# File: frontend/public/og-image.jpg
# Content: Logo + tagline + brand colors
```

Update in `index.html`:

```html
<meta property="og:image" content="/og-image.jpg" />
```

### PWA Manifest

File `manifest.json` sudah configured:

```json
{
	"name": "Simpaskor Platform",
	"short_name": "Simpaskor",
	"icons": [
		{
			"src": "/icon-192.png",
			"sizes": "192x192",
			"type": "image/png"
		},
		{
			"src": "/icon-512.png",
			"sizes": "512x512",
			"type": "image/png"
		}
	]
}
```

## 🛠️ Tools & Resources

### Design Tools

- **Figma** - Logo design & branding
- **Canva** - Quick logo creation
- **Adobe Illustrator** - Professional vector design

### Optimization Tools

- [TinyPNG](https://tinypng.com/) - Compress PNG
- [SVGOMG](https://jakearchibald.github.io/svgomg/) - Optimize SVG
- [Squoosh](https://squoosh.app/) - Image compression

### Icon Generators

- [Favicon.io](https://favicon.io/) - Generate favicons
- [RealFaviconGenerator](https://realfavicongenerator.net/) - Complete favicon package
- [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator) - PWA icons

### Free Logo Resources

- [Logoipsum](https://logoipsum.com/) - Placeholder logos
- [LogoMakr](https://logomakr.com/) - Simple logo maker
- [Hatchful](https://hatchful.shopify.com/) - Shopify logo generator

## ✅ Checklist

Sebelum production, pastikan:

- [ ] Logo SVG sudah ada
- [ ] Logo PNG dengan transparent background
- [ ] Favicon.ico generated (multiple sizes)
- [ ] Apple touch icon (180x180)
- [ ] PWA icons (192x192, 512x512)
- [ ] OG image untuk social sharing (1200x630)
- [ ] Logo optimized (< 100KB)
- [ ] Logo terlihat bagus di light & dark background
- [ ] Logo responsive di berbagai ukuran layar
- [ ] manifest.json updated dengan icons
- [ ] robots.txt configured

## 🎯 Quick Start

Untuk segera mulai, Anda bisa:

1. **Gunakan placeholder** yang sudah ada (`logo.svg`)
2. **Generate logo** dengan tools gratis
3. **Hire designer** di Fiverr/Upwork
4. **Gunakan AI** seperti Midjourney/DALL-E untuk ide

Setelah punya logo final, cukup replace file-file di folder `public/`!

## 📞 Need Help?

Jika butuh bantuan dengan logo atau branding:

- 📧 Email: design@simpaskor.com
- 💬 Discord: Simpaskor Community
- 📚 Docs: https://docs.simpaskor.com/branding

---

**Happy Branding! 🎨**
