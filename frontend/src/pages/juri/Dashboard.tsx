import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
	CalendarIcon,
	MapPinIcon,
	UsersIcon,
	ClockIcon,
	ChevronRightIcon,
	CheckCircleIcon,
	TicketIcon,
	TrophyIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../utils/api";

interface AssessmentCategory {
	id: string;
	name: string;
	description: string | null;
}

interface EventInfo {
	id: string;
	title: string;
	slug: string | null;
	thumbnail: string | null;
	description: string | null;
	startDate: string;
	endDate: string;
	location: string | null;
	venue: string | null;
	organizer: string | null;
	status: string;
	currentParticipants: number;
}

interface JuryEvent {
	id: string;
	status: string;
	respondedAt: string | null;
	event: EventInfo;
	assignedCategories: {
		id: string;
		assessmentCategory: AssessmentCategory;
	}[];
}

interface JuryInvitation {
	id: string;
	status: string;
	invitedAt: string;
	event: EventInfo;
	assignedCategories: {
		id: string;
		assessmentCategory: AssessmentCategory;
	}[];
}

const JuriDashboard = () => {
	const { user } = useAuth();
	const [selectedTab, setSelectedTab] = useState<"events" | "invitations">("events");
	const [loading, setLoading] = useState(true);
	const [events, setEvents] = useState<JuryEvent[]>([]);
	const [invitations, setInvitations] = useState<JuryInvitation[]>([]);

	useEffect(() => {
		fetchData();
	}, []);

	const fetchData = async () => {
		try {
			setLoading(true);
			const [eventsRes, invitationsRes] = await Promise.all([
				api.get("/juries/my-events"),
				api.get("/juries/my-invitations"),
			]);
			setEvents(eventsRes.data || []);
			setInvitations(invitationsRes.data?.filter((inv: JuryInvitation) => inv.status === "PENDING") || []);
		} catch (error) {
			console.error("Error fetching data:", error);
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

	const getBackendUrl = () => {
		return import.meta.env.VITE_BACKEND_URL || "";
	};

	const getImageUrl = (thumbnail: string | null) => {
		if (!thumbnail) return null;
		if (thumbnail.startsWith("http")) return thumbnail;
		return `${getBackendUrl()}${thumbnail}`;
	};

	const getEventStatus = (event: EventInfo) => {
		const now = new Date();
		const startDate = new Date(event.startDate);
		const endDate = new Date(event.endDate);

		if (now < startDate) {
			return { label: "Akan Datang", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" };
		} else if (now >= startDate && now <= endDate) {
			return { label: "Berlangsung", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" };
		} else {
			return { label: "Selesai", color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200" };
		}
	};

	// Stats
	const activeEvents = events.filter(e => 
		e.status === "CONFIRMED" && 
		(e.event.status === "ONGOING" || e.event.status === "PUBLISHED")
	).length;
	const completedEvents = events.filter(e => e.event.status === "COMPLETED").length;
	const pendingInvitations = invitations.length;

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
					<p className="mt-4 text-gray-600 dark:text-gray-400">Memuat data...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
						Dashboard Juri
					</h1>
					<p className="mt-2 text-gray-600 dark:text-gray-400">
						Selamat datang, {user?.name}
					</p>
				</div>

				{/* Stats Cards */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600 dark:text-gray-400">Event Aktif</p>
								<p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
									{activeEvents}
								</p>
							</div>
							<TrophyIcon className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
						</div>
					</div>

					<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600 dark:text-gray-400">Event Selesai</p>
								<p className="text-3xl font-bold text-green-600 dark:text-green-400">
									{completedEvents}
								</p>
							</div>
							<CheckCircleIcon className="w-12 h-12 text-green-600 dark:text-green-400" />
						</div>
					</div>

					<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600 dark:text-gray-400">Undangan Pending</p>
								<p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
									{pendingInvitations}
								</p>
							</div>
							<TicketIcon className="w-12 h-12 text-yellow-600 dark:text-yellow-400" />
						</div>
					</div>
				</div>

				{/* Tabs */}
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
					<div className="border-b border-gray-200 dark:border-gray-700">
						<nav className="flex -mb-px">
							<button
								onClick={() => setSelectedTab("events")}
								className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
									selectedTab === "events"
										? "border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400"
										: "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
								}`}
							>
								<span className="flex items-center gap-2">
									<CalendarIcon className="w-5 h-5" />
									Event Saya ({events.length})
								</span>
							</button>
							<button
								onClick={() => setSelectedTab("invitations")}
								className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
									selectedTab === "invitations"
										? "border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400"
										: "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
								}`}
							>
								<span className="flex items-center gap-2">
									<TicketIcon className="w-5 h-5" />
									Undangan ({pendingInvitations})
									{pendingInvitations > 0 && (
										<span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
											{pendingInvitations}
										</span>
									)}
								</span>
							</button>
						</nav>
					</div>
				</div>

				{/* Events Tab Content */}
				{selectedTab === "events" && (
					<div>
						{events.length === 0 ? (
							<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
								<TrophyIcon className="mx-auto h-16 w-16 text-gray-400" />
								<h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
									Belum Ada Event
								</h3>
								<p className="mt-2 text-gray-600 dark:text-gray-400">
									Anda belum menjadi juri di event manapun. Terima undangan untuk mulai menilai.
								</p>
								{pendingInvitations > 0 && (
									<button
										onClick={() => setSelectedTab("invitations")}
										className="mt-4 inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
									>
										Lihat Undangan
										<ChevronRightIcon className="h-5 w-5 ml-1" />
									</button>
								)}
							</div>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
								{events.map((juryEvent) => {
									const status = getEventStatus(juryEvent.event);
									return (
										<Link
											key={juryEvent.id}
											to={`/juri/events/${juryEvent.event.slug}/info`}
											className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow group"
										>
											{/* Event Image */}
											<div className="relative h-48 bg-gradient-to-br from-indigo-500 to-purple-600">
												{juryEvent.event.thumbnail ? (
													<img
														src={getImageUrl(juryEvent.event.thumbnail) || ""}
														alt={juryEvent.event.title}
														className="w-full h-full object-cover"
														onError={(e) => {
															e.currentTarget.style.display = "none";
														}}
													/>
												) : (
													<div className="flex items-center justify-center h-full">
														<CalendarIcon className="w-16 h-16 text-white/50" />
													</div>
												)}
												{/* Status Badge */}
												<div className="absolute top-4 right-4">
													<span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>
														{status.label}
													</span>
												</div>
											</div>

											{/* Event Details */}
											<div className="p-5">
												<h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
													{juryEvent.event.title}
												</h3>

												<div className="space-y-2 mb-4">
													<div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
														<CalendarIcon className="h-4 w-4 mr-2" />
														{formatDate(juryEvent.event.startDate)}
													</div>
													{juryEvent.event.location && (
														<div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
															<MapPinIcon className="h-4 w-4 mr-2" />
															{juryEvent.event.location}
														</div>
													)}
													<div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
														<UsersIcon className="h-4 w-4 mr-2" />
														{juryEvent.event.currentParticipants} peserta
													</div>
												</div>

												{/* Categories */}
												<div className="border-t border-gray-200 dark:border-gray-700 pt-4">
													<p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
														Kategori Penilaian:
													</p>
													<div className="flex flex-wrap gap-1">
														{juryEvent.assignedCategories.slice(0, 3).map((cat) => (
															<span
																key={cat.id}
																className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs rounded"
															>
																{cat.assessmentCategory.name}
															</span>
														))}
														{juryEvent.assignedCategories.length > 3 && (
															<span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
																+{juryEvent.assignedCategories.length - 3} lainnya
															</span>
														)}
													</div>
												</div>

												{/* Enter Event Button */}
												<div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
													<span className="inline-flex items-center text-sm font-medium text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
														Masuk Event
														<ChevronRightIcon className="ml-1 w-4 h-4" />
													</span>
												</div>
											</div>
										</Link>
									);
								})}
							</div>
						)}
					</div>
				)}

				{/* Invitations Tab Content */}
				{selectedTab === "invitations" && (
					<div>
						{invitations.length === 0 ? (
							<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
								<TicketIcon className="mx-auto h-16 w-16 text-gray-400" />
								<h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
									Tidak Ada Undangan
								</h3>
								<p className="mt-2 text-gray-600 dark:text-gray-400">
									Anda tidak memiliki undangan juri yang pending saat ini.
								</p>
							</div>
						) : (
							<div className="space-y-4">
								{invitations.map((invitation) => (
									<div
										key={invitation.id}
										className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-yellow-500"
									>
										<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
											<div className="flex-1">
												<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
													{invitation.event.title}
												</h3>
												<div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
													<div className="flex items-center">
														<CalendarIcon className="h-4 w-4 mr-1" />
														{formatDate(invitation.event.startDate)}
													</div>
													{invitation.event.location && (
														<div className="flex items-center">
															<MapPinIcon className="h-4 w-4 mr-1" />
															{invitation.event.location}
														</div>
													)}
													<div className="flex items-center">
														<ClockIcon className="h-4 w-4 mr-1" />
														Diundang: {formatDate(invitation.invitedAt)}
													</div>
												</div>
												<div className="mt-2 flex flex-wrap gap-1">
													{invitation.assignedCategories.map((cat) => (
														<span
															key={cat.id}
															className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs rounded"
														>
															{cat.assessmentCategory.name}
														</span>
													))}
												</div>
											</div>
											<div className="flex gap-2">
												<Link
													to="/juri/invitations"
													className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
												>
													Lihat Detail
												</Link>
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default JuriDashboard;
