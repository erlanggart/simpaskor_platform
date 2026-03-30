import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link, Outlet, useOutlet, useNavigate } from "react-router-dom";
import {
	LuTrophy,
	LuSearch,
	LuCalendar,
	LuCircleCheck,
	LuChevronRight,
	LuLock,
	LuCloudUpload,
	LuWifiOff,
	LuWifi,
	LuTriangleAlert,
	LuCircleX,
	LuArrowLeft,
} from "react-icons/lu";
import Swal from "sweetalert2";
import { api } from "../../utils/api";
import {
	getOfflineDataByEvent,
	removeOfflineData,
	cacheApiResponse,
	getCachedApiResponse,
	type OfflineParticipantData,
} from "../../utils/offlineStorage";
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

// Interfaces shared with MaterialScoring via outlet context
export interface ScoreOption {
	name: string;
	score: number;
	order: number;
}

export interface ScoreCategory {
	name: string;
	color: string;
	order: number;
	options: ScoreOption[];
}

export interface AllMaterial {
	id: string;
	number: number;
	name: string;
	description: string | null;
	scoreCategories: ScoreCategory[];
	schoolCategoryIds: string[];
}

export interface AllCategoryWithMaterials {
	categoryId: string;
	categoryName: string;
	categoryOrder?: number;
	materials: AllMaterial[];
}

export interface PenilaianOutletContext {
	eventId: string;
	eventTitle: string;
	allCategories: AllCategoryWithMaterials[];
	participants: Participant[];
	isOnline: boolean;
	refreshStatus: () => Promise<void>;
}

