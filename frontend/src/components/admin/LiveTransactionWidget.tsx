import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
	LuActivity,
	LuCircleCheck,
	LuCircleX,
	LuClock,
	LuCreditCard,
	LuRefreshCw,
	LuShoppingBag,
	LuSparkles,
	LuThumbsUp,
	LuTicket,
	LuTrendingUp,
	LuUserCheck,
	LuWallet,
} from "react-icons/lu";
import { api } from "../../utils/api";

type TxStatus = "PENDING" | "PAID" | "USED" | "CANCELLED" | "EXPIRED" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "COMPLETED";

type TxType = "TICKET" | "VOTE" | "REGISTRATION" | "EVENT_PACKAGE" | "ORDER";

type LiveTxResponse = {
	pending: {
		total: number;
		ticket: number;
		vote: number;
		registration: number;
		event: number;
		order: number;
	};
	lastHour: { paid: number; pending: number; failed: number; revenue: number };
	byType: Array<{
		key: string;
		label: string;
		pending: number;
		paid: number;
		failed: number;
		revenue: number;
	}>;
	recent: Array<{
		id: string;
		type: TxType;
		typeLabel: string;
		buyerName: string;
		buyerEmail: string | null;
		amount: number;
		status: TxStatus;
		context: string | null;
		createdAt: string;
		updatedAt: string;
	}>;
	now: number;
};

const POLL_INTERVAL_MS = 7_000;

const formatCurrency = (amount: number): string =>
	new Intl.NumberFormat("id-ID", {
		style: "currency",
		currency: "IDR",
		minimumFractionDigits: 0,
	}).format(amount);

const formatRelativeTime = (iso: string, now: number): string => {
	const ts = new Date(iso).getTime();
	const diff = Math.max(0, now - ts);
	const sec = Math.floor(diff / 1000);
	if (sec < 5) return "baru saja";
	if (sec < 60) return `${sec} dtk lalu`;
	const min = Math.floor(sec / 60);
	if (min < 60) return `${min} mnt lalu`;
	const hr = Math.floor(min / 60);
	if (hr < 24) return `${hr} jam lalu`;
	const d = Math.floor(hr / 24);
	return `${d} hari lalu`;
};

const typeIcon: Record<TxType, typeof LuTicket> = {
	TICKET: LuTicket,
	VOTE: LuThumbsUp,
	REGISTRATION: LuUserCheck,
	EVENT_PACKAGE: LuSparkles,
	ORDER: LuShoppingBag,
};

const typeAccent: Record<TxType, string> = {
	TICKET: "from-red-500 to-rose-500",
	VOTE: "from-purple-500 to-fuchsia-500",
	REGISTRATION: "from-sky-500 to-blue-500",
	EVENT_PACKAGE: "from-amber-500 to-orange-500",
	ORDER: "from-emerald-500 to-teal-500",
};

const statusConfig = (status: TxStatus) => {
	if (status === "PENDING") {
		return {
			label: "Menunggu",
			tone: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
			dot: "bg-amber-500",
			Icon: LuClock,
		};
	}
	if (status === "CANCELLED" || status === "EXPIRED") {
		return {
			label: status === "EXPIRED" ? "Kedaluwarsa" : "Dibatalkan",
			tone: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
			dot: "bg-rose-500",
			Icon: LuCircleX,
		};
	}
	const labelMap: Partial<Record<TxStatus, string>> = {
		PAID: "Dibayar",
		USED: "Digunakan",
		CONFIRMED: "Dikonfirmasi",
		PROCESSING: "Diproses",
		SHIPPED: "Dikirim",
		COMPLETED: "Selesai",
	};
	return {
		label: labelMap[status] || status,
		tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
		dot: "bg-emerald-500",
		Icon: LuCircleCheck,
	};
};

