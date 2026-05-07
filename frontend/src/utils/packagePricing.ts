import type { PackageTier } from "../types/eventWizard";

export const PLATFORM_SHARE_PERCENT = 15;
export const ORGANIZER_SHARE_PERCENT = 85;
export const REVENUE_SHARE_LABEL = `${PLATFORM_SHARE_PERCENT}% Simpaskor / ${ORGANIZER_SHARE_PERCENT}% Panitia`;
export const REVENUE_SHARE_SHORT_LABEL = `${PLATFORM_SHARE_PERCENT}% / ${ORGANIZER_SHARE_PERCENT}%`;
export const BUNDLE_PLATFORM_SHARE_PERCENT = 25;
export const BUNDLE_ORGANIZER_SHARE_PERCENT = 75;
export const BUNDLE_REVENUE_SHARE_LABEL = `${BUNDLE_PLATFORM_SHARE_PERCENT}% Simpaskor / ${BUNDLE_ORGANIZER_SHARE_PERCENT}% Panitia`;
export const BUNDLE_REVENUE_SHARE_SHORT_LABEL = `${BUNDLE_PLATFORM_SHARE_PERCENT}% / ${BUNDLE_ORGANIZER_SHARE_PERCENT}%`;

const REVENUE_SHARE_TIERS: PackageTier[] = ["TICKETING", "VOTING", "TICKETING_VOTING"];
const NO_UPFRONT_PAYMENT_TIERS: PackageTier[] = ["IKLAN", ...REVENUE_SHARE_TIERS];

export const PACKAGE_NAMES: Record<PackageTier, string> = {
	IKLAN: "Paket Iklan",
	TICKETING: "Paket Ticketing",
	VOTING: "Paket Voting",
	TICKETING_VOTING: "Paket Ticketing + Voting",
	BRONZE: "Paket Bronze",
	GOLD: "Paket Gold",
	SILVER: "Paket Tidak Aktif",
};

export const PACKAGE_PRICE_LABELS: Record<PackageTier, string> = {
	IKLAN: "GRATIS",
	TICKETING: REVENUE_SHARE_LABEL,
	VOTING: REVENUE_SHARE_LABEL,
	TICKETING_VOTING: BUNDLE_REVENUE_SHARE_LABEL,
	BRONZE: "Rp 500.000",
	GOLD: "Rp 1.500.000",
	SILVER: "-",
};

export function getRevenueShareLabel(tier: PackageTier | string | null | undefined): string {
	return tier === "TICKETING_VOTING" ? BUNDLE_REVENUE_SHARE_LABEL : REVENUE_SHARE_LABEL;
}

export function getRevenueShareShortLabel(tier: PackageTier | string | null | undefined): string {
	return tier === "TICKETING_VOTING" ? BUNDLE_REVENUE_SHARE_SHORT_LABEL : REVENUE_SHARE_SHORT_LABEL;
}

export function isRevenueSharePackage(tier: PackageTier | string | null | undefined): boolean {
	return REVENUE_SHARE_TIERS.includes(tier as PackageTier);
}

export function hasNoUpfrontPayment(tier: PackageTier | string | null | undefined): boolean {
	return NO_UPFRONT_PAYMENT_TIERS.includes(tier as PackageTier);
}

export function getPackagePriceLabel(tier: PackageTier | string | null | undefined): string {
	if (!tier) return "-";
	return PACKAGE_PRICE_LABELS[tier as PackageTier] || "-";
}

export function getPackageName(tier: PackageTier | string | null | undefined): string {
	if (!tier) return "Paket Simpaskor";
	return PACKAGE_NAMES[tier as PackageTier] || "Paket Simpaskor";
}
