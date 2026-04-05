import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
	ArrowLeftIcon,
	PhoneIcon,
	BuildingLibraryIcon,
	MapPinIcon,
	CalendarDaysIcon,
	ArrowPathIcon,
	CheckCircleIcon,
	ClockIcon,
	XCircleIcon,
	KeyIcon,
	ShieldCheckIcon,
	ShieldExclamationIcon,
	UserIcon,
	TicketIcon,
	TrophyIcon,
	ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../utils/api";
import { showSuccess, showError, showConfirm } from "../../utils/sweetalert";

interface UserProfile {
	avatar: string | null;
	bio: string | null;
	institution: string | null;
	address: string | null;
	city: string | null;
	province: string | null;
	birthDate: string | null;
	gender: string | null;
}

interface UserDetail {
	id: string;
	email: string;
	name: string;
	phone: string | null;
	role: string;
	status: string;
	emailVerified: boolean;
	isPinned: boolean;
	lastLogin: string | null;
	createdAt: string;
	updatedAt: string;
	profile?: UserProfile;
}

interface PanitiaEvent {
	id: string;
	title: string;
	slug: string;
	status: string;
	startDate: string;
	endDate: string;
	currentParticipants: number;
	maxParticipants: number;
	thumbnail: string | null;
}

interface PanitiaCoupon {
	id: string;
	code: string;
	description: string | null;
	isUsed: boolean;
	usedAt: string | null;
	expiresAt: string | null;
	events: { id: string; title: string; slug: string }[];
}

interface PesertaParticipation {
	id: string;
	status: string;
	teamName: string | null;
	schoolName: string | null;
	totalScore: number | null;
	rank: number | null;
	createdAt: string;
	event: {
		id: string;
		title: string;
		slug: string;
		status: string;
		startDate: string;
		endDate: string;
		thumbnail: string | null;
	};
}

interface JuryAssignment {
	id: string;
	status: string;
	invitedAt: string;
	respondedAt: string | null;
	notes: string | null;
	event: {
		id: string;
		title: string;
		slug: string;
		status: string;
		startDate: string;
		endDate: string;
		thumbnail: string | null;
	};
	assignedCategories: {
		id: string;
		assessmentCategory: {
			name: string;
		};
	}[];
}

