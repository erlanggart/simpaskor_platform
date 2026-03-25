import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
	TrophyIcon,
	MagnifyingGlassIcon,
	CalendarIcon,
	CheckCircleIcon,
	ChevronRightIcon,
	LockClosedIcon,
	CloudArrowUpIcon,
	SignalSlashIcon,
	ExclamationCircleIcon,
	XMarkIcon,
} from "@heroicons/react/24/outline";
import Swal from "sweetalert2";
import { api } from "../../utils/api";
import {
	getOfflineDataByEvent,
	removeOfflineData,
	type OfflineParticipantData,
} from "../../utils/offlineStorage";

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
	
	// Offline data
	const [offlineData, setOfflineData] = useState<OfflineParticipantData[]>([]);
	const [isOnline, setIsOnline] = useState(navigator.onLine);
	const [showOfflineBubble, setShowOfflineBubble] = useState(false);
	const [syncing, setSyncing] = useState(false);

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

	// Load offline data
	const loadOfflineData = useCallback(() => {
		if (eventSlug) {
			const data = getOfflineDataByEvent(eventSlug);
			setOfflineData(data);
		}
	}, [eventSlug]);

	useEffect(() => {
		loadOfflineData();
	}, [loadOfflineData]);

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

	// Check if participant has offline data
	const hasOfflineData = (participantId: string) => {
		return offlineData.some(d => d.participantId === participantId);
	};

	// Sync all offline data to server
	const syncOfflineData = async () => {
		if (!isOnline || offlineData.length === 0) return;

		setSyncing(true);
		let successCount = 0;
		let failCount = 0;

		for (const data of offlineData) {
			try {
				const evaluationsToSubmit = data.scores
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

				await api.post("/evaluations/materials/submit", {
					eventId: data.eventId,
					participantId: data.participantId,
					evaluations: evaluationsToSubmit,
				});

				// Remove from offline storage on success
				removeOfflineData(data.eventSlug, data.participantId);
				successCount++;
			} catch (error) {
				console.error(`Failed to sync data for ${data.participantId}:`, error);
				failCount++;
			}
		}

		// Reload offline data
		loadOfflineData();
		
		// Refresh status data
		await fetchData();

		setSyncing(false);

		if (successCount > 0) {
			Swal.fire({
				icon: failCount > 0 ? "warning" : "success",
				title: "Sinkronisasi Selesai",
				html: `<p>${successCount} penilaian berhasil dikirim ke server.</p>${
					failCount > 0 ? `<p class="text-red-500">${failCount} gagal dikirim.</p>` : ''
				}`,
				timer: 2000,
				showConfirmButton: false,
			});
		}
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
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
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
						className="mt-4 inline-block text-red-600 hover:text-red-500"
					>
						Kembali ke Event Saya
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen">
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
				<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow mb-6">
					<div className="relative">
						<MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
						<input
							type="text"
							placeholder="Cari tim, peserta, atau sekolah..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-10 pr-4 py-3 border-0 rounded-lg bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 text-lg"
						/>
					</div>
				</div>

				{/* Tabs */}
				<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow mb-6 overflow-x-auto">
					<div className="flex border-b border-gray-200/60 dark:border-gray-700/40 min-w-max">
						<button
							onClick={() => setSelectedTab("all")}
							className={`px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
								selectedTab === "all"
									? "border-b-2 border-red-600 text-red-600 dark:text-red-400"
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
											? "border-b-2 border-red-600 text-red-600 dark:text-red-400"
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
										? "border-b-2 border-red-600 text-red-600 dark:text-red-400"
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
					<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow p-12 text-center">
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
					<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow overflow-hidden">
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
														<span className="flex items-center justify-center w-8 h-8 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-sm font-bold rounded-full">
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
														<span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-xs rounded-full">
															{participant.schoolCategory.name}
														</span>
													)}
													{isComplete && (
														<span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs rounded-full">
															<CheckCircleIcon className="h-3.5 w-3.5" />
															Sudah Dinilai
														</span>
													)}
													{hasOfflineData(participant.id) && (
														<span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 text-xs rounded-full">
															<ExclamationCircleIcon className="h-3.5 w-3.5" />
															Tersimpan Lokal
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
												) : hasOfflineData(participant.id) ? (
													<button
														disabled
														className="flex items-center gap-2 px-4 py-2.5 bg-yellow-200 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400 rounded-lg cursor-not-allowed"
														title="Data tersimpan di lokal, kirim terlebih dahulu"
													>
														<CloudArrowUpIcon className="h-4 w-4" />
														<span className="hidden sm:inline">Lokal</span>
													</button>
												) : (
													<Link
														to={`/juri/events/${eventSlug}/penilaian/${participant.id}`}
														className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
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

			{/* Offline Data Bubble */}
			{offlineData.length > 0 && (
				<div className="fixed bottom-6 right-6 z-50">
					{/* Collapsed State - Just a badge */}
					{!showOfflineBubble ? (
						<button
							onClick={() => setShowOfflineBubble(true)}
							className="flex items-center gap-2 px-4 py-3 bg-yellow-500 text-white rounded-full shadow-lg hover:bg-yellow-600 transition-all animate-pulse"
						>
							<CloudArrowUpIcon className="h-5 w-5" />
							<span className="font-medium">{offlineData.length} Data Lokal</span>
						</button>
					) : (
						/* Expanded State - Show details */
						<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-xl border border-gray-200/60 dark:border-gray-700/40 w-80 max-h-96 overflow-hidden">
							{/* Header */}
							<div className="flex items-center justify-between p-4 border-b border-gray-200/60 dark:border-gray-700/40 bg-yellow-50 dark:bg-yellow-900/20">
								<div className="flex items-center gap-2">
									<CloudArrowUpIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
									<h3 className="font-semibold text-gray-900 dark:text-white">
										Data Tersimpan Lokal
									</h3>
								</div>
								<button
									onClick={() => setShowOfflineBubble(false)}
									className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
								>
									<XMarkIcon className="h-5 w-5" />
								</button>
							</div>

							{/* Status Bar */}
							<div className={`px-4 py-2 text-sm flex items-center gap-2 ${isOnline ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}>
								{isOnline ? (
									<>
										<span className="w-2 h-2 bg-green-500 rounded-full"></span>
										Online - Siap dikirim
									</>
								) : (
									<>
										<SignalSlashIcon className="h-4 w-4" />
										Offline - Menunggu koneksi
									</>
								)}
							</div>

							{/* List */}
							<div className="max-h-48 overflow-y-auto">
								{offlineData.map((data) => (
									<div
										key={data.participantId}
										className="px-4 py-3 border-b border-gray-200/60 dark:border-gray-700/40 last:border-0"
									>
										<p className="font-medium text-gray-900 dark:text-white text-sm">
											{data.participantName}
										</p>
										<p className="text-xs text-gray-500 dark:text-gray-400">
											{data.schoolCategoryName} • {new Date(data.savedAt).toLocaleString('id-ID')}
										</p>
									</div>
								))}
							</div>

							{/* Action Button */}
							<div className="p-4 border-t border-gray-200/60 dark:border-gray-700/40">
								<button
									onClick={syncOfflineData}
									disabled={!isOnline || syncing}
									className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
										isOnline
											? 'bg-green-600 text-white hover:bg-green-700'
											: 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
									}`}
								>
									{syncing ? (
										<>
											<div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
											Mengirim...
										</>
									) : isOnline ? (
										<>
											<CloudArrowUpIcon className="h-5 w-5" />
											Kirim Semua ke Server
										</>
									) : (
										<>
											<SignalSlashIcon className="h-5 w-5" />
											Menunggu Koneksi
										</>
									)}
								</button>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default JuriEventPenilaian;
