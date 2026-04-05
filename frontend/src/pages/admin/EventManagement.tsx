import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
	CalendarIcon,
	MapPinIcon,
	UsersIcon,
	StarIcon,
	EyeIcon,
	ArrowUpIcon,
	ArrowDownIcon,
	XMarkIcon,
	MagnifyingGlassIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	Cog6ToothIcon,
	TrashIcon,
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
	paymentStatus: string | null;
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
	const navigate = useNavigate();
	const [events, setEvents] = useState<Event[]>([]);
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState<"all" | "pinned" | "unpinned">("all");
	const [statusFilter, setStatusFilter] = useState<"all" | "PUBLISHED" | "ONGOING" | "COMPLETED" | "DRAFT" | "CANCELLED">("all");
	const [searchTerm, setSearchTerm] = useState("");

	const handleManageEvent = (event: Event) => {
		// Set active event in localStorage for admin
		localStorage.setItem(
			"admin_active_event",
			JSON.stringify({ slug: event.slug || event.id, title: event.title, id: event.id })
		);
		// Navigate to admin event management page
		navigate(`/admin/events/${event.slug || event.id}/manage`);
	};

	// Pagination states
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(5);

	useEffect(() => {
		fetchEvents();
	}, []);

	const fetchEvents = async () => {
		try {
			setLoading(true);
			// Use admin endpoint to get ALL events without date filtering
			const response = await api.get("/events/admin/all");
			setEvents(response.data.data || response.data);
		} catch (error) {
			console.error("Error fetching events:", error);
			showError("Gagal memuat data event");
		} finally {
			setLoading(false);
		}
	};

	const handleDeleteEvent = async (eventId: string, eventTitle: string) => {
		const confirmed = await showConfirm(
			"Hapus Event?",
			`Apakah Anda yakin ingin menghapus event "${eventTitle}"? Semua data terkait (peserta, penilaian, materi, dll) akan ikut terhapus. Tindakan ini tidak dapat dibatalkan.`
		);

		if (!confirmed) return;

		try {
			await api.delete(`/events/${eventId}`);
			showSuccess("Event berhasil dihapus");
			fetchEvents();
		} catch (error: any) {
			console.error("Error deleting event:", error);
			showError(error.response?.data?.message || "Gagal menghapus event");
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
			await api.patch(`/events/${eventId}/pin`, {
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
				api.patch(`/events/${event.id}/pin`, {
					isPinned: true,
					pinnedOrder: targetEvent.pinnedOrder,
				}),
				api.patch(`/events/${targetEvent.id}/pin`, {
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
			import.meta.env.VITE_BACKEND_URL || "";
		return `${backendUrl}${thumbnail}`;
	};

	const getStatusBadge = (status: string) => {
		const statusConfig: {
			[key: string]: { label: string; className: string };
		} = {
			DRAFT: {
				label: "Draft",
				className:
					"bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300",
			},
			PUBLISHED: {
				label: "Published",
				className:
					"bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400",
			},
			ONGOING: {
				label: "Ongoing",
				className:
					"bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400",
			},
			COMPLETED: {
				label: "Completed",
				className:
					"bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400",
			},
			CANCELLED: {
				label: "Cancelled",
				className:
					"bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400",
			},
		};

		const config = statusConfig[status] || {
			label: status,
			className:
				"bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300",
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
		const matchesFilter =
			filter === "all" ||
			(filter === "pinned" && event.isPinned) ||
			(filter === "unpinned" && !event.isPinned);

		const matchesStatus =
			statusFilter === "all" || event.status === statusFilter;

		const matchesSearch =
			searchTerm === "" ||
			event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			event.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			event.category?.toLowerCase().includes(searchTerm.toLowerCase());

		return matchesFilter && matchesStatus && matchesSearch;
	});

	const pinnedEvents = filteredEvents
		.filter((e) => e.isPinned)
		.sort((a, b) => (a.pinnedOrder || 0) - (b.pinnedOrder || 0));
	const unpinnedEvents = filteredEvents.filter((e) => !e.isPinned);

	// Pagination for unpinned events only
	const totalUnpinnedPages = Math.ceil(unpinnedEvents.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const paginatedUnpinnedEvents = unpinnedEvents.slice(startIndex, endIndex);

	// Reset to page 1 when filters change
	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm, filter]);

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const handleItemsPerPageChange = (value: number) => {
		setItemsPerPage(value);
		setCurrentPage(1);
	};

	// Generate page numbers to display
	const getPageNumbers = () => {
		const pages: (number | string)[] = [];
		const maxVisiblePages = 5;

		if (totalUnpinnedPages <= maxVisiblePages) {
			for (let i = 1; i <= totalUnpinnedPages; i++) {
				pages.push(i);
			}
		} else {
			pages.push(1);

			if (currentPage > 3) {
				pages.push("...");
			}

			const start = Math.max(2, currentPage - 1);
			const end = Math.min(totalUnpinnedPages - 1, currentPage + 1);

			for (let i = start; i <= end; i++) {
				pages.push(i);
			}

			if (currentPage < totalUnpinnedPages - 2) {
				pages.push("...");
			}

			pages.push(totalUnpinnedPages);
		}

		return pages;
	};

	return (
		<div className="min-h-screen">
			{/* Header */}
			<header className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm shadow dark:shadow-gray-900/50">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center py-6">
						<div>
							<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
								Event Management
							</h1>
							<p className="text-gray-600 dark:text-gray-400 mt-1">
								Kelola semua event dan atur carousel landing page
							</p>
						</div>
					</div>
				</div>
			</header>

			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Search and Filters */}
				<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-sm p-4 mb-6">
					<div className="space-y-4">
						{/* Search Bar */}
						<div className="relative">
							<MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
							<input
								type="text"
								placeholder="Cari event berdasarkan judul, deskripsi, lokasi, atau kategori..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
							/>
						</div>

						{/* Filter Tabs */}
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-4">
								<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
									Filter:
								</span>
								<div className="flex gap-2">
									<button
										onClick={() => setFilter("all")}
										className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
											filter === "all"
												? "bg-red-600 dark:bg-red-500 text-white"
												: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
										}`}
									>
										Semua Event ({events.length})
									</button>
									<button
										onClick={() => setFilter("pinned")}
										className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
											filter === "pinned"
												? "bg-red-600 dark:bg-red-500 text-white"
												: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
										}`}
									>
										Pinned ({events.filter((e) => e.isPinned).length})
									</button>
									<button
										onClick={() => setFilter("unpinned")}
										className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
											filter === "unpinned"
												? "bg-red-600 dark:bg-red-500 text-white"
												: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
										}`}
									>
										Unpinned ({events.filter((e) => !e.isPinned).length})
									</button>
								</div>

								{/* Status Filter */}
								<div className="flex items-center gap-2 ml-4 pl-4 border-l border-gray-300 dark:border-gray-600">
									<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
										Status:
									</span>
									<select
										value={statusFilter}
										onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
										className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
									>
										<option value="all">Semua Status</option>
										<option value="PUBLISHED">Published</option>
										<option value="ONGOING">Ongoing</option>
										<option value="COMPLETED">Completed</option>
										<option value="DRAFT">Draft</option>
										<option value="CANCELLED">Cancelled</option>
									</select>
								</div>
							</div>

							{/* Items per page selector */}
							{unpinnedEvents.length > 0 && (
								<div className="flex items-center gap-2">
									<span className="text-sm text-gray-600 dark:text-gray-400">
										Per halaman:
									</span>
									<select
										value={itemsPerPage}
										onChange={(e) =>
											handleItemsPerPageChange(Number(e.target.value))
										}
										className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
									>
										<option value={5}>5</option>
										<option value={10}>10</option>
										<option value={25}>25</option>
										<option value={50}>50</option>
									</select>
								</div>
							)}
						</div>
					</div>
				</div>

				{loading ? (
					<div className="flex justify-center items-center py-12">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 dark:border-red-400"></div>
					</div>
				) : (
					<>
						{/* Pinned Events Section */}
						{pinnedEvents.length > 0 && (
							<div className="mb-8">
								<div className="flex items-center gap-2 mb-4">
									<StarIconSolid className="w-6 h-6 text-yellow-500" />
									<h2 className="text-xl font-bold text-gray-900 dark:text-white">
										Pinned Events (Tampil di Carousel)
									</h2>
								</div>
								<div className="bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
									<p className="text-sm text-yellow-800 dark:text-yellow-300">
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
											onUpdateOrder={handleUpdatePinnedOrder}										onManage={handleManageEvent}											onDelete={handleDeleteEvent}
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
								<h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
									{filter === "unpinned" ? "Unpinned Events" : "Event Lainnya"}
								</h2>
								<div className="space-y-4">
									{paginatedUnpinnedEvents.map((event) => (
										<EventCard
											key={event.id}
											event={event}
											onTogglePin={handleTogglePin}
											onUpdateOrder={handleUpdatePinnedOrder}										onManage={handleManageEvent}											onDelete={handleDeleteEvent}
											canMoveUp={false}
											canMoveDown={false}
											getImageUrl={getImageUrl}
											formatDate={formatDate}
											getStatusBadge={getStatusBadge}
										/>
									))}
								</div>

								{/* Pagination for Unpinned Events */}
								{totalUnpinnedPages > 1 && (
									<div className="mt-6 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-sm p-4">
										<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
											{/* Info */}
											<div className="text-sm text-gray-600 dark:text-gray-400">
												Menampilkan{" "}
												<span className="font-medium text-gray-900 dark:text-white">
													{startIndex + 1}
												</span>{" "}
												-{" "}
												<span className="font-medium text-gray-900 dark:text-white">
													{Math.min(endIndex, unpinnedEvents.length)}
												</span>{" "}
												dari{" "}
												<span className="font-medium text-gray-900 dark:text-white">
													{unpinnedEvents.length}
												</span>{" "}
												event
											</div>

											{/* Pagination Controls */}
											<div className="flex items-center gap-2">
												{/* Previous Button */}
												<button
													onClick={() => handlePageChange(currentPage - 1)}
													disabled={currentPage === 1}
													className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
													aria-label="Previous page"
												>
													<ChevronLeftIcon className="w-5 h-5" />
												</button>

												{/* Page Numbers */}
												<div className="flex items-center gap-1">
													{getPageNumbers().map((page, index) => (
														<React.Fragment key={index}>
															{page === "..." ? (
																<span className="px-3 py-2 text-gray-400 dark:text-gray-500">
																	...
																</span>
															) : (
																<button
																	onClick={() =>
																		handlePageChange(page as number)
																	}
																	className={`min-w-[40px] px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
																		currentPage === page
																			? "bg-red-600 dark:bg-red-500 text-white"
																			: "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
																	}`}
																>
																	{page}
																</button>
															)}
														</React.Fragment>
													))}
												</div>

												{/* Next Button */}
												<button
													onClick={() => handlePageChange(currentPage + 1)}
													disabled={currentPage === totalUnpinnedPages}
													className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
													aria-label="Next page"
												>
													<ChevronRightIcon className="w-5 h-5" />
												</button>
											</div>
										</div>
									</div>
								)}
							</div>
						)}

						{filteredEvents.length === 0 && (
							<div className="text-center py-12">
								<CalendarIcon className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
								<p className="text-gray-500 dark:text-gray-400 text-lg">
									Tidak ada event
								</p>
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
	onManage: (event: Event) => void;
	onDelete: (eventId: string, eventTitle: string) => void;
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
	onManage,
	onDelete,
	canMoveUp,
	canMoveDown,
	getImageUrl,
	formatDate,
	getStatusBadge,
}) => {
	return (
		<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-sm dark:shadow-gray-900/50 hover:shadow-md transition-shadow overflow-hidden">
			<div className="flex">
				{/* Thumbnail */}
				<div className="w-48 h-48 flex-shrink-0 bg-gradient-to-br from-red-500 to-orange-600 dark:from-red-600 dark:to-orange-700 relative">
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
								<h3 className="text-lg font-bold text-gray-900 dark:text-white">
									{event.title}
								</h3>
								{getStatusBadge(event.status)}
								{event.paymentStatus === "DP_REQUESTED" && (
									<span className="px-2 py-0.5 bg-amber-500 text-white text-xs font-semibold rounded-full">
										DP
									</span>
								)}
							</div>
							{event.category && (
								<span className="inline-block px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 text-xs font-medium rounded mb-2">
									{event.category}
								</span>
							)}
						</div>
					</div>

					{event.description && (
						<p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
							{event.description}
						</p>
					)}

					<div className="grid grid-cols-2 gap-3 mb-4">
						<div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
							<CalendarIcon className="w-4 h-4 mr-2 flex-shrink-0" />
							<span className="line-clamp-1">
								{formatDate(event.startDate)}
							</span>
						</div>
						{event.location && (
							<div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
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
											className="flex items-center text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded"
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

					<div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
						Dibuat oleh: {event.createdBy.name} ({event.createdBy.email})
					</div>

					{/* Actions */}
					<div className="flex items-center gap-2">
						{/* Pin/Unpin Button */}
						<button
							onClick={() => onTogglePin(event.id, event.isPinned)}
							className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
								event.isPinned
									? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
									: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
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
											? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50"
											: "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed"
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
											? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50"
											: "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed"
									}`}
									title="Pindah ke bawah"
								>
									<ArrowDownIcon className="w-4 h-4" />
								</button>
							</div>
						)}

						{/* Kelola Event */}
						<button
							onClick={() => onManage(event)}
							className="flex items-center gap-2 px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
						>
							<Cog6ToothIcon className="w-4 h-4" />
							Kelola
						</button>

						{/* View Event */}
						<Link
							to={`/events/${event.slug || event.id}`}
							target="_blank"
							className="flex items-center gap-2 px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
						>
							<EyeIcon className="w-4 h-4" />
							Lihat Event
						</Link>

						{/* Delete Event */}
						<button
							onClick={() => onDelete(event.id, event.title)}
							className="flex items-center gap-2 px-4 py-2 bg-red-800 dark:bg-red-900 text-white rounded-lg hover:bg-red-900 dark:hover:bg-red-950 transition-colors"
							title="Hapus Event"
						>
							<TrashIcon className="w-4 h-4" />
							Hapus
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default EventManagement;