const JuriEventPenilaian: React.FC = () => {
	const { eventSlug } = useParams<{ eventSlug: string }>();
	const outlet = useOutlet();
	const navigate = useNavigate();
	const [assignment, setAssignment] = useState<JuryAssignment | null>(null);
	const [participants, setParticipants] = useState<Participant[]>([]);
	const [materialScoringStatus, setMaterialScoringStatus] = useState<MaterialScoringStatus | null>(null);
	const [allCategories, setAllCategories] = useState<AllCategoryWithMaterials[]>([]);
	const [eventId, setEventId] = useState("");
	const [eventTitle, setEventTitle] = useState("");
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedTab, setSelectedTab] = useState<string>("all");
	
	// Offline data
	const [offlineData, setOfflineData] = useState<OfflineParticipantData[]>([]);
	const [isOnline, setIsOnline] = useState(navigator.onLine);
	const [syncing, setSyncing] = useState(false);
	const [syncingId, setSyncingId] = useState<string | null>(null);

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

	const refreshStatus = useCallback(async () => {
		if (!eventSlug || !navigator.onLine) return;
		try {
			const statusRes = await api.get(`/evaluations/materials/event/${eventSlug}/status`).catch(() => ({ data: null }));
			setMaterialScoringStatus(statusRes.data);
			if (statusRes.data) {
				cacheApiResponse(`materialStatus_${eventSlug}`, statusRes.data);
			}
		} catch {
			// silently fail
		}
	}, [eventSlug]);

	const fetchData = async () => {
		try {
			setLoading(true);

			if (navigator.onLine) {
				// Online: fetch from server and cache
				const assignmentRes = await api.get(`/juries/events/${eventSlug}`);
				setAssignment(assignmentRes.data);
				cacheApiResponse(`assignment_${eventSlug}`, assignmentRes.data);
				
				const participantsRes = await api.get(`/juries/events/${eventSlug}/peserta`).catch(() => ({ data: [] }));
				const confirmedParticipants = (participantsRes.data || []).filter(
					(p: Participant) => p.status === "CONFIRMED" || p.status === "ATTENDED"
				);
				setParticipants(confirmedParticipants);
				cacheApiResponse(`participants_${eventSlug}`, confirmedParticipants);

				const statusRes = await api.get(`/evaluations/materials/event/${eventSlug}/status`).catch(() => ({ data: null }));
				setMaterialScoringStatus(statusRes.data);
				if (statusRes.data) {
					cacheApiResponse(`materialStatus_${eventSlug}`, statusRes.data);
				}

				// Fetch all materials once (no school category filtering)
				try {
					const materialsRes = await api.get(`/evaluations/materials/event/${eventSlug}/all-materials`);
					setAllCategories(materialsRes.data.categories);
					setEventId(materialsRes.data.eventId);
					setEventTitle(materialsRes.data.eventTitle);
					cacheApiResponse(`allMaterials_${eventSlug}`, materialsRes.data);
				} catch {
					const cached = getCachedApiResponse<{ eventId: string; eventTitle: string; categories: AllCategoryWithMaterials[] }>(`allMaterials_${eventSlug}`);
					if (cached) {
						setAllCategories(cached.data.categories);
						setEventId(cached.data.eventId);
						setEventTitle(cached.data.eventTitle);
					}
				}
			} else {
				// Offline: load from cache
				const cachedAssignment = getCachedApiResponse<JuryAssignment>(`assignment_${eventSlug}`);
				const cachedParticipants = getCachedApiResponse<Participant[]>(`participants_${eventSlug}`);
				const cachedStatus = getCachedApiResponse<MaterialScoringStatus>(`materialStatus_${eventSlug}`);
				const cachedMaterials = getCachedApiResponse<{ eventId: string; eventTitle: string; categories: AllCategoryWithMaterials[] }>(`allMaterials_${eventSlug}`);

				if (cachedAssignment) {
					setAssignment(cachedAssignment.data);
				}
				if (cachedParticipants) {
					setParticipants(cachedParticipants.data);
				}
				if (cachedStatus) {
					setMaterialScoringStatus(cachedStatus.data);
				}
				if (cachedMaterials) {
					setAllCategories(cachedMaterials.data.categories);
					setEventId(cachedMaterials.data.eventId);
					setEventTitle(cachedMaterials.data.eventTitle);
				}

				if (!cachedAssignment && !cachedParticipants) {
					Swal.fire({
						icon: "warning",
						title: "Mode Offline",
						text: "Tidak ada data tersimpan. Hubungkan ke internet untuk memuat data terlebih dahulu.",
					});
				}
			}
		} catch (error) {
			console.error("Error fetching data:", error);
			// On fetch error, try cache as fallback
			const cachedAssignment = getCachedApiResponse<JuryAssignment>(`assignment_${eventSlug}`);
			const cachedParticipants = getCachedApiResponse<Participant[]>(`participants_${eventSlug}`);
			const cachedStatus = getCachedApiResponse<MaterialScoringStatus>(`materialStatus_${eventSlug}`);
			const cachedMaterials = getCachedApiResponse<{ eventId: string; eventTitle: string; categories: AllCategoryWithMaterials[] }>(`allMaterials_${eventSlug}`);

			if (cachedAssignment) setAssignment(cachedAssignment.data);
			if (cachedParticipants) setParticipants(cachedParticipants.data);
			if (cachedStatus) setMaterialScoringStatus(cachedStatus.data);
			if (cachedMaterials) {
				setAllCategories(cachedMaterials.data.categories);
				setEventId(cachedMaterials.data.eventId);
				setEventTitle(cachedMaterials.data.eventTitle);
			}
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

	const hasOfflineDataForParticipant = (participantId: string) => {
		return offlineData.some(d => d.participantId === participantId);
	};

	// Sync single participant's offline data
	const syncSingleParticipant = async (data: OfflineParticipantData) => {
		if (!isOnline) return;

		setSyncingId(data.participantId);
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

			removeOfflineData(data.eventSlug, data.participantId);
			loadOfflineData();
			await fetchData();

			Swal.fire({
				icon: "success",
				title: "Berhasil Dikirim",
				text: `Nilai ${data.participantName} berhasil dikirim ke server.`,
				timer: 1500,
				showConfirmButton: false,
			});
		} catch (error) {
			console.error(`Failed to sync data for ${data.participantId}:`, error);
			Swal.fire({
				icon: "error",
				title: "Gagal Mengirim",
				text: `Gagal mengirim nilai ${data.participantName}. Coba lagi nanti.`,
			});
		} finally {
			setSyncingId(null);
		}
	};

	// Sync all offline data to server
	const syncAllOfflineData = async () => {
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

				removeOfflineData(data.eventSlug, data.participantId);
				successCount++;
			} catch (error) {
				console.error(`Failed to sync data for ${data.participantId}:`, error);
				failCount++;
			}
		}

		loadOfflineData();
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
			
			if (selectedTab !== "all") {
				if (selectedTab === "uncategorized") {
					return matchesSearch && !p.schoolCategory;
				}
				return matchesSearch && p.schoolCategory?.id === selectedTab;
			}
			
			return matchesSearch;
		})
		.sort((a, b) => {
			if (a.orderNumber !== null && b.orderNumber !== null) {
				return a.orderNumber - b.orderNumber;
			}
			if (a.orderNumber !== null) return -1;
			if (b.orderNumber !== null) return 1;
			return 0;
		});

	const schoolCategories = Array.from(
		new Map(
			participants
				.filter(p => p.schoolCategory)
				.map(p => [p.schoolCategory!.id, p.schoolCategory!])
		).values()
	);

	const uncategorizedCount = participants.filter(p => !p.schoolCategory).length;
	const totalParticipants = participants.length;
	const completedCount = participants.filter(p => getParticipantMaterialStatus(p.id).isComplete).length;

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

	if (!assignment) {
		return (
			<div className="min-h-screen flex items-center justify-center px-4">
				<div className="text-center max-w-md">
					<LuCircleX className="w-12 h-12 text-red-500/60 mx-auto mb-4" />
					<h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
						Event Tidak Ditemukan
					</h2>
					<p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
						Event yang Anda cari tidak tersedia atau Anda tidak memiliki akses
					</p>
					<Link
						to="/juri/events"
						className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-red-500/20"
					>
						<LuArrowLeft className="w-4 h-4" />
						Kembali ke Event Saya
					</Link>
				</div>
			</div>
		);
	}

	// If a child route is active (MaterialScoring), render it with context
	if (outlet) {
		const outletContext: PenilaianOutletContext = {
			eventId,
			eventTitle,
			allCategories,
			participants,
			isOnline,
			refreshStatus,
		};
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
					<Outlet context={outletContext} />
				</main>
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
		<div className="min-h-screen transition-colors">
			<div className="w-full px-4 py-6">
				{/* Header with Progress */}
				<div className="flex items-center justify-between mb-4">
					<div className="min-w-0">
						<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
							Pilih Tim untuk Dinilai
						</h1>
						<div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
							<LuCalendar className="w-4 h-4" />
							<span className="truncate">{assignment.event.title}</span>
						</div>
					</div>
					<div className="flex items-center gap-3 flex-shrink-0">
						{/* Online/Offline Badge */}
						<div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
							isOnline
								? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
								: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
						}`}>
							{isOnline ? <LuWifi className="w-3.5 h-3.5" /> : <LuWifiOff className="w-3.5 h-3.5" />}
							<span className="hidden sm:inline">{isOnline ? "Online" : "Offline"}</span>
						</div>
						{/* Progress */}
						<div className="flex items-center gap-2">
							<div className="w-24 h-2 bg-gray-200 dark:bg-white/[0.06] rounded-full overflow-hidden">
								<div 
									className="h-full bg-green-500 transition-all duration-300 rounded-full"
									style={{ width: `${totalParticipants > 0 ? (completedCount / totalParticipants) * 100 : 0}%` }}
								/>
							</div>
							<span className="text-sm font-bold text-gray-600 dark:text-gray-400">
								{completedCount}/{totalParticipants}
							</span>
						</div>
					</div>
				</div>

				{/* ============ PENDING OFFLINE DATA SECTION ============ */}
				{offlineData.length > 0 && (
					<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl shadow-lg border border-yellow-200/60 dark:border-yellow-800/30 mb-6 overflow-hidden">
						{/* Section Header */}
						<div className="flex items-center justify-between px-5 py-3 bg-yellow-50/80 dark:bg-yellow-900/20 border-b border-yellow-200/50 dark:border-yellow-800/30">
							<div className="flex items-center gap-3">
								<div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
									<LuCloudUpload className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
								</div>
								<div>
									<h3 className="font-bold text-gray-900 dark:text-white text-sm">
										Nilai Tersimpan Lokal ({offlineData.length})
									</h3>
									<p className="text-xs text-gray-500 dark:text-gray-400">
										{isOnline ? "Siap dikirim ke server" : "Menunggu koneksi internet"}
									</p>
								</div>
							</div>
							{/* Sync All button */}
							<button
								onClick={syncAllOfflineData}
								disabled={!isOnline || syncing}
								className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
									isOnline
										? "bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-500/20"
										: "bg-gray-200 dark:bg-white/[0.06] text-gray-400 dark:text-gray-500 cursor-not-allowed"
								}`}
							>
								{syncing ? (
									<>
										<div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
										<span className="hidden sm:inline">Mengirim...</span>
									</>
								) : isOnline ? (
									<>
										<LuCloudUpload className="w-4 h-4" />
										<span className="hidden sm:inline">Kirim Semua</span>
									</>
								) : (
									<>
										<LuWifiOff className="w-4 h-4" />
										<span className="hidden sm:inline">Offline</span>
									</>
								)}
							</button>
						</div>

						{/* Connection Status Bar */}
						<div className={`px-5 py-2 text-xs font-medium flex items-center gap-2 ${
							isOnline
								? "bg-green-50/50 dark:bg-green-900/10 text-green-700 dark:text-green-300"
								: "bg-red-50/50 dark:bg-red-900/10 text-red-700 dark:text-red-300"
						}`}>
							{isOnline ? (
								<>
									<span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
									Online — Klik "Kirim Semua" atau kirim satu per satu
								</>
							) : (
								<>
									<LuWifiOff className="w-3 h-3" />
									Offline — Nilai akan dikirim saat koneksi tersedia
								</>
							)}
						</div>

						{/* Pending Items */}
						<div className="divide-y divide-gray-200/50 dark:divide-white/[0.06]">
							{offlineData.map((data) => (
								<div
									key={data.participantId}
									className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
								>
									<div className="min-w-0 flex-1">
										<p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
											{data.participantName || data.participantId}
										</p>
										<p className="text-xs text-gray-500 dark:text-gray-400">
											{data.schoolCategoryName && `${data.schoolCategoryName} • `}
											{data.scores.filter(s => s.score !== null || s.isSkipped).length} materi dinilai • 
											Disimpan {new Date(data.savedAt).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
										</p>
									</div>
									<button
										onClick={() => syncSingleParticipant(data)}
										disabled={!isOnline || syncingId === data.participantId}
										className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all flex-shrink-0 ml-3 ${
											isOnline
												? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50"
												: "bg-gray-100 dark:bg-white/[0.06] text-gray-400 cursor-not-allowed"
										}`}
									>
										{syncingId === data.participantId ? (
											<div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-green-500 border-t-transparent"></div>
										) : (
											<LuCloudUpload className="w-3.5 h-3.5" />
										)}
										Kirim
									</button>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Search Filter */}
				<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/50 dark:border-white/[0.06] mb-4">
					<div className="relative">
						<LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
						<input
							type="text"
							placeholder="Cari tim, peserta, atau sekolah..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-12 pr-4 py-3.5 border-0 rounded-2xl bg-transparent text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 text-base"
						/>
					</div>
				</div>

				{/* Category Tabs */}
				<div className="mb-4">
					<nav className="flex gap-2 overflow-x-auto p-1 bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl rounded-xl border border-gray-200/50 dark:border-white/[0.06]">
						<button
							onClick={() => setSelectedTab("all")}
							className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
								selectedTab === "all"
									? "bg-red-600 text-white shadow-lg shadow-red-500/20"
									: "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-white/[0.06]"
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
									className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
										selectedTab === cat.id
											? "bg-red-600 text-white shadow-lg shadow-red-500/20"
											: "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-white/[0.06]"
									}`}
								>
									{cat.name} ({count})
								</button>
							);
						})}
						{uncategorizedCount > 0 && (
							<button
								onClick={() => setSelectedTab("uncategorized")}
								className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
									selectedTab === "uncategorized"
										? "bg-red-600 text-white shadow-lg shadow-red-500/20"
										: "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-white/[0.06]"
								}`}
							>
								Lainnya ({uncategorizedCount})
							</button>
						)}
					</nav>
				</div>

				{/* Participants List */}
				{filteredParticipants.length === 0 ? (
					<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl shadow-lg p-12 text-center border border-gray-200/50 dark:border-white/[0.06]">
						<LuTrophy className="mx-auto w-12 h-12 text-gray-400 dark:text-gray-600" />
						<h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">
							{participants.length === 0
								? "Belum Ada Peserta"
								: "Tidak Ada Hasil"}
						</h3>
						<p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
							{participants.length === 0
								? "Belum ada peserta yang terkonfirmasi di event ini."
								: "Coba kata kunci pencarian yang berbeda."}
						</p>
					</div>
				) : (
					<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden border border-gray-200/50 dark:border-white/[0.06]">
						<div className="divide-y divide-gray-200/50 dark:divide-white/[0.06]">
							{filteredParticipants.map((participant) => {
								const materialStatus = getParticipantMaterialStatus(participant.id);
								const isComplete = materialStatus.isComplete;
								const hasOffline = hasOfflineDataForParticipant(participant.id);

								return (
									<div
										key={participant.id}
										className={`p-4 md:p-5 transition-colors ${
											isComplete 
												? "bg-gray-50/50 dark:bg-white/[0.01] opacity-75" 
												: "hover:bg-gray-50/50 dark:hover:bg-white/[0.02]"
										}`}
									>
										<div className="flex items-center justify-between gap-4">
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2 flex-wrap">
													{/* Order Number Badge */}
													{participant.orderNumber && (
														<span className="flex items-center justify-center w-8 h-8 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm font-bold rounded-full flex-shrink-0">
															{participant.orderNumber}
														</span>
													)}
													<h3 className={`font-semibold ${
														isComplete 
															? "text-gray-500 dark:text-gray-400" 
															: "text-gray-900 dark:text-white"
													}`}>
														{participant.registrant.institution || participant.registrant.name}
													</h3>
													<span className="text-gray-500 dark:text-gray-400 text-sm">
														— {participant.teamName}
													</span>
													{participant.schoolCategory && selectedTab === "all" && (
														<span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-semibold rounded-full">
															{participant.schoolCategory.name}
														</span>
													)}
													{isComplete && (
														<span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold rounded-full">
															<LuCircleCheck className="w-3.5 h-3.5" />
															Sudah Dinilai
														</span>
													)}
													{hasOffline && (
														<span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs font-semibold rounded-full">
															<LuTriangleAlert className="w-3.5 h-3.5" />
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
														<p className="text-sm font-bold text-gray-700 dark:text-gray-300">
															{materialStatus.scored}/{materialStatus.total}
														</p>
													</div>
												)}
												{isComplete ? (
													<button
														disabled
														className="flex items-center gap-2 px-4 py-2.5 bg-gray-200 dark:bg-white/[0.06] text-gray-400 dark:text-gray-500 rounded-xl cursor-not-allowed"
													>
														<LuLock className="w-4 h-4" />
														<span className="hidden sm:inline">Selesai</span>
													</button>
												) : hasOffline ? (
													<button
														disabled
														className="flex items-center gap-2 px-4 py-2.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-xl cursor-not-allowed"
														title="Data tersimpan di lokal, kirim terlebih dahulu"
													>
														<LuCloudUpload className="w-4 h-4" />
														<span className="hidden sm:inline">Lokal</span>
													</button>
												) : (
													<Link
														to={`/juri/events/${eventSlug}/penilaian/${participant.id}`}
														className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold shadow-lg shadow-red-500/20"
													>
														Nilai
														<LuChevronRight className="w-4 h-4" />
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
			</main>
		</div>
	);
};

export default JuriEventPenilaian;
