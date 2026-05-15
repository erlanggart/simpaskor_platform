import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
	TrophyIcon,
	ArrowLeftIcon,
	ChartBarIcon,
	ClockIcon,
	CheckCircleIcon,
	XCircleIcon,
	MapPinIcon,
	MinusCircleIcon,
	PlusCircleIcon,
	ChevronRightIcon,
	ChevronDownIcon,
} from "@heroicons/react/24/outline";
import {
	AssessmentPerformanceSession,
	AssessmentScoreData,
	AssessmentScoreCategory,
} from "./types";

interface AssessmentScoreDetailProps {
	scoreData: AssessmentScoreData;
	performanceSessions: AssessmentPerformanceSession[];
	performanceLoadError: boolean;
	activeTab: string;
	onTabChange: (tab: string) => void;
}

type AssessmentMaterialScore = AssessmentScoreCategory["materials"][number];

const getMaterialActualScore = (materialScore: AssessmentMaterialScore) =>
	materialScore.totalScore ??
	materialScore.scores.reduce((sum, s) => sum + (s.score ?? 0), 0);

const getCategoryActualScore = (category: AssessmentScoreCategory) =>
	category.materials.reduce(
		(sum, m) => sum + getMaterialActualScore(m),
		0
	) + (category.extraAdjustment || 0);

const getCategoryJuryIds = (category: AssessmentScoreCategory): Set<string> => {
	const ids = new Set<string>();
	category.materials.forEach((m) => {
		m.scores.forEach((s) => {
			if (s.score !== null || s.isSkipped || s.scoredAt) ids.add(s.juryId);
		});
	});
	return ids;
};

const getJuryTotalForCategory = (
	category: AssessmentScoreCategory,
	juryId: string
): number =>
	category.materials.reduce((sum, m) => {
		const s = m.scores.find((sc) => sc.juryId === juryId);
		return sum + (s && !s.isSkipped ? (s.score ?? 0) : 0);
	}, 0);

type CategoryColorSet = { header: string; selected: string; unselected: string; label: string };

// Map score category color name → Tailwind classes
const getCategoryColorClasses = (color: string): CategoryColorSet => {
	const fallback: CategoryColorSet = { header: "bg-blue-500", selected: "bg-blue-500 text-white border-blue-500", unselected: "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-blue-300", label: "text-blue-600 dark:text-blue-400" };
	const map: Record<string, CategoryColorSet> = {
		red:    { header: "bg-red-500",    selected: "bg-red-500 text-white border-red-500",          unselected: "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-red-300",    label: "text-red-600 dark:text-red-400" },
		yellow: { header: "bg-yellow-400", selected: "bg-yellow-400 text-gray-900 border-yellow-400", unselected: "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-yellow-300", label: "text-yellow-600 dark:text-yellow-400" },
		amber:  { header: "bg-amber-400",  selected: "bg-amber-400 text-white border-amber-400",      unselected: "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-amber-300",   label: "text-amber-600 dark:text-amber-400" },
		green:  { header: "bg-green-500",  selected: "bg-green-500 text-white border-green-500",      unselected: "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-green-300",   label: "text-green-600 dark:text-green-400" },
		blue:   fallback,
		indigo: { header: "bg-indigo-500", selected: "bg-indigo-500 text-white border-indigo-500",    unselected: "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-indigo-300",  label: "text-indigo-600 dark:text-indigo-400" },
		purple: { header: "bg-purple-500", selected: "bg-purple-500 text-white border-purple-500",    unselected: "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-purple-300",  label: "text-purple-600 dark:text-purple-400" },
		orange: { header: "bg-orange-500", selected: "bg-orange-500 text-white border-orange-500",    unselected: "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-orange-300",  label: "text-orange-600 dark:text-orange-400" },
	};
	return map[color] ?? fallback;
};

