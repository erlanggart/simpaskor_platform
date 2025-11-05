import React from "react";
import { Link } from "react-router-dom";
import {
	CalendarIcon,
	MapPinIcon,
	UsersIcon,
	ClockIcon,
} from "@heroicons/react/24/outline";

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

interface EventCardProps {
	event: Event;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
	const isRegistrationOpen = () => {
		const now = new Date();
		const deadline = event.registrationDeadline
			? new Date(event.registrationDeadline)
			: new Date(event.startDate);
		return deadline > now && event.status === "PUBLISHED" && !isEventFull();
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString("id-ID", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	};

	const formatCurrency = (amount: number | null) => {
		if (!amount) return "Gratis";
		return new Intl.NumberFormat("id-ID", {
			style: "currency",
			currency: "IDR",
			minimumFractionDigits: 0,
		}).format(Number(amount));
	};

	const getAvailableSpots = () => {
		if (!event.maxParticipants) return "Unlimited";
		return event.maxParticipants - event.currentParticipants;
	};

	const isEventFull = () => {
		if (!event.maxParticipants) return false;
		return event.currentParticipants >= event.maxParticipants;
	};

	const getImageUrl = (thumbnail: string | null) => {
		if (!thumbnail) return null;
		if (thumbnail.startsWith("http://") || thumbnail.startsWith("https://")) {
			return thumbnail;
		}
		const backendUrl =
			import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
		return `${backendUrl}${thumbnail}`;
	};

	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden">
			{/* Event Thumbnail - 4:5 Aspect Ratio */}
			<div className="relative w-full aspect-[4/5] bg-gradient-to-br from-indigo-500 to-purple-600">
				{event.thumbnail ? (
					<img
						src={getImageUrl(event.thumbnail) || ""}
						alt={event.title}
						className="w-full h-full object-cover"
						onError={(e) => {
							e.currentTarget.style.display = "none";
						}}
					/>
				) : (
					<div className="flex items-center justify-center h-full">
						<CalendarIcon className="w-16 h-16 text-white/50" />
					</div>
				)}
				{event.featured && (
					<div className="absolute top-4 right-4 bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
						Featured
					</div>
				)}
				{isEventFull() && (
					<div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
						Penuh
					</div>
				)}
				{isRegistrationOpen() && (
					<div className="absolute bottom-4 right-4 bg-green-500 dark:bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
						Pendaftaran Dibuka
					</div>
				)}
			</div>

			{/* Event Details */}
			<div className="p-6">
				{/* Category Badge */}
				{event.category && (
					<span className="inline-block px-3 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 text-sm font-medium rounded-full mb-3">
						{event.category}
					</span>
				)}

				<h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
					{event.title}
				</h3>

				{event.description && (
					<p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
						{event.description}
					</p>
				)}

				{/* Event Info */}
				<div className="space-y-2 mb-4">
					<div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
						<CalendarIcon className="w-4 h-4 mr-2 flex-shrink-0" />
						<span className="line-clamp-1">{formatDate(event.startDate)}</span>
					</div>

					{event.location && (
						<div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
							<MapPinIcon className="w-4 h-4 mr-2 flex-shrink-0" />
							<span className="line-clamp-1">
								{event.venue ? `${event.venue}, ` : ""}
								{event.location}
							</span>
						</div>
					)}

					{/* Display school category limits */}
					{event.schoolCategoryLimits &&
					event.schoolCategoryLimits.length > 0 ? (
						<div className="space-y-1">
							{event.schoolCategoryLimits.map((limit) => (
								<div
									key={limit.id}
									className="flex items-start text-sm text-gray-600 dark:text-gray-300"
								>
									<UsersIcon className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
									<span className="line-clamp-1">
										<span className="font-medium">
											{limit.schoolCategory.name}:
										</span>{" "}
										Max {limit.maxParticipants} peserta
									</span>
								</div>
							))}
						</div>
					) : (
						<div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
							<UsersIcon className="w-4 h-4 mr-2 flex-shrink-0" />
							<span>
								{event.currentParticipants} / {event.maxParticipants || "∞"}{" "}
								peserta
								{event.maxParticipants && (
									<span className="ml-2 text-gray-500 dark:text-gray-400">
										({getAvailableSpots()} slot tersisa)
									</span>
								)}
							</span>
						</div>
					)}

					{event.registrationDeadline && (
						<div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
							<ClockIcon className="w-4 h-4 mr-2 flex-shrink-0" />
							<span className="line-clamp-1">
								Daftar hingga: {formatDate(event.registrationDeadline)}
							</span>
						</div>
					)}
				</div>

				{/* Price and Action */}
				<div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
					<div>
						<p className="text-sm text-gray-500 dark:text-gray-400">
							Biaya Pendaftaran
						</p>
						<p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
							{formatCurrency(event.registrationFee)}
						</p>
					</div>
					<Link
						to={`/events/${event.slug || event.id}`}
						className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
							isEventFull()
								? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
								: "bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white"
						}`}
					>
						{isEventFull() ? "Penuh" : "Detail"}
					</Link>
				</div>
			</div>
		</div>
	);
};

export default EventCard;
