import React, { useState, useEffect, useCallback } from "react";
import { api } from "../utils/api";
import { config } from "../utils/config";
import { useAuth } from "../hooks/useAuth";
import { TicketedEvent } from "../types/ticket";
import {
	CalendarDaysIcon,
	MapPinIcon,
	TicketIcon,
	MagnifyingGlassIcon,
	UserIcon,
	EnvelopeIcon,
	PhoneIcon,
} from "@heroicons/react/24/outline";
import Swal from "sweetalert2";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";

const ETicketingPage: React.FC = () => {
	const { user } = useAuth();
	const [events, setEvents] = useState<TicketedEvent[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
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

	const fetchEvents = useCallback(async () => {
		try {
			setLoading(true);
			const params: any = { page, limit: 12 };
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

	const openPurchaseModal = (event: TicketedEvent) => {
		setSelectedEvent(event);
		setQuantity(1);
		setShowPurchaseModal(true);
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
		} catch (err: any) {
			Swal.fire("Gagal", err.response?.data?.error || "Gagal memesan tiket", "error");
		} finally {
			setPurchasing(false);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
						E-Ticketing
					</h1>
					<p className="mt-2 text-gray-600 dark:text-gray-400">
						Beli tiket event secara online
					</p>
				</div>

				{/* Search */}
				<div className="mb-6">
					<div className="relative max-w-md">
						<MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
						<input
							type="text"
							placeholder="Cari event..."
							value={search}
							onChange={(e) => {
								setSearch(e.target.value);
								setPage(1);
							}}
							className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
						/>
					</div>
				</div>

				{/* Events Grid */}
				{loading ? (
					<div className="flex justify-center py-20">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
					</div>
				) : events.length === 0 ? (
					<div className="text-center py-20">
						<TicketIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
						<p className="text-gray-500 dark:text-gray-400 text-lg">
							Belum ada event dengan e-ticketing
						</p>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{events.map((event) => {
							const availability = getTicketAvailability(event);
							return (
								<div
									key={event.id}
									className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
								>
									{/* Image */}
									<div className="relative h-48 bg-gray-200 dark:bg-gray-700">
										{event.thumbnail ? (
											<img
												src={`${config.api.backendUrl}${event.thumbnail}`}
												alt={event.title}
												className="w-full h-full object-cover"
											/>
										) : (
											<div className="flex items-center justify-center h-full">
												<TicketIcon className="w-16 h-16 text-gray-400 dark:text-gray-500" />
											</div>
										)}
										{/* Price Badge */}
										<div className="absolute top-3 right-3 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
											{event.ticketConfig?.price === 0
												? "GRATIS"
												: formatCurrency(event.ticketConfig?.price || 0)}
										</div>
									</div>

									{/* Content */}
									<div className="p-4">
										<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
											{event.title}
										</h3>

										<div className="space-y-1.5 text-sm text-gray-500 dark:text-gray-400 mb-3">
											<div className="flex items-center gap-2">
												<CalendarDaysIcon className="w-4 h-4 flex-shrink-0" />
												<span>{formatDate(event.startDate)}</span>
											</div>
											{(event.venue || event.city || event.location) && (
												<div className="flex items-center gap-2">
													<MapPinIcon className="w-4 h-4 flex-shrink-0" />
													<span className="truncate">
														{event.venue || event.city || event.location}
													</span>
												</div>
											)}
										</div>

										{/* Availability */}
										<div className="flex items-center justify-between mb-3">
											<span
												className={`text-sm font-medium ${
													availability.color === "green"
														? "text-green-600 dark:text-green-400"
														: availability.color === "amber"
														? "text-amber-600 dark:text-amber-400"
														: "text-red-600 dark:text-red-400"
												}`}
											>
												{availability.text}
											</span>
											{event.ticketConfig && (
												<span className="text-xs text-gray-400">
													{event.ticketConfig.soldCount}/{event.ticketConfig.quota}
												</span>
											)}
										</div>

										{/* Buy Button */}
										<button
											onClick={() => openPurchaseModal(event)}
											disabled={availability.available <= 0}
											className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
										>
											{availability.available <= 0 ? "Tiket Habis" : "Beli Tiket"}
										</button>
									</div>
								</div>
							);
						})}
					</div>
				)}

				{/* Pagination */}
				{totalPages > 1 && (
					<div className="flex justify-center gap-2 mt-8">
						{Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
							<button
								key={p}
								onClick={() => setPage(p)}
								className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
									p === page
										? "bg-red-600 text-white"
										: "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
								}`}
							>
								{p}
							</button>
						))}
					</div>
				)}
			</div>

			{/* Purchase Modal */}
			{showPurchaseModal && selectedEvent && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div
						className="absolute inset-0 bg-black/50"
						onClick={() => setShowPurchaseModal(false)}
					/>
					<div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
						<div className="p-6">
							<h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
								Beli Tiket
							</h2>
							<p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
								{selectedEvent.title}
							</p>

							{/* Event Info */}
							<div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 mb-6">
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
										<UserIcon className="w-4 h-4 inline mr-1" />
										Nama Lengkap *
									</label>
									<input
										type="text"
										value={buyerName}
										onChange={(e) => setBuyerName(e.target.value)}
										className="w-full px-4 py-2.5 bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
										placeholder="Nama lengkap"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
										<EnvelopeIcon className="w-4 h-4 inline mr-1" />
										Email *
									</label>
									<input
										type="email"
										value={buyerEmail}
										onChange={(e) => setBuyerEmail(e.target.value)}
										className="w-full px-4 py-2.5 bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
										placeholder="email@example.com"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
										<PhoneIcon className="w-4 h-4 inline mr-1" />
										No. Telepon <span className="text-gray-400">(Opsional)</span>
									</label>
									<input
										type="tel"
										value={buyerPhone}
										onChange={(e) => setBuyerPhone(e.target.value)}
										className="w-full px-4 py-2.5 bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
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
											className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-600"
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
											className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-600"
										>
											+
										</button>
									</div>
								</div>

								{/* Total */}
								<div className="border-t dark:border-gray-600 pt-4">
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
										className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
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
					<div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
						<div className="p-6 text-center" id="ticket-content">
							{/* Success Icon */}
							<div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
								<TicketIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
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
							<div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 mb-5 text-sm text-left space-y-1.5">
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
									setTicketResult(null);
								}}
								className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
							>
								<ArrowDownTrayIcon className="w-5 h-5" />
								Unduh Tiket
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default ETicketingPage;
