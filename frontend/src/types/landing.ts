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
	venue: string | null;
	maxParticipants: number | null;
	currentParticipants: number;
	registrationFee: number | null;
	organizer: string | null;
	status: string;
	featured: boolean;
	schoolCategoryLimits?: SchoolCategoryLimit[];
}
