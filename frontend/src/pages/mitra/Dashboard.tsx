import React, { useEffect, useMemo, useState } from "react";
import {
	LuBadgeDollarSign,
	LuCircleCheck,
	LuCircleX,
	LuCopy,
	LuRefreshCw,
	LuSend,
	LuTicketCheck,
	LuWallet,
} from "react-icons/lu";
import Swal from "sweetalert2";
import { api } from "../../utils/api";

interface MitraCommission {
	id: string;
	amount: number;
	status: "PENDING" | "APPROVED" | "PAID" | "CANCELLED";
	createdAt: string;
	event: {
		id: string;
		title: string;
		slug: string | null;
		status: string;
		startDate: string;
		city: string | null;
		province: string | null;
		packageTier: string | null;
	};
}

interface MitraDashboardData {
	profile: {
		referralCode: string;
		commissionPerEvent: number;
	};
	stats: {
		totalEvents: number;
		totalPending: number;
		totalPaid: number;
		commissionPerEvent: number;
	};
	commissions: MitraCommission[];
}

interface MitraWithdrawal {
	id: string;
	amount: number;
	bankName: string;
	accountNumber: string;
	accountHolder: string;
	notes: string | null;
	status: "PENDING" | "APPROVED" | "TRANSFERRED" | "REJECTED";
	adminNotes: string | null;
	transferredAt: string | null;
	createdAt: string;
}

interface MitraWithdrawalData {
	summary: {
		totalCommission: number;
		totalWithdrawn: number;
		totalPending: number;
		remainingBalance: number;
		totalCommissionEvents: number;
	};
	withdrawals: MitraWithdrawal[];
}

const formatCurrency = (value: number) =>
	new Intl.NumberFormat("id-ID", {
		style: "currency",
		currency: "IDR",
		maximumFractionDigits: 0,
	}).format(value);

const initialWithdrawalForm = {
	amount: "",
	bankName: "",
	accountNumber: "",
	accountHolder: "",
	notes: "",
};

