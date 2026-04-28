import React, { useState, useEffect } from "react";
import { api } from "../../utils/api";
import { Link } from "react-router-dom";
import { EventRegistration, ParticipationGroup, PersonMember } from "../../types/landing";
import {
	CalendarIcon,
	MapPinIcon,
	BuildingOffice2Icon,
	UserGroupIcon,
	UserIcon,
	ChevronDownIcon,
	ChevronUpIcon,
	ArrowPathIcon,
	CreditCardIcon,
	EyeIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon, XCircleIcon, ClockIcon } from "@heroicons/react/24/solid";
import Swal from "sweetalert2";
import { usePayment } from "../../hooks/usePayment";

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
	const [payingId, setPayingId] = useState<string | null>(null);
	const { pay, isSnapReady } = usePayment();

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

	const handlePayRegistration = async (registrationId: string) => {
		try {
			setPayingId(registrationId);
			const paymentRes = await api.post(`/registrations/${registrationId}/pay`);
			const { snapToken, status } = paymentRes.data.payment;

			// Payment was already completed (detected via Midtrans check)
			if (status === "PAID" && !snapToken) {
				Swal.fire({ icon: "success", title: "Pembayaran Berhasil!", text: "Pembayaran Anda sudah dikonfirmasi sebelumnya." });
				fetchRegistrations();
				return;
			}

			if (snapToken && isSnapReady) {
				pay(snapToken, {
					onSuccess: async () => {
						// Verify payment status directly with Midtrans to avoid race condition with webhook
						try {
							await api.post(`/registrations/${registrationId}/verify-payment`);
						} catch {}
						Swal.fire({ icon: "success", title: "Pembayaran Berhasil!", text: "Pendaftaran Anda akan segera diproses." });
						fetchRegistrations();
					},
					onPending: () => {
						Swal.fire({ icon: "info", title: "Pembayaran Pending", text: "Silakan selesaikan pembayaran Anda." });
						fetchRegistrations();
					},
					onError: () => {
						Swal.fire({ icon: "error", title: "Pembayaran Gagal", text: "Silakan coba lagi." });
					},
					onClose: () => {
						Swal.fire({ icon: "warning", title: "Pembayaran Belum Selesai", text: "Pembayaran belum dilakukan. Silakan lakukan pembayaran terlebih dahulu." });
						fetchRegistrations();
					},
				});
			} else {
				Swal.fire({ icon: "warning", title: "Pembayaran tidak tersedia", text: "Sistem pembayaran sedang tidak tersedia. Coba lagi nanti." });
			}
		} catch (error: any) {
			Swal.fire({ icon: "error", title: "Gagal Memproses Pembayaran", text: error.response?.data?.message || error.response?.data?.error || "Terjadi kesalahan." });
		} finally {
			setPayingId(null);
		}
	};

	const getStatusBadge = (status: string) => {
		const statusConfig = {
			PENDING_PAYMENT: {
				bg: "bg-orange-100 dark:bg-orange-900",
				text: "text-orange-800 dark:text-orange-200",
				icon: <ClockIcon className="h-4 w-4" />,
				label: "Menunggu Pembayaran",
			},
			REGISTERED: {
				bg: "bg-yellow-100 dark:bg-yellow-900",
				text: "text-yellow-800 dark:text-yellow-200",
				icon: <ClockIcon className="h-4 w-4" />,
				label: "Menunggu Persetujuan",
			},
			PENDING: {
				bg: "bg-yellow-100 dark:bg-yellow-900",
				text: "text-yellow-800 dark:text-yellow-200",
				icon: <ClockIcon className="h-4 w-4" />,
				label: "Menunggu Persetujuan",
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
				className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold shadow-sm ${config.bg} ${config.text}`}
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
						const displayGroupCount = activeGroups.length > 0 ? activeGroups.length : cancelledGroups.length;
						const activeGroupNames = activeGroups.map((g: ParticipationGroup) => g.groupName).join(", ");
						const activeMemberCount = activeGroups.reduce((total, group) => {
							const members = parseMemberData(group.memberData);
							return total + (members.length > 0 ? members.length : group.teamMembers);
						}, 0);
						const canCancelRegistration =
							(registration.status === "REGISTERED" || registration.status === "PENDING_PAYMENT") &&
							activeGroups.length > 0;
						const waNumber = registration.event?.contactPhone?.replace(/[^0-9]/g, "");
						const waHref = waNumber
							? `https://wa.me/${waNumber}?text=${encodeURIComponent(
								`Halo, saya ingin bertanya mengenai pendaftaran:\n` +
								`Event: ${registration.event?.title || ""}\n` +
								`Sekolah: ${registration.schoolName || "-"}\n` +
								`Tim: ${activeGroupNames || "-"}\n` +
								`Biaya: Rp ${registration.registrationPayment?.amount?.toLocaleString("id-ID") || "0"}`
							)}`
							: null;
						const actionButtonCount = [
							registration.status === "PENDING_PAYMENT",
							Boolean(waHref),
							canCancelRegistration,
						].filter(Boolean).length;

						return (
							<div
								key={registration.id}
								className="relative pt-5"
							>
								<div className="absolute right-4 top-0 z-10 sm:right-6">
									{getStatusBadge(registration.status)}
								</div>

								<div className="overflow-hidden rounded-lg border border-red-100/80 bg-white/90 shadow-md shadow-red-100/60 backdrop-blur-sm dark:border-red-900/30 dark:bg-gray-800/70 dark:shadow-black/30">
									<div className="p-4 pt-6 sm:p-6 sm:pt-7 lg:p-7">
										<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
											<div className="min-w-0">
												<h3 className="text-[26px] font-semibold leading-tight tracking-normal text-gray-900 dark:text-white sm:text-3xl lg:text-[34px]">
													{registration.event?.title}
												</h3>

												<div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 text-gray-700 dark:text-gray-200 sm:gap-x-8">
													<div className="flex min-w-0 items-center gap-3">
														<CalendarIcon className="h-8 w-8 flex-shrink-0 text-red-600 dark:text-red-400" />
														<span className="min-w-0 truncate text-sm font-medium sm:text-base">
															{registration.event ? formatDate(registration.event.startDate) : "-"}
														</span>
													</div>
													<div className="flex min-w-0 items-center gap-3">
														<MapPinIcon className="h-8 w-8 flex-shrink-0 text-red-600 dark:text-red-400" />
														<span className="min-w-0 truncate text-sm font-medium sm:text-base">
															{registration.event?.location || "-"}
														</span>
													</div>
													<div className="flex min-w-0 items-center gap-3">
														<BuildingOffice2Icon className="h-8 w-8 flex-shrink-0 text-red-600 dark:text-red-400" />
														<span className="min-w-0 truncate text-sm font-medium sm:text-base">
															{registration.schoolName || "Instansi"}
														</span>
													</div>
													<div className="flex min-w-0 items-center gap-3">
														<UserGroupIcon className="h-8 w-8 flex-shrink-0 text-red-600 dark:text-red-400" />
														<span className="min-w-0 truncate text-sm font-medium sm:text-base">
															{displayGroupCount} Tim
														</span>
													</div>
												</div>
											</div>

											<div className="hidden rounded-lg border border-red-100 bg-red-50/60 p-4 dark:border-red-900/40 dark:bg-red-950/20 lg:block">
												<p className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-300">
													Ringkasan
												</p>
												<div className="mt-3 grid grid-cols-2 gap-3">
													<div>
														<p className="text-2xl font-semibold text-red-700 dark:text-red-200">
															{activeGroups.length}
														</p>
														<p className="text-xs text-gray-500 dark:text-gray-400">Tim aktif</p>
													</div>
													<div>
														<p className="text-2xl font-semibold text-red-700 dark:text-red-200">
															{activeMemberCount}
														</p>
														<p className="text-xs text-gray-500 dark:text-gray-400">Personil</p>
													</div>
												</div>
												{activeGroupNames && (
													<p className="mt-3 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
														{activeGroupNames}
													</p>
												)}
												{cancelledGroups.length > 0 && (
													<p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
														{cancelledGroups.length} tim dibatalkan
													</p>
												)}
											</div>
										</div>

										<div className="mt-4 border-t border-red-100 pt-4 dark:border-red-900/30">
											<div className="space-y-2 lg:flex lg:items-center lg:gap-2 lg:space-y-0">
												<button
													type="button"
													onClick={() => setExpandedId(isExpanded ? null : registration.id)}
													className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20 lg:w-auto lg:min-w-[9rem]"
													aria-expanded={isExpanded}
												>
													<EyeIcon className="h-4 w-4" />
													{isExpanded ? "Sembunyikan" : "Lihat Detail"}
												</button>

												{actionButtonCount > 0 && activeGroups.length > 0 && (
													<div
														className={`grid gap-2 lg:flex lg:w-auto ${
															actionButtonCount === 1 ? "grid-cols-1" : "grid-cols-2"
														}`}
													>
														{registration.status === "PENDING_PAYMENT" && (
															<button
																onClick={() => handlePayRegistration(registration.id)}
																disabled={payingId === registration.id}
																className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:bg-green-400 lg:w-auto"
															>
																<CreditCardIcon className="h-4 w-4" />
																{payingId === registration.id ? "Memproses..." : "Bayar Sekarang"}
															</button>
														)}
														{waHref && (
															<a
																href={waHref}
																target="_blank"
																rel="noopener noreferrer"
																className="inline-flex w-full items-center justify-center rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600 lg:w-auto"
															>
																WA Panitia
															</a>
														)}
														{canCancelRegistration && (
															<button
																onClick={() =>
																	handleCancelRegistration(
																		registration.id,
																		registration.event?.title || "Event"
																	)
																}
																className="inline-flex w-full items-center justify-center rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20 lg:w-auto"
															>
																Batalkan Pendaftaran
															</button>
														)}
													</div>
												)}
											</div>
										</div>

										<div className="mt-4 space-y-4">

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
													const official = members.filter(m => m.role === 'OFFICIAL');
													const pelatih = members.filter(m => m.role === 'PELATIH');

													return (
														<div
															key={group.id}
															className="overflow-hidden rounded-lg border border-red-100 bg-white shadow-sm dark:border-red-900/40 dark:bg-gray-900"
														>
															{/* Team Header */}
															<div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
																<div className="min-w-0 flex-1">
																	<div className="flex min-w-0 items-start gap-3">
																		<div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300">
																			<UserGroupIcon className="h-5 w-5" />
																		</div>
																		<div className="min-w-0">
																			<div className="flex flex-wrap items-center gap-2">
																				<span className="font-semibold text-gray-900 dark:text-white">
																					{group.groupName}
																				</span>
																				{group.schoolCategory && (
																					<span className="rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">
																						{group.schoolCategory.name}
																					</span>
																				)}
																			</div>
																			<div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
																				{members.length > 0 ? `${members.length} personil` : `${group.teamMembers} anggota`}
																			</div>
																		</div>
																	</div>
																	{group.notes && (
																		<div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
																			<span className="font-medium">Catatan:</span> {group.notes}
																		</div>
																	)}
																</div>
																{members.length > 0 && (
																	<button
																		type="button"
																		onClick={() => setExpandedTeamId(isTeamExpanded ? null : group.id)}
																		className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-900/50 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20 sm:w-auto"
																	>
																		{isTeamExpanded ? (
																			<>
																				<ChevronUpIcon className="h-4 w-4" />
																				Tutup Personil
																			</>
																		) : (
																			<>
																				<ChevronDownIcon className="h-4 w-4" />
																				Lihat Personil
																			</>
																		)}
																	</button>
																)}
															</div>

															{/* Personnel Details */}
															{isTeamExpanded && members.length > 0 && (
																<div className="space-y-5 border-t border-red-100 bg-red-50/40 p-4 dark:border-red-900/40 dark:bg-red-950/10">
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

																	{/* Official */}
																	{official.length > 0 && (
																		<div>
																			<h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
																				<span className="w-2 h-2 bg-blue-500 rounded-full"></span>
																				Official ({official.length} orang)
																			</h5>
																			<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
																				{official.map((member, idx) => (
																					<div key={member.id || idx} className="flex items-center gap-3 p-2 bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-600 rounded-lg">
																						{member.photo ? (
																							<img
																								src={getImageUrl(member.photo) || ''}
																								alt={member.name}
																								className="w-10 h-10 rounded-full object-cover border border-blue-300"
																								onError={(e) => {
																									e.currentTarget.style.display = 'none';
																								}}
																							/>
																						) : (
																							<div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
																								<UserIcon className="w-5 h-5 text-blue-500" />
																							</div>
																						)}
																						<div>
																							<p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">{member.name}</p>
																							<p className="text-xs text-blue-500 dark:text-blue-400">Official</p>
																						</div>
																					</div>
																				))}
																			</div>
																		</div>
																	)}

																	{/* Pelatih */}
																	{pelatih.length > 0 && (
																		<div>
																			<h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
																				<span className="w-2 h-2 bg-green-500 rounded-full"></span>
																				Pelatih ({pelatih.length} orang)
																			</h5>
																			<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
																				{pelatih.map((member, idx) => (
																					<div key={member.id || idx} className="flex items-center gap-3 p-2 bg-white dark:bg-gray-900 border border-green-200 dark:border-green-600 rounded-lg">
																						{member.photo ? (
																							<img
																								src={getImageUrl(member.photo) || ''}
																								alt={member.name}
																								className="w-10 h-10 rounded-full object-cover border border-green-300"
																								onError={(e) => {
																									e.currentTarget.style.display = 'none';
																								}}
																							/>
																						) : (
																							<div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
																								<UserIcon className="w-5 h-5 text-green-500" />
																							</div>
																						)}
																						<div>
																							<p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">{member.name}</p>
																							<p className="text-xs text-green-500 dark:text-green-400">Pelatih</p>
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
														{registration.status !== "CANCELLED" && (
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
														)}
													</div>
												</div>
											);
										})}
									</div>
								)}
							</div>
						)}
										</div>

							{/* Re-register button for cancelled registrations */}
							{registration.status === "CANCELLED" && registration.event && (
								<div className="mt-4 pt-4 border-t border-gray-200/60 dark:border-gray-700/40">
									<Link
										to={`/peserta/events/${registration.event.slug || registration.event.id}/register?mode=reregister&registrationId=${registration.id}`}
										className="inline-flex w-full items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:bg-red-400 sm:w-auto"
									>
										Edit & Daftar Ulang
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
