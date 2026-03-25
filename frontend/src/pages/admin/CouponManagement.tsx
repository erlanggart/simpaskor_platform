import React, { useState, useEffect } from "react";
import {
	TicketIcon,
	PlusIcon,
	TrashIcon,
	MagnifyingGlassIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../utils/api";
import {
	showSuccess,
	showError,
	showDeleteConfirm,
} from "../../utils/sweetalert";

interface Coupon {
	id: string;
	code: string;
	description: string | null;
	assignedToEmail: string | null;
	expiresAt: string | null;
	isExpired: boolean;
	isUsed: boolean;
	createdAt: string;
	usedBy?: {
		name: string;
		email: string;
	} | null;
	createdByAdmin?: {
		name: string;
	} | null;
}

const CouponManagement: React.FC = () => {
	const [coupons, setCoupons] = useState<Coupon[]>([]);
	const [loading, setLoading] = useState(true);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [filterStatus, setFilterStatus] = useState<string>("ALL");

	// Pagination states
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);

	// Single coupon form
	const [formData, setFormData] = useState({
		code: "",
		description: "",
		expiresAt: "",
	});

	const [submitLoading, setSubmitLoading] = useState(false);

	useEffect(() => {
		fetchCoupons();
	}, []);

	const fetchCoupons = async () => {
		try {
			setLoading(true);
			const response = await api.get("/coupons");
			setCoupons(response.data.data || response.data);
		} catch (error) {
			console.error("Error fetching coupons:", error);
			showError("Gagal memuat data kupon");
		} finally {
			setLoading(false);
		}
	};

	const handleCreateCoupon = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.code.trim()) {
			showError("Kode kupon wajib diisi", "Validasi");
			return;
		}

		setSubmitLoading(true);
		try {
			await api.post("/coupons", {
				code: formData.code,
				description: formData.description || null,
				expiresAt: formData.expiresAt || null,
			});

			showSuccess("Kupon berhasil dibuat!");
			setShowCreateModal(false);
			setFormData({
				code: "",
				description: "",
				expiresAt: "",
			});
			fetchCoupons();
		} catch (error: any) {
			console.error("Error creating coupon:", error);
			showError(error.response?.data?.message || "Gagal membuat kupon");
		} finally {
			setSubmitLoading(false);
		}
	};

	const handleDeleteCoupon = async (id: string, code: string) => {
		const result = await showDeleteConfirm(`kupon ${code}`);
		if (!result.isConfirmed) {
			return;
		}

		try {
			await api.delete(`/coupons/${id}`);
			showSuccess("Kupon berhasil dihapus");
			fetchCoupons();
		} catch (error: any) {
			console.error("Error deleting coupon:", error);
			showError(error.response?.data?.message || "Gagal menghapus kupon");
		}
	};

	const filteredCoupons = coupons.filter((coupon) => {
		const matchesSearch =
			coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
			(coupon.description &&
				coupon.description.toLowerCase().includes(searchTerm.toLowerCase()));

		let matchesFilter = true;
		if (filterStatus === "USED") {
			matchesFilter = coupon.isUsed;
		} else if (filterStatus === "UNUSED") {
			matchesFilter = !coupon.isUsed && !coupon.isExpired;
		} else if (filterStatus === "EXPIRED") {
			matchesFilter = coupon.isExpired;
		}

		return matchesSearch && matchesFilter;
	});

	// Pagination calculations
	const totalPages = Math.ceil(filteredCoupons.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const paginatedCoupons = filteredCoupons.slice(startIndex, endIndex);

	// Reset to page 1 when filters change
	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm, filterStatus]);

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const handleItemsPerPageChange = (value: number) => {
		setItemsPerPage(value);
		setCurrentPage(1);
	};

	// Generate page numbers to display
	const getPageNumbers = () => {
		const pages: (number | string)[] = [];
		const maxVisiblePages = 5;

		if (totalPages <= maxVisiblePages) {
			for (let i = 1; i <= totalPages; i++) {
				pages.push(i);
			}
		} else {
			pages.push(1);

			if (currentPage > 3) {
				pages.push("...");
			}

			const start = Math.max(2, currentPage - 1);
			const end = Math.min(totalPages - 1, currentPage + 1);

			for (let i = start; i <= end; i++) {
				pages.push(i);
			}

			if (currentPage < totalPages - 2) {
				pages.push("...");
			}

			pages.push(totalPages);
		}

		return pages;
	};

	const stats = {
		total: coupons.length,
		used: coupons.filter((c) => c.isUsed).length,
		unused: coupons.filter((c) => !c.isUsed && !c.isExpired).length,
		expired: coupons.filter((c) => c.isExpired).length,
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600 dark:border-red-400"></div>
			</div>
		);
	}

	return (
		<div className="space-y-6 p-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
						Manajemen Kupon Event
					</h1>
					<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
						Kelola kupon untuk pembuatan event oleh panitia
					</p>
				</div>
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-2">
						<span className="text-sm text-gray-600 dark:text-gray-400">
							Per halaman:
						</span>
						<select
							value={itemsPerPage}
							onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
							className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
						>
							<option value={5}>5</option>
							<option value={10}>10</option>
							<option value={25}>25</option>
							<option value={50}>50</option>
							<option value={100}>100</option>
						</select>
					</div>
					<button
						onClick={() => setShowCreateModal(true)}
						className="flex items-center gap-2 px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
					>
						<PlusIcon className="w-5 h-5" />
						Buat Kupon
					</button>
				</div>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-4">
					<div className="text-sm text-gray-600 dark:text-gray-400">
						Total Kupon
					</div>
					<div className="text-2xl font-bold text-gray-900 dark:text-white">
						{stats.total}
					</div>
				</div>
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-4">
					<div className="text-sm text-gray-600 dark:text-gray-400">
						Terpakai
					</div>
					<div className="text-2xl font-bold text-green-600 dark:text-green-400">
						{stats.used}
					</div>
				</div>
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-4">
					<div className="text-sm text-gray-600 dark:text-gray-400">
						Tersedia
					</div>
					<div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
						{stats.unused}
					</div>
				</div>
			</div>

			{/* Filters */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-4">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="relative">
						<MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
						<input
							type="text"
							placeholder="Cari kode kupon..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
						/>
					</div>
					<div>
						<select
							value={filterStatus}
							onChange={(e) => setFilterStatus(e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent appearance-none"
						>
							<option value="ALL">Semua Status</option>
							<option value="USED">Terpakai</option>
							<option value="UNUSED">Tersedia</option>
							<option value="EXPIRED">Kadaluarsa</option>
						</select>
					</div>
				</div>
			</div>

			{/* Coupons Table */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
						<thead className="bg-gray-50 dark:bg-gray-700">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
									Kode Kupon
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
									Status
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
									Di-assign ke
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
									Digunakan oleh
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
									Dibuat oleh
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
									Aksi
								</th>
							</tr>
						</thead>
						<tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
							{filteredCoupons.length === 0 ? (
								<tr>
									<td colSpan={6} className="px-6 py-12 text-center">
										<TicketIcon className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-2" />
										<p className="text-gray-500 dark:text-gray-400">
											Tidak ada kupon ditemukan
										</p>
									</td>
								</tr>
							) : (
								paginatedCoupons.map((coupon) => (
									<tr
										key={coupon.id}
										className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
									>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="font-mono font-bold text-gray-900 dark:text-white">
												{coupon.code}
											</div>
											{coupon.description && (
												<div className="text-sm text-gray-500 dark:text-gray-400">
													{coupon.description}
												</div>
											)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span
												className={`px-2 py-1 text-xs font-semibold rounded-full ${
													coupon.isExpired
														? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400"
														: coupon.isUsed
														? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
														: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400"
												}`}
											>
												{coupon.isExpired ? "Kadaluarsa" : coupon.isUsed ? "Terpakai" : "Tersedia"}
											</span>
											{coupon.expiresAt && !coupon.isExpired && (
												<div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
													Exp: {new Date(coupon.expiresAt).toLocaleDateString("id-ID")}
												</div>
											)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm">
											{coupon.assignedToEmail ? (
												<span className="text-gray-900 dark:text-gray-300 font-medium">
													{coupon.assignedToEmail}
												</span>
											) : (
												<span className="text-gray-400 dark:text-gray-500 italic">
													Belum di-assign
												</span>
											)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm">
											{coupon.usedBy ? (
												<div>
													<div className="text-gray-900 dark:text-gray-300 font-medium">
														{coupon.usedBy.name}
													</div>
													<div className="text-gray-500 dark:text-gray-400 text-xs">
														{coupon.usedBy.email}
													</div>
												</div>
											) : (
												<span className="text-gray-400 dark:text-gray-500">
													-
												</span>
											)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm">
											{coupon.createdByAdmin ? (
												<span className="text-gray-900 dark:text-gray-300">
													{coupon.createdByAdmin.name}
												</span>
											) : (
												<span className="text-gray-400 dark:text-gray-500">
													-
												</span>
											)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm">
											{!coupon.isUsed && (
												<button
													onClick={() =>
														handleDeleteCoupon(coupon.id, coupon.code)
													}
													className="flex items-center gap-1 px-3 py-1.5 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors text-xs"
												>
													<TrashIcon className="w-4 h-4" />
													Hapus
												</button>
											)}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				{filteredCoupons.length > 0 && totalPages > 1 && (
					<div className="bg-white dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
						<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
							{/* Info */}
							<div className="text-sm text-gray-600 dark:text-gray-400">
								Menampilkan{" "}
								<span className="font-medium text-gray-900 dark:text-white">
									{startIndex + 1}
								</span>{" "}
								-{" "}
								<span className="font-medium text-gray-900 dark:text-white">
									{Math.min(endIndex, filteredCoupons.length)}
								</span>{" "}
								dari{" "}
								<span className="font-medium text-gray-900 dark:text-white">
									{filteredCoupons.length}
								</span>{" "}
								kupon
							</div>

							{/* Pagination Controls */}
							<div className="flex items-center gap-2">
								{/* Previous Button */}
								<button
									onClick={() => handlePageChange(currentPage - 1)}
									disabled={currentPage === 1}
									className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									aria-label="Previous page"
								>
									<ChevronLeftIcon className="w-5 h-5" />
								</button>

								{/* Page Numbers */}
								<div className="flex items-center gap-1">
									{getPageNumbers().map((page, index) => (
										<React.Fragment key={index}>
											{page === "..." ? (
												<span className="px-3 py-2 text-gray-400 dark:text-gray-500">
													...
												</span>
											) : (
												<button
													onClick={() => handlePageChange(page as number)}
													className={`min-w-[40px] px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
														currentPage === page
															? "bg-red-600 dark:bg-red-500 text-white"
															: "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
													}`}
												>
													{page}
												</button>
											)}
										</React.Fragment>
									))}
								</div>

								{/* Next Button */}
								<button
									onClick={() => handlePageChange(currentPage + 1)}
									disabled={currentPage === totalPages}
									className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									aria-label="Next page"
								>
									<ChevronRightIcon className="w-5 h-5" />
								</button>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Create Coupon Modal */}
			{showCreateModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
							Buat Kupon Baru
						</h3>
						<form onSubmit={handleCreateCoupon} className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									Kode Kupon <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									value={formData.code}
									onChange={(e) =>
										setFormData({
											...formData,
											code: e.target.value.toUpperCase(),
										})
									}
									className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent font-mono"
									placeholder="EVENT2025-001"
									required
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									Deskripsi
								</label>
								<textarea
									value={formData.description}
									onChange={(e) =>
										setFormData({ ...formData, description: e.target.value })
									}
									rows={2}
									className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
									placeholder="Kupon untuk Lakaraja"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									Tanggal Kadaluarsa
								</label>
								<input
									type="date"
									value={formData.expiresAt}
									onChange={(e) =>
										setFormData({ ...formData, expiresAt: e.target.value })
									}
									className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
								/>
								<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
									Event yang menggunakan kupon kadaluarsa tidak dapat diubah pengaturannya
								</p>
							</div>
							<div className="flex gap-3 mt-6">
								<button
									type="button"
									onClick={() => setShowCreateModal(false)}
									className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
									disabled={submitLoading}
								>
									Batal
								</button>
								<button
									type="submit"
									disabled={submitLoading}
									className="flex-1 px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 disabled:bg-gray-400 dark:disabled:bg-gray-600"
								>
									{submitLoading ? "Menyimpan..." : "Buat Kupon"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
};

export default CouponManagement;
