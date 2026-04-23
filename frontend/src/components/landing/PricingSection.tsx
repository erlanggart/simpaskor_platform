import React from "react";
import { Link } from "react-router-dom";
import {
	LuCheck,
	LuX,
	LuArrowRight,
	LuMedal,
	LuCrown,
	LuTrophy,
	LuMegaphone,
} from "react-icons/lu";

type PackageTier = "IKLAN" | "BRONZE" | "SILVER" | "GOLD";

interface PackageFeature {
	name: string;
	iklan: boolean;
	bronze: boolean;
	silver: boolean;
	gold: boolean;
}

const packageFeatures: PackageFeature[] = [
	{ name: "Akses Sistem Penilaian", iklan: false, bronze: true, silver: true, gold: true },
	{ name: "Technical Meeting Aplikasi", iklan: false, bronze: true, silver: true, gold: true },
	{ name: "Laporan Digital", iklan: false, bronze: true, silver: true, gold: true },
	{ name: "Tim Pendamping", iklan: false, bronze: false, silver: true, gold: true },
	{ name: "Device Tablet", iklan: false, bronze: false, silver: true, gold: true },
	{ name: "Tim Rekap", iklan: false, bronze: false, silver: false, gold: true },
	{ name: "Penyusunan Materi Penilaian", iklan: false, bronze: false, silver: false, gold: true },
];

const packages = [
	{
		tier: "IKLAN" as PackageTier,
		name: "Paket Iklan",
		price: "GRATIS",
		icon: LuMegaphone,
		color: "emerald",
		borderColor: "border-emerald-400/50 dark:border-emerald-500/30",
		bgGlow: "from-emerald-500/10 to-emerald-600/5",
		badgeClass: "bg-emerald-500 text-white",
		btnClass: "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white",
		note: "Akses demo — event tampil di landing page, fitur hanya bisa dilihat",
	},
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
			<div className="grid grid-cols-1 md:grid-cols-4 gap-6 lg:gap-8 mb-10">
				{packages.map((pkg) => {
					const Icon = pkg.icon;
					const isFeatured = pkg.featured;

					return (
						<div
							key={pkg.tier}
							className={`relative rounded-2xl border transition-all duration-300 overflow-hidden
								${pkg.borderColor}
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
								pkg.tier === "IKLAN"
									? "text-emerald-600 dark:text-emerald-400"
									: pkg.tier === "BRONZE"
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
									const included = feature[pkg.tier.toLowerCase() as keyof Pick<PackageFeature, "iklan" | "bronze" | "silver" | "gold">];
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
								<Link
									to="/register"
									className={`w-full py-3 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center gap-2 ${pkg.btnClass}`}
								>
									<span>Daftar Sekarang</span>
									<LuArrowRight className="w-4 h-4" />
								</Link>
							</div>
						</div>
					);
				})}
			</div>

			<p className="text-center text-xs text-gray-400 dark:text-gray-600">
				Hubungi kami untuk paket custom sesuai kebutuhan event Anda
			</p>
		</div>
	);
};

export default PricingSection;
