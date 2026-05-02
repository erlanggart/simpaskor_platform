import React from "react";
import { Link } from "react-router-dom";
import {
	TrophyIcon,
	ArrowLeftIcon,
	ChartBarIcon,
	UserGroupIcon,
	ClockIcon,
	CheckCircleIcon,
	XCircleIcon,
	MapPinIcon,
} from "@heroicons/react/24/outline";
import {
	AssessmentPerformanceSession,
	AssessmentScoreData,
} from "./types";

interface AssessmentScoreDetailProps {
	scoreData: AssessmentScoreData;
	performanceSessions: AssessmentPerformanceSession[];
	performanceLoadError: boolean;
	activeTab: string;
	onTabChange: (tab: string) => void;
}

type AssessmentScoreCategory = AssessmentScoreData["scoresByCategory"][number];
type AssessmentMaterialScore = AssessmentScoreCategory["materials"][number];

const getMaterialActualScore = (materialScore: AssessmentMaterialScore) =>
	materialScore.totalScore ??
	materialScore.scores.reduce((sum, score) => sum + (score.score ?? 0), 0);

const getCategoryActualScore = (category: AssessmentScoreCategory) =>
	category.materials.reduce(
		(sum, materialScore) => sum + getMaterialActualScore(materialScore),
		0
	);

