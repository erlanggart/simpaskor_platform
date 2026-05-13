import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
	LuSearch,
	LuFilter,
	LuPackage,
	LuClock,
	LuCircleCheck,
	LuChevronLeft,
	LuChevronRight,
	LuRefreshCw,
	LuEye,
	LuPencil,
	LuCalendar,
	LuTicket,
	LuThumbsUp,
	LuCreditCard,
} from "react-icons/lu";
import { api } from "../../utils/api";
import { getPackagePriceLabel } from "../../utils/packagePricing";
import Swal from "sweetalert2";

interface PackageEvent {
	id: string;
	title: string;
	slug: string | null;
	status: string;
	packageTier: string;
	paymentStatus: string | null;
	platformSharePercent: number | null;
	startDate: string;
	endDate: string;
	organizer: string | null;
	createdAt: string;
	createdBy: {
		id: string;
		name: string;
		email: string;
	};
	eventPayment: {
		id: string;
		amount: number;
		status: string;
		paymentType: string | null;
		paidAt: string | null;
	} | null;
	ticketConfig: { enabled: boolean } | null;
	votingConfig: { enabled: boolean } | null;
	revenueSummary: {
		grossRevenue: number;
		ticketGrossRevenue: number;
		votingGrossRevenue: number;
		platformShare: number;
		panitiaShare: number;
		platformShareRate: number;
		panitiaShareRate: number;
	};
}

interface Stats {
	total: number;
	paid: number;
	pending: number;
	byTier: Record<string, number>;
}

interface Pagination {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

const tierConfig: Record<string, { label: string; price: string; color: string }> = {
	IKLAN: { label: "Iklan", price: getPackagePriceLabel("IKLAN"), color: "emerald" },
	TICKETING: { label: "Ticketing", price: getPackagePriceLabel("TICKETING"), color: "blue" },
	VOTING: { label: "Voting", price: getPackagePriceLabel("VOTING"), color: "purple" },
	TICKETING_VOTING: { label: "Tiket + Voting", price: getPackagePriceLabel("TICKETING_VOTING"), color: "indigo" },
	BRONZE: { label: "Bronze", price: getPackagePriceLabel("BRONZE"), color: "amber" },
	GOLD: { label: "Gold", price: getPackagePriceLabel("GOLD"), color: "yellow" },
};

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
	PAID: { label: "Lunas", color: "green" },
	PENDING: { label: "Menunggu", color: "yellow" },
	DP_REQUESTED: { label: "Menunggu Admin", color: "blue" },
};

const eventStatusConfig: Record<string, { label: string; color: string }> = {
	DRAFT: { label: "Draft", color: "gray" },
	PUBLISHED: { label: "Published", color: "green" },
	ONGOING: { label: "Berlangsung", color: "blue" },
	COMPLETED: { label: "Selesai", color: "purple" },
	CANCELLED: { label: "Dibatalkan", color: "red" },
};

const tierColorMap: Record<string, string> = {
	emerald: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
	blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
	purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
	indigo: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400",
	amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
	gray: "bg-gray-200 dark:bg-gray-600/30 text-gray-700 dark:text-gray-300",
	yellow: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
	green: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
	red: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};

