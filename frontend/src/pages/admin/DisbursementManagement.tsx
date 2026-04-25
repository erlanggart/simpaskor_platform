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
	event: { id: string; title: string; startDate: string; slug: string | null };
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

	const handleApprove = async (id: string) => {
		const result = await Swal.fire({
			title: "Setujui Pencairan?",
			text: "Pengajuan akan ditandai sebagai disetujui.",
			input: "textarea",
			inputLabel: "Catatan (opsional)",
			inputPlaceholder: "Catatan untuk pengelola event...",
			icon: "question",
			showCancelButton: true,
			confirmButtonText: "Setujui",
			cancelButtonText: "Batal",
			confirmButtonColor: "#2563eb",
		});
		if (!result.isConfirmed) return;

		try {
			await api.patch(`/disbursements/admin/${id}/approve`, { adminNotes: result.value || null });
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
			await api.patch(`/disbursements/admin/${d.id}/transfer`, { adminNotes: result.value || null });
			Swal.fire("Berhasil", "Pencairan ditandai sudah ditransfer", "success");
			fetchDisbursements();
		} catch (err: any) {
			Swal.fire("Gagal", err.response?.data?.error || "Gagal memproses", "error");
		}
	};

	const handleReject = async (id: string) => {
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
			await api.patch(`/disbursements/admin/${id}/reject`, { adminNotes: result.value });
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

	return (
		<div className="p-6 max-w-7xl mx-auto">
			{/* Header */}
			<div className="flex items-center gap-3 mb-6">
				<BanknotesIcon className="w-8 h-8 text-red-600" />
				<div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manajemen Pencairan</h1>
					<p className="text-sm text-gray-500 dark:text-gray-400">Kelola pengajuan pencairan dana dari pengelola event</p>
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
						placeholder="Cari event, pengelola, bank..."
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
				<div className="space-y-4">
					{disbursements.map((d) => (
						<div key={d.id} className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm overflow-hidden">
							{/* Header */}
							<div className="p-5">
								<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
									<div>
										<h3 className="font-semibold text-gray-900 dark:text-white text-lg">
											{formatCurrency(d.amount)}
										</h3>
										<p className="text-sm text-gray-500 dark:text-gray-400">
											{d.event.title}
										</p>
										<p className="text-xs text-gray-400 mt-0.5">
											Diajukan oleh {d.requestedBy.name} ({d.requestedBy.email}) · {new Date(d.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
										</p>
									</div>
									<div className="flex items-center gap-2">
										{getStatusBadge(d.status)}
									</div>
								</div>

								{/* Bank Details */}
								<div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 mb-3">
									<p className="text-xs text-gray-400 mb-1 font-medium">Detail Rekening</p>
									<div className="grid grid-cols-3 gap-2 text-sm">
										<div>
											<p className="text-xs text-gray-400">Bank</p>
											<p className="font-semibold text-gray-900 dark:text-white">{d.bankName}</p>
										</div>
										<div>
											<p className="text-xs text-gray-400">No. Rekening</p>
											<p className="font-semibold text-gray-900 dark:text-white font-mono">{d.accountNumber}</p>
										</div>
										<div>
											<p className="text-xs text-gray-400">Atas Nama</p>
											<p className="font-semibold text-gray-900 dark:text-white">{d.accountHolder}</p>
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

								{/* Action Buttons */}
								{(d.status === "PENDING" || d.status === "APPROVED") && (
									<div className="flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
										{d.status === "PENDING" && (
											<button
												onClick={() => handleApprove(d.id)}
												className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
											>
												Setujui
											</button>
										)}
										<button
											onClick={() => handleTransfer(d)}
											className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
										>
											Tandai Ditransfer
										</button>
										<button
											onClick={() => handleReject(d.id)}
											className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
										>
											Tolak
										</button>
									</div>
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
