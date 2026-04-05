import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { LuCalendar, LuMapPin, LuSearch, LuX, LuChevronLeft, LuChevronRight, LuFlame, LuClock, LuFilter, LuHeart, LuMessageCircle } from "react-icons/lu";
import { calculateDistance, getCityByName } from "../../utils/indonesiaCities";
import { Event } from "../../types/landing";
import { config } from "../../utils/config";

interface EventGridProps {
	events: Event[];
}

type SortType = "default" | "newest" | "popular" | "nearest";
type StatusFilter = "all" | "available" | "active" | "completed";

interface UserLocation {
	latitude: number;
	longitude: number;
}

const EVENTS_PER_PAGE = 25;

const isAvailableEventStatus = (status: string) =>
	status === "PUBLISHED" || status === "REGISTRATION_OPEN";

const isActiveEventStatus = (status: string) =>
	status === "ONGOING" || status === "ACTIVE";

const getEventStatusPriority = (status: string) => {
	if (isActiveEventStatus(status)) return 0;
	if (isAvailableEventStatus(status)) return 1;
	if (status === "COMPLETED") return 2;
	return 3;
};

const isPromotedEvent = (event: Event) => Boolean(event.isPinned || event.featured);

const getPinnedOrderValue = (event: Event) =>
	typeof event.pinnedOrder === "number" ? event.pinnedOrder : Number.MAX_SAFE_INTEGER;

const getPromotionPriority = (event: Event) => {
	if (event.status === "COMPLETED") return 1;
	return isPromotedEvent(event) ? 0 : 1;
};

