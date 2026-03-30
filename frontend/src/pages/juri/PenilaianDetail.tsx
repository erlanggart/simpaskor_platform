import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
	ArrowLeftIcon,
	UserGroupIcon,
	CheckCircleIcon,
	ExclamationTriangleIcon,
	StarIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import Swal from "sweetalert2";
import { api } from "../../utils/api";
import { Logo } from "../../components/Logo";
import { ThemeToggle } from "../../components/ThemeToggle";

interface AssessmentCategory {
	id: string;
	name: string;
	description: string | null;
	maxScore: number;
}

interface Participant {
	id: string;
	participationId: string;
	teamName: string;
	status: string;
	schoolCategory: {
		id: string;
		name: string;
	} | null;
	members: string[];
	teamMembers: number;
	registrant: {
		id: string;
		name: string;
		email: string;
		institution: string | null;
	};
}

interface EventInfo {
	id: string;
	title: string;
	slug: string;
	startDate: string;
	endDate: string;
}

interface JuryAssignment {
	id: string;
	event: EventInfo;
	assignedCategories: {
		id: string;
		assessmentCategory: AssessmentCategory;
	}[];
}

interface Evaluation {
	id: string;
	assessmentCategoryId: string;
	score: number;
	maxScore: number;
	notes: string | null;
}

interface ScoreInput {
	categoryId: string;
	score: number;
	notes: string;
}

