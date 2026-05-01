import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import {
	UserGroupIcon,
	CheckCircleIcon,
	XCircleIcon,
	ClockIcon,
	ChevronDownIcon,
	ChevronUpIcon,
	UserIcon,
	ArrowLeftIcon,
	MagnifyingGlassIcon,
	ArrowsUpDownIcon,
	HashtagIcon,
	DocumentIcon,
} from "@heroicons/react/24/outline";
import {
	CheckCircleIcon as CheckCircleIconSolid,
	XCircleIcon as XCircleIconSolid,
	ClockIcon as ClockIconSolid,
} from "@heroicons/react/24/solid";
import { api } from "../../utils/api";
import Swal from "sweetalert2";

interface SchoolCategory {
	id: string;
	name: string;
}

interface ParticipationGroup {
	id: string;
	groupName: string;
	teamMembers: number;
	memberData: string | null;
	status: string;
	notes: string | null;
	orderNumber: number | null;
	schoolCategory: SchoolCategory;
}

interface UserProfile {
	institution: string | null;
	city: string | null;
	province: string | null;
}

interface User {
	id: string;
	name: string;
	email: string;
	phone: string | null;
	profile: UserProfile | null;
}

interface Registration {
	id: string;
	eventId: string;
	userId: string;
	teamName: string | null;
	schoolName: string | null;
	supportingDoc: string | null;
	status: string;
	notes: string | null;
	createdAt: string;
	user: User;
	schoolCategory: SchoolCategory | null;
	groups: ParticipationGroup[];
	registrationPayment: {
		id: string;
		amount: number;
		status: string;
		paymentMethod: string | null;
		paymentType: string | null;
		paidAt: string | null;
	} | null;
}

interface PersonMember {
	id: string;
	name: string;
	role: string;
	photo: string | null;
}

interface Event {
	id: string;
	title: string;
	slug: string;
	contactPhone: string | null;
	contactPersonName: string | null;
	registrationFee: number | null;
}

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

const schoolCategoryOrder = ["SD", "MI", "SMP", "MTS", "SMA", "SMK", "MA", "PURNA"];

const getSchoolCategoryOrder = (name: string) => {
	const normalizedName = name.trim().toUpperCase();
	const exactIndex = schoolCategoryOrder.findIndex((category) => normalizedName === category);
	if (exactIndex !== -1) return exactIndex;

	const partialIndex = schoolCategoryOrder.findIndex((category) => normalizedName.includes(category));
	return partialIndex === -1 ? schoolCategoryOrder.length : partialIndex;
};

