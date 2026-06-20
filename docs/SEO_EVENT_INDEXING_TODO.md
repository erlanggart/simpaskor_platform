# SEO Event Indexing TODO

Tujuan: halaman event Simpaskor dapat ditemukan, dirayapi, dan dipahami Google Search dengan lebih baik.

## Sudah dikerjakan

- [x] Tambah komponen SEO reusable untuk title, meta description, canonical, Open Graph, Twitter card, robots meta, dan JSON-LD.
- [x] Tambah SEO untuk halaman `/events` sebagai `CollectionPage` + `ItemList`.
- [x] Tambah SEO untuk halaman `/events/:slug` sebagai `Event` structured data.
- [x] Tambah `noindex` untuk state event detail yang tidak ditemukan.
- [x] Tambah `robots.txt` publik.
- [x] Tambah backend route `/sitemap.xml` dinamis dari database event public.
- [x] Tambah backend route `/robots.txt`.
- [x] Tambah Vite deploy proxy untuk `/sitemap.xml`.
- [x] Tambah Vite deploy proxy untuk `/robots.txt` (**bug fix**).
- [x] Set canonical default ke `https://simpaskor.id`.
- [x] **Bug fix**: Twitter card meta tags diubah dari `property` ke `name` (sesuai spesifikasi Twitter).
- [x] **Bug fix**: `og:image` di `index.html` diubah ke absolute URL `https://simpaskor.id/simpaskor.png`.
- [x] Tambah `og:site_name` ("Simpaskor") dan `og:locale` ("id_ID") ke SEO component dan `index.html`.
- [x] Tambah `og:image:width` dan `og:image:height` di `index.html`.
- [x] Tambah `WebSite` + `Organization` JSON-LD di `LandingPage` (termasuk `SearchAction` untuk Sitelinks Search).
- [x] Tambah SEO + `CollectionPage` + `ItemList` JSON-LD di halaman `/e-ticketing`.
- [x] Tambah SEO + `CollectionPage` + `ItemList` JSON-LD di halaman `/e-voting` (list view).
- [x] Tambah SEO + `Event` JSON-LD di halaman voting detail (arena view) saat event dipilih.
- [x] Sitemap diperbarui: event dengan ticketing/voting diberi prioritas `0.85` dan `changefreq: daily`.

## Setelah deploy production

- [ ] Set `PUBLIC_SITE_URL="https://simpaskor.id"` di backend production.
- [ ] Set `VITE_SITE_URL="https://simpaskor.id"` dan `VITE_OG_URL="https://simpaskor.id"` di frontend production.
- [ ] Pastikan `https://simpaskor.id/robots.txt` dapat diakses dan berisi sitemap.
- [ ] Pastikan `https://simpaskor.id/sitemap.xml` dapat diakses dan berisi URL event + e-ticketing + e-voting.
- [ ] Daftarkan/verifikasi domain `simpaskor.id` di Google Search Console.
- [ ] Submit `https://simpaskor.id/sitemap.xml` di Google Search Console.
- [ ] Gunakan URL Inspection untuk beberapa URL event prioritas, lalu request indexing.
- [ ] Test beberapa halaman event di Google Rich Results Test untuk validasi schema `Event`.
- [ ] Test halaman `/e-ticketing` dan `/e-voting` di Rich Results Test untuk validasi `ItemList`.
- [ ] Test homepage di Rich Results Test untuk validasi `WebSite` + `Organization` schema.

## Optimasi lanjutan

- [ ] **KRITIS**: Pertimbangkan prerender/SSR untuk halaman event agar title, deskripsi, dan JSON-LD tersedia di HTML awal, bukan hanya setelah JavaScript render. Saat ini semua SEO diset via `useEffect` (CSR), sehingga Googlebot perlu render JS dulu — proses ini bisa tertunda 1–7 hari dan crawler lain (Bing, dll) sering tidak mengeksekusi JS sama sekali.
- [ ] Untuk `/e-ticketing` dan `/e-voting`: tambah URL unik per event (misalnya `/e-ticketing/:slug`) agar setiap event dapat diindex sebagai halaman tersendiri, bukan hanya sebagai modal/state.
- [ ] Buat pagination event yang punya URL crawlable jika jumlah event makin besar.
- [ ] Tambah konten unik di detail event: ringkasan event, lokasi lengkap, kategori lomba, organizer, dan FAQ singkat.
- [ ] Pastikan setiap event published memiliki slug, poster crawlable, lokasi, tanggal mulai, tanggal selesai, dan deskripsi yang cukup jelas.
- [ ] Tambah `BreadcrumbList` structured data di halaman event detail.
