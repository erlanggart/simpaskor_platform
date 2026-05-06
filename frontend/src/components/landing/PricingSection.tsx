import React from "react";
import { Link } from "react-router-dom";
import {
	LuCheck,
	LuArrowRight,
	LuMedal,
	LuCrown,
	LuTrophy,
	LuMegaphone,
	LuTicket,
	LuThumbsUp,
	LuTicketPlus,
} from "react-icons/lu";
import { getRevenueShareLabel, getRevenueShareShortLabel, hasNoUpfrontPayment, PACKAGE_PRICE_LABELS } from "../../utils/packagePricing";

type PackageTier = "IKLAN" | "TICKETING" | "VOTING" | "TICKETING_VOTING" | "BRONZE" | "SILVER" | "GOLD";

interface PackageFeature {
	name: string;
	iklan: boolean;
	ticketing: boolean;
	voting: boolean;
	ticketing_voting: boolean;
	bronze: boolean;
	silver: boolean;
	gold: boolean;
}

const packageFeatures: PackageFeature[] = [
	{ name: "E-Ticketing", iklan: false, ticketing: true, voting: false, ticketing_voting: true, bronze: true, silver: true, gold: true },
	{ name: "E-Voting", iklan: false, ticketing: false, voting: true, ticketing_voting: true, bronze: true, silver: true, gold: true },
	{ name: "Akses Sistem Penilaian", iklan: false, ticketing: false, voting: false, ticketing_voting: false, bronze: true, silver: true, gold: true },
	{ name: "Pendaftaran Peserta", iklan: false, ticketing: false, voting: false, ticketing_voting: false, bronze: true, silver: true, gold: true },
	{ name: "Technical Meeting Aplikasi", iklan: false, ticketing: false, voting: false, ticketing_voting: false, bronze: true, silver: true, gold: true },
	{ name: "Laporan Digital", iklan: false, ticketing: false, voting: false, ticketing_voting: false, bronze: true, silver: true, gold: true },
	{ name: "Tim Pendamping", iklan: false, ticketing: false, voting: false, ticketing_voting: false, bronze: false, silver: true, gold: true },
	{ name: "Device Tablet", iklan: false, ticketing: false, voting: false, ticketing_voting: false, bronze: false, silver: true, gold: true },
	{ name: "Tim Rekap", iklan: false, ticketing: false, voting: false, ticketing_voting: false, bronze: false, silver: false, gold: true },
	{ name: "Penyusunan Materi Penilaian", iklan: false, ticketing: false, voting: false, ticketing_voting: false, bronze: false, silver: false, gold: true },
];

