import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
	LuCalendar,
	LuMapPin,
	LuUsers,
	LuClock,
	LuBadgeDollarSign,
	LuCircleCheck,
	LuCircleX,
	LuArrowLeft,
	LuTrophy,
	LuFileDown,
	LuEye,
	LuMessageCircle,
	LuTrash2,
	LuInfo,
	LuPhone,
	LuUser,
	LuShare2,
	LuHeart,
} from "react-icons/lu";
import api from "../utils/api";
import { useAuth } from "../hooks/useAuth";
// Registration is handled via dedicated page /peserta/events/:id/register
import { EventRegistration } from "../types/landing";

interface EventComment {
	id: string;
	content: string;
	createdAt: string;
	user: {
		id: string;
		name: string;
		email: string;
		role: string;
		profile?: {
			avatar: string | null;
			institution: string | null;
		};
	};
}

interface LikeData {
	count: number;
	isLiked: boolean;
}

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

interface EventCreator {
	id: string;
	name: string;
	email: string;
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

interface Event {
	id: string;
	title: string;
	slug: string | null;
	description: string | null;
	thumbnail: string | null;
	juknisUrl: string | null;
	category: string | null;
	level: string | null;
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
	contactPersonName: string | null;
	contactPhone: string | null;
	status: string;
	featured: boolean;
	isPinned?: boolean;
	createdBy?: EventCreator;
	schoolCategoryLimits?: SchoolCategoryLimit[];
	assessmentCategories?: EventAssessmentCategory[];
	juryAssignments?: JuryAssignment[];
	participations?: {
		id: string;
		status: string;
		teamName: string | null;
		schoolName: string | null;
		totalScore: number | null;
		user: { id: string; name: string };
		schoolCategory: { id: string; name: string; description: string | null } | null;
		groups: {
			id: string;
			groupName: string;
			orderNumber: number | null;
			schoolCategory: { id: string; name: string } | null;
		}[];
	}[];
}

interface ParticipantSummary {
	schoolName: string;
	teamCount: number;
	teams: { name: string; category: string | null }[];
}

interface LeaderboardEntry {
	id: string;
	teamName: string;
	schoolName: string;
	schoolCategory: { id: string; name: string } | null;
	orderNumber: number | null;
	grandTotal: number;
}

interface LeaderboardData {
	event: { id: string; title: string; slug: string | null };
	categories: { id: string; name: string }[];
	schoolCategories: { id: string; name: string }[];
	leaderboard: LeaderboardEntry[];
}

const EventDetail: React.FC = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { isAuthenticated, user } = useAuth();
	const [event, setEvent] = useState<Event | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	// Registration modal removed - using dedicated page instead
	const [myRegistration, setMyRegistration] = useState<EventRegistration | null>(null);
	const [checkingRegistration, setCheckingRegistration] = useState(false);
	const [participantsSummary, setParticipantsSummary] = useState<ParticipantSummary[]>([]);
	const [participantTab, setParticipantTab] = useState<string>("all");
	const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
	const [leaderboardTab, setLeaderboardTab] = useState<string>("all");
	const [activeTab, setActiveTab] = useState<string>("info");
	
	// Comments & Likes state
	const [comments, setComments] = useState<EventComment[]>([]);
	const [likeData, setLikeData] = useState<LikeData>({ count: 0, isLiked: false });
	const [newComment, setNewComment] = useState("");
	const [submittingComment, setSubmittingComment] = useState(false);
	const [togglingLike, setTogglingLike] = useState(false);

	useEffect(() => {
		fetchEventDetail();
		fetchParticipantsSummary();
		fetchComments();
		fetchLikes();
	}, [id]);

	useEffect(() => {
		if (isAuthenticated && event) {
			checkMyRegistration();
			// Refresh likes to get user's like status
			fetchLikes();
		}
	}, [isAuthenticated, event]);

	useEffect(() => {
		if (event && event.status === "COMPLETED") {
			fetchLeaderboard();
		}
	}, [event]);

	const fetchLeaderboard = async () => {
		try {
			const response = await api.get(`/events/${id}/leaderboard`);
			setLeaderboardData(response.data);
		} catch (error) {
			console.error("Error fetching leaderboard:", error);
		}
	};

	const fetchComments = async () => {
		try {
			const response = await api.get(`/events/${id}/comments`);
			setComments(response.data);
		} catch (error) {
			console.error("Error fetching comments:", error);
		}
	};

	const fetchLikes = async () => {
		try {
			const response = await api.get(`/events/${id}/likes`);
			setLikeData(response.data);
		} catch (error) {
			console.error("Error fetching likes:", error);
		}
	};

	const handleAddComment = async () => {
		if (!newComment.trim() || submittingComment) return;

		try {
			setSubmittingComment(true);
			const response = await api.post(`/events/${id}/comments`, {
				content: newComment.trim(),
			});
			setComments([response.data, ...comments]);
			setNewComment("");
		} catch (error: any) {
			alert(error.response?.data?.message || "Gagal menambahkan komentar");
		} finally {
			setSubmittingComment(false);
		}
	};

