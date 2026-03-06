import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
	ArrowLeftIcon,
	UserGroupIcon,
	CheckCircleIcon,
	XCircleIcon,
	CloudArrowUpIcon,
	ExclamationCircleIcon,
	SignalSlashIcon,
} from "@heroicons/react/24/outline";
import Swal from "sweetalert2";
import { api } from "../../utils/api";
import { 
	saveOfflineData, 
	removeOfflineData, 
	type OfflineParticipantData 
} from "../../utils/offlineStorage";

interface ScoreOption {
	name: string;
	score: number;
	order: number;
}

interface ScoreCategory {
	name: string;
	color: string;
	order: number;
	options: ScoreOption[];
}

interface ExistingEvaluation {
	id: string;
	score: number | null;
	scoreCategoryName: string | null;
	isSkipped: boolean;
	skipReason: string | null;
	notes: string | null;
}

interface Material {
	id: string;
	number: number;
	name: string;
	description: string | null;
	scoreCategories: ScoreCategory[];
	existingEvaluation: ExistingEvaluation | null;
}

interface CategoryWithMaterials {
	categoryId: string;
	categoryName: string;
	materials: Material[];
}

interface MaterialScore {
	materialId: string;
	score: number | null;
	scoreCategoryName: string | null;
	isSkipped: boolean;
	skipReason: string | null;
	notes: string;
	scoredAt: string | null; // ISO timestamp when jury clicked score
}

interface Participant {
	id: string;
	teamName: string;
	schoolCategory: {
		id: string;
		name: string;
	} | null;
	registrant: {
		name: string;
		institution: string | null;
	};
}

