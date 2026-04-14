import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type GuideSeedInput = {
	title: string;
	description: string;
	icon: string;
	order: number;
	slides: Array<{
		order: number;
		title: string;
		description: string;
	}>;
};

const panitiaGuides: GuideSeedInput[] = [
	{
		title: "Membuat Event",
		description: "Panduan membuat event baru sampai siap dipublikasikan.",
		icon: "LuCalendarPlus",
		order: 0,
		slides: [
			{
				order: 0,
				title: "Buka menu Event Saya",
				description:
					'Masuk ke menu "Event Saya" dari dashboard panitia, lalu klik tombol "Buat Event Baru". Sistem akan membuka wizard pembuatan event agar data diisi berurutan.',
			},
			{
				order: 1,
				title: "Isi informasi dasar event",
				description:
					"Lengkapi judul event, deskripsi, tanggal mulai, tanggal selesai, provinsi, kota, venue, dan batas pendaftaran. Pastikan deadline pendaftaran berada sebelum hari pelaksanaan.",
			},
			{
				order: 2,
				title: "Pilih kategori penilaian dan kuota",
				description:
					"Di langkah kategori, pilih kategori penilaian yang dipakai event lalu atur kuota per kategori sekolah bila diperlukan. Langkah ini menentukan struktur penilaian dan pembatas peserta sejak awal.",
			},
			{
				order: 3,
				title: "Upload media dan atur biaya",
				description:
					"Tambahkan poster event, file juknis bila ada, biaya pendaftaran, nama organizer, dan kontak panitia. Informasi ini akan tampil pada halaman detail event untuk peserta.",
			},
			{
				order: 4,
				title: "Selesaikan pembayaran dan publish",
				description:
					"Pilih paket event, selesaikan pembayaran jika diwajibkan, lalu review semua data. Setelah lengkap, simpan sebagai draft atau publish agar event tampil ke publik.",
			},
		],
	},
	{
		title: "Mengelola Peserta",
		description: "Panduan verifikasi, filter, dan tindak lanjut data peserta.",
		icon: "LuUsers",
		order: 1,
		slides: [
			{
				order: 0,
				title: "Buka halaman Manajemen Peserta",
				description:
					'Pilih event yang sedang dikelola, lalu buka menu "Peserta" di sidebar event. Halaman ini menampilkan daftar pendaftar, status verifikasi, data sekolah, dan informasi tim.',
			},
			{
				order: 1,
				title: "Cari dan filter peserta",
				description:
					"Gunakan kolom pencarian untuk nama peserta, email, sekolah, atau tim. Kombinasikan dengan filter status agar verifikasi peserta dalam jumlah banyak tetap cepat.",
			},
			{
				order: 2,
				title: "Verifikasi pendaftaran",
				description:
					"Periksa kelengkapan data dan bukti pembayaran bila event berbayar. Setelah valid, ubah status verifikasi agar peserta resmi masuk ke daftar aktif event.",
			},
			{
				order: 3,
				title: "Tindak lanjuti data peserta",
				description:
					"Bila ada data salah, peserta belum lengkap, atau pendaftaran perlu ditolak, lakukan aksi dari baris peserta. Selalu pastikan keputusan panitia sudah sesuai data yang masuk.",
			},
		],
	},
	{
		title: "Undang dan Kelola Juri",
		description: "Panduan mencari juri, mengirim undangan, dan memantau progres penilaian.",
		icon: "LuScale",
		order: 2,
		slides: [
			{
				order: 0,
				title: "Masuk ke menu Juri",
				description:
					'Buka event yang aktif lalu pilih menu "Juri" di sidebar. Di sana Anda dapat melihat juri yang sudah terkonfirmasi, pending, atau ditolak.',
			},
			{
				order: 1,
				title: "Cari juri yang tersedia",
				description:
					"Pindah ke tab pencarian juri, lalu gunakan kata kunci nama atau email bila diperlukan. Sistem hanya menampilkan akun role juri yang belum ditugaskan ke event tersebut.",
			},
			{
				order: 2,
				title: "Pilih kategori dan kirim undangan",
				description:
					"Saat memilih juri, tentukan kategori penilaian yang menjadi tanggung jawabnya lalu tambahkan catatan bila perlu. Setelah itu kirim undangan agar juri bisa menerima penugasan dari akunnya.",
			},
			{
				order: 3,
				title: "Pantau progres dan kelola assignment",
				description:
					"Gunakan daftar juri terkonfirmasi untuk melihat progres penilaian. Jika ada kendala, Anda bisa meninjau assignment, mengganti kategori, atau melepas juri dari event dengan pertimbangan yang matang.",
			},
		],
	},
	{
		title: "Mengatur Kategori Juara",
		description: "Panduan menyiapkan kategori juara dan hubungannya dengan hasil lomba.",
		icon: "LuTrophy",
		order: 3,
		slides: [
			{
				order: 0,
				title: "Buka menu Juara",
				description:
					'Pilih menu "Juara" dari sidebar event untuk membuka pengaturan preset kategori juara. Di halaman ini panitia menentukan struktur penghargaan yang dipakai saat finalisasi hasil.',
			},
			{
				order: 1,
				title: "Buat atau ubah kategori juara",
				description:
					"Tambahkan nama kategori juara, deskripsi, dan tipe juara yang ingin dipakai. Susun label peringkat seperti Juara 1, 2, 3 atau format lain sesuai kebutuhan event.",
			},
			{
				order: 2,
				title: "Pilih kategori penilaian yang dihitung",
				description:
					"Tentukan kategori penilaian mana yang ikut dihitung untuk kategori juara tersebut. Langkah ini penting agar preset juara bisa langsung dipakai saat melihat rekap nilai.",
			},
			{
				order: 3,
				title: "Sinkronkan dengan rekap hasil",
				description:
					"Setelah preset juara siap, buka halaman rekap dan pilih preset tersebut untuk melihat peringkat sesuai aturan juara. Dari sini panitia bisa meninjau apakah komposisi juara sudah sesuai hasil penilaian.",
			},
		],
	},
	{
		title: "Mengelola Rekap Nilai",
		description: "Panduan membaca, memfilter, dan mengekspor rekap nilai peserta.",
		icon: "LuChartBar",
		order: 4,
		slides: [
			{
				order: 0,
				title: "Buka halaman Rekap",
				description:
					'Pilih menu "Rekap" atau "Rekapitulasi" dari sidebar event. Halaman ini menampilkan akumulasi nilai peserta dari seluruh juri dan seluruh kategori yang dipakai event.',
			},
			{
				order: 1,
				title: "Pilih grup dan filter nilai",
				description:
					"Gunakan tab grup atau kategori sekolah untuk fokus pada peserta tertentu. Anda juga bisa memilih kategori penilaian aktif agar tampilan rekap lebih mudah dibaca.",
			},
			{
				order: 2,
				title: "Gunakan preset juara bila diperlukan",
				description:
					"Jika kategori juara sudah dibuat, pilih preset juara di panel rekap. Sistem akan menyesuaikan bobot dan urutan peringkat berdasarkan aturan juara yang sedang aktif.",
			},
			{
				order: 3,
				title: "Tinjau detail nilai peserta",
				description:
					"Klik nama peserta untuk membuka rincian penilaian. Dari sini panitia bisa memeriksa kontribusi tiap kategori, nilai tambahan, dan konsistensi input juri sebelum hasil diumumkan.",
			},
			{
				order: 4,
				title: "Export Excel atau PDF",
				description:
					"Setelah rekap final, gunakan tombol export untuk menghasilkan file Excel atau PDF. File ini cocok dipakai untuk dokumentasi internal, distribusi panitia, atau bahan pengumuman hasil.",
			},
		],
	},
];

