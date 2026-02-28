import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
	UserPlusIcon,
	UserGroupIcon,
	CheckCircleIcon,
	XCircleIcon,
	ClockIcon,
	TrashIcon,
	MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../utils/api";
import Swal from "sweetalert2";

interface JuryUser {
	id: string;
	name: string;
	email: string;
	phone: string | null;
	profile: {
		avatar: string | null;
		institution: string | null;
		city: string | null;
		province: string | null;
	} | null;
}

interface AssessmentCategory {
	id: string;
	name: string;
	description: string | null;
}

interface JuryAssignment {
	id: string;
	status: string;
	invitedAt: string;
	respondedAt: string | null;
	rejectionReason: string | null;
	notes: string | null;
	jury: {
		id: string;
		name: string;
		email: string;
		phone: string | null;
		profile: {
			avatar: string | null;
			institution: string | null;
		} | null;
	};
	assignedCategories: {
		id: string;
		assessmentCategory: AssessmentCategory;
	}[];
}

interface EventCategory {
	id: string;
	assessmentCategoryId: string;
	assessmentCategory: AssessmentCategory;
}

const ManageJury: React.FC = () => {
	const { eventSlug } = useParams<{ eventSlug: string }>();
	const [juries, setJuries] = useState<JuryUser[]>([]);
	const [assignments, setAssignments] = useState<JuryAssignment[]>([]);
	const [eventCategories, setEventCategories] = useState<EventCategory[]>([]);
	const [eventId, setEventId] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [showInviteModal, setShowInviteModal] = useState(false);
	const [selectedJury, setSelectedJury] = useState<JuryUser | null>(null);
	const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
	const [inviteNotes, setInviteNotes] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		fetchData();
	}, [eventSlug]);

	const fetchData = async () => {
		try {
			setLoading(true);

			// Get current assignment to get event ID
			const assignmentResponse = await api.get("/panitia-assignment/current");
			if (!assignmentResponse.data || !assignmentResponse.data.event) {
				return;
			}

			const event = assignmentResponse.data.event;
			setEventId(event.id);
			setEventCategories(event.assessmentCategories || []);

			// Fetch all available juries
			const juriesResponse = await api.get("/juries");
			setJuries(juriesResponse.data);

			// Fetch event jury assignments
			const assignmentsResponse = await api.get(`/juries/event/${event.id}`);
			setAssignments(assignmentsResponse.data);
		} catch (error) {
			console.error("Error fetching data:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleInviteJury = async () => {
		if (!selectedJury || !eventId || selectedCategories.length === 0) {
			Swal.fire({
				icon: "warning",
				title: "Perhatian",
				text: "Pilih minimal satu kategori penilaian",
			});
			return;
		}

		try {
			setSubmitting(true);

			await api.post("/juries/invite", {
				eventId,
				juryId: selectedJury.id,
				categoryIds: selectedCategories,
				notes: inviteNotes || null,
			});

			await Swal.fire({
				icon: "success",
				title: "Berhasil",
				text: `Undangan telah dikirim ke ${selectedJury.name}`,
				timer: 2000,
				showConfirmButton: false,
			});

			setShowInviteModal(false);
			setSelectedJury(null);
			setSelectedCategories([]);
			setInviteNotes("");
			fetchData();
		} catch (error: any) {
			Swal.fire({
				icon: "error",
				title: "Gagal",
				text: error.response?.data?.error || "Gagal mengirim undangan",
			});
		} finally {
			setSubmitting(false);
		}
	};

	const handleRemoveJury = async (assignment: JuryAssignment) => {
		const result = await Swal.fire({
			title: "Hapus Juri?",
			html: `Yakin ingin menghapus <strong>${assignment.jury.name}</strong> dari event ini?`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#EF4444",
			cancelButtonColor: "#6B7280",
			confirmButtonText: "Ya, Hapus",
			cancelButtonText: "Batal",
		});

		if (result.isConfirmed) {
			try {
				await api.delete(`/juries/assignments/${assignment.id}`);

				await Swal.fire({
					icon: "success",
					title: "Berhasil",
					text: "Juri telah dihapus dari event",
					timer: 2000,
					showConfirmButton: false,
				});

				fetchData();
			} catch (error: any) {
				Swal.fire({
					icon: "error",
					title: "Gagal",
					text: error.response?.data?.error || "Gagal menghapus juri",
				});
			}
		}
	};

	const openInviteModal = (jury: JuryUser) => {
		setSelectedJury(jury);
		setSelectedCategories([]);
		setInviteNotes("");
		setShowInviteModal(true);
	};

	const toggleCategory = (categoryId: string) => {
		setSelectedCategories((prev) =>
			prev.includes(categoryId)
				? prev.filter((id) => id !== categoryId)
				: [...prev, categoryId]
		);
	};

	const getStatusBadge = (status: string) => {
		const statusConfig = {
			PENDING: {
				bg: "bg-yellow-100 dark:bg-yellow-900",
				text: "text-yellow-800 dark:text-yellow-200",
				icon: <ClockIcon className="h-4 w-4" />,
				label: "Menunggu",
			},
			CONFIRMED: {
				bg: "bg-green-100 dark:bg-green-900",
				text: "text-green-800 dark:text-green-200",
				icon: <CheckCircleIcon className="h-4 w-4" />,
				label: "Dikonfirmasi",
			},
			REJECTED: {
				bg: "bg-red-100 dark:bg-red-900",
				text: "text-red-800 dark:text-red-200",
				icon: <XCircleIcon className="h-4 w-4" />,
				label: "Ditolak",
			},
		};

		const config =
			statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;

		return (
			<span
				className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}
			>
				{config.icon}
				{config.label}
			</span>
		);
	};

	const getBackendUrl = () => {
		return import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
	};

	const getAvatarUrl = (avatar: string | null) => {
		if (!avatar) return null;
		if (avatar.startsWith("http")) return avatar;
		return `${getBackendUrl()}${avatar}`;
	};

	// Filter juries that are not already assigned
	const availableJuries = juries.filter(
		(jury) => !assignments.some((a) => a.jury.id === jury.id)
	);

	const filteredJuries = availableJuries.filter(
		(jury) =>
			jury.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			jury.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
			jury.profile?.institution?.toLowerCase().includes(searchQuery.toLowerCase())
	);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
						Kelola Juri
					</h1>
					<p className="mt-2 text-gray-600 dark:text-gray-400">
						Undang dan kelola juri untuk menilai peserta event
					</p>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Assigned Juries Section */}
					<div className="lg:col-span-2">
						<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
							<div className="flex items-center justify-between mb-6">
								<h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
									<UserGroupIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
									Juri Event ({assignments.length})
								</h2>
							</div>

							{assignments.length === 0 ? (
								<div className="text-center py-12">
									<UserGroupIcon className="mx-auto h-16 w-16 text-gray-400" />
									<p className="mt-4 text-gray-600 dark:text-gray-400">
										Belum ada juri yang diundang
									</p>
									<p className="text-sm text-gray-500 dark:text-gray-500">
										Pilih juri dari daftar di samping untuk mengundang
									</p>
								</div>
							) : (
								<div className="space-y-4">
									{assignments.map((assignment) => (
										<div
											key={assignment.id}
											className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
										>
											<div className="flex items-start justify-between">
												<div className="flex items-start gap-4">
													{assignment.jury.profile?.avatar ? (
														<img
															src={getAvatarUrl(assignment.jury.profile.avatar) || ""}
															alt={assignment.jury.name}
															className="w-12 h-12 rounded-full object-cover"
														/>
													) : (
														<div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
															<span className="text-indigo-600 dark:text-indigo-400 font-bold text-lg">
																{assignment.jury.name.charAt(0).toUpperCase()}
															</span>
														</div>
													)}
													<div>
														<h3 className="font-semibold text-gray-900 dark:text-white">
															{assignment.jury.name}
														</h3>
														<p className="text-sm text-gray-600 dark:text-gray-400">
															{assignment.jury.email}
														</p>
														{assignment.jury.profile?.institution && (
															<p className="text-sm text-gray-500 dark:text-gray-500">
																{assignment.jury.profile.institution}
															</p>
														)}
													</div>
												</div>
												<div className="flex items-center gap-2">
													{getStatusBadge(assignment.status)}
													<button
														onClick={() => handleRemoveJury(assignment)}
														className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
														title="Hapus dari event"
													>
														<TrashIcon className="h-5 w-5" />
													</button>
												</div>
											</div>

											{/* Categories */}
											<div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
												<p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
													Kategori Penilaian:
												</p>
												<div className="flex flex-wrap gap-2">
													{assignment.assignedCategories.map((cat) => (
														<span
															key={cat.id}
															className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs rounded-full"
														>
															{cat.assessmentCategory.name}
														</span>
													))}
												</div>
											</div>

											{/* Rejection reason if rejected */}
											{assignment.status === "REJECTED" &&
												assignment.rejectionReason && (
													<div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
														<p className="text-sm text-red-700 dark:text-red-300">
															<strong>Alasan penolakan:</strong>{" "}
															{assignment.rejectionReason}
														</p>
													</div>
												)}
										</div>
									))}
								</div>
							)}
						</div>
					</div>

					{/* Available Juries Section */}
					<div className="lg:col-span-1">
						<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sticky top-4">
							<h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
								Daftar Juri Tersedia
							</h2>

							{/* Search */}
							<div className="relative mb-4">
								<MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
								<input
									type="text"
									placeholder="Cari juri..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
								/>
							</div>

							{filteredJuries.length === 0 ? (
								<div className="text-center py-8">
									<p className="text-gray-600 dark:text-gray-400 text-sm">
										{availableJuries.length === 0
											? "Semua juri sudah diundang"
											: "Tidak ada juri yang cocok"}
									</p>
								</div>
							) : (
								<div className="space-y-3 max-h-[60vh] overflow-y-auto">
									{filteredJuries.map((jury) => (
										<div
											key={jury.id}
											className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
										>
											<div className="flex items-center gap-3">
												{jury.profile?.avatar ? (
													<img
														src={getAvatarUrl(jury.profile.avatar) || ""}
														alt={jury.name}
														className="w-10 h-10 rounded-full object-cover"
													/>
												) : (
													<div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
														<span className="text-gray-600 dark:text-gray-300 font-medium">
															{jury.name.charAt(0).toUpperCase()}
														</span>
													</div>
												)}
												<div>
													<p className="font-medium text-gray-900 dark:text-white text-sm">
														{jury.name}
													</p>
													<p className="text-xs text-gray-500 dark:text-gray-400">
														{jury.profile?.institution || jury.email}
													</p>
												</div>
											</div>
											<button
												onClick={() => openInviteModal(jury)}
												className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
												title="Undang juri"
											>
												<UserPlusIcon className="h-5 w-5" />
											</button>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Invite Modal */}
			{showInviteModal && selectedJury && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
						<h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
							Undang Juri
						</h3>

						<div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
							<div className="flex items-center gap-3">
								{selectedJury.profile?.avatar ? (
									<img
										src={getAvatarUrl(selectedJury.profile.avatar) || ""}
										alt={selectedJury.name}
										className="w-12 h-12 rounded-full object-cover"
									/>
								) : (
									<div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
										<span className="text-indigo-600 dark:text-indigo-400 font-bold text-lg">
											{selectedJury.name.charAt(0).toUpperCase()}
										</span>
									</div>
								)}
								<div>
									<p className="font-semibold text-gray-900 dark:text-white">
										{selectedJury.name}
									</p>
									<p className="text-sm text-gray-600 dark:text-gray-400">
										{selectedJury.email}
									</p>
								</div>
							</div>
						</div>

						<div className="mb-4">
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Pilih Kategori Penilaian *
							</label>
							<div className="space-y-2 max-h-48 overflow-y-auto">
								{eventCategories.map((cat) => (
									<label
										key={cat.id}
										className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer"
									>
										<input
											type="checkbox"
											checked={selectedCategories.includes(
												cat.assessmentCategoryId
											)}
											onChange={() =>
												toggleCategory(cat.assessmentCategoryId)
											}
											className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
										/>
										<span className="ml-3 text-gray-900 dark:text-white">
											{cat.assessmentCategory.name}
										</span>
									</label>
								))}
							</div>
						</div>

						<div className="mb-6">
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Catatan (Opsional)
							</label>
							<textarea
								value={inviteNotes}
								onChange={(e) => setInviteNotes(e.target.value)}
								placeholder="Tambahkan catatan untuk juri..."
								rows={3}
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
							/>
						</div>

						<div className="flex gap-3">
							<button
								onClick={() => setShowInviteModal(false)}
								className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
							>
								Batal
							</button>
							<button
								onClick={handleInviteJury}
								disabled={submitting || selectedCategories.length === 0}
								className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								{submitting ? "Mengirim..." : "Kirim Undangan"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default ManageJury;
