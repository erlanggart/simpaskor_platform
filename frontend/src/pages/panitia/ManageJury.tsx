import React, { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import {
	UserPlusIcon,
	UserGroupIcon,
	CheckCircleIcon,
	XCircleIcon,
	ClockIcon,
	TrashIcon,
	MagnifyingGlassIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
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

interface Pagination {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

type TabType = "confirmed" | "search";

const ManageJury: React.FC = () => {
	const { eventSlug } = useParams<{ eventSlug: string }>();
	const location = useLocation();
	const [activeTab, setActiveTab] = useState<TabType>("confirmed");
	
	// Detect admin vs panitia route
	const isAdminRoute = location.pathname.startsWith("/admin");
	const storageKey = isAdminRoute ? "admin_active_event" : "panitia_active_event";
	
	// Event data
	const [eventCategories, setEventCategories] = useState<EventCategory[]>([]);
	const [eventId, setEventId] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	
	// Assignments
	const [confirmedAssignments, setConfirmedAssignments] = useState<JuryAssignment[]>([]);
	const [pendingAssignments, setPendingAssignments] = useState<JuryAssignment[]>([]);
	const [rejectedAssignments, setRejectedAssignments] = useState<JuryAssignment[]>([]);
	
	// Available juries with pagination
	const [availableJuries, setAvailableJuries] = useState<JuryUser[]>([]);
	const [juryPagination, setJuryPagination] = useState<Pagination>({
		page: 1,
		limit: 10,
		total: 0,
		totalPages: 0,
	});
	const [searchQuery, setSearchQuery] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [loadingJuries, setLoadingJuries] = useState(false);
	
	// Invite modal
	const [showInviteModal, setShowInviteModal] = useState(false);
	const [selectedJury, setSelectedJury] = useState<JuryUser | null>(null);
	const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
	const [inviteNotes, setInviteNotes] = useState("");
	const [submitting, setSubmitting] = useState(false);

	// Initial fetch
	useEffect(() => {
		fetchEventData();
	}, [eventSlug]);

	// Fetch juries when tab changes to search or pagination/search changes
	useEffect(() => {
		if (activeTab === "search" && eventId) {
			fetchAvailableJuries();
		}
	}, [activeTab, eventId, juryPagination.page, searchQuery]);

	const fetchEventData = async () => {
		try {
			setLoading(true);

			// Verify access from localStorage (check both admin and panitia keys)
			const stored = localStorage.getItem(storageKey);
			if (!stored && !isAdminRoute) {
				return;
			}

			if (stored) {
				const storedEvent = JSON.parse(stored);
				if (storedEvent.slug !== eventSlug) {
					localStorage.setItem(
						storageKey,
						JSON.stringify({ slug: eventSlug, title: "", id: "" })
					);
				}
			}

			// Fetch event by slug
			const eventResponse = await api.get(`/events/${eventSlug}`);
			if (!eventResponse.data) {
				return;
			}

			const event = eventResponse.data;
			setEventId(event.id);
			setEventCategories(event.assessmentCategories || []);

			// Update localStorage with full event data
			localStorage.setItem(
				storageKey,
				JSON.stringify({ slug: event.slug, title: event.title, id: event.id })
			);

			// Fetch event jury assignments
			const assignmentsResponse = await api.get(`/juries/event/${event.id}`);
			const allAssignments: JuryAssignment[] = assignmentsResponse.data;
			
			// Separate by status
			setConfirmedAssignments(allAssignments.filter(a => a.status === "CONFIRMED"));
			setPendingAssignments(allAssignments.filter(a => a.status === "PENDING"));
			setRejectedAssignments(allAssignments.filter(a => a.status === "REJECTED"));
		} catch (error) {
			console.error("Error fetching data:", error);
		} finally {
			setLoading(false);
		}
	};

	const fetchAvailableJuries = useCallback(async () => {
		if (!eventId) return;
		
		try {
			setLoadingJuries(true);
			
			const params = new URLSearchParams({
				page: juryPagination.page.toString(),
				limit: juryPagination.limit.toString(),
				excludeEventId: eventId,
			});
			
			if (searchQuery) {
				params.append("search", searchQuery);
			}

			const response = await api.get(`/juries?${params.toString()}`);
			setAvailableJuries(response.data.data);
			setJuryPagination(response.data.pagination);
		} catch (error) {
			console.error("Error fetching juries:", error);
		} finally {
			setLoadingJuries(false);
		}
	}, [eventId, juryPagination.page, searchQuery]);

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		setSearchQuery(searchInput);
		setJuryPagination(prev => ({ ...prev, page: 1 }));
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
			
			// Refresh data
			fetchEventData();
			fetchAvailableJuries();
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

				fetchEventData();
				if (activeTab === "search") {
					fetchAvailableJuries();
				}
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
				bg: "bg-yellow-100 dark:bg-yellow-900/50",
				text: "text-yellow-800 dark:text-yellow-200",
				icon: <ClockIcon className="h-4 w-4" />,
				label: "Menunggu",
			},
			CONFIRMED: {
				bg: "bg-green-100 dark:bg-green-900/50",
				text: "text-green-800 dark:text-green-200",
				icon: <CheckCircleIcon className="h-4 w-4" />,
				label: "Dikonfirmasi",
			},
			REJECTED: {
				bg: "bg-red-100 dark:bg-red-900/50",
				text: "text-red-800 dark:text-red-200",
				icon: <XCircleIcon className="h-4 w-4" />,
				label: "Ditolak",
			},
		};

		const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;

		return (
			<span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
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

	const goToPage = (page: number) => {
		if (page >= 1 && page <= juryPagination.totalPages) {
			setJuryPagination(prev => ({ ...prev, page }));
		}
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

				{/* Tabs */}
				<div className="mb-6">
					<div className="border-b border-gray-200 dark:border-gray-700">
						<nav className="flex gap-4">
							<button
								onClick={() => setActiveTab("confirmed")}
								className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
									activeTab === "confirmed"
										? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
										: "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
								}`}
							>
								<span className="flex items-center gap-2">
									<CheckCircleIcon className="h-5 w-5" />
									Juri Terkonfirmasi ({confirmedAssignments.length})
								</span>
							</button>
							<button
								onClick={() => setActiveTab("search")}
								className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
									activeTab === "search"
										? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
										: "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
								}`}
							>
								<span className="flex items-center gap-2">
									<MagnifyingGlassIcon className="h-5 w-5" />
									Cari & Undang Juri
									{pendingAssignments.length > 0 && (
										<span className="bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 text-xs px-2 py-0.5 rounded-full">
											{pendingAssignments.length} pending
										</span>
									)}
								</span>
							</button>
						</nav>
					</div>
				</div>

				{/* Tab Content */}
				{activeTab === "confirmed" && (
					<ConfirmedJuriesTab
						assignments={confirmedAssignments}
						onRemove={handleRemoveJury}
						getAvatarUrl={getAvatarUrl}
						getStatusBadge={getStatusBadge}
					/>
				)}

				{activeTab === "search" && (
					<SearchJuriesTab
						availableJuries={availableJuries}
						pendingAssignments={pendingAssignments}
						rejectedAssignments={rejectedAssignments}
						pagination={juryPagination}
						loading={loadingJuries}
						searchInput={searchInput}
						onSearchInputChange={setSearchInput}
						onSearch={handleSearch}
						onPageChange={goToPage}
						onInvite={openInviteModal}
						onRemove={handleRemoveJury}
						getAvatarUrl={getAvatarUrl}
					/>
				)}
			</div>

			{/* Invite Modal */}
			{showInviteModal && selectedJury && (
				<InviteModal
					jury={selectedJury}
					categories={eventCategories}
					selectedCategories={selectedCategories}
					notes={inviteNotes}
					submitting={submitting}
					onToggleCategory={toggleCategory}
					onNotesChange={setInviteNotes}
					onClose={() => setShowInviteModal(false)}
					onSubmit={handleInviteJury}
					getAvatarUrl={getAvatarUrl}
				/>
			)}
		</div>
	);
};

