// Indonesian Cities/Kabupaten with coordinates
// Source: BPS (Badan Pusat Statistik) Indonesia

export interface IndonesiaCity {
	id: string;
	name: string;
	province: string;
	latitude: number;
	longitude: number;
}

export interface Province {
	id: string;
	name: string;
}

export const provinces: Province[] = [
	{ id: "11", name: "Aceh" },
	{ id: "12", name: "Sumatera Utara" },
	{ id: "13", name: "Sumatera Barat" },
	{ id: "14", name: "Riau" },
	{ id: "15", name: "Jambi" },
	{ id: "16", name: "Sumatera Selatan" },
	{ id: "17", name: "Bengkulu" },
	{ id: "18", name: "Lampung" },
	{ id: "19", name: "Kepulauan Bangka Belitung" },
	{ id: "21", name: "Kepulauan Riau" },
	{ id: "31", name: "DKI Jakarta" },
	{ id: "32", name: "Jawa Barat" },
	{ id: "33", name: "Jawa Tengah" },
	{ id: "34", name: "DI Yogyakarta" },
	{ id: "35", name: "Jawa Timur" },
	{ id: "36", name: "Banten" },
	{ id: "51", name: "Bali" },
	{ id: "52", name: "Nusa Tenggara Barat" },
	{ id: "53", name: "Nusa Tenggara Timur" },
	{ id: "61", name: "Kalimantan Barat" },
	{ id: "62", name: "Kalimantan Tengah" },
	{ id: "63", name: "Kalimantan Selatan" },
	{ id: "64", name: "Kalimantan Timur" },
	{ id: "65", name: "Kalimantan Utara" },
	{ id: "71", name: "Sulawesi Utara" },
	{ id: "72", name: "Sulawesi Tengah" },
	{ id: "73", name: "Sulawesi Selatan" },
	{ id: "74", name: "Sulawesi Tenggara" },
	{ id: "75", name: "Gorontalo" },
	{ id: "76", name: "Sulawesi Barat" },
	{ id: "81", name: "Maluku" },
	{ id: "82", name: "Maluku Utara" },
	{ id: "91", name: "Papua" },
	{ id: "92", name: "Papua Barat" },
	{ id: "93", name: "Papua Selatan" },
	{ id: "94", name: "Papua Tengah" },
	{ id: "95", name: "Papua Pegunungan" },
	{ id: "96", name: "Papua Barat Daya" },
];