const packages = [
	{
		tier: "IKLAN" as PackageTier,
		name: "Paket Iklan",
		price: PACKAGE_PRICE_LABELS.IKLAN,
		icon: LuMegaphone,
		color: "emerald",
		borderColor: "border-emerald-400/50 dark:border-emerald-500/30",
		bgGlow: "from-emerald-500/10 to-emerald-600/5",
		badgeClass: "bg-emerald-500 text-white",
		btnClass: "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white",
		note: "Akses demo — event tampil di landing page, fitur hanya bisa dilihat",
	},
	{
		tier: "TICKETING" as PackageTier,
		name: "Paket Ticketing",
		price: getRevenueShareShortLabel("TICKETING"),
		icon: LuTicket,
		color: "blue",
		borderColor: "border-blue-400/50 dark:border-blue-500/30",
		bgGlow: "from-blue-500/10 to-blue-600/5",
		badgeClass: "bg-blue-500 text-white",
		btnClass: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white",
		note: `Fitur E-Ticketing dengan bagi hasil ${getRevenueShareLabel("TICKETING")}`,
	},
	{
		tier: "VOTING" as PackageTier,
		name: "Paket Voting",
		price: getRevenueShareShortLabel("VOTING"),
		icon: LuThumbsUp,
		color: "purple",
		borderColor: "border-purple-400/50 dark:border-purple-500/30",
		bgGlow: "from-purple-500/10 to-purple-600/5",
		badgeClass: "bg-purple-500 text-white",
		btnClass: "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white",
		note: `Fitur E-Voting dengan bagi hasil ${getRevenueShareLabel("VOTING")}`,
	},
	{
		tier: "TICKETING_VOTING" as PackageTier,
		name: "Tiket + Voting",
		price: getRevenueShareShortLabel("TICKETING_VOTING"),
		icon: LuTicketPlus,
		color: "indigo",
		borderColor: "border-indigo-400/50 dark:border-indigo-500/30",
		bgGlow: "from-indigo-500/10 to-indigo-600/5",
		badgeClass: "bg-indigo-500 text-white",
		btnClass: "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white",
		note: `E-Ticketing dan E-Voting dengan bagi hasil ${getRevenueShareLabel("TICKETING_VOTING")}`,
	},
	{
		tier: "BRONZE" as PackageTier,
		name: "Paket Bronze",
		price: PACKAGE_PRICE_LABELS.BRONZE,
		icon: LuMedal,
		color: "amber",
		borderColor: "border-amber-400/50 dark:border-amber-500/30",
		bgGlow: "from-amber-500/10 to-amber-600/5",
		badgeClass: "bg-amber-500 text-white",
		btnClass: "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white",
		featured: true,
		note: "Semua fitur — Tim Pendamping (Online)",
	},
	{
		tier: "SILVER" as PackageTier,
		name: "Paket Silver",
		price: PACKAGE_PRICE_LABELS.SILVER,
		icon: LuCrown,
		color: "gray",
		borderColor: "border-gray-300 dark:border-gray-400/30",
		bgGlow: "from-gray-300/20 to-gray-400/10",
		badgeClass: "bg-gradient-to-r from-gray-400 to-gray-500 text-white",
		btnClass: "bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-black text-white",
		note: "Tim Pendamping (Offline) + Device Tablet (max 3 unit)",
	},
	{
		tier: "GOLD" as PackageTier,
		name: "Paket Gold",
		price: PACKAGE_PRICE_LABELS.GOLD,
		icon: LuTrophy,
		color: "yellow",
		borderColor: "border-yellow-400/50 dark:border-yellow-500/30",
		bgGlow: "from-yellow-500/10 to-yellow-600/5",
		badgeClass: "bg-gradient-to-r from-yellow-400 to-yellow-500 text-white",
		btnClass: "bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white",
		note: null,
	},
];

const priceColorClass: Record<PackageTier, string> = {
	IKLAN: "text-emerald-600 dark:text-emerald-400",
	TICKETING: "text-blue-600 dark:text-blue-400",
	VOTING: "text-purple-600 dark:text-purple-400",
	TICKETING_VOTING: "text-indigo-600 dark:text-indigo-400",
	BRONZE: "text-amber-600 dark:text-amber-400",
	SILVER: "text-gray-600 dark:text-gray-300",
	GOLD: "text-yellow-600 dark:text-yellow-400",
};

// Glow color for box-shadow on hover
const glowColor: Record<PackageTier, string> = {
	IKLAN: "rgba(16,185,129,0.25)",
	TICKETING: "rgba(59,130,246,0.25)",
	VOTING: "rgba(168,85,247,0.25)",
	TICKETING_VOTING: "rgba(99,102,241,0.25)",
	BRONZE: "rgba(245,158,11,0.3)",
	SILVER: "rgba(156,163,175,0.3)",
	GOLD: "rgba(234,179,8,0.35)",
};

