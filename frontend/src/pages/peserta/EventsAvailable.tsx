import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "../../utils/api";
import { Event, SchoolCategory } from "../../types/landing";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { LuCalendar, LuMapPin, LuHeart, LuMessageCircle, LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { config } from "../../utils/config";

const EventsAvailable: React.FC = () => {
	const [events, setEvents] = useState<Event[]>([]);
	const [schoolCategories, setSchoolCategories] = useState<SchoolCategory[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<string>("");
	const scrollRef = useRef<HTMLDivElement>(null);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(false);

	useEffect(() => {
		fetchData();
	}, []);

	const fetchData = async () => {
		try {
			setLoading(true);
			const [eventsRes, categoriesRes] = await Promise.all([
				api.get("/events?status=PUBLISHED"),
				api.get("/events/meta/school-categories"),
			]);
			setEvents(eventsRes.data.data || []);
			setSchoolCategories(categoriesRes.data || []);
		} catch (error) {
			console.error("Error fetching data:", error);
		} finally {
			setLoading(false);
		}
	};

	const filteredEvents = useMemo(() => {
		let filtered = events;
		if (searchTerm) {
			const q = searchTerm.toLowerCase();
			filtered = filtered.filter(
				(event) =>
					event.title.toLowerCase().includes(q) ||
					event.description?.toLowerCase().includes(q) ||
					event.location?.toLowerCase().includes(q)
			);
		}
		if (selectedCategory) {
			filtered = filtered.filter((event) =>
				event.schoolCategoryLimits?.some(
					(limit) => limit.schoolCategory.id === selectedCategory
				)
			);
		}
		return filtered;
	}, [events, searchTerm, selectedCategory]);

	const checkScroll = () => {
		const el = scrollRef.current;
		if (!el) return;
		setCanScrollLeft(el.scrollLeft > 0);
		setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
	};

	useEffect(() => {
		checkScroll();
		const el = scrollRef.current;
		if (el) {
			el.addEventListener("scroll", checkScroll);
			const resizeObserver = new ResizeObserver(checkScroll);
			resizeObserver.observe(el);
			return () => {
				el.removeEventListener("scroll", checkScroll);
				resizeObserver.disconnect();
			};
		}
	}, [filteredEvents]);

	const scroll = (direction: "left" | "right") => {
		const el = scrollRef.current;
		if (!el) return;
		const cardWidth = el.querySelector("a")?.offsetWidth || 200;
		const scrollAmount = cardWidth * 3;
		el.scrollBy({
			left: direction === "left" ? -scrollAmount : scrollAmount,
			behavior: "smooth",
		});
	};

	const getImageUrl = (imageUrl: string | null): string => {
		if (!imageUrl) return "";
		if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;
		return `${config.api.backendUrl}${imageUrl}`;
	};

	const formatDate = (dateString: string): string => {
		return new Date(dateString).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "short",
		});
	};

	const getStatusLabel = (status: string): { label: string; className: string } => {
		switch (status) {
			case "REGISTRATION_OPEN":
				return { label: "Buka", className: "bg-green-500/80 text-white" };
			case "ACTIVE":
				return { label: "Aktif", className: "bg-emerald-500/80 text-white" };
			case "COMPLETED":
				return { label: "Selesai", className: "bg-gray-500/80 text-white" };
			default:
				return { label: "Segera", className: "bg-orange-500/80 text-white" };
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
					<div className="mb-8">
						<div className="h-8 w-48 bg-gray-200/50 dark:bg-white/[0.06] rounded animate-pulse mb-2" />
						<div className="h-4 w-72 bg-gray-200/50 dark:bg-white/[0.06] rounded animate-pulse" />
					</div>
					<div className="flex gap-2.5 overflow-hidden">
						{Array.from({ length: 6 }).map((_, i) => (
							<div
								key={i}
								className="flex-shrink-0 w-[140px] sm:w-[160px] md:w-[180px] rounded-xl bg-gray-200/50 dark:bg-white/[0.03] border border-gray-200/30 dark:border-white/[0.04] animate-pulse"
							>
								<div className="aspect-[2/3]" />
								<div className="p-2 space-y-1.5">
									<div className="h-2.5 bg-gray-300/50 dark:bg-white/[0.06] rounded w-3/4" />
									<div className="h-2 bg-gray-300/50 dark:bg-white/[0.06] rounded w-1/2" />
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Header */}
				<div className="mb-6">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
						Event Tersedia
					</h1>
					<p className="text-gray-600 dark:text-gray-400">
						Temukan dan daftar event paskibra yang sesuai untuk tim Anda
					</p>
				</div>

				{/* Search and Filters */}
				<div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="relative">
						<MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
						<input
							type="text"
							placeholder="Cari event..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm text-gray-900 dark:text-white"
						/>
					</div>
					<select
						value={selectedCategory}
						onChange={(e) => setSelectedCategory(e.target.value)}
						className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm text-gray-900 dark:text-white"
					>
						<option value="">Semua Kategori</option>
						{schoolCategories.map((category) => (
							<option key={category.id} value={category.id}>
								{category.name}
							</option>
						))}
					</select>
				</div>

				{/* Events Horizontal Scroll */}
				{filteredEvents.length === 0 ? (
					<div className="text-center py-12">
						<p className="text-gray-500 dark:text-gray-400">
							Tidak ada event yang ditemukan
						</p>
					</div>
				) : (
					<div className="relative group">
						{/* Left Arrow */}
						{canScrollLeft && (
							<button
								onClick={() => scroll("left")}
								className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/90 dark:bg-gray-800/90 shadow-lg border border-gray-200/50 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-all opacity-0 group-hover:opacity-100 -translate-x-1/2"
							>
								<LuChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
							</button>
						)}

						{/* Right Arrow */}
						{canScrollRight && (
							<button
								onClick={() => scroll("right")}
								className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/90 dark:bg-gray-800/90 shadow-lg border border-gray-200/50 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-all opacity-0 group-hover:opacity-100 translate-x-1/2"
							>
								<LuChevronRight className="w-4 h-4 md:w-5 md:h-5" />
							</button>
						)}

						{/* Scrollable Container */}
						<div
							ref={scrollRef}
							className="flex gap-2.5 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory pb-2"
							style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
						>
							{filteredEvents.map((event) => {
								const status = getStatusLabel(event.status);
								return (
									<Link
										key={event.id}
										to={`/events/${event.slug || event.id}`}
										className="flex-shrink-0 w-[140px] sm:w-[160px] md:w-[180px] snap-start group/card relative rounded-xl overflow-hidden bg-gray-100/50 dark:bg-white/[0.03] border border-gray-200/50 dark:border-white/[0.06] hover:border-orange-400/30 dark:hover:border-orange-500/20 transition-all duration-300 hover:scale-[1.02]"
									>
										{/* Poster - 2:3 ratio */}
										<div className="relative aspect-[2/3] w-full bg-gradient-to-br from-orange-900/10 to-red-900/10 overflow-hidden">
											{event.thumbnail ? (
												<img
													src={getImageUrl(event.thumbnail)}
													alt={event.title}
													className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
													loading="lazy"
												/>
											) : (
												<div className="w-full h-full flex items-center justify-center">
													<LuCalendar className="w-5 h-5 text-gray-400/40 dark:text-gray-600" />
												</div>
											)}
											<div className="absolute top-1.5 left-1.5">
												<span
													className={`text-[7px] font-semibold px-1.5 py-0.5 rounded-full backdrop-blur-sm ${status.className}`}
												>
													{status.label}
												</span>
											</div>
											<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1.5 pt-4">
												<div className="flex items-center gap-2 text-white/80">
													<div className="flex items-center gap-0.5">
														<LuHeart className="w-2.5 h-2.5" />
														<span className="text-[7px] lg:text-[8px] font-medium">{event.likesCount || 0}</span>
													</div>
													<div className="flex items-center gap-0.5">
														<LuMessageCircle className="w-2.5 h-2.5" />
														<span className="text-[7px] lg:text-[8px] font-medium">{event.commentsCount || 0}</span>
													</div>
												</div>
											</div>
										</div>

										<div className="p-1.5 lg:p-2">
											<h4 className="text-[9px] lg:text-[10px] font-semibold text-gray-800 dark:text-white leading-tight line-clamp-2 mb-1">
												{event.title}
											</h4>
											<div className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
												<LuCalendar className="w-2.5 h-2.5 flex-shrink-0" />
												<span className="text-[7px] lg:text-[8px]">
													{formatDate(event.startDate)}
												</span>
											</div>
											{event.location && (
												<div className="flex items-center gap-1 text-gray-400 dark:text-gray-500 mt-0.5">
													<LuMapPin className="w-2.5 h-2.5 flex-shrink-0" />
													<span className="text-[7px] lg:text-[8px] line-clamp-1">
														{event.location}
													</span>
												</div>
											)}
										</div>
									</Link>
								);
							})}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default EventsAvailable;