export const indonesiaCities: IndonesiaCity[] = [
	// DKI Jakarta
	{ id: "3171", name: "Jakarta Pusat", province: "DKI Jakarta", latitude: -6.1862, longitude: 106.8341 },
	{ id: "3172", name: "Jakarta Utara", province: "DKI Jakarta", latitude: -6.1384, longitude: 106.8628 },
	{ id: "3173", name: "Jakarta Barat", province: "DKI Jakarta", latitude: -6.1631, longitude: 106.7655 },
	{ id: "3174", name: "Jakarta Selatan", province: "DKI Jakarta", latitude: -6.2615, longitude: 106.8106 },
	{ id: "3175", name: "Jakarta Timur", province: "DKI Jakarta", latitude: -6.2250, longitude: 106.9004 },
	{ id: "3101", name: "Kepulauan Seribu", province: "DKI Jakarta", latitude: -5.6000, longitude: 106.5500 },

	// Jawa Barat
	{ id: "3201", name: "Bogor", province: "Jawa Barat", latitude: -6.5971, longitude: 106.8060 },
	{ id: "3202", name: "Sukabumi", province: "Jawa Barat", latitude: -6.9277, longitude: 106.9300 },
	{ id: "3203", name: "Cianjur", province: "Jawa Barat", latitude: -6.8206, longitude: 107.1419 },
	{ id: "3204", name: "Bandung", province: "Jawa Barat", latitude: -6.9175, longitude: 107.6191 },
	{ id: "3205", name: "Garut", province: "Jawa Barat", latitude: -7.2275, longitude: 107.9089 },
	{ id: "3206", name: "Tasikmalaya", province: "Jawa Barat", latitude: -7.3274, longitude: 108.2207 },
	{ id: "3207", name: "Ciamis", province: "Jawa Barat", latitude: -7.3370, longitude: 108.3535 },
	{ id: "3208", name: "Kuningan", province: "Jawa Barat", latitude: -6.9756, longitude: 108.4836 },
	{ id: "3209", name: "Cirebon", province: "Jawa Barat", latitude: -6.7063, longitude: 108.5570 },
	{ id: "3210", name: "Majalengka", province: "Jawa Barat", latitude: -6.8365, longitude: 108.2278 },
	{ id: "3211", name: "Sumedang", province: "Jawa Barat", latitude: -6.8644, longitude: 107.9188 },
	{ id: "3212", name: "Indramayu", province: "Jawa Barat", latitude: -6.3365, longitude: 108.3200 },
	{ id: "3213", name: "Subang", province: "Jawa Barat", latitude: -6.5714, longitude: 107.7644 },
	{ id: "3214", name: "Purwakarta", province: "Jawa Barat", latitude: -6.5569, longitude: 107.4467 },
	{ id: "3215", name: "Karawang", province: "Jawa Barat", latitude: -6.3227, longitude: 107.3376 },
	{ id: "3216", name: "Bekasi", province: "Jawa Barat", latitude: -6.2349, longitude: 106.9896 },
	{ id: "3217", name: "Bandung Barat", province: "Jawa Barat", latitude: -6.8621, longitude: 107.3884 },
	{ id: "3218", name: "Pangandaran", province: "Jawa Barat", latitude: -7.6836, longitude: 108.6540 },
	{ id: "3271", name: "Kota Bogor", province: "Jawa Barat", latitude: -6.5971, longitude: 106.8060 },
	{ id: "3272", name: "Kota Sukabumi", province: "Jawa Barat", latitude: -6.9277, longitude: 106.9300 },
	{ id: "3273", name: "Kota Bandung", province: "Jawa Barat", latitude: -6.9175, longitude: 107.6191 },
	{ id: "3274", name: "Kota Cirebon", province: "Jawa Barat", latitude: -6.7063, longitude: 108.5570 },
	{ id: "3275", name: "Kota Bekasi", province: "Jawa Barat", latitude: -6.2383, longitude: 106.9756 },
	{ id: "3276", name: "Kota Depok", province: "Jawa Barat", latitude: -6.4025, longitude: 106.7942 },
	{ id: "3277", name: "Kota Cimahi", province: "Jawa Barat", latitude: -6.8841, longitude: 107.5413 },
	{ id: "3278", name: "Kota Tasikmalaya", province: "Jawa Barat", latitude: -7.3274, longitude: 108.2207 },
	{ id: "3279", name: "Kota Banjar", province: "Jawa Barat", latitude: -7.3711, longitude: 108.5340 },

	// Jawa Tengah
	{ id: "3301", name: "Cilacap", province: "Jawa Tengah", latitude: -7.7262, longitude: 109.0154 },
	{ id: "3302", name: "Banyumas", province: "Jawa Tengah", latitude: -7.4832, longitude: 109.1404 },
	{ id: "3303", name: "Purbalingga", province: "Jawa Tengah", latitude: -7.3889, longitude: 109.3639 },
	{ id: "3304", name: "Banjarnegara", province: "Jawa Tengah", latitude: -7.3914, longitude: 109.6916 },
	{ id: "3305", name: "Kebumen", province: "Jawa Tengah", latitude: -7.6679, longitude: 109.6508 },
	{ id: "3306", name: "Purworejo", province: "Jawa Tengah", latitude: -7.7086, longitude: 110.0053 },
	{ id: "3307", name: "Wonosobo", province: "Jawa Tengah", latitude: -7.3607, longitude: 109.9024 },
	{ id: "3308", name: "Magelang", province: "Jawa Tengah", latitude: -7.4797, longitude: 110.2177 },
	{ id: "3309", name: "Boyolali", province: "Jawa Tengah", latitude: -7.5307, longitude: 110.5959 },
	{ id: "3310", name: "Klaten", province: "Jawa Tengah", latitude: -7.7053, longitude: 110.6042 },
	{ id: "3311", name: "Sukoharjo", province: "Jawa Tengah", latitude: -7.6813, longitude: 110.8383 },
	{ id: "3312", name: "Wonogiri", province: "Jawa Tengah", latitude: -7.8074, longitude: 110.9266 },
	{ id: "3313", name: "Karanganyar", province: "Jawa Tengah", latitude: -7.5967, longitude: 110.9589 },
	{ id: "3314", name: "Sragen", province: "Jawa Tengah", latitude: -7.4301, longitude: 111.0203 },
	{ id: "3315", name: "Grobogan", province: "Jawa Tengah", latitude: -7.1039, longitude: 110.8622 },
	{ id: "3316", name: "Blora", province: "Jawa Tengah", latitude: -6.9678, longitude: 111.4163 },
	{ id: "3317", name: "Rembang", province: "Jawa Tengah", latitude: -6.7050, longitude: 111.3544 },
	{ id: "3318", name: "Pati", province: "Jawa Tengah", latitude: -6.7473, longitude: 111.0408 },
	{ id: "3319", name: "Kudus", province: "Jawa Tengah", latitude: -6.8048, longitude: 110.8394 },
	{ id: "3320", name: "Jepara", province: "Jawa Tengah", latitude: -6.5918, longitude: 110.6775 },
	{ id: "3321", name: "Demak", province: "Jawa Tengah", latitude: -6.8936, longitude: 110.6386 },
	{ id: "3322", name: "Semarang", province: "Jawa Tengah", latitude: -7.0051, longitude: 110.4381 },
	{ id: "3323", name: "Temanggung", province: "Jawa Tengah", latitude: -7.3176, longitude: 110.1777 },
	{ id: "3324", name: "Kendal", province: "Jawa Tengah", latitude: -6.9176, longitude: 110.1980 },
	{ id: "3325", name: "Batang", province: "Jawa Tengah", latitude: -6.8957, longitude: 109.7253 },
	{ id: "3326", name: "Pekalongan", province: "Jawa Tengah", latitude: -6.8886, longitude: 109.6750 },
	{ id: "3327", name: "Pemalang", province: "Jawa Tengah", latitude: -6.8912, longitude: 109.3799 },
	{ id: "3328", name: "Tegal", province: "Jawa Tengah", latitude: -6.8797, longitude: 109.1256 },
	{ id: "3329", name: "Brebes", province: "Jawa Tengah", latitude: -6.8724, longitude: 109.0480 },
	{ id: "3371", name: "Kota Magelang", province: "Jawa Tengah", latitude: -7.4797, longitude: 110.2177 },
	{ id: "3372", name: "Kota Surakarta", province: "Jawa Tengah", latitude: -7.5755, longitude: 110.8243 },
	{ id: "3373", name: "Kota Salatiga", province: "Jawa Tengah", latitude: -7.3328, longitude: 110.5094 },
	{ id: "3374", name: "Kota Semarang", province: "Jawa Tengah", latitude: -6.9666, longitude: 110.4196 },
	{ id: "3375", name: "Kota Pekalongan", province: "Jawa Tengah", latitude: -6.8886, longitude: 109.6750 },
	{ id: "3376", name: "Kota Tegal", province: "Jawa Tengah", latitude: -6.8797, longitude: 109.1256 },

	// DI Yogyakarta
	{ id: "3401", name: "Kulon Progo", province: "DI Yogyakarta", latitude: -7.8208, longitude: 110.1642 },
	{ id: "3402", name: "Bantul", province: "DI Yogyakarta", latitude: -7.8894, longitude: 110.3275 },
	{ id: "3403", name: "Gunungkidul", province: "DI Yogyakarta", latitude: -7.9880, longitude: 110.6047 },
	{ id: "3404", name: "Sleman", province: "DI Yogyakarta", latitude: -7.7156, longitude: 110.3556 },
	{ id: "3471", name: "Kota Yogyakarta", province: "DI Yogyakarta", latitude: -7.7956, longitude: 110.3695 },

	// Jawa Timur
	{ id: "3501", name: "Pacitan", province: "Jawa Timur", latitude: -8.1976, longitude: 111.1014 },
	{ id: "3502", name: "Ponorogo", province: "Jawa Timur", latitude: -7.8653, longitude: 111.4593 },
	{ id: "3503", name: "Trenggalek", province: "Jawa Timur", latitude: -8.0503, longitude: 111.7092 },
	{ id: "3504", name: "Tulungagung", province: "Jawa Timur", latitude: -8.0657, longitude: 111.9024 },
	{ id: "3505", name: "Blitar", province: "Jawa Timur", latitude: -8.0954, longitude: 112.1608 },
	{ id: "3506", name: "Kediri", province: "Jawa Timur", latitude: -7.8162, longitude: 112.0155 },
	{ id: "3507", name: "Malang", province: "Jawa Timur", latitude: -7.9785, longitude: 112.6304 },
	{ id: "3508", name: "Lumajang", province: "Jawa Timur", latitude: -8.1364, longitude: 113.2249 },
	{ id: "3509", name: "Jember", province: "Jawa Timur", latitude: -8.1660, longitude: 113.7028 },
	{ id: "3510", name: "Banyuwangi", province: "Jawa Timur", latitude: -8.2192, longitude: 114.3692 },
	{ id: "3511", name: "Bondowoso", province: "Jawa Timur", latitude: -7.9136, longitude: 113.8221 },
	{ id: "3512", name: "Situbondo", province: "Jawa Timur", latitude: -7.7015, longitude: 114.0098 },
	{ id: "3513", name: "Probolinggo", province: "Jawa Timur", latitude: -7.7543, longitude: 113.2159 },
	{ id: "3514", name: "Pasuruan", province: "Jawa Timur", latitude: -7.6541, longitude: 112.9050 },
	{ id: "3515", name: "Sidoarjo", province: "Jawa Timur", latitude: -7.4478, longitude: 112.7183 },
	{ id: "3516", name: "Mojokerto", province: "Jawa Timur", latitude: -7.4724, longitude: 112.4340 },
	{ id: "3517", name: "Jombang", province: "Jawa Timur", latitude: -7.5459, longitude: 112.2312 },
	{ id: "3518", name: "Nganjuk", province: "Jawa Timur", latitude: -7.6049, longitude: 111.9029 },
	{ id: "3519", name: "Madiun", province: "Jawa Timur", latitude: -7.6298, longitude: 111.5240 },
	{ id: "3520", name: "Magetan", province: "Jawa Timur", latitude: -7.6462, longitude: 111.3589 },
	{ id: "3521", name: "Ngawi", province: "Jawa Timur", latitude: -7.4041, longitude: 111.4467 },
	{ id: "3522", name: "Bojonegoro", province: "Jawa Timur", latitude: -7.1509, longitude: 111.8808 },
	{ id: "3523", name: "Tuban", province: "Jawa Timur", latitude: -6.9041, longitude: 112.0489 },
	{ id: "3524", name: "Lamongan", province: "Jawa Timur", latitude: -7.1224, longitude: 112.4143 },
	{ id: "3525", name: "Gresik", province: "Jawa Timur", latitude: -7.1619, longitude: 112.6520 },
	{ id: "3526", name: "Bangkalan", province: "Jawa Timur", latitude: -7.0455, longitude: 112.7351 },
	{ id: "3527", name: "Sampang", province: "Jawa Timur", latitude: -7.1905, longitude: 113.2393 },
	{ id: "3528", name: "Pamekasan", province: "Jawa Timur", latitude: -7.1588, longitude: 113.4746 },
	{ id: "3529", name: "Sumenep", province: "Jawa Timur", latitude: -7.0167, longitude: 113.8665 },
	{ id: "3571", name: "Kota Kediri", province: "Jawa Timur", latitude: -7.8162, longitude: 112.0155 },
	{ id: "3572", name: "Kota Blitar", province: "Jawa Timur", latitude: -8.0954, longitude: 112.1608 },
	{ id: "3573", name: "Kota Malang", province: "Jawa Timur", latitude: -7.9785, longitude: 112.6304 },
	{ id: "3574", name: "Kota Probolinggo", province: "Jawa Timur", latitude: -7.7543, longitude: 113.2159 },
	{ id: "3575", name: "Kota Pasuruan", province: "Jawa Timur", latitude: -7.6541, longitude: 112.9050 },
	{ id: "3576", name: "Kota Mojokerto", province: "Jawa Timur", latitude: -7.4724, longitude: 112.4340 },
	{ id: "3577", name: "Kota Madiun", province: "Jawa Timur", latitude: -7.6298, longitude: 111.5240 },
	{ id: "3578", name: "Kota Surabaya", province: "Jawa Timur", latitude: -7.2575, longitude: 112.7521 },
	{ id: "3579", name: "Kota Batu", province: "Jawa Timur", latitude: -7.8672, longitude: 112.5239 },

	// Banten
	{ id: "3601", name: "Pandeglang", province: "Banten", latitude: -6.3089, longitude: 106.1048 },
	{ id: "3602", name: "Lebak", province: "Banten", latitude: -6.5624, longitude: 106.2520 },
	{ id: "3603", name: "Tangerang", province: "Banten", latitude: -6.2534, longitude: 106.6232 },
	{ id: "3604", name: "Serang", province: "Banten", latitude: -6.1098, longitude: 106.1504 },
	{ id: "3671", name: "Kota Tangerang", province: "Banten", latitude: -6.1781, longitude: 106.6319 },
	{ id: "3672", name: "Kota Cilegon", province: "Banten", latitude: -6.0157, longitude: 106.0506 },
	{ id: "3673", name: "Kota Serang", province: "Banten", latitude: -6.1098, longitude: 106.1504 },
	{ id: "3674", name: "Kota Tangerang Selatan", province: "Banten", latitude: -6.2886, longitude: 106.7199 },

	// Bali
	{ id: "5101", name: "Jembrana", province: "Bali", latitude: -8.3617, longitude: 114.6416 },
	{ id: "5102", name: "Tabanan", province: "Bali", latitude: -8.5410, longitude: 115.1251 },
	{ id: "5103", name: "Badung", province: "Bali", latitude: -8.5819, longitude: 115.1770 },
	{ id: "5104", name: "Gianyar", province: "Bali", latitude: -8.5447, longitude: 115.3206 },
	{ id: "5105", name: "Klungkung", province: "Bali", latitude: -8.5361, longitude: 115.4065 },
	{ id: "5106", name: "Bangli", province: "Bali", latitude: -8.4541, longitude: 115.3556 },
	{ id: "5107", name: "Karangasem", province: "Bali", latitude: -8.4485, longitude: 115.6133 },
	{ id: "5108", name: "Buleleng", province: "Bali", latitude: -8.1128, longitude: 115.0878 },
	{ id: "5171", name: "Kota Denpasar", province: "Bali", latitude: -8.6705, longitude: 115.2126 },

	// Sumatera Utara
	{ id: "1271", name: "Kota Medan", province: "Sumatera Utara", latitude: 3.5952, longitude: 98.6722 },
	{ id: "1272", name: "Kota Pematangsiantar", province: "Sumatera Utara", latitude: 2.9595, longitude: 99.0687 },
	{ id: "1273", name: "Kota Binjai", province: "Sumatera Utara", latitude: 3.6000, longitude: 98.4833 },
	{ id: "1274", name: "Kota Tebing Tinggi", province: "Sumatera Utara", latitude: 3.3283, longitude: 99.1625 },
	{ id: "1275", name: "Kota Padang Sidempuan", province: "Sumatera Utara", latitude: 1.3791, longitude: 99.2720 },
	{ id: "1201", name: "Nias", province: "Sumatera Utara", latitude: 1.0556, longitude: 97.7811 },
	{ id: "1202", name: "Mandailing Natal", province: "Sumatera Utara", latitude: 0.8333, longitude: 99.5000 },
	{ id: "1203", name: "Tapanuli Selatan", province: "Sumatera Utara", latitude: 1.5000, longitude: 99.0000 },
	{ id: "1207", name: "Deli Serdang", province: "Sumatera Utara", latitude: 3.4333, longitude: 98.6833 },

	// Sumatera Barat
	{ id: "1371", name: "Kota Padang", province: "Sumatera Barat", latitude: -0.9492, longitude: 100.3543 },
	{ id: "1372", name: "Kota Solok", province: "Sumatera Barat", latitude: -0.7893, longitude: 100.6534 },
	{ id: "1373", name: "Kota Sawahlunto", province: "Sumatera Barat", latitude: -0.6837, longitude: 100.7776 },
	{ id: "1374", name: "Kota Padang Panjang", province: "Sumatera Barat", latitude: -0.4624, longitude: 100.3980 },
	{ id: "1375", name: "Kota Bukittinggi", province: "Sumatera Barat", latitude: -0.3056, longitude: 100.3692 },
	{ id: "1376", name: "Kota Payakumbuh", province: "Sumatera Barat", latitude: -0.2199, longitude: 100.6331 },
	{ id: "1377", name: "Kota Pariaman", province: "Sumatera Barat", latitude: -0.6266, longitude: 100.1256 },

	// Riau
	{ id: "1471", name: "Kota Pekanbaru", province: "Riau", latitude: 0.5071, longitude: 101.4478 },
	{ id: "1473", name: "Kota Dumai", province: "Riau", latitude: 1.6667, longitude: 101.4500 },

	// Kepulauan Riau
	{ id: "2171", name: "Kota Batam", province: "Kepulauan Riau", latitude: 1.0456, longitude: 104.0305 },
	{ id: "2172", name: "Kota Tanjung Pinang", province: "Kepulauan Riau", latitude: 0.9189, longitude: 104.4417 },

	// Sumatera Selatan
	{ id: "1671", name: "Kota Palembang", province: "Sumatera Selatan", latitude: -2.9761, longitude: 104.7754 },
	{ id: "1672", name: "Kota Prabumulih", province: "Sumatera Selatan", latitude: -3.4333, longitude: 104.2333 },
	{ id: "1673", name: "Kota Pagar Alam", province: "Sumatera Selatan", latitude: -4.0250, longitude: 103.2471 },
	{ id: "1674", name: "Kota Lubuk Linggau", province: "Sumatera Selatan", latitude: -3.2897, longitude: 102.8558 },

	// Lampung
	{ id: "1871", name: "Kota Bandar Lampung", province: "Lampung", latitude: -5.4500, longitude: 105.2667 },
	{ id: "1872", name: "Kota Metro", province: "Lampung", latitude: -5.1135, longitude: 105.3068 },

	// Aceh
	{ id: "1171", name: "Kota Banda Aceh", province: "Aceh", latitude: 5.5483, longitude: 95.3238 },
	{ id: "1172", name: "Kota Sabang", province: "Aceh", latitude: 5.8924, longitude: 95.3168 },
	{ id: "1173", name: "Kota Langsa", province: "Aceh", latitude: 4.4688, longitude: 97.9681 },
	{ id: "1174", name: "Kota Lhokseumawe", province: "Aceh", latitude: 5.1801, longitude: 97.1507 },
	{ id: "1175", name: "Kota Subulussalam", province: "Aceh", latitude: 2.6455, longitude: 98.0025 },

	// Kalimantan Barat
	{ id: "6171", name: "Kota Pontianak", province: "Kalimantan Barat", latitude: -0.0226, longitude: 109.3431 },
	{ id: "6172", name: "Kota Singkawang", province: "Kalimantan Barat", latitude: 0.9050, longitude: 108.9862 },

	// Kalimantan Tengah
	{ id: "6271", name: "Kota Palangka Raya", province: "Kalimantan Tengah", latitude: -2.2136, longitude: 113.9108 },

	// Kalimantan Selatan
	{ id: "6371", name: "Kota Banjarmasin", province: "Kalimantan Selatan", latitude: -3.3167, longitude: 114.5900 },
	{ id: "6372", name: "Kota Banjarbaru", province: "Kalimantan Selatan", latitude: -3.4440, longitude: 114.8430 },

	// Kalimantan Timur
	{ id: "6471", name: "Kota Balikpapan", province: "Kalimantan Timur", latitude: -1.2654, longitude: 116.8311 },
	{ id: "6472", name: "Kota Samarinda", province: "Kalimantan Timur", latitude: -0.4948, longitude: 117.1436 },
	{ id: "6474", name: "Kota Bontang", province: "Kalimantan Timur", latitude: 0.1333, longitude: 117.5000 },

	// Kalimantan Utara
	{ id: "6571", name: "Kota Tarakan", province: "Kalimantan Utara", latitude: 3.3275, longitude: 117.5789 },

	// Sulawesi Utara
	{ id: "7171", name: "Kota Manado", province: "Sulawesi Utara", latitude: 1.4748, longitude: 124.8421 },
	{ id: "7172", name: "Kota Bitung", province: "Sulawesi Utara", latitude: 1.4404, longitude: 125.1217 },
	{ id: "7173", name: "Kota Tomohon", province: "Sulawesi Utara", latitude: 1.3178, longitude: 124.8396 },
	{ id: "7174", name: "Kota Kotamobagu", province: "Sulawesi Utara", latitude: 0.7247, longitude: 124.3198 },

	// Sulawesi Tengah
	{ id: "7271", name: "Kota Palu", province: "Sulawesi Tengah", latitude: -0.8917, longitude: 119.8707 },

	// Sulawesi Selatan
	{ id: "7371", name: "Kota Makassar", province: "Sulawesi Selatan", latitude: -5.1477, longitude: 119.4327 },
	{ id: "7372", name: "Kota Parepare", province: "Sulawesi Selatan", latitude: -4.0135, longitude: 119.6455 },
	{ id: "7373", name: "Kota Palopo", province: "Sulawesi Selatan", latitude: -2.9922, longitude: 120.1969 },

	// Sulawesi Tenggara
	{ id: "7471", name: "Kota Kendari", province: "Sulawesi Tenggara", latitude: -3.9985, longitude: 122.5129 },
	{ id: "7472", name: "Kota Baubau", province: "Sulawesi Tenggara", latitude: -5.4711, longitude: 122.6150 },

	// Gorontalo
	{ id: "7571", name: "Kota Gorontalo", province: "Gorontalo", latitude: 0.5435, longitude: 123.0568 },

	// Maluku
	{ id: "8171", name: "Kota Ambon", province: "Maluku", latitude: -3.6954, longitude: 128.1814 },
	{ id: "8172", name: "Kota Tual", province: "Maluku", latitude: -5.6387, longitude: 132.7473 },

	// Maluku Utara
	{ id: "8271", name: "Kota Ternate", province: "Maluku Utara", latitude: 0.7833, longitude: 127.3667 },
	{ id: "8272", name: "Kota Tidore Kepulauan", province: "Maluku Utara", latitude: 0.6833, longitude: 127.4000 },

	// Papua
	{ id: "9171", name: "Kota Jayapura", province: "Papua", latitude: -2.5337, longitude: 140.7181 },

	// Papua Barat
	{ id: "9271", name: "Kota Sorong", province: "Papua Barat", latitude: -0.8755, longitude: 131.2870 },

	// Nusa Tenggara Barat
	{ id: "5271", name: "Kota Mataram", province: "Nusa Tenggara Barat", latitude: -8.5833, longitude: 116.1167 },
	{ id: "5272", name: "Kota Bima", province: "Nusa Tenggara Barat", latitude: -8.4608, longitude: 118.7267 },
	{ id: "5201", name: "Lombok Barat", province: "Nusa Tenggara Barat", latitude: -8.4853, longitude: 116.0963 },
	{ id: "5202", name: "Lombok Tengah", province: "Nusa Tenggara Barat", latitude: -8.7006, longitude: 116.2744 },
	{ id: "5203", name: "Lombok Timur", province: "Nusa Tenggara Barat", latitude: -8.4762, longitude: 116.5187 },
	{ id: "5204", name: "Sumbawa", province: "Nusa Tenggara Barat", latitude: -8.4833, longitude: 117.4167 },

	// Nusa Tenggara Timur
	{ id: "5371", name: "Kota Kupang", province: "Nusa Tenggara Timur", latitude: -10.1772, longitude: 123.6070 },
	{ id: "5301", name: "Sumba Barat", province: "Nusa Tenggara Timur", latitude: -9.6500, longitude: 119.3500 },
	{ id: "5302", name: "Sumba Timur", province: "Nusa Tenggara Timur", latitude: -9.9833, longitude: 120.2500 },
	{ id: "5303", name: "Kupang", province: "Nusa Tenggara Timur", latitude: -10.0833, longitude: 123.5833 },
	{ id: "5304", name: "Timor Tengah Selatan", province: "Nusa Tenggara Timur", latitude: -9.4500, longitude: 124.3000 },
	{ id: "5305", name: "Timor Tengah Utara", province: "Nusa Tenggara Timur", latitude: -9.4500, longitude: 124.6500 },
	{ id: "5306", name: "Belu", province: "Nusa Tenggara Timur", latitude: -9.1167, longitude: 124.9333 },
	{ id: "5307", name: "Alor", province: "Nusa Tenggara Timur", latitude: -8.2500, longitude: 124.7500 },

	// Jambi
	{ id: "1571", name: "Kota Jambi", province: "Jambi", latitude: -1.6101, longitude: 103.6131 },
	{ id: "1572", name: "Kota Sungai Penuh", province: "Jambi", latitude: -2.0833, longitude: 101.3833 },

	// Bengkulu
	{ id: "1771", name: "Kota Bengkulu", province: "Bengkulu", latitude: -3.7928, longitude: 102.2608 },

	// Kepulauan Bangka Belitung
	{ id: "1971", name: "Kota Pangkalpinang", province: "Kepulauan Bangka Belitung", latitude: -2.1333, longitude: 106.1167 },
];

