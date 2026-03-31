import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function seedGuides() {
	console.log("Seeding guides...");

	// Clear existing guides
	await prisma.guideSlide.deleteMany({});
	await prisma.guide.deleteMany({});

	const panduanPanitia = [
		{
			title: "Membuat Event",
			description: "Panduan langkah demi langkah untuk membuat event baru di Simpaskor.",
			icon: "LuCalendarPlus",
			order: 0,
			slides: [
				{
					order: 0,
					title: "Buka Halaman Dashboard",
					description:
						'Setelah login sebagai Panitia, Anda akan diarahkan ke Dashboard Panitia. Di halaman ini terdapat ringkasan event, statistik, dan tombol aksi.\n\nKlik tombol "Buat Event Baru" yang berwarna merah di bagian atas, atau klik menu "Event Saya" di sidebar untuk melihat daftar event lalu klik tombol tambah.',
				},
				{
					order: 1,
					title: "Isi Informasi Dasar Event",
					description:
						'Pada halaman Create Event Wizard, Anda akan diminta mengisi informasi dasar event:\n\n• Nama Event — Judul event yang akan ditampilkan ke publik\n• Deskripsi — Penjelasan singkat tentang event\n• Tanggal Mulai — Kapan event dimulai\n• Tanggal Selesai — Kapan event berakhir\n• Batas Pendaftaran — Deadline terakhir peserta bisa mendaftar\n\nPastikan tanggal batas pendaftaran sebelum tanggal mulai event.',
				},
				{
					order: 2,
					title: "Upload Poster Event",
					description:
						"Upload poster/banner event untuk ditampilkan di halaman utama dan detail event.\n\n• Format yang didukung: JPG, PNG, WebP\n• Ukuran yang disarankan: 1080 × 1350 px (rasio 4:5)\n• Ukuran file maksimal: 5MB\n\nPoster yang menarik akan meningkatkan minat peserta untuk mendaftar. Pastikan poster memuat informasi penting seperti nama event, tanggal, dan kontak.",
				},
				{
					order: 3,
					title: "Atur Biaya & Kapasitas",
					description:
						"Pada step ini, tentukan pengaturan pendaftaran event:\n\n• Biaya Pendaftaran — Masukkan nominal biaya (Rp). Set ke 0 untuk event gratis\n• Maksimal Peserta — Jumlah peserta yang bisa mendaftar. Kosongkan jika tidak ada batasan\n• Kategori Sekolah — Aktifkan jika ingin membatasi kuota per kategori sekolah (SMP, SMA, dll)\n• Limit per Kategori — Tentukan berapa kuota untuk setiap kategori\n\nUntuk event berbayar, peserta harus upload bukti pembayaran saat mendaftar.",
				},
				{
					order: 4,
					title: "Upload Juknis (Opsional)",
					description:
						"Anda bisa mengupload dokumen Juknis (Petunjuk Teknis) dalam format PDF.\n\n• Format: PDF\n• Ukuran maksimal: 10MB\n\nJuknis akan tersedia untuk diunduh oleh peserta yang sudah terdaftar. Dokumen ini biasanya berisi peraturan lomba, kriteria penilaian, dan informasi teknis lainnya.",
				},
				{
					order: 5,
					title: "Tambahkan Contact Person",
					description:
						"Isi informasi kontak yang bisa dihubungi peserta:\n\n• Nama Contact Person\n• Nomor WhatsApp\n• Email (opsional)\n\nInformasi kontak ini akan ditampilkan di halaman detail event agar peserta bisa bertanya tentang event.",
				},
				{
					order: 6,
					title: "Review & Simpan Event",
					description:
						'Sebelum menyimpan, review kembali semua informasi yang telah diisi:\n\n• Pastikan nama event sudah benar\n• Pastikan tanggal dan batas pendaftaran sudah sesuai\n• Pastikan poster sudah terupload\n• Pastikan biaya dan kapasitas sudah tepat\n\nKlik "Simpan sebagai Draft" untuk menyimpan dulu, atau "Publish" untuk langsung mempublikasikan event. Event yang di-publish akan langsung tampil di halaman utama Simpaskor.',
				},
			],
		},
		{
			title: "Mengelola Event",
			description: "Cara mengelola dan mengedit event yang sudah dibuat.",
			icon: "LuSettings",
			order: 1,
			slides: [
				{
					order: 0,
					title: "Buka Daftar Event",
					description:
						'Dari Dashboard Panitia, klik "Event Saya" untuk melihat semua event yang telah Anda buat.\n\nDaftar event menampilkan:\n• Judul event\n• Status (Draft / Published / Ongoing / Completed)\n• Tanggal pelaksanaan\n• Jumlah peserta terdaftar\n\nEvent diurutkan dari yang terbaru.',
				},
				{
					order: 1,
					title: "Masuk ke Halaman Manage Event",
					description:
						'Klik event yang ingin dikelola untuk masuk ke halaman manajemen.\n\nDi halaman ini Anda bisa:\n• Melihat dan mengubah detail event\n• Melihat statistik (peserta, juri, penilaian)\n• Mengakses semua fitur via sidebar kiri\n\nPastikan Anda berada di event yang benar dengan melihat nama event di header.',
				},
				{
					order: 2,
					title: "Edit Informasi Event",
					description:
						'Untuk mengedit event, klik tombol "Edit" pada halaman manage event.\n\nAnda bisa mengubah:\n• Judul dan deskripsi\n• Tanggal pelaksanaan dan batas pendaftaran\n• Poster event\n• Biaya dan kapasitas\n• Juknis dan contact person\n\nPerubahan akan langsung berlaku setelah disimpan.',
				},
				{
					order: 3,
					title: "Ubah Status Event",
					description:
						"Event memiliki beberapa status yang bisa diubah sesuai alur:\n\nDRAFT → PUBLISHED → ONGOING → COMPLETED\n\n• DRAFT — Event belum dipublish, tidak terlihat publik\n• PUBLISHED — Event terlihat di halaman utama, pendaftaran dibuka\n• ONGOING — Event sedang berlangsung, pendaftaran ditutup\n• COMPLETED — Event selesai, hasil bisa dipublish\n• CANCELLED — Event dibatalkan\n\nGunakan tombol status di halaman manage event.",
				},
				{
					order: 4,
					title: "Pantau Statistik Event",
					description:
						"Di halaman manage event, Anda bisa melihat ringkasan:\n\n• Total peserta terdaftar vs kapasitas\n• Peserta terverifikasi vs belum\n• Jumlah juri yang ditugaskan\n• Progres penilaian\n• Materi yang sudah dibuat\n\nGunakan informasi ini untuk memantau kesiapan event.",
				},
			],
		},
		{
			title: "Mengelola Peserta",
			description: "Panduan mengelola pendaftaran dan data peserta event.",
			icon: "LuUsers",
			order: 2,
			slides: [
				{
					order: 0,
					title: "Buka Menu Peserta",
					description:
						'Dari sidebar halaman manajemen event, klik menu "Peserta".\n\nHalaman ini menampilkan tabel daftar semua peserta yang telah mendaftar ke event Anda beserta informasi:\n• Nama peserta\n• Asal sekolah\n• Status verifikasi\n• Nomor urut tampil',
				},
				{
					order: 1,
					title: "Verifikasi Pendaftaran",
					description:
						'Untuk event berbayar, peserta harus upload bukti pembayaran saat mendaftar.\n\nCara verifikasi:\n1. Periksa bukti pembayaran yang diupload peserta\n2. Pastikan nominal dan data transfer sesuai\n3. Klik tombol "Verifikasi" pada baris peserta\n4. Status akan berubah menjadi "Terverifikasi"\n\nUntuk event gratis, peserta otomatis terverifikasi setelah mendaftar.',
				},
				{
					order: 2,
					title: "Kelola Nomor Urut Tampil",
					description:
						"Setelah peserta terverifikasi, sistem akan otomatis memberikan nomor urut tampil.\n\nAnda bisa:\n• Melihat nomor urut setiap peserta\n• Mengacak ulang nomor urut (shuffle)\n• Mengatur ulang nomor urut secara manual\n\nNomor urut menentukan siapa yang tampil duluan saat event berlangsung.",
				},
				{
					order: 3,
					title: "Filter & Cari Peserta",
					description:
						"Gunakan fitur pencarian dan filter untuk mengelola peserta:\n\n• Cari berdasarkan nama atau sekolah\n• Filter berdasarkan status verifikasi\n• Filter berdasarkan kategori sekolah\n\nFitur ini berguna saat jumlah peserta banyak.",
				},
				{
					order: 4,
					title: "Tolak atau Hapus Peserta",
					description:
						"Jika diperlukan, Anda bisa menolak atau menghapus pendaftaran peserta.\n\nKlik tombol aksi pada baris peserta lalu pilih:\n• Tolak — Menolak pendaftaran (peserta bisa mendaftar ulang)\n• Hapus — Menghapus data pendaftaran permanen\n\nPastikan berkomunikasi dengan peserta sebelum menolak pendaftaran.",
				},
			],
		},
		{
			title: "Mengelola Juri",
			description: "Cara menambahkan dan mengelola juri pada event.",
			icon: "LuScale",
			order: 3,
			slides: [
				{
					order: 0,
					title: "Buka Menu Juri",
					description:
						'Dari sidebar manajemen event, klik "Juri" untuk membuka halaman pengelolaan juri.\n\nDi sini Anda bisa melihat daftar juri yang sudah ditugaskan beserta:\n• Nama juri\n• Email\n• Progres penilaian (berapa peserta sudah dinilai)',
				},
				{
					order: 1,
					title: "Tambah Juri ke Event",
					description:
						'Klik tombol "Tambah Juri" lalu masukkan email juri yang ingin ditugaskan.\n\n• Juri harus sudah memiliki akun Simpaskor dengan role "Juri"\n• Satu juri bisa ditugaskan ke beberapa event\n• Juri akan menerima notifikasi penugasan\n\nJika email belum terdaftar, minta juri untuk mendaftar terlebih dahulu.',
				},
				{
					order: 2,
					title: "Pantau Progres Penilaian Juri",
					description:
						"Anda bisa memantau progres penilaian setiap juri:\n\n• Berapa peserta yang sudah dinilai\n• Berapa yang belum dinilai\n• Progress bar visual\n\nPastikan semua juri menyelesaikan penilaian sebelum event dinyatakan selesai.",
				},
				{
					order: 3,
					title: "Hapus Juri dari Event",
					description:
						"Jika diperlukan, Anda bisa menghapus juri dari event.\n\n⚠️ Penting: Menghapus juri akan menghapus semua penilaian yang sudah diinput oleh juri tersebut.\n\nPastikan Anda yakin sebelum menghapus juri yang sudah memulai penilaian.",
				},
			],
		},
		{
			title: "Mengelola Materi Penilaian",
			description: "Panduan mengatur materi dan aspek penilaian.",
			icon: "LuFileText",
			order: 4,
			slides: [
				{
					order: 0,
					title: "Buka Menu Materi",
					description:
						'Dari sidebar manajemen event, klik "Materi" untuk mengelola materi penilaian.\n\nMateri penilaian adalah kategori besar yang dinilai dalam lomba (contoh: PBB, Danton, Formasi).\n\nSetiap materi berisi aspek-aspek detail yang akan dinilai oleh juri.',
				},
				{
					order: 1,
					title: "Tambah Materi Baru",
					description:
						'Klik "Tambah Materi" lalu isi:\n\n• Nama Materi — contoh: "PBB Inti", "Danton", "Variasi Formasi"\n• Deskripsi (opsional) — penjelasan materi ini\n• Bobot — persentase bobot materi terhadap total nilai\n\nPastikan total bobot semua materi = 100%.',
				},
				{
					order: 2,
					title: "Tambah Aspek Penilaian",
					description:
						'Di dalam setiap materi, tambahkan aspek-aspek yang dinilai:\n\nKlik "Tambah Aspek" pada materi, lalu isi:\n• Nama Aspek — contoh: "Ketegasan Aba-aba", "Keseragaman Gerakan"\n• Skor Maksimal — nilai maksimum yang bisa diberikan juri\n\nContoh: Materi "PBB Inti" bisa memiliki aspek "Sikap Sempurna" (max 10), "Hadap Kanan/Kiri" (max 10), dll.',
				},
				{
					order: 3,
					title: "Atur Urutan Materi",
					description:
						"Atur urutan materi sesuai dengan alur perlombaan.\n\nUrutan ini menentukan bagaimana materi ditampilkan ke juri saat penilaian. Gunakan drag & drop atau tombol panah untuk mengubah urutan.\n\nTips: Urutkan sesuai kronologi pelaksanaan lomba agar juri mudah mengikuti.",
				},
				{
					order: 4,
					title: "Finalisasi Materi Sebelum Event",
					description:
						"⚠️ Penting: Pastikan semua materi dan aspek sudah final sebelum event dimulai dan juri mulai menilai.\n\nPerubahan materi setelah penilaian dimulai:\n• Menambah aspek baru — boleh, tapi nilai kosong untuk peserta yang sudah dinilai\n• Menghapus aspek — akan menghapus semua nilai aspek tersebut\n• Mengubah skor maksimal — bisa menyebabkan inkonsistensi\n\nSebaiknya finalisasi materi saat status event masih DRAFT atau PUBLISHED.",
				},
			],
		},
		{
			title: "Mengelola Rekap Nilai",
			description: "Cara melihat dan mengelola rekapitulasi nilai peserta.",
			icon: "LuChartBar",
			order: 5,
			slides: [
				{
					order: 0,
					title: "Buka Menu Rekapitulasi",
					description:
						'Dari sidebar manajemen event, klik "Rekapitulasi" atau "Rekap".\n\nHalaman ini menampilkan rangkuman lengkap nilai semua peserta dari semua juri dan semua materi penilaian dalam tampilan tabel.',
				},
				{
					order: 1,
					title: "Membaca Tabel Rekapitulasi",
					description:
						"Tabel rekap menampilkan:\n\n• Kolom: Nama Peserta, Nilai per Materi per Juri, Total Nilai, Rata-rata\n• Baris: Setiap peserta dengan nomor urut\n• Peringkat: Disortir otomatis dari nilai tertinggi\n\nAnda bisa scroll horizontal jika kolom terlalu banyak. Gunakan fitur filter untuk melihat data spesifik.",
				},
				{
					order: 2,
					title: "Filter & Sortir Data",
					description:
						"Gunakan filter yang tersedia:\n\n• Filter per Materi — Lihat nilai untuk materi tertentu saja\n• Filter per Juri — Lihat penilaian dari juri tertentu\n• Sortir — Berdasarkan total nilai, nama, atau nomor urut\n\nFilter berguna untuk menganalisis konsistensi penilaian antar juri.",
				},
				{
					order: 3,
					title: "Export Rekap ke PDF",
					description:
						'Klik tombol "Export PDF" untuk mengunduh rekapitulasi:\n\n• Dokumen PDF mencakup:\n  - Header event (nama, tanggal, panitia)\n  - Tabel nilai lengkap semua peserta\n  - Detail per aspek penilaian\n  - Tanda tangan panitia\n\nPDF ini bisa dicetak untuk keperluan administrasi dan pengumuman.',
				},
				{
					order: 4,
					title: "Verifikasi & Cek Kelengkapan Nilai",
					description:
						"Sebelum mengumumkan hasil, pastikan:\n\n• Semua juri sudah menyelesaikan penilaian (cek di menu Juri)\n• Tidak ada nilai yang kosong atau anomali\n• Total bobot materi sudah sesuai 100%\n\nJika ada nilai yang janggal, komunikasikan dengan juri terkait untuk klarifikasi sebelum memfinalisasi hasil.",
				},
			],
		},
		{
			title: "Mengelola Menu Perform",
			description: "Cara menggunakan fitur Perform untuk mengatur tampilan peserta saat perlombaan.",
			icon: "LuPlay",
			order: 6,
			slides: [
				{
					order: 0,
					title: "Buka Menu Performance",
					description:
						'Dari sidebar manajemen event, klik "Perform" atau "Performance History".\n\nFitur ini digunakan saat event berlangsung untuk:\n• Menandai peserta yang sedang tampil\n• Mengontrol urutan tampil\n• Mencatat riwayat perform',
				},
				{
					order: 1,
					title: "Mulai Sesi Perform",
					description:
						'Ketika event dimulai (status ONGOING):\n\n1. Buka halaman Performance\n2. Klik "Mulai" pada peserta pertama sesuai nomor urut\n3. Peserta akan ditandai "Sedang Tampil"\n4. Juri bisa mulai menilai peserta tersebut\n\nTampilan status perform terlihat oleh semua juri secara real-time.',
				},
				{
					order: 2,
					title: "Navigasi Urutan Tampil",
					description:
						"Gunakan tombol navigasi untuk berpindah ke peserta berikutnya:\n\n• Tombol Next → Pindah ke peserta berikutnya\n• Tombol Previous ← Kembali ke peserta sebelumnya\n• Tombol Skip → Lewati peserta (jika berhalangan)\n\nSistem akan otomatis memperbarui status di sisi juri.",
				},
				{
					order: 3,
					title: "Field Rechecking",
					description:
						'Gunakan fitur "Field Rechecking" untuk memastikan lapangan/area siap:\n\n• Cek kesiapan area perlombaan\n• Tandai item checklist yang sudah siap\n• Catat catatan khusus jika ada\n\nFitur ini memastikan setiap peserta mendapat kondisi lapangan yang setara.',
				},
				{
					order: 4,
					title: "Lihat Riwayat Perform",
					description:
						"Semua sesi perform tercatat otomatis:\n\n• Waktu mulai dan selesai setiap peserta\n• Durasi perform\n• Status (selesai / dilewati)\n\nRiwayat ini berguna untuk dokumentasi dan evaluasi pelaksanaan event.",
				},
			],
		},
		{
			title: "Mengelola Kategori Juara",
			description: "Panduan mengatur kategori juara dan pengumuman pemenang.",
			icon: "LuTrophy",
			order: 7,
			slides: [
				{
					order: 0,
					title: "Buka Menu Juara",
					description:
						'Dari sidebar manajemen event, klik "Juara" untuk mengelola kategori juara.\n\nDi halaman ini Anda bisa membuat berbagai kategori juara dan menentukan pemenangnya berdasarkan rekapitulasi nilai.',
				},
				{
					order: 1,
					title: "Tambah Kategori Juara",
					description:
						'Klik "Tambah Kategori" lalu isi:\n\n• Nama Kategori — contoh: "Juara Umum", "Best Danton", "Best PBB", "Juara Favorit"\n• Deskripsi (opsional)\n• Jumlah Juara — berapa pemenang per kategori (misal: Juara 1, 2, 3)\n\nAnda bisa membuat kategori sebanyak yang diperlukan.',
				},
				{
					order: 2,
					title: "Tentukan Pemenang",
					description:
						"Untuk setiap kategori, pilih peserta pemenang:\n\n• Sistem menampilkan daftar peserta beserta total nilainya\n• Pilih peserta untuk setiap peringkat (Juara 1, 2, 3)\n• Bisa berdasarkan total nilai otomatis atau pilihan manual\n\nUntuk kategori seperti \"Juara Umum\", biasanya dipilih berdasarkan total nilai tertinggi dari rekap.",
				},
				{
					order: 3,
					title: "Review Hasil Juara",
					description:
						"Sebelum mempublish, review kembali semua kategori:\n\n• Pastikan setiap kategori sudah ada pemenangnya\n• Pastikan tidak ada peserta yang menang di kategori yang saling eksklusif (kecuali diperbolehkan)\n• Cross-check dengan rekapitulasi nilai\n\nAnda bisa mengubah pemenang kapan saja sebelum dipublish.",
				},
				{
					order: 4,
					title: "Publish Hasil Juara",
					description:
						'Setelah semua kategori juara terisi dan diverifikasi:\n\n1. Ubah status event ke "COMPLETED"\n2. Hasil juara akan terlihat di halaman detail event\n3. Peserta dan publik bisa melihat pemenang\n\nSelamat! Event Anda telah selesai dilaksanakan. 🎉',
				},
			],
		},
	];

	for (const guide of panduanPanitia) {
		const created = await prisma.guide.create({
			data: {
				role: "PANITIA",
				title: guide.title,
				description: guide.description,
				icon: guide.icon,
				order: guide.order,
				isPublished: true,
				slides: {
					create: guide.slides.map((s) => ({
						order: s.order,
						title: s.title,
						description: s.description,
						imageUrl: null,
					})),
				},
			},
		});
		console.log(`  ✓ Created guide: ${created.title} (${guide.slides.length} slides)`);
	}

	console.log(`\nDone! Created ${panduanPanitia.length} guides.`);
}

seedGuides()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
