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
	ChartBarIcon,
	UserGroupIcon,
	PlusIcon,
	TrashIcon,
	PhotoIcon,
	PencilSquareIcon,
} from "@heroicons/react/24/outline";
import Swal from "sweetalert2";
import { Html5Qrcode } from "html5-qrcode";
import { api } from "../../utils/api";
import { GMAIL_ONLY_EMAIL_MESSAGE, isGmailEmail } from "../../utils/emailPolicy";
import { config as appConfig } from "../../utils/config";
import { EventTicketConfig, TicketPurchase, TicketTeam } from "../../types/ticket";

const TICKET_REVENUE_SHARE_TIERS = ["TICKETING", "TICKETING_VOTING", "BRONZE", "GOLD"];

const EventTicketing: React.FC = () => {
	const { eventSlug } = useParams();
	const [activeTab, setActiveTab] = useState<"dashboard" | "teams" | "config" | "purchases" | "scan">("dashboard");
	const [loading, setLoading] = useState(true);
	const [eventId, setEventId] = useState<string>("");

	// Config state
	const [config, setConfig] = useState<EventTicketConfig>({
		id: "",
		eventId: "",
		enabled: false,
		ticketTeamSelectionEnabled: true,
		price: 0,
		quota: 100,
		soldCount: 0,
		description: "",
		salesStartDate: null,
		salesEndDate: null,
	});
	const [saving, setSaving] = useState(false);
	const [togglingTicketing, setTogglingTicketing] = useState(false);
	const [ticketingShareLocked, setTicketingShareLocked] = useState(false);

	// Dashboard state
	const [dashboard, setDashboard] = useState<{
		summary: { totalRevenue: number; totalTickets: number; totalTransactions: number; checkedIn: number; quota: number; price: number; remaining: number };
		breakdown: { paid: { count: number; tickets: number; revenue: number }; used: { count: number; tickets: number; revenue: number }; cancelled: number; expired: number; pending: number };
		dailySales: { date: string; count: number; revenue: number; tickets?: number }[];
		recentTransactions: { id: string; buyerName: string; buyerEmail: string; quantity: number; totalAmount: number; status: string; paidAt: string; ticketCode: string }[];
		teamStandings: TicketTeam[];
	} | null>(null);
	const [dashboardLoading, setDashboardLoading] = useState(false);

	// Manual ticket teams state
	const [ticketTeams, setTicketTeams] = useState<TicketTeam[]>([]);
	const [teamsLoading, setTeamsLoading] = useState(false);
	const [addingTeam, setAddingTeam] = useState(false);
	const [teamForm, setTeamForm] = useState({ teamName: "", schoolName: "" });
	const [teamLogoFile, setTeamLogoFile] = useState<File | null>(null);
	const [teamLogoPreview, setTeamLogoPreview] = useState<string | null>(null);
	const teamLogoInputRef = useRef<HTMLInputElement>(null);

	// Purchases state
	const [purchases, setPurchases] = useState<TicketPurchase[]>([]);
	const [purchasesLoading, setPurchasesLoading] = useState(false);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [paidUsedCount, setPaidUsedCount] = useState(0);

	// Scanner state
	const [scanning, setScanning] = useState(false);
	type ScanResult = {
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
			ticketTeam?: TicketTeam | null;
		};
		usedAt?: string;
	};
	const [scanResult, setScanResult] = useState<ScanResult | null>(null);
	const [manualCode, setManualCode] = useState("");
	const [scanProcessing, setScanProcessing] = useState(false);
	const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
	// Continuous-scan support
	const [continuousMode, setContinuousMode] = useState(true);
	const [scanHistory, setScanHistory] = useState<Array<ScanResult & { at: number; code: string }>>([]);
	const [scanStats, setScanStats] = useState({ valid: 0, invalid: 0 });
	const scannerRef = useRef<Html5Qrcode | null>(null);
	const lastScannedRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
	const facingModeRef = useRef<"environment" | "user">("environment");
	// Local cache: codes we've already validated as USED in this session.
	// Lets us reject obvious duplicates instantly without a server round-trip
	// (huge win during a network blip on busy gates).
	const usedCodesRef = useRef<Set<string>>(new Set());
	const audioCtxRef = useRef<AudioContext | null>(null);

	// Web Audio beep — different tones for valid vs invalid.
	const playBeep = useCallback((kind: "ok" | "err") => {
		try {
			if (!audioCtxRef.current) {
				const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
				if (!Ctx) return;
				audioCtxRef.current = new Ctx();
			}
			const ctx = audioCtxRef.current!;
			if (ctx.state === "suspended") ctx.resume();
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = "square";
			osc.frequency.value = kind === "ok" ? 880 : 220;
			gain.gain.setValueAtTime(0.0001, ctx.currentTime);
			gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.01);
			gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (kind === "ok" ? 0.12 : 0.30));
			osc.connect(gain).connect(ctx.destination);
			osc.start();
			osc.stop(ctx.currentTime + (kind === "ok" ? 0.13 : 0.32));
		} catch {
			// ignore — audio failure must never block scanning
		}
		// Mobile haptic feedback
		try { navigator.vibrate?.(kind === "ok" ? 80 : [120, 60, 120]); } catch {}
	}, []);

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
					setTicketingShareLocked(
						TICKET_REVENUE_SHARE_TIERS.includes(event.packageTier) &&
						(event.platformSharePercent === null || event.platformSharePercent === undefined)
					);
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

	// Fetch dashboard
	useEffect(() => {
		if (activeTab === "dashboard" && eventId) {
			fetchDashboard();
		}
	}, [activeTab, eventId]);

	const fetchDashboard = async () => {
		if (!eventId) return;
		try {
			setDashboardLoading(true);
			const res = await api.get(`/tickets/admin/event/${eventId}/dashboard`);
			setDashboard(res.data);
		} catch {
			console.error("Error fetching dashboard");
		} finally {
			setDashboardLoading(false);
		}
	};

	const fetchTicketTeams = async () => {
		if (!eventId) return;
		try {
			setTeamsLoading(true);
			const res = await api.get(`/tickets/admin/event/${eventId}/teams`);
			setTicketTeams(res.data);
		} catch {
			console.error("Error fetching ticket teams");
		} finally {
			setTeamsLoading(false);
		}
	};

	useEffect(() => {
		if ((activeTab === "teams" || activeTab === "dashboard" || activeTab === "config" || activeTab === "purchases") && eventId) {
			fetchTicketTeams();
		}
	}, [activeTab, eventId]);

	const handleLogoChange = (file: File | null) => {
		if (teamLogoPreview) URL.revokeObjectURL(teamLogoPreview);
		setTeamLogoFile(file);
		setTeamLogoPreview(file ? URL.createObjectURL(file) : null);
	};

	const resetTeamForm = () => {
		setTeamForm({ teamName: "", schoolName: "" });
		handleLogoChange(null);
		if (teamLogoInputRef.current) teamLogoInputRef.current.value = "";
	};

	const handleAddTicketTeam = async () => {
		if (!teamForm.teamName.trim()) {
			Swal.fire("Error", "Nama pasukan/sekolah wajib diisi", "error");
			return;
		}

		try {
			setAddingTeam(true);
			const formData = new FormData();
			formData.append("teamName", teamForm.teamName.trim());
			if (teamForm.schoolName.trim()) formData.append("schoolName", teamForm.schoolName.trim());
			if (teamLogoFile) formData.append("ticketTeamLogo", teamLogoFile);

			const res = await api.post(`/tickets/admin/event/${eventId}/teams`, formData, {
				headers: { "Content-Type": "multipart/form-data" },
			});
			setTicketTeams((prev) => [...prev, res.data]);
			resetTeamForm();
			Swal.fire({ title: "Berhasil!", text: "Pasukan ticketing berhasil ditambahkan", icon: "success", timer: 1500, showConfirmButton: false });
		} catch (err: any) {
			Swal.fire("Error", err.response?.data?.error || "Gagal menambahkan pasukan", "error");
		} finally {
			setAddingTeam(false);
		}
	};

	const handleDeleteTicketTeam = async (team: TicketTeam) => {
		const result = await Swal.fire({
			title: "Hapus Pasukan?",
			text: team.viewerCount > 0 ? "Pasukan yang sudah dipilih penonton tidak bisa dihapus." : `Hapus ${team.teamName}?`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#dc2626",
			confirmButtonText: "Hapus",
			cancelButtonText: "Batal",
		});

		if (!result.isConfirmed) return;

		try {
			await api.delete(`/tickets/admin/teams/${team.id}`);
			setTicketTeams((prev) => prev.filter((item) => item.id !== team.id));
			Swal.fire({ title: "Dihapus!", icon: "success", timer: 1200, showConfirmButton: false });
		} catch (err: any) {
			Swal.fire("Error", err.response?.data?.error || "Gagal menghapus pasukan", "error");
		}
	};

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
					// Short re-fire suppression: same QR within 1.5s = ignore (prevents
					// camera firing the callback multiple times for one physical ticket).
					const now = Date.now();
					if (lastScannedRef.current.code === decodedText && now - lastScannedRef.current.at < 1500) return;
					lastScannedRef.current = { code: decodedText, at: now };
					await handleScanTicket(decodedText);
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

	const handleScanTicket = useCallback(async (ticketCode: string) => {
		const code = ticketCode.trim();
		if (!code || scanProcessing) return;

		// Local instant-reject: code already used in this session
		if (usedCodesRef.current.has(code)) {
			const localResult: ScanResult = {
				valid: false,
				error: "Tiket sudah digunakan (cache lokal)",
				ticket: { ticketCode: code, buyerName: "—", status: "USED" },
			};
			setScanResult(localResult);
			setScanStats((s) => ({ ...s, invalid: s.invalid + 1 }));
			setScanHistory((h) => [{ ...localResult, at: Date.now(), code }, ...h].slice(0, 10));
			playBeep("err");
			return;
		}

		try {
			setScanProcessing(true);
			const res = await api.post(`/tickets/admin/scan/${code}`, eventId ? { eventId } : {});
			const data: ScanResult = res.data;
			setScanResult(data);
			if (data.valid) {
				usedCodesRef.current.add(code);
				setScanStats((s) => ({ ...s, valid: s.valid + 1 }));
				playBeep("ok");
			} else {
				setScanStats((s) => ({ ...s, invalid: s.invalid + 1 }));
				playBeep("err");
			}
			setScanHistory((h) => [{ ...data, at: Date.now(), code }, ...h].slice(0, 10));
			if (!continuousMode) {
				await stopScanner();
			}
		} catch (err: any) {
			const data: ScanResult = err.response?.data || { valid: false, error: "Gagal memindai tiket" };
			setScanResult(data);
			setScanStats((s) => ({ ...s, invalid: s.invalid + 1 }));
			setScanHistory((h) => [{ ...data, at: Date.now(), code }, ...h].slice(0, 10));
			playBeep("err");
			if (!continuousMode) {
				await stopScanner();
			}
		} finally {
			setScanProcessing(false);
		}
	}, [scanProcessing, continuousMode, eventId, playBeep, stopScanner]);

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
			if (res.data.paidUsedCount !== undefined) setPaidUsedCount(res.data.paidUsedCount);
		} catch {
			console.error("Error fetching purchases");
		} finally {
			setPurchasesLoading(false);
		}
	};

	const handleToggleTicketing = async () => {
		const isOpen = config.enabled;
		if (!isOpen && ticketingShareLocked) {
			Swal.fire(
				"Menunggu Admin",
				"Penjualan tiket belum bisa dibuka. Hubungi admin untuk negosiasi dan pengaturan persentase bagi hasil terlebih dahulu.",
				"info"
			);
			return;
		}
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

	const handleToggleTicketTeamSelectionMode = async () => {
		const nextValue = !config.ticketTeamSelectionEnabled;
		try {
			setSaving(true);
			const payload: any = {
				enabled: config.enabled,
				ticketTeamSelectionEnabled: nextValue,
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
				text: nextValue
					? "Mode pilih pasukan diaktifkan. Penonton wajib memilih pasukan saat membeli tiket."
					: "Mode pilih pasukan dinonaktifkan. Penonton tetap bisa membeli tiket tanpa memilih pasukan.",
				icon: "success",
				timer: 1600,
				showConfirmButton: false,
			});
		} catch (err: any) {
			Swal.fire("Error", err.response?.data?.error || "Gagal mengubah mode pilih pasukan", "error");
		} finally {
			setSaving(false);
		}
	};

	const handleSaveConfig = async () => {
		try {
			if (config.enabled && ticketingShareLocked) {
				Swal.fire(
					"Menunggu Admin",
					"Nonaktifkan E-Ticketing terlebih dahulu. Fitur tiket baru bisa dibuka setelah admin mengatur persentase bagi hasil.",
					"info"
				);
				return;
			}
			setSaving(true);
			const payload: any = {
				enabled: config.enabled,
				ticketTeamSelectionEnabled: config.ticketTeamSelectionEnabled,
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
				if (!isGmailEmail(value)) return GMAIL_ONLY_EMAIL_MESSAGE;
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

	const handleEditPurchaseTeams = async (purchase: TicketPurchase) => {
		if (purchase.status === "CANCELLED" || purchase.status === "EXPIRED") {
			Swal.fire("Tidak Bisa Diubah", "Tiket dibatalkan atau kedaluwarsa tidak bisa diubah pilihan pasukannya.", "info");
			return;
		}

		let teams = ticketTeams;
		if (teams.length === 0 && eventId) {
			try {
				const res = await api.get(`/tickets/admin/event/${eventId}/teams`);
				teams = res.data || [];
				setTicketTeams(teams);
			} catch {
				teams = [];
			}
		}

		if (teams.length === 0) {
			Swal.fire("Belum Ada Pasukan", "Tambahkan pasukan ticketing terlebih dahulu sebelum mengedit pilihan pembelian.", "warning");
			return;
		}

		const existingAttendees = purchase.attendees || [];
		const rows = existingAttendees.length > 0
			? existingAttendees.map((att, idx) => ({
				attendeeId: att.id,
				label: att.attendeeName || `Tiket #${idx + 1}`,
				subtitle: att.ticketCode || att.attendeeEmail || purchase.ticketCode,
				ticketTeamId: att.ticketTeamId || "",
			}))
			: Array.from({ length: Math.max(1, purchase.quantity || 1) }, (_, idx) => ({
				attendeeId: "",
				label: purchase.quantity > 1 ? `${purchase.buyerName} #${idx + 1}` : purchase.buyerName,
				subtitle: idx === 0 ? purchase.ticketCode : `Tiket legacy #${idx + 1}`,
				ticketTeamId: "",
			}));

		const buildOptions = (selectedTeamId: string) => {
			return [
				`<option value="">Pilih pasukan</option>`,
				...teams.map((team) => {
					const label = team.schoolName ? `${team.teamName} - ${team.schoolName}` : team.teamName;
					const selected = selectedTeamId === team.id ? " selected" : "";
					return `<option value="${escapeHtml(team.id)}"${selected}>${escapeHtml(label)}</option>`;
				}),
			].join("");
		};

		const rowsHtml = rows.map((row, idx) => `
			<div style="margin-bottom:12px;text-align:left;">
				<label style="display:block;font-size:12px;font-weight:700;color:#374151;margin-bottom:4px;">
					Tiket #${idx + 1}
				</label>
				<div style="font-size:12px;color:#6b7280;margin-bottom:6px;">
					${escapeHtml(row.label)} <span style="color:#9ca3af;">${escapeHtml(row.subtitle)}</span>
				</div>
				<select id="ticket-team-assignment-${idx}" class="swal2-select" style="display:block;width:100%;margin:0;height:42px;font-size:14px;">
					${buildOptions(row.ticketTeamId)}
				</select>
			</div>
		`).join("");

		const result = await Swal.fire({
			title: "Edit Pilihan Pasukan",
			html: `
				<div style="text-align:left;">
					<p style="font-size:13px;color:#6b7280;margin:0 0 12px;">
						Tentukan pasukan yang ditonton untuk pembelian ${escapeHtml(purchase.ticketCode)}.
					</p>
					${rowsHtml}
				</div>
			`,
			showCancelButton: true,
			confirmButtonText: "Simpan",
			cancelButtonText: "Batal",
			confirmButtonColor: "#dc2626",
			focusConfirm: false,
			preConfirm: () => {
				const assignments = rows.map((row, idx) => {
					const select = document.getElementById(`ticket-team-assignment-${idx}`) as HTMLSelectElement | null;
					return {
						attendeeId: row.attendeeId,
						ticketTeamId: select?.value || "",
					};
				});

				if (assignments.some((item) => !item.ticketTeamId)) {
					Swal.showValidationMessage("Semua tiket wajib memilih pasukan");
					return false;
				}

				return assignments;
			},
		});

		if (!result.isConfirmed || !result.value) return;

		try {
			const res = await api.patch(`/tickets/admin/purchases/${purchase.id}/attendees`, {
				assignments: result.value,
			});

			setPurchases((prev) => prev.map((item) => item.id === purchase.id ? res.data : item));
			fetchPurchases();
			fetchTicketTeams();

			Swal.fire({
				title: "Berhasil!",
				text: "Pilihan pasukan tiket berhasil diperbarui",
				icon: "success",
				timer: 1500,
				showConfirmButton: false,
			});
		} catch (err: any) {
			Swal.fire("Gagal", err.response?.data?.error || "Gagal mengubah pilihan pasukan tiket", "error");
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

	const getMediaUrl = (url: string | null) => {
		if (!url) return "";
		return url.startsWith("http") ? url : `${appConfig.api.backendUrl}${url}`;
	};

	const escapeHtml = (value: string | number | null | undefined) => {
		return String(value ?? "")
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
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
								{config.enabled
									? "Publik dapat membeli tiket saat ini"
									: ticketingShareLocked
									? "Menunggu admin mengatur persentase bagi hasil tiket"
									: "Publik tidak dapat membeli tiket saat ini"}
							</p>
						</div>
					</div>
					<button
						onClick={handleToggleTicketing}
						disabled={togglingTicketing || (!config.enabled && ticketingShareLocked)}
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
				{ticketingShareLocked && (
					<div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
						Paket ini sudah memiliki fitur tiket, tetapi penjualan tetap ditutup sampai panitia menghubungi admin dan admin mengatur persentase bagi hasil.
					</div>
				)}
			</div>

			{/* Tabs */}
			<div className="flex gap-2 mb-6">
				<button
					onClick={() => setActiveTab("dashboard")}
					className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${
						activeTab === "dashboard"
							? "bg-red-600 text-white shadow-sm"
							: "bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm"
					}`}
				>
					<ChartBarIcon className="w-5 h-5" />
					<span className="hidden sm:inline">Dashboard</span>
				</button>
				<button
					onClick={() => setActiveTab("teams")}
					className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${
						activeTab === "teams"
							? "bg-red-600 text-white shadow-sm"
							: "bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm"
					}`}
				>
					<UserGroupIcon className="w-5 h-5" />
					<span className="hidden sm:inline">Pasukan</span>
					<span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold px-1.5 py-0.5 rounded-full">
						{ticketTeams.length}
					</span>
				</button>
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

			{/* Dashboard Tab */}
			{activeTab === "dashboard" && (
				<div className="space-y-6">
					{dashboardLoading ? (
						<div className="flex justify-center py-12">
							<ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
						</div>
					) : dashboard ? (
						<>
							{/* Summary Cards */}
							<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
								<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm p-5">
									<p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Total Pendapatan</p>
									<p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(dashboard.summary.totalRevenue)}</p>
									<p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{dashboard.summary.totalTransactions} transaksi</p>
								</div>
								<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm p-5">
									<p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Tiket Terjual</p>
									<p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboard.summary.totalTickets}<span className="text-base font-normal text-gray-400">/{dashboard.summary.quota}</span></p>
									<div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
										<div
											className={`h-2 rounded-full transition-all ${dashboard.summary.totalTickets > dashboard.summary.quota ? "bg-red-500" : "bg-green-500"}`}
											style={{ width: `${Math.min(100, (dashboard.summary.totalTickets / (dashboard.summary.quota || 1)) * 100)}%` }}
										/>
									</div>
									<p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Sisa: {dashboard.summary.remaining} tiket</p>
								</div>
								<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm p-5">
									<p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Check-in</p>
									<p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{dashboard.summary.checkedIn}</p>
									<p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
										{dashboard.summary.totalTickets > 0
											? `${Math.round((dashboard.summary.checkedIn / dashboard.summary.totalTickets) * 100)}% dari tiket terjual`
											: "Belum ada tiket"}
									</p>
								</div>
								<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm p-5">
									<p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Harga Tiket</p>
									<p className="text-2xl font-bold text-gray-900 dark:text-white">
										{dashboard.summary.price === 0 ? "GRATIS" : formatCurrency(dashboard.summary.price)}
									</p>
									<p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Per tiket</p>
								</div>
							</div>

							{/* Status Breakdown */}
							<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm p-6">
								<h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Status Pembelian</h3>
								<div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
									<div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
										<p className="text-2xl font-bold text-green-600 dark:text-green-400">{dashboard.breakdown.paid.count}</p>
										<p className="text-xs text-green-600 dark:text-green-400 font-medium">PAID</p>
										<p className="text-[10px] text-gray-400 mt-0.5">{dashboard.breakdown.paid.tickets} tiket</p>
									</div>
									<div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
										<p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{dashboard.breakdown.used.count}</p>
										<p className="text-xs text-blue-600 dark:text-blue-400 font-medium">USED</p>
										<p className="text-[10px] text-gray-400 mt-0.5">{dashboard.breakdown.used.tickets} tiket</p>
									</div>
									<div className="text-center p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
										<p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{dashboard.breakdown.pending}</p>
										<p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">PENDING</p>
									</div>
									<div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
										<p className="text-2xl font-bold text-red-600 dark:text-red-400">{dashboard.breakdown.cancelled}</p>
										<p className="text-xs text-red-600 dark:text-red-400 font-medium">CANCELLED</p>
									</div>
									<div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30">
										<p className="text-2xl font-bold text-gray-500 dark:text-gray-400">{dashboard.breakdown.expired}</p>
										<p className="text-xs text-gray-500 dark:text-gray-400 font-medium">EXPIRED</p>
									</div>
								</div>
							</div>

							{/* Team Standings */}
							<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm p-6">
								<div className="flex items-center justify-between gap-3 mb-4">
									<h3 className="text-sm font-semibold text-gray-900 dark:text-white">Podium Penonton Pasukan</h3>
									<span className="text-xs text-gray-500 dark:text-gray-400">
										{(dashboard.teamStandings || []).reduce((sum, team) => sum + team.viewerCount, 0)} penonton
									</span>
								</div>
								{(dashboard.teamStandings || []).length === 0 ? (
									<div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
										<UserGroupIcon className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
										Tambahkan pasukan agar penonton bisa memilih dukungan saat membeli tiket.
									</div>
								) : (
									<div className="space-y-3">
										{(dashboard.teamStandings || []).map((team, idx) => {
											const maxViewers = Math.max(dashboard.teamStandings?.[0]?.viewerCount || 1, 1);
											const pct = Math.max(4, (team.viewerCount / maxViewers) * 100);
											return (
												<div key={team.id} className="flex items-center gap-3">
													<div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
														idx === 0 ? "bg-yellow-500" : idx === 1 ? "bg-gray-400" : idx === 2 ? "bg-amber-700" : "bg-red-500"
													}`}>
														{idx + 1}
													</div>
													{team.logoUrl ? (
														<img src={getMediaUrl(team.logoUrl)} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
													) : (
														<div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
															<UserGroupIcon className="w-5 h-5 text-gray-400" />
														</div>
													)}
													<div className="flex-1 min-w-0">
														<div className="flex items-center justify-between gap-3 mb-1">
															<div className="min-w-0">
																<p className="text-sm font-medium text-gray-900 dark:text-white truncate">{team.teamName}</p>
																{team.schoolName && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{team.schoolName}</p>}
															</div>
															<span className="text-sm font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">{team.viewerCount} penonton</span>
														</div>
														<div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
															<div className={`h-full rounded-full ${idx === 0 ? "bg-yellow-500" : idx === 1 ? "bg-gray-400" : idx === 2 ? "bg-amber-700" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
														</div>
													</div>
												</div>
											);
										})}
									</div>
								)}
							</div>

							{/* Daily Sales Chart (simple bar) */}
							{dashboard.dailySales.length > 0 && (
								<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm p-6">
									<h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Penjualan 30 Hari Terakhir</h3>
									<div className="space-y-2">
										{(() => {
											const maxRevenue = Math.max(...dashboard.dailySales.map(d => d.revenue), 1);
											return dashboard.dailySales.map((day) => (
												<div key={day.date} className="flex items-center gap-3 text-sm">
													<span className="text-xs text-gray-500 dark:text-gray-400 w-20 flex-shrink-0">
														{new Date(day.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
													</span>
													<div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
														<div
															className="h-full bg-green-500 dark:bg-green-600 rounded-full flex items-center justify-end pr-2 transition-all"
															style={{ width: `${Math.max(5, (day.revenue / maxRevenue) * 100)}%` }}
														>
															{day.revenue > maxRevenue * 0.15 && (
																<span className="text-[10px] text-white font-medium whitespace-nowrap">{formatCurrency(day.revenue)}</span>
															)}
														</div>
													</div>
													<span className="text-xs text-gray-500 dark:text-gray-400 w-24 text-right flex-shrink-0">
														{day.count} trx · {(day as any).tickets || day.count} tiket
													</span>
												</div>
											));
										})()}
									</div>
								</div>
							)}

							{/* Recent Transactions */}
							{dashboard.recentTransactions.length > 0 && (
								<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm p-6">
									<h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Transaksi Terakhir</h3>
									<div className="overflow-x-auto">
										<table className="w-full text-sm">
											<thead>
												<tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
													<th className="pb-2 font-medium">Pembeli</th>
													<th className="pb-2 font-medium">Kode</th>
													<th className="pb-2 font-medium text-center">Qty</th>
													<th className="pb-2 font-medium text-right">Total</th>
													<th className="pb-2 font-medium text-center">Status</th>
													<th className="pb-2 font-medium text-right">Waktu</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
												{dashboard.recentTransactions.map((tx) => (
													<tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
														<td className="py-2.5">
															<p className="font-medium text-gray-900 dark:text-white">{tx.buyerName}</p>
															<p className="text-xs text-gray-400">{tx.buyerEmail}</p>
														</td>
														<td className="py-2.5 font-mono text-xs text-gray-500">{tx.ticketCode}</td>
														<td className="py-2.5 text-center">{tx.quantity}</td>
														<td className="py-2.5 text-right font-medium">{tx.totalAmount === 0 ? "GRATIS" : formatCurrency(tx.totalAmount)}</td>
														<td className="py-2.5 text-center">
															<span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
																tx.status === "USED" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
																: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
															}`}>
																{tx.status}
															</span>
														</td>
														<td className="py-2.5 text-right text-xs text-gray-500">
															{tx.paidAt ? new Date(tx.paidAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-"}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</div>
							)}
						</>
					) : (
						<div className="text-center py-12 text-gray-500 dark:text-gray-400">
							Tidak ada data dashboard
						</div>
					)}
				</div>
			)}

			{/* Teams Tab */}
			{activeTab === "teams" && (
				<div className="space-y-6">
					<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm p-6">
						<div className="flex items-center gap-3 mb-5">
							<div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
								<UserGroupIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
							</div>
							<div>
								<h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pasukan Ticketing</h2>
								<p className="text-sm text-gray-500 dark:text-gray-400">Daftar pilihan pasukan untuk penonton saat membeli tiket berbasis nominasi.</p>
							</div>
						</div>

						<div className={`mb-5 flex items-center justify-between rounded-xl border p-4 ${
							config.ticketTeamSelectionEnabled
								? "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/20"
								: "border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-900/20"
						}`}>
							<div>
								<p className="text-sm font-semibold text-gray-900 dark:text-white">
									Mode Pilih Pasukan
								</p>
								<p className="text-xs text-gray-500 dark:text-gray-400">
									{config.ticketTeamSelectionEnabled
										? "Penonton wajib memilih pasukan saat membeli tiket."
										: "Penonton tetap bisa membeli tiket tanpa memilih pasukan."}
								</p>
							</div>
							<button
								type="button"
								onClick={handleToggleTicketTeamSelectionMode}
								disabled={saving}
								title={config.ticketTeamSelectionEnabled ? "Nonaktifkan mode pilih pasukan" : "Aktifkan mode pilih pasukan"}
								className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
									config.ticketTeamSelectionEnabled ? "bg-red-600" : "bg-green-500"
								}`}
							>
								<span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
									config.ticketTeamSelectionEnabled ? "translate-x-5" : "translate-x-1"
								}`} />
							</button>
						</div>

						<div className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-6">
							<div className="space-y-4">
								<input
									type="file"
									ref={teamLogoInputRef}
									accept="image/jpeg,image/jpg,image/png,image/webp"
									className="hidden"
									onChange={(e) => handleLogoChange(e.target.files?.[0] || null)}
								/>
								<button
									type="button"
									onClick={() => teamLogoInputRef.current?.click()}
									className="w-full aspect-square rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/40 flex items-center justify-center overflow-hidden hover:border-red-400 transition-colors"
								>
									{teamLogoPreview ? (
										<img src={teamLogoPreview} alt="preview" className="w-full h-full object-cover" />
									) : (
										<div className="text-center text-gray-400">
											<PhotoIcon className="w-10 h-10 mx-auto mb-2" />
											<p className="text-sm font-medium">Pilih foto/logo</p>
											<p className="text-xs">JPG, PNG, WEBP</p>
										</div>
									)}
								</button>
								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Pasukan/Sekolah *</label>
									<input
										type="text"
										value={teamForm.teamName}
										onChange={(e) => setTeamForm((form) => ({ ...form, teamName: e.target.value }))}
										className="w-full px-4 py-2.5 bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
										placeholder="Contoh: SMAN 1 Garuda"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Keterangan <span className="text-gray-400">(opsional)</span></label>
									<input
										type="text"
										value={teamForm.schoolName}
										onChange={(e) => setTeamForm((form) => ({ ...form, schoolName: e.target.value }))}
										className="w-full px-4 py-2.5 bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
										placeholder="Nama pasukan, kota, atau kategori"
									/>
								</div>
								<button
									onClick={handleAddTicketTeam}
									disabled={addingTeam || !teamForm.teamName.trim()}
									className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
								>
									<PlusIcon className="w-5 h-5" />
									{addingTeam ? "Menyimpan..." : "Tambah Pasukan"}
								</button>
							</div>

							<div>
								{teamsLoading ? (
									<div className="flex justify-center py-12">
										<ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
									</div>
								) : ticketTeams.length === 0 ? (
									<div className="text-center py-12 bg-gray-50 dark:bg-gray-900/30 rounded-xl">
										<UserGroupIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
										<p className="text-gray-500 dark:text-gray-400">Belum ada pasukan ticketing</p>
									</div>
								) : (
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										{ticketTeams.map((team, idx) => (
											<div key={team.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/30 border border-gray-200/60 dark:border-gray-700/40">
												<div className="w-8 text-center text-sm font-semibold text-gray-400">{idx + 1}</div>
												{team.logoUrl ? (
													<img src={getMediaUrl(team.logoUrl)} alt="" className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
												) : (
													<div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
														<UserGroupIcon className="w-6 h-6 text-gray-400" />
													</div>
												)}
												<div className="flex-1 min-w-0">
													<p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{team.teamName}</p>
													{team.schoolName && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{team.schoolName}</p>}
													<p className="text-xs font-medium text-red-600 dark:text-red-400 mt-1">{team.viewerCount} penonton</p>
												</div>
												<button
													onClick={() => handleDeleteTicketTeam(team)}
													disabled={team.viewerCount > 0}
													title={team.viewerCount > 0 ? "Sudah dipilih penonton" : "Hapus"}
													className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-40 disabled:hover:text-gray-400 disabled:hover:bg-transparent"
												>
													<TrashIcon className="w-5 h-5" />
												</button>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			)}

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
									{ticketingShareLocked
										? "Menunggu admin mengatur persentase bagi hasil tiket"
										: "Event akan muncul di halaman e-ticketing publik"}
								</p>
							</div>
							<button
								onClick={() => {
									if (!config.enabled && ticketingShareLocked) {
										Swal.fire(
											"Menunggu Admin",
											"Hubungi admin untuk negosiasi dan pengaturan persentase bagi hasil sebelum membuka E-Ticketing.",
											"info"
										);
										return;
									}
									setConfig({ ...config, enabled: !config.enabled });
								}}
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

						{/* Team Selection Mode */}
						<div className="flex items-center justify-between">
							<div>
								<label className="text-sm font-medium text-gray-900 dark:text-white">
									Wajib Pilih Pasukan
								</label>
								<p className="text-xs text-gray-500 dark:text-gray-400">
									Matikan agar penonton tetap bisa membeli tiket tanpa memilih nominasi pasukan
								</p>
							</div>
							<button
								onClick={() => setConfig({ ...config, ticketTeamSelectionEnabled: !config.ticketTeamSelectionEnabled })}
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
									config.ticketTeamSelectionEnabled ? "bg-red-600" : "bg-gray-300 dark:bg-gray-600"
								}`}
							>
								<span
									className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
										config.ticketTeamSelectionEnabled ? "translate-x-6" : "translate-x-1"
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
												Pasukan
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
												<td className="px-4 py-3">
													<div className="space-y-1">
														{(purchase.attendees?.length || 0) === 0 ? (
															<p className="text-xs text-amber-600 dark:text-amber-400 truncate max-w-[160px]">
																Belum dipilih
															</p>
														) : (
															purchase.attendees?.slice(0, 3).map((att) => (
																<p
																	key={att.id}
																	className={`text-xs truncate max-w-[160px] ${
																		att.ticketTeam ? "text-gray-600 dark:text-gray-300" : "text-amber-600 dark:text-amber-400"
																	}`}
																>
																	{att.ticketTeam?.teamName || "Belum dipilih"}
																</p>
															))
														)}
														{(purchase.attendees?.length || 0) > 3 && (
															<p className="text-xs text-gray-400">+{(purchase.attendees?.length || 0) - 3} lainnya</p>
														)}
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
														{purchase.status !== "CANCELLED" && purchase.status !== "EXPIRED" && (
															<button
																onClick={() => handleEditPurchaseTeams(purchase)}
																title="Edit Pilihan Pasukan"
																className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg"
															>
																<PencilSquareIcon className="w-5 h-5" />
															</button>
														)}
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
					{/* Stats bar — always visible */}
					<div className="grid grid-cols-3 gap-2 mb-3">
						<div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2 text-center">
							<div className="text-xs text-green-700 dark:text-green-400">Valid</div>
							<div className="text-xl font-bold text-green-700 dark:text-green-400">{scanStats.valid}</div>
						</div>
						<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2 text-center">
							<div className="text-xs text-red-700 dark:text-red-400">Invalid</div>
							<div className="text-xl font-bold text-red-700 dark:text-red-400">{scanStats.invalid}</div>
						</div>
						<button
							onClick={() => setContinuousMode((v) => !v)}
							className={`rounded-lg p-2 text-center text-xs font-medium border transition-colors ${
								continuousMode
									? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
									: "bg-gray-50 dark:bg-gray-900/20 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
							}`}
							title="Mode scan berurutan tanpa berhenti"
						>
							<div className="text-[10px] uppercase tracking-wide">Continuous</div>
							<div className="text-sm font-bold mt-0.5">{continuousMode ? "ON" : "OFF"}</div>
						</button>
					</div>

					{/* Scanner Area — visible when scanning OR (in non-continuous mode) when no result yet */}
					{(scanning || (!scanResult && !scanProcessing)) && (
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

							{/* Continuous-mode toast: show last result over scanner without stopping camera */}
							{continuousMode && scanning && scanResult && (
								<div className={`mt-3 rounded-lg border-2 p-3 flex items-center gap-3 ${
									scanResult.valid
										? "bg-green-50 dark:bg-green-900/20 border-green-500"
										: "bg-red-50 dark:bg-red-900/20 border-red-500"
								}`}>
									{scanResult.valid ? (
										<CheckCircleIcon className="w-8 h-8 text-green-600 flex-shrink-0" />
									) : (
										<XCircleIcon className="w-8 h-8 text-red-600 flex-shrink-0" />
									)}
									<div className="flex-1 min-w-0">
										<div className={`text-sm font-bold ${scanResult.valid ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
											{scanResult.valid ? "VALID" : "DITOLAK"} — {scanResult.ticket?.buyerName || "—"}
										</div>
										<div className="text-xs text-gray-600 dark:text-gray-400 truncate">
											{scanResult.valid ? scanResult.message : scanResult.error}
											{scanResult.ticket?.ticketTeam ? ` · ${scanResult.ticket.ticketTeam.teamName}` : ""}
										</div>
									</div>
									<button
										onClick={() => setScanResult(null)}
										className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
										title="Tutup"
									>
										<XCircleIcon className="w-5 h-5" />
									</button>
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

					{/* Scan history (last 10) — always visible to give panitia confidence */}
					{scanHistory.length > 0 && (
						<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm overflow-hidden mb-6">
							<div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
								<h3 className="text-sm font-medium text-gray-900 dark:text-white">Riwayat Scan ({scanHistory.length})</h3>
								<button
									onClick={() => { setScanHistory([]); setScanStats({ valid: 0, invalid: 0 }); }}
									className="text-xs text-gray-500 hover:text-red-600"
								>
									Bersihkan
								</button>
							</div>
							<ul className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
								{scanHistory.map((h, i) => (
									<li key={`${h.code}-${h.at}-${i}`} className="px-4 py-2 flex items-center gap-2 text-sm">
										{h.valid ? (
											<CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
										) : (
											<XCircleIcon className="w-5 h-5 text-red-600 flex-shrink-0" />
										)}
										<div className="flex-1 min-w-0">
											<div className="font-medium text-gray-900 dark:text-white truncate">{h.ticket?.buyerName || h.code}</div>
											<div className="text-xs text-gray-500 dark:text-gray-400 truncate font-mono">{h.code}</div>
										</div>
										<div className="text-xs text-gray-400 flex-shrink-0">{new Date(h.at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>
									</li>
								))}
							</ul>
						</div>
					)}

					{/* Processing indicator (only meaningful in non-continuous mode; continuous mode shows toast over scanner) */}
					{scanProcessing && !continuousMode && (
						<div className="flex justify-center py-4">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
						</div>
					)}

					{/* Detailed Scan Result — only in non-continuous mode */}
					{scanResult && !scanProcessing && !continuousMode && (
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
										{scanResult.ticket.ticketTeam && (
											<div className="flex justify-between gap-3">
												<span className="text-gray-500 dark:text-gray-400">Pasukan</span>
												<span className="font-medium text-gray-900 dark:text-white text-right max-w-[60%]">
													{scanResult.ticket.ticketTeam.teamName}
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
