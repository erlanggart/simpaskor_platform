import React, { useCallback, useEffect, useState } from "react";
import {
	LuShieldAlert,
	LuLockKeyhole,
	LuUserX,
	LuPlane,
	LuSmartphone,
	LuGlobe,
	LuTrash2,
	LuMapPin,
	LuRefreshCw,
	LuShieldCheck,
	LuChevronDown,
} from "react-icons/lu";
import { activityAPI } from "../../utils/api";
import { roleColor, fmtIp, fmt } from "../../utils/activityFormat";

const UserChip: React.FC<{ user?: any }> = ({ user }) => (
	<div className="min-w-0 text-left">
		<div className="font-medium text-gray-800 dark:text-white text-sm truncate">
			{user?.name || "—"}
		</div>
		<div className="flex items-center gap-1.5">
			<span
				className={`text-[10px] px-1.5 py-0.5 rounded ${roleColor(user?.role)}`}
			>
				{user?.role}
			</span>
			<span className="text-[11px] text-gray-400 truncate">{user?.email}</span>
		</div>
	</div>
);

const Card: React.FC<{
	title: string;
	icon: React.ReactNode;
	accent: string;
	count?: number;
	className?: string;
	children: React.ReactNode;
}> = ({ title, icon, accent, count, className = "", children }) => (
	<section
		className={`bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col ${className}`}
	>
		<div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 dark:border-white/10">
			<span
				className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 ${accent}`}
			>
				{icon}
			</span>
			<h3 className="font-semibold text-gray-800 dark:text-white text-sm flex-1">
				{title}
			</h3>
			{count != null && (
				<span className="text-xs font-medium text-gray-400">{count}</span>
			)}
		</div>
		<div className="flex-1 overflow-y-auto max-h-96">{children}</div>
	</section>
);

const Empty: React.FC<{ label: string }> = ({ label }) => (
	<div className="px-4 py-8 text-center text-gray-400 text-sm">{label}</div>
);

const Row: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<div className="px-4 py-2 text-[11px] text-gray-500 border-b border-gray-50 dark:border-white/5 last:border-0">
		{children}
	</div>
);

const Kpi: React.FC<{
	label: string;
	value: number;
	icon: React.ReactNode;
	gradient: string;
}> = ({ label, value, icon, gradient }) => (
	<div
		className={`rounded-2xl p-4 text-white shadow-lg flex items-center gap-4 ${gradient}`}
	>
		<span className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm shrink-0">
			{icon}
		</span>
		<div className="min-w-0">
			<div className="text-3xl font-bold leading-none">{value}</div>
			<div className="text-xs text-white/80 mt-1">{label}</div>
		</div>
	</div>
);

type Group = { user: any; items: any[] };

const groupByUser = (items: any[]): Group[] => {
	const map = new Map<string, Group>();
	for (const it of items) {
		const id = it.user?.id;
		if (!id) continue;
		const g = map.get(id) || { user: it.user, items: [] };
		g.items.push(it);
		map.set(id, g);
	}
	return [...map.values()].sort((a, b) => b.items.length - a.items.length);
};

// A card whose entries are grouped per user; each user is an accordion row.
// Clicking the user chip opens the full detail modal; the chevron expands the
// flagged events inline.
const AnomalyGroupCard: React.FC<{
	title: string;
	icon: React.ReactNode;
	accent: string;
	items: any[];
	emptyLabel: string;
	className?: string;
	renderItem: (item: any, i: number) => React.ReactNode;
	onOpenUser: (userId: string) => void;
}> = ({
	title,
	icon,
	accent,
	items,
	emptyLabel,
	className,
	renderItem,
	onOpenUser,
}) => {
	const groups = groupByUser(items);
	const [open, setOpen] = useState<string | null>(null);

	return (
		<Card
			title={title}
			icon={icon}
			accent={accent}
			count={groups.length}
			className={className}
		>
			{groups.length === 0 ? (
				<Empty label={emptyLabel} />
			) : (
				groups.map((g) => {
					const expanded = open === g.user.id;
					return (
						<div
							key={g.user.id}
							className="border-b border-gray-50 dark:border-white/5 last:border-0"
						>
							<div className="flex items-stretch">
								<button
									onClick={() => onOpenUser(g.user.id)}
									className="flex-1 min-w-0 text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 transition"
									title="Buka detail pengguna"
								>
									<UserChip user={g.user} />
								</button>
								<button
									onClick={() => setOpen(expanded ? null : g.user.id)}
									className="px-3 flex items-center gap-1.5 text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition"
									aria-label="Lihat detail anomali"
								>
									<span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
										{g.items.length}
									</span>
									<LuChevronDown
										className={`w-4 h-4 transition-transform ${
											expanded ? "rotate-180" : ""
										}`}
									/>
								</button>
							</div>
							{expanded && (
								<div className="bg-gray-50 dark:bg-white/[0.03]">
									{g.items.map(renderItem)}
									<button
										onClick={() => onOpenUser(g.user.id)}
										className="w-full text-left px-4 py-2 text-[11px] font-medium text-red-600 hover:underline"
									>
										Pantau pengguna ini →
									</button>
								</div>
							)}
						</div>
					);
				})
			)}
		</Card>
	);
};

const SecurityMonitor: React.FC<{ onOpenUser: (userId: string) => void }> = ({
	onOpenUser,
}) => {
	const [data, setData] = useState<Awaited<
		ReturnType<typeof activityAPI.getSecurity>
	> | null>(null);
	const [loading, setLoading] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			setData(await activityAPI.getSecurity());
		} catch {
			setData(null);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const stats = data?.stats;
	const a = data?.anomalies;

	return (
		<div className="space-y-4">
			{/* Toolbar */}
			<div className="flex items-center justify-between">
				<p className="text-sm text-gray-500">
					Ringkasan keamanan 24 jam &amp; anomali 7 hari terakhir
				</p>
				<button
					onClick={load}
					className="px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 flex items-center gap-2 text-sm"
				>
					<LuRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
					Muat ulang
				</button>
			</div>

			{/* Bento grid */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 auto-rows-min">
				{/* KPI row */}
				<Kpi
					label="Login gagal (24 jam)"
					value={stats?.failedLogins24h ?? 0}
					icon={<LuShieldAlert className="w-6 h-6" />}
					gradient="bg-gradient-to-br from-rose-500 to-red-600"
				/>
				<Kpi
					label="Akses ditolak (24 jam)"
					value={stats?.accessDenied24h ?? 0}
					icon={<LuLockKeyhole className="w-6 h-6" />}
					gradient="bg-gradient-to-br from-amber-500 to-orange-600"
				/>
				<Kpi
					label="Akun berisiko"
					value={stats?.riskyAccounts ?? 0}
					icon={<LuUserX className="w-6 h-6" />}
					gradient="bg-gradient-to-br from-violet-500 to-purple-600"
				/>

				{/* Anomali: Lokasi / Device Baru (tall) */}
				<AnomalyGroupCard
					title="Lokasi / Device Baru"
					icon={<LuSmartphone className="w-4 h-4" />}
					accent="bg-blue-600"
					items={a?.newDevice ?? []}
					emptyLabel="Tidak ada"
					className="lg:row-span-2"
					onOpenUser={onOpenUser}
					renderItem={(d, i) => (
						<Row key={i}>
							<div className="flex items-center justify-between gap-2">
								<span className="flex flex-wrap gap-1.5">
									{d.newDevice && (
										<span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 flex items-center gap-1">
											<LuSmartphone className="w-3 h-3" />
											{d.deviceName || "Device baru"}
										</span>
									)}
									{d.newLocation && (
										<span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 flex items-center gap-1">
											<LuGlobe className="w-3 h-3" />
											{fmtIp(d.ipAddress)}
										</span>
									)}
								</span>
								<span className="text-gray-400 shrink-0">{fmt(d.at)}</span>
							</div>
							{d.locationLabel && (
								<div className="mt-0.5 text-gray-400 flex items-center gap-1">
									<LuMapPin className="w-3 h-3" />
									{d.locationLabel.split(",").slice(0, 2).join(",")}
								</div>
							)}
						</Row>
					)}
				/>

				{/* Anomali: Impossible Travel */}
				<AnomalyGroupCard
					title="Impossible Travel"
					icon={<LuPlane className="w-4 h-4" />}
					accent="bg-rose-600"
					items={a?.impossibleTravel ?? []}
					emptyLabel="Tidak ada"
					onOpenUser={onOpenUser}
					renderItem={(t, i) => (
						<Row key={i}>
							<div className="flex items-center justify-between gap-2">
								<span className="text-gray-500">
									{t.from.label || "?"} → {t.to.label || "?"}
								</span>
								<span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium shrink-0">
									{t.speedKmh.toLocaleString("id-ID")} km/j
								</span>
							</div>
							<div className="mt-0.5 text-gray-400">
								{t.distanceKm.toLocaleString("id-ID")} km · {t.hours} jam ·{" "}
								{fmt(t.to.at)}
							</div>
						</Row>
					)}
				/>

				{/* Anomali: Banyak IP */}
				<AnomalyGroupCard
					title="Banyak IP dalam 1 Akun (24 jam)"
					icon={<LuGlobe className="w-4 h-4" />}
					accent="bg-amber-600"
					items={a?.multiIp ?? []}
					emptyLabel="Tidak ada"
					onOpenUser={onOpenUser}
					renderItem={(m, i) => (
						<Row key={i}>
							<div className="flex items-center justify-between gap-2">
								<span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
									{m.ipCount} IP berbeda
								</span>
							</div>
							<div className="mt-0.5 text-gray-400 break-words">
								{m.ips.map(fmtIp).join(" · ")}
							</div>
						</Row>
					)}
				/>

				{/* Login Gagal */}
				<Card
					title="Login Gagal"
					icon={<LuShieldAlert className="w-4 h-4" />}
					accent="bg-red-600"
					count={data?.failedLogins.length}
				>
					{!data?.failedLogins.length ? (
						<Empty label="Tidak ada login gagal" />
					) : (
						data.failedLogins.map((l) => (
							<button
								key={l.id}
								onClick={() => l.user && onOpenUser(l.user.id)}
								className="w-full text-left px-4 py-2.5 border-b border-gray-50 dark:border-white/5 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5"
							>
								<div className="flex items-center justify-between gap-2">
									<UserChip user={l.user} />
									<span className="text-[11px] text-gray-400 shrink-0">
										{fmt(l.createdAt)}
									</span>
								</div>
								<div className="mt-1 text-[11px] text-gray-400 flex items-center gap-1">
									<LuGlobe className="w-3 h-3" /> {fmtIp(l.ipAddress)}
								</div>
							</button>
						))
					)}
				</Card>

				{/* Akses Ditolak */}
				<Card
					title="Akses Ditolak"
					icon={<LuLockKeyhole className="w-4 h-4" />}
					accent="bg-orange-600"
					count={data?.accessDenied.length}
				>
					{!data?.accessDenied.length ? (
						<Empty label="Tidak ada akses ditolak" />
					) : (
						data.accessDenied.map((l) => (
							<button
								key={l.id}
								onClick={() => l.user && onOpenUser(l.user.id)}
								className="w-full text-left px-4 py-2.5 border-b border-gray-50 dark:border-white/5 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5"
							>
								<div className="flex items-center justify-between gap-2">
									<UserChip user={l.user} />
									<span className="text-[11px] text-gray-400 shrink-0">
										{fmt(l.createdAt)}
									</span>
								</div>
								<div className="mt-1 text-[11px] text-gray-500 truncate">
									<span className="font-mono text-gray-400">{l.method}</span>{" "}
									{l.path}
								</div>
							</button>
						))
					)}
				</Card>

				{/* Hapus Massal — wide tile */}
				<Card
					title="Aktivitas Mencurigakan — Hapus Massal (24 jam)"
					icon={<LuTrash2 className="w-4 h-4" />}
					accent="bg-rose-600"
					count={data?.massDelete.length}
					className="lg:col-span-3"
				>
					{!data?.massDelete.length ? (
						<div className="px-4 py-8 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
							<LuShieldCheck className="w-6 h-6 text-green-500" />
							Tidak ada penghapusan massal terdeteksi
						</div>
					) : (
						data.massDelete.map((m, i) => (
							<button
								key={i}
								onClick={() => m.user && onOpenUser(m.user.id)}
								className="w-full text-left px-4 py-2.5 border-b border-gray-50 dark:border-white/5 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5"
							>
								<div className="flex items-center justify-between gap-2">
									<UserChip user={m.user} />
									<div className="flex items-center gap-2 shrink-0">
										<span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
											{m.count}× hapus
										</span>
										<span className="text-[11px] text-gray-400">
											{fmt(m.lastAt)}
										</span>
									</div>
								</div>
								<div className="mt-1 space-y-0.5">
									{m.samples.map((s: any, j: number) => (
										<div key={j} className="text-[11px] text-gray-500 truncate">
											• {s.description || s.path}
										</div>
									))}
								</div>
							</button>
						))
					)}
				</Card>
			</div>
		</div>
	);
};

export default SecurityMonitor;
