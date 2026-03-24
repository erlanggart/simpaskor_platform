export type VotingMode = "TEAM" | "PERSONAL";
export type VotingPurchaseStatus = "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";

export interface EventVotingConfig {
	id: string;
	eventId: string;
	enabled: boolean;
	isPaid: boolean;
	pricePerVote: number;
	startDate: string | null;
	endDate: string | null;
	categories: VotingCategory[];
	createdAt?: string;
	updatedAt?: string;
}

export interface VotingCategory {
	id: string;
	configId: string;
	title: string;
	description: string | null;
	mode: VotingMode;
	position: string | null;
	schoolCategoryIds: string[];
	maxVotesPerVoter: number;
	isActive: boolean;
	order: number;
	nominees?: VotingNominee[];
	_count?: {
		nominees: number;
		votes: number;
	};
	createdAt?: string;
	updatedAt?: string;
}

export interface VotingNominee {
	id: string;
	categoryId: string;
	groupId: string | null;
	nomineeName: string;
	nomineePhoto: string | null;
	nomineeSubtitle: string | null;
	voteCount: number;
	createdAt?: string;
	updatedAt?: string;
}

export interface VotingVote {
	id: string;
	categoryId: string;
	nomineeId: string;
	purchaseId: string | null;
	voterName: string | null;
	voterEmail: string | null;
	voterIp: string | null;
	createdAt: string;
}

export interface VotingPurchase {
	id: string;
	eventId: string;
	buyerName: string;
	buyerEmail: string;
	buyerPhone: string | null;
	voteCount: number;
	totalAmount: number;
	purchaseCode: string;
	status: VotingPurchaseStatus;
	paidAt: string | null;
	usedVotes: number;
	createdAt: string;
	updatedAt: string;
}

export interface VotingEvent {
	id: string;
	title: string;
	slug: string | null;
	description: string | null;
	thumbnail: string | null;
	startDate: string;
	endDate: string;
	location: string | null;
	city: string | null;
	venue: string | null;
	organizer: string | null;
	votingConfig: {
		id: string;
		enabled: boolean;
		isPaid: boolean;
		pricePerVote: number;
		startDate: string | null;
		endDate: string | null;
		categories: {
			id: string;
			title: string;
			description?: string | null;
			mode: VotingMode;
			maxVotesPerVoter?: number;
			nominees?: VotingNominee[];
		}[];
	} | null;
}
