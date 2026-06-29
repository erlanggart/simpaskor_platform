import React, { useEffect, useState } from "react";
import {
	LuActivity,
	LuMapPin,
	LuMonitor,
	LuGlobe,
	LuShield,
	LuExternalLink,
	LuShieldAlert,
	LuLockKeyhole,
} from "react-icons/lu";
import { activityAPI } from "../../utils/api";
import {
	actionColor,
	fmtIp,
	accuracyLabel,
	accuracyClass,
	fmt,
} from "../../utils/activityFormat";

type Section = "logs" | "sessions" | "security";

// Embedded panel: the per-user activity / session / security monitor,
// rendered inline inside the User Detail page (no modal overlay).
const UserActivityPanel: React.FC<{ userId: string }> = ({ userId }) => {
	const [data, setData] = useState<Awaited<
		ReturnType<typeof activityAPI.getUserDetail>
	> | null>(null);
	const [loading, setLoading] = useState(true);
	const [section, setSection] = useState<Section>("logs");

	useEffect(() => {
		let active = true;
		setLoading(true);
		activityAPI
			.getUserDetail(userId)
			.then((res) => active && setData(res))
			.catch(() => active && setData(null))
			.finally(() => active && setLoading(false));
		return () => {
			active = false;
		};
	}, [userId]);

	const logs = data?.logs ?? [];
	const sessions = data?.sessions ?? [];
	const failedLogins = data?.security.failedLogins ?? [];
	const accessDenied = data?.security.accessDenied ?? [];

	const sections: { key: Section; label: string; count: number }[] = [
		{ key: "logs", label: "Aktivitas", count: logs.length },
		{ key: "sessions", label: "Sesi & Lokasi", count: sessions.length },
		{
			key: "security",
			label: "Keamanan",
			count: failedLogins.length + accessDenied.length,
		},
	];

	return (
		<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow dark:shadow-gray-900/50">
			{/* Header */}
			<div className="p-5 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-3">
				<LuActivity className="w-5 h-5 text-red-600 dark:text-red-400" />
				<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
					Monitor Aktivitas Pengguna
				</h3>
				<div className="flex gap-1.5 ml-auto">
					{sections.map((s) => (
						<button
							key={s.key}
							onClick={() => setSection(s.key)}
							className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
								section === s.key
									? "bg-red-600 text-white"
									: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
							}`}
						>
							{s.label} ({s.count})
						</button>
					))}
				</div>
			</div>

			{/* Body */}
			<div className="p-4 max-h-[28rem] overflow-y-auto">
				{loading ? (
					<div className="py-16 text-center text-gray-400">Memuat…</div>
				) : section === "logs" ? (
					<LogsSection logs={logs} />
				) : section === "sessions" ? (
					<SessionsSection sessions={sessions} />
				) : (
					<SecuritySection
						failedLogins={failedLogins}
						accessDenied={accessDenied}
					/>
				)}
			</div>
		</div>
	);
};

const LogsSection: React.FC<{ logs: any[] }> = ({ logs }) =>
	logs.length === 0 ? (
		<Empty label="Belum ada aktivitas" />
	) : (
		<div className="space-y-1.5">
			{logs.map((log) => (
				<div
					key={log.id}
					className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50"
				>
					<span
						className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${actionColor(
							log.action
						)}`}
					>
						{log.action}
					</span>
					<div className="flex-1 min-w-0">
						<div className="text-sm text-gray-700 dark:text-gray-200 truncate">
							{log.description || log.path}
						</div>
						<div className="text-[11px] text-gray-400 flex items-center gap-2 flex-wrap">
							<span>{fmt(log.createdAt)}</span>
							{log.ipAddress && (
								<span className="flex items-center gap-1">
									<LuGlobe className="w-3 h-3" />
									{fmtIp(log.ipAddress)}
								</span>
							)}
							{log.session?.deviceName && (
								<span className="flex items-center gap-1">
									<LuMonitor className="w-3 h-3" />
									{log.session.deviceName}
								</span>
							)}
						</div>
					</div>
				</div>
			))}
		</div>
	);

