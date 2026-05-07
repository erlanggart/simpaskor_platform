import React from "react";
import { Link } from "react-router-dom";
import {
	LuCheck,
	LuArrowRight,
	LuMedal,
	LuTrophy,
	LuMegaphone,
	LuTicket,
	LuThumbsUp,
	LuTicketPlus,
	LuBadgeCheck,
	LuSparkles,
} from "react-icons/lu";
import { getRevenueShareLabel, getRevenueShareShortLabel, hasNoUpfrontPayment, PACKAGE_PRICE_LABELS } from "../../utils/packagePricing";

type PackageTier = "IKLAN" | "TICKETING" | "VOTING" | "TICKETING_VOTING" | "BRONZE" | "GOLD";

interface PackageFeature {
	name: string;
	iklan: boolean;
	ticketing: boolean;
	voting: boolean;
	ticketing_voting: boolean;
	bronze: boolean;
	gold: boolean;
}

const packageFeatures: PackageFeature[] = [
	{ name: "E-Ticketing", iklan: false, ticketing: true, voting: false, ticketing_voting: true, bronze: true, gold: true },
	{ name: "E-Voting", iklan: false, ticketing: false, voting: true, ticketing_voting: true, bronze: true, gold: true },
	{ name: "Akses Sistem Penilaian", iklan: false, ticketing: false, voting: false, ticketing_voting: false, bronze: true, gold: true },
	{ name: "Pendaftaran Peserta", iklan: false, ticketing: false, voting: false, ticketing_voting: false, bronze: true, gold: true },
	{ name: "Technical Meeting Aplikasi", iklan: false, ticketing: false, voting: false, ticketing_voting: false, bronze: true, gold: true },
	{ name: "Laporan Digital", iklan: false, ticketing: false, voting: false, ticketing_voting: false, bronze: true, gold: true },
	{ name: "Tim Pendamping", iklan: false, ticketing: false, voting: false, ticketing_voting: false, bronze: false, gold: true },
	{ name: "Device Tablet", iklan: false, ticketing: false, voting: false, ticketing_voting: false, bronze: false, gold: true },
	{ name: "Tim Rekap", iklan: false, ticketing: false, voting: false, ticketing_voting: false, bronze: false, gold: true },
	{ name: "Penyusunan Materi Penilaian", iklan: false, ticketing: false, voting: false, ticketing_voting: false, bronze: false, gold: true },
];

const packages = [
	{
		tier: "IKLAN" as PackageTier,
		name: "Paket Iklan",
		price: PACKAGE_PRICE_LABELS.IKLAN,
		kicker: "Showcase",
		summary: "Tampilkan event di landing page dan rasakan alur demo Simpaskor.",
		icon: LuMegaphone,
		btnClass: "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white",
		accent: "#10b981",
		accentSoft: "rgba(16,185,129,0.15)",
		note: "Akses demo - event tampil di landing page, fitur hanya bisa dilihat",
	},
	{
		tier: "TICKETING" as PackageTier,
		name: "Paket Ticketing",
		price: getRevenueShareShortLabel("TICKETING"),
		kicker: "Revenue share",
		summary: "Jual tiket online dengan dashboard penjualan dan validasi digital.",
		icon: LuTicket,
		btnClass: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white",
		accent: "#3b82f6",
		accentSoft: "rgba(59,130,246,0.15)",
		note: `Fitur E-Ticketing dengan bagi hasil ${getRevenueShareLabel("TICKETING")}`,
	},
	{
		tier: "VOTING" as PackageTier,
		name: "Paket Voting",
		price: getRevenueShareShortLabel("VOTING"),
		kicker: "Engagement",
		summary: "Aktifkan dukungan penonton lewat voting digital yang mudah dipantau.",
		icon: LuThumbsUp,
		btnClass: "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white",
		accent: "#a855f7",
		accentSoft: "rgba(168,85,247,0.15)",
		note: `Fitur E-Voting dengan bagi hasil ${getRevenueShareLabel("VOTING")}`,
	},
	{
		tier: "TICKETING_VOTING" as PackageTier,
		name: "Tiket + Voting",
		price: getRevenueShareShortLabel("TICKETING_VOTING"),
		kicker: "Bundle",
		summary: "Gabungkan ticketing dan voting dalam satu paket operasional.",
		icon: LuTicketPlus,
		btnClass: "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white",
		accent: "#6366f1",
		accentSoft: "rgba(99,102,241,0.15)",
		note: `E-Ticketing dan E-Voting dengan bagi hasil ${getRevenueShareLabel("TICKETING_VOTING")}`,
	},
	{
		tier: "BRONZE" as PackageTier,
		name: "Paket Bronze",
		price: PACKAGE_PRICE_LABELS.BRONZE,
		kicker: "Event siap jalan",
		summary: "Fondasi lengkap untuk event dengan penilaian, peserta, dan laporan digital.",
		icon: LuMedal,
		btnClass: "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white",
		accent: "#f59e0b",
		accentSoft: "rgba(245,158,11,0.16)",
		featured: true,
		note: "Semua fitur - Tim Pendamping (Online)",
	},
	{
		tier: "GOLD" as PackageTier,
		name: "Paket Gold",
		price: PACKAGE_PRICE_LABELS.GOLD,
		kicker: "Full service",
		summary: "Tim pendamping, device tablet, rekap, dan materi penilaian untuk event serius.",
		icon: LuTrophy,
		btnClass: "bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white",
		accent: "#eab308",
		accentSoft: "rgba(234,179,8,0.18)",
		featured: true,
		note: null,
	},
];

