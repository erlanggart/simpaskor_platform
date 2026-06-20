# Simpaskor Mobile Apps — Flutter

## Ringkasan Proyek

**Simpaskor Mobile** adalah aplikasi Android & iOS yang dibangun dengan Flutter, terhubung langsung ke backend Simpaskor Platform yang sudah ada (Express.js + PostgreSQL). Aplikasi ini memungkinkan peserta, juri, pelatih, dan panitia untuk mengakses fitur kompetisi Paskibra di genggaman mereka.

---

## Analisis Backend & API

### Base URL
```
Development : http://192.168.x.x:3001/api
Production  : https://api.simpaskor.id/api
```

### Autentikasi
- **Mekanisme:** JWT Bearer Token
- **Durasi Token:** 7 hari
- **Header:** `Authorization: Bearer <token>`
- **Session Tracking:** IP address + device info disimpan di `user_sessions`

### Endpoint Auth (Fase 1 — Login & Register)
| Method | Endpoint | Body | Keterangan |
|--------|----------|------|------------|
| POST | `/auth/register` | `email, password, name, phone?, institution?, recaptchaToken` | Daftar akun baru |
| POST | `/auth/login` | `email, password` | Login |
| POST | `/auth/logout` | — | Logout (hapus session lokal) |
| POST | `/auth/forgot-password` | `email` | Kirim link reset password |
| POST | `/auth/reset-password` | `token, newPassword` | Reset password |
| POST | `/auth/google` | `credential` | Google OAuth |
| PATCH | `/auth/select-role` | `role` | Pilih role setelah register |

### Response Format Login/Register
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Nama User",
    "role": "PESERTA",
    "status": "ACTIVE",
    "phone": "+62...",
    "profile": { "institution": "..." }
  },
  "token": "eyJhbGci..."
}
```

### User Roles
| Role | Deskripsi |
|------|-----------|
| `PESERTA` | Peserta kompetisi |
| `JURI` | Juri / evaluator |
| `PELATIH` | Pelatih tim |
| `PANITIA` | Panitia penyelenggara |
| `MITRA` | Mitra / partner |
| `SUPERADMIN` | Admin platform |

### Catatan Penting
> **reCAPTCHA v3** digunakan di endpoint `/auth/register`. Untuk mobile, gunakan `flutter_recaptcha_v2_compat` atau implementasi Google reCAPTCHA v3 via WebView token. Alternatif: minta backend menambahkan bypass untuk mobile client berdasarkan custom header `X-App-Platform: mobile`.

---

## Tech Stack Flutter

```
Flutter SDK     : >= 3.19.0 (Dart 3.3+)
Target Platform : Android (API 21+) & iOS (13+)
State Management: Riverpod 2.x
Navigation      : GoRouter 12.x
HTTP Client     : Dio 5.x
Storage Lokal   : flutter_secure_storage (token JWT)
                  shared_preferences (preferensi user)
Form Validation : Reactive Forms atau formz
UI Components   : Material 3
Fonts           : Google Fonts (Inter / Poppins)
Icons           : Lucide Icons / Material Icons
Image           : cached_network_image
Notifikasi      : firebase_messaging (FCM)
QR Code         : mobile_scanner (scan QR tiket)
                  qr_flutter (generate QR)
```

### pubspec.yaml Dependencies
```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # State Management
  flutter_riverpod: ^2.5.1
  riverpod_annotation: ^2.3.5
  
  # Navigation
  go_router: ^13.2.0
  
  # HTTP & Networking
  dio: ^5.4.3
  
  # Storage
  flutter_secure_storage: ^9.2.2
  shared_preferences: ^2.2.3
  
  # UI
  google_fonts: ^6.2.1
  cached_network_image: ^3.3.1
  shimmer: ^3.0.0
  
  # Form
  flutter_form_builder: ^9.3.0
  form_builder_validators: ^10.0.1
  
  # QR
  mobile_scanner: ^5.2.3
  qr_flutter: ^4.1.0
  
  # Utilities
  intl: ^0.19.0
  timeago: ^3.7.0
  url_launcher: ^6.3.0
  
  # Auth
  google_sign_in: ^6.2.1
  
dev_dependencies:
  build_runner: ^2.4.11
  riverpod_generator: ^2.4.0
  flutter_lints: ^4.0.0
  custom_lint: ^0.6.4
  riverpod_lint: ^2.3.10
