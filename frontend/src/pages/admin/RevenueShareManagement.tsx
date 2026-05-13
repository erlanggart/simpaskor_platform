import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	LuBadgeDollarSign,
	LuCalendar,
	LuCircleCheck,
	LuClock,
	LuRefreshCw,
	LuSearch,
	LuTicket,
	LuThumbsUp,
} from "react-icons/lu";
import Swal from "sweetalert2";
import { api } from "../../utils/api";

interface RevenueShareEvent {
	id: string;
	title: string;
	slug: string | null;
	status: string;
	packageTier: string;
	paymentStatus: string | null;
	platformSharePercent: number | null;
	startDate: string;
	createdBy: {
		id: string;
		name: string;
		email: string;
	};
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

const tierLabels: Record<string, string> = {
	TICKETING: "Ticketing",
	VOTING: "Voting",
	TICKETING_VOTING: "Tiket + Voting",
	BRONZE: "Bronze",
	GOLD: "Gold",
};

const revenueShareTiers = Object.keys(tierLabels);

const formatCurrency = (amount: number) =>
	new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

const formatDate = (date: string) =>
	new Date(date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

const RevenueShareManagement: React.FC = () => {
	const [events, setEvents] = useState<RevenueShareEvent[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [packageTier, setPackageTier] = useState("");
	const [shareStatus, setShareStatus] = useState("");
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [drafts, setDrafts] = useState<Record<string, string>>({});
	const [savingId, setSavingId] = useState<string | null>(null);

	const fetchEvents = useCallback(async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams();
			params.set("page", String(page));
			params.set("limit", "15");
			params.set("revenueShareOnly", "true");
			if (search) params.set("search", search);
			if (packageTier) params.set("packageTier", packageTier);
			if (shareStatus) params.set("shareStatus", shareStatus);

			const res = await api.get(`/event-payments/admin/packages?${params.toString()}`);
			const rows = res.data.data || [];
			setEvents(rows);
			setTotalPages(res.data.totalPages || 1);
			setDrafts((prev) => {
				const next = { ...prev };
				rows.forEach((event: RevenueShareEvent) => {
					if (next[event.id] === undefined) next[event.id] = event.platformSharePercent?.toString() ?? "";
				});
				return next;
			});
		} catch (error) {
			console.error("Error fetching revenue share events:", error);
		} finally {
			setLoading(false);
		}
	}, [page, packageTier, search, shareStatus]);

	useEffect(() => {
		fetchEvents();
	}, [fetchEvents]);

	const stats = useMemo(() => {
		return {
			total: events.length,
			set: events.filter((event) => event.platformSharePercent !== null && event.platformSharePercent !== undefined).length,
			unset: events.filter((event) => event.platformSharePercent === null || event.platformSharePercent === undefined).length,
		};
	}, [events]);

	const updateDraft = (eventId: string, value: string) => {
		setDrafts((prev) => ({ ...prev, [eventId]: value }));
	};

	const saveShare = async (event: RevenueShareEvent, confirmPayment = false) => {
		const raw = drafts[event.id];
		const share = Number(raw);
		if (raw === "" || !Number.isFinite(share) || share < 0 || share > 100) {
			Swal.fire("Persentase tidak valid", "Masukkan persentase Simpaskor antara 0 sampai 100.", "warning");
			return;
		}

		setSavingId(event.id);
		try {
			await api.put(`/event-payments/admin/packages/${event.id}`, {
				packageTier: event.packageTier,
				platformSharePercent: share,
				...(confirmPayment ? { paymentStatus: "PAID" } : {}),
			});
			Swal.fire({
				icon: "success",
				title: "Berhasil",
				text: confirmPayment ? "Persentase disimpan dan paket dikonfirmasi lunas." : "Persentase bagi hasil berhasil disimpan.",
				timer: 1500,
				showConfirmButton: false,
			});
			fetchEvents();
		} catch (error: any) {
			Swal.fire("Gagal", error.response?.data?.error || "Gagal menyimpan persentase bagi hasil.", "error");
		} finally {
			setSavingId(null);
		}
	};

	return (
		<div className="p-4 md:p-6 space-y-6">
			<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
						<LuBadgeDollarSign className="w-6 h-6 text-red-500" />
						Bagi Hasil Tiket & Voting
					</h1>
					<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
						Atur persentase Simpaskor sebelum panitia membuka tiket atau voting publik.
					</p>
				</div>
				<button
					onClick={fetchEvents}
					className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
				>
					<LuRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
					Refresh
				</button>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
				<div className="rounded-xl border border-gray-200/60 bg-white/80 p-4 dark:border-white/10 dark:bg-gray-800/50">
					<p className="text-xs text-gray-500 dark:text-gray-400">Event tampil</p>
					<p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{stats.total}</p>
				</div>
				<div className="rounded-xl border border-green-200 bg-green-50/80 p-4 dark:border-green-800 dark:bg-green-900/20">
					<p className="text-xs text-green-600 dark:text-green-400">Sudah diatur</p>
					<p className="mt-1 text-2xl font-black text-green-700 dark:text-green-300">{stats.set}</p>
				</div>
				<div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-800 dark:bg-amber-900/20">
					<p className="text-xs text-amber-600 dark:text-amber-400">Menunggu persentase</p>
					<p className="mt-1 text-2xl font-black text-amber-700 dark:text-amber-300">{stats.unset}</p>
				</div>
			</div>

			<div className="rounded-xl border border-gray-200/60 bg-white/80 p-4 dark:border-white/10 dark:bg-gray-800/50">
				<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
					<div className="relative">
						<LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
						<input
							value={search}
							onChange={(e) => { setSearch(e.target.value); setPage(1); }}
							placeholder="Cari event atau panitia..."
							className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 text-sm"
						/>
					</div>
					<select
						value={packageTier}
						onChange={(e) => { setPackageTier(e.target.value); setPage(1); }}
						className="px-3 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 text-sm"
					>
						<option value="">Semua paket tiket/vote</option>
						{revenueShareTiers.map((tier) => (
							<option key={tier} value={tier}>{tierLabels[tier]}</option>
						))}
					</select>
					<select
						value={shareStatus}
						onChange={(e) => { setShareStatus(e.target.value); setPage(1); }}
						className="px-3 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 text-sm"
					>
						<option value="">Semua status persentase</option>
						<option value="unset">Belum diatur</option>
						<option value="set">Sudah diatur</option>
					</select>
					<button
						onClick={fetchEvents}
						className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
					>
						Terapkan
					</button>
				</div>
			</div>

			<div className="space-y-3">
				{loading ? (
					<div className="py-16 text-center text-gray-400">
						<LuRefreshCw className="w-7 h-7 animate-spin mx-auto mb-2" />
						Memuat data...
					</div>
				) : events.length === 0 ? (
					<div className="rounded-xl border border-gray-200/60 bg-white/80 p-10 text-center text-gray-500 dark:border-white/10 dark:bg-gray-800/50 dark:text-gray-400">
						Tidak ada event yang perlu diatur.
					</div>
				) : (
					events.map((event) => {
						const share = drafts[event.id] ?? "";
						const panitiaShare = share === "" ? null : Math.max(0, 100 - Number(share));
						return (
							<div key={event.id} className="rounded-xl border border-gray-200/60 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-gray-800/70">
								<div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-4">
									<div className="min-w-0">
										<div className="flex flex-wrap items-center gap-2 mb-2">
											<span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
												{tierLabels[event.packageTier] || event.packageTier}
											</span>
											<span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
												event.platformSharePercent === null
													? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
													: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
											}`}>
												{event.platformSharePercent === null ? <LuClock className="w-3 h-3" /> : <LuCircleCheck className="w-3 h-3" />}
												{event.platformSharePercent === null ? "Menunggu persentase" : "Persentase siap"}
											</span>
										</div>
										<h2 className="truncate text-base font-bold text-gray-900 dark:text-white">{event.title}</h2>
										<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
											{event.createdBy.name} - {event.createdBy.email}
										</p>
										<div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
											<span className="inline-flex items-center gap-1"><LuCalendar className="w-3.5 h-3.5" /> {formatDate(event.startDate)}</span>
											<span className="inline-flex items-center gap-1"><LuTicket className="w-3.5 h-3.5" /> Tiket {event.ticketConfig?.enabled ? "aktif" : "tertutup"}</span>
											<span className="inline-flex items-center gap-1"><LuThumbsUp className="w-3.5 h-3.5" /> Voting {event.votingConfig?.enabled ? "aktif" : "tertutup"}</span>
										</div>
										<div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
											<div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/[0.04]">
												<p className="text-gray-400">Pendapatan</p>
												<p className="font-bold text-gray-800 dark:text-gray-100">{formatCurrency(event.revenueSummary.grossRevenue)}</p>
											</div>
											<div className="rounded-lg bg-red-50 px-3 py-2 dark:bg-red-900/15">
												<p className="text-red-500">Simpaskor</p>
												<p className="font-bold text-red-700 dark:text-red-300">{formatCurrency(event.revenueSummary.platformShare)}</p>
											</div>
											<div className="rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-900/15">
												<p className="text-emerald-600">Panitia</p>
												<p className="font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(event.revenueSummary.panitiaShare)}</p>
											</div>
										</div>
									</div>
									<div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
										<label className="block text-xs font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
											Persentase Simpaskor
										</label>
										<div className="mt-2 flex items-center gap-2">
											<input
												type="number"
												min="0"
												max="100"
												step="0.01"
												value={share}
												onChange={(e) => updateDraft(event.id, e.target.value)}
												placeholder="Contoh: 2.5"
												className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-gray-900/70"
											/>
											<span className="text-sm font-bold text-gray-500">%</span>
										</div>
										<p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
											Panitia otomatis menerima {panitiaShare === null || Number.isNaN(panitiaShare) ? "-" : `${panitiaShare}%`}.
										</p>
										<div className="mt-4 flex flex-col sm:flex-row gap-2">
											<button
												onClick={() => saveShare(event)}
												disabled={savingId === event.id}
												className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
											>
												{savingId === event.id ? "Menyimpan..." : "Simpan"}
											</button>
											{event.paymentStatus !== "PAID" && (
												<button
													onClick={() => saveShare(event, true)}
													disabled={savingId === event.id}
													className="flex-1 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100 disabled:opacity-60 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300"
												>
													Simpan & Lunaskan
												</button>
											)}
										</div>
									</div>
								</div>
							</div>
						);
					})
				)}
			</div>

			{totalPages > 1 && (
				<div className="flex justify-center gap-2">
					<button
						onClick={() => setPage((p) => Math.max(1, p - 1))}
						disabled={page <= 1}
						className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-white/10"
					>
						Prev
					</button>
					<span className="px-3 py-1.5 text-sm text-gray-500">{page} / {totalPages}</span>
					<button
						onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
						disabled={page >= totalPages}
						className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-white/10"
					>
						Next
					</button>
				</div>
			)}
		</div>
	);
};

export default RevenueShareManagement;