// ============================================================================
// Sub-components
// ============================================================================

interface ConfirmedJuriesTabProps {
	assignments: JuryAssignment[];
	onRemove: (assignment: JuryAssignment) => void;
	getAvatarUrl: (avatar: string | null) => string | null;
	getStatusBadge: (status: string) => React.ReactNode;
}

const ConfirmedJuriesTab: React.FC<ConfirmedJuriesTabProps> = ({
	assignments,
	onRemove,
	getAvatarUrl,
	getStatusBadge,
}) => {
	if (assignments.length === 0) {
		return (
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
				<UserGroupIcon className="mx-auto h-16 w-16 text-gray-400" />
				<h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
					Belum Ada Juri Terkonfirmasi
				</h3>
				<p className="mt-2 text-gray-600 dark:text-gray-400">
					Undang juri dari tab "Cari & Undang Juri" dan tunggu konfirmasi mereka
				</p>
			</div>
		);
	}

	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
			<div className="p-6 border-b border-gray-200 dark:border-gray-700">
				<h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
					<UserGroupIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
					Juri yang Sudah Terkonfirmasi
				</h2>
			</div>
			<div className="divide-y divide-gray-200 dark:divide-gray-700">
				{assignments.map((assignment) => (
					<JuryAssignmentCard
						key={assignment.id}
						assignment={assignment}
						onRemove={onRemove}
						getAvatarUrl={getAvatarUrl}
						getStatusBadge={getStatusBadge}
					/>
				))}
			</div>
		</div>
	);
};

