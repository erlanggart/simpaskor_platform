import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import {
	Cog6ToothIcon,
	ListBulletIcon,
	ChartBarIcon,
	ClipboardDocumentListIcon,
	PlusIcon,
	TrashIcon,
	ArrowPathIcon,
	UserGroupIcon,
	UserIcon,
	LockClosedIcon,
	EnvelopeIcon,
	TrophyIcon,
	CurrencyDollarIcon,
	CheckCircleIcon,
	ClockIcon,
	PencilSquareIcon,
	ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import Swal from "sweetalert2";
import { api } from "../../utils/api";
import { GMAIL_ONLY_EMAIL_MESSAGE, isGmailEmail } from "../../utils/emailPolicy";
import { config as appConfig } from "../../utils/config";
import {
	EventVotingConfig,
	VotingCategory,
	VotingNominee,
	VotingPurchase,
	VotingMode,
} from "../../types/voting";
import ImageCropper from "../../components/ImageCropper";

const INDONESIA_TIME_ZONE = "Asia/Jakarta";
const INDONESIA_UTC_OFFSET_MINUTES = 7 * 60;
const DATETIME_LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const VOTING_REVENUE_SHARE_TIERS = ["VOTING", "TICKETING_VOTING", "BRONZE", "GOLD"];

type VotingDashboard = {
	enabled: boolean;
	isPaid: boolean;
	pricePerVote: number;
	totalVotes: number;
	categoryCount: number;
	nomineeCount: number;
	topNominees: Array<{
		id: string;
		categoryId: string;
		categoryTitle: string;
		name: string;
		subtitle: string | null;
		photo: string | null;
		votes: number;
	}>;
	categoryBreakdown: Array<{
		id: string;
		title: string;
		votes: number;
		nomineeCount: number;
		leadingNominee: { id: string; name: string; votes: number } | null;
	}>;
	purchaseSummary: {
		total: number;
		paid: number;
		pending: number;
		cancelled: number;
		expired: number;
		revenue: number;
		voteCredits: number;
		usedVotes: number;
		unusedVotes: number;
		conversionRate: number;
	} | null;
	dailyTrend: Array<{ date: string; label: string; votes: number }>;
};

const getDateTimePartsInIndonesia = (date: Date) => {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: INDONESIA_TIME_ZONE,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}).formatToParts(date);

	const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || "";
	return {
		year: getPart("year"),
		month: getPart("month"),
		day: getPart("day"),
		hour: getPart("hour"),
		minute: getPart("minute"),
	};
};

