import type React from "react";
import {
	LuMedal,
	LuTrophy,
	LuMegaphone,
	LuTicket,
	LuThumbsUp,
	LuTicketPlus,
} from "react-icons/lu";
import { PACKAGE_PRICE_LABELS } from "../../utils/packagePricing";

export type PackageTier = "IKLAN" | "TICKETING" | "VOTING" | "TICKETING_VOTING" | "BRONZE" | "GOLD";

export interface PackageFeature {
	name: string;
	iklan: boolean;
	ticketing: boolean;
	voting: boolean;
	ticketing_voting: boolean;
	bronze: boolean;
	gold: boolean;
}

export interface PricingPackage {
	tier: PackageTier;
	name: string;
	price: string;
	kicker: string;
	summary: string;
	icon: React.ComponentType<{ className?: string }>;
	btnClass: string;
	accent: string;
	accentSoft: string;
	note: string | null;
	featured?: boolean;
}

export const packageFeatures: PackageFeature[] = [
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

export const packages: PricingPackage[] = [
	{
		tier: "IKLAN",
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
		tier: "TICKETING",
		name: "Paket Ticketing",
		price: "Hubungi Admin",
		kicker: "Ticketing",
		summary: "Jual tiket online dengan dashboard penjualan dan validasi digital.",
		icon: LuTicket,
		btnClass: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white",
		accent: "#3b82f6",
		accentSoft: "rgba(59,130,246,0.15)",
		note: "Detail harga dan bagi hasil dibahas bersama admin setelah event dibuat",
	},
	{
		tier: "VOTING",
		name: "Paket Voting",
		price: "Hubungi Admin",
		kicker: "Voting",
		summary: "Aktifkan dukungan penonton lewat voting digital yang mudah dipantau.",
		icon: LuThumbsUp,
		btnClass: "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white",
		accent: "#a855f7",
		accentSoft: "rgba(168,85,247,0.15)",
		note: "Detail harga dan bagi hasil dibahas bersama admin setelah event dibuat",
	},
	{
		tier: "TICKETING_VOTING",
		name: "Tiket + Voting",
		price: "Hubungi Admin",
		kicker: "Bundle",
		summary: "Gabungkan ticketing dan voting dalam satu paket operasional.",
		icon: LuTicketPlus,
		btnClass: "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white",
		accent: "#6366f1",
		accentSoft: "rgba(99,102,241,0.15)",
		note: "Detail harga dan bagi hasil bundle dibahas bersama admin setelah event dibuat",
	},
	{
		tier: "BRONZE",
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
		tier: "GOLD",
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

export const priceColorClass: Record<PackageTier, string> = {
	IKLAN: "text-emerald-600 dark:text-emerald-400",
	TICKETING: "text-blue-600 dark:text-blue-400",
	VOTING: "text-purple-600 dark:text-purple-400",
	TICKETING_VOTING: "text-indigo-600 dark:text-indigo-400",
	BRONZE: "text-amber-600 dark:text-amber-400",
	GOLD: "text-yellow-600 dark:text-yellow-400",
};

export const glowColor: Record<PackageTier, string> = {
	IKLAN: "rgba(16,185,129,0.25)",
	TICKETING: "rgba(59,130,246,0.25)",
	VOTING: "rgba(168,85,247,0.25)",
	TICKETING_VOTING: "rgba(99,102,241,0.25)",
	BRONZE: "rgba(245,158,11,0.3)",
	GOLD: "rgba(234,179,8,0.35)",
};
