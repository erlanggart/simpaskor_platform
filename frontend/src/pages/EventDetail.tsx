import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
	CalendarIcon,
	MapPinIcon,
	UsersIcon,
	ClockIcon,
	CurrencyDollarIcon,
	UserGroupIcon,
	CheckCircleIcon,
	XCircleIcon,
	ArrowLeftIcon,
	TrophyIcon,
	DocumentArrowDownIcon,
	EyeIcon,
	ChatBubbleLeftIcon,
	TrashIcon,
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartIconSolid } from "@heroicons/react/24/solid";
import { HeartIcon as HeartIconOutline } from "@heroicons/react/24/outline";
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
	status: string;
	featured: boolean;
	createdBy?: EventCreator;
	schoolCategoryLimits?: SchoolCategoryLimit[];
	assessmentCategories?: EventAssessmentCategory[];
	juryAssignments?: JuryAssignment[];
}

interface ParticipantSummary {
	schoolName: string;
	teamCount: number;
	teams: { name: string; category: string | null }[];
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
			import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
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
			<div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
					<p className="mt-4 text-gray-600 dark:text-gray-400">
						Memuat detail event...
					</p>
				</div>
			</div>
		);
	}

	if (error || !event) {
		return (
			<div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
				<div className="text-center max-w-md">
					<XCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
					<h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
						Event Tidak Ditemukan
					</h2>
					<p className="text-gray-600 dark:text-gray-400 mb-6">
						{error || "Event yang Anda cari tidak tersedia"}
					</p>
					<button
						onClick={() => navigate(-1)}
						className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 text-white rounded-lg transition-colors"
					>
						<ArrowLeftIcon className="w-5 h-5 mr-2" />
						Kembali
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Back Button */}
				<button
					onClick={() => navigate(-1)}
					className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-6 transition-colors"
				>
					<ArrowLeftIcon className="w-5 h-5 mr-2" />
					Kembali
				</button>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Main Content */}
					<div className="lg:col-span-2">
						{/* Event Image with 4:5 aspect ratio */}
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

								{isEventFull() ? (
									<div className="absolute top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
										Event Penuh
									</div>
								) : isRegistrationOpen() ? (
									<div className="absolute bottom-4 right-4 bg-green-500 dark:bg-green-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
										Pendaftaran Dibuka
									</div>
								) : (
									<div className="absolute bottom-4 right-4 bg-gray-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
										Pendaftaran Ditutup
									</div>
								)}
							</div>
						</div>

						{/* Event Description */}
						<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
							<h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
								{event.title}
							</h1>

							{event.description && (
								<div className="prose dark:prose-invert max-w-none mb-6">
									<p className="text-gray-600 dark:text-gray-300 whitespace-pre-line">
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
									{event.juryAssignments.map((assignment) => (
										<div
											key={assignment.id}
											className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center"
										>
											{/* Avatar */}
											<div className="relative mx-auto w-20 h-20 mb-3">
												{assignment.jury.profile?.avatar ? (
													<img
														src={getImageUrl(assignment.jury.profile.avatar) || ""}
														alt={assignment.jury.name}
														className="w-20 h-20 rounded-full object-cover border-3 border-indigo-200 dark:border-indigo-800"
													/>
												) : (
													<div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
														{assignment.jury.name.charAt(0).toUpperCase()}
													</div>
												)}
												<div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
													<CheckCircleIcon className="w-4 h-4 text-white" />
												</div>
											</div>
											{/* Name */}
											<h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 truncate">
												{assignment.jury.name}
											</h3>
											{/* Institution */}
											{assignment.jury.profile?.institution && (
												<p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-2">
													{assignment.jury.profile.institution}
												</p>
											)}
											{/* Assigned Categories */}
											{assignment.assignedCategories.length > 0 && (
												<div className="flex flex-wrap justify-center gap-1">
													{assignment.assignedCategories.slice(0, 2).map((cat, idx) => (
														<span
															key={idx}
															className="inline-flex items-center px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs rounded-full"
														>
															{cat.assessmentCategory.name}
														</span>
													))}
													{assignment.assignedCategories.length > 2 && (
														<span className="text-xs text-gray-500 dark:text-gray-400">
															+{assignment.assignedCategories.length - 2}
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

						{/* Like & Comment Section */}
						<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
							{/* Event Caption */}
							<div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
								<h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
									{event.title}
								</h2>
								{event.description && (
									<p className="text-gray-600 dark:text-gray-400 text-sm whitespace-pre-line line-clamp-3">
										{event.description}
									</p>
								)}
							</div>

							{/* Like Button */}
							<div className="flex items-center justify-between mb-6">
								<button
									onClick={handleToggleLike}
									disabled={togglingLike}
									className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all active:scale-95 ${
										likeData.isLiked
											? "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400"
											: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
									}`}
								>
									{likeData.isLiked ? (
										<HeartIconSolid className="w-5 h-5 text-red-500" />
									) : (
										<HeartIconOutline className="w-5 h-5" />
									)}
									<span>{likeData.count}</span>
									<span className="hidden sm:inline">Suka</span>
								</button>
								<div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
									<ChatBubbleLeftIcon className="w-5 h-5" />
									<span>{comments.length} Komentar</span>
								</div>
							</div>

							{/* Comment Form */}
							{isAuthenticated ? (
								<div className="mb-6">
									<div className="flex gap-3">
										{/* User Avatar */}
										<div className="flex-shrink-0">
											<div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
												{user?.name?.charAt(0).toUpperCase() || "U"}
											</div>
										</div>
										{/* Input */}
										<div className="flex-1">
											<textarea
												value={newComment}
												onChange={(e) => setNewComment(e.target.value)}
												placeholder="Tulis komentar..."
												className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-colors"
												rows={3}
												maxLength={1000}
											/>
											<div className="flex justify-between items-center mt-2">
												<span className="text-xs text-gray-400">
													{newComment.length}/1000
												</span>
												<button
													onClick={handleAddComment}
													disabled={!newComment.trim() || submittingComment}
													className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed text-sm"
												>
													{submittingComment ? "Mengirim..." : "Kirim"}
												</button>
											</div>
										</div>
									</div>
								</div>
							) : (
								<div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
									<p className="text-gray-600 dark:text-gray-400 mb-2">
										Login untuk memberikan komentar
									</p>
									<Link
										to="/login"
										state={{ from: `/events/${id}` }}
										className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
									>
										Login Sekarang →
									</Link>
								</div>
							)}

							{/* Comments List */}
							<div className="space-y-4">
								{comments.length === 0 ? (
									<div className="text-center py-8 text-gray-500 dark:text-gray-400">
										<ChatBubbleLeftIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
										<p>Belum ada komentar</p>
										<p className="text-sm">Jadilah yang pertama berkomentar!</p>
									</div>
								) : (
									comments.map((comment) => (
										<div
											key={comment.id}
											className="flex gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
										>
											{/* Avatar */}
											<div className="flex-shrink-0">
												{comment.user.profile?.avatar ? (
													<img
														src={getImageUrl(comment.user.profile.avatar) || ""}
														alt={comment.user.name}
														className="w-10 h-10 rounded-full object-cover"
													/>
												) : (
													<div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
														{comment.user.name.charAt(0).toUpperCase()}
													</div>
												)}
											</div>
											{/* Content */}
											<div className="flex-1 min-w-0">
												<div className="flex items-start justify-between gap-2">
													<div>
														<p className="font-semibold text-gray-900 dark:text-white">
															{comment.user.name}
															<span className="ml-2 text-xs font-normal px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 rounded-full">
																{comment.user.role}
															</span>
														</p>
														<p className="text-xs text-gray-500 dark:text-gray-400">
															{comment.user.email}
															{comment.user.profile?.institution && (
																<span> • {comment.user.profile.institution}</span>
															)}
														</p>
													</div>
													{(user?.id === comment.user.id || user?.role === "SUPERADMIN" || user?.role === "PANITIA") && (
														<button
															onClick={() => handleDeleteComment(comment.id)}
															className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
															title="Hapus komentar"
														>
															<TrashIcon className="w-4 h-4" />
														</button>
													)}
												</div>
												<p className="mt-2 text-gray-700 dark:text-gray-300 whitespace-pre-line break-words">
													{comment.content}
												</p>
												<p className="mt-2 text-xs text-gray-400">
													{formatCommentDate(comment.createdAt)}
												</p>
											</div>
										</div>
									))
								)}
							</div>
						</div>
						
					</div>

					{/* Sidebar - Sticky */}
					<div className="lg:col-span-1">
						{/* Event Info Card */}
						<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sticky top-20">
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

								{/* Participants */}
								{event.schoolCategoryLimits &&
								event.schoolCategoryLimits.length > 0 ? (
									<div className="border-t border-gray-200 dark:border-gray-700 pt-4">
										<div className="flex items-start mb-3">
											<UsersIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-3 mt-0.5 flex-shrink-0" />
											<p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
												Kuota Peserta per Kategori Sekolah
											</p>
										</div>
										<div className="space-y-3 ml-8">
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
								) : (
									<div className="flex items-start">
										<UsersIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-3 mt-0.5 flex-shrink-0" />
										<div>
											<p className="text-sm text-gray-500 dark:text-gray-400">
												Peserta
											</p>
											<p className="text-gray-900 dark:text-white font-medium">
												{event.currentParticipants} /{" "}
												{event.maxParticipants || "∞"} terdaftar
											</p>
											{event.maxParticipants && (
												<p className="text-sm text-green-600 dark:text-green-400">
													{getAvailableSpots()} slot tersisa
												</p>
											)}
										</div>
									</div>
								)}

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
								{/* Event Creator */}
								{event.createdBy && (
									<div className="flex items-start pt-4 border-t border-gray-200 dark:border-gray-700">
										<UserGroupIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-3 mt-0.5 flex-shrink-0" />
										<div>
											<p className="text-sm text-gray-500 dark:text-gray-400">
												Dibuat oleh
											</p>
											<p className="text-gray-900 dark:text-white font-medium">
												{event.createdBy.name}
											</p>
											<a
												href={`mailto:${event.createdBy.email}`}
												className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
											>
												{event.createdBy.email}
											</a>
										</div>
									</div>
								)}							</div>

							{/* Registration Button */}
							<div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
								{myRegistration ? (
									<div className="text-center">
										<div className="inline-flex items-center px-4 py-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg mb-3">
											<CheckCircleIcon className="w-5 h-5 mr-2" />
											<span className="font-semibold">Sudah Terdaftar</span>
										</div>
										<p className="text-sm text-gray-600 dark:text-gray-400">
											{myRegistration.groups.filter(g => g.status === "ACTIVE").length} Tim Terdaftar
										</p>
										<Link
											to="/peserta/registrations"
											className="mt-3 inline-block text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
										>
											Kelola Pendaftaran →
										</Link>
									</div>
								) : isAuthenticated && user?.role !== "PESERTA" ? (
									<div className="text-center text-gray-500 dark:text-gray-400">
										<p className="text-sm">
											Hanya akun PESERTA yang dapat mendaftar ke event
										</p>
									</div>
								) : isRegistrationOpen() ? (
									<>
										<button
											onClick={handleRegister}
											disabled={checkingRegistration}
											className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
										>
											{checkingRegistration ? (
												<>
													<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
													Memeriksa...
												</>
											) : (
												<>
													<UserGroupIcon className="w-5 h-5 mr-2" />
													{isAuthenticated ? "Daftar Sekarang" : "Login untuk Daftar"}
												</>
											)}
										</button>
										
										{!isAuthenticated && (
											<p className="mt-3 text-sm text-center text-gray-500 dark:text-gray-400">
												Silakan login terlebih dahulu untuk mendaftar ke event ini
											</p>
										)}
									</>
								) : isEventFull() ? (
									<button
										disabled
										className="w-full px-6 py-3 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg font-semibold cursor-not-allowed"
									>
										Event Penuh
									</button>
								) : (
									<button
										disabled
										className="w-full px-6 py-3 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg font-semibold cursor-not-allowed"
									>
										Pendaftaran Ditutup
									</button>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>

		</div>
	);
};

export default EventDetail;
