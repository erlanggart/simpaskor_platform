import React from "react";
import EventCard from "./EventCard";

interface SchoolCategoryLimit {
	id: string;
	maxParticipants: number;
	schoolCategory: {
		id: string;
		name: string;
	};
}

interface Event {
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

interface EventGridProps {
	events: Event[];
}

const EventGrid: React.FC<EventGridProps> = ({ events }) => {
	return (
		<section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
			<div className="flex justify-between items-center mb-8">
				<div>
					<h2 className="text-3xl font-bold text-gray-900">Event Tersedia</h2>
					<p className="text-gray-600 mt-2">{events.length} event ditemukan</p>
				</div>
			</div>

			{events.length === 0 ? (
				<div className="text-center py-16">
					<p className="text-gray-500 text-lg">
						Tidak ada event yang sesuai dengan pencarian Anda.
					</p>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{events.map((event) => (
						<EventCard key={event.id} event={event} />
					))}
				</div>
			)}
		</section>
	);
};

export default EventGrid;
