import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import {
	ClockIcon,
	MapPinIcon,
	CheckCircleIcon,
	XCircleIcon,
	ArrowLeftIcon,
	ArrowPathIcon,
	PlayIcon,
	ChevronDownIcon,
	ChevronUpIcon,
	TrashIcon,
} from "@heroicons/react/24/outline";
import Swal from "sweetalert2";
import { api } from "../../utils/api";

interface PerformanceSession {
	id: string;
	startTime: string | null;
	endTime: string | null;
	duration: number | null;
	status: string;
	notes: string | null;
	field: {
		id: string;
		name: string;
	};
	materialChecks: MaterialCheckWithMaterial[];
	participant: Participant | null;
}

interface MaterialCheckWithMaterial {
	id: string;
	isChecked: boolean;
	notes: string | null;
	material: {
		id: string;
		name: string;
		description: string | null;
		number: number;
		eventAssessmentCategoryId: string;
		category: {
			id: string;
			name: string;
		} | null;
	} | null;
}

interface Participant {
	id: string;
	groupName: string;
	orderNumber: number | null;
	schoolCategory: {
		id: string;
		name: string;
	};
	participation: {
		schoolName: string | null;
		user: {
			id: string;
			name: string;
		};
	};
}

interface SchoolCategory {
	id: string;
	name: string;
}

