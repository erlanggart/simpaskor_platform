import { useEffect, useState } from "react";
import {
	LuMail,
	LuShieldCheck,
	LuKeyRound,
	LuTicket,
	LuTriangleAlert,
} from "react-icons/lu";
import { mailAPI, MailUsage as MailUsageData } from "../../utils/api";

// What each outgoing email category is actually used for — shown to the admin
// so they know why mail is being sent. Keep in sync with backend MailCategory.
const CATEGORY_INFO: Record<
	string,
	{ label: string; desc: string; icon: React.ElementType; color: string }
> = {
	VERIFICATION: {
		label: "Verifikasi Email",
		desc: "Dikirim saat pengguna memilih role selain Peserta (Panitia, Juri, Pelatih, Mitra). Wajib diklik sebelum bisa masuk dashboard — untuk mencegah akun bodong.",
		icon: LuShieldCheck,
		color: "text-blue-500 bg-blue-500/10",
	},
	PASSWORD_RESET: {
		label: "Reset Password",
		desc: "Dikirim saat pengguna menggunakan fitur 'Lupa Password'. Berisi link reset yang berlaku 1 jam.",
		icon: LuKeyRound,
		color: "text-amber-500 bg-amber-500/10",
	},
	TICKET: {
		label: "E-Ticket",
		desc: "Dikirim otomatis setelah pembelian tiket event berhasil. Berisi QR code tiket untuk setiap peserta.",
		icon: LuTicket,
		color: "text-emerald-500 bg-emerald-500/10",
	},
};

const StatCard = ({
	label,
	value,
	accent,
}: {
	label: string;
	value: number;
	accent?: string;
}) => (
	<div className="rounded-2xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-800/60 p-5">
		<p className="text-xs font-medium text-gray-500 dark:text-gray-400">
			{label}
		</p>
		<p
			className={`mt-1 text-3xl font-bold ${
				accent || "text-gray-900 dark:text-white"
			}`}
		>
			{value.toLocaleString("id-ID")}
		</p>
	</div>
);