const PackageManagement: React.FC = () => {
	const [events, setEvents] = useState<PackageEvent[]>([]);
	const [stats, setStats] = useState<Stats>({ total: 0, paid: 0, pending: 0, byTier: {} });
	const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 15, total: 0, totalPages: 0 });
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [filterTier, setFilterTier] = useState("");
	const [filterPayment, setFilterPayment] = useState("");
	const [filterEventStatus, setFilterEventStatus] = useState("");

	const fetchPackages = useCallback(async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams();
			params.set("page", String(pagination.page));
			params.set("limit", String(pagination.limit));
			if (search) params.set("search", search);
			if (filterTier) params.set("packageTier", filterTier);
			if (filterPayment) params.set("paymentStatus", filterPayment);
			if (filterEventStatus) params.set("eventStatus", filterEventStatus);

			const res = await api.get(`/event-payments/admin/packages?${params.toString()}`);
			setEvents(res.data.data);
			setStats(res.data.stats);
			setPagination((p) => ({ ...p, total: res.data.total, totalPages: res.data.totalPages }));
		} catch (error) {
			console.error("Error fetching packages:", error);
		} finally {
			setLoading(false);
		}
	}, [pagination.page, pagination.limit, search, filterTier, filterPayment, filterEventStatus]);

	useEffect(() => {
		fetchPackages();
	}, [fetchPackages]);

	const handleSearchSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setPagination((p) => ({ ...p, page: 1 }));
		fetchPackages();
	};

	const handleUpdatePackage = async (event: PackageEvent) => {
		const currentTier = event.packageTier;
		const currentPayment = event.paymentStatus || "PENDING";
		const { value: formValues } = await Swal.fire({
			title: `Edit Paket — ${event.title}`,
			html: `
				<div class="text-left space-y-4 mt-2">
					<div>
						<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Paket</label>
						<select id="swal-tier" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white">
							${Object.entries(tierConfig).map(([key, cfg]) =>
								`<option value="${key}" ${key === currentTier ? "selected" : ""}>${cfg.label} (${cfg.price})</option>`
							).join("")}
						</select>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status Pembayaran</label>
						<select id="swal-payment" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white">
							<option value="PENDING" ${currentPayment === "PENDING" ? "selected" : ""}>Menunggu</option>
							<option value="PAID" ${currentPayment === "PAID" ? "selected" : ""}>Lunas</option>
							<option value="DP_REQUESTED" ${currentPayment === "DP_REQUESTED" ? "selected" : ""}>Menunggu Admin</option>
						</select>
					</div>
				</div>
			`,
			showCancelButton: true,
			confirmButtonText: "Simpan",
			cancelButtonText: "Batal",
			confirmButtonColor: "#ef4444",
			preConfirm: () => {
				return {
					packageTier: (document.getElementById("swal-tier") as HTMLSelectElement).value,
					paymentStatus: (document.getElementById("swal-payment") as HTMLSelectElement).value,
				};
			},
		});

		if (formValues) {
			try {
				await api.put(`/event-payments/admin/packages/${event.id}`, formValues);
				Swal.fire({ icon: "success", title: "Berhasil!", text: "Paket berhasil diperbarui", timer: 1500, showConfirmButton: false });
				fetchPackages();
			} catch (error: any) {
				Swal.fire({ icon: "error", title: "Gagal", text: error.response?.data?.error || "Gagal memperbarui paket" });
			}
		}
	};

	const getTierBadge = (tier: string) => {
		const cfg = tierConfig[tier] || { label: tier, color: "gray" };
		return (
			<span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${tierColorMap[cfg.color] || tierColorMap.gray}`}>
				{cfg.label}
			</span>
		);
	};

	const getPaymentBadge = (status: string | null) => {
		if (!status) return <span className="text-xs text-gray-400">-</span>;
		const cfg = paymentStatusConfig[status] || { label: status, color: "gray" };
		const Icon = status === "PAID" ? LuCircleCheck : status === "PENDING" ? LuClock : LuCreditCard;
		return (
			<span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${tierColorMap[cfg.color] || tierColorMap.gray}`}>
				<Icon className="w-3 h-3" />
				{cfg.label}
			</span>
		);
	};

	const getEventStatusBadge = (status: string) => {
		const cfg = eventStatusConfig[status] || { label: status, color: "gray" };
		return (
			<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${tierColorMap[cfg.color] || tierColorMap.gray}`}>
				{cfg.label}
			</span>
		);
	};

	const formatDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
	};

	return (
		<div className="p-4 md:p-6 space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
						<LuPackage className="w-6 h-6 text-red-500" />
						Kelola Paket
					</h1>
					<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
						Lihat dan kelola paket aktif event. Persentase tiket dan voting diatur di halaman Bagi Hasil.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Link
						to="/admin/revenue-share"
						className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium transition-colors"
					>
						<LuCreditCard className="w-4 h-4" />
						Bagi Hasil
					</Link>
					<button
						onClick={fetchPackages}
						className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
					>
						<LuRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
						Refresh
					</button>
				</div>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-white/5 p-4">
					<p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Paket</p>
					<p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{stats.total}</p>
				</div>
				<div className="bg-green-50/80 dark:bg-green-900/20 backdrop-blur-sm rounded-xl border border-green-200/50 dark:border-green-800/30 p-4">
					<p className="text-xs text-green-600 dark:text-green-400 font-medium">Lunas</p>
					<p className="text-2xl font-bold text-green-700 dark:text-green-400 mt-1">{stats.paid}</p>
				</div>
				<div className="bg-yellow-50/80 dark:bg-yellow-900/20 backdrop-blur-sm rounded-xl border border-yellow-200/50 dark:border-yellow-800/30 p-4">
					<p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Menunggu</p>
					<p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400 mt-1">{stats.pending}</p>
				</div>
				<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-white/5 p-4">
					<p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Per Tier</p>
					<div className="flex flex-wrap gap-1 mt-1.5">
						{Object.entries(stats.byTier).map(([tier, count]) => (
							<span key={tier} className="text-[10px] font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
								{tierConfig[tier]?.label || tier}: {count}
							</span>
						))}
						{Object.keys(stats.byTier).length === 0 && (
							<span className="text-xs text-gray-400">-</span>
						)}
					</div>
				</div>
			</div>

			{/* Search & Filters */}
			<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-white/5 p-4">
				<form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
					<div className="relative">
						<LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
						<input
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Cari event, organizer, email..."
							className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800/50 text-gray-800 dark:text-white text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50"
						/>
					</div>
					<div className="relative">
						<LuPackage className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
						<select
							value={filterTier}
							onChange={(e) => { setFilterTier(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
							className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800/50 text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 appearance-none"
						>
							<option value="">Semua Paket</option>
							{Object.entries(tierConfig).map(([key, cfg]) => (
								<option key={key} value={key}>{cfg.label}</option>
							))}
						</select>
					</div>
					<div className="relative">
						<LuCreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
						<select
							value={filterPayment}
							onChange={(e) => { setFilterPayment(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
							className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800/50 text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 appearance-none"
						>
							<option value="">Semua Pembayaran</option>
							<option value="PAID">Lunas</option>
							<option value="PENDING">Menunggu</option>
							<option value="DP_REQUESTED">DP Request</option>
						</select>
					</div>
					<div className="relative">
						<LuFilter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
						<select
							value={filterEventStatus}
							onChange={(e) => { setFilterEventStatus(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
							className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800/50 text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 appearance-none"
						>
							<option value="">Semua Status Event</option>
							{Object.entries(eventStatusConfig).map(([key, cfg]) => (
								<option key={key} value={key}>{cfg.label}</option>
							))}
						</select>
					</div>
				</form>
			</div>

			{/* Table */}
			<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-white/5 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
						<thead className="bg-gray-50/80 dark:bg-gray-700/50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Event</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase hidden lg:table-cell">Panitia</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Paket</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Pembayaran</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">Fitur</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase hidden lg:table-cell">Tanggal Event</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Aksi</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200 dark:divide-gray-700">
							{loading ? (
								<tr>
									<td colSpan={7} className="px-4 py-12 text-center text-gray-400">
										<LuRefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
										Memuat data...
									</td>
								</tr>
							) : events.length === 0 ? (
								<tr>
									<td colSpan={7} className="px-4 py-12 text-center text-gray-400">
										<LuPackage className="w-8 h-8 mx-auto mb-2 opacity-50" />
										Tidak ada paket ditemukan
									</td>
								</tr>
							) : (
								events.map((event) => (
									<tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
										<td className="px-4 py-3">
											<div className="max-w-[220px]">
												<p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{event.title}</p>
												<div className="flex items-center gap-1.5 mt-0.5">
													{getEventStatusBadge(event.status)}
													{event.organizer && (
														<span className="text-[10px] text-gray-400 truncate max-w-[120px]">{event.organizer}</span>
													)}
												</div>
											</div>
										</td>
										<td className="px-4 py-3 hidden lg:table-cell">
											<div className="max-w-[180px]">
												<p className="text-sm text-gray-700 dark:text-gray-300 truncate">{event.createdBy.name}</p>
												<p className="text-xs text-gray-400 truncate">{event.createdBy.email}</p>
											</div>
										</td>
										<td className="px-4 py-3">
											<div>
												{getTierBadge(event.packageTier)}
												{event.eventPayment && event.eventPayment.amount > 0 && (
													<p className="text-[10px] text-gray-500 mt-0.5">{formatCurrency(event.eventPayment.amount)}</p>
												)}
											</div>
										</td>
										<td className="px-4 py-3">
											<div>
												{getPaymentBadge(event.paymentStatus)}
												{event.eventPayment?.paidAt && (
													<p className="text-[10px] text-gray-400 mt-0.5">{formatDate(event.eventPayment.paidAt)}</p>
												)}
											</div>
										</td>
										<td className="px-4 py-3 hidden md:table-cell">
											<div className="flex items-center gap-1.5">
												{event.ticketConfig?.enabled && (
													<span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
														<LuTicket className="w-3 h-3" />
														Tiket
													</span>
												)}
												{event.votingConfig?.enabled && (
													<span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
														<LuThumbsUp className="w-3 h-3" />
														Voting
													</span>
												)}
												{!event.ticketConfig?.enabled && !event.votingConfig?.enabled && (
													<span className="text-[10px] text-gray-400">-</span>
												)}
											</div>
										</td>
										<td className="px-4 py-3 hidden lg:table-cell">
											<div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
												<LuCalendar className="w-3 h-3 flex-shrink-0" />
												<span className="whitespace-nowrap">{formatDate(event.startDate)}</span>
											</div>
										</td>
										<td className="px-4 py-3 text-right">
											<div className="flex items-center justify-end gap-1.5">
												<Link
													to={`/admin/events/${event.slug || event.id}/manage`}
													className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
													title="Kelola Event"
												>
													<LuEye className="w-4 h-4" />
												</Link>
												<button
													onClick={() => handleUpdatePackage(event)}
													className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
													title="Edit Paket"
												>
													<LuPencil className="w-4 h-4" />
												</button>
											</div>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				{pagination.totalPages > 1 && (
					<div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
						<p className="text-xs text-gray-500 dark:text-gray-400">
							Halaman {pagination.page} dari {pagination.totalPages} ({pagination.total} data)
						</p>
						<div className="flex items-center gap-1">
							<button
								onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
								disabled={pagination.page <= 1}
								className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
							>
								<LuChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
							</button>
							{Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
								let pageNum: number;
								if (pagination.totalPages <= 5) {
									pageNum = i + 1;
								} else if (pagination.page <= 3) {
									pageNum = i + 1;
								} else if (pagination.page >= pagination.totalPages - 2) {
									pageNum = pagination.totalPages - 4 + i;
								} else {
									pageNum = pagination.page - 2 + i;
								}
								return (
									<button
										key={pageNum}
										onClick={() => setPagination((p) => ({ ...p, page: pageNum }))}
										className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
											pagination.page === pageNum
												? "bg-red-500 text-white"
												: "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
										}`}
									>
										{pageNum}
									</button>
								);
							})}
							<button
								onClick={() => setPagination((p) => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))}
								disabled={pagination.page >= pagination.totalPages}
								className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
							>
								<LuChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default PackageManagement;
