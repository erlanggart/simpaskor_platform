import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
	UsersIcon,
	MagnifyingGlassIcon,
	ChartBarIcon,
	TicketIcon,
	EnvelopeIcon,
	PhoneIcon,
	CheckCircleIcon,
	ClockIcon,
	XCircleIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	PlusIcon,
	EyeIcon,
	EyeSlashIcon,
	InformationCircleIcon,
	ShieldCheckIcon,
	ShieldExclamationIcon,
	StarIcon,
	TrashIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import Swal from "sweetalert2";
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
	isPinned: boolean;
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

interface UserStatsSummary {
	total: number;
	byRole: Record<string, number>;
	byStatus: Record<string, number>;
	verification: {
		verified: number;
		unverified: number;
	};
	pinnedJuries: number;
	growth: {
		last7Days: number;
		thisMonth: number;
	};
	recent: Array<{
		id: string;
		email: string;
		name: string;
		role: string;
		status: string;
		emailVerified: boolean;
		isPinned: boolean;
		createdAt: string;
	}>;
}

const UserManagement: React.FC = () => {
	const navigate = useNavigate();
	const [users, setUsers] = useState<User[]>([]);
	const [userStats, setUserStats] = useState<UserStatsSummary | null>(null);
	const [coupons, setCoupons] = useState<Coupon[]>([]);
	const [loading, setLoading] = useState(true);
	const [hasLoadedUsers, setHasLoadedUsers] = useState(false);
	const [statsLoading, setStatsLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedRole, setSelectedRole] = useState<string>("ALL");
	const [selectedUser, setSelectedUser] = useState<User | null>(null);
	const [showAssignCouponModal, setShowAssignCouponModal] = useState(false);
	const [selectedCouponId, setSelectedCouponId] = useState("");
	const [assignLoading, setAssignLoading] = useState(false);

	// Add User Modal states
	const [showAddUserModal, setShowAddUserModal] = useState(false);
	const [addUserLoading, setAddUserLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [newUserData, setNewUserData] = useState({
		email: "",
		password: "",
		name: "",
		role: "PESERTA" as string,
		phone: "",
		institution: "",
		status: "PENDING" as string,
	});

	// Pagination states
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);
	const [filteredTotalUsers, setFilteredTotalUsers] = useState(0);
	const [filteredTotalPages, setFilteredTotalPages] = useState(0);
	const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

	useEffect(() => {
		fetchAvailableCoupons();
		fetchUserStats();
	}, []);

	useEffect(() => {
		const timeout = window.setTimeout(() => {
			setDebouncedSearchTerm(searchTerm.trim());
		}, 300);

		return () => window.clearTimeout(timeout);
	}, [searchTerm]);

	useEffect(() => {
		fetchUsers();
	}, [currentPage, itemsPerPage, selectedRole, debouncedSearchTerm]);

	const fetchUsers = async () => {
		try {
			setLoading(true);
			const params = new URLSearchParams({
				page: String(currentPage),
				limit: String(itemsPerPage),
			});

			if (selectedRole !== "ALL") {
				params.set("role", selectedRole);
			}

			if (debouncedSearchTerm) {
				params.set("search", debouncedSearchTerm);
			}

			const response = await api.get(`/users?${params.toString()}`);
			setUsers(response.data.users || []);
			setFilteredTotalUsers(response.data.pagination?.total || 0);
			setFilteredTotalPages(response.data.pagination?.pages || 0);
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
			setHasLoadedUsers(true);
		}
	};

	const fetchUserStats = async () => {
		try {
			setStatsLoading(true);
			const response = await api.get("/users/summary");
			setUserStats(response.data);
		} catch (error) {
			console.error("Error fetching user stats:", error);
		} finally {
			setStatsLoading(false);
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

	const handleVerifyUser = async (user: User) => {
		try {
			await api.patch(`/users/${user.id}/verify`);
			showSuccess(
				user.emailVerified
					? "Verifikasi user dicabut"
					: "User berhasil diverifikasi"
			);
			await Promise.all([fetchUsers(), fetchUserStats()]);
		} catch (error: any) {
			showError(error.response?.data?.message || "Gagal mengubah status verifikasi");
		}
	};

	const handleTogglePin = async (user: User) => {
		try {
			await api.patch(`/users/${user.id}/pin`);
			showSuccess(
				user.isPinned
					? "Pin juri dicabut"
					: "Juri berhasil di-pin"
			);
			await Promise.all([fetchUsers(), fetchUserStats()]);
		} catch (error: any) {
			showError(error.response?.data?.message || "Gagal mengubah status pin");
		}
	};

	const handleDeleteUser = async (user: User) => {
		const result = await Swal.fire({
			icon: "warning",
			title: "Hapus Akun?",
			html: `<p>Apakah Anda yakin ingin menghapus akun <strong>${user.name}</strong> (${user.email})?</p><p class="text-sm text-red-600 mt-2">Semua data terkait (pendaftaran, evaluasi, dll) akan ikut terhapus. Tindakan ini tidak dapat dibatalkan.</p>`,
			showCancelButton: true,
			confirmButtonColor: "#dc2626",
			cancelButtonText: "Batal",
			confirmButtonText: "Ya, Hapus",
		});
		if (!result.isConfirmed) return;
		try {
			await api.delete(`/users/${user.id}`);
			showSuccess("Akun berhasil dihapus");
			await Promise.all([fetchUsers(), fetchUserStats()]);
		} catch (error: any) {
			showError(error.response?.data?.message || "Gagal menghapus akun");
		}
	};

	const handleAddUser = () => {
		setShowAddUserModal(true);
		// Reset form
		setNewUserData({
			email: "",
			password: "",
			name: "",
			role: "PESERTA",
			phone: "",
			institution: "",
			status: "PENDING",
		});
		setShowPassword(false);
	};

	const handleNewUserChange = (
		field: string,
		value: string
	) => {
		setNewUserData((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const confirmAddUser = async () => {
		// Validation
		if (!newUserData.email || !newUserData.password || !newUserData.name) {
			showWarning("Email, password, dan nama harus diisi");
			return;
		}

		if (newUserData.password.length < 8) {
			showWarning("Password minimal 8 karakter");
			return;
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(newUserData.email)) {
			showWarning("Format email tidak valid");
			return;
		}

		setAddUserLoading(true);
		try {
			await api.post("/users", newUserData);

			showSuccess("User berhasil ditambahkan");
			setShowAddUserModal(false);
			await Promise.all([fetchUsers(), fetchUserStats()]);
		} catch (error: any) {
			console.error("Error creating user:", error);
			showError(
				error.response?.data?.message || "Gagal menambahkan user"
			);
		} finally {
			setAddUserLoading(false);
		}
	};

	const confirmAssignCoupon = async () => {
		if (!selectedCouponId || !selectedUser) {
			showWarning("Pilih kupon terlebih dahulu");
			return;
		}

		setAssignLoading(true);
		try {
			// Update coupon to assign to user's email
			await api.patch(`/coupons/${selectedCouponId}`, {
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

	const startIndex = filteredTotalUsers === 0 ? 0 : (currentPage - 1) * itemsPerPage;
	const endIndex = Math.min(startIndex + users.length, filteredTotalUsers);

	// Reset to page 1 when filters change
	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm, selectedRole]);

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};

	const handleItemsPerPageChange = (value: number) => {
		setItemsPerPage(value);
		setCurrentPage(1);
	};

	// Generate page numbers to display
	const getPageNumbers = () => {
		const pages: (number | string)[] = [];
		const maxVisiblePages = 5;

		if (filteredTotalPages <= maxVisiblePages) {
			// Show all pages if total is less than max
			for (let i = 1; i <= filteredTotalPages; i++) {
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
			const end = Math.min(filteredTotalPages - 1, currentPage + 1);

			for (let i = start; i <= end; i++) {
				pages.push(i);
			}

			if (currentPage < filteredTotalPages - 2) {
				pages.push("...");
			}

			// Always show last page
			pages.push(filteredTotalPages);
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

	const formatDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "short",
			year: "numeric",
		});
	};

	const timeAgo = (dateStr: string) => {
		const diff = Date.now() - new Date(dateStr).getTime();
		const minutes = Math.floor(diff / 60000);
		if (minutes < 1) return "Baru saja";
		if (minutes < 60) return `${minutes} menit lalu`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours} jam lalu`;
		const days = Math.floor(hours / 24);
		if (days < 7) return `${days} hari lalu`;
		return formatDate(dateStr);
	};

	const roleOptions = [
		{ value: "ALL", label: "Semua Role" },
		{ value: "SUPERADMIN", label: "Super Admin" },
		{ value: "PANITIA", label: "Panitia" },
		{ value: "PESERTA", label: "Peserta" },
		{ value: "JURI", label: "Juri" },
		{ value: "PELATIH", label: "Pelatih" },
	];

	const verificationRate = userStats && userStats.total > 0
		? Math.round((userStats.verification.verified / userStats.total) * 100)
		: 0;

	const attentionCount = userStats
		? (userStats.byStatus.INACTIVE || 0) + (userStats.byStatus.SUSPENDED || 0)
		: 0;

	const summaryCards = userStats
		? [
			{
				label: "Total User",
				value: userStats.total,
				detail: "Total seluruh akun di sistem",
				icon: UsersIcon,
				cardClass: "border-slate-200/80 dark:border-slate-700/60 bg-white/90 dark:bg-slate-900/40",
				iconClass: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200",
			},
			{
				label: "Akun Aktif",
				value: userStats.byStatus.ACTIVE || 0,
				detail: `${userStats.byStatus.PENDING || 0} menunggu approval`,
				icon: CheckCircleIcon,
				cardClass: "border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/70 dark:bg-emerald-950/20",
				iconClass: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
			},
			{
				label: "Menunggu Approval",
				value: userStats.byStatus.PENDING || 0,
				detail: `${userStats.verification.unverified || 0} belum verified`,
				icon: ClockIcon,
				cardClass: "border-amber-200/80 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-950/20",
				iconClass: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
			},
			{
				label: "Perlu Tindakan",
				value: attentionCount,
				detail: `${userStats.byStatus.SUSPENDED || 0} suspended, ${userStats.byStatus.INACTIVE || 0} inactive`,
				icon: XCircleIcon,
				cardClass: "border-rose-200/80 dark:border-rose-900/40 bg-rose-50/70 dark:bg-rose-950/20",
				iconClass: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
			},
			{
				label: "Email Verified",
				value: userStats.verification.verified,
				detail: `${verificationRate}% dari total user`,
				icon: ShieldCheckIcon,
				cardClass: "border-sky-200/80 dark:border-sky-900/40 bg-sky-50/70 dark:bg-sky-950/20",
				iconClass: "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300",
			},
			{
				label: "Juri Pinned",
				value: userStats.pinnedJuries,
				detail: `${userStats.byRole.JURI || 0} total juri`,
				icon: StarIcon,
				cardClass: "border-violet-200/80 dark:border-violet-900/40 bg-violet-50/70 dark:bg-violet-950/20",
				iconClass: "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300",
			},
			{
				label: "User Baru Bulan Ini",
				value: userStats.growth.thisMonth,
				detail: `${userStats.growth.last7Days} user dalam 7 hari terakhir`,
				icon: PlusIcon,
				cardClass: "border-orange-200/80 dark:border-orange-900/40 bg-orange-50/70 dark:bg-orange-950/20",
				iconClass: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
			},
		]
		: [];

	if (!hasLoadedUsers && loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600 dark:border-red-400"></div>
			</div>
		);
	}

	return (
		<div className="space-y-6 p-6">
			{statsLoading ? (
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="lg:col-span-2 h-44 rounded-2xl bg-gray-100 dark:bg-gray-800/50 animate-pulse" />
					<div className="h-44 rounded-2xl bg-gray-100 dark:bg-gray-800/50 animate-pulse" />
				</div>
			) : userStats ? (
				<div className="space-y-6">
					<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow dark:shadow-gray-900/50 border border-gray-200/60 dark:border-gray-700/40 p-6">
						<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
							<div>
								<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm font-medium mb-3">
									<ChartBarIcon className="w-4 h-4" />
									Ringkasan Pengguna
								</div>
								<h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
									{userStats.total.toLocaleString("id-ID")} akun terdaftar
								</h2>
								<p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
									Statistik global seluruh user. Bagian ini tetap stabil meskipun tabel di bawah difilter.
								</p>
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:min-w-[420px]">
								<div className="rounded-xl border border-gray-200/70 dark:border-gray-700/50 bg-gray-50/80 dark:bg-gray-900/30 p-4">
									<p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Verified</p>
									<p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{verificationRate}%</p>
								</div>
								<div className="rounded-xl border border-gray-200/70 dark:border-gray-700/50 bg-gray-50/80 dark:bg-gray-900/30 p-4">
									<p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">7 Hari Terakhir</p>
									<p className="text-xl font-bold text-gray-900 dark:text-white mt-1">+{userStats.growth.last7Days.toLocaleString("id-ID")}</p>
								</div>
								<div className="rounded-xl border border-gray-200/70 dark:border-gray-700/50 bg-gray-50/80 dark:bg-gray-900/30 p-4">
									<p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Juri Pinned</p>
									<p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{userStats.pinnedJuries.toLocaleString("id-ID")}</p>
								</div>
							</div>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
						{summaryCards.map((card) => (
							<div
								key={card.label}
								className={`rounded-2xl border p-5 shadow-sm dark:shadow-gray-900/20 ${card.cardClass}`}
							>
								<div className="flex items-start justify-between gap-3">
									<div>
										<p className="text-sm font-medium text-gray-600 dark:text-gray-400">{card.label}</p>
										<p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{card.value.toLocaleString("id-ID")}</p>
										<p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{card.detail}</p>
									</div>
									<div className={`p-3 rounded-xl ${card.iconClass}`}>
										<card.icon className="w-5 h-5" />
									</div>
								</div>
							</div>
						))}
					</div>

					<div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
						<div className="xl:col-span-2 space-y-6">
							<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow dark:shadow-gray-900/50 border border-gray-200/60 dark:border-gray-700/40 p-6">
								<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Status & Verifikasi</h3>
								<div className="grid grid-cols-2 gap-3 mb-5">
									{[
										{ key: "ACTIVE", label: "Active", value: userStats.byStatus.ACTIVE || 0, tone: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300" },
										{ key: "PENDING", label: "Pending", value: userStats.byStatus.PENDING || 0, tone: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300" },
										{ key: "INACTIVE", label: "Inactive", value: userStats.byStatus.INACTIVE || 0, tone: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300" },
										{ key: "SUSPENDED", label: "Suspended", value: userStats.byStatus.SUSPENDED || 0, tone: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300" },
									].map((item) => (
										<div key={item.key} className={`rounded-xl p-4 ${item.tone}`}>
											<p className="text-xs uppercase tracking-wide opacity-75">{item.label}</p>
											<p className="text-2xl font-black mt-1">{item.value.toLocaleString("id-ID")}</p>
										</div>
									))}
								</div>
								<div>
									<div className="flex items-center justify-between text-sm mb-2">
										<span className="text-gray-600 dark:text-gray-400">Email Verified</span>
										<span className="font-semibold text-gray-900 dark:text-white">{verificationRate}%</span>
									</div>
									<div className="h-3 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
										<div
											className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 transition-all duration-700"
											style={{ width: `${verificationRate}%` }}
										/>
									</div>
									<div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
										<span>{userStats.verification.verified.toLocaleString("id-ID")} verified</span>
										<span>{userStats.verification.unverified.toLocaleString("id-ID")} belum verified</span>
									</div>
								</div>
							</div>

							<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow dark:shadow-gray-900/50 border border-gray-200/60 dark:border-gray-700/40 p-6">
								<div className="flex items-center justify-between gap-4 mb-4">
									<div>
										<h3 className="text-lg font-semibold text-gray-900 dark:text-white">Insight Cepat</h3>
										<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Ringkasan singkat untuk memantau kualitas data user.</p>
									</div>
									<span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold">
										Global
									</span>
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
									<div className="rounded-xl border border-gray-200/70 dark:border-gray-700/50 p-4 bg-gray-50/80 dark:bg-gray-900/30">
										<p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Belum Verified</p>
										<p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{userStats.verification.unverified.toLocaleString("id-ID")}</p>
									</div>
									<div className="rounded-xl border border-gray-200/70 dark:border-gray-700/50 p-4 bg-gray-50/80 dark:bg-gray-900/30">
										<p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">7 Hari Terakhir</p>
										<p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{userStats.growth.last7Days.toLocaleString("id-ID")}</p>
									</div>
									<div className="rounded-xl border border-gray-200/70 dark:border-gray-700/50 p-4 bg-gray-50/80 dark:bg-gray-900/30">
										<p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Filter Saat Ini</p>
										<p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{filteredTotalUsers.toLocaleString("id-ID")}</p>
									</div>
								</div>
							</div>
						</div>

						<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow dark:shadow-gray-900/50 border border-gray-200/60 dark:border-gray-700/40 p-6">
							<div className="flex items-center justify-between gap-4 mb-4">
								<div>
									<h3 className="text-lg font-semibold text-gray-900 dark:text-white">Akun Terbaru</h3>
									<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Pantau user yang baru dibuat.</p>
								</div>
								<span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-semibold">
									6 terbaru
								</span>
							</div>
							<div className="space-y-3">
								{userStats.recent.map((item) => (
									<div key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-gray-200/60 dark:border-gray-700/40 p-3">
										<div className="min-w-0">
											<p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.name}</p>
											<p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.email}</p>
											<div className="flex flex-wrap items-center gap-2 mt-2">
												<span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${getRoleBadgeColor(item.role)}`}>
													{item.role}
												</span>
												<span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${getStatusBadgeColor(item.status)}`}>
													{item.status}
												</span>
												{item.isPinned && (
													<span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">
														Pinned
													</span>
												)}
											</div>
										</div>
										<div className="text-right flex-shrink-0">
											<p className="text-xs font-medium text-gray-900 dark:text-white">{timeAgo(item.createdAt)}</p>
											<p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{formatDate(item.createdAt)}</p>
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			) : null}

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
					<button
						onClick={handleAddUser}
						className="flex items-center gap-2 px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors shadow-sm hover:shadow-md font-medium"
					>
						<PlusIcon className="w-5 h-5" />
						Tambah User
					</button>
					<div className="flex items-center gap-2">
						<span className="text-sm text-gray-600 dark:text-gray-400">
							Hasil Filter:
						</span>
						<span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full font-semibold">
							{filteredTotalUsers}
						</span>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-sm text-gray-600 dark:text-gray-400">
							Per halaman:
						</span>
						<select
							value={itemsPerPage}
							onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
							className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
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
			<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow dark:shadow-gray-900/50 p-4">
				<div className="space-y-4">
					{/* Search */}
					<div className="relative">
						<MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
						<input
							type="text"
							placeholder="Cari nama atau email..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
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
			<div className="relative bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow dark:shadow-gray-900/50 overflow-hidden">
				{loading && hasLoadedUsers && (
					<div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 dark:bg-gray-900/45 backdrop-blur-[1px]">
						<div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-gray-200/80 dark:border-gray-700/60 bg-white/90 dark:bg-gray-800/90 shadow-sm">
							<div className="animate-spin rounded-full h-4 w-4 border-2 border-red-500/30 border-t-red-500"></div>
							<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
								Memuat data user...
							</span>
						</div>
					</div>
				)}
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
						<tbody className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm divide-y divide-gray-200 dark:divide-gray-700">
							{users.length === 0 ? (
								<tr>
									<td colSpan={6} className="px-6 py-12 text-center">
										<UsersIcon className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-2" />
										<p className="text-gray-500 dark:text-gray-400">
											Tidak ada user ditemukan
										</p>
									</td>
								</tr>
							) : (
								users.map((user) => (
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
											<div className="flex items-center gap-2">
												<button												onClick={() => navigate(`/admin/users/${user.id}`)}
												title="Detail User"
												className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-xs font-medium"
											>
												<InformationCircleIcon className="w-4 h-4" />
												Detail
											</button>
											<button													onClick={() => handleVerifyUser(user)}
													title={user.emailVerified ? "Cabut Verifikasi" : "Verifikasi User"}
													className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors text-xs font-medium ${
														user.emailVerified
															? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
															: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
													}`}
												>
													{user.emailVerified ? (
														<><ShieldCheckIcon className="w-4 h-4" /> Verified</>
													) : (
														<><ShieldExclamationIcon className="w-4 h-4" /> Verifikasi</>
													)}
												</button>
												{user.role === "JURI" && (
													<button
														onClick={() => handleTogglePin(user)}
														title={user.isPinned ? "Unpin Juri" : "Pin Juri"}
														className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors text-xs font-medium ${
															user.isPinned
																? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50"
																: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
														}`}
													>
														{user.isPinned ? (
															<><StarIconSolid className="w-4 h-4" /> Pinned</>
														) : (
															<><StarIcon className="w-4 h-4" /> Pin</>
														)}
													</button>
												)}
												{user.role === "PANITIA" && (
													<button
														onClick={() => handleAssignCoupon(user)}
														className="flex items-center gap-1 px-3 py-1.5 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors text-xs font-medium"
													>
														<TicketIcon className="w-4 h-4" />
														Assign Kupon
													</button>
												)}
												{user.role !== "SUPERADMIN" && (
													<button
														onClick={() => handleDeleteUser(user)}
														title="Hapus Akun"
														className="flex items-center gap-1 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-xs font-medium"
													>
														<TrashIcon className="w-4 h-4" />
														Hapus
													</button>
												)}
											</div>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				{filteredTotalUsers > 0 && filteredTotalPages > 1 && (
					<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm px-6 py-4 border-t border-gray-200/60 dark:border-gray-700/40">
						<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
							{/* Info */}
							<div className="text-sm text-gray-600 dark:text-gray-400">
								Menampilkan{" "}
								<span className="font-medium text-gray-900 dark:text-white">
									{startIndex + 1}
								</span>{" "}
								-{" "}
								<span className="font-medium text-gray-900 dark:text-white">
									{endIndex}
								</span>{" "}
								dari{" "}
								<span className="font-medium text-gray-900 dark:text-white">
									{filteredTotalUsers}
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
									disabled={currentPage === filteredTotalPages}
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
					<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-xl max-w-md w-full p-6">
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

			{/* Add User Modal */}
			{showAddUserModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4 overflow-y-auto">
					<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-xl max-w-2xl w-full p-6 my-8">
						<div className="flex items-center gap-3 mb-6">
							<PlusIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
							<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
								Tambah User Baru
							</h3>
						</div>

						<div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
							{/* Two Column Grid */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{/* Left Column */}
								<div className="space-y-4">
									{/* Name */}
									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
											Nama Lengkap <span className="text-red-500">*</span>
										</label>
										<input
											type="text"
											value={newUserData.name}
											onChange={(e) => handleNewUserChange("name", e.target.value)}
											className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
											placeholder="John Doe"
											required
										/>
									</div>

									{/* Email */}
									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
											Email <span className="text-red-500">*</span>
										</label>
										<input
											type="email"
											value={newUserData.email}
											onChange={(e) => handleNewUserChange("email", e.target.value)}
											className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
											placeholder="john@example.com"
											required
										/>
									</div>

									{/* Password */}
									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
											Password <span className="text-red-500">*</span>
										</label>
										<div className="relative">
											<input
												type={showPassword ? "text" : "password"}
												value={newUserData.password}
												onChange={(e) =>
													handleNewUserChange("password", e.target.value)
												}
												className="block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
												placeholder="Minimal 8 karakter"
												required
											/>
											<button
												type="button"
												onClick={() => setShowPassword(!showPassword)}
												className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
											>
												{showPassword ? (
													<EyeSlashIcon className="w-5 h-5" />
												) : (
													<EyeIcon className="w-5 h-5" />
												)}
											</button>
										</div>
										<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
											Password minimal 8 karakter
										</p>
									</div>

									{/* Phone */}
									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
											No. Telepon{" "}
											<span className="text-gray-400 dark:text-gray-500 text-xs">
												(Opsional)
											</span>
										</label>
										<input
											type="tel"
											value={newUserData.phone}
											onChange={(e) => handleNewUserChange("phone", e.target.value)}
											className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
											placeholder="+62812345678"
										/>
									</div>
								</div>

								{/* Right Column */}
								<div className="space-y-4">
									{/* Role */}
									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
											Role <span className="text-red-500">*</span>
										</label>
										<select
											value={newUserData.role}
											onChange={(e) => handleNewUserChange("role", e.target.value)}
											className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
											required
										>
											<option value="PESERTA">Peserta</option>
											<option value="PELATIH">Pelatih</option>
											<option value="JURI">Juri</option>
											<option value="PANITIA">Panitia</option>
											<option value="SUPERADMIN">Super Admin</option>
										</select>
									</div>

									{/* Status */}
									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
											Status <span className="text-red-500">*</span>
										</label>
										<select
											value={newUserData.status}
											onChange={(e) => handleNewUserChange("status", e.target.value)}
											className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
											required
										>
											<option value="ACTIVE">Active</option>
											<option value="PENDING">Pending</option>
											<option value="INACTIVE">Inactive</option>
											<option value="SUSPENDED">Suspended</option>
										</select>
									</div>

									{/* Institution */}
									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
											Institusi{" "}
											<span className="text-gray-400 dark:text-gray-500 text-xs">
												(Opsional)
											</span>
										</label>
										<input
											type="text"
											value={newUserData.institution}
											onChange={(e) =>
												handleNewUserChange("institution", e.target.value)
											}
											className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
											placeholder="Nama sekolah/universitas"
										/>
									</div>

									{/* Info Box */}
									<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
										<p className="text-xs text-blue-800 dark:text-blue-300">
											<strong>Catatan:</strong> User baru akan memiliki status
											Pending dan perlu diverifikasi oleh admin.
										</p>
									</div>
								</div>
							</div>
						</div>

						{/* Action Buttons */}
						<div className="flex gap-3 mt-6 pt-4 border-t border-gray-200/60 dark:border-gray-700/40">
							<button
								onClick={() => setShowAddUserModal(false)}
								className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
								disabled={addUserLoading}
							>
								Batal
							</button>
							<button
								onClick={confirmAddUser}
								disabled={addUserLoading}
								className="flex-1 px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed font-medium"
							>
								{addUserLoading ? (
									<span className="flex items-center justify-center gap-2">
										<svg
											className="animate-spin h-4 w-4"
											fill="none"
											viewBox="0 0 24 24"
										>
											<circle
												className="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												strokeWidth="4"
											></circle>
											<path
												className="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											></path>
										</svg>
										Memproses...
									</span>
								) : (
									"Tambah User"
								)}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default UserManagement;
