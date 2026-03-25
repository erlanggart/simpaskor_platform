import React from "react";
import { Link } from "react-router-dom";
import {
	CalendarIcon,
	MapPinIcon,
	UsersIcon,
	ClockIcon,
	HeartIcon,
	ChatBubbleLeftIcon,
} from "@heroicons/react/24/outline";
import { Event } from "../../types/landing";

interface EventWithDistance extends Event {
	distance?: number;
}

interface EventCardProps {
	event: EventWithDistance;
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
			import.meta.env.VITE_BACKEND_URL || "";
		return `${backendUrl}${thumbnail}`;
	};

	return (
		<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden">
			{/* Event Thumbnail - 4:5 Aspect Ratio */}
			<div className="relative w-full aspect-[4/5] bg-gradient-to-br from-red-500 to-purple-600">
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
				{/* Like & Comment Count */}
				<div className="absolute bottom-4 left-4 flex items-center gap-2">
					<div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-full text-sm">
						<HeartIcon className="w-4 h-4" />
						<span>{event.likesCount || 0}</span>
					</div>
					<div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-full text-sm">
						<ChatBubbleLeftIcon className="w-4 h-4" />
						<span>{event.commentsCount || 0}</span>
					</div>
					{event.distance !== undefined && event.distance !== Infinity && (
						<div className="flex items-center gap-1 bg-red-600/80 backdrop-blur-sm text-white px-2 py-1 rounded-full text-sm">
							<MapPinIcon className="w-4 h-4" />
							<span>{event.distance < 1 ? `${Math.round(event.distance * 1000)} m` : `${event.distance.toFixed(1)} km`}</span>
						</div>
					)}
				</div>
			</div>

			{/* Event Details */}
			<div className="p-6">
				{/* Category Badge */}
				{event.category && (
					<span className="inline-block px-3 py-1 bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 text-sm font-medium rounded-full mb-3">
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

					{(event.province || event.city) && (
						<div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
							<MapPinIcon className="w-4 h-4 mr-2 flex-shrink-0" />
							<span className="line-clamp-1">
								{event.venue ? `${event.venue}, ` : ""}
								{event.city}{event.city && event.province ? ", " : ""}{event.province}
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
						<p className="text-lg font-bold text-red-600 dark:text-red-400">
							{formatCurrency(event.registrationFee)}
						</p>
					</div>
					<Link
						to={`/events/${event.slug || event.id}`}
						className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
							isEventFull()
								? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
								: "bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600 text-white"
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
