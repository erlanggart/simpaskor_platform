import React, { useState, useEffect } from "react";
import {
	XMarkIcon,
	PencilIcon,
	CheckIcon,
	TrashIcon,
} from "@heroicons/react/24/outline";
import Swal from "sweetalert2";
import { api } from "../../utils/api";

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

interface MaterialEvaluation {
	id: string;
	juryId: string;
	juryName: string;
	score: number | null;
	scoreCategoryName: string | null;
	isSkipped: boolean;
	skipReason: string | null;
	notes: string | null;
}

interface MaterialDetail {
	id: string;
	number: number;
	name: string;
	description: string | null;
	scoreCategories: ScoreCategory[];
	evaluations: MaterialEvaluation[];
}

interface JuryTotal {
	id: string;
	name: string;
	totalScore: number;
	materialCount: number;
}

interface CategoryDetail {
	categoryId: string;
	eventCategoryId: string;
	categoryName: string;
	materials: MaterialDetail[];
	juries: JuryTotal[];
}

interface ParticipantDetail {
	participant: {
		id: string;
		teamName: string;
		orderNumber: number | null;
		schoolCategory: { id: string; name: string } | null;
		registrant: { id: string; name: string };
	};
	eventId: string;
	categories: CategoryDetail[];
}

interface Jury {
	id: string;
	name: string;
	assignedCategories: string[];
}

interface ParticipantDetailModalProps {
	participantId: string;
	eventSlug: string;
	juries: Jury[];
	onClose: () => void;
	onDataChange: () => void;
}