const AssessmentScoreDetail: React.FC<AssessmentScoreDetailProps> = ({
	scoreData,
	performanceSessions,
	performanceLoadError,
	activeTab,
	onTabChange,
}) => {
	const formatDateTime = (dateString: string | null) => {
		if (!dateString) return "-";
		return new Date(dateString).toLocaleString("id-ID", {
			day: "2-digit",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
	};

	const formatDuration = (seconds: number | null) => {
		if (seconds === null || seconds === undefined) return "-";
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
			.toString()
			.padStart(2, "0")}`;
	};

	const getPerformanceStatusBadge = (status: string) => {
		switch (status) {
			case "COMPLETED":
				return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
			case "PERFORMING":
				return "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300";
			case "QUEUED":
				return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
			default:
				return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
		}
	};

	const completedPerformanceCount = performanceSessions.filter(
		(session) => session.status === "COMPLETED"
	).length;
	const actualTotalScore = scoreData.scoresByCategory.reduce(
		(sum, category) => sum + getCategoryActualScore(category),
		0
	);

	return (
		<div className="min-h-screen">
			<div className="max-w-5xl mx-auto px-3 py-4 sm:px-4 sm:py-6">
				<Link
					to="/peserta/assessment-history"
					className="mb-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white sm:mb-6 sm:text-base"
				>
					<ArrowLeftIcon className="h-4 w-4 sm:h-5 sm:w-5" />
					Kembali ke Dashboard Assessment
				</Link>

				<div className="mb-4 rounded-xl bg-white/80 p-4 shadow-md backdrop-blur-sm dark:bg-gray-800/50 sm:mb-6 sm:p-6">
					<h1 className="mb-2 text-lg font-bold leading-snug text-gray-900 dark:text-white sm:text-2xl">
						{scoreData.event.title}
					</h1>
					{scoreData.participation.groups.length > 0 && (
						<div className="mt-3 flex flex-wrap gap-2">
							{scoreData.participation.groups.map((group) => (
								<span
									key={group.id}
									className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 sm:px-3 sm:text-sm"
								>
									{group.groupName} ({group.schoolCategory?.name})
								</span>
							))}
						</div>
					)}
				</div>

				<div className="mb-4 rounded-xl bg-gradient-to-r from-blue-500 to-red-600 p-4 text-white shadow-lg sm:mb-6 sm:p-6">
					<div className="mb-3 flex items-center gap-3 sm:mb-4">
						<div className="rounded-lg bg-white/20 p-2 sm:rounded-xl sm:p-3">
							<TrophyIcon className="h-5 w-5 sm:h-8 sm:w-8" />
						</div>
						<div>
							<h2 className="text-base font-semibold sm:text-lg">Ringkasan Nilai Event</h2>
							<p className="text-xs text-blue-100 sm:text-sm">
								Dinilai oleh {scoreData.juries.length} juri
							</p>
							<p className="mt-0.5 text-[11px] text-blue-100/90 sm:text-xs">
								Total dari jumlah aktual seluruh nilai materi
							</p>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-4">
						<div className="rounded-lg bg-white/10 p-3 sm:p-4">
							<div className="text-xl font-bold leading-tight sm:text-3xl">
								{actualTotalScore.toFixed(1)}
							</div>
							<div className="mt-1 text-[11px] text-blue-100 sm:text-sm">Total Nilai</div>
						</div>
						<div className="rounded-lg bg-white/10 p-3 sm:p-4">
							<div className="text-xl font-bold leading-tight sm:text-3xl">
								{scoreData.juries.length}
							</div>
							<div className="mt-1 text-[11px] text-blue-100 sm:text-sm">Juri Menilai</div>
						</div>
						<div className="rounded-lg bg-white/10 p-3 sm:p-4">
							<div className="text-xl font-bold leading-tight sm:text-3xl">
								{scoreData.summary.evaluatedMaterials}
							</div>
							<div className="mt-1 text-[11px] text-blue-100 sm:text-sm">Materi Dinilai</div>
						</div>
						<div className="rounded-lg bg-white/10 p-3 sm:p-4">
							<div className="text-xl font-bold leading-tight sm:text-3xl">
								{scoreData.summary.totalMaterials}
							</div>
							<div className="mt-1 text-[11px] text-blue-100 sm:text-sm">Total Materi</div>
						</div>
					</div>
				</div>

				

				{scoreData.juries.length > 0 && (
					<div className="mb-4 rounded-xl bg-white/80 p-4 shadow-md backdrop-blur-sm dark:bg-gray-800/50 sm:mb-6 sm:p-6">
						<h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white sm:text-base">
							<UserGroupIcon className="h-4 w-4 text-gray-500 sm:h-5 sm:w-5" />
							Dewan Juri
						</h3>
						<div className="flex flex-wrap gap-2">
							{scoreData.juries.map((jury) => (
								<span
									key={jury.id}
									className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300 sm:px-3 sm:text-sm"
								>
									{jury.name}
								</span>
							))}
						</div>
					</div>
				)}

				{scoreData.scoresByCategory.length === 0 ? (
					<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-md p-8 text-center">
						<ChartBarIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
						<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
							Belum Ada Penilaian
						</h3>
						<p className="text-gray-500 dark:text-gray-400">
							Penilaian belum dilakukan oleh juri untuk event ini.
						</p>
					</div>
				) : (
					<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-md overflow-hidden">
						<div className="border-b border-gray-200/60 dark:border-gray-700/40 overflow-x-auto">
							<nav className="flex -mb-px" aria-label="Tabs">
								{scoreData.scoresByCategory.map((category) => {
									const tabTotal = getCategoryActualScore(category);

									return (
										<button
											key={category.categoryName}
											onClick={() => onTabChange(category.categoryName)}
											className={`flex flex-col items-center whitespace-nowrap border-b-2 px-4 py-3 text-xs font-medium transition-colors sm:px-6 sm:py-4 sm:text-sm ${
												activeTab === category.categoryName
													? "border-red-500 text-red-600 dark:text-red-400"
													: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
											}`}
										>
											<span>{category.categoryName}</span>
											<span className={`text-xs mt-0.5 ${
												activeTab === category.categoryName
													? "text-red-500 dark:text-red-300"
													: "text-gray-400"
											}`}>
												{tabTotal.toFixed(1)}
											</span>
										</button>
									);
								})}
							</nav>
						</div>

						{scoreData.scoresByCategory
							.filter((category) => category.categoryName === activeTab)
							.map((category) => {
								const categoryTotal = getCategoryActualScore(category);
								const categoryJuryIds = new Set<string>();
								category.materials.forEach((materialScore) => {
									materialScore.scores.forEach((score) => {
										if (
											(score.score !== null && score.score !== undefined) ||
											score.isSkipped ||
											score.scoredAt ||
											score.scoreCategoryName
										) {
											categoryJuryIds.add(score.juryId);
										}
									});
								});
								const categoryJuries = scoreData.juries.filter((jury) =>
									categoryJuryIds.has(jury.id)
								);

								return (
									<div key={category.categoryName} className="overflow-x-auto">
										<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
											<thead className="bg-gray-100 dark:bg-gray-700">
												<tr>
													<th
														scope="col"
														className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400 sm:px-4"
													>
														Materi
													</th>
													{categoryJuries.map((jury) => (
														<th
															key={jury.id}
															scope="col"
															className="px-3 py-3 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400 sm:px-4"
														>
															{jury.name}
														</th>
													))}
												</tr>
											</thead>
											<tbody className="divide-y divide-gray-200 dark:divide-gray-700">
												{category.materials.map((materialScore, index) => (
													<tr
														key={materialScore.material.id}
														className={
															index % 2 === 0
																? "bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm"
																: "bg-gray-50 dark:bg-gray-700"
														}
													>
														<td className="px-3 py-3 text-xs text-gray-900 dark:text-white sm:px-4 sm:text-sm">
															<span className="font-medium">{materialScore.material.number}.</span>{" "}
															{materialScore.material.name}
														</td>
														{categoryJuries.map((jury) => {
															const juryScore = materialScore.scores.find(
																(score) => score.juryId === jury.id
															);

															return (
																<td
																	key={jury.id}
																	className="px-3 py-3 text-center text-xs sm:px-4 sm:text-sm"
																>
																	{juryScore?.isSkipped ? (
																		<div>
																			<span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200 sm:px-2.5 sm:text-xs">
																			{juryScore.skipReason === "TIDAK_SESUAI"
																				? "Tidak Sesuai"
																				: "Tidak Dijalankan"}
																		</span>
																			{juryScore.scoredAt && (
																				<div className="mt-1 text-[11px] text-gray-400 dark:text-gray-500 sm:text-xs">
																					{formatDateTime(juryScore.scoredAt)}
																				</div>
																			)}
																		</div>
																	) : juryScore?.score !== null && juryScore?.score !== undefined ? (
																		<div>
																			<span className="font-semibold text-gray-900 dark:text-white">
																				{juryScore.score}
																			</span>
																			{juryScore.scoreCategoryName && (
																				<div className="text-[11px] text-gray-500 dark:text-gray-400 sm:text-xs">
																					{juryScore.scoreCategoryName}
																				</div>
																			)}
																			{juryScore.scoredAt && (
																				<div className="mt-1 text-[11px] text-gray-400 dark:text-gray-500 sm:text-xs">
																					{formatDateTime(juryScore.scoredAt)}
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
											<tfoot className="bg-red-50 dark:bg-red-900/30">
												<tr>
													{categoryJuries.length > 0 ? (
														<>
															<td className="px-3 py-3 text-xs font-semibold text-gray-900 dark:text-white sm:px-4 sm:text-sm">
																Total {category.categoryName}
															</td>
															<td
																colSpan={categoryJuries.length}
																className="px-3 py-3 text-center sm:px-4"
															>
																<span className="text-lg font-bold text-red-600 dark:text-red-400 sm:text-xl">
																	{categoryTotal.toFixed(1)}
																</span>
															</td>
														</>
													) : (
														<td className="px-3 py-3 text-xs font-semibold text-gray-900 dark:text-white sm:px-4 sm:text-sm">
															<div className="flex items-center justify-between gap-3">
																<span>Total {category.categoryName}</span>
																<span className="text-lg font-bold text-red-600 dark:text-red-400 sm:text-xl">
																	{categoryTotal.toFixed(1)}
																</span>
															</div>
														</td>
													)}
												</tr>
											</tfoot>
										</table>
									</div>
								);
							})}
					</div>
				)}

				<div className="mt-4 rounded-xl bg-white/80 p-4 shadow-md backdrop-blur-sm dark:bg-gray-800/50 sm:mt-6 sm:p-6">
					<div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
						<div>
							<h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white sm:text-base">
								<ClockIcon className="h-4 w-4 text-gray-500 sm:h-5 sm:w-5" />
								Data Performa Lapangan
							</h3>
							<p className="mt-1 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
								Menampilkan waktu tampil dan checklist materi dari menu panitia.
							</p>
						</div>
						<div className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
							{completedPerformanceCount}/{performanceSessions.length} sesi selesai
						</div>
					</div>

					{performanceLoadError ? (
						<div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
							Data performa lapangan belum berhasil dimuat untuk event ini.
						</div>
					) : performanceSessions.length === 0 ? (
						<div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
							Belum ada riwayat performa lapangan yang tercatat untuk event ini.
						</div>
					) : (
						<div className="space-y-4">
							{performanceSessions.map((session) => {
								const checkedCount = session.materialChecks.filter((check) => check.isChecked).length;
								const skippedCount = session.materialChecks.length - checkedCount;
								const groupedChecks = session.materialChecks.reduce<
									Record<string, { name: string; items: AssessmentPerformanceSession["materialChecks"] }>
								>((accumulator, check) => {
									const categoryId = check.material?.eventAssessmentCategoryId || "uncategorized";
									const categoryName = check.material?.category?.name || "Lainnya";
									if (!accumulator[categoryId]) {
										accumulator[categoryId] = {
											name: categoryName,
											items: [],
										};
									}
									accumulator[categoryId].items.push(check);
									return accumulator;
								}, {});

								return (
									<div
										key={session.id}
										className="rounded-xl border border-gray-200/70 bg-gray-50/80 p-3 dark:border-gray-700/60 dark:bg-gray-900/30 sm:p-4"
									>
										<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
											<div>
												<div className="flex flex-wrap items-center gap-2 mb-2">
													<span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white sm:text-base">
														<MapPinIcon className="h-4 w-4 text-red-500" />
														{session.field.name}
													</span>
													<span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getPerformanceStatusBadge(session.status)}`}>
														{session.status === "COMPLETED"
															? "Selesai"
															: session.status === "PERFORMING"
																? "Sedang Tampil"
																: session.status === "QUEUED"
																	? "Antrian"
																	: session.status}
													</span>
												</div>
												{session.notes && (
													<p className="text-sm text-gray-500 dark:text-gray-400">
														{session.notes}
													</p>
												)}
											</div>

											<div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 lg:min-w-[420px]">
												<div className="rounded-lg bg-white px-2.5 py-2 dark:bg-gray-800 sm:px-3">
													<div className="text-xs text-gray-500 dark:text-gray-400">Mulai</div>
													<div className="text-xs font-medium text-gray-900 dark:text-white sm:text-sm">
														{formatDateTime(session.startTime)}
													</div>
												</div>
												<div className="rounded-lg bg-white px-2.5 py-2 dark:bg-gray-800 sm:px-3">
													<div className="text-xs text-gray-500 dark:text-gray-400">Selesai</div>
													<div className="text-xs font-medium text-gray-900 dark:text-white sm:text-sm">
														{formatDateTime(session.endTime)}
													</div>
												</div>
												<div className="rounded-lg bg-white px-2.5 py-2 dark:bg-gray-800 sm:px-3">
													<div className="text-xs text-gray-500 dark:text-gray-400">Durasi</div>
													<div className="text-xs font-semibold text-gray-900 dark:text-white sm:text-sm">
														{formatDuration(session.duration)}
													</div>
												</div>
												<div className="rounded-lg bg-white px-2.5 py-2 dark:bg-gray-800 sm:px-3">
													<div className="text-xs text-gray-500 dark:text-gray-400">Materi</div>
													<div className="text-xs font-semibold text-gray-900 dark:text-white sm:text-sm">
														{checkedCount} dijalankan - {skippedCount} dilewatkan
													</div>
												</div>
											</div>
										</div>

										{session.materialChecks.length > 0 && (
											<div className="mt-4 grid gap-4 lg:grid-cols-2">
												{Object.entries(groupedChecks).map(([categoryId, group]) => (
													<div
														key={categoryId}
														className="rounded-lg border border-gray-200/70 bg-white/80 p-3 dark:border-gray-700/60 dark:bg-gray-800/40"
													>
														<div className="mb-3 text-xs font-semibold uppercase text-blue-700 dark:text-blue-300">
															{group.name}
														</div>
														<div className="space-y-2">
															{group.items.map((check) => (
																<div
																	key={check.id}
																	className={`rounded-lg px-3 py-2 ${
																		check.isChecked
																			? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300"
																			: "bg-gray-100 text-gray-700 dark:bg-gray-700/60 dark:text-gray-300"
																	}`}
																>
																	<div className="flex items-start gap-2">
																		{check.isChecked ? (
																			<CheckCircleIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
																		) : (
																			<XCircleIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
																		)}
																		<div className="min-w-0">
																			<div className="text-sm font-medium">
																				{check.material?.number}. {check.material?.name || "Materi tidak tersedia"}
																			</div>
																			<div className="text-xs opacity-80 mt-1">
																				{check.isChecked ? "Dijalankan" : "Dilewatkan"}
																			</div>
																			{check.notes && (
																				<div className="text-xs opacity-70 mt-1">
																					{check.notes}
																				</div>
																			)}
																		</div>
																	</div>
																</div>
															))}
														</div>
													</div>
												))}
											</div>
										)}
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default AssessmentScoreDetail;
