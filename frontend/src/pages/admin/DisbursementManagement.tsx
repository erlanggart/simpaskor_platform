import React, { useState, useEffect } from "react";
import {
	BanknotesIcon,
	CheckCircleIcon,
	ClockIcon,
	XCircleIcon,
	MagnifyingGlassIcon,
	ArrowPathIcon,
	FunnelIcon,
} from "@heroicons/react/24/outline";
import Swal from "sweetalert2";
import { api } from "../../utils/api";

interface DisbursementItem {
	id: string;
	kind?: "EVENT" | "MITRA";
	amount: number;
	bankName: string;
	accountNumber: string;
	accountHolder: string;
	notes: string | null;
	status: "PENDING" | "APPROVED" | "TRANSFERRED" | "REJECTED";
	adminNotes: string | null;
	transferProof: string | null;
	transferredAt: string | null;
	processedAt: string | null;
	createdAt: string;
	event: { id: string; title: string; startDate: string; slug: string | null } | null;
	eventBalance?: {
		grossRevenue: number;
		ticketGrossRevenue: number;
		votingGrossRevenue: number;
		platformShare: number;
		panitiaShare: number;
		lockedPlatformShare: number;
		activePlatformShare: number;
		totalWithdrawn: number;
		totalPending: number;
		activeBalance: number;
	} | null;
	mitraProfile?: {
		id: string;
		referralCode: string;
		user: { id: string; name: string; email: string };
	};
	requestedBy: { id: string; name: string; email: string };
	processedBy: { id: string; name: string; email: string } | null;
}

const formatCurrency = (amount: number) =>
	new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

