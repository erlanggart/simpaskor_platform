import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../utils/api";
import {
	UserGroupIcon,
	CheckCircleIcon,
	XCircleIcon,
	ArrowLeftIcon,
	AcademicCapIcon,
	UserIcon,
	CalendarIcon,
} from "@heroicons/react/24/outline";
import Swal from "sweetalert2";

interface ParticipationGroup {
	id: string;
	groupName: string;
	teamMembers: number;
	status: string;
	notes: string | null;
}

interface SchoolCategory {
	id: string;
	name: string;
}

interface User {
	id: string;
	name: string;
	email: string;
}

interface EventParticipation {
	id: string;
	eventId: string;
	userId: string;
	schoolCategoryId: string;
	schoolName: string;
	status: string;
	createdAt: string;
	user: User;
	schoolCategory: SchoolCategory;
	groups: ParticipationGroup[];
}

interface Event {
	id: string;
	title: string;
	slug: string;
	schoolCategoryLimits: Array<{
		id: string;
		maxParticipants: number;
		currentParticipants: number;
		schoolCategory: SchoolCategory;
	}>;
}

type TabType = "registrations" | "participants";

const EventParticipantManagement: React.FC = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [activeTab, setActiveTab] = useState<TabType>("registrations");
	const [event, setEvent] = useState<Event | null>(null);
	const [registrations, setRegistrations] = useState<EventParticipation[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedCategory, setSelectedCategory] = useState<string>("all");
	const [statusFilter, setStatusFilter] = useState<string>("REGISTERED");

	useEffect(() => {
		fetchEventDetails();
		fetchRegistrations();
	}, [id]);

	const fetchEventDetails = async () => {
		try {
			const response = await api.get(`/events/${id}`);
			setEvent(response.data);
		} catch (error) {
			console.error("Error fetching event details:", error);
		}
	};

	const fetchRegistrations = async () => {
		try {
			setLoading(true);
			const response = await api.get(`/events/${id}/registrations`);
			setRegistrations(response.data);
		} catch (error) {
			console.error("Error fetching registrations:", error);
			Swal.fire({
				icon: "error",
				title: "Gagal Memuat Data",
				text: "Tidak dapat memuat daftar pendaftaran",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleConfirmRegistration = async (participationId: string) => {
		const result = await Swal.fire({
			title: "Konfirmasi Pendaftaran",
			text: "Apakah Anda yakin ingin menerima pendaftaran ini?",
			icon: "question",
			showCancelButton: true,
			confirmButtonColor: "#10b981",
			cancelButtonColor: "#6b7280",
			confirmButtonText: "Ya, Terima",
			cancelButtonText: "Batal",
		});

		if (result.isConfirmed) {
			try {
				await api.patch(`/registrations/${participationId}/status`, {
					status: "CONFIRMED",
				});

				Swal.fire({
					icon: "success",
					title: "Berhasil",
					text: "Pendaftaran telah diterima",
					timer: 2000,
					showConfirmButton: false,
				});

				fetchRegistrations();
				fetchEventDetails();
			} catch (error: any) {
				Swal.fire({
					icon: "error",
					title: "Gagal",
					text: error.response?.data?.message || "Gagal menerima pendaftaran",
				});
			}
		}
	};

	const handleRejectRegistration = async (participationId: string) => {
		const result = await Swal.fire({
			title: "Tolak Pendaftaran",
			text: "Apakah Anda yakin ingin menolak pendaftaran ini?",
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#ef4444",
			cancelButtonColor: "#6b7280",
			confirmButtonText: "Ya, Tolak",
			cancelButtonText: "Batal",
		});

		if (result.isConfirmed) {
			try {
				await api.patch(`/registrations/${participationId}/status`, {
					status: "CANCELLED",
				});

				Swal.fire({
					icon: "success",
					title: "Berhasil",
					text: "Pendaftaran telah ditolak",
					timer: 2000,
					showConfirmButton: false,
				});

				fetchRegistrations();
				fetchEventDetails();
			} catch (error: any) {
				Swal.fire({
					icon: "error",
					title: "Gagal",
					text: error.response?.data?.message || "Gagal menolak pendaftaran",
				});
			}
		}
	};

	// Filter for registrations tab
	const filteredRegistrations = registrations.filter((reg) => {
		const statusMatch =
			statusFilter === "all" ? true : reg.status === statusFilter;
		const categoryMatch =
			selectedCategory === "all"
				? true
				: reg.schoolCategoryId === selectedCategory;
		return statusMatch && categoryMatch;
	});

	// Filter for participants tab (only CONFIRMED)
	const confirmedParticipants = registrations.filter(
		(reg) => reg.status === "CONFIRMED"
	);

	// Group participants by category
	const participantsByCategory = confirmedParticipants.reduce((acc, participant) => {
		const categoryId = participant.schoolCategoryId;
		if (!acc[categoryId]) {
			acc[categoryId] = [];
		}
		acc[categoryId].push(participant);
		return acc;
	}, {} as Record<string, EventParticipation[]>);

	// Sort participants by registration date
	Object.keys(participantsByCategory).forEach((categoryId) => {
		const categoryParticipants = participantsByCategory[categoryId];
		if (categoryParticipants) {
			categoryParticipants.sort(
				(a, b) =>
					new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
			);
		}
	});

	const filteredCategories =
		selectedCategory === "all"
			? Object.entries(participantsByCategory)
			: Object.entries(participantsByCategory).filter(
					([catId]) => catId === selectedCategory
			  );

	// Statistics
	const stats = {
		total: registrations.length,
		pending: registrations.filter((r) => r.status === "REGISTERED").length,
		confirmed: registrations.filter((r) => r.status === "CONFIRMED").length,
		cancelled: registrations.filter((r) => r.status === "CANCELLED").length,
	};

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "REGISTERED":
				return (
					<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
						Menunggu
					</span>
				);
			case "CONFIRMED":
				return (
					<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
						Diterima
					</span>
				);
			case "CANCELLED":
				return (
					<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
						Ditolak
					</span>
				);
			default:
				return null;
		}
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
				<button
					onClick={() => navigate(-1)}
					className="mb-4 inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
				>
					<ArrowLeftIcon className="h-5 w-5 mr-2" />
					Kembali
				</button>

				<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
					Kelola Peserta Event
				</h1>
				{event && (
					<p className="mt-2 text-gray-600 dark:text-gray-400">{event.title}</p>
				)}
			</div>

			{/* Tabs */}
			<div className="mb-6 border-b border-gray-200 dark:border-gray-700">
				<nav className="-mb-px flex space-x-8">
					<button
						onClick={() => setActiveTab("registrations")}
						className={`py-4 px-1 border-b-2 font-medium text-sm ${
							activeTab === "registrations"
								? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
								: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
						}`}
					>
						<div className="flex items-center gap-2">
							<CheckCircleIcon className="h-5 w-5" />
							<span>Kelola Pendaftaran</span>
							{stats.pending > 0 && (
								<span className="bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full">
									{stats.pending}
								</span>
							)}
						</div>
					</button>
					<button
						onClick={() => setActiveTab("participants")}
						className={`py-4 px-1 border-b-2 font-medium text-sm ${
							activeTab === "participants"
								? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
								: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
						}`}
					>
						<div className="flex items-center gap-2">
							<UserGroupIcon className="h-5 w-5" />
							<span>Daftar Peserta</span>
							<span className="bg-indigo-500 text-white text-xs font-bold px-2 py-1 rounded-full">
								{stats.confirmed}
							</span>
						</div>
					</button>
				</nav>
			</div>

			{/* Tab Content */}
			{activeTab === "registrations" ? (
				<>
					{/* Statistics */}
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
						<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600 dark:text-gray-400">
										Total
									</p>
									<p className="text-2xl font-bold text-gray-900 dark:text-white">
										{stats.total}
									</p>
								</div>
								<UserGroupIcon className="h-10 w-10 text-indigo-600" />
							</div>
						</div>

						<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600 dark:text-gray-400">
										Menunggu
									</p>
									<p className="text-2xl font-bold text-yellow-600">
										{stats.pending}
									</p>
								</div>
								<CalendarIcon className="h-10 w-10 text-yellow-400" />
							</div>
						</div>

						<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600 dark:text-gray-400">
										Diterima
									</p>
									<p className="text-2xl font-bold text-green-600">
										{stats.confirmed}
									</p>
								</div>
								<CheckCircleIcon className="h-10 w-10 text-green-400" />
							</div>
						</div>

						<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600 dark:text-gray-400">
										Ditolak
									</p>
									<p className="text-2xl font-bold text-red-600">
										{stats.cancelled}
									</p>
								</div>
								<XCircleIcon className="h-10 w-10 text-red-400" />
							</div>
						</div>
					</div>

					{/* Filters */}
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
									Status
								</label>
								<select
									value={statusFilter}
									onChange={(e) => setStatusFilter(e.target.value)}
									className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
								>
									<option value="REGISTERED">Menunggu</option>
									<option value="CONFIRMED">Diterima</option>
									<option value="CANCELLED">Ditolak</option>
									<option value="all">Semua Status</option>
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
									Kategori
								</label>
								<select
									value={selectedCategory}
									onChange={(e) => setSelectedCategory(e.target.value)}
									className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
								>
									<option value="all">Semua Kategori</option>
									{event?.schoolCategoryLimits.map((limit) => (
										<option key={limit.id} value={limit.schoolCategory.id}>
											{limit.schoolCategory.name}
										</option>
									))}
								</select>
							</div>
						</div>
					</div>

					{/* Registrations List */}
					<div className="space-y-4">
						{filteredRegistrations.length === 0 ? (
							<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
								<UserGroupIcon className="mx-auto h-16 w-16 text-gray-400" />
								<h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
									Tidak Ada Data
								</h3>
								<p className="mt-2 text-gray-600 dark:text-gray-400">
									Tidak ada pendaftaran yang sesuai dengan filter
								</p>
							</div>
						) : (
							filteredRegistrations.map((registration) => (
								<div
									key={registration.id}
									className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
								>
									<div className="flex items-start justify-between mb-4">
										<div className="flex-1">
											<div className="flex items-center gap-3 mb-2">
												<UserIcon className="h-6 w-6 text-indigo-600" />
												<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
													{registration.schoolName}
												</h3>
												{getStatusBadge(registration.status)}
											</div>
											<p className="text-sm text-gray-600 dark:text-gray-400">
												Penanggung Jawab: {registration.user.name} (
												{registration.user.email})
											</p>
											<p className="text-sm text-gray-600 dark:text-gray-400">
												Kategori: {registration.schoolCategory.name}
											</p>
											<p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
												Didaftarkan:{" "}
												{new Date(registration.createdAt).toLocaleDateString("id-ID", {
													year: "numeric",
													month: "long",
													day: "numeric",
													hour: "2-digit",
													minute: "2-digit",
												})}
											</p>
										</div>

										{registration.status === "REGISTERED" && (
											<div className="flex gap-2">
												<button
													onClick={() => handleConfirmRegistration(registration.id)}
													className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
												>
													<CheckCircleIcon className="h-5 w-5 mr-2" />
													Terima
												</button>
												<button
													onClick={() => handleRejectRegistration(registration.id)}
													className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
												>
													<XCircleIcon className="h-5 w-5 mr-2" />
													Tolak
												</button>
											</div>
										)}
									</div>

									{/* Groups */}
									<div className="border-t border-gray-200 dark:border-gray-700 pt-4">
										<h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
											Daftar Grup/Tim ({registration.groups.length})
										</h4>
										<div className="space-y-2">
											{registration.groups.map((group) => (
												<div
													key={group.id}
													className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
												>
													<div className="flex items-center gap-3">
														<UserGroupIcon className="h-5 w-5 text-indigo-600" />
														<div>
															<p className="font-medium text-gray-900 dark:text-white">
																{group.groupName}
															</p>
															<p className="text-sm text-gray-600 dark:text-gray-400">
																{group.teamMembers} anggota
															</p>
															{group.notes && (
																<p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
																	{group.notes}
																</p>
															)}
														</div>
													</div>
													<span
														className={`px-3 py-1 rounded-full text-xs font-medium ${
															group.status === "ACTIVE"
																? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
																: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
														}`}
													>
														{group.status === "ACTIVE" ? "Aktif" : "Tidak Aktif"}
													</span>
												</div>
											))}
										</div>
									</div>
								</div>
							))
						)}
					</div>
				</>
			) : (
				<>
					{/* Category Stats */}
					{event && (
						<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
							{event.schoolCategoryLimits.map((limit) => {
								const categoryParticipants =
									participantsByCategory[limit.schoolCategory.id] || [];
								const totalGroups = categoryParticipants.reduce(
									(sum, p) => sum + p.groups.filter((g) => g.status === "ACTIVE").length,
									0
								);

								return (
									<div
										key={limit.id}
										className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
									>
										<div className="flex items-center justify-between mb-2">
											<AcademicCapIcon className="h-8 w-8 text-indigo-600" />
											<button
												onClick={() => setSelectedCategory(limit.schoolCategory.id)}
												className="text-sm text-indigo-600 hover:underline"
											>
												Filter
											</button>
										</div>
										<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
											{limit.schoolCategory.name}
										</h3>
										<p className="text-2xl font-bold text-indigo-600">
											{totalGroups} / {limit.maxParticipants}
										</p>
										<p className="text-xs text-gray-500">
											{categoryParticipants.length} sekolah
										</p>
									</div>
								);
							})}
						</div>
					)}

					{/* Category Filter */}
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
						<select
							value={selectedCategory}
							onChange={(e) => setSelectedCategory(e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
						>
							<option value="all">Semua Kategori</option>
							{event?.schoolCategoryLimits.map((limit) => (
								<option key={limit.id} value={limit.schoolCategory.id}>
									{limit.schoolCategory.name}
								</option>
							))}
						</select>
					</div>

					{/* Participants by Category */}
					{filteredCategories.length === 0 ? (
						<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
							<UserGroupIcon className="mx-auto h-16 w-16 text-gray-400" />
							<h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
								Belum Ada Peserta
							</h3>
							<p className="mt-2 text-gray-600 dark:text-gray-400">
								Belum ada peserta yang dikonfirmasi untuk kategori ini
							</p>
						</div>
					) : (
						<div className="space-y-8">
							{filteredCategories.map(([categoryId, categoryParticipants]) => {
								const category =
									event?.schoolCategoryLimits.find(
										(l) => l.schoolCategory.id === categoryId
									)?.schoolCategory;

								let currentNumber = 1;

								return (
									<div
										key={categoryId}
										className="bg-white dark:bg-gray-800 rounded-lg shadow"
									>
										<div className="p-6 border-b border-gray-200 dark:border-gray-700">
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-3">
													<AcademicCapIcon className="h-6 w-6 text-indigo-600" />
													<h2 className="text-xl font-bold text-gray-900 dark:text-white">
														Kategori {category?.name}
													</h2>
												</div>
												<span className="text-sm text-gray-500">
													{categoryParticipants.length} sekolah terdaftar
												</span>
											</div>
										</div>

										<div className="p-6">
											<div className="space-y-4">
												{categoryParticipants.map((participant) => {
													const activeGroups = participant.groups.filter(
														(g) => g.status === "ACTIVE"
													);

													return (
														<div
															key={participant.id}
															className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
														>
															<div className="flex items-start justify-between mb-3">
																<div className="flex-1">
																	<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
																		{participant.schoolName}
																	</h3>
																	<p className="text-sm text-gray-600 dark:text-gray-400">
																		{participant.user.name} ({participant.user.email})
																	</p>
																</div>
															</div>

															<div className="space-y-2">
																{activeGroups.map((group) => {
																	const groupNumber = currentNumber++;
																	return (
																		<div
																			key={group.id}
																			className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
																		>
																			<div className="flex items-center justify-center w-12 h-12 bg-indigo-600 text-white rounded-full font-bold text-lg">
																				{groupNumber}
																			</div>
																			<div className="flex-1">
																				<div className="flex items-center gap-2">
																					<UserGroupIcon className="h-5 w-5 text-indigo-600" />
																					<span className="font-medium text-gray-900 dark:text-white">
																						{group.groupName}
																					</span>
																					<span className="text-sm text-gray-600 dark:text-gray-400">
																						({group.teamMembers} anggota)
																					</span>
																				</div>
																				{group.notes && (
																					<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
																						{group.notes}
																					</p>
																				)}
																			</div>
																			<div className="text-right">
																				<div className="text-xs text-gray-500 dark:text-gray-400">
																					Nomor Urut
																				</div>
																				<div className="text-2xl font-bold text-indigo-600">
																					{groupNumber}
																				</div>
																			</div>
																		</div>
																	);
																})}
															</div>
														</div>
													);
												})}
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</>
			)}
		</div>
	);
};

export default EventParticipantManagement;