const PenilaianDetail: React.FC = () => {
	const { eventSlug, participantId } = useParams<{
		eventSlug: string;
		participantId: string;
	}>();
	const navigate = useNavigate();

	const [assignment, setAssignment] = useState<JuryAssignment | null>(null);
	const [participant, setParticipant] = useState<Participant | null>(null);
	const [existingEvaluations, setExistingEvaluations] = useState<Evaluation[]>([]);
	const [scores, setScores] = useState<ScoreInput[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [isOnline, setIsOnline] = useState(navigator.onLine);

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

	useEffect(() => {
		if (eventSlug && participantId) {
			fetchData();
		}
	}, [eventSlug, participantId]);

	const fetchData = async () => {
		try {
			setLoading(true);

			// Fetch assignment
			const assignmentRes = await api.get(`/juries/events/${eventSlug}`);
			setAssignment(assignmentRes.data);

			// Fetch all participants and find our target
			const participantsRes = await api.get(`/juries/events/${eventSlug}/peserta`);
			const targetParticipant = participantsRes.data.find(
				(p: Participant) => p.id === participantId
			);
			setParticipant(targetParticipant || null);

			// Fetch existing evaluations for this participant
			if (assignmentRes.data?.event?.id) {
				const evalRes = await api
					.get(`/evaluations/participant/${participantId}`)
					.catch(() => ({ data: [] }));
				setExistingEvaluations(evalRes.data || []);

				// Initialize scores from existing evaluations or empty
				const initialScores = assignmentRes.data.assignedCategories.map(
					(cat: { id: string; assessmentCategory: AssessmentCategory }) => {
						const existing = (evalRes.data || []).find(
							(e: Evaluation) => e.assessmentCategoryId === cat.assessmentCategory.id
						);
						return {
							categoryId: cat.assessmentCategory.id,
							score: existing?.score || 0,
							notes: existing?.notes || "",
						};
					}
				);
				setScores(initialScores);
			}
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

	const updateScore = (categoryId: string, field: "score" | "notes", value: number | string) => {
		setScores((prev) =>
			prev.map((s) =>
				s.categoryId === categoryId ? { ...s, [field]: value } : s
			)
		);
	};

	const getCategory = (categoryId: string) => {
		return assignment?.assignedCategories.find(
			(c) => c.assessmentCategory.id === categoryId
		)?.assessmentCategory;
	};

	const handleSubmit = async () => {
		if (!assignment || !participant) return;

		// Validate all scores are filled
		const emptyScores = scores.filter((s) => {
			const category = getCategory(s.categoryId);
			return s.score < 0 || (category && s.score > category.maxScore);
		});

		if (emptyScores.length > 0) {
			Swal.fire({
				icon: "warning",
				title: "Skor Tidak Valid",
				text: "Pastikan semua skor dalam rentang yang valid.",
			});
			return;
		}

		try {
			setSaving(true);

			await api.post("/evaluations/submit", {
				eventId: assignment.event.id,
				participantId: participant.id,
				scores: scores.map((s) => ({
					assessmentCategoryId: s.categoryId,
					score: s.score,
					notes: s.notes || null,
				})),
			});

			await Swal.fire({
				icon: "success",
				title: "Berhasil!",
				text: "Penilaian berhasil disimpan.",
				timer: 1500,
				showConfirmButton: false,
			});

			navigate(`/juri/events/${eventSlug}/penilaian`);
		} catch (error: unknown) {
			console.error("Error saving evaluation:", error);
			const errorMessage =
				(error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
				"Terjadi kesalahan saat menyimpan penilaian.";
			Swal.fire({
				icon: "error",
				title: "Gagal Menyimpan",
				text: errorMessage,
			});
		} finally {
			setSaving(false);
		}
	};

	// Calculate total score
	const totalScore = scores.reduce((sum, s) => sum + (s.score || 0), 0);
	const maxTotalScore = assignment?.assignedCategories.reduce(
		(sum, c) => sum + c.assessmentCategory.maxScore,
		0
	) || 0;

	// Check if there are existing evaluations
	const hasExisting = existingEvaluations.length > 0;

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
			</div>
		);
	}

	if (!assignment || !participant) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
				<div className="text-center">
					<ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-500" />
					<h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
						Data tidak ditemukan
					</h2>
					<p className="mt-2 text-gray-600 dark:text-gray-400">
						Peserta atau event tidak ditemukan.
					</p>
					<Link
						to={`/juri/events/${eventSlug}/penilaian`}
						className="mt-4 inline-flex items-center gap-2 text-red-600 hover:text-red-500"
					>
						<ArrowLeftIcon className="h-4 w-4" />
						Kembali ke Daftar Penilaian
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
			<header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
				<div className="px-4 py-3 flex items-center justify-between">
					<button
						onClick={() => navigate(`/juri/events/${eventSlug}/info`)}
						disabled={!isOnline}
						className={`flex items-center gap-2 transition-opacity ${isOnline ? "hover:opacity-80" : "opacity-50 cursor-not-allowed"}`}
					>
						<Logo size="md" showText variant="auto" />
					</button>
					<ThemeToggle />
				</div>
			</header>
			<main className="flex-1">
		<div className="min-h-screen">
			<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Back Button */}
				<Link
					to={`/juri/events/${eventSlug}/penilaian`}
					className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
				>
					<ArrowLeftIcon className="h-5 w-5" />
					Kembali ke Daftar Penilaian
				</Link>

				{/* Header */}
				<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow p-6 mb-6">
					<div className="flex items-start justify-between">
						<div>
							<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
								{participant.teamName}
							</h1>
							{participant.schoolCategory && (
								<span className="inline-flex mt-2 px-3 py-1 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-sm rounded-full">
									{participant.schoolCategory.name}
								</span>
							)}
							{participant.registrant?.institution && (
								<p className="mt-2 text-gray-600 dark:text-gray-400">
									{participant.registrant.institution}
								</p>
							)}
						</div>
						{hasExisting && (
							<span className="flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-sm rounded-full">
								<CheckCircleIcon className="h-4 w-4" />
								Sudah Dinilai
							</span>
						)}
					</div>

					{/* Team Members */}
					<div className="mt-4 pt-4 border-t border-gray-200/60 dark:border-gray-700/40">
						<div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
							<UserGroupIcon className="h-5 w-5" />
							<span className="font-medium">Anggota Tim</span>
						</div>
						<div className="flex flex-wrap gap-2">
							{participant.members.length > 0 ? (
								participant.members.map((member, idx) => (
									<span
										key={idx}
										className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm"
									>
										{member}
									</span>
								))
							) : (
								<span className="text-gray-500 dark:text-gray-400 text-sm">
									{participant.teamMembers} anggota
								</span>
							)}
						</div>
					</div>
				</div>

				{/* Scoring Form */}
				<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow overflow-hidden">
					<div className="px-6 py-4 border-b border-gray-200/60 dark:border-gray-700/40">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
							Formulir Penilaian
						</h2>
						<p className="text-sm text-gray-500 dark:text-gray-400">
							Berikan skor untuk setiap kategori penilaian
						</p>
					</div>

					<div className="p-6 space-y-6">
						{assignment.assignedCategories.map((cat) => {
							const scoreInput = scores.find((s) => s.categoryId === cat.assessmentCategory.id);
							const score = scoreInput?.score || 0;
							const notes = scoreInput?.notes || "";

							return (
								<div
									key={cat.id}
									className="p-4 border border-gray-200/60 dark:border-gray-700/40 rounded-lg"
								>
									<div className="flex items-start justify-between mb-4">
										<div>
											<h3 className="text-lg font-medium text-gray-900 dark:text-white">
												{cat.assessmentCategory.name}
											</h3>
											{cat.assessmentCategory.description && (
												<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
													{cat.assessmentCategory.description}
												</p>
											)}
										</div>
										<div className="text-right">
											<span className="text-sm text-gray-500 dark:text-gray-400">
												Maks: {cat.assessmentCategory.maxScore}
											</span>
										</div>
									</div>

									{/* Score Input */}
									<div className="mb-4">
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
											Skor
										</label>
										<div className="flex items-center gap-4">
											<input
												type="number"
												min="0"
												max={cat.assessmentCategory.maxScore}
												value={score}
												onChange={(e) =>
													updateScore(
														cat.assessmentCategory.id,
														"score",
														Math.min(
															Math.max(0, parseInt(e.target.value) || 0),
															cat.assessmentCategory.maxScore
														)
													)
												}
												className="w-24 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white text-lg font-semibold text-center focus:ring-2 focus:ring-red-500 focus:border-transparent"
											/>
											<div className="flex-1">
												<input
													type="range"
													min="0"
													max={cat.assessmentCategory.maxScore}
													value={score}
													onChange={(e) =>
														updateScore(
															cat.assessmentCategory.id,
															"score",
															parseInt(e.target.value)
														)
													}
													className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
												/>
											</div>
											<div className="flex items-center gap-1 text-yellow-500">
												{[...Array(5)].map((_, i) => {
													const filled =
														score >
														(cat.assessmentCategory.maxScore / 5) * i;
													return filled ? (
														<StarIconSolid key={i} className="h-5 w-5" />
													) : (
														<StarIcon key={i} className="h-5 w-5" />
													);
												})}
											</div>
										</div>
									</div>

									{/* Notes Input */}
									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
											Catatan (Opsional)
										</label>
										<textarea
											value={notes}
											onChange={(e) =>
												updateScore(cat.assessmentCategory.id, "notes", e.target.value)
											}
											rows={2}
											placeholder="Tambahkan catatan penilaian..."
											className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
										/>
									</div>
								</div>
							);
						})}
					</div>

					{/* Summary & Submit */}
					<div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200/60 dark:border-gray-700/40">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-500 dark:text-gray-400">
									Total Skor
								</p>
								<p className="text-2xl font-bold text-red-600 dark:text-red-400">
									{totalScore} / {maxTotalScore}
								</p>
							</div>
							<div className="flex gap-3">
								<Link
									to={`/juri/events/${eventSlug}/penilaian`}
									className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
								>
									Batal
								</Link>
								<button
									onClick={handleSubmit}
									disabled={saving}
									className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
								>
									{saving ? (
										<>
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
											Menyimpan...
										</>
									) : (
										<>
											<CheckCircleIcon className="h-5 w-5" />
											{hasExisting ? "Perbarui Penilaian" : "Simpan Penilaian"}
										</>
									)}
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
			</main>
		</div>
	);
};

export default PenilaianDetail;
