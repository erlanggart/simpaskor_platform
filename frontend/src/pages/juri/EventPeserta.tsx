import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
	UsersIcon,
	MagnifyingGlassIcon,
	CalendarIcon,
	BuildingOffice2Icon,
	CheckCircleIcon,
	TrophyIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../utils/api";

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
	slug: string | null;
	startDate: string;
	endDate: string;
}

interface JuryAssignment {
	id: string;
	event: EventInfo;
	assignedCategories: {
		id: string;
		assessmentCategory: {
			id: string;
			name: string;
		};
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

interface ParticipantScore {
	totalScore: number;
	scoredCount: number;
	averageScore: number;
}

const JuriEventPeserta: React.FC = () => {
	const { eventSlug } = useParams<{ eventSlug: string }>();
	const [assignment, setAssignment] = useState<JuryAssignment | null>(null);
	const [participants, setParticipants] = useState<Participant[]>([]);
	const [materialScoringStatus, setMaterialScoringStatus] = useState<MaterialScoringStatus | null>(null);
	const [participantScores, setParticipantScores] = useState<Record<string, ParticipantScore>>({});
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");

	useEffect(() => {
		if (eventSlug) {
			fetchData();
		}
	}, [eventSlug]);

	const fetchData = async () => {
		try {
			setLoading(true);
			const [assignmentRes, participantsRes, statusRes] = await Promise.all([
				api.get(`/juries/events/${eventSlug}`),
				api.get(`/juries/events/${eventSlug}/peserta`),
				api.get(`/evaluations/materials/event/${eventSlug}/status`).catch(() => ({ data: null })),
			]);
			setAssignment(assignmentRes.data);
			setParticipants(participantsRes.data || []);
			setMaterialScoringStatus(statusRes.data);

			// Fetch scores for participants who have been scored
			if (statusRes.data?.participantStatus && assignmentRes.data?.event?.id) {
				const eventId = assignmentRes.data.event.id;
				const scoredParticipantIds = Object.keys(statusRes.data.participantStatus);
				
				const scorePromises = scoredParticipantIds.map(async (participantId) => {
					try {
						const res = await api.get(`/evaluations/materials/participant/${participantId}/summary?eventId=${eventId}`);
						return { participantId, score: res.data.summary };
					} catch {
						return { participantId, score: null };
					}
				});

				const scores = await Promise.all(scorePromises);
				const scoresMap: Record<string, ParticipantScore> = {};
				scores.forEach(({ participantId, score }) => {
					if (score) {
						scoresMap[participantId] = score;
					}
				});
				setParticipantScores(scoresMap);
			}
		} catch (error) {
			console.error("Error fetching data:", error);
		} finally {
			setLoading(false);
		}
	};

	const getParticipantScoringStatus = (participantId: string) => {
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

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "CONFIRMED":
			case "ATTENDED":
				return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
			case "REGISTERED":
				return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
			case "CANCELLED":
				return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
			default:
				return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
		}
	};

	const getStatusLabel = (status: string) => {
		switch (status) {
			case "CONFIRMED":
				return "Terkonfirmasi";
			case "ATTENDED":
				return "Hadir";
			case "REGISTERED":
				return "Terdaftar";
			case "CANCELLED":
				return "Dibatalkan";
			default:
				return status;
		}
	};

	const filteredParticipants = participants.filter((p) => {
		const searchLower = searchTerm.toLowerCase();
		return (
			p.teamName?.toLowerCase().includes(searchLower) ||
			p.registrant?.name?.toLowerCase().includes(searchLower) ||
			p.registrant?.email?.toLowerCase().includes(searchLower) ||
			p.registrant?.institution?.toLowerCase().includes(searchLower) ||
			p.schoolCategory?.name?.toLowerCase().includes(searchLower) ||
			p.members?.some(m => m.toLowerCase().includes(searchLower))
		);
	});

	

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
						Daftar Peserta
					</h1>
					<div className="mt-2 flex items-center text-gray-600 dark:text-gray-400">
						<CalendarIcon className="h-5 w-5 mr-2" />
						{assignment.event.title}
					</div>
				</div>

				{/* Search */}
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 p-4">
					<div className="relative">
						<MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
						<input
							type="text"
							placeholder="Cari peserta, tim, atau sekolah..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
						/>
					</div>
				</div>

				

				{/* Participants List */}
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
					<div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
							Daftar Peserta ({filteredParticipants.length})
						</h2>
					</div>

					{filteredParticipants.length === 0 ? (
						<div className="p-12 text-center">
							<UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
							<h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
								{participants.length === 0
									? "Belum Ada Peserta"
									: "Tidak Ada Hasil"}
							</h3>
							<p className="mt-2 text-gray-600 dark:text-gray-400">
								{participants.length === 0
									? "Belum ada peserta yang terdaftar di event ini."
									: "Coba kata kunci pencarian yang berbeda."}
							</p>
						</div>
					) : (
						<div className="divide-y divide-gray-200 dark:divide-gray-700">
							{filteredParticipants.map((participant) => {
								const scoringStatus = getParticipantScoringStatus(participant.id);
								const score = participantScores[participant.id];
								
								return (
								<div
									key={participant.id}
									className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50"
								>
									{/* Team/Participant Info */}
									<div className="flex items-start justify-between">
										<div className="flex items-start gap-4">
											<div className="flex-shrink-0">
												<div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
													<span className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
														{participant.teamName?.charAt(0).toUpperCase() || "?"}
													</span>
												</div>
											</div>
											<div>
												<div className="flex items-center gap-2 flex-wrap">
													<h3 className="text-lg font-medium text-gray-900 dark:text-white">
														{participant.teamName}
													</h3>
													{participant.schoolCategory && (
														<span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
															{participant.schoolCategory.name}
														</span>
													)}
													{scoringStatus.isComplete && (
														<span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs rounded-full">
															<CheckCircleIcon className="h-3.5 w-3.5" />
															Sudah Dinilai
														</span>
													)}
												</div>
												<div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
													<span className="font-medium">{participant.teamMembers}</span> anggota
												</div>
											</div>
										</div>
										<div className="flex flex-col items-end gap-2">
											<span
												className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(
													participant.status
												)}`}
											>
												{getStatusLabel(participant.status)}
											</span>
											{/* Scoring Progress/Score */}
											{scoringStatus.total > 0 && (
												<div className="text-right">
													{scoringStatus.isComplete && score ? (
														<div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
															<TrophyIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
															<div>
																<p className="text-lg font-bold text-amber-700 dark:text-amber-300">
																	{score.totalScore}
																</p>
																<p className="text-xs text-amber-600 dark:text-amber-400">
																	Total Skor
																</p>
															</div>
														</div>
													) : scoringStatus.scored > 0 ? (
														<div className="text-sm text-gray-500 dark:text-gray-400">
															<p className="font-medium">{scoringStatus.scored}/{scoringStatus.total}</p>
															<p className="text-xs">materi dinilai</p>
														</div>
													) : null}
												</div>
											)}
										</div>
									</div>

									{/* Members */}
									{participant.members.length > 0 && (
										<div className="mt-4 ml-16">
											<p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
												Anggota Tim:
											</p>
											<div className="flex flex-wrap gap-1">
												{participant.members.map((name, idx) => (
													<span
														key={idx}
														className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
													>
														{name}
													</span>
												))}
											</div>
										</div>
									)}

									{/* Registrant Info */}
									<div className="mt-4 ml-16 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
										<p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
											Pendaftar:
										</p>
										<div className="flex items-center gap-2">
											<span className="text-sm text-gray-900 dark:text-white">
												{participant.registrant.name}
											</span>
											<span className="text-xs text-gray-500 dark:text-gray-400">
												({participant.registrant.email})
											</span>
										</div>
										{participant.registrant.institution && (
											<div className="flex items-center mt-1 text-xs text-gray-600 dark:text-gray-400">
												<BuildingOffice2Icon className="h-3 w-3 mr-1" />
												{participant.registrant.institution}
											</div>
										)}
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

export default JuriEventPeserta;