const Counter: React.FC<{ value: number }> = ({ value }) => {
	const [display, setDisplay] = useState(value);
	const rafRef = useRef<number | null>(null);
	const fromRef = useRef(value);
	const startRef = useRef(0);

	useEffect(() => {
		fromRef.current = display;
		startRef.current = performance.now();
		if (rafRef.current) cancelAnimationFrame(rafRef.current);

		const duration = 500;
		const animate = (now: number) => {
			const t = Math.min(1, (now - startRef.current) / duration);
			const eased = 1 - Math.pow(1 - t, 3);
			const next = Math.round(fromRef.current + (value - fromRef.current) * eased);
			setDisplay(next);
			if (t < 1) rafRef.current = requestAnimationFrame(animate);
		};
		rafRef.current = requestAnimationFrame(animate);
		return () => {
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [value]);

	return <span className="tabular-nums">{display.toLocaleString("id-ID")}</span>;
};

const TypeRow: React.FC<{ row: LiveTxResponse["byType"][number] }> = ({ row }) => {
	const total = row.pending + row.paid + row.failed;
	const paidPct = total === 0 ? 0 : (row.paid / total) * 100;
	const pendingPct = total === 0 ? 0 : (row.pending / total) * 100;
	const failedPct = total === 0 ? 0 : (row.failed / total) * 100;

	return (
		<div className="rounded-2xl border border-gray-200/60 bg-white/70 p-3.5 dark:border-white/[0.06] dark:bg-white/[0.03]">
			<div className="flex items-center justify-between mb-2">
				<p className="text-xs font-bold text-gray-900 dark:text-white">{row.label}</p>
				<span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
					{formatCurrency(row.revenue)}
				</span>
			</div>
			<div className="flex h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.05]">
				<motion.div className="bg-emerald-500" initial={false} animate={{ width: `${paidPct}%` }} transition={{ duration: 0.4 }} />
				<motion.div className="bg-amber-500" initial={false} animate={{ width: `${pendingPct}%` }} transition={{ duration: 0.4 }} />
				<motion.div className="bg-rose-500" initial={false} animate={{ width: `${failedPct}%` }} transition={{ duration: 0.4 }} />
			</div>
			<div className="mt-2 flex items-center justify-between text-[11px]">
				<span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
					<span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
					{row.paid} sukses
				</span>
				<span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
					<span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
					{row.pending} pending
				</span>
				<span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-300">
					<span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
					{row.failed} gagal
				</span>
			</div>
		</div>
	);
};

const RecentRow: React.FC<{ row: LiveTxResponse["recent"][number]; now: number }> = ({ row, now }) => {
	const Icon = typeIcon[row.type] || LuCreditCard;
	const accent = typeAccent[row.type] || "from-gray-500 to-slate-500";
	const status = statusConfig(row.status);

	return (
		<motion.div
			layout
			initial={{ opacity: 0, x: -10, scale: 0.98 }}
			animate={{ opacity: 1, x: 0, scale: 1 }}
			exit={{ opacity: 0, x: 10, scale: 0.98 }}
			transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
			className="flex items-center gap-3 rounded-xl border border-gray-200/60 bg-white/70 p-2.5 dark:border-white/[0.06] dark:bg-white/[0.03]"
		>
			<div
				className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${accent} text-white shadow-sm`}
			>
				<Icon className="h-4 w-4" />
			</div>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{row.buyerName}</p>
					<span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-600 dark:bg-white/[0.05] dark:text-gray-300">
						{row.typeLabel}
					</span>
				</div>
				<p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
					{row.context || row.buyerEmail || "—"} · {formatRelativeTime(row.updatedAt, now)}
				</p>
			</div>
			<div className="shrink-0 text-right">
				<p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
					{row.amount === 0 ? "GRATIS" : formatCurrency(row.amount)}
				</p>
				<span
					className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${status.tone}`}
				>
					{row.status === "PENDING" ? (
						<span className="relative inline-flex h-1.5 w-1.5">
							<span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${status.dot}`} />
							<span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${status.dot}`} />
						</span>
					) : (
						<status.Icon className="h-2.5 w-2.5" />
					)}
					{status.label}
				</span>
			</div>
		</motion.div>
	);
};