const formatDateForInput = (date: string | null) => {
	if (!date) return "";
	if (DATETIME_LOCAL_PATTERN.test(date)) return date;

	const parsed = new Date(date);
	if (Number.isNaN(parsed.getTime())) return "";

	const parts = getDateTimePartsInIndonesia(parsed);
	return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

const toIndonesiaDateTimeIso = (value: string | null | undefined) => {
	if (!value) return null;

	const localMatch = value.match(DATETIME_LOCAL_PATTERN);
	if (localMatch) {
		const year = Number(localMatch[1]);
		const month = Number(localMatch[2]);
		const day = Number(localMatch[3]);
		const hour = Number(localMatch[4]);
		const minute = Number(localMatch[5]);
		return new Date(Date.UTC(year, month - 1, day, hour, minute) - INDONESIA_UTC_OFFSET_MINUTES * 60 * 1000).toISOString();
	}

	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const EventVoting: React.FC = () => {
	const { eventSlug } = useParams();
	const [activeTab, setActiveTab] = useState<"dashboard" | "config" | "categories" | "results" | "purchases">("dashboard");
	const [loading, setLoading] = useState(true);
	const [eventId, setEventId] = useState<string>("");

	// Config state
	const [config, setConfig] = useState<Partial<EventVotingConfig>>({
		enabled: false,
		isPaid: false,
		pricePerVote: 0,
		startDate: null,
		endDate: null,
		categories: [],
	});
	const [saving, setSaving] = useState(false);
	const [votingShareLocked, setVotingShareLocked] = useState(false);

	// Categories state
	const [categories, setCategories] = useState<VotingCategory[]>([]);
	const [showCategoryForm, setShowCategoryForm] = useState(false);
	const [editingCategory, setEditingCategory] = useState<VotingCategory | null>(null);
	const [categoryForm, setCategoryForm] = useState({
		title: "",
		description: "",
		mode: "TEAM" as VotingMode,
		position: "",
		schoolCategoryIds: [] as string[],
		maxVotesPerVoter: 1,
		order: 0,
	});
	const [schoolCategories, setSchoolCategories] = useState<{ id: string; name: string }[]>([]);
	const [closingVoting, setClosingVoting] = useState(false);

	// Nominees
	const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
	const [nominees, setNominees] = useState<VotingNominee[]>([]);
	const [syncing, setSyncing] = useState(false);
	const [showAddNomineeForm, setShowAddNomineeForm] = useState(false);
	const [addingNominee, setAddingNominee] = useState(false);
	const [nomineeForm, setNomineeForm] = useState({ nomineeName: "", nomineeSubtitle: "" });
	const [nomineePhotoFile, setNomineePhotoFile] = useState<File | null>(null);
	const [nomineePhotoPreview, setNomineePhotoPreview] = useState<string | null>(null);
	const nomineePhotoInputRef = useRef<HTMLInputElement>(null);
	const [showCropper, setShowCropper] = useState(false);
	const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
	const [cropTarget, setCropTarget] = useState<"add" | "edit">("add");

	// Edit nominee state
	const [editingNominee, setEditingNominee] = useState<VotingNominee | null>(null);
	const [editNomineeForm, setEditNomineeForm] = useState({ nomineeName: "", nomineeSubtitle: "" });
	const [editNomineePhotoFile, setEditNomineePhotoFile] = useState<File | null>(null);
	const [editNomineePhotoPreview, setEditNomineePhotoPreview] = useState<string | null>(null);
	const [clearNomineePhoto, setClearNomineePhoto] = useState(false);
	const [savingNominee, setSavingNominee] = useState(false);
	const editNomineePhotoInputRef = useRef<HTMLInputElement>(null);

	// Results state
	const [results, setResults] = useState<{ categories: any[]; totalVotes: number; pricePerVote: number; isPaid: boolean }>({ categories: [], totalVotes: 0, pricePerVote: 0, isPaid: false });
	const [dashboard, setDashboard] = useState<VotingDashboard | null>(null);
	const [dashboardLoading, setDashboardLoading] = useState(false);

	// Purchases state
	const [purchases, setPurchases] = useState<VotingPurchase[]>([]);
	const [purchasesLoading, setPurchasesLoading] = useState(false);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);

	// Fetch event ID from slug
	useEffect(() => {
		const fetchEvent = async () => {
			try {
				const res = await api.get(`/events/${eventSlug}`);
				setEventId(res.data.id);
			} catch {
				if (eventSlug) setEventId(eventSlug);
			}
		};
		if (eventSlug) fetchEvent();
	}, [eventSlug]);

	// Fetch voting config
	useEffect(() => {
		const fetchConfig = async () => {
			if (!eventId) return;
			try {
				setLoading(true);
				const res = await api.get(`/voting/admin/event/${eventId}/config`);
				setConfig(res.data);
				if (res.data.event) {
					setVotingShareLocked(
						VOTING_REVENUE_SHARE_TIERS.includes(res.data.event.packageTier) &&
						(res.data.event.platformSharePercent === null || res.data.event.platformSharePercent === undefined)
					);
				}
				if (res.data.categories) {
					setCategories(res.data.categories);
				}
				// Use school categories assigned to this event
				if (res.data.event?.schoolCategories) {
					setSchoolCategories(res.data.event.schoolCategories);
				}
				// Auto-fill voting dates from event schedule if not yet set
				if (!res.data.startDate && !res.data.endDate && res.data.event) {
					const evt = res.data.event;
					setConfig((prev: any) => ({
						...prev,
						startDate: evt.registrationDeadline || evt.startDate || prev.startDate,
						endDate: evt.endDate || prev.endDate,
					}));
				}
			} catch {
				// Config not found, use defaults
			} finally {
				setLoading(false);
			}
		};
		fetchConfig();
	}, [eventId]);



	// Fetch purchases
	useEffect(() => {
		if (activeTab === "purchases" && eventId) {
			fetchPurchases();
		}
	}, [activeTab, eventId, page, search, statusFilter]);

	// Fetch dashboard
	useEffect(() => {
		if (activeTab === "dashboard" && eventId) {
			fetchDashboard();
		}
	}, [activeTab, eventId]);

	// Fetch results
	useEffect(() => {
		if (activeTab === "results" && eventId) {
			fetchResults();
		}
	}, [activeTab, eventId]);

	const fetchPurchases = async () => {
		if (!eventId) return;
		try {
			setPurchasesLoading(true);
			const params: any = { page, limit: 20 };
			if (search) params.search = search;
			if (statusFilter) params.status = statusFilter;

			const res = await api.get(`/voting/admin/event/${eventId}/purchases`, { params });
			setPurchases(res.data.data);
			setTotalPages(res.data.totalPages);
		} catch {
			console.error("Error fetching purchases");
		} finally {
			setPurchasesLoading(false);
		}
	};

	const fetchDashboard = async () => {
		if (!eventId) return;
		try {
			setDashboardLoading(true);
			const res = await api.get(`/voting/admin/event/${eventId}/dashboard`);
			setDashboard(res.data);
		} catch {
			console.error("Error fetching voting dashboard");
		} finally {
			setDashboardLoading(false);
		}
	};

	const handleResendVotingEmail = async (purchaseId: string, buyerEmail: string) => {
		const { value: email } = await Swal.fire({
			title: "Kirim Ulang Email Kode Vote",
			html: `<p class="text-sm text-gray-500 mb-2">Email akan dikirim dengan kode vote ke alamat email di bawah. Anda dapat mengubah email tujuan jika email asli tidak valid.</p>`,
			input: "email",
			inputLabel: "Email Tujuan",
			inputValue: buyerEmail,
			inputPlaceholder: "masukkan email tujuan",
			showCancelButton: true,
			confirmButtonText: "Kirim Email",
			cancelButtonText: "Batal",
			confirmButtonColor: "#dc2626",
			inputValidator: (value) => {
				if (!value) return "Email wajib diisi";
				if (!isGmailEmail(value)) return GMAIL_ONLY_EMAIL_MESSAGE;
				return null;
			},
		});

		if (!email) return;

		try {
			const res = await api.post(`/voting/admin/resend-email/${purchaseId}`, { email });
			Swal.fire({
				title: "Berhasil!",
				text: res.data.message,
				icon: "success",
				timer: 2000,
				showConfirmButton: false,
			});
		} catch (err: any) {
			Swal.fire("Gagal", err.response?.data?.error || "Gagal mengirim email", "error");
		}
	};

	const fetchResults = async () => {
		if (!eventId) return;
		try {
			const res = await api.get(`/voting/admin/event/${eventId}/results`);
			setResults(res.data);
		} catch {
			console.error("Error fetching results");
		}
	};

	const fetchNominees = useCallback(async (categoryId: string) => {
		try {
			const res = await api.get(`/voting/admin/categories/${categoryId}/nominees`);
			setNominees(res.data);
		} catch {
			console.error("Error fetching nominees");
		}
	}, []);

	const handleSaveConfig = async () => {
		try {
			if (config.enabled && votingShareLocked) {
				Swal.fire(
					"Menunggu Admin",
					"Nonaktifkan E-Voting terlebih dahulu. Voting baru bisa dibuka setelah admin mengatur persentase bagi hasil.",
					"info"
				);
				return;
			}
			setSaving(true);
			const payload: any = {
				enabled: config.enabled,
				isPaid: config.isPaid,
				pricePerVote: Number(config.pricePerVote),
			};
			const startDate = toIndonesiaDateTimeIso(config.startDate);
			const endDate = toIndonesiaDateTimeIso(config.endDate);
			if (startDate) payload.startDate = startDate;
			if (endDate) payload.endDate = endDate;

			const res = await api.put(`/voting/admin/event/${eventId}/config`, payload);
			setConfig(res.data);

			Swal.fire({
				title: "Berhasil!",
				text: "Konfigurasi e-voting berhasil disimpan",
				icon: "success",
				timer: 2000,
				showConfirmButton: false,
			});
		} catch (err: any) {
			Swal.fire("Error", err.response?.data?.error || "Gagal menyimpan konfigurasi", "error");
		} finally {
			setSaving(false);
		}
	};

	const handleSaveCategory = async () => {
		try {
			if (!categoryForm.title.trim()) {
				return Swal.fire("Error", "Judul kategori wajib diisi", "error");
			}

			if (editingCategory) {
				const res = await api.put(`/voting/admin/categories/${editingCategory.id}`, categoryForm);
				setCategories((prev) => prev.map((c) => (c.id === editingCategory.id ? res.data : c)));
			} else {
				const res = await api.post(`/voting/admin/event/${eventId}/categories`, categoryForm);
				setCategories((prev) => [...prev, res.data]);
			}

			setShowCategoryForm(false);
			setEditingCategory(null);
			resetCategoryForm();

			Swal.fire({
				title: "Berhasil!",
				text: editingCategory ? "Kategori berhasil diperbarui" : "Kategori berhasil ditambahkan",
				icon: "success",
				timer: 1500,
				showConfirmButton: false,
			});
		} catch (err: any) {
			Swal.fire("Error", err.response?.data?.error || "Gagal menyimpan kategori", "error");
		}
	};

	const handleDeleteCategory = async (categoryId: string) => {
		const result = await Swal.fire({
			title: "Hapus Kategori?",
			text: "Semua nominee dan vote dalam kategori ini akan dihapus!",
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#dc2626",
			confirmButtonText: "Hapus",
			cancelButtonText: "Batal",
		});

		if (!result.isConfirmed) return;

		try {
			await api.delete(`/voting/admin/categories/${categoryId}`);
			setCategories((prev) => prev.filter((c) => c.id !== categoryId));
			if (selectedCategoryId === categoryId) {
				setSelectedCategoryId(null);
				setNominees([]);
			}
			Swal.fire({ title: "Dihapus!", icon: "success", timer: 1500, showConfirmButton: false });
		} catch (err: any) {
			Swal.fire("Error", err.response?.data?.error || "Gagal menghapus kategori", "error");
		}
	};

	const handleSyncNominees = async (categoryId: string) => {
		try {
			setSyncing(true);
			const res = await api.post(`/voting/admin/categories/${categoryId}/sync-nominees`);
			if (res.data.category?.nominees) {
				setNominees(res.data.category.nominees);
			}
			Swal.fire({
				title: "Berhasil!",
				text: res.data.message,
				icon: "success",
				timer: 2000,
				showConfirmButton: false,
			});
		} catch (err: any) {
			Swal.fire("Error", err.response?.data?.error || "Gagal sinkronisasi nominee", "error");
		} finally {
			setSyncing(false);
		}
	};

	const handleDeleteNominee = async (nomineeId: string) => {
		const result = await Swal.fire({
			title: "Hapus Nominee?",
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#dc2626",
			confirmButtonText: "Hapus",
			cancelButtonText: "Batal",
		});

		if (!result.isConfirmed) return;

		try {
			await api.delete(`/voting/admin/nominees/${nomineeId}`);
			setNominees((prev) => prev.filter((n) => n.id !== nomineeId));
		} catch (err: any) {
			Swal.fire("Error", err.response?.data?.error || "Gagal menghapus nominee", "error");
		}
	};

	const handleAddNominee = async (categoryId: string) => {
		if (!nomineeForm.nomineeName.trim()) {
			Swal.fire("Error", "Nama nominee wajib diisi", "error");
			return;
		}
		try {
			setAddingNominee(true);
			const formData = new FormData();
			formData.append("nomineeName", nomineeForm.nomineeName.trim());
			if (nomineeForm.nomineeSubtitle.trim()) {
				formData.append("nomineeSubtitle", nomineeForm.nomineeSubtitle.trim());
			}
			if (nomineePhotoFile) {
				formData.append("nomineePhoto", nomineePhotoFile);
			}
			const res = await api.post(`/voting/admin/categories/${categoryId}/nominees`, formData, {
				headers: { "Content-Type": "multipart/form-data" },
			});
			setNominees((prev) => [...prev, res.data]);
			setNomineeForm({ nomineeName: "", nomineeSubtitle: "" });
			setNomineePhotoFile(null);
			setNomineePhotoPreview(null);
			setShowAddNomineeForm(false);
			// Update category count in the categories list
			setCategories((prev) =>
				prev.map((c) =>
					c.id === categoryId
						? { ...c, _count: { ...c._count, nominees: (c._count?.nominees || 0) + 1, votes: c._count?.votes || 0 } }
						: c
				)
			);
		} catch (err: any) {
			Swal.fire("Error", err.response?.data?.error || "Gagal menambah nominee", "error");
		} finally {
			setAddingNominee(false);
		}
	};

	const handleUpdateNominee = async () => {
		if (!editingNominee) return;
		if (!editNomineeForm.nomineeName.trim()) {
			Swal.fire("Error", "Nama nominee wajib diisi", "error");
			return;
		}
		try {
			setSavingNominee(true);
			const formData = new FormData();
			formData.append("nomineeName", editNomineeForm.nomineeName.trim());
			if (editNomineeForm.nomineeSubtitle.trim()) {
				formData.append("nomineeSubtitle", editNomineeForm.nomineeSubtitle.trim());
			}
			if (editNomineePhotoFile) {
				formData.append("nomineePhoto", editNomineePhotoFile);
			} else if (clearNomineePhoto) {
				formData.append("clearPhoto", "true");
			}
			const res = await api.put(`/voting/admin/nominees/${editingNominee.id}`, formData, {
				headers: { "Content-Type": "multipart/form-data" },
			});
			setNominees((prev) => prev.map((n) => (n.id === editingNominee.id ? res.data : n)));
			setEditingNominee(null);
			setEditNomineeForm({ nomineeName: "", nomineeSubtitle: "" });
			setEditNomineePhotoFile(null);
			setEditNomineePhotoPreview(null);
			setClearNomineePhoto(false);
			Swal.fire({ title: "Berhasil!", text: "Nominee berhasil diperbarui", icon: "success", timer: 1500, showConfirmButton: false });
		} catch (err: any) {
			Swal.fire("Error", err.response?.data?.error || "Gagal memperbarui nominee", "error");
		} finally {
			setSavingNominee(false);
		}
	};

	const resetCategoryForm = () => {
		setCategoryForm({
			title: "",
			description: "",
			mode: "TEAM",
			position: "",
			schoolCategoryIds: [],
			maxVotesPerVoter: 1,
			order: 0,
		});
	};

	const openEditCategory = (cat: VotingCategory) => {
		setEditingCategory(cat);
		setCategoryForm({
			title: cat.title,
			description: cat.description || "",
			mode: cat.mode,
			position: cat.position || "",
			schoolCategoryIds: cat.schoolCategoryIds || [],
			maxVotesPerVoter: cat.maxVotesPerVoter,
			order: cat.order,
		});
		setShowCategoryForm(true);
	};

	const formatDate = (date: string | null) => {
		if (!date) return "-";
		return new Date(date).toLocaleDateString("id-ID", {
			timeZone: INDONESIA_TIME_ZONE,
			day: "numeric",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("id-ID", {
			style: "currency",
			currency: "IDR",
			minimumFractionDigits: 0,
		}).format(amount);
	};

	const formatNumber = (amount: number) => {
		return new Intl.NumberFormat("id-ID").format(amount);
	};

	const getNomineePhotoUrl = (photo: string | null) => {
		if (!photo) return null;
		return photo.startsWith("http") ? photo : appConfig.api.backendUrl + photo;
	};

	const getStatusBadge = (status: string) => {
		const styles: Record<string, string> = {
			PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
			PAID: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
			CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
			EXPIRED: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
		};
		return (
			<span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.PENDING}`}>
				{status}
			</span>
		);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
			</div>
		);
	}

	const tabs = [
		{ key: "dashboard", label: "Dashboard", icon: ChartBarIcon },
		{ key: "config", label: "Pengaturan", icon: Cog6ToothIcon },
		{ key: "categories", label: "Kategori", icon: ListBulletIcon },
		{ key: "results", label: "Hasil", icon: ChartBarIcon },
		...(config.isPaid ? [{ key: "purchases", label: "Pembelian", icon: ClipboardDocumentListIcon }] : []),
	];
	const dashboardTrendMax = Math.max(1, ...(dashboard?.dailyTrend.map((item) => item.votes) || [0]));
	const dashboardCategoryMax = Math.max(1, ...(dashboard?.categoryBreakdown.map((item) => item.votes) || [0]));
	const dashboardTopMax = Math.max(1, ...(dashboard?.topNominees.map((item) => item.votes) || [0]));
	const purchaseSummary = dashboard?.purchaseSummary;
	const purchaseStatusTotal = Math.max(1, purchaseSummary?.total || 0);
	const paidDegrees = purchaseSummary ? (purchaseSummary.paid / purchaseStatusTotal) * 360 : 0;
	const pendingDegrees = purchaseSummary ? (purchaseSummary.pending / purchaseStatusTotal) * 360 : 0;
	const cancelledDegrees = purchaseSummary ? (purchaseSummary.cancelled / purchaseStatusTotal) * 360 : 0;

	return (
		<>
		<div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
			{/* Header */}
			<div>
				<h1 className="text-2xl font-bold text-gray-900 dark:text-white">E-Voting</h1>
				<p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Kelola voting event</p>
			</div>

			{/* Stats Bar (mobile compact) */}
			<div className="flex items-center gap-4 text-sm">
				<span className="flex items-center gap-1.5">
					<span className={`w-2 h-2 rounded-full ${config.enabled ? "bg-green-500" : "bg-red-500"}`}></span>
					<span className="text-gray-600 dark:text-gray-400">{config.enabled ? "Aktif" : "Nonaktif"}</span>
				</span>
				<span className="text-gray-600 dark:text-gray-400">{categories.length} kategori</span>
				{config.isPaid && (
					<span className="text-gray-600 dark:text-gray-400">{formatCurrency(config.pricePerVote || 0)}/vote</span>
				)}
			</div>

			{votingShareLocked && (
				<div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
					<ExclamationTriangleIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
					<p>
						Paket ini sudah memiliki fitur voting, tetapi voting publik tetap ditutup sampai panitia menghubungi admin dan admin mengatur persentase bagi hasil.
					</p>
				</div>
			)}

			{/* Tabs */}
			<div className="flex gap-2 overflow-x-auto pb-1">
				{tabs.map((tab) => {
					const Icon = tab.icon;
					return (
						<button
							key={tab.key}
							onClick={() => setActiveTab(tab.key as any)}
							className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
								activeTab === tab.key
									? "bg-blue-600 text-white"
									: "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
							}`}
						>
							<Icon className="w-4 h-4" />
							<span className={tab.key !== "config" ? "hidden sm:inline" : ""}>{tab.label}</span>
						</button>
					);
				})}
			</div>

			{/* Dashboard Tab */}
			{activeTab === "dashboard" && (
				<div className="space-y-5">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
						<div>
							<h2 className="text-lg font-semibold text-gray-900 dark:text-white">Dashboard Voting</h2>
							<p className="text-sm text-gray-500 dark:text-gray-400">Pantau performa voting, kandidat, dan pembelian vote dalam satu layar.</p>
						</div>
						<button
							onClick={fetchDashboard}
							disabled={dashboardLoading}
							className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
						>
							<ArrowPathIcon className={`w-4 h-4 ${dashboardLoading ? "animate-spin" : ""}`} />
							Refresh
						</button>
					</div>

					{dashboardLoading && !dashboard ? (
						<div className="flex justify-center py-12">
							<div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
						</div>
					) : !dashboard ? (
						<div className="rounded-xl border border-gray-200/60 dark:border-gray-700/40 bg-white/80 dark:bg-gray-800/50 p-8 text-center text-gray-500 dark:text-gray-400">
							Dashboard voting belum tersedia.
						</div>
					) : (
						<>
							<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
								<div className="rounded-xl border border-gray-200/60 dark:border-gray-700/40 bg-white/90 dark:bg-gray-800/60 p-4">
									<div className="flex items-center justify-between">
										<p className="text-sm text-gray-500 dark:text-gray-400">Total Vote</p>
										<ChartBarIcon className="w-5 h-5 text-blue-500" />
									</div>
									<p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">{formatNumber(dashboard.totalVotes)}</p>
									<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{dashboard.categoryCount} kategori aktif</p>
								</div>
								<div className="rounded-xl border border-gray-200/60 dark:border-gray-700/40 bg-white/90 dark:bg-gray-800/60 p-4">
									<div className="flex items-center justify-between">
										<p className="text-sm text-gray-500 dark:text-gray-400">Nominee</p>
										<UserGroupIcon className="w-5 h-5 text-indigo-500" />
									</div>
									<p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">{formatNumber(dashboard.nomineeCount)}</p>
									<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Terdaftar di semua kategori</p>
								</div>
								<div className="rounded-xl border border-gray-200/60 dark:border-gray-700/40 bg-white/90 dark:bg-gray-800/60 p-4">
									<div className="flex items-center justify-between">
										<p className="text-sm text-gray-500 dark:text-gray-400">Vote Terpakai</p>
										<CheckCircleIcon className="w-5 h-5 text-emerald-500" />
									</div>
									<p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">{formatNumber(purchaseSummary?.usedVotes || dashboard.totalVotes)}</p>
									<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
										{purchaseSummary ? `${formatNumber(purchaseSummary.unusedVotes)} vote tersisa` : "Mode voting gratis"}
									</p>
								</div>
								<div className="rounded-xl border border-gray-200/60 dark:border-gray-700/40 bg-white/90 dark:bg-gray-800/60 p-4">
									<div className="flex items-center justify-between">
										<p className="text-sm text-gray-500 dark:text-gray-400">Pendapatan Vote</p>
										<CurrencyDollarIcon className="w-5 h-5 text-amber-500" />
									</div>
									<p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(purchaseSummary?.revenue || 0)}</p>
									<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
										{dashboard.isPaid ? `${purchaseSummary?.conversionRate || 0}% transaksi paid` : "Tidak berbayar"}
									</p>
								</div>
							</div>

							<div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
								<div className="xl:col-span-2 rounded-xl border border-gray-200/60 dark:border-gray-700/40 bg-white/90 dark:bg-gray-800/60 p-5">
									<div className="flex items-center justify-between gap-3 mb-5">
										<div>
											<h3 className="font-semibold text-gray-900 dark:text-white">Tren Vote 7 Hari</h3>
											<p className="text-xs text-gray-500 dark:text-gray-400">Aktivitas vote harian terbaru</p>
										</div>
										<ClockIcon className="w-5 h-5 text-gray-400" />
									</div>
									<div className="h-56 flex items-end gap-2 sm:gap-3">
										{dashboard.dailyTrend.map((item) => {
											const height = Math.max(6, Math.round((item.votes / dashboardTrendMax) * 100));
											return (
												<div key={item.date} className="flex-1 min-w-0 flex flex-col items-center gap-2">
													<div className="w-full h-44 flex items-end">
														<div
															className="w-full rounded-t-lg bg-blue-500 transition-all"
															style={{ height: `${height}%` }}
															title={`${item.votes} vote`}
														/>
													</div>
													<p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{item.label}</p>
												</div>
											);
										})}
									</div>
								</div>

								<div className="rounded-xl border border-gray-200/60 dark:border-gray-700/40 bg-white/90 dark:bg-gray-800/60 p-5">
									<h3 className="font-semibold text-gray-900 dark:text-white">Status Pembelian</h3>
									<p className="text-xs text-gray-500 dark:text-gray-400 mb-5">Distribusi transaksi vote</p>
									{purchaseSummary ? (
										<>
											<div
												className="mx-auto h-40 w-40 rounded-full"
												style={{
													background: `conic-gradient(#22c55e 0deg ${paidDegrees}deg, #f59e0b ${paidDegrees}deg ${paidDegrees + pendingDegrees}deg, #ef4444 ${paidDegrees + pendingDegrees}deg ${paidDegrees + pendingDegrees + cancelledDegrees}deg, #94a3b8 ${paidDegrees + pendingDegrees + cancelledDegrees}deg 360deg)`,
												}}
											>
												<div className="h-full w-full rounded-full p-5">
													<div className="h-full w-full rounded-full bg-white dark:bg-gray-800 flex flex-col items-center justify-center">
														<span className="text-2xl font-bold text-gray-900 dark:text-white">{purchaseSummary.total}</span>
														<span className="text-xs text-gray-500 dark:text-gray-400">transaksi</span>
													</div>
												</div>
											</div>
											<div className="grid grid-cols-2 gap-2 mt-5 text-xs">
												<div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-green-500" />Paid {purchaseSummary.paid}</div>
												<div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />Pending {purchaseSummary.pending}</div>
												<div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />Batal {purchaseSummary.cancelled}</div>
												<div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-slate-400" />Expired {purchaseSummary.expired}</div>
											</div>
										</>
									) : (
										<div className="h-48 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">Voting gratis</div>
									)}
								</div>
							</div>

							<div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
								<div className="rounded-xl border border-gray-200/60 dark:border-gray-700/40 bg-white/90 dark:bg-gray-800/60 p-5">
									<h3 className="font-semibold text-gray-900 dark:text-white">Performa Kategori</h3>
									<p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Perbandingan total vote per kategori</p>
									<div className="space-y-4">
										{dashboard.categoryBreakdown.map((cat) => {
											const pct = Math.round((cat.votes / dashboardCategoryMax) * 100);
											return (
												<div key={cat.id}>
													<div className="flex items-center justify-between gap-3 text-sm mb-1">
														<span className="font-medium text-gray-800 dark:text-gray-100 truncate">{cat.title}</span>
														<span className="text-gray-500 dark:text-gray-400">{formatNumber(cat.votes)} vote</span>
													</div>
													<div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
														<div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
													</div>
													<p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
														{cat.leadingNominee ? `Unggul: ${cat.leadingNominee.name}` : `${cat.nomineeCount} nominee`}
													</p>
												</div>
											);
										})}
										{dashboard.categoryBreakdown.length === 0 && (
											<p className="text-sm text-gray-500 dark:text-gray-400">Belum ada kategori voting.</p>
										)}
									</div>
								</div>

								<div className="rounded-xl border border-gray-200/60 dark:border-gray-700/40 bg-white/90 dark:bg-gray-800/60 p-5">
									<div className="flex items-center justify-between mb-4">
										<div>
											<h3 className="font-semibold text-gray-900 dark:text-white">Leaderboard Nominee</h3>
											<p className="text-xs text-gray-500 dark:text-gray-400">Kandidat dengan vote tertinggi lintas kategori</p>
										</div>
										<TrophyIcon className="w-5 h-5 text-amber-500" />
									</div>
									<div className="space-y-3">
										{dashboard.topNominees.map((nominee, index) => {
											const pct = Math.round((nominee.votes / dashboardTopMax) * 100);
											const photoUrl = getNomineePhotoUrl(nominee.photo);
											return (
												<div key={nominee.id} className="flex items-center gap-3">
													<div className="w-7 text-center text-sm font-bold text-gray-400">#{index + 1}</div>
													{photoUrl ? (
														<img src={photoUrl} alt="" className="w-10 h-10 rounded-full object-cover bg-gray-100 dark:bg-gray-700" />
													) : (
														<div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
															<UserIcon className="w-5 h-5 text-gray-400" />
														</div>
													)}
													<div className="min-w-0 flex-1">
														<div className="flex items-center justify-between gap-3">
															<p className="text-sm font-medium text-gray-900 dark:text-white truncate">{nominee.name}</p>
															<p className="text-sm font-semibold text-blue-600 dark:text-blue-400">{formatNumber(nominee.votes)}</p>
														</div>
														<div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden mt-1">
															<div className="h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
														</div>
														<p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400 truncate">{nominee.categoryTitle}</p>
													</div>
												</div>
											);
										})}
										{dashboard.topNominees.length === 0 && (
											<p className="text-sm text-gray-500 dark:text-gray-400">Belum ada nominee dengan vote.</p>
										)}
									</div>
								</div>
							</div>
						</>
					)}
				</div>
			)}

			{/* Config Tab */}
			{activeTab === "config" && (
				<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200/60 dark:border-gray-700/40 p-6 space-y-6">
					{/* Enable toggle */}
					<div className="flex items-center justify-between">
						<div>
							<h3 className="font-medium text-gray-900 dark:text-white">Aktifkan E-Voting</h3>
							<p className="text-sm text-gray-500">
								{votingShareLocked ? "Menunggu admin mengatur persentase bagi hasil voting" : "Izinkan publik untuk melakukan voting"}
							</p>
						</div>
						<button
							onClick={() => {
								if (!config.enabled && votingShareLocked) {
									Swal.fire(
										"Menunggu Admin",
										"Hubungi admin untuk negosiasi dan pengaturan persentase bagi hasil sebelum membuka E-Voting.",
										"info"
									);
									return;
								}
								setConfig({ ...config, enabled: !config.enabled });
							}}
							className={`relative w-11 h-6 rounded-full transition-colors ${
								config.enabled ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
							}`}
						>
							<span
								className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
									config.enabled ? "translate-x-5" : ""
								}`}
							/>
						</button>
					</div>

					{/* Paid toggle */}
					<div className="flex items-center justify-between">
						<div>
							<h3 className="font-medium text-gray-900 dark:text-white">Voting Berbayar</h3>
							<p className="text-sm text-gray-500">Voter harus membeli paket vote</p>
						</div>
						<button
							onClick={() => setConfig({ ...config, isPaid: !config.isPaid })}
							className={`relative w-11 h-6 rounded-full transition-colors ${
								config.isPaid ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
							}`}
						>
							<span
								className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
									config.isPaid ? "translate-x-5" : ""
								}`}
							/>
						</button>
					</div>

					{/* Price per vote */}
					{config.isPaid && (
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Harga per Vote (Rp)</label>
							<input
								type="number"
								min="0"
								value={config.pricePerVote || 0}
								onChange={(e) => setConfig({ ...config, pricePerVote: Number(e.target.value) })}
								className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white"
							/>
						</div>
					)}

					{/* Date range */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mulai Voting</label>
							<input
								type="datetime-local"
								value={formatDateForInput(config.startDate || null)}
								onChange={(e) => setConfig({ ...config, startDate: e.target.value || null })}
								className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Selesai Voting</label>
							<input
								type="datetime-local"
								value={formatDateForInput(config.endDate || null)}
								onChange={(e) => setConfig({ ...config, endDate: e.target.value || null })}
								className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white"
							/>
						</div>
					</div>

					<button
						onClick={handleSaveConfig}
						disabled={saving}
						className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
					>
						{saving ? "Menyimpan..." : "Simpan Konfigurasi"}
					</button>

					{/* Close Voting Button */}
					{config.enabled && (
						<div className="border-t border-gray-200/60 dark:border-gray-700/40 pt-6">
							<div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4">
								<div className="flex items-start justify-between gap-4">
									<div>
										<h3 className="font-medium text-red-800 dark:text-red-400">Tutup Voting</h3>
										<p className="text-sm text-red-600 dark:text-red-500 mt-0.5">
											Menonaktifkan voting dan menutup waktu voting sekarang juga. Publik tidak bisa lagi melakukan vote.
										</p>
									</div>
									<button
										onClick={async () => {
											const result = await Swal.fire({
												title: "Tutup Voting?",
												text: "Voting akan ditutup dan publik tidak bisa lagi melakukan vote. Lanjutkan?",
												icon: "warning",
												showCancelButton: true,
												confirmButtonColor: "#dc2626",
												confirmButtonText: "Ya, Tutup Voting",
												cancelButtonText: "Batal",
											});
											if (!result.isConfirmed) return;
											try {
												setClosingVoting(true);
												const res = await api.post(`/voting/admin/event/${eventId}/close-voting`);
												setConfig((prev: any) => ({ ...prev, enabled: false, endDate: res.data.endDate }));
												Swal.fire({ title: "Voting Ditutup!", text: "Voting berhasil ditutup", icon: "success", timer: 2000, showConfirmButton: false });
											} catch (err: any) {
												Swal.fire("Error", err.response?.data?.error || "Gagal menutup voting", "error");
											} finally {
												setClosingVoting(false);
											}
										}}
										disabled={closingVoting}
										className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium whitespace-nowrap"
									>
										<LockClosedIcon className="w-4 h-4" />
										{closingVoting ? "Menutup..." : "Tutup Voting"}
									</button>
								</div>
							</div>
						</div>
					)}
				</div>
			)}

			{/* Categories Tab */}
			{activeTab === "categories" && (
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white">Kategori Voting</h2>
						<button
							onClick={() => {
								resetCategoryForm();
								setEditingCategory(null);
								setShowCategoryForm(true);
							}}
							className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
						>
							<PlusIcon className="w-4 h-4" />
							Tambah
						</button>
					</div>

					{/* Category Form Modal */}
					{showCategoryForm && (
						<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCategoryForm(false)}>
							<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
								<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
									{editingCategory ? "Edit Kategori" : "Tambah Kategori"}
								</h3>

								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Judul *</label>
									<input
										type="text"
										value={categoryForm.title}
										onChange={(e) => setCategoryForm({ ...categoryForm, title: e.target.value })}
										placeholder="contoh: Tim Terfavorit"
										className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deskripsi</label>
									<textarea
										value={categoryForm.description}
										onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
										rows={2}
										className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mode Voting</label>
									<div className="flex gap-3">
										<button
											onClick={() => setCategoryForm({ ...categoryForm, mode: "TEAM", position: "" })}
											className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
												categoryForm.mode === "TEAM"
													? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
													: "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400"
											}`}
										>
											<UserGroupIcon className="w-5 h-5" />
											<span className="font-medium">Per Tim</span>
										</button>
										<button
											onClick={() => setCategoryForm({ ...categoryForm, mode: "PERSONAL" })}
											className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
												categoryForm.mode === "PERSONAL"
													? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
													: "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400"
											}`}
										>
											<UserIcon className="w-5 h-5" />
											<span className="font-medium">Personal</span>
										</button>
									</div>
								</div>

								{categoryForm.mode === "PERSONAL" && (
									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
											Posisi / Jabatan (filter)
										</label>
										<input
											type="text"
											value={categoryForm.position}
											onChange={(e) => setCategoryForm({ ...categoryForm, position: e.target.value })}
											placeholder="contoh: Komandan"
											className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white"
										/>
										<p className="text-xs text-gray-500 mt-1">Kosongkan untuk semua anggota</p>
									</div>
								)}

								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter Kategori Sekolah</label>
									<div className="flex flex-wrap gap-2">
										{schoolCategories.map((sc) => (
											<button
												key={sc.id}
												onClick={() => {
													const ids = categoryForm.schoolCategoryIds.includes(sc.id)
														? categoryForm.schoolCategoryIds.filter((id) => id !== sc.id)
														: [...categoryForm.schoolCategoryIds, sc.id];
													setCategoryForm({ ...categoryForm, schoolCategoryIds: ids });
												}}
												className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
													categoryForm.schoolCategoryIds.includes(sc.id)
														? "bg-blue-600 text-white"
														: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
												}`}
											>
												{sc.name}
											</button>
										))}
									</div>
									<p className="text-xs text-gray-500 mt-1">Kosongkan untuk semua kategori sekolah</p>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Maks Vote/Voter</label>
										<input
											type="number"
											min="1"
											value={categoryForm.maxVotesPerVoter}
											onChange={(e) => setCategoryForm({ ...categoryForm, maxVotesPerVoter: Number(e.target.value) })}
											className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white"
										/>
										<p className="text-xs text-gray-500 mt-1">Jumlah vote maksimal per orang di kategori ini</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Urutan</label>
										<input
											type="number"
											min="0"
											value={categoryForm.order}
											onChange={(e) => setCategoryForm({ ...categoryForm, order: Number(e.target.value) })}
											className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white"
										/>
										<p className="text-xs text-gray-500 mt-1">Urutan tampil di halaman voting (angka kecil tampil duluan)</p>
									</div>
								</div>

								<div className="flex gap-3 pt-2">
									<button
										onClick={() => { setShowCategoryForm(false); setEditingCategory(null); }}
										className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
									>
										Batal
									</button>
									<button
										onClick={handleSaveCategory}
										className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
									>
										{editingCategory ? "Perbarui" : "Simpan"}
									</button>
								</div>
							</div>
						</div>
					)}

					{/* Category List */}
					{categories.length === 0 ? (
						<div className="text-center py-12 text-gray-500 dark:text-gray-400">
							<ListBulletIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
							<p>Belum ada kategori voting</p>
							<p className="text-sm mt-1">Tambahkan kategori voting pertama</p>
						</div>
					) : (
						<div className="space-y-3">
							{categories.map((cat) => (
								<div
									key={cat.id}
									className={`bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border transition-colors cursor-pointer ${
										selectedCategoryId === cat.id
											? "border-blue-500 ring-1 ring-blue-500"
											: "border-gray-200/60 dark:border-gray-700/40"
									}`}
								>
									<div
										className="p-4 flex items-center justify-between"
										onClick={() => {
											if (selectedCategoryId === cat.id) {
												setSelectedCategoryId(null);
												setNominees([]);
												setShowAddNomineeForm(false);
											} else {
												setSelectedCategoryId(cat.id);
												setShowAddNomineeForm(false);
												fetchNominees(cat.id);
											}
										}}
									>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2">
												<h3 className="font-medium text-gray-900 dark:text-white truncate">{cat.title}</h3>
												<span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
													cat.mode === "TEAM"
														? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
														: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400"
												}`}>
													{cat.mode === "TEAM" ? "Tim" : "Personal"}
												</span>
												{!cat.isActive && (
													<span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
														Nonaktif
													</span>
												)}
											</div>
											<div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
												<span>{cat._count?.nominees ?? 0} nominee</span>
												<span>{cat._count?.votes ?? 0} vote</span>
												{cat.position && <span>Posisi: {cat.position}</span>}
											</div>
										</div>
										<div className="flex items-center gap-1 ml-3" onClick={(e) => e.stopPropagation()}>
											<button
												onClick={() => openEditCategory(cat)}
												className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
												title="Edit"
											>
												<Cog6ToothIcon className="w-4 h-4" />
											</button>
											<button
												onClick={() => handleDeleteCategory(cat.id)}
												className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
												title="Hapus"
											>
												<TrashIcon className="w-4 h-4" />
											</button>
										</div>
									</div>

									{/* Nominees Panel */}
									{selectedCategoryId === cat.id && (
										<div className="border-t border-gray-200/60 dark:border-gray-700/40 p-4 space-y-3">
											<div className="flex items-center justify-between gap-2 flex-wrap">
												<h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Nominee ({nominees.length})</h4>
												<div className="flex items-center gap-2">
													<button
														onClick={() => {
															setShowAddNomineeForm((v) => !v);
															setNomineeForm({ nomineeName: "", nomineeSubtitle: "" });
														}}
														className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium"
													>
														<PlusIcon className="w-3.5 h-3.5" />
														Tambah Nominee
													</button>
													<button
														onClick={() => handleSyncNominees(cat.id)}
														disabled={syncing}
														className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-medium disabled:opacity-50"
													>
														<ArrowPathIcon className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
														Sinkronisasi
													</button>
												</div>
											</div>

											{/* Add Nominee Form */}
											{showAddNomineeForm && (
												<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 rounded-xl p-4 space-y-3">
													<p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Tambah Nominee Manual</p>
													<div>
														<label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Nominee <span className="text-red-500">*</span></label>
														<input
															type="text"
															value={nomineeForm.nomineeName}
															onChange={(e) => setNomineeForm((f) => ({ ...f, nomineeName: e.target.value }))}
															placeholder="Nama tim / peserta"
															className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
														/>
													</div>
													<div>
														<label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Subtitle <span className="text-gray-400">(opsional)</span></label>
														<input
															type="text"
															value={nomineeForm.nomineeSubtitle}
															onChange={(e) => setNomineeForm((f) => ({ ...f, nomineeSubtitle: e.target.value }))}
															placeholder="Contoh: nama sekolah, asal kota"
															className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
														/>
													</div>
													<div>
														<label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Foto Nominee <span className="text-gray-400">(opsional)</span></label>
														<input
															type="file"
															accept="image/jpeg,image/jpg,image/png,image/webp"
															ref={nomineePhotoInputRef}
															className="hidden"
															onChange={(e) => {
																const file = e.target.files?.[0] || null;
																if (file) {
																	const objectUrl = URL.createObjectURL(file);
																	setCropImageSrc(objectUrl);
																	setCropTarget("add");
																	setShowCropper(true);
																}
																// Reset input so same file can be re-selected
																if (nomineePhotoInputRef.current) nomineePhotoInputRef.current.value = "";
															}}
														/>
														<div className="flex items-center gap-3">
															<button
																type="button"
																onClick={() => nomineePhotoInputRef.current?.click()}
																className="px-3 py-2 text-sm rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 transition-colors"
															>
																{nomineePhotoFile ? "Ganti Foto" : "Pilih Foto"}
															</button>
															{nomineePhotoPreview ? (
																<div className="flex items-center gap-2">
																	<img src={nomineePhotoPreview} alt="preview" className="w-10 h-10 rounded-full object-cover border border-gray-300" />
																	<span className="text-xs text-gray-500 truncate max-w-[140px]">{nomineePhotoFile?.name}</span>
																	<button
																		type="button"
																		onClick={() => { setNomineePhotoFile(null); setNomineePhotoPreview(null); if (nomineePhotoInputRef.current) nomineePhotoInputRef.current.value = ""; }}
																		className="text-red-500 hover:text-red-700 text-xs"
																	>
																		✕
																	</button>
																</div>
															) : (
																<span className="text-xs text-gray-400">JPG, PNG, WEBP — maks 3MB</span>
															)}
														</div>
													</div>
													<div className="flex gap-2 justify-end">
														<button
															onClick={() => {
																setShowAddNomineeForm(false);
																setNomineePhotoFile(null);
																setNomineePhotoPreview(null);
																setNomineeForm({ nomineeName: "", nomineeSubtitle: "" });
															}}
															className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
														>
															Batal
														</button>
														<button
															onClick={() => handleAddNominee(cat.id)}
															disabled={addingNominee || !nomineeForm.nomineeName.trim()}
															className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium disabled:opacity-50"
														>
															{addingNominee ? "Menyimpan..." : "Simpan Nominee"}
														</button>
													</div>
												</div>
											)}

											{nominees.length === 0 ? (
												<p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
													Belum ada nominee. Klik "Tambah Nominee" untuk tambah manual atau "Sinkronisasi" untuk mengambil data dari peserta event.
												</p>
											) : (
												<div className="grid gap-2">
													{nominees.map((nominee, idx) => (
														<div key={nominee.id} className="rounded-lg bg-gray-50 dark:bg-gray-700/50">
															{editingNominee?.id === nominee.id ? (
																/* ---- Inline Edit Form ---- */
																<div className="p-3 space-y-3">
																	<p className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">Edit Nominee</p>
																	<div>
																		<label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Nominee <span className="text-red-500">*</span></label>
																		<input
																			type="text"
																			value={editNomineeForm.nomineeName}
																			onChange={(e) => setEditNomineeForm((f) => ({ ...f, nomineeName: e.target.value }))}
																			className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
																		/>
																	</div>
																	<div>
																		<label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Subtitle <span className="text-gray-400">(opsional)</span></label>
																		<input
																			type="text"
																			value={editNomineeForm.nomineeSubtitle}
																			onChange={(e) => setEditNomineeForm((f) => ({ ...f, nomineeSubtitle: e.target.value }))}
																			placeholder="Contoh: nama sekolah, asal kota"
																			className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
																		/>
																	</div>
																	<div>
																		<label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Foto Nominee <span className="text-gray-400">(opsional)</span></label>
																		<input
																			type="file"
																			accept="image/jpeg,image/jpg,image/png,image/webp"
																			ref={editNomineePhotoInputRef}
																			className="hidden"
																			onChange={(e) => {
																				const file = e.target.files?.[0] || null;
																				if (file) {
																					const objectUrl = URL.createObjectURL(file);
																					setCropImageSrc(objectUrl);
																					setCropTarget("edit");
																					setShowCropper(true);
																				}
																				if (editNomineePhotoInputRef.current) editNomineePhotoInputRef.current.value = "";
																			}}
																		/>
																		<div className="flex items-center gap-3">
																			<button
																				type="button"
																				onClick={() => editNomineePhotoInputRef.current?.click()}
																				className="px-3 py-2 text-sm rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:border-amber-400 hover:text-amber-600 transition-colors"
																			>
																				{editNomineePhotoFile ? "Ganti Foto" : "Pilih Foto"}
																			</button>
																			{editNomineePhotoPreview ? (
																				<div className="flex items-center gap-2">
																					<img src={editNomineePhotoPreview} alt="preview" className="w-10 h-10 rounded-full object-cover border border-gray-300" />
																					<button
																						type="button"
																						onClick={() => { setEditNomineePhotoFile(null); setEditNomineePhotoPreview(null); setClearNomineePhoto(true); }}
																						className="text-red-500 hover:text-red-700 text-xs"
																					>✕ Hapus foto</button>
																				</div>
																			) : editingNominee.nomineePhoto && !clearNomineePhoto ? (
																				<div className="flex items-center gap-2">
																					<img src={editingNominee.nomineePhoto.startsWith("http") ? editingNominee.nomineePhoto : (appConfig.api.backendUrl + editingNominee.nomineePhoto)} alt="" className="w-10 h-10 rounded-full object-cover border border-gray-300" />
																					<button
																						type="button"
																						onClick={() => setClearNomineePhoto(true)}
																						className="text-red-500 hover:text-red-700 text-xs"
																					>✕ Hapus foto</button>
																				</div>
																			) : (
																				<span className="text-xs text-gray-400">JPG, PNG, WEBP — maks 3MB</span>
																			)}
																		</div>
																	</div>
																	<div className="flex gap-2 justify-end">
																		<button
																			onClick={() => {
																				setEditingNominee(null);
																				setEditNomineeForm({ nomineeName: "", nomineeSubtitle: "" });
																				setEditNomineePhotoFile(null);
																				setEditNomineePhotoPreview(null);
																				setClearNomineePhoto(false);
																			}}
																			className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
																		>
																			Batal
																		</button>
																		<button
																			onClick={handleUpdateNominee}
																			disabled={savingNominee || !editNomineeForm.nomineeName.trim()}
																			className="px-4 py-2 text-sm rounded-lg bg-amber-500 text-white hover:bg-amber-600 font-medium disabled:opacity-50"
																		>
																			{savingNominee ? "Menyimpan..." : "Simpan Perubahan"}
																		</button>
																	</div>
																</div>
															) : (
																/* ---- Normal Nominee Row ---- */
																<div className="flex items-center justify-between py-2 px-3">
																	<div className="flex items-center gap-3 min-w-0">
																		<span className="text-sm font-semibold text-gray-400 w-5 text-right">{idx + 1}</span>
																		{nominee.nomineePhoto ? (
																			<img src={nominee.nomineePhoto.startsWith("http") ? nominee.nomineePhoto : (appConfig.api.backendUrl + nominee.nomineePhoto)} alt="" className="w-8 h-8 rounded-full object-cover" />
																		) : (
																			<div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
																				<UserIcon className="w-4 h-4 text-gray-500" />
																			</div>
																		)}
																		<div className="min-w-0">
																			<p className="text-sm font-medium text-gray-900 dark:text-white truncate">{nominee.nomineeName}</p>
																			{nominee.nomineeSubtitle && (
																				<p className="text-xs text-gray-500 dark:text-gray-400 truncate">{nominee.nomineeSubtitle}</p>
																			)}
																		</div>
																	</div>
																	<div className="flex items-center gap-2 ml-3">
																		<span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{nominee.voteCount}</span>
																		<button
																			onClick={() => {
																				setEditingNominee(nominee);
																				setEditNomineeForm({ nomineeName: nominee.nomineeName, nomineeSubtitle: nominee.nomineeSubtitle || "" });
																				setEditNomineePhotoFile(null);
																				setEditNomineePhotoPreview(null);
																				setClearNomineePhoto(false);
																				setShowAddNomineeForm(false);
																			}}
																			className="p-1 text-gray-400 hover:text-amber-600 rounded"
																			title="Edit nominee"
																		>
																			<PencilSquareIcon className="w-3.5 h-3.5" />
																		</button>
																		<button
																			onClick={() => handleDeleteNominee(nominee.id)}
																			className="p-1 text-gray-400 hover:text-red-600 rounded"
																		>
																			<TrashIcon className="w-3.5 h-3.5" />
																		</button>
																	</div>
																</div>
															)}
														</div>
													))}
												</div>
											)}
										</div>
									)}
								</div>
							))}
						</div>
					)}
				</div>
			)}

			{/* Results Tab */}
			{activeTab === "results" && (
				<div className="space-y-6">
					<div className="flex items-center justify-between flex-wrap gap-2">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white">Hasil Voting</h2>
						<div className="flex items-center gap-4">
							{results.isPaid && (
								<span className="text-sm text-green-600 dark:text-green-400 font-medium">
									Total Pendapatan: {formatCurrency(results.totalVotes * results.pricePerVote)}
								</span>
							)}
							<span className="text-sm text-gray-500 dark:text-gray-400">Total: {results.totalVotes} vote</span>
						</div>
					</div>

					{results.categories.length === 0 ? (
						<div className="text-center py-12 text-gray-500 dark:text-gray-400">
							<ChartBarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
							<p>Belum ada data voting</p>
						</div>
					) : (
						results.categories.map((cat) => (
							<div key={cat.id} className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/60 dark:border-gray-700/40 overflow-hidden">
								<div className="flex items-center justify-between p-4 border-b border-gray-200/60 dark:border-gray-700/40">
									<h3 className="font-semibold text-gray-900 dark:text-white">{cat.title}</h3>
									<span className="text-sm text-gray-500">{cat._count.votes} vote</span>
								</div>
								{/* Table header */}
								<div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50/80 dark:bg-gray-700/30 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									<div className="col-span-1 text-center">#</div>
									<div className="col-span-5">Peserta</div>
									<div className="col-span-3 text-right">Total Voting</div>
									{results.isPaid && <div className="col-span-3 text-right">Total Pendapatan</div>}
									{!results.isPaid && <div className="col-span-3"></div>}
								</div>
								{/* Nominees rows */}
								<div className="divide-y divide-gray-100 dark:divide-gray-700/40">
									{cat.nominees.map((nominee: any, idx: number) => {
										const maxVotes = cat.nominees[0]?.voteCount || 1;
										const pct = maxVotes > 0 ? (nominee.voteCount / maxVotes) * 100 : 0;
										const revenue = nominee.voteCount * results.pricePerVote;
										return (
											<div key={nominee.id} className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
												<div className="col-span-1 text-center">
													{idx < 3 ? (
														<span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white ${
															idx === 0 ? "bg-yellow-500" : idx === 1 ? "bg-gray-400" : "bg-amber-700"
														}`}>
															{idx + 1}
														</span>
													) : (
														<span className="text-sm text-gray-400">{idx + 1}</span>
													)}
												</div>
												<div className="col-span-5 min-w-0">
													<p className="text-sm font-medium text-gray-900 dark:text-white truncate">{nominee.nomineeName}</p>
													{/* Mini progress bar */}
													<div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 mt-1">
														<div
															className={`h-1.5 rounded-full transition-all ${idx === 0 ? "bg-yellow-500" : idx === 1 ? "bg-gray-400" : idx === 2 ? "bg-amber-700" : "bg-blue-500"}`}
															style={{ width: `${pct}%` }}
														/>
													</div>
												</div>
												<div className="col-span-3 text-right">
													<span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{nominee.voteCount}</span>
												</div>
												{results.isPaid && (
													<div className="col-span-3 text-right">
														<span className="text-sm font-semibold text-green-600 dark:text-green-400">{formatCurrency(revenue)}</span>
													</div>
												)}
												{!results.isPaid && <div className="col-span-3"></div>}
											</div>
										);
									})}
								</div>
							</div>
						))
					)}
				</div>
			)}

			{/* Purchases Tab */}
			{activeTab === "purchases" && (
				<div className="space-y-4">
					<div className="flex flex-col sm:flex-row gap-3">
						<input
							type="text"
							value={search}
							onChange={(e) => { setSearch(e.target.value); setPage(1); }}
							placeholder="Cari nama, email, kode..."
							className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white text-sm"
						/>
						<select
							value={statusFilter}
							onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
							className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white text-sm"
						>
							<option value="">Semua Status</option>
							<option value="PENDING">Pending</option>
							<option value="PAID">Paid</option>
							<option value="CANCELLED">Cancelled</option>
							<option value="EXPIRED">Expired</option>
						</select>
					</div>

					{purchasesLoading ? (
						<div className="flex justify-center py-8">
							<div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
						</div>
					) : purchases.length === 0 ? (
						<div className="text-center py-12 text-gray-500 dark:text-gray-400">
							<ClipboardDocumentListIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
							<p>Belum ada pembelian vote</p>
						</div>
					) : (
						<div className="space-y-2">
							{purchases.map((p) => (
								<div key={p.id} className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/60 dark:border-gray-700/40 p-4">
									<div className="flex items-center justify-between mb-2">
										<span className="text-xs font-mono text-gray-500 dark:text-gray-400">{p.purchaseCode}</span>
										{getStatusBadge(p.status)}
									</div>
									<div className="flex items-center justify-between">
										<div>
											<p className="font-medium text-gray-900 dark:text-white">{p.buyerName}</p>
											<p className="text-xs text-gray-500">{p.buyerEmail}</p>
										</div>
										<div className="text-right">
											<p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(p.totalAmount)}</p>
											<p className="text-xs text-gray-500">{p.voteCount} vote ({p.usedVotes} terpakai)</p>
										</div>
									</div>
									<div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200/60 dark:border-gray-700/40">
										<span className="text-xs text-gray-500">{formatDate(p.createdAt)}</span>
										<div className="flex gap-2 items-center">
											{p.status === "PAID" && (
												<button
													onClick={() => handleResendVotingEmail(p.id, p.buyerEmail)}
													title="Kirim Ulang Email Kode Vote"
													className="flex items-center gap-1.5 text-xs px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
												>
													<EnvelopeIcon className="w-3.5 h-3.5" />
													Kirim Ulang Email
												</button>
											)}
											{p.status === "PENDING" && (
												<span className="text-xs px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-lg">
													Menunggu pembayaran via Midtrans
												</span>
											)}
										</div>
									</div>
								</div>
							))}

							{/* Pagination */}
							{totalPages > 1 && (
								<div className="flex justify-center gap-2 pt-4">
									{Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
										<button
											key={p}
											onClick={() => setPage(p)}
											className={`w-8 h-8 rounded-lg text-sm font-medium ${
												page === p ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
											}`}
										>
											{p}
										</button>
									))}
								</div>
							)}
						</div>
					)}
				</div>
			)}
		</div>

		{/* Image Cropper Modal */}
		{showCropper && cropImageSrc && (
			<ImageCropper
				imageSrc={cropImageSrc}
				aspectRatio={3 / 4}
				cropShape="rect"
				onCropComplete={(croppedBlob) => {
					const croppedFile = new File([croppedBlob], "nominee-photo.jpg", { type: "image/jpeg" });
					if (cropTarget === "edit") {
						setEditNomineePhotoFile(croppedFile);
						setEditNomineePhotoPreview(URL.createObjectURL(croppedBlob));
						setClearNomineePhoto(false);
					} else {
						setNomineePhotoFile(croppedFile);
						setNomineePhotoPreview(URL.createObjectURL(croppedBlob));
					}
					setShowCropper(false);
					if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
					setCropImageSrc(null);
				}}
				onCancel={() => {
					setShowCropper(false);
					if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
					setCropImageSrc(null);
				}}
			/>
		)}
		</>
	);
};

export default EventVoting;

