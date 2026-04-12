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
	ChevronUpDownIcon,
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

type SortField = "createdAt" | "title" | "startDate" | "status";
type SortDir = "asc" | "desc";

const EventManagement: React.FC = () => {
	const navigate = useNavigate();
	const [events, setEvents] = useState<Event[]>([]);
	const [loading, setLoading] = useState(true);
	const [statusFilter, setStatusFilter] = useState<"all" | "PUBLISHED" | "ONGOING" | "COMPLETED" | "DRAFT" | "CANCELLED">("all");
	const [searchTerm, setSearchTerm] = useState("");
	const [sortField, setSortField] = useState<SortField>("createdAt");
	const [sortDir, setSortDir] = useState<SortDir>("desc");

	// Pagination states
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);

	const handleManageEvent = (event: Event) => {
		localStorage.setItem(
			"admin_active_event",
			JSON.stringify({ slug: event.slug || event.id, title: event.title, id: event.id })
		);
		navigate(`/admin/events/${event.slug || event.id}/manage`);
	};

	useEffect(() => {
		fetchEvents();
	}, []);

	const fetchEvents = async () => {
		try {
			setLoading(true);
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
			showSuccess(currentPinned ? "Event berhasil di-unpin" : "Event berhasil di-pin");
			fetchEvents();
		} catch (error: any) {
			showError(error.response?.data?.message || "Gagal mengubah status pin");
		}
	};

	const handleUpdatePinnedOrder = async (eventId: string, direction: "up" | "down") => {
		const event = events.find((e) => e.id === eventId);
		if (!event || !event.isPinned || event.pinnedOrder === null) return;

		const sorted = events
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
			fetchEvents();
		} catch {
			showError("Gagal mengubah urutan");
		}
	};

	const getNextPinnedOrder = () => {
		const pinned = events.filter((e) => e.isPinned);
		if (pinned.length === 0) return 1;
		return Math.max(...pinned.map((e) => e.pinnedOrder || 0)) + 1;
	};

	const formatDate = (dateString: string) =>
		new Date(dateString).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

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

	const sortEvents = (list: Event[]) => {
		return [...list].sort((a, b) => {
			let cmp = 0;
			switch (sortField) {
				case "createdAt":
					cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
					break;
				case "title":
					cmp = a.title.localeCompare(b.title);
					break;
				case "startDate":
					cmp = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
					break;
				case "status":
					cmp = a.status.localeCompare(b.status);
					break;
			}
			return sortDir === "asc" ? cmp : -cmp;
		});
	};

	const filteredEvents = events.filter((event) => {
		const matchesStatus = statusFilter === "all" || event.status === statusFilter;
		const matchesSearch =
			searchTerm === "" ||
			event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			event.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			event.category?.toLowerCase().includes(searchTerm.toLowerCase());
		return matchesStatus && matchesSearch;
	});

	const pinnedEvents = filteredEvents
		.filter((e) => e.isPinned)
		.sort((a, b) => (a.pinnedOrder || 0) - (b.pinnedOrder || 0));

	const allListEvents = sortEvents(filteredEvents);

	// Pagination
	const totalPages = Math.ceil(allListEvents.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedEvents = allListEvents.slice(startIndex, startIndex + itemsPerPage);

	useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, sortField, sortDir]);

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
		window.scrollTo({ top: 0, behavior: "smooth" });
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
		<div className="p-4 md:p-6 max-w-[1600px] mx-auto">
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Event Management</h1>
					<p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Kelola semua event dan atur carousel landing page</p>
				</div>
				<div className="text-sm text-gray-500 dark:text-gray-400">
					Total: <span className="font-semibold text-gray-900 dark:text-white">{events.length}</span> event
				</div>
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
							<SortButton field="status" label="Status" />
						</div>
					</div>

					{/* Event Cards */}
					{loading ? (
						<div className="flex justify-center py-16">
							<div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
						</div>
					) : paginatedEvents.length === 0 ? (
						<div className="text-center py-16">
							<CalendarIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
							<p className="text-gray-500 dark:text-gray-400">Tidak ada event ditemukan</p>
						</div>
					) : (
						<div className="space-y-3">
							{paginatedEvents.map((event) => (
								<div
									key={event.id}
									className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.12] transition-all overflow-hidden"
								>
									<div className="flex flex-col sm:flex-row">
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
										<div className="flex-1 p-4 min-w-0">
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

											{/* Actions */}
											<div className="flex items-center gap-2 flex-wrap">
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
													<TrashIcon className="w-3.5 h-3.5" />Hapus
												</button>
											</div>
										</div>
									</div>
								</div>
							))}
						</div>
					)}

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="mt-4 bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.06] p-3">
							<div className="flex items-center justify-between">
								<span className="text-xs text-gray-500 dark:text-gray-400">
									{startIndex + 1}-{Math.min(startIndex + itemsPerPage, allListEvents.length)} dari {allListEvents.length}
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

				{/* ─── RIGHT: Pinned Sidebar ─────────────────── */}
				<div className="w-full lg:w-80 xl:w-96 flex-shrink-0">
					<div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.06] overflow-hidden sticky top-4">
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
				</div>
			</div>
		</div>
	);
};

export default EventManagement;