const ParticipantDetailModal: React.FC<ParticipantDetailModalProps> = ({
	participantId,
	eventSlug,
	juries,
	onClose,
	onDataChange,
}) => {
	const [loading, setLoading] = useState(true);
	const [participantDetail, setParticipantDetail] = useState<ParticipantDetail | null>(null);
	const [activeTab, setActiveTab] = useState<string>("");

	// Editing states
	const [editingEvaluation, setEditingEvaluation] = useState<{
		materialId: string;
		juryId: string;
		evaluationId: string | null;
	} | null>(null);
	const [editScore, setEditScore] = useState<number | null>(null);
	const [editScoreCategoryName, setEditScoreCategoryName] = useState<string>("");
	const [editSkipReason, setEditSkipReason] = useState<string>("");
	const [saving, setSaving] = useState(false);
	const [deletingJury, setDeletingJury] = useState<string | null>(null);

	useEffect(() => {
		fetchParticipantDetail();
	}, [participantId]);

	const fetchParticipantDetail = async () => {
		try {
			setLoading(true);
			const response = await api.get(`/evaluations/event/${eventSlug}/participant/${participantId}/detail`);
			setParticipantDetail(response.data);
			// Set first category as active tab
			if (response.data.categories.length > 0) {
				setActiveTab(response.data.categories[0].categoryId);
			}
		} catch (err: unknown) {
			console.error("Error fetching participant detail:", err);
			const error = err as { response?: { data?: { error?: string } } };
			Swal.fire({
				icon: "error",
				title: "Gagal",
				text: error.response?.data?.error || "Gagal memuat detail peserta",
			});
		} finally {
			setLoading(false);
		}
	};

	const startEditing = (material: MaterialDetail, evaluation: MaterialEvaluation | null, juryId: string) => {
		setEditingEvaluation({
			materialId: material.id,
			juryId,
			evaluationId: evaluation?.id || null,
		});
		setEditScore(evaluation?.score ?? null);
		setEditScoreCategoryName(evaluation?.scoreCategoryName || "");
		setEditSkipReason(evaluation?.skipReason || "");
	};

	const cancelEditing = () => {
		setEditingEvaluation(null);
		setEditScore(null);
		setEditScoreCategoryName("");
		setEditSkipReason("");
	};

	const handleScoreChange = (value: string, _material: MaterialDetail) => {
		if (value === "skip") {
			setEditScore(0);
			setEditScoreCategoryName("");
			return;
		}

		const parts = value.split("|");
		const score = parts[0] || "0";
		const categoryName = parts[1] || "";
		setEditScore(parseFloat(score));
		setEditScoreCategoryName(categoryName);
		setEditSkipReason(""); // Clear skip reason when selecting a score
	};

	const saveEvaluation = async (material: MaterialDetail, juryId: string) => {
		if (!participantDetail) return;

		const isSkipping = editScore === 0 && editSkipReason !== "";

		try {
			setSaving(true);

			if (editingEvaluation?.evaluationId) {
				// Update existing evaluation
				await api.put(`/evaluations/material-evaluation/${editingEvaluation.evaluationId}`, {
					score: isSkipping ? null : editScore,
					scoreCategoryName: isSkipping ? null : editScoreCategoryName,
					isSkipped: isSkipping,
					skipReason: isSkipping ? editSkipReason : null,
				});
			} else {
				// Create new evaluation
				await api.post("/evaluations/material-evaluation", {
					eventId: participantDetail.eventId,
					materialId: material.id,
					juryId,
					participantId: participantDetail.participant.id,
					score: isSkipping ? null : editScore,
					scoreCategoryName: isSkipping ? null : editScoreCategoryName,
					isSkipped: isSkipping,
					skipReason: isSkipping ? editSkipReason : null,
				});
			}

			// Refresh participant detail
			await fetchParticipantDetail();
			// Notify parent to refresh recap data
			onDataChange();
			cancelEditing();
		} catch (err: unknown) {
			console.error("Error saving evaluation:", err);
			const error = err as { response?: { data?: { error?: string } } };
			Swal.fire({
				icon: "error",
				title: "Gagal",
				text: error.response?.data?.error || "Gagal menyimpan nilai",
			});
		} finally {
			setSaving(false);
		}
	};

	const getScoreCategoryColor = (categoryName: string | null): string => {
		if (!categoryName) return "bg-gray-600";
		const lower = categoryName.toLowerCase();
		if (lower.includes("kurang") || lower.includes("buruk")) return "bg-red-600";
		if (lower.includes("cukup")) return "bg-yellow-600";
		if (lower.includes("baik") || lower.includes("bagus")) return "bg-green-600";
		if (lower.includes("sangat")) return "bg-emerald-600";
		return "bg-blue-600";
	};

	const deleteJuryEvaluations = async (categoryDetail: CategoryDetail, juryId: string, juryName: string) => {
		if (!participantDetail) return;

		const result = await Swal.fire({
			title: "Konfirmasi",
			text: `Hapus semua nilai dari ${juryName} untuk kategori ${categoryDetail.categoryName}?`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#d33",
			cancelButtonColor: "#6b7280",
			confirmButtonText: "Ya, Hapus",
			cancelButtonText: "Batal",
		});

		if (!result.isConfirmed) return;

		try {
			setDeletingJury(juryId);
			await api.delete("/evaluations/jury-category", {
				data: {
					eventId: participantDetail.eventId,
					juryId,
					eventCategoryId: categoryDetail.eventCategoryId,
					participantId: participantDetail.participant.id,
				},
			});

			// Refresh data
			await fetchParticipantDetail();
			onDataChange();
		} catch (err: unknown) {
			console.error("Error deleting jury evaluations:", err);
			const error = err as { response?: { data?: { error?: string } } };
			Swal.fire({
				icon: "error",
				title: "Gagal",
				text: error.response?.data?.error || "Gagal menghapus nilai",
			});
		} finally {
			setDeletingJury(null);
		}
	};

	// Find all juries for a category
	const getCategoryJuries = (categoryDetail: CategoryDetail): JuryTotal[] => {
		const jurySet = new Map<string, JuryTotal>();
		
		// First add juries from the totals
		categoryDetail.juries.forEach(j => {
			jurySet.set(j.id, j);
		});

		// Then check material evaluations for any additional juries
		categoryDetail.materials.forEach(material => {
			material.evaluations.forEach(ev => {
				if (!jurySet.has(ev.juryId)) {
					jurySet.set(ev.juryId, {
						id: ev.juryId,
						name: ev.juryName,
						totalScore: 0,
						materialCount: 0,
					});
				}
			});
		});

		// Also add juries from props that are assigned to this category
		juries.forEach(jury => {
			if (jury.assignedCategories.includes(categoryDetail.categoryId) && !jurySet.has(jury.id)) {
				jurySet.set(jury.id, {
					id: jury.id,
					name: jury.name,
					totalScore: 0,
					materialCount: 0,
				});
			}
		});

		return Array.from(jurySet.values());
	};

	const getActiveCategory = (): CategoryDetail | null => {
		if (!participantDetail) return null;
		return participantDetail.categories.find(c => c.categoryId === activeTab) || null;
	};

	// Build dropdown options from score categories
	const buildDropdownOptions = (material: MaterialDetail): { value: string; label: string; color: string }[] => {
		const options: { value: string; label: string; color: string }[] = [];
		
		(material.scoreCategories || []).forEach((cat: ScoreCategory) => {
			cat.options.forEach((opt: ScoreOption) => {
				options.push({
					value: `${opt.score}|${cat.name}`,
					label: `${opt.score} - ${cat.name}${opt.name ? ` (${opt.name})` : ""}`,
					color: cat.color || "gray",
				});
			});
		});

		// Sort by score descending
		options.sort((a, b) => {
			const scoreA = parseFloat(a.value.split("|")[0] || "0");
			const scoreB = parseFloat(b.value.split("|")[0] || "0");
			return scoreB - scoreA;
		});

		return options;
	};

	const activeCategory = getActiveCategory();

	return (
		<div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
			<div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col shadow-xl">
				{/* Modal Header */}
				<div className="bg-indigo-600 dark:bg-gray-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
					<div>
						<h2 className="text-xl font-bold text-white">
							Detail Nilai Peserta
						</h2>
						{participantDetail && (
							<p className="text-indigo-100 dark:text-gray-400">
								{participantDetail.participant.teamName}
								{participantDetail.participant.orderNumber && 
									` - Nomor Urut: ${participantDetail.participant.orderNumber}`
								}
							</p>
						)}
					</div>
					<button
						onClick={onClose}
						className="text-white/80 hover:text-white transition-colors"
					>
						<XMarkIcon className="w-6 h-6" />
					</button>
				</div>

				{/* Modal Content */}
				<div className="flex-1 overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-800">
					{loading ? (
						<div className="flex items-center justify-center py-12 flex-1">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
						</div>
					) : participantDetail ? (
						<>
							{/* Category Tabs */}
							<div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
								<nav className="flex overflow-x-auto px-4">
									{participantDetail.categories.map(categoryDetail => {
										const isActive = activeTab === categoryDetail.categoryId;
										const totalScore = categoryDetail.juries.reduce((sum, j) => sum + j.totalScore, 0);
										
										return (
											<button
												key={categoryDetail.categoryId}
												onClick={() => setActiveTab(categoryDetail.categoryId)}
												className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
													isActive
														? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
														: "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
												}`}
											>
												<span>{categoryDetail.categoryName}</span>
												<span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
													isActive
														? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
														: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
												}`}>
													{totalScore.toFixed(1)}
												</span>
											</button>
										);
									})}
								</nav>
							</div>

							{/* Tab Content */}
							<div className="flex-1 overflow-y-auto p-6">
								{activeCategory ? (
									<div>
										{/* Jury Summary */}
										<div className="mb-4 flex flex-wrap gap-4 text-sm">
											{getCategoryJuries(activeCategory).map(jury => {
												let total = 0;
											let hasEvaluations = false;
											activeCategory.materials.forEach(material => {
												const evaluation = material.evaluations.find(ev => ev.juryId === jury.id);
												if (evaluation) {
													hasEvaluations = true;
													if (!evaluation.isSkipped && evaluation.score !== null) {
														total += evaluation.score;
													}
												}
											});
											return (
												<div key={jury.id} className="bg-white dark:bg-gray-700 px-4 py-2 rounded-lg shadow flex items-center gap-2">
													<span className="text-gray-600 dark:text-gray-400">{jury.name}:</span>
													<span className="font-bold text-gray-900 dark:text-white">{total.toFixed(1)}</span>
													{hasEvaluations && (
														<button
															onClick={() => deleteJuryEvaluations(activeCategory, jury.id, jury.name)}
															disabled={deletingJury === jury.id}
															className="ml-1 p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
															title="Hapus semua nilai juri ini"
														>
															{deletingJury === jury.id ? (
																<div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
															) : (
																<TrashIcon className="w-4 h-4" />
															)}
														</button>
													)}
													</div>
												);
											})}
										</div>

										{activeCategory.materials.length === 0 ? (
											<p className="text-gray-500 dark:text-gray-400 text-center py-8">
												Tidak ada materi untuk kategori ini
											</p>
										) : (
											<div className="overflow-x-auto bg-white dark:bg-gray-700 rounded-lg shadow">
												<table className="w-full">
													<thead>
														<tr className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm">
															<th className="px-3 py-3 text-left w-12">No</th>
															<th className="px-3 py-3 text-left min-w-[200px]">Nama Materi</th>
															{getCategoryJuries(activeCategory).map(jury => (
																<th key={jury.id} className="px-3 py-3 text-center min-w-[180px]">
																	{jury.name}
																</th>
															))}
														</tr>
													</thead>
													<tbody>
														{activeCategory.materials.map(material => (
															<tr key={material.id} className="border-t border-gray-200 dark:border-gray-600">
																<td className="px-3 py-3 text-gray-700 dark:text-gray-300 text-sm">
																	{material.number}
																</td>
																<td className="px-3 py-3 text-gray-900 dark:text-white text-sm">
																	{material.name}
																	{material.description && (
																		<span className="text-gray-500 dark:text-gray-400 ml-2 text-xs">
																			({material.description})
																		</span>
																	)}
																</td>
																{getCategoryJuries(activeCategory).map(jury => {
																	const evaluation = material.evaluations.find(ev => ev.juryId === jury.id);
																	const isEditing = editingEvaluation?.materialId === material.id && 
																		editingEvaluation?.juryId === jury.id;

																	return (
																		<td key={jury.id} className="px-3 py-3">
																			{isEditing ? (
																				<div className="space-y-2">
																					{/* Score Dropdown */}
																					<select
																						value={editScore === 0 && editSkipReason ? "skip" : `${editScore}|${editScoreCategoryName}`}
																						onChange={(e) => handleScoreChange(e.target.value, material)}
																						className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
																					>
																						<option value="">-- Pilih Nilai --</option>
																						{buildDropdownOptions(material).map((opt, idx) => (
																							<option key={idx} value={opt.value}>
																								{opt.label}
																							</option>
																						))}
																						<option value="skip">Tidak Dinilai (0)</option>
																					</select>

																					{/* Skip Reason (shown when score is 0/skip) */}
																					{(editScore === 0 || (editScore === null && editingEvaluation)) && (
																						<select
																							value={editSkipReason}
																							onChange={(e) => setEditSkipReason(e.target.value)}
																							className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
																						>
																							<option value="">-- Alasan Tidak Menilai --</option>
																							<option value="TIDAK_SESUAI">Tidak Sesuai</option>
																							<option value="TIDAK_DIJALANKAN">Tidak Dijalankan</option>
																						</select>
																					)}

																					{/* Save/Cancel buttons */}
																					<div className="flex gap-1 justify-end">
																						<button
																							onClick={() => saveEvaluation(material, jury.id)}
																							disabled={saving || (editScore === null && !editSkipReason) || (editScore === 0 && !editSkipReason)}
																							className="p-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white rounded"
																							title="Simpan"
																						>
																							<CheckIcon className="w-4 h-4" />
																						</button>
																						<button
																							onClick={cancelEditing}
																							className="p-1.5 bg-gray-400 dark:bg-gray-600 hover:bg-gray-500 dark:hover:bg-gray-500 text-white rounded"
																							title="Batal"
																						>
																							<XMarkIcon className="w-4 h-4" />
																						</button>
																					</div>
																				</div>
																			) : (
																				<div className="flex items-center justify-between gap-2">
																					<div className="flex-1">
																						{evaluation ? (
																							<>
																								{evaluation.isSkipped ? (
																									<span className="text-gray-500 text-sm italic">
																										{evaluation.skipReason === "TIDAK_SESUAI" 
																											? "Tidak Sesuai" 
																											: "Tidak Dijalankan"}
																									</span>
																								) : (
																									<span className={`inline-block px-2 py-1 rounded text-sm text-white ${getScoreCategoryColor(evaluation.scoreCategoryName)}`}>
																										{evaluation.score ?? "-"}
																										{evaluation.scoreCategoryName && (
																											<span className="text-xs ml-1 opacity-75">
																												({evaluation.scoreCategoryName})
																											</span>
																										)}
																									</span>
																								)}
																							</>
																						) : (
																							<span className="text-gray-400">-</span>
																						)}
																					</div>
																					<button
																						onClick={() => startEditing(material, evaluation || null, jury.id)}
																						className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors flex-shrink-0"
																						title="Edit nilai"
																					>
																						<PencilIcon className="w-4 h-4" />
																					</button>
																				</div>
																			)}
																		</td>
																	);
																})}
															</tr>
														))}
														{/* Total Row */}
														<tr className="border-t-2 border-gray-300 dark:border-gray-500 bg-gray-100 dark:bg-gray-800">
															<td colSpan={2} className="px-3 py-3 text-gray-900 dark:text-white font-semibold text-sm text-right">
																Total
															</td>
															{getCategoryJuries(activeCategory).map(jury => {
																let total = 0;
																activeCategory.materials.forEach(material => {
																	const evaluation = material.evaluations.find(ev => ev.juryId === jury.id);
																	if (evaluation && !evaluation.isSkipped && evaluation.score !== null) {
																		total += evaluation.score;
																	}
																});
																return (
																	<td key={jury.id} className="px-3 py-3 text-center text-gray-900 dark:text-white font-bold text-sm">
																		{total.toFixed(1)}
																	</td>
																);
															})}
														</tr>
													</tbody>
												</table>
											</div>
										)}
									</div>
								) : (
									<div className="text-center py-12 text-gray-500 dark:text-gray-400">
										Pilih kategori untuk melihat detail
									</div>
								)}
							</div>
						</>
					) : (
						<div className="text-center py-12 text-gray-500 dark:text-gray-400 flex-1 flex items-center justify-center">
							Gagal memuat data
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default ParticipantDetailModal;
