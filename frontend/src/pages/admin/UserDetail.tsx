import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
	ArrowLeftIcon,
	EnvelopeIcon,
	PhoneIcon,
	BuildingLibraryIcon,
	MapPinIcon,
	CalendarDaysIcon,
	CheckCircleIcon,
	XCircleIcon,
	KeyIcon,
	ShieldCheckIcon,
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

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600 dark:border-red-400"></div>
			</div>
		);
	}

	if (!user) return null;

	return (
		<div className="space-y-6 p-6">
			{/* Back Button & Header */}
			<div className="flex items-center gap-4">
				<button
					onClick={() => navigate("/admin/users")}
					className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
				>
					<ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
				</button>
				<div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
						Detail User
					</h1>
					<p className="text-sm text-gray-600 dark:text-gray-400">
						Informasi lengkap user
					</p>
				</div>
			</div>

			{/* User Info Card */}
			<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow dark:shadow-gray-900/50 p-6">
				<div className="flex flex-col md:flex-row gap-6">
					{/* Avatar */}
					<div className="flex-shrink-0">
						{user.profile?.avatar ? (
							<img
								src={user.profile.avatar}
								alt={user.name}
								className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-gray-700 shadow"
							/>
						) : (
							<div className="w-24 h-24 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center border-4 border-white dark:border-gray-700 shadow">
								<UserIcon className="w-12 h-12 text-red-600 dark:text-red-400" />
							</div>
						)}
					</div>

					{/* Info */}
					<div className="flex-1 space-y-4">
						<div className="flex flex-col sm:flex-row sm:items-center gap-3">
							<h2 className="text-xl font-bold text-gray-900 dark:text-white">
								{user.name}
							</h2>
							<div className="flex items-center gap-2">
								<span className={`px-3 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
									{user.role}
								</span>
								<span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(user.status)}`}>
									{user.status}
								</span>
								{user.emailVerified ? (
									<span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
										<CheckCircleIcon className="w-3.5 h-3.5" />
										Verified
									</span>
								) : (
									<span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
										<XCircleIcon className="w-3.5 h-3.5" />
										Unverified
									</span>
								)}
							</div>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
							<div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
								<EnvelopeIcon className="w-4 h-4 flex-shrink-0" />
								<span className="truncate">{user.email}</span>
							</div>
							{user.phone && (
								<div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
									<PhoneIcon className="w-4 h-4 flex-shrink-0" />
									<span>{user.phone}</span>
								</div>
							)}
							{user.profile?.institution && (
								<div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
									<BuildingLibraryIcon className="w-4 h-4 flex-shrink-0" />
									<span>{user.profile.institution}</span>
								</div>
							)}
							{(user.profile?.city || user.profile?.province) && (
								<div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
									<MapPinIcon className="w-4 h-4 flex-shrink-0" />
									<span>
										{[user.profile.city, user.profile.province].filter(Boolean).join(", ")}
									</span>
								</div>
							)}
							<div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
								<CalendarDaysIcon className="w-4 h-4 flex-shrink-0" />
								<span>Bergabung {formatDate(user.createdAt)}</span>
							</div>
							{user.lastLogin && (
								<div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
									<ShieldCheckIcon className="w-4 h-4 flex-shrink-0" />
									<span>Login terakhir {formatDateTime(user.lastLogin)}</span>
								</div>
							)}
						</div>

						{user.profile?.bio && (
							<p className="text-sm text-gray-600 dark:text-gray-400 italic">
								"{user.profile.bio}"
							</p>
						)}

						{user.profile?.gender && (
							<div className="text-sm text-gray-600 dark:text-gray-400">
								Gender: {user.profile.gender === "MALE" ? "Laki-laki" : user.profile.gender === "FEMALE" ? "Perempuan" : user.profile.gender}
							</div>
						)}

						{user.profile?.birthDate && (
							<div className="text-sm text-gray-600 dark:text-gray-400">
								Tanggal Lahir: {formatDate(user.profile.birthDate)}
							</div>
						)}
					</div>

					{/* Actions */}
					<div className="flex-shrink-0">
						<button
							onClick={handleResetPassword}
							disabled={resetLoading}
							className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
						>
							<KeyIcon className="w-4 h-4" />
							{resetLoading ? "Mereset..." : "Reset Password"}
						</button>
					</div>
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