const SessionsSection: React.FC<{ sessions: any[] }> = ({ sessions }) =>
	sessions.length === 0 ? (
		<Empty label="Tidak ada sesi" />
	) : (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
			{sessions.map((s) => {
				const expired = new Date(s.expiresAt).getTime() < Date.now();
				return (
					<div
						key={s.id}
						className="p-3 rounded-xl border border-gray-100 dark:border-gray-700"
					>
						<div className="flex items-center justify-between gap-2">
							<div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
								<LuMonitor className="w-4 h-4 text-gray-400" />
								{s.deviceName || "—"}
							</div>
							<span
								className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
									expired
										? "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
										: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
								}`}
							>
								{expired ? "Berakhir" : "Aktif"}
							</span>
						</div>
						<div className="mt-1 text-[11px] text-gray-400 flex items-center gap-1">
							<LuGlobe className="w-3 h-3" />
							{fmtIp(s.ipAddress)}
						</div>
						{s.latitude != null && (
							<div className="mt-1">
								<a
									href={`https://www.google.com/maps?q=${s.latitude},${s.longitude}`}
									target="_blank"
									rel="noreferrer"
									className="inline-flex items-center gap-1 text-red-600 hover:underline text-xs"
								>
									<LuMapPin className="w-3.5 h-3.5" />
									{s.locationLabel
										? s.locationLabel.split(",").slice(0, 3).join(",")
										: "Lihat peta"}
									<LuExternalLink className="w-3 h-3" />
								</a>
								{s.accuracy != null && (
									<div
										className={`text-[11px] mt-0.5 ${accuracyClass(s.accuracy)}`}
									>
										{accuracyLabel(s.accuracy)}
									</div>
								)}
							</div>
						)}
						<div className="mt-1 text-[11px] text-gray-400">
							Aktif terakhir: {fmt(s.lastActive)}
						</div>
					</div>
				);
			})}
		</div>
	);

const SecuritySection: React.FC<{
	failedLogins: any[];
	accessDenied: any[];
}> = ({ failedLogins, accessDenied }) => (
	<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
		<div>
			<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1.5 mb-2">
				<LuShieldAlert className="w-4 h-4 text-rose-600" /> Login Gagal (
				{failedLogins.length})
			</h4>
			{failedLogins.length === 0 ? (
				<Empty label="Tidak ada" />
			) : (
				<div className="space-y-1.5">
					{failedLogins.map((l) => (
						<div
							key={l.id}
							className="text-[11px] text-gray-500 flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10"
						>
							<span className="flex items-center gap-1">
								<LuGlobe className="w-3 h-3" /> {fmtIp(l.ipAddress)}
							</span>
							<span className="text-gray-400">{fmt(l.createdAt)}</span>
						</div>
					))}
				</div>
			)}
		</div>
		<div>
			<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1.5 mb-2">
				<LuLockKeyhole className="w-4 h-4 text-orange-600" /> Akses Ditolak (
				{accessDenied.length})
			</h4>
			{accessDenied.length === 0 ? (
				<Empty label="Tidak ada" />
			) : (
				<div className="space-y-1.5">
					{accessDenied.map((l) => (
						<div
							key={l.id}
							className="text-[11px] text-gray-500 px-2 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-500/10"
						>
							<div className="truncate">
								<span className="font-mono text-gray-400">{l.method}</span>{" "}
								{l.path}
							</div>
							<div className="text-gray-400">{fmt(l.createdAt)}</div>
						</div>
					))}
				</div>
			)}
		</div>
	</div>
);

const Empty: React.FC<{ label: string }> = ({ label }) => (
	<div className="py-8 text-center text-gray-400 text-sm flex items-center justify-center gap-2">
		<LuShield className="w-4 h-4" />
		{label}
	</div>
);

export default UserActivityPanel;
