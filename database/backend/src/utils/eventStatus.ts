/**
 * Compute event status based on dates
 * 
 * Status logic:
 * - DRAFT: Manual - event not published yet
 * - PUBLISHED: Event is published AND registration is still open
 * - ONGOING: After registration deadline until event ends
 * - COMPLETED: After event end date has passed
 * - CANCELLED: Manual - event was cancelled
 */

export type EventStatus = "DRAFT" | "PUBLISHED" | "ONGOING" | "COMPLETED" | "CANCELLED";

interface EventDates {
	status: string;
	startDate: Date | string;
	endDate: Date | string;
	registrationDeadline?: Date | string | null;
}

export function computeEventStatus(event: EventDates): EventStatus {
	const now = new Date();
	const startDate = new Date(event.startDate);
	const endDate = new Date(event.endDate);
	const registrationDeadline = event.registrationDeadline 
		? new Date(event.registrationDeadline) 
		: null;

	// Manual statuses - keep as is
	if (event.status === "DRAFT" || event.status === "CANCELLED") {
		return event.status as EventStatus;
	}

	// Auto-compute status based on dates
	// Event has ended - COMPLETED
	if (now > endDate) {
		return "COMPLETED";
	}

	// Event is happening now (between start and end date) - ONGOING
	if (now >= startDate && now <= endDate) {
		return "ONGOING";
	}

	// Registration deadline has passed but event hasn't started yet - ONGOING (preparing phase)
	if (registrationDeadline && now > registrationDeadline && now < startDate) {
		return "ONGOING";
	}

	// Registration is still open - PUBLISHED
	return "PUBLISHED";
}

/**
 * Get status display info
 */
export function getStatusInfo(status: EventStatus) {
	const statusMap = {
		DRAFT: { label: "Draft", color: "gray", description: "Event belum dipublish" },
		PUBLISHED: { label: "Published", color: "green", description: "Event aktif, pendaftaran dibuka" },
		ONGOING: { label: "Ongoing", color: "blue", description: "Event sedang berlangsung" },
		COMPLETED: { label: "Completed", color: "purple", description: "Event sudah selesai" },
		CANCELLED: { label: "Cancelled", color: "red", description: "Event dibatalkan" },
	};
	return statusMap[status] || statusMap.DRAFT;
}
