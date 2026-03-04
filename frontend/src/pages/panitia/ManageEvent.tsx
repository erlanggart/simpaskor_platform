import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
}

const EVENT_STATUSES = [
	{ value: "DRAFT", label: "Draft", color: "bg-gray-500", description: "Event belum dipublish" },
	{ value: "PUBLISHED", label: "Published", color: "bg-green-500", description: "Event aktif dan tersedia" },
	{ value: "ONGOING", label: "Ongoing", color: "bg-blue-500", description: "Event sedang berlangsung" },
	{ value: "COMPLETED", label: "Completed", color: "bg-purple-500", description: "Event sudah selesai" },
	{ value: "CANCELLED", label: "Cancelled", color: "bg-red-500", description: "Event dibatalkan" },
];

const ManageEvent: React.FC = () => {
	const { eventSlug } = useParams<{ eventSlug: string }>();
	const navigate = useNavigate();
	const [event, setEvent] = useState<Event | null>(null);
	const [loading, setLoading] = useState(true);
	const [participantsSummary, setParticipantsSummary] = useState<ParticipantSummary[]>([]);
	const [updatingStatus, setUpdatingStatus] = useState(false);

	useEffect(() => {
		checkAssignment();
	}, [eventSlug]);

	const checkAssignment = async () => {
		try {
			setLoading(true);
			// Get active event from localStorage
			const stored = localStorage.getItem("panitia_active_event");

			if (!stored) {
				// No active assignment - redirect to dashboard to select an event
				navigate("/panitia/dashboard", { replace: true });
				return;
			}

			const eventData = JSON.parse(stored);

			// Check if assigned to this event (comparing by slug)
			if (eventData.slug === eventSlug) {
				// Fetch full event details including juries
				await fetchEventDetails(eventData.slug);
			} else {
				// URL doesn't match stored event - update localStorage and continue
				// This allows direct navigation to different events
				localStorage.setItem(
					"panitia_active_event",
					JSON.stringify({ slug: eventSlug, title: "", id: "" })
				);
				await fetchEventDetails(eventSlug!);
			}
		} catch (error: any) {
			console.error("Error checking assignment:", error);
			// Invalid data - redirect to dashboard
			localStorage.removeItem("panitia_active_event");
			navigate("/panitia/dashboard", { replace: true });
		} finally {
			setLoading(false);
		}
	};

	const fetchEventDetails = async (slug: string) => {
		try {
			const [eventRes, participantsRes] = await Promise.all([
				api.get(`/events/${slug}`),
				api.get(`/events/${slug}/participants-summary`).catch(() => ({ data: [] }))
			]);
			setEvent(eventRes.data);
			setParticipantsSummary(participantsRes.data || []);
		} catch (error) {
			console.error("Error fetching event details:", error);
		}
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
		const backendUrl =
			import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
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

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
			</div>
		);
	}

	if (!event) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Main Content */}
					<div className="lg:col-span-2">
						{/* Event Image */}
						<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-6">
							<div className="relative w-full aspect-[4/5] bg-gradient-to-br from-indigo-500 to-purple-600">
								{event.thumbnail ? (
									<img
										src={getImageUrl(event.thumbnail) || ""}
										alt={event.title}
										className="w-full h-full object-cover"
										onError={(e) => {
											e.currentTarget.style.display = "none";
										}}
									/>
								) : (
									<div className="flex items-center justify-center h-full">
										<CalendarIcon className="w-24 h-24 text-white/50" />
									</div>
								)}

								{/* Status Badges */}
								<div className="absolute top-4 left-4 flex flex-wrap gap-2">
									{event.featured && (
										<span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
											Featured
										</span>
									)}
									{event.category && (
										<span className="bg-indigo-600 dark:bg-indigo-700 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
											{event.category}
										</span>
									)}
									{event.level && (
										<span className="bg-blue-600 dark:bg-blue-700 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
											{event.level}
										</span>
									)}
								</div>

								{/* Status Event */}
								<div className="absolute bottom-4 right-4">
									<span
										className={`px-4 py-2 rounded-full text-sm font-semibold shadow-lg ${
											event.status === "PUBLISHED"
												? "bg-green-500 text-white"
												: event.status === "DRAFT"
												? "bg-yellow-500 text-white"
												: "bg-gray-500 text-white"
										}`}
									>
										{event.status}
									</span>
								</div>
							</div>
						</div>

						{/* Event Description */}
						<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
							<h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
								{event.title}
							</h1>

							{event.description && (
								<div className="prose dark:prose-invert max-w-none mb-6">
									<p className="text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed">
										{event.description}
									</p>
								</div>
							)}

							{/* Assessment Categories as Badges */}
							{event.assessmentCategories && event.assessmentCategories.length > 0 && (
								<div className="mb-4">
									<div className="flex items-center gap-2 mb-2">
										<TrophyIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
										<span className="text-sm font-medium text-gray-700 dark:text-gray-300">Kriteria Penilaian:</span>
									</div>
									<div className="flex flex-wrap gap-2">
										{event.assessmentCategories
											.sort((a, b) => a.assessmentCategory.order - b.assessmentCategory.order)
											.map((category) => (
												<span
													key={category.id}
													className="inline-flex items-center px-3 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm rounded-full"
													title={category.assessmentCategory.description || undefined}
												>
													{category.assessmentCategory.name}
													{category.customWeight !== null && (
														<span className="ml-1.5 text-xs font-semibold text-indigo-500 dark:text-indigo-400">
															({category.customWeight}%)
														</span>
													)}
												</span>
											))
										}
									</div>
								</div>
							)}

							{(event.organizer || event.organizerEmail) && (
								<div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-2">
									{event.organizer && (
										<div className="flex items-center text-gray-600 dark:text-gray-300">
											<UserGroupIcon className="w-5 h-5 mr-2 flex-shrink-0" />
											<span className="font-medium">Penyelenggara:</span>
											<span className="ml-2">{event.organizer}</span>
										</div>
									)}
									{event.organizerEmail && (
										<div className="flex items-center text-gray-600 dark:text-gray-300">
											<svg
												className="w-5 h-5 mr-2 flex-shrink-0"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
												/>
											</svg>
											<span className="font-medium">Email:</span>
											<a
												href={`mailto:${event.organizerEmail}`}
												className="ml-2 text-indigo-600 dark:text-indigo-400 hover:underline"
											>
												{event.organizerEmail}
											</a>
										</div>
									)}
								</div>
							)}
						</div>

						{/* Confirmed Juries */}
						{event.juryAssignments && event.juryAssignments.length > 0 && (
							<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
								<div className="flex items-center mb-4">
									<TrophyIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mr-2" />
									<h2 className="text-xl font-bold text-gray-900 dark:text-white">
										Dewan Juri ({event.juryAssignments.length})
									</h2>
								</div>
								<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
									{event.juryAssignments.map((juryAssignment) => (
										<div
											key={juryAssignment.id}
											className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center"
										>
											{/* Avatar */}
											<div className="relative mx-auto w-20 h-20 mb-3">
												{juryAssignment.jury.profile?.avatar ? (
													<img
														src={getImageUrl(juryAssignment.jury.profile.avatar) || ""}
														alt={juryAssignment.jury.name}
														className="w-20 h-20 rounded-full object-cover border-3 border-indigo-200 dark:border-indigo-800"
													/>
												) : (
													<div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
														{juryAssignment.jury.name.charAt(0).toUpperCase()}
													</div>
												)}
												<div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
													<CheckCircleIcon className="w-4 h-4 text-white" />
												</div>
											</div>
											{/* Name */}
											<h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 truncate">
												{juryAssignment.jury.name}
											</h3>
											{/* Institution */}
											{juryAssignment.jury.profile?.institution && (
												<p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-2">
													{juryAssignment.jury.profile.institution}
												</p>
											)}
											{/* Assigned Categories */}
											{juryAssignment.assignedCategories.length > 0 && (
												<div className="flex flex-wrap justify-center gap-1">
													{juryAssignment.assignedCategories.slice(0, 2).map((cat, idx) => (
														<span
															key={idx}
															className="inline-flex items-center px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs rounded-full"
														>
															{cat.assessmentCategory.name}
														</span>
													))}
													{juryAssignment.assignedCategories.length > 2 && (
														<span className="text-xs text-gray-500 dark:text-gray-400">
															+{juryAssignment.assignedCategories.length - 2}
														</span>
													)}
												</div>
											)}
										</div>
									))}
								</div>
							</div>
						)}

						{/* Juknis Download */}
						{event.juknisUrl && (
							<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
								<div className="flex items-center justify-between mb-4">
									<div className="flex items-center">
										<DocumentArrowDownIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mr-2" />
										<h2 className="text-xl font-bold text-gray-900 dark:text-white">
											Petunjuk Teknis (Juknis)
										</h2>
									</div>
								</div>
								<p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
									Dokumen petunjuk teknis berisi informasi lengkap mengenai tata cara, peraturan, dan ketentuan event ini.
								</p>
								
								{/* Action Buttons */}
								<div className="flex flex-wrap gap-3 mb-4">
									<a
										href={getImageUrl(event.juknisUrl) || ""}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors"
									>
										<EyeIcon className="w-5 h-5 mr-2" />
										Buka di Tab Baru
									</a>
									<a
										href={getImageUrl(event.juknisUrl) || ""}
										download
										className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
									>
										<DocumentArrowDownIcon className="w-5 h-5 mr-2" />
										Download PDF
									</a>
								</div>

								{/* Embedded PDF Viewer */}
								<div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
									<iframe
										src={getImageUrl(event.juknisUrl) || ""}
										className="w-full bg-white"
										style={{ height: "70vh", minHeight: "500px" }}
										title="Juknis PDF Viewer"
									/>
								</div>
							</div>
						)}

						{/* Registered Participants Summary */}
						{participantsSummary.length > 0 && (
							<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
								<div className="flex items-center mb-4">
									<UserGroupIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mr-2" />
									<h2 className="text-xl font-bold text-gray-900 dark:text-white">
										Peserta Terdaftar ({participantsSummary.reduce((acc, p) => acc + p.teamCount, 0)} Tim)
									</h2>
								</div>
								<div className="space-y-3">
									{participantsSummary.map((participant, idx) => (
										<div
											key={idx}
											className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
										>
											<div className="flex items-center justify-between mb-2">
												<span className="font-medium text-gray-900 dark:text-white">
													{participant.schoolName}
												</span>
												<span className="text-sm text-gray-500 dark:text-gray-400">
													{participant.teamCount} tim
												</span>
											</div>
											<div className="flex flex-wrap gap-2">
												{participant.teams.map((team, tidx) => (
													<span
														key={tidx}
														className="inline-flex items-center px-2 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs rounded-full"
													>
														{team.name}
														{team.category && (
															<span className="ml-1 text-indigo-500 dark:text-indigo-400">
																({team.category})
															</span>
														)}
													</span>
												))}
											</div>
										</div>
									))}
								</div>
							</div>
						)}

						{/* School Category Limits */}
						{event.schoolCategoryLimits &&
							event.schoolCategoryLimits.length > 0 && (
								<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
									<div className="flex items-center mb-4">
										<UsersIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mr-2" />
										<h2 className="text-xl font-bold text-gray-900 dark:text-white">
											Kuota Berdasarkan Kategori Sekolah
										</h2>
									</div>
									<div className="space-y-3">
										{event.schoolCategoryLimits.map((limit) => {
											const current = limit.currentParticipants || 0;
											const max = limit.maxParticipants;
											const available = max - current;
											const percentage = (current / max) * 100;
											const isFull = current >= max;

											return (
												<div
													key={limit.id}
													className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3"
												>
													<div className="flex justify-between items-center mb-2">
														<span className="text-gray-900 dark:text-white font-medium text-sm">
															{limit.schoolCategory.name}
														</span>
														<span
															className={`text-xs font-semibold ${
																isFull
																	? "text-red-600 dark:text-red-400"
																	: "text-gray-600 dark:text-gray-400"
															}`}
														>
															{current} / {max}
														</span>
													</div>
													<div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-1">
														<div
															className={`h-2 rounded-full transition-all ${
																isFull
																	? "bg-red-500"
																	: percentage > 75
																	? "bg-yellow-500"
																	: "bg-green-500"
															}`}
															style={{
																width: `${Math.min(percentage, 100)}%`,
															}}
														></div>
													</div>
													<p
														className={`text-xs ${
															isFull
																? "text-red-600 dark:text-red-400"
																: "text-green-600 dark:text-green-400"
														}`}
													>
														{isFull ? "Penuh" : `${available} slot tersisa`}
													</p>
												</div>
											);
										})}
									</div>
								</div>
							)}
					</div>

					{/* Sidebar - Info Event */}
					<div className="lg:col-span-1">
						<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sticky top-0">
							<h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
								Informasi Event
							</h2>

							<div className="space-y-4">
								{/* Date & Time */}
								<div className="flex items-start">
									<CalendarIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-3 mt-0.5 flex-shrink-0" />
									<div>
										<p className="text-sm text-gray-500 dark:text-gray-400">
											Tanggal Pelaksanaan
										</p>
										<p className="text-gray-900 dark:text-white font-medium">
											{formatDate(event.startDate)}
										</p>
										{event.startDate !== event.endDate && (
											<p className="text-gray-900 dark:text-white font-medium">
												s/d {formatDate(event.endDate)}
											</p>
										)}
									</div>
								</div>

								{/* Registration Deadline */}
								{event.registrationDeadline && (
									<div className="flex items-start">
										<ClockIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-3 mt-0.5 flex-shrink-0" />
										<div>
											<p className="text-sm text-gray-500 dark:text-gray-400">
												Batas Pendaftaran
											</p>
											<p className="text-gray-900 dark:text-white font-medium">
												{formatDate(event.registrationDeadline)}
											</p>
										</div>
									</div>
								)}

								{/* Location */}
								{event.location && (
									<div className="flex items-start">
										<MapPinIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-3 mt-0.5 flex-shrink-0" />
										<div>
											<p className="text-sm text-gray-500 dark:text-gray-400">
												Lokasi
											</p>
											<p className="text-gray-900 dark:text-white font-medium">
												{event.venue && `${event.venue}, `}
												{event.location}
											</p>
										</div>
									</div>
								)}

								{/* Participants */}
								<div className="flex items-start">
									<UsersIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-3 mt-0.5 flex-shrink-0" />
									<div>
										<p className="text-sm text-gray-500 dark:text-gray-400">
											Peserta
										</p>
										<p className="text-gray-900 dark:text-white font-medium">
											{event.currentParticipants}{" "}
											{event.maxParticipants && `/ ${event.maxParticipants}`}
										</p>
									</div>
								</div>

								{/* Registration Fee */}
								<div className="flex items-start pt-4 border-t border-gray-200 dark:border-gray-700">
									<CurrencyDollarIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-3 mt-0.5 flex-shrink-0" />
									<div>
										<p className="text-sm text-gray-500 dark:text-gray-400">
											Biaya Pendaftaran
										</p>
										<p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
											{formatCurrency(event.registrationFee)}
										</p>
									</div>
								</div>
							</div>

							{/* Status Change */}
							<div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
								<h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
									<CheckCircleIcon className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
									Status Event
								</h3>
								
								{/* Current Status Badge */}
								<div className="mb-4">
									<span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
										EVENT_STATUSES.find(s => s.value === event.status)?.color || "bg-gray-500"
									} text-white`}>
										{EVENT_STATUSES.find(s => s.value === event.status)?.label || event.status}
									</span>
									<p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
										{EVENT_STATUSES.find(s => s.value === event.status)?.description}
									</p>
								</div>

								{/* Auto-computed status info */}
								<div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4">
									<p className="text-xs text-gray-600 dark:text-gray-400">
										<strong>ℹ️ Status otomatis:</strong> Status dihitung berdasarkan tanggal event.
										<br />• <strong>Published</strong> = Pendaftaran masih buka
										<br />• <strong>Ongoing</strong> = Batas pendaftaran lewat / event berlangsung
										<br />• <strong>Completed</strong> = Event sudah selesai
									</p>
								</div>

								{/* Manual Override Buttons */}
								{event.status !== "CANCELLED" && event.status !== "DRAFT" && (
									<div className="space-y-2">
										<button
											onClick={() => handleStatusChange("DRAFT")}
											disabled={updatingStatus}
											className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
										>
											{updatingStatus ? (
												<ArrowPathIcon className="w-4 h-4 inline mr-2 animate-spin" />
											) : null}
											Ubah ke Draft (Sembunyikan)
										</button>
										<button
											onClick={() => handleStatusChange("CANCELLED")}
											disabled={updatingStatus}
											className="w-full px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors disabled:opacity-50"
										>
											{updatingStatus ? (
												<ArrowPathIcon className="w-4 h-4 inline mr-2 animate-spin" />
											) : null}
											Batalkan Event
										</button>
									</div>
								)}

								{/* Restore from DRAFT or CANCELLED */}
								{(event.status === "DRAFT" || event.status === "CANCELLED") && (
									<button
										onClick={() => handleStatusChange("PUBLISHED")}
										disabled={updatingStatus}
										className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
									>
										{updatingStatus ? (
											<ArrowPathIcon className="w-4 h-4 inline mr-2 animate-spin" />
										) : null}
										{event.status === "DRAFT" ? "Publish Event" : "Aktifkan Kembali"}
									</button>
								)}
							</div>

							{/* Management Info */}
							<div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
								<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
									<p className="text-sm text-blue-800 dark:text-blue-200">
										<span className="font-semibold">💡 Info:</span> Gunakan menu
										sidebar untuk mengelola berbagai aspek event ini.
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ManageEvent;
