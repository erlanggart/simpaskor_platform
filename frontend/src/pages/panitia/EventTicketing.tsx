import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
	TicketIcon,
	MagnifyingGlassIcon,
	CheckCircleIcon,
	XCircleIcon,
	ClockIcon,
	QrCodeIcon,
	VideoCameraIcon,
	ExclamationTriangleIcon,
	Cog6ToothIcon,
	ClipboardDocumentListIcon,
	LockOpenIcon,
	LockClosedIcon,
	ArrowPathIcon,
	EnvelopeIcon,
} from "@heroicons/react/24/outline";
import Swal from "sweetalert2";
import { Html5Qrcode } from "html5-qrcode";
import { api } from "../../utils/api";
import { EventTicketConfig, TicketPurchase } from "../../types/ticket";

const EventTicketing: React.FC = () => {
	const { eventSlug } = useParams();
	const [activeTab, setActiveTab] = useState<"config" | "purchases" | "scan">("config");
	const [loading, setLoading] = useState(true);
	const [eventId, setEventId] = useState<string>("");

	// Config state
	const [config, setConfig] = useState<EventTicketConfig>({
		id: "",
		eventId: "",
		enabled: false,
		price: 0,
		quota: 100,
		soldCount: 0,
		description: "",
		salesStartDate: null,
		salesEndDate: null,
	});
	const [saving, setSaving] = useState(false);
	const [togglingTicketing, setTogglingTicketing] = useState(false);
	const [syncing, setSyncing] = useState(false);

	// Purchases state
	const [purchases, setPurchases] = useState<TicketPurchase[]>([]);
	const [purchasesLoading, setPurchasesLoading] = useState(false);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [totalPurchases, setTotalPurchases] = useState(0);
	const [paidUsedCount, setPaidUsedCount] = useState(0);

	// Scanner state
	const [scanning, setScanning] = useState(false);
	const [scanResult, setScanResult] = useState<{
		valid: boolean;
		message?: string;
		error?: string;
		ticket?: {
			ticketCode: string;
			buyerName: string;
			buyerEmail?: string;
			buyerPhone?: string;
			eventTitle?: string;
			quantity?: number;
			status: string;
			usedAt?: string;
		};
		usedAt?: string;
	} | null>(null);
	const [manualCode, setManualCode] = useState("");
	const [scanProcessing, setScanProcessing] = useState(false);
	const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
	const scannerRef = useRef<Html5Qrcode | null>(null);
	const lastScannedRef = useRef<string>("");
	const facingModeRef = useRef<"environment" | "user">("environment");

	// Fetch event ID from slug
	useEffect(() => {
		const fetchEvent = async () => {
			try {
				const res = await api.get(`/events/${eventSlug}`);
				setEventId(res.data.id);
			} catch {
				// Try direct ID
				if (eventSlug) setEventId(eventSlug);
			}
		};
		if (eventSlug) fetchEvent();
	}, [eventSlug]);

	// Fetch ticket config
	useEffect(() => {
		const fetchConfig = async () => {
			if (!eventId) return;
			try {
				setLoading(true);
				const res = await api.get(`/tickets/admin/event/${eventId}/config`);
				const { event, ...configData } = res.data;
				setConfig(configData);
				if (event) {
					// Auto-fill sales dates from event schedule if not set
					if (!configData.salesStartDate && event.registrationDeadline) {
						configData.salesStartDate = event.registrationDeadline;
					}
					if (!configData.salesEndDate && event.startDate) {
						// H+1 dari acara dimulai
						const hPlusOne = new Date(event.startDate);
						hPlusOne.setDate(hPlusOne.getDate() + 1);
						configData.salesEndDate = hPlusOne.toISOString();
					}
					setConfig(configData);
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

	// Fetch purchase counts on mount (for badge)
	useEffect(() => {
		if (eventId) fetchPurchases();
	}, [eventId]);

	// Cleanup scanner on unmount or tab change
	useEffect(() => {
		return () => {
			stopScanner();
		};
	}, [activeTab]);

	const stopScanner = useCallback(async () => {
		if (scannerRef.current) {
			try {
				const state = scannerRef.current.getState();
				if (state === 2) { // SCANNING
					await scannerRef.current.stop();
				}
				scannerRef.current.clear();
			} catch {
				// ignore cleanup errors
			}
			scannerRef.current = null;
		}
		setScanning(false);
	}, []);

	const startScanner = useCallback(async (mode?: "environment" | "user") => {
		const selectedMode = mode || facingModeRef.current;
		try {
			const scannerId = "ticket-qr-scanner";
			const scannerEl = document.getElementById(scannerId);
			if (!scannerEl) return;

			const html5QrCode = new Html5Qrcode(scannerId);
			scannerRef.current = html5QrCode;

			await html5QrCode.start(
				{ facingMode: selectedMode },
				{ fps: 10, qrbox: { width: 250, height: 250 } },
				async (decodedText) => {
					// Prevent duplicate scans
					if (lastScannedRef.current === decodedText) return;
					lastScannedRef.current = decodedText;
					await handleScanTicket(decodedText);
					// Reset after 3 seconds to allow re-scan
					setTimeout(() => {
						lastScannedRef.current = "";
					}, 3000);
				},
				() => {} // ignore scan failures
			);

			setScanning(true);
		} catch (err) {
			console.error("Failed to start scanner:", err);
			Swal.fire("Error", "Gagal membuka kamera. Pastikan izin kamera diaktifkan.", "error");
		}
	}, []);

	const switchCamera = useCallback(async () => {
		const newMode = facingModeRef.current === "environment" ? "user" : "environment";
		facingModeRef.current = newMode;
		setFacingMode(newMode);
		await stopScanner();
		// Small delay to let the DOM re-render after stopping
		setTimeout(() => startScanner(newMode), 300);
	}, [stopScanner, startScanner]);

	const handleScanTicket = async (ticketCode: string) => {
		if (!ticketCode.trim() || scanProcessing) return;
		try {
			setScanProcessing(true);
			const res = await api.post(`/tickets/admin/scan/${ticketCode.trim()}`);
			setScanResult(res.data);
			await stopScanner();
		} catch (err: any) {
			setScanResult(err.response?.data || { valid: false, error: "Gagal memindai tiket" });
			await stopScanner();
		} finally {
			setScanProcessing(false);
		}
	};

	const fetchPurchases = async () => {
		if (!eventId) return;
		try {
			setPurchasesLoading(true);
			const params: any = { page, limit: 20 };
			if (search) params.search = search;
			if (statusFilter) params.status = statusFilter;

			const res = await api.get(`/tickets/admin/event/${eventId}/purchases`, { params });
			setPurchases(res.data.data);
			setTotalPages(res.data.totalPages);
			setTotalPurchases(res.data.total);
			if (res.data.paidUsedCount !== undefined) setPaidUsedCount(res.data.paidUsedCount);
		} catch {
			console.error("Error fetching purchases");
		} finally {
			setPurchasesLoading(false);
		}
	};

	const handleSyncSoldCount = async () => {
		try {
			setSyncing(true);
			const res = await api.post(`/tickets/admin/event/${eventId}/sync-sold-count`);
			setConfig((prev) => ({ ...prev, soldCount: res.data.config.soldCount }));
			Swal.fire({
				title: "Sinkronisasi Berhasil!",
				text: res.data.message,
				icon: "success",
				timer: 2000,
				showConfirmButton: false,
			});
		} catch (err: any) {
			Swal.fire("Gagal", err.response?.data?.error || "Gagal sinkronisasi", "error");
		} finally {
			setSyncing(false);
		}
	};

	const handleToggleTicketing = async () => {
		const isOpen = config.enabled;
		const result = await Swal.fire({
			icon: isOpen ? "warning" : "question",
			title: isOpen ? "Tutup Penjualan Tiket?" : "Buka Penjualan Tiket?",
			text: isOpen
				? "Penjualan tiket akan ditutup untuk publik."
				: "Penjualan tiket akan dibuka untuk publik.",
			showCancelButton: true,
			confirmButtonText: isOpen ? "Ya, Tutup" : "Ya, Buka",
			cancelButtonText: "Batal",
			confirmButtonColor: isOpen ? "#dc2626" : "#16a34a",
		});

		if (!result.isConfirmed) return;

		try {
			setTogglingTicketing(true);
			const res = await api.post(`/tickets/admin/event/${eventId}/toggle-ticketing`);
			setConfig((prev) => ({ ...prev, enabled: res.data.enabled }));

			Swal.fire({
				icon: "success",
				title: res.data.enabled ? "Penjualan Dibuka" : "Penjualan Ditutup",
				text: res.data.enabled
					? "Tiket sekarang tersedia untuk publik."
					: "Penjualan tiket telah ditutup.",
				timer: 2000,
				showConfirmButton: false,
			});
		} catch (err: any) {
			Swal.fire("Error", err.response?.data?.error || "Gagal mengubah status ticketing", "error");
		} finally {
			setTogglingTicketing(false);
		}
	};

	const handleSaveConfig = async () => {
		try {
			setSaving(true);
			const payload: any = {
				enabled: config.enabled,
				price: Number(config.price),
				quota: Number(config.quota),
				description: config.description || undefined,
			};
			if (config.salesStartDate) payload.salesStartDate = config.salesStartDate;
			if (config.salesEndDate) payload.salesEndDate = config.salesEndDate;

			const res = await api.put(`/tickets/admin/event/${eventId}/config`, payload);
			setConfig(res.data);

			Swal.fire({
				title: "Berhasil!",
				text: "Konfigurasi e-ticketing berhasil disimpan",
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

	const handleUpdatePurchaseStatus = async (purchaseId: string, status: string) => {
		const labels: Record<string, string> = {
			USED: "Tandai sebagai Sudah Digunakan",
			CANCELLED: "Batalkan Tiket",
		};

		const result = await Swal.fire({
			title: labels[status] || `Ubah status ke ${status}?`,
			icon: status === "CANCELLED" ? "warning" : "question",
			showCancelButton: true,
			confirmButtonText: "Ya",
			cancelButtonText: "Batal",
			confirmButtonColor: status === "CANCELLED" ? "#dc2626" : "#16a34a",
		});

		if (!result.isConfirmed) return;

		try {
			await api.patch(`/tickets/admin/purchases/${purchaseId}/status`, { status });
			fetchPurchases();
			// Refresh config for soldCount
			const configRes = await api.get(`/tickets/admin/event/${eventId}/config`);
			setConfig(configRes.data);

			Swal.fire({
				title: "Berhasil!",
				text: "Status tiket berhasil diperbarui",
				icon: "success",
				timer: 1500,
				showConfirmButton: false,
			});
		} catch (err: any) {
			Swal.fire("Error", err.response?.data?.error || "Gagal mengubah status", "error");
		}
	};

	const handleResendTicketEmail = async (purchaseId: string, buyerEmail: string) => {
		const { value: email } = await Swal.fire({
			title: "Kirim Ulang Email Tiket",
			html: `<p class="text-sm text-gray-500 mb-2">Email akan dikirim dengan QR code tiket ke alamat email di bawah. Anda dapat mengubah email tujuan jika email asli tidak valid.</p>`,
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
				const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
				if (!emailRegex.test(value)) return "Format email tidak valid";
				return null;
			},
		});

		if (!email) return;

		try {
			const res = await api.post(`/tickets/admin/resend-email/${purchaseId}`, { email });
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

	const formatDate = (date: string | null) => {
		if (!date) return "-";
		return new Date(date).toLocaleDateString("id-ID", {
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

	const formatDateForInput = (date: string | null) => {
		if (!date) return "";
		return new Date(date).toISOString().slice(0, 16);
	};

	const getStatusBadge = (status: string) => {
		const styles: Record<string, string> = {
			PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
			PAID: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
			USED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
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
			<div className="flex justify-center py-20">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
			</div>
		);
	}

	return (
		<div className="p-6 max-w-6xl mx-auto">
			{/* Header */}
			<div className="flex items-center gap-3 mb-6">
				<TicketIcon className="w-8 h-8 text-red-600" />
				<div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
						E-Ticketing
					</h1>
					<p className="text-sm text-gray-500 dark:text-gray-400">
						Kelola penjualan tiket untuk event ini
					</p>
				</div>
			</div>

			{/* Stats Summary */}
			<div className="flex items-center gap-3 mb-4 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm">
				<span className={`w-3 h-3 rounded-full flex-shrink-0 ${config.enabled ? "bg-green-500" : "bg-red-500"}`} title={config.enabled ? "Aktif" : "Nonaktif"} />
				<span className="hidden sm:inline text-sm font-medium text-gray-700 dark:text-gray-300">
					{config.enabled ? "Aktif" : "Nonaktif"}
				</span>
				<span className="text-gray-300 dark:text-gray-600 hidden sm:inline">|</span>
				<div className="flex items-center gap-1.5 text-sm">
					<span className="text-gray-500 dark:text-gray-400">Terjual</span>
					<span className={`font-semibold ${config.soldCount > config.quota ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
						{config.soldCount}/{config.quota}
					</span>
					{config.soldCount > config.quota && (
						<span className="text-xs text-red-500 font-medium">(melebihi kuota!)</span>
					)}
				</div>
				<span className="text-gray-300 dark:text-gray-600">|</span>
				<div className="flex items-center gap-1.5 text-sm">
					<span className="text-gray-500 dark:text-gray-400 hidden sm:inline">Pendapatan</span>
					<span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(config.soldCount * config.price)}</span>
				</div>
				<div className="ml-auto">
					<button
						onClick={handleSyncSoldCount}
						disabled={syncing}
						title="Sinkronisasi jumlah terjual dengan data aktual"
						className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
					>
						<ArrowPathIcon className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
						<span className="hidden sm:inline">Sinkronisasi</span>
					</button>
				</div>
			</div>

			{/* Toggle Ticketing Button */}
			<div className={`mb-6 rounded-xl p-4 border ${config.enabled ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700"}`}>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						{config.enabled ? (
							<LockOpenIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
						) : (
							<LockClosedIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
						)}
						<div>
							<p className={`font-medium text-sm ${config.enabled ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
								{config.enabled ? "Penjualan Tiket Dibuka" : "Penjualan Tiket Ditutup"}
							</p>
							<p className="text-xs text-gray-500 dark:text-gray-400">
								{config.enabled ? "Publik dapat membeli tiket saat ini" : "Publik tidak dapat membeli tiket saat ini"}
							</p>
						</div>
					</div>
					<button
						onClick={handleToggleTicketing}
						disabled={togglingTicketing}
						className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
							config.enabled
								? "bg-red-600 text-white hover:bg-red-700"
								: "bg-green-600 text-white hover:bg-green-700"
						}`}
					>
						{togglingTicketing
							? "Memproses..."
							: config.enabled
							? "Tutup Penjualan"
							: "Buka Penjualan"}
					</button>
				</div>
			</div>

			{/* Tabs */}
			<div className="flex gap-2 mb-6">
				<button
					onClick={() => {
						setActiveTab("scan");
						setScanResult(null);
					}}
					className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${
						activeTab === "scan"
							? "bg-red-600 text-white shadow-sm"
							: "bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm"
					}`}
				>
					<QrCodeIcon className="w-5 h-5" />
					<span>Scan</span>
				</button>
				<button
					onClick={() => setActiveTab("config")}
					className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${
						activeTab === "config"
							? "bg-red-600 text-white shadow-sm"
							: "bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm"
					}`}
				>
					<Cog6ToothIcon className="w-5 h-5" />
					<span className="hidden sm:inline">Pengaturan</span>
				</button>
				<button
					onClick={() => setActiveTab("purchases")}
					className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${
						activeTab === "purchases"
							? "bg-red-600 text-white shadow-sm"
							: "bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm"
					}`}
				>
					<ClipboardDocumentListIcon className="w-5 h-5" />
					<span className="hidden sm:inline">Pembelian</span>
					<span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold px-1.5 py-0.5 rounded-full">
						{paidUsedCount}
					</span>
				</button>
			</div>

			{/* Config Tab */}
			{activeTab === "config" && (
				<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm p-6">
					<div className="space-y-6">
						{/* Enable Toggle */}
						<div className="flex items-center justify-between">
							<div>
								<label className="text-sm font-medium text-gray-900 dark:text-white">
									Aktifkan E-Ticketing
								</label>
								<p className="text-xs text-gray-500 dark:text-gray-400">
									Event akan muncul di halaman e-ticketing publik
								</p>
							</div>
							<button
								onClick={() => setConfig({ ...config, enabled: !config.enabled })}
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
									config.enabled ? "bg-red-600" : "bg-gray-300 dark:bg-gray-600"
								}`}
							>
								<span
									className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
										config.enabled ? "translate-x-6" : "translate-x-1"
									}`}
								/>
							</button>
						</div>

						{/* Price */}
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
								Harga Tiket (Rp)
							</label>
							<input
								type="number"
								min="0"
								value={config.price}
								onChange={(e) => setConfig({ ...config, price: Number(e.target.value) })}
								className="w-full px-4 py-2.5 bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
								placeholder="0 untuk tiket gratis"
							/>
							<p className="text-xs text-gray-400 mt-1">
								Isi 0 untuk tiket gratis
							</p>
						</div>

						{/* Quota */}
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
								Kuota Tiket
							</label>
							<input
								type="number"
								min="1"
								value={config.quota}
								onChange={(e) => setConfig({ ...config, quota: Number(e.target.value) })}
								className="w-full px-4 py-2.5 bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
							/>
						</div>

						{/* Description */}
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
								Deskripsi Tiket
							</label>
							<textarea
								rows={3}
								value={config.description || ""}
								onChange={(e) => setConfig({ ...config, description: e.target.value })}
								className="w-full px-4 py-2.5 bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
								placeholder="Informasi tambahan tentang tiket..."
							/>
						</div>

						{/* Sales Period */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									Mulai Penjualan
								</label>
								<input
									type="datetime-local"
									value={formatDateForInput(config.salesStartDate)}
									onChange={(e) =>
										setConfig({
											...config,
											salesStartDate: e.target.value ? new Date(e.target.value).toISOString() : null,
										})
									}
									className="w-full px-4 py-2.5 bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
								/>
								<p className="text-xs text-gray-400 mt-1">
									Otomatis diisi dari waktu buka pendaftaran event
								</p>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									Akhir Penjualan
								</label>
								<input
									type="datetime-local"
									value={formatDateForInput(config.salesEndDate)}
									onChange={(e) =>
										setConfig({
											...config,
											salesEndDate: e.target.value ? new Date(e.target.value).toISOString() : null,
										})
									}
									className="w-full px-4 py-2.5 bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
								/>
								<p className="text-xs text-gray-400 mt-1">
									Otomatis diisi H+1 dari tanggal acara dimulai
								</p>
							</div>
						</div>

						{/* Save Button */}
						<div className="pt-4">
							<button
								onClick={handleSaveConfig}
								disabled={saving}
								className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
							>
								{saving ? "Menyimpan..." : "Simpan Konfigurasi"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Purchases Tab */}
			{activeTab === "purchases" && (
				<div>
					{/* Filters */}
					<div className="flex flex-col sm:flex-row gap-3 mb-4">
						<div className="relative flex-1">
							<MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
							<input
								type="text"
								placeholder="Cari nama, email, kode tiket..."
								value={search}
								onChange={(e) => {
									setSearch(e.target.value);
									setPage(1);
								}}
								className="w-full pl-10 pr-4 py-2.5 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
							/>
						</div>
						<select
							value={statusFilter}
							onChange={(e) => {
								setStatusFilter(e.target.value);
								setPage(1);
							}}
							className="px-4 py-2.5 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
						>
							<option value="">Semua Status</option>
							<option value="PENDING">Pending</option>
							<option value="PAID">Sudah Bayar</option>
							<option value="USED">Sudah Digunakan</option>
							<option value="CANCELLED">Dibatalkan</option>
							<option value="EXPIRED">Kedaluwarsa</option>
						</select>
					</div>

					{/* Purchases Table */}
					{purchasesLoading ? (
						<div className="flex justify-center py-12">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
						</div>
					) : purchases.length === 0 ? (
						<div className="text-center py-12 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl">
							<TicketIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
							<p className="text-gray-500 dark:text-gray-400">Belum ada pembelian tiket</p>
						</div>
					) : (
						<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm overflow-hidden">
							<div className="overflow-x-auto">
								<table className="w-full">
									<thead className="bg-gray-50 dark:bg-gray-900/50">
										<tr>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
												Kode Tiket
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
												Pembeli
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
												Jumlah
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
												Total
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
												Status
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
												Tanggal
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
												Aksi
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-100 dark:divide-gray-700">
										{purchases.map((purchase) => (
											<tr key={purchase.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
												<td className="px-4 py-3">
													<span className="font-mono text-sm text-red-600 dark:text-red-400 font-medium">
														{purchase.ticketCode}
													</span>
												</td>
												<td className="px-4 py-3">
													<div>
														<p className="text-sm font-medium text-gray-900 dark:text-white">
															{purchase.buyerName}
														</p>
														<p className="text-xs text-gray-500 dark:text-gray-400">
															{purchase.buyerEmail}
														</p>
													</div>
												</td>
												<td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
													{purchase.quantity}
												</td>
												<td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
													{purchase.totalAmount === 0 ? "GRATIS" : formatCurrency(purchase.totalAmount)}
												</td>
												<td className="px-4 py-3">
													<div className="flex items-center gap-2">
														{getStatusBadge(purchase.status)}
													</div>
												</td>
												<td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
													{formatDate(purchase.createdAt || "")}
												</td>
												<td className="px-4 py-3">
													<div className="flex items-center gap-1">
														{(purchase.status === "PAID" || purchase.status === "USED") && (
															<button
																onClick={() => handleResendTicketEmail(purchase.id, purchase.buyerEmail)}
																title="Kirim Ulang Email"
																className="p-1.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg"
															>
																<EnvelopeIcon className="w-5 h-5" />
															</button>
														)}
														{(purchase.status === "PAID") && (
															<>
																<button
																	onClick={() => handleUpdatePurchaseStatus(purchase.id, "USED")}
																	title="Tandai Digunakan"
																	className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
																>
																	<ClockIcon className="w-5 h-5" />
																</button>
																<button
																	onClick={() => handleUpdatePurchaseStatus(purchase.id, "CANCELLED")}
																	title="Batalkan"
																	className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
																>
																	<XCircleIcon className="w-5 h-5" />
																</button>
															</>
														)}
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>

							{/* Pagination */}
							{totalPages > 1 && (
								<div className="flex justify-center gap-2 p-4 border-t dark:border-gray-700">
									{Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
										<button
											key={p}
											onClick={() => setPage(p)}
											className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
												p === page
													? "bg-red-600 text-white"
													: "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
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

			{/* Scan Tab */}
			{activeTab === "scan" && (
				<div className="max-w-lg mx-auto">
					{/* Scanner Area - hidden when result is shown */}
					{!scanResult && !scanProcessing && (
					<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm overflow-hidden mb-6">
						<div className="p-4">
							<div className="flex items-center justify-between mb-4">
								<h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
									<VideoCameraIcon className="w-5 h-5" />
									Kamera Scanner
								</h3>
								<div className="flex items-center gap-2">
									{scanning && (
										<button
											onClick={switchCamera}
											className="px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
											title={facingMode === "environment" ? "Ganti ke Kamera Depan" : "Ganti ke Kamera Belakang"}
										>
											<ArrowPathIcon className="w-4 h-4" />
											<span className="hidden sm:inline">{facingMode === "environment" ? "Depan" : "Belakang"}</span>
										</button>
									)}
									<button
										onClick={scanning ? stopScanner : () => startScanner()}
										className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
											scanning
												? "bg-red-600 hover:bg-red-700 text-white"
												: "bg-green-600 hover:bg-green-700 text-white"
										}`}
									>
										{scanning ? "Stop Kamera" : "Mulai Scan"}
									</button>
								</div>
							</div>

							{/* QR Scanner viewport */}
							<div
								id="ticket-qr-scanner"
								className="w-full rounded-lg overflow-hidden bg-gray-900"
								style={{ minHeight: scanning ? undefined : "0px" }}
							/>

							{!scanning && (
								<div className="flex items-center justify-center bg-gray-100 dark:bg-gray-900/50 rounded-lg" style={{ minHeight: "200px" }}>
									<div className="text-center text-gray-400">
										<QrCodeIcon className="w-12 h-12 mx-auto mb-2" />
										<p className="text-sm">Klik "Mulai Scan" untuk membuka kamera</p>
									</div>
								</div>
							)}
						</div>

						{/* Manual Input */}
						<div className="px-4 pb-4">
							<p className="text-xs text-gray-400 text-center my-3">atau masukkan kode tiket manual</p>
							<div className="flex gap-2">
								<input
									type="text"
									value={manualCode}
									onChange={(e) => setManualCode(e.target.value.toUpperCase())}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											handleScanTicket(manualCode);
											setManualCode("");
										}
									}}
									className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
									placeholder="TKT-XXXXXXX-XXXXXXXX"
								/>
								<button
									onClick={() => {
										handleScanTicket(manualCode);
										setManualCode("");
									}}
									disabled={!manualCode.trim() || scanProcessing}
									className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
								>
									Cek
								</button>
							</div>
						</div>
					</div>
					)}

					{/* Processing indicator */}
					{scanProcessing && (
						<div className="flex justify-center py-4">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
						</div>
					)}

					{/* Scan Result */}
					{scanResult && !scanProcessing && (
						<div className={`rounded-xl shadow-sm overflow-hidden ${
							scanResult.valid
								? "bg-green-50 dark:bg-green-900/20 border-2 border-green-500"
								: "bg-red-50 dark:bg-red-900/20 border-2 border-red-500"
						}`}>
							<div className="p-5">
								{/* Status Icon */}
								<div className="flex items-center gap-3 mb-4">
									{scanResult.valid ? (
										<div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
											<CheckCircleIcon className="w-7 h-7 text-green-600" />
										</div>
									) : (
										<div className="w-12 h-12 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
											{scanResult.ticket?.status === "USED" ? (
												<ExclamationTriangleIcon className="w-7 h-7 text-red-600" />
											) : (
												<XCircleIcon className="w-7 h-7 text-red-600" />
											)}
										</div>
									)}
									<div>
										<h3 className={`text-lg font-bold ${
											scanResult.valid
												? "text-green-700 dark:text-green-400"
												: "text-red-700 dark:text-red-400"
										}`}>
											{scanResult.valid ? "Tiket Valid" : "Tiket Tidak Valid"}
										</h3>
										<p className={`text-sm ${
											scanResult.valid
												? "text-green-600 dark:text-green-500"
												: "text-red-600 dark:text-red-500"
										}`}>
											{scanResult.valid ? scanResult.message : scanResult.error}
										</p>
									</div>
								</div>

								{/* Ticket Details */}
								{scanResult.ticket && (
									<div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-4 space-y-2 text-sm">
										<div className="flex justify-between">
											<span className="text-gray-500 dark:text-gray-400">Kode Tiket</span>
											<span className="font-mono font-bold text-gray-900 dark:text-white">
												{scanResult.ticket.ticketCode}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-gray-500 dark:text-gray-400">Nama</span>
											<span className="font-medium text-gray-900 dark:text-white">
												{scanResult.ticket.buyerName}
											</span>
										</div>
										{scanResult.ticket.buyerEmail && (
											<div className="flex justify-between">
												<span className="text-gray-500 dark:text-gray-400">Email</span>
												<span className="text-gray-900 dark:text-white">
													{scanResult.ticket.buyerEmail}
												</span>
											</div>
										)}
										{scanResult.ticket.eventTitle && (
											<div className="flex justify-between">
												<span className="text-gray-500 dark:text-gray-400">Event</span>
												<span className="font-medium text-gray-900 dark:text-white text-right max-w-[60%]">
													{scanResult.ticket.eventTitle}
												</span>
											</div>
										)}
										{scanResult.ticket.quantity && (
											<div className="flex justify-between">
												<span className="text-gray-500 dark:text-gray-400">Jumlah</span>
												<span className="text-gray-900 dark:text-white">
													{scanResult.ticket.quantity} tiket
												</span>
											</div>
										)}
										<div className="flex justify-between">
											<span className="text-gray-500 dark:text-gray-400">Status</span>
											{getStatusBadge(scanResult.ticket.status)}
										</div>
										{(scanResult.ticket.usedAt || scanResult.usedAt) && (
											<div className="flex justify-between">
												<span className="text-gray-500 dark:text-gray-400">Digunakan</span>
												<span className="text-gray-900 dark:text-white">
													{formatDate(scanResult.ticket.usedAt || scanResult.usedAt || null)}
												</span>
											</div>
										)}
									</div>
								)}

								{/* Scan Again Button */}
								<button
									onClick={() => {
										setScanResult(null);
										setTimeout(() => startScanner(facingModeRef.current), 300);
									}}
									className="w-full mt-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
								>
									Scan Tiket Lain
								</button>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default EventTicketing;
