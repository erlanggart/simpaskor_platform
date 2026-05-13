import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../utils/api";
import { Link } from "react-router-dom";
import {
	UserGroupIcon,
	CalendarIcon,
	TicketIcon,
	ChartBarIcon,
	ClipboardDocumentListIcon,
	AcademicCapIcon,
	ChatBubbleLeftRightIcon,
	HeartIcon,
	ArrowTrendingUpIcon,
	ClockIcon,
	CheckCircleIcon,
	ExclamationTriangleIcon,
	XCircleIcon,
	EyeIcon,
	MapPinIcon,
	UsersIcon,
	DocumentTextIcon,
	ArrowPathIcon,
	CogIcon,
} from "@heroicons/react/24/outline";
import {
	UserGroupIcon as UserGroupSolid,
	CalendarIcon as CalendarSolid,
	TicketIcon as TicketSolid,
	ChartBarIcon as ChartBarSolid,
} from "@heroicons/react/24/solid";

interface AdminStats {
	users: {
		total: number;
		byRole: Record<string, number>;
		byStatus: Record<string, number>;
		recent: Array<{
			id: string;
			name: string;
			email: string;
			role: string;
			status: string;
			createdAt: string;
		}>;
	};
	events: {
		total: number;
		byStatus: Record<string, number>;
		recent: Array<{
			id: string;
			title: string;
			slug: string;
			status: string;
			createdAt: string;
			createdBy: { name: string; email: string };
		}>;
		upcoming: Array<{
			id: string;
			title: string;
			slug: string;
			startDate: string;
			endDate: string;
			venue: string;
			city: string;
			status: string;
			_count: { participations: number };
		}>;
	};
	registrations: {
		total: number;
		byStatus: Record<string, number>;
		recent: Array<{
			id: string;
			status: string;
			createdAt: string;
			user: { name: string; email: string };
			event: { title: string; slug: string };
		}>;
	};
	coupons: {
		total: number;
		used: number;
		available: number;
	};
	categories: {
		assessment: number;
		school: number;
	};
	activity: {
		evaluations: number;
		comments: number;
		likes: number;
	};
}

