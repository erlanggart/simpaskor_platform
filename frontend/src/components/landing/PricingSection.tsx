import React, { useState } from "react";
import {
	LuCheck,
	LuX,
	LuSend,
	LuLoader,
	LuMedal,
	LuCrown,
	LuTrophy,
} from "react-icons/lu";
import { api } from "../../utils/api";
import Swal from "sweetalert2";

type PackageTier = "BRONZE" | "SILVER" | "GOLD";

interface PackageFeature {
	name: string;
	bronze: boolean;
	silver: boolean;
	gold: boolean;
}

const packageFeatures: PackageFeature[] = [
	{ name: "Akses Sistem Penilaian", bronze: true, silver: true, gold: true },
	{ name: "Technical Meeting Aplikasi", bronze: true, silver: true, gold: true },
	{ name: "Laporan Digital", bronze: true, silver: true, gold: true },
	{ name: "Tim Pendamping", bronze: false, silver: true, gold: true },
	{ name: "Device Tablet", bronze: false, silver: true, gold: true },
	{ name: "Tim Rekap", bronze: false, silver: false, gold: true },
	{ name: "Penyusunan Materi Penilaian", bronze: false, silver: false, gold: true },
];

const packages = [
	{
		tier: "BRONZE" as PackageTier,
		name: "Paket Bronze",
		price: "Rp 500.000",
		icon: LuMedal,
		color: "amber",
		borderColor: "border-amber-400/50 dark:border-amber-500/30",
		bgGlow: "from-amber-500/10 to-amber-600/5",
		badgeClass: "bg-amber-500 text-white",
		btnClass: "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white",
		note: "Tim Pendamping (Online)",
	},
	{
		tier: "SILVER" as PackageTier,
		name: "Paket Silver",
		price: "Rp 1.000.000",
		icon: LuCrown,
		color: "gray",
		borderColor: "border-gray-300 dark:border-gray-400/30",
		bgGlow: "from-gray-300/20 to-gray-400/10",
		badgeClass: "bg-gradient-to-r from-gray-400 to-gray-500 text-white",
		btnClass: "bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-black text-white",
		featured: true,
		note: "Tim Pendamping (Offline) + Device Tablet (max 3 unit)",
	},
	{
		tier: "GOLD" as PackageTier,
		name: "Paket Gold",
		price: "Rp 1.500.000",
		icon: LuTrophy,
		color: "yellow",
		borderColor: "border-yellow-400/50 dark:border-yellow-500/30",
		bgGlow: "from-yellow-500/10 to-yellow-600/5",
		badgeClass: "bg-gradient-to-r from-yellow-400 to-yellow-500 text-white",
		btnClass: "bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white",
		note: null,
	},
];

