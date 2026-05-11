import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
	LuCalendar,
	LuMapPin,
	LuUsers,
	LuBadgeDollarSign,
	LuUserCog,
	LuClock,
	LuCircleCheck,
	LuFileDown,
	LuExternalLink,
	LuLoader,
	LuTriangleAlert,
	LuCircleX,
	LuSchool,
} from "react-icons/lu";
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
	paymentStatus: string | null;
	schoolCategoryLimits?: SchoolCategoryLimit[];
	assessmentCategories?: EventAssessmentCategory[];
	juryAssignments?: JuryAssignment[];
}

const getStatusConfig = (status: string) => {
	const configs: Record<string, { color: string; icon: React.ReactNode; label: string; description: string }> = {
		DRAFT: {
			color: "bg-gray-500/20 text-gray-400 border border-gray-500/20",
			icon: <LuTriangleAlert className="w-4 h-4" />,
			label: "Draft",
			description: "Event belum dipublish",
		},
		PUBLISHED: {
			color: "bg-green-500/20 text-green-400 border border-green-500/20",
			icon: <LuCircleCheck className="w-4 h-4" />,
			label: "Published",
			description: "Event aktif dan tersedia",
		},
		ONGOING: {
			color: "bg-blue-500/20 text-blue-400 border border-blue-500/20",
			icon: <LuClock className="w-4 h-4" />,
			label: "Ongoing",
			description: "Event sedang berlangsung",
		},
		COMPLETED: {
			color: "bg-purple-500/20 text-purple-400 border border-purple-500/20",
			icon: <LuCircleCheck className="w-4 h-4" />,
			label: "Completed",
			description: "Event sudah selesai",
		},
		CANCELLED: {
			color: "bg-red-500/20 text-red-400 border border-red-500/20",
			icon: <LuCircleX className="w-4 h-4" />,
			label: "Cancelled",
			description: "Event dibatalkan",
		},
	};
	return configs[status] ?? configs.DRAFT;
};

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

			if (eventRes.data.paymentStatus === "DP_REQUESTED") {
				localStorage.removeItem("panitia_active_event");
				Swal.fire({
					icon: "info",
					title: "Menunggu Konfirmasi Admin",
					text: "Event ini belum bisa dikelola sampai super admin mengonfirmasi request paket.",
				});
				navigate("/panitia/dashboard", { replace: true });
				return;
			}

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
			import.meta.env.VITE_BACKEND_URL || "";
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

		const statusInfo = getStatusConfig(newStatus)!;
		
		const result = await Swal.fire({
			title: "Ubah Status Event?",
			html: `<p>Status event akan diubah menjadi <strong>${statusInfo.label}</strong></p><p class="text-sm text-gray-500 mt-2">${statusInfo.description}</p>`,
			icon: "question",
			showCancelButton: true,
			confirmButtonColor: "#EF4444",
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
			<div className="min-h-screen flex items-center justify-center">
				<div className="animate-spin rounded-full h-10 w-10 border-2 border-red-500/30 border-t-red-500"></div>
			</div>
		);
	}

	if (!event) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<h2 className="text-xl font-semibold text-gray-900 dark:text-white">Event tidak ditemukan</h2>
					<button
						onClick={() => navigate("/panitia/dashboard")}
						className="mt-4 text-red-500 hover:text-red-400 text-sm"
					>
						Kembali ke Dashboard
					</button>
				</div>
			</div>
		);
	}

	const statusConfig = getStatusConfig(event.status)!;

	return (
		<div className="min-h-screen transition-colors">
			{/* Header */}
			<header className="border-b border-gray-200/30 dark:border-white/[0.06] bg-white/60 dark:bg-white/[0.02] backdrop-blur-xl">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between py-5">
						<div className="flex items-center gap-4 min-w-0">
							<div className="min-w-0">
								<div className="flex items-center gap-3 flex-wrap">
									<h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
										{event.title}
									</h1>
									<span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
										{statusConfig.icon}
										{statusConfig.label}
									</span>
								</div>
								<p className="text-sm text-gray-500 dark:text-gray-500 mt-0.5">
									{event.organizer || "Kelola event"}
								</p>
							</div>
						</div>
					</div>
				</div>
			</header>

			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="space-y-6">

					{/* Event Thumbnail & Basic Info */}
					<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl border border-gray-200/50 dark:border-white/[0.06] rounded-2xl overflow-hidden">
						<div className="md:flex">
							{event.thumbnail ? (
								<div className="md:w-1/3">
									<img
										src={getImageUrl(event.thumbnail) || ""}
										alt={event.title}
										className="w-full h-64 md:h-full object-cover"
										onError={(e) => {
											e.currentTarget.style.display = "none";
										}}
									/>
								</div>
							) : null}
							<div className={`p-6 ${event.thumbnail ? "md:w-2/3" : "w-full"}`}>
								<h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Informasi Event</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="flex items-start gap-3">
										<div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/[0.06] border border-gray-200/50 dark:border-white/[0.08] flex items-center justify-center flex-shrink-0">
											<LuCalendar className="w-4 h-4 text-red-500/80" />
										</div>
										<div>
											<p className="text-xs text-gray-400 dark:text-gray-500">Tanggal</p>
											<p className="text-sm text-gray-900 dark:text-white">
												{formatDate(event.startDate)}
												{event.startDate !== event.endDate && ` - ${formatDate(event.endDate)}`}
											</p>
										</div>
									</div>
									{event.location && (
										<div className="flex items-start gap-3">
											<div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/[0.06] border border-gray-200/50 dark:border-white/[0.08] flex items-center justify-center flex-shrink-0">
												<LuMapPin className="w-4 h-4 text-red-500/80" />
											</div>
											<div>
												<p className="text-xs text-gray-400 dark:text-gray-500">Lokasi</p>
												<p className="text-sm text-gray-900 dark:text-white">{event.location}</p>
												{event.venue && (
													<p className="text-xs text-gray-500 dark:text-gray-500">{event.venue}</p>
												)}
											</div>
										</div>
									)}
									<div className="flex items-start gap-3">
										<div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/[0.06] border border-gray-200/50 dark:border-white/[0.08] flex items-center justify-center flex-shrink-0">
											<LuUsers className="w-4 h-4 text-red-500/80" />
										</div>
										<div>
											<p className="text-xs text-gray-400 dark:text-gray-500">Peserta</p>
											<p className="text-sm text-gray-900 dark:text-white">
												{event.currentParticipants} / {event.maxParticipants || "∞"}
											</p>
										</div>
									</div>
									<div className="flex items-start gap-3">
										<div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/[0.06] border border-gray-200/50 dark:border-white/[0.08] flex items-center justify-center flex-shrink-0">
											<LuBadgeDollarSign className="w-4 h-4 text-red-500/80" />
										</div>
										<div>
											<p className="text-xs text-gray-400 dark:text-gray-500">Biaya Registrasi</p>
											<p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(event.registrationFee)}</p>
										</div>
									</div>
									{event.registrationDeadline && (
										<div className="flex items-start gap-3">
											<div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/[0.06] border border-gray-200/50 dark:border-white/[0.08] flex items-center justify-center flex-shrink-0">
												<LuClock className="w-4 h-4 text-red-500/80" />
											</div>
											<div>
												<p className="text-xs text-gray-400 dark:text-gray-500">Batas Registrasi</p>
												<p className="text-sm text-gray-900 dark:text-white">{formatDate(event.registrationDeadline)}</p>
											</div>
										</div>
									)}
								</div>
								{event.description && (
									<div className="mt-4 pt-4 border-t border-gray-200/30 dark:border-white/[0.06]">
										<h4 className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-2">Deskripsi</h4>
										<p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">{event.description}</p>
									</div>
								)}
								{(event.organizer || event.organizerEmail) && (
									<div className="mt-4 pt-4 border-t border-gray-200/30 dark:border-white/[0.06]">
										<h4 className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-2">Penyelenggara</h4>
										<div className="flex items-center gap-3">
											<div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/[0.06] border border-gray-200/50 dark:border-white/[0.08] flex items-center justify-center flex-shrink-0">
												<LuUserCog className="w-4 h-4 text-red-500/80" />
											</div>
											<div>
												{event.organizer && (
													<p className="text-sm text-gray-900 dark:text-white">{event.organizer}</p>
												)}
												{event.organizerEmail && (
													<a
														href={`mailto:${event.organizerEmail}`}
														className="text-xs text-red-500 hover:text-red-400 transition-colors"
													>
														{event.organizerEmail}
													</a>
												)}
											</div>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Status Management */}
					<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl border border-gray-200/50 dark:border-white/[0.06] rounded-2xl p-6">
						<h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
							<LuCircleCheck className="w-4 h-4 text-red-500/80" />
							Status Event
						</h3>
						<div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
							<span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.color}`}>
								{statusConfig.icon}
								{statusConfig.label}
							</span>
							<p className="text-xs text-gray-500 dark:text-gray-500">{statusConfig.description}</p>
						</div>
						<div className="bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/30 dark:border-white/[0.06] rounded-xl p-3 mb-4">
							<p className="text-xs text-gray-600 dark:text-gray-400">
								<strong>ℹ️ Status otomatis:</strong> Status dihitung berdasarkan tanggal event.
								<br />• <strong>Published</strong> = Pendaftaran masih buka
								<br />• <strong>Ongoing</strong> = Batas pendaftaran lewat / event berlangsung
								<br />• <strong>Completed</strong> = Event sudah selesai
							</p>
						</div>
						<div className="flex flex-wrap gap-2">
							{event.paymentStatus === "DP_REQUESTED" && (
								<div className="w-full mb-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
									<p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Event ini menunggu konfirmasi admin</p>
									<p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
										Hanya admin yang dapat mempublish event ini setelah request paket dikonfirmasi.
									</p>
								</div>
							)}
							{event.status !== "CANCELLED" && event.status !== "DRAFT" && (
								<>
									<button
										onClick={() => handleStatusChange("DRAFT")}
										disabled={updatingStatus}
										className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100/80 dark:bg-white/[0.06] border border-gray-200/50 dark:border-white/[0.08] hover:bg-gray-200 dark:hover:bg-white/[0.1] rounded-xl transition-colors disabled:opacity-50"
									>
										{updatingStatus && <LuLoader className="w-3.5 h-3.5 animate-spin" />}
										Ubah ke Draft
									</button>
									<button
										onClick={() => handleStatusChange("CANCELLED")}
										disabled={updatingStatus}
										className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-500 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-xl transition-colors disabled:opacity-50"
									>
										{updatingStatus && <LuLoader className="w-3.5 h-3.5 animate-spin" />}
										Batalkan Event
									</button>
								</>
							)}
							{(event.status === "DRAFT" || event.status === "CANCELLED") && event.paymentStatus !== "DP_REQUESTED" && (
								<button
									onClick={() => handleStatusChange("PUBLISHED")}
									disabled={updatingStatus}
									className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-green-500/20"
								>
									{updatingStatus && <LuLoader className="w-3.5 h-3.5 animate-spin" />}
									{event.status === "DRAFT" ? "Publish Event" : "Aktifkan Kembali"}
								</button>
							)}
						</div>
					</div>

					{/* Assessment Categories */}
					{event.assessmentCategories && event.assessmentCategories.length > 0 && (
						<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl border border-gray-200/50 dark:border-white/[0.06] rounded-2xl p-6">
							<h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Kategori Penilaian</h3>
							<div className="flex flex-wrap gap-2">
								{event.assessmentCategories
									.sort((a, b) => a.assessmentCategory.order - b.assessmentCategory.order)
									.map((category) => (
										<span
											key={category.id}
											className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-xs font-medium"
											title={category.assessmentCategory.description || undefined}
										>
											{category.assessmentCategory.name}
											{category.customWeight !== null && (
												<span className="ml-1 opacity-70">({category.customWeight}%)</span>
											)}
										</span>
									))
								}
							</div>
						</div>
					)}

					{/* School Category Limits */}
					{event.schoolCategoryLimits && event.schoolCategoryLimits.length > 0 && (
						<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl border border-gray-200/50 dark:border-white/[0.06] rounded-2xl p-6">
							<h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Kuota per Kategori Sekolah</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
								{event.schoolCategoryLimits.map((limit) => {
									const current = limit.currentParticipants || 0;
									const max = limit.maxParticipants;
									const percentage = (current / max) * 100;
									const isFull = current >= max;

									return (
										<div key={limit.id} className="bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/30 dark:border-white/[0.06] rounded-xl p-4">
											<div className="flex justify-between items-center mb-2">
												<p className="text-sm font-medium text-gray-900 dark:text-white">{limit.schoolCategory.name}</p>
												<span className={`text-xs font-semibold ${isFull ? "text-red-400" : "text-gray-500 dark:text-gray-400"}`}>
													{current} / {max}
												</span>
											</div>
											<div className="w-full bg-gray-200/60 dark:bg-white/[0.06] rounded-full h-1.5">
												<div
													className={`h-1.5 rounded-full transition-all ${
														isFull ? "bg-red-500" : percentage > 75 ? "bg-yellow-500" : "bg-green-500"
													}`}
													style={{ width: `${Math.min(percentage, 100)}%` }}
												/>
											</div>
											<p className={`text-[10px] mt-1.5 ${isFull ? "text-red-400" : "text-green-500"}`}>
												{isFull ? "Penuh" : `${max - current} slot tersisa`}
											</p>
										</div>
									);
								})}
							</div>
						</div>
					)}

					{/* Confirmed Juries */}
					{event.juryAssignments && event.juryAssignments.length > 0 && (
						<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl border border-gray-200/50 dark:border-white/[0.06] rounded-2xl p-6">
							<h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
								Dewan Juri ({event.juryAssignments.length})
							</h3>
							<div className="space-y-3">
								{event.juryAssignments.map((juryAssignment) => (
									<div key={juryAssignment.id} className="flex items-start gap-4 p-4 bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/30 dark:border-white/[0.06] rounded-xl">
										<div className="relative flex-shrink-0">
											{juryAssignment.jury.profile?.avatar ? (
												<img
													src={getImageUrl(juryAssignment.jury.profile.avatar) || ""}
													alt={juryAssignment.jury.name}
													className="w-11 h-11 rounded-xl object-cover border border-gray-200/50 dark:border-white/[0.08]"
												/>
											) : (
												<div className="w-11 h-11 bg-amber-500/15 rounded-xl flex items-center justify-center border border-amber-500/20">
													<span className="text-amber-500 font-semibold text-lg">
														{juryAssignment.jury.name.charAt(0).toUpperCase()}
													</span>
												</div>
											)}
											<div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900">
												<LuCircleCheck className="w-2.5 h-2.5 text-white" />
											</div>
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium text-gray-900 dark:text-white">{juryAssignment.jury.name}</p>
											{juryAssignment.jury.profile?.institution && (
												<p className="text-xs text-gray-500 dark:text-gray-500">{juryAssignment.jury.profile.institution}</p>
											)}
											{juryAssignment.assignedCategories.length > 0 && (
												<div className="flex flex-wrap gap-1 mt-2">
													{juryAssignment.assignedCategories.map((cat, idx) => (
														<span
															key={idx}
															className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-[10px] font-medium"
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
						</div>
					)}

					{/* Registered Participants Summary */}
					{participantsSummary.length > 0 && (
						<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl border border-gray-200/50 dark:border-white/[0.06] rounded-2xl p-6">
							<h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
								Peserta Terdaftar ({participantsSummary.reduce((acc, p) => acc + p.teamCount, 0)} Tim)
							</h3>
							<div className="space-y-3">
								{participantsSummary.map((participant, idx) => (
									<div
										key={idx}
										className="p-4 bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/30 dark:border-white/[0.06] rounded-xl"
									>
										<div className="flex items-center justify-between mb-2">
											<div className="flex items-center gap-3">
												<div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
													<LuSchool className="w-4 h-4 text-blue-400" />
												</div>
												<span className="text-sm font-medium text-gray-900 dark:text-white">{participant.schoolName}</span>
											</div>
											<span className="text-xs text-gray-500 dark:text-gray-500">{participant.teamCount} tim</span>
										</div>
										<div className="flex flex-wrap gap-1.5 ml-11">
											{participant.teams.map((team, tidx) => (
												<span
													key={tidx}
													className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-[10px] font-medium"
												>
													{team.name}
													{team.category && (
														<span className="opacity-70 ml-1">({team.category})</span>
													)}
												</span>
											))}
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Juknis Download */}
					{event.juknisUrl && (
						<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl border border-gray-200/50 dark:border-white/[0.06] rounded-2xl p-6">
							<h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Petunjuk Teknis (Juknis)</h3>
							<p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
								Dokumen petunjuk teknis berisi informasi lengkap mengenai tata cara, peraturan, dan ketentuan event ini.
							</p>
							<div className="flex flex-wrap gap-2 mb-4">
								<a
									href={getImageUrl(event.juknisUrl) || ""}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-red-500/20"
								>
									<LuExternalLink className="w-4 h-4" />
									Buka di Tab Baru
								</a>
								<a
									href={getImageUrl(event.juknisUrl) || ""}
									download
									className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100/80 dark:bg-white/[0.06] border border-gray-200/50 dark:border-white/[0.08] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.1] rounded-xl text-sm font-medium transition-colors"
								>
									<LuFileDown className="w-4 h-4" />
									Download PDF
								</a>
							</div>
							<div className="border border-gray-200/30 dark:border-white/[0.06] rounded-xl overflow-hidden">
								<iframe
									src={getImageUrl(event.juknisUrl) || ""}
									className="w-full bg-white dark:bg-gray-900"
									style={{ height: "70vh", minHeight: "500px" }}
									title="Juknis PDF Viewer"
								/>
							</div>
						</div>
					)}

					
				</div>
			</main>
		</div>
	);
};

export default ManageEvent;
