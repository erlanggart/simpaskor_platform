import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
	CalendarIcon,
	MapPinIcon,
	UsersIcon,
	CurrencyDollarIcon,
	UserGroupIcon,
	TrophyIcon,
	PencilSquareIcon,
	ArrowLeftIcon,
	BookOpenIcon,
	ChartBarIcon,
	ExclamationTriangleIcon,
	CheckCircleIcon,
	ClockIcon,
	XCircleIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../utils/api";

interface SchoolCategoryLimit {
	id: string;
	maxParticipants: number;
	currentParticipants?: number;
	schoolCategory: {
		id: string;
		name: string;
	};
}

interface EventAssessmentCategory {
	id: string;
	eventId: string;
	assessmentCategoryId: string;
	customWeight: number | null;
	customMaxScore: number | null;
	isRequired: boolean;
	assessmentCategory: {
		id: string;
		name: string;
		description: string | null;
		order: number;
		isActive: boolean;
	};
}

interface JuryAssignment {
	id: string;
	status: string;
	notes: string | null;
	jury: {
		id: string;
		name: string;
		email: string;
		profile?: {
			avatar: string | null;
			institution: string | null;
		};
	};
	assignedCategories: {
		assessmentCategory: {
			id: string;
			name: string;
		};
	}[];
}

interface Event {
	id: string;
	title: string;
	slug: string | null;
	description: string | null;
	startDate: string;
	endDate: string;
	registrationDeadline: string | null;
	location: string | null;
	venue: string | null;
	maxParticipants: number | null;
	currentParticipants: number;
	registrationFee: number | null;
	organizer: string | null;
	organizerEmail: string | null;
	contactEmail: string | null;
	contactPhone: string | null;
	status: string;
	thumbnail: string | null;
	juknisUrl: string | null;
	category: string | null;
	level: string | null;
	featured: boolean;
	isPinned: boolean;
	schoolCategoryLimits?: SchoolCategoryLimit[];
	assessmentCategories?: EventAssessmentCategory[];
	juryAssignments?: JuryAssignment[];
	createdBy?: {
		id: string;
		name: string;
		email: string;
	};
}

interface Participant {
	id: string;
	teamName: string;
	orderNumber: number | null;
	status: string;
	schoolCategory: {
		id: string;
		name: string;
	} | null;
	user: {
		id: string;
		name: string;
		email: string;
		profile?: {
			institution: string | null;
		};
	};
}

interface Material {
	id: string;
	name: string;
	description: string | null;
	order: number;
	isActive: boolean;
	createdAt: string;
}

type TabType = "info" | "panitia" | "juri" | "peserta" | "materi" | "rekap";