const EventParticipantManagement: React.FC = () => {
	const { eventSlug } = useParams<{ eventSlug: string }>();
	const navigate = useNavigate();
	const location = useLocation();
	const isAdminRoute = location.pathname.startsWith("/admin");
	const basePath = isAdminRoute ? "/admin" : "/panitia";
	const storageKey = isAdminRoute ? "admin_active_event" : "panitia_active_event";
	const dashboardPath = isAdminRoute ? "/admin/events" : "/panitia/dashboard";
	
	const [event, setEvent] = useState<Event | null>(null);
	const [registrations, setRegistrations] = useState<Registration[]>([]);
	const [loading, setLoading] = useState(true);
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [activeSchoolCategoryId, setActiveSchoolCategoryId] = useState<string>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [processingId, setProcessingId] = useState<string | null>(null);

	useEffect(() => {
		fetchEventAndRegistrations();
	}, [eventSlug]);

	useEffect(() => {
		if (activeSchoolCategoryId === "all") return;

		const hasActiveCategory = registrations.some((reg) =>
			reg.schoolCategory?.id === activeSchoolCategoryId ||
			reg.groups.some((group) => group.schoolCategory?.id === activeSchoolCategoryId)
		);

		if (!hasActiveCategory) {
			setActiveSchoolCategoryId("all");
		}
	}, [activeSchoolCategoryId, registrations]);

	const fetchEventAndRegistrations = async () => {
		try {
			setLoading(true);

			// Verify access from localStorage (check both admin and panitia keys)
			const stored = localStorage.getItem(storageKey);
			if (!stored && !isAdminRoute) {
				navigate(dashboardPath);
				return;
			}

			if (stored) {
				const storedEvent = JSON.parse(stored);
				if (storedEvent.slug !== eventSlug) {
					// Update localStorage to match URL
					localStorage.setItem(
						storageKey,
						JSON.stringify({ slug: eventSlug, title: "", id: "" })
					);
				}
			}

			// Fetch event by slug to get event ID
			const eventResponse = await api.get(`/events/${eventSlug}`);
			if (!eventResponse.data) {
				navigate(dashboardPath);
				return;
			}

			const eventData = eventResponse.data;
			setEvent(eventData);

			// Update localStorage with full event data
			localStorage.setItem(
				storageKey,
				JSON.stringify({ slug: eventData.slug, title: eventData.title, id: eventData.id })
			);

			// Fetch registrations
			const registrationsResponse = await api.get(`/registrations/event/${eventData.id}`);
			setRegistrations(registrationsResponse.data);
		} catch (error) {
			console.error("Error fetching data:", error);
			Swal.fire({
				icon: "error",
				title: "Error",
				text: "Gagal memuat data peserta",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleUpdateStatus = async (registrationId: string, newStatus: string) => {
		const registration = registrations.find(r => r.id === registrationId);
		const isManualPayment = registration?.registrationPayment?.paymentMethod === "MANUAL";
		const statusLabel = newStatus === "CONFIRMED" ? "konfirmasi" : newStatus === "CANCELLED" ? "batalkan" : "ubah status";

		const confirmText = newStatus === "CONFIRMED" && isManualPayment
			? "Yakin ingin konfirmasi pendaftaran dan pembayaran manual ini?"
			: `Yakin ingin ${statusLabel} pendaftaran ini?`;

		const result = await Swal.fire({
			title: `${newStatus === "CONFIRMED" ? "Konfirmasi" : "Batalkan"} Pendaftaran?`,
			text: confirmText,
			icon: newStatus === "CONFIRMED" ? "question" : "warning",
			showCancelButton: true,
			confirmButtonColor: newStatus === "CONFIRMED" ? "#10B981" : "#EF4444",
			cancelButtonColor: "#6B7280",
			confirmButtonText: `Ya, ${newStatus === "CONFIRMED" ? "Konfirmasi" : "Batalkan"}`,
			cancelButtonText: "Batal",
		});

		if (result.isConfirmed) {
			try {
				setProcessingId(registrationId);
				await api.patch(`/registrations/${registrationId}/status`, { status: newStatus });

				await Swal.fire({
					icon: "success",
					title: "Berhasil",
					text: `Pendaftaran berhasil di${statusLabel}`,
					timer: 1500,
				});

				fetchEventAndRegistrations();
			} catch (error: any) {
				Swal.fire({
					icon: "error",
					title: "Gagal",
					text: error.response?.data?.error || `Gagal ${statusLabel} pendaftaran`,
				});
			} finally {
				setProcessingId(null);
			}
		}
	};

	const handleUpdateOrderNumber = async (groupId: string, currentOrder: number | null, schoolCategoryName: string) => {
		const { value: newOrder } = await Swal.fire({
			title: "Ubah Nomor Urut",
			text: `Masukkan nomor urut baru untuk tim di kategori ${schoolCategoryName}`,
			input: "number",
			inputValue: currentOrder || "",
			inputAttributes: {
				min: "1",
			},
			inputPlaceholder: "Nomor urut",
			showCancelButton: true,
			confirmButtonColor: "#4F46E5",
			cancelButtonColor: "#6B7280",
			confirmButtonText: "Simpan",
			cancelButtonText: "Batal",
			inputValidator: (value) => {
				if (!value || parseInt(value) < 1) {
					return "Masukkan nomor urut yang valid (minimal 1)";
				}
				return null;
			},
		});

		if (newOrder) {
			try {
				setProcessingId(groupId);
				await api.patch(`/registrations/groups/${groupId}/order`, {
					orderNumber: parseInt(newOrder),
				});

				await Swal.fire({
					icon: "success",
					title: "Berhasil",
					text: "Nomor urut berhasil diubah",
					timer: 1500,
				});

				fetchEventAndRegistrations();
			} catch (error: any) {
				Swal.fire({
					icon: "error",
					title: "Gagal",
					text: error.response?.data?.error || "Gagal mengubah nomor urut",
				});
			} finally {
				setProcessingId(null);
			}
		}
	};

	const getStatusBadge = (status: string) => {
		const statusConfig = {
			PENDING_PAYMENT: {
				bg: "bg-orange-100 dark:bg-orange-900/30",
				text: "text-orange-800 dark:text-orange-200",
				icon: <ClockIconSolid className="h-4 w-4" />,
				label: "Menunggu Pembayaran",
			},
			REGISTERED: {
				bg: "bg-yellow-100 dark:bg-yellow-900/30",
				text: "text-yellow-800 dark:text-yellow-200",
				icon: <ClockIconSolid className="h-4 w-4" />,
				label: "Menunggu Konfirmasi",
			},
			CONFIRMED: {
				bg: "bg-green-100 dark:bg-green-900/30",
				text: "text-green-800 dark:text-green-200",
				icon: <CheckCircleIconSolid className="h-4 w-4" />,
				label: "Dikonfirmasi",
			},
			CANCELLED: {
				bg: "bg-red-100 dark:bg-red-900/30",
				text: "text-red-800 dark:text-red-200",
				icon: <XCircleIconSolid className="h-4 w-4" />,
				label: "Dibatalkan",
			},
		} as const;

		type StatusKey = keyof typeof statusConfig;
		const config = statusConfig[status as StatusKey] || statusConfig.REGISTERED;

		return (
			<span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
				{config.icon}
				{config.label}
			</span>
		);
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const schoolCategoryMap = new Map<string, SchoolCategory>();
	const schoolCategoryCounts = new Map<string, number>();

	registrations.forEach((reg) => {
		if (reg.schoolCategory) {
			schoolCategoryMap.set(reg.schoolCategory.id, reg.schoolCategory);
		}

		reg.groups.forEach((group) => {
			if (!group.schoolCategory) return;

			schoolCategoryMap.set(group.schoolCategory.id, group.schoolCategory);
			if (group.status !== "CANCELLED") {
				schoolCategoryCounts.set(
					group.schoolCategory.id,
					(schoolCategoryCounts.get(group.schoolCategory.id) || 0) + 1
				);
			}
		});
	});

	const schoolCategoryTabs = Array.from(schoolCategoryMap.values()).sort((a, b) => {
		const orderDiff = getSchoolCategoryOrder(a.name) - getSchoolCategoryOrder(b.name);
		return orderDiff || a.name.localeCompare(b.name, "id-ID");
	});

	const allActiveGroupCount = registrations.reduce(
		(sum, reg) => sum + reg.groups.filter((group) => group.status !== "CANCELLED").length,
		0
	);

	const matchesActiveSchoolCategory = (reg: Registration) => {
		if (activeSchoolCategoryId === "all") return true;

		return (
			reg.schoolCategory?.id === activeSchoolCategoryId ||
			reg.groups.some((group) => group.schoolCategory?.id === activeSchoolCategoryId)
		);
	};

	const getVisibleGroups = (reg: Registration) => {
		if (activeSchoolCategoryId === "all") return reg.groups;

		return reg.groups.filter((group) => group.schoolCategory?.id === activeSchoolCategoryId);
	};

	const handleSchoolCategoryTabChange = (categoryId: string) => {
		setActiveSchoolCategoryId(categoryId);
		setExpandedGroupId(null);
	};

	// Filter registrations
	const filteredRegistrations = registrations.filter((reg) => {
		// Status filter
		if (statusFilter === "REGISTERED") {
			// "Menunggu" tab shows both REGISTERED and PENDING_PAYMENT
			if (reg.status !== "REGISTERED" && reg.status !== "PENDING_PAYMENT") return false;
		} else if (statusFilter !== "all" && reg.status !== statusFilter) {
			return false;
		}

		if (!matchesActiveSchoolCategory(reg)) {
			return false;
		}

		// Search filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			const matchesUser = reg.user.name.toLowerCase().includes(query) || reg.user.email.toLowerCase().includes(query);
			const matchesSchool = reg.schoolName?.toLowerCase().includes(query);
			const matchesCategory = reg.schoolCategory?.name.toLowerCase().includes(query);
			const visibleGroups = getVisibleGroups(reg);
			const matchesTeam = visibleGroups.some((g) => g.groupName.toLowerCase().includes(query));
			const matchesGroupCategory = visibleGroups.some((g) => g.schoolCategory?.name.toLowerCase().includes(query));
			return matchesUser || matchesSchool || matchesCategory || matchesTeam || matchesGroupCategory;
		}

		return true;
	});

	// Count by status
	const statusCounts = {
		all: registrations.length,
		REGISTERED: registrations.filter((r) => r.status === "REGISTERED" || r.status === "PENDING_PAYMENT").length,
		CONFIRMED: registrations.filter((r) => r.status === "CONFIRMED").length,
		CANCELLED: registrations.filter((r) => r.status === "CANCELLED").length,
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
			</div>
		);
	}

	return (
		<div className="min-h-screen">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Header */}
				<div className="mb-8">
					<Link
						to={`${basePath}/events/${eventSlug}/manage`}
						className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 mb-4"
					>
						<ArrowLeftIcon className="h-4 w-4 mr-1" />
						Kembali ke Event
					</Link>
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
						Manajemen Peserta
					</h1>
					<p className="mt-2 text-gray-600 dark:text-gray-400">
						{event?.title}
					</p>
				</div>

				{/* Stats */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
					<div
						onClick={() => setStatusFilter("CONFIRMED")}
						className={`cursor-pointer p-4 rounded-lg border-2 transition-colors ${
							statusFilter === "CONFIRMED"
								? "border-green-500 bg-green-50 dark:bg-green-900/20"
								: "border-gray-200/60 dark:border-gray-700/40 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm hover:border-green-300"
						}`}
					>
						<p className="text-sm text-green-600 dark:text-green-400">Dikonfirmasi</p>
						<p className="text-2xl font-bold text-green-600 dark:text-green-400">{statusCounts.CONFIRMED}</p>
					</div>
					<div
						onClick={() => setStatusFilter("REGISTERED")}
						className={`cursor-pointer p-4 rounded-lg border-2 transition-colors ${
							statusFilter === "REGISTERED"
								? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
								: "border-gray-200/60 dark:border-gray-700/40 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm hover:border-yellow-300"
						}`}
					>
						<p className="text-sm text-yellow-600 dark:text-yellow-400">Menunggu</p>
						<p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{statusCounts.REGISTERED}</p>
					</div>
					<div
						onClick={() => setStatusFilter("CANCELLED")}
						className={`cursor-pointer p-4 rounded-lg border-2 transition-colors ${
							statusFilter === "CANCELLED"
								? "border-red-500 bg-red-50 dark:bg-red-900/20"
								: "border-gray-200/60 dark:border-gray-700/40 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm hover:border-red-300"
						}`}
					>
						<p className="text-sm text-red-600 dark:text-red-400">Dibatalkan</p>
						<p className="text-2xl font-bold text-red-600 dark:text-red-400">{statusCounts.CANCELLED}</p>
					</div>
					<div
						onClick={() => setStatusFilter("all")}
						className={`cursor-pointer p-4 rounded-lg border-2 transition-colors ${
							statusFilter === "all"
								? "border-red-500 bg-red-50 dark:bg-red-900/20"
								: "border-gray-200/60 dark:border-gray-700/40 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm hover:border-red-300"
						}`}
					>
						<p className="text-sm text-gray-600 dark:text-gray-400">Semua</p>
						<p className="text-2xl font-bold text-gray-900 dark:text-white">{statusCounts.all}</p>
					</div>
				</div>

				{/* School Category Tabs */}
				{schoolCategoryTabs.length > 0 && (
					<div className="mb-6">
						<div className="flex items-center justify-between gap-3 mb-3">
							<h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
								Kategori Sekolah
							</h2>
							<span className="text-xs text-gray-500 dark:text-gray-400">
								{activeSchoolCategoryId === "all"
									? `${allActiveGroupCount} tim`
									: `${schoolCategoryCounts.get(activeSchoolCategoryId) || 0} tim`}
							</span>
						</div>
						<div className="flex gap-2 overflow-x-auto pb-1">
							<button
								type="button"
								onClick={() => handleSchoolCategoryTabChange("all")}
								className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
									activeSchoolCategoryId === "all"
										? "bg-red-600 border-red-600 text-white"
										: "bg-white/80 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-red-300 dark:hover:border-red-700"
								}`}
							>
								Semua
								<span className={`text-xs ${
									activeSchoolCategoryId === "all"
										? "text-red-100"
										: "text-gray-500 dark:text-gray-400"
								}`}>
									{allActiveGroupCount}
								</span>
							</button>
							{schoolCategoryTabs.map((category) => {
								const isActive = activeSchoolCategoryId === category.id;
								const count = schoolCategoryCounts.get(category.id) || 0;

								return (
									<button
										key={category.id}
										type="button"
										onClick={() => handleSchoolCategoryTabChange(category.id)}
										className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
											isActive
												? "bg-red-600 border-red-600 text-white"
												: "bg-white/80 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-red-300 dark:hover:border-red-700"
										}`}
									>
										{category.name}
										<span className={`text-xs ${
											isActive ? "text-red-100" : "text-gray-500 dark:text-gray-400"
										}`}>
											{count}
										</span>
									</button>
								);
							})}
						</div>
					</div>
				)}

				{/* Search */}
				<div className="mb-6">
					<div className="relative">
						<MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
						<input
							type="text"
							placeholder="Cari nama peserta, email, sekolah, kategori, atau tim..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
						/>
					</div>
				</div>

				{/* Registrations List */}
				{filteredRegistrations.length === 0 ? (
					<div className="text-center py-12 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow">
						<UserGroupIcon className="mx-auto h-16 w-16 text-gray-400" />
						<h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
							{registrations.length === 0 ? "Belum Ada Pendaftaran" : "Tidak Ada Hasil"}
						</h3>
						<p className="mt-2 text-gray-600 dark:text-gray-400">
							{registrations.length === 0 ? "Belum ada peserta yang mendaftar ke event ini" : "Coba ubah filter atau kata kunci pencarian"}
						</p>
					</div>
				) : (
					<div className="space-y-4">
						{filteredRegistrations.map((registration) => {
							const isExpanded = expandedId === registration.id;
							const visibleGroups = getVisibleGroups(registration);
							const activeGroups = visibleGroups.filter((g) => g.status === "ACTIVE");
							const isProcessing = processingId === registration.id;

							return (
								<div
									key={registration.id}
									className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-md overflow-hidden"
								>
									{/* Registration Header */}
									<div className="p-6">
										<div className="flex items-start justify-between">
											<div className="flex-1">
												<div className="flex items-center gap-3 mb-2 flex-wrap">
													<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
														{registration.user.name}
													</h3>
													{getStatusBadge(registration.status)}
													{registration.registrationPayment && (
														<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
															registration.registrationPayment.paymentMethod === "MANUAL"
																? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
																: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
														}`}>
															{registration.registrationPayment.paymentMethod === "MANUAL" ? "Manual" : "Midtrans"}
															{registration.registrationPayment.status === "PAID" && " ✓"}
														</span>
													)}
												</div>
												<div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
													<p>{registration.user.email}</p>
													{registration.user.phone && <p>{registration.user.phone}</p>}
													{registration.schoolName && (
														<p className="font-medium text-gray-900 dark:text-white">
															{registration.schoolName}
														</p>
													)}
													<p className="text-xs">
														Didaftarkan: {formatDate(registration.createdAt)}
													</p>
													{registration.supportingDoc && (
														<div className="mt-2">
															<a
																href={getImageUrl(registration.supportingDoc) || "#"}
																target="_blank"
																rel="noopener noreferrer"
																className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
															>
																<DocumentIcon className="h-4 w-4" />
																Lihat Berkas Pendukung
															</a>
														</div>
													)}
												</div>
											</div>

											{/* Action Buttons */}
											<div className="flex flex-col gap-2">
												{(registration.status === "REGISTERED" || registration.status === "PENDING_PAYMENT") && (
													<>
														<button
															onClick={() => handleUpdateStatus(registration.id, "CONFIRMED")}
															disabled={isProcessing}
															className="inline-flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
														>
															<CheckCircleIcon className="h-4 w-4" />
															Konfirmasi
														</button>

														<button
															onClick={() => handleUpdateStatus(registration.id, "CANCELLED")}
															disabled={isProcessing}
															className="inline-flex items-center gap-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
														>
															<XCircleIcon className="h-4 w-4" />
															Tolak
														</button>
													</>
												)}
												{registration.status === "CONFIRMED" && (
													<button
														onClick={() => handleUpdateStatus(registration.id, "CANCELLED")}
														disabled={isProcessing}
														className="inline-flex items-center gap-1 px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
													>
														<XCircleIcon className="h-4 w-4" />
														Batalkan
													</button>
												)}
												{registration.status === "CANCELLED" && (
													<button
														onClick={() => handleUpdateStatus(registration.id, "REGISTERED")}
														disabled={isProcessing}
														className="inline-flex items-center gap-1 px-4 py-2 border border-yellow-600 text-yellow-600 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
													>
														<ClockIcon className="h-4 w-4" />
														Pulihkan
													</button>
												)}
											</div>
										</div>

										{/* Groups Summary */}
										<div className="mt-4 flex items-center justify-between">
											<div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
												<UserGroupIcon className="h-5 w-5" />
												<span>
													{activeGroups.length} Tim Terdaftar
												</span>
											</div>
											<button
												onClick={() => setExpandedId(isExpanded ? null : registration.id)}
												className="inline-flex items-center gap-1 text-sm text-red-600 dark:text-red-400 hover:underline"
											>
												{isExpanded ? (
													<>
														<ChevronUpIcon className="h-4 w-4" />
														Sembunyikan Detail
													</>
												) : (
													<>
														<ChevronDownIcon className="h-4 w-4" />
														Lihat Detail Tim
													</>
												)}
											</button>
										</div>
									</div>

									{/* Expanded Groups */}
									{isExpanded && (
										<div className="border-t border-gray-200/60 dark:border-gray-700/40 p-6 bg-gray-50 dark:bg-gray-800/50">
											<h4 className="font-semibold text-gray-900 dark:text-white mb-4">
												Detail Tim
											</h4>
											<div className="space-y-4">
												{visibleGroups.map((group) => {
													const members = parseMemberData(group.memberData);
													const isGroupExpanded = expandedGroupId === group.id;
													const pasukan = members.filter((m) => m.role === "PASUKAN");
													const danton = members.find((m) => m.role === "DANTON");
													const cadangan = members.filter((m) => m.role === "CADANGAN");
													const official = members.filter((m) => m.role === "OFFICIAL");
													const pelatih = members.filter((m) => m.role === "PELATIH");

													return (
														<div
															key={group.id}
															className={`bg-white dark:bg-gray-900 border rounded-lg overflow-hidden ${
																group.status === "CANCELLED"
																	? "border-red-200 dark:border-red-800 opacity-60"
																	: "border-gray-200 dark:border-gray-600"
															}`}
														>
															{/* Group Header */}
															<div className="p-4">
																<div className="flex items-center justify-between">
																	<div className="flex items-center gap-2 flex-wrap">
																		{/* Order Number Badge (only for confirmed) */}
																		{registration.status === "CONFIRMED" && group.orderNumber && group.status !== "CANCELLED" && (
																			<button
																				onClick={() => handleUpdateOrderNumber(group.id, group.orderNumber, group.schoolCategory.name)}
																				disabled={processingId === group.id}
																				className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-sm font-bold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
																				title="Klik untuk mengubah nomor urut"
																			>
																				<HashtagIcon className="h-4 w-4" />
																				{group.orderNumber}
																			</button>
																		)}
																		<UserGroupIcon className="h-5 w-5 text-red-600" />
																		<span className={`font-semibold ${group.status === "CANCELLED" ? "line-through text-gray-400" : "text-gray-900 dark:text-white"}`}>
																			{group.groupName}
																		</span>
																		<span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
																			{group.schoolCategory.name}
																		</span>
																		{group.status === "CANCELLED" && (
																			<span className="text-xs bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded">
																				DIBATALKAN
																			</span>
																		)}
																	</div>
																	<div className="flex items-center gap-2">
																		{/* Reorder Button (only for confirmed without order number) */}
																		{registration.status === "CONFIRMED" && !group.orderNumber && group.status !== "CANCELLED" && (
																			<button
																				onClick={() => handleUpdateOrderNumber(group.id, null, group.schoolCategory.name)}
																				disabled={processingId === group.id}
																				className="text-sm text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 disabled:opacity-50"
																			>
																				<ArrowsUpDownIcon className="h-4 w-4" />
																				Set Nomor Urut
																			</button>
																		)}
																		{members.length > 0 && group.status !== "CANCELLED" && (
																			<button
																				onClick={() => setExpandedGroupId(isGroupExpanded ? null : group.id)}
																				className="text-sm text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
																			>
																				{isGroupExpanded ? (
																					<>
																						<ChevronUpIcon className="h-4 w-4" />
																						Tutup
																					</>
																				) : (
																					<>
																						<ChevronDownIcon className="h-4 w-4" />
																						Lihat {members.length} Personil
																					</>
																				)}
																			</button>
																		)}
																	</div>
																</div>
																<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
																	{members.length > 0 ? `${members.length} personil` : `${group.teamMembers} anggota`}
																</p>
																{group.notes && (
																	<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
																		<span className="font-medium">Catatan:</span> {group.notes}
																	</p>
																)}
															</div>

															{/* Personnel Details */}
															{isGroupExpanded && members.length > 0 && (
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
																						src={getImageUrl(danton.photo) || ""}
																						alt={danton.name}
																						className="w-12 h-12 rounded-full object-cover border-2 border-yellow-400"
																						onError={(e) => {
																							e.currentTarget.style.display = "none";
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
																			<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
																				{pasukan.map((member, idx) => (
																					<div key={member.id || idx} className="flex flex-col items-center p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg">
																						{member.photo ? (
																							<img
																								src={getImageUrl(member.photo) || ""}
																								alt={member.name}
																								className="w-12 h-12 rounded-full object-cover border-2 border-red-400 mb-1"
																								onError={(e) => {
																									e.currentTarget.style.display = "none";
																								}}
																							/>
																						) : (
																							<div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mb-1">
																								<UserIcon className="w-6 h-6 text-red-500" />
																							</div>
																						)}
																						<p className="text-xs font-medium text-gray-900 dark:text-white text-center line-clamp-1">{member.name}</p>
																						<p className="text-xs text-gray-500">#{idx + 1}</p>
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
																			<div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
																				{cadangan.map((member, idx) => (
																					<div key={member.id || idx} className="flex items-center gap-2 p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg">
																						{member.photo ? (
																							<img
																								src={getImageUrl(member.photo) || ""}
																								alt={member.name}
																								className="w-8 h-8 rounded-full object-cover border border-gray-300"
																								onError={(e) => {
																									e.currentTarget.style.display = "none";
																								}}
																							/>
																						) : (
																							<div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
																								<UserIcon className="w-4 h-4 text-gray-500" />
																							</div>
																						)}
																						<p className="text-xs font-medium text-gray-900 dark:text-white line-clamp-1">{member.name}</p>
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
																			<div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
																				{official.map((member, idx) => (
																					<div key={member.id || idx} className="flex items-center gap-2 p-2 bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-600 rounded-lg">
																						{member.photo ? (
																							<img
																								src={getImageUrl(member.photo) || ""}
																								alt={member.name}
																								className="w-8 h-8 rounded-full object-cover border border-blue-300"
																								onError={(e) => {
																									e.currentTarget.style.display = "none";
																								}}
																							/>
																						) : (
																							<div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
																								<UserIcon className="w-4 h-4 text-blue-500" />
																							</div>
																						)}
																						<p className="text-xs font-medium text-gray-900 dark:text-white line-clamp-1">{member.name}</p>
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
																			<div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
																				{pelatih.map((member, idx) => (
																					<div key={member.id || idx} className="flex items-center gap-2 p-2 bg-white dark:bg-gray-900 border border-green-200 dark:border-green-600 rounded-lg">
																						{member.photo ? (
																							<img
																								src={getImageUrl(member.photo) || ""}
																								alt={member.name}
																								className="w-8 h-8 rounded-full object-cover border border-green-300"
																								onError={(e) => {
																									e.currentTarget.style.display = "none";
																								}}
																							/>
																						) : (
																							<div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
																								<UserIcon className="w-4 h-4 text-green-500" />
																							</div>
																						)}
																						<p className="text-xs font-medium text-gray-900 dark:text-white line-clamp-1">{member.name}</p>
																					</div>
																				))}
																			</div>
																		</div>
																	)}
																</div>
															)}
														</div>
													);
												})}
											</div>
										</div>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
};

export default EventParticipantManagement;
