import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
	CalendarIcon,
	MapPinIcon,
	UsersIcon,
	CurrencyDollarIcon,
	UserGroupIcon,
	TrophyIcon,
	ClockIcon,
	CheckCircleIcon,
	DocumentArrowDownIcon,
	EyeIcon,
	ArrowPathIcon,
	ArrowLeftIcon,
	PencilSquareIcon,
} from "@heroicons/react/24/outline";
import Swal from "sweetalert2";
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
	jury: {
		id: string;
		name: string;
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

interface ParticipantSummary {
	schoolName: string;
	teamCount: number;
	teams: { name: string; category: string | null }[];
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
	status: string;
	thumbnail: string | null;
	juknisUrl: string | null;
	category: string | null;
	level: string | null;
	featured: boolean;
	schoolCategoryLimits?: SchoolCategoryLimit[];
	assessmentCategories?: EventAssessmentCategory[];
	juryAssignments?: JuryAssignment[];
	createdBy?: {
		id: string;
		name: string;
		email: string;
	};
}

const EVENT_STATUSES = [
	{ value: "DRAFT", label: "Draft", color: "bg-gray-500", description: "Event belum dipublish" },
	{ value: "PUBLISHED", label: "Published", color: "bg-green-500", description: "Event aktif dan tersedia" },
	{ value: "ONGOING", label: "Ongoing", color: "bg-blue-500", description: "Event sedang berlangsung" },
	{ value: "COMPLETED", label: "Completed", color: "bg-purple-500", description: "Event sudah selesai" },
	{ value: "CANCELLED", label: "Cancelled", color: "bg-red-500", description: "Event dibatalkan" },
];

const AdminManageEvent: React.FC = () => {
	const { eventSlug } = useParams<{ eventSlug: string }>();
	const navigate = useNavigate();
	const [event, setEvent] = useState<Event | null>(null);
	const [loading, setLoading] = useState(true);
	const [participantsSummary, setParticipantsSummary] = useState<ParticipantSummary[]>([]);
	const [updatingStatus, setUpdatingStatus] = useState(false);

	useEffect(() => {
		fetchEventDetails();
	}, [eventSlug]);

	const fetchEventDetails = async () => {
		if (!eventSlug) return;
		try {
			setLoading(true);
			const [eventRes, participantsRes] = await Promise.all([
				api.get(`/events/${eventSlug}`),
				api.get(`/events/${eventSlug}/participants-summary`).catch(() => ({ data: [] }))
			]);
			setEvent(eventRes.data);
			setParticipantsSummary(participantsRes.data || []);

			// Update localStorage for admin
			localStorage.setItem(
				"admin_active_event",
				JSON.stringify({ 
					slug: eventRes.data.slug || eventRes.data.id, 
					title: eventRes.data.title, 
					id: eventRes.data.id 
				})
			);
		} catch (error) {
			console.error("Error fetching event details:", error);
			navigate("/admin/events");
		} finally {
			setLoading(false);
		}
	};

	// Clear localStorage and navigate back to event list
	const handleExitManagement = () => {
		localStorage.removeItem("admin_active_event");
		navigate("/admin/events");
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	};

	const getImageUrl = (path: string | null) => {
		if (!path) return null;
		if (path.startsWith("http://") || path.startsWith("https://")) {
			return path;
		}
		const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
		return `${backendUrl}${path}`;
	};

	const formatCurrency = (amount: number | null) => {
		if (!amount) return "Gratis";
		return new Intl.NumberFormat("id-ID", {
			style: "currency",
			currency: "IDR",
			minimumFractionDigits: 0,
		}).format(amount);
	};

	const handleStatusChange = async (newStatus: string) => {
		if (!event || newStatus === event.status) return;

		const statusInfo = EVENT_STATUSES.find(s => s.value === newStatus);
		
		const result = await Swal.fire({
			title: "Ubah Status Event?",
			html: `<p>Status event akan diubah menjadi <strong>${statusInfo?.label}</strong></p><p class="text-sm text-gray-500 mt-2">${statusInfo?.description}</p>`,
			icon: "question",
			showCancelButton: true,
			confirmButtonColor: "#4F46E5",
			cancelButtonColor: "#6B7280",
			confirmButtonText: "Ya, Ubah",
			cancelButtonText: "Batal",
		});

		if (!result.isConfirmed) return;

		try {
			setUpdatingStatus(true);
			const response = await api.patch(`/events/${event.id}/status`, { status: newStatus });
			
			setEvent(prev => prev ? { ...prev, status: newStatus } : null);
			
			Swal.fire({
				title: "Berhasil!",
				text: response.data.message,
				icon: "success",
				timer: 2000,
				showConfirmButton: false,
			});
		} catch (error: any) {
			console.error("Error updating status:", error);
			Swal.fire({
				title: "Gagal!",
				text: error.response?.data?.message || "Gagal mengubah status event",
				icon: "error",
			});
		} finally {
			setUpdatingStatus(false);
		}
	};

	const totalParticipants = participantsSummary.reduce((sum, s) => sum + s.teamCount, 0);

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
					<p className="text-gray-600 dark:text-gray-400">Event tidak ditemukan</p>
					<button
						onClick={handleExitManagement}
						className="mt-4 text-red-600 hover:underline"
					>
						Kembali ke Event Management
					</button>
				</div>
			</div>
		);
	}

	const currentStatusInfo = EVENT_STATUSES.find(s => s.value === event.status) || EVENT_STATUSES[0];

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
				{/* Back Button */}
				<div className="mb-4">
					<button
						onClick={handleExitManagement}
						className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
					>
						<ArrowLeftIcon className="w-4 h-4 mr-1" />
						Kembali ke Event Management
					</button>
				</div>

				{/* Event Header */}
				<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden mb-6">
					<div className="md:flex">
						{/* Thumbnail */}
						<div className="md:w-1/3 relative">
							{event.thumbnail ? (
								<img
									src={getImageUrl(event.thumbnail) || ""}
									alt={event.title}
									className="w-full h-64 md:h-full object-cover"
								/>
							) : (
								<div className="w-full h-64 md:h-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
									<CalendarIcon className="w-24 h-24 text-white/30" />
								</div>
							)}
						</div>

						{/* Event Info */}
						<div className="md:w-2/3 p-6">
							<div className="flex items-start justify-between mb-4">
								<div>
									<h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
										{event.title}
									</h1>
									{event.organizer && (
										<p className="text-gray-600 dark:text-gray-400">
											Oleh: {event.organizer}
										</p>
									)}
									{event.createdBy && (
										<p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
											Dibuat oleh: {event.createdBy.name} ({event.createdBy.email})
										</p>
									)}
								</div>
								<div className="flex items-center gap-2">
									<span className={`${currentStatusInfo.color} text-white px-3 py-1 rounded-full text-sm font-medium`}>
										{currentStatusInfo.label}
									</span>
								</div>
							</div>

							{/* Quick Info Grid */}
							<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
								<div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
									<CalendarIcon className="w-5 h-5 flex-shrink-0" />
									<div>
										<p className="font-medium">{formatDate(event.startDate)}</p>
										<p className="text-xs">s/d {formatDate(event.endDate)}</p>
									</div>
								</div>
								{event.location && (
									<div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
										<MapPinIcon className="w-5 h-5 flex-shrink-0" />
										<div>
											<p className="font-medium">{event.location}</p>
											{event.venue && <p className="text-xs">{event.venue}</p>}
										</div>
									</div>
								)}
								<div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
									<UsersIcon className="w-5 h-5 flex-shrink-0" />
									<div>
										<p className="font-medium">{totalParticipants} Peserta</p>
										<p className="text-xs">dari {event.maxParticipants || "∞"} kuota</p>
									</div>
								</div>
								<div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
									<CurrencyDollarIcon className="w-5 h-5 flex-shrink-0" />
									<div>
										<p className="font-medium">{formatCurrency(event.registrationFee)}</p>
										<p className="text-xs">Biaya pendaftaran</p>
									</div>
								</div>
							</div>

							{/* Status Controls */}
							<div className="flex flex-wrap items-center gap-3">
								<span className="text-sm text-gray-600 dark:text-gray-400">Ubah Status:</span>
								{EVENT_STATUSES.filter(s => ["DRAFT", "PUBLISHED", "CANCELLED"].includes(s.value)).map((status) => (
									<button
										key={status.value}
										onClick={() => handleStatusChange(status.value)}
										disabled={updatingStatus || event.status === status.value}
										className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
											event.status === status.value
												? `${status.color} text-white cursor-default`
												: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
										}`}
									>
										{status.label}
									</button>
								))}
							</div>
						</div>
					</div>
				</div>

				{/* Management Actions Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
					{/* Edit Event */}
					<Link
						to={`/admin/events/${event.id}/edit`}
						className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow group"
					>
						<div className="flex items-center gap-4">
							<div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
								<PencilSquareIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
							</div>
							<div>
								<h3 className="font-semibold text-gray-900 dark:text-white">Edit Event</h3>
								<p className="text-sm text-gray-500 dark:text-gray-400">Ubah informasi event</p>
							</div>
						</div>
					</Link>

					{/* Manage Peserta */}
					<Link
						to={`/admin/events/${event.slug}/peserta`}
						className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow group"
					>
						<div className="flex items-center gap-4">
							<div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
								<UsersIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
							</div>
							<div>
								<h3 className="font-semibold text-gray-900 dark:text-white">Kelola Peserta</h3>
								<p className="text-sm text-gray-500 dark:text-gray-400">{totalParticipants} peserta terdaftar</p>
							</div>
						</div>
					</Link>

					{/* Manage Juri */}
					<Link
						to={`/admin/events/${event.slug}/juri`}
						className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow group"
					>
						<div className="flex items-center gap-4">
							<div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg group-hover:bg-yellow-200 dark:group-hover:bg-yellow-900/50 transition-colors">
								<TrophyIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
							</div>
							<div>
								<h3 className="font-semibold text-gray-900 dark:text-white">Kelola Juri</h3>
								<p className="text-sm text-gray-500 dark:text-gray-400">{event.juryAssignments?.length || 0} juri ditugaskan</p>
							</div>
						</div>
					</Link>

					{/* Manage Materi */}
					<Link
						to={`/admin/events/${event.slug}/materi`}
						className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow group"
					>
						<div className="flex items-center gap-4">
							<div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
								<DocumentArrowDownIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
							</div>
							<div>
								<h3 className="font-semibold text-gray-900 dark:text-white">Kelola Materi</h3>
								<p className="text-sm text-gray-500 dark:text-gray-400">Upload dan atur materi</p>
							</div>
						</div>
					</Link>

					{/* View Rekap */}
					<Link
						to={`/admin/events/${event.slug}/rekapitulasi`}
						className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow group"
					>
						<div className="flex items-center gap-4">
							<div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors">
								<CheckCircleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
							</div>
							<div>
								<h3 className="font-semibold text-gray-900 dark:text-white">Rekapitulasi</h3>
								<p className="text-sm text-gray-500 dark:text-gray-400">Lihat rekap penilaian</p>
							</div>
						</div>
					</Link>

					{/* View Public Event */}
					<Link
						to={`/events/${event.slug}`}
						target="_blank"
						className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow group"
					>
						<div className="flex items-center gap-4">
							<div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg group-hover:bg-gray-200 dark:group-hover:bg-gray-600 transition-colors">
								<EyeIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
							</div>
							<div>
								<h3 className="font-semibold text-gray-900 dark:text-white">Lihat Halaman Publik</h3>
								<p className="text-sm text-gray-500 dark:text-gray-400">Buka di tab baru</p>
							</div>
						</div>
					</Link>
				</div>

				{/* Additional Info Sections */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* School Categories */}
					{event.schoolCategoryLimits && event.schoolCategoryLimits.length > 0 && (
						<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
							<h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
								<UserGroupIcon className="w-5 h-5" />
								Kuota per Kategori
							</h3>
							<div className="space-y-3">
								{event.schoolCategoryLimits.map((limit) => (
									<div key={limit.id} className="flex items-center justify-between">
										<span className="text-gray-700 dark:text-gray-300">{limit.schoolCategory.name}</span>
										<div className="flex items-center gap-2">
											<span className="text-gray-900 dark:text-white font-medium">
												{limit.currentParticipants || 0} / {limit.maxParticipants}
											</span>
											<div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
												<div
													className="h-full bg-red-500 rounded-full"
													style={{ width: `${Math.min(100, ((limit.currentParticipants || 0) / limit.maxParticipants) * 100)}%` }}
												/>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Juri Assignments */}
					{event.juryAssignments && event.juryAssignments.length > 0 && (
						<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
							<h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
								<TrophyIcon className="w-5 h-5" />
								Dewan Juri
							</h3>
							<div className="space-y-3">
								{event.juryAssignments.slice(0, 5).map((assignment) => (
									<div key={assignment.id} className="flex items-center gap-3">
										<div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
											<span className="text-yellow-700 dark:text-yellow-400 font-semibold">
												{assignment.jury.name.charAt(0).toUpperCase()}
											</span>
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-gray-900 dark:text-white font-medium truncate">{assignment.jury.name}</p>
											<p className="text-xs text-gray-500 dark:text-gray-400">
												{assignment.assignedCategories.map(c => c.assessmentCategory.name).join(", ") || "Semua kategori"}
											</p>
										</div>
										<span className={`px-2 py-1 rounded-full text-xs font-medium ${
											assignment.status === "ACCEPTED"
												? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
												: assignment.status === "PENDING"
												? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
												: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
										}`}>
											{assignment.status}
										</span>
									</div>
								))}
								{event.juryAssignments.length > 5 && (
									<Link
										to={`/admin/events/${event.slug}/juri`}
										className="text-red-600 dark:text-red-400 text-sm hover:underline"
									>
										Lihat semua {event.juryAssignments.length} juri →
									</Link>
								)}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default AdminManageEvent;
