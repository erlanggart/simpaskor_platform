import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, Link, useNavigate, useOutletContext } from "react-router-dom";
import {
	LuArrowLeft,
	LuUsers,
	LuCircleX,
	LuCloudUpload,
	LuTriangleAlert,
	LuWifiOff,
	LuWifi,
	LuSave,
} from "react-icons/lu";
import Swal from "sweetalert2";
import { api } from "../../utils/api";
import { 
	saveOfflineData, 
	removeOfflineData, 
	cacheApiResponse,
	getCachedApiResponse,
	type OfflineParticipantData 
} from "../../utils/offlineStorage";
import type { PenilaianOutletContext } from "./EventPenilaian";

interface ExistingEvaluation {
	id: string;
	materialId: string;
	score: number | null;
	scoreCategoryName: string | null;
	isSkipped: boolean;
	skipReason: string | null;
	notes: string | null;
}

interface CategoryWithMaterials {
	categoryId: string;
	categoryName: string;
	categoryOrder?: number;
	materials: {
		id: string;
		number: number;
		name: string;
		description: string | null;
		scoreCategories: {
			name: string;
			color: string;
			order: number;
			options: { name: string; score: number; order: number }[];
		}[];
	}[];
}

interface MaterialScore {
	materialId: string;
	score: number | null;
	scoreCategoryName: string | null;
	isSkipped: boolean;
	skipReason: string | null;
	notes: string;
	scoredAt: string | null;
}

