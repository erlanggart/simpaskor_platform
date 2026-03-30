export interface Banner {
	id: string;
	title: string;
	description: string | null;
	imageUrl: string;
	linkUrl: string | null;
	buttonText: string | null;
	order: number;
}

export interface SchoolCategoryLimit {
	id: string;
	maxParticipants: number;
	schoolCategory: {
		id: string;
		name: string;
	};
}

export interface SchoolCategory {
	id: string;
	name: string;
	description: string | null;
	order: number;
	isActive: boolean;
}

export interface Event {
	id: string;
	title: string;
	slug: string | null;
	description: string | null;
	thumbnail: string | null;
	category: string | null;
	level: string | null;
	startDate: string;
	endDate: string;
	registrationDeadline: string | null;
	location: string | null;
	province: string | null;
	city: string | null;
	venue: string | null;
	maxParticipants: number | null;
	currentParticipants: number;
	registrationFee: number | null;
	organizer: string | null;
	status: string;
	featured: boolean;
	schoolCategoryLimits?: SchoolCategoryLimit[];
	likesCount?: number;
	commentsCount?: number;
	createdAt?: string;
}

export interface PersonMember {
	id?: string;
	name: string;
	photo?: string; // URL to uploaded photo
	role: 'PASUKAN' | 'DANTON' | 'CADANGAN' | 'OFFICIAL' | 'PELATIH';
}

export interface ParticipationGroup {
	id: string;
	groupName: string;
	teamMembers: number;
	status: string;
	notes: string | null;
	memberData: string | null; // JSON string containing PersonMember[]
	schoolCategoryId?: string;
	schoolCategory?: SchoolCategory;
	createdAt: string;
	updatedAt: string;
}

export interface EventRegistration {
	id: string;
	eventId: string;
	userId: string;
	schoolCategoryId: string;
	teamName: string | null;
	schoolName: string | null;
	status: string;
	totalScore: number | null;
	rank: number | null;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
	event?: Event;
	schoolCategory?: SchoolCategory;
	groups: ParticipationGroup[];
}