const AssessmentScoreDetail: React.FC<AssessmentScoreDetailProps> = ({
	scoreData,
	performanceSessions,
	performanceLoadError,
}) => {
	const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
		new Set(
			scoreData.scoresByCategory[0]
				? [scoreData.scoresByCategory[0].categoryName]
				: []
		)
	);
	const [selectedJury, setSelectedJury] = useState<{
		juryId: string;
		juryName: string;
		categoryName: string;
	} | null>(null);

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

	const formatDateLong = (dateString: string | null) => {
		if (!dateString) return "____________________";
		return new Date(dateString).toLocaleDateString("id-ID", {
			day: "2-digit",
			month: "long",
			year: "numeric",
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

	const formatSignedScore = (value: number) => {
		if (value > 0) return `+${value.toFixed(1)}`;
		return value.toFixed(1);
	};

	const getExtraScopeLabel = (extra: AssessmentScoreData["extraNilai"][number]) => {
		if (extra.scope === "GENERAL") return "Total Umum";
		if (extra.scope === "CATEGORY") return extra.assessmentCategoryName || "Kategori";
		return extra.juaraCategoryName ? `Juara: ${extra.juaraCategoryName}` : "Kategori Juara";
	};

	const toggleCategory = (name: string) => {
		setExpandedCategories((prev) => {
			const next = new Set(prev);
			if (next.has(name)) next.delete(name);
			else next.add(name);
			return next;
		});
	};

	const completedPerformanceCount = performanceSessions.filter(
		(s) => s.status === "COMPLETED"
	).length;
	const materialTotalScore = scoreData.scoresByCategory.reduce(
		(sum, c) => sum + getCategoryActualScore(c),
		0
	);
	const actualTotalScore = scoreData.summary.totalScore ?? materialTotalScore;
	const extraNilai = scoreData.extraNilai || [];
	const extraSummary = scoreData.extraSummary || {
		baseTotalScore: materialTotalScore,
		categoryExtraAdjustment: 0,
		generalExtraAdjustment: 0,
		juaraExtraAdjustment: 0,
		totalAdjustment: 0,
		punishment: 0,
		poinplus: 0,
	};

	// ── KERTAS PENILAIAN ─────────────────────────────────────────────────────
	const renderScoringSheet = () => {
		if (!selectedJury) return null;
		const category = scoreData.scoresByCategory.find(
			(c) => c.categoryName === selectedJury.categoryName
		);
		if (!category) return null;

		const juryTotal = getJuryTotalForCategory(category, selectedJury.juryId);
		const juryMaterials = category.materials.map((m) => ({
			material: m.material,
			score: m.scores.find((s) => s.juryId === selectedJury.juryId) ?? null,
		}));

		const scoredDates = juryMaterials
			.map((m) => m.score?.scoredAt)
			.filter(Boolean)
			.sort() as string[];
		const assessmentDate = scoredDates[scoredDates.length - 1] ?? null;

		return (
			<div className="mb-4 sm:mb-6">
				<button
					onClick={() => setSelectedJury(null)}
					className="mb-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
				>
					<ArrowLeftIcon className="h-4 w-4" />
					Kembali ke Daftar Kategori
				</button>

				{/* Paper card */}
				<div className="rounded-xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
					{/* Form header */}
					<div className="bg-gradient-to-r from-gray-800 to-gray-700 dark:from-gray-900 dark:to-gray-800 px-5 py-5 sm:px-7 sm:py-6 text-white">
						<div className="flex items-start gap-3 mb-4">
							<div className="flex-shrink-0 bg-white/10 rounded-lg p-2.5">
								<TrophyIcon className="h-5 w-5 sm:h-6 sm:w-6" />
							</div>
							<div className="min-w-0">
								<p className="text-[11px] uppercase tracking-widest text-gray-400 mb-0.5">
									Lembar Penilaian Juri
								</p>
								<h2 className="text-base sm:text-lg font-bold leading-snug">
									{scoreData.event.title}
								</h2>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
							<div>
								<p className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">Kategori</p>
								<p className="font-semibold">{selectedJury.categoryName}</p>
							</div>
							<div>
								<p className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">Nama Juri</p>
								<p className="font-semibold">{selectedJury.juryName}</p>
							</div>
							<div>
								<p className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">
									Tanggal Penilaian
								</p>
								<p className="font-medium">{formatDateLong(assessmentDate)}</p>
							</div>
						</div>
					</div>

					{/* Score rows — rubrik grid per materi */}
					<div>
						{/* Column header — desktop only */}
						<div className="hidden sm:flex items-center bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600 px-4 py-2">
							<span className="w-10 flex-shrink-0 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 text-center">No</span>
							<span className="w-44 flex-shrink-0 pl-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Materi Penilaian</span>
							<span className="flex-1 pl-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Rubrik Penilaian</span>
						</div>

						{juryMaterials.map(({ material, score }, idx) => {
							const categories = material.scoreCategories ?? [];
							const hasRubric = categories.length > 0;

							return (
								<div
									key={material.id}
									className={`border-b border-gray-100 dark:border-gray-700/40 ${
										idx % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50/50 dark:bg-gray-800/60"
									}`}
								>
									{/* Mobile: stacked card | sm+: single flex row */}
									<div className="flex flex-col sm:flex-row sm:items-start px-4 py-3 gap-2 sm:gap-0">

										{/* No + Materi — always in a row */}
										<div className="flex items-start gap-2 sm:contents">
											<span className="w-6 sm:w-10 flex-shrink-0 pt-0.5 text-sm font-mono text-center text-gray-400 dark:text-gray-500">
												{material.number}
											</span>
											<div className="flex-1 sm:flex-none sm:w-44 sm:flex-shrink-0 sm:pl-3 sm:pt-0.5 min-w-0">
												<p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
													{material.name}
												</p>
												{score?.scoredAt && (
													<p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
														{formatDateTime(score.scoredAt)}
													</p>
												)}
											</div>
										</div>

										{/* Rubrik — indented on mobile, inline on desktop */}
										<div className="pl-8 sm:pl-4 sm:flex-1">
											{score?.isSkipped ? (
												<span className="inline-block rounded-full border-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
													{score.skipReason === "TIDAK_SESUAI" ? "Tidak Sesuai" : "Tidak Dijalankan"}
												</span>
											) : hasRubric ? (
												/* Mobile: 2-col grid | sm+: flex wrap row */
												<div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:flex sm:flex-wrap sm:gap-2">
													{categories.map((cat) => {
														const cc = getCategoryColorClasses(cat.color);
														return (
															<div key={cat.name} className="flex flex-col gap-1">
																{/* Category label */}
																<span className={`text-[10px] font-bold uppercase tracking-wide ${cc.label}`}>
																	{cat.name}
																</span>
																{/* Option chips */}
																<div className="flex flex-wrap gap-1">
																	{cat.options
																		.slice()
																		.sort((a, b) => a.score - b.score)
																		.map((opt) => {
																			const isSelected = score?.score === opt.score;
																			return (
																				<div
																					key={opt.score}
																					className={`relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border-2 text-[11px] sm:text-xs font-bold transition-all ${
																						isSelected
																							? `${cc.selected} shadow-sm`
																							: `bg-white dark:bg-gray-800 ${cc.unselected}`
																					}`}
																				>
																					{opt.score}
																					{isSelected && (
																						<span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white dark:bg-gray-900 shadow">
																							<svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
																								<circle cx="6" cy="6" r="5" className={`fill-current ${cc.label}`} />
																								<path d="M3.5 6l1.8 1.8L8.5 4.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
																							</svg>
																						</span>
																					)}
																				</div>
																			);
																		})}
																</div>
															</div>
														);
													})}
												</div>
											) : (
												score?.score !== null && score?.score !== undefined ? (
													<div className="flex items-center gap-2">
														<div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-blue-400 bg-blue-50 dark:bg-blue-900/30 text-sm font-bold text-blue-700 dark:text-blue-300">
															{score.score}
														</div>
														{score.scoreCategoryName && (
															<span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
																{score.scoreCategoryName}
															</span>
														)}
													</div>
												) : (
													<span className="text-gray-300 dark:text-gray-600">—</span>
												)
											)}
										</div>
									</div>
								</div>
							);
						})}

						{/* Total footer */}
						<div className="flex items-center justify-between bg-gray-800 dark:bg-gray-900 px-4 py-4">
							<span className="text-sm font-semibold text-gray-300">Total Nilai</span>
							<span className="text-2xl font-bold text-white">{juryTotal.toFixed(0)}</span>
						</div>
					</div>

					{/* Signature area */}
					<div className="px-5 py-5 sm:px-7 border-t border-dashed border-gray-200 dark:border-gray-700">
						<div className="flex justify-end">
							<div className="text-center min-w-[180px]">
								<p className="text-xs text-gray-500 dark:text-gray-400 mb-8">
									{formatDateLong(assessmentDate)}
								</p>
								<div className="border-t border-gray-400 dark:border-gray-500 pt-2 px-4">
									<p className="text-xs font-medium text-gray-700 dark:text-gray-300">
										{selectedJury.juryName}
									</p>
									<p className="text-[11px] text-gray-400 dark:text-gray-500">Juri Penilaian</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	};

	// ── LIST KATEGORI ─────────────────────────────────────────────────────────
	const renderCategoryList = () => {
		if (scoreData.scoresByCategory.length === 0) {
			return (
				<div className="mb-4 rounded-xl bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm shadow-md p-8 text-center sm:mb-6">
					<ChartBarIcon className="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
					<h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
						Belum Ada Penilaian
					</h3>
					<p className="text-gray-500 dark:text-gray-400">
						Penilaian belum dilakukan oleh juri untuk event ini.
					</p>
				</div>
			);
		}

		return (
			<div className="mb-4 sm:mb-6 space-y-3">
				{scoreData.scoresByCategory.map((category) => {
					const categoryTotal = getCategoryActualScore(category);
					const juryIds = getCategoryJuryIds(category);
					const categoryJuries = scoreData.juries.filter((j) => juryIds.has(j.id));
					const isExpanded = expandedCategories.has(category.categoryName);

					return (
						<div
							key={category.categoryName}
							className="overflow-hidden rounded-xl bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm shadow-md"
						>
							{/* Category header — clickable to expand/collapse */}
							<button
								className="flex w-full items-center justify-between p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30 sm:p-5"
								onClick={() => toggleCategory(category.categoryName)}
							>
								<div className="flex items-center gap-3 min-w-0">
									<div className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20">
										<TrophyIcon className="h-4 w-4 text-red-500" />
									</div>
									<div className="text-left min-w-0">
										<p className="text-sm font-semibold text-gray-900 dark:text-white sm:text-base truncate">
											{category.categoryName}
										</p>
										<p className="text-xs text-gray-500 dark:text-gray-400">
											{categoryJuries.length} juri &middot; {category.materials.length} materi
										</p>
									</div>
								</div>
								<div className="flex flex-shrink-0 items-center gap-3 pl-3">
									<div className="text-right">
										<p className="text-lg font-bold text-red-600 dark:text-red-400 sm:text-xl leading-tight">
											{categoryTotal.toFixed(1)}
										</p>
										<p className="text-[11px] text-gray-400 dark:text-gray-500">Total</p>
									</div>
									{isExpanded ? (
										<ChevronDownIcon className="h-5 w-5 flex-shrink-0 text-gray-400" />
									) : (
										<ChevronRightIcon className="h-5 w-5 flex-shrink-0 text-gray-400" />
									)}
								</div>
							</button>

							{/* Jury list — visible when expanded */}
							{isExpanded && (
								<div className="border-t border-gray-100 dark:border-gray-700/40">
									{categoryJuries.length === 0 ? (
										<p className="px-5 py-4 text-center text-sm text-gray-400 dark:text-gray-500">
											Belum ada juri yang menilai kategori ini.
										</p>
									) : (
										<div className="divide-y divide-gray-50 dark:divide-gray-700/30">
											{categoryJuries.map((jury, idx) => {
												const juryTotal = getJuryTotalForCategory(category, jury.id);
												const juryMaterialCount = category.materials.filter((m) => {
													const s = m.scores.find((sc) => sc.juryId === jury.id);
													return s && (s.score !== null || s.isSkipped);
												}).length;
												const pct = category.materials.length > 0
													? Math.round((juryMaterialCount / category.materials.length) * 100)
													: 0;

												return (
													<button
														key={jury.id}
														onClick={() =>
															setSelectedJury({
																juryId: jury.id,
																juryName: jury.name,
																categoryName: category.categoryName,
															})
														}
														className="group flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-blue-50/60 dark:hover:bg-blue-900/10 sm:px-5"
													>
														{/* Jury avatar */}
														<div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-xs font-bold text-white">
															{idx + 1}
														</div>

														<div className="flex-1 min-w-0 text-left">
															<p className="text-sm font-medium text-gray-900 dark:text-white truncate">
																{jury.name}
															</p>
															<div className="mt-1 flex items-center gap-2">
																{/* Progress bar */}
																<div className="flex-1 max-w-[80px] h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
																	<div
																		className="h-full rounded-full bg-blue-400 dark:bg-blue-500"
																		style={{ width: `${pct}%` }}
																	/>
																</div>
																<span className="text-[11px] text-gray-400 dark:text-gray-500 flex-shrink-0">
																	{juryMaterialCount}/{category.materials.length} materi
																</span>
															</div>
														</div>

														<div className="flex flex-shrink-0 items-center gap-2">
															<div className="text-right">
																<p className="text-sm font-bold text-gray-900 dark:text-white">
																	{juryTotal.toFixed(0)}
																</p>
																<p className="text-[11px] text-gray-400">nilai</p>
															</div>
															<ChevronRightIcon className="h-4 w-4 text-gray-300 transition-colors group-hover:text-blue-500" />
														</div>
													</button>
												);
											})}
										</div>
									)}

									{/* Extra adjustment row */}
									{(category.extraAdjustment || 0) !== 0 && (
										<div className="border-t border-amber-100 dark:border-amber-800/20 bg-amber-50 dark:bg-amber-900/10 px-4 py-2 sm:px-5">
											<div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400">
												<span>Extra {category.categoryName}</span>
												<span className="font-semibold">
													{formatSignedScore(category.extraAdjustment)}
												</span>
											</div>
										</div>
									)}

									{/* Category total footer */}
									<div className="border-t border-gray-100 dark:border-gray-700/40 bg-gray-50 dark:bg-gray-700/20 flex items-center justify-between px-4 py-3 sm:px-5">
										<span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
											Total {category.categoryName}
										</span>
										<span className="text-base font-bold text-red-600 dark:text-red-400">
											{categoryTotal.toFixed(1)}
										</span>
									</div>
								</div>
							)}
						</div>
					);
				})}
			</div>
		);
	};

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

				{/* Event title card */}
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

				{/* Summary banner */}
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
								Total final dari nilai materi dan extra nilai
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

				{/* Extra nilai */}
				{extraNilai.length > 0 && (
					<div className="mb-4 rounded-xl bg-white/80 p-4 shadow-md backdrop-blur-sm dark:bg-gray-800/50 sm:mb-6 sm:p-6">
						<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
							<div>
								<h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white sm:text-base">
									<PlusCircleIcon className="h-4 w-4 text-green-500 sm:h-5 sm:w-5" />
									Extra Nilai
								</h3>
								<p className="mt-1 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
									Penyesuaian nilai yang diberikan panitia.
								</p>
							</div>
							<div className="grid grid-cols-3 gap-2 text-center text-xs sm:min-w-[330px] sm:text-sm">
								<div className="rounded-lg bg-gray-100 px-2 py-2 dark:bg-gray-700">
									<div className="font-semibold text-gray-900 dark:text-white">
										{extraSummary.baseTotalScore.toFixed(1)}
									</div>
									<div className="text-gray-500 dark:text-gray-400">Nilai Materi</div>
								</div>
								<div className="rounded-lg bg-gray-100 px-2 py-2 dark:bg-gray-700">
									<div
										className={`font-semibold ${
											extraSummary.totalAdjustment >= 0
												? "text-green-600 dark:text-green-400"
												: "text-red-600 dark:text-red-400"
										}`}
									>
										{formatSignedScore(extraSummary.totalAdjustment)}
									</div>
									<div className="text-gray-500 dark:text-gray-400">Extra</div>
								</div>
								<div className="rounded-lg bg-red-50 px-2 py-2 dark:bg-red-900/30">
									<div className="font-semibold text-red-600 dark:text-red-400">
										{actualTotalScore.toFixed(1)}
									</div>
									<div className="text-gray-500 dark:text-gray-400">Final</div>
								</div>
							</div>
						</div>
						<div className="grid gap-2 md:grid-cols-2">
							{extraNilai.map((extra) => {
								const isPunishment = extra.type === "PUNISHMENT";
								return (
									<div
										key={extra.id}
										className={`rounded-lg border px-3 py-2 ${
											isPunishment
												? "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-900/20"
												: "border-green-200 bg-green-50 dark:border-green-500/30 dark:bg-green-900/20"
										}`}
									>
										<div className="flex items-start justify-between gap-3">
											<div className="min-w-0">
												<div
													className={`flex items-center gap-1.5 text-sm font-semibold ${
														isPunishment
															? "text-red-700 dark:text-red-300"
															: "text-green-700 dark:text-green-300"
													}`}
												>
													{isPunishment ? (
														<MinusCircleIcon className="h-4 w-4 flex-shrink-0" />
													) : (
														<PlusCircleIcon className="h-4 w-4 flex-shrink-0" />
													)}
													<span>{isPunishment ? "Punishment" : "Poin Plus"}</span>
												</div>
												<div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
													{getExtraScopeLabel(extra)}
													{extra.participantName ? ` - ${extra.participantName}` : ""}
												</div>
												{extra.reason && (
													<div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
														{extra.reason}
													</div>
												)}
											</div>
											<div
												className={`text-base font-bold ${
													isPunishment
														? "text-red-700 dark:text-red-300"
														: "text-green-700 dark:text-green-300"
												}`}
											>
												{formatSignedScore(extra.adjustment)}
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}

				{/* Category list OR scoring sheet */}
				{selectedJury ? renderScoringSheet() : renderCategoryList()}

				{/* Performance sessions */}
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
								const checkedCount = session.materialChecks.filter(
									(c) => c.isChecked
								).length;
								const skippedCount = session.materialChecks.length - checkedCount;
								const groupedChecks = session.materialChecks.reduce<
									Record<
										string,
										{ name: string; items: AssessmentPerformanceSession["materialChecks"] }
									>
								>((acc, check) => {
									const categoryId =
										check.material?.eventAssessmentCategoryId || "uncategorized";
									const categoryName = check.material?.category?.name || "Lainnya";
									if (!acc[categoryId])
										acc[categoryId] = { name: categoryName, items: [] };
									acc[categoryId].items.push(check);
									return acc;
								}, {});

								return (
									<div
										key={session.id}
										className="rounded-xl border border-gray-200/70 bg-gray-50/80 p-3 dark:border-gray-700/60 dark:bg-gray-900/30 sm:p-4"
									>
										<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
											<div>
												<div className="mb-2 flex flex-wrap items-center gap-2">
													<span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white sm:text-base">
														<MapPinIcon className="h-4 w-4 text-red-500" />
														{session.field.name}
													</span>
													<span
														className={`rounded-full px-2.5 py-1 text-xs font-medium ${getPerformanceStatusBadge(session.status)}`}
													>
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
																				{check.material?.number}.{" "}
																				{check.material?.name || "Materi tidak tersedia"}
																			</div>
																			<div className="mt-1 text-xs opacity-80">
																				{check.isChecked ? "Dijalankan" : "Dilewatkan"}
																			</div>
																			{check.notes && (
																				<div className="mt-1 text-xs opacity-70">
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
