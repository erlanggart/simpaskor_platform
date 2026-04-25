/**
 * Package tier feature gating utility.
 * Defines which features are available for each package tier.
 */

export type PackageTierType = 'IKLAN' | 'TICKETING' | 'VOTING' | 'TICKETING_VOTING' | 'BRONZE' | 'SILVER' | 'GOLD';

export type FeatureKey =
	| 'scoring'       // Sistem penilaian (juri, materi, evaluasi)
	| 'ticketing'     // E-Ticketing
	| 'voting'        // E-Voting
	| 'registration'  // Pendaftaran peserta
	| 'juara'         // Manajemen juara
	| 'perform'       // Field rechecking / performance
	| 'recap'         // Rekapitulasi
	| 'disbursement'  // Pencairan dana

/**
 * Maps each package tier to the features it includes.
 */
const TIER_FEATURES: Record<PackageTierType, FeatureKey[]> = {
	IKLAN: [],
	TICKETING: ['ticketing', 'disbursement'],
	VOTING: ['voting', 'disbursement'],
	TICKETING_VOTING: ['ticketing', 'voting', 'disbursement'],
	BRONZE: ['scoring', 'ticketing', 'voting', 'registration', 'juara', 'perform', 'recap', 'disbursement'],
	SILVER: ['scoring', 'ticketing', 'voting', 'registration', 'juara', 'perform', 'recap', 'disbursement'],
	GOLD: ['scoring', 'ticketing', 'voting', 'registration', 'juara', 'perform', 'recap', 'disbursement'],
};

/**
 * Check if a package tier has access to a specific feature.
 */
export function hasFeature(packageTier: string | null | undefined, feature: FeatureKey): boolean {
	if (!packageTier) return false;
	const features = TIER_FEATURES[packageTier as PackageTierType];
	if (!features) return false;
	return features.includes(feature);
}

/**
 * Get all features available for a package tier.
 */
export function getTierFeatures(packageTier: string | null | undefined): FeatureKey[] {
	if (!packageTier) return [];
	return TIER_FEATURES[packageTier as PackageTierType] || [];
}

/**
 * Maps sidebar menu items to their required feature keys.
 */
export const MENU_FEATURE_MAP: Record<string, FeatureKey> = {
	'Peserta': 'registration',
	'Juri': 'scoring',
	'Materi': 'scoring',
	'Juara': 'juara',
	'Perform': 'perform',
	'Rekap': 'recap',
	'Tiket': 'ticketing',
	'Voting': 'voting',
	'Pencairan': 'disbursement',
};