const PerformanceHistory: React.FC = () => {
	const { eventSlug } = useParams<{ eventSlug: string }>();
	const location = useLocation();

	// Detect admin vs panitia vs peserta route
	const isAdminRoute = location.pathname.startsWith("/admin");
	const isPanitiaRoute = location.pathname.startsWith("/panitia");
	const basePath = isAdminRoute ? "/admin" : isPanitiaRoute ? "/panitia" : "/peserta";

	const [sessions, setSessions] = useState<PerformanceSession[]>([]);
	const [loading, setLoading] = useState(true);
	const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
	const [filterStatus, setFilterStatus] = useState<string>("all");
	const [schoolCategories, setSchoolCategories] = useState<SchoolCategory[]>([]);
	const [selectedSchoolCategoryId, setSelectedSchoolCategoryId] = useState<string | null>(null);

	// Fetch school categories
	const fetchSchoolCategories = useCallback(async () => {
		try {
			const res = await api.get(`/events/${eventSlug}`);
			if (res.data?.schoolCategories) {
				setSchoolCategories(res.data.schoolCategories);
			}
		} catch (error) {
			console.error("Error fetching school categories:", error);
		}
	}, [eventSlug]);

	// Fetch sessions
	const fetchSessions = useCallback(async () => {
		try {
			const params = filterStatus !== "all" ? `?status=${filterStatus}` : "";
			const res = await api.get(`/performance/events/${eventSlug}/sessions${params}`);
			setSessions(res.data || []);
		} catch (error) {
			console.error("Error fetching sessions:", error);
		} finally {
			setLoading(false);
		}
	}, [eventSlug, filterStatus]);

	useEffect(() => {
		fetchSessions();
	}, [fetchSessions]);

	useEffect(() => {
		fetchSchoolCategories();
	}, [fetchSchoolCategories]);

	// Format time (seconds to mm:ss)
	const formatDuration = (seconds: number | null): string => {
		if (seconds === null) return "-";
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	};

	// Format datetime
	const formatDateTime = (dateString: string | null): string => {
		if (!dateString) return "-";
		const date = new Date(dateString);
		return date.toLocaleString("id-ID", {
			day: "numeric",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// Get status badge
	const getStatusBadge = (status: string) => {
		switch (status) {
			case "COMPLETED":
				return (
					<span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 text-xs rounded-full flex items-center gap-1 border border-green-300 dark:border-green-500/30">
						<CheckCircleIcon className="h-4 w-4" />
						Selesai
					</span>
				);
			case "PERFORMING":
				return (
					<span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400 text-xs rounded-full flex items-center gap-1 animate-pulse border border-orange-300 dark:border-orange-500/30">
						<PlayIcon className="h-4 w-4" />
						Sedang Tampil
					</span>
				);
			case "QUEUED":
				return (
					<span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-xs rounded-full flex items-center gap-1 border border-blue-300 dark:border-blue-500/30">
						<ClockIcon className="h-4 w-4" />
						Antrian
					</span>
				);
			default:
				return (
					<span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
						{status}
					</span>
				);
		}
	};

	// Get participant display name
	const getParticipantDisplayName = (participant: Participant | null): string => {
		if (!participant) {
			return "Peserta tidak tersedia";
		}
		if (participant.groupName) {
			return participant.groupName;
		}
		return participant.participation?.user?.name || "Peserta";
	};

	// Toggle session expansion
	const toggleExpand = (sessionId: string) => {
		setExpandedSessionId(expandedSessionId === sessionId ? null : sessionId);
	};

	// Delete session
	const handleDeleteSession = async (sessionId: string, participantName: string) => {
		const result = await Swal.fire({
			icon: "warning",
			title: "Hapus Riwayat?",
			html: `Riwayat penampilan <strong>${participantName}</strong> akan dihapus secara permanen.`,
			showCancelButton: true,
			confirmButtonText: "Ya, Hapus",
			cancelButtonText: "Batal",
			confirmButtonColor: "#dc2626",
		});

		if (!result.isConfirmed) return;

		try {
			await api.delete(`/performance/events/${eventSlug}/sessions/${sessionId}`);
			
			Swal.fire({
				icon: "success",
				title: "Berhasil Dihapus",
				text: "Riwayat penampilan telah dihapus.",
				timer: 2000,
				showConfirmButton: false,
			});

			// Refresh data
			fetchSessions();
		} catch (error: unknown) {
			const err = error as { response?: { data?: { error?: string } } };
			Swal.fire({
				icon: "error",
				title: "Gagal Menghapus",
				text: err.response?.data?.error || "Terjadi kesalahan.",
			});
		}
	};

	// Check if user can delete (admin/panitia only)
	const canDelete = isAdminRoute || isPanitiaRoute;

	// Filter sessions by school category
	const filteredSessions = selectedSchoolCategoryId
		? sessions.filter(s => s.participant?.schoolCategory?.id === selectedSchoolCategoryId)
		: sessions;

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px] bg-gray-50 dark:bg-gray-900">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
			</div>
		);
	}

	return (
		<div className="p-6 max-w-4xl mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen">
			{/* Header */}
			<div className="mb-6">
				<Link
					to={`${basePath}/events/${eventSlug}/field-rechecking`}
					className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 flex items-center gap-1 mb-4"
				>
					<ArrowLeftIcon className="h-4 w-4" />
					Kembali ke Lapangan
				</Link>

				<div className="flex justify-between items-center">
					<div>
						<h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
							<ClockIcon className="h-7 w-7 text-red-500" />
							Riwayat Penampilan
						</h1>
						<p className="text-gray-600 dark:text-gray-400 mt-1">
							Lihat riwayat penampilan dan hasil rechecking
						</p>
					</div>

					<button
						onClick={() => fetchSessions()}
						className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
						title="Refresh"
					>
						<ArrowPathIcon className="h-6 w-6" />
					</button>
				</div>
			</div>

			{/* School Category Tabs */}
			{schoolCategories.length > 0 && (
				<div className="flex gap-2 mb-4 border-b border-gray-200 dark:border-gray-700 pb-4 overflow-x-auto">
					<button
						onClick={() => setSelectedSchoolCategoryId(null)}
						className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
							selectedSchoolCategoryId === null
								? "bg-red-600 text-white"
								: "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
						}`}
					>
						Semua
						<span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
							selectedSchoolCategoryId === null ? "bg-red-500" : "bg-gray-300 dark:bg-gray-600"
						}`}>
							{sessions.length}
						</span>
					</button>
					{schoolCategories.map((cat) => {
						const categoryCount = sessions.filter(
							s => s.participant?.schoolCategory?.id === cat.id
						).length;

						return (
							<button
								key={cat.id}
								onClick={() => setSelectedSchoolCategoryId(cat.id)}
								className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap flex items-center gap-2 ${
									selectedSchoolCategoryId === cat.id
										? "bg-red-600 text-white"
										: "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
								}`}
							>
								{cat.name}
								<span className={`text-xs px-1.5 py-0.5 rounded ${
									selectedSchoolCategoryId === cat.id ? "bg-red-500" : "bg-gray-300 dark:bg-gray-600"
								}`}>
									{categoryCount}
								</span>
							</button>
						);
					})}
				</div>
			)}

			{/* Filter */}
			<div className="mb-6">
				<select
					value={filterStatus}
					onChange={(e) => setFilterStatus(e.target.value)}
					className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-200 focus:border-red-500 focus:ring-red-500"
				>
					<option value="all">Semua Status</option>
					<option value="COMPLETED">Selesai</option>
					<option value="PERFORMING">Sedang Tampil</option>
					<option value="QUEUED">Antrian</option>
				</select>
			</div>

			{filteredSessions.length === 0 ? (
				<div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
					<ClockIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
					<h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
						Belum Ada Riwayat
					</h3>
					<p className="text-gray-500">
						{filterStatus === "all" 
							? "Belum ada penampilan tercatat."
							: "Tidak ada penampilan dengan status ini."}
					</p>
				</div>
			) : (
				<div className="space-y-4">
					{filteredSessions.map((session) => {
						const isExpanded = expandedSessionId === session.id;
						const checkedCount = session.materialChecks?.filter(m => m.isChecked).length || 0;
						const totalMaterials = session.materialChecks?.length || 0;

						return (
							<div
								key={session.id}
							className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden"
						>
							{/* Session Header */}
							<button
								onClick={() => toggleExpand(session.id)}
								className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700"
							>
								<div className="flex items-center gap-4">
									<div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-xl border border-red-300 dark:border-red-500/30">
										<MapPinIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
									</div>
									<div>
										<div className="flex items-center gap-2 mb-1">
											<h3 className="font-semibold text-gray-900 dark:text-white">
												{session.field.name}
											</h3>
											{getStatusBadge(session.status)}
										</div>
										<p className="text-sm text-gray-600 dark:text-gray-400">
											#{session.participant?.orderNumber || "-"}{" "}
											{getParticipantDisplayName(session.participant)} •{" "}
											{session.participant?.participation?.schoolName || "-"}
										</p>
										<p className="text-xs text-gray-500 mt-1">
											{formatDateTime(session.startTime)}
										</p>
									</div>
								</div>

								<div className="flex items-center gap-4">
									{/* Quick Stats */}
									<div className="text-right hidden sm:block">
										{session.duration !== null && (
											<p className="text-sm text-gray-600 dark:text-gray-400">
												<span className="text-gray-500">Durasi:</span>{" "}
												<span className="font-mono font-semibold text-gray-800 dark:text-gray-200">{formatDuration(session.duration)}</span>
											</p>
										)}
										{totalMaterials > 0 && (
											<p className="text-sm text-gray-600 dark:text-gray-400">
												<span className="text-gray-500">Materi:</span>{" "}
												<span className={`font-semibold ${checkedCount === totalMaterials ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"}`}>
													{checkedCount}/{totalMaterials}
												</span>
											</p>
										)}
									</div>

									{isExpanded ? (
										<ChevronUpIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
									) : (
										<ChevronDownIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
									)}
								</div>
							</button>

							{/* Expanded Details */}
							{isExpanded && (
								<div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
									<div className="grid md:grid-cols-2 gap-6">
										{/* Time Details */}
										<div>
											<h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
												<ClockIcon className="h-5 w-5 text-gray-400" />
												Waktu Penampilan
											</h4>
											<div className="space-y-2 text-sm">
												<div className="flex justify-between">
													<span className="text-gray-500">Mulai:</span>
													<span className="font-medium text-gray-700 dark:text-gray-300">{formatDateTime(session.startTime)}</span>
												</div>
												<div className="flex justify-between">
													<span className="text-gray-500">Selesai:</span>
													<span className="font-medium text-gray-700 dark:text-gray-300">{formatDateTime(session.endTime)}</span>
												</div>
												<div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
													<span className="text-gray-500">Durasi:</span>
													<span className="font-mono font-bold text-lg text-gray-900 dark:text-white">
														{formatDuration(session.duration)}
													</span>
												</div>
											</div>
										</div>

										{/* Material Checklist */}
										{totalMaterials > 0 && (
											<div>
												<h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
													<CheckCircleIcon className="h-5 w-5 text-gray-400" />
													Checklist Materi ({checkedCount}/{totalMaterials})
												</h4>
												<div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
													{/* Group materials by category */}
													{(() => {
														const grouped = session.materialChecks.reduce((acc, check) => {
															const categoryId = check.material?.eventAssessmentCategoryId || "uncategorized";
															const categoryName = check.material?.category?.name || "Lainnya";
															if (!acc[categoryId]) {
																acc[categoryId] = {
																	name: categoryName,
																	items: [],
																};
															}
															acc[categoryId].items.push(check);
															return acc;
														}, {} as Record<string, { name: string; items: MaterialCheckWithMaterial[] }>);

														return Object.entries(grouped).map(([categoryId, { name: categoryName, items }]) => (
															<div key={categoryId}>
																<div className="text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 rounded px-2 py-1 mb-2 border border-blue-300 dark:border-blue-500/30">
																	{categoryName} ({items.filter(i => i.isChecked).length}/{items.length})
																</div>
																<div className="space-y-1 pl-2">
																	{items.map((check) => (
																		<div
																			key={check.id}
																			className={`flex items-center gap-2 p-2 rounded ${
																				check.isChecked ? "bg-green-100 dark:bg-green-900/30" : "bg-gray-100 dark:bg-gray-700"
																			}`}
																		>
																			{check.isChecked ? (
																				<CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
																			) : (
																				<XCircleIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
																			)}
																			<span className={`text-sm ${check.isChecked ? "text-green-700 dark:text-green-400" : "text-gray-600 dark:text-gray-400"}`}>
																				{check.material?.number || "-"}. {check.material?.name || "Unknown"}
																			</span>
																		</div>
																	))}
																</div>
															</div>
														));
													})()}
												</div>
											</div>
										)}
									</div>

									{/* Notes */}
									{session.notes && (
										<div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-300 dark:border-yellow-500/30">
											<p className="text-sm text-yellow-700 dark:text-yellow-400">
												<span className="font-medium">Catatan:</span> {session.notes}
											</p>
										</div>
									)}

									{/* Delete Button */}
									{canDelete && session.status !== "PERFORMING" && (
										<div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
											<button
												onClick={(e) => {
													e.stopPropagation();
													handleDeleteSession(session.id, getParticipantDisplayName(session.participant));
												}}
												className="px-4 py-2 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/70 flex items-center gap-2 text-sm font-medium transition-colors border border-red-300 dark:border-red-500/30"
											>
												<TrashIcon className="h-4 w-4" />
												Hapus Riwayat
											</button>
										</div>
									)}
								</div>
							)}
						</div>
					);
				})}
			</div>
		)}
	</div>
);
};

export default PerformanceHistory;
