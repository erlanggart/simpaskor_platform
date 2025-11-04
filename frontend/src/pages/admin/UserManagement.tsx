import React, { useState, useEffect } from "react";
import {
	UsersIcon,
	MagnifyingGlassIcon,
	TicketIcon,
	EnvelopeIcon,
	PhoneIcon,
	CheckCircleIcon,
	XCircleIcon,
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

	useEffect(() => {
		fetchUsers();
		fetchAvailableCoupons();
	}, []);

	const fetchUsers = async () => {
		try {
			setLoading(true);
			const response = await api.get("api/users?limit=1000");
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
			const response = await api.get("api/coupons?status=unused");
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
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Manajemen User</h1>
					<p className="text-sm text-gray-600 mt-1">
						Kelola user dan assign kupon untuk panitia
					</p>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-sm text-gray-600">Total User:</span>
					<span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full font-semibold">
						{filteredUsers.length}
					</span>
				</div>
			</div>

			{/* Filters */}
			<div className="bg-white rounded-lg shadow p-4">
				<div className="space-y-4">
					{/* Search */}
					<div className="relative">
						<MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
						<input
							type="text"
							placeholder="Cari nama atau email..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
						/>
					</div>

					{/* Role Filter Tabs */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Filter berdasarkan Role
						</label>
						<div className="flex flex-wrap gap-2">
							{roleOptions.map((option) => (
								<button
									key={option.value}
									onClick={() => setSelectedRole(option.value)}
									className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
										selectedRole === option.value
											? "bg-indigo-600 text-white shadow-md"
											: "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
			<div className="bg-white rounded-lg shadow overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									User
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Kontak
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Role
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Status
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Institusi
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Aksi
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{filteredUsers.length === 0 ? (
								<tr>
									<td colSpan={6} className="px-6 py-12 text-center">
										<UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
										<p className="text-gray-500">Tidak ada user ditemukan</p>
									</td>
								</tr>
							) : (
								filteredUsers.map((user) => (
									<tr key={user.id} className="hover:bg-gray-50">
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="flex items-center">
												<div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
													<span className="text-indigo-600 font-semibold text-sm">
														{user.name
															.split(" ")
															.map((n) => n[0])
															.join("")
															.substring(0, 2)
															.toUpperCase()}
													</span>
												</div>
												<div className="ml-4">
													<div className="text-sm font-medium text-gray-900">
														{user.name}
													</div>
													<div className="text-sm text-gray-500">
														{user.emailVerified ? (
															<span className="flex items-center gap-1 text-green-600">
																<CheckCircleIcon className="w-4 h-4" />
																Verified
															</span>
														) : (
															<span className="flex items-center gap-1 text-gray-400">
																<XCircleIcon className="w-4 h-4" />
																Not Verified
															</span>
														)}
													</div>
												</div>
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="text-sm text-gray-900">
												<div className="flex items-center gap-2 mb-1">
													<EnvelopeIcon className="w-4 h-4 text-gray-400" />
													{user.email}
												</div>
												{user.phone && (
													<div className="flex items-center gap-2 text-gray-500">
														<PhoneIcon className="w-4 h-4 text-gray-400" />
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
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{user.profile?.institution || "-"}
											{user.profile?.city && (
												<div className="text-xs text-gray-400">
													{user.profile.city}
												</div>
											)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm">
											{user.role === "PANITIA" && (
												<button
													onClick={() => handleAssignCoupon(user)}
													className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs font-medium"
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
			</div>

			{/* Assign Coupon Modal */}
			{showAssignCouponModal && selectedUser && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
						<div className="flex items-center gap-3 mb-4">
							<TicketIcon className="w-6 h-6 text-indigo-600" />
							<h3 className="text-lg font-semibold text-gray-900">
								Assign Kupon
							</h3>
						</div>

						<div className="mb-4">
							<p className="text-sm text-gray-600 mb-2">Assign kupon untuk:</p>
							<div className="bg-gray-50 p-3 rounded-lg">
								<p className="font-medium text-gray-900">{selectedUser.name}</p>
								<p className="text-sm text-gray-600">{selectedUser.email}</p>
							</div>
						</div>

						<div className="mb-6">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Pilih Kupon <span className="text-red-500">*</span>
							</label>
							{coupons.length === 0 ? (
								<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
									<p className="text-sm text-yellow-800">
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
													? "border-indigo-600 bg-indigo-50"
													: "border-gray-200 hover:border-indigo-300"
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
												<p className="font-mono font-bold text-gray-900">
													{coupon.code}
												</p>
												{coupon.description && (
													<p className="text-sm text-gray-600 mt-1">
														{coupon.description}
													</p>
												)}
												{coupon.expiresAt && (
													<p className="text-xs text-gray-500 mt-1">
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
								className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
								disabled={assignLoading}
							>
								Batal
							</button>
							<button
								onClick={confirmAssignCoupon}
								disabled={
									!selectedCouponId || assignLoading || coupons.length === 0
								}
								className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
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
