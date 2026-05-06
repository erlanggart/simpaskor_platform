import React, { useState, useEffect, useCallback } from "react";
import {
	LuSearch,
	LuTrash2,
	LuEye,
	LuFilter,
	LuPackage,
	LuClock,
	LuPhone,
	LuCircleCheck,
	LuCircleX,
	LuChevronLeft,
	LuChevronRight,
	LuRefreshCw,
} from "react-icons/lu";
import { api } from "../../utils/api";
import { showDeleteConfirm } from "../../utils/sweetalert";
import { getPackagePriceLabel } from "../../utils/packagePricing";
import Swal from "sweetalert2";

interface EventSubmission {
	id: string;
	namaPanitia: string;
	email: string;
	phone: string | null;
	namaEvent: string;
	lokasiEvent: string;
	namaInstansi: string;
	packageTier: "TICKETING" | "VOTING" | "TICKETING_VOTING" | "BRONZE" | "SILVER" | "GOLD";
	status: "PENDING" | "CONTACTED" | "CONFIRMED" | "REJECTED";
	notes: string | null;
	createdUserId: string | null;
	createdAt: string;
	updatedAt: string;
}

interface Pagination {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

const statusConfig = {
	PENDING: { label: "Menunggu", color: "yellow", icon: LuClock },
	CONTACTED: { label: "Dihubungi", color: "blue", icon: LuPhone },
	CONFIRMED: { label: "Dikonfirmasi", color: "green", icon: LuCircleCheck },
	REJECTED: { label: "Ditolak", color: "red", icon: LuCircleX },
};

const tierConfig = {
	TICKETING: { label: "Ticketing", price: getPackagePriceLabel("TICKETING"), color: "blue" },
	VOTING: { label: "Voting", price: getPackagePriceLabel("VOTING"), color: "purple" },
	TICKETING_VOTING: { label: "Tiket + Voting", price: getPackagePriceLabel("TICKETING_VOTING"), color: "indigo" },
	BRONZE: { label: "Bronze", price: getPackagePriceLabel("BRONZE"), color: "amber" },
	SILVER: { label: "Silver", price: getPackagePriceLabel("SILVER"), color: "gray" },
	GOLD: { label: "Gold", price: getPackagePriceLabel("GOLD"), color: "yellow" },
};

const EventSubmissionManagement: React.FC = () => {
	const [submissions, setSubmissions] = useState<EventSubmission[]>([]);
	const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [filterStatus, setFilterStatus] = useState("");
	const [filterTier, setFilterTier] = useState("");
	const [selectedSubmission, setSelectedSubmission] = useState<EventSubmission | null>(null);
	const [showDetailModal, setShowDetailModal] = useState(false);

	const fetchSubmissions = useCallback(async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams();
			params.set("page", String(pagination.page));
			params.set("limit", String(pagination.limit));
			if (filterStatus) params.set("status", filterStatus);
			if (filterTier) params.set("packageTier", filterTier);

			const res = await api.get(`/event-submissions?${params.toString()}`);
			setSubmissions(res.data.submissions);
			setPagination(res.data.pagination);
		} catch (error) {
			console.error("Error fetching submissions:", error);
		} finally {
			setLoading(false);
		}
	}, [pagination.page, pagination.limit, filterStatus, filterTier]);

	useEffect(() => {
		fetchSubmissions();
	}, [fetchSubmissions]);

	const filteredSubmissions = submissions.filter((s) => {
		if (!search) return true;
		const q = search.toLowerCase();
		return (
			s.namaPanitia.toLowerCase().includes(q) ||
			s.email.toLowerCase().includes(q) ||
			s.namaEvent.toLowerCase().includes(q) ||
			s.namaInstansi.toLowerCase().includes(q) ||
			s.lokasiEvent.toLowerCase().includes(q)
		);
	});

	const handleUpdateStatus = async (id: string, newStatus: string) => {
		try {
			const res = await api.put(`/event-submissions/${id}`, { status: newStatus });
			fetchSubmissions();
			if (showDetailModal && selectedSubmission?.id === id) {
				setSelectedSubmission((prev) => prev ? { ...prev, status: newStatus as EventSubmission["status"], createdUserId: res.data.submission.createdUserId } : null);
			}

			// Show created account info if PANITIA account was created
			if (res.data.createdAccount) {
				const acc = res.data.createdAccount;
				if (acc.isExisting) {
					Swal.fire({
						icon: "info",
						title: "Akun Sudah Ada",
						html: `<p>Email <strong>${acc.email}</strong> sudah terdaftar sebagai <strong>${acc.role}</strong>.</p><p class="mt-2 text-sm text-gray-500">Submission telah dikaitkan dengan akun tersebut.</p>`,
					});
				} else {
					Swal.fire({
						icon: "success",
						title: "Akun Panitia Dibuat!",
						html: `
							<div class="text-left space-y-2 mt-2">
								<p><strong>Nama:</strong> ${acc.name}</p>
								<p><strong>Email:</strong> ${acc.email}</p>
								<p><strong>Password:</strong> <code class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-red-600 font-mono">${acc.generatedPassword}</code></p>
								<p><strong>Role:</strong> PANITIA</p>
							</div>
							<p class="mt-3 text-sm text-yellow-600">⚠️ Simpan password ini! Tidak akan ditampilkan lagi.</p>
						`,
						confirmButtonText: "OK, Sudah Disimpan",
						confirmButtonColor: "#ef4444",
					});
				}
			} else {
				Swal.fire({ icon: "success", title: "Status Diperbarui", timer: 1500, showConfirmButton: false });
			}
		} catch {
			Swal.fire({ icon: "error", title: "Gagal", text: "Gagal memperbarui status." });
		}
	};

	const handleUpdateNotes = async (id: string) => {
		const { value: notes } = await Swal.fire({
			title: "Catatan",
			input: "textarea",
			inputLabel: "Tambah/edit catatan untuk submission ini",
			inputValue: selectedSubmission?.notes || "",
			showCancelButton: true,
			confirmButtonText: "Simpan",
			cancelButtonText: "Batal",
			confirmButtonColor: "#ef4444",
		});
		if (notes !== undefined) {
			try {
				await api.put(`/event-submissions/${id}`, { notes });
				fetchSubmissions();
				if (selectedSubmission?.id === id) {
					setSelectedSubmission((prev) => prev ? { ...prev, notes } : null);
				}
			} catch {
				Swal.fire({ icon: "error", title: "Gagal", text: "Gagal menyimpan catatan." });
			}
		}
	};

	const handleDelete = async (id: string, namaEvent: string) => {
		const confirmed = await showDeleteConfirm(
			`Hapus submission "${namaEvent}"?`,
			"Data yang dihapus tidak dapat dikembalikan."
		);
		if (confirmed) {
			try {
				await api.delete(`/event-submissions/${id}`);
				fetchSubmissions();
				if (showDetailModal && selectedSubmission?.id === id) {
					setShowDetailModal(false);
					setSelectedSubmission(null);
				}
			} catch {
				Swal.fire({ icon: "error", title: "Gagal", text: "Gagal menghapus data." });
			}
		}
	};

	const getStatusBadge = (status: EventSubmission["status"]) => {
		const cfg = statusConfig[status];
		const colorMap: Record<string, string> = {
			yellow: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
			blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
			green: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
			red: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
		};
		return (
			<span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${colorMap[cfg.color]}`}>
				<cfg.icon className="w-3 h-3" />
				{cfg.label}
			</span>
		);
	};

	const getTierBadge = (tier: EventSubmission["packageTier"]) => {
		const cfg = tierConfig[tier];
		const colorMap: Record<string, string> = {
			blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
			purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
			indigo: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400",
			amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
			gray: "bg-gray-200 dark:bg-gray-600/30 text-gray-700 dark:text-gray-300",
			yellow: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
		};
		return (
			<span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${colorMap[cfg.color]}`}>
				{cfg.label}
			</span>
		);
	};

	const formatDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleDateString("id-ID", {
			day: "2-digit",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// Stats
	const stats = {
		total: pagination.total,
		pending: submissions.filter((s) => s.status === "PENDING").length,
		confirmed: submissions.filter((s) => s.status === "CONFIRMED").length,
	};

	return (
		<div className="p-4 md:p-6 space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
						<LuPackage className="w-6 h-6 text-red-500" />
						Pesanan Paket Event
					</h1>
					<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
						Kelola pendaftaran event dari landing page
					</p>
				</div>
				<button
					onClick={fetchSubmissions}
					className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
				>
					<LuRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
					Refresh
				</button>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				{[
					{ label: "Total Pesanan", value: stats.total, color: "text-gray-800 dark:text-white", bg: "bg-white/80 dark:bg-gray-800/50" },
					{ label: "Menunggu", value: stats.pending, color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50/80 dark:bg-yellow-900/20" },
					{ label: "Dikonfirmasi", value: stats.confirmed, color: "text-green-600 dark:text-green-400", bg: "bg-green-50/80 dark:bg-green-900/20" },
				].map((stat) => (
					<div key={stat.label} className={`${stat.bg} backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-white/5 p-4`}>
						<p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{stat.label}</p>
						<p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
					</div>
				))}
			</div>

			{/* Search & Filters */}
			<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-white/5 p-4">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
					<div className="relative">
						<LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
						<input
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Cari nama, event, instansi..."
							className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800/50 text-gray-800 dark:text-white text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50"
						/>
					</div>
					<div className="relative">
						<LuFilter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
						<select
							value={filterStatus}
							onChange={(e) => { setFilterStatus(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
							className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800/50 text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 appearance-none"
						>
							<option value="">Semua Status</option>
							<option value="PENDING">Menunggu</option>
							<option value="CONTACTED">Dihubungi</option>
							<option value="CONFIRMED">Dikonfirmasi</option>
							<option value="REJECTED">Ditolak</option>
						</select>
					</div>
					<div className="relative">
						<LuPackage className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
						<select
							value={filterTier}
							onChange={(e) => { setFilterTier(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
							className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800/50 text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 appearance-none"
						>
							<option value="">Semua Paket</option>
							<option value="TICKETING">Ticketing</option>
							<option value="VOTING">Voting</option>
							<option value="TICKETING_VOTING">Tiket + Voting</option>
							<option value="BRONZE">Bronze</option>
							<option value="SILVER">Silver</option>
							<option value="GOLD">Gold</option>
						</select>
					</div>
				</div>
			</div>

			{/* Table */}
			<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-white/5 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
						<thead className="bg-gray-50/80 dark:bg-gray-700/50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Panitia</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase hidden lg:table-cell">Email</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Event</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase hidden lg:table-cell">Instansi</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Paket</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">Tanggal</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Aksi</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200 dark:divide-gray-700">
							{loading ? (
								<tr>
									<td colSpan={8} className="px-4 py-12 text-center text-gray-400">
										<LuRefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
										Memuat data...
									</td>
								</tr>
							) : filteredSubmissions.length === 0 ? (
								<tr>
									<td colSpan={8} className="px-4 py-12 text-center text-gray-400">
										Tidak ada data ditemukan
									</td>
								</tr>
							) : (
								filteredSubmissions.map((s) => (
									<tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
										<td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200 font-medium">
											{s.namaPanitia}
										</td>
										<td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 hidden lg:table-cell max-w-[180px] truncate">
											{s.email}
										</td>
										<td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-[200px] truncate">
											{s.namaEvent}
										</td>
										<td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 hidden lg:table-cell max-w-[150px] truncate">
											{s.namaInstansi}
										</td>
										<td className="px-4 py-3">{getTierBadge(s.packageTier)}</td>
										<td className="px-4 py-3">{getStatusBadge(s.status)}</td>
										<td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 hidden md:table-cell whitespace-nowrap">
											{formatDate(s.createdAt)}
										</td>
										<td className="px-4 py-3 text-right">
											<div className="flex items-center justify-end gap-1.5">
												<button
													onClick={() => { setSelectedSubmission(s); setShowDetailModal(true); }}
													className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
													title="Detail"
												>
													<LuEye className="w-4 h-4" />
												</button>
												<button
													onClick={() => handleDelete(s.id, s.namaEvent)}
													className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
													title="Hapus"
												>
													<LuTrash2 className="w-4 h-4" />
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

			{/* Detail Modal */}
			{showDetailModal && selectedSubmission && (
				<div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailModal(false)}>
					<div
						className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="p-6 border-b border-gray-200 dark:border-gray-700">
							<div className="flex items-center justify-between">
								<h2 className="text-lg font-bold text-gray-800 dark:text-white">Detail Pesanan</h2>
								<button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">&times;</button>
							</div>
						</div>
						<div className="p-6 space-y-4">
							{[
								{ label: "Nama Panitia", value: selectedSubmission.namaPanitia },
								{ label: "Email", value: selectedSubmission.email },
								{ label: "No. HP", value: selectedSubmission.phone || "-" },
								{ label: "Nama Event", value: selectedSubmission.namaEvent },
								{ label: "Lokasi Event", value: selectedSubmission.lokasiEvent },
								{ label: "Sekolah/Instansi", value: selectedSubmission.namaInstansi },
							].map((item) => (
								<div key={item.label}>
									<p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5">{item.label}</p>
									<p className="text-sm text-gray-800 dark:text-white font-medium">{item.value}</p>
								</div>
							))}

							<div className="flex gap-6">
								<div>
									<p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Paket</p>
									{getTierBadge(selectedSubmission.packageTier)}
									<p className="text-xs text-gray-500 mt-1">{tierConfig[selectedSubmission.packageTier].price}</p>
								</div>
								<div>
									<p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Status</p>
									{getStatusBadge(selectedSubmission.status)}
								</div>
							</div>

							<div>
								<p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5">Tanggal Daftar</p>
								<p className="text-sm text-gray-700 dark:text-gray-300">{formatDate(selectedSubmission.createdAt)}</p>
							</div>

							{selectedSubmission.notes && (
								<div>
									<p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5">Catatan</p>
									<p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">{selectedSubmission.notes}</p>
								</div>
							)}

							{selectedSubmission.createdUserId && (
								<div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded-lg p-3">
									<p className="text-xs font-medium text-green-700 dark:text-green-400 flex items-center gap-1">
										<LuCircleCheck className="w-3.5 h-3.5" />
										Akun PANITIA telah dibuat untuk email: {selectedSubmission.email}
									</p>
								</div>
							)}
						</div>

						<div className="p-6 border-t border-gray-200 dark:border-gray-700 space-y-3">
							<p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Ubah Status</p>
							<div className="flex flex-wrap gap-2">
								{(["PENDING", "CONTACTED", "CONFIRMED", "REJECTED"] as const).map((status) => {
									const cfg = statusConfig[status];
									const isActive = selectedSubmission.status === status;
									return (
										<button
											key={status}
											onClick={() => handleUpdateStatus(selectedSubmission.id, status)}
											disabled={isActive}
											className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
												isActive
													? "ring-2 ring-red-500 opacity-100"
													: "opacity-60 hover:opacity-100"
											} ${
												cfg.color === "yellow" ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400" :
												cfg.color === "blue" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" :
												cfg.color === "green" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" :
												"bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
											}`}
										>
											<cfg.icon className="w-3.5 h-3.5" />
											{cfg.label}
										</button>
									);
								})}
							</div>
							<button
								onClick={() => handleUpdateNotes(selectedSubmission.id)}
								className="w-full py-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
							>
								{selectedSubmission.notes ? "Edit Catatan" : "Tambah Catatan"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default EventSubmissionManagement;
