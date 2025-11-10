import React, { useState, useEffect } from "react";
import { api } from "../../utils/api";
import { EventRegistration, ParticipationGroup } from "../../types/landing";
import {
	CalendarIcon,
	MapPinIcon,
	UserGroupIcon,
	TrashIcon,
	PlusIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import Swal from "sweetalert2";

const PesertaRegistrations: React.FC = () => {
	const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
	const [loading, setLoading] = useState(true);
	const [expandedId, setExpandedId] = useState<string | null>(null);

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
			html: `Yakin ingin membatalkan semua pendaftaran untuk event <strong>${eventTitle}</strong>?`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#EF4444",
			cancelButtonColor: "#6B7280",
			confirmButtonText: "Ya, Batalkan Semua",
			cancelButtonText: "Tidak",
		});

		if (result.isConfirmed) {
			try {
				await api.delete(`/registrations/${registrationId}`);

				await Swal.fire({
					icon: "success",
					title: "Pendaftaran Dibatalkan",
					text: "Semua tim telah dibatalkan",
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

	const handleAddGroups = async (
		registrationId: string,
		eventTitle: string
	) => {
		const { value: formValues } = await Swal.fire({
			title: `Tambah Tim untuk ${eventTitle}`,
			html: `
				<div class="text-left space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Nama Tim</label>
						<input id="groupName" class="swal2-input w-full" placeholder="Contoh: Tim C" />
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Jumlah Anggota</label>
						<input id="teamMembers" type="number" min="1" class="swal2-input w-full" value="1" />
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Catatan (Opsional)</label>
						<textarea id="notes" class="swal2-textarea w-full" placeholder="Catatan tambahan..."></textarea>
					</div>
				</div>
			`,
			focusConfirm: false,
			showCancelButton: true,
			confirmButtonText: "Tambah Tim",
			cancelButtonText: "Batal",
			preConfirm: () => {
				const groupName = (
					document.getElementById("groupName") as HTMLInputElement
				)?.value;
				const teamMembers = parseInt(
					(document.getElementById("teamMembers") as HTMLInputElement)?.value ||
						"1"
				);
				const notes = (document.getElementById("notes") as HTMLTextAreaElement)
					?.value;

				if (!groupName) {
					Swal.showValidationMessage("Nama tim harus diisi");
					return false;
				}

				if (teamMembers < 1) {
					Swal.showValidationMessage("Jumlah anggota minimal 1");
					return false;
				}

				return { groupName, teamMembers, notes };
			},
		});

		if (formValues) {
			try {
				await api.post(`/registrations/${registrationId}/groups`, [
					{
						groupName: formValues.groupName,
						teamMembers: formValues.teamMembers,
						notes: formValues.notes || undefined,
					},
				]);

				await Swal.fire({
					icon: "success",
					title: "Tim Ditambahkan",
					text: `${formValues.groupName} berhasil ditambahkan`,
				});

				fetchRegistrations();
			} catch (error: any) {
				Swal.fire({
					icon: "error",
					title: "Gagal Menambahkan Tim",
					text: error.response?.data?.error || "Terjadi kesalahan",
				});
			}
		}
	};

	const getStatusBadge = (status: string) => {
		const statusConfig = {
			REGISTERED: {
				bg: "bg-blue-100 dark:bg-blue-900",
				text: "text-blue-800 dark:text-blue-200",
				icon: <CheckCircleIcon className="h-4 w-4" />,
				label: "Terdaftar",
			},
			CONFIRMED: {
				bg: "bg-green-100 dark:bg-green-900",
				text: "text-green-800 dark:text-green-200",
				icon: <CheckCircleIcon className="h-4 w-4" />,
				label: "Dikonfirmasi",
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
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
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
				<div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
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
						const activeGroups = registration.groups.filter(
							(g) => g.status === "ACTIVE"
						);

						return (
							<div
								key={registration.id}
								className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
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

									{/* Registration Info */}
									<div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-4">
										<div>
											<div className="text-xs text-gray-600 dark:text-gray-400">
												Kategori
											</div>
											<div className="font-medium text-gray-900 dark:text-white">
												{registration.schoolCategory?.name}
											</div>
										</div>
										<div>
											<div className="text-xs text-gray-600 dark:text-gray-400">
												Sekolah
											</div>
											<div className="font-medium text-gray-900 dark:text-white">
												{registration.schoolName}
											</div>
										</div>
										<div>
											<div className="text-xs text-gray-600 dark:text-gray-400">
												Total Tim
											</div>
											<div className="font-medium text-gray-900 dark:text-white">
												{activeGroups.length} Tim
											</div>
										</div>
									</div>

									{/* Groups */}
									<div>
										<div className="flex items-center justify-between mb-3">
											<h4 className="font-medium text-gray-900 dark:text-white">
												Daftar Tim ({activeGroups.length})
											</h4>
											<div className="flex gap-2">
												{registration.status === "REGISTERED" && (
													<button
														onClick={() =>
															handleAddGroups(
																registration.id,
																registration.event?.title || "Event"
															)
														}
														className="flex items-center gap-1 px-3 py-1 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
													>
														<PlusIcon className="h-4 w-4" />
														Tambah Tim
													</button>
												)}
												<button
													onClick={() =>
														setExpandedId(isExpanded ? null : registration.id)
													}
													className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
												>
													{isExpanded ? "Sembunyikan" : "Lihat Detail"}
												</button>
											</div>
										</div>

										{isExpanded && (
											<div className="space-y-2">
												{activeGroups.map((group: ParticipationGroup) => (
													<div
														key={group.id}
														className="p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg"
													>
														<div className="flex items-start justify-between">
															<div className="flex-1">
																<div className="flex items-center gap-2 mb-1">
																	<UserGroupIcon className="h-4 w-4 text-indigo-600" />
																	<span className="font-medium text-gray-900 dark:text-white">
																		{group.groupName}
																	</span>
																</div>
																<div className="text-sm text-gray-600 dark:text-gray-400">
																	{group.teamMembers} anggota
																</div>
																{group.notes && (
																	<div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
																		Catatan: {group.notes}
																	</div>
																)}
															</div>
															{registration.status === "REGISTERED" && (
																<button
																	onClick={() =>
																		handleCancelGroup(
																			registration.id,
																			group.id,
																			group.groupName
																		)
																	}
																	className="text-red-600 hover:text-red-700 dark:text-red-400"
																	title="Batalkan Tim"
																>
																	<TrashIcon className="h-5 w-5" />
																</button>
															)}
														</div>
													</div>
												))}
											</div>
										)}
									</div>

									{/* Cancel Registration */}
									{registration.status === "REGISTERED" && (
										<div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
											<button
												onClick={() =>
													handleCancelRegistration(
														registration.id,
														registration.event?.title || "Event"
													)
												}
												className="text-sm text-red-600 dark:text-red-400 hover:underline"
											>
												Batalkan Semua Pendaftaran
											</button>
										</div>
									)}
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
