// Indonesian Cities/Kabupaten with coordinates
// Source: BPS (Badan Pusat Statistik) Indonesia - Complete 514 Kota/Kabupaten

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
	// ============================================================
	// ACEH (23 Kab/Kota)
	// ============================================================
	{ id: "1101", name: "Simeulue", province: "Aceh", latitude: 2.6167, longitude: 96.0833 },
	{ id: "1102", name: "Aceh Singkil", province: "Aceh", latitude: 2.3667, longitude: 97.8167 },
	{ id: "1103", name: "Aceh Selatan", province: "Aceh", latitude: 3.1667, longitude: 97.1500 },
	{ id: "1104", name: "Aceh Tenggara", province: "Aceh", latitude: 3.3500, longitude: 97.7167 },
	{ id: "1105", name: "Aceh Timur", province: "Aceh", latitude: 4.5000, longitude: 97.7500 },
	{ id: "1106", name: "Aceh Tengah", province: "Aceh", latitude: 4.6167, longitude: 96.8500 },
	{ id: "1107", name: "Aceh Barat", province: "Aceh", latitude: 4.4500, longitude: 96.1667 },
	{ id: "1108", name: "Aceh Besar", province: "Aceh", latitude: 5.3833, longitude: 95.5333 },
	{ id: "1109", name: "Pidie", province: "Aceh", latitude: 5.0667, longitude: 96.1333 },
	{ id: "1110", name: "Bireuen", province: "Aceh", latitude: 5.0333, longitude: 96.6833 },
	{ id: "1111", name: "Aceh Utara", province: "Aceh", latitude: 5.0833, longitude: 97.1333 },
	{ id: "1112", name: "Aceh Barat Daya", province: "Aceh", latitude: 3.8333, longitude: 97.0167 },
	{ id: "1113", name: "Gayo Lues", province: "Aceh", latitude: 3.9500, longitude: 97.3833 },
	{ id: "1114", name: "Aceh Tamiang", province: "Aceh", latitude: 4.2500, longitude: 97.8833 },
	{ id: "1115", name: "Nagan Raya", province: "Aceh", latitude: 4.1167, longitude: 96.5000 },
	{ id: "1116", name: "Aceh Jaya", province: "Aceh", latitude: 4.8833, longitude: 95.6333 },
	{ id: "1117", name: "Bener Meriah", province: "Aceh", latitude: 4.7167, longitude: 96.8500 },
	{ id: "1118", name: "Pidie Jaya", province: "Aceh", latitude: 5.1500, longitude: 96.2167 },
	{ id: "1171", name: "Kota Banda Aceh", province: "Aceh", latitude: 5.5483, longitude: 95.3238 },
	{ id: "1172", name: "Kota Sabang", province: "Aceh", latitude: 5.8924, longitude: 95.3168 },
	{ id: "1173", name: "Kota Langsa", province: "Aceh", latitude: 4.4688, longitude: 97.9681 },
	{ id: "1174", name: "Kota Lhokseumawe", province: "Aceh", latitude: 5.1801, longitude: 97.1507 },
	{ id: "1175", name: "Kota Subulussalam", province: "Aceh", latitude: 2.6455, longitude: 98.0025 },

	// ============================================================
	// SUMATERA UTARA (33 Kab/Kota)
	// ============================================================
	{ id: "1201", name: "Nias", province: "Sumatera Utara", latitude: 1.0556, longitude: 97.7811 },
	{ id: "1202", name: "Mandailing Natal", province: "Sumatera Utara", latitude: 0.8333, longitude: 99.5000 },
	{ id: "1203", name: "Tapanuli Selatan", province: "Sumatera Utara", latitude: 1.5000, longitude: 99.0000 },
	{ id: "1204", name: "Tapanuli Tengah", province: "Sumatera Utara", latitude: 1.7833, longitude: 98.7167 },
	{ id: "1205", name: "Tapanuli Utara", province: "Sumatera Utara", latitude: 2.3333, longitude: 99.0500 },
	{ id: "1206", name: "Toba", province: "Sumatera Utara", latitude: 2.5333, longitude: 99.0833 },
	{ id: "1207", name: "Labuhanbatu", province: "Sumatera Utara", latitude: 2.3167, longitude: 99.8500 },
	{ id: "1208", name: "Asahan", province: "Sumatera Utara", latitude: 2.9833, longitude: 99.7167 },
	{ id: "1209", name: "Simalungun", province: "Sumatera Utara", latitude: 2.9667, longitude: 99.0500 },
	{ id: "1210", name: "Dairi", province: "Sumatera Utara", latitude: 2.7500, longitude: 98.2333 },
	{ id: "1211", name: "Karo", province: "Sumatera Utara", latitude: 3.1000, longitude: 98.3500 },
	{ id: "1212", name: "Deli Serdang", province: "Sumatera Utara", latitude: 3.4333, longitude: 98.6833 },
	{ id: "1213", name: "Langkat", province: "Sumatera Utara", latitude: 3.7667, longitude: 98.2833 },
	{ id: "1214", name: "Nias Selatan", province: "Sumatera Utara", latitude: 0.5833, longitude: 97.8167 },
	{ id: "1215", name: "Humbang Hasundutan", province: "Sumatera Utara", latitude: 2.3333, longitude: 98.5667 },
	{ id: "1216", name: "Pakpak Bharat", province: "Sumatera Utara", latitude: 2.5500, longitude: 98.2833 },
	{ id: "1217", name: "Samosir", province: "Sumatera Utara", latitude: 2.6167, longitude: 98.7500 },
	{ id: "1218", name: "Serdang Bedagai", province: "Sumatera Utara", latitude: 3.4167, longitude: 99.0000 },
	{ id: "1219", name: "Batubara", province: "Sumatera Utara", latitude: 3.1500, longitude: 99.5833 },
	{ id: "1220", name: "Padang Lawas Utara", province: "Sumatera Utara", latitude: 1.5000, longitude: 99.7500 },
	{ id: "1221", name: "Padang Lawas", province: "Sumatera Utara", latitude: 1.2833, longitude: 99.7833 },
	{ id: "1222", name: "Labuhanbatu Selatan", province: "Sumatera Utara", latitude: 2.0000, longitude: 100.0333 },
	{ id: "1223", name: "Labuhanbatu Utara", province: "Sumatera Utara", latitude: 2.3500, longitude: 99.9500 },
	{ id: "1224", name: "Nias Utara", province: "Sumatera Utara", latitude: 1.3000, longitude: 97.4500 },
	{ id: "1225", name: "Nias Barat", province: "Sumatera Utara", latitude: 0.8833, longitude: 97.5500 },
	{ id: "1271", name: "Kota Medan", province: "Sumatera Utara", latitude: 3.5952, longitude: 98.6722 },
	{ id: "1272", name: "Kota Pematangsiantar", province: "Sumatera Utara", latitude: 2.9595, longitude: 99.0687 },
	{ id: "1273", name: "Kota Binjai", province: "Sumatera Utara", latitude: 3.6000, longitude: 98.4833 },
	{ id: "1274", name: "Kota Tebing Tinggi", province: "Sumatera Utara", latitude: 3.3283, longitude: 99.1625 },
	{ id: "1275", name: "Kota Padang Sidempuan", province: "Sumatera Utara", latitude: 1.3791, longitude: 99.2720 },
	{ id: "1276", name: "Kota Tanjungbalai", province: "Sumatera Utara", latitude: 2.9667, longitude: 99.7833 },
	{ id: "1277", name: "Kota Sibolga", province: "Sumatera Utara", latitude: 1.7500, longitude: 98.7833 },
	{ id: "1278", name: "Kota Gunungsitoli", province: "Sumatera Utara", latitude: 1.2833, longitude: 97.6167 },

	// ============================================================
	// SUMATERA BARAT (19 Kab/Kota)
	// ============================================================
	{ id: "1301", name: "Kepulauan Mentawai", province: "Sumatera Barat", latitude: -1.4500, longitude: 99.0500 },
	{ id: "1302", name: "Pesisir Selatan", province: "Sumatera Barat", latitude: -1.5833, longitude: 100.5833 },
	{ id: "1303", name: "Solok", province: "Sumatera Barat", latitude: -1.2167, longitude: 100.7000 },
	{ id: "1304", name: "Sijunjung", province: "Sumatera Barat", latitude: -0.6833, longitude: 100.9333 },
	{ id: "1305", name: "Tanah Datar", province: "Sumatera Barat", latitude: -0.4667, longitude: 100.6000 },
	{ id: "1306", name: "Padang Pariaman", province: "Sumatera Barat", latitude: -0.5833, longitude: 100.1500 },
	{ id: "1307", name: "Agam", province: "Sumatera Barat", latitude: -0.3333, longitude: 100.3000 },
	{ id: "1308", name: "Lima Puluh Kota", province: "Sumatera Barat", latitude: -0.1667, longitude: 100.5833 },
	{ id: "1309", name: "Pasaman", province: "Sumatera Barat", latitude: -0.0333, longitude: 100.0500 },
	{ id: "1310", name: "Dharmasraya", province: "Sumatera Barat", latitude: -1.0667, longitude: 101.4833 },
	{ id: "1311", name: "Solok Selatan", province: "Sumatera Barat", latitude: -1.4333, longitude: 101.2500 },
	{ id: "1312", name: "Pasaman Barat", province: "Sumatera Barat", latitude: 0.1000, longitude: 99.7833 },
	{ id: "1371", name: "Kota Padang", province: "Sumatera Barat", latitude: -0.9492, longitude: 100.3543 },
	{ id: "1372", name: "Kota Solok", province: "Sumatera Barat", latitude: -0.7893, longitude: 100.6534 },
	{ id: "1373", name: "Kota Sawahlunto", province: "Sumatera Barat", latitude: -0.6837, longitude: 100.7776 },
	{ id: "1374", name: "Kota Padang Panjang", province: "Sumatera Barat", latitude: -0.4624, longitude: 100.3980 },
	{ id: "1375", name: "Kota Bukittinggi", province: "Sumatera Barat", latitude: -0.3056, longitude: 100.3692 },
	{ id: "1376", name: "Kota Payakumbuh", province: "Sumatera Barat", latitude: -0.2199, longitude: 100.6331 },
	{ id: "1377", name: "Kota Pariaman", province: "Sumatera Barat", latitude: -0.6266, longitude: 100.1256 },

	// ============================================================
	// RIAU (12 Kab/Kota)
	// ============================================================
	{ id: "1401", name: "Kuantan Singingi", province: "Riau", latitude: -0.5000, longitude: 101.5500 },
	{ id: "1402", name: "Indragiri Hulu", province: "Riau", latitude: -0.3667, longitude: 102.3333 },
	{ id: "1403", name: "Indragiri Hilir", province: "Riau", latitude: -0.3333, longitude: 103.0833 },
	{ id: "1404", name: "Pelalawan", province: "Riau", latitude: 0.5333, longitude: 102.2500 },
	{ id: "1405", name: "Siak", province: "Riau", latitude: 1.1000, longitude: 102.0000 },
	{ id: "1406", name: "Kampar", province: "Riau", latitude: 0.3333, longitude: 101.1333 },
	{ id: "1407", name: "Rokan Hulu", province: "Riau", latitude: 0.8667, longitude: 100.5333 },
	{ id: "1408", name: "Bengkalis", province: "Riau", latitude: 1.5667, longitude: 102.1333 },
	{ id: "1409", name: "Rokan Hilir", province: "Riau", latitude: 1.9333, longitude: 101.0333 },
	{ id: "1410", name: "Kepulauan Meranti", province: "Riau", latitude: 1.0833, longitude: 102.3500 },
	{ id: "1471", name: "Kota Pekanbaru", province: "Riau", latitude: 0.5071, longitude: 101.4478 },
	{ id: "1473", name: "Kota Dumai", province: "Riau", latitude: 1.6667, longitude: 101.4500 },

	// ============================================================
	// JAMBI (11 Kab/Kota)
	// ============================================================
	{ id: "1501", name: "Kerinci", province: "Jambi", latitude: -1.9000, longitude: 101.4500 },
	{ id: "1502", name: "Merangin", province: "Jambi", latitude: -2.0833, longitude: 102.0833 },
	{ id: "1503", name: "Sarolangun", province: "Jambi", latitude: -2.3167, longitude: 102.7000 },
	{ id: "1504", name: "Batanghari", province: "Jambi", latitude: -1.5833, longitude: 103.2667 },
	{ id: "1505", name: "Muaro Jambi", province: "Jambi", latitude: -1.5500, longitude: 103.7833 },
	{ id: "1506", name: "Tanjung Jabung Timur", province: "Jambi", latitude: -1.0833, longitude: 104.2500 },
	{ id: "1507", name: "Tanjung Jabung Barat", province: "Jambi", latitude: -1.1833, longitude: 103.4667 },
	{ id: "1508", name: "Tebo", province: "Jambi", latitude: -1.5167, longitude: 102.4000 },
	{ id: "1509", name: "Bungo", province: "Jambi", latitude: -1.5000, longitude: 102.1667 },
	{ id: "1571", name: "Kota Jambi", province: "Jambi", latitude: -1.6101, longitude: 103.6131 },
	{ id: "1572", name: "Kota Sungai Penuh", province: "Jambi", latitude: -2.0833, longitude: 101.3833 },

	// ============================================================
	// SUMATERA SELATAN (17 Kab/Kota)
	// ============================================================
	{ id: "1601", name: "Ogan Komering Ulu", province: "Sumatera Selatan", latitude: -4.0833, longitude: 104.0333 },
	{ id: "1602", name: "Ogan Komering Ilir", province: "Sumatera Selatan", latitude: -3.2500, longitude: 105.3333 },
	{ id: "1603", name: "Muara Enim", province: "Sumatera Selatan", latitude: -3.6833, longitude: 103.9333 },
	{ id: "1604", name: "Lahat", province: "Sumatera Selatan", latitude: -3.7833, longitude: 103.5333 },
	{ id: "1605", name: "Musi Rawas", province: "Sumatera Selatan", latitude: -2.9333, longitude: 102.9167 },
	{ id: "1606", name: "Musi Banyuasin", province: "Sumatera Selatan", latitude: -2.6167, longitude: 104.6000 },
	{ id: "1607", name: "Banyuasin", province: "Sumatera Selatan", latitude: -2.3833, longitude: 104.7833 },
	{ id: "1608", name: "Ogan Komering Ulu Selatan", province: "Sumatera Selatan", latitude: -4.8333, longitude: 103.9500 },
	{ id: "1609", name: "Ogan Komering Ulu Timur", province: "Sumatera Selatan", latitude: -3.7500, longitude: 104.5333 },
	{ id: "1610", name: "Ogan Ilir", province: "Sumatera Selatan", latitude: -3.2000, longitude: 104.6333 },
	{ id: "1611", name: "Empat Lawang", province: "Sumatera Selatan", latitude: -3.8333, longitude: 103.2333 },
	{ id: "1612", name: "Penukal Abab Lematang Ilir", province: "Sumatera Selatan", latitude: -3.3833, longitude: 103.8833 },
	{ id: "1613", name: "Musi Rawas Utara", province: "Sumatera Selatan", latitude: -2.7167, longitude: 103.0833 },
	{ id: "1671", name: "Kota Palembang", province: "Sumatera Selatan", latitude: -2.9761, longitude: 104.7754 },
	{ id: "1672", name: "Kota Prabumulih", province: "Sumatera Selatan", latitude: -3.4333, longitude: 104.2333 },
	{ id: "1673", name: "Kota Pagar Alam", province: "Sumatera Selatan", latitude: -4.0250, longitude: 103.2471 },
	{ id: "1674", name: "Kota Lubuk Linggau", province: "Sumatera Selatan", latitude: -3.2897, longitude: 102.8558 },

	// ============================================================
	// BENGKULU (10 Kab/Kota)
	// ============================================================
	{ id: "1701", name: "Bengkulu Selatan", province: "Bengkulu", latitude: -4.4333, longitude: 102.9333 },
	{ id: "1702", name: "Rejang Lebong", province: "Bengkulu", latitude: -3.4500, longitude: 102.6500 },
	{ id: "1703", name: "Bengkulu Utara", province: "Bengkulu", latitude: -3.4167, longitude: 102.1667 },
	{ id: "1704", name: "Kaur", province: "Bengkulu", latitude: -4.6500, longitude: 103.3833 },
	{ id: "1705", name: "Seluma", province: "Bengkulu", latitude: -3.9500, longitude: 102.3500 },
	{ id: "1706", name: "Mukomuko", province: "Bengkulu", latitude: -2.5833, longitude: 101.0833 },
	{ id: "1707", name: "Lebong", province: "Bengkulu", latitude: -3.1500, longitude: 102.3000 },
	{ id: "1708", name: "Kepahiang", province: "Bengkulu", latitude: -3.6167, longitude: 102.5833 },
	{ id: "1709", name: "Bengkulu Tengah", province: "Bengkulu", latitude: -3.6000, longitude: 102.2500 },
	{ id: "1771", name: "Kota Bengkulu", province: "Bengkulu", latitude: -3.7928, longitude: 102.2608 },

	// ============================================================
	// LAMPUNG (15 Kab/Kota)
	// ============================================================
	{ id: "1801", name: "Lampung Barat", province: "Lampung", latitude: -5.0167, longitude: 104.0833 },
	{ id: "1802", name: "Tanggamus", province: "Lampung", latitude: -5.4333, longitude: 104.6167 },
	{ id: "1803", name: "Lampung Selatan", province: "Lampung", latitude: -5.5833, longitude: 105.5833 },
	{ id: "1804", name: "Lampung Timur", province: "Lampung", latitude: -5.3667, longitude: 105.7667 },
	{ id: "1805", name: "Lampung Tengah", province: "Lampung", latitude: -4.8333, longitude: 105.2500 },
	{ id: "1806", name: "Lampung Utara", province: "Lampung", latitude: -4.8333, longitude: 104.8833 },
	{ id: "1807", name: "Way Kanan", province: "Lampung", latitude: -4.4167, longitude: 104.5167 },
	{ id: "1808", name: "Tulang Bawang", province: "Lampung", latitude: -4.2000, longitude: 105.7000 },
	{ id: "1809", name: "Pesawaran", province: "Lampung", latitude: -5.3833, longitude: 105.0833 },
	{ id: "1810", name: "Pringsewu", province: "Lampung", latitude: -5.3667, longitude: 104.9333 },
	{ id: "1811", name: "Mesuji", province: "Lampung", latitude: -3.8500, longitude: 105.7833 },
	{ id: "1812", name: "Tulang Bawang Barat", province: "Lampung", latitude: -4.3333, longitude: 105.2000 },
	{ id: "1813", name: "Pesisir Barat", province: "Lampung", latitude: -5.1833, longitude: 103.9833 },
	{ id: "1871", name: "Kota Bandar Lampung", province: "Lampung", latitude: -5.4500, longitude: 105.2667 },
	{ id: "1872", name: "Kota Metro", province: "Lampung", latitude: -5.1135, longitude: 105.3068 },

	// ============================================================
	// KEPULAUAN BANGKA BELITUNG (7 Kab/Kota)
	// ============================================================
	{ id: "1901", name: "Bangka", province: "Kepulauan Bangka Belitung", latitude: -2.0000, longitude: 105.9167 },
	{ id: "1902", name: "Belitung", province: "Kepulauan Bangka Belitung", latitude: -2.7833, longitude: 107.6500 },
	{ id: "1903", name: "Bangka Barat", province: "Kepulauan Bangka Belitung", latitude: -2.0833, longitude: 105.2500 },
	{ id: "1904", name: "Bangka Tengah", province: "Kepulauan Bangka Belitung", latitude: -2.3000, longitude: 106.1833 },
	{ id: "1905", name: "Bangka Selatan", province: "Kepulauan Bangka Belitung", latitude: -2.8167, longitude: 106.1167 },
	{ id: "1906", name: "Belitung Timur", province: "Kepulauan Bangka Belitung", latitude: -2.8500, longitude: 108.1667 },
	{ id: "1971", name: "Kota Pangkalpinang", province: "Kepulauan Bangka Belitung", latitude: -2.1333, longitude: 106.1167 },

	// ============================================================
	// KEPULAUAN RIAU (7 Kab/Kota)
	// ============================================================
	{ id: "2101", name: "Karimun", province: "Kepulauan Riau", latitude: 1.0167, longitude: 103.4167 },
	{ id: "2102", name: "Bintan", province: "Kepulauan Riau", latitude: 1.0333, longitude: 104.5167 },
	{ id: "2103", name: "Natuna", province: "Kepulauan Riau", latitude: 3.8000, longitude: 108.3833 },
	{ id: "2104", name: "Lingga", province: "Kepulauan Riau", latitude: -0.2167, longitude: 104.6000 },
	{ id: "2105", name: "Kepulauan Anambas", province: "Kepulauan Riau", latitude: 3.2500, longitude: 106.2500 },
	{ id: "2171", name: "Kota Batam", province: "Kepulauan Riau", latitude: 1.0456, longitude: 104.0305 },
	{ id: "2172", name: "Kota Tanjung Pinang", province: "Kepulauan Riau", latitude: 0.9189, longitude: 104.4417 },

	// ============================================================
	// DKI JAKARTA (6 Kab/Kota)
	// ============================================================
	{ id: "3101", name: "Kepulauan Seribu", province: "DKI Jakarta", latitude: -5.6000, longitude: 106.5500 },
	{ id: "3171", name: "Jakarta Pusat", province: "DKI Jakarta", latitude: -6.1862, longitude: 106.8341 },
	{ id: "3172", name: "Jakarta Utara", province: "DKI Jakarta", latitude: -6.1384, longitude: 106.8628 },
	{ id: "3173", name: "Jakarta Barat", province: "DKI Jakarta", latitude: -6.1631, longitude: 106.7655 },
	{ id: "3174", name: "Jakarta Selatan", province: "DKI Jakarta", latitude: -6.2615, longitude: 106.8106 },
	{ id: "3175", name: "Jakarta Timur", province: "DKI Jakarta", latitude: -6.2250, longitude: 106.9004 },

	// ============================================================
	// JAWA BARAT (27 Kab/Kota)
	// ============================================================
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

	// ============================================================
	// JAWA TENGAH (35 Kab/Kota)
	// ============================================================
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

	// ============================================================
	// DI YOGYAKARTA (5 Kab/Kota)
	// ============================================================
	{ id: "3401", name: "Kulon Progo", province: "DI Yogyakarta", latitude: -7.8208, longitude: 110.1642 },
	{ id: "3402", name: "Bantul", province: "DI Yogyakarta", latitude: -7.8894, longitude: 110.3275 },
	{ id: "3403", name: "Gunungkidul", province: "DI Yogyakarta", latitude: -7.9880, longitude: 110.6047 },
	{ id: "3404", name: "Sleman", province: "DI Yogyakarta", latitude: -7.7156, longitude: 110.3556 },
	{ id: "3471", name: "Kota Yogyakarta", province: "DI Yogyakarta", latitude: -7.7956, longitude: 110.3695 },

	// ============================================================
	// JAWA TIMUR (38 Kab/Kota)
	// ============================================================
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

	// ============================================================
	// BANTEN (8 Kab/Kota)
	// ============================================================
	{ id: "3601", name: "Pandeglang", province: "Banten", latitude: -6.3089, longitude: 106.1048 },
	{ id: "3602", name: "Lebak", province: "Banten", latitude: -6.5624, longitude: 106.2520 },
	{ id: "3603", name: "Tangerang", province: "Banten", latitude: -6.2534, longitude: 106.6232 },
	{ id: "3604", name: "Serang", province: "Banten", latitude: -6.1098, longitude: 106.1504 },
	{ id: "3671", name: "Kota Tangerang", province: "Banten", latitude: -6.1781, longitude: 106.6319 },
	{ id: "3672", name: "Kota Cilegon", province: "Banten", latitude: -6.0157, longitude: 106.0506 },
	{ id: "3673", name: "Kota Serang", province: "Banten", latitude: -6.1098, longitude: 106.1504 },
	{ id: "3674", name: "Kota Tangerang Selatan", province: "Banten", latitude: -6.2886, longitude: 106.7199 },

	// ============================================================
	// BALI (9 Kab/Kota)
	// ============================================================
	{ id: "5101", name: "Jembrana", province: "Bali", latitude: -8.3617, longitude: 114.6416 },
	{ id: "5102", name: "Tabanan", province: "Bali", latitude: -8.5410, longitude: 115.1251 },
	{ id: "5103", name: "Badung", province: "Bali", latitude: -8.5819, longitude: 115.1770 },
	{ id: "5104", name: "Gianyar", province: "Bali", latitude: -8.5447, longitude: 115.3206 },
	{ id: "5105", name: "Klungkung", province: "Bali", latitude: -8.5361, longitude: 115.4065 },
	{ id: "5106", name: "Bangli", province: "Bali", latitude: -8.4541, longitude: 115.3556 },
	{ id: "5107", name: "Karangasem", province: "Bali", latitude: -8.4485, longitude: 115.6133 },
	{ id: "5108", name: "Buleleng", province: "Bali", latitude: -8.1128, longitude: 115.0878 },
	{ id: "5171", name: "Kota Denpasar", province: "Bali", latitude: -8.6705, longitude: 115.2126 },

	// ============================================================
	// NUSA TENGGARA BARAT (10 Kab/Kota)
	// ============================================================
	{ id: "5201", name: "Lombok Barat", province: "Nusa Tenggara Barat", latitude: -8.4853, longitude: 116.0963 },
	{ id: "5202", name: "Lombok Tengah", province: "Nusa Tenggara Barat", latitude: -8.7006, longitude: 116.2744 },
	{ id: "5203", name: "Lombok Timur", province: "Nusa Tenggara Barat", latitude: -8.4762, longitude: 116.5187 },
	{ id: "5204", name: "Sumbawa", province: "Nusa Tenggara Barat", latitude: -8.4833, longitude: 117.4167 },
	{ id: "5205", name: "Dompu", province: "Nusa Tenggara Barat", latitude: -8.5333, longitude: 118.4500 },
	{ id: "5206", name: "Bima", province: "Nusa Tenggara Barat", latitude: -8.4500, longitude: 118.6833 },
	{ id: "5207", name: "Sumbawa Barat", province: "Nusa Tenggara Barat", latitude: -8.7667, longitude: 116.8833 },
	{ id: "5208", name: "Lombok Utara", province: "Nusa Tenggara Barat", latitude: -8.3500, longitude: 116.3500 },
	{ id: "5271", name: "Kota Mataram", province: "Nusa Tenggara Barat", latitude: -8.5833, longitude: 116.1167 },
	{ id: "5272", name: "Kota Bima", province: "Nusa Tenggara Barat", latitude: -8.4608, longitude: 118.7267 },

	// ============================================================
	// NUSA TENGGARA TIMUR (22 Kab/Kota)
	// ============================================================
	{ id: "5301", name: "Sumba Barat", province: "Nusa Tenggara Timur", latitude: -9.6500, longitude: 119.3500 },
	{ id: "5302", name: "Sumba Timur", province: "Nusa Tenggara Timur", latitude: -9.9833, longitude: 120.2500 },
	{ id: "5303", name: "Kupang", province: "Nusa Tenggara Timur", latitude: -10.0833, longitude: 123.5833 },
	{ id: "5304", name: "Timor Tengah Selatan", province: "Nusa Tenggara Timur", latitude: -9.4500, longitude: 124.3000 },
	{ id: "5305", name: "Timor Tengah Utara", province: "Nusa Tenggara Timur", latitude: -9.4500, longitude: 124.6500 },
	{ id: "5306", name: "Belu", province: "Nusa Tenggara Timur", latitude: -9.1167, longitude: 124.9333 },
	{ id: "5307", name: "Alor", province: "Nusa Tenggara Timur", latitude: -8.2500, longitude: 124.7500 },
	{ id: "5308", name: "Lembata", province: "Nusa Tenggara Timur", latitude: -8.3667, longitude: 123.6833 },
	{ id: "5309", name: "Flores Timur", province: "Nusa Tenggara Timur", latitude: -8.3333, longitude: 122.8667 },
	{ id: "5310", name: "Sikka", province: "Nusa Tenggara Timur", latitude: -8.6500, longitude: 122.1333 },
	{ id: "5311", name: "Ende", province: "Nusa Tenggara Timur", latitude: -8.8500, longitude: 121.6500 },
	{ id: "5312", name: "Ngada", province: "Nusa Tenggara Timur", latitude: -8.6833, longitude: 121.0167 },
	{ id: "5313", name: "Manggarai", province: "Nusa Tenggara Timur", latitude: -8.5833, longitude: 120.4167 },
	{ id: "5314", name: "Rote Ndao", province: "Nusa Tenggara Timur", latitude: -10.7500, longitude: 123.0500 },
	{ id: "5315", name: "Manggarai Barat", province: "Nusa Tenggara Timur", latitude: -8.6500, longitude: 120.0333 },
	{ id: "5316", name: "Sumba Tengah", province: "Nusa Tenggara Timur", latitude: -9.5833, longitude: 119.5167 },
	{ id: "5317", name: "Sumba Barat Daya", province: "Nusa Tenggara Timur", latitude: -9.7333, longitude: 119.1000 },
	{ id: "5318", name: "Nagekeo", province: "Nusa Tenggara Timur", latitude: -8.7500, longitude: 121.2833 },
	{ id: "5319", name: "Manggarai Timur", province: "Nusa Tenggara Timur", latitude: -8.6333, longitude: 120.6667 },
	{ id: "5320", name: "Sabu Raijua", province: "Nusa Tenggara Timur", latitude: -10.5000, longitude: 121.8333 },
	{ id: "5321", name: "Malaka", province: "Nusa Tenggara Timur", latitude: -9.5667, longitude: 124.9167 },
	{ id: "5371", name: "Kota Kupang", province: "Nusa Tenggara Timur", latitude: -10.1772, longitude: 123.6070 },

	// ============================================================
	// KALIMANTAN BARAT (14 Kab/Kota)
	// ============================================================
	{ id: "6101", name: "Sambas", province: "Kalimantan Barat", latitude: 1.3333, longitude: 109.2833 },
	{ id: "6102", name: "Bengkayang", province: "Kalimantan Barat", latitude: 0.8333, longitude: 109.5000 },
	{ id: "6103", name: "Landak", province: "Kalimantan Barat", latitude: 0.3000, longitude: 109.6833 },
	{ id: "6104", name: "Mempawah", province: "Kalimantan Barat", latitude: 0.1333, longitude: 109.1333 },
	{ id: "6105", name: "Sanggau", province: "Kalimantan Barat", latitude: 0.1333, longitude: 110.5833 },
	{ id: "6106", name: "Ketapang", province: "Kalimantan Barat", latitude: -1.8500, longitude: 109.9833 },
	{ id: "6107", name: "Sintang", province: "Kalimantan Barat", latitude: 0.0833, longitude: 111.5000 },
	{ id: "6108", name: "Kapuas Hulu", province: "Kalimantan Barat", latitude: 0.9500, longitude: 112.9333 },
	{ id: "6109", name: "Sekadau", province: "Kalimantan Barat", latitude: 0.0500, longitude: 110.8667 },
	{ id: "6110", name: "Melawi", province: "Kalimantan Barat", latitude: -0.3000, longitude: 111.6333 },
	{ id: "6111", name: "Kayong Utara", province: "Kalimantan Barat", latitude: -1.5333, longitude: 109.9500 },
	{ id: "6112", name: "Kubu Raya", province: "Kalimantan Barat", latitude: -0.0833, longitude: 109.4000 },
	{ id: "6171", name: "Kota Pontianak", province: "Kalimantan Barat", latitude: -0.0226, longitude: 109.3431 },
	{ id: "6172", name: "Kota Singkawang", province: "Kalimantan Barat", latitude: 0.9050, longitude: 108.9862 },

	// ============================================================
	// KALIMANTAN TENGAH (14 Kab/Kota)
	// ============================================================
	{ id: "6201", name: "Kotawaringin Barat", province: "Kalimantan Tengah", latitude: -2.6833, longitude: 111.6333 },
	{ id: "6202", name: "Kotawaringin Timur", province: "Kalimantan Tengah", latitude: -2.3833, longitude: 112.9833 },
	{ id: "6203", name: "Kapuas", province: "Kalimantan Tengah", latitude: -2.0000, longitude: 114.3667 },
	{ id: "6204", name: "Barito Selatan", province: "Kalimantan Tengah", latitude: -2.2667, longitude: 114.8000 },
	{ id: "6205", name: "Barito Utara", province: "Kalimantan Tengah", latitude: -1.0000, longitude: 115.3333 },
	{ id: "6206", name: "Sukamara", province: "Kalimantan Tengah", latitude: -2.8333, longitude: 111.0000 },
	{ id: "6207", name: "Lamandau", province: "Kalimantan Tengah", latitude: -2.2500, longitude: 111.2333 },
	{ id: "6208", name: "Seruyan", province: "Kalimantan Tengah", latitude: -2.7500, longitude: 112.1333 },
	{ id: "6209", name: "Katingan", province: "Kalimantan Tengah", latitude: -1.8333, longitude: 113.3833 },
	{ id: "6210", name: "Pulang Pisau", province: "Kalimantan Tengah", latitude: -2.6500, longitude: 114.1500 },
	{ id: "6211", name: "Gunung Mas", province: "Kalimantan Tengah", latitude: -1.2667, longitude: 113.4500 },
	{ id: "6212", name: "Barito Timur", province: "Kalimantan Tengah", latitude: -1.7667, longitude: 115.2000 },
	{ id: "6213", name: "Murung Raya", province: "Kalimantan Tengah", latitude: -0.6000, longitude: 114.3667 },
	{ id: "6271", name: "Kota Palangka Raya", province: "Kalimantan Tengah", latitude: -2.2136, longitude: 113.9108 },

	// ============================================================
	// KALIMANTAN SELATAN (13 Kab/Kota)
	// ============================================================
	{ id: "6301", name: "Tanah Laut", province: "Kalimantan Selatan", latitude: -3.6833, longitude: 114.8333 },
	{ id: "6302", name: "Kotabaru", province: "Kalimantan Selatan", latitude: -3.0000, longitude: 116.0000 },
	{ id: "6303", name: "Banjar", province: "Kalimantan Selatan", latitude: -3.3333, longitude: 115.0833 },
	{ id: "6304", name: "Barito Kuala", province: "Kalimantan Selatan", latitude: -3.1000, longitude: 114.5833 },
	{ id: "6305", name: "Tapin", province: "Kalimantan Selatan", latitude: -3.1333, longitude: 114.9667 },
	{ id: "6306", name: "Hulu Sungai Selatan", province: "Kalimantan Selatan", latitude: -2.8000, longitude: 115.2333 },
	{ id: "6307", name: "Hulu Sungai Tengah", province: "Kalimantan Selatan", latitude: -2.5833, longitude: 115.5833 },
	{ id: "6308", name: "Hulu Sungai Utara", province: "Kalimantan Selatan", latitude: -2.3833, longitude: 115.1500 },
	{ id: "6309", name: "Tabalong", province: "Kalimantan Selatan", latitude: -2.0000, longitude: 115.6667 },
	{ id: "6310", name: "Tanah Bumbu", province: "Kalimantan Selatan", latitude: -3.4333, longitude: 115.6667 },
	{ id: "6311", name: "Balangan", province: "Kalimantan Selatan", latitude: -2.3000, longitude: 115.6500 },
	{ id: "6371", name: "Kota Banjarmasin", province: "Kalimantan Selatan", latitude: -3.3167, longitude: 114.5900 },
	{ id: "6372", name: "Kota Banjarbaru", province: "Kalimantan Selatan", latitude: -3.4440, longitude: 114.8430 },

	// ============================================================
	// KALIMANTAN TIMUR (10 Kab/Kota)
	// ============================================================
	{ id: "6401", name: "Paser", province: "Kalimantan Timur", latitude: -1.8333, longitude: 116.0000 },
	{ id: "6402", name: "Kutai Barat", province: "Kalimantan Timur", latitude: 0.3833, longitude: 115.7000 },
	{ id: "6403", name: "Kutai Kartanegara", province: "Kalimantan Timur", latitude: -0.3333, longitude: 116.9833 },
	{ id: "6404", name: "Kutai Timur", province: "Kalimantan Timur", latitude: 0.5500, longitude: 117.0667 },
	{ id: "6405", name: "Berau", province: "Kalimantan Timur", latitude: 2.1333, longitude: 117.4833 },
	{ id: "6409", name: "Penajam Paser Utara", province: "Kalimantan Timur", latitude: -1.2833, longitude: 116.6833 },
	{ id: "6411", name: "Mahakam Ulu", province: "Kalimantan Timur", latitude: 0.5667, longitude: 115.4500 },
	{ id: "6471", name: "Kota Balikpapan", province: "Kalimantan Timur", latitude: -1.2654, longitude: 116.8311 },
	{ id: "6472", name: "Kota Samarinda", province: "Kalimantan Timur", latitude: -0.4948, longitude: 117.1436 },
	{ id: "6474", name: "Kota Bontang", province: "Kalimantan Timur", latitude: 0.1333, longitude: 117.5000 },

	// ============================================================
	// KALIMANTAN UTARA (5 Kab/Kota)
	// ============================================================
	{ id: "6501", name: "Malinau", province: "Kalimantan Utara", latitude: 3.5833, longitude: 116.6333 },
	{ id: "6502", name: "Bulungan", province: "Kalimantan Utara", latitude: 2.6833, longitude: 117.1667 },
	{ id: "6503", name: "Tana Tidung", province: "Kalimantan Utara", latitude: 3.3500, longitude: 117.0333 },
	{ id: "6504", name: "Nunukan", province: "Kalimantan Utara", latitude: 4.1333, longitude: 117.6500 },
	{ id: "6571", name: "Kota Tarakan", province: "Kalimantan Utara", latitude: 3.3275, longitude: 117.5789 },

	// ============================================================
	// SULAWESI UTARA (15 Kab/Kota)
	// ============================================================
	{ id: "7101", name: "Bolaang Mongondow", province: "Sulawesi Utara", latitude: 0.8167, longitude: 124.0167 },
	{ id: "7102", name: "Minahasa", province: "Sulawesi Utara", latitude: 1.2833, longitude: 124.9000 },
	{ id: "7103", name: "Kepulauan Sangihe", province: "Sulawesi Utara", latitude: 3.5000, longitude: 125.5667 },
	{ id: "7104", name: "Kepulauan Talaud", province: "Sulawesi Utara", latitude: 4.0667, longitude: 126.8500 },
	{ id: "7105", name: "Minahasa Selatan", province: "Sulawesi Utara", latitude: 1.1000, longitude: 124.5333 },
	{ id: "7106", name: "Minahasa Utara", province: "Sulawesi Utara", latitude: 1.4333, longitude: 125.0000 },
	{ id: "7107", name: "Bolaang Mongondow Utara", province: "Sulawesi Utara", latitude: 0.7833, longitude: 123.6833 },
	{ id: "7108", name: "Kepulauan Siau Tagulandang Biaro", province: "Sulawesi Utara", latitude: 2.7167, longitude: 125.3833 },
	{ id: "7109", name: "Minahasa Tenggara", province: "Sulawesi Utara", latitude: 1.0333, longitude: 124.8167 },
	{ id: "7110", name: "Bolaang Mongondow Selatan", province: "Sulawesi Utara", latitude: 0.5333, longitude: 124.0667 },
	{ id: "7111", name: "Bolaang Mongondow Timur", province: "Sulawesi Utara", latitude: 0.7833, longitude: 124.4667 },
	{ id: "7171", name: "Kota Manado", province: "Sulawesi Utara", latitude: 1.4748, longitude: 124.8421 },
	{ id: "7172", name: "Kota Bitung", province: "Sulawesi Utara", latitude: 1.4404, longitude: 125.1217 },
	{ id: "7173", name: "Kota Tomohon", province: "Sulawesi Utara", latitude: 1.3178, longitude: 124.8396 },
	{ id: "7174", name: "Kota Kotamobagu", province: "Sulawesi Utara", latitude: 0.7247, longitude: 124.3198 },

	// ============================================================
	// SULAWESI TENGAH (13 Kab/Kota)
	// ============================================================
	{ id: "7201", name: "Banggai Kepulauan", province: "Sulawesi Tengah", latitude: -1.5500, longitude: 123.5333 },
	{ id: "7202", name: "Banggai", province: "Sulawesi Tengah", latitude: -1.1000, longitude: 122.9000 },
	{ id: "7203", name: "Morowali", province: "Sulawesi Tengah", latitude: -2.3167, longitude: 121.6500 },
	{ id: "7204", name: "Poso", province: "Sulawesi Tengah", latitude: -1.6667, longitude: 120.7833 },
	{ id: "7205", name: "Donggala", province: "Sulawesi Tengah", latitude: -0.6833, longitude: 119.7333 },
	{ id: "7206", name: "Toli-Toli", province: "Sulawesi Tengah", latitude: 1.0500, longitude: 120.7667 },
	{ id: "7207", name: "Buol", province: "Sulawesi Tengah", latitude: 1.0500, longitude: 121.4667 },
	{ id: "7208", name: "Parigi Moutong", province: "Sulawesi Tengah", latitude: -0.3333, longitude: 120.2333 },
	{ id: "7209", name: "Tojo Una-Una", province: "Sulawesi Tengah", latitude: -1.1333, longitude: 121.7500 },
	{ id: "7210", name: "Sigi", province: "Sulawesi Tengah", latitude: -1.3333, longitude: 119.8833 },
	{ id: "7211", name: "Banggai Laut", province: "Sulawesi Tengah", latitude: -1.6333, longitude: 123.4833 },
	{ id: "7212", name: "Morowali Utara", province: "Sulawesi Tengah", latitude: -1.7000, longitude: 121.3333 },
	{ id: "7271", name: "Kota Palu", province: "Sulawesi Tengah", latitude: -0.8917, longitude: 119.8707 },

	// ============================================================
	// SULAWESI SELATAN (24 Kab/Kota)
	// ============================================================
	{ id: "7301", name: "Kepulauan Selayar", province: "Sulawesi Selatan", latitude: -6.0667, longitude: 120.5167 },
	{ id: "7302", name: "Bulukumba", province: "Sulawesi Selatan", latitude: -5.5500, longitude: 120.1833 },
	{ id: "7303", name: "Bantaeng", province: "Sulawesi Selatan", latitude: -5.5333, longitude: 119.9500 },
	{ id: "7304", name: "Jeneponto", province: "Sulawesi Selatan", latitude: -5.6333, longitude: 119.7500 },
	{ id: "7305", name: "Takalar", province: "Sulawesi Selatan", latitude: -5.4333, longitude: 119.4833 },
	{ id: "7306", name: "Gowa", province: "Sulawesi Selatan", latitude: -5.3333, longitude: 119.4333 },
	{ id: "7307", name: "Sinjai", province: "Sulawesi Selatan", latitude: -5.2000, longitude: 120.2500 },
	{ id: "7308", name: "Maros", province: "Sulawesi Selatan", latitude: -4.9833, longitude: 119.5833 },
	{ id: "7309", name: "Pangkajene dan Kepulauan", province: "Sulawesi Selatan", latitude: -4.7333, longitude: 119.5333 },
	{ id: "7310", name: "Barru", province: "Sulawesi Selatan", latitude: -4.4000, longitude: 119.6333 },
	{ id: "7311", name: "Bone", province: "Sulawesi Selatan", latitude: -4.5500, longitude: 120.2833 },
	{ id: "7312", name: "Soppeng", province: "Sulawesi Selatan", latitude: -4.3333, longitude: 120.0167 },
	{ id: "7313", name: "Wajo", province: "Sulawesi Selatan", latitude: -4.0000, longitude: 120.1333 },
	{ id: "7314", name: "Sidenreng Rappang", province: "Sulawesi Selatan", latitude: -3.8500, longitude: 119.9833 },
	{ id: "7315", name: "Pinrang", province: "Sulawesi Selatan", latitude: -3.7667, longitude: 119.6167 },
	{ id: "7316", name: "Enrekang", province: "Sulawesi Selatan", latitude: -3.5500, longitude: 119.8000 },
	{ id: "7317", name: "Luwu", province: "Sulawesi Selatan", latitude: -2.9500, longitude: 120.3500 },
	{ id: "7318", name: "Tana Toraja", province: "Sulawesi Selatan", latitude: -3.0333, longitude: 119.8833 },
	{ id: "7322", name: "Luwu Utara", province: "Sulawesi Selatan", latitude: -2.5333, longitude: 120.4333 },
	{ id: "7325", name: "Luwu Timur", province: "Sulawesi Selatan", latitude: -2.5667, longitude: 121.1000 },
	{ id: "7326", name: "Toraja Utara", province: "Sulawesi Selatan", latitude: -2.9333, longitude: 119.8167 },
	{ id: "7371", name: "Kota Makassar", province: "Sulawesi Selatan", latitude: -5.1477, longitude: 119.4327 },
	{ id: "7372", name: "Kota Parepare", province: "Sulawesi Selatan", latitude: -4.0135, longitude: 119.6455 },
	{ id: "7373", name: "Kota Palopo", province: "Sulawesi Selatan", latitude: -2.9922, longitude: 120.1969 },

	// ============================================================
	// SULAWESI TENGGARA (17 Kab/Kota)
	// ============================================================
	{ id: "7401", name: "Buton", province: "Sulawesi Tenggara", latitude: -5.3333, longitude: 122.6000 },
	{ id: "7402", name: "Muna", province: "Sulawesi Tenggara", latitude: -4.8833, longitude: 122.5833 },
	{ id: "7403", name: "Konawe", province: "Sulawesi Tenggara", latitude: -3.8333, longitude: 122.1167 },
	{ id: "7404", name: "Kolaka", province: "Sulawesi Tenggara", latitude: -4.0667, longitude: 121.5667 },
	{ id: "7405", name: "Konawe Selatan", province: "Sulawesi Tenggara", latitude: -4.2167, longitude: 122.4000 },
	{ id: "7406", name: "Bombana", province: "Sulawesi Tenggara", latitude: -4.6333, longitude: 121.9000 },
	{ id: "7407", name: "Wakatobi", province: "Sulawesi Tenggara", latitude: -5.3167, longitude: 123.5333 },
	{ id: "7408", name: "Kolaka Utara", province: "Sulawesi Tenggara", latitude: -3.3333, longitude: 121.5167 },
	{ id: "7409", name: "Buton Utara", province: "Sulawesi Tenggara", latitude: -5.0000, longitude: 123.0833 },
	{ id: "7410", name: "Konawe Utara", province: "Sulawesi Tenggara", latitude: -3.3667, longitude: 122.0833 },
	{ id: "7411", name: "Kolaka Timur", province: "Sulawesi Tenggara", latitude: -4.0167, longitude: 121.7000 },
	{ id: "7412", name: "Konawe Kepulauan", province: "Sulawesi Tenggara", latitude: -4.1000, longitude: 123.0000 },
	{ id: "7413", name: "Muna Barat", province: "Sulawesi Tenggara", latitude: -4.8500, longitude: 122.4500 },
	{ id: "7414", name: "Buton Tengah", province: "Sulawesi Tenggara", latitude: -5.3667, longitude: 122.5667 },
	{ id: "7415", name: "Buton Selatan", province: "Sulawesi Tenggara", latitude: -5.5833, longitude: 122.6000 },
	{ id: "7471", name: "Kota Kendari", province: "Sulawesi Tenggara", latitude: -3.9985, longitude: 122.5129 },
	{ id: "7472", name: "Kota Baubau", province: "Sulawesi Tenggara", latitude: -5.4711, longitude: 122.6150 },

	// ============================================================
	// GORONTALO (6 Kab/Kota)
	// ============================================================
	{ id: "7501", name: "Boalemo", province: "Gorontalo", latitude: 0.6000, longitude: 122.1667 },
	{ id: "7502", name: "Gorontalo", province: "Gorontalo", latitude: 0.6000, longitude: 122.8333 },
	{ id: "7503", name: "Pohuwato", province: "Gorontalo", latitude: 0.6833, longitude: 121.4833 },
	{ id: "7504", name: "Bone Bolango", province: "Gorontalo", latitude: 0.5667, longitude: 123.1833 },
	{ id: "7505", name: "Gorontalo Utara", province: "Gorontalo", latitude: 0.8333, longitude: 122.4000 },
	{ id: "7571", name: "Kota Gorontalo", province: "Gorontalo", latitude: 0.5435, longitude: 123.0568 },

	// ============================================================
	// SULAWESI BARAT (6 Kab/Kota)
	// ============================================================
	{ id: "7601", name: "Majene", province: "Sulawesi Barat", latitude: -3.5167, longitude: 118.9833 },
	{ id: "7602", name: "Polewali Mandar", province: "Sulawesi Barat", latitude: -3.4167, longitude: 119.0500 },
	{ id: "7603", name: "Mamasa", province: "Sulawesi Barat", latitude: -2.9500, longitude: 119.3333 },
	{ id: "7604", name: "Mamuju", province: "Sulawesi Barat", latitude: -2.6833, longitude: 118.9000 },
	{ id: "7605", name: "Pasangkayu", province: "Sulawesi Barat", latitude: -1.5833, longitude: 119.3333 },
	{ id: "7606", name: "Mamuju Tengah", province: "Sulawesi Barat", latitude: -2.0000, longitude: 119.0833 },

	// ============================================================
	// MALUKU (11 Kab/Kota)
	// ============================================================
	{ id: "8101", name: "Maluku Tenggara Barat", province: "Maluku", latitude: -7.6167, longitude: 131.3333 },
	{ id: "8102", name: "Maluku Tenggara", province: "Maluku", latitude: -5.6333, longitude: 132.7333 },
	{ id: "8103", name: "Maluku Tengah", province: "Maluku", latitude: -3.3667, longitude: 128.2500 },
	{ id: "8104", name: "Buru", province: "Maluku", latitude: -3.3833, longitude: 126.6833 },
	{ id: "8105", name: "Kepulauan Aru", province: "Maluku", latitude: -6.3333, longitude: 134.7500 },
	{ id: "8106", name: "Seram Bagian Barat", province: "Maluku", latitude: -2.9833, longitude: 128.1000 },
	{ id: "8107", name: "Seram Bagian Timur", province: "Maluku", latitude: -3.1500, longitude: 130.6167 },
	{ id: "8108", name: "Maluku Barat Daya", province: "Maluku", latitude: -7.6500, longitude: 127.6000 },
	{ id: "8109", name: "Buru Selatan", province: "Maluku", latitude: -3.5000, longitude: 126.4000 },
	{ id: "8171", name: "Kota Ambon", province: "Maluku", latitude: -3.6954, longitude: 128.1814 },
	{ id: "8172", name: "Kota Tual", province: "Maluku", latitude: -5.6387, longitude: 132.7473 },

	// ============================================================
	// MALUKU UTARA (10 Kab/Kota)
	// ============================================================
	{ id: "8201", name: "Halmahera Barat", province: "Maluku Utara", latitude: 1.2333, longitude: 127.6500 },
	{ id: "8202", name: "Halmahera Tengah", province: "Maluku Utara", latitude: 0.3167, longitude: 127.9667 },
	{ id: "8203", name: "Kepulauan Sula", province: "Maluku Utara", latitude: -1.8667, longitude: 125.3833 },
	{ id: "8204", name: "Halmahera Selatan", province: "Maluku Utara", latitude: -0.4333, longitude: 127.9333 },
	{ id: "8205", name: "Halmahera Utara", province: "Maluku Utara", latitude: 1.8500, longitude: 127.9833 },
	{ id: "8206", name: "Halmahera Timur", province: "Maluku Utara", latitude: 0.8667, longitude: 128.4000 },
	{ id: "8207", name: "Pulau Morotai", province: "Maluku Utara", latitude: 2.3000, longitude: 128.2833 },
	{ id: "8208", name: "Pulau Taliabu", province: "Maluku Utara", latitude: -1.8333, longitude: 124.6333 },
	{ id: "8271", name: "Kota Ternate", province: "Maluku Utara", latitude: 0.7833, longitude: 127.3667 },
	{ id: "8272", name: "Kota Tidore Kepulauan", province: "Maluku Utara", latitude: 0.6833, longitude: 127.4000 },

	// ============================================================
	// PAPUA (13 Kab/Kota)
	// ============================================================
	{ id: "9101", name: "Merauke", province: "Papua", latitude: -8.5000, longitude: 140.3333 },
	{ id: "9102", name: "Jayawijaya", province: "Papua", latitude: -4.0000, longitude: 138.9500 },
	{ id: "9103", name: "Jayapura", province: "Papua", latitude: -2.6167, longitude: 140.5000 },
	{ id: "9104", name: "Nabire", province: "Papua", latitude: -3.3667, longitude: 135.4833 },
	{ id: "9105", name: "Kepulauan Yapen", province: "Papua", latitude: -1.8167, longitude: 136.2833 },
	{ id: "9106", name: "Biak Numfor", province: "Papua", latitude: -1.0500, longitude: 136.0833 },
	{ id: "9107", name: "Sarmi", province: "Papua", latitude: -1.8500, longitude: 138.7500 },
	{ id: "9108", name: "Keerom", province: "Papua", latitude: -3.3333, longitude: 140.8667 },
	{ id: "9109", name: "Mamberamo Raya", province: "Papua", latitude: -2.7333, longitude: 137.7167 },
	{ id: "9110", name: "Waropen", province: "Papua", latitude: -2.3000, longitude: 136.7500 },
	{ id: "9111", name: "Supiori", province: "Papua", latitude: -0.7833, longitude: 135.6167 },
	{ id: "9112", name: "Mamberamo Tengah", province: "Papua", latitude: -3.2500, longitude: 138.5000 },
	{ id: "9171", name: "Kota Jayapura", province: "Papua", latitude: -2.5337, longitude: 140.7181 },

	// ============================================================
	// PAPUA BARAT (13 Kab/Kota)
	// ============================================================
	{ id: "9201", name: "Fakfak", province: "Papua Barat", latitude: -2.9333, longitude: 132.2833 },
	{ id: "9202", name: "Kaimana", province: "Papua Barat", latitude: -3.6500, longitude: 133.7667 },
	{ id: "9203", name: "Teluk Wondama", province: "Papua Barat", latitude: -2.5000, longitude: 134.5167 },
	{ id: "9204", name: "Teluk Bintuni", province: "Papua Barat", latitude: -2.1167, longitude: 133.4667 },
	{ id: "9205", name: "Manokwari", province: "Papua Barat", latitude: -0.8667, longitude: 134.0833 },
	{ id: "9206", name: "Sorong Selatan", province: "Papua Barat", latitude: -1.5500, longitude: 132.3000 },
	{ id: "9207", name: "Sorong", province: "Papua Barat", latitude: -0.8667, longitude: 131.2500 },
	{ id: "9208", name: "Raja Ampat", province: "Papua Barat", latitude: -0.5000, longitude: 130.6000 },
	{ id: "9209", name: "Tambraw", province: "Papua Barat", latitude: -0.8333, longitude: 132.0833 },
	{ id: "9210", name: "Maybrat", province: "Papua Barat", latitude: -1.3500, longitude: 132.4333 },
	{ id: "9211", name: "Manokwari Selatan", province: "Papua Barat", latitude: -1.3333, longitude: 134.0833 },
	{ id: "9212", name: "Pegunungan Arfak", province: "Papua Barat", latitude: -1.3000, longitude: 133.8500 },
	{ id: "9271", name: "Kota Sorong", province: "Papua Barat", latitude: -0.8755, longitude: 131.2870 },

	// ============================================================
	// PAPUA SELATAN (4 Kab/Kota)
	// ============================================================
	{ id: "9301", name: "Merauke", province: "Papua Selatan", latitude: -8.5000, longitude: 140.3333 },
	{ id: "9302", name: "Boven Digoel", province: "Papua Selatan", latitude: -5.9667, longitude: 140.3000 },
	{ id: "9303", name: "Mappi", province: "Papua Selatan", latitude: -6.8333, longitude: 139.0000 },
	{ id: "9304", name: "Asmat", province: "Papua Selatan", latitude: -5.3667, longitude: 138.6667 },

	// ============================================================
	// PAPUA TENGAH (8 Kab/Kota)
	// ============================================================
	{ id: "9401", name: "Nabire", province: "Papua Tengah", latitude: -3.3667, longitude: 135.4833 },
	{ id: "9402", name: "Paniai", province: "Papua Tengah", latitude: -3.7167, longitude: 136.3833 },
	{ id: "9403", name: "Mimika", province: "Papua Tengah", latitude: -4.5333, longitude: 136.8833 },
	{ id: "9404", name: "Puncak Jaya", province: "Papua Tengah", latitude: -3.6167, longitude: 137.2000 },
	{ id: "9405", name: "Puncak", province: "Papua Tengah", latitude: -3.6500, longitude: 137.0500 },
	{ id: "9406", name: "Dogiyai", province: "Papua Tengah", latitude: -3.9000, longitude: 135.8333 },
	{ id: "9407", name: "Intan Jaya", province: "Papua Tengah", latitude: -3.5500, longitude: 136.5000 },
	{ id: "9408", name: "Deiyai", province: "Papua Tengah", latitude: -3.8667, longitude: 136.1000 },

	// ============================================================
	// PAPUA PEGUNUNGAN (8 Kab/Kota)
	// ============================================================
	{ id: "9501", name: "Jayawijaya", province: "Papua Pegunungan", latitude: -4.0000, longitude: 138.9500 },
	{ id: "9502", name: "Pegunungan Bintang", province: "Papua Pegunungan", latitude: -4.5000, longitude: 140.2000 },
	{ id: "9503", name: "Yahukimo", province: "Papua Pegunungan", latitude: -4.5333, longitude: 139.3000 },
	{ id: "9504", name: "Tolikara", province: "Papua Pegunungan", latitude: -3.7167, longitude: 138.0833 },
	{ id: "9505", name: "Lanny Jaya", province: "Papua Pegunungan", latitude: -3.8833, longitude: 137.9000 },
	{ id: "9506", name: "Nduga", province: "Papua Pegunungan", latitude: -4.3500, longitude: 138.0000 },
	{ id: "9507", name: "Yalimo", province: "Papua Pegunungan", latitude: -3.7000, longitude: 138.6500 },
	{ id: "9508", name: "Mamberamo Tengah", province: "Papua Pegunungan", latitude: -3.2500, longitude: 138.5000 },

	// ============================================================
	// PAPUA BARAT DAYA (6 Kab/Kota)
	// ============================================================
	{ id: "9601", name: "Sorong", province: "Papua Barat Daya", latitude: -0.8667, longitude: 131.2500 },
	{ id: "9602", name: "Sorong Selatan", province: "Papua Barat Daya", latitude: -1.5500, longitude: 132.3000 },
	{ id: "9603", name: "Raja Ampat", province: "Papua Barat Daya", latitude: -0.5000, longitude: 130.6000 },
	{ id: "9604", name: "Tambraw", province: "Papua Barat Daya", latitude: -0.8333, longitude: 132.0833 },
	{ id: "9605", name: "Maybrat", province: "Papua Barat Daya", latitude: -1.3500, longitude: 132.4333 },
	{ id: "9671", name: "Kota Sorong", province: "Papua Barat Daya", latitude: -0.8755, longitude: 131.2870 },
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