	const handleDeleteComment = async (commentId: string) => {
		if (!confirm("Hapus komentar ini?")) return;

		try {
			await api.delete(`/events/${id}/comments/${commentId}`);
			setComments(comments.filter((c) => c.id !== commentId));
		} catch (error: any) {
			alert(error.response?.data?.message || "Gagal menghapus komentar");
		}
	};

	const handleToggleLike = async () => {
		if (!isAuthenticated) {
			navigate("/login", { state: { from: `/events/${id}` } });
			return;
		}

		if (togglingLike) return;

		try {
			setTogglingLike(true);
			const response = await api.post(`/events/${id}/likes`);
			setLikeData(response.data);
		} catch (error: any) {
			alert(error.response?.data?.message || "Gagal menyukai event");
		} finally {
			setTogglingLike(false);
		}
	};

	const formatCommentDate = (dateString: string) => {
		const date = new Date(dateString);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (minutes < 1) return "Baru saja";
		if (minutes < 60) return `${minutes} menit lalu`;
		if (hours < 24) return `${hours} jam lalu`;
		if (days < 7) return `${days} hari lalu`;
		return date.toLocaleDateString("id-ID", {
			day: "numeric",
			month: "short",
			year: "numeric",
		});
	};

	const fetchParticipantsSummary = async () => {
		try {
			const response = await api.get(`/events/${id}/participants-summary`);
			setParticipantsSummary(response.data);
		} catch (error) {
			console.error("Error fetching participants summary:", error);
		}
	};

	const fetchEventDetail = async () => {
		try {
			setLoading(true);
			const response = await api.get(`/events/${id}`);
			setEvent(response.data);
		} catch (err: any) {
			setError(err.response?.data?.message || "Gagal memuat detail event");
		} finally {
			setLoading(false);
		}
	};

	const checkMyRegistration = async () => {
		if (!event) return;
		
		try {
			setCheckingRegistration(true);
			const response = await api.get("/registrations/my");
			const registrations: EventRegistration[] = response.data;
			
			// Find registration for this event
			const registration = registrations.find(
				(reg) => reg.eventId === event.id && reg.status !== "CANCELLED"
			);
			
			setMyRegistration(registration || null);
		} catch (error) {
			console.error("Error checking registration:", error);
		} finally {
			setCheckingRegistration(false);
		}
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString("id-ID", {
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
		}).format(Number(amount));
	};

	const getImageUrl = (thumbnail: string | null) => {
		if (!thumbnail) return null;
		if (thumbnail.startsWith("http://") || thumbnail.startsWith("https://")) {
			return thumbnail;
		}
		const backendUrl =
			import.meta.env.VITE_BACKEND_URL || "";
		return `${backendUrl}${thumbnail}`;
	};

	const isRegistrationOpen = () => {
		if (!event) return false;
		const now = new Date();
		const deadline = event.registrationDeadline
			? new Date(event.registrationDeadline)
			: new Date(event.startDate);
		return deadline > now && event.status === "PUBLISHED" && !isEventFull();
	};

	const isEventFull = () => {
		if (!event || !event.maxParticipants) return false;
		return event.currentParticipants >= event.maxParticipants;
	};

	const getAvailableSpots = () => {
		if (!event || !event.maxParticipants) return "Unlimited";
		return event.maxParticipants - event.currentParticipants;
	};

