import React, { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../utils/api";
import { config } from "../utils/config";
import { useAuth } from "../hooks/useAuth";
import { usePayment } from "../hooks/usePayment";
import { VotingEvent } from "../types/voting";
import { LuCalendar, LuMapPin, LuSearch, LuX, LuChevronLeft, LuChevronRight, LuUser, LuMail, LuPhone, LuThumbsUp, LuCircleCheck, LuCrown, LuMedal } from "react-icons/lu";
import Swal from "sweetalert2";

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
			Swal.fire("Kode Kosong", "Masukkan kode vote terlebih dahulu", "warning");
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
		const adminFee = subtotal > 0 ? VOTING_ADMIN_FEE_PER_VOTE * voteCount : 0;
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

			const nextCodeInfo: VoteCodeInfo = {
				purchaseCode: normalizedCode,
				eventId: selectedEvent?.id || "",
				status: "PAID",
				voteCount: res.data.voteCount,
				usedVotes: res.data.usedVotes,
				remainingVotes: res.data.remainingVotes,
				message: res.data.remainingVotes > 0 ? "Kode vote aktif" : "Semua vote pada kode ini sudah digunakan",
			};
			setPurchaseCode(normalizedCode);
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
			const adminFee = res.data.purchase.adminFee ?? (totalAmount > 0 ? VOTING_ADMIN_FEE_PER_VOTE * voteCount : 0);
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
				return { label: "Buka", className: "bg-green-500/80 text-white" };
			case "amber":
				return { label: "Segera", className: "bg-orange-500/80 text-white" };
			case "red":
				return { label: "Selesai", className: "bg-gray-500/80 text-white" };
			default:
				return { label: "Vote", className: "bg-red-500/80 text-white" };
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

	const currentCategory = selectedEvent?.votingConfig?.categories.find((c) => c.id === selectedCategoryId);
	const sortedNominees = [...(currentCategory?.nominees || [])].sort((a, b) => b.voteCount - a.voteCount);
	const podiumNominees = sortedNominees.slice(0, 3);
	const remainingNominees = sortedNominees.slice(3);
	const podiumOrder = podiumNominees;

	// Event detail / voting view
	if (selectedEvent) {
		const votingOrderSummary = getVotingOrderSummary();

		return (
			<div className="min-h-screen transition-colors">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
					{/* Back button */}
					<button
						onClick={() => { setSelectedEvent(null); setSelectedCategoryId(null); setVotedNominees(new Set()); clearActiveVoteCode(); }}
						className="mb-4 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
					>
						&larr; Kembali ke daftar event
					</button>

					{/* Event header */}
					<div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-white/[0.06] overflow-hidden mb-6">
						{selectedEvent.thumbnail && (
							<img
								src={`${config.api.backendUrl}${selectedEvent.thumbnail}`}
								alt={selectedEvent.title}
								className="w-full h-48 sm:h-64 object-cover"
							/>
						)}
						<div className="p-6">
							<h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{selectedEvent.title}</h1>
							<div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
								<span className="flex items-center gap-1.5">
									<LuCalendar className="w-4 h-4" />
									{formatDate(selectedEvent.startDate)}
								</span>
								{(selectedEvent.venue || selectedEvent.city) && (
									<span className="flex items-center gap-1.5">
										<LuMapPin className="w-4 h-4" />
										{selectedEvent.venue || selectedEvent.city}
									</span>
								)}
							</div>
							{selectedEvent.votingConfig?.isPaid && (
								<div className="mt-4 flex flex-wrap items-center gap-3">
									<span className="text-sm text-gray-500 dark:text-gray-400">
										Voting berbayar: {formatCurrency(selectedEvent.votingConfig.pricePerVote)}/vote
									</span>
									{isVotingOpen(selectedEvent) && (
										<>
											<button
												onClick={() => setShowPurchaseModal(true)}
												className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
											>
												Beli Vote
											</button>
											<button
												onClick={() => setShowCodeEntry(true)}
												className="px-4 py-1.5 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-300 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-500/10"
											>
												{voteCodeInfo ? "Ganti Kode" : "Masukkan Kode"}
											</button>
										</>
									)}
								</div>
							)}
							{selectedEvent.votingConfig?.isPaid && voteCodeInfo && (
								<div className={`mt-3 rounded-xl border px-4 py-3 text-sm ${
									voteCodeInfo.status === "PAID" && voteCodeInfo.remainingVotes > 0
										? "border-green-200 bg-green-50 text-green-800 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-300"
										: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
								}`}>
									<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
										<div>
											<p className="font-semibold">Kode vote aktif: <span className="font-mono">{voteCodeInfo.purchaseCode}</span></p>
											<p className="text-xs opacity-80">Sisa {voteCodeInfo.remainingVotes} dari {voteCodeInfo.voteCount} vote</p>
										</div>
										<button
											onClick={clearActiveVoteCode}
											className="self-start sm:self-center text-xs font-medium underline underline-offset-2"
										>
											Hapus kode
										</button>
									</div>
								</div>
							)}

							{/* Voting status banner */}
							{!isVotingOpen(selectedEvent) && (
								<div className={`mt-4 px-4 py-3 rounded-xl text-sm font-medium ${
									getVotingStatus(selectedEvent).color === "amber"
										? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20"
										: "bg-gray-50 dark:bg-gray-500/10 text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-500/20"
								}`}>
									{getVotingStatus(selectedEvent).color === "amber"
										? `Voting belum dimulai${selectedEvent.votingConfig?.startDate ? `. Dibuka pada ${new Date(selectedEvent.votingConfig.startDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}` : ""}`
										: "Voting sudah ditutup"}
								</div>
							)}
						</div>
					</div>

					{/* Category tabs */}
					{selectedEvent.votingConfig?.categories && selectedEvent.votingConfig.categories.length > 1 && (
						<div className="flex gap-2 overflow-x-auto pb-2 mb-4">
							{selectedEvent.votingConfig.categories.map((cat) => (
								<button
									key={cat.id}
									onClick={() => setSelectedCategoryId(cat.id)}
									className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
										selectedCategoryId === cat.id
										? "bg-red-600 text-white shadow-lg shadow-red-600/25"
										: "bg-white/60 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-white/[0.1] border border-gray-200/50 dark:border-white/[0.06]"
									}`}
								>
									{cat.title}
								</button>
							))}
						</div>
					)}

					{/* Category title */}
					{currentCategory && (
						<div className="mb-4">
							<h2 className="text-xl font-semibold text-gray-900 dark:text-white">{currentCategory.title}</h2>
							{currentCategory.description && (
								<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{currentCategory.description}</p>
							)}
						</div>
					)}

					{/* Nominees podium */}
					{sortedNominees.length > 0 ? (
						<div className="space-y-8">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 md:items-end">
								{podiumOrder.map((nominee) => {
									const rank = sortedNominees.findIndex((item) => item.id === nominee.id) + 1;
									const isVoted = votedNominees.has(nominee.id);
									const maxVotes = sortedNominees[0]?.voteCount || 1;
									const pct = maxVotes > 0 ? (nominee.voteCount / maxVotes) * 100 : 0;
									const isFirst = rank === 1;
									const podiumClass =
										rank === 1
											? "md:order-2 md:-mt-8"
											: rank === 2
												? "md:order-1"
												: "md:order-3";
									const rankTheme =
										rank === 1
											? "from-yellow-400 via-amber-400 to-orange-500 text-yellow-950"
											: rank === 2
												? "from-slate-200 via-gray-300 to-slate-400 text-slate-800"
												: "from-amber-700 via-orange-700 to-yellow-700 text-white";

									return (
										<div
											key={nominee.id}
											className={`voting-podium-card ${podiumClass} ${isFirst ? "voting-podium-winner" : ""} ${
												isVoted ? "ring-2 ring-green-400/70" : ""
											}`}
										>
											<div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${rankTheme}`} />
											<div className="relative p-4">
												<div className="flex items-center justify-between mb-3">
													<div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r ${rankTheme} text-xs font-black shadow-lg`}>
														{rank === 1 ? <LuCrown className="w-4 h-4" /> : <LuMedal className="w-4 h-4" />}
														Juara {rank}
													</div>
													<span className="text-xs font-bold text-red-600 dark:text-red-400">{nominee.voteCount} vote</span>
												</div>

												<div className={`relative mx-auto overflow-hidden rounded-2xl border-4 ${
													rank === 1 ? "h-64 border-yellow-300 shadow-yellow-300/30" : "h-56 border-white/70 dark:border-white/10"
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
													<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-4 pt-12">
														<h3 className="text-white font-black text-lg leading-tight truncate">{nominee.nomineeName}</h3>
														{nominee.nomineeSubtitle && (
															<p className="text-white/75 text-xs truncate mt-0.5">{nominee.nomineeSubtitle}</p>
														)}
													</div>
												</div>

												<div className="mt-4">
													<div className="h-2 rounded-full bg-gray-100 dark:bg-white/[0.06] overflow-hidden">
														<div
															className={`h-full rounded-full bg-gradient-to-r ${rankTheme} transition-all duration-700`}
															style={{ width: `${pct}%` }}
														/>
													</div>
												</div>

												<div className={`mt-4 rounded-t-xl bg-gradient-to-r ${rankTheme} ${isFirst ? "h-16" : "h-12"} flex items-center justify-center shadow-lg`}>
													<span className="text-3xl font-black">#{rank}</span>
												</div>

												<button
													onClick={() => {
														if (selectedEvent.votingConfig?.isPaid) {
															handlePaidVote(currentCategory!.id, nominee.id);
														} else {
															handleFreeVote(currentCategory!.id, nominee.id);
														}
													}}
													disabled={voting || isVoted || !isVotingOpen(selectedEvent)}
													className={`mt-4 w-full py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-colors ${
														isVoted
															? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
															: !isVotingOpen(selectedEvent)
																? "bg-gray-100 text-gray-400 dark:bg-white/[0.04] dark:text-gray-600 cursor-not-allowed"
																: "bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
													}`}
												>
													{isVoted ? (
														<>
															<LuCircleCheck className="w-4 h-4" />
															Sudah Vote
														</>
													) : !isVotingOpen(selectedEvent) ? (
														getVotingStatus(selectedEvent).color === "amber" ? "Belum Dibuka" : "Sudah Ditutup"
													) : (
														<>
															<LuThumbsUp className="w-4 h-4" />
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
													}`}
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
																onClick={() => {
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
									placeholder="VOT-XXXXXX-XXXXXXXX"
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
									<button
										onClick={submitPaidVote}
										disabled={voting || checkingVoteCode || !purchaseCode.trim()}
										className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
									>
										{voting ? "..." : "Vote"}
									</button>
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
										<span className="text-gray-600 dark:text-gray-400">Biaya admin ({formatCurrency(VOTING_ADMIN_FEE_PER_VOTE)} x {voteCount})</span>
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
				</div>
			</div>
		);
	}

	// Event list view
	return (
		<div className="min-h-screen transition-colors">
			<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Header */}
				<div className="mb-6">
					<p className="text-[10px] md:text-xs tracking-[0.3em] text-gray-400 dark:text-gray-500 font-medium mb-2">
						VOTE FAVORIT KAMU
					</p>
					<h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-1">E-Voting</h1>
					<p className="text-sm text-gray-500 dark:text-gray-400">Vote untuk tim atau peserta favorit kamu</p>
				</div>

				{/* Search + Filters */}
				<div className="mb-6 space-y-4">
					{/* Search bar */}
					<div className="relative">
						<LuSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
						<input
							type="text"
							value={search}
							onChange={(e) => { setSearch(e.target.value); setPage(1); }}
							placeholder="Cari event voting berdasarkan nama atau lokasi..."
							className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-gray-100/80 dark:bg-white/[0.06] border border-gray-200/50 dark:border-white/[0.08] text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50 transition-colors"
						/>
						{search && (
							<button
								onClick={() => { setSearch(""); setPage(1); }}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
							>
								<LuX className="w-4 h-4" />
							</button>
						)}
					</div>

					{/* Status filter pills */}
					<div className="flex flex-wrap items-center gap-1.5">
						<span className="text-xs text-gray-500 dark:text-gray-400 mr-1">Status:</span>
						{statusOptions.map((opt) => (
							<button
								key={opt.id}
								onClick={() => setStatusFilter(opt.id)}
								className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
									statusFilter === opt.id
										? "bg-red-500 text-white"
										: "bg-gray-200/60 dark:bg-white/[0.08] text-gray-600 dark:text-gray-300 hover:bg-gray-300/60 dark:hover:bg-white/[0.14]"
								}`}
							>
								{opt.label}
							</button>
						))}
					</div>
				</div>

				{/* Result info */}
				<p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
					{filteredEvents.length > 0
						? `Menampilkan ${filteredEvents.length} event`
						: "Tidak ada event yang ditemukan"}
				</p>

				{/* Events Grid */}
				{loading ? (
					<div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
						{Array.from({ length: 25 }).map((_, i) => (
							<div
								key={i}
								className="rounded-xl bg-gray-200/50 dark:bg-white/[0.03] border border-gray-200/30 dark:border-white/[0.04] animate-pulse"
							>
								<div className="aspect-[2/3]" />
								<div className="p-2 space-y-1.5">
									<div className="h-2.5 bg-gray-300/50 dark:bg-white/[0.06] rounded w-3/4" />
									<div className="h-2 bg-gray-300/50 dark:bg-white/[0.06] rounded w-1/2" />
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
						<div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
							{filteredEvents.map((event) => {
								const badge = getVotingStatusBadge(event);
								const votePriceLabel = getVotingPriceLabel(event);
								return (
									<div
										key={event.id}
										onClick={() => openVotingEvent(event.id)}
										className="group relative overflow-hidden rounded-xl border border-gray-200/70 bg-white shadow-md shadow-gray-200/80 transition-all duration-300 hover:scale-[1.02] hover:border-red-400/30 hover:shadow-lg hover:shadow-gray-300/80 dark:bg-white/[0.03] dark:border-white/[0.06] dark:shadow-none dark:hover:border-red-500/20 cursor-pointer"
									>
										{/* Poster - 2:3 ratio */}
										<div className="relative aspect-[2/3] w-full bg-gradient-to-br from-red-900/10 to-orange-900/10 overflow-hidden">
											{event.thumbnail ? (
												<img
													src={getImageUrl(event.thumbnail)}
													alt={event.title}
													className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
													loading="lazy"
												/>
											) : (
												<div className="w-full h-full flex items-center justify-center">
													<LuThumbsUp className="w-6 h-6 text-gray-400/40 dark:text-gray-600" />
												</div>
											)}
											<div className="absolute top-1.5 left-1.5">
												<span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full backdrop-blur-sm ${badge.className}`}>
													{badge.label}
												</span>
											</div>
										</div>

										{/* Info */}
										<div className="flex min-h-[120px] flex-col p-2.5">
											<h4 className="text-[10px] lg:text-xs font-semibold text-gray-800 dark:text-white leading-tight line-clamp-2 mb-1.5">
												{event.title}
											</h4>
											<div className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
												<LuCalendar className="w-3 h-3 flex-shrink-0" />
												<span className="text-[8px] lg:text-[9px]">
													{formatShortDate(event.startDate)}
												</span>
											</div>
											{(event.venue || event.city || event.location) && (
												<div className="flex items-center gap-1 text-gray-400 dark:text-gray-500 mt-0.5">
													<LuMapPin className="w-3 h-3 flex-shrink-0" />
													<span className="text-[8px] lg:text-[9px] line-clamp-1">
														{event.city || event.venue || event.location}
													</span>
												</div>
											)}
												<div className="mt-auto pt-3">
													<p className="text-[11px] lg:text-sm font-bold text-red-600 dark:text-red-400">
														{votePriceLabel}
													</p>
												</div>
										</div>
									</div>
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
			</div>
		</div>
	);
};

export default EVotingPage;
