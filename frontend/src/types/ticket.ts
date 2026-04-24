export interface EventTicketConfig {
	id: string;
	eventId: string;
	enabled: boolean;
	price: number;
	quota: number;
	soldCount: number;
	description: string | null;
	salesStartDate: string | null;
	salesEndDate: string | null;
	createdAt?: string;
	updatedAt?: string;
}

export interface TicketedEvent {
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
	contactEmail?: string | null;
	contactPhone?: string | null;
	ticketConfig: Omit<EventTicketConfig, "eventId" | "createdAt" | "updatedAt"> | null;
}

export interface TicketPurchase {
	id: string;
	eventId: string;
	userId: string | null;
	buyerName: string;
	buyerEmail: string;
	buyerGender: string | null;
	quantity: number;
	totalAmount: number;
	ticketCode: string;
	status: TicketStatus;
	paidAt: string | null;
	usedAt: string | null;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
	attendees?: TicketAttendee[];
	event?: {
		title: string;
		slug?: string;
		startDate: string;
		endDate: string;
		venue?: string | null;
		city?: string | null;
		thumbnail?: string | null;
	};
}

export interface TicketAttendee {
	id: string;
	purchaseId: string;
	attendeeName: string;
	attendeeEmail: string;
	attendeeGender: string | null;
	ticketCode: string;
	status: TicketStatus;
	usedAt: string | null;
	createdAt: string;
}

export type TicketStatus = "PENDING" | "PAID" | "USED" | "CANCELLED" | "EXPIRED";
