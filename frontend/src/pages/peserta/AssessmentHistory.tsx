import React, { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import {
	TrophyIcon,
	CalendarIcon,
	MapPinIcon,
	ChevronRightIcon,
	ArrowLeftIcon,
	ChartBarIcon,
	UserGroupIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../utils/api";

interface EventParticipation {
	id: string;
	status: string;
	event: {
		id: string;
		title: string;
		slug: string;
		startDate: string;
		endDate: string;
		location: string | null;
		thumbnail: string | null;
		status: string;
	};
	groups: {
		id: string;
		groupName: string;
		orderNumber: number | null;
		schoolCategory: {
			id: string;
			name: string;
		} | null;
	}[];
}

interface MaterialScore {
	material: {
		id: string;
		name: string;
		number: number;
		categoryId: string;
		categoryName: string;
	};
	scores: {
		juryId: string;
		juryName: string;
		score: number | null;
		scoreCategoryName: string | null;
		scoredAt: string | null;
	}[];
	averageScore: number | null;
}

interface ScoreCategory {
	categoryName: string;
	materials: MaterialScore[];
}

interface ScoreData {
	event: {
		id: string;
		title: string;
		slug: string;
	};
	participation: {
		id: string;
		groups: {
			id: string;
			groupName: string;
			schoolCategory: { id: string; name: string } | null;
		}[];
	};
	juries: { id: string; name: string }[];
	scoresByCategory: ScoreCategory[];
	summary: {
		totalScore: number;
		totalMaterials: number;
		evaluatedMaterials: number;
		averageScore: number | null;
	};
}

const AssessmentHistory: React.FC = () => {
	const { eventSlug } = useParams<{ eventSlug: string }>();
	const [events, setEvents] = useState<EventParticipation[]>([]);
	const [scoreData, setScoreData] = useState<ScoreData | null>(null);
	const [loading, setLoading] = useState(true);
	const [loadingScores, setLoadingScores] = useState(false);
	const [activeTab, setActiveTab] = useState<string>("");

	const fetchEvents = useCallback(async () => {
		try {
			const res = await api.get("/evaluations/my-events");
			setEvents(res.data || []);
		} catch (error) {
			console.error("Error fetching events:", error);
		} finally {
			setLoading(false);
		}
	}, []);

	const fetchScores = useCallback(async (slug: string) => {
		try {
			setLoadingScores(true);
			const res = await api.get(`/evaluations/my-scores/${slug}`);
			setScoreData(res.data);
			// Set first category as active tab
			if (res.data?.scoresByCategory?.length > 0) {
				setActiveTab(res.data.scoresByCategory[0].categoryName);
			}
		} catch (error) {
			console.error("Error fetching scores:", error);
		} finally {
			setLoadingScores(false);
		}
	}, []);

	useEffect(() => {
		fetchEvents();
	}, [fetchEvents]);

	useEffect(() => {
		if (eventSlug) {
			fetchScores(eventSlug);
		} else {
			setScoreData(null);
		}
	}, [eventSlug, fetchScores]);

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "short",
			year: "numeric",
		});
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
			</div>
		);
	}

	// Show score details for selected event
	if (eventSlug && scoreData) {
		return (
			<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
				<div className="max-w-4xl mx-auto px-4 py-6">
					{/* Back Button */}
					<Link
						to="/peserta/assessment-history"
						className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
					>
						<ArrowLeftIcon className="h-5 w-5" />
						Kembali ke Riwayat
					</Link>

					{/* Event Header */}
					<div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
						<h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
							{scoreData.event.title}
						</h1>
						{scoreData.participation.groups.length > 0 && (
							<div className="flex flex-wrap gap-2 mt-3">
								{scoreData.participation.groups.map((group) => (
									<span
										key={group.id}
										className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm"
									>
										{group.groupName} ({group.schoolCategory?.name})
									</span>
								))}
							</div>
						)}
					</div>

					{/* Summary Card */}
					<div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg p-6 mb-6 text-white">
						<div className="flex items-center gap-3 mb-4">
							<div className="p-3 bg-white/20 rounded-xl">
								<TrophyIcon className="h-8 w-8" />
							</div>
							<div>
								<h2 className="text-lg font-semibold">Ringkasan Nilai</h2>
								<p className="text-blue-100 text-sm">
									Dinilai oleh {scoreData.juries.length} juri
								</p>
							</div>
						</div>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							<div className="bg-white/10 rounded-lg p-4">
								<div className="text-3xl font-bold">
									{scoreData.summary.totalScore.toFixed(1)}
								</div>
								<div className="text-blue-100 text-sm">Total Nilai</div>
							</div>
							<div className="bg-white/10 rounded-lg p-4">
								<div className="text-3xl font-bold">
									{scoreData.summary.averageScore?.toFixed(2) || "-"}
								</div>
								<div className="text-blue-100 text-sm">Rata-rata</div>
							</div>
							<div className="bg-white/10 rounded-lg p-4">
								<div className="text-3xl font-bold">
									{scoreData.summary.evaluatedMaterials}
								</div>
								<div className="text-blue-100 text-sm">Materi Dinilai</div>
							</div>
							<div className="bg-white/10 rounded-lg p-4">
								<div className="text-3xl font-bold">
									{scoreData.summary.totalMaterials}
								</div>
								<div className="text-blue-100 text-sm">Total Materi</div>
							</div>
						</div>
					</div>

					{/* Juries */}
					{scoreData.juries.length > 0 && (
						<div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
							<h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
								<UserGroupIcon className="h-5 w-5 text-gray-500" />
								Dewan Juri
							</h3>
							<div className="flex flex-wrap gap-2">
								{scoreData.juries.map((jury) => (
									<span
										key={jury.id}
										className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm"
									>
										{jury.name}
									</span>
								))}
							</div>
						</div>
					)}

					{/* Scores by Category */}
					{scoreData.scoresByCategory.length === 0 ? (
						<div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 text-center">
							<ChartBarIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
							<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
								Belum Ada Penilaian
							</h3>
							<p className="text-gray-500 dark:text-gray-400">
								Penilaian belum dilakukan oleh juri untuk event ini.
							</p>
						</div>
					) : (
						<div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
							{/* Category Tabs */}
							<div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
								<nav className="flex -mb-px" aria-label="Tabs">
									{scoreData.scoresByCategory.map((category) => {
										// Calculate category total for tab display
										const tabTotal = category.materials.reduce((sum, ms) => {
											const validScores = ms.scores.filter(s => s.score !== null && s.score !== undefined);
											const materialSum = validScores.reduce((acc, s) => acc + (s.score || 0), 0);
											return sum + materialSum;
										}, 0);
										
										return (
											<button
												key={category.categoryName}
												onClick={() => setActiveTab(category.categoryName)}
												className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm transition-colors flex flex-col items-center ${
													activeTab === category.categoryName
														? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
														: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
												}`}
											>
												<span>{category.categoryName}</span>
												<span className={`text-xs mt-0.5 ${
													activeTab === category.categoryName
														? "text-indigo-500 dark:text-indigo-300"
														: "text-gray-400"
												}`}>
													{tabTotal.toFixed(1)}
												</span>
											</button>
										);
									})}
								</nav>
							</div>

							{/* Score Table */}
							{scoreData.scoresByCategory
								.filter((cat) => cat.categoryName === activeTab)
								.map((category) => {
									// Calculate category total
									const categoryTotal = category.materials.reduce((sum, ms) => {
										const validScores = ms.scores.filter(s => s.score !== null && s.score !== undefined);
										const materialSum = validScores.reduce((acc, s) => acc + (s.score || 0), 0);
										return sum + materialSum;
									}, 0);

									return (
									<div key={category.categoryName} className="overflow-x-auto">
										<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
											<thead className="bg-gray-100 dark:bg-gray-700">
												<tr>
													<th
														scope="col"
														className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
													>
														Materi
													</th>
													{scoreData.juries.map((jury) => (
														<th
															key={jury.id}
															scope="col"
															className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
														>
															{jury.name}
														</th>
													))}
												</tr>
											</thead>
											<tbody className="divide-y divide-gray-200 dark:divide-gray-700">
												{category.materials.map((ms, idx) => (
													<tr
														key={ms.material.id}
														className={idx % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-700"}
													>
														<td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
															<span className="font-medium">{ms.material.number}.</span>{" "}
															{ms.material.name}
														</td>
														{scoreData.juries.map((jury) => {
															const juryScore = ms.scores.find((s) => s.juryId === jury.id);
															return (
																<td
																	key={jury.id}
																	className="px-4 py-3 text-center text-sm"
																>
																	{juryScore?.score !== null && juryScore?.score !== undefined ? (
																		<div>
																			<span className="font-semibold text-gray-900 dark:text-white">
																				{juryScore.score}
																			</span>
																			{juryScore.scoreCategoryName && (
																				<div className="text-xs text-gray-500 dark:text-gray-400">
																					{juryScore.scoreCategoryName}
																				</div>
																			)}
																			{juryScore.scoredAt && (
																				<div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
																					{new Date(juryScore.scoredAt).toLocaleString("id-ID", {
																						day: "2-digit",
																						month: "short",
																						hour: "2-digit",
																						minute: "2-digit",
																					})}
																				</div>
																			)}
																		</div>
																	) : (
																		<span className="text-gray-400">-</span>
																	)}
																</td>
															);
														})}
													</tr>
												))}
											</tbody>
											<tfoot className="bg-indigo-50 dark:bg-indigo-900/30">
												<tr>
													<td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
														Total {category.categoryName}
													</td>
													<td 
														colSpan={scoreData.juries.length} 
														className="px-4 py-3 text-center"
													>
														<span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
															{categoryTotal.toFixed(1)}
														</span>
													</td>
												</tr>
											</tfoot>
										</table>
									</div>
								)})}
						</div>
					)}
				</div>
			</div>
		);
	}

	// Loading scores
	if (eventSlug && loadingScores) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
			</div>
		);
	}

	// Event list view
	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<div className="max-w-4xl mx-auto px-4 py-6">
				{/* Header */}
				<div className="mb-6">
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
						<ChartBarIcon className="h-7 w-7 text-blue-600" />
						Riwayat Penilaian
					</h1>
					<p className="text-gray-600 dark:text-gray-400 mt-1">
						Lihat hasil penilaian dari event yang telah Anda ikuti
					</p>
				</div>

				{events.length === 0 ? (
					<div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 text-center">
						<TrophyIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
						<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
							Belum Ada Event
						</h3>
						<p className="text-gray-500 dark:text-gray-400 mb-4">
							Anda belum terdaftar sebagai peserta di event manapun.
						</p>
						<Link
							to="/peserta/dashboard"
							className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
						>
							Cari Event
						</Link>
					</div>
				) : (
					<div className="space-y-4">
						{events.map((participation) => (
							<Link
								key={participation.id}
								to={`/peserta/assessment-history/${participation.event.slug}`}
								className="block bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden"
							>
								<div className="flex">
									{/* Event Poster */}
									<div className="w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 bg-gray-200 dark:bg-gray-700">
										{participation.event.thumbnail ? (
											<img
												src={participation.event.thumbnail}
												alt={participation.event.title}
												className="w-full h-full object-cover"
											/>
										) : (
											<div className="w-full h-full flex items-center justify-center">
												<CalendarIcon className="h-10 w-10 text-gray-400" />
											</div>
										)}
									</div>

									{/* Event Info */}
									<div className="flex-1 p-4 flex flex-col justify-between">
										<div>
											<h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
												{participation.event.title}
											</h3>
											<div className="flex flex-wrap gap-2 mt-1">
												{participation.groups.map((group) => (
													<span
														key={group.id}
														className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded"
													>
														{group.groupName}
													</span>
												))}
											</div>
										</div>
										<div className="flex items-center justify-between mt-2">
											<div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
												<span className="flex items-center gap-1">
													<CalendarIcon className="h-4 w-4" />
													{formatDate(participation.event.startDate)}
												</span>
												{participation.event.location && (
													<span className="flex items-center gap-1">
														<MapPinIcon className="h-4 w-4" />
														{participation.event.location}
													</span>
												)}
											</div>
											<ChevronRightIcon className="h-5 w-5 text-gray-400" />
										</div>
									</div>
								</div>
							</Link>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

export default AssessmentHistory;