interface SearchJuriesTabProps {
	availableJuries: JuryUser[];
	pendingAssignments: JuryAssignment[];
	rejectedAssignments: JuryAssignment[];
	pagination: Pagination;
	loading: boolean;
	searchInput: string;
	onSearchInputChange: (value: string) => void;
	onSearch: (e: React.FormEvent) => void;
	onPageChange: (page: number) => void;
	onInvite: (jury: JuryUser) => void;
	onRemove: (assignment: JuryAssignment) => void;
	getAvatarUrl: (avatar: string | null) => string | null;
}

const SearchJuriesTab: React.FC<SearchJuriesTabProps> = ({
	availableJuries,
	pendingAssignments,
	rejectedAssignments,
	pagination,
	loading,
	searchInput,
	onSearchInputChange,
	onSearch,
	onPageChange,
	onInvite,
	onRemove,
	getAvatarUrl,
}) => {
	return (
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
			{/* Left: Search and Available Juries */}
			<div className="lg:col-span-2 space-y-6">
				{/* Search Box */}
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
					<h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
						Cari Juri
					</h2>
					<form onSubmit={onSearch} className="flex gap-3">
						<div className="relative flex-1">
							<MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
							<input
								type="text"
								placeholder="Cari berdasarkan nama, email, atau institusi..."
								value={searchInput}
								onChange={(e) => onSearchInputChange(e.target.value)}
								className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
							/>
						</div>
						<button
							type="submit"
							className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
						>
							Cari
						</button>
					</form>
				</div>

				{/* Available Juries List */}
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
					<div className="p-6 border-b border-gray-200 dark:border-gray-700">
						<h2 className="text-lg font-bold text-gray-900 dark:text-white">
							Daftar Juri Tersedia ({pagination.total})
						</h2>
					</div>

					{loading ? (
						<div className="p-12 text-center">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
						</div>
					) : availableJuries.length === 0 ? (
						<div className="p-12 text-center">
							<p className="text-gray-600 dark:text-gray-400">
								Tidak ada juri yang tersedia
							</p>
						</div>
					) : (
						<>
							<div className="divide-y divide-gray-200 dark:divide-gray-700">
								{availableJuries.map((jury) => (
									<div
										key={jury.id}
										className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
									>
										<div className="flex items-center gap-4">
											{jury.profile?.avatar ? (
												<img
													src={getAvatarUrl(jury.profile.avatar) || ""}
													alt={jury.name}
													className="w-12 h-12 rounded-full object-cover"
												/>
											) : (
												<div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
													<span className="text-gray-600 dark:text-gray-300 font-bold text-lg">
														{jury.name.charAt(0).toUpperCase()}
													</span>
												</div>
											)}
											<div>
												<p className="font-semibold text-gray-900 dark:text-white">
													{jury.name}
												</p>
												<p className="text-sm text-gray-600 dark:text-gray-400">
													{jury.email}
												</p>
												{jury.profile?.institution && (
													<p className="text-sm text-gray-500 dark:text-gray-500">
														{jury.profile.institution}
													</p>
												)}
											</div>
										</div>
										<button
											onClick={() => onInvite(jury)}
											className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
										>
											<UserPlusIcon className="h-5 w-5" />
											Undang
										</button>
									</div>
								))}
							</div>

							{/* Pagination */}
							{pagination.totalPages > 1 && (
								<div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
									<p className="text-sm text-gray-600 dark:text-gray-400">
										Halaman {pagination.page} dari {pagination.totalPages}
									</p>
									<div className="flex gap-2">
										<button
											onClick={() => onPageChange(pagination.page - 1)}
											disabled={pagination.page <= 1}
											className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
										>
											<ChevronLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
										</button>
										{/* Page numbers */}
										{Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
											let pageNum: number;
											if (pagination.totalPages <= 5) {
												pageNum = i + 1;
											} else if (pagination.page <= 3) {
												pageNum = i + 1;
											} else if (pagination.page >= pagination.totalPages - 2) {
												pageNum = pagination.totalPages - 4 + i;
											} else {
												pageNum = pagination.page - 2 + i;
											}
											return (
												<button
													key={pageNum}
													onClick={() => onPageChange(pageNum)}
													className={`px-3 py-1 rounded-lg text-sm transition-colors ${
														pageNum === pagination.page
															? "bg-indigo-600 text-white"
															: "border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
													}`}
												>
													{pageNum}
												</button>
											);
										})}
										<button
											onClick={() => onPageChange(pagination.page + 1)}
											disabled={pagination.page >= pagination.totalPages}
											className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
										>
											<ChevronRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
										</button>
									</div>
								</div>
							)}
						</>
					)}
				</div>
			</div>

			{/* Right: Pending & Rejected Invitations */}
			<div className="lg:col-span-1 space-y-6">
				{/* Pending Invitations */}
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
					<div className="p-4 border-b border-gray-200 dark:border-gray-700">
						<h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
							<ClockIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
							Menunggu Konfirmasi ({pendingAssignments.length})
						</h3>
					</div>
					{pendingAssignments.length === 0 ? (
						<div className="p-6 text-center">
							<p className="text-sm text-gray-600 dark:text-gray-400">
								Tidak ada undangan yang pending
							</p>
						</div>
					) : (
						<div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-80 overflow-y-auto">
							{pendingAssignments.map((assignment) => (
								<div key={assignment.id} className="p-4">
									<div className="flex items-start justify-between">
										<div className="flex items-center gap-3">
											{assignment.jury.profile?.avatar ? (
												<img
													src={getAvatarUrl(assignment.jury.profile.avatar) || ""}
													alt={assignment.jury.name}
													className="w-10 h-10 rounded-full object-cover"
												/>
											) : (
												<div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center">
													<span className="text-yellow-600 dark:text-yellow-400 font-bold">
														{assignment.jury.name.charAt(0).toUpperCase()}
													</span>
												</div>
											)}
											<div>
												<p className="font-medium text-gray-900 dark:text-white text-sm">
													{assignment.jury.name}
												</p>
												<p className="text-xs text-gray-500 dark:text-gray-400">
													{assignment.jury.email}
												</p>
											</div>
										</div>
										<button
											onClick={() => onRemove(assignment)}
											className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
											title="Batalkan undangan"
										>
											<TrashIcon className="h-4 w-4" />
										</button>
									</div>
									<div className="mt-2 flex flex-wrap gap-1">
										{assignment.assignedCategories.map((cat) => (
											<span
												key={cat.id}
												className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded"
											>
												{cat.assessmentCategory.name}
											</span>
										))}
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Rejected Invitations */}
				{rejectedAssignments.length > 0 && (
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
						<div className="p-4 border-b border-gray-200 dark:border-gray-700">
							<h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
								<XCircleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
								Ditolak ({rejectedAssignments.length})
							</h3>
						</div>
						<div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-60 overflow-y-auto">
							{rejectedAssignments.map((assignment) => (
								<div key={assignment.id} className="p-4">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
												<span className="text-red-600 dark:text-red-400 font-bold">
													{assignment.jury.name.charAt(0).toUpperCase()}
												</span>
											</div>
											<div>
												<p className="font-medium text-gray-900 dark:text-white text-sm">
													{assignment.jury.name}
												</p>
											</div>
										</div>
										<button
											onClick={() => onRemove(assignment)}
											className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
											title="Hapus"
										>
											<TrashIcon className="h-4 w-4" />
										</button>
									</div>
									{assignment.rejectionReason && (
										<p className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
											{assignment.rejectionReason}
										</p>
									)}
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

interface JuryAssignmentCardProps {
	assignment: JuryAssignment;
	onRemove: (assignment: JuryAssignment) => void;
	getAvatarUrl: (avatar: string | null) => string | null;
	getStatusBadge: (status: string) => React.ReactNode;
}

const JuryAssignmentCard: React.FC<JuryAssignmentCardProps> = ({
	assignment,
	onRemove,
	getAvatarUrl,
	getStatusBadge,
}) => {
	return (
		<div className="p-6">
			<div className="flex items-start justify-between">
				<div className="flex items-start gap-4">
					{assignment.jury.profile?.avatar ? (
						<img
							src={getAvatarUrl(assignment.jury.profile.avatar) || ""}
							alt={assignment.jury.name}
							className="w-14 h-14 rounded-full object-cover"
						/>
					) : (
						<div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
							<span className="text-green-600 dark:text-green-400 font-bold text-xl">
								{assignment.jury.name.charAt(0).toUpperCase()}
							</span>
						</div>
					)}
					<div>
						<h3 className="font-semibold text-gray-900 dark:text-white text-lg">
							{assignment.jury.name}
						</h3>
						<p className="text-sm text-gray-600 dark:text-gray-400">
							{assignment.jury.email}
						</p>
						{assignment.jury.phone && (
							<p className="text-sm text-gray-500 dark:text-gray-500">
								{assignment.jury.phone}
							</p>
						)}
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
						onClick={() => onRemove(assignment)}
						className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
						title="Hapus dari event"
					>
						<TrashIcon className="h-5 w-5" />
					</button>
				</div>
			</div>

			{/* Categories */}
			<div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
				<p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
					Kategori Penilaian:
				</p>
				<div className="flex flex-wrap gap-2">
					{assignment.assignedCategories.map((cat) => (
						<span
							key={cat.id}
							className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm rounded-full"
						>
							{cat.assessmentCategory.name}
						</span>
					))}
				</div>
			</div>
		</div>
	);
};

interface InviteModalProps {
	jury: JuryUser;
	categories: EventCategory[];
	selectedCategories: string[];
	notes: string;
	submitting: boolean;
	onToggleCategory: (categoryId: string) => void;
	onNotesChange: (notes: string) => void;
	onClose: () => void;
	onSubmit: () => void;
	getAvatarUrl: (avatar: string | null) => string | null;
}

const InviteModal: React.FC<InviteModalProps> = ({
	jury,
	categories,
	selectedCategories,
	notes,
	submitting,
	onToggleCategory,
	onNotesChange,
	onClose,
	onSubmit,
	getAvatarUrl,
}) => {
	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
				<h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
					Undang Juri
				</h3>

				<div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
					<div className="flex items-center gap-3">
						{jury.profile?.avatar ? (
							<img
								src={getAvatarUrl(jury.profile.avatar) || ""}
								alt={jury.name}
								className="w-12 h-12 rounded-full object-cover"
							/>
						) : (
							<div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
								<span className="text-indigo-600 dark:text-indigo-400 font-bold text-lg">
									{jury.name.charAt(0).toUpperCase()}
								</span>
							</div>
						)}
						<div>
							<p className="font-semibold text-gray-900 dark:text-white">
								{jury.name}
							</p>
							<p className="text-sm text-gray-600 dark:text-gray-400">
								{jury.email}
							</p>
						</div>
					</div>
				</div>

				<div className="mb-4">
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Pilih Kategori Penilaian *
					</label>
					<div className="space-y-2 max-h-48 overflow-y-auto">
						{categories.map((cat) => (
							<label
								key={cat.id}
								className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer"
							>
								<input
									type="checkbox"
									checked={selectedCategories.includes(cat.assessmentCategoryId)}
									onChange={() => onToggleCategory(cat.assessmentCategoryId)}
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
						value={notes}
						onChange={(e) => onNotesChange(e.target.value)}
						placeholder="Tambahkan catatan untuk juri..."
						rows={3}
						className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
					/>
				</div>

				<div className="flex gap-3">
					<button
						onClick={onClose}
						className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
					>
						Batal
					</button>
					<button
						onClick={onSubmit}
						disabled={submitting || selectedCategories.length === 0}
						className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{submitting ? "Mengirim..." : "Kirim Undangan"}
					</button>
				</div>
			</div>
		</div>
	);
};

export default ManageJury;