const PricingSection: React.FC = () => {
	const [selectedPackage, setSelectedPackage] = useState<PackageTier | null>(null);
	const [showForm, setShowForm] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [formData, setFormData] = useState({
		namaPanitia: "",
		email: "",
		phone: "",
		namaEvent: "",
		lokasiEvent: "",
		namaInstansi: "",
	});

	const handleSelectPackage = (tier: PackageTier) => {
		setSelectedPackage(tier);
		setShowForm(true);
		// Scroll ke form
		setTimeout(() => {
			document.getElementById("pricing-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
		}, 100);
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!selectedPackage) return;

		// Validasi
		if (!formData.namaPanitia.trim() || !formData.email.trim() || !formData.namaEvent.trim() || !formData.lokasiEvent.trim() || !formData.namaInstansi.trim()) {
			Swal.fire({
				icon: "warning",
				title: "Data Belum Lengkap",
				text: "Mohon lengkapi semua data formulir.",
				confirmButtonColor: "#ef4444",
			});
			return;
		}

		setSubmitting(true);
		try {
			await api.post("/event-submissions", {
				namaPanitia: formData.namaPanitia.trim(),
				email: formData.email.trim(),
				phone: formData.phone.trim() || undefined,
				namaEvent: formData.namaEvent.trim(),
				lokasiEvent: formData.lokasiEvent.trim(),
				namaInstansi: formData.namaInstansi.trim(),
				packageTier: selectedPackage,
			});

			// Build WhatsApp message
			const packageLabel = selectedPackage === "BRONZE" ? "Paket Bronze (Rp 500.000)"
				: selectedPackage === "SILVER" ? "Paket Silver (Rp 1.000.000)"
				: "Paket Gold (Rp 1.500.000)";

			const waMessage = [
				"Halo Admin Simpaskor! 👋",
				"",
				"Saya ingin mendaftarkan event dengan detail berikut:",
				"",
				`📋 *Nama Panitia:* ${formData.namaPanitia.trim()}`,
				`📧 *Email:* ${formData.email.trim()}`,
				...(formData.phone.trim() ? [`📱 *No. HP:* ${formData.phone.trim()}`] : []),
				`🏆 *Nama Event:* ${formData.namaEvent.trim()}`,
				`📍 *Lokasi Event:* ${formData.lokasiEvent.trim()}`,
				`🏫 *Sekolah/Instansi:* ${formData.namaInstansi.trim()}`,
				`📦 *Paket Dipilih:* ${packageLabel}`,
				"",
				"Mohon informasi lebih lanjut untuk proses selanjutnya. Terima kasih! 🙏",
			].join("\n");

			const waNumber = "6285111209133";
			const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`;

			await Swal.fire({
				icon: "success",
				title: "Pendaftaran Berhasil!",
				html: `
					<p>Terima kasih telah mendaftarkan event Anda.</p>
					<p class="mt-2 text-sm text-gray-500">Anda akan diarahkan ke WhatsApp untuk konfirmasi ke admin Simpaskor.</p>
				`,
				confirmButtonText: "Lanjut ke WhatsApp",
				confirmButtonColor: "#25D366",
				allowOutsideClick: false,
				allowEscapeKey: false,
			});

			window.open(waUrl, "_blank");

			// Reset
			setFormData({ namaPanitia: "", email: "", phone: "", namaEvent: "", lokasiEvent: "", namaInstansi: "" });
			setSelectedPackage(null);
			setShowForm(false);
		} catch (err: any) {
			Swal.fire({
				icon: "error",
				title: "Gagal Mengirim",
				text: err.response?.data?.message || "Terjadi kesalahan. Silakan coba lagi.",
				confirmButtonColor: "#ef4444",
			});
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="relative z-10 w-full max-w-6xl mx-auto px-6 md:px-12 lg:px-16 py-8">
			{/* Header */}
			<div className="text-center mb-10">
				<p className="text-[10px] md:text-xs tracking-[0.3em] text-gray-400 dark:text-gray-400 font-medium mb-4">
					DAFTARKAN EVENT ANDA
				</p>
				<h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-none mb-3 landing-title-gradient-pricing">
					Pilih <span className="landing-title-gradient-pricing">Paket Anda</span>
				</h1>
				<div className="w-12 h-[1px] bg-gradient-to-r from-orange-500/50 to-transparent mx-auto mb-4" />
				<p className="text-sm md:text-base text-gray-500 dark:text-gray-500 leading-relaxed max-w-xl mx-auto">
					Kami menyediakan berbagai paket yang dapat disesuaikan dengan kebutuhan event Anda
				</p>
			</div>

			{/* Package Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-10">
				{packages.map((pkg) => {
					const Icon = pkg.icon;
					const isSelected = selectedPackage === pkg.tier;
					const isFeatured = pkg.featured;

					return (
						<div
							key={pkg.tier}
							className={`relative rounded-2xl border transition-all duration-300 overflow-hidden
								${isSelected
									? "ring-2 ring-red-500 border-red-500/50 dark:border-red-400/50 scale-[1.02]"
									: pkg.borderColor
								}
								${isFeatured ? "md:-mt-4 md:mb-4" : ""}
								bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm
								hover:shadow-lg dark:hover:shadow-2xl hover:shadow-gray-200/50 dark:hover:shadow-black/20
							`}
						>
							{/* Badge */}
							<div className="flex justify-center pt-5">
								<span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${pkg.badgeClass}`}>
									{pkg.tier}
								</span>
							</div>

							{/* Icon */}
							<div className="flex justify-center mt-4">
								<div className={`w-14 h-14 rounded-full bg-gradient-to-br ${pkg.bgGlow} flex items-center justify-center border border-gray-200/50 dark:border-white/[0.06]`}>
									<Icon className="w-7 h-7 text-gray-700 dark:text-gray-300" />
								</div>
							</div>

							{/* Name & Price */}
							<div className="text-center px-6 pt-4 pb-2">
								<h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1">
									{pkg.name}
								</h3>
								<p className={`text-2xl md:text-3xl font-black ${
									pkg.tier === "BRONZE"
										? "text-amber-600 dark:text-amber-400"
										: pkg.tier === "SILVER"
										? "text-gray-600 dark:text-gray-300"
										: "text-yellow-600 dark:text-yellow-400"
								}`}>
									{pkg.price}
								</p>
							</div>

							{/* Features */}
							<div className="px-6 py-4 space-y-2.5">
								{packageFeatures.map((feature) => {
									const included = feature[pkg.tier.toLowerCase() as keyof Pick<PackageFeature, "bronze" | "silver" | "gold">];
									return (
										<div key={feature.name} className="flex items-center gap-2.5">
											{included ? (
												<LuCheck className="w-4 h-4 text-green-500 flex-shrink-0" />
											) : (
												<LuX className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
											)}
											<span className={`text-sm ${
												included
													? "text-gray-700 dark:text-gray-300"
													: "text-gray-400 dark:text-gray-600 line-through"
											}`}>
												{feature.name}
											</span>
										</div>
									);
								})}
								{pkg.note && (
									<p className="text-[10px] text-gray-400 dark:text-gray-500 italic pt-1 border-t border-gray-100 dark:border-white/5">
										* {pkg.note}
									</p>
								)}
							</div>

							{/* CTA */}
							<div className="px-6 pb-6 pt-2">
								<button
									onClick={() => handleSelectPackage(pkg.tier)}
									className={`w-full py-3 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-300 ${pkg.btnClass}`}
								>
									Pesan Sekarang
								</button>
							</div>
						</div>
					);
				})}
			</div>

			{/* Registration Form */}
			{showForm && selectedPackage && (
				<div
					id="pricing-form"
					className="max-w-2xl mx-auto rounded-2xl border border-gray-200/50 dark:border-white/10 bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm p-6 md:p-8 transition-all duration-500 animate-fade-in"
				>
					<div className="text-center mb-6">
						<h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">
							Formulir Pendaftaran Event
						</h3>
						<p className="text-sm text-gray-500 dark:text-gray-400">
							Paket dipilih:{" "}
							<span className="font-semibold text-red-500">{selectedPackage}</span>
						</p>
					</div>

					<form onSubmit={handleSubmit} className="space-y-4">
						{[
						{ name: "namaPanitia", label: "Nama Panitia", placeholder: "Masukkan nama penanggung jawab", type: "text", required: true },
						{ name: "email", label: "Email", placeholder: "Contoh: panitia@email.com", type: "email", required: true },
						{ name: "phone", label: "No. HP (opsional)", placeholder: "Contoh: 081234567890", type: "tel", required: false },
						{ name: "namaEvent", label: "Nama Event", placeholder: "Contoh: Lomba PBB & LKBB Tingkat SMA", type: "text", required: true },
						{ name: "lokasiEvent", label: "Lokasi Event", placeholder: "Contoh: Lapangan Merdeka, Jakarta", type: "text", required: true },
						{ name: "namaInstansi", label: "Nama Sekolah / Instansi", placeholder: "Contoh: SMA Negeri 1 Jakarta", type: "text", required: true },
					].map((field) => (
						<div key={field.name}>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
								{field.label}
							</label>
							<input
								type={field.type}
								name={field.name}
								value={formData[field.name as keyof typeof formData]}
								onChange={handleInputChange}
								placeholder={field.placeholder}
								className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800/50 text-gray-800 dark:text-white text-sm placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50 transition-all"
								required={field.required}
							/>
						</div>
						))}

						<div className="flex flex-col sm:flex-row gap-3 pt-4">
							<button
								type="button"
								onClick={() => {
									setShowForm(false);
									setSelectedPackage(null);
								}}
								className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
							>
								Batal
							</button>
							<button
								type="submit"
								disabled={submitting}
								className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
							>
								{submitting ? (
									<>
										<LuLoader className="w-4 h-4 animate-spin" />
										Mengirim...
									</>
								) : (
									<>
										<LuSend className="w-4 h-4" />
										Kirim Pendaftaran
									</>
								)}
							</button>
						</div>
					</form>

					<p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-4">
						Hubungi kami untuk paket custom sesuai kebutuhan event Anda
					</p>
				</div>
			)}
		</div>
	);
};

export default PricingSection;