const AdminEventDetail: React.FC = () => {
	const { eventId } = useParams<{ eventId: string }>();
	const navigate = useNavigate();
	const [event, setEvent] = useState<Event | null>(null);
	const [participants, setParticipants] = useState<Participant[]>([]);
	const [materials, setMaterials] = useState<Material[]>([]);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState<TabType>("info");

	useEffect(() => {
		if (eventId) {
			fetchEventDetails();
		}
	}, [eventId]);

	useEffect(() => {
		if (event && activeTab === "peserta") {
			fetchParticipants();
		}
		if (event && activeTab === "materi") {
			fetchMaterials();
		}
	}, [event, activeTab]);

	const fetchEventDetails = async () => {
		try {
			setLoading(true);
			const response = await api.get(`/events/${eventId}`);
			setEvent(response.data);
		} catch (error) {
			console.error("Error fetching event:", error);
		} finally {
			setLoading(false);
		}
	};

	const fetchParticipants = async () => {
		if (!event) return;
		try {
			const response = await api.get(`/events/${event.slug || event.id}/registrations`);
			setParticipants(response.data || []);
		} catch (error) {
			console.error("Error fetching participants:", error);
		}
	};

	const fetchMaterials = async () => {
		if (!event) return;
		try {
			const response = await api.get(`/events/${event.slug || event.id}/materials`);
			setMaterials(response.data || []);
		} catch (error) {
			console.error("Error fetching materials:", error);
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	};

	const formatCurrency = (amount: number | null) => {
		if (!amount) return "Gratis";
		return new Intl.NumberFormat("id-ID", {
			style: "currency",
			currency: "IDR",
			minimumFractionDigits: 0,
		}).format(amount);
	};

	const getImageUrl = (path: string | null) => {
		if (!path) return null;
		if (path.startsWith("http://") || path.startsWith("https://")) {
			return path;
		}
		const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
		return `${backendUrl}${path}`;
	};

	const getStatusConfig = (status: string) => {
		const configs: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
			DRAFT: {
				color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
				icon: <ExclamationTriangleIcon className="w-4 h-4" />,
				label: "Draft",
			},
			PUBLISHED: {
				color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
				icon: <CheckCircleIcon className="w-4 h-4" />,
				label: "Published",
			},
			ONGOING: {
				color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
				icon: <ClockIcon className="w-4 h-4" />,
				label: "Ongoing",
			},
			COMPLETED: {
				color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
				icon: <CheckCircleIcon className="w-4 h-4" />,
				label: "Completed",
			},
			CANCELLED: {
				color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
				icon: <XCircleIcon className="w-4 h-4" />,
				label: "Cancelled",
			},
		};
		return configs[status] || configs.DRAFT;
	};

	const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
		{ key: "info", label: "Informasi", icon: <CalendarIcon className="w-5 h-5" /> },
		{ key: "panitia", label: "Panitia", icon: <UserGroupIcon className="w-5 h-5" /> },
		{ key: "juri", label: "Juri", icon: <TrophyIcon className="w-5 h-5" /> },
		{ key: "peserta", label: "Peserta", icon: <UsersIcon className="w-5 h-5" /> },
		{ key: "materi", label: "Materi", icon: <BookOpenIcon className="w-5 h-5" /> },
		{ key: "rekap", label: "Rekapitulasi", icon: <ChartBarIcon className="w-5 h-5" /> },
	];

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
			</div>
		);
	}

	if (!event) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
				<div className="text-center">
					<h2 className="text-xl font-semibold text-gray-900 dark:text-white">Event tidak ditemukan</h2>
					<button
						onClick={() => navigate("/admin/events")}
						className="mt-4 text-red-600 hover:text-red-700"
					>
						Kembali ke Event Management
					</button>
				</div>
			</div>
		);
	}

	const statusConfig = getStatusConfig(event.status);

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			{/* Header */}
			<header className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900/50">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between py-6">
						<div className="flex items-center gap-4">
							<button
								onClick={() => navigate("/admin/events")}
								className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
							>
								<ArrowLeftIcon className="w-5 h-5" />
							</button>
							<div>
								<div className="flex items-center gap-3">
									<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
										{event.title}
									</h1>
									<span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
										{statusConfig.icon}
										{statusConfig.label}
									</span>
								</div>
								<p className="text-gray-600 dark:text-gray-400 mt-1">
									{event.organizer || "No organizer"}
								</p>
							</div>
						</div>
						<Link
							to={`/admin/events/${event.id}/edit`}
							className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
						>
							<PencilSquareIcon className="w-5 h-5" />
							Edit Event
						</Link>
					</div>
				</div>
			</header>

			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Tabs */}
				<div className="border-b border-gray-200 dark:border-gray-700 mb-6">
					<nav className="flex space-x-8 overflow-x-auto" aria-label="Tabs">
						{tabs.map((tab) => (
							<button
								key={tab.key}
								onClick={() => setActiveTab(tab.key)}
								className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
									activeTab === tab.key
										? "border-red-500 text-red-600 dark:text-red-400"
										: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
								}`}
							>
								{tab.icon}
								{tab.label}
							</button>
						))}
					</nav>
				</div>

				{/* Tab Content */}
				{activeTab === "info" && (
					<div className="space-y-6">
						{/* Event Thumbnail & Basic Info */}
						<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
							<div className="md:flex">
								{event.thumbnail && (
									<div className="md:w-1/3">
										<img
											src={getImageUrl(event.thumbnail) || ""}
											alt={event.title}
											className="w-full h-64 md:h-full object-cover"
										/>
									</div>
								)}
								<div className={`p-6 ${event.thumbnail ? "md:w-2/3" : "w-full"}`}>
									<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Informasi Event</h3>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="flex items-start gap-3">
											<CalendarIcon className="w-5 h-5 text-gray-400 mt-0.5" />
											<div>
												<p className="text-sm text-gray-500 dark:text-gray-400">Tanggal</p>
												<p className="text-gray-900 dark:text-white">
													{formatDate(event.startDate)} - {formatDate(event.endDate)}
												</p>
											</div>
										</div>
										<div className="flex items-start gap-3">
											<MapPinIcon className="w-5 h-5 text-gray-400 mt-0.5" />
											<div>
												<p className="text-sm text-gray-500 dark:text-gray-400">Lokasi</p>
												<p className="text-gray-900 dark:text-white">{event.location || "-"}</p>
												{event.venue && (
													<p className="text-sm text-gray-600 dark:text-gray-400">{event.venue}</p>
												)}
											</div>
										</div>
										<div className="flex items-start gap-3">
											<UsersIcon className="w-5 h-5 text-gray-400 mt-0.5" />
											<div>
												<p className="text-sm text-gray-500 dark:text-gray-400">Peserta</p>
												<p className="text-gray-900 dark:text-white">
													{event.currentParticipants} / {event.maxParticipants || "∞"}
												</p>
											</div>
										</div>
										<div className="flex items-start gap-3">
											<CurrencyDollarIcon className="w-5 h-5 text-gray-400 mt-0.5" />
											<div>
												<p className="text-sm text-gray-500 dark:text-gray-400">Biaya Registrasi</p>
												<p className="text-gray-900 dark:text-white">{formatCurrency(event.registrationFee)}</p>
											</div>
										</div>
										{event.registrationDeadline && (
											<div className="flex items-start gap-3">
												<ClockIcon className="w-5 h-5 text-gray-400 mt-0.5" />
												<div>
													<p className="text-sm text-gray-500 dark:text-gray-400">Batas Registrasi</p>
													<p className="text-gray-900 dark:text-white">{formatDate(event.registrationDeadline)}</p>
												</div>
											</div>
										)}
									</div>
									{event.description && (
										<div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
											<h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Deskripsi</h4>
											<p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{event.description}</p>
										</div>
									)}
								</div>
							</div>
						</div>

						{/* School Category Limits */}
						{event.schoolCategoryLimits && event.schoolCategoryLimits.length > 0 && (
							<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
								<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Kuota per Kategori Sekolah</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
									{event.schoolCategoryLimits.map((limit) => (
										<div key={limit.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
											<p className="font-medium text-gray-900 dark:text-white">{limit.schoolCategory.name}</p>
											<p className="text-sm text-gray-600 dark:text-gray-400">
												{limit.currentParticipants || 0} / {limit.maxParticipants} peserta
											</p>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Assessment Categories */}
						{event.assessmentCategories && event.assessmentCategories.length > 0 && (
							<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
								<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Kategori Penilaian</h3>
								<div className="flex flex-wrap gap-2">
									{event.assessmentCategories.map((cat) => (
										<span
											key={cat.id}
											className="px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-medium"
										>
											{cat.assessmentCategory.name}
										</span>
									))}
								</div>
							</div>
						)}
					</div>
				)}

				{activeTab === "panitia" && (
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Panitia Event</h3>
						{event.createdBy ? (
							<div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
								<div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
									<span className="text-red-600 dark:text-red-400 font-semibold text-lg">
										{event.createdBy.name.charAt(0).toUpperCase()}
									</span>
								</div>
								<div>
									<p className="font-medium text-gray-900 dark:text-white">{event.createdBy.name}</p>
									<p className="text-sm text-gray-500 dark:text-gray-400">{event.createdBy.email}</p>
									<span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded">
										Creator / Penyelenggara
									</span>
								</div>
							</div>
						) : (
							<p className="text-gray-500 dark:text-gray-400">Tidak ada data panitia</p>
						)}
					</div>
				)}

				{activeTab === "juri" && (
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
							Daftar Juri ({event.juryAssignments?.length || 0})
						</h3>
						{event.juryAssignments && event.juryAssignments.length > 0 ? (
							<div className="space-y-4">
								{event.juryAssignments.map((assignment) => (
									<div key={assignment.id} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
										<div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center flex-shrink-0">
											<span className="text-yellow-600 dark:text-yellow-400 font-semibold text-lg">
												{assignment.jury.name.charAt(0).toUpperCase()}
											</span>
										</div>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2">
												<p className="font-medium text-gray-900 dark:text-white">{assignment.jury.name}</p>
												<span className={`px-2 py-0.5 rounded text-xs font-medium ${
													assignment.status === "ACCEPTED"
														? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
														: assignment.status === "PENDING"
														? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
														: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
												}`}>
													{assignment.status}
												</span>
											</div>
											<p className="text-sm text-gray-500 dark:text-gray-400">{assignment.jury.email}</p>
											{assignment.jury.profile?.institution && (
												<p className="text-sm text-gray-500 dark:text-gray-400">{assignment.jury.profile.institution}</p>
											)}
											{assignment.assignedCategories.length > 0 && (
												<div className="flex flex-wrap gap-1 mt-2">
													{assignment.assignedCategories.map((cat) => (
														<span
															key={cat.assessmentCategory.id}
															className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-xs"
														>
															{cat.assessmentCategory.name}
														</span>
													))}
												</div>
											)}
										</div>
									</div>
								))}
							</div>
						) : (
							<p className="text-gray-500 dark:text-gray-400">Belum ada juri yang ditugaskan</p>
						)}
					</div>
				)}

				{activeTab === "peserta" && (
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
							Daftar Peserta ({participants.length})
						</h3>
						{participants.length > 0 ? (
							<div className="overflow-x-auto">
								<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
									<thead className="bg-gray-50 dark:bg-gray-700">
										<tr>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">No.</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tim</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Pendaftar</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Kategori</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-200 dark:divide-gray-700">
										{participants.map((p, idx) => (
											<tr key={p.id}>
												<td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{p.orderNumber || idx + 1}</td>
												<td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{p.teamName || "-"}</td>
												<td className="px-4 py-3">
													<p className="text-sm text-gray-900 dark:text-white">{p.user.name}</p>
													<p className="text-xs text-gray-500 dark:text-gray-400">{p.user.email}</p>
												</td>
												<td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
													{p.schoolCategory?.name || "-"}
												</td>
												<td className="px-4 py-3">
													<span className={`px-2 py-1 rounded text-xs font-medium ${
														p.status === "CONFIRMED"
															? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
															: p.status === "PENDING"
															? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
															: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
													}`}>
														{p.status}
													</span>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<p className="text-gray-500 dark:text-gray-400">Belum ada peserta terdaftar</p>
						)}
					</div>
				)}

				{activeTab === "materi" && (
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
							Daftar Materi ({materials.length})
						</h3>
						{materials.length > 0 ? (
							<div className="space-y-3">
								{materials.map((material, idx) => (
									<div key={material.id} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
										<div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
											<span className="text-blue-600 dark:text-blue-400 font-semibold">{material.order || idx + 1}</span>
										</div>
										<div>
											<p className="font-medium text-gray-900 dark:text-white">{material.name}</p>
											{material.description && (
												<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{material.description}</p>
											)}
											<span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${
												material.isActive
													? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
													: "bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300"
											}`}>
												{material.isActive ? "Aktif" : "Nonaktif"}
											</span>
										</div>
									</div>
								))}
							</div>
						) : (
							<p className="text-gray-500 dark:text-gray-400">Belum ada materi</p>
						)}
					</div>
				)}

				{activeTab === "rekap" && (
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Rekapitulasi Penilaian</h3>
						<p className="text-gray-600 dark:text-gray-400 mb-4">
							Lihat rekapitulasi lengkap penilaian untuk event ini.
						</p>
						<Link
							to={`/admin/events/${event.slug || event.id}/rekapitulasi`}
							className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
						>
							<ChartBarIcon className="w-5 h-5" />
							Lihat Rekapitulasi Lengkap
						</Link>
					</div>
				)}
			</main>
		</div>
	);
};

export default AdminEventDetail;