const MaterialScoring: React.FC = () => {
	const { eventSlug, participantId } = useParams<{
		eventSlug: string;
		participantId: string;
	}>();
	const navigate = useNavigate();

	const [eventId, setEventId] = useState<string>("");
	const [eventTitle, setEventTitle] = useState("");
	const [categories, setCategories] = useState<CategoryWithMaterials[]>([]);
	const [participant, setParticipant] = useState<Participant | null>(null);
	const [scores, setScores] = useState<MaterialScore[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [activeCategory, setActiveCategory] = useState<string | null>(null);
	const [hasLocalChanges, setHasLocalChanges] = useState(false);
	const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
	const [isOnline, setIsOnline] = useState(navigator.onLine);

	// Listen for online/offline events
	useEffect(() => {
		const handleOnline = () => setIsOnline(true);
		const handleOffline = () => setIsOnline(false);
		
		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);
		
		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	}, []);

	// Generate localStorage key for this participant
	const getLocalStorageKey = useCallback(() => {
		return `material_scores_${eventSlug}_${participantId}`;
	}, [eventSlug, participantId]);

	// Save scores to localStorage
	const saveToLocalStorage = useCallback((scoresToSave: MaterialScore[]) => {
		try {
			const key = getLocalStorageKey();
			const data = {
				scores: scoresToSave,
				savedAt: new Date().toISOString(),
				eventSlug,
				participantId,
			};
			localStorage.setItem(key, JSON.stringify(data));
			setLastSavedAt(new Date());
			setHasLocalChanges(true);
		} catch (error) {
			console.error("Error saving to localStorage:", error);
		}
	}, [getLocalStorageKey, eventSlug, participantId]);

	// Load scores from localStorage
	const loadFromLocalStorage = useCallback((): { scores: MaterialScore[]; savedAt: Date } | null => {
		try {
			const key = getLocalStorageKey();
			const stored = localStorage.getItem(key);
			if (stored) {
				const data = JSON.parse(stored);
				// Validate the data is for the same participant
				if (data.eventSlug === eventSlug && data.participantId === participantId) {
					return {
						scores: data.scores,
						savedAt: new Date(data.savedAt),
					};
				}
			}
		} catch (error) {
			console.error("Error loading from localStorage:", error);
		}
		return null;
	}, [getLocalStorageKey, eventSlug, participantId]);

	// Clear localStorage after successful save
	const clearLocalStorage = useCallback(() => {
		try {
			const key = getLocalStorageKey();
			localStorage.removeItem(key);
			setHasLocalChanges(false);
			setLastSavedAt(null);
		} catch (error) {
			console.error("Error clearing localStorage:", error);
		}
	}, [getLocalStorageKey]);

	useEffect(() => {
		if (eventSlug && participantId) {
			fetchData();
		}
	}, [eventSlug, participantId]);

	const fetchData = async () => {
		try {
			setLoading(true);

			// Fetch materials and existing evaluations
			const materialsRes = await api.get(
				`/evaluations/materials/event/${eventSlug}/participant/${participantId}`
			);
			
			setEventId(materialsRes.data.eventId);
			setEventTitle(materialsRes.data.eventTitle);
			setCategories(materialsRes.data.categories);

			// Set first category as active
			if (materialsRes.data.categories.length > 0) {
				setActiveCategory(materialsRes.data.categories[0].categoryId);
			}

			// Initialize scores from existing evaluations or empty
			const allMaterials = materialsRes.data.categories.flatMap(
				(cat: CategoryWithMaterials) => cat.materials
			);

			const serverScores: MaterialScore[] = allMaterials.map((m: Material) => ({
				materialId: m.id,
				score: m.existingEvaluation?.score ?? null,
				scoreCategoryName: m.existingEvaluation?.scoreCategoryName ?? null,
				isSkipped: m.existingEvaluation?.isSkipped ?? false,
				skipReason: m.existingEvaluation?.skipReason ?? null,
				notes: m.existingEvaluation?.notes ?? "",
				scoredAt: null, // Will be set when jury clicks score
			}));

			// Check for localStorage data
			const localData = loadFromLocalStorage();
			if (localData && localData.scores.length > 0) {
				// Check if there are any local changes that differ from server
				const hasChanges = localData.scores.some((localScore) => {
					const serverScore = serverScores.find(s => s.materialId === localScore.materialId);
					if (!serverScore) return false;
					return (
						localScore.score !== serverScore.score ||
						localScore.scoreCategoryName !== serverScore.scoreCategoryName ||
						localScore.isSkipped !== serverScore.isSkipped
					);
				});

				if (hasChanges) {
					// Merge local scores with server scores (local takes priority for materials that exist)
					const mergedScores = serverScores.map((serverScore) => {
						const localScore = localData.scores.find(s => s.materialId === serverScore.materialId);
						if (localScore && (localScore.score !== null || localScore.isSkipped)) {
							return localScore;
						}
						return serverScore;
					});
					setScores(mergedScores);
					setHasLocalChanges(true);
					setLastSavedAt(localData.savedAt);
					
					// Show notification about restored data
					Swal.fire({
						icon: "info",
						title: "Data Lokal Ditemukan",
						html: `<p>Ditemukan nilai yang belum disimpan ke server.</p>
							   <p class="text-sm text-gray-500 mt-2">Terakhir disimpan: ${localData.savedAt.toLocaleString("id-ID")}</p>
							   <p class="text-sm text-yellow-600 mt-2">Klik "Simpan Nilai" untuk menyimpan ke server.</p>`,
						confirmButtonText: "Lanjutkan Penilaian",
						showCancelButton: true,
						cancelButtonText: "Gunakan Data Server",
					}).then((result) => {
						if (!result.isConfirmed) {
							// User wants to use server data, clear local storage
							clearLocalStorage();
							setScores(serverScores);
						}
					});
				} else {
					// No changes, use server scores and clear localStorage
					clearLocalStorage();
					setScores(serverScores);
				}
			} else {
				setScores(serverScores);
			}

			// Fetch participant info
			const participantsRes = await api
				.get(`/juries/events/${eventSlug}/peserta`)
				.catch(() => ({ data: [] }));
			const targetParticipant = participantsRes.data.find(
				(p: Participant) => p.id === participantId
			);
			setParticipant(targetParticipant || null);
		} catch (error) {
			console.error("Error fetching data:", error);
			Swal.fire({
				icon: "error",
				title: "Gagal Memuat Data",
				text: "Terjadi kesalahan saat memuat data penilaian.",
			});
		} finally {
			setLoading(false);
		}
	};

	const getScoreForMaterial = (materialId: string) => {
		return scores.find((s) => s.materialId === materialId);
	};

	const setMaterialScore = (
		materialId: string,
		score: number,
		categoryName: string
	) => {
		setScores((prev) => {
			const newScores = prev.map((s) =>
				s.materialId === materialId
					? {
							...s,
							score,
							scoreCategoryName: categoryName,
							isSkipped: false,
							skipReason: null,
							scoredAt: new Date().toISOString(), // Record timestamp when jury clicks
					  }
					: s
			);
			saveToLocalStorage(newScores);
			return newScores;
		});
	};

	const setMaterialSkipped = (materialId: string, reason: string) => {
		setScores((prev) => {
			const newScores = prev.map((s) =>
				s.materialId === materialId
					? {
							...s,
							score: null,
							scoreCategoryName: null,
							isSkipped: true,
							skipReason: reason,
							scoredAt: new Date().toISOString(), // Record timestamp when jury clicks
					  }
					: s
			);
			saveToLocalStorage(newScores);
			return newScores;
		});
	};

	const clearMaterialScore = (materialId: string) => {
		setScores((prev) => {
			const newScores = prev.map((s) =>
				s.materialId === materialId
					? {
							...s,
							score: null,
							scoreCategoryName: null,
							isSkipped: false,
							skipReason: null,
							scoredAt: null, // Clear timestamp when clearing score
					  }
					: s
			);
			saveToLocalStorage(newScores);
			return newScores;
		});
	};

	const getColorClasses = (color: string, isSelected: boolean) => {
		const baseColors: Record<string, { bg: string; selected: string; text: string }> = {
			red: {
				bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
				selected: "bg-red-500 text-white border-red-600",
				text: "text-red-700 dark:text-red-300",
			},
			orange: {
				bg: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
				selected: "bg-orange-500 text-white border-orange-600",
				text: "text-orange-700 dark:text-orange-300",
			},
			yellow: {
				bg: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
				selected: "bg-yellow-500 text-white border-yellow-600",
				text: "text-yellow-700 dark:text-yellow-300",
			},
			green: {
				bg: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
				selected: "bg-green-500 text-white border-green-600",
				text: "text-green-700 dark:text-green-300",
			},
			blue: {
				bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
				selected: "bg-blue-500 text-white border-blue-600",
				text: "text-blue-700 dark:text-blue-300",
			},
			purple: {
				bg: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
				selected: "bg-purple-500 text-white border-purple-600",
				text: "text-purple-700 dark:text-purple-300",
			},
			gray: {
				bg: "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700",
				selected: "bg-gray-500 text-white border-gray-600",
				text: "text-gray-700 dark:text-gray-300",
			},
		};
		const colorSet = baseColors[color] || baseColors.gray;
		return isSelected ? colorSet!.selected : colorSet!.bg;
	};

	const getHeaderColorClasses = (color: string) => {
		const colors: Record<string, string> = {
			red: "bg-red-500 text-white",
			orange: "bg-orange-500 text-white",
			yellow: "bg-yellow-500 text-white",
			green: "bg-green-500 text-white",
			blue: "bg-blue-500 text-white",
			purple: "bg-purple-500 text-white",
			gray: "bg-gray-500 text-white",
		};
		return colors[color] || colors.gray;
	};

	const isFormComplete = () => {
		return scores.every(
			(s) => s.score !== null || s.isSkipped
		);
	};

	const getCompletionStatus = () => {
		const total = scores.length;
		const completed = scores.filter(
			(s) => s.score !== null || s.isSkipped
		).length;
		return { completed, total };
	};

	const handleSubmit = async () => {
		// Validate all materials are scored
		const incomplete = scores.filter(
			(s) => s.score === null && !s.isSkipped
		);

		if (incomplete.length > 0) {
			const result = await Swal.fire({
				icon: "warning",
				title: "Ada Materi Belum Dinilai",
				text: `${incomplete.length} materi belum diberi nilai. Lanjutkan?`,
				showCancelButton: true,
				confirmButtonText: "Lanjutkan",
				cancelButtonText: "Kembali",
			});

			if (!result.isConfirmed) {
				return;
			}
		}

		// Filter only completed scores
		const evaluationsToSubmit = scores
			.filter((s) => s.score !== null || s.isSkipped)
			.map((s) => ({
				materialId: s.materialId,
				score: s.score,
				scoreCategoryName: s.scoreCategoryName,
				isSkipped: s.isSkipped,
				skipReason: s.skipReason,
				notes: s.notes,
				scoredAt: s.scoredAt,
			}));

		// Check if offline
		if (!navigator.onLine) {
			// Save to offline storage
			const offlineData: OfflineParticipantData = {
				participantId: participantId!,
				eventSlug: eventSlug!,
				eventId,
				scores: evaluationsToSubmit.map(e => ({
					...e,
					notes: e.notes || '',
				})),
				savedAt: new Date().toISOString(),
				participantName: participant?.teamName || participant?.registrant.institution || 'Unknown',
				schoolCategoryName: participant?.schoolCategory?.name,
			};
			saveOfflineData(offlineData);

			await Swal.fire({
				icon: "info",
				title: "Tersimpan Offline",
				html: `<p>Tidak ada koneksi internet.</p>
					   <p class="text-sm text-gray-500 mt-2">Nilai disimpan secara lokal dan akan dikirim saat online.</p>`,
				confirmButtonText: "Lanjut Nilai Peserta Lain",
			});

			navigate(`/juri/events/${eventSlug}/penilaian`);
			return;
		}

		try {
			setSaving(true);

			await api.post("/evaluations/materials/submit", {
				eventId,
				participantId,
				evaluations: evaluationsToSubmit,
			});

			// Clear localStorage after successful submission
			clearLocalStorage();
			// Also remove from offline storage if exists
			removeOfflineData(eventSlug!, participantId!);

			await Swal.fire({
				icon: "success",
				title: "Penilaian Disimpan",
				text: "Nilai berhasil disimpan ke server.",
				timer: 1500,
				showConfirmButton: false,
			});

			navigate(`/juri/events/${eventSlug}/penilaian`);
		} catch (error) {
			console.error("Error submitting evaluations:", error);
			
			// If network error, save offline
			const offlineData: OfflineParticipantData = {
				participantId: participantId!,
				eventSlug: eventSlug!,
				eventId,
				scores: evaluationsToSubmit.map(e => ({
					...e,
					notes: e.notes || '',
				})),
				savedAt: new Date().toISOString(),
				participantName: participant?.teamName || participant?.registrant.institution || 'Unknown',
				schoolCategoryName: participant?.schoolCategory?.name,
			};
			saveOfflineData(offlineData);

			await Swal.fire({
				icon: "warning",
				title: "Gagal Mengirim ke Server",
				html: `<p>Nilai telah disimpan secara lokal.</p>
					   <p class="text-sm text-gray-500 mt-2">Nilai akan dikirim saat koneksi tersedia.</p>`,
				confirmButtonText: "Lanjut Nilai Peserta Lain",
			});

			navigate(`/juri/events/${eventSlug}/penilaian`);
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
			</div>
		);
	}

	const { completed, total } = getCompletionStatus();
	const activeData = categories.find((c) => c.categoryId === activeCategory);

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			{/* Header */}
			<div className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<Link
								to={`/juri/events/${eventSlug}/penilaian`}
								className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
							>
								<ArrowLeftIcon className="h-5 w-5" />
							</Link>
							<div>
								<h1 className="text-xl font-bold text-gray-900 dark:text-white">
									Penilaian Materi
								</h1>
								<p className="text-sm text-gray-500 dark:text-gray-400">
									{eventTitle}
								</p>
							</div>
						</div>

						<div className="flex items-center gap-4">
							{/* Online/Offline Indicator */}
							{!isOnline && (
								<div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
									<SignalSlashIcon className="h-4 w-4" />
									<span className="hidden sm:inline">Offline</span>
								</div>
							)}

							{/* Local Changes Indicator */}
							{hasLocalChanges && (
								<div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg text-sm">
									<ExclamationCircleIcon className="h-4 w-4" />
									<span className="hidden sm:inline">
										Belum tersimpan ke server
										{lastSavedAt && (
											<span className="text-xs ml-1">
												(lokal: {lastSavedAt.toLocaleTimeString("id-ID")})
											</span>
										)}
									</span>
									<span className="sm:hidden">Lokal</span>
								</div>
							)}

							{/* Progress */}
							<div className="text-sm text-gray-600 dark:text-gray-400">
								<span className="font-medium">{completed}</span>
								<span> / {total} materi</span>
							</div>
							
							<button
								onClick={handleSubmit}
								disabled={saving || !isFormComplete()}
								className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
									isFormComplete()
										? isOnline 
											? "bg-green-600 text-white hover:bg-green-700"
											: "bg-yellow-600 text-white hover:bg-yellow-700"
										: "bg-gray-300 text-gray-500 cursor-not-allowed"
								}`}
							>
								{!isOnline ? (
									<SignalSlashIcon className="h-5 w-5" />
								) : hasLocalChanges ? (
									<CloudArrowUpIcon className="h-5 w-5" />
								) : (
									<CheckCircleIcon className="h-5 w-5" />
								)}
								{saving ? "Menyimpan..." : !isOnline ? "Simpan Offline" : hasLocalChanges ? "Simpan ke Server" : "Simpan Nilai"}
							</button>
						</div>
					</div>

					{/* Participant Info */}
					{participant && (
						<div className="mt-3 flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
							<UserGroupIcon className="h-6 w-6 text-indigo-500" />
							<div>
								<p className="font-semibold text-gray-900 dark:text-white">
									{participant.teamName}
								</p>
								<p className="text-sm text-gray-500 dark:text-gray-400">
									{participant.schoolCategory?.name} • {participant.registrant.institution}
								</p>
							</div>
						</div>
					)}
				</div>

				{/* Category Tabs */}
				<div className="border-t border-gray-200 dark:border-gray-700">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
						<div className="flex gap-1 overflow-x-auto py-2">
							{categories.map((cat) => {
								const catScores = scores.filter((s) =>
									cat.materials.some((m) => m.id === s.materialId)
								);
								const catCompleted = catScores.filter(
									(s) => s.score !== null || s.isSkipped
								).length;

								return (
									<button
										key={cat.categoryId}
										onClick={() => setActiveCategory(cat.categoryId)}
										className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
											activeCategory === cat.categoryId
												? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
												: "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
										}`}
									>
										{cat.categoryName}
										<span
											className={`text-xs px-1.5 py-0.5 rounded-full ${
												catCompleted === cat.materials.length
													? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
													: "bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300"
											}`}
										>
											{catCompleted}/{cat.materials.length}
										</span>
									</button>
								);
							})}
						</div>
					</div>
				</div>
			</div>

			{/* Materials Grid */}
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
				{activeData && (
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
						{/* Table Header */}
						<div className="overflow-x-auto">
							<table className="min-w-full">
								<thead>
									<tr className="bg-gray-900 dark:bg-gray-950">
										<th className="px-4 py-3 text-left text-sm font-semibold text-white w-80">
											Kriteria Penilaian
										</th>
										{/* Dynamic columns based on first material's score categories */}
										{activeData.materials[0]?.scoreCategories
											.sort((a, b) => a.order - b.order)
											.map((cat) => (
												<th
													key={cat.name}
													className={`px-4 py-3 text-center text-sm font-semibold ${getHeaderColorClasses(
														cat.color
													)}`}
												>
													{cat.name}
												</th>
											))}
										<th className="px-4 py-3 text-center text-sm font-semibold bg-gray-600 text-white w-24">
											Kosong
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-200 dark:divide-gray-700">
									{activeData.materials
										.sort((a, b) => a.number - b.number)
										.map((material) => {
											const currentScore = getScoreForMaterial(material.id);
											const scoreCategories = material.scoreCategories.sort(
												(a, b) => a.order - b.order
											);

											return (
												<tr
													key={material.id}
													className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
												>
													{/* Material Name */}
													<td className="px-4 py-3">
														<div className="flex items-center gap-3">
															<span className="flex items-center justify-center w-7 h-7 bg-gray-100 dark:bg-gray-700 rounded-full text-sm font-semibold text-gray-600 dark:text-gray-300">
																{material.number}
															</span>
															<div>
																<p className="font-medium text-gray-900 dark:text-white uppercase">
																	{material.name}
																</p>
																{material.description && (
																	<p className="text-xs text-gray-500 dark:text-gray-400">
																		{material.description}
																	</p>
																)}
															</div>
														</div>
													</td>

													{/* Score Options */}
													{scoreCategories.map((cat) => (
														<td key={cat.name} className="px-2 py-3">
															<div className="flex justify-center gap-1">
																{cat.options
																	.sort((a, b) => a.order - b.order)
																	.map((opt) => {
																		const isSelected =
																			currentScore?.score === opt.score &&
																			currentScore?.scoreCategoryName === cat.name &&
																			!currentScore?.isSkipped;

																		return (
																			<button
																				key={`${cat.name}-${opt.score}`}
																				onClick={() =>
																					setMaterialScore(material.id, opt.score, cat.name)
																				}
																				className={`min-w-10 px-2 py-2 text-sm font-semibold rounded border-2 transition-all ${getColorClasses(
																					cat.color,
																					isSelected
																				)} ${
																					isSelected
																						? "ring-2 ring-offset-1 ring-gray-400"
																						: "hover:opacity-80"
																				}`}
																				title={opt.name || `${cat.name}: ${opt.score}`}
																			>
																				{opt.score}
																			</button>
																		);
																	})}
															</div>
														</td>
													))}

													{/* Skip/Empty Option */}
													<td className="px-2 py-3">
														<div className="flex flex-col items-center gap-1">
															<button
																onClick={() => {
																	if (currentScore?.isSkipped) {
																		clearMaterialScore(material.id);
																	} else {
																		// Show skip reason selection
																		Swal.fire({
																			title: "Alasan Tidak Menilai",
																			input: "select",
																			inputOptions: {
																				TIDAK_SESUAI: "Materi tidak sesuai",
																				TIDAK_DIJALANKAN: "Materi tidak dijalankan",
																			},
																			inputPlaceholder: "Pilih alasan",
																			showCancelButton: true,
																			confirmButtonText: "Konfirmasi",
																			cancelButtonText: "Batal",
																		}).then((result) => {
																			if (result.isConfirmed && result.value) {
																				setMaterialSkipped(material.id, result.value);
																			}
																		});
																	}
																}}
																className={`w-10 h-10 flex items-center justify-center rounded border-2 transition-all ${
																	currentScore?.isSkipped
																		? "bg-gray-500 text-white border-gray-600 ring-2 ring-offset-1 ring-gray-400"
																		: "bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
																}`}
																title={
																	currentScore?.isSkipped
																		? currentScore.skipReason === "TIDAK_SESUAI"
																			? "Materi tidak sesuai"
																			: "Materi tidak dijalankan"
																		: "Tidak dinilai"
																}
															>
																{currentScore?.isSkipped ? (
																	<XCircleIcon className="h-5 w-5" />
																) : (
																	<span className="text-sm font-semibold">0</span>
																)}
															</button>
															{currentScore?.isSkipped && (
																<span className="text-xs text-gray-500 dark:text-gray-400">
																	{currentScore.skipReason === "TIDAK_SESUAI"
																		? "Tidak sesuai"
																		: "Tidak jalan"}
																</span>
															)}
														</div>
													</td>
												</tr>
											);
										})}
								</tbody>
							</table>
						</div>
					</div>
				)}
			</div>

			{/* Floating Submit Button (Mobile) */}
			<div className="fixed bottom-4 right-4 sm:hidden">
				{hasLocalChanges && (
					<div className="absolute -top-2 -left-2 w-4 h-4 bg-yellow-500 rounded-full animate-pulse" title="Ada perubahan lokal" />
				)}
				<button
					onClick={handleSubmit}
					disabled={saving || !isFormComplete()}
					className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium shadow-lg transition-colors ${
						isFormComplete()
							? "bg-green-600 text-white hover:bg-green-700"
							: "bg-gray-300 text-gray-500 cursor-not-allowed"
					}`}
				>
					{hasLocalChanges ? (
						<CloudArrowUpIcon className="h-5 w-5" />
					) : (
						<CheckCircleIcon className="h-5 w-5" />
					)}
					{saving ? "..." : "Simpan"}
				</button>
			</div>
		</div>
	);
};

export default MaterialScoring;
