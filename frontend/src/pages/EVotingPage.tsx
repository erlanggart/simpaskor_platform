import React, { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../utils/api";
import { config } from "../utils/config";
import { useAuth } from "../hooks/useAuth";
import { usePayment } from "../hooks/usePayment";
import { VotingEvent } from "../types/voting";
import {
	LuArrowLeft,
	LuArrowRight,
	LuCalendar,
	LuChevronLeft,
	LuChevronRight,
	LuCircleCheck,
	LuClock,
	LuCrown,
	LuMail,
	LuMapPin,
	LuMedal,
	LuPhone,
	LuSearch,
	LuSparkles,
	LuThumbsUp,
	LuTicket,
	LuTrophy,
	LuUser,
	LuUsers,
	LuX,
} from "react-icons/lu";
import Swal from "sweetalert2";
import { GMAIL_ONLY_EMAIL_MESSAGE, isGmailEmail } from "../utils/emailPolicy";

type VoteCodeInfo = {
	purchaseCode: string;
	eventId: string;
	eventTitle?: string;
	status: string;
	voteCount: number;
	usedVotes: number;
	remainingVotes: number;
	message?: string;
};

const VOTING_ADMIN_FEE_PER_VOTE = 500;
const VOTING_MAX_ADMIN_FEE = 10000;

const calculateVotingAdminFee = (subtotal: number, voteCount: number) => {
	if (subtotal <= 0) return 0;
	return Math.min(VOTING_ADMIN_FEE_PER_VOTE * voteCount, VOTING_MAX_ADMIN_FEE);
};

const EVotingPage: React.FC = () => {
	const { user } = useAuth();
	const { pay, isSnapReady } = usePayment();
	const [events, setEvents] = useState<VotingEvent[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [statusFilter, setStatusFilter] = useState<"all" | "open" | "upcoming" | "ended">("all");

	// Voting detail view
	const [selectedEvent, setSelectedEvent] = useState<VotingEvent | null>(null);
	const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
	const [voting, setVoting] = useState(false);
	const [votedNominees, setVotedNominees] = useState<Set<string>>(new Set());

	// Purchase modal (for paid voting)
	const [showPurchaseModal, setShowPurchaseModal] = useState(false);
	const [buyerName, setBuyerName] = useState(user?.name || "");
	const [buyerEmail, setBuyerEmail] = useState(user?.email || "");
	const [buyerPhone, setBuyerPhone] = useState("");
	const [voteCount, setVoteCount] = useState(1);
	const [purchasing, setPurchasing] = useState(false);

	// Purchase code entry for paid voting
	const [showCodeEntry, setShowCodeEntry] = useState(false);
	const [purchaseCode, setPurchaseCode] = useState("");
	const [voteCodeInfo, setVoteCodeInfo] = useState<VoteCodeInfo | null>(null);
	const [checkingVoteCode, setCheckingVoteCode] = useState(false);
	const [paidVoteTarget, setPaidVoteTarget] = useState<{ categoryId: string; nomineeId: string } | null>(null);
	const normalizePurchaseCode = (value: string) => value.toUpperCase().replace(/[\s\u200B-\u200D\uFEFF]+/g, "");

	const fetchEvents = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const params: any = { page, limit: 25 };
			if (search) params.search = search;

			const res = await api.get("/voting/events", { params });
			setEvents(res.data.data);
			setTotalPages(res.data.totalPages);
		} catch (err: any) {
			console.error("Error fetching voting events:", err);
			setError(err.response?.data?.error || err.message || "Gagal memuat data event voting");
		} finally {
			setLoading(false);
		}
	}, [page, search]);

	useEffect(() => {
		fetchEvents();
	}, [fetchEvents]);

	useEffect(() => {
		if (user) {
			setBuyerName(user.name);
			setBuyerEmail(user.email);
		}
	}, [user]);

	const fetchEventDetail = async (eventId: string) => {
		try {
			const res = await api.get(`/voting/events/${eventId}`);
			setSelectedEvent(res.data);
			// Set first category as selected
			if (res.data.votingConfig?.categories?.length > 0) {
				setSelectedCategoryId(res.data.votingConfig.categories[0].id);
			}
		} catch {
			Swal.fire("Error", "Gagal memuat detail voting", "error");
		}
	};

	const clearActiveVoteCode = () => {
		setPurchaseCode("");
		setVoteCodeInfo(null);
		setPaidVoteTarget(null);
		setShowCodeEntry(false);
	};

	const openVotingEvent = (eventId: string) => {
		clearActiveVoteCode();
		setVotedNominees(new Set());
		fetchEventDetail(eventId);
	};

	const checkVoteCode = async (code = purchaseCode): Promise<VoteCodeInfo | null> => {
		const normalizedCode = normalizePurchaseCode(code);
		if (!normalizedCode) {
			Swal.fire("Kode Kosong", "Masukkan kode vote atau ID pesanan terlebih dahulu", "warning");
			return null;
		}

		try {
			setCheckingVoteCode(true);
			const res = await api.post("/voting/code-status", {
				purchaseCode: normalizedCode,
				eventId: selectedEvent?.id,
			});
			const codeInfo: VoteCodeInfo = res.data;
			setPurchaseCode(codeInfo.purchaseCode);
			setVoteCodeInfo(codeInfo);

			if (codeInfo.status !== "PAID") {
				Swal.fire("Kode Belum Aktif", codeInfo.message || "Kode vote belum bisa digunakan", "warning");
				return null;
			}
			if (codeInfo.remainingVotes <= 0) {
				Swal.fire("Vote Habis", "Semua vote pada kode ini sudah digunakan", "info");
				return null;
			}

			return codeInfo;
		} catch (err: any) {
			const message = err.response?.data?.error || "Gagal memeriksa kode vote";
			setVoteCodeInfo(null);
			Swal.fire("Gagal", message, "error");
			return null;
		} finally {
			setCheckingVoteCode(false);
		}
	};

	const formatDate = (date: string) => {
		return new Date(date).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("id-ID", {
			style: "currency",
			currency: "IDR",
			minimumFractionDigits: 0,
		}).format(amount);
	};

	const getVotingOrderSummary = () => {
		const subtotal = (selectedEvent?.votingConfig?.pricePerVote || 0) * voteCount;
		const adminFee = calculateVotingAdminFee(subtotal, voteCount);
		return {
			subtotal,
			adminFee,
			totalBeforeQris: subtotal + adminFee,
		};
	};

	const handleFreeVote = async (categoryId: string, nomineeId: string) => {
		const result = await Swal.fire({
			title: "Konfirmasi Vote",
			text: "Apakah Anda yakin ingin memberikan vote?",
			icon: "question",
			showCancelButton: true,
			confirmButtonText: "Vote!",
			cancelButtonText: "Batal",
			confirmButtonColor: "#dc2626",
		});

		if (!result.isConfirmed) return;

		try {
			setVoting(true);
			await api.post("/voting/vote", {
				categoryId,
				nomineeId,
				voterName: user?.name || undefined,
				voterEmail: user?.email || undefined,
			});

			setVotedNominees((prev) => new Set([...prev, nomineeId]));

			Swal.fire({
				title: "Vote Berhasil!",
				icon: "success",
				timer: 1500,
				showConfirmButton: false,
			});

			// Refresh detail
			if (selectedEvent) {
				fetchEventDetail(selectedEvent.id);
			}
		} catch (err: any) {
			Swal.fire("Gagal", err.response?.data?.error || "Gagal melakukan vote", "error");
		} finally {
			setVoting(false);
		}
	};

	const castPaidVote = async (target: { categoryId: string; nomineeId: string }, code: string) => {
		try {
			setVoting(true);
			const normalizedCode = normalizePurchaseCode(code);
			const res = await api.post("/voting/vote-paid", {
				categoryId: target.categoryId,
				nomineeId: target.nomineeId,
				purchaseCode: normalizedCode,
				voterName: user?.name || undefined,
				voterEmail: user?.email || undefined,
			});
			const activeCode = res.data.purchaseCode || normalizedCode;

			const nextCodeInfo: VoteCodeInfo = {
				purchaseCode: activeCode,
				eventId: selectedEvent?.id || "",
				status: "PAID",
				voteCount: res.data.voteCount,
				usedVotes: res.data.usedVotes,
				remainingVotes: res.data.remainingVotes,
				message: res.data.remainingVotes > 0 ? "Kode vote aktif" : "Semua vote pada kode ini sudah digunakan",
			};
			setPurchaseCode(activeCode);
			setVoteCodeInfo(nextCodeInfo);
			setShowCodeEntry(false);
			setPaidVoteTarget(null);

			Swal.fire({
				title: "Vote Berhasil!",
				text: `Sisa vote pada kode ini: ${nextCodeInfo.remainingVotes}`,
				icon: "success",
				timer: 1500,
				showConfirmButton: false,
			});

			if (selectedEvent) {
				fetchEventDetail(selectedEvent.id);
			}
		} catch (err: any) {
			Swal.fire("Gagal", err.response?.data?.error || "Gagal melakukan vote", "error");
		} finally {
			setVoting(false);
		}
	};

	const handlePaidVote = async (categoryId: string, nomineeId: string) => {
		const target = { categoryId, nomineeId };
		if (voteCodeInfo?.status === "PAID" && voteCodeInfo.remainingVotes > 0 && purchaseCode.trim()) {
			await castPaidVote(target, purchaseCode);
			return;
		}

		setPaidVoteTarget(target);
		setShowCodeEntry(true);
	};

	const submitPaidVote = async () => {
		if (!paidVoteTarget || !purchaseCode.trim()) return;

		const codeInfo = await checkVoteCode(purchaseCode);
		if (!codeInfo) return;

		await castPaidVote(paidVoteTarget, codeInfo.purchaseCode);
	};

	const handlePurchaseVotes = async () => {
		if (!selectedEvent || !buyerName.trim() || !buyerEmail.trim()) {
			Swal.fire("Error", "Nama dan email wajib diisi", "error");
			return;
		}
		if (!isGmailEmail(buyerEmail)) {
			Swal.fire("Error", `Email pembeli ${GMAIL_ONLY_EMAIL_MESSAGE}`, "error");
			return;
		}

		try {
			setPurchasing(true);
			const res = await api.post("/voting/purchase", {
				eventId: selectedEvent.id,
				buyerName: buyerName.trim(),
				buyerEmail: buyerEmail.trim(),
				buyerPhone: buyerPhone.trim() || undefined,
				voteCount,
			});

			const { snapToken, purchaseCode, totalAmount } = res.data.purchase;
			const adminFee = res.data.purchase.adminFee ?? calculateVotingAdminFee(totalAmount, voteCount);
			const paymentAmount = res.data.purchase.paymentAmount ?? totalAmount + adminFee;

			if (snapToken && isSnapReady && totalAmount > 0) {
				setShowPurchaseModal(false);
				// Open Midtrans Snap payment popup
				pay(snapToken, {
					onSuccess: async () => {
						try {
							const confirmRes = await api.post("/voting/confirm-payment", {
								purchaseCode,
								email: buyerEmail.trim(),
							});
							if (confirmRes.data.status !== "PAID") {
								throw new Error(confirmRes.data.message || "Pembayaran vote belum dikonfirmasi");
							}
							const normalizedCode = normalizePurchaseCode(purchaseCode);
							const confirmedVoteCount = confirmRes.data.voteCount ?? voteCount;
							const confirmedUsedVotes = confirmRes.data.usedVotes ?? 0;
							setPurchaseCode(normalizedCode);
							setVoteCodeInfo({
								purchaseCode: normalizedCode,
								eventId: selectedEvent.id,
								status: "PAID",
								voteCount: confirmedVoteCount,
								usedVotes: confirmedUsedVotes,
								remainingVotes: Math.max(0, confirmedVoteCount - confirmedUsedVotes),
								message: "Kode vote aktif",
							});
							Swal.fire({
								title: "Pembayaran Berhasil!",
								html: `<div class="text-left space-y-2">
									<p><strong>Kode:</strong> <span class="font-mono text-lg">${purchaseCode}</span></p>
									<p><strong>Jumlah Vote:</strong> ${voteCount}</p>
									<p><strong>Subtotal Vote:</strong> ${formatCurrency(totalAmount)}</p>
									<p><strong>Biaya Admin:</strong> ${formatCurrency(adminFee)}</p>
									<p><strong>Total sebelum QRIS:</strong> ${formatCurrency(paymentAmount)}</p>
									<p class="text-sm text-gray-500 mt-3">Kode vote juga dikirim ke email Anda dan sudah aktif di halaman ini.</p>
								</div>`,
								icon: "success",
								confirmButtonColor: "#dc2626",
							});
						} catch (err: any) {
							Swal.fire({
								title: "Menunggu Konfirmasi Pembayaran",
								html: `<div class="text-left space-y-2">
									<p>Pembayaran sudah diterima Midtrans, tetapi server masih menunggu konfirmasi.</p>
									<p class="text-sm text-gray-500">Kode vote akan aktif dan dikirim ke email setelah pembayaran terkonfirmasi. Coba lagi beberapa saat lagi.</p>
								</div>`,
								icon: "info",
								confirmButtonColor: "#dc2626",
							});
							console.error("Voting payment confirmation pending:", err);
						}
					},
					onPending: () => {
						Swal.fire({
							title: "Menunggu Pembayaran",
							html: `<p>Pembayaran sedang diproses. Kode vote akan dikirim ke email Anda setelah pembayaran dikonfirmasi.</p>`,
							icon: "info",
							confirmButtonColor: "#dc2626",
						});
					},
					onError: () => {
						Swal.fire("Pembayaran Gagal", "Pembayaran tidak berhasil. Vote tidak aktif.", "error");
					},
					onClose: () => {
						Swal.fire("Pembayaran Belum Selesai", "Pembayaran belum dilakukan. Kode vote akan dikirim ke email Anda setelah pembayaran berhasil.", "warning");
					},
				});
			} else if (totalAmount === 0) {
				setShowPurchaseModal(false);
				const normalizedCode = normalizePurchaseCode(purchaseCode);
				setPurchaseCode(normalizedCode);
				setVoteCodeInfo({
					purchaseCode: normalizedCode,
					eventId: selectedEvent.id,
					status: "PAID",
					voteCount,
					usedVotes: 0,
					remainingVotes: voteCount,
					message: "Kode vote aktif",
				});
				Swal.fire({
					title: res.data.message,
					html: `<div class="text-left space-y-2">
						<p><strong>Kode:</strong> <span class="font-mono text-lg">${purchaseCode}</span></p>
						<p><strong>Jumlah Vote:</strong> ${voteCount}</p>
						<p><strong>Subtotal Vote:</strong> ${formatCurrency(totalAmount)}</p>
						<p><strong>Biaya Admin:</strong> ${formatCurrency(adminFee)}</p>
						<p><strong>Total sebelum QRIS:</strong> ${formatCurrency(paymentAmount)}</p>
						<p class="text-sm text-gray-500 mt-3">Kode ini sudah aktif di halaman ini. Klik peserta untuk memakai jatah vote.</p>
					</div>`,
					icon: "success",
					confirmButtonColor: "#dc2626",
				});
			} else {
				setShowPurchaseModal(false);
				Swal.fire({
					title: "Pembayaran Belum Siap",
					html: `<div class="text-left space-y-2">
						<p>Pesanan vote sudah dibuat, tetapi halaman pembayaran belum bisa dibuka.</p>
						<p><strong>Kode:</strong> <span class="font-mono text-lg">${purchaseCode}</span></p>
						<p><strong>Total sebelum QRIS:</strong> ${formatCurrency(paymentAmount)}</p>
						<p class="text-sm text-gray-500 mt-3">Kode belum aktif sebelum pembayaran berhasil. Muat ulang halaman lalu coba beli lagi, atau hubungi panitia jika kendala berlanjut.</p>
					</div>`,
					icon: "warning",
					confirmButtonColor: "#dc2626",
				});
			}
		} catch (err: any) {
			Swal.fire("Gagal", err.response?.data?.error || "Gagal memesan vote", "error");
		} finally {
			setPurchasing(false);
		}
	};

	const formatShortDate = (date: string) => {
		return new Date(date).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "short",
		});
	};

	const getImageUrl = (imageUrl: string | null): string => {
		if (!imageUrl) return "";
		if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;
		return `${config.api.backendUrl}${imageUrl}`;
	};

	const openNomineePhotoPreview = (nominee: { nomineeName: string; nomineeSubtitle?: string | null; nomineePhoto?: string | null }) => {
		if (!nominee.nomineePhoto) return;

		Swal.fire({
			title: nominee.nomineeName,
			text: nominee.nomineeSubtitle || undefined,
			imageUrl: getImageUrl(nominee.nomineePhoto),
			imageAlt: nominee.nomineeName,
			showCloseButton: true,
			confirmButtonText: "Tutup",
			confirmButtonColor: "#dc2626",
			width: "min(92vw, 720px)",
			customClass: {
				popup: "voting-photo-preview-popup",
				image: "voting-photo-preview-image",
			},
		});
	};

	const getVotingStatus = (event: VotingEvent) => {
		if (!event.votingConfig) return { text: "Tidak tersedia", color: "gray" };
		const now = new Date();
		if (event.votingConfig.startDate && new Date(event.votingConfig.startDate) > now) {
			return { text: "Segera", color: "amber" };
		}
		if (event.votingConfig.endDate && new Date(event.votingConfig.endDate) < now) {
			return { text: "Selesai", color: "red" };
		}
		return { text: "Buka", color: "green" };
	};

	const isVotingOpen = (event: VotingEvent): boolean => {
		if (!event.votingConfig) return false;
		const now = new Date();
		if (event.votingConfig.startDate && new Date(event.votingConfig.startDate) > now) return false;
		if (event.votingConfig.endDate && new Date(event.votingConfig.endDate) < now) return false;
		return true;
	};

	const getVotingStatusBadge = (event: VotingEvent): { label: string; className: string } => {
		const status = getVotingStatus(event);
		switch (status.color) {
			case "green":
				return { label: "Buka", className: "bg-emerald-500/90 text-white" };
			case "amber":
				return { label: "Segera", className: "bg-amber-500/90 text-white" };
			case "red":
				return { label: "Selesai", className: "bg-slate-700/[0.85] text-white" };
			default:
				return { label: "Vote", className: "bg-red-500/90 text-white" };
		}
	};

	const getVotingPriceLabel = (event: VotingEvent): string => {
		if (!event.votingConfig) return "Voting tidak tersedia";
		if (event.votingConfig.isPaid) {
			return `${formatCurrency(event.votingConfig.pricePerVote)}/vote`;
		}
		return "Gratis Vote";
	};

	const filteredEvents = useMemo(() => {
		if (statusFilter === "all") return events;
		const now = new Date();
		return events.filter((event) => {
			const start = event.votingConfig?.startDate ? new Date(event.votingConfig.startDate) : null;
			const end = event.votingConfig?.endDate ? new Date(event.votingConfig.endDate) : null;
			switch (statusFilter) {
				case "upcoming":
					return start && start > now;
				case "open":
					return (!start || start <= now) && (!end || end >= now);
				case "ended":
					return end && end < now;
				default:
					return true;
			}
		});
	}, [events, statusFilter]);

	const statusOptions = [
		{ id: "all" as const, label: "Semua" },
		{ id: "open" as const, label: "Buka" },
		{ id: "upcoming" as const, label: "Segera" },
		{ id: "ended" as const, label: "Selesai" },
	];

	const getEventNomineeCount = (event: VotingEvent) =>
		event.votingConfig?.categories.reduce((total, category) => total + (category.nominees?.length || 0), 0) || 0;

	const getEventVoteCount = (event: VotingEvent) =>
		event.votingConfig?.categories.reduce(
			(total, category) => total + (category.nominees?.reduce((sum, nominee) => sum + nominee.voteCount, 0) || 0),
			0
		) || 0;

	const formatCompactNumber = (value: number) =>
		new Intl.NumberFormat("id-ID", {
			notation: value >= 10000 ? "compact" : "standard",
			maximumFractionDigits: 1,
		}).format(value);

	const getEventLocationLabel = (event: VotingEvent) => event.city || event.venue || event.location || "Online";

	const featuredEvent = filteredEvents.find((event) => isVotingOpen(event)) || filteredEvents[0] || events[0] || null;

	const currentCategory = selectedEvent?.votingConfig?.categories.find((c) => c.id === selectedCategoryId);
	const sortedNominees = [...(currentCategory?.nominees || [])].sort((a, b) => b.voteCount - a.voteCount);
	const podiumNominees = sortedNominees.slice(0, 3);
	const remainingNominees = sortedNominees.slice(3);
	const podiumOrder = podiumNominees;
	const categoryVoteCount = sortedNominees.reduce((total, nominee) => total + nominee.voteCount, 0);

	// Event detail / voting view
	if (selectedEvent) {
		const votingOrderSummary = getVotingOrderSummary();
		const selectedEventBadge = getVotingStatusBadge(selectedEvent);
		const selectedEventImage = selectedEvent.thumbnail ? getImageUrl(selectedEvent.thumbnail) : "";
		const selectedEventNomineeCount = getEventNomineeCount(selectedEvent);
		const selectedEventVoteCount = getEventVoteCount(selectedEvent);

		return (
			<div className="evoting-page-shell min-h-screen transition-colors">
				<div className="evoting-flow-lines" />
				<main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
					{/* Back button */}
					<button
						onClick={() => { setSelectedEvent(null); setSelectedCategoryId(null); setVotedNominees(new Set()); clearActiveVoteCode(); }}
						className="group mb-5 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-xl transition-all hover:-translate-x-0.5 hover:border-red-200 hover:text-red-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-200 dark:hover:text-red-300"
					>
						<LuArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
						Daftar event
					</button>

					{/* Event header */}
					<section className="evoting-detail-hero relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-slate-950 shadow-2xl shadow-slate-200/70 mb-6 dark:border-white/[0.08] dark:shadow-black/30">
						{selectedEventImage ? (
							<img
								src={selectedEventImage}
								alt={selectedEvent.title}
								className="absolute inset-0 h-full w-full object-cover opacity-70"
							/>
						) : (
							<div className="absolute inset-0 bg-[linear-gradient(135deg,#111827_0%,#7f1d1d_52%,#0f766e_100%)]" />
						)}
						<div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/[0.78] to-slate-950/[0.35]" />
						<div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
						<div className="relative grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-8">
							<div className="flex min-h-[330px] flex-col justify-end">
								<div className="mb-4 flex flex-wrap items-center gap-2">
									<span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black shadow-lg ${selectedEventBadge.className}`}>
										<LuThumbsUp className="h-3.5 w-3.5" />
										{selectedEventBadge.label}
									</span>
									<span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.15] bg-white/10 px-3 py-1 text-xs font-bold text-white backdrop-blur-xl">
										<LuTicket className="h-3.5 w-3.5" />
										{getVotingPriceLabel(selectedEvent)}
									</span>
								</div>
								<h1 className="max-w-3xl text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
									{selectedEvent.title}
								</h1>
								{selectedEvent.description && (
									<p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-white/90 line-clamp-2 drop-shadow">
										{selectedEvent.description}
									</p>
								)}
								<div className="mt-5 flex flex-wrap gap-3 text-sm font-bold text-white">
									<span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.18] px-3 py-1.5 shadow-lg shadow-black/10 backdrop-blur-xl">
										<LuCalendar className="w-4 h-4" />
										{formatDate(selectedEvent.startDate)}
									</span>
									<span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.18] px-3 py-1.5 shadow-lg shadow-black/10 backdrop-blur-xl">
										<LuMapPin className="w-4 h-4" />
										{getEventLocationLabel(selectedEvent)}
									</span>
								</div>

								{selectedEvent.votingConfig?.isPaid && isVotingOpen(selectedEvent) && (
									<div className="mt-6 flex flex-wrap gap-3">
										<button
											onClick={() => setShowPurchaseModal(true)}
											className="evoting-primary-action inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-red-950/25 transition-all hover:-translate-y-0.5 hover:bg-red-700"
										>
											<LuTicket className="w-4 h-4" />
											Beli Vote
										</button>
										<button
											onClick={() => setShowCodeEntry(true)}
											className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.12] px-5 py-3 text-sm font-black text-white backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-white/[0.18]"
										>
											<LuThumbsUp className="w-4 h-4" />
											{voteCodeInfo ? "Ganti Kode" : "Masukkan Kode"}
										</button>
									</div>
								)}
							</div>

							<aside className="evoting-glass-panel self-end rounded-3xl border border-white/[0.15] bg-white/[0.12] p-4 text-white shadow-2xl backdrop-blur-2xl">
								<div className="grid grid-cols-2 gap-3">
									<div className="rounded-2xl bg-white/[0.12] p-4">
										<p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/[0.68]">Kategori</p>
										<p className="mt-2 text-2xl font-black">{selectedEvent.votingConfig?.categories.length || 0}</p>
									</div>
									<div className="rounded-2xl bg-white/[0.12] p-4">
										<p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/[0.68]">Nominee</p>
										<p className="mt-2 text-2xl font-black">{selectedEventNomineeCount}</p>
									</div>
									<div className="rounded-2xl bg-white/[0.12] p-4">
										<p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/[0.68]">Vote</p>
										<p className="mt-2 text-2xl font-black">{formatCompactNumber(selectedEventVoteCount)}</p>
									</div>
									<div className="rounded-2xl bg-white/[0.12] p-4">
										<p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/[0.68]">Mode</p>
										<p className="mt-2 text-lg font-black">{selectedEvent.votingConfig?.isPaid ? "Berbayar" : "Gratis"}</p>
									</div>
								</div>
								{selectedEvent.votingConfig?.isPaid && voteCodeInfo && (
									<div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
										voteCodeInfo.status === "PAID" && voteCodeInfo.remainingVotes > 0
											? "border-emerald-300/40 bg-emerald-400/[0.15] text-emerald-50"
											: "border-amber-300/40 bg-amber-400/[0.15] text-amber-50"
									}`}>
										<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
											<div>
												<p className="font-bold">Kode aktif: <span className="font-mono">{voteCodeInfo.purchaseCode}</span></p>
												<p className="text-xs opacity-80">Sisa {voteCodeInfo.remainingVotes} dari {voteCodeInfo.voteCount} vote</p>
											</div>
											<button
												onClick={clearActiveVoteCode}
												className="self-start text-xs font-bold underline underline-offset-2 sm:self-center"
											>
												Hapus
											</button>
										</div>
									</div>
								)}
							</aside>
						</div>
					</section>

					{/* Voting status banner */}
					{!isVotingOpen(selectedEvent) && (
						<div className={`mb-5 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold shadow-sm backdrop-blur-xl ${
							getVotingStatus(selectedEvent).color === "amber"
								? "bg-amber-50/90 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20"
								: "bg-slate-50/90 text-slate-700 border-slate-200 dark:bg-white/[0.04] dark:text-slate-300 dark:border-white/[0.08]"
						}`}>
							<LuClock className="h-4 w-4 flex-shrink-0" />
							<span>
								{getVotingStatus(selectedEvent).color === "amber"
									? `Voting belum dimulai${selectedEvent.votingConfig?.startDate ? `. Dibuka pada ${new Date(selectedEvent.votingConfig.startDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}` : ""}`
									: "Voting sudah ditutup"}
							</span>
						</div>
					)}
					{/* Category tabs */}
					{selectedEvent.votingConfig?.categories && selectedEvent.votingConfig.categories.length > 1 && (
						<div className="evoting-tab-strip mb-5 flex gap-2 overflow-x-auto rounded-2xl border border-white/70 bg-white/75 p-2 shadow-sm backdrop-blur-xl dark:border-white/[0.08] dark:bg-white/[0.035]">
							{selectedEvent.votingConfig.categories.map((cat) => (
								<button
									key={cat.id}
									onClick={() => setSelectedCategoryId(cat.id)}
									className={`rounded-xl px-4 py-2 text-sm font-black whitespace-nowrap transition-all ${
										selectedCategoryId === cat.id
										? "bg-slate-950 text-white shadow-lg shadow-slate-900/20 dark:bg-white dark:text-slate-950"
										: "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.08]"
									}`}
								>
									{cat.title}
								</button>
							))}
						</div>
					)}

					{/* Category title */}
					{currentCategory && (
						<div className="mb-7 flex flex-col gap-4 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl sm:flex-row sm:items-end sm:justify-between dark:border-white/[0.08] dark:bg-white/[0.035]">
							<div>
							<p className="mb-1 text-[11px] font-black uppercase tracking-[0.24em] text-red-500 dark:text-red-300">Kategori Voting</p>
							<h2 className="text-2xl font-black text-slate-950 dark:text-white">{currentCategory.title}</h2>
							{currentCategory.description && (
								<p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">{currentCategory.description}</p>
							)}
							</div>
							<div className="grid grid-cols-2 gap-2 sm:min-w-[220px]">
								<div className="rounded-2xl bg-slate-100 px-4 py-3 dark:bg-white/[0.06]">
									<p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Nominee</p>
									<p className="text-xl font-black text-slate-950 dark:text-white">{sortedNominees.length}</p>
								</div>
								<div className="rounded-2xl bg-red-50 px-4 py-3 dark:bg-red-500/10">
									<p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-400">Vote</p>
									<p className="text-xl font-black text-red-600 dark:text-red-300">{formatCompactNumber(categoryVoteCount)}</p>
								</div>
							</div>
						</div>
					)}

					{/* Nominees podium */}
					{sortedNominees.length > 0 ? (
						<div className="space-y-8">
							<div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-5 items-end">
								{podiumOrder.map((nominee, podiumIdx) => {
									const rank = sortedNominees.findIndex((item) => item.id === nominee.id) + 1;
									const isVoted = votedNominees.has(nominee.id);
									const maxVotes = sortedNominees[0]?.voteCount || 1;
									const pct = maxVotes > 0 ? (nominee.voteCount / maxVotes) * 100 : 0;
									const isFirst = rank === 1;
									const podiumClass =
										rank === 1
											? "order-2 -mt-3 sm:-mt-5 md:-mt-8"
											: rank === 2
												? "order-1"
												: "order-3";
									const rankTheme =
										rank === 1
											? "from-yellow-400 via-amber-400 to-orange-500 text-yellow-950"
											: rank === 2
												? "from-slate-200 via-gray-300 to-slate-400 text-slate-800"
												: "from-amber-700 via-orange-700 to-yellow-700 text-white";

									return (
										<div
											key={nominee.id}
											className={`voting-podium-card ${podiumClass} ${nominee.nomineePhoto ? "cursor-zoom-in" : ""} ${isFirst ? "voting-podium-winner" : ""} ${
												isVoted ? "ring-2 ring-green-400/70" : ""
											}`}
											style={{ animationDelay: `${podiumIdx * 90}ms` }}
											onClick={() => openNomineePhotoPreview(nominee)}
											onKeyDown={(event) => {
												if ((event.key === "Enter" || event.key === " ") && nominee.nomineePhoto) {
													event.preventDefault();
													openNomineePhotoPreview(nominee);
												}
											}}
											tabIndex={nominee.nomineePhoto ? 0 : undefined}
											aria-label={nominee.nomineePhoto ? `Preview foto ${nominee.nomineeName}` : undefined}
										>
											<div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${rankTheme}`} />
											<div className="relative p-2 sm:p-3 md:p-4">
												<div className="flex items-center justify-between gap-1.5 mb-2 sm:mb-3">
													<div className={`inline-flex min-w-0 items-center gap-1 px-2 sm:px-3 py-1 rounded-full bg-gradient-to-r ${rankTheme} text-[10px] sm:text-xs font-black shadow-lg`}>
														{rank === 1 ? <LuCrown className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" /> : <LuMedal className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />}
														<span className="hidden min-[420px]:inline">Juara </span>{rank}
													</div>
													<span className="text-[10px] sm:text-xs font-bold text-red-600 dark:text-red-400 whitespace-nowrap">{nominee.voteCount} vote</span>
												</div>

												<div className={`voting-podium-photo relative mx-auto overflow-hidden rounded-xl sm:rounded-2xl border-2 sm:border-4 ${
													rank === 1 ? "h-36 sm:h-48 md:h-64 border-yellow-300 shadow-yellow-300/30" : "h-32 sm:h-44 md:h-56 border-white/70 dark:border-white/10"
												} shadow-xl bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/10 dark:to-orange-900/10`}>
													{nominee.nomineePhoto ? (
														<img
															src={nominee.nomineePhoto.startsWith("http") ? nominee.nomineePhoto : getImageUrl(nominee.nomineePhoto)}
															alt={nominee.nomineeName}
															className="w-full h-full object-cover object-top"
														/>
													) : (
														<div className="w-full h-full flex items-center justify-center">
															<LuUser className="w-16 h-16 text-gray-400 dark:text-gray-500" />
														</div>
													)}
													<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2 sm:px-3 md:px-4 pb-2 sm:pb-3 md:pb-4 pt-10 md:pt-12">
														<h3 className="text-white font-black text-[11px] sm:text-sm md:text-lg leading-tight truncate">{nominee.nomineeName}</h3>
														{nominee.nomineeSubtitle && (
															<p className="text-white/75 text-[10px] sm:text-xs truncate mt-0.5">{nominee.nomineeSubtitle}</p>
														)}
													</div>
												</div>

												<div className="mt-3 md:mt-4">
													<div className="h-1.5 sm:h-2 rounded-full bg-gray-100 dark:bg-white/[0.06] overflow-hidden">
														<div
															className={`voting-podium-progress h-full rounded-full bg-gradient-to-r ${rankTheme} transition-all duration-700`}
															style={{ width: `${pct}%` }}
														/>
													</div>
												</div>

												<div className={`mt-3 md:mt-4 rounded-t-lg sm:rounded-t-xl bg-gradient-to-r ${rankTheme} ${isFirst ? "h-11 sm:h-14 md:h-16" : "h-9 sm:h-11 md:h-12"} flex items-center justify-center shadow-lg`}>
													<span className="text-xl sm:text-2xl md:text-3xl font-black">#{rank}</span>
												</div>

												<button
													onClick={(event) => {
														event.stopPropagation();
														if (selectedEvent.votingConfig?.isPaid) {
															handlePaidVote(currentCategory!.id, nominee.id);
														} else {
															handleFreeVote(currentCategory!.id, nominee.id);
														}
													}}
													disabled={voting || isVoted || !isVotingOpen(selectedEvent)}
													className={`mt-3 md:mt-4 w-full py-2 sm:py-2.5 rounded-lg sm:rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-sm font-semibold transition-colors ${
														isVoted
															? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
															: !isVotingOpen(selectedEvent)
																? "bg-gray-100 text-gray-400 dark:bg-white/[0.04] dark:text-gray-600 cursor-not-allowed"
																: "bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
													}`}
													>
														{isVoted ? (
															<>
																<LuCircleCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
																Sudah Vote
															</>
														) : !isVotingOpen(selectedEvent) ? (
															getVotingStatus(selectedEvent).color === "amber" ? "Belum Dibuka" : "Sudah Ditutup"
														) : (
															<>
																<LuThumbsUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
																Vote
														</>
													)}
												</button>
											</div>
										</div>
									);
								})}
							</div>

							{remainingNominees.length > 0 && (
								<div>
									<h3 className="text-sm font-bold uppercase tracking-[0.25em] text-gray-400 dark:text-gray-500 mb-4">Nominee Lainnya</h3>
									<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
										{remainingNominees.map((nominee, idx) => {
											const rank = idx + 4;
											const isVoted = votedNominees.has(nominee.id);
											const maxVotes = sortedNominees[0]?.voteCount || 1;
											const pct = maxVotes > 0 ? (nominee.voteCount / maxVotes) * 100 : 0;

											return (
												<div
													key={nominee.id}
													className={`bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl border overflow-hidden transition-all ${
														isVoted ? "border-red-500 ring-1 ring-red-500" : "border-gray-200/50 dark:border-white/[0.06]"
													} ${nominee.nomineePhoto ? "cursor-zoom-in hover:shadow-lg hover:-translate-y-0.5" : ""}`}
													onClick={() => openNomineePhotoPreview(nominee)}
													onKeyDown={(event) => {
														if ((event.key === "Enter" || event.key === " ") && nominee.nomineePhoto) {
															event.preventDefault();
															openNomineePhotoPreview(nominee);
														}
													}}
													tabIndex={nominee.nomineePhoto ? 0 : undefined}
													aria-label={nominee.nomineePhoto ? `Preview foto ${nominee.nomineeName}` : undefined}
												>
													<div className="flex gap-3 p-3">
														<div className="relative w-24 h-28 flex-shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/10 dark:to-orange-900/10">
															{nominee.nomineePhoto ? (
																<img
																	src={nominee.nomineePhoto.startsWith("http") ? nominee.nomineePhoto : getImageUrl(nominee.nomineePhoto)}
																	alt={nominee.nomineeName}
																	className="w-full h-full object-cover object-top"
																/>
															) : (
																<div className="w-full h-full flex items-center justify-center">
																	<LuUser className="w-10 h-10 text-gray-400 dark:text-gray-500" />
																</div>
															)}
															<div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-gray-900/80 text-white text-[10px] font-bold">
																#{rank}
															</div>
														</div>
														<div className="min-w-0 flex-1">
															<h4 className="font-semibold text-gray-900 dark:text-white truncate">{nominee.nomineeName}</h4>
															{nominee.nomineeSubtitle && (
																<p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{nominee.nomineeSubtitle}</p>
															)}
															<div className="mt-3 mb-3">
																<div className="flex items-center justify-between text-xs mb-1">
																	<span className="text-gray-500 dark:text-gray-400">Vote</span>
																	<span className="font-semibold text-red-600 dark:text-red-400">{nominee.voteCount}</span>
																</div>
																<div className="w-full bg-gray-100 dark:bg-white/[0.06] rounded-full h-1.5">
																	<div className="h-1.5 rounded-full bg-red-500 transition-all" style={{ width: `${pct}%` }} />
																</div>
															</div>
															<button
																onClick={(event) => {
																	event.stopPropagation();
																	if (selectedEvent.votingConfig?.isPaid) {
																		handlePaidVote(currentCategory!.id, nominee.id);
																	} else {
																		handleFreeVote(currentCategory!.id, nominee.id);
																	}
																}}
																disabled={voting || isVoted || !isVotingOpen(selectedEvent)}
																className={`w-full py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
																	isVoted
																		? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
																		: !isVotingOpen(selectedEvent)
																			? "bg-gray-100 text-gray-400 dark:bg-white/[0.04] dark:text-gray-600 cursor-not-allowed"
																			: "bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
																}`}
															>
																{isVoted ? <LuCircleCheck className="w-4 h-4" /> : <LuThumbsUp className="w-4 h-4" />}
																{isVoted ? "Sudah Vote" : "Vote"}
															</button>
														</div>
													</div>
												</div>
											);
										})}
									</div>
								</div>
							)}
						</div>
					) : (
						<div className="text-center py-12 text-gray-500 dark:text-gray-400">
							<LuThumbsUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
							<p>Belum ada nominee untuk kategori ini</p>
						</div>
					)}

					{/* Purchase code entry modal */}
					{showCodeEntry && (
						<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCodeEntry(false)}>
							<div className="bg-white/90 dark:bg-white/[0.05] backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-white/[0.06] shadow-2xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
								<h3 className="text-lg font-semibold text-gray-900 dark:text-white">Masukkan Kode Vote</h3>
								<input
									type="text"
									value={purchaseCode}
									onChange={(e) => {
										setPurchaseCode(normalizePurchaseCode(e.target.value));
										setVoteCodeInfo(null);
									}}
									placeholder="Kode vote / ID pesanan"
									className="w-full px-3 py-2 rounded-lg border border-gray-200/50 dark:border-white/[0.06] bg-white/50 dark:bg-white/[0.03] text-gray-900 dark:text-white font-mono text-center"
								/>
								{voteCodeInfo && (
									<div className={`rounded-lg px-3 py-2 text-xs ${
										voteCodeInfo.status === "PAID" && voteCodeInfo.remainingVotes > 0
											? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300"
											: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
									}`}>
										<p className="font-semibold">{voteCodeInfo.message || "Status kode vote"}</p>
										<p>Sisa {voteCodeInfo.remainingVotes} dari {voteCodeInfo.voteCount} vote</p>
									</div>
								)}
								{voteCodeInfo?.status === "PAID" && voteCodeInfo.remainingVotes > 0 && !paidVoteTarget && (
									<div className="rounded-lg px-3 py-2 text-xs bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
										<p className="font-semibold">Silakan pilih nominasi terlebih dahulu</p>
										<p>Kode sudah aktif. Tutup modal ini lalu klik tombol Vote pada peserta yang ingin dipilih.</p>
									</div>
								)}
								<div className="flex gap-3">
									<button
										onClick={() => setShowCodeEntry(false)}
										className="flex-1 px-4 py-2.5 border border-gray-200/50 dark:border-white/[0.06] text-gray-700 dark:text-gray-300 rounded-lg"
									>
										Batal
									</button>
									<button
										onClick={() => checkVoteCode(purchaseCode)}
										disabled={checkingVoteCode || !purchaseCode.trim()}
										className="px-4 py-2.5 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50"
									>
										{checkingVoteCode ? "..." : "Cek"}
									</button>
									{paidVoteTarget && (
										<button
											onClick={submitPaidVote}
											disabled={voting || checkingVoteCode || !purchaseCode.trim()}
											className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
										>
											{voting ? "..." : "Vote"}
										</button>
									)}
								</div>
							</div>
						</div>
					)}

					{/* Purchase votes modal */}
					{showPurchaseModal && (
						<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPurchaseModal(false)}>
							<div className="bg-white/90 dark:bg-white/[0.05] backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-white/[0.06] shadow-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
								<h3 className="text-lg font-semibold text-gray-900 dark:text-white">Beli Paket Vote</h3>

								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
										<LuUser className="w-4 h-4 inline mr-1" /> Nama *
									</label>
									<input
										type="text"
										value={buyerName}
										onChange={(e) => setBuyerName(e.target.value)}
										className="w-full px-3 py-2 rounded-lg border border-gray-200/50 dark:border-white/[0.06] bg-white/50 dark:bg-white/[0.03] text-gray-900 dark:text-white"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
										<LuMail className="w-4 h-4 inline mr-1" /> Email *
									</label>
									<input
										type="email"
										value={buyerEmail}
										onChange={(e) => setBuyerEmail(e.target.value)}
										className="w-full px-3 py-2 rounded-lg border border-gray-200/50 dark:border-white/[0.06] bg-white/50 dark:bg-white/[0.03] text-gray-900 dark:text-white"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
										<LuPhone className="w-4 h-4 inline mr-1" /> Telepon
									</label>
									<input
										type="tel"
										value={buyerPhone}
										onChange={(e) => setBuyerPhone(e.target.value)}
										className="w-full px-3 py-2 rounded-lg border border-gray-200/50 dark:border-white/[0.06] bg-white/50 dark:bg-white/[0.03] text-gray-900 dark:text-white"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jumlah Vote</label>
									<input
										type="number"
										min={1}
										max={100}
										value={voteCount}
										onChange={(e) => setVoteCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
										className="w-full px-3 py-2 rounded-lg border border-gray-200/50 dark:border-white/[0.06] bg-white/50 dark:bg-white/[0.03] text-gray-900 dark:text-white"
									/>
								</div>
								<div className="bg-red-50/50 dark:bg-white/[0.03] rounded-lg p-3 text-sm border border-red-100/50 dark:border-white/[0.06]">
									<div className="flex justify-between">
										<span className="text-gray-600 dark:text-gray-400">Harga/vote</span>
										<span className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedEvent.votingConfig?.pricePerVote || 0)}</span>
									</div>
									<div className="flex justify-between mt-1">
										<span className="text-gray-600 dark:text-gray-400">Subtotal vote</span>
										<span className="font-medium text-gray-900 dark:text-white">
											{formatCurrency(votingOrderSummary.subtotal)}
										</span>
									</div>
									<div className="flex justify-between mt-1">
										<span className="text-gray-600 dark:text-gray-400">Biaya admin</span>
										<span className="font-medium text-gray-900 dark:text-white">
											{formatCurrency(votingOrderSummary.adminFee)}
										</span>
									</div>
									<div className="flex justify-between font-semibold mt-1">
										<span className="text-gray-900 dark:text-white">Total sebelum QRIS</span>
										<span className="text-red-600 dark:text-red-400">
											{formatCurrency(votingOrderSummary.totalBeforeQris)}
										</span>
									</div>
									<p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
										Biaya layanan QRIS dari payment gateway dapat ditambahkan di halaman pembayaran.
									</p>
								</div>
								<div className="flex gap-3">
									<button
										onClick={() => setShowPurchaseModal(false)}
										className="flex-1 px-4 py-2.5 border border-gray-200/50 dark:border-white/[0.06] text-gray-700 dark:text-gray-300 rounded-lg"
									>
										Batal
									</button>
									<button
										onClick={handlePurchaseVotes}
										disabled={purchasing}
										className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
									>
										{purchasing ? "Memproses..." : "Beli Vote"}
									</button>
								</div>
							</div>
						</div>
					)}
				</main>
			</div>
		);
	}

	// Event list view
	return (
		<div className="evoting-page-shell min-h-screen transition-colors">
			<div className="evoting-flow-lines" />
			<main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 md:py-10">
				<section className="evoting-hero-card relative mb-8 overflow-hidden rounded-[2rem] border border-white/70 bg-white/[0.82] p-4 shadow-2xl shadow-slate-200/70 backdrop-blur-2xl sm:p-6 lg:p-8 dark:border-white/[0.08] dark:bg-white/[0.035] dark:shadow-black/25">
					<div className="evoting-hero-grid" />
					<div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-stretch">
						<div className="flex min-h-[310px] flex-col justify-between">
							<div>
								<div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-200/70 bg-red-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-red-600 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-300">
									<LuSparkles className="h-3.5 w-3.5" />
									Voting Publik
								</div>
								<h1 className="max-w-3xl text-4xl font-black leading-none tracking-normal text-slate-950 sm:text-5xl lg:text-6xl dark:text-white">
									E-Voting
								</h1>
								<p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base dark:text-slate-300">
									Pilih event, lihat kandidat unggulan, dan dukung nominee favorit secara langsung.
								</p>
							</div>

							<div className="mt-7 grid grid-cols-3 gap-2 sm:max-w-xl sm:gap-3">
								<div className="evoting-mini-stat">
									<LuTrophy className="h-4 w-4 text-amber-500" />
									<span>{events.length}</span>
									<p>Event</p>
								</div>
								<div className="evoting-mini-stat">
									<LuUsers className="h-4 w-4 text-teal-500" />
									<span>{events.reduce((total, event) => total + getEventNomineeCount(event), 0)}</span>
									<p>Nominee</p>
								</div>
								<div className="evoting-mini-stat">
									<LuThumbsUp className="h-4 w-4 text-red-500" />
									<span>{formatCompactNumber(events.reduce((total, event) => total + getEventVoteCount(event), 0))}</span>
									<p>Vote</p>
								</div>
							</div>
						</div>

						<div className="rounded-3xl border border-slate-200/70 bg-white/[0.88] p-3 shadow-xl shadow-slate-200/80 backdrop-blur-xl dark:border-white/[0.08] dark:bg-slate-950/[0.45] dark:shadow-black/20">
							<div className="relative mb-3">
								<LuSearch className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
								<input
									type="text"
									value={search}
									onChange={(e) => { setSearch(e.target.value); setPage(1); }}
									placeholder="Cari event atau kota..."
									className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-10 text-sm font-medium text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-red-300 focus:bg-white focus:ring-4 focus:ring-red-500/10 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-white dark:focus:border-red-400/40 dark:focus:bg-white/[0.07]"
								/>
								{search && (
									<button
										onClick={() => { setSearch(""); setPage(1); }}
										className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/[0.08] dark:hover:text-slate-200"
									>
										<LuX className="w-4 h-4" />
									</button>
								)}
							</div>

							<div className="grid grid-cols-2 gap-2">
								{statusOptions.map((opt) => (
									<button
										key={opt.id}
										onClick={() => setStatusFilter(opt.id)}
										className={`rounded-2xl px-3 py-3 text-sm font-black transition-all ${
											statusFilter === opt.id
												? "bg-slate-950 text-white shadow-lg shadow-slate-900/20 dark:bg-white dark:text-slate-950"
												: "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-white/[0.1]"
										}`}
									>
										{opt.label}
									</button>
								))}
							</div>

							{featuredEvent && (
								<button
									onClick={() => openVotingEvent(featuredEvent.id)}
									className="group mt-3 w-full overflow-hidden rounded-3xl bg-slate-950 text-left text-white shadow-xl transition-all hover:-translate-y-0.5 dark:bg-white dark:text-slate-950"
								>
									<div className="flex gap-3 p-3">
										<div className="h-24 w-20 flex-shrink-0 overflow-hidden rounded-2xl bg-slate-800">
											{featuredEvent.thumbnail ? (
												<img src={getImageUrl(featuredEvent.thumbnail)} alt={featuredEvent.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
											) : (
												<div className="flex h-full w-full items-center justify-center">
													<LuTrophy className="h-7 w-7 opacity-45" />
												</div>
											)}
										</div>
										<div className="min-w-0 flex-1 py-1">
											<p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300 dark:text-red-500">Sorotan</p>
											<h3 className="mt-1 line-clamp-2 text-sm font-black leading-tight">{featuredEvent.title}</h3>
											<div className="mt-2 flex items-center gap-2 text-xs opacity-70">
												<LuMapPin className="h-3.5 w-3.5" />
												<span className="truncate">{getEventLocationLabel(featuredEvent)}</span>
											</div>
										</div>
										<LuArrowRight className="mt-2 h-5 w-5 flex-shrink-0 transition-transform group-hover:translate-x-1" />
									</div>
								</button>
							)}
						</div>
					</div>
				</section>

				<div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<p className="text-[11px] font-black uppercase tracking-[0.24em] text-red-500 dark:text-red-300">Daftar Event</p>
						<h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
							{filteredEvents.length > 0 ? `${filteredEvents.length} event tersedia` : "Event tidak ditemukan"}
						</h2>
					</div>
					<p className="text-sm font-medium text-slate-500 dark:text-slate-400">
						{statusOptions.find((option) => option.id === statusFilter)?.label || "Semua"}
					</p>
				</div>

				{/* Events Grid */}
				{loading ? (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{Array.from({ length: 8 }).map((_, i) => (
							<div
								key={i}
								className="overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/70 shadow-sm backdrop-blur-xl animate-pulse dark:border-white/[0.06] dark:bg-white/[0.035]"
							>
								<div className="aspect-[16/11] bg-slate-200/70 dark:bg-white/[0.06]" />
								<div className="p-4 space-y-3">
									<div className="h-4 bg-slate-200/80 dark:bg-white/[0.06] rounded w-3/4" />
									<div className="h-3 bg-slate-200/80 dark:bg-white/[0.06] rounded w-1/2" />
									<div className="h-10 bg-slate-200/80 dark:bg-white/[0.06] rounded-xl w-full" />
								</div>
							</div>
						))}
					</div>
				) : filteredEvents.length === 0 ? (
					<div className="text-center py-16">
						<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center">
							<LuThumbsUp className="w-8 h-8 text-gray-400 dark:text-gray-500" />
						</div>
						{error ? (
							<>
								<p className="text-red-500 dark:text-red-400 text-sm font-medium mb-1">Gagal Memuat Data</p>
								<p className="text-gray-500 dark:text-gray-400 text-xs">{error}</p>
								<button onClick={fetchEvents} className="mt-3 text-xs text-blue-500 hover:underline">Coba Lagi</button>
							</>
						) : (
							<p className="text-gray-500 dark:text-gray-400 text-sm">Tidak ada event voting yang ditemukan</p>
						)}
					</div>
				) : (
					<>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
							{filteredEvents.map((event) => {
								const badge = getVotingStatusBadge(event);
								const votePriceLabel = getVotingPriceLabel(event);
								const eventNominees = getEventNomineeCount(event);
								const eventVotes = getEventVoteCount(event);
								return (
									<button
										key={event.id}
										onClick={() => openVotingEvent(event.id)}
										className="evoting-event-card group relative overflow-hidden rounded-[1.5rem] border border-white/75 bg-white text-left shadow-lg shadow-slate-200/75 transition-all duration-300 hover:-translate-y-1 hover:border-red-200 hover:shadow-2xl hover:shadow-slate-300/70 dark:border-white/[0.08] dark:bg-white/[0.035] dark:shadow-black/20 dark:hover:border-red-400/25"
									>
										<div className="relative aspect-[16/11] w-full overflow-hidden bg-[linear-gradient(135deg,#fef2f2_0%,#ecfeff_100%)] dark:bg-[linear-gradient(135deg,rgba(127,29,29,0.22),rgba(15,118,110,0.18))]">
											{event.thumbnail ? (
												<img
													src={getImageUrl(event.thumbnail)}
													alt={event.title}
													className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
													loading="lazy"
												/>
											) : (
												<div className="w-full h-full flex items-center justify-center">
													<LuTrophy className="w-10 h-10 text-slate-400/[0.45] dark:text-slate-500" />
												</div>
											)}
											<div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/[0.78] to-transparent" />
											<div className="absolute left-3 top-3">
												<span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black shadow-lg backdrop-blur-xl ${badge.className}`}>
													{badge.label}
												</span>
											</div>
											<div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 text-white">
												<span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-white/[0.16] px-2.5 py-1 text-[11px] font-bold backdrop-blur-xl">
													<LuMapPin className="h-3.5 w-3.5 flex-shrink-0" />
													<span className="truncate">{getEventLocationLabel(event)}</span>
												</span>
												<span className="rounded-full bg-white/[0.16] px-2.5 py-1 text-[11px] font-bold backdrop-blur-xl">
													{formatShortDate(event.startDate)}
												</span>
											</div>
										</div>

										<div className="flex min-h-[190px] flex-col p-4">
											<h4 className="text-lg font-black leading-tight text-slate-950 line-clamp-2 dark:text-white">
												{event.title}
											</h4>
											<div className="mt-3 grid grid-cols-2 gap-2">
												<div className="rounded-2xl bg-slate-100 px-3 py-2 dark:bg-white/[0.06]">
													<p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Nominee</p>
													<p className="mt-0.5 text-sm font-black text-slate-800 dark:text-slate-100">{eventNominees}</p>
												</div>
												<div className="rounded-2xl bg-red-50 px-3 py-2 dark:bg-red-500/10">
													<p className="text-[10px] font-bold uppercase tracking-[0.16em] text-red-400">Vote</p>
													<p className="mt-0.5 text-sm font-black text-red-600 dark:text-red-300">{formatCompactNumber(eventVotes)}</p>
												</div>
											</div>
											<div className="mt-auto flex items-center justify-between gap-3 pt-4">
												<p className="text-sm font-black text-red-600 dark:text-red-300">
													{votePriceLabel}
												</p>
												<span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-white transition-transform group-hover:translate-x-1 dark:bg-white dark:text-slate-950">
													<LuArrowRight className="h-4 w-4" />
												</span>
											</div>
										</div>
									</button>
								);
							})}
						</div>

						{/* Pagination */}
						{totalPages > 1 && (
							<div className="flex items-center justify-center gap-3 mt-8">
								<button
									onClick={() => setPage((p) => Math.max(1, p - 1))}
									disabled={page === 1}
									className="w-8 h-8 rounded-full bg-gray-200/50 dark:bg-white/[0.06] border border-gray-300/50 dark:border-white/10 text-gray-500 dark:text-gray-400 flex items-center justify-center hover:bg-gray-300/50 dark:hover:bg-white/[0.12] transition-colors disabled:opacity-30 disabled:pointer-events-none"
								>
									<LuChevronLeft className="w-4 h-4" />
								</button>

								<div className="flex gap-1.5">
									{Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
										if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) {
											return (
												<button
													key={p}
													onClick={() => setPage(p)}
													className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
														p === page
															? "bg-red-500 text-white"
															: "bg-gray-200/50 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300 hover:bg-gray-300/50 dark:hover:bg-white/[0.12]"
													}`}
												>
													{p}
												</button>
											);
										} else if (p === page - 2 || p === page + 2) {
											return (
												<span key={p} className="w-8 h-8 flex items-center justify-center text-gray-400 dark:text-gray-500 text-xs">
													...
												</span>
											);
										}
										return null;
									})}
								</div>

								<button
									onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
									disabled={page === totalPages}
									className="w-8 h-8 rounded-full bg-gray-200/50 dark:bg-white/[0.06] border border-gray-300/50 dark:border-white/10 text-gray-500 dark:text-gray-400 flex items-center justify-center hover:bg-gray-300/50 dark:hover:bg-white/[0.12] transition-colors disabled:opacity-30 disabled:pointer-events-none"
								>
									<LuChevronRight className="w-4 h-4" />
								</button>
							</div>
						)}
					</>
				)}
			</main>
		</div>
	);
};

export default EVotingPage;
