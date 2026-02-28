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
	schoolCategoryLimits?: SchoolCategoryLimit[];
	assessmentCategories?: EventAssessmentCategory[];
}

interface Assignment {
	id: string;
	isActive: boolean;
	assignedAt: string;
	event: Event;
}

const ManageEvent: React.FC = () => {
	const { eventSlug } = useParams<{ eventSlug: string }>();
	const navigate = useNavigate();
	const [assignment, setAssignment] = useState<Assignment | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		checkAssignment();
	}, [eventSlug]);

	const checkAssignment = async () => {
		try {
			setLoading(true);
			// Get current active assignment
			const response = await api.get("/panitia-assignment/current");

			if (!response.data || !response.data.event) {
				// No active assignment - redirect to dashboard to select an event
				navigate("/panitia/dashboard", { replace: true });
				return;
			}

			// Check if assigned to this event (comparing by slug)
			if (response.data.event.slug === eventSlug) {
				setAssignment(response.data);
			} else {
				// Assigned to different event - redirect to that event
				navigate(`/panitia/events/${response.data.event.slug}/manage`, { replace: true });
			}
		} catch (error: any) {
			console.error("Error checking assignment:", error);
			// No assignment found - redirect to dashboard
			navigate("/panitia/dashboard", { replace: true });
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
		const backendUrl =
			import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
		return `${backendUrl}${thumbnail}`;
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
			</div>
		);
	}

	if (!assignment) {
		// No assignment - this should not happen as we redirect, but show loading just in case
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
			</div>
		);
	}

	const event = assignment.event;

	const formatCurrency = (amount: number | null) => {
		if (!amount) return "Gratis";
		return new Intl.NumberFormat("id-ID", {
			style: "currency",
			currency: "IDR",
			minimumFractionDigits: 0,
		}).format(amount);
	};

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Main Content */}
					<div className="lg:col-span-2">
						{/* Event Description */}
						<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
							<h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
								{event.title}
							</h1>

							{event.description && (
								<div className="prose dark:prose-invert max-w-none mb-6">
									<p className="text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">
										{event.description}
									</p>
								</div>
							)}

							{(event.organizer || event.organizerEmail) && (
								<div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-2">
									{event.organizer && (
										<div className="flex items-center text-gray-600 dark:text-gray-400">
											<UserGroupIcon className="w-5 h-5 mr-2 flex-shrink-0" />
											<span className="font-medium">Penyelenggara:</span>
											<span className="ml-2">{event.organizer}</span>
										</div>
									)}
									{event.organizerEmail && (
										<div className="flex items-center text-gray-600 dark:text-gray-400">
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
										<span className="bg-red-600 dark:bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
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

						{/* Assessment Categories */}
						{event.assessmentCategories &&
							event.assessmentCategories.length > 0 && (
								<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
									<div className="flex items-center mb-4">
										<TrophyIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mr-2" />
										<h2 className="text-xl font-bold text-gray-900 dark:text-white">
											Kriteria Penilaian
										</h2>
									</div>
									<div className="space-y-3">
										{event.assessmentCategories
											.sort(
												(a, b) =>
													a.assessmentCategory.order -
													b.assessmentCategory.order
											)
											.map((category) => (
												<div
													key={category.id}
													className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
												>
													<div className="flex-1">
														<span className="text-gray-900 dark:text-white font-medium block">
															{category.assessmentCategory.name}
														</span>
														{category.assessmentCategory.description && (
															<span className="text-xs text-gray-500 dark:text-gray-400 block mt-1">
																{category.assessmentCategory.description}
															</span>
														)}
													</div>
													{category.customWeight !== null && (
														<span className="text-indigo-600 dark:text-indigo-400 font-bold ml-3">
															{category.customWeight}%
														</span>
													)}
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
										{event.schoolCategoryLimits.map((limit) => (
											<div
												key={limit.id}
												className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
											>
												<span className="text-gray-900 dark:text-white font-medium">
													{limit.schoolCategory.name}
												</span>
												<span className="text-gray-600 dark:text-gray-400">
													{limit.currentParticipants || 0} /{" "}
													{limit.maxParticipants} peserta
												</span>
											</div>
										))}
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
								<div className="flex items-start">
									<CurrencyDollarIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-3 mt-0.5 flex-shrink-0" />
									<div>
										<p className="text-sm text-gray-500 dark:text-gray-400">
											Biaya Pendaftaran
										</p>
										<p className="text-gray-900 dark:text-white font-medium">
											{formatCurrency(event.registrationFee)}
										</p>
									</div>
								</div>
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