export async function seedGuides(prismaClient: PrismaClient = prisma) {
	console.log("Ensuring default guides...");

	let createdCount = 0;
	let filledCount = 0;
	let skippedCount = 0;

	for (const guide of panitiaGuides) {
		const existingGuide = await prismaClient.guide.findFirst({
			where: {
				role: "PANITIA",
				title: guide.title,
			},
			select: {
				id: true,
				_count: {
					select: {
						slides: true,
					},
				},
			},
		});

		if (!existingGuide) {
			await prismaClient.guide.create({
				data: {
					role: "PANITIA",
					title: guide.title,
					description: guide.description,
					icon: guide.icon,
					order: guide.order,
					isPublished: true,
					slides: {
						create: guide.slides.map((slide) => ({
							order: slide.order,
							title: slide.title,
							description: slide.description,
							imageUrl: null,
						})),
					},
				},
			});

			createdCount += 1;
			console.log(`  + Created guide: ${guide.title}`);
			continue;
		}

		if (existingGuide._count.slides === 0) {
			await prismaClient.guide.update({
				where: { id: existingGuide.id },
				data: {
					description: guide.description,
					icon: guide.icon,
					order: guide.order,
					isPublished: true,
					slides: {
						create: guide.slides.map((slide) => ({
							order: slide.order,
							title: slide.title,
							description: slide.description,
							imageUrl: null,
						})),
					},
				},
			});

			filledCount += 1;
			console.log(`  ~ Filled empty guide: ${guide.title}`);
			continue;
		}

		skippedCount += 1;
		console.log(`  - Skipped existing guide: ${guide.title}`);
	}

	console.log(
		`Done. created=${createdCount}, filled=${filledCount}, skipped=${skippedCount}`
	);
}

if (require.main === module) {
	seedGuides()
		.catch((error) => {
			console.error(error);
			process.exit(1);
		})
		.finally(() => prisma.$disconnect());
}
