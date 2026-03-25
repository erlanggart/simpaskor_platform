import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
	LuCalendar,
	LuMapPin,
	LuUsers,
	LuBadgeDollarSign,
	LuUserCog,
	LuTrophy,
	LuPencil,
	LuArrowLeft,
	LuBookOpen,
	LuChartBar,
	LuTriangleAlert,
	LuCircleCheck,
	LuClock,
	LuCircleX,
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
		const backendUrl = import.meta.env.VITE_BACKEND_URL || "";
		return `${backendUrl}${path}`;
	};

	const getStatusConfig = (status: string) => {
		const configs: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
			DRAFT: {
				color: "bg-gray-500/20 text-gray-400 border border-gray-500/20",
				icon: <LuTriangleAlert className="w-4 h-4" />,
				label: "Draft",
			},
			PUBLISHED: {
				color: "bg-green-500/20 text-green-400 border border-green-500/20",
				icon: <LuCircleCheck className="w-4 h-4" />,
				label: "Published",
			},
			ONGOING: {
				color: "bg-blue-500/20 text-blue-400 border border-blue-500/20",
				icon: <LuClock className="w-4 h-4" />,
				label: "Ongoing",
			},
			COMPLETED: {
				color: "bg-purple-500/20 text-purple-400 border border-purple-500/20",
				icon: <LuCircleCheck className="w-4 h-4" />,
				label: "Completed",
			},
			CANCELLED: {
				color: "bg-red-500/20 text-red-400 border border-red-500/20",
				icon: <LuCircleX className="w-4 h-4" />,
				label: "Cancelled",
			},
		};
		return (configs[status] || configs.DRAFT)!;
	};

	const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
		{ key: "info", label: "Informasi", icon: <LuCalendar className="w-4 h-4" /> },
		{ key: "panitia", label: "Panitia", icon: <LuUserCog className="w-4 h-4" /> },
		{ key: "juri", label: "Juri", icon: <LuTrophy className="w-4 h-4" /> },
		{ key: "peserta", label: "Peserta", icon: <LuUsers className="w-4 h-4" /> },
		{ key: "materi", label: "Materi", icon: <LuBookOpen className="w-4 h-4" /> },
		{ key: "rekap", label: "Rekapitulasi", icon: <LuChartBar className="w-4 h-4" /> },
	];

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
						onClick={() => navigate("/admin/events")}
						className="mt-4 text-red-500 hover:text-red-400 text-sm"
					>
						Kembali ke Event Management
					</button>
				</div>
			</div>
		);
	}

	const statusConfig = getStatusConfig(event.status);

	return (
		<div className="min-h-screen transition-colors">
			{/* Header */}
			<header className="border-b border-gray-200/30 dark:border-white/[0.06] bg-white/60 dark:bg-white/[0.02] backdrop-blur-xl">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between py-5">
						<div className="flex items-center gap-4">
							<button
								onClick={() => navigate("/admin/events")}
								className="p-2 rounded-xl bg-gray-100/80 dark:bg-white/[0.06] border border-gray-200/50 dark:border-white/[0.08] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
							>
								<LuArrowLeft className="w-4 h-4" />
							</button>
							<div>
								<div className="flex items-center gap-3">
									<h1 className="text-xl font-bold text-gray-900 dark:text-white">
										{event.title}
									</h1>
									<span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
										{statusConfig.icon}
										{statusConfig.label}
									</span>
								</div>
								<p className="text-sm text-gray-500 dark:text-gray-500 mt-0.5">
									{event.organizer || "No organizer"}
								</p>
							</div>
						</div>
						<Link
							to={`/admin/events/${event.id}/edit`}
							className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-red-500/20"
						>
							<LuPencil className="w-4 h-4" />
							Edit Event
						</Link>
					</div>
				</div>
			</header>

			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Tabs - pill style */}
				<div className="mb-6 flex gap-1 overflow-x-auto pb-1">
					{tabs.map((tab) => (
						<button
							key={tab.key}
							onClick={() => setActiveTab(tab.key)}
							className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
								activeTab === tab.key
									? "bg-red-500/15 text-red-500 dark:text-red-400 border border-red-500/20"
									: "bg-gray-100/50 dark:bg-white/[0.03] text-gray-500 dark:text-gray-500 border border-gray-200/30 dark:border-white/[0.04] hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.06]"
							}`}
						>
							{tab.icon}
							{tab.label}
						</button>
					))}
				</div>

				{/* Tab Content */}
				{activeTab === "info" && (
					<div className="space-y-6">
						{/* Event Thumbnail & Basic Info */}
						<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl border border-gray-200/50 dark:border-white/[0.06] rounded-2xl overflow-hidden">
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
									<h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Informasi Event</h3>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="flex items-start gap-3">
											<div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/[0.06] border border-gray-200/50 dark:border-white/[0.08] flex items-center justify-center flex-shrink-0">
												<LuCalendar className="w-4 h-4 text-red-500/80" />
											</div>
											<div>
												<p className="text-xs text-gray-400 dark:text-gray-500">Tanggal</p>
												<p className="text-sm text-gray-900 dark:text-white">
													{formatDate(event.startDate)} - {formatDate(event.endDate)}
												</p>
											</div>
										</div>
										<div className="flex items-start gap-3">
											<div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/[0.06] border border-gray-200/50 dark:border-white/[0.08] flex items-center justify-center flex-shrink-0">
												<LuMapPin className="w-4 h-4 text-red-500/80" />
											</div>
											<div>
												<p className="text-xs text-gray-400 dark:text-gray-500">Lokasi</p>
												<p className="text-sm text-gray-900 dark:text-white">{event.location || "-"}</p>
												{event.venue && (
													<p className="text-xs text-gray-500 dark:text-gray-500">{event.venue}</p>
												)}
											</div>
										</div>
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
												<p className="text-sm text-gray-900 dark:text-white">{formatCurrency(event.registrationFee)}</p>
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
								</div>
							</div>
						</div>

						{/* School Category Limits */}
						{event.schoolCategoryLimits && event.schoolCategoryLimits.length > 0 && (
							<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl border border-gray-200/50 dark:border-white/[0.06] rounded-2xl p-6">
								<h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Kuota per Kategori Sekolah</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
									{event.schoolCategoryLimits.map((limit) => (
										<div key={limit.id} className="bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/30 dark:border-white/[0.06] rounded-xl p-4">
											<p className="text-sm font-medium text-gray-900 dark:text-white">{limit.schoolCategory.name}</p>
											<p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
												{limit.currentParticipants || 0} / {limit.maxParticipants} peserta
											</p>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Assessment Categories */}
						{event.assessmentCategories && event.assessmentCategories.length > 0 && (
							<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl border border-gray-200/50 dark:border-white/[0.06] rounded-2xl p-6">
								<h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Kategori Penilaian</h3>
								<div className="flex flex-wrap gap-2">
									{event.assessmentCategories.map((cat) => (
										<span
											key={cat.id}
											className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-xs font-medium"
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
					<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl border border-gray-200/50 dark:border-white/[0.06] rounded-2xl p-6">
						<h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Panitia Event</h3>
						{event.createdBy ? (
							<div className="flex items-center gap-4 p-4 bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/30 dark:border-white/[0.06] rounded-xl">
								<div className="w-11 h-11 bg-red-500/15 rounded-xl flex items-center justify-center border border-red-500/20">
									<span className="text-red-500 font-semibold text-lg">
										{event.createdBy.name.charAt(0).toUpperCase()}
									</span>
								</div>
								<div>
									<p className="text-sm font-medium text-gray-900 dark:text-white">{event.createdBy.name}</p>
									<p className="text-xs text-gray-500 dark:text-gray-500">{event.createdBy.email}</p>
									<span className="inline-block mt-1 px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-medium rounded-full">
										Creator / Penyelenggara
									</span>
								</div>
							</div>
						) : (
							<p className="text-sm text-gray-500 dark:text-gray-500">Tidak ada data panitia</p>
						)}
					</div>
				)}

				{activeTab === "juri" && (
					<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl border border-gray-200/50 dark:border-white/[0.06] rounded-2xl p-6">
						<h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
							Daftar Juri ({event.juryAssignments?.length || 0})
						</h3>
						{event.juryAssignments && event.juryAssignments.length > 0 ? (
							<div className="space-y-3">
								{event.juryAssignments.map((assignment) => (
									<div key={assignment.id} className="flex items-start gap-4 p-4 bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/30 dark:border-white/[0.06] rounded-xl">
										<div className="w-11 h-11 bg-amber-500/15 rounded-xl flex items-center justify-center border border-amber-500/20 flex-shrink-0">
											<span className="text-amber-500 font-semibold text-lg">
												{assignment.jury.name.charAt(0).toUpperCase()}
											</span>
										</div>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2">
												<p className="text-sm font-medium text-gray-900 dark:text-white">{assignment.jury.name}</p>
												<span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
													assignment.status === "ACCEPTED"
														? "bg-green-500/15 text-green-400 border border-green-500/20"
														: assignment.status === "PENDING"
														? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
														: "bg-red-500/15 text-red-400 border border-red-500/20"
												}`}>
													{assignment.status}
												</span>
											</div>
											<p className="text-xs text-gray-500 dark:text-gray-500">{assignment.jury.email}</p>
											{assignment.jury.profile?.institution && (
												<p className="text-xs text-gray-500 dark:text-gray-500">{assignment.jury.profile.institution}</p>
											)}
											{assignment.assignedCategories.length > 0 && (
												<div className="flex flex-wrap gap-1 mt-2">
													{assignment.assignedCategories.map((cat) => (
														<span
															key={cat.assessmentCategory.id}
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
						) : (
							<p className="text-sm text-gray-500 dark:text-gray-500">Belum ada juri yang ditugaskan</p>
						)}
					</div>
				)}

				{activeTab === "peserta" && (
					<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl border border-gray-200/50 dark:border-white/[0.06] rounded-2xl p-6">
						<h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
							Daftar Peserta ({participants.length})
						</h3>
						{participants.length > 0 ? (
							<div className="overflow-x-auto">
								<table className="min-w-full">
									<thead>
										<tr className="border-b border-gray-200/30 dark:border-white/[0.06]">
											<th className="px-4 py-3 text-left text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">No.</th>
											<th className="px-4 py-3 text-left text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Tim</th>
											<th className="px-4 py-3 text-left text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Pendaftar</th>
											<th className="px-4 py-3 text-left text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Kategori</th>
											<th className="px-4 py-3 text-left text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Status</th>
										</tr>
									</thead>
									<tbody>
										{participants.map((p, idx) => (
											<tr key={p.id} className="border-b border-gray-200/20 dark:border-white/[0.04] last:border-0">
												<td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{p.orderNumber || idx + 1}</td>
												<td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{p.teamName || "-"}</td>
												<td className="px-4 py-3">
													<p className="text-sm text-gray-900 dark:text-white">{p.user.name}</p>
													<p className="text-[10px] text-gray-400 dark:text-gray-500">{p.user.email}</p>
												</td>
												<td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
													{p.schoolCategory?.name || "-"}
												</td>
												<td className="px-4 py-3">
													<span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
														p.status === "CONFIRMED"
															? "bg-green-500/15 text-green-400 border border-green-500/20"
															: p.status === "PENDING"
															? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
															: "bg-red-500/15 text-red-400 border border-red-500/20"
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
							<p className="text-sm text-gray-500 dark:text-gray-500">Belum ada peserta terdaftar</p>
						)}
					</div>
				)}

				{activeTab === "materi" && (
					<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl border border-gray-200/50 dark:border-white/[0.06] rounded-2xl p-6">
						<h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
							Daftar Materi ({materials.length})
						</h3>
						{materials.length > 0 ? (
							<div className="space-y-3">
								{materials.map((material, idx) => (
									<div key={material.id} className="flex items-start gap-4 p-4 bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/30 dark:border-white/[0.06] rounded-xl">
										<div className="w-10 h-10 bg-blue-500/15 rounded-xl flex items-center justify-center border border-blue-500/20 flex-shrink-0">
											<span className="text-blue-400 font-semibold text-sm">{material.order || idx + 1}</span>
										</div>
										<div>
											<p className="text-sm font-medium text-gray-900 dark:text-white">{material.name}</p>
											{material.description && (
												<p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{material.description}</p>
											)}
											<span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium ${
												material.isActive
													? "bg-green-500/15 text-green-400 border border-green-500/20"
													: "bg-gray-500/15 text-gray-400 border border-gray-500/20"
											}`}>
												{material.isActive ? "Aktif" : "Nonaktif"}
											</span>
										</div>
									</div>
								))}
							</div>
						) : (
							<p className="text-sm text-gray-500 dark:text-gray-500">Belum ada materi</p>
						)}
					</div>
				)}

				{activeTab === "rekap" && (
					<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl border border-gray-200/50 dark:border-white/[0.06] rounded-2xl p-6">
						<h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Rekapitulasi Penilaian</h3>
						<p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
							Lihat rekapitulasi lengkap penilaian untuk event ini.
						</p>
						<Link
							to={`/admin/events/${event.slug || event.id}/rekapitulasi`}
							className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-red-500/20"
						>
							<LuChartBar className="w-4 h-4" />
							Lihat Rekapitulasi Lengkap
						</Link>
					</div>
				)}
			</main>
		</div>
	);
};

export default AdminEventDetail;