```

---

## Arsitektur Proyek

```
simpaskor_mobile/
├── lib/
│   ├── main.dart
│   ├── app.dart                         # MaterialApp + GoRouter setup
│   │
│   ├── core/
│   │   ├── api/
│   │   │   ├── api_client.dart          # Dio instance + interceptors
│   │   │   ├── api_endpoints.dart       # Semua konstanta endpoint
│   │   │   └── api_response.dart        # Generic response wrapper
│   │   ├── constants/
│   │   │   ├── app_constants.dart
│   │   │   └── storage_keys.dart
│   │   ├── errors/
│   │   │   ├── app_exception.dart
│   │   │   └── error_handler.dart
│   │   ├── router/
│   │   │   ├── app_router.dart          # GoRouter config + guards
│   │   │   └── route_names.dart
│   │   ├── theme/
│   │   │   ├── app_theme.dart
│   │   │   ├── app_colors.dart
│   │   │   └── app_typography.dart
│   │   └── utils/
│   │       ├── validators.dart
│   │       └── extensions.dart
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── data/
│   │   │   │   ├── auth_repository.dart
│   │   │   │   └── auth_local_storage.dart
│   │   │   ├── domain/
│   │   │   │   ├── models/
│   │   │   │   │   ├── user.dart
│   │   │   │   │   └── auth_state.dart
│   │   │   │   └── auth_provider.dart
│   │   │   └── presentation/
│   │   │       ├── login_screen.dart
│   │   │       ├── register_screen.dart
│   │   │       ├── forgot_password_screen.dart
│   │   │       ├── role_selection_screen.dart
│   │   │       └── widgets/
│   │   │           ├── auth_text_field.dart
│   │   │           └── social_login_button.dart
│   │   │
│   │   ├── dashboard/
│   │   │   ├── peserta_dashboard.dart
│   │   │   ├── juri_dashboard.dart
│   │   │   ├── panitia_dashboard.dart
│   │   │   └── pelatih_dashboard.dart
│   │   │
│   │   ├── events/
│   │   │   ├── data/
│   │   │   ├── domain/
│   │   │   └── presentation/
│   │   │       ├── events_list_screen.dart
│   │   │       └── event_detail_screen.dart
│   │   │
│   │   ├── ticketing/
│   │   │   └── presentation/
│   │   │       ├── my_tickets_screen.dart
│   │   │       └── ticket_qr_screen.dart
│   │   │
│   │   ├── voting/
│   │   │   └── presentation/
│   │   │       └── voting_screen.dart
│   │   │
│   │   ├── evaluation/ (Juri)
│   │   │   └── presentation/
│   │   │       ├── evaluation_list_screen.dart
│   │   │       └── scoring_screen.dart
│   │   │
│   │   └── profile/
│   │       └── presentation/
│   │           └── profile_screen.dart
│   │
│   └── shared/
│       ├── widgets/
│       │   ├── app_button.dart
│       │   ├── app_text_field.dart
│       │   ├── loading_indicator.dart
│       │   ├── error_widget.dart
│       │   └── empty_state_widget.dart
│       └── providers/
│           └── shared_providers.dart
│
├── assets/
│   ├── images/
│   │   └── logo.png
│   └── fonts/
│
├── android/
├── ios/
├── pubspec.yaml
└── .env (tidak di-commit — gunakan dart-define atau flutter_dotenv)
```

---

## Fase Implementasi

### Fase 1 — Autentikasi ✅ SELESAI
- [x] Setup project Flutter + dependencies (di `mobile_apps/`)
- [x] Konfigurasi Dio + JWT interceptor (`core/api/api_client.dart`)
- [x] Login screen (`features/auth/presentation/login_screen.dart`)
- [x] Register screen (`features/auth/presentation/register_screen.dart`)
- [x] Forgot password screen (`features/auth/presentation/forgot_password_screen.dart`)
- [x] Persistent login — token di `flutter_secure_storage`
- [x] Auth guard di GoRouter — redirect otomatis
- [x] Dashboard placeholder per role
- [ ] Role selection screen (untuk user PENDING)

### Fase 2 — Fitur Utama (Role-based)
- [ ] Dashboard per role (PESERTA, JURI, PELATIH, PANITIA)
- [ ] Browse & detail event
- [ ] Profil user & edit profil

### Fase 3 — Ticketing & Voting
- [ ] Tampilkan e-ticket dengan QR code (PESERTA)
- [ ] Scan QR tiket (PANITIA)
- [ ] E-voting (Publik)
- [ ] Riwayat pembelian tiket

### Fase 4 — Evaluasi (Juri)
- [ ] Daftar event yang diassign
- [ ] Scoring / penilaian peserta
- [ ] Lihat hasil klasemen

### Fase 5 — Push Notification & Polish
- [ ] FCM push notification
- [ ] Splash screen & onboarding
- [ ] Offline mode (cached data)
- [ ] Dark mode

---

## Screen Flow (Fase 1)

```
SplashScreen
    │
    ├─── [Ada token valid] ──→ DashboardScreen (sesuai role)
    │
    └─── [Tidak ada token] ──→ LandingScreen
                                    │
                               ┌────┴────┐
                               ▼         ▼
                          LoginScreen  RegisterScreen
                               │         │
                               │    [Sukses register]
                               │         │
                               └────┬────┘
                                    ▼
                            [status = PENDING]
                                    │
                               RoleSelectionScreen
                                    │
                               DashboardScreen
