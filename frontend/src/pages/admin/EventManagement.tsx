import React, { useState, useEffect, useRef } from "react";
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
	ChevronUpDownIcon,
	ArchiveBoxIcon,
	ScaleIcon,
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
	createdAt: string;
	createdBy: {
		id: string;
		name: string;
		email: string;
	};
	schoolCategoryLimits?: SchoolCategoryLimit[];
}

// Lightweight event shape returned by /admin/overview (sidebar/calendar/upcoming)
interface LiteEvent {
	id: string;
	slug: string | null;
	title: string;
	thumbnail: string | null;
	startDate: string;
	endDate: string;
	status: string;
	isPinned: boolean;
	pinnedOrder: number | null;
}

type SortField = "createdAt" | "title" | "startDate";
type SortDir = "asc" | "desc";

const EventManagement: React.FC = () => {
	const navigate = useNavigate();
	const [events, setEvents] = useState<Event[]>([]);
	const [total, setTotal] = useState(0);
	const [totalAll, setTotalAll] = useState(0);
	const [counts, setCounts] = useState<Record<string, number>>({});
	const [pinned, setPinned] = useState<LiteEvent[]>([]);
	const [active, setActive] = useState<LiteEvent[]>([]);
	const [loading, setLoading] = useState(true);
	const [statusFilter, setStatusFilter] = useState<"all" | "PUBLISHED" | "ONGOING" | "COMPLETED" | "DRAFT" | "CANCELLED">("all");
	const [searchTerm, setSearchTerm] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [sortField, setSortField] = useState<SortField>("createdAt");
	const [sortDir, setSortDir] = useState<SortDir>("desc");

	// Pagination states (server-side)
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);

	// Calendar widget
	const today = new Date();
	const [calCursor, setCalCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
	const [selectedDay, setSelectedDay] = useState(() => new Date(today.getFullYear(), today.getMonth(), today.getDate()));

	// Floating scroll-to-top (page scrolls inside the layout's <main>, not window)
	const rootRef = useRef<HTMLDivElement>(null);
	const scrollerRef = useRef<HTMLElement | null>(null);
	const [showScrollTop, setShowScrollTop] = useState(false);

	useEffect(() => {
		let el = rootRef.current?.parentElement;
		while (el) {
			const oy = getComputedStyle(el).overflowY;
			if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight) break;
			el = el.parentElement;
		}
		scrollerRef.current = el ?? null;
		const target: HTMLElement | Window = el ?? window;
		const onScroll = () => setShowScrollTop((el ? el.scrollTop : window.scrollY) > 300);
		target.addEventListener("scroll", onScroll, { passive: true });
		onScroll();
		return () => target.removeEventListener("scroll", onScroll);
	}, []);

	const scrollToTop = () =>
		(scrollerRef.current ?? window).scrollTo({ top: 0, behavior: "smooth" });

	const handleManageEvent = (event: { id: string; slug: string | null; title: string }) => {
		localStorage.setItem(
			"admin_active_event",
			JSON.stringify({ slug: event.slug || event.id, title: event.title, id: event.id })
		);
		navigate(`/admin/events/${event.slug || event.id}/manage`);
	};

	// Debounce the search input (avoids a request per keystroke)
	useEffect(() => {
		const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
		return () => clearTimeout(t);
	}, [searchTerm]);

	// Reset to first page whenever the query (not the page) changes
	useEffect(() => {
		setCurrentPage(1);
	}, [debouncedSearch, statusFilter, sortField, sortDir, itemsPerPage]);

	// Fetch the current page from the server
	useEffect(() => {
		fetchEvents();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentPage, itemsPerPage, debouncedSearch, statusFilter, sortField, sortDir]);

	// Fetch widget data (pinned / calendar / upcoming) once
	useEffect(() => {
		fetchOverview();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const fetchEvents = async () => {
		try {
			setLoading(true);
			const response = await api.get("/events/admin/all", {
				params: {
					limit: itemsPerPage,
					offset: (currentPage - 1) * itemsPerPage,
					search: debouncedSearch || undefined,
					status: statusFilter !== "all" ? statusFilter : undefined,
					sortField,
					sortDir,
				},
			});
			setEvents(response.data.data || []);
			setTotal(response.data.total ?? 0);
			setTotalAll(response.data.totalAll ?? 0);
			setCounts(response.data.counts ?? {});
		} catch (error) {
			console.error("Error fetching events:", error);
			showError("Gagal memuat data event");
		} finally {
			setLoading(false);
		}
	};

	const fetchOverview = async () => {
		try {
			const response = await api.get("/events/admin/overview");
			setPinned(response.data.pinned || []);
			setActive(response.data.active || []);
		} catch (error) {
			console.error("Error fetching overview:", error);
		}
	};

	// Re-fetch both the list and widget data after a mutation
	const refreshAll = () => {
		fetchEvents();
		fetchOverview();
	};

	const handleDeleteEvent = async (eventId: string, eventTitle: string) => {
		const confirmed = await showConfirm(
			`Event "${eventTitle}" akan dipindahkan ke Archived Event. Data tidak hilang dan bisa dipulihkan kapan saja dari halaman Archived Event.`,
			"Arsipkan Event?",
			"Ya, Arsipkan"
		);
		if (!confirmed.isConfirmed) return;
		try {
			await api.delete(`/events/${eventId}`);
			showSuccess("Event berhasil dihapus");
			refreshAll();
		} catch (error: any) {
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
		if (!confirmed.isConfirmed) return;
		try {
			await api.patch(`/events/${eventId}/pin`, {
				isPinned: !currentPinned,
				pinnedOrder: !currentPinned ? getNextPinnedOrder() : null,
			});
			showSuccess(currentPinned ? "Event berhasil di-unpin" : "Event berhasil di-pin");
			refreshAll();
		} catch (error: any) {
			showError(error.response?.data?.message || "Gagal mengubah status pin");
		}
	};

	const handleUpdatePinnedOrder = async (eventId: string, direction: "up" | "down") => {
		const event = pinned.find((e) => e.id === eventId);
		if (!event || !event.isPinned || event.pinnedOrder === null) return;

		const sorted = pinned
			.filter((e) => e.isPinned && e.pinnedOrder !== null)
			.sort((a, b) => (a.pinnedOrder || 0) - (b.pinnedOrder || 0));

		const idx = sorted.findIndex((e) => e.id === eventId);
		const targetIdx = direction === "up" ? idx - 1 : idx + 1;
		if (targetIdx < 0 || targetIdx >= sorted.length) return;

		const target = sorted[targetIdx];
		if (!target) return;

		try {
			await Promise.all([
				api.patch(`/events/${event.id}/pin`, { isPinned: true, pinnedOrder: target.pinnedOrder }),
				api.patch(`/events/${target.id}/pin`, { isPinned: true, pinnedOrder: event.pinnedOrder }),
			]);
			showSuccess("Urutan berhasil diubah");
			refreshAll();
		} catch {
			showError("Gagal mengubah urutan");
		}
	};

	const getNextPinnedOrder = () => {
		if (pinned.length === 0) return 1;
		return Math.max(...pinned.map((e) => e.pinnedOrder || 0)) + 1;
	};

	const formatDate = (dateString: string) =>
		new Date(dateString).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

	// ─── Calendar helpers ────────────────────────────────────
	const isSameDay = (a: Date, b: Date) =>
		a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

	// Events that start on / are running through a given day (from the active set)
	const eventsOnDay = (day: Date) => {
		const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
		const dayEnd = dayStart + 86400000 - 1;
		return active.filter((e) => {
			const s = new Date(e.startDate).getTime();
			const en = new Date(e.endDate || e.startDate).getTime();
			return s <= dayEnd && en >= dayStart;
		});
	};

	// Build the 6-week grid (Monday-first) for the cursor month
	const buildCalendarGrid = () => {
		const year = calCursor.getFullYear();
		const month = calCursor.getMonth();
		const firstOffset = (new Date(year, month, 1).getDay() + 6) % 7; // Mon = 0
		const gridStart = new Date(year, month, 1 - firstOffset);
		return Array.from({ length: 42 }, (_, i) => new Date(year, month, gridStart.getDate() + i));
	};

	const selectedDayEvents = eventsOnDay(selectedDay);

	// Published events that are ongoing or upcoming, nearest start first
	const upcomingEvents = active
		.filter((e) => (e.status === "PUBLISHED" || e.status === "ONGOING") && new Date(e.endDate || e.startDate).getTime() >= today.getTime())
		.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

	const getImageUrl = (thumbnail: string | null) => {
		if (!thumbnail) return null;
		if (thumbnail.startsWith("http://") || thumbnail.startsWith("https://")) return thumbnail;
		return `${import.meta.env.VITE_BACKEND_URL || ""}${thumbnail}`;
	};

	const statusConfig: Record<string, { label: string; cls: string }> = {
		DRAFT: { label: "Draft", cls: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" },
		PUBLISHED: { label: "Published", cls: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" },
		ONGOING: { label: "Ongoing", cls: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" },
		COMPLETED: { label: "Completed", cls: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400" },
		CANCELLED: { label: "Cancelled", cls: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" },
	};

	// Order used for stat cards and grouped sections
	const STATUS_ORDER = ["ONGOING", "PUBLISHED", "DRAFT", "COMPLETED", "CANCELLED"] as const;
	const statusMeta: Record<(typeof STATUS_ORDER)[number], { label: string; dot: string; accent: string; activeRing: string }> = {
		ONGOING: { label: "Berlangsung", dot: "bg-blue-500", accent: "text-blue-600 dark:text-blue-400", activeRing: "ring-blue-500/50 bg-blue-500/5" },
		PUBLISHED: { label: "Dipublikasi", dot: "bg-green-500", accent: "text-green-600 dark:text-green-400", activeRing: "ring-green-500/50 bg-green-500/5" },
		DRAFT: { label: "Draft", dot: "bg-gray-400", accent: "text-gray-600 dark:text-gray-300", activeRing: "ring-gray-400/50 bg-gray-400/5" },
		COMPLETED: { label: "Selesai", dot: "bg-purple-500", accent: "text-purple-600 dark:text-purple-400", activeRing: "ring-purple-500/50 bg-purple-500/5" },
		CANCELLED: { label: "Dibatalkan", dot: "bg-red-500", accent: "text-red-600 dark:text-red-400", activeRing: "ring-red-500/50 bg-red-500/5" },
	};

	const statusCounts = counts;

	const getStatusBadge = (status: string) => {
		const cfg = statusConfig[status] || { label: status, cls: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" };
		return <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.cls}`}>{cfg.label}</span>;
	};

	// ─── Sort & Filter ───────────────────────────────────────
	const handleSort = (field: SortField) => {
		if (sortField === field) {
			setSortDir((d) => (d === "asc" ? "desc" : "asc"));
		} else {
			setSortField(field);
			setSortDir(field === "title" ? "asc" : "desc");
		}
	};

	// Pinned list comes from the overview fetch (full set, not the current page)
	const pinnedEvents = [...pinned].sort((a, b) => (a.pinnedOrder || 0) - (b.pinnedOrder || 0));

	// Server-side pagination
	const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));
	const startIndex = (currentPage - 1) * itemsPerPage;

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
		(scrollerRef.current ?? window).scrollTo({ top: 0, behavior: "smooth" });
	};

	const getPageNumbers = () => {
		const pages: (number | string)[] = [];
		if (totalPages <= 5) {
			for (let i = 1; i <= totalPages; i++) pages.push(i);
		} else {
			pages.push(1);
			if (currentPage > 3) pages.push("...");
			for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
			if (currentPage < totalPages - 2) pages.push("...");
			pages.push(totalPages);
		}
		return pages;
	};

	const renderEventCard = (event: Event) => (
		<div
			key={event.id}
			className="event-neon relative h-full bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.12] transition-all overflow-hidden"
		>
			<div className="flex flex-col sm:flex-row h-full">
				{/* Thumbnail */}
				<div className="w-full sm:w-40 h-32 sm:h-auto flex-shrink-0 bg-gradient-to-br from-red-500 to-orange-600 relative">
					{event.thumbnail ? (
						<img
							src={getImageUrl(event.thumbnail) || ""}
							alt={event.title}
							className="w-full h-full object-cover"
							onError={(e) => { e.currentTarget.style.display = "none"; }}
						/>
					) : (
						<div className="flex items-center justify-center h-full min-h-[8rem]">
							<CalendarIcon className="w-10 h-10 text-white/40" />
						</div>
					)}
					{event.isPinned && (
						<div className="absolute top-2 left-2">
							<div className="bg-yellow-500 text-white px-1.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5">
								<StarIconSolid className="w-3 h-3" />#{event.pinnedOrder}
							</div>
						</div>
					)}
				</div>

				{/* Content */}
				<div className="flex-1 p-4 min-w-0 flex flex-col">
					<div className="flex items-start justify-between gap-2 mb-2">
						<div className="min-w-0">
							<div className="flex items-center gap-2 flex-wrap">
								<h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{event.title}</h3>
								{getStatusBadge(event.status)}
								{event.paymentStatus === "DP_REQUESTED" && (
									<span className="px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">DP</span>
								)}
							</div>
							{event.category && (
								<span className="inline-block mt-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[11px] font-medium rounded">
									{event.category}
								</span>
							)}
						</div>
					</div>

					{event.description && (
						<p className="text-gray-500 dark:text-gray-400 text-xs mb-2 line-clamp-1">{event.description}</p>
					)}

					<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mb-3">
						<span className="flex items-center gap-1">
							<CalendarIcon className="w-3.5 h-3.5" />
							{formatDate(event.startDate)}
						</span>
						{event.location && (
							<span className="flex items-center gap-1">
								<MapPinIcon className="w-3.5 h-3.5" />
								<span className="truncate max-w-[150px]">{event.location}</span>
							</span>
						)}
						<span className="text-gray-400 dark:text-gray-500">
							oleh {event.createdBy.name}
						</span>
					</div>

					{/* School Category Limits */}
					{event.schoolCategoryLimits && event.schoolCategoryLimits.length > 0 && (
						<div className="flex flex-wrap gap-1.5 mb-3">
							{event.schoolCategoryLimits.map((limit) => (
								<span key={limit.id} className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] px-2 py-0.5 rounded">
									<UsersIcon className="w-3 h-3" />
									{limit.schoolCategory.name}: {limit.maxParticipants}
								</span>
							))}
						</div>
					)}

					{/* Actions — always pinned to bottom */}
					<div className="flex items-center gap-2 flex-wrap mt-auto pt-1">
						<button
							onClick={() => handleTogglePin(event.id, event.isPinned)}
							className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
								event.isPinned
									? "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/30"
									: "bg-gray-100 dark:bg-white/[0.05] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.08]"
							}`}
						>
							{event.isPinned ? <><XMarkIcon className="w-3.5 h-3.5" />Unpin</> : <><StarIcon className="w-3.5 h-3.5" />Pin</>}
						</button>
						<button
							onClick={() => handleManageEvent(event)}
							className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors"
						>
							<Cog6ToothIcon className="w-3.5 h-3.5" />Kelola
						</button>
						<Link
							to={`/events/${event.slug || event.id}`}
							target="_blank"
							className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-200 dark:hover:bg-white/[0.08] transition-colors"
						>
							<EyeIcon className="w-3.5 h-3.5" />Lihat
						</Link>
						<button
							onClick={() => handleDeleteEvent(event.id, event.title)}
							className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-xs font-medium transition-colors"
						>
							<ArchiveBoxIcon className="w-3.5 h-3.5" />Archive
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	const SortButton = ({ field, label }: { field: SortField; label: string }) => (
		<button
			onClick={() => handleSort(field)}
			className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
				sortField === field
					? "bg-red-500/10 text-red-600 dark:text-red-400"
					: "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.05]"
			}`}
		>
			{label}
			{sortField === field && (
				<span className="text-[10px]">{sortDir === "asc" ? "↑" : "↓"}</span>
			)}
		</button>
	);

	return (
		<div ref={rootRef} className="p-4 md:p-6">
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Event Management</h1>
					<p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Kelola semua event dan atur carousel landing page</p>
				</div>
				<div className="flex items-center gap-3">
					<Link
						to="/admin/events/trash"
						className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors"
					>
						<ArchiveBoxIcon className="w-4 h-4" />
						Archived Event
					</Link>
					<Link
						to="/admin/assessment-categories"
						className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.1] transition-colors"
					>
						<ScaleIcon className="w-4 h-4" />
						Kategori Penilaian
					</Link>
				</div>
			</div>

			{/* Stats by status */}
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
				<button
					onClick={() => setStatusFilter("all")}
					className={`text-left rounded-2xl border p-4 transition-all ring-1 ${
						statusFilter === "all"
							? "ring-red-500/50 bg-red-500/5 border-transparent"
							: "ring-transparent bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.12]"
					}`}
				>
					<div className="flex items-center gap-2">
						<span className="w-2 h-2 rounded-full bg-red-500" />
						<span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total</span>
					</div>
					<p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{totalAll}</p>
				</button>
				{STATUS_ORDER.map((status) => {
					const meta = statusMeta[status];
					const isActive = statusFilter === status;
					return (
						<button
							key={status}
							onClick={() => setStatusFilter(isActive ? "all" : (status as typeof statusFilter))}
							className={`text-left rounded-2xl border p-4 transition-all ring-1 ${
								isActive
									? `${meta.activeRing} border-transparent`
									: "ring-transparent bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.12]"
							}`}
						>
							<div className="flex items-center gap-2">
								<span className={`w-2 h-2 rounded-full ${meta.dot}`} />
								<span className="text-xs font-medium text-gray-500 dark:text-gray-400">{meta.label}</span>
							</div>
							<p className={`mt-2 text-2xl font-bold ${meta.accent}`}>{statusCounts[status] || 0}</p>
						</button>
					);
				})}
			</div>

			{/* Main Layout: Left (Event List) + Right (Pinned Sidebar) */}
			<div className="flex flex-col lg:flex-row gap-6">
				{/* ─── LEFT: Event List ──────────────────────── */}
				<div className="flex-1 min-w-0">
					{/* Search & Filters */}
					<div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.06] p-4 mb-4">
						<div className="flex flex-col sm:flex-row gap-3">
							{/* Search */}
							<div className="relative flex-1">
								<MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
								<input
									type="text"
									placeholder="Cari event..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50 outline-none transition"
								/>
							</div>
							{/* Status */}
							<select
								value={statusFilter}
								onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
								className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50 outline-none transition"
							>
								<option value="all">Semua Status</option>
								<option value="PUBLISHED">Published</option>
								<option value="ONGOING">Ongoing</option>
								<option value="COMPLETED">Completed</option>
								<option value="DRAFT">Draft</option>
								<option value="CANCELLED">Cancelled</option>
							</select>
							{/* Per page */}
							<select
								value={itemsPerPage}
								onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
								className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50 outline-none transition w-20"
							>
								<option value={5}>5</option>
								<option value={10}>10</option>
								<option value={25}>25</option>
								<option value={50}>50</option>
							</select>
						</div>

						{/* Sort Row */}
						<div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-white/[0.05]">
							<ChevronUpDownIcon className="w-4 h-4 text-gray-400" />
							<span className="text-xs text-gray-500 dark:text-gray-400 mr-1">Urutkan:</span>
							<SortButton field="createdAt" label="Terbaru" />
							<SortButton field="title" label="Nama" />
							<SortButton field="startDate" label="Tanggal Event" />
						</div>
					</div>

					{/* Event Cards */}
					{loading ? (
						<div className="flex justify-center py-16">
							<div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
						</div>
					) : events.length === 0 ? (
						<div className="text-center py-16">
							<CalendarIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
							<p className="text-gray-500 dark:text-gray-400">Tidak ada event ditemukan</p>
						</div>
					) : (
						<div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
							{events.map(renderEventCard)}
						</div>
					)}

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="mt-4 bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.06] p-3">
							<div className="flex items-center justify-between">
								<span className="text-xs text-gray-500 dark:text-gray-400">
									{startIndex + 1}-{Math.min(startIndex + itemsPerPage, total)} dari {total}
								</span>
								<div className="flex items-center gap-1">
									<button
										onClick={() => handlePageChange(currentPage - 1)}
										disabled={currentPage === 1}
										className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.05] disabled:opacity-40 disabled:cursor-not-allowed transition"
									>
										<ChevronLeftIcon className="w-4 h-4" />
									</button>
									{getPageNumbers().map((page, i) => (
										<React.Fragment key={i}>
											{page === "..." ? (
												<span className="px-2 text-xs text-gray-400">...</span>
											) : (
												<button
													onClick={() => handlePageChange(page as number)}
													className={`min-w-[32px] px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
														currentPage === page
															? "bg-red-500 text-white"
															: "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.05]"
													}`}
												>
													{page}
												</button>
											)}
										</React.Fragment>
									))}
									<button
										onClick={() => handlePageChange(currentPage + 1)}
										disabled={currentPage === totalPages}
										className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.05] disabled:opacity-40 disabled:cursor-not-allowed transition"
									>
										<ChevronRightIcon className="w-4 h-4" />
									</button>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* ─── RIGHT: Pinned Sidebar + Calendar ──────── */}
				<div className="w-full lg:w-80 xl:w-96 flex-shrink-0">
				 <div className="space-y-4">
					<div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
						{/* Header */}
						<div className="px-4 py-3 border-b border-gray-100 dark:border-white/[0.06] bg-yellow-50/50 dark:bg-yellow-500/[0.03]">
							<div className="flex items-center gap-2">
								<StarIconSolid className="w-4 h-4 text-yellow-500" />
								<h2 className="text-sm font-bold text-gray-900 dark:text-white">Pinned Events</h2>
								<span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 font-medium">
									{pinnedEvents.length}/10
								</span>
							</div>
							<p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
								Tampil di carousel landing page
							</p>
						</div>

						{/* Pinned List */}
						{pinnedEvents.length === 0 ? (
							<div className="p-6 text-center">
								<StarIcon className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
								<p className="text-xs text-gray-500 dark:text-gray-400">Belum ada event yang di-pin</p>
								<p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Pin event dari daftar di sebelah kiri</p>
							</div>
						) : (
							<div className="divide-y divide-gray-100 dark:divide-white/[0.05] max-h-[calc(100vh-140px)] overflow-y-auto">
								{pinnedEvents.map((event, index) => (
									<div key={event.id} className="p-3 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
										<div className="flex gap-3">
											{/* Thumbnail mini */}
											<div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex-shrink-0 overflow-hidden relative">
												{event.thumbnail ? (
													<img
														src={getImageUrl(event.thumbnail) || ""}
														alt={event.title}
														className="w-full h-full object-cover"
														onError={(e) => { e.currentTarget.style.display = "none"; }}
													/>
												) : (
													<div className="flex items-center justify-center h-full">
														<CalendarIcon className="w-6 h-6 text-white/40" />
													</div>
												)}
												<div className="absolute top-0.5 left-0.5 bg-yellow-500 text-white text-[9px] font-bold w-5 h-5 rounded-md flex items-center justify-center">
													{event.pinnedOrder}
												</div>
											</div>

											{/* Info */}
											<div className="flex-1 min-w-0">
												<h4 className="text-xs font-semibold text-gray-900 dark:text-white truncate">{event.title}</h4>
												<p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
													{formatDate(event.startDate)}
												</p>
												<div className="mt-0.5">{getStatusBadge(event.status)}</div>
											</div>

											{/* Controls */}
											<div className="flex flex-col gap-0.5 flex-shrink-0">
												<button
													onClick={() => handleUpdatePinnedOrder(event.id, "up")}
													disabled={index === 0}
													className="p-1 rounded text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition"
													title="Naik"
												>
													<ArrowUpIcon className="w-3.5 h-3.5" />
												</button>
												<button
													onClick={() => handleUpdatePinnedOrder(event.id, "down")}
													disabled={index === pinnedEvents.length - 1}
													className="p-1 rounded text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition"
													title="Turun"
												>
													<ArrowDownIcon className="w-3.5 h-3.5" />
												</button>
												<button
													onClick={() => handleTogglePin(event.id, true)}
													className="p-1 rounded text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
													title="Unpin"
												>
													<XMarkIcon className="w-3.5 h-3.5" />
												</button>
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					{/* Calendar widget */}
					<div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
						<div className="px-4 py-3 border-b border-gray-100 dark:border-white/[0.06] flex items-center gap-2">
							<CalendarIcon className="w-4 h-4 text-red-500" />
							<h2 className="text-sm font-bold text-gray-900 dark:text-white">Kalender Event</h2>
							<div className="ml-auto flex items-center gap-1">
								<button
									onClick={() => setCalCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
									className="p-1 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition"
									title="Bulan sebelumnya"
								>
									<ChevronLeftIcon className="w-4 h-4" />
								</button>
								<span className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-[90px] text-center capitalize">
									{calCursor.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
								</span>
								<button
									onClick={() => setCalCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
									className="p-1 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition"
									title="Bulan berikutnya"
								>
									<ChevronRightIcon className="w-4 h-4" />
								</button>
							</div>
						</div>

						<div className="p-3">
							<div className="grid grid-cols-7 gap-1 mb-1">
								{["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
									<div key={d} className="text-center text-[10px] font-medium text-gray-400 dark:text-gray-500 py-1">{d}</div>
								))}
							</div>
							<div className="grid grid-cols-7 gap-1">
								{buildCalendarGrid().map((day, i) => {
									const inMonth = day.getMonth() === calCursor.getMonth();
									const dayEvents = eventsOnDay(day);
									const hasStart = dayEvents.some((e) => isSameDay(new Date(e.startDate), day));
									const hasOngoing = dayEvents.length > 0;
									const isToday = isSameDay(day, today);
									const isSelected = isSameDay(day, selectedDay);
									return (
										<button
											key={i}
											onClick={() => setSelectedDay(day)}
											className={`relative aspect-square rounded-lg text-xs flex items-center justify-center transition-colors ${
												isSelected
													? "bg-red-500 text-white font-bold"
													: isToday
													? "bg-red-500/10 text-red-600 dark:text-red-400 font-semibold"
													: inMonth
													? "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.05]"
													: "text-gray-300 dark:text-gray-600"
											}`}
										>
											{day.getDate()}
											{hasOngoing && !isSelected && (
												<span className={`absolute bottom-1 w-1 h-1 rounded-full ${hasStart ? "bg-red-500" : "bg-blue-500"}`} />
											)}
										</button>
									);
								})}
							</div>

							<div className="flex items-center gap-3 mt-2 px-1 text-[10px] text-gray-500 dark:text-gray-400">
								<span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Mulai</span>
								<span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />Berlangsung</span>
							</div>
						</div>

						<div className="border-t border-gray-100 dark:border-white/[0.06] px-4 py-3">
							<p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-2 capitalize">
								{selectedDay.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
							</p>
							{selectedDayEvents.length === 0 ? (
								<p className="text-[11px] text-gray-400 dark:text-gray-500">Tidak ada event</p>
							) : (
								<div className="space-y-1.5">
									{selectedDayEvents.map((e) => {
										const isStart = isSameDay(new Date(e.startDate), selectedDay);
										return (
											<button
												key={e.id}
												onClick={() => handleManageEvent(e)}
												className="w-full text-left flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
											>
												<span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isStart ? "bg-red-500" : "bg-blue-500"}`} />
												<span className="flex-1 min-w-0 text-[11px] font-medium text-gray-700 dark:text-gray-300 truncate">{e.title}</span>
												<span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 flex-shrink-0">
													{isStart ? "Mulai" : "Berjalan"}
												</span>
											</button>
										);
									})}
								</div>
							)}
						</div>
					</div>

					{/* Upcoming / ongoing published events */}
					<div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
						<div className="px-4 py-3 border-b border-gray-100 dark:border-white/[0.06] flex items-center gap-2">
							<CalendarIcon className="w-4 h-4 text-green-500" />
							<h2 className="text-sm font-bold text-gray-900 dark:text-white">Akan Datang & Berlangsung</h2>
							<span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 font-medium">
								{upcomingEvents.length}
							</span>
						</div>
						{upcomingEvents.length === 0 ? (
							<div className="p-6 text-center">
								<CalendarIcon className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
								<p className="text-xs text-gray-500 dark:text-gray-400">Tidak ada event mendatang</p>
							</div>
						) : (
							<div className="divide-y divide-gray-100 dark:divide-white/[0.05] max-h-[360px] overflow-y-auto sidebar-scroll">
								{upcomingEvents.map((event) => (
									<button
										key={event.id}
										onClick={() => handleManageEvent(event)}
										className="w-full text-left p-3 flex gap-3 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
									>
										<div className="flex flex-col items-center justify-center w-11 flex-shrink-0 rounded-xl bg-gray-50 dark:bg-white/[0.04] py-1">
											<span className="text-[10px] uppercase text-gray-400 dark:text-gray-500 leading-none">
												{new Date(event.startDate).toLocaleDateString("id-ID", { month: "short" })}
											</span>
											<span className="text-base font-bold text-gray-900 dark:text-white leading-tight">
												{new Date(event.startDate).getDate()}
											</span>
										</div>
										<div className="flex-1 min-w-0">
											<h4 className="text-xs font-semibold text-gray-900 dark:text-white truncate">{event.title}</h4>
											<div className="flex items-center gap-1 mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
												<CalendarIcon className="w-3 h-3" />
												{formatDate(event.startDate)}
											</div>
											<div className="mt-1">{getStatusBadge(event.status)}</div>
										</div>
									</button>
								))}
							</div>
						)}
					</div>
				 </div>
				</div>
			</div>

			{/* Floating scroll-to-top */}
			{showScrollTop && (
				<button
					onClick={scrollToTop}
					title="Kembali ke atas"
					className="fixed bottom-24 md:bottom-6 right-5 z-50 p-3 rounded-full bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600 transition-colors"
				>
					<ArrowUpIcon className="w-5 h-5" />
				</button>
			)}
		</div>
	);
};

export default EventManagement;