const MitraDashboard: React.FC = () => {
	const [data, setData] = useState<MitraDashboardData | null>(null);
	const [withdrawalData, setWithdrawalData] = useState<MitraWithdrawalData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [copied, setCopied] = useState(false);
	const [form, setForm] = useState(initialWithdrawalForm);

	const loadData = async () => {
		setIsLoading(true);
		try {
			const [mitraResponse, withdrawalResponse] = await Promise.all([
				api.get("/mitra/me"),
				api.get("/disbursements/mitra"),
			]);
			setData(mitraResponse.data);
			setWithdrawalData(withdrawalResponse.data);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		loadData();
	}, []);

	const stats = useMemo(() => {
		if (!data || !withdrawalData) return [];
		return [
			{
				label: "Komisi per Event",
				value: formatCurrency(data.stats.commissionPerEvent),
				icon: LuBadgeDollarSign,
			},
			{
				label: "Event Referral",
				value: String(data.stats.totalEvents),
				icon: LuTicketCheck,
			},
			{
				label: "Saldo Bisa Ditarik",
				value: formatCurrency(withdrawalData.summary.remainingBalance),
				icon: LuWallet,
			},
			{
				label: "Sudah Dicairkan",
				value: formatCurrency(withdrawalData.summary.totalWithdrawn),
				icon: LuCircleCheck,
			},
		];
	}, [data, withdrawalData]);

	const handleCopy = async () => {
		if (!data?.profile.referralCode) return;
		await navigator.clipboard.writeText(data.profile.referralCode);
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1600);
	};

	const handleSubmitWithdrawal = async (event: React.FormEvent) => {
		event.preventDefault();
		const amount = Number(form.amount);
		const remainingBalance = withdrawalData?.summary.remainingBalance ?? 0;

		if (!amount || amount <= 0) {
			Swal.fire("Jumlah tidak valid", "Masukkan nominal penarikan yang benar.", "warning");
			return;
		}
		if (amount > remainingBalance) {
			Swal.fire("Saldo tidak cukup", `Saldo bisa ditarik saat ini ${formatCurrency(remainingBalance)}.`, "warning");
			return;
		}
		if (!form.bankName.trim() || !form.accountNumber.trim() || !form.accountHolder.trim()) {
			Swal.fire("Data belum lengkap", "Nama bank, nomor rekening, dan atas nama wajib diisi.", "warning");
			return;
		}

		setIsSubmitting(true);
		try {
			await api.post("/disbursements/mitra/request", {
				amount,
				bankName: form.bankName,
				accountNumber: form.accountNumber,
				accountHolder: form.accountHolder,
				notes: form.notes,
			});
			setForm(initialWithdrawalForm);
			await loadData();
			Swal.fire("Berhasil", "Pengajuan penarikan dana berhasil dibuat.", "success");
		} catch (err: any) {
			Swal.fire("Gagal", err.response?.data?.error || "Gagal membuat pengajuan penarikan.", "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	const getWithdrawalStatus = (status: MitraWithdrawal["status"]) => {
		switch (status) {
			case "PENDING":
				return <span className="text-yellow-700 dark:text-yellow-300 font-bold">MENUNGGU</span>;
			case "APPROVED":
				return <span className="text-blue-700 dark:text-blue-300 font-bold">DISETUJUI</span>;
			case "TRANSFERRED":
				return <span className="text-green-700 dark:text-green-300 font-bold">DITRANSFER</span>;
			case "REJECTED":
				return <span className="text-red-700 dark:text-red-300 font-bold">DITOLAK</span>;
			default:
				return status;
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
				<div>
					<p className="text-xs uppercase tracking-[0.22em] text-red-600 dark:text-red-400 font-bold">
						Dashboard Mitra
					</p>
					<h1 className="mt-2 text-2xl md:text-3xl font-black text-gray-950 dark:text-white">
						Kode Referral & Komisi
					</h1>
					<p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
						Bagikan kode Anda ke panitia. Setiap event valid memberi komisi Rp200.000.
					</p>
				</div>
				<button
					type="button"
					onClick={loadData}
					className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors"
				>
					<LuRefreshCw className="w-4 h-4" />
					Refresh
				</button>
			</div>

			<div className="rounded-2xl border border-red-200 dark:border-red-500/20 bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-white/[0.03] p-5 md:p-6">
				<p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400 font-bold">
					Kode Referral Anda
				</p>
				<div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3">
					<div className="flex-1 rounded-xl border border-dashed border-red-300 dark:border-red-500/40 bg-white/80 dark:bg-gray-950/35 px-4 py-3">
						<p className="text-2xl md:text-3xl font-black tracking-widest text-gray-950 dark:text-white break-all">
							{data?.profile.referralCode}
						</p>
					</div>
					<button
						type="button"
						onClick={handleCopy}
						className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors"
					>
						<LuCopy className="w-4 h-4" />
						{copied ? "Tersalin" : "Salin Kode"}
					</button>
				</div>
			</div>

			<div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
				{stats.map((item) => {
					const Icon = item.icon;
					return (
						<div key={item.label} className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800 p-5">
							<div className="w-10 h-10 rounded-xl bg-red-600/10 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
								<Icon className="w-5 h-5" />
							</div>
							<p className="text-sm text-gray-500 dark:text-gray-400">{item.label}</p>
							<p className="mt-1 text-2xl font-black text-gray-950 dark:text-white">{item.value}</p>
						</div>
					);
				})}
			</div>

			<div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.7fr)] gap-6">
				<div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800 overflow-hidden">
					<div className="p-5 border-b border-gray-200 dark:border-white/10 flex items-center justify-between gap-3">
						<div>
							<h2 className="text-lg font-bold text-gray-950 dark:text-white">Penarikan Dana</h2>
							<p className="text-sm text-gray-500 dark:text-gray-400">
								Saldo tersedia {formatCurrency(withdrawalData?.summary.remainingBalance ?? 0)}
							</p>
						</div>
						<LuSend className="w-5 h-5 text-red-600 dark:text-red-400" />
					</div>
					<form onSubmit={handleSubmitWithdrawal} className="p-5 space-y-4">
						<div>
							<label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Nominal Penarikan</label>
							<input
								type="number"
								min="1"
								value={form.amount}
								onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
								placeholder="Masukkan nominal"
								className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-950/40 px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
							/>
						</div>
						<div className="grid md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Bank</label>
								<input
									value={form.bankName}
									onChange={(e) => setForm((prev) => ({ ...prev, bankName: e.target.value }))}
									placeholder="BCA, BRI, Mandiri..."
									className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-950/40 px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
								/>
							</div>
							<div>
								<label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Nomor Rekening</label>
								<input
									value={form.accountNumber}
									onChange={(e) => setForm((prev) => ({ ...prev, accountNumber: e.target.value }))}
									placeholder="Nomor rekening"
									className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-950/40 px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
								/>
							</div>
						</div>
						<div>
							<label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Atas Nama</label>
							<input
								value={form.accountHolder}
								onChange={(e) => setForm((prev) => ({ ...prev, accountHolder: e.target.value }))}
								placeholder="Nama pemilik rekening"
								className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-950/40 px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
							/>
						</div>
						<div>
							<label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Catatan</label>
							<textarea
								value={form.notes}
								onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
								placeholder="Catatan tambahan"
								rows={3}
								className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-950/40 px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
							/>
						</div>
						<button
							type="submit"
							disabled={isSubmitting || !withdrawalData?.summary.remainingBalance}
							className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:text-gray-500 text-white text-sm font-bold transition-colors"
						>
							<LuSend className="w-4 h-4" />
							{isSubmitting ? "Mengirim..." : "Ajukan Penarikan"}
						</button>
					</form>
				</div>

				<div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800 overflow-hidden">
					<div className="p-5 border-b border-gray-200 dark:border-white/10">
						<h2 className="text-lg font-bold text-gray-950 dark:text-white">Riwayat Penarikan</h2>
					</div>
					<div className="divide-y divide-gray-200 dark:divide-white/10">
						{withdrawalData?.withdrawals.length ? (
							withdrawalData.withdrawals.map((withdrawal) => (
								<div key={withdrawal.id} className="p-5 space-y-2">
									<div className="flex items-start justify-between gap-3">
										<div>
											<p className="font-black text-gray-950 dark:text-white">{formatCurrency(withdrawal.amount)}</p>
											<p className="text-sm text-gray-500 dark:text-gray-400">
												{withdrawal.bankName} - {withdrawal.accountNumber}
											</p>
										</div>
										<p className="text-xs uppercase tracking-[0.14em]">
											{getWithdrawalStatus(withdrawal.status)}
										</p>
									</div>
									<p className="text-xs text-gray-400">
										Diajukan {new Date(withdrawal.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
									</p>
									{withdrawal.adminNotes && (
										<p className="text-sm text-gray-600 dark:text-gray-300">
											Catatan admin: {withdrawal.adminNotes}
										</p>
									)}
								</div>
							))
						) : (
							<div className="p-8 text-center">
								<LuCircleX className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
								<p className="text-sm text-gray-500 dark:text-gray-400">Belum ada pengajuan penarikan.</p>
							</div>
						)}
					</div>
				</div>
			</div>

			<div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800 overflow-hidden">
				<div className="p-5 border-b border-gray-200 dark:border-white/10">
					<h2 className="text-lg font-bold text-gray-950 dark:text-white">Riwayat Referral Event</h2>
				</div>
				<div className="divide-y divide-gray-200 dark:divide-white/10">
					{data?.commissions.length ? (
						data.commissions.map((commission) => (
							<div key={commission.id} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
								<div>
									<p className="font-bold text-gray-950 dark:text-white">{commission.event.title}</p>
									<p className="text-sm text-gray-500 dark:text-gray-400">
										{commission.event.city || "-"}, {commission.event.province || "-"} - {commission.event.status}
									</p>
								</div>
								<div className="text-left md:text-right">
									<p className="font-black text-gray-950 dark:text-white">{formatCurrency(commission.amount)}</p>
									<p className="text-xs uppercase tracking-[0.16em] text-red-600 dark:text-red-400 font-bold">{commission.status}</p>
								</div>
							</div>
						))
					) : (
						<div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
							Belum ada event yang menggunakan kode referral Anda.
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default MitraDashboard;