	const handleRegister = async () => {
		// Check if user is authenticated
		if (!isAuthenticated) {
			navigate("/login", { state: { from: `/events/${id}` } });
			return;
		}

		// Check if user is PESERTA
		if (user?.role !== "PESERTA") {
			alert("Hanya peserta yang dapat mendaftar ke event");
			return;
		}

		// Navigate to registration page
		navigate(`/peserta/events/${event?.slug || id}/register`);
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-10 w-10 border-2 border-red-500/30 border-t-red-500 mx-auto"></div>
					<p className="mt-4 text-sm text-gray-500 dark:text-gray-500">
						Memuat detail event...
					</p>
				</div>
			</div>
		);
	}

	if (error || !event) {
		return (
			<div className="min-h-screen flex items-center justify-center px-4">
				<div className="text-center max-w-md">
					<LuCircleX className="w-12 h-12 text-red-500/60 mx-auto mb-4" />
					<h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
						Event Tidak Ditemukan
					</h2>
					<p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
						{error || "Event yang Anda cari tidak tersedia"}
					</p>
					<button
						onClick={() => navigate(-1)}
						className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-red-500/20"
					>
						<LuArrowLeft className="w-4 h-4" />
						Kembali
					</button>
				</div>
			</div>
		);
	}

	// Determine tabs for the event
	const tabs = [
		{ id: "info", label: "Informasi Event", icon: LuInfo },
		{ id: "jury", label: "Juri & Penilaian", icon: LuTrophy },
		{ id: "peserta", label: "Peserta", icon: LuUsers },
		...(event.status === "COMPLETED"
			? [{ id: "leaderboard", label: "Hasil Perlombaan", icon: LuTrophy }]
			: []),
	];

	const handleShare = async () => {
		const url = window.location.href;
		if (navigator.share) {
			try {
				await navigator.share({ title: event.title, url });
			} catch { /* user cancelled */ }
		} else {
			await navigator.clipboard.writeText(url);
			alert("Link berhasil disalin!");
		}
	};

	const isPromoted = Boolean(event.isPinned || event.featured);

	return (
		<div className="min-h-screen transition-colors">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

				{/* ============ HERO: Poster + Info Side-by-Side ============ */}
				<div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-8">

					{/* Poster - 2 cols */}
					<div className="lg:col-span-2">
						<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden border border-gray-200/50 dark:border-white/[0.06]">
							<div className="relative w-full aspect-[3/4] bg-gradient-to-br from-red-600 to-red-800 dark:from-red-950 dark:to-gray-900">
								{event.thumbnail ? (
									<img
										src={getImageUrl(event.thumbnail) || ""}
										alt={event.title}
										className="w-full h-full object-cover"
										onError={(e) => { e.currentTarget.style.display = "none"; }}
									/>
								) : (
									<div className="flex flex-col items-center justify-center h-full gap-3">
										<LuCalendar className="w-20 h-20 text-white/40" />
										<span className="text-white/50 text-sm">Belum ada poster</span>
									</div>
								)}

								{/* Status badges */}
								<div className="absolute top-4 left-4 flex flex-wrap gap-2">
									{isPromoted && (
										<span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg uppercase tracking-wide">
											Unggulan
										</span>
									)}
									{event.category && (
										<span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
											{event.category}
										</span>
									)}
									{event.level && (
										<span className="bg-white/90 text-red-700 px-3 py-1 rounded-full text-xs font-bold shadow-lg">
											{event.level}
										</span>
									)}
								</div>

								{/* Registration status badge */}
								{isEventFull() ? (
									<div className="absolute bottom-4 right-4 bg-red-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
										Event Penuh
									</div>
								) : isRegistrationOpen() ? (
									<div className="absolute bottom-4 right-4 bg-green-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg animate-pulse">
										Pendaftaran Dibuka
									</div>
								) : (
									<div className="absolute bottom-4 right-4 bg-gray-600/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
										Pendaftaran Ditutup
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Event Info - 3 cols */}
					<div className="lg:col-span-3 flex flex-col">
						<h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 dark:text-white mb-3 leading-tight">
							{event.title}
						</h1>

						{/* Creator */}
						{event.createdBy && (
							<div className="flex items-center gap-3 mb-5">
								<span className="text-sm text-gray-500 dark:text-gray-400 italic">presented by</span>
								<span className="font-semibold text-gray-800 dark:text-white">{event.createdBy.name}</span>
								<span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full">{event.createdBy.email}</span>
							</div>
						)}

						{/* Info items */}
						<div className="space-y-4 flex-1">
							{/* Date */}
							<div className="flex items-start gap-3">
								<div className="w-8 h-8 rounded-lg bg-red-500/10 dark:bg-red-500/10 flex items-center justify-center flex-shrink-0">
									<LuCalendar className="w-4 h-4 text-red-500" />
								</div>
								<div>
									<p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium">Tanggal Pelaksanaan</p>
									<p className="text-gray-900 dark:text-white font-semibold">
										{formatDate(event.startDate)}
										{event.startDate !== event.endDate && ` — ${formatDate(event.endDate)}`}
									</p>
								</div>
							</div>

							{/* Location */}
							{event.location && (
								<div className="flex items-start gap-3">
									<div className="w-8 h-8 rounded-lg bg-red-500/10 dark:bg-red-500/10 flex items-center justify-center flex-shrink-0">
										<LuMapPin className="w-4 h-4 text-red-500" />
									</div>
									<div>
										<p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium">Lokasi</p>
										<p className="text-gray-900 dark:text-white font-semibold">
											{event.venue && `${event.venue}, `}{event.location}
										</p>
									</div>
								</div>
							)}

							{/* Registration Deadline */}
							{event.registrationDeadline && (
								<div className="flex items-start gap-3">
									<div className="w-8 h-8 rounded-lg bg-red-500/10 dark:bg-red-500/10 flex items-center justify-center flex-shrink-0">
										<LuClock className="w-4 h-4 text-red-500" />
									</div>
									<div>
										<p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium">Batas Pendaftaran</p>
										<p className="text-gray-900 dark:text-white font-semibold">{formatDate(event.registrationDeadline)}</p>
									</div>
								</div>
							)}

							{/* Fee */}
							<div className="flex items-start gap-3">
								<div className="w-8 h-8 rounded-lg bg-red-500/10 dark:bg-red-500/10 flex items-center justify-center flex-shrink-0">
									<LuBadgeDollarSign className="w-4 h-4 text-red-500" />
								</div>
								<div>
									<p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium">Biaya Pendaftaran</p>
									<p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(event.registrationFee)}</p>
								</div>
							</div>
						</div>

						{/* Registration CTA */}
						<div className="mt-6 pt-6 border-t border-gray-200/50 dark:border-white/[0.06]">
							{myRegistration ? (
								<div className="text-center">
									<div className="inline-flex items-center px-5 py-2.5 bg-green-500/10 text-green-700 dark:text-green-400 rounded-xl border border-green-500/20 mb-2">
										<LuCircleCheck className="w-5 h-5 mr-2" />
										<span className="font-bold">Sudah Terdaftar</span>
									</div>
									<p className="text-sm text-gray-600 dark:text-gray-400">
										{myRegistration.groups.filter(g => g.status === "ACTIVE").length} Tim Terdaftar
									</p>
									<Link
										to="/peserta/registrations"
										className="mt-2 inline-block text-sm text-red-600 dark:text-red-400 hover:underline font-medium"
									>
										Kelola Pendaftaran →
									</Link>
								</div>
							) : isAuthenticated && user?.role !== "PESERTA" ? (
								<p className="text-center text-sm text-gray-500 dark:text-gray-400">
									Hanya akun PESERTA yang dapat mendaftar ke event
								</p>
							) : isRegistrationOpen() ? (
								<>
									<button
										onClick={handleRegister}
										disabled={checkingRegistration}
										className="w-full px-6 py-3.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-red-500/20"
									>
										{checkingRegistration ? (
											<><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" /> Memeriksa...</>
										) : (
											<><LuUsers className="w-5 h-5 mr-2" />{isAuthenticated ? "Daftar Sekarang" : "Login untuk Daftar"}</>
										)}
									</button>
									{!isAuthenticated && (
										<p className="mt-3 text-sm text-center text-gray-500 dark:text-gray-400">
											Silakan login terlebih dahulu untuk mendaftar ke event ini
										</p>
									)}
								</>
							) : (
								<button
									disabled
									className="w-full px-6 py-3.5 bg-gray-200 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 rounded-xl font-bold cursor-not-allowed"
								>
									{isEventFull() ? "Event Penuh" : "Pendaftaran Ditutup"}
								</button>
							)}
						</div>
					</div>
				</div>

				{/* ============ TAB NAVIGATION ============ */}
				<div className="mb-6">
					<nav className="flex gap-2 overflow-x-auto p-1 bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl rounded-xl border border-gray-200/50 dark:border-white/[0.06]">
						{tabs.map((tab) => {
							const Icon = tab.icon;
							const isActive = activeTab === tab.id;
							return (
								<button
									key={tab.id}
									onClick={() => setActiveTab(tab.id)}
									className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
										isActive
											? "bg-red-600 text-white shadow-lg shadow-red-500/20"
											: "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-white/[0.06]"
									}`}
								>
									<Icon className="w-4 h-4" />
									{tab.label}
								</button>
							);
						})}
					</nav>
				</div>

				{/* ============ TAB CONTENT ============ */}

				{/* --- Tab 1: Informasi Event --- */}
				{activeTab === "info" && (
					<div className="space-y-6">
						{/* Description */}
						{event.description && (
							<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-200/50 dark:border-white/[0.06]">
								<h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
									<LuInfo className="w-5 h-5 text-red-500" />
									Tentang Event
								</h2>
								<p className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
									{event.description}
								</p>
							</div>
						)}

						{/* Juknis */}
						{event.juknisUrl && (
							<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-200/50 dark:border-white/[0.06]">
								<div className="flex items-center justify-between mb-4">
									<h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
										<LuFileDown className="w-5 h-5 text-red-500" />
										Petunjuk Teknis (Juknis)
									</h2>
								</div>
								<p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
									Dokumen petunjuk teknis berisi informasi lengkap mengenai tata cara, peraturan, dan ketentuan event ini.
								</p>
								<div className="flex flex-wrap gap-3 mb-4">
									<a
										href={getImageUrl(event.juknisUrl) || ""}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
									>
										<LuEye className="w-5 h-5 mr-2" />
										Buka di Tab Baru
									</a>
									<a
										href={getImageUrl(event.juknisUrl) || ""}
										download
										className="inline-flex items-center px-4 py-2 border border-gray-200/50 dark:border-white/[0.06] text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-white/[0.06] rounded-lg font-medium transition-colors"
									>
										<LuFileDown className="w-5 h-5 mr-2" />
										Download PDF
									</a>
								</div>
								<div className="border border-gray-200/50 dark:border-white/[0.06] rounded-lg overflow-hidden">
									<iframe
										src={getImageUrl(event.juknisUrl) || ""}
										className="w-full bg-white"
										style={{ height: "70vh", minHeight: "500px" }}
										title="Juknis PDF Viewer"
									/>
								</div>
							</div>
						)}

						{/* Contact Person */}
						{(event.contactPersonName || event.contactPhone || event.organizer) && (
							<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-200/50 dark:border-white/[0.06]">
								<h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
									<LuPhone className="w-5 h-5 text-red-500" />
									Contact Person
								</h2>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									{event.contactPersonName && (
										<div className="flex items-center gap-3 p-4 bg-red-50/50 dark:bg-white/[0.03] rounded-xl border border-gray-200/50 dark:border-white/[0.06]">
											<LuUser className="w-8 h-8 text-red-500 flex-shrink-0" />
											<div>
												<p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium">Nama</p>
												<p className="font-semibold text-gray-900 dark:text-white">{event.contactPersonName}</p>
											</div>
										</div>
									)}
									{event.contactPhone && (
										<div className="flex items-center gap-3 p-4 bg-red-50/50 dark:bg-white/[0.03] rounded-xl border border-gray-200/50 dark:border-white/[0.06]">
											<LuPhone className="w-8 h-8 text-red-500 flex-shrink-0" />
											<div>
												<p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium">Telepon / WhatsApp</p>
												<a href={`https://wa.me/${event.contactPhone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-red-600 dark:text-red-400 hover:underline">
													{event.contactPhone}
												</a>
											</div>
										</div>
									)}
									{event.organizer && (
										<div className="flex items-center gap-3 p-4 bg-red-50/50 dark:bg-white/[0.03] rounded-xl border border-gray-200/50 dark:border-white/[0.06] sm:col-span-2">
											<LuUsers className="w-8 h-8 text-red-500 flex-shrink-0" />
											<div>
												<p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium">Penyelenggara</p>
												<p className="font-semibold text-gray-900 dark:text-white">{event.organizer}</p>
											</div>
										</div>
									)}
								</div>
							</div>
						)}
					</div>
				)}

				{/* --- Tab 2: Juri & Penilaian --- */}
				{activeTab === "jury" && (
					<div className="space-y-6">
						{/* Assessment Categories */}
						{event.assessmentCategories && event.assessmentCategories.length > 0 && (
							<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-200/50 dark:border-white/[0.06]">
								<h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
									<LuTrophy className="w-5 h-5 text-red-500" />
									Kriteria Penilaian
								</h2>
								<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
									{event.assessmentCategories
										.sort((a, b) => a.assessmentCategory.order - b.assessmentCategory.order)
										.map((category, idx) => (
											<div
												key={category.id}
												className="flex items-center gap-3 p-4 bg-red-50/50 dark:bg-white/[0.03] rounded-xl border border-gray-200/50 dark:border-white/[0.06]"
											>
												<div className="w-8 h-8 flex items-center justify-center bg-red-600 text-white rounded-full text-sm font-bold flex-shrink-0">
													{idx + 1}
												</div>
												<div className="min-w-0">
													<p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{category.assessmentCategory.name}</p>
													{category.assessmentCategory.description && (
														<p className="text-xs text-gray-500 dark:text-gray-400 truncate">{category.assessmentCategory.description}</p>
													)}
													{category.customWeight !== null && (
														<span className="text-xs font-bold text-red-600 dark:text-red-400">Bobot: {category.customWeight}%</span>
													)}
												</div>
											</div>
										))
									}
								</div>
							</div>
						)}

						{/* Jury List */}
						{event.juryAssignments && event.juryAssignments.length > 0 ? (
							<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-200/50 dark:border-white/[0.06]">
								<h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
									<LuTrophy className="w-5 h-5 text-yellow-500" />
									Dewan Juri ({event.juryAssignments.length})
								</h2>
								<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
									{event.juryAssignments.map((assignment) => (
										<div
											key={assignment.id}
											className="bg-white/60 dark:bg-white/[0.03] rounded-xl p-4 text-center border border-gray-200/50 dark:border-white/[0.06]"
										>
											<div className="relative mx-auto w-20 h-20 mb-3">
												{assignment.jury.profile?.avatar ? (
													<img
														src={getImageUrl(assignment.jury.profile.avatar) || ""}
														alt={assignment.jury.name}
														className="w-20 h-20 rounded-lg object-cover border-2 border-red-200 dark:border-white/[0.1]"
													/>
												) : (
													<div className="w-20 h-20 rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-2xl font-bold">
														{assignment.jury.name.charAt(0).toUpperCase()}
													</div>
												)}
												<div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white dark:border-white/[0.06]">
													<LuCircleCheck className="w-3 h-3 text-white" />
												</div>
											</div>
											<h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-0.5 truncate">{assignment.jury.name}</h3>
											{assignment.jury.profile?.institution && (
												<p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-2">{assignment.jury.profile.institution}</p>
											)}
											{assignment.assignedCategories.length > 0 && (
												<div className="flex flex-wrap justify-center gap-1 mt-1">
													{assignment.assignedCategories.slice(0, 2).map((cat, cidx) => (
														<span key={cidx} className="inline-flex items-center px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-full">
															{cat.assessmentCategory.name}
														</span>
													))}
													{assignment.assignedCategories.length > 2 && (
														<span className="text-xs text-gray-500 dark:text-gray-400">+{assignment.assignedCategories.length - 2}</span>
													)}
												</div>
											)}
										</div>
									))}
								</div>
							</div>
						) : (
							<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl shadow-lg p-8 text-center border border-gray-200/50 dark:border-white/[0.06]">
								<LuTrophy className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
								<p className="text-gray-500 dark:text-gray-400">Belum ada juri yang ditugaskan</p>
							</div>
						)}
					</div>
				)}

				{/* --- Tab 3: Peserta --- */}
				{activeTab === "peserta" && (
					<div className="space-y-6">
						{/* Quota */}
						<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-200/50 dark:border-white/[0.06]">
							<h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
								<LuUsers className="w-5 h-5 text-red-500" />
								Kuota Peserta
							</h2>
							{event.schoolCategoryLimits && event.schoolCategoryLimits.length > 0 ? (
								<div className="space-y-4">
									{event.schoolCategoryLimits.map((limit) => {
										const current = limit.currentParticipants || 0;
										const max = limit.maxParticipants;
										const percentage = (current / max) * 100;
										const isFull = current >= max;
										return (
											<div key={limit.id}>
												<div className="flex items-center justify-between mb-1.5">
													<span className="font-semibold text-gray-900 dark:text-white text-sm">{limit.schoolCategory.name}</span>
													<span className={`text-sm font-bold ${isFull ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-400"}`}>
														{current} / {max} tim
													</span>
												</div>
												<div className="w-full bg-gray-200 dark:bg-white/[0.06] rounded-full h-2.5">
													<div
														className={`h-2.5 rounded-full transition-all ${
															isFull ? "bg-red-500" : percentage > 75 ? "bg-yellow-500" : "bg-green-500"
														}`}
														style={{ width: `${Math.min(percentage, 100)}%` }}
													/>
												</div>
											</div>
										);
									})}
								</div>
							) : (
								<div className="flex items-center gap-3">
									<LuUsers className="w-8 h-8 text-red-500" />
									<div>
										<p className="text-gray-900 dark:text-white font-semibold">
											{event.currentParticipants} / {event.maxParticipants || "∞"} terdaftar
										</p>
										{event.maxParticipants && (
											<p className="text-sm text-green-600 dark:text-green-400">{getAvailableSpots()} slot tersisa</p>
										)}
									</div>
								</div>
							)}
						</div>

						{/* Registered Participants */}
						{participantsSummary.length > 0 && (() => {
							const allCategories = Array.from(
								new Set(participantsSummary.flatMap((p) => p.teams.map((t) => t.category).filter(Boolean)))
							) as string[];

							const filteredSummary = participantTab === "all"
								? participantsSummary
								: participantsSummary
									.map((p) => ({
										...p,
										teams: p.teams.filter((t) => t.category === participantTab),
										teamCount: p.teams.filter((t) => t.category === participantTab).length,
									}))
									.filter((p) => p.teams.length > 0);

							const totalTeams = filteredSummary.reduce((acc, p) => acc + p.teamCount, 0);

							return (
								<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-200/50 dark:border-white/[0.06]">
									<h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
										<LuUsers className="w-5 h-5 text-red-500" />
										Peserta Terdaftar ({totalTeams} Tim)
									</h2>

									{allCategories.length > 1 && (
										<div className="flex flex-wrap gap-2 mb-4 border-b border-gray-200/50 dark:border-white/[0.06] pb-3">
											<button
												onClick={() => setParticipantTab("all")}
												className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
													participantTab === "all"
														? "bg-red-600 text-white"
														: "bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/[0.1]"
												}`}
											>
												Semua
											</button>
											{allCategories.map((cat) => (
												<button
													key={cat}
													onClick={() => setParticipantTab(cat)}
													className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
														participantTab === cat
															? "bg-red-600 text-white"
															: "bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/[0.1]"
													}`}
												>
													{cat}
												</button>
											))}
										</div>
									)}

									<div className="space-y-3 overflow-y-auto" style={{ maxHeight: "80vh" }}>
										{filteredSummary.map((participant, idx) => (
											<div key={idx} className="p-3 bg-red-50/50 dark:bg-white/[0.03] rounded-xl border border-gray-200/50 dark:border-white/[0.06]">
												<div className="flex items-center justify-between mb-2">
													<span className="font-semibold text-gray-900 dark:text-white">{participant.schoolName}</span>
													<span className="text-sm text-gray-500 dark:text-gray-400 bg-red-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">{participant.teamCount} tim</span>
												</div>
												<div className="flex flex-wrap gap-2">
													{participant.teams.map((team, tidx) => (
														<span key={tidx} className="inline-flex items-center px-2.5 py-1 bg-white/80 dark:bg-white/[0.06] text-gray-700 dark:text-gray-200 text-xs rounded-full border border-gray-200/50 dark:border-white/[0.06]">
															{team.name}
															{team.category && participantTab === "all" && (
																<span className="ml-1 text-red-500 dark:text-red-400">({team.category})</span>
															)}
														</span>
													))}
												</div>
											</div>
										))}
									</div>
								</div>
							);
						})()}
					</div>
				)}

				{/* --- Tab 4: Leaderboard --- */}
				{activeTab === "leaderboard" && (() => {
					const leaderboard = leaderboardData?.leaderboard || [];
					const schoolCategories = leaderboardData?.schoolCategories || [];

					// Group by school category — no "Semua" tab
					const defaultCat = schoolCategories && schoolCategories.length > 0 ? schoolCategories[0]!.id : "all";
					const currentTab = leaderboardTab === "all" && schoolCategories.length > 0 ? defaultCat : leaderboardTab;
					const filteredLeaderboard = schoolCategories.length > 0
						? leaderboard.filter((l) => l.schoolCategory?.id === currentTab)
						: leaderboard;

					const ranked = [...filteredLeaderboard].sort((a, b) => b.grandTotal - a.grandTotal);

					return (
						<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-200/50 dark:border-white/[0.06]">
							<h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
								<LuTrophy className="w-5 h-5 text-yellow-500" />
								Rekapitulasi Nilai & Peringkat
							</h2>

							{/* School Category Tabs - no "Semua" */}
							{schoolCategories.length > 1 && (
								<div className="flex flex-wrap gap-2 mb-4 border-b border-gray-200/50 dark:border-white/[0.06] pb-3">
									{schoolCategories.map((cat) => (
										<button
											key={cat.id}
											onClick={() => setLeaderboardTab(cat.id)}
											className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
												currentTab === cat.id
													? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow"
													: "bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/[0.1]"
											}`}
										>
											{cat.name}
										</button>
									))}
								</div>
							)}

							{/* Leaderboard Table */}
							<div className="overflow-x-auto" style={{ maxHeight: "80vh", overflowY: "auto" }}>
								<table className="w-full text-sm">
									<thead className="sticky top-0 bg-white/60 dark:bg-white/[0.03] backdrop-blur-sm">
										<tr>
											<th className="px-3 py-3 text-left text-gray-500 dark:text-gray-400 font-semibold">#</th>
											<th className="px-3 py-3 text-left text-gray-500 dark:text-gray-400 font-semibold">Peserta</th>
											<th className="px-3 py-3 text-left text-gray-500 dark:text-gray-400 font-semibold">Asal</th>
											<th className="px-3 py-3 text-right text-gray-500 dark:text-gray-400 font-semibold">Total Nilai</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-200/50 dark:divide-white/[0.06]">
										{ranked.map((entry, idx) => {
											const rank = idx + 1;
											const isTop3 = rank <= 3;
											const medalEmoji = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
											return (
												<tr key={entry.id} className={`${isTop3 ? "bg-yellow-50/70 dark:bg-yellow-900/10" : ""} hover:bg-white/40 dark:hover:bg-white/[0.03] transition-colors`}>
													<td className="px-3 py-3">
														{medalEmoji ? (
															<span className="text-lg">{medalEmoji}</span>
														) : (
															<span className="font-bold text-gray-400 dark:text-gray-500">{rank}</span>
														)}
													</td>
													<td className="px-3 py-3">
														<span className={`font-semibold ${isTop3 ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}>
															{entry.teamName}
														</span>
													</td>
													<td className="px-3 py-3 text-gray-600 dark:text-gray-400">{entry.schoolName}</td>
													<td className="px-3 py-3 text-right">
														<span className={`font-bold ${isTop3 ? "text-red-600 dark:text-red-400 text-base" : "text-gray-700 dark:text-gray-300"}`}>
															{entry.grandTotal.toFixed(1)}
														</span>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
								{ranked.length === 0 && (
									<div className="text-center py-8 text-gray-500 dark:text-gray-400">
										<LuTrophy className="w-12 h-12 mx-auto mb-2 opacity-30" />
										<p>Belum ada data peringkat untuk kategori ini</p>
									</div>
								)}
							</div>
						</div>
					);
				})()}

				{/* ============ Like, Comment & Share Section ============ */}
				<div className="mt-8 bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-200/50 dark:border-white/[0.06]">
					{/* Event Caption */}
					{event.description && (
						<div className="mb-5 pb-5 border-b border-gray-200/50 dark:border-white/[0.06]">
							<h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{event.title}</h2>
							<p className="text-gray-600 dark:text-gray-400 text-sm whitespace-pre-line line-clamp-3">{event.description}</p>
						</div>
					)}

					{/* Like, Share buttons */}
					<div className="flex items-center justify-between mb-6">
						<div className="flex items-center gap-3">
							<button
								onClick={handleToggleLike}
								disabled={togglingLike}
								className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all active:scale-95 ${
									likeData.isLiked
										? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50"
										: "bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-white/[0.1] border border-gray-200/50 dark:border-white/[0.06]"
								}`}
							>
								{likeData.isLiked ? (
									<LuHeart className="w-5 h-5 text-red-500 fill-red-500" />
								) : (
									<LuHeart className="w-5 h-5" />
								)}
								<span className="font-bold">{likeData.count}</span>
								<span className="hidden sm:inline">Suka</span>
							</button>
							<button
								onClick={handleShare}
								className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/[0.1] border border-gray-200/50 dark:border-white/[0.06] transition-all active:scale-95"
							>
								<LuShare2 className="w-5 h-5" />
								<span className="hidden sm:inline">Bagikan</span>
							</button>
						</div>
						<div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
							<LuMessageCircle className="w-5 h-5" />
							<span className="text-sm">{comments.length} Komentar</span>
						</div>
					</div>

					{/* Comment Form */}
					{isAuthenticated ? (
						<div className="mb-6">
							<div className="flex gap-3">
								<div className="flex-shrink-0">
									<div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white font-bold">
										{user?.name?.charAt(0).toUpperCase() || "U"}
									</div>
								</div>
								<div className="flex-1">
									<textarea
										value={newComment}
										onChange={(e) => setNewComment(e.target.value)}
										placeholder="Tulis komentar..."
										className="w-full px-4 py-3 bg-white/60 dark:bg-white/[0.03] border border-gray-200/50 dark:border-white/[0.06] rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none transition-colors"
										rows={3}
										maxLength={1000}
									/>
									<div className="flex justify-between items-center mt-2">
										<span className="text-xs text-gray-400">{newComment.length}/1000</span>
										<button
											onClick={handleAddComment}
											disabled={!newComment.trim() || submittingComment}
											className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed text-sm"
										>
											{submittingComment ? "Mengirim..." : "Kirim"}
										</button>
									</div>
								</div>
							</div>
						</div>
					) : (
						<div className="mb-6 p-4 bg-red-50/50 dark:bg-white/[0.03] rounded-xl text-center border border-gray-200/50 dark:border-white/[0.06]">
							<p className="text-gray-600 dark:text-gray-400 mb-2">Login untuk memberikan komentar</p>
							<Link
								to="/login"
								state={{ from: `/events/${id}` }}
								className="text-red-600 dark:text-red-400 font-medium hover:underline"
							>
								Login Sekarang →
							</Link>
						</div>
					)}

					{/* Comments List */}
					<div className="space-y-4">
						{comments.length === 0 ? (
							<div className="text-center py-8 text-gray-500 dark:text-gray-400">
								<LuMessageCircle className="w-12 h-12 mx-auto mb-2 opacity-40" />
								<p>Belum ada komentar</p>
								<p className="text-sm">Jadilah yang pertama berkomentar!</p>
							</div>
						) : (
							comments.map((comment) => (
								<div key={comment.id} className="flex gap-3 p-4 bg-white/40 dark:bg-white/[0.02] rounded-xl border border-gray-200/50 dark:border-white/[0.06]">
									<div className="flex-shrink-0">
										{comment.user.profile?.avatar ? (
											<img
												src={getImageUrl(comment.user.profile.avatar) || ""}
												alt={comment.user.name}
												className="w-10 h-10 rounded-full object-cover"
											/>
										) : (
											<div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white font-bold text-sm">
												{comment.user.name.charAt(0).toUpperCase()}
											</div>
										)}
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-start justify-between gap-2">
											<div>
												<p className="font-semibold text-gray-900 dark:text-white">
													{comment.user.name}
													<span className="ml-2 text-xs font-normal px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded-full">
														{comment.user.role}
													</span>
												</p>
												<p className="text-xs text-gray-500 dark:text-gray-400">
													{comment.user.email}
													{comment.user.profile?.institution && <span> • {comment.user.profile.institution}</span>}
												</p>
											</div>
											{(user?.id === comment.user.id || user?.role === "SUPERADMIN" || user?.role === "PANITIA") && (
												<button
													onClick={() => handleDeleteComment(comment.id)}
													className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-white/[0.06] rounded-lg transition-colors"
													title="Hapus komentar"
												>
													<LuTrash2 className="w-4 h-4" />
												</button>
											)}
										</div>
										<p className="mt-2 text-gray-700 dark:text-gray-300 whitespace-pre-line break-words">{comment.content}</p>
										<p className="mt-2 text-xs text-gray-400">{formatCommentDate(comment.createdAt)}</p>
									</div>
								</div>
							))
						)}
					</div>
				</div>

			</div>
		</div>
	);
};

export default EventDetail;