const PricingSection: React.FC = () => {
	const freePackages = packages.filter((p) => hasNoUpfrontPayment(p.tier));
	const paidPackages = packages.filter((p) => !hasNoUpfrontPayment(p.tier));

	const renderCard = (pkg: typeof packages[0], index: number) => {
		const Icon = pkg.icon;
		const tierKey = pkg.tier.toLowerCase() as keyof Pick<PackageFeature, "iklan" | "ticketing" | "voting" | "ticketing_voting" | "bronze" | "silver" | "gold">;
		const includedFeatures = packageFeatures.filter((f) => f[tierKey]);

		return (
			<div
				key={pkg.tier}
				className={`pricing-card group relative rounded-xl border overflow-hidden flex flex-col
					${pkg.borderColor}
					bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm
				`}
				style={{
					animationDelay: `${index * 80}ms`,
					"--glow" : glowColor[pkg.tier],
				} as React.CSSProperties}
			>
				{/* Shimmer sweep on hover */}
				<div className="pricing-card-shimmer absolute inset-0 pointer-events-none z-10" />

				{/* Top accent line */}
				<div className={`pricing-card-accent h-[2px] w-full bg-gradient-to-r ${pkg.bgGlow.replace("from-", "from-").replace("/10", "/80").replace("/5", "/40")}`} />

				{/* Header */}
				<div className="px-4 pt-3 pb-2 relative z-20">
					{/* Row 1: icon + name */}
					<div className="flex items-center gap-2 mb-1">
						<div className={`pricing-card-icon w-8 h-8 rounded-lg bg-gradient-to-br ${pkg.bgGlow} flex items-center justify-center border border-gray-200/50 dark:border-white/[0.06] flex-shrink-0`}>
							<Icon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
						</div>
						<h3 className="text-sm font-bold text-gray-800 dark:text-white leading-tight">
							{pkg.name}
						</h3>
					</div>
					{/* Row 2: price + badge */}
					<div className="flex items-center justify-between gap-2">
						<p className={`text-base font-black leading-tight ${priceColorClass[pkg.tier]}`}>
							{pkg.price}
						</p>
						<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex-shrink-0 ${pkg.badgeClass}`}>
							{pkg.tier.replace("_", " + ")}
						</span>
					</div>
				</div>

				{/* Features */}
				<div className="px-4 pb-2 space-y-1 flex-1 relative z-20">
					{includedFeatures.length === 0 ? (
						<p className="text-xs text-gray-400 dark:text-gray-500 italic">Akses demo saja</p>
					) : (
						includedFeatures.map((feature, fi) => (
							<div
								key={feature.name}
								className="pricing-feature flex items-center gap-1.5"
								style={{ animationDelay: `${index * 80 + fi * 40}ms` }}
							>
								<LuCheck className="w-3 h-3 text-green-500 flex-shrink-0" />
								<span className="text-xs text-gray-700 dark:text-gray-300">{feature.name}</span>
							</div>
						))
					)}
					{pkg.note && (
						<p className="text-[10px] text-gray-400 dark:text-gray-500 italic pt-1 border-t border-gray-100 dark:border-white/5">
							* {pkg.note}
						</p>
					)}
				</div>

				{/* CTA */}
				<div className="px-4 pb-3 pt-2 relative z-20">
					<Link
						to="/register"
						className={`pricing-card-btn w-full py-2 rounded-lg text-xs font-semibold shadow-sm transition-all duration-300 flex items-center justify-center gap-1.5 ${pkg.btnClass}`}
					>
						<span>Daftar Sekarang</span>
						<LuArrowRight className="w-3 h-3 pricing-btn-arrow" />
					</Link>
				</div>
			</div>
		);
	};

	return (
		<div className="relative z-10 w-full max-w-6xl mx-auto px-6 md:px-12 lg:px-16 py-4">
			{/* Header */}
			<div className="text-center mb-4">
				<p className="text-[10px] tracking-[0.3em] text-gray-400 font-medium mb-1">
					DAFTARKAN EVENT ANDA
				</p>
				<h1 className="text-3xl sm:text-4xl md:text-5xl font-black leading-none mb-2 landing-title-gradient-pricing">
					Pilih Paket Anda
				</h1>
				<div className="w-10 h-[1px] bg-gradient-to-r from-orange-500/50 to-transparent mx-auto mb-2" />
				<p className="text-xs text-gray-500 dark:text-gray-500 max-w-lg mx-auto">
					Berbagai paket yang dapat disesuaikan dengan kebutuhan event Anda
				</p>
			</div>

			{/* Free Packages Row */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
				{freePackages.map((pkg, i) => renderCard(pkg, i))}
			</div>

			{/* Paid Packages Row */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
				{paidPackages.map((pkg, i) => renderCard(pkg, freePackages.length + i))}
			</div>

			<p className="text-center text-xs text-gray-400 dark:text-gray-600">
				Hubungi kami untuk paket custom sesuai kebutuhan event Anda
			</p>
		</div>
	);
};

export default PricingSection;