const DisbursementManagement: React.FC = () => {
	const [disbursements, setDisbursements] = useState<DisbursementItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [stats, setStats] = useState<{
		pending: { count: number; amount: number };
		approved: { count: number; amount: number };
		transferred: { count: number; amount: number };
	} | null>(null);

	useEffect(() => {
		fetchDisbursements();
	}, [page, search, statusFilter]);

	const fetchDisbursements = async () => {
		try {
			setLoading(true);
			const params: any = { page, limit: 20 };
			if (search) params.search = search;
			if (statusFilter) params.status = statusFilter;

			const res = await api.get("/disbursements/admin/all", { params });
			setDisbursements(res.data.data);
			setTotalPages(res.data.totalPages);
			setStats(res.data.stats);
		} catch (err) {
			console.error("Error fetching disbursements:", err);
		} finally {
			setLoading(false);
		}
	};

	const getActionBasePath = (item: DisbursementItem) =>
		item.kind === "MITRA" ? `/disbursements/admin/mitra/${item.id}` : `/disbursements/admin/${item.id}`;

	const handleApprove = async (item: DisbursementItem) => {
		const result = await Swal.fire({
			title: "Setujui Pencairan?",
			text: "Pengajuan akan ditandai sebagai disetujui.",
			input: "textarea",
			inputLabel: "Catatan (opsional)",
			inputPlaceholder: item.kind === "MITRA" ? "Catatan untuk mitra..." : "Catatan untuk pengelola event...",
			icon: "question",
			showCancelButton: true,
			confirmButtonText: "Setujui",
			cancelButtonText: "Batal",
			confirmButtonColor: "#2563eb",
		});
		if (!result.isConfirmed) return;

		try {
			await api.patch(`${getActionBasePath(item)}/approve`, { adminNotes: result.value || null });
			Swal.fire("Berhasil", "Pengajuan disetujui", "success");
			fetchDisbursements();
		} catch (err: any) {
			Swal.fire("Gagal", err.response?.data?.error || "Gagal menyetujui", "error");
		}
	};

	const handleTransfer = async (d: DisbursementItem) => {
		const result = await Swal.fire({
			title: "Tandai Sudah Ditransfer?",
			html: `
				<div class="text-left text-sm space-y-2 mb-4">
					<p><strong>Jumlah:</strong> ${formatCurrency(d.amount)}</p>
					<p><strong>Bank:</strong> ${d.bankName}</p>
					<p><strong>No. Rekening:</strong> ${d.accountNumber}</p>
					<p><strong>Atas Nama:</strong> ${d.accountHolder}</p>
				</div>
				<p class="text-sm text-gray-500">Pastikan dana sudah ditransfer sebelum menandai.</p>
			`,
			input: "textarea",
			inputLabel: "Catatan transfer (opsional)",
			inputPlaceholder: "Catatan atau referensi transfer...",
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Sudah Ditransfer",
			cancelButtonText: "Batal",
			confirmButtonColor: "#16a34a",
		});
		if (!result.isConfirmed) return;

		try {
			await api.patch(`${getActionBasePath(d)}/transfer`, { adminNotes: result.value || null });
			Swal.fire("Berhasil", "Pencairan ditandai sudah ditransfer", "success");
			fetchDisbursements();
		} catch (err: any) {
			Swal.fire("Gagal", err.response?.data?.error || "Gagal memproses", "error");
		}
	};

	const handleReject = async (item: DisbursementItem) => {
		const result = await Swal.fire({
			title: "Tolak Pengajuan?",
			input: "textarea",
			inputLabel: "Alasan penolakan (wajib)",
			inputPlaceholder: "Jelaskan alasan penolakan...",
			inputValidator: (value) => (!value?.trim() ? "Alasan penolakan wajib diisi" : null),
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Tolak",
			cancelButtonText: "Batal",
			confirmButtonColor: "#dc2626",
		});
		if (!result.isConfirmed) return;

		try {
			await api.patch(`${getActionBasePath(item)}/reject`, { adminNotes: result.value });
			Swal.fire("Berhasil", "Pengajuan ditolak", "success");
			fetchDisbursements();
		} catch (err: any) {
			Swal.fire("Gagal", err.response?.data?.error || "Gagal menolak", "error");
		}
	};

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "PENDING":
				return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"><ClockIcon className="w-3 h-3" /> Menunggu</span>;
			case "APPROVED":
				return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"><CheckCircleIcon className="w-3 h-3" /> Disetujui</span>;
			case "TRANSFERRED":
				return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><BanknotesIcon className="w-3 h-3" /> Ditransfer</span>;
			case "REJECTED":
				return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><XCircleIcon className="w-3 h-3" /> Ditolak</span>;
			default:
				return null;
		}
	};

	const renderEventBalance = (item: DisbursementItem) => {
		if (item.kind !== "EVENT" || !item.eventBalance) return null;
		const balance = item.eventBalance;
		const metrics = [
			{
				label: "Pemasukan",
				value: balance.grossRevenue,
				tone: "text-gray-900 dark:text-white",
				note: `Tiket ${formatCurrency(balance.ticketGrossRevenue)} - Vote ${formatCurrency(balance.votingGrossRevenue)}`,
			},
			{
				label: "Panitia Aktif",
				value: balance.activeBalance,
				tone: "text-blue-600 dark:text-blue-400",
				note: `Total hak ${formatCurrency(balance.panitiaShare)}`,
			},
			{
				label: "SIMPASKOR Aktif",
				value: balance.activePlatformShare,
				tone: "text-red-600 dark:text-red-400",
				note: `Total hak ${formatCurrency(balance.platformShare)}`,
			},
			{
				label: "Panitia Dikunci",
				value: balance.totalWithdrawn,
				tone: "text-green-600 dark:text-green-400",
				note: `Menunggu ${formatCurrency(balance.totalPending)}`,
			},
			{
				label: "SIMPASKOR Dikunci",
				value: balance.lockedPlatformShare,
				tone: "text-green-600 dark:text-green-400",
				note: "Ikut periode cair",
			},
		];

		return (
			<div className="mb-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-gray-700 dark:bg-gray-900/30">
				<div className="mb-2 flex flex-wrap items-center justify-between gap-2">
					<p className="text-xs font-semibold uppercase text-slate-500 dark:text-gray-400">Saldo Event</p>
					<p className="rounded-full bg-blue-50 px-3 py-1 text-sm font-black text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
						Aktif {formatCurrency(balance.activeBalance)}
					</p>
				</div>
				<div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
					{metrics.map((metric) => (
						<div key={metric.label} className="min-w-0 rounded-md bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100 dark:bg-gray-800/70 dark:ring-gray-700">
							<p className="truncate text-[11px] font-medium text-gray-400">{metric.label}</p>
							<p className={`truncate text-sm font-bold ${metric.tone}`}>{formatCurrency(metric.value)}</p>
							<p className="truncate text-[11px] text-gray-400">{metric.note}</p>
						</div>
					))}
				</div>
			</div>
		);
	};

	return (
		<div className="p-6 max-w-7xl mx-auto">
			{/* Header */}
			<div className="flex items-center gap-3 mb-6">
				<BanknotesIcon className="w-8 h-8 text-red-600" />
				<div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manajemen Pencairan</h1>
					<p className="text-sm text-gray-500 dark:text-gray-400">Kelola pengajuan pencairan dana dari pengelola event dan mitra</p>
				</div>
			</div>

			{/* Stats Cards */}
			{stats && (
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
					<div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs font-medium text-yellow-600 dark:text-yellow-400 uppercase">Menunggu</p>
								<p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{stats.pending.count}</p>
								<p className="text-sm text-yellow-600 dark:text-yellow-400">{formatCurrency(stats.pending.amount)}</p>
							</div>
							<ClockIcon className="w-10 h-10 text-yellow-300 dark:text-yellow-700" />
						</div>
					</div>
					<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase">Disetujui</p>
								<p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.approved.count}</p>
								<p className="text-sm text-blue-600 dark:text-blue-400">{formatCurrency(stats.approved.amount)}</p>
							</div>
							<CheckCircleIcon className="w-10 h-10 text-blue-300 dark:text-blue-700" />
						</div>
					</div>
					<div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase">Ditransfer</p>
								<p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.transferred.count}</p>
								<p className="text-sm text-green-600 dark:text-green-400">{formatCurrency(stats.transferred.amount)}</p>
							</div>
							<BanknotesIcon className="w-10 h-10 text-green-300 dark:text-green-700" />
						</div>
					</div>
				</div>
			)}

			{/* Filters */}
			<div className="flex flex-col sm:flex-row gap-3 mb-6">
				<div className="relative flex-1">
					<MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
					<input
						type="text"
						value={search}
						onChange={(e) => { setSearch(e.target.value); setPage(1); }}
						placeholder="Cari event, mitra, kode referral, bank..."
						className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
					/>
				</div>
				<div className="flex items-center gap-2">
					<FunnelIcon className="w-4 h-4 text-gray-400" />
					<select
						value={statusFilter}
						onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
						className="px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-red-500"
					>
						<option value="">Semua Status</option>
						<option value="PENDING">Menunggu</option>
						<option value="APPROVED">Disetujui</option>
						<option value="TRANSFERRED">Ditransfer</option>
						<option value="REJECTED">Ditolak</option>
					</select>
				</div>
			</div>

			{/* Disbursement List */}
			{loading ? (
				<div className="flex justify-center py-12">
					<ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
				</div>
			) : disbursements.length === 0 ? (
				<div className="text-center py-12 bg-white/80 dark:bg-gray-800/50 rounded-xl shadow-sm">
					<BanknotesIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
					<p className="text-gray-500 dark:text-gray-400">Belum ada pengajuan pencairan</p>
				</div>
			) : (
				<div className="space-y-3">
					{disbursements.map((d) => (
						<div key={d.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/70">
							<div className="p-4">
								<div className="mb-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
									<div className="min-w-0">
										<h3 className="text-lg font-bold text-gray-900 dark:text-white">
											{formatCurrency(d.amount)}
										</h3>
										<p className="truncate text-sm font-medium text-gray-600 dark:text-gray-300">
											{d.kind === "MITRA" ? "Penarikan Komisi Mitra" : d.event?.title}
										</p>
										<p className="mt-0.5 truncate text-xs text-gray-400">
											Diajukan oleh {d.requestedBy.name} ({d.requestedBy.email}) - {new Date(d.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
										</p>
										{d.kind === "MITRA" && d.mitraProfile && (
											<p className="mt-1 truncate text-xs font-semibold text-red-600 dark:text-red-400">
												Mitra: {d.mitraProfile.user.name} - Kode {d.mitraProfile.referralCode}
											</p>
										)}
									</div>
									<div className="flex flex-wrap items-center gap-2 lg:justify-end">
										{getStatusBadge(d.status)}
										{d.status === "PENDING" && (
											<button
												onClick={() => handleApprove(d)}
												className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
											>
												Setujui
											</button>
										)}
										{(d.status === "PENDING" || d.status === "APPROVED") && (
											<>
												<button
													onClick={() => handleTransfer(d)}
													className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-green-700"
												>
													Transfer
												</button>
												<button
													onClick={() => handleReject(d)}
													className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700"
												>
													Tolak
												</button>
											</>
										)}
									</div>
								</div>

								{renderEventBalance(d)}

								<div className="mb-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700/30">
									<div className="grid gap-2 text-sm sm:grid-cols-3">
										<div className="min-w-0">
											<p className="text-[11px] font-medium text-gray-400">Bank</p>
											<p className="truncate font-semibold text-gray-900 dark:text-white">{d.bankName}</p>
										</div>
										<div className="min-w-0">
											<p className="text-[11px] font-medium text-gray-400">No. Rekening</p>
											<p className="truncate font-mono font-semibold text-gray-900 dark:text-white">{d.accountNumber}</p>
										</div>
										<div className="min-w-0">
											<p className="text-[11px] font-medium text-gray-400">Atas Nama</p>
											<p className="truncate font-semibold text-gray-900 dark:text-white">{d.accountHolder}</p>
										</div>
									</div>
								</div>

								{d.notes && (
									<p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
										<span className="font-medium">Catatan:</span> {d.notes}
									</p>
								)}

								{d.adminNotes && (
									<div className={`text-sm p-3 rounded-lg mb-3 ${
										d.status === "REJECTED"
											? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
											: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
									}`}>
										<span className="font-medium">Catatan Admin:</span> {d.adminNotes}
									</div>
								)}

								{d.status === "TRANSFERRED" && d.transferredAt && (
									<p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
										<CheckCircleIcon className="w-4 h-4" />
										Ditransfer pada {new Date(d.transferredAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
										{d.processedBy && ` oleh ${d.processedBy.name}`}
									</p>
								)}

							</div>
						</div>
					))}

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex justify-center gap-2 pt-4">
							<button
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								disabled={page <= 1}
								className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-50"
							>
								Prev
							</button>
							<span className="px-3 py-1.5 text-sm text-gray-500">
								{page} / {totalPages}
							</span>
							<button
								onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
								disabled={page >= totalPages}
								className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-50"
							>
								Next
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default DisbursementManagement;