const EventGrid: React.FC<EventGridProps> = ({ events }) => {
	const [currentPage, setCurrentPage] = useState(1);
	const [sortBy, setSortBy] = useState<SortType>("default");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
	const [locationLoading, setLocationLoading] = useState(false);
	const [locationError, setLocationError] = useState<string | null>(null);

	const requestUserLocation = () => {
		if (!navigator.geolocation) {
			setLocationError("Geolocation tidak didukung oleh browser Anda");
			return;
		}
		setLocationLoading(true);
		setLocationError(null);
		navigator.geolocation.getCurrentPosition(
			(position) => {
				setUserLocation({
					latitude: position.coords.latitude,
					longitude: position.coords.longitude,
				});
				setLocationLoading(false);
				setSortBy("nearest");
			},
			(error) => {
				setLocationLoading(false);
				switch (error.code) {
					case error.PERMISSION_DENIED:
						setLocationError("Izin lokasi ditolak. Aktifkan GPS untuk fitur ini.");
						break;
					case error.POSITION_UNAVAILABLE:
						setLocationError("Informasi lokasi tidak tersedia");
						break;
					case error.TIMEOUT:
						setLocationError("Permintaan lokasi timeout");
						break;
					default:
						setLocationError("Gagal mendapatkan lokasi");
				}
			},
			{ enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
		);
	};

	const handleSortChange = (sort: SortType) => {
		if (sort === "nearest") {
			if (userLocation) {
				setSortBy("nearest");
			} else {
				requestUserLocation();
			}
		} else {
			setSortBy(sort);
		}
		setCurrentPage(1);
	};

	const filteredByStatus = useMemo(() => {
		if (statusFilter === "all") return events;
		switch (statusFilter) {
			case "available":
				return events.filter((e) => isAvailableEventStatus(e.status));
			case "active":
				return events.filter((e) => isActiveEventStatus(e.status));
			case "completed":
				return events.filter((e) => e.status === "COMPLETED");
			default:
				return events;
		}
	}, [events, statusFilter]);

	const filteredEvents = useMemo(() => {
		if (!searchQuery.trim()) return filteredByStatus;
		const q = searchQuery.toLowerCase();
		return filteredByStatus.filter(
			(e) =>
				e.title.toLowerCase().includes(q) ||
				e.location?.toLowerCase().includes(q) ||
				e.city?.toLowerCase().includes(q) ||
				e.province?.toLowerCase().includes(q) ||
				e.category?.toLowerCase().includes(q)
		);
	}, [filteredByStatus, searchQuery]);

	const sortedEvents = useMemo(() => {
		const eventsCopy = [...filteredEvents];
		switch (sortBy) {
			case "newest":
				return eventsCopy.sort((a, b) => {
					const dateA = new Date(a.createdAt || a.startDate).getTime();
					const dateB = new Date(b.createdAt || b.startDate).getTime();
					return dateB - dateA;
				});
			case "popular":
				return eventsCopy.sort((a, b) => {
					const popularityA = (a.likesCount || 0) + (a.commentsCount || 0);
					const popularityB = (b.likesCount || 0) + (b.commentsCount || 0);
					return popularityB - popularityA;
				});
			case "nearest":
				if (!userLocation) return eventsCopy;
				return eventsCopy
					.map((event) => {
						const cityData = event.city ? getCityByName(event.city) : undefined;
						const distance = cityData
							? calculateDistance(
									userLocation.latitude,
									userLocation.longitude,
									cityData.latitude,
									cityData.longitude
							  )
							: Infinity;
						return { ...event, distance };
					})
					.sort((a, b) => a.distance - b.distance);
			default:
				return eventsCopy.sort((a, b) => {
					const promotionPriorityDiff =
						getPromotionPriority(a) - getPromotionPriority(b);
					if (promotionPriorityDiff !== 0) return promotionPriorityDiff;

					const statusPriorityDiff =
						getEventStatusPriority(a.status) - getEventStatusPriority(b.status);
					if (statusPriorityDiff !== 0) return statusPriorityDiff;

					const aIsPromoted = isPromotedEvent(a);
					const bIsPromoted = isPromotedEvent(b);
					if (aIsPromoted !== bIsPromoted) return aIsPromoted ? -1 : 1;

					if (aIsPromoted && bIsPromoted) {
						const pinnedOrderDiff =
							getPinnedOrderValue(a) - getPinnedOrderValue(b);
						if (pinnedOrderDiff !== 0) return pinnedOrderDiff;
					}

					// Events with poster first
					const aHasPoster = a.thumbnail ? 1 : 0;
					const bHasPoster = b.thumbnail ? 1 : 0;
					if (aHasPoster !== bHasPoster) return bHasPoster - aHasPoster;

					if (a.status === "COMPLETED" && b.status === "COMPLETED") {
						return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
					}

					if (isActiveEventStatus(a.status) && isActiveEventStatus(b.status)) {
						return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
					}

					return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
				});
		}
	}, [filteredEvents, sortBy, userLocation]);

	const totalPages = Math.ceil(sortedEvents.length / EVENTS_PER_PAGE);
	const startIndex = (currentPage - 1) * EVENTS_PER_PAGE;
	const endIndex = startIndex + EVENTS_PER_PAGE;
	const paginatedEvents = sortedEvents.slice(startIndex, endIndex);

	const getImageUrl = (imageUrl: string | null): string => {
		if (!imageUrl) return "";
		if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
			return imageUrl;
		}
		return `${config.api.backendUrl}${imageUrl}`;
	};

	const formatDate = (dateString: string): string => {
		return new Date(dateString).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "short",
		});
	};

	const getStatusLabel = (
		status: string,
		isPromoted?: boolean
	): { label: string; className: string } => {
		if (isPromoted)
			return { label: "Unggulan", className: "bg-red-500/80 text-white" };
		switch (status) {
			case "PUBLISHED":
			case "REGISTRATION_OPEN":
				return { label: "Buka", className: "bg-green-500/80 text-white" };
			case "ONGOING":
			case "ACTIVE":
				return { label: "Aktif", className: "bg-emerald-500/80 text-white" };
			case "COMPLETED":
				return { label: "Selesai", className: "bg-gray-500/80 text-white" };
			default:
				return { label: "Segera", className: "bg-orange-500/80 text-white" };
		}
	};

	const sortOptions = [
		{ id: "default" as SortType, label: "Default", icon: LuFilter },
		{ id: "newest" as SortType, label: "Terbaru", icon: LuClock },
		{ id: "popular" as SortType, label: "Populer", icon: LuFlame },
		{ id: "nearest" as SortType, label: "Terdekat", icon: LuMapPin },
	];

	const statusOptions: { id: StatusFilter; label: string }[] = [
		{ id: "all", label: "Semua" },
		{ id: "available", label: "Tersedia" },
		{ id: "active", label: "Berlangsung" },
		{ id: "completed", label: "Selesai" },
	];

	return (
		<div>
			{/* Search + Filters */}
			<div className="mb-6 space-y-4">
				{/* Search bar */}
				<div className="relative">
					<LuSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => {
							setSearchQuery(e.target.value);
							setCurrentPage(1);
						}}
						placeholder="Cari event berdasarkan nama, lokasi, atau kategori..."
						className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-gray-100/80 dark:bg-white/[0.06] border border-gray-200/50 dark:border-white/[0.08] text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 transition-colors"
					/>
					{searchQuery && (
						<button
							onClick={() => {
								setSearchQuery("");
								setCurrentPage(1);
							}}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
						>
							<LuX className="w-4 h-4" />
						</button>
					)}
				</div>

				{/* Status filter + Sort */}
				<div className="flex flex-wrap items-center gap-3">
					{/* Status filter pills */}
					<div className="flex items-center gap-1.5">
						<span className="text-xs text-gray-500 dark:text-gray-400 mr-1">Status:</span>
						{statusOptions.map((opt) => (
							<button
								key={opt.id}
								onClick={() => {
									setStatusFilter(opt.id);
									setCurrentPage(1);
								}}
								className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
									statusFilter === opt.id
										? "bg-orange-500 text-white"
										: "bg-gray-200/60 dark:bg-white/[0.08] text-gray-600 dark:text-gray-300 hover:bg-gray-300/60 dark:hover:bg-white/[0.14]"
								}`}
							>
								{opt.label}
							</button>
						))}
					</div>

					<div className="w-px h-5 bg-gray-300/50 dark:bg-white/10 hidden sm:block" />

					{/* Sort options */}
					<div className="flex items-center gap-1.5">
						<span className="text-xs text-gray-500 dark:text-gray-400 mr-1">Urutkan:</span>
						{sortOptions.map((option) => {
							const Icon = option.icon;
							const isActive = sortBy === option.id;
							const isNearestLoading = option.id === "nearest" && locationLoading;

							return (
								<button
									key={option.id}
									onClick={() => handleSortChange(option.id)}
									disabled={isNearestLoading}
									className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all ${
										isActive
											? "bg-orange-500 text-white"
											: "bg-gray-200/60 dark:bg-white/[0.08] text-gray-600 dark:text-gray-300 hover:bg-gray-300/60 dark:hover:bg-white/[0.14]"
									} ${isNearestLoading ? "opacity-50 cursor-wait" : ""}`}
								>
									<Icon className="w-3.5 h-3.5" />
									<span>{isNearestLoading ? "Mencari..." : option.label}</span>
								</button>
							);
						})}
					</div>
				</div>
			</div>

			{/* Result info */}
			<p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
				{sortedEvents.length > 0 ? (
					<>
						Menampilkan {startIndex + 1}-{Math.min(endIndex, sortedEvents.length)}{" "}
						dari {sortedEvents.length} event
					</>
				) : (
					"Tidak ada event yang ditemukan"
				)}
			</p>

			{/* Location Error */}
			{locationError && (
				<div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/40 rounded-xl">
					<p className="text-sm text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
						<LuMapPin className="w-4 h-4" />
						{locationError}
					</p>
				</div>
			)}

			{/* Nearest info */}
			{sortBy === "nearest" && userLocation && (
				<div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/40 rounded-xl">
					<p className="text-sm text-orange-700 dark:text-orange-400 flex items-center gap-2">
						<LuMapPin className="w-4 h-4" />
						Event diurutkan berdasarkan jarak dari lokasi Anda
					</p>
				</div>
			)}

			{sortedEvents.length === 0 ? (
				<div className="text-center py-16">
					<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center">
						<LuCalendar className="w-8 h-8 text-gray-400 dark:text-gray-500" />
					</div>
					<p className="text-gray-500 dark:text-gray-400 text-sm">
						Tidak ada event yang ditemukan
					</p>
				</div>
			) : (
				<>
					{/* Event grid - 5 columns × 5 rows */}
					<div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
						{paginatedEvents.map((event) => {
							const status = getStatusLabel(
								event.status,
								isPromotedEvent(event)
							);

							return (
								<Link
									key={event.id}
									to={`/events/${event.slug || event.id}`}
									className="group relative rounded-xl overflow-hidden bg-gray-100/50 dark:bg-white/[0.03] border border-gray-200/50 dark:border-white/[0.06] hover:border-orange-400/30 dark:hover:border-orange-500/20 transition-all duration-300 hover:scale-[1.02]"
								>
									{/* Poster - 2:3 ratio */}
									<div className="relative aspect-[2/3] w-full bg-gradient-to-br from-orange-900/10 to-red-900/10 overflow-hidden">
										{event.thumbnail ? (
											<img
												src={getImageUrl(event.thumbnail)}
												alt={event.title}
												className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
												loading="lazy"
											/>
										) : (
											<div className="w-full h-full flex items-center justify-center">
												<LuCalendar className="w-6 h-6 text-gray-400/40 dark:text-gray-600" />
											</div>
										)}
										<div className="absolute top-1.5 left-1.5">
											<span
												className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full backdrop-blur-sm ${status.className}`}
											>
												{status.label}
											</span>
										</div>
										<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-5">
											<div className="flex items-center gap-2.5 text-white/80">
												<div className="flex items-center gap-0.5">
													<LuHeart className="w-3 h-3" />
													<span className="text-[8px] lg:text-[9px] font-medium">{event.likesCount || 0}</span>
												</div>
												<div className="flex items-center gap-0.5">
													<LuMessageCircle className="w-3 h-3" />
													<span className="text-[8px] lg:text-[9px] font-medium">{event.commentsCount || 0}</span>
												</div>
											</div>
										</div>
									</div>

									{/* Info */}
									<div className="p-2">
										<h4 className="text-[10px] lg:text-xs font-semibold text-gray-800 dark:text-white leading-tight line-clamp-2 mb-1">
											{event.title}
										</h4>
										<div className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
											<LuCalendar className="w-3 h-3 flex-shrink-0" />
											<span className="text-[8px] lg:text-[9px]">
												{formatDate(event.startDate)}
											</span>
										</div>
										{(event.location || event.city) && (
											<div className="flex items-center gap-1 text-gray-400 dark:text-gray-500 mt-0.5">
												<LuMapPin className="w-3 h-3 flex-shrink-0" />
												<span className="text-[8px] lg:text-[9px] line-clamp-1">
													{event.city || event.location}
												</span>
											</div>
										)}
									</div>
								</Link>
							);
						})}
					</div>

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex items-center justify-center gap-3 mt-8">
							<button
								onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
								disabled={currentPage === 1}
								className="w-8 h-8 rounded-full bg-gray-200/50 dark:bg-white/[0.06] border border-gray-300/50 dark:border-white/10 text-gray-500 dark:text-gray-400 flex items-center justify-center hover:bg-gray-300/50 dark:hover:bg-white/[0.12] transition-colors disabled:opacity-30 disabled:pointer-events-none"
							>
								<LuChevronLeft className="w-4 h-4" />
							</button>

							<div className="flex gap-1.5">
								{Array.from({ length: totalPages }, (_, i) => i + 1).map(
									(page) => {
										if (
											page === 1 ||
											page === totalPages ||
											(page >= currentPage - 1 && page <= currentPage + 1)
										) {
											return (
												<button
													key={page}
													onClick={() => setCurrentPage(page)}
													className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
														page === currentPage
															? "bg-orange-500 text-white"
															: "bg-gray-200/50 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300 hover:bg-gray-300/50 dark:hover:bg-white/[0.12]"
													}`}
												>
													{page}
												</button>
											);
										} else if (
											page === currentPage - 2 ||
											page === currentPage + 2
										) {
											return (
												<span
													key={page}
													className="w-8 h-8 flex items-center justify-center text-gray-400 dark:text-gray-500 text-xs"
												>
													...
												</span>
											);
										}
										return null;
									}
								)}
							</div>

							<button
								onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
								disabled={currentPage === totalPages}
								className="w-8 h-8 rounded-full bg-gray-200/50 dark:bg-white/[0.06] border border-gray-300/50 dark:border-white/10 text-gray-500 dark:text-gray-400 flex items-center justify-center hover:bg-gray-300/50 dark:hover:bg-white/[0.12] transition-colors disabled:opacity-30 disabled:pointer-events-none"
							>
								<LuChevronRight className="w-4 h-4" />
							</button>
						</div>
					)}
				</>
			)}
		</div>
	);
};

export default EventGrid;
