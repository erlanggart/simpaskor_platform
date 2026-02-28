import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
	TrophyIcon,
	MagnifyingGlassIcon,
	CalendarIcon,
	CheckCircleIcon,
	ClockIcon,
	ChevronRightIcon,
	UserGroupIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../utils/api";

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
	participantId: string;
	score: number;
}

const JuriEventPenilaian: React.FC = () => {
	const { eventSlug } = useParams<{ eventSlug: string }>();
	const [assignment, setAssignment] = useState<JuryAssignment | null>(null);
	const [participants, setParticipants] = useState<Participant[]>([]);
	const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<string | "all">("all");

	useEffect(() => {
		if (eventSlug) {
			fetchData();
		}
	}, [eventSlug]);

	const fetchData = async () => {
		try {
			setLoading(true);
			const assignmentRes = await api.get(`/juries/events/${eventSlug}`);
			setAssignment(assignmentRes.data);
			
			// Fetch participants using slug
			const participantsRes = await api.get(`/juries/events/${eventSlug}/peserta`).catch(() => ({ data: [] }));
			const confirmedParticipants = (participantsRes.data || []).filter(
				(p: Participant) => p.status === "CONFIRMED" || p.status === "ATTENDED"
			);
			setParticipants(confirmedParticipants);

			// Fetch evaluations from this juri for this event
			if (assignmentRes.data?.event?.id) {
				const evalRes = await api.get(`/evaluations/event/${assignmentRes.data.event.id}/my-scores`).catch(() => ({ data: [] }));
				setEvaluations(evalRes.data || []);
			}
		} catch (error) {
			console.error("Error fetching data:", error);
		} finally {
			setLoading(false);
		}
	};

	const getParticipantScoringStatus = (participantId: string) => {
		if (!assignment) return { scored: 0, total: 0, percentage: 0 };
		
		const totalCategories = assignment.assignedCategories.length;
		const scoredCategories = evaluations.filter(
			(e) => e.participantId === participantId
		).length;
		
		return {
			scored: scoredCategories,
			total: totalCategories,
			percentage: totalCategories > 0 ? Math.round((scoredCategories / totalCategories) * 100) : 0,
		};
	};

	const filteredParticipants = participants.filter((p) => {
		const searchLower = searchTerm.toLowerCase();
		const matchesSearch = 
			p.teamName?.toLowerCase().includes(searchLower) ||
			p.registrant?.name?.toLowerCase().includes(searchLower) ||
			p.registrant?.institution?.toLowerCase().includes(searchLower) ||
			p.members?.some(m => m.toLowerCase().includes(searchLower)) ||
			p.schoolCategory?.name?.toLowerCase().includes(searchLower);
		
		// Filter by category if selected
		if (selectedCategory !== "all" && p.schoolCategory?.id !== selectedCategory) {
			return false;
		}
		
		return matchesSearch;
	});

	// Calculate overall progress
	const totalAssessments = participants.length * (assignment?.assignedCategories.length || 0);
	const completedAssessments = evaluations.length;
	const progressPercentage = totalAssessments > 0 
		? Math.round((completedAssessments / totalAssessments) * 100) 
		: 0;

	// Get category progress
	const getCategoryProgress = (categoryId: string) => {
		const scoredForCategory = evaluations.filter(e => e.assessmentCategoryId === categoryId).length;
		return scoredForCategory;
	};

	// Get unique school categories
	const schoolCategories = Array.from(
		new Map(
			participants
				.filter(p => p.schoolCategory)
				.map(p => [p.schoolCategory!.id, p.schoolCategory!])
		).values()
	);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
			</div>
		);
	}

	if (!assignment) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
				<div className="text-center">
					<h2 className="text-xl font-semibold text-gray-900 dark:text-white">
						Event tidak ditemukan
					</h2>
					<Link
						to="/juri/events"
						className="mt-4 inline-block text-indigo-600 hover:text-indigo-500"
					>
						Kembali ke Event Saya
					</Link>
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
						Penilaian
					</h1>
					<div className="mt-2 flex items-center text-gray-600 dark:text-gray-400">
						<CalendarIcon className="h-5 w-5 mr-2" />
						{assignment.event.title}
					</div>
				</div>

				{/* Progress Overview */}
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 p-6">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
							Progress Penilaian
						</h2>
						<span className="text-sm text-gray-500 dark:text-gray-400">
							{completedAssessments} / {totalAssessments} selesai
						</span>
					</div>
					<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
						<div
							className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
							style={{ width: `${progressPercentage}%` }}
						></div>
					</div>
					<div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
						{assignment.assignedCategories.map((cat) => (
							<div
								key={cat.id}
								className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
							>
								<p className="text-xs text-gray-500 dark:text-gray-400 truncate">
									{cat.assessmentCategory.name}
								</p>
								<p className="mt-1 text-lg font-semibold text-indigo-600 dark:text-indigo-400">
									{getCategoryProgress(cat.assessmentCategory.id)}/{participants.length}
								</p>
							</div>
						))}
					</div>
				</div>

				{/* Filters */}
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 p-4">
					<div className="flex flex-col md:flex-row gap-4">
						<div className="flex-1 relative">
							<MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
							<input
								type="text"
								placeholder="Cari tim, peserta, atau sekolah..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							/>
						</div>
						<select
							value={selectedCategory}
							onChange={(e) => setSelectedCategory(e.target.value)}
							className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
						>
							<option value="all">Semua Kategori Sekolah</option>
							{schoolCategories.map((cat) => (
								<option key={cat.id} value={cat.id}>
									{cat.name}
								</option>
							))}
						</select>
					</div>
				</div>

				{/* Participants List */}
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
					<div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
							Tim untuk Dinilai ({filteredParticipants.length})
						</h2>
					</div>

					{filteredParticipants.length === 0 ? (
						<div className="p-12 text-center">
							<TrophyIcon className="mx-auto h-12 w-12 text-gray-400" />
							<h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
								{participants.length === 0
									? "Belum Ada Peserta"
									: "Tidak Ada Hasil"}
							</h3>
							<p className="mt-2 text-gray-600 dark:text-gray-400">
								{participants.length === 0
									? "Belum ada peserta yang terkonfirmasi di event ini."
									: "Coba kata kunci pencarian yang berbeda."}
							</p>
						</div>
					) : (
						<div className="divide-y divide-gray-200 dark:divide-gray-700">
							{filteredParticipants.map((participant) => {
								const status = getParticipantScoringStatus(participant.id);
								const isComplete = status.scored === status.total && status.total > 0;

								return (
									<div
										key={participant.id}
										className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
									>
										<div className="flex items-center justify-between">
											<div className="flex-1">
												<div className="flex items-center gap-3">
													<h3 className="text-lg font-medium text-gray-900 dark:text-white">
														{participant.teamName}
													</h3>
													{participant.schoolCategory && (
														<span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs rounded-full">
															{participant.schoolCategory.name}
														</span>
													)}
													{isComplete ? (
														<span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs rounded-full">
															<CheckCircleIcon className="h-3 w-3" />
															Selesai
														</span>
													) : (
														<span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 text-xs rounded-full">
															<ClockIcon className="h-3 w-3" />
															Belum Selesai
														</span>
													)}
												</div>
												{participant.registrant?.institution && (
													<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
														{participant.registrant.institution}
													</p>
												)}
												<div className="mt-2 flex items-center gap-2">
													<UserGroupIcon className="h-4 w-4 text-gray-400" />
													<div className="flex flex-wrap gap-1">
														{participant.members.length > 0 ? (
															participant.members.map((member, idx) => (
																<span
																	key={idx}
																	className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded"
																>
																	{member}
																</span>
															))
														) : (
															<span className="text-xs text-gray-400">
																{participant.teamMembers} anggota
															</span>
														)}
													</div>
												</div>
											</div>
											<div className="flex items-center gap-4">
												<div className="text-right">
													<p className="text-sm text-gray-500 dark:text-gray-400">
														Progress
													</p>
													<p className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
														{status.scored}/{status.total}
													</p>
												</div>
												<Link
													to={`/juri/events/${eventSlug}/penilaian/${participant.id}`}
													className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
												>
													Nilai
													<ChevronRightIcon className="h-4 w-4" />
												</Link>
											</div>
										</div>
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

export default JuriEventPenilaian;