// Helper function to calculate distance between two points using Haversine formula
export function calculateDistance(
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number
): number {
	const R = 6371; // Earth's radius in kilometers
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRad(lat1)) *
			Math.cos(toRad(lat2)) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

function toRad(deg: number): number {
	return deg * (Math.PI / 180);
}

// Get cities grouped by province
export function getCitiesByProvince(): Record<string, IndonesiaCity[]> {
	const grouped: Record<string, IndonesiaCity[]> = {};
	indonesiaCities.forEach((city) => {
		if (!grouped[city.province]) {
			grouped[city.province] = [];
		}
		grouped[city.province]!.push(city);
	});
	// Sort cities within each province
	Object.keys(grouped).forEach((province) => {
		grouped[province]!.sort((a, b) => a.name.localeCompare(b.name));
	});
	return grouped;
}

// Search cities by name
export function searchCities(query: string): IndonesiaCity[] {
	const lowerQuery = query.toLowerCase();
	return indonesiaCities.filter(
		(city) =>
			city.name.toLowerCase().includes(lowerQuery) ||
			city.province.toLowerCase().includes(lowerQuery)
	);
}

// Get city by ID
export function getCityById(id: string): IndonesiaCity | undefined {
	return indonesiaCities.find((city) => city.id === id);
}

// Get city by name (fuzzy match)
export function getCityByName(name: string): IndonesiaCity | undefined {
	const lowerName = name.toLowerCase();
	return indonesiaCities.find(
		(city) => city.name.toLowerCase() === lowerName
	);
}
