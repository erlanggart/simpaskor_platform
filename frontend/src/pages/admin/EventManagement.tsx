import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
	CalendarIcon,
	MapPinIcon,
	UsersIcon,
	StarIcon,
	EyeIcon,
	ArrowUpIcon,
	ArrowDownIcon,
	XMarkIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { api } from "../../utils/api";
import { showSuccess, showError, showConfirm } from "../../utils/sweetalert";

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
	location: string | null;
	venue: string | null;
	maxParticipants: number | null;
	currentParticipants: number;
	status: string;
	isPinned: boolean;
	pinnedOrder: number | null;
	createdBy: {
		id: string;
		name: string;
		email: string;
	};
	schoolCategoryLimits?: SchoolCategoryLimit[];
}

const EventManagement: React.FC = () => {
	const [events, setEvents] = useState<Event[]>([]);
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState<"all" | "pinned" | "unpinned">("all");

	useEffect(() => {
		fetchEvents();
	}, []);

	const fetchEvents = async () => {
		try {
			setLoading(true);
			const response = await api.get("/api/events");
			setEvents(response.data.data || response.data);
		} catch (error) {
			console.error("Error fetching events:", error);
			showError("Gagal memuat data event");
		} finally {
			setLoading(false);
		}
	};

	const handleTogglePin = async (eventId: string, currentPinned: boolean) => {
		const confirmed = await showConfirm(
			currentPinned ? "Unpin Event?" : "Pin Event?",
			currentPinned
				? "Event akan dihapus dari carousel"
				: "Event akan ditampilkan di carousel landing page"
		);

		if (!confirmed) return;

		try {
			await api.patch(`/api/events/${eventId}/pin`, {
				isPinned: !currentPinned,
				pinnedOrder: !currentPinned ? getNextPinnedOrder() : null,
			});

			showSuccess(
				currentPinned ? "Event berhasil di-unpin" : "Event berhasil di-pin"
			);
			fetchEvents();
		} catch (error: any) {
			console.error("Error toggling pin:", error);
			showError(error.response?.data?.message || "Gagal mengubah status pin");
		}
	};

	const handleUpdatePinnedOrder = async (
		eventId: string,
		direction: "up" | "down"
	) => {
		const event = events.find((e) => e.id === eventId);
		if (!event || !event.isPinned || event.pinnedOrder === null) return;

		const pinnedEvents = events
			.filter((e) => e.isPinned && e.pinnedOrder !== null)
			.sort((a, b) => (a.pinnedOrder || 0) - (b.pinnedOrder || 0));

		const currentIndex = pinnedEvents.findIndex((e) => e.id === eventId);
		const targetIndex =
			direction === "up" ? currentIndex - 1 : currentIndex + 1;

		if (targetIndex < 0 || targetIndex >= pinnedEvents.length) return;

		const targetEvent = pinnedEvents[targetIndex];
		if (!targetEvent) return;

		try {
			// Swap the orders
			await Promise.all([
				api.patch(`/api/events/${event.id}/pin`, {
					isPinned: true,
					pinnedOrder: targetEvent.pinnedOrder,
				}),
				api.patch(`/api/events/${targetEvent.id}/pin`, {
					isPinned: true,
					pinnedOrder: event.pinnedOrder,
				}),
			]);

			showSuccess("Urutan berhasil diubah");
			fetchEvents();
		} catch (error) {
			console.error("Error updating order:", error);
			showError("Gagal mengubah urutan");
		}
	};

	const getNextPinnedOrder = () => {
		const pinnedEvents = events.filter((e) => e.isPinned);
		if (pinnedEvents.length === 0) return 1;
		const maxOrder = Math.max(...pinnedEvents.map((e) => e.pinnedOrder || 0));
		return maxOrder + 1;
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});
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

	const getStatusBadge = (status: string) => {
		const statusConfig: {
			[key: string]: { label: string; className: string };
		} = {
			DRAFT: { label: "Draft", className: "bg-gray-100 text-gray-800" },
			PUBLISHED: {
				label: "Published",
				className: "bg-green-100 text-green-800",
			},
			CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-800" },
			COMPLETED: {
				label: "Completed",
				className: "bg-blue-100 text-blue-800",
			},
		};

		const config = statusConfig[status] || {
			label: status,
			className: "bg-gray-100 text-gray-800",
		};

		return (
			<span
				className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}
			>
				{config.label}
			</span>
		);
	};

	const filteredEvents = events.filter((event) => {
		if (filter === "pinned") return event.isPinned;
		if (filter === "unpinned") return !event.isPinned;
		return true;
	});

	const pinnedEvents = filteredEvents
		.filter((e) => e.isPinned)
		.sort((a, b) => (a.pinnedOrder || 0) - (b.pinnedOrder || 0));
	const unpinnedEvents = filteredEvents.filter((e) => !e.isPinned);

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<header className="bg-white shadow">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center py-6">
						<div>
							<h1 className="text-3xl font-bold text-gray-900">
								Event Management
							</h1>
							<p className="text-gray-600 mt-1">
								Kelola semua event dan atur carousel landing page
							</p>
						</div>
						<Link
							to="/admin"
							className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
						>
							Kembali ke Dashboard
						</Link>
					</div>
				</div>
			</header>

			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Filters */}
				<div className="bg-white rounded-lg shadow-sm p-4 mb-6">
					<div className="flex items-center gap-4">
						<span className="text-sm font-medium text-gray-700">Filter:</span>
						<div className="flex gap-2">
							<button
								onClick={() => setFilter("all")}
								className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
									filter === "all"
										? "bg-indigo-600 text-white"
										: "bg-gray-100 text-gray-700 hover:bg-gray-200"
								}`}
							>
								Semua Event ({events.length})
							</button>
							<button
								onClick={() => setFilter("pinned")}
								className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
									filter === "pinned"
										? "bg-indigo-600 text-white"
										: "bg-gray-100 text-gray-700 hover:bg-gray-200"
								}`}
							>
								Pinned ({events.filter((e) => e.isPinned).length})
							</button>
							<button
								onClick={() => setFilter("unpinned")}
								className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
									filter === "unpinned"
										? "bg-indigo-600 text-white"
										: "bg-gray-100 text-gray-700 hover:bg-gray-200"
								}`}
							>
								Unpinned ({events.filter((e) => !e.isPinned).length})
							</button>
						</div>
					</div>
				</div>

				{loading ? (
					<div className="flex justify-center items-center py-12">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
					</div>
				) : (
					<>
						{/* Pinned Events Section */}
						{pinnedEvents.length > 0 && (
							<div className="mb-8">
								<div className="flex items-center gap-2 mb-4">
									<StarIconSolid className="w-6 h-6 text-yellow-500" />
									<h2 className="text-xl font-bold text-gray-900">
										Pinned Events (Tampil di Carousel)
									</h2>
								</div>
								<div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-4">
									<p className="text-sm text-yellow-800">
										Event yang di-pin akan tampil di carousel landing page.
										Maksimal 10 event dapat di-pin. Gunakan tombol panah untuk
										mengatur urutan tampilan.
									</p>
								</div>
								<div className="space-y-4">
									{pinnedEvents.map((event, index) => (
										<EventCard
											key={event.id}
											event={event}
											onTogglePin={handleTogglePin}
											onUpdateOrder={handleUpdatePinnedOrder}
											canMoveUp={index > 0}
											canMoveDown={index < pinnedEvents.length - 1}
											getImageUrl={getImageUrl}
											formatDate={formatDate}
											getStatusBadge={getStatusBadge}
										/>
									))}
								</div>
							</div>
						)}

						{/* Unpinned Events Section */}
						{unpinnedEvents.length > 0 && (
							<div>
								<h2 className="text-xl font-bold text-gray-900 mb-4">
									{filter === "unpinned" ? "Unpinned Events" : "Event Lainnya"}
								</h2>
								<div className="space-y-4">
									{unpinnedEvents.map((event) => (
										<EventCard
											key={event.id}
											event={event}
											onTogglePin={handleTogglePin}
											onUpdateOrder={handleUpdatePinnedOrder}
											canMoveUp={false}
											canMoveDown={false}
											getImageUrl={getImageUrl}
											formatDate={formatDate}
											getStatusBadge={getStatusBadge}
										/>
									))}
								</div>
							</div>
						)}

						{filteredEvents.length === 0 && (
							<div className="text-center py-12">
								<CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
								<p className="text-gray-500 text-lg">Tidak ada event</p>
							</div>
						)}
					</>
				)}
			</main>
		</div>
	);
};

interface EventCardProps {
	event: Event;
	onTogglePin: (eventId: string, currentPinned: boolean) => void;
	onUpdateOrder: (eventId: string, direction: "up" | "down") => void;
	canMoveUp: boolean;
	canMoveDown: boolean;
	getImageUrl: (thumbnail: string | null) => string | null;
	formatDate: (dateString: string) => string;
	getStatusBadge: (status: string) => React.ReactElement;
}

const EventCard: React.FC<EventCardProps> = ({
	event,
	onTogglePin,
	onUpdateOrder,
	canMoveUp,
	canMoveDown,
	getImageUrl,
	formatDate,
	getStatusBadge,
}) => {
	return (
		<div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
			<div className="flex">
				{/* Thumbnail */}
				<div className="w-48 h-48 flex-shrink-0 bg-gradient-to-br from-indigo-500 to-purple-600 relative">
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
							<CalendarIcon className="w-12 h-12 text-white/50" />
						</div>
					)}
					{event.isPinned && (
						<div className="absolute top-2 right-2">
							<div className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
								<StarIconSolid className="w-3 h-3" />#{event.pinnedOrder}
							</div>
						</div>
					)}
				</div>

				{/* Content */}
				<div className="flex-1 p-6">
					<div className="flex justify-between items-start mb-3">
						<div className="flex-1">
							<div className="flex items-center gap-2 mb-2">
								<h3 className="text-lg font-bold text-gray-900">
									{event.title}
								</h3>
								{getStatusBadge(event.status)}
							</div>
							{event.category && (
								<span className="inline-block px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded mb-2">
									{event.category}
								</span>
							)}
						</div>
					</div>

					{event.description && (
						<p className="text-gray-600 text-sm mb-3 line-clamp-2">
							{event.description}
						</p>
					)}

					<div className="grid grid-cols-2 gap-3 mb-4">
						<div className="flex items-center text-sm text-gray-600">
							<CalendarIcon className="w-4 h-4 mr-2 flex-shrink-0" />
							<span className="line-clamp-1">
								{formatDate(event.startDate)}
							</span>
						</div>
						{event.location && (
							<div className="flex items-center text-sm text-gray-600">
								<MapPinIcon className="w-4 h-4 mr-2 flex-shrink-0" />
								<span className="line-clamp-1">{event.location}</span>
							</div>
						)}
					</div>

					{/* School Category Limits */}
					{event.schoolCategoryLimits &&
						event.schoolCategoryLimits.length > 0 && (
							<div className="mb-4">
								<div className="flex flex-wrap gap-2">
									{event.schoolCategoryLimits.map((limit) => (
										<div
											key={limit.id}
											className="flex items-center text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded"
										>
											<UsersIcon className="w-3 h-3 mr-1" />
											<span>
												<span className="font-medium">
													{limit.schoolCategory.name}:
												</span>{" "}
												{limit.maxParticipants}
											</span>
										</div>
									))}
								</div>
							</div>
						)}

					<div className="text-xs text-gray-500 mb-4">
						Dibuat oleh: {event.createdBy.name} ({event.createdBy.email})
					</div>

					{/* Actions */}
					<div className="flex items-center gap-2">
						{/* Pin/Unpin Button */}
						<button
							onClick={() => onTogglePin(event.id, event.isPinned)}
							className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
								event.isPinned
									? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
									: "bg-gray-100 text-gray-700 hover:bg-gray-200"
							}`}
						>
							{event.isPinned ? (
								<>
									<XMarkIcon className="w-4 h-4" />
									Unpin
								</>
							) : (
								<>
									<StarIcon className="w-4 h-4" />
									Pin ke Carousel
								</>
							)}
						</button>

						{/* Order Controls (only for pinned events) */}
						{event.isPinned && (
							<div className="flex gap-1">
								<button
									onClick={() => onUpdateOrder(event.id, "up")}
									disabled={!canMoveUp}
									className={`p-2 rounded-lg transition-colors ${
										canMoveUp
											? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
											: "bg-gray-100 text-gray-400 cursor-not-allowed"
									}`}
									title="Pindah ke atas"
								>
									<ArrowUpIcon className="w-4 h-4" />
								</button>
								<button
									onClick={() => onUpdateOrder(event.id, "down")}
									disabled={!canMoveDown}
									className={`p-2 rounded-lg transition-colors ${
										canMoveDown
											? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
											: "bg-gray-100 text-gray-400 cursor-not-allowed"
									}`}
									title="Pindah ke bawah"
								>
									<ArrowDownIcon className="w-4 h-4" />
								</button>
							</div>
						)}

						{/* View Event */}
						<Link
							to={`/events/${event.slug || event.id}`}
							target="_blank"
							className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
						>
							<EyeIcon className="w-4 h-4" />
							Lihat Event
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
};

export default EventManagement;