```

---

## Detail Implementasi Auth

### Token Management
```dart
// core/api/api_client.dart
// Interceptor otomatis tambah Bearer token ke setiap request
// dan handle 401 → redirect ke login
```

### Register — Catatan reCAPTCHA
Endpoint `/auth/register` membutuhkan `recaptchaToken`. Dua opsi:
1. **Opsi A (Direkomendasikan):** Minta backend menambahkan header khusus `X-Mobile-Client: simpaskor-flutter` sebagai bypass mobile, karena reCAPTCHA v3 tidak native di Flutter.
2. **Opsi B:** Tampilkan reCAPTCHA v2 checkbox via `webview_flutter` sebelum submit.

### Dashboard Routing Berdasarkan Role
```dart
// Setelah login, redirect berdasarkan user.role:
switch (user.role) {
  case 'PESERTA'    → /dashboard/peserta
  case 'JURI'       → /dashboard/juri
  case 'PANITIA'    → /dashboard/panitia
  case 'PELATIH'    → /dashboard/pelatih
  case 'MITRA'      → /dashboard/mitra
  case 'SUPERADMIN' → /dashboard/admin
}
```

---

## Konfigurasi Environment

Gunakan `--dart-define` saat build untuk inject environment variable:
```bash
# Development
flutter run --dart-define=API_URL=http://192.168.x.x:3001/api

# Production
flutter build apk --dart-define=API_URL=https://api.simpaskor.id/api
```

```dart
// core/constants/app_constants.dart
const apiUrl = String.fromEnvironment('API_URL', defaultValue: 'http://192.168.x.x:3001/api');
```

---

## Perubahan Backend yang Dibutuhkan

### 1. CORS untuk Mobile
Mobile app tidak membutuhkan CORS secara teknis (bukan browser), tapi pastikan backend tidak memblock request tanpa Origin header.

### 2. Bypass reCAPTCHA untuk Mobile (Opsional)
Tambahkan logika di middleware `verifyRecaptcha.ts`:
```typescript
// Jika request dari mobile app (header X-Mobile-Client), skip reCAPTCHA
if (req.headers['x-mobile-client'] === 'simpaskor-flutter') {
  return next();
}
```

### 3. User-Agent Parsing untuk Mobile
Backend sudah parse `User-Agent` untuk device tracking. Flutter akan mengirim UA seperti:
```
Dart/3.3 (dart:io) — simpaskor-mobile/1.0.0 (Android 14; Pixel 8)
```

---

## UI/UX Guidelines

### Palet Warna (selaraskan dengan web)
```
Primary     : #2563EB (Blue 600)
Secondary   : #7C3AED (Violet 600)
Success     : #16A34A (Green 600)
Error       : #DC2626 (Red 600)
Warning     : #D97706 (Amber 600)
Background  : #F8FAFC
Surface     : #FFFFFF
```

### Tipografi
- Font: **Inter** (Google Fonts)
- Title: 24px Bold
- Subtitle: 16px SemiBold
- Body: 14px Regular
- Caption: 12px Regular

### Komponen Utama
- Input field dengan border radius 12px
- Button height 52px dengan border radius 12px
- Card dengan shadow ringan (elevation 2)
- Bottom navigation bar (max 5 item)

---

## Struktur Navigasi Utama

```
AppShell (setelah login)
├── Home / Dashboard
├── Events (Browse event)
├── Tiket Saya (PESERTA) / Tugas Saya (JURI/PANITIA)
├── Notifikasi
└── Profil
```

---

## Keamanan

- JWT token disimpan di `flutter_secure_storage` (Keychain iOS / Keystore Android)
- Tidak pernah simpan token di `SharedPreferences` biasa
- Implement certificate pinning untuk production
- Obfuscate release build: `flutter build apk --obfuscate --split-debug-info=.symbols`
- Validasi semua input sebelum dikirim ke API

---

## Langkah Setup Project

```bash
# 1. Buat project Flutter baru
flutter create simpaskor_mobile --org id.simpaskor --platforms android,ios

# 2. Masuk ke direktori
cd simpaskor_mobile

# 3. Install dependencies (setelah edit pubspec.yaml)
flutter pub get

# 4. Generate code Riverpod
dart run build_runner build --delete-conflicting-outputs

# 5. Jalankan di emulator/device
flutter run --dart-define=API_URL=http://192.168.x.x:3001/api
```

---

## Status Implementasi

| Fase | Status | Keterangan |
|------|--------|------------|
| Project Setup | ✅ Selesai | `mobile_apps/` di dalam simpaskor_platform |
| Login Screen | ✅ Selesai | Form validasi + error handling |
| Register Screen | ✅ Selesai | Nama, email, password, HP, instansi, terms |
| Forgot Password | ✅ Selesai | Kirim email + success state |
| Auth Provider (Riverpod) | ✅ Selesai | JWT, secure storage, session restore |
| GoRouter + Auth Guard | ✅ Selesai | Redirect otomatis berdasarkan auth status |
| Dashboard (per role) | ✅ Selesai | Menu grid dinamis sesuai role |
| Events Browser | Belum dimulai | — |
| E-Ticketing | Belum dimulai | — |
| E-Voting | Belum dimulai | — |
| Juri Evaluation | Belum dimulai | — |
| Push Notification | Belum dimulai | — |

---

*Dokumen ini akan diperbarui seiring perkembangan implementasi.*
