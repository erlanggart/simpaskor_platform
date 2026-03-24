import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../utils/api";
import { useAuth } from "../../hooks/useAuth";
import { 
	TrophyIcon, 
	CalendarIcon, 
	ChartBarIcon,
	ArrowRightIcon,
	ClipboardDocumentListIcon,
	UserGroupIcon,
	ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

interface Statistics {
	totalEvents: number;
	eventsWithScores: number;
	totalScore: number;
	totalMaterialsEvaluated: number;
	averageScore: number | null;
}

interface RecentEvent {
	id: string;
	status: string;
	event: {
		id: string;
		title: string;
		slug: string;
		startDate: string;
		thumbnail: string | null;
	};
}

const PesertaDashboard: React.FC = () => {
	const { user } = useAuth();
	const [statistics, setStatistics] = useState<Statistics | null>(null);
	const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchData();
	}, []);

	const fetchData = async () => {
		try {
			setLoading(true);
			const [statsRes, eventsRes] = await Promise.all([
				api.get("/evaluations/my-statistics"),
				api.get("/evaluations/my-events"),
			]);
			setStatistics(statsRes.data);
			setRecentEvents(eventsRes.data?.slice(0, 3) || []);
		} catch (error) {
			console.error("Error fetching data:", error);
		} finally {
			setLoading(false);
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "short",
			year: "numeric",
		});
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
						Dashboard Peserta
					</h1>
					<p className="text-gray-600 dark:text-gray-400">
						Selamat datang! Lihat ringkasan aktivitas dan penilaian Anda
					</p>
				</div>

				{/* Unverified Account Banner */}
				{user && (user.status === "PENDING" || !user.emailVerified) && (
					<div className="mb-8 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl p-4">
						<div className="flex items-start gap-3">
							<ExclamationTriangleIcon className="h-6 w-6 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
							<div>
								<h3 className="font-semibold text-amber-800 dark:text-amber-300">
									Akun Belum Diverifikasi
								</h3>
								<p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
									Akun Anda masih berstatus <span className="font-medium">Pending</span>. 
									Hubungi admin atau panitia event untuk verifikasi akun Anda agar dapat mengikuti event dan mendapatkan penilaian.
								</p>
							</div>
						</div>
					</div>
				)}

				{/* Statistics Cards */}
				<div className="mb-8">
					<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
						Statistik Penilaian
					</h2>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						<div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
							<div className="flex items-center gap-3">
								<div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
									<CalendarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
								</div>
								<div>
									<div className="text-2xl font-bold text-gray-900 dark:text-white">
										{statistics?.totalEvents || 0}
									</div>
									<div className="text-xs text-gray-500 dark:text-gray-400">
										Event Diikuti
									</div>
								</div>
							</div>
						</div>
						<div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
							<div className="flex items-center gap-3">
								<div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
									<TrophyIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
								</div>
								<div>
									<div className="text-2xl font-bold text-gray-900 dark:text-white">
										{statistics?.eventsWithScores || 0}
									</div>
									<div className="text-xs text-gray-500 dark:text-gray-400">
										Sudah Dinilai
									</div>
								</div>
							</div>
						</div>
						<div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
							<div className="flex items-center gap-3">
								<div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
									<ChartBarIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
								</div>
								<div>
									<div className="text-2xl font-bold text-gray-900 dark:text-white">
										{statistics?.totalScore?.toFixed(1) || "0"}
									</div>
									<div className="text-xs text-gray-500 dark:text-gray-400">
										Total Nilai
									</div>
								</div>
							</div>
						</div>
						<div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
							<div className="flex items-center gap-3">
								<div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
									<TrophyIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
								</div>
								<div>
									<div className="text-2xl font-bold text-gray-900 dark:text-white">
										{statistics?.averageScore?.toFixed(2) || "-"}
									</div>
									<div className="text-xs text-gray-500 dark:text-gray-400">
										Rata-rata
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Quick Links */}
				<div className="mb-8">
					<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
						Menu Cepat
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<Link
							to="/peserta/events"
							className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-md p-6 text-white hover:from-blue-600 hover:to-blue-700 transition-all"
						>
							<div className="flex items-center gap-4">
								<div className="p-3 bg-white/20 rounded-xl">
									<CalendarIcon className="h-8 w-8" />
								</div>
								<div>
									<h3 className="font-semibold text-lg">Event Tersedia</h3>
									<p className="text-blue-100 text-sm">Cari dan daftar event baru</p>
								</div>
							</div>
						</Link>
						<Link
							to="/peserta/registrations"
							className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-md p-6 text-white hover:from-green-600 hover:to-green-700 transition-all"
						>
							<div className="flex items-center gap-4">
								<div className="p-3 bg-white/20 rounded-xl">
									<ClipboardDocumentListIcon className="h-8 w-8" />
								</div>
								<div>
									<h3 className="font-semibold text-lg">Pendaftaran Saya</h3>
									<p className="text-green-100 text-sm">Lihat status pendaftaran</p>
								</div>
							</div>
						</Link>
						<Link
							to="/peserta/assessment-history"
							className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-md p-6 text-white hover:from-purple-600 hover:to-purple-700 transition-all"
						>
							<div className="flex items-center gap-4">
								<div className="p-3 bg-white/20 rounded-xl">
									<ChartBarIcon className="h-8 w-8" />
								</div>
								<div>
									<h3 className="font-semibold text-lg">Riwayat Penilaian</h3>
									<p className="text-purple-100 text-sm">Lihat nilai dari juri</p>
								</div>
							</div>
						</Link>
					</div>
				</div>

				{/* Recent Events */}
				{recentEvents.length > 0 && (
					<div>
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
								Event Terakhir Diikuti
							</h2>
							<Link
								to="/peserta/assessment-history"
								className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1"
							>
								Lihat Semua
								<ArrowRightIcon className="h-4 w-4" />
							</Link>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							{recentEvents.map((participation) => (
								<Link
									key={participation.id}
									to={`/peserta/assessment-history/${participation.event.slug}`}
									className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
								>
									<div className="h-32 bg-gray-200 dark:bg-gray-700">
										{participation.event.thumbnail ? (
											<img
												src={participation.event.thumbnail}
												alt={participation.event.title}
												className="w-full h-full object-cover"
											/>
										) : (
											<div className="w-full h-full flex items-center justify-center">
												<UserGroupIcon className="h-12 w-12 text-gray-400" />
											</div>
										)}
									</div>
									<div className="p-4">
										<h3 className="font-medium text-gray-900 dark:text-white line-clamp-1">
											{participation.event.title}
										</h3>
										<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
											{formatDate(participation.event.startDate)}
										</p>
									</div>
								</Link>
							))}
						</div>
					</div>
				)}

				{/* Empty State */}
				{!statistics?.totalEvents && (
					<div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 text-center">
						<UserGroupIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
						<h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
							Belum Ada Event
						</h3>
						<p className="text-gray-500 dark:text-gray-400 mb-6">
							Anda belum terdaftar di event manapun. Mulai dengan mencari event yang tersedia.
						</p>
						<Link
							to="/peserta/events"
							className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
						>
							<CalendarIcon className="h-5 w-5 mr-2" />
							Cari Event
						</Link>
					</div>
				)}
			</div>
		</div>
	);
};

export default PesertaDashboard;