const AdminDashboard = () => {
	const { user } = useAuth();
	const [stats, setStats] = useState<AdminStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		fetchStats();
	}, []);

	const fetchStats = async () => {
		try {
			setLoading(true);
			setError(null);
			const response = await api.get("/admin/stats");
			setStats(response.data);
		} catch (err: any) {
			setError(err.response?.data?.message || "Gagal memuat data dashboard");
		} finally {
			setLoading(false);
		}
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

	const getRoleBadge = (role: string) => {
		const map: Record<string, string> = {
			SUPERADMIN: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
			PANITIA: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
			JURI: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
			PESERTA: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
			PELATIH: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
			MITRA: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
		};
		return map[role] || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
	};

	const getStatusBadge = (status: string) => {
		const map: Record<string, string> = {
			ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
			PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
			INACTIVE: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
			SUSPENDED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
			REGISTERED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
			CONFIRMED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
			ATTENDED: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
			CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
		};
		return map[status] || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
	};

	const getEventStatusBadge = (status: string) => {
		const map: Record<string, { class: string; label: string }> = {
			DRAFT: { class: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400", label: "Draft" },
			PUBLISHED: { class: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", label: "Published" },
			ONGOING: { class: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", label: "Berlangsung" },
			COMPLETED: { class: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", label: "Selesai" },
			CANCELLED: { class: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", label: "Dibatalkan" },
		};
		return map[status] || { class: "bg-gray-100 text-gray-700", label: status };
	};

	// Loading state
	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<div className="text-center">
					<div className="w-12 h-12 border-4 border-red-200 dark:border-cyan-800 border-t-red-600 dark:border-t-cyan-400 rounded-full animate-spin mx-auto mb-4"></div>
					<p className="text-gray-500 dark:text-gray-400">Memuat data dashboard...</p>
				</div>
			</div>
		);
	}

	// Error state
	if (error) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<div className="text-center max-w-md">
					<ExclamationTriangleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
					<h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Gagal Memuat Dashboard</h2>
					<p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
					<button
						onClick={fetchStats}
						className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 dark:bg-cyan-600 text-white rounded-lg hover:bg-red-700 dark:hover:bg-cyan-500 transition-colors"
					>
						<ArrowPathIcon className="w-4 h-4" />
						Coba Lagi
					</button>
				</div>
			</div>
		);
	}

	if (!stats) return null;

	const statCards = [
		{
			label: "Total Pengguna",
			value: stats.users.total,
			icon: UserGroupSolid,
			color: "from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700",
			shadow: "shadow-blue-500/20 dark:shadow-blue-900/30",
			link: "/admin/users",
			detail: `${stats.users.byStatus?.ACTIVE || 0} aktif`,
		},
		{
			label: "Total Event",
			value: stats.events.total,
			icon: CalendarSolid,
			color: "from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700",
			shadow: "shadow-emerald-500/20 dark:shadow-emerald-900/30",
			link: "/admin/events",
			detail: `${stats.events.byStatus?.PUBLISHED || 0} published`,
		},
		{
			label: "Kupon",
			value: stats.coupons.total,
			icon: TicketSolid,
			color: "from-amber-500 to-orange-500 dark:from-amber-600 dark:to-orange-600",
			shadow: "shadow-amber-500/20 dark:shadow-amber-900/30",
			link: "/admin/coupons",
			detail: `${stats.coupons.available} tersedia`,
		},
		{
			label: "Total Pendaftaran",
			value: stats.registrations.total,
			icon: ChartBarSolid,
			color: "from-purple-500 to-violet-600 dark:from-purple-600 dark:to-violet-700",
			shadow: "shadow-purple-500/20 dark:shadow-purple-900/30",
			link: "#",
			detail: `${stats.registrations.byStatus?.REGISTERED || 0} terdaftar`,
		},
	];

	return (
		<div className="p-4 sm:p-6 lg:p-8 space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
					<p className="text-gray-500 dark:text-gray-400 mt-1">Selamat datang kembali, {user?.name}</p>
				</div>
				<button
					onClick={fetchStats}
					className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/60 dark:border-gray-700/40 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
				>
					<ArrowPathIcon className="w-4 h-4" />
					Refresh
				</button>
			</div>

			{/* Stat Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
				{statCards.map((card) => (
					<Link
						key={card.label}
						to={card.link}
						className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.color} p-5 sm:p-6 text-white shadow-lg ${card.shadow} hover:scale-[1.02] transition-transform group`}
					>
						<div className="flex items-start justify-between">
							<div>
								<p className="text-sm font-medium text-white/80">{card.label}</p>
								<p className="text-3xl font-bold mt-1">{card.value.toLocaleString("id-ID")}</p>
								<p className="text-xs text-white/70 mt-1">{card.detail}</p>
							</div>
							<card.icon className="w-10 h-10 text-white/30 group-hover:text-white/50 transition-colors" />
						</div>
						<div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full" />
					</Link>
				))}
			</div>

			{/* Users by Role + Event Status Distribution */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Users by Role */}
				<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-700/40 p-6">
					<div className="flex items-center gap-3 mb-5">
						<div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
							<UserGroupIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
						</div>
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pengguna per Peran</h2>
					</div>
					<div className="space-y-3">
						{[
							{ role: "SUPERADMIN", label: "Super Admin", color: "bg-red-500 dark:bg-red-600" },
							{ role: "PANITIA", label: "Panitia", color: "bg-blue-500 dark:bg-blue-600" },
							{ role: "JURI", label: "Juri", color: "bg-purple-500 dark:bg-purple-600" },
							{ role: "PESERTA", label: "Peserta", color: "bg-green-500 dark:bg-green-600" },
							{ role: "PELATIH", label: "Pelatih", color: "bg-orange-500 dark:bg-orange-600" },
							{ role: "MITRA", label: "Mitra", color: "bg-rose-500 dark:bg-rose-600" },
						].map((item) => {
							const count = stats.users.byRole[item.role] || 0;
							const pct = stats.users.total > 0 ? Math.round((count / stats.users.total) * 100) : 0;
							return (
								<div key={item.role} className="flex items-center gap-3">
									<span className="text-sm text-gray-600 dark:text-gray-400 w-24 shrink-0">{item.label}</span>
									<div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
										<div className={`h-full rounded-full ${item.color} transition-all duration-500`} style={{ width: `${pct}%` }} />
									</div>
									<span className="text-sm font-semibold text-gray-900 dark:text-white w-12 text-right">{count}</span>
								</div>
							);
						})}
					</div>
					<div className="mt-4 pt-4 border-t border-gray-200/60 dark:border-gray-700/40 flex items-center justify-between">
						<span className="text-sm text-gray-500 dark:text-gray-400">Pending: {stats.users.byStatus?.PENDING || 0}</span>
						<Link to="/admin/users" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">Lihat Semua →</Link>
					</div>
				</div>

				{/* Event Status Distribution */}
				<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-700/40 p-6">
					<div className="flex items-center gap-3 mb-5">
						<div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
							<CalendarIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
						</div>
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white">Status Event</h2>
					</div>
					<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
						{[
							{ status: "DRAFT", label: "Draft", icon: DocumentTextIcon, bg: "bg-gray-50 dark:bg-gray-700/50", text: "text-gray-600 dark:text-gray-300", iconColor: "text-gray-400 dark:text-gray-500" },
							{ status: "PUBLISHED", label: "Published", icon: EyeIcon, bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-700 dark:text-blue-400", iconColor: "text-blue-400 dark:text-blue-500" },
							{ status: "ONGOING", label: "Berlangsung", icon: ArrowTrendingUpIcon, bg: "bg-green-50 dark:bg-green-900/20", text: "text-green-700 dark:text-green-400", iconColor: "text-green-400 dark:text-green-500" },
							{ status: "COMPLETED", label: "Selesai", icon: CheckCircleIcon, bg: "bg-purple-50 dark:bg-purple-900/20", text: "text-purple-700 dark:text-purple-400", iconColor: "text-purple-400 dark:text-purple-500" },
							{ status: "CANCELLED", label: "Dibatalkan", icon: XCircleIcon, bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-700 dark:text-red-400", iconColor: "text-red-400 dark:text-red-500" },
						].map((item) => (
							<div key={item.status} className={`${item.bg} rounded-xl p-4 text-center`}>
								<item.icon className={`w-6 h-6 ${item.iconColor} mx-auto mb-2`} />
								<p className={`text-2xl font-bold ${item.text}`}>{stats.events.byStatus[item.status] || 0}</p>
								<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.label}</p>
							</div>
						))}
					</div>
					<div className="mt-4 pt-4 border-t border-gray-200/60 dark:border-gray-700/40 flex items-center justify-between">
						<span className="text-sm text-gray-500 dark:text-gray-400">Total: {stats.events.total} event</span>
						<Link to="/admin/events" className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline">Lihat Semua →</Link>
					</div>
				</div>
			</div>

			{/* Activity Summary + Coupon Status */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Activity Summary */}
				<div className="lg:col-span-2 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-700/40 p-6">
					<div className="flex items-center gap-3 mb-5">
						<div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
							<ChartBarIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
						</div>
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ringkasan Aktivitas</h2>
					</div>
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
						{[
							{ label: "Penilaian", value: stats.activity.evaluations, icon: ClipboardDocumentListIcon, color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-900/20" },
							{ label: "Komentar", value: stats.activity.comments, icon: ChatBubbleLeftRightIcon, color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-50 dark:bg-pink-900/20" },
							{ label: "Likes", value: stats.activity.likes, icon: HeartIcon, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-900/20" },
							{ label: "Kategori Nilai", value: stats.categories.assessment, icon: AcademicCapIcon, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
						].map((item) => (
							<div key={item.label} className={`${item.bg} rounded-xl p-4`}>
								<item.icon className={`w-7 h-7 ${item.color} mb-2`} />
								<p className="text-2xl font-bold text-gray-900 dark:text-white">{item.value.toLocaleString("id-ID")}</p>
								<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.label}</p>
							</div>
						))}
					</div>
				</div>

				{/* Coupon Status */}
				<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-700/40 p-6">
					<div className="flex items-center gap-3 mb-5">
						<div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
							<TicketIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
						</div>
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white">Status Kupon</h2>
					</div>
					<div className="space-y-4">
						<div className="flex items-center justify-center">
							<div className="relative w-32 h-32">
								<svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
									<circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="12" className="text-gray-100 dark:text-gray-700" />
									<circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round"
										strokeDasharray={`${stats.coupons.total > 0 ? (stats.coupons.used / stats.coupons.total) * 251.2 : 0} 251.2`}
										className="text-amber-500 dark:text-amber-400"
									/>
								</svg>
								<div className="absolute inset-0 flex flex-col items-center justify-center">
									<span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.coupons.total}</span>
									<span className="text-xs text-gray-500 dark:text-gray-400">Total</span>
								</div>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
								<p className="text-lg font-bold text-green-700 dark:text-green-400">{stats.coupons.available}</p>
								<p className="text-xs text-gray-500 dark:text-gray-400">Tersedia</p>
							</div>
							<div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
								<p className="text-lg font-bold text-gray-700 dark:text-gray-300">{stats.coupons.used}</p>
								<p className="text-xs text-gray-500 dark:text-gray-400">Terpakai</p>
							</div>
						</div>
						<Link to="/admin/coupons" className="block text-center text-sm font-medium text-amber-600 dark:text-amber-400 hover:underline">Kelola Kupon →</Link>
					</div>
				</div>
			</div>

			{/* Upcoming Events */}
			{stats.events.upcoming.length > 0 && (
				<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-700/40 p-6">
					<div className="flex items-center gap-3 mb-5">
						<div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
							<ClockIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
						</div>
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white">Event Mendatang</h2>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
						{stats.events.upcoming.map((event) => {
							const statusInfo = getEventStatusBadge(event.status);
							return (
								<Link
									key={event.id}
									to={`/admin/events/${event.slug}/manage`}
									className="group bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4 border border-gray-100 dark:border-gray-600 hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-md transition-all"
								>
									<div className="flex items-start justify-between mb-2">
										<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusInfo.class}`}>{statusInfo.label}</span>
										<UsersIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
									</div>
									<h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2 mb-2">{event.title}</h3>
									<div className="space-y-1">
										<div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
											<CalendarIcon className="w-3.5 h-3.5 shrink-0" />
											{formatDate(event.startDate)}
										</div>
										{event.city && (
											<div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
												<MapPinIcon className="w-3.5 h-3.5 shrink-0" />
												<span className="truncate">{event.city}</span>
											</div>
										)}
										<div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
											<UsersIcon className="w-3.5 h-3.5 shrink-0" />
											{event._count.participations} peserta
										</div>
									</div>
								</Link>
							);
						})}
					</div>
				</div>
			)}

			{/* Recent Users + Recent Registrations */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Recent Users */}
				<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-700/40">
					<div className="px-6 py-4 border-b border-gray-200/60 dark:border-gray-700/40 flex items-center gap-3">
						<div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
							<UserGroupIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
						</div>
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pengguna Terbaru</h2>
					</div>
					<div className="divide-y divide-gray-50 dark:divide-gray-700/50">
						{stats.users.recent.length === 0 ? (
							<div className="p-8 text-center text-gray-400 dark:text-gray-500">Belum ada pengguna baru minggu ini</div>
						) : (
							stats.users.recent.slice(0, 6).map((u) => (
								<div key={u.id} className="px-6 py-3.5 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
									<div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 dark:from-blue-500 dark:to-violet-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
										{u.name?.charAt(0)?.toUpperCase() || "?"}
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.name}</p>
										<p className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email}</p>
									</div>
									<div className="flex flex-col items-end gap-1 shrink-0">
										<span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getRoleBadge(u.role)}`}>{u.role}</span>
										<span className="text-[10px] text-gray-400 dark:text-gray-500">{timeAgo(u.createdAt)}</span>
									</div>
								</div>
							))
						)}
					</div>
					{stats.users.recent.length > 0 && (
						<div className="px-6 py-3 border-t border-gray-200/60 dark:border-gray-700/40">
							<Link to="/admin/users" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">Lihat semua pengguna →</Link>
						</div>
					)}
				</div>

				{/* Recent Registrations */}
				<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-700/40">
					<div className="px-6 py-4 border-b border-gray-200/60 dark:border-gray-700/40 flex items-center gap-3">
						<div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
							<ClipboardDocumentListIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
						</div>
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pendaftaran Terbaru</h2>
					</div>
					<div className="divide-y divide-gray-50 dark:divide-gray-700/50">
						{stats.registrations.recent.length === 0 ? (
							<div className="p-8 text-center text-gray-400 dark:text-gray-500">Belum ada pendaftaran</div>
						) : (
							stats.registrations.recent.slice(0, 6).map((reg) => (
								<div key={reg.id} className="px-6 py-3.5 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
									<div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-violet-600 dark:from-purple-500 dark:to-pink-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
										{reg.user?.name?.charAt(0)?.toUpperCase() || "?"}
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium text-gray-900 dark:text-white truncate">{reg.user?.name || "Unknown"}</p>
										<p className="text-xs text-gray-500 dark:text-gray-400 truncate">{reg.event?.title || "Unknown Event"}</p>
									</div>
									<div className="flex flex-col items-end gap-1 shrink-0">
										<span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusBadge(reg.status)}`}>{reg.status}</span>
										<span className="text-[10px] text-gray-400 dark:text-gray-500">{timeAgo(reg.createdAt)}</span>
									</div>
								</div>
							))
						)}
					</div>
				</div>
			</div>

			{/* Recent Events Table */}
			<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-700/40">
				<div className="px-6 py-4 border-b border-gray-200/60 dark:border-gray-700/40 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
							<CalendarIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
						</div>
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white">Event Terbaru</h2>
					</div>
					<Link to="/admin/events" className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline">Lihat Semua →</Link>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead>
							<tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
								<th className="px-6 py-3">Event</th>
								<th className="px-6 py-3">Pembuat</th>
								<th className="px-6 py-3">Status</th>
								<th className="px-6 py-3">Tanggal</th>
								<th className="px-6 py-3"></th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
							{stats.events.recent.slice(0, 8).map((event) => {
								const statusInfo = getEventStatusBadge(event.status);
								return (
									<tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
										<td className="px-6 py-3.5">
											<p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">{event.title}</p>
										</td>
										<td className="px-6 py-3.5">
											<p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[150px]">{event.createdBy?.name || event.createdBy?.email}</p>
										</td>
										<td className="px-6 py-3.5">
											<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${statusInfo.class}`}>{statusInfo.label}</span>
										</td>
										<td className="px-6 py-3.5 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(event.createdAt)}</td>
										<td className="px-6 py-3.5">
											<Link to={`/admin/events/${event.slug}/manage`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Detail</Link>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>

			{/* Quick Actions */}
			<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-700/40 p-6">
				<div className="flex items-center gap-3 mb-5">
					<div className="p-2 bg-gray-100 dark:bg-gray-700/50 rounded-xl">
						<CogIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
					</div>
					<h2 className="text-lg font-semibold text-gray-900 dark:text-white">Aksi Cepat</h2>
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
					{[
						{ label: "Kelola Users", icon: UserGroupIcon, to: "/admin/users", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40" },
						{ label: "Kelola Kupon", icon: TicketIcon, to: "/admin/coupons", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40" },
						{ label: "Kelola Event", icon: CalendarIcon, to: "/admin/events", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40" },
						{ label: "Kategori Penilaian", icon: AcademicCapIcon, to: "/admin/assessment-categories", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40" },
						{ label: "Profil Admin", icon: CogIcon, to: "/admin/profile", color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700" },
					].map((action) => (
						<Link key={action.label} to={action.to} className={`flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200/60 dark:border-gray-700/40 ${action.bg} transition-colors`}>
							<action.icon className={`w-7 h-7 ${action.color}`} />
							<span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center">{action.label}</span>
						</Link>
					))}
				</div>
			</div>
		</div>
	);
};

export default AdminDashboard;
