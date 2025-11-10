import React, { useState, useEffect } from "react";
import {
	UsersIcon,
	MagnifyingGlassIcon,
	TicketIcon,
	EnvelopeIcon,
	PhoneIcon,
	CheckCircleIcon,
	XCircleIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../utils/api";
import { showSuccess, showError, showWarning } from "../../utils/sweetalert";
interface User {
	id: string;
	email: string;
	name: string;
	phone: string | null;
	role: string;
	status: string;
	emailVerified: boolean;
	createdAt: string;
	profile?: {
		institution: string | null;
		city: string | null;
	};
}

interface Coupon {
	id: string;
	code: string;
	description: string | null;
	isUsed: boolean;
	assignedToEmail: string | null;
	expiresAt: string | null;
}

const UserManagement: React.FC = () => {
	const [users, setUsers] = useState<User[]>([]);
	const [coupons, setCoupons] = useState<Coupon[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedRole, setSelectedRole] = useState<string>("PANITIA");
	const [selectedUser, setSelectedUser] = useState<User | null>(null);
	const [showAssignCouponModal, setShowAssignCouponModal] = useState(false);
	const [selectedCouponId, setSelectedCouponId] = useState("");
	const [assignLoading, setAssignLoading] = useState(false);

	// Pagination states
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);

	useEffect(() => {
		fetchUsers();
		fetchAvailableCoupons();
	}, []);

	const fetchUsers = async () => {
		try {
			setLoading(true);
			const response = await api.get("/users?limit=1000");
			// Backend returns { users: [], pagination: {} }
			setUsers(response.data.users || response.data);
		} catch (error: any) {
			console.error("Error fetching users:", error);
			console.error("Error response:", error.response?.data);
			console.error("Error status:", error.response?.status);
			const errorMsg =
				error.response?.data?.message ||
				error.message ||
				"Gagal memuat data user";
			showError(
				`${errorMsg}\nStatus: ${error.response?.status || "Unknown"}`,
				"Error"
			);
		} finally {
			setLoading(false);
		}
	};
	const fetchAvailableCoupons = async () => {
		try {
			const response = await api.get("/coupons?status=unused");
			// Filter coupons that are not assigned to anyone
			const availableCoupons = response.data.data.filter(
				(c: Coupon) => !c.isUsed && !c.assignedToEmail
			);
			setCoupons(availableCoupons);
		} catch (error) {
			console.error("Error fetching coupons:", error);
		}
	};

	const handleAssignCoupon = (user: User) => {
		if (user.role !== "PANITIA") {
			showWarning("Kupon hanya bisa di-assign ke akun Panitia");
			return;
		}
		setSelectedUser(user);
		setSelectedCouponId("");
		setShowAssignCouponModal(true);
	};

	const confirmAssignCoupon = async () => {
		if (!selectedCouponId || !selectedUser) {
			showWarning("Pilih kupon terlebih dahulu");
			return;
		}

		setAssignLoading(true);
		try {
			// Update coupon to assign to user's email
			await api.patch(`api/coupons/${selectedCouponId}`, {
				assignedToEmail: selectedUser.email,
			});

			showSuccess(`Kupon berhasil di-assign ke ${selectedUser.name}`);
			setShowAssignCouponModal(false);
			fetchAvailableCoupons();
		} catch (error: any) {
			console.error("Error assigning coupon:", error);
			showError(error.response?.data?.message || "Gagal assign kupon");
		} finally {
			setAssignLoading(false);
		}
	};

	const filteredUsers = users.filter((user) => {
		const matchesSearch =
			user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			user.email.toLowerCase().includes(searchTerm.toLowerCase());

		const matchesRole = selectedRole === "ALL" || user.role === selectedRole;

		return matchesSearch && matchesRole;
	});

	// Pagination calculations
	const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

	// Reset to page 1 when filters change
	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm, selectedRole]);

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
		// Scroll to top of table
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
			// Show all pages if total is less than max
			for (let i = 1; i <= totalPages; i++) {
				pages.push(i);
			}
		} else {
			// Always show first page
			pages.push(1);

			if (currentPage > 3) {
				pages.push("...");
			}

			// Show pages around current page
			const start = Math.max(2, currentPage - 1);
			const end = Math.min(totalPages - 1, currentPage + 1);

			for (let i = start; i <= end; i++) {
				pages.push(i);
			}

			if (currentPage < totalPages - 2) {
				pages.push("...");
			}

			// Always show last page
			pages.push(totalPages);
		}

		return pages;
	};

	const getRoleBadgeColor = (role: string) => {
		const colors: Record<string, string> = {
			SUPERADMIN: "bg-purple-100 text-purple-800",
			PANITIA: "bg-blue-100 text-blue-800",
			PESERTA: "bg-green-100 text-green-800",
			JURI: "bg-yellow-100 text-yellow-800",
			PELATIH: "bg-orange-100 text-orange-800",
		};
		return colors[role] || "bg-gray-100 text-gray-800";
	};

	const getStatusBadgeColor = (status: string) => {
		return status === "ACTIVE"
			? "bg-green-100 text-green-800"
			: "bg-red-100 text-red-800";
	};

	const roleOptions = [
		{ value: "ALL", label: "Semua Role" },
		{ value: "SUPERADMIN", label: "Super Admin" },
		{ value: "PANITIA", label: "Panitia" },
		{ value: "PESERTA", label: "Peserta" },
		{ value: "JURI", label: "Juri" },
		{ value: "PELATIH", label: "Pelatih" },
	];

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
						Manajemen User
					</h1>
					<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
						Kelola user dan assign kupon untuk panitia
					</p>
				</div>
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-2">
						<span className="text-sm text-gray-600 dark:text-gray-400">
							Total User:
						</span>
						<span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full font-semibold">
							{filteredUsers.length}
						</span>
					</div>
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
				</div>
			</div>

			{/* Filters */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-4">
				<div className="space-y-4">
					{/* Search */}
					<div className="relative">
						<MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
						<input
							type="text"
							placeholder="Cari nama atau email..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
						/>
					</div>

					{/* Role Filter Tabs */}
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Filter berdasarkan Role
						</label>
						<div className="flex flex-wrap gap-2">
							{roleOptions.map((option) => (
								<button
									key={option.value}
									onClick={() => setSelectedRole(option.value)}
									className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
										selectedRole === option.value
											? "bg-red-600 dark:bg-red-500 text-white shadow-md"
											: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
									}`}
								>
									{option.label}
								</button>
							))}
						</div>
					</div>
				</div>
			</div>

			{/* User Table */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
						<thead className="bg-gray-50 dark:bg-gray-700">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									User
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									Kontak
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									Role
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									Status
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									Institusi
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									Aksi
								</th>
							</tr>
						</thead>
						<tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
							{filteredUsers.length === 0 ? (
								<tr>
									<td colSpan={6} className="px-6 py-12 text-center">
										<UsersIcon className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-2" />
										<p className="text-gray-500 dark:text-gray-400">
											Tidak ada user ditemukan
										</p>
									</td>
								</tr>
							) : (
								paginatedUsers.map((user) => (
									<tr
										key={user.id}
										className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
									>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="flex items-center">
												<div className="flex-shrink-0 h-10 w-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
													<span className="text-red-600 dark:text-red-400 font-semibold text-sm">
														{user.name
															.split(" ")
															.map((n) => n[0])
															.join("")
															.substring(0, 2)
															.toUpperCase()}
													</span>
												</div>
												<div className="ml-4">
													<div className="text-sm font-medium text-gray-900 dark:text-white">
														{user.name}
													</div>
													<div className="text-sm text-gray-500 dark:text-gray-400">
														{user.emailVerified ? (
															<span className="flex items-center gap-1 text-green-600 dark:text-green-400">
																<CheckCircleIcon className="w-4 h-4" />
																Verified
															</span>
														) : (
															<span className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
																<XCircleIcon className="w-4 h-4" />
																Not Verified
															</span>
														)}
													</div>
												</div>
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="text-sm text-gray-900 dark:text-gray-300">
												<div className="flex items-center gap-2 mb-1">
													<EnvelopeIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
													{user.email}
												</div>
												{user.phone && (
													<div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
														<PhoneIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
														{user.phone}
													</div>
												)}
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span
												className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(
													user.role
												)}`}
											>
												{user.role}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span
												className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(
													user.status
												)}`}
											>
												{user.status}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
											{user.profile?.institution || "-"}
											{user.profile?.city && (
												<div className="text-xs text-gray-400 dark:text-gray-500">
													{user.profile.city}
												</div>
											)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm">
											{user.role === "PANITIA" && (
												<button
													onClick={() => handleAssignCoupon(user)}
													className="flex items-center gap-1 px-3 py-1.5 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors text-xs font-medium"
												>
													<TicketIcon className="w-4 h-4" />
													Assign Kupon
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
				{filteredUsers.length > 0 && totalPages > 1 && (
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
									{Math.min(endIndex, filteredUsers.length)}
								</span>{" "}
								dari{" "}
								<span className="font-medium text-gray-900 dark:text-white">
									{filteredUsers.length}
								</span>{" "}
								user
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

			{/* Assign Coupon Modal */}
			{showAssignCouponModal && selectedUser && (
				<div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
						<div className="flex items-center gap-3 mb-4">
							<TicketIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
							<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
								Assign Kupon
							</h3>
						</div>

						<div className="mb-4">
							<p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
								Assign kupon untuk:
							</p>
							<div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
								<p className="font-medium text-gray-900 dark:text-white">
									{selectedUser.name}
								</p>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									{selectedUser.email}
								</p>
							</div>
						</div>

						<div className="mb-6">
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Pilih Kupon <span className="text-red-500">*</span>
							</label>
							{coupons.length === 0 ? (
								<div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-center">
									<p className="text-sm text-yellow-800 dark:text-yellow-300">
										Tidak ada kupon yang tersedia. Silakan buat kupon baru
										terlebih dahulu.
									</p>
								</div>
							) : (
								<div className="space-y-2 max-h-64 overflow-y-auto">
									{coupons.map((coupon) => (
										<label
											key={coupon.id}
											className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-all ${
												selectedCouponId === coupon.id
													? "border-red-600 dark:border-red-500 bg-red-50 dark:bg-red-900/30"
													: "border-gray-200 dark:border-gray-600 hover:border-red-300 dark:hover:border-red-700"
											}`}
										>
											<input
												type="radio"
												name="coupon"
												value={coupon.id}
												checked={selectedCouponId === coupon.id}
												onChange={(e) => setSelectedCouponId(e.target.value)}
												className="mt-1"
											/>
											<div className="ml-3 flex-1">
												<p className="font-mono font-bold text-gray-900 dark:text-white">
													{coupon.code}
												</p>
												{coupon.description && (
													<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
														{coupon.description}
													</p>
												)}
												{coupon.expiresAt && (
													<p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
														Berlaku hingga:{" "}
														{new Date(coupon.expiresAt).toLocaleDateString(
															"id-ID"
														)}
													</p>
												)}
											</div>
										</label>
									))}
								</div>
							)}
						</div>

						<div className="flex gap-3">
							<button
								onClick={() => setShowAssignCouponModal(false)}
								className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
								disabled={assignLoading}
							>
								Batal
							</button>
							<button
								onClick={confirmAssignCoupon}
								disabled={
									!selectedCouponId || assignLoading || coupons.length === 0
								}
								className="flex-1 px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
							>
								{assignLoading ? "Menyimpan..." : "Assign Kupon"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default UserManagement;
