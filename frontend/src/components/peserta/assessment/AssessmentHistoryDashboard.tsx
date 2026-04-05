import React from "react";
import { Link } from "react-router-dom";
import {
	TrophyIcon,
	ChartBarIcon,
	CalendarIcon,
	MapPinIcon,
	ChevronRightIcon,
	UserGroupIcon,
} from "@heroicons/react/24/outline";
import { config } from "../../../utils/config";
import {
	AssessmentDashboardData,
	AssessmentEventParticipation,
	AssessmentPerformanceCategory,
	AssessmentPerformanceMaterial,
} from "./types";

interface AssessmentHistoryDashboardProps {
	dashboardData: AssessmentDashboardData;
	formatDate: (dateString: string) => string;
}

const AssessmentHistoryDashboard: React.FC<AssessmentHistoryDashboardProps> = ({
	dashboardData,
	formatDate,
}) => {
	const { participations, performance } = dashboardData;

	const getImageUrl = (thumbnail: string | null) => {
		if (!thumbnail) return null;
		if (thumbnail.startsWith("http://") || thumbnail.startsWith("https://")) {
			return thumbnail;
		}
		return `${config.api.backendUrl}${thumbnail}`;
	};

	const formatDateTime = (dateString: string | null) => {
		if (!dateString) return "Belum ada data";
		return new Date(dateString).toLocaleString("id-ID", {
			day: "2-digit",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
	};

	const summaryCards = [
		{
			label: "Event Diikuti",
			value: performance.summary.totalEvents,
			detail: `${performance.summary.eventsWithScores} event sudah memiliki nilai`,
		},
		{
			label: "Rata-rata Global",
			value:
				performance.summary.averageScore !== null
					? performance.summary.averageScore.toFixed(2)
					: "-",
			detail: `${performance.summary.evaluatedMaterials} materi sudah dinilai`,
		},
		{
			label: "Total Skor",
			value: performance.summary.totalScore.toFixed(1),
			detail: `${performance.summary.totalMaterials} materi tersedia`,
		},
		{
			label: "Kategori Terekam",
			value: performance.categoryRankings.length,
			detail:
				performance.summary.latestScoredAt !== null
					? `Update terakhir ${formatDateTime(performance.summary.latestScoredAt)}`
					: "Belum ada penilaian yang masuk",
		},
	];

	const renderCategoryHighlight = (
		title: string,
		category: AssessmentPerformanceCategory | null,
		toneClass: string
	) => (
		<div className={`rounded-2xl border p-5 ${toneClass}`}>
			<p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-2">
				{title}
			</p>
			{category ? (
				<>
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
						{category.categoryName}
					</h3>
					<p className="text-3xl font-black text-gray-900 dark:text-white mt-2">
						{category.averageScore.toFixed(2)}
					</p>
					<p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
						{category.scoredMaterials} materi dari {category.eventCount} event
					</p>
				</>
			) : (
				<p className="text-sm text-gray-500 dark:text-gray-400">
					Belum ada data kategori.
				</p>
			)}
		</div>
	);

	const renderMaterialHighlight = (
		title: string,
		material: AssessmentPerformanceMaterial | null,
		toneClass: string
	) => (
		<div className={`rounded-2xl border p-5 ${toneClass}`}>
			<p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-2">
				{title}
			</p>
			{material ? (
				<>
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
						{material.materialNumber}. {material.materialName}
					</h3>
					<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
						{material.categoryName} · {material.eventTitle}
					</p>
					<p className="text-3xl font-black text-gray-900 dark:text-white mt-2">
						{material.averageScore.toFixed(2)}
					</p>
					<p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
						{material.evaluationCount} penilaian · {formatDateTime(material.latestScoredAt)}
					</p>
				</>
			) : (
				<p className="text-sm text-gray-500 dark:text-gray-400">
					Belum ada data materi.
				</p>
			)}
		</div>
	);

	if (participations.length === 0) {
		return (
			<div className="min-h-screen">
				<div className="max-w-6xl mx-auto px-4 py-6">
					<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-md p-10 text-center">
						<TrophyIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
						<h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
							Belum Ada Riwayat Penilaian
						</h2>
						<p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
							Anda belum memiliki event yang bisa dianalisis performanya.
						</p>
						<Link
							to="/peserta/events"
							className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
						>
							Cari Event
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen">
			<div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
				<div className="mb-2">
					<p className="text-[10px] md:text-xs tracking-[0.3em] text-gray-400 dark:text-gray-500 font-medium mb-2">
						PERFORMA PESERTA
					</p>
					<h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-1">
						Assessment History
					</h1>
					<p className="text-sm text-gray-500 dark:text-gray-400">
						Pantau performa Anda dari seluruh event, kategori terkuat, dan materi yang paling menonjol.
					</p>
				</div>

				<div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
					{summaryCards.map((card) => (
						<div
							key={card.label}
							className="rounded-2xl border border-gray-200/60 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm shadow-sm p-5"
						>
							<p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-2">
								{card.label}
							</p>
							<p className="text-3xl font-black text-gray-900 dark:text-white">
								{card.value}
							</p>
							<p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
								{card.detail}
							</p>
						</div>
					))}
				</div>

				<div className="grid xl:grid-cols-2 gap-6">
					<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-md border border-gray-200/60 dark:border-gray-700/40 p-6 space-y-4">
						<div>
							<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
								Insight Performa
							</h2>
							<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
								Lihat area terkuat dan area yang masih bisa ditingkatkan.
							</p>
						</div>
						<div className="grid sm:grid-cols-2 gap-4">
							{renderCategoryHighlight(
								"Kategori Paling Unggul",
								performance.strongestCategory,
								"border-emerald-200/70 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/20"
							)}
							{renderCategoryHighlight(
								"Kategori Perlu Fokus",
								performance.weakestCategory,
								"border-amber-200/70 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/20"
							)}
							{renderMaterialHighlight(
								"Materi Tertinggi",
								performance.highestMaterial,
								"border-sky-200/70 bg-sky-50/70 dark:border-sky-900/40 dark:bg-sky-950/20"
							)}
							{renderMaterialHighlight(
								"Materi Terendah",
								performance.lowestMaterial,
								"border-rose-200/70 bg-rose-50/70 dark:border-rose-900/40 dark:bg-rose-950/20"
							)}
						</div>
					</div>

					<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-md border border-gray-200/60 dark:border-gray-700/40 p-6 space-y-4">
						<div>
							<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
								Highlight Event
							</h2>
							<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
								Event terbaik Anda saat ini berdasarkan rata-rata materi yang sudah dinilai.
							</p>
						</div>

						{performance.bestEvent ? (
							<Link
								to={`/peserta/assessment-history/${performance.bestEvent.event.slug || performance.bestEvent.event.id}`}
								className="block rounded-2xl border border-red-200/70 dark:border-red-900/30 bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-red-950/20 dark:via-gray-900/30 dark:to-orange-950/20 p-5 hover:shadow-md transition-shadow"
							>
								<div className="flex items-start justify-between gap-3">
									<div>
										<p className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 px-3 py-1 text-xs font-semibold text-red-700 dark:text-red-300 mb-3">
											<TrophyIcon className="h-4 w-4 mr-1.5" />
											Performa Terbaik
										</p>
										<h3 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-2">
											{performance.bestEvent.event.title}
										</h3>
										<p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
											{performance.bestEvent.summary.averageScore?.toFixed(2) || "-"} rata-rata · {performance.bestEvent.summary.evaluatedMaterials}/{performance.bestEvent.summary.totalMaterials} materi
										</p>
									</div>
									<ChevronRightIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
								</div>
								<div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-4">
									<span className="inline-flex items-center gap-1.5">
										<CalendarIcon className="h-4 w-4" />
										{formatDate(performance.bestEvent.event.startDate)}
									</span>
									{performance.bestEvent.event.location && (
										<span className="inline-flex items-center gap-1.5">
											<MapPinIcon className="h-4 w-4" />
											{performance.bestEvent.event.location}
										</span>
									)}
								</div>
							</Link>
						) : (
							<div className="rounded-2xl border border-gray-200/60 dark:border-gray-700/40 bg-gray-50/80 dark:bg-gray-900/30 p-5 text-sm text-gray-500 dark:text-gray-400">
								Belum ada event yang memiliki nilai lengkap untuk dibandingkan.
							</div>
						)}

						<div className="rounded-2xl border border-gray-200/60 dark:border-gray-700/40 bg-gray-50/80 dark:bg-gray-900/30 p-5">
							<p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-2">
								Update Penilaian Terakhir
							</p>
							<p className="text-base font-semibold text-gray-900 dark:text-white">
								{formatDateTime(performance.summary.latestScoredAt)}
							</p>
						</div>
					</div>
				</div>

				<div className="grid xl:grid-cols-3 gap-6">
					<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-md border border-gray-200/60 dark:border-gray-700/40 p-6">
						<div className="flex items-center gap-2 mb-5">
							<ChartBarIcon className="h-5 w-5 text-red-500" />
							<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
								Ranking Kategori
							</h2>
						</div>

						{performance.categoryRankings.length === 0 ? (
							<p className="text-sm text-gray-500 dark:text-gray-400">
								Belum ada kategori yang bisa dianalisis.
							</p>
						) : (
							<div className="space-y-4">
								{performance.categoryRankings.slice(0, 6).map((category, index) => {
									const maxAverage = performance.strongestCategory?.averageScore || 1;
									const width = maxAverage > 0 ? (category.averageScore / maxAverage) * 100 : 0;

									return (
										<div key={category.categoryId}>
											<div className="flex items-start justify-between gap-3 mb-1.5">
												<div>
													<p className="text-sm font-semibold text-gray-900 dark:text-white">
														#{index + 1} {category.categoryName}
													</p>
													<p className="text-xs text-gray-500 dark:text-gray-400">
														{category.scoredMaterials} materi · {category.eventCount} event
													</p>
												</div>
												<span className="text-sm font-bold text-red-600 dark:text-red-400">
													{category.averageScore.toFixed(2)}
												</span>
											</div>
											<div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
												<div
													className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-500"
													style={{ width: `${width}%` }}
												/>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>

					<div className="xl:col-span-2 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-md border border-gray-200/60 dark:border-gray-700/40 p-6">
						<div className="flex items-center gap-2 mb-5">
							<UserGroupIcon className="h-5 w-5 text-red-500" />
							<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
								Detail Per Event
							</h2>
						</div>

						<div className="space-y-4">
							{participations.map((participation: AssessmentEventParticipation) => {
								const imageUrl = getImageUrl(participation.event.thumbnail);
								const isBestEvent =
									performance.bestEvent?.event.id === participation.event.id;

								return (
									<Link
										key={participation.id}
										to={`/peserta/assessment-history/${participation.event.slug || participation.event.id}`}
										className="block rounded-2xl border border-gray-200/60 dark:border-gray-700/40 bg-white/70 dark:bg-gray-900/20 overflow-hidden hover:shadow-md transition-shadow"
									>
										<div className="flex flex-col sm:flex-row">
											<div className="w-full sm:w-36 h-40 sm:h-auto bg-gray-100 dark:bg-gray-800 flex-shrink-0">
												{imageUrl ? (
													<img
														src={imageUrl}
														alt={participation.event.title}
														className="w-full h-full object-cover"
													/>
												) : (
													<div className="w-full h-full flex items-center justify-center">
														<CalendarIcon className="h-10 w-10 text-gray-300 dark:text-gray-600" />
													</div>
												)}
											</div>

											<div className="flex-1 p-4 sm:p-5">
												<div className="flex items-start justify-between gap-3">
													<div>
														<h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
															{participation.event.title}
														</h3>
														<div className="flex flex-wrap gap-2 mt-2">
															{participation.groups.map((group) => (
																<span
																	key={group.id}
																	className="text-xs px-2 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-full"
																>
																	{group.groupName}
																</span>
															))}
														</div>
													</div>

													<div className="flex items-center gap-2">
														{isBestEvent && (
															<span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/20 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
																Terbaik
															</span>
														)}
														<ChevronRightIcon className="h-5 w-5 text-gray-400" />
													</div>
												</div>

												<div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-4">
													<span className="inline-flex items-center gap-1.5">
														<CalendarIcon className="h-4 w-4" />
														{formatDate(participation.event.startDate)}
													</span>
													{participation.event.location && (
														<span className="inline-flex items-center gap-1.5">
															<MapPinIcon className="h-4 w-4" />
															{participation.event.location}
														</span>
													)}
												</div>

												<div className="flex flex-wrap gap-2 mt-4">
													<span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold">
														Rata-rata: {participation.summary.averageScore?.toFixed(2) || "-"}
													</span>
													<span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold">
														Materi: {participation.summary.evaluatedMaterials}/{participation.summary.totalMaterials}
													</span>
													<span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold">
														Total: {participation.summary.totalScore.toFixed(1)}
													</span>
												</div>
											</div>
										</div>
									</Link>
								);
							})}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default AssessmentHistoryDashboard;