const MailUsage = () => {
	const [data, setData] = useState<MailUsageData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		mailAPI
			.getUsage()
			.then(setData)
			.catch(() =>
				setError("Gagal memuat data penggunaan email. Coba muat ulang.")
			)
			.finally(() => setLoading(false));
	}, []);

	if (loading) {
		return (
			<div className="min-h-[60vh] flex items-center justify-center">
				<div className="w-10 h-10 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
			</div>
		);
	}

	if (error || !data) {
		return (
			<div className="p-6 text-center text-red-600 dark:text-red-400">
				{error || "Data tidak tersedia."}
			</div>
		);
	}

	const usedToday = data.totals.today;
	const limitPct = Math.min(
		100,
		Math.round((usedToday / data.dailyLimit) * 100)
	);
	// Warn once usage reaches the configured threshold (default 200/300).
	const nearLimit = usedToday >= data.warnThreshold;

	return (
		<div className="p-4 sm:p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center gap-3">
				<div className="w-11 h-11 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
					<LuMail className="w-6 h-6" />
				</div>
				<div>
					<h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
						Penggunaan Email
					</h1>
					<p className="text-sm text-gray-500 dark:text-gray-400">
						Pantau jumlah email keluar dan sisa kuota harian SMTP.
					</p>
				</div>
			</div>

			{/* Usage warning */}
			{nearLimit && (
				<div className="flex items-start gap-3 rounded-2xl border border-amber-300 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20 p-4">
					<LuTriangleAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
					<p className="text-sm text-amber-800 dark:text-amber-300">
						<strong>Peringatan kuota:</strong> sudah{" "}
						{usedToday.toLocaleString("id-ID")} email terpakai hari ini (ambang
						peringatan {data.warnThreshold.toLocaleString("id-ID")}, batas{" "}
						{data.dailyLimit.toLocaleString("id-ID")}). Pertimbangkan untuk
						menunda pengiriman non-esensial agar tidak melewati limit harian
						SMTP.
					</p>
				</div>
			)}

			{/* Daily limit usage */}
			<div className="rounded-2xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-800/60 p-5">
				<div className="flex items-center justify-between mb-2">
					<p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
						Kuota Harian
					</p>
					<p
						className={`text-sm font-bold ${
							nearLimit
								? "text-red-600 dark:text-red-400"
								: "text-gray-900 dark:text-white"
						}`}
					>
						{usedToday.toLocaleString("id-ID")} /{" "}
						{data.dailyLimit.toLocaleString("id-ID")}
					</p>
				</div>
				<div className="h-3 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
					<div
						className={`h-full rounded-full transition-all ${
							nearLimit
								? "bg-gradient-to-r from-red-600 to-red-500"
								: "bg-gradient-to-r from-emerald-500 to-teal-500"
						}`}
						style={{ width: `${limitPct}%` }}
					/>
				</div>
				<p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
					Batas {data.dailyLimit.toLocaleString("id-ID")} email/hari, peringatan
					di {data.warnThreshold.toLocaleString("id-ID")}. Atur lewat env{" "}
					<code>SMTP_DAILY_LIMIT</code> &amp; <code>SMTP_DAILY_WARN</code>.
				</p>
			</div>

			{/* Stat cards */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				<StatCard label="Hari Ini" value={data.totals.today} />
				<StatCard label="Bulan Ini" value={data.totals.month} />
				<StatCard label="Total Keseluruhan" value={data.totals.all} />
				<StatCard
					label="Gagal Hari Ini"
					value={data.failedToday}
					accent={
						data.failedToday > 0 ? "text-red-600 dark:text-red-400" : undefined
					}
				/>
			</div>

			{/* Category breakdown with descriptions */}
			<div>
				<h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
					Email Keluar Digunakan Untuk
				</h2>
				<div className="grid sm:grid-cols-2 gap-4">
					{data.byCategory.map((cat) => {
						const info = CATEGORY_INFO[cat.category] || {
							label: cat.category,
							desc: "—",
							icon: LuMail,
							color: "text-gray-500 bg-gray-500/10",
						};
						const Icon = info.icon;
						return (
							<div
								key={cat.category}
								className="rounded-2xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-800/60 p-5"
							>
								<div className="flex items-start gap-3">
									<div
										className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${info.color}`}
									>
										<Icon className="w-5 h-5" />
									</div>
									<div className="flex-1">
										<div className="flex items-center justify-between gap-2">
											<h3 className="font-semibold text-gray-900 dark:text-white">
												{info.label}
											</h3>
											<span className="text-lg font-bold text-gray-900 dark:text-white">
												{cat.all.toLocaleString("id-ID")}
											</span>
										</div>
										<p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
											{info.desc}
										</p>
										<div className="mt-3 flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
											<span>Hari ini: {cat.today}</span>
											<span>Bulan ini: {cat.month}</span>
											{cat.failed > 0 && (
												<span className="text-red-500 flex items-center gap-1">
													<LuTriangleAlert className="w-3.5 h-3.5" />
													{cat.failed} gagal
												</span>
											)}
										</div>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* Recent log */}
			<div>
				<h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
					Email Terbaru
				</h2>
				<div className="rounded-2xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-800/60 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-gray-200 dark:border-gray-700/50 text-left text-gray-500 dark:text-gray-400">
									<th className="px-4 py-3 font-medium">Waktu</th>
									<th className="px-4 py-3 font-medium">Kategori</th>
									<th className="px-4 py-3 font-medium">Akun / Pembeli</th>
									<th className="px-4 py-3 font-medium">Status</th>
								</tr>
							</thead>
							<tbody>
								{data.recent.length === 0 ? (
									<tr>
										<td
											colSpan={4}
											className="px-4 py-8 text-center text-gray-400 dark:text-gray-500"
										>
											Belum ada email yang dikirim.
										</td>
									</tr>
								) : (
									data.recent.map((log) => (
										<tr
											key={log.id}
											className="border-b border-gray-100 dark:border-gray-700/30 last:border-0"
										>
											<td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
												{new Date(log.createdAt).toLocaleString("id-ID", {
													day: "2-digit",
													month: "short",
													hour: "2-digit",
													minute: "2-digit",
												})}
											</td>
											<td className="px-4 py-3 text-gray-700 dark:text-gray-200">
												{CATEGORY_INFO[log.category]?.label || log.category}
											</td>
											<td className="px-4 py-3">
												{log.recipientName && (
													<div className="text-gray-700 dark:text-gray-200 font-medium">
														{log.recipientName}
													</div>
												)}
												<div className="text-gray-500 dark:text-gray-400 text-xs">
													{log.recipient}
												</div>
											</td>
											<td className="px-4 py-3">
												<span
													className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
														log.status === "SENT"
															? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
															: "bg-red-500/10 text-red-600 dark:text-red-400"
													}`}
													title={log.error || undefined}
												>
													{log.status === "SENT" ? "Terkirim" : "Gagal"}
												</span>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	);
};

export default MailUsage;