const MaterialScoring: React.FC = () => {
	const { eventSlug, participantId } = useParams<{
		eventSlug: string;
		participantId: string;
	}>();
	const navigate = useNavigate();
	const { eventId: ctxEventId, eventTitle: ctxEventTitle, allCategories, participants, refreshStatus } = useOutletContext<PenilaianOutletContext>();

	// Find participant from context
	const participant = useMemo(() => {
		return participants.find(p => p.id === participantId) || null;
	}, [participants, participantId]);

	// Filter materials by participant's school category (client-side)
	const categories: CategoryWithMaterials[] = useMemo(() => {
		if (!participant) return [];
		const schoolCatId = participant.schoolCategory?.id || null;
		return allCategories.map(cat => ({
			categoryId: cat.categoryId,
			categoryName: cat.categoryName,
			categoryOrder: cat.categoryOrder,
			materials: cat.materials.filter(m => {
				const matSchoolCatIds = m.schoolCategoryIds || [];
				if (matSchoolCatIds.length === 0) return true; // no restriction
				if (!schoolCatId) return true; // participant has no school category
				return matSchoolCatIds.includes(schoolCatId);
			}).map(m => ({
				id: m.id,
				number: m.number,
				name: m.name,
				description: m.description,
				scoreCategories: m.scoreCategories,
			})),
		})).filter(cat => cat.materials.length > 0);
	}, [allCategories, participant]);

	const [scores, setScores] = useState<MaterialScore[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [hasLocalChanges, setHasLocalChanges] = useState(false);
	const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
	const [isOnline, setIsOnline] = useState(navigator.onLine);
	const [showReconnected, setShowReconnected] = useState(false);

	// Listen for online/offline events
	useEffect(() => {
		const handleOnline = () => {
			setIsOnline(true);
			if (hasLocalChanges) {
				setShowReconnected(true);
			}
		};
		const handleOffline = () => {
			setIsOnline(false);
			setShowReconnected(false);
		};
		
		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);
		
		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	}, [hasLocalChanges]);

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

	// Fetch only existing evaluations for this participant (materials come from context)
	useEffect(() => {
		if (eventSlug && participantId && categories.length > 0) {
			fetchEvaluations();
		} else if (eventSlug && participantId && participant !== null && categories.length === 0) {
			// Participant found but no materials match → stop loading
			setLoading(false);
		}
	}, [eventSlug, participantId, categories, participant]);

	const fetchEvaluations = async () => {
		try {
			setLoading(true);

			const allMaterials = categories.flatMap(cat => cat.materials);

			// Build default scores (no evaluations yet)
			const defaultScores: MaterialScore[] = allMaterials.map(m => ({
				materialId: m.id,
				score: null,
				scoreCategoryName: null,
				isSkipped: false,
				skipReason: null,
				notes: "",
				scoredAt: null,
			}));

			let serverEvaluations: ExistingEvaluation[] = [];
			const evalCacheKey = `evaluations_${eventSlug}_${participantId}`;

			if (navigator.onLine) {
				try {
					const res = await api.get(
						`/evaluations/materials/event/${eventSlug}/participant/${participantId}/existing`
					);
					serverEvaluations = res.data.evaluations || [];
					cacheApiResponse(evalCacheKey, serverEvaluations);
				} catch {
					const cached = getCachedApiResponse<ExistingEvaluation[]>(evalCacheKey);
					if (cached) serverEvaluations = cached.data;
				}
			} else {
				const cached = getCachedApiResponse<ExistingEvaluation[]>(evalCacheKey);
				if (cached) serverEvaluations = cached.data;
			}

			// Merge server evaluations into scores
			const evalMap = new Map(serverEvaluations.map(e => [e.materialId, e]));
			const serverScores: MaterialScore[] = defaultScores.map(s => {
				const evaluation = evalMap.get(s.materialId);
				if (evaluation) {
					return {
						...s,
						score: evaluation.score ?? null,
						scoreCategoryName: evaluation.scoreCategoryName ?? null,
						isSkipped: evaluation.isSkipped ?? false,
						skipReason: evaluation.skipReason ?? null,
						notes: evaluation.notes ?? "",
					};
				}
				return s;
			});

			// Check for local changes
			const localData = loadFromLocalStorage();
			if (localData && localData.scores.length > 0) {
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
					
					if (navigator.onLine) {
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
								clearLocalStorage();
								setScores(serverScores);
							}
						});
					}
				} else {
					clearLocalStorage();
					setScores(serverScores);
				}
			} else {
				setScores(serverScores);
			}
		} catch (error) {
			console.error("Error fetching evaluations:", error);
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
							scoredAt: new Date().toISOString(),
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
							scoredAt: new Date().toISOString(),
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
							scoredAt: null,
					  }
					: s
			);
			saveToLocalStorage(newScores);
			return newScores;
		});
	};

	const getColorClasses = (color: string, isSelected: boolean) => {
		const baseColors: Record<string, { bg: string; selected: string }> = {
			red: {
				bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300",
				selected: "bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/25",
			},
			orange: {
				bg: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/50 text-orange-700 dark:text-orange-300",
				selected: "bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/25",
			},
			yellow: {
				bg: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/50 text-yellow-700 dark:text-yellow-300",
				selected: "bg-yellow-500 text-white border-yellow-500 shadow-lg shadow-yellow-500/25",
			},
			green: {
				bg: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-300",
				selected: "bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/25",
			},
			blue: {
				bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-300",
				selected: "bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/25",
			},
			purple: {
				bg: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/50 text-purple-700 dark:text-purple-300",
				selected: "bg-purple-500 text-white border-purple-500 shadow-lg shadow-purple-500/25",
			},
			gray: {
				bg: "bg-gray-50 dark:bg-gray-900/20 border-gray-200/60 dark:border-gray-700/40 text-gray-700 dark:text-gray-300",
				selected: "bg-gray-500 text-white border-gray-500 shadow-lg shadow-gray-500/25",
			},
		};
		const colorSet = baseColors[color] || baseColors.gray!;
		return isSelected ? colorSet!.selected : colorSet!.bg;
	};

	const getCategoryLabelColor = (color: string) => {
		const colors: Record<string, string> = {
			red: "text-red-600 dark:text-red-400",
			orange: "text-orange-600 dark:text-orange-400",
			yellow: "text-yellow-600 dark:text-yellow-400",
			green: "text-green-600 dark:text-green-400",
			blue: "text-blue-600 dark:text-blue-400",
			purple: "text-purple-600 dark:text-purple-400",
			gray: "text-gray-600 dark:text-gray-400",
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

		if (!navigator.onLine) {
			const offlineData: OfflineParticipantData = {
				participantId: participantId!,
				eventSlug: eventSlug!,
				eventId: ctxEventId,
				scores: evaluationsToSubmit.map(e => ({
					...e,
					notes: e.notes || '',
				})),
				savedAt: new Date().toISOString(),
				participantName: participant?.teamName || participant?.registrant.institution || 'Unknown',
				schoolCategoryName: participant?.schoolCategory?.name,
			};
			saveOfflineData(offlineData);
			clearLocalStorage();

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
				eventId: ctxEventId,
				participantId,
				evaluations: evaluationsToSubmit,
			});

			clearLocalStorage();
			removeOfflineData(eventSlug!, participantId!);

			// Refresh parent status so participant list shows updated progress
			refreshStatus();

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
			
			const offlineData: OfflineParticipantData = {
				participantId: participantId!,
				eventSlug: eventSlug!,
				eventId: ctxEventId,
				scores: evaluationsToSubmit.map(e => ({
					...e,
					notes: e.notes || '',
				})),
				savedAt: new Date().toISOString(),
				participantName: participant?.teamName || participant?.registrant.institution || 'Unknown',
				schoolCategoryName: participant?.schoolCategory?.name,
			};
			saveOfflineData(offlineData);
			clearLocalStorage();

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
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-10 w-10 border-2 border-red-500/30 border-t-red-500 mx-auto"></div>
					<p className="mt-4 text-sm text-gray-500 dark:text-gray-500">Memuat data penilaian...</p>
				</div>
			</div>
		);
	}

	if (categories.length === 0) {
		return (
			<div className="min-h-screen flex items-center justify-center px-4">
				<div className="text-center max-w-md">
					<LuCircleX className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
					<h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
						Tidak Ada Materi
					</h2>
					<p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
						Belum ada materi penilaian untuk peserta ini.
					</p>
					<Link
						to={`/juri/events/${eventSlug}/penilaian`}
						className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-red-500/20"
					>
						<LuArrowLeft className="w-4 h-4" />
						Kembali
					</Link>
				</div>
			</div>
		);
	}

	const { completed, total } = getCompletionStatus();
	const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;
	const sortedCategories = [...categories].sort((a, b) => (a.categoryOrder ?? 0) - (b.categoryOrder ?? 0));

	return (
		<div className="min-h-screen transition-colors">
			{/* Sticky Header */}
			<div className="sticky top-0 z-20">
				{/* Top Bar */}
				<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl border-b border-gray-200/50 dark:border-white/[0.06]">
					<div className="w-full px-4 py-3">
						<div className="flex items-center justify-between gap-3">
							{/* Left: Back + Title */}
							<div className="flex items-center gap-3 min-w-0">
								<Link
									to={`/juri/events/${eventSlug}/penilaian`}
									className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
								>
									<LuArrowLeft className="w-5 h-5" />
								</Link>
								<div className="min-w-0">
									<h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">
										Penilaian Materi
									</h1>
									<p className="text-xs text-gray-500 dark:text-gray-400 truncate">
										{ctxEventTitle}
									</p>
								</div>
							</div>

							{/* Right: Status + Save */}
							<div className="flex items-center gap-2 flex-shrink-0">
								{/* Online/Offline Badge */}
								<div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
									isOnline
										? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
										: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
								}`}>
									{isOnline ? (
										<LuWifi className="w-3.5 h-3.5" />
									) : (
										<LuWifiOff className="w-3.5 h-3.5" />
									)}
									<span className="hidden sm:inline">{isOnline ? "Online" : "Offline"}</span>
								</div>

								{/* Save button (desktop) */}
								<button
									onClick={handleSubmit}
									disabled={saving || !isFormComplete()}
									className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
										isFormComplete()
											? isOnline
												? "bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-500/20"
												: "bg-yellow-600 text-white hover:bg-yellow-700 shadow-lg shadow-yellow-500/20"
											: "bg-gray-200 dark:bg-white/[0.06] text-gray-400 dark:text-gray-500 cursor-not-allowed"
									}`}
								>
									{!isOnline ? (
										<LuWifiOff className="w-4 h-4" />
									) : hasLocalChanges ? (
										<LuCloudUpload className="w-4 h-4" />
									) : (
										<LuSave className="w-4 h-4" />
									)}
									{saving ? "Menyimpan..." : !isOnline ? "Simpan Offline" : hasLocalChanges ? "Kirim ke Server" : "Simpan"}
								</button>
							</div>
						</div>

						{/* Participant Info */}
						{participant && (
							<div className="mt-2 flex items-center gap-3 p-3 bg-red-50/50 dark:bg-white/[0.03] rounded-xl border border-gray-200/50 dark:border-white/[0.06]">
								<LuUsers className="w-5 h-5 text-red-500 flex-shrink-0" />
								<div className="min-w-0 flex-1">
									<p className="font-bold text-gray-900 dark:text-white text-sm truncate">
										{participant.teamName}
									</p>
									<p className="text-xs text-gray-500 dark:text-gray-400 truncate">
										{participant.schoolCategory?.name} • {participant.registrant.institution}
									</p>
								</div>
								{/* Mini Progress */}
								<div className="flex items-center gap-2 flex-shrink-0">
									<div className="w-16 h-1.5 bg-gray-200 dark:bg-white/[0.06] rounded-full overflow-hidden">
										<div
											className="h-full bg-green-500 transition-all duration-300 rounded-full"
											style={{ width: `${completionPercentage}%` }}
										/>
									</div>
									<span className="text-xs font-bold text-gray-600 dark:text-gray-400">
										{completed}/{total}
									</span>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Reconnection Banner */}
				{showReconnected && hasLocalChanges && (
					<div className="bg-green-50 dark:bg-green-900/20 border-b border-green-200/50 dark:border-green-800/30">
						<div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between">
							<div className="flex items-center gap-2 text-green-700 dark:text-green-300 text-sm">
								<LuWifi className="w-4 h-4" />
								<span>Koneksi kembali! Klik <strong>Simpan</strong> untuk mengirim nilai ke server.</span>
							</div>
							<button
								onClick={() => setShowReconnected(false)}
								className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 p-1"
							>
								<LuCircleX className="w-4 h-4" />
							</button>
						</div>
					</div>
				)}

				{/* Unsaved Changes Banner */}
				{hasLocalChanges && !showReconnected && (
					<div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200/50 dark:border-yellow-800/30">
						<div className="max-w-4xl mx-auto px-4 py-2 flex items-center gap-2 text-yellow-700 dark:text-yellow-300 text-sm">
							<LuTriangleAlert className="w-4 h-4 flex-shrink-0" />
							<span>
								Perubahan belum dikirim ke server
								{lastSavedAt && (
									<span className="text-xs ml-1 opacity-75">
										(lokal: {lastSavedAt.toLocaleTimeString("id-ID")})
									</span>
								)}
							</span>
						</div>
					</div>
				)}
			</div>

			{/* All Categories - Table-like Layout */}
			<div className="w-full px-2 sm:px-4 py-4 pb-32 space-y-6">
				{sortedCategories.map((cat, catIndex) => {
					const catScores = scores.filter((s) =>
						cat.materials.some((m) => m.id === s.materialId)
					);
					const catCompleted = catScores.filter(
						(s) => s.score !== null || s.isSkipped
					).length;

					return (
						<div key={cat.categoryId}>
							{/* Category Separator / Header */}
							<div className={`flex items-center gap-3 px-4 py-3 mb-2 bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-white/[0.06] shadow-sm ${catIndex > 0 ? "mt-8" : ""}`}>
								<div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
									<LuUsers className="w-4 h-4 text-red-600 dark:text-red-400" />
								</div>
								<div className="flex-1 min-w-0">
									<h2 className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wide truncate">
										{cat.categoryName}
									</h2>
								</div>
								<span className={`px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
									catCompleted === cat.materials.length
										? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
										: "bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-400"
								}`}>
									{catCompleted}/{cat.materials.length}
								</span>
							</div>

							{/* Score Category Column Headers */}
							{cat.materials.length > 0 && cat.materials[0]!.scoreCategories.length > 0 && (
								<div className="flex items-stretch gap-0 mb-1 px-1">
									{/* Material name column header */}
									<div className="w-[140px] sm:w-[180px] flex-shrink-0 px-2 py-2">
										<span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
											Kriteria
										</span>
									</div>
									{/* Score category column headers */}
									<div className="flex-1 flex gap-0">
										{[...cat.materials[0]!.scoreCategories]
											.sort((a, b) => a.order - b.order)
											.map((sc) => (
												<div
													key={sc.name}
													className="flex-1 text-center px-1 py-2"
												>
													<span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${getCategoryLabelColor(sc.color)}`}>
														{sc.name}
													</span>
												</div>
											))}
										{/* Kosong column header */}
										<div className="w-[44px] sm:w-[52px] flex-shrink-0 text-center px-1 py-2">
											<span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
												Kosong
											</span>
										</div>
									</div>
								</div>
							)}

							{/* Material Rows */}
							<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-white/[0.06] shadow-sm overflow-hidden divide-y divide-gray-200/50 dark:divide-white/[0.06]">
								{cat.materials
									.sort((a, b) => a.number - b.number)
									.map((material) => {
										const currentScore = getScoreForMaterial(material.id);
										const isScored = currentScore?.score !== null && currentScore?.score !== undefined && !currentScore?.isSkipped;
										const isSkipped = currentScore?.isSkipped ?? false;
										const scoreCategories = [...material.scoreCategories].sort(
											(a, b) => a.order - b.order
										);

										return (
											<div
												key={material.id}
												className={`flex items-stretch gap-0 transition-colors ${
													isScored
														? "bg-green-50/30 dark:bg-green-900/5"
														: isSkipped
														? "bg-yellow-50/30 dark:bg-yellow-900/5"
														: "hover:bg-gray-50/50 dark:hover:bg-white/[0.01]"
												}`}
											>
												{/* Material Name */}
												<div className="w-[140px] sm:w-[180px] flex-shrink-0 flex items-center gap-2 px-3 py-2.5">
													<span className={`text-xs font-bold flex-shrink-0 ${
														isScored
															? "text-green-600 dark:text-green-400"
															: isSkipped
															? "text-yellow-600 dark:text-yellow-400"
															: "text-gray-400 dark:text-gray-500"
													}`}>
														{material.number}.
													</span>
													<span className={`text-xs sm:text-sm font-semibold uppercase leading-tight ${
														isScored
															? "text-green-700 dark:text-green-300"
															: isSkipped
															? "text-yellow-700 dark:text-yellow-300"
															: "text-gray-700 dark:text-gray-300"
													}`}>
														{material.name}
													</span>
												</div>

												{/* Score Buttons Row */}
												<div className="flex-1 flex gap-0">
													{scoreCategories.map((sc) => (
														<div
															key={sc.name}
															className="flex-1 flex items-center justify-center gap-0.5 sm:gap-1 px-0.5 py-2"
														>
															{sc.options
																.sort((a, b) => a.order - b.order)
																.map((opt) => {
																	const isSelected =
																		currentScore?.score === opt.score &&
																		currentScore?.scoreCategoryName === sc.name &&
																		!currentScore?.isSkipped;

																	return (
																		<button
																			key={`${sc.name}-${opt.score}`}
																			onClick={() =>
																				setMaterialScore(material.id, opt.score, sc.name)
																			}
																			className={`flex-1 h-10 sm:h-11 rounded-lg font-bold text-sm sm:text-base border transition-all min-w-0 ${getColorClasses(
																				sc.color,
																				isSelected
																			)} ${
																				isSelected
																					? "ring-2 ring-offset-1 dark:ring-offset-gray-900 ring-gray-400 scale-[1.02] z-10"
																					: "hover:scale-[1.02] active:scale-95"
																			}`}
																			title={opt.name || `${sc.name}: ${opt.score}`}
																		>
																			{opt.score}
																		</button>
																	);
																})}
														</div>
													))}

													{/* Kosong / Skip button */}
													<div className="w-[44px] sm:w-[52px] flex-shrink-0 flex items-center justify-center px-0.5 py-2">
														<button
															onClick={() => {
																if (currentScore?.isSkipped) {
																	clearMaterialScore(material.id);
																} else {
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
															className={`w-full h-10 sm:h-11 rounded-lg font-bold text-sm border transition-all ${
																isSkipped
																	? "bg-gray-500 text-white border-gray-500 shadow-md"
																	: "bg-gray-50 dark:bg-white/[0.04] text-gray-400 dark:text-gray-500 border-gray-200/60 dark:border-white/[0.08] hover:bg-gray-100 dark:hover:bg-white/[0.08]"
															}`}
															title="Tidak Dinilai"
														>
															0
														</button>
													</div>
												</div>
											</div>
										);
									})}
							</div>
						</div>
					);
				})}
			</div>

			{/* Floating Action Bar */}
			<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
				<div className="flex items-center gap-3 px-5 py-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 dark:border-white/[0.1]">
					{/* Progress */}
					<div className="flex items-center gap-2 pr-3 border-r border-gray-200/50 dark:border-white/[0.1]">
						<div className="w-20 h-2 bg-gray-200 dark:bg-white/[0.06] rounded-full overflow-hidden">
							<div
								className="h-full bg-green-500 transition-all duration-300 rounded-full"
								style={{ width: `${completionPercentage}%` }}
							/>
						</div>
						<span className="text-xs font-bold text-gray-600 dark:text-gray-400 whitespace-nowrap">
							{completed}/{total}
						</span>
					</div>

					{/* Save button */}
					<button
						onClick={handleSubmit}
						disabled={saving || !isFormComplete()}
						className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
							isFormComplete()
								? isOnline
									? "bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-500/20"
									: "bg-yellow-600 text-white hover:bg-yellow-700 shadow-lg shadow-yellow-500/20"
								: "bg-gray-200 dark:bg-white/[0.06] text-gray-400 dark:text-gray-500 cursor-not-allowed"
						}`}
					>
						{saving ? (
							<div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
						) : !isOnline ? (
							<LuWifiOff className="w-4 h-4" />
						) : hasLocalChanges ? (
							<LuCloudUpload className="w-4 h-4" />
						) : (
							<LuSave className="w-4 h-4" />
						)}
						{saving
							? "Menyimpan..."
							: !isOnline
							? "Simpan Offline"
							: hasLocalChanges
							? "Kirim ke Server"
							: "Simpan Nilai"}
					</button>
				</div>
			</div>
		</div>
	);
};

export default MaterialScoring;
