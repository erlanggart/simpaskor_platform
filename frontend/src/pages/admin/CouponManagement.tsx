import React, { useState, useEffect } from "react";
import {
	TicketIcon,
	PlusIcon,
	TrashIcon,
	MagnifyingGlassIcon,
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

	// Single coupon form
	const [formData, setFormData] = useState({
		code: "",
		description: "",
	});

	const [submitLoading, setSubmitLoading] = useState(false);

	useEffect(() => {
		fetchCoupons();
	}, []);

	const fetchCoupons = async () => {
		try {
			setLoading(true);
			const response = await api.get("api/coupons");
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
			await api.post("api/coupons", {
				code: formData.code,
				description: formData.description || null,
			});

			showSuccess("Kupon berhasil dibuat!");
			setShowCreateModal(false);
			setFormData({
				code: "",
				description: "",
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
			await api.delete(`api/coupons/${id}`);
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

		const matchesFilter =
			filterStatus === "ALL" ||
			(filterStatus === "USED" && coupon.isUsed) ||
			(filterStatus === "UNUSED" && !coupon.isUsed);

		return matchesSearch && matchesFilter;
	});

	const stats = {
		total: coupons.length,
		used: coupons.filter((c) => c.isUsed).length,
		unused: coupons.filter((c) => !c.isUsed).length,
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">
						Manajemen Kupon Event
					</h1>
					<p className="text-sm text-gray-600 mt-1">
						Kelola kupon untuk pembuatan event oleh panitia
					</p>
				</div>
				<button
					onClick={() => setShowCreateModal(true)}
					className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
				>
					<PlusIcon className="w-5 h-5" />
					Buat Kupon
				</button>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="bg-white rounded-lg shadow p-4">
					<div className="text-sm text-gray-600">Total Kupon</div>
					<div className="text-2xl font-bold text-gray-900">{stats.total}</div>
				</div>
				<div className="bg-white rounded-lg shadow p-4">
					<div className="text-sm text-gray-600">Terpakai</div>
					<div className="text-2xl font-bold text-green-600">{stats.used}</div>
				</div>
				<div className="bg-white rounded-lg shadow p-4">
					<div className="text-sm text-gray-600">Tersedia</div>
					<div className="text-2xl font-bold text-blue-600">{stats.unused}</div>
				</div>
			</div>

			{/* Filters */}
			<div className="bg-white rounded-lg shadow p-4">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="relative">
						<MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
						<input
							type="text"
							placeholder="Cari kode kupon..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
						/>
					</div>
					<div>
						<select
							value={filterStatus}
							onChange={(e) => setFilterStatus(e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none"
						>
							<option value="ALL">Semua Status</option>
							<option value="USED">Terpakai</option>
							<option value="UNUSED">Tersedia</option>
						</select>
					</div>
				</div>
			</div>

			{/* Coupons Table */}
			<div className="bg-white rounded-lg shadow overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
									Kode Kupon
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
									Status
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
									Di-assign ke
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
									Digunakan oleh
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
									Dibuat oleh
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
									Aksi
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{filteredCoupons.length === 0 ? (
								<tr>
									<td colSpan={6} className="px-6 py-12 text-center">
										<TicketIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
										<p className="text-gray-500">Tidak ada kupon ditemukan</p>
									</td>
								</tr>
							) : (
								filteredCoupons.map((coupon) => (
									<tr key={coupon.id} className="hover:bg-gray-50">
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="font-mono font-bold text-gray-900">
												{coupon.code}
											</div>
											{coupon.description && (
												<div className="text-sm text-gray-500">
													{coupon.description}
												</div>
											)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span
												className={`px-2 py-1 text-xs font-semibold rounded-full ${
													coupon.isUsed
														? "bg-green-100 text-green-800"
														: "bg-blue-100 text-blue-800"
												}`}
											>
												{coupon.isUsed ? "Terpakai" : "Tersedia"}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm">
											{coupon.assignedToEmail ? (
												<span className="text-gray-900 font-medium">
													{coupon.assignedToEmail}
												</span>
											) : (
												<span className="text-gray-400 italic">
													Belum di-assign
												</span>
											)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm">
											{coupon.usedBy ? (
												<div>
													<div className="text-gray-900 font-medium">
														{coupon.usedBy.name}
													</div>
													<div className="text-gray-500 text-xs">
														{coupon.usedBy.email}
													</div>
												</div>
											) : (
												<span className="text-gray-400">-</span>
											)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm">
											{coupon.createdByAdmin ? (
												<span className="text-gray-900">
													{coupon.createdByAdmin.name}
												</span>
											) : (
												<span className="text-gray-400">-</span>
											)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm">
											{!coupon.isUsed && (
												<button
													onClick={() =>
														handleDeleteCoupon(coupon.id, coupon.code)
													}
													className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs"
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
			</div>

			{/* Create Single Coupon Modal */}
			{showCreateModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-4">
							Buat Kupon Baru
						</h3>
						<form onSubmit={handleCreateCoupon} className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
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
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
									placeholder="EVENT2025-001"
									required
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Deskripsi
								</label>
								<textarea
									value={formData.description}
									onChange={(e) =>
										setFormData({ ...formData, description: e.target.value })
									}
									rows={2}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
									placeholder="Kupon untuk Lakaraja"
								/>
							</div>
							<div className="flex gap-3 mt-6">
								<button
									type="button"
									onClick={() => setShowCreateModal(false)}
									className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
									disabled={submitLoading}
								>
									Batal
								</button>
								<button
									type="submit"
									disabled={submitLoading}
									className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
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
