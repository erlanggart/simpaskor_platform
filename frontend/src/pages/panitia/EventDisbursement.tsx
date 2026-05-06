import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
	BanknotesIcon,
	PlusIcon,
	CheckCircleIcon,
	ClockIcon,
	XCircleIcon,
	ArrowPathIcon,
	CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import Swal from "sweetalert2";
import { api } from "../../utils/api";

interface DisbursementData {
	id: string;
	amount: number;
	bankName: string;
	accountNumber: string;
	accountHolder: string;
	notes: string | null;
	status: "PENDING" | "APPROVED" | "TRANSFERRED" | "REJECTED";
	adminNotes: string | null;
	transferProof: string | null;
	transferredAt: string | null;
	processedAt: string | null;
	createdAt: string;
	requestedBy: { id: string; name: string; email: string };
	processedBy: { id: string; name: string; email: string } | null;
}

interface Summary {
	totalRevenue: number;
	ticketRevenue: number;
	votingRevenue: number;
	grossRevenue: number;
	ticketGrossRevenue: number;
	votingGrossRevenue: number;
	platformShare: number;
	panitiaShare: number;
	platformShareRate: number;
	panitiaShareRate: number;
	totalDisbursed: number;
	totalPending: number;
	remainingBalance: number;
}

const formatCurrency = (amount: number) =>
	new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

const formatPercent = (rate: number) => `${Math.round(rate * 100)}%`;