const LiveTransactionWidget: React.FC = () => {
	const [data, setData] = useState<LiveTxResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [refreshing, setRefreshing] = useState(false);
	const [tickingNow, setTickingNow] = useState(Date.now());

	const fetchLive = async (silent = false) => {
		try {
			if (!silent) setRefreshing(true);
			// silent=true on the axios config suppresses the global timeout popup —
			// this widget shows its own inline state if the call fails. Timeout is
			// 25s (server has its own 4s per-query budget and 10s response cache).
			const res = await api.get<LiveTxResponse>("/admin/transactions/live", {
				timeout: 25_000,
				silent: true,
			});
			setData(res.data);
			setError(null);
		} catch (err: any) {
			// Only show inline error if we have no data yet — otherwise keep showing
			// the last successful snapshot so a transient hiccup doesn't blank the UI
			if (!data) {
				const isTimeout = err?.code === "ECONNABORTED" || err?.message?.includes("timeout");
				setError(
					isTimeout
						? "Memuat data transaksi lebih lama dari biasanya, mencoba lagi…"
						: err?.response?.data?.error || "Gagal memuat data transaksi aktif"
				);
			}
		} finally {
			if (!silent) setRefreshing(false);
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchLive();
		const handle = window.setInterval(() => fetchLive(true), POLL_INTERVAL_MS);
		// Tick relative-time labels every 10s without refetching
		const tickHandle = window.setInterval(() => setTickingNow(Date.now()), 10_000);
		return () => {
			window.clearInterval(handle);
			window.clearInterval(tickHandle);
		};
	}, []);

	if (loading && !data) {
		return (
			<div className="relative overflow-hidden rounded-3xl border border-gray-200/60 bg-white/70 p-6 shadow-sm backdrop-blur-xl dark:border-white/[0.06] dark:bg-white/[0.025]">
				<div className="animate-pulse space-y-4">
					<div className="h-4 w-40 rounded-full bg-gray-200 dark:bg-white/[0.08]" />
					<div className="h-12 w-44 rounded bg-gray-200 dark:bg-white/[0.08]" />
					<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
						<div className="h-20 rounded-2xl bg-gray-100 dark:bg-white/[0.04]" />
						<div className="h-20 rounded-2xl bg-gray-100 dark:bg-white/[0.04]" />
						<div className="h-20 rounded-2xl bg-gray-100 dark:bg-white/[0.04]" />
					</div>
				</div>
			</div>
		);
	}

	if (error && !data) {
		return (
			<div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-6 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
				{error}
			</div>
		);
	}

	if (!data) return null;

	const pendingTotal = data.pending.total;

	return (
		<div className="relative overflow-hidden rounded-3xl border border-gray-200/60 bg-gradient-to-br from-white via-white to-amber-50/40 shadow-sm backdrop-blur-xl dark:border-white/[0.06] dark:from-[#0d1224] dark:via-[#0d1224] dark:to-amber-900/10">
			<div className="pointer-events-none absolute -top-16 -left-16 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl dark:bg-amber-500/15" />
			<div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-rose-500/10 blur-3xl dark:bg-rose-500/10" />

			<div className="relative p-5 sm:p-6">
				{/* Header */}
				<div className="flex items-start justify-between gap-3 mb-5">
					<div>
						<div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-600 dark:text-amber-300">
							<span className="relative inline-flex h-2 w-2">
								<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
								<span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
							</span>
							LIVE · Transaksi
						</div>
						<h3 className="mt-2 text-lg font-bold text-gray-900 dark:text-white">Transaksi Sedang Berlangsung</h3>
						<p className="text-xs text-gray-500 dark:text-gray-400">User yang sedang membayar / menunggu konfirmasi</p>
					</div>
					<button
						type="button"
						onClick={() => fetchLive()}
						className="inline-flex items-center gap-1.5 rounded-full border border-gray-200/70 bg-white/60 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-white hover:text-gray-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
					>
						<LuRefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
						Refresh
					</button>
				</div>

				{/* Top row: big pending + last-hour summary */}
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr] mb-5">
					<div className="flex flex-col justify-between rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50 p-5 dark:border-amber-500/20 dark:from-amber-500/10 dark:to-orange-500/10">
						<div>
							<p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
								Sedang Pending
							</p>
							<div className="mt-1 flex items-baseline gap-2">
								<motion.span
									key={pendingTotal}
									initial={{ scale: 0.92, opacity: 0.6 }}
									animate={{ scale: 1, opacity: 1 }}
									transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
									className="text-5xl font-black tracking-tight text-amber-700 dark:text-amber-200"
								>
									<Counter value={pendingTotal} />
								</motion.span>
								<span className="text-xs font-medium text-amber-600/80 dark:text-amber-300/70">user</span>
							</div>
							<p className="mt-1 text-[11px] text-amber-700/70 dark:text-amber-200/70">
								Menunggu pembayaran atau konfirmasi
							</p>
						</div>
						<div className="mt-3 grid grid-cols-3 gap-1.5 text-[11px]">
							<div className="rounded-lg bg-white/70 px-2 py-1.5 text-center dark:bg-white/[0.06]">
								<p className="text-[9px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Tiket</p>
								<p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
									{data.pending.ticket}
								</p>
							</div>
							<div className="rounded-lg bg-white/70 px-2 py-1.5 text-center dark:bg-white/[0.06]">
								<p className="text-[9px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Vote</p>
								<p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
									{data.pending.vote}
								</p>
							</div>
							<div className="rounded-lg bg-white/70 px-2 py-1.5 text-center dark:bg-white/[0.06]">
								<p className="text-[9px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Lainnya</p>
								<p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
									{data.pending.registration + data.pending.event + data.pending.order}
								</p>
							</div>
						</div>
					</div>

					{/* Last hour summary */}
					<div className="grid grid-cols-3 gap-3">
						<motion.div
							layout
							className="flex flex-col justify-between rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 dark:border-emerald-500/20 dark:from-emerald-500/10 dark:to-teal-500/10"
						>
							<div className="flex items-center justify-between">
								<p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
									Sukses 1 jam
								</p>
								<LuCircleCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
							</div>
							<p className="mt-2 text-3xl font-black text-emerald-700 dark:text-emerald-200 tabular-nums leading-tight">
								<Counter value={data.lastHour.paid} />
							</p>
							<p className="text-[10px] text-emerald-700/70 dark:text-emerald-200/70">transaksi sukses</p>
						</motion.div>

						<motion.div
							layout
							className="flex flex-col justify-between rounded-2xl border border-red-200/60 bg-gradient-to-br from-red-50 to-rose-50 p-4 dark:border-red-500/20 dark:from-red-500/10 dark:to-rose-500/10"
						>
							<div className="flex items-center justify-between">
								<p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
									Gagal 1 jam
								</p>
								<LuCircleX className="h-4 w-4 text-rose-600 dark:text-rose-300" />
							</div>
							<p className="mt-2 text-3xl font-black text-rose-700 dark:text-rose-200 tabular-nums leading-tight">
								<Counter value={data.lastHour.failed} />
							</p>
							<p className="text-[10px] text-rose-700/70 dark:text-rose-200/70">cancelled / expired</p>
						</motion.div>

						<motion.div
							layout
							className="flex flex-col justify-between rounded-2xl border border-sky-200/60 bg-gradient-to-br from-sky-50 to-blue-50 p-4 dark:border-sky-500/20 dark:from-sky-500/10 dark:to-blue-500/10"
						>
							<div className="flex items-center justify-between">
								<p className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
									Revenue 1 jam
								</p>
								<LuWallet className="h-4 w-4 text-sky-600 dark:text-sky-300" />
							</div>
							<p className="mt-2 text-xl sm:text-2xl font-black text-sky-700 dark:text-sky-200 tabular-nums leading-tight truncate">
								{formatCurrency(data.lastHour.revenue)}
							</p>
							<p className="text-[10px] text-sky-700/70 dark:text-sky-200/70">total uang masuk</p>
						</motion.div>
					</div>
				</div>

				{/* By-type breakdown + recent feed */}
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
					{/* By type — total all-time */}
					<div>
						<div className="flex items-center justify-between mb-2.5">
							<p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
								<LuTrendingUp className="h-3.5 w-3.5 text-amber-500" />
								Distribusi per kategori
							</p>
							<p className="text-[10px] text-gray-400 dark:text-gray-500">total semua waktu</p>
						</div>
						<div className="space-y-2.5">
							{data.byType.map((row) => (
								<TypeRow key={row.key} row={row} />
							))}
						</div>
					</div>

					{/* Recent feed */}
					<div>
						<div className="flex items-center justify-between mb-2.5">
							<p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
								<LuActivity className="h-3.5 w-3.5 text-amber-500" />
								Aktivitas Terbaru
							</p>
							<p className="text-[10px] text-gray-400 dark:text-gray-500">update tiap {Math.round(POLL_INTERVAL_MS / 1000)} dtk</p>
						</div>
						{data.recent.length === 0 ? (
							<div className="rounded-2xl border border-dashed border-gray-200 bg-white/40 p-6 text-center text-sm text-gray-400 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-gray-500">
								Belum ada aktivitas dalam 1 jam terakhir.
							</div>
						) : (
							<div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
								<AnimatePresence initial={false}>
									{data.recent.map((row) => (
										<RecentRow key={`${row.type}-${row.id}`} row={row} now={tickingNow} />
									))}
								</AnimatePresence>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default LiveTransactionWidget;
