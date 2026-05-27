import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	LuBadgeDollarSign,
	LuCalendar,
	LuDownload,
	LuFileText,
	LuRefreshCw,
	LuSearch,
	LuTicket,
	LuThumbsUp,
	LuUsers,
} from "react-icons/lu";
import Swal from "sweetalert2";
import { api } from "../../utils/api";

type AdminFeeSource = "ticket" | "voting" | "registration";

interface AdminFeeTransaction {
	id: string;
	source: AdminFeeSource;
	sourceId: string | null;
	eventId: string | null;
	eventTitle: string | null;
	eventSlug: string | null;
	midtransOrderId: string;
	baseAmount: number;
	adminFee: number;
	quantity: number | null;
	voteCount: number | null;
	status: string;
	paymentType: string | null;
	paidAt: string;
}

interface AdminFeeResponse {
	currency: "IDR";
	summary: {
		totalAdminFee: number;
		totalBaseAmount: number;
		ticketAdminFee: number;
		votingAdminFee: number;
		registrationAdminFee: number;
	};
	counts: {
		total: number;
		tickets: number;
		voting: number;
		registrations: number;
	};
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
	data: AdminFeeTransaction[];
}

const sourceLabels: Record<AdminFeeSource, string> = {
	ticket: "Tiket",
	voting: "Voting",
	registration: "Registrasi",
};

const sourceStyles: Record<AdminFeeSource, string> = {
	ticket: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/20 dark:text-red-300 dark:ring-red-800",
	voting: "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:ring-indigo-800",
	registration: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-800",
};

const formatCurrency = (amount: number) =>
	new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount || 0);

const formatDateTime = (date: string) =>
	new Date(date).toLocaleString("id-ID", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});