const priceColorClass: Record<PackageTier, string> = {
	IKLAN: "text-emerald-600 dark:text-emerald-400",
	TICKETING: "text-blue-600 dark:text-blue-400",
	VOTING: "text-purple-600 dark:text-purple-400",
	TICKETING_VOTING: "text-indigo-600 dark:text-indigo-400",
	BRONZE: "text-amber-600 dark:text-amber-400",
	GOLD: "text-yellow-600 dark:text-yellow-400",
};

const glowColor: Record<PackageTier, string> = {
	IKLAN: "rgba(16,185,129,0.25)",
	TICKETING: "rgba(59,130,246,0.25)",
	VOTING: "rgba(168,85,247,0.25)",
	TICKETING_VOTING: "rgba(99,102,241,0.25)",
	BRONZE: "rgba(245,158,11,0.3)",
	GOLD: "rgba(234,179,8,0.35)",
};

const PricingSection: React.FC = () => {
	const freePackages = packages.filter((p) => hasNoUpfrontPayment(p.tier));
	const paidPackages = packages.filter((p) => !hasNoUpfrontPayment(p.tier));

	const renderCard = (pkg: typeof packages[0], index: number) => {
		const Icon = pkg.icon;
		const tierKey = pkg.tier.toLowerCase() as keyof Pick<PackageFeature, "iklan" | "ticketing" | "voting" | "ticketing_voting" | "bronze" | "gold">;
		const includedFeatures = packageFeatures.filter((f) => f[tierKey]);
		const isPaid = !hasNoUpfrontPayment(pkg.tier);

		return (
			<div
				key={pkg.tier}
				className={`pricing-card group ${pkg.featured ? "pricing-card-featured" : ""} ${isPaid ? "pricing-card-paid" : "pricing-card-compact"}`}
				style={{
					animationDelay: `${index * 80}ms`,
					"--glow": glowColor[pkg.tier],
					"--pricing-accent": pkg.accent,
					"--pricing-accent-soft": pkg.accentSoft,
				} as React.CSSProperties}
			>
				<div className="pricing-card-shimmer absolute inset-0 pointer-events-none z-10" />
				<div className="pricing-card-orbit" />

				<div className="relative z-20 flex h-full flex-col p-4 sm:p-5">
					<div className="mb-4 flex items-start justify-between gap-3">
						<div className="flex min-w-0 items-center gap-3">
							<div className="pricing-card-icon flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl">
								<Icon className="h-5 w-5" />
							</div>
							<div className="min-w-0">
								<p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500">
									{pkg.kicker}
								</p>
								<h3 className="mt-1 text-base font-black leading-tight text-gray-900 dark:text-white">
									{pkg.name}
								</h3>
							</div>
						</div>
						<span className="pricing-tier-badge">
							{pkg.tier.replace("_", " + ")}
						</span>
					</div>

					<div className="mb-4">
						<div className="flex flex-wrap items-end gap-x-2 gap-y-1">
							<p className={`pricing-price ${priceColorClass[pkg.tier]}`}>
								{pkg.price}
							</p>
							{hasNoUpfrontPayment(pkg.tier) && pkg.tier !== "IKLAN" && (
								<span className="pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
									bagi hasil
								</span>
							)}
						</div>
						<p className="mt-2 min-h-[38px] text-xs leading-relaxed text-gray-500 dark:text-gray-400">
							{pkg.summary}
						</p>
					</div>

					<div className="mb-4 grid grid-cols-2 gap-2">
						<div className="pricing-meta-pill">
							<LuBadgeCheck className="h-3.5 w-3.5" />
							<span>{includedFeatures.length || "Demo"} fitur</span>
						</div>
						<div className="pricing-meta-pill">
							<LuSparkles className="h-3.5 w-3.5" />
							<span>{isPaid ? "Pro setup" : "Tanpa DP"}</span>
						</div>
					</div>

					<div className="pricing-feature-list flex-1">
						{includedFeatures.length === 0 ? (
							<div className="pricing-feature" style={{ animationDelay: `${index * 80}ms` }}>
								<LuCheck className="h-3.5 w-3.5 flex-shrink-0" />
								<span>Akses demo saja</span>
							</div>
						) : (
							includedFeatures.map((feature, fi) => (
								<div
									key={feature.name}
									className="pricing-feature"
									style={{ animationDelay: `${index * 80 + fi * 35}ms` }}
								>
									<LuCheck className="h-3.5 w-3.5 flex-shrink-0" />
									<span>{feature.name}</span>
								</div>
							))
						)}
					</div>

					{pkg.note && (
						<p className="pricing-note">
							{pkg.note}
						</p>
					)}

					<Link
						to="/register"
						className={`pricing-card-btn mt-4 ${pkg.btnClass}`}
					>
						<span>Daftar Sekarang</span>
						<LuArrowRight className="h-4 w-4 pricing-btn-arrow" />
					</Link>
				</div>
			</div>
		);
	};

	return (
		<div className="pricing-section relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-12 lg:px-16 py-6">
			<div className="pricing-shell">
				<div className="pricing-header">
					<div>
						<p className="text-[10px] md:text-xs tracking-[0.32em] text-orange-500/80 dark:text-orange-300/70 font-black mb-3">
							DAFTARKAN EVENT ANDA
						</p>
						<h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-none landing-title-gradient-pricing">
							Pilih Paket Anda
						</h1>
					</div>
					<div className="pricing-header-copy">
						<div className="pricing-header-line" />
						<p>
							Pilih mode paling pas untuk event Anda: mulai dari demo, ticketing, voting, sampai operasional penuh dengan tim pendamping.
						</p>
					</div>
				</div>

				<div className="pricing-board">
					<div className="pricing-board-label">
						<span>Tanpa biaya awal</span>
						<p>Paket ringan untuk publikasi, tiket, voting, dan kombinasi keduanya.</p>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4">
						{freePackages.map((pkg, i) => renderCard(pkg, i))}
					</div>
				</div>

				<div className="pricing-board pricing-board-paid">
					<div className="pricing-board-label">
						<span>Paket operasional</span>
						<p>Untuk event yang butuh penilaian, rekap, pendampingan, dan perangkat lapangan.</p>
					</div>
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
						{paidPackages.map((pkg, i) => renderCard(pkg, freePackages.length + i))}
					</div>
				</div>

				<p className="pricing-footer-note">
					Butuh skenario khusus? Tim Simpaskor bisa menyesuaikan paket dengan kebutuhan event Anda.
				</p>
			</div>
		</div>
	);
};

export default PricingSection;
