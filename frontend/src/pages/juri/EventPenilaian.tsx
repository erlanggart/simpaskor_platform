import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
	TrophyIcon,
	MagnifyingGlassIcon,
	CalendarIcon,
	CheckCircleIcon,
	ChevronRightIcon,
	LockClosedIcon,
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
	orderNumber: number | null;
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

interface MaterialScoringStatus {
	totalMaterials: number;
	participantStatus: Record<string, {
		scoredMaterials: number;
		totalMaterials: number;
		isComplete: boolean;
	}>;
}

const JuriEventPenilaian: React.FC = () => {
	const { eventSlug } = useParams<{ eventSlug: string }>();
	const [assignment, setAssignment] = useState<JuryAssignment | null>(null);
	const [participants, setParticipants] = useState<Participant[]>([]);
	const [materialScoringStatus, setMaterialScoringStatus] = useState<MaterialScoringStatus | null>(null);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedTab, setSelectedTab] = useState<string>("all");

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

			// Fetch material scoring status
			const statusRes = await api.get(`/evaluations/materials/event/${eventSlug}/status`).catch(() => ({ data: null }));
			setMaterialScoringStatus(statusRes.data);
		} catch (error) {
			console.error("Error fetching data:", error);
		} finally {
			setLoading(false);
		}
	};

	const getParticipantMaterialStatus = (participantId: string) => {
		if (!materialScoringStatus) return { scored: 0, total: 0, isComplete: false };
		
		const status = materialScoringStatus.participantStatus[participantId];
		if (!status) {
			return {
				scored: 0,
				total: materialScoringStatus.totalMaterials,
				isComplete: false,
			};
		}
		
		return {
			scored: status.scoredMaterials,
			total: status.totalMaterials,
			isComplete: status.isComplete,
		};
	};

	const filteredParticipants = participants
		.filter((p) => {
			const searchLower = searchTerm.toLowerCase();
			const matchesSearch = 
				p.teamName?.toLowerCase().includes(searchLower) ||
				p.registrant?.name?.toLowerCase().includes(searchLower) ||
				p.registrant?.institution?.toLowerCase().includes(searchLower) ||
				p.members?.some(m => m.toLowerCase().includes(searchLower)) ||
				p.schoolCategory?.name?.toLowerCase().includes(searchLower);
			
			// Filter by selected tab
			if (selectedTab !== "all") {
				if (selectedTab === "uncategorized") {
					return matchesSearch && !p.schoolCategory;
				}
				return matchesSearch && p.schoolCategory?.id === selectedTab;
			}
			
			return matchesSearch;
		})
		.sort((a, b) => {
			// Sort by orderNumber first (nulls at the end)
			if (a.orderNumber !== null && b.orderNumber !== null) {
				return a.orderNumber - b.orderNumber;
			}
			if (a.orderNumber !== null) return -1;
			if (b.orderNumber !== null) return 1;
			return 0;
		});

	// Get unique school categories from participants
	const schoolCategories = Array.from(
		new Map(
			participants
				.filter(p => p.schoolCategory)
				.map(p => [p.schoolCategory!.id, p.schoolCategory!])
		).values()
	);

	// Participants without category count
	const uncategorizedCount = participants.filter(p => !p.schoolCategory).length;

	// Progress counts
	const totalParticipants = participants.length;
	const completedCount = participants.filter(p => getParticipantMaterialStatus(p.id).isComplete).length;

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
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
				{/* Header with Progress */}
				<div className=" flex items-center justify-between mb-2">
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
						Pilih Tim untuk Dinilai
					</h1>
					<div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
						<div className="flex items-center">
							<CalendarIcon className="h-5 w-5 mr-2" />
							{assignment.event.title}
						</div>
						<div className="flex items-center gap-2">
							<div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
								<div 
									className="h-full bg-green-500 transition-all duration-300"
									style={{ width: `${totalParticipants > 0 ? (completedCount / totalParticipants) * 100 : 0}%` }}
								/>
							</div>
							<span className="text-sm font-medium">
								{completedCount}/{totalParticipants} selesai
							</span>
						</div>
					</div>
				</div>

				{/* Search Filter */}
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
					<div className="relative">
						<MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
						<input
							type="text"
							placeholder="Cari tim, peserta, atau sekolah..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-10 pr-4 py-3 border-0 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-lg"
						/>
					</div>
				</div>

				{/* Tabs */}
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 overflow-x-auto">
					<div className="flex border-b border-gray-200 dark:border-gray-700 min-w-max">
						<button
							onClick={() => setSelectedTab("all")}
							className={`px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
								selectedTab === "all"
									? "border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400"
									: "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
							}`}
						>
							Semua ({participants.length})
						</button>
						{schoolCategories.map((cat) => {
							const count = participants.filter(p => p.schoolCategory?.id === cat.id).length;
							return (
								<button
									key={cat.id}
									onClick={() => setSelectedTab(cat.id)}
									className={`px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
										selectedTab === cat.id
											? "border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400"
											: "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
									}`}
								>
									{cat.name} ({count})
								</button>
							);
						})}
						{uncategorizedCount > 0 && (
							<button
								onClick={() => setSelectedTab("uncategorized")}
								className={`px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
									selectedTab === "uncategorized"
										? "border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400"
										: "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
								}`}
							>
								Lainnya ({uncategorizedCount})
							</button>
						)}
					</div>
				</div>

				{/* Participants List */}
				{filteredParticipants.length === 0 ? (
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
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
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
						<div className="divide-y divide-gray-200 dark:divide-gray-700">
							{filteredParticipants.map((participant) => {
								const materialStatus = getParticipantMaterialStatus(participant.id);
								const isComplete = materialStatus.isComplete;

								return (
									<div
										key={participant.id}
										className={`p-4 md:p-6 transition-colors ${
											isComplete 
												? "bg-gray-50 dark:bg-gray-800/50 opacity-75" 
												: "hover:bg-gray-50 dark:hover:bg-gray-700/50"
										}`}
									>
										<div className="flex items-center justify-between gap-4">
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2 flex-wrap">
													{/* Order Number Badge */}
													{participant.orderNumber && (
														<span className="flex items-center justify-center w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm font-bold rounded-full">
															{participant.orderNumber}
														</span>
													)}
													<h3 className={` font-medium ${
														isComplete 
															? "text-gray-500 dark:text-gray-400" 
															: "text-gray-900 dark:text-white"
													}`}>
														{participant.registrant.institution}
													</h3>
													{participant.registrant?.institution && (
														<span className=" text-slate-700 dark:text-gray-400">
															— {participant.teamName}
														</span>
													)}
													{participant.schoolCategory && selectedTab === "all" && (
														<span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs rounded-full">
															{participant.schoolCategory.name}
														</span>
													)}
													{isComplete && (
														<span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs rounded-full">
															<CheckCircleIcon className="h-3.5 w-3.5" />
															Sudah Dinilai
														</span>
													)}
												</div>
												
											</div>
											<div className="flex items-center gap-3 flex-shrink-0">
												{!isComplete && materialStatus.total > 0 && (
													<div className="text-right hidden sm:block">
														<p className="text-xs text-gray-500 dark:text-gray-400">
															Progress
														</p>
														<p className="text-sm font-medium text-gray-700 dark:text-gray-300">
															{materialStatus.scored}/{materialStatus.total}
														</p>
													</div>
												)}
												{isComplete ? (
													<button
														disabled
														className="flex items-center gap-2 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed"
													>
														<LockClosedIcon className="h-4 w-4" />
														<span className="hidden sm:inline">Selesai</span>
													</button>
												) : (
													<Link
														to={`/juri/events/${eventSlug}/penilaian/${participant.id}`}
														className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
													>
														Nilai
														<ChevronRightIcon className="h-4 w-4" />
													</Link>
												)}
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default JuriEventPenilaian;
