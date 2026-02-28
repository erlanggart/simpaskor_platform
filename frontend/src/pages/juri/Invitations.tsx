import React, { useState, useEffect } from "react";
import {
	CalendarIcon,
	MapPinIcon,
	CheckCircleIcon,
	XCircleIcon,
	ClockIcon,
	InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../utils/api";
import Swal from "sweetalert2";

interface AssessmentCategory {
	id: string;
	name: string;
	description: string | null;
}

interface EventInfo {
	id: string;
	title: string;
	slug: string | null;
	thumbnail: string | null;
	startDate: string;
	endDate: string;
	location: string | null;
	venue: string | null;
	organizer: string | null;
	status: string;
}

interface Invitation {
	id: string;
	status: string;
	invitedAt: string;
	notes: string | null;
	event: EventInfo;
	assignedCategories: {
		id: string;
		assessmentCategory: AssessmentCategory;
	}[];
}

const JuryInvitations: React.FC = () => {
	const [invitations, setInvitations] = useState<Invitation[]>([]);
	const [loading, setLoading] = useState(true);
	const [respondingId, setRespondingId] = useState<string | null>(null);

	useEffect(() => {
		fetchInvitations();
	}, []);

	const fetchInvitations = async () => {
		try {
			setLoading(true);
			const response = await api.get("/juries/my-invitations");
			setInvitations(response.data);
		} catch (error) {
			console.error("Error fetching invitations:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleRespond = async (invitation: Invitation, accept: boolean) => {
		if (!accept) {
			const { value: reason } = await Swal.fire({
				title: "Alasan Penolakan",
				input: "textarea",
				inputPlaceholder: "Masukkan alasan mengapa Anda menolak undangan ini...",
				showCancelButton: true,
				confirmButtonText: "Tolak Undangan",
				cancelButtonText: "Batal",
				confirmButtonColor: "#EF4444",
				inputValidator: (value) => {
					if (!value) {
						return "Mohon berikan alasan penolakan";
					}
				},
			});

			if (!reason) return;

			try {
				setRespondingId(invitation.id);
				await api.patch(`/juries/invitations/${invitation.id}/respond`, {
					accept: false,
					rejectionReason: reason,
				});

				await Swal.fire({
					icon: "info",
					title: "Undangan Ditolak",
					text: "Anda telah menolak undangan menjadi juri di event ini",
					timer: 2000,
					showConfirmButton: false,
				});

				fetchInvitations();
			} catch (error: any) {
				Swal.fire({
					icon: "error",
					title: "Gagal",
					text: error.response?.data?.error || "Gagal merespons undangan",
				});
			} finally {
				setRespondingId(null);
			}
		} else {
			const result = await Swal.fire({
				title: "Terima Undangan?",
				html: `Anda akan menjadi juri di event <strong>${invitation.event.title}</strong>`,
				icon: "question",
				showCancelButton: true,
				confirmButtonColor: "#10B981",
				cancelButtonColor: "#6B7280",
				confirmButtonText: "Ya, Terima",
				cancelButtonText: "Batal",
			});

			if (result.isConfirmed) {
				try {
					setRespondingId(invitation.id);
					await api.patch(`/juries/invitations/${invitation.id}/respond`, {
						accept: true,
					});

					await Swal.fire({
						icon: "success",
						title: "Berhasil!",
						text: "Anda telah menjadi juri di event ini",
						timer: 2000,
						showConfirmButton: false,
					});

					fetchInvitations();
				} catch (error: any) {
					Swal.fire({
						icon: "error",
						title: "Gagal",
						text: error.response?.data?.error || "Gagal merespons undangan",
					});
				} finally {
					setRespondingId(null);
				}
			}
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	};

	const getBackendUrl = () => {
		return import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
	};

	const getImageUrl = (thumbnail: string | null) => {
		if (!thumbnail) return null;
		if (thumbnail.startsWith("http")) return thumbnail;
		return `${getBackendUrl()}${thumbnail}`;
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
						Undangan Event
					</h1>
					<p className="mt-2 text-gray-600 dark:text-gray-400">
						Permintaan untuk menjadi juri di event
					</p>
				</div>

				{invitations.length === 0 ? (
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
						<ClockIcon className="mx-auto h-16 w-16 text-gray-400" />
						<h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
							Tidak Ada Undangan
						</h3>
						<p className="mt-2 text-gray-600 dark:text-gray-400">
							Anda belum memiliki undangan menjadi juri saat ini
						</p>
					</div>
				) : (
					<div className="space-y-6">
						{invitations.map((invitation) => (
							<div
								key={invitation.id}
								className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden"
							>
								<div className="md:flex">
									{/* Event Image */}
									<div className="md:w-1/3">
										<div className="h-48 md:h-full bg-gradient-to-br from-indigo-500 to-purple-600">
											{invitation.event.thumbnail ? (
												<img
													src={getImageUrl(invitation.event.thumbnail) || ""}
													alt={invitation.event.title}
													className="w-full h-full object-cover"
													onError={(e) => {
														e.currentTarget.style.display = "none";
													}}
												/>
											) : (
												<div className="flex items-center justify-center h-full">
													<CalendarIcon className="w-16 h-16 text-white/50" />
												</div>
											)}
										</div>
									</div>

									{/* Event Details */}
									<div className="md:w-2/3 p-6">
										<h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
											{invitation.event.title}
										</h2>

										<div className="space-y-2 mb-4">
											<div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
												<CalendarIcon className="h-4 w-4 mr-2" />
												{formatDate(invitation.event.startDate)}
												{invitation.event.startDate !==
													invitation.event.endDate && (
													<> - {formatDate(invitation.event.endDate)}</>
												)}
											</div>
											{invitation.event.location && (
												<div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
													<MapPinIcon className="h-4 w-4 mr-2" />
													{invitation.event.venue &&
														`${invitation.event.venue}, `}
													{invitation.event.location}
												</div>
											)}
											{invitation.event.organizer && (
												<div className="text-sm text-gray-500 dark:text-gray-400">
													Penyelenggara: {invitation.event.organizer}
												</div>
											)}
										</div>

										{/* Categories */}
										<div className="mb-4">
											<p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
												Kategori yang harus dinilai:
											</p>
											<div className="flex flex-wrap gap-2">
												{invitation.assignedCategories.map((cat) => (
													<span
														key={cat.id}
														className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm rounded-full"
													>
														{cat.assessmentCategory.name}
													</span>
												))}
											</div>
										</div>

										{/* Notes */}
										{invitation.notes && (
											<div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
												<div className="flex items-start gap-2">
													<InformationCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
													<div>
														<p className="text-sm font-medium text-blue-800 dark:text-blue-200">
															Catatan dari Panitia:
														</p>
														<p className="text-sm text-blue-700 dark:text-blue-300">
															{invitation.notes}
														</p>
													</div>
												</div>
											</div>
										)}

										{/* Action Buttons */}
										<div className="flex gap-3">
											<button
												onClick={() => handleRespond(invitation, true)}
												disabled={respondingId === invitation.id}
												className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
											>
												{respondingId === invitation.id ? (
													<>
														<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
														Memproses...
													</>
												) : (
													<>
														<CheckCircleIcon className="h-5 w-5 mr-2" />
														Terima
													</>
												)}
											</button>
											<button
												onClick={() => handleRespond(invitation, false)}
												disabled={respondingId === invitation.id}
												className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
											>
												<XCircleIcon className="h-5 w-5 mr-2" />
												Tolak
											</button>
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

export default JuryInvitations;