const EventDisbursement: React.FC = () => {
	const { eventSlug } = useParams();
	const [eventId, setEventId] = useState("");
	const [loading, setLoading] = useState(true);
	const [summary, setSummary] = useState<Summary | null>(null);
	const [disbursements, setDisbursements] = useState<DisbursementData[]>([]);
	const [eventInfo, setEventInfo] = useState<{ id: string; title: string; startDate: string } | null>(null);
	const [showForm, setShowForm] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	// Form state
	const [amount, setAmount] = useState("");
	const [bankName, setBankName] = useState("");
	const [accountNumber, setAccountNumber] = useState("");
	const [accountHolder, setAccountHolder] = useState("");
	const [notes, setNotes] = useState("");

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

	// Fetch disbursement data
	useEffect(() => {
		if (eventId) fetchData();
	}, [eventId]);

	const fetchData = async () => {
		try {
			setLoading(true);
			const res = await api.get(`/disbursements/event/${eventId}`);
			setSummary(res.data.summary);
			setDisbursements(res.data.disbursements);
			setEventInfo(res.data.event);
		} catch (err: any) {
			console.error("Error fetching disbursements:", err);
		} finally {
			setLoading(false);
		}
	};

	const canRequestDisbursement = () => {
		if (!eventInfo) return false;
		const now = new Date();
		const eventDate = new Date(eventInfo.startDate);
		const diffDays = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
		return diffDays >= 4;
	};

	const getDaysUntilEvent = () => {
		if (!eventInfo) return 0;
		const now = new Date();
		const eventDate = new Date(eventInfo.startDate);
		return Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const parsedAmount = parseFloat(amount);
		if (!parsedAmount || parsedAmount <= 0) {
			Swal.fire("Error", "Jumlah pencairan harus lebih dari 0", "error");
			return;
		}
		if (!bankName.trim() || !accountNumber.trim() || !accountHolder.trim()) {
			Swal.fire("Error", "Data rekening bank wajib diisi lengkap", "error");
			return;
		}

		const confirm = await Swal.fire({
			title: "Konfirmasi Pengajuan",
			html: `
				<div class="text-left text-sm space-y-2">
					<p><strong>Jumlah:</strong> ${formatCurrency(parsedAmount)}</p>
					<p><strong>Bank:</strong> ${bankName}</p>
					<p><strong>No. Rekening:</strong> ${accountNumber}</p>
					<p><strong>Atas Nama:</strong> ${accountHolder}</p>
					${notes ? `<p><strong>Catatan:</strong> ${notes}</p>` : ""}
				</div>
			`,
			icon: "question",
			showCancelButton: true,
			confirmButtonText: "Ajukan",
			cancelButtonText: "Batal",
			confirmButtonColor: "#dc2626",
		});

		if (!confirm.isConfirmed) return;

		try {
			setSubmitting(true);
			await api.post(`/disbursements/event/${eventId}/request`, {
				amount: parsedAmount,
				bankName: bankName.trim(),
				accountNumber: accountNumber.trim(),
				accountHolder: accountHolder.trim(),
				notes: notes.trim() || null,
			});
			Swal.fire("Berhasil", "Pengajuan pencairan berhasil dibuat", "success");
			setShowForm(false);
			setAmount("");
			setBankName("");
			setAccountNumber("");
			setAccountHolder("");
			setNotes("");
			fetchData();
		} catch (err: any) {
			Swal.fire("Gagal", err.response?.data?.error || "Gagal mengajukan pencairan", "error");
		} finally {
			setSubmitting(false);
		}
	};

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "PENDING":
				return (
					<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
						<ClockIcon className="w-3.5 h-3.5" /> Menunggu
					</span>
				);
			case "APPROVED":
				return (
					<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
						<CheckCircleIcon className="w-3.5 h-3.5" /> Disetujui
					</span>
				);
			case "TRANSFERRED":
				return (
					<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
						<BanknotesIcon className="w-3.5 h-3.5" /> Sudah Ditransfer
					</span>
				);
			case "REJECTED":
				return (
					<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
						<XCircleIcon className="w-3.5 h-3.5" /> Ditolak
					</span>
				);
			default:
				return null;
		}
	};

	if (loading) {
		return (
			<div className="flex justify-center py-20">
				<ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
			</div>
		);
	}

	return (
		<div className="p-6 max-w-6xl mx-auto">
			{/* Header */}
			<div className="flex items-center gap-3 mb-6">
				<BanknotesIcon className="w-8 h-8 text-red-600" />
				<div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pencairan Dana</h1>
					<p className="text-sm text-gray-500 dark:text-gray-400">
						Ajukan pencairan pendapatan event
					</p>
				</div>
			</div>

			{/* Revenue Summary */}
			{summary && (
				<div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
					<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm p-5">
						<p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Pendapatan Kotor</p>
						<p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(summary.grossRevenue)}</p>
						<div className="mt-1 text-[10px] text-gray-400 space-y-0.5">
							<p>Tiket: {formatCurrency(summary.ticketGrossRevenue)}</p>
							<p>Voting: {formatCurrency(summary.votingGrossRevenue)}</p>
						</div>
					</div>
					<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm p-5">
						<p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Simpaskor {formatPercent(summary.platformShareRate)}</p>
						<p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(summary.platformShare)}</p>
						<p className="mt-1 text-[10px] text-gray-400">Dipisahkan dari transaksi tiket dan voting</p>
					</div>
					<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm p-5">
						<p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Hak Panitia {formatPercent(summary.panitiaShareRate)}</p>
						<p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(summary.panitiaShare)}</p>
						<div className="mt-1 text-[10px] text-gray-400 space-y-0.5">
							<p>Tiket: {formatCurrency(summary.ticketRevenue)}</p>
							<p>Voting: {formatCurrency(summary.votingRevenue)}</p>
						</div>
					</div>
					<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm p-5">
						<p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Sudah Dicairkan</p>
						<p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(summary.totalDisbursed)}</p>
					</div>
					<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm p-5">
						<p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Saldo Tersedia</p>
						<p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(summary.remainingBalance)}</p>
						<p className="mt-1 text-[10px] text-gray-400">Dalam proses: {formatCurrency(summary.totalPending)}</p>
					</div>
				</div>
			)}

			{/* Request Button / Warning */}
			<div className="mb-6">
				{canRequestDisbursement() ? (
					<button
						onClick={() => setShowForm(!showForm)}
						className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors shadow-sm"
					>
						<PlusIcon className="w-5 h-5" />
						{showForm ? "Tutup Form" : "Ajukan Pencairan"}
					</button>
				) : (
					<div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4">
						<p className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">
							Pengajuan pencairan hanya bisa dilakukan maksimal H-4 sebelum event.
							{getDaysUntilEvent() >= 0
								? ` Event dimulai dalam ${getDaysUntilEvent()} hari.`
								: " Event sudah berlalu."}
						</p>
					</div>
				)}
			</div>

			{/* Request Form */}
			{showForm && (
				<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm p-6 mb-6">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Form Pengajuan Pencairan</h3>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									Jumlah Pencairan <span className="text-red-500">*</span>
								</label>
								<div className="relative">
									<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rp</span>
									<input
										type="number"
										value={amount}
										onChange={(e) => setAmount(e.target.value)}
										placeholder="0"
										min="1"
										max={summary?.remainingBalance || 0}
										className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
										required
									/>
								</div>
								{summary && (
									<p className="text-xs text-gray-400 mt-1">Maks: {formatCurrency(summary.remainingBalance)}</p>
								)}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									Nama Bank <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									value={bankName}
									onChange={(e) => setBankName(e.target.value)}
									placeholder="BCA, BNI, BRI, Mandiri, dll"
									className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
									required
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									Nomor Rekening <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									value={accountNumber}
									onChange={(e) => setAccountNumber(e.target.value)}
									placeholder="1234567890"
									className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
									required
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									Nama Pemilik Rekening <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									value={accountHolder}
									onChange={(e) => setAccountHolder(e.target.value)}
									placeholder="Nama sesuai rekening"
									className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
									required
								/>
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Catatan</label>
							<textarea
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								placeholder="Catatan tambahan (opsional)"
								rows={2}
								className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
							/>
						</div>
						<div className="flex gap-3">
							<button
								type="submit"
								disabled={submitting}
								className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
							>
								{submitting ? "Mengajukan..." : "Ajukan Pencairan"}
							</button>
							<button
								type="button"
								onClick={() => setShowForm(false)}
								className="px-5 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
							>
								Batal
							</button>
						</div>
					</form>
				</div>
			)}

			{/* Disbursement History */}
			<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm">
				<div className="p-6 border-b border-gray-200 dark:border-gray-700">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">Riwayat Pencairan</h3>
				</div>

				{disbursements.length === 0 ? (
					<div className="p-12 text-center">
						<CurrencyDollarIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
						<p className="text-gray-500 dark:text-gray-400">Belum ada pengajuan pencairan</p>
					</div>
				) : (
					<div className="divide-y divide-gray-200 dark:divide-gray-700">
						{disbursements.map((d) => (
							<div key={d.id} className="p-6">
								<div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
									<div>
										<div className="flex items-center gap-3 mb-1">
											<span className="text-xl font-bold text-gray-900 dark:text-white">
												{formatCurrency(d.amount)}
											</span>
											{getStatusBadge(d.status)}
										</div>
										<p className="text-xs text-gray-400">
											Diajukan oleh {d.requestedBy.name} · {new Date(d.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
										</p>
									</div>
								</div>

								{/* Bank Details */}
								<div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 mb-3">
									<div className="grid grid-cols-3 gap-2 text-sm">
										<div>
											<p className="text-xs text-gray-400">Bank</p>
											<p className="font-medium text-gray-900 dark:text-white">{d.bankName}</p>
										</div>
										<div>
											<p className="text-xs text-gray-400">No. Rekening</p>
											<p className="font-medium text-gray-900 dark:text-white">{d.accountNumber}</p>
										</div>
										<div>
											<p className="text-xs text-gray-400">Atas Nama</p>
											<p className="font-medium text-gray-900 dark:text-white">{d.accountHolder}</p>
										</div>
									</div>
								</div>

								{d.notes && (
									<p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
										<span className="font-medium">Catatan:</span> {d.notes}
									</p>
								)}

								{/* Admin response */}
								{d.adminNotes && (
									<div className={`text-sm p-3 rounded-lg mb-2 ${
										d.status === "REJECTED"
											? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
											: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
									}`}>
										<span className="font-medium">Catatan Admin:</span> {d.adminNotes}
									</div>
								)}

								{/* Transfer details */}
								{d.status === "TRANSFERRED" && d.transferredAt && (
									<div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
										<CheckCircleIcon className="w-4 h-4" />
										<span>
											Ditransfer pada {new Date(d.transferredAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
											{d.processedBy && ` oleh ${d.processedBy.name}`}
										</span>
									</div>
								)}

								{d.processedAt && d.status !== "TRANSFERRED" && d.processedBy && (
									<p className="text-xs text-gray-400 mt-1">
										Diproses oleh {d.processedBy.name} pada {new Date(d.processedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
									</p>
								)}
							</div>
						))}
					</div>
				)}
			</div>

			{/* Progress Summary */}
			{summary && summary.totalRevenue > 0 && (
				<div className="mt-6 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm p-6">
					<h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Progress Pencairan</h3>
					<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-2">
						<div className="flex h-4 rounded-full overflow-hidden">
							<div
								className="bg-green-500 h-full transition-all"
								style={{ width: `${(summary.totalDisbursed / summary.totalRevenue) * 100}%` }}
								title={`Dicairkan: ${formatCurrency(summary.totalDisbursed)}`}
							/>
							<div
								className="bg-yellow-400 h-full transition-all"
								style={{ width: `${(summary.totalPending / summary.totalRevenue) * 100}%` }}
								title={`Dalam proses: ${formatCurrency(summary.totalPending)}`}
							/>
						</div>
					</div>
					<div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
						<span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Dicairkan ({Math.round((summary.totalDisbursed / summary.totalRevenue) * 100)}%)</span>
						<span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Proses ({Math.round((summary.totalPending / summary.totalRevenue) * 100)}%)</span>
						<span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 inline-block" /> Sisa ({Math.round((summary.remainingBalance / summary.totalRevenue) * 100)}%)</span>
					</div>
				</div>
			)}
		</div>
	);
};

export default EventDisbursement;
