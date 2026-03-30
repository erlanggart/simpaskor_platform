import React, { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../utils/api";
import { config } from "../utils/config";
import { useAuth } from "../hooks/useAuth";
import { usePayment } from "../hooks/usePayment";
import { TicketedEvent } from "../types/ticket";
import { LuCalendar, LuMapPin, LuTicket, LuSearch, LuX, LuChevronLeft, LuChevronRight, LuUser, LuMail, LuPhone, LuDownload, LuSend } from "react-icons/lu";
import Swal from "sweetalert2";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";

const ETicketingPage: React.FC = () => {
	const { user } = useAuth();
	const { pay, isSnapReady } = usePayment();
	const [events, setEvents] = useState<TicketedEvent[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "available" | "limited" | "soldout">("all");
	const [selectedEvent, setSelectedEvent] = useState<TicketedEvent | null>(null);
	const [showPurchaseModal, setShowPurchaseModal] = useState(false);
	const [purchasing, setPurchasing] = useState(false);
	const [ticketResult, setTicketResult] = useState<{
		ticketCode: string;
		eventTitle: string;
		buyerName: string;
		quantity: number;
		totalAmount: number;
		message: string;
	} | null>(null);

	// Purchase form
	const [buyerName, setBuyerName] = useState(user?.name || "");
	const [buyerEmail, setBuyerEmail] = useState(user?.email || "");
	const [buyerPhone, setBuyerPhone] = useState("");
	const [quantity, setQuantity] = useState(1);

	// Send ticket to email
	const [sendEmail, setSendEmail] = useState("");
	const [sendingEmail, setSendingEmail] = useState(false);
	const [autoEmailSent, setAutoEmailSent] = useState(false);

	// Email is now sent automatically from the backend (webhook for paid, purchase endpoint for free)
	// The autoEmailSent state is kept to display confirmation in the UI
	useEffect(() => {
		if (ticketResult && buyerEmail.trim()) {
			setAutoEmailSent(true);
		}
	}, [ticketResult, buyerEmail]);

	const fetchEvents = useCallback(async () => {
		try {
			setLoading(true);
			const params: any = { page, limit: 25 };
			if (search) params.search = search;

			const res = await api.get("/tickets/events", { params });
			setEvents(res.data.data);
			setTotalPages(res.data.totalPages);
		} catch {
			console.error("Error fetching events");
		} finally {
			setLoading(false);
		}
	}, [page, search]);

	useEffect(() => {
		fetchEvents();
	}, [fetchEvents]);

	// Update form when user changes
	useEffect(() => {
		if (user) {
			setBuyerName(user.name);
			setBuyerEmail(user.email);
		}
	}, [user]);

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

	const getTicketAvailability = (event: TicketedEvent) => {
		if (!event.ticketConfig) return { available: 0, text: "Tidak tersedia", color: "gray" };
		const available = event.ticketConfig.quota - event.ticketConfig.soldCount;
		if (available <= 0) return { available: 0, text: "Habis", color: "red" };
		if (available <= 10) return { available, text: `Sisa ${available} tiket`, color: "amber" };
		return { available, text: `${available} tiket tersedia`, color: "green" };
	};

	const getTicketBadge = (event: TicketedEvent): { label: string; className: string } => {
		if (event.ticketConfig?.price === 0) return { label: "GRATIS", className: "bg-green-500/80 text-white" };
		if (event.ticketConfig?.price) return { label: formatCurrency(event.ticketConfig.price), className: "bg-red-500/80 text-white" };
		return { label: "Tiket", className: "bg-gray-500/80 text-white" };
	};

	const getImageUrl = (imageUrl: string | null): string => {
		if (!imageUrl) return "";
		if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;
		return `${config.api.backendUrl}${imageUrl}`;
	};

	const formatShortDate = (date: string) => {
		return new Date(date).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "short",
		});
	};

	const filteredEvents = useMemo(() => {
		if (availabilityFilter === "all") return events;
		return events.filter((event) => {
			const avail = getTicketAvailability(event);
			switch (availabilityFilter) {
				case "available":
					return avail.available > 10;
				case "limited":
					return avail.available > 0 && avail.available <= 10;
				case "soldout":
					return avail.available <= 0;
				default:
					return true;
			}
		});
	}, [events, availabilityFilter]);

	const availabilityOptions = [
		{ id: "all" as const, label: "Semua" },
		{ id: "available" as const, label: "Tersedia" },
		{ id: "limited" as const, label: "Hampir Habis" },
		{ id: "soldout" as const, label: "Habis" },
	];

	const openPurchaseModal = (event: TicketedEvent) => {
		setSelectedEvent(event);
		setQuantity(1);
		setSendEmail("");
		setAutoEmailSent(false);
		setShowPurchaseModal(true);
	};

	const handleSendEmail = async () => {
		if (!ticketResult || !sendEmail.trim()) {
			Swal.fire("Error", "Masukkan email tujuan", "error");
			return;
		}
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(sendEmail.trim())) {
			Swal.fire("Error", "Format email tidak valid", "error");
			return;
		}

		try {
			setSendingEmail(true);
			// Generate QR code as base64 from hidden canvas
			const qrCanvas = document.getElementById("ticket-qr-canvas") as HTMLCanvasElement;
			const qrImageBase64 = qrCanvas ? qrCanvas.toDataURL("image/png") : "";

			await api.post("/tickets/send-email", {
				ticketCode: ticketResult.ticketCode,
				email: sendEmail.trim(),
				qrImageBase64,
			});

			Swal.fire("Berhasil", `Tiket berhasil dikirim ke ${sendEmail.trim()}`, "success");
		} catch (err: any) {
			Swal.fire("Gagal", err.response?.data?.error || "Gagal mengirim email", "error");
		} finally {
			setSendingEmail(false);
		}
	};

	const handlePurchase = async () => {
		if (!selectedEvent) return;
		if (!buyerName.trim() || !buyerEmail.trim()) {
			Swal.fire("Error", "Nama dan email wajib diisi", "error");
			return;
		}

		const result = await Swal.fire({
			title: "Konfirmasi Pembelian",
			html: `
				<div class="text-left">
					<p><strong>Event:</strong> ${selectedEvent.title}</p>
					<p><strong>Jumlah:</strong> ${quantity} tiket</p>
					<p><strong>Total:</strong> ${selectedEvent.ticketConfig?.price === 0 ? "GRATIS" : formatCurrency((selectedEvent.ticketConfig?.price || 0) * quantity)}</p>
					<p><strong>Nama:</strong> ${buyerName}</p>
					<p><strong>Email:</strong> ${buyerEmail}</p>
				</div>
			`,
			icon: "question",
			showCancelButton: true,
			confirmButtonText: "Beli Tiket",
			cancelButtonText: "Batal",
			confirmButtonColor: "#dc2626",
		});

		if (!result.isConfirmed) return;

		try {
			setPurchasing(true);
			const res = await api.post("/tickets/purchase", {
				eventId: selectedEvent.id,
				buyerName: buyerName.trim(),
				buyerEmail: buyerEmail.trim(),
				buyerPhone: buyerPhone.trim() || undefined,
				quantity,
			});

			const { snapToken } = res.data.ticket;

			if (snapToken && isSnapReady) {
				setShowPurchaseModal(false);
				// Open Midtrans Snap payment popup
				pay(snapToken, {
					onSuccess: () => {
						setTicketResult({
							ticketCode: res.data.ticket.ticketCode,
							eventTitle: selectedEvent.title,
							buyerName: buyerName.trim(),
							quantity,
							totalAmount: (selectedEvent.ticketConfig?.price || 0) * quantity,
							message: "Pembayaran berhasil! Tiket Anda sudah aktif. E-Ticket akan dikirim ke email Anda.",
						});
						fetchEvents();
					},
					onPending: () => {
						Swal.fire({
							title: "Menunggu Pembayaran",
							html: "Pembayaran sedang diproses. Tiket dan barcode akan dikirim ke email Anda setelah pembayaran dikonfirmasi.",
							icon: "info",
							confirmButtonColor: "#dc2626",
						});
						fetchEvents();
					},
					onError: () => {
						Swal.fire("Pembayaran Gagal", "Pembayaran tidak berhasil. Tiket tidak aktif.", "error");
						fetchEvents();
					},
					onClose: () => {
						Swal.fire("Pembayaran Belum Selesai", "Pembayaran belum dilakukan. Tiket dan barcode akan dikirim ke email Anda setelah pembayaran berhasil.", "warning");
						fetchEvents();
					},
				});
			} else {
				// Free ticket or Snap not available
				setShowPurchaseModal(false);
				setTicketResult({
					ticketCode: res.data.ticket.ticketCode,
					eventTitle: selectedEvent.title,
					buyerName: buyerName.trim(),
					quantity,
					totalAmount: (selectedEvent.ticketConfig?.price || 0) * quantity,
					message: res.data.message,
				});
				fetchEvents();
			}
		} catch (err: any) {
			Swal.fire("Gagal", err.response?.data?.error || "Gagal memesan tiket", "error");
		} finally {
			setPurchasing(false);
		}
	};

	return (
		<div className="min-h-screen transition-colors">
			<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Header */}
				<div className="mb-6">
					<p className="text-[10px] md:text-xs tracking-[0.3em] text-gray-400 dark:text-gray-500 font-medium mb-2">
						BELI TIKET ONLINE
					</p>
					<h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-1">
						E-Ticketing
					</h1>
					<p className="text-sm text-gray-500 dark:text-gray-400">
						Beli tiket event secara online
					</p>
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
							placeholder="Cari event tiket berdasarkan nama atau lokasi..."
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

					{/* Availability filter pills */}
					<div className="flex flex-wrap items-center gap-1.5">
						<span className="text-xs text-gray-500 dark:text-gray-400 mr-1">Ketersediaan:</span>
						{availabilityOptions.map((opt) => (
							<button
								key={opt.id}
								onClick={() => setAvailabilityFilter(opt.id)}
								className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
									availabilityFilter === opt.id
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
							<LuTicket className="w-8 h-8 text-gray-400 dark:text-gray-500" />
						</div>
						<p className="text-gray-500 dark:text-gray-400 text-sm">Tidak ada event tiket yang ditemukan</p>
					</div>
				) : (
					<>
						<div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
							{filteredEvents.map((event) => {
								const badge = getTicketBadge(event);
								const availability = getTicketAvailability(event);
								return (
									<div
										key={event.id}
										onClick={() => openPurchaseModal(event)}
										className={`group relative rounded-xl overflow-hidden bg-gray-100/50 dark:bg-white/[0.03] border border-gray-200/50 dark:border-white/[0.06] hover:border-red-400/30 dark:hover:border-red-500/20 transition-all duration-300 hover:scale-[1.02] cursor-pointer ${availability.available <= 0 ? "opacity-60" : ""}`}
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
													<LuTicket className="w-6 h-6 text-gray-400/40 dark:text-gray-600" />
												</div>
											)}
											<div className="absolute top-1.5 left-1.5">
												<span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full backdrop-blur-sm ${badge.className}`}>
													{badge.label}
												</span>
											</div>
											{availability.available <= 0 && (
												<div className="absolute inset-0 bg-black/30 flex items-center justify-center">
													<span className="text-white text-xs font-bold bg-red-600/90 px-2 py-1 rounded-full">HABIS</span>
												</div>
											)}
										</div>

										{/* Info */}
										<div className="p-2">
											<h4 className="text-[10px] lg:text-xs font-semibold text-gray-800 dark:text-white leading-tight line-clamp-2 mb-1">
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

			{/* Purchase Modal */}
			{showPurchaseModal && selectedEvent && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div
						className="absolute inset-0 bg-black/50"
						onClick={() => setShowPurchaseModal(false)}
					/>
					<div className="relative bg-white/90 dark:bg-white/[0.05] backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-white/[0.06] shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
						<div className="p-6">
							<h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
								Beli Tiket
							</h2>
							<p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
								{selectedEvent.title}
							</p>

							{/* Event Info */}
							<div className="bg-white/50 dark:bg-white/[0.03] rounded-xl p-4 mb-6 border border-gray-200/50 dark:border-white/[0.06]">
								<div className="space-y-2 text-sm">
									<div className="flex justify-between">
										<span className="text-gray-500 dark:text-gray-400">Tanggal</span>
										<span className="text-gray-900 dark:text-white font-medium">
											{formatDate(selectedEvent.startDate)}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-500 dark:text-gray-400">Harga</span>
										<span className="text-gray-900 dark:text-white font-medium">
											{selectedEvent.ticketConfig?.price === 0
												? "GRATIS"
												: formatCurrency(selectedEvent.ticketConfig?.price || 0)}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-500 dark:text-gray-400">Tersedia</span>
										<span className="text-gray-900 dark:text-white font-medium">
											{(selectedEvent.ticketConfig?.quota || 0) -
												(selectedEvent.ticketConfig?.soldCount || 0)} tiket
										</span>
									</div>
								</div>
							</div>

							{/* Buyer Form */}
							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
										<LuUser className="w-4 h-4 inline mr-1" />
										Nama Lengkap *
									</label>
									<input
										type="text"
										value={buyerName}
										onChange={(e) => setBuyerName(e.target.value)}
										className="w-full px-4 py-2.5 bg-white/50 dark:bg-white/[0.03] border border-gray-200/50 dark:border-white/[0.06] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
										placeholder="Nama lengkap"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
										<LuMail className="w-4 h-4 inline mr-1" />
										Email *
									</label>
									<input
										type="email"
										value={buyerEmail}
										onChange={(e) => setBuyerEmail(e.target.value)}
										className="w-full px-4 py-2.5 bg-white/50 dark:bg-white/[0.03] border border-gray-200/50 dark:border-white/[0.06] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
										placeholder="email@example.com"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
										<LuPhone className="w-4 h-4 inline mr-1" />
										No. Telepon <span className="text-gray-400">(Opsional)</span>
									</label>
									<input
										type="tel"
										value={buyerPhone}
										onChange={(e) => setBuyerPhone(e.target.value)}
										className="w-full px-4 py-2.5 bg-white/50 dark:bg-white/[0.03] border border-gray-200/50 dark:border-white/[0.06] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
										placeholder="+6281234567890"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
										Jumlah Tiket
									</label>
									<div className="flex items-center gap-3">
										<button
											onClick={() => setQuantity(Math.max(1, quantity - 1))}
											className="w-10 h-10 rounded-lg bg-white/60 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300 font-bold hover:bg-white/80 dark:hover:bg-white/[0.1] border border-gray-200/50 dark:border-white/[0.06]"
										>
											-
										</button>
										<span className="text-xl font-semibold text-gray-900 dark:text-white w-10 text-center">
											{quantity}
										</span>
										<button
											onClick={() =>
												setQuantity(
													Math.min(
														10,
														Math.min(
															quantity + 1,
															(selectedEvent.ticketConfig?.quota || 0) -
																(selectedEvent.ticketConfig?.soldCount || 0)
														)
													)
												)
											}
											className="w-10 h-10 rounded-lg bg-white/60 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300 font-bold hover:bg-white/80 dark:hover:bg-white/[0.1] border border-gray-200/50 dark:border-white/[0.06]"
										>
											+
										</button>
									</div>
								</div>

								{/* Total */}
								<div className="border-t border-gray-200/50 dark:border-white/[0.06] pt-4">
									<div className="flex justify-between text-lg font-bold">
										<span className="text-gray-900 dark:text-white">Total</span>
										<span className="text-red-600">
											{selectedEvent.ticketConfig?.price === 0
												? "GRATIS"
												: formatCurrency(
														(selectedEvent.ticketConfig?.price || 0) * quantity
												  )}
										</span>
									</div>
								</div>

								{/* Buttons */}
								<div className="flex gap-3 pt-2">
									<button
										onClick={() => setShowPurchaseModal(false)}
										className="flex-1 py-2.5 border border-gray-200/50 dark:border-white/[0.06] text-gray-700 dark:text-gray-300 rounded-xl hover:bg-white/50 dark:hover:bg-white/[0.06] font-medium transition-colors"
									>
										Batal
									</button>
									<button
										onClick={handlePurchase}
										disabled={purchasing}
										className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
									>
										{purchasing ? "Memproses..." : "Beli Tiket"}
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Ticket Success Modal with QR Code */}
			{ticketResult && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-black/50" />
					<div className="relative bg-white/90 dark:bg-white/[0.05] backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-white/[0.06] shadow-xl w-full max-w-md overflow-hidden">
						<div className="p-6 text-center" id="ticket-content">
							{/* Success Icon */}
							<div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
								<LuTicket className="w-8 h-8 text-green-600 dark:text-green-400" />
							</div>

							<h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
								Pembelian Berhasil!
							</h2>
							<p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
								{ticketResult.message}
							</p>

							{/* QR Code (visible) */}
							<div className="bg-white p-4 rounded-xl inline-block mb-4 shadow-inner">
								<QRCodeSVG
									value={ticketResult.ticketCode}
									size={180}
									level="H"
									includeMargin={true}
								/>
							</div>
							{/* Hidden QRCodeCanvas for download */}
							<div style={{ position: "absolute", left: "-9999px" }}>
								<QRCodeCanvas
									id="ticket-qr-canvas"
									value={ticketResult.ticketCode}
									size={300}
									level="H"
									includeMargin={true}
								/>
							</div>

							{/* Ticket Code */}
							<p className="text-2xl font-mono font-bold text-red-600 dark:text-red-400 mb-4 tracking-wider">
								{ticketResult.ticketCode}
							</p>

							{/* Ticket Details */}
							<div className="bg-white/50 dark:bg-white/[0.03] rounded-xl p-3 mb-5 text-sm text-left space-y-1.5 border border-gray-200/50 dark:border-white/[0.06]">
								<div className="flex justify-between">
									<span className="text-gray-500 dark:text-gray-400">Event</span>
									<span className="text-gray-900 dark:text-white font-medium text-right max-w-[60%]">
										{ticketResult.eventTitle}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-500 dark:text-gray-400">Nama</span>
									<span className="text-gray-900 dark:text-white font-medium">
										{ticketResult.buyerName}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-500 dark:text-gray-400">Jumlah</span>
									<span className="text-gray-900 dark:text-white font-medium">
										{ticketResult.quantity} tiket
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-500 dark:text-gray-400">Total</span>
									<span className="text-gray-900 dark:text-white font-medium">
										{ticketResult.totalAmount === 0
											? "GRATIS"
											: formatCurrency(ticketResult.totalAmount)}
									</span>
								</div>
							</div>

							<p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
								Simpan atau unduh tiket ini sebagai bukti pembelian.
							</p>

							{autoEmailSent && (
								<div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg px-3 py-2 text-xs font-medium mb-2">
									<LuMail className="w-3.5 h-3.5" />
									Tiket otomatis dikirim ke {buyerEmail}
								</div>
							)}
						</div>

						{/* Send to Email */}
						<div className="px-6 pb-3">
							<label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 text-left">
								Kirim tiket ke email
							</label>
							<div className="flex gap-2">
								<input
									type="email"
									value={sendEmail}
									onChange={(e) => setSendEmail(e.target.value)}
									placeholder="Masukkan email tujuan"
									className="flex-1 px-3 py-2 bg-white/50 dark:bg-white/[0.03] border border-gray-200/50 dark:border-white/[0.06] rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
								/>
								<button
									onClick={handleSendEmail}
									disabled={sendingEmail || !sendEmail.trim()}
									className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
								>
									<LuSend className="w-4 h-4" />
									{sendingEmail ? "Mengirim..." : "Kirim"}
								</button>
							</div>
						</div>

						{/* Download Button */}
						<div className="px-6 pb-6">
							<button
								onClick={() => {
									const W = 800;
									const canvas = document.createElement("canvas");
									const ctx = canvas.getContext("2d")!;
									const padding = 60;
									const qrSize = 300;
									const details = [
										["Event", ticketResult.eventTitle],
										["Nama", ticketResult.buyerName],
										["Jumlah", `${ticketResult.quantity} tiket`],
										["Total", ticketResult.totalAmount === 0 ? "GRATIS" : formatCurrency(ticketResult.totalAmount)],
									];
									const H = padding + 60 + 20 + qrSize + 30 + 40 + 30 + details.length * 40 + 40 + padding;
									canvas.width = W;
									canvas.height = H;

									// Background
									ctx.fillStyle = "#ffffff";
									ctx.fillRect(0, 0, W, H);

									// Top accent bar
									ctx.fillStyle = "#dc2626";
									ctx.fillRect(0, 0, W, 8);

									let y = padding;

									// Title
									ctx.fillStyle = "#111827";
									ctx.font = "bold 32px sans-serif";
									ctx.textAlign = "center";
									ctx.fillText("Pembelian Berhasil!", W / 2, y + 32);
									y += 60;

									// Subtitle
									ctx.fillStyle = "#6b7280";
									ctx.font = "16px sans-serif";
									ctx.fillText(ticketResult.message, W / 2, y + 14);
									y += 30;

									// QR Code from hidden canvas
									const qrCanvas = document.getElementById("ticket-qr-canvas") as HTMLCanvasElement;
									if (qrCanvas) {
										const qrX = (W - qrSize) / 2;
										// QR background box
										ctx.fillStyle = "#f9fafb";
										ctx.strokeStyle = "#e5e7eb";
										ctx.lineWidth = 2;
										ctx.beginPath();
										ctx.roundRect(qrX - 20, y - 10, qrSize + 40, qrSize + 20, 16);
										ctx.fill();
										ctx.stroke();
										ctx.drawImage(qrCanvas, qrX, y, qrSize, qrSize);
									}
									y += qrSize + 30;

									// Ticket Code
									ctx.fillStyle = "#dc2626";
									ctx.font = "bold 28px monospace";
									ctx.fillText(ticketResult.ticketCode, W / 2, y + 24);
									y += 50;

									// Dashed separator
									ctx.setLineDash([6, 4]);
									ctx.strokeStyle = "#d1d5db";
									ctx.lineWidth = 1;
									ctx.beginPath();
									ctx.moveTo(padding, y);
									ctx.lineTo(W - padding, y);
									ctx.stroke();
									ctx.setLineDash([]);
									y += 20;

									// Details
									for (const [label, value] of details) {
										ctx.textAlign = "left";
										ctx.fillStyle = "#6b7280";
										ctx.font = "16px sans-serif";
										ctx.fillText(label ?? "", padding + 20, y + 28);
										ctx.textAlign = "right";
										ctx.fillStyle = "#111827";
										ctx.font = "bold 16px sans-serif";
										ctx.fillText(value ?? "", W - padding - 20, y + 28);
										y += 40;
									}

									// Footer
									y += 10;
									ctx.textAlign = "center";
									ctx.fillStyle = "#9ca3af";
									ctx.font = "13px sans-serif";
									ctx.fillText("Simpan tiket ini sebagai bukti pembelian.", W / 2, y + 12);

									// Download
									const link = document.createElement("a");
									link.download = `ticket-${ticketResult.ticketCode}.png`;
									link.href = canvas.toDataURL("image/png");
									link.click();
								}}
								className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
							>
								<LuDownload className="w-5 h-5" />
								Unduh Tiket
							</button>
							<button
								onClick={() => setTicketResult(null)}
								className="w-full py-2.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm font-medium transition-colors"
							>
								Tutup
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default ETicketingPage;
