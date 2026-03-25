import React, { useState, useEffect } from "react";
import { api } from "../../utils/api";
import { Link } from "react-router-dom";
import { EventRegistration, ParticipationGroup, PersonMember } from "../../types/landing";
import {
	CalendarIcon,
	MapPinIcon,
	UserGroupIcon,
	TrashIcon,
	UserIcon,
	ChevronDownIcon,
	ChevronUpIcon,
	ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon, XCircleIcon, ClockIcon } from "@heroicons/react/24/solid";
import Swal from "sweetalert2";

// Helper to get image URL
const getImageUrl = (url: string | undefined | null): string | null => {
	if (!url) return null;
	if (url.startsWith("http://") || url.startsWith("https://")) {
		return url;
	}
	const backendUrl = import.meta.env.VITE_BACKEND_URL || "";
	return `${backendUrl}${url}`;
};

// Helper to parse memberData JSON
const parseMemberData = (memberDataStr: string | null): PersonMember[] => {
	if (!memberDataStr) return [];
	try {
		return JSON.parse(memberDataStr);
	} catch {
		return [];
	}
};

const PesertaRegistrations: React.FC = () => {
	const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
	const [loading, setLoading] = useState(true);
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

	useEffect(() => {
		fetchRegistrations();
	}, []);

	const fetchRegistrations = async () => {
		try {
			setLoading(true);
			const response = await api.get("/registrations/my");
			setRegistrations(response.data);
		} catch (error) {
			console.error("Error fetching registrations:", error);
		} finally {
			setLoading(false);
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	};

	const handleCancelGroup = async (
		registrationId: string,
		groupId: string,
		groupName: string
	) => {
		const result = await Swal.fire({
			title: "Batalkan Tim?",
			html: `Yakin ingin membatalkan pendaftaran tim <strong>${groupName}</strong>?`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#EF4444",
			cancelButtonColor: "#6B7280",
			confirmButtonText: "Ya, Batalkan",
			cancelButtonText: "Tidak",
		});

		if (result.isConfirmed) {
			try {
				await api.delete(`/registrations/${registrationId}/groups/${groupId}`);

				await Swal.fire({
					icon: "success",
					title: "Tim Dibatalkan",
					text: `Pendaftaran ${groupName} telah dibatalkan`,
				});

				fetchRegistrations();
			} catch (error: any) {
				Swal.fire({
					icon: "error",
					title: "Gagal Membatalkan",
					text:
						error.response?.data?.error ||
						"Terjadi kesalahan saat membatalkan tim",
				});
			}
		}
	};

	const handleCancelRegistration = async (
		registrationId: string,
		eventTitle: string
	) => {
		const result = await Swal.fire({
			title: "Batalkan Pendaftaran?",
			html: `Yakin ingin membatalkan pendaftaran Anda untuk event <strong>${eventTitle}</strong>?<br><br><small class="text-gray-500">Anda dapat mendaftar ulang setelah membatalkan.</small>`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#EF4444",
			cancelButtonColor: "#6B7280",
			confirmButtonText: "Ya, Batalkan",
			cancelButtonText: "Tidak",
		});

		if (result.isConfirmed) {
			try {
				await api.delete(`/registrations/${registrationId}`);

				await Swal.fire({
					icon: "success",
					title: "Pendaftaran Dibatalkan",
					text: "Pendaftaran Anda telah dibatalkan. Anda dapat mendaftar ulang kapan saja.",
				});

				fetchRegistrations();
			} catch (error: any) {
				Swal.fire({
					icon: "error",
					title: "Gagal Membatalkan",
					text:
						error.response?.data?.error ||
						"Terjadi kesalahan saat membatalkan pendaftaran",
				});
			}
		}
	};

	const handleRestoreGroup = async (
		registrationId: string,
		groupId: string,
		groupName: string
	) => {
		const result = await Swal.fire({
			title: "Pulihkan Tim?",
			html: `Yakin ingin memulihkan pendaftaran tim <strong>${groupName}</strong>?`,
			icon: "question",
			showCancelButton: true,
			confirmButtonColor: "#10B981",
			cancelButtonColor: "#6B7280",
			confirmButtonText: "Ya, Pulihkan",
			cancelButtonText: "Tidak",
		});

		if (result.isConfirmed) {
			try {
				await api.patch(`/registrations/${registrationId}/groups/${groupId}/restore`);

				await Swal.fire({
					icon: "success",
					title: "Tim Dipulihkan",
					text: `Pendaftaran ${groupName} telah dipulihkan`,
				});

				fetchRegistrations();
			} catch (error: any) {
				Swal.fire({
					icon: "error",
					title: "Gagal Memulihkan",
					text:
						error.response?.data?.error ||
						"Terjadi kesalahan saat memulihkan tim",
				});
			}
		}
	};

	const getStatusBadge = (status: string) => {
		const statusConfig = {
			REGISTERED: {
				bg: "bg-yellow-100 dark:bg-yellow-900",
				text: "text-yellow-800 dark:text-yellow-200",
				icon: <ClockIcon className="h-4 w-4" />,
				label: "Menunggu Konfirmasi",
			},
			PENDING: {
				bg: "bg-yellow-100 dark:bg-yellow-900",
				text: "text-yellow-800 dark:text-yellow-200",
				icon: <ClockIcon className="h-4 w-4" />,
				label: "Menunggu Konfirmasi",
			},
			CONFIRMED: {
				bg: "bg-green-100 dark:bg-green-900",
				text: "text-green-800 dark:text-green-200",
				icon: <CheckCircleIcon className="h-4 w-4" />,
				label: "Dikonfirmasi",
			},
			APPROVED: {
				bg: "bg-green-100 dark:bg-green-900",
				text: "text-green-800 dark:text-green-200",
				icon: <CheckCircleIcon className="h-4 w-4" />,
				label: "Disetujui",
			},
			REJECTED: {
				bg: "bg-red-100 dark:bg-red-900",
				text: "text-red-800 dark:text-red-200",
				icon: <XCircleIcon className="h-4 w-4" />,
				label: "Ditolak",
			},
			CANCELLED: {
				bg: "bg-red-100 dark:bg-red-900",
				text: "text-red-800 dark:text-red-200",
				icon: <XCircleIcon className="h-4 w-4" />,
				label: "Dibatalkan",
			},
		};

		const config =
			statusConfig[status as keyof typeof statusConfig] ||
			statusConfig.REGISTERED;

		return (
			<span
				className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}
			>
				{config.icon}
				{config.label}
			</span>
		);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
			</div>
		);
	}

	return (
		<div className="py-6 px-4 sm:px-6 lg:px-8">
			{/* Header */}
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
					Pendaftaran Saya
				</h1>
				<p className="mt-2 text-gray-600 dark:text-gray-400">
					Kelola pendaftaran dan tim Anda untuk setiap event
				</p>
			</div>

			{/* Registrations List */}
			{registrations.length === 0 ? (
				<div className="text-center py-12 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow">
					<UserGroupIcon className="mx-auto h-16 w-16 text-gray-400" />
					<h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
						Belum Ada Pendaftaran
					</h3>
					<p className="mt-2 text-gray-600 dark:text-gray-400">
						Anda belum mendaftar ke event manapun
					</p>
				</div>
			) : (
				<div className="space-y-6">
					{registrations.map((registration) => {
						const isExpanded = expandedId === registration.id;
						const allGroups = registration.groups || [];
						const activeGroups = allGroups.filter((g) => g.status === "ACTIVE");
						const cancelledGroups = allGroups.filter((g) => g.status === "CANCELLED");

						return (
							<div
								key={registration.id}
								className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-md overflow-hidden"
							>
								{/* Header */}
								<div className="p-6">
									<div className="flex items-start justify-between mb-4">
										<div className="flex-1">
											<h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
												{registration.event?.title}
											</h3>
											<div className="space-y-1">
												<div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
													<CalendarIcon className="h-4 w-4 mr-2" />
													{registration.event &&
														formatDate(registration.event.startDate)}
												</div>
												{registration.event?.location && (
													<div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
														<MapPinIcon className="h-4 w-4 mr-2" />
														{registration.event.location}
													</div>
												)}
											</div>
										</div>
										<div>{getStatusBadge(registration.status)}</div>
									</div>

									

									{/* Info Sekolah & Tim */}
									<div>
										{/* Nama Sekolah/Instansi */}
										{registration.schoolName && (
											<div className="mb-3 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
												<span className="font-medium">Sekolah/Instansi:</span>
												<span>{registration.schoolName}</span>
											</div>
										)}

										{/* Ringkasan Tim */}
										<div className="flex items-center justify-between mb-3">
											<div>
												<h4 className="font-medium text-gray-900 dark:text-white">
													{activeGroups.length} Tim Aktif
													{cancelledGroups.length > 0 && (
														<span className="text-gray-500 dark:text-gray-400 font-normal">
															{" "}({cancelledGroups.length} dibatalkan)
														</span>
													)}
												</h4>
												{activeGroups.length > 0 && (
													<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
														{activeGroups.map((g: ParticipationGroup) => g.groupName).join(", ")}
													</p>
												)}
											</div>
											<button
												onClick={() =>
													setExpandedId(isExpanded ? null : registration.id)
												}
												className="text-sm text-red-600 dark:text-red-400 hover:underline"
											>
												{isExpanded ? "Sembunyikan Detail" : "Lihat Detail"}
											</button>
										</div>

										{isExpanded && (
											<div className="space-y-4">
													{/* Active Groups */}
													{activeGroups.length > 0 && (
														<div className="space-y-4">
															{activeGroups.map((group: ParticipationGroup) => {
													const members = parseMemberData(group.memberData);
													const isTeamExpanded = expandedTeamId === group.id;
													const pasukan = members.filter(m => m.role === 'PASUKAN');
													const danton = members.find(m => m.role === 'DANTON');
													const cadangan = members.filter(m => m.role === 'CADANGAN');

													return (
														<div
															key={group.id}
															className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden"
														>
															{/* Team Header */}
															<div className="p-4 flex items-start justify-between">
																<div className="flex-1">
																	<div className="flex items-center gap-2 mb-1">
																		<UserGroupIcon className="h-5 w-5 text-red-600" />
																		<span className="font-semibold text-gray-900 dark:text-white">
																			{group.groupName}
																		</span>
																		{group.schoolCategory && (
																			<span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
																				{group.schoolCategory.name}
																			</span>
																		)}
																	</div>
																	<div className="text-sm text-gray-600 dark:text-gray-400">
																		{members.length > 0 ? `${members.length} personil` : `${group.teamMembers} anggota`}
																	</div>
																	{group.notes && (
																		<div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
																			<span className="font-medium">Catatan:</span> {group.notes}
																		</div>
																	)}
																</div>
																<div className="flex items-center gap-2">
																	{members.length > 0 && (
																		<button
																			onClick={() => setExpandedTeamId(isTeamExpanded ? null : group.id)}
																			className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400 hover:underline"
																		>
																			{isTeamExpanded ? (
																				<>
																					<ChevronUpIcon className="h-4 w-4" />
																					Tutup
																				</>
																			) : (
																				<>
																					<ChevronDownIcon className="h-4 w-4" />
																					Lihat Personil
																				</>
																			)}
																		</button>
																	)}
																	{registration.status === "REGISTERED" && (
																		<button
																			onClick={() =>
																				handleCancelGroup(
																					registration.id,
																					group.id,
																					group.groupName
																				)
																			}
																			className="text-red-600 hover:text-red-700 dark:text-red-400 ml-2"
																			title="Batalkan Tim"
																		>
																			<TrashIcon className="h-5 w-5" />
																		</button>
																	)}
																</div>
															</div>

															{/* Personnel Details */}
															{isTeamExpanded && members.length > 0 && (
																<div className="border-t border-gray-200 dark:border-gray-600 p-4 bg-gray-50 dark:bg-gray-800/50">
																	{/* Komandan / Danton */}
																	{danton && (
																		<div className="mb-4">
																			<h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
																				<span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
																				Komandan (Danton)
																			</h5>
																			<div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
																				{danton.photo ? (
																					<img
																						src={getImageUrl(danton.photo) || ''}
																						alt={danton.name}
																						className="w-12 h-12 rounded-full object-cover border-2 border-yellow-400"
																						onError={(e) => {
																							e.currentTarget.src = '';
																							e.currentTarget.style.display = 'none';
																							e.currentTarget.nextElementSibling?.classList.remove('hidden');
																						}}
																					/>
																				) : (
																					<div className="w-12 h-12 rounded-full bg-yellow-200 dark:bg-yellow-800 flex items-center justify-center">
																						<UserIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
																					</div>
																				)}
																				<div>
																					<p className="font-medium text-gray-900 dark:text-white">{danton.name}</p>
																					<p className="text-xs text-yellow-600 dark:text-yellow-400">Komandan</p>
																				</div>
																			</div>
																		</div>
																	)}

																	{/* Pasukan */}
																	{pasukan.length > 0 && (
																		<div className="mb-4">
																			<h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
																				<span className="w-2 h-2 bg-red-500 rounded-full"></span>
																				Pasukan ({pasukan.length} orang)
																			</h5>
																			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
																				{pasukan.map((member, idx) => (
																					<div key={member.id || idx} className="flex flex-col items-center p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg">
																						{member.photo ? (
																							<img
																								src={getImageUrl(member.photo) || ''}
																								alt={member.name}
																								className="w-16 h-16 rounded-full object-cover border-2 border-red-400 mb-2"
																								onError={(e) => {
																									e.currentTarget.style.display = 'none';
																								}}
																							/>
																						) : (
																							<div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mb-2">
																								<UserIcon className="w-8 h-8 text-red-500" />
																							</div>
																						)}
																						<p className="text-sm font-medium text-gray-900 dark:text-white text-center line-clamp-1">{member.name}</p>
																						<p className="text-xs text-gray-500 dark:text-gray-400">#{idx + 1}</p>
																					</div>
																				))}
																			</div>
																		</div>
																	)}

																	{/* Cadangan */}
																	{cadangan.length > 0 && (
																		<div>
																			<h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
																				<span className="w-2 h-2 bg-gray-500 rounded-full"></span>
																				Cadangan ({cadangan.length} orang)
																			</h5>
																			<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
																				{cadangan.map((member, idx) => (
																					<div key={member.id || idx} className="flex items-center gap-3 p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg">
																						{member.photo ? (
																							<img
																								src={getImageUrl(member.photo) || ''}
																								alt={member.name}
																								className="w-10 h-10 rounded-full object-cover border border-gray-300"
																								onError={(e) => {
																									e.currentTarget.style.display = 'none';
																								}}
																							/>
																						) : (
																							<div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
																								<UserIcon className="w-5 h-5 text-gray-500" />
																							</div>
																						)}
																						<div>
																							<p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">{member.name}</p>
																							<p className="text-xs text-gray-500 dark:text-gray-400">Cadangan</p>
																						</div>
																					</div>
																				))}
																			</div>
																		</div>
																	)}

																	{members.length === 0 && (
																		<p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
																			Belum ada data personil
																		</p>
																	)}
																</div>
															)}
														</div>
													);
												})}
											</div>
										)}

										{/* Cancelled Groups */}
										{cancelledGroups.length > 0 && (
											<div className="space-y-4">
												<div className="pt-2 border-t border-gray-200/60 dark:border-gray-700/40">
													<h5 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
														Tim yang Dibatalkan ({cancelledGroups.length})
													</h5>
												</div>
										{cancelledGroups.map((group: ParticipationGroup) => {
											const members = parseMemberData(group.memberData);
											return (
												<div
													key={group.id}
													className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4"
												>
													<div className="flex items-center justify-between">
														<div className="flex-1">
															<div className="flex items-center gap-2 mb-1">
																<UserGroupIcon className="h-5 w-5 text-gray-400" />
																<span className="font-medium text-gray-600 dark:text-gray-400 line-through">
																	{group.groupName}
																</span>
																{group.schoolCategory && (
																	<span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-500 px-2 py-0.5 rounded">
																		{group.schoolCategory.name}
																	</span>
																)}
																<span className="text-xs bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded font-medium">
																	DIBATALKAN
																</span>
															</div>
															<div className="text-sm text-gray-500 dark:text-gray-400">
																{members.length > 0 ? `${members.length} personil` : `${group.teamMembers} anggota`}
															</div>
														</div>
														<button
															onClick={() =>
																handleRestoreGroup(
																	registration.id,
																	group.id,
																	group.groupName
																)
															}
															className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 flex items-center gap-1 text-sm font-medium"
															title="Pulihkan Tim"
														>
															<ArrowPathIcon className="h-5 w-5" />
															<span>Pulihkan</span>
														</button>
													</div>
												</div>
											);
										})}
									</div>
								)}
							</div>
						)}

						{/* Cancel Registration */}
						{registration.status === "REGISTERED" && activeGroups.length > 0 && (
							<div className="mt-4 pt-4 border-t border-gray-200/60 dark:border-gray-700/40">
								<button
									onClick={() =>
										handleCancelRegistration(
											registration.id,
											registration.event?.title || "Event"
										)
									}
									className="text-sm text-red-600 dark:text-red-400 hover:underline"
								>
										Batalkan Pendaftaran
									</button>
								</div>
							)}

							{/* Re-register button for cancelled registrations */}
							{registration.status === "CANCELLED" && registration.event && (
								<div className="mt-4 pt-4 border-t border-gray-200/60 dark:border-gray-700/40">
									<Link
										to={`/peserta/events/${registration.event.slug || registration.event.id}/register`}
										className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
									>
										Daftar Ulang
									</Link>
							</div>
						)}
					</div>
				</div>
			</div>
			);
		})}
		</div>
	)}
		</div>
	);
};

export default PesertaRegistrations;