const escapeCsv = (value: unknown) => {
	const text = value === null || value === undefined ? "" : String(value);
	return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const AdminFeeManagement: React.FC = () => {
	const [rows, setRows] = useState<AdminFeeTransaction[]>([]);
	const [summary, setSummary] = useState<AdminFeeResponse["summary"]>({
		totalAdminFee: 0,
		totalBaseAmount: 0,
		ticketAdminFee: 0,
		votingAdminFee: 0,
		registrationAdminFee: 0,
	});
	const [counts, setCounts] = useState<AdminFeeResponse["counts"]>({
		total: 0,
		tickets: 0,
		voting: 0,
		registrations: 0,
	});
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [from, setFrom] = useState("");
	const [to, setTo] = useState("");
	const [source, setSource] = useState("");
	const [loading, setLoading] = useState(true);
	const [exporting, setExporting] = useState(false);

	const buildParams = useCallback(
		(customPage = page, customLimit = 20) => {
			const params = new URLSearchParams();
			params.set("page", String(customPage));
			params.set("limit", String(customLimit));
			if (from) params.set("from", from);
			if (to) params.set("to", to);
			if (source) params.set("source", source);
			return params;
		},
		[from, page, source, to]
	);

	const fetchAdminFees = useCallback(async () => {
		setLoading(true);
		try {
			const res = await api.get<AdminFeeResponse>(`/admin/admin-fees?${buildParams().toString()}`);
			setRows(res.data.data || []);
			setSummary(res.data.summary);
			setCounts(res.data.counts);
			setTotalPages(res.data.pagination?.totalPages || 1);
		} catch (error: any) {
			Swal.fire("Gagal", error.response?.data?.error || "Gagal mengambil data admin fee.", "error");
		} finally {
			setLoading(false);
		}
	}, [buildParams]);

	useEffect(() => {
		fetchAdminFees();
	}, [fetchAdminFees]);

	const cards = useMemo(
		() => [
			{
				label: "Total Admin Fee",
				value: summary.totalAdminFee,
				count: counts.total,
				icon: LuBadgeDollarSign,
				className: "border-gray-200/70 bg-white/85 dark:border-white/10 dark:bg-gray-800/55",
			},
			{
				label: "Tiket",
				value: summary.ticketAdminFee,
				count: counts.tickets,
				icon: LuTicket,
				className: "border-red-200 bg-red-50/75 dark:border-red-900/60 dark:bg-red-950/20",
			},
			{
				label: "Voting",
				value: summary.votingAdminFee,
				count: counts.voting,
				icon: LuThumbsUp,
				className: "border-indigo-200 bg-indigo-50/75 dark:border-indigo-900/60 dark:bg-indigo-950/20",
			},
			{
				label: "Registrasi",
				value: summary.registrationAdminFee,
				count: counts.registrations,
				icon: LuUsers,
				className: "border-emerald-200 bg-emerald-50/75 dark:border-emerald-900/60 dark:bg-emerald-950/20",
			},
		],
		[counts, summary]
	);

	const resetFilters = () => {
		setFrom("");
		setTo("");
		setSource("");
		setPage(1);
	};

	const exportCsv = async () => {
		setExporting(true);
		try {
			const res = await api.get<AdminFeeResponse>(`/admin/admin-fees?${buildParams(1, 5000).toString()}`);
			const data = res.data.data || [];
			const headers = [
				"Paid At",
				"Event",
				"Source",
				"Base Amount",
				"Admin Fee",
				"Quantity",
				"Vote Count",
				"Order ID",
				"Payment Type",
				"Status",
			];
			const lines = [
				headers.map(escapeCsv).join(","),
				...data.map((tx) =>
					[
						formatDateTime(tx.paidAt),
						tx.eventTitle || tx.eventId || "-",
						sourceLabels[tx.source] || tx.source,
						tx.baseAmount,
						tx.adminFee,
						tx.quantity ?? "",
						tx.voteCount ?? "",
						tx.midtransOrderId,
						tx.paymentType || "",
						tx.status,
					]
						.map(escapeCsv)
						.join(",")
				),
			];

			const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `admin-fee-${new Date().toISOString().slice(0, 10)}.csv`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		} catch (error: any) {
			Swal.fire("Gagal", error.response?.data?.error || "Gagal export CSV admin fee.", "error");
		} finally {
			setExporting(false);
		}
	};

	return (
		<div className="p-4 md:p-6 space-y-6">
			<div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
						<LuBadgeDollarSign className="w-6 h-6 text-red-500" />
						Admin Fee
					</h1>
					<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
						Rincian admin fee dari transaksi tiket, voting, dan registrasi.
					</p>
				</div>
				<div className="flex flex-col sm:flex-row gap-2">
					<button
						type="button"
						onClick={exportCsv}
						disabled={exporting || loading}
						className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-white/10 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
					>
						<LuDownload className={`w-4 h-4 ${exporting ? "animate-pulse" : ""}`} />
						Export CSV
					</button>
					<button
						type="button"
						onClick={fetchAdminFees}
						className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
					>
						<LuRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
						Refresh
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
				{cards.map((card) => {
					const Icon = card.icon;
					return (
						<div key={card.label} className={`rounded-lg border p-4 shadow-sm ${card.className}`}>
							<div className="flex items-center justify-between gap-3">
								<div>
									<p className="text-xs font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
									<p className="mt-1 text-xl font-black text-gray-900 dark:text-white">{formatCurrency(card.value)}</p>
									<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{card.count} transaksi</p>
								</div>
								<div className="h-10 w-10 rounded-lg bg-white/70 dark:bg-white/[0.06] flex items-center justify-center text-red-500">
									<Icon className="h-5 w-5" />
								</div>
							</div>
						</div>
					);
				})}
			</div>

			<div className="rounded-lg border border-gray-200/70 bg-white/85 p-4 shadow-sm dark:border-white/10 dark:bg-gray-800/55">
				<div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto_auto] gap-3">
					<label className="relative">
						<LuCalendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
						<input
							type="date"
							value={from}
							onChange={(e) => { setFrom(e.target.value); setPage(1); }}
							className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-800 dark:border-white/10 dark:bg-gray-900/60 dark:text-gray-100"
						/>
					</label>
					<label className="relative">
						<LuCalendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
						<input
							type="date"
							value={to}
							onChange={(e) => { setTo(e.target.value); setPage(1); }}
							className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-800 dark:border-white/10 dark:bg-gray-900/60 dark:text-gray-100"
						/>
					</label>
					<select
						value={source}
						onChange={(e) => { setSource(e.target.value); setPage(1); }}
						className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 dark:border-white/10 dark:bg-gray-900/60 dark:text-gray-100"
					>
						<option value="">Semua source</option>
						<option value="ticket">Tiket</option>
						<option value="voting">Voting</option>
						<option value="registration">Registrasi</option>
					</select>
					<button
						type="button"
						onClick={fetchAdminFees}
						className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
					>
						<LuSearch className="w-4 h-4" />
						Terapkan
					</button>
					<button
						type="button"
						onClick={resetFilters}
						className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/[0.05]"
					>
						Reset
					</button>
				</div>
			</div>

			<div className="overflow-hidden rounded-lg border border-gray-200/70 bg-white/90 shadow-sm dark:border-white/10 dark:bg-gray-800/70">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
						<thead className="bg-gray-50 dark:bg-white/[0.03]">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Transaksi</th>
								<th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Event</th>
								<th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Source</th>
								<th className="px-4 py-3 text-right text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Base Amount</th>
								<th className="px-4 py-3 text-right text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Admin Fee</th>
								<th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Paid At</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100 dark:divide-white/10">
							{loading ? (
								<tr>
									<td colSpan={6} className="px-4 py-14 text-center text-sm text-gray-500 dark:text-gray-400">
										<LuRefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-red-500" />
										Memuat admin fee...
									</td>
								</tr>
							) : rows.length === 0 ? (
								<tr>
									<td colSpan={6} className="px-4 py-14 text-center text-sm text-gray-500 dark:text-gray-400">
										<LuFileText className="mx-auto mb-2 h-6 w-6 text-gray-400" />
										Belum ada transaksi admin fee untuk filter ini.
									</td>
								</tr>
							) : (
								rows.map((tx) => (
									<tr key={tx.id} className="hover:bg-gray-50/80 dark:hover:bg-white/[0.03]">
										<td className="px-4 py-3 align-top">
											<p className="max-w-[220px] truncate text-sm font-semibold text-gray-900 dark:text-white">
												{tx.midtransOrderId}
											</p>
											<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{tx.paymentType || tx.status}</p>
										</td>
										<td className="px-4 py-3 align-top">
											<p className="max-w-[260px] truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
												{tx.eventTitle || "-"}
											</p>
											<p className="mt-1 max-w-[260px] truncate text-xs text-gray-500 dark:text-gray-400">
												{tx.eventSlug || tx.eventId || "-"}
											</p>
										</td>
										<td className="px-4 py-3 align-top">
											<span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${sourceStyles[tx.source]}`}>
												{sourceLabels[tx.source] || tx.source}
											</span>
											<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
												{tx.source === "ticket" && tx.quantity ? `${tx.quantity} tiket` : null}
												{tx.source === "voting" && tx.voteCount ? `${tx.voteCount} vote` : null}
												{tx.source === "registration" ? "1 transaksi" : null}
											</p>
										</td>
										<td className="px-4 py-3 text-right align-top text-sm font-semibold text-gray-800 dark:text-gray-100">
											{formatCurrency(tx.baseAmount)}
										</td>
										<td className="px-4 py-3 text-right align-top text-sm font-black text-red-600 dark:text-red-400">
											{formatCurrency(tx.adminFee)}
										</td>
										<td className="px-4 py-3 align-top text-sm text-gray-600 dark:text-gray-300">
											{formatDateTime(tx.paidAt)}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{totalPages > 1 && (
				<div className="flex items-center justify-center gap-2">
					<button
						type="button"
						onClick={() => setPage((p) => Math.max(1, p - 1))}
						disabled={page <= 1}
						className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-white/10"
					>
						Prev
					</button>
					<span className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400">{page} / {totalPages}</span>
					<button
						type="button"
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

export default AdminFeeManagement;