const UserDetailPage: React.FC = () => {
	const { userId } = useParams<{ userId: string }>();
	const navigate = useNavigate();
	const [user, setUser] = useState<UserDetail | null>(null);
	const [roleData, setRoleData] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [resetLoading, setResetLoading] = useState(false);
	const [verifyLoading, setVerifyLoading] = useState(false);
	const [statusUpdating, setStatusUpdating] = useState(false);
	const [statusDraft, setStatusDraft] = useState("PENDING");

	useEffect(() => {
		if (userId) {
			fetchUserDetail();
		}
	}, [userId]);

	const fetchUserDetail = async () => {
		try {
			setLoading(true);
			const response = await api.get(`/users/${userId}/detail`);
			setUser(response.data.user);
			setStatusDraft(response.data.user.status);
			setRoleData(response.data.roleData);
		} catch (error: any) {
			showError(
				error.response?.data?.message || "Gagal memuat detail user"
			);
			navigate("/admin/users");
		} finally {
			setLoading(false);
		}
	};

	const statusOptions = [
		{ value: "ACTIVE", label: "Active" },
		{ value: "PENDING", label: "Pending" },
		{ value: "INACTIVE", label: "Inactive" },
		{ value: "SUSPENDED", label: "Suspended" },
	];

	const applyUserUpdate = (updatedUser: UserDetail) => {
		setUser(updatedUser);
		setStatusDraft(updatedUser.status);
	};

	const handleToggleVerification = async () => {
		if (!user) return;

		const result = await showConfirm(
			user.emailVerified
				? `Verifikasi untuk ${user.name} akan dicabut dan status akun dikembalikan ke Pending.`
				: `${user.name} akan diverifikasi dan status akun diaktifkan.`,
			user.emailVerified ? "Cabut Verifikasi" : "Verifikasi User"
		);

		if (!result.isConfirmed) return;

		try {
			setVerifyLoading(true);
			const response = await api.patch(`/users/${user.id}/verify`);
			applyUserUpdate(response.data.user);
			showSuccess(response.data.message || "Status verifikasi berhasil diperbarui");
		} catch (error: any) {
			showError(error.response?.data?.message || "Gagal memperbarui verifikasi user");
		} finally {
			setVerifyLoading(false);
		}
	};

	const handleStatusUpdate = async () => {
		if (!user || statusDraft === user.status) return;

		const selectedStatusLabel =
			statusOptions.find((option) => option.value === statusDraft)?.label || statusDraft;

		const result = await showConfirm(
			`Status ${user.name} akan diubah menjadi ${selectedStatusLabel}.`,
			"Ubah Status User"
		);

		if (!result.isConfirmed) return;

		try {
			setStatusUpdating(true);
			const response = await api.put(`/users/${user.id}`, {
				status: statusDraft,
			});
			applyUserUpdate(response.data.user);
			showSuccess("Status user berhasil diperbarui");
		} catch (error: any) {
			showError(error.response?.data?.message || "Gagal mengubah status user");
		} finally {
			setStatusUpdating(false);
		}
	};

	const handleResetPassword = async () => {
		const result = await showConfirm(
			`Password akan direset menjadi "SIMPASKOR". Lanjutkan?`,
			"Reset Password"
		);

		if (!result.isConfirmed) return;

		try {
			setResetLoading(true);
			const response = await api.post(`/users/${userId}/reset-password`);
			showSuccess(response.data.message);
		} catch (error: any) {
			showError(
				error.response?.data?.message || "Gagal mereset password"
			);
		} finally {
			setResetLoading(false);
		}
	};

	const formatDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	};

	const formatDateTime = (dateStr: string) => {
		return new Date(dateStr).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "long",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const getRoleBadgeColor = (role: string) => {
		const colors: Record<string, string> = {
			SUPERADMIN: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
			PANITIA: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
			PESERTA: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
			JURI: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
			PELATIH: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
		};
		return colors[role] || "bg-gray-100 text-gray-800";
	};

	const getStatusBadgeColor = (status: string) => {
		const colors: Record<string, string> = {
			ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
			PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
			INACTIVE: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
			SUSPENDED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
		};
		return colors[status] || "bg-gray-100 text-gray-800";
	};

	const isUserOnline = (lastActivity: string | null) => {
		if (!lastActivity) return false;
		return Date.now() - new Date(lastActivity).getTime() <= 5 * 60 * 1000;
	};

	const getLastActivityText = (lastActivity: string | null) => {
		if (!lastActivity) {
			return "Belum pernah login";
		}

		if (isUserOnline(lastActivity)) {
			return "Online sekarang";
		}

		const diffMinutes = Math.max(
			0,
			Math.floor((Date.now() - new Date(lastActivity).getTime()) / 60000)
		);

		if (diffMinutes < 1) return "Baru saja";
		if (diffMinutes < 60) return `${diffMinutes} menit lalu`;

		const diffHours = Math.floor(diffMinutes / 60);
		if (diffHours < 24) return `${diffHours} jam lalu`;

		const diffDays = Math.floor(diffHours / 24);
		if (diffDays < 7) return `${diffDays} hari lalu`;

		return formatDateTime(lastActivity);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600 dark:border-red-400"></div>
			</div>
		);
	}

	if (!user) return null;

	return (
		<div className="space-y-5 p-4 lg:p-6">
			{/* Back Button & Header */}
			<div className="flex items-center gap-3">
				<button
					onClick={() => navigate("/admin/users")}
					className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
				>
					<ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
				</button>
				<h1 className="text-xl font-bold text-gray-900 dark:text-white">Detail User</h1>
			</div>

			{/* ── Main Grid: Info + Actions ── */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				{/* Left: User Info (2 cols) */}
				<div className="lg:col-span-2 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow dark:shadow-gray-900/50 p-5">
					<div className="flex items-start gap-4">
						{/* Avatar */}
						{user.profile?.avatar ? (
							<img
								src={user.profile.avatar}
								alt={user.name}
								className="w-16 h-16 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow flex-shrink-0"
							/>
						) : (
							<div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center border-2 border-white dark:border-gray-700 shadow flex-shrink-0">
								<UserIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
							</div>
						)}
						{/* Name + Badges */}
						<div className="flex-1 min-w-0">
							<div className="flex flex-wrap items-center gap-2">
								<h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">{user.name}</h2>
								<span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>{user.role}</span>
								<span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${getStatusBadgeColor(user.status)}`}>{user.status}</span>
								{user.emailVerified ? (
									<span className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
										<CheckCircleIcon className="w-3.5 h-3.5" />Verified
									</span>
								) : (
									<span className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
										<XCircleIcon className="w-3.5 h-3.5" />Unverified
									</span>
								)}
								{isUserOnline(user.lastLogin) && (
									<span className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
										<span className="h-2 w-2 rounded-full bg-emerald-500"></span>Online
									</span>
								)}
							</div>
							<p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">{user.email}</p>
						</div>
					</div>

					{/* Detail grid */}
					<div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5 mt-4 text-sm">
						{user.phone && (
							<div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
								<PhoneIcon className="w-4 h-4 flex-shrink-0" /><span>{user.phone}</span>
							</div>
						)}
						{user.profile?.institution && (
							<div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
								<BuildingLibraryIcon className="w-4 h-4 flex-shrink-0" /><span className="truncate">{user.profile.institution}</span>
							</div>
						)}
						{(user.profile?.city || user.profile?.province) && (
							<div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
								<MapPinIcon className="w-4 h-4 flex-shrink-0" />
								<span>{[user.profile.city, user.profile.province].filter(Boolean).join(", ")}</span>
							</div>
						)}
						<div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
							<CalendarDaysIcon className="w-4 h-4 flex-shrink-0" />
							<span>Bergabung {formatDate(user.createdAt)}</span>
						</div>
						<div className="sm:col-span-2">
							<p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Aktivitas terakhir</p>
							<div className={`mt-1 flex items-center gap-2 ${
								isUserOnline(user.lastLogin)
									? "text-emerald-600 dark:text-emerald-400"
									: user.lastLogin
										? "text-gray-600 dark:text-gray-400"
										: "text-gray-400 dark:text-gray-500"
							}`}>
								<ClockIcon className="w-4 h-4 flex-shrink-0" />
								<span>{getLastActivityText(user.lastLogin)}</span>
							</div>
							<p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
								{user.lastLogin ? formatDateTime(user.lastLogin) : "Belum ada riwayat login"}
							</p>
						</div>
						{user.profile?.gender && (
							<div className="text-gray-600 dark:text-gray-400">
								Gender: {user.profile.gender === "MALE" ? "Laki-laki" : user.profile.gender === "FEMALE" ? "Perempuan" : user.profile.gender}
							</div>
						)}
						{user.profile?.birthDate && (
							<div className="text-gray-600 dark:text-gray-400">
								Lahir: {formatDate(user.profile.birthDate)}
							</div>
						)}
					</div>

					{user.profile?.bio && (
						<p className="text-sm text-gray-500 dark:text-gray-400 italic mt-3 border-t border-gray-200/60 dark:border-gray-700/40 pt-3">
							"{user.profile.bio}"
						</p>
					)}
				</div>

				{/* Right: Admin Actions (1 col) */}
				<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow dark:shadow-gray-900/50 p-4 space-y-3 self-start">
					<p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Aksi Admin</p>

					<button
						onClick={handleToggleVerification}
						disabled={verifyLoading}
						className={`w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${
							user.emailVerified
								? "bg-green-600 hover:bg-green-700 text-white"
								: "bg-blue-600 hover:bg-blue-700 text-white"
						}`}
					>
						{user.emailVerified ? <ShieldCheckIcon className="w-4 h-4" /> : <ShieldExclamationIcon className="w-4 h-4" />}
						{verifyLoading ? "Memproses..." : user.emailVerified ? "Cabut Verifikasi" : "Verifikasi User"}
					</button>
					<p className="text-[11px] text-gray-500 dark:text-gray-400 -mt-1">
						{user.emailVerified ? "Mencabut → status kembali ke Pending." : "Verifikasi → status otomatis aktif."}
					</p>

					<div className="space-y-1.5">
						<label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Ubah Status</label>
						<div className="flex gap-2">
							<select
								value={statusDraft}
								onChange={(e) => setStatusDraft(e.target.value)}
								className="flex-1 px-2.5 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/90 dark:bg-gray-800/70 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
							>
								{statusOptions.map((o) => (
									<option key={o.value} value={o.value}>{o.label}</option>
								))}
							</select>
							<button
								onClick={handleStatusUpdate}
								disabled={statusUpdating || statusDraft === user.status}
								className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
							>
								<ArrowPathIcon className="w-4 h-4" />
							</button>
						</div>
					</div>

					<button
						onClick={handleResetPassword}
						disabled={resetLoading}
						className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
					>
						<KeyIcon className="w-4 h-4" />
						{resetLoading ? "Mereset..." : "Reset Password"}
					</button>
				</div>
			</div>

			{/* Role-specific Data */}
			{user.role === "PANITIA" && roleData && (
				<PanitiaSection events={roleData.events} coupons={roleData.coupons} />
			)}

			{user.role === "PESERTA" && roleData && (
				<PesertaSection participations={roleData.participations} />
			)}

			{user.role === "JURI" && roleData && (
				<JuriSection assignments={roleData.juryAssignments} />
			)}

			{(user.role === "SUPERADMIN" || user.role === "PELATIH") && (
				<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow dark:shadow-gray-900/50 p-8 text-center">
					<UserIcon className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
					<p className="text-gray-500 dark:text-gray-400">
						Tidak ada data role-spesifik untuk {user.role.toLowerCase()}
					</p>
				</div>
			)}
		</div>
	);
};

// ===== PANITIA SECTION =====
const PanitiaSection: React.FC<{
	events: PanitiaEvent[];
	coupons: PanitiaCoupon[];
}> = ({ events, coupons }) => {
	const navigate = useNavigate();
	const usedCoupons = coupons.filter((c) => c.isUsed);
	const unusedCoupons = coupons.filter((c) => !c.isUsed);

	const getEventStatusColor = (status: string) => {
		const colors: Record<string, string> = {
			DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
			PUBLISHED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
			ONGOING: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
			COMPLETED: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
			CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
		};
		return colors[status] || "bg-gray-100 text-gray-700";
	};

	const formatDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "short",
			year: "numeric",
		});
	};

	return (
		<>
			{/* Events */}
			<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow dark:shadow-gray-900/50">
				<div className="p-6 border-b border-gray-200 dark:border-gray-700">
					<div className="flex items-center gap-3">
						<ClipboardDocumentListIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
							Event yang Dibuat ({events.length})
						</h3>
					</div>
				</div>
				{events.length === 0 ? (
					<div className="p-8 text-center text-gray-500 dark:text-gray-400">
						Belum membuat event
					</div>
				) : (
					<div className="divide-y divide-gray-200 dark:divide-gray-700">
						{events.map((event) => (
							<div
								key={event.id}
								className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
								onClick={() => navigate(`/admin/events/${event.slug}/manage`)}
							>
								<div className="flex items-center gap-4">
									{event.thumbnail && (
										<img
											src={event.thumbnail}
											alt={event.title}
											className="w-16 h-12 rounded-lg object-cover"
										/>
									)}
									<div className="flex-1 min-w-0">
										<h4 className="font-medium text-gray-900 dark:text-white truncate">
											{event.title}
										</h4>
										<p className="text-sm text-gray-500 dark:text-gray-400">
											{formatDate(event.startDate)} - {formatDate(event.endDate)}
										</p>
									</div>
									<div className="flex items-center gap-3 flex-shrink-0">
										<span className="text-sm text-gray-600 dark:text-gray-400">
											{event.currentParticipants}/{event.maxParticipants} peserta
										</span>
										<span className={`px-2 py-1 text-xs font-semibold rounded-full ${getEventStatusColor(event.status)}`}>
											{event.status}
										</span>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Coupons */}
			<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow dark:shadow-gray-900/50">
				<div className="p-6 border-b border-gray-200 dark:border-gray-700">
					<div className="flex items-center gap-3">
						<TicketIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
							Kupon ({coupons.length})
						</h3>
						<div className="flex items-center gap-2 ml-auto">
							<span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
								{unusedCoupons.length} tersedia
							</span>
							<span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
								{usedCoupons.length} terpakai
							</span>
						</div>
					</div>
				</div>
				{coupons.length === 0 ? (
					<div className="p-8 text-center text-gray-500 dark:text-gray-400">
						Belum memiliki kupon
					</div>
				) : (
					<div className="divide-y divide-gray-200 dark:divide-gray-700">
						{coupons.map((coupon) => (
							<div key={coupon.id} className="p-4">
								<div className="flex items-center gap-4">
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2">
											<span className="font-mono font-bold text-gray-900 dark:text-white">
												{coupon.code}
											</span>
											{coupon.isUsed ? (
												<span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
													Terpakai
												</span>
											) : (
												<span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
													Tersedia
												</span>
											)}
										</div>
										{coupon.description && (
											<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
												{coupon.description}
											</p>
										)}
										{coupon.events.length > 0 && (
											<p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
												Dipakai di: {coupon.events.map((e) => e.title).join(", ")}
											</p>
										)}
									</div>
									<div className="text-right text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
										{coupon.expiresAt && (
											<div>Exp: {new Date(coupon.expiresAt).toLocaleDateString("id-ID")}</div>
										)}
										{coupon.usedAt && (
											<div>Dipakai: {new Date(coupon.usedAt).toLocaleDateString("id-ID")}</div>
										)}
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</>
	);
};

// ===== PESERTA SECTION =====
const PesertaSection: React.FC<{
	participations: PesertaParticipation[];
}> = ({ participations }) => {
	const navigate = useNavigate();

	const getEventStatusColor = (status: string) => {
		const colors: Record<string, string> = {
			DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
			PUBLISHED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
			ONGOING: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
			COMPLETED: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
			CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
		};
		return colors[status] || "bg-gray-100 text-gray-700";
	};

	const getParticipationStatusColor = (status: string) => {
		const colors: Record<string, string> = {
			REGISTERED: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
			CONFIRMED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
			ATTENDED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
			CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
		};
		return colors[status] || "bg-gray-100 text-gray-700";
	};

	const formatDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "short",
			year: "numeric",
		});
	};

	return (
		<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow dark:shadow-gray-900/50">
			<div className="p-6 border-b border-gray-200 dark:border-gray-700">
				<div className="flex items-center gap-3">
					<TrophyIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
						Event Terdaftar ({participations.length})
					</h3>
				</div>
			</div>
			{participations.length === 0 ? (
				<div className="p-8 text-center text-gray-500 dark:text-gray-400">
					Belum terdaftar di event manapun
				</div>
			) : (
				<div className="divide-y divide-gray-200 dark:divide-gray-700">
					{participations.map((p) => (
						<div
							key={p.id}
							className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
							onClick={() => navigate(`/admin/events/${p.event.slug}/peserta`)}
						>
							<div className="flex items-center gap-4">
								{p.event.thumbnail && (
									<img
										src={p.event.thumbnail}
										alt={p.event.title}
										className="w-16 h-12 rounded-lg object-cover"
									/>
								)}
								<div className="flex-1 min-w-0">
									<h4 className="font-medium text-gray-900 dark:text-white truncate">
										{p.event.title}
									</h4>
									<div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
										<span>{formatDate(p.event.startDate)} - {formatDate(p.event.endDate)}</span>
										{p.teamName && <span>| Tim: {p.teamName}</span>}
										{p.schoolName && <span>| {p.schoolName}</span>}
									</div>
								</div>
								<div className="flex items-center gap-3 flex-shrink-0">
									{p.totalScore !== null && (
										<span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
											Skor: {p.totalScore.toFixed(2)}
										</span>
									)}
									{p.rank !== null && (
										<span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
											#{p.rank}
										</span>
									)}
									<span className={`px-2 py-1 text-xs font-semibold rounded-full ${getParticipationStatusColor(p.status)}`}>
										{p.status}
									</span>
									<span className={`px-2 py-1 text-xs font-semibold rounded-full ${getEventStatusColor(p.event.status)}`}>
										{p.event.status}
									</span>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

// ===== JURI SECTION =====
const JuriSection: React.FC<{
	assignments: JuryAssignment[];
}> = ({ assignments }) => {
	const navigate = useNavigate();

	const getEventStatusColor = (status: string) => {
		const colors: Record<string, string> = {
			DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
			PUBLISHED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
			ONGOING: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
			COMPLETED: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
			CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
		};
		return colors[status] || "bg-gray-100 text-gray-700";
	};

	const getAssignmentStatusColor = (status: string) => {
		const colors: Record<string, string> = {
			PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
			CONFIRMED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
			REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
		};
		return colors[status] || "bg-gray-100 text-gray-700";
	};

	const formatDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "short",
			year: "numeric",
		});
	};

	return (
		<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow dark:shadow-gray-900/50">
			<div className="p-6 border-b border-gray-200 dark:border-gray-700">
				<div className="flex items-center gap-3">
					<ClipboardDocumentListIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
						Penugasan Event ({assignments.length})
					</h3>
				</div>
			</div>
			{assignments.length === 0 ? (
				<div className="p-8 text-center text-gray-500 dark:text-gray-400">
					Belum ditugaskan di event manapun
				</div>
			) : (
				<div className="divide-y divide-gray-200 dark:divide-gray-700">
					{assignments.map((a) => (
						<div
							key={a.id}
							className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
							onClick={() => navigate(`/admin/events/${a.event.slug}/juri`)}
						>
							<div className="flex items-center gap-4">
								{a.event.thumbnail && (
									<img
										src={a.event.thumbnail}
										alt={a.event.title}
										className="w-16 h-12 rounded-lg object-cover"
									/>
								)}
								<div className="flex-1 min-w-0">
									<h4 className="font-medium text-gray-900 dark:text-white truncate">
										{a.event.title}
									</h4>
									<div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
										<span>{formatDate(a.event.startDate)} - {formatDate(a.event.endDate)}</span>
									</div>
									{a.assignedCategories.length > 0 && (
										<div className="flex flex-wrap gap-1 mt-2">
											{a.assignedCategories.map((cat) => (
												<span
													key={cat.id}
													className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 rounded-full"
												>
												{cat.assessmentCategory.name}
												</span>
											))}
										</div>
									)}
								</div>
								<div className="flex items-center gap-3 flex-shrink-0">
									<span className={`px-2 py-1 text-xs font-semibold rounded-full ${getAssignmentStatusColor(a.status)}`}>
										{a.status}
									</span>
									<span className={`px-2 py-1 text-xs font-semibold rounded-full ${getEventStatusColor(a.event.status)}`}>
										{a.event.status}
									</span>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default UserDetailPage;
