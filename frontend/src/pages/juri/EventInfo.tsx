import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
	LuCalendar,
	LuMapPin,
	LuUsers,
	LuClock,
	LuBadgeDollarSign,
	LuTrophy,
	LuInfo,
	LuGraduationCap,
	LuCircleX,
	LuArrowLeft,
	LuBuilding,
	LuMail,
} from "react-icons/lu";
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
	category: string | null;
	level: string | null;
	featured: boolean;
	isPinned?: boolean;
	schoolCategoryLimits?: SchoolCategoryLimit[];
	assessmentCategories?: EventAssessmentCategory[];
	createdBy?: {
		id: string;
		name: string;
		email: string;
	};
}

interface AssignedCategory {
	id: string;
	assessmentCategory: {
		id: string;
		name: string;
		description: string | null;
	};
}

interface JuryAssignment {
	id: string;
	status: string;
	respondedAt: string | null;
	event: Event;
	assignedCategories: AssignedCategory[];
}

const JuriEventInfo: React.FC = () => {
	const { eventSlug } = useParams<{ eventSlug: string }>();
	const [assignment, setAssignment] = useState<JuryAssignment | null>(null);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState<string>("info");

	useEffect(() => {
		if (eventSlug) {
			fetchAssignment();
		}
	}, [eventSlug]);

	const fetchAssignment = async () => {
		try {
			setLoading(true);
			const response = await api.get(`/juries/events/${eventSlug}`);
			setAssignment(response.data);
		} catch (error) {
			console.error("Error fetching event:", error);
		} finally {
			setLoading(false);
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	};

	const getImageUrl = (thumbnail: string | null) => {
		if (!thumbnail) return null;
		if (thumbnail.startsWith("http://") || thumbnail.startsWith("https://")) {
			return thumbnail;
		}
		const backendUrl = import.meta.env.VITE_BACKEND_URL || "";
		return `${backendUrl}${thumbnail}`;
	};

	const formatCurrency = (amount: number | null) => {
		if (!amount) return "Gratis";
		return new Intl.NumberFormat("id-ID", {
			style: "currency",
			currency: "IDR",
			minimumFractionDigits: 0,
		}).format(amount);
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "PUBLISHED": return "bg-green-500/90";
			case "ONGOING": return "bg-blue-500/90";
			case "COMPLETED": return "bg-gray-500/90";
			case "DRAFT": return "bg-yellow-500/90";
			default: return "bg-gray-500/90";
		}
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

	if (!assignment) {
		return (
			<div className="min-h-screen flex items-center justify-center px-4">
				<div className="text-center max-w-md">
					<LuCircleX className="w-12 h-12 text-red-500/60 mx-auto mb-4" />
					<h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
						Event Tidak Ditemukan
					</h2>
					<p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
						Event yang Anda cari tidak tersedia atau Anda tidak memiliki akses
					</p>
					<Link
						to="/juri/events"
						className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-red-500/20"
					>
						<LuArrowLeft className="w-4 h-4" />
						Kembali ke Event Saya
					</Link>
				</div>
			</div>
		);
	}

	const event = assignment.event;
	const isPromoted = Boolean(event.isPinned || event.featured);

	const tabs = [
		{ id: "info", label: "Informasi Event", icon: LuInfo },
		{ id: "penilaian", label: "Kategori Penilaian", icon: LuTrophy },
	];

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

								{/* Event status badge */}
								<div className={`absolute bottom-4 right-4 ${getStatusColor(event.status)} backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg`}>
									{event.status}
								</div>
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

							{/* Participants */}
							<div className="flex items-start gap-3">
								<div className="w-8 h-8 rounded-lg bg-red-500/10 dark:bg-red-500/10 flex items-center justify-center flex-shrink-0">
									<LuUsers className="w-4 h-4 text-red-500" />
								</div>
								<div>
									<p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium">Peserta</p>
									<p className="text-gray-900 dark:text-white font-semibold">
										{event.currentParticipants}
										{event.maxParticipants && ` / ${event.maxParticipants}`} peserta
									</p>
								</div>
							</div>

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

						{/* Your Assigned Categories - Highlighted */}
						{assignment.assignedCategories && assignment.assignedCategories.length > 0 && (
							<div className="mt-6 pt-6 border-t border-gray-200/50 dark:border-white/[0.06]">
								<div className="bg-red-50/80 dark:bg-red-900/20 rounded-xl p-4 border border-red-200/50 dark:border-red-800/30">
									<div className="flex items-center gap-2 mb-3">
										<LuGraduationCap className="w-5 h-5 text-red-600 dark:text-red-400" />
										<h3 className="font-bold text-red-800 dark:text-red-200 text-sm">Kategori Penilaian Anda</h3>
									</div>
									<div className="flex flex-wrap gap-2">
										{assignment.assignedCategories.map((cat) => (
											<span
												key={cat.id}
												className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-semibold shadow-sm"
											>
												{cat.assessmentCategory.name}
											</span>
										))}
									</div>
								</div>
							</div>
						)}
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

						{/* Organizer & Contact */}
						{(event.organizer || event.organizerEmail) && (
							<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-200/50 dark:border-white/[0.06]">
								<h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
									<LuBuilding className="w-5 h-5 text-red-500" />
									Penyelenggara
								</h2>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									{event.organizer && (
										<div className="flex items-center gap-3 p-4 bg-red-50/50 dark:bg-white/[0.03] rounded-xl border border-gray-200/50 dark:border-white/[0.06]">
											<LuBuilding className="w-8 h-8 text-red-500 flex-shrink-0" />
											<div>
												<p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium">Organisasi</p>
												<p className="font-semibold text-gray-900 dark:text-white">{event.organizer}</p>
											</div>
										</div>
									)}
									{event.organizerEmail && (
										<div className="flex items-center gap-3 p-4 bg-red-50/50 dark:bg-white/[0.03] rounded-xl border border-gray-200/50 dark:border-white/[0.06]">
											<LuMail className="w-8 h-8 text-red-500 flex-shrink-0" />
											<div>
												<p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium">Email</p>
												<a
													href={`mailto:${event.organizerEmail}`}
													className="font-semibold text-red-600 dark:text-red-400 hover:underline"
												>
													{event.organizerEmail}
												</a>
											</div>
										</div>
									)}
								</div>
							</div>
						)}

						{/* School Category Limits */}
						{event.schoolCategoryLimits && event.schoolCategoryLimits.length > 0 && (
							<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-200/50 dark:border-white/[0.06]">
								<h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
									<LuUsers className="w-5 h-5 text-red-500" />
									Kuota Peserta
								</h2>
								<div className="space-y-4">
									{event.schoolCategoryLimits.map((limit) => {
										const percentage = limit.maxParticipants > 0
											? Math.min(((limit.currentParticipants || 0) / limit.maxParticipants) * 100, 100)
											: 0;
										return (
											<div key={limit.id}>
												<div className="flex justify-between mb-1.5">
													<span className="font-semibold text-gray-900 dark:text-white text-sm">
														{limit.schoolCategory.name}
													</span>
													<span className="text-sm text-gray-500 dark:text-gray-400">
														{limit.currentParticipants || 0} / {limit.maxParticipants}
													</span>
												</div>
												<div className="w-full bg-gray-200 dark:bg-white/[0.06] rounded-full h-2.5">
													<div
														className="bg-red-600 h-2.5 rounded-full transition-all"
														style={{ width: `${percentage}%` }}
													/>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						)}

						{/* Info Box */}
						<div className="bg-red-50/80 dark:bg-red-900/10 backdrop-blur-xl rounded-2xl p-5 border border-red-200/50 dark:border-red-800/30">
							<p className="text-sm text-red-800 dark:text-red-200">
								<span className="font-semibold">Info:</span> Gunakan menu sidebar untuk melihat materi, daftar peserta, dan melakukan penilaian.
							</p>
						</div>
					</div>
				)}

				{/* --- Tab 2: Kategori Penilaian --- */}
				{activeTab === "penilaian" && (
					<div className="space-y-6">
						{/* Your Assigned Categories */}
						{assignment.assignedCategories && assignment.assignedCategories.length > 0 && (
							<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-red-200/50 dark:border-red-800/30">
								<h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
									<LuGraduationCap className="w-5 h-5 text-red-500" />
									Kategori Penilaian Anda
								</h2>
								<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
									{assignment.assignedCategories.map((cat, idx) => (
										<div
											key={cat.id}
											className="flex items-center gap-3 p-4 bg-red-50/80 dark:bg-red-900/20 rounded-xl border border-red-200/50 dark:border-red-800/30"
										>
											<div className="w-8 h-8 flex items-center justify-center bg-red-600 text-white rounded-full text-sm font-bold flex-shrink-0">
												{idx + 1}
											</div>
											<div className="min-w-0">
												<p className="font-semibold text-red-800 dark:text-red-200 text-sm truncate">
													{cat.assessmentCategory.name}
												</p>
												{cat.assessmentCategory.description && (
													<p className="text-xs text-red-600/70 dark:text-red-400/70 truncate">
														{cat.assessmentCategory.description}
													</p>
												)}
											</div>
										</div>
									))}
								</div>
							</div>
						)}

						{/* All Assessment Categories */}
						{event.assessmentCategories && event.assessmentCategories.length > 0 && (
							<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-200/50 dark:border-white/[0.06]">
								<h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
									<LuTrophy className="w-5 h-5 text-red-500" />
									Semua Kriteria Penilaian
								</h2>
								<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
									{event.assessmentCategories
										.sort((a, b) => a.assessmentCategory.order - b.assessmentCategory.order)
										.map((category, idx) => {
											const isAssignedToYou = assignment.assignedCategories.some(
												ac => ac.assessmentCategory.id === category.assessmentCategoryId
											);
											return (
												<div
													key={category.id}
													className={`flex items-center gap-3 p-4 rounded-xl border ${
														isAssignedToYou
															? "bg-red-50/80 dark:bg-red-900/20 border-red-200/50 dark:border-red-800/30"
															: "bg-white/60 dark:bg-white/[0.02] border-gray-200/50 dark:border-white/[0.06]"
													}`}
												>
													<div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold flex-shrink-0 ${
														isAssignedToYou
															? "bg-red-600 text-white"
															: "bg-gray-200 dark:bg-white/[0.1] text-gray-600 dark:text-gray-400"
													}`}>
														{idx + 1}
													</div>
													<div className="min-w-0 flex-1">
														<p className={`font-semibold text-sm truncate ${
															isAssignedToYou
																? "text-red-800 dark:text-red-200"
																: "text-gray-900 dark:text-white"
														}`}>
															{category.assessmentCategory.name}
															{isAssignedToYou && (
																<span className="ml-2 text-xs bg-red-600 text-white px-2 py-0.5 rounded">
																	Tugas Anda
																</span>
															)}
														</p>
														{category.assessmentCategory.description && (
															<p className="text-xs text-gray-500 dark:text-gray-400 truncate">
																{category.assessmentCategory.description}
															</p>
														)}
														{category.customWeight !== null && (
															<span className="text-xs font-bold text-red-600 dark:text-red-400">
																Bobot: {category.customWeight}%
															</span>
														)}
													</div>
												</div>
											);
										})}
								</div>
							</div>
						)}
					</div>
				)}

			</div>
		</div>
	);
};

export default JuriEventInfo;
