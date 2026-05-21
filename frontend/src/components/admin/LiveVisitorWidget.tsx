import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
	LuActivity,
	LuArrowUpRight,
	LuArrowDownRight,
	LuMinus,
	LuMonitor,
	LuRefreshCw,
	LuSmartphone,
	LuTablet,
	LuTrendingUp,
	LuUserCheck,
	LuUserRound,
	LuWifi,
} from "react-icons/lu";
import { api } from "../../utils/api";

type HistoryPoint = { t: number; count: number };

type LiveVisitorResponse = {
	active: number;
	guests: number;
	authed: number;
	devices: { mobile: number; tablet: number; desktop: number };
	byRole: { role: string; count: number }[];
	topPages: { page: string; count: number }[];
	history: HistoryPoint[];
	peak: { count: number; at: number | null };
	ttlMs: number;
	snapshotIntervalMs: number;
	windowMs: number;
	now: number;
};

const POLL_INTERVAL_MS = 5_000;

const formatPageLabel = (path: string): string => {
	if (!path || path === "/") return "Beranda";
	const parts = (path.split("?")[0] ?? "").split("/").filter(Boolean);
	if (parts.length === 0) return "Beranda";
	const label = parts.map((p) => decodeURIComponent(p).replace(/-/g, " ")).join(" › ");
	return label.charAt(0).toUpperCase() + label.slice(1);
};

const roleLabel = (role: string): string => {
	const map: Record<string, string> = {
		SUPERADMIN: "Super Admin",
		PANITIA: "Panitia",
		JURI: "Juri",
		PESERTA: "Peserta",
		PELATIH: "Pelatih",
		MITRA: "Mitra",
	};
	return map[role] || role.charAt(0) + role.slice(1).toLowerCase();
};

// Build a smooth SVG path for an area chart (Catmull-Rom-ish using cubic
// approximations). Keeps the visual modern without pulling in a chart lib.
type Point = { x: number; y: number };

const buildAreaPath = (
	points: Point[],
	height: number
): { line: string; area: string } => {
	const first = points[0];
	if (!first) return { line: "", area: "" };
	if (points.length === 1) {
		return {
			line: `M ${first.x} ${first.y}`,
			area: `M ${first.x} ${height} L ${first.x} ${first.y} L ${first.x} ${height} Z`,
		};
	}
	const tension = 0.35;
	let line = `M ${first.x} ${first.y}`;
	for (let i = 0; i < points.length - 1; i += 1) {
		const p1 = points[i] as Point;
		const p2 = points[i + 1] as Point;
		const p0 = points[i - 1] ?? p1;
		const p3 = points[i + 2] ?? p2;
		const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension * 4;
		const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension * 4;
		const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension * 4;
		const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension * 4;
		line += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
	}
	const last = points[points.length - 1] as Point;
	const area = `${line} L ${last.x} ${height} L ${first.x} ${height} Z`;
	return { line, area };
};

const Sparkline: React.FC<{ history: HistoryPoint[]; nowTs: number; windowMs: number }> = ({
	history,
	nowTs,
	windowMs,
}) => {
	const width = 520;
	const height = 140;
	const padX = 8;
	const padY = 12;

	const { line, area, gridLines, maxCount, lastPoint } = useMemo(() => {
		// Trim to window
		const fromTs = nowTs - windowMs;
		const pts = history.filter((p) => p.t >= fromTs);
		const counts = pts.map((p) => p.count);
		const maxRaw = counts.length ? Math.max(...counts) : 0;
		const max = Math.max(maxRaw, 3); // never collapse to zero baseline
		const innerW = width - padX * 2;
		const innerH = height - padY * 2;
		const points = pts.map((p) => {
			const xRatio = (p.t - fromTs) / windowMs;
			const yRatio = max === 0 ? 0 : p.count / max;
			return { x: padX + xRatio * innerW, y: padY + (1 - yRatio) * innerH };
		});
		const path = buildAreaPath(points, height - padY);
		// 3 horizontal gridlines
		const grid = [0.25, 0.5, 0.75].map((r) => padY + r * innerH);
		return {
			line: path.line,
			area: path.area,
			gridLines: grid,
			maxCount: max,
			lastPoint: points[points.length - 1] || null,
		};
	}, [history, nowTs, windowMs]);

	return (
		<div className="relative w-full">
			<svg
				viewBox={`0 0 ${width} ${height}`}
				preserveAspectRatio="none"
				className="w-full h-32 sm:h-36"
				role="img"
				aria-label="Grafik pengunjung aktif 1 jam terakhir"
			>
				<defs>
					<linearGradient id="liveVisitorArea" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="rgb(220 38 38)" stopOpacity="0.55" />
						<stop offset="60%" stopColor="rgb(220 38 38)" stopOpacity="0.12" />
						<stop offset="100%" stopColor="rgb(220 38 38)" stopOpacity="0" />
					</linearGradient>
					<linearGradient id="liveVisitorLine" x1="0" y1="0" x2="1" y2="0">
						<stop offset="0%" stopColor="rgb(244 63 94)" />
						<stop offset="100%" stopColor="rgb(220 38 38)" />
					</linearGradient>
					<filter id="liveVisitorGlow" x="-20%" y="-20%" width="140%" height="140%">
						<feGaussianBlur stdDeviation="3" result="b" />
						<feMerge>
							<feMergeNode in="b" />
							<feMergeNode in="SourceGraphic" />
						</feMerge>
					</filter>
				</defs>

				{/* Gridlines */}
				{gridLines.map((y, i) => (
					<line
						key={i}
						x1={padX}
						x2={width - padX}
						y1={y}
						y2={y}
						stroke="currentColor"
						strokeOpacity="0.06"
						strokeDasharray="3 4"
						className="text-gray-600 dark:text-white"
					/>
				))}

				{/* Area + line */}
				<motion.path
					d={area}
					fill="url(#liveVisitorArea)"
					initial={false}
					animate={{ d: area }}
					transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
				/>
				<motion.path
					d={line}
					fill="none"
					stroke="url(#liveVisitorLine)"
					strokeWidth="2.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					filter="url(#liveVisitorGlow)"
					initial={false}
					animate={{ d: line }}
					transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
				/>

				{/* Trailing dot */}
				{lastPoint && (
					<g>
						<motion.circle
							cx={lastPoint.x}
							cy={lastPoint.y}
							r={9}
							fill="rgb(220 38 38)"
							opacity={0.35}
							animate={{ r: [9, 16, 9], opacity: [0.35, 0, 0.35] }}
							transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
						/>
						<circle cx={lastPoint.x} cy={lastPoint.y} r={4} fill="rgb(220 38 38)" />
						<circle cx={lastPoint.x} cy={lastPoint.y} r={2} fill="white" />
					</g>
				)}
			</svg>
			<div className="absolute top-1 right-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
				Puncak {maxCount}
			</div>
			<div className="absolute bottom-1 left-2 text-[10px] text-gray-400 dark:text-gray-500">60 mnt lalu</div>
			<div className="absolute bottom-1 right-2 text-[10px] text-gray-400 dark:text-gray-500">sekarang</div>
		</div>
	);
};

const Counter: React.FC<{ value: number }> = ({ value }) => {
	// Smoothly tween the displayed number when the live count changes.
	const [display, setDisplay] = useState(value);
	const rafRef = useRef<number | null>(null);
	const fromRef = useRef(value);
	const startRef = useRef(0);

	useEffect(() => {
		fromRef.current = display;
		startRef.current = performance.now();
		if (rafRef.current) cancelAnimationFrame(rafRef.current);

		const duration = 600;
		const animate = (now: number) => {
			const t = Math.min(1, (now - startRef.current) / duration);
			const eased = 1 - Math.pow(1 - t, 3);
			const next = Math.round(fromRef.current + (value - fromRef.current) * eased);
			setDisplay(next);
			if (t < 1) rafRef.current = requestAnimationFrame(animate);
		};
		rafRef.current = requestAnimationFrame(animate);
		return () => {
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
		};
		// We intentionally don't depend on `display` so we always interpolate from the latest rendered value
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [value]);

	return <span className="tabular-nums">{display.toLocaleString("id-ID")}</span>;
};

const TrendBadge: React.FC<{ history: HistoryPoint[] }> = ({ history }) => {
	const { delta, direction } = useMemo(() => {
		if (history.length < 4) return { delta: 0, direction: "flat" as const };
		const recent = history.slice(-3);
		const past = history.slice(-12, -9);
		const avg = (arr: HistoryPoint[]) => (arr.reduce((s, p) => s + p.count, 0) / arr.length) || 0;
		const a = avg(recent);
		const b = avg(past);
		const d = a - b;
		if (Math.abs(d) < 0.5) return { delta: 0, direction: "flat" as const };
		return { delta: d, direction: d > 0 ? ("up" as const) : ("down" as const) };
	}, [history]);

	const Icon = direction === "up" ? LuArrowUpRight : direction === "down" ? LuArrowDownRight : LuMinus;
	const tone =
		direction === "up"
			? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
			: direction === "down"
			? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
			: "bg-gray-100 text-gray-600 dark:bg-white/[0.05] dark:text-gray-400";

	const label =
		direction === "up"
			? `Naik ${Math.abs(delta).toFixed(1)}/mnt`
			: direction === "down"
			? `Turun ${Math.abs(delta).toFixed(1)}/mnt`
			: "Stabil";

	return (
		<span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
			<Icon className="w-3 h-3" />
			{label}
		</span>
	);
};

const DeviceBar: React.FC<{ devices: LiveVisitorResponse["devices"]; total: number }> = ({
	devices,
	total,
}) => {
	const items: { key: keyof LiveVisitorResponse["devices"]; label: string; color: string; icon: typeof LuMonitor }[] = [
		{ key: "mobile", label: "Mobile", color: "bg-red-500", icon: LuSmartphone },
		{ key: "desktop", label: "Desktop", color: "bg-orange-500", icon: LuMonitor },
		{ key: "tablet", label: "Tablet", color: "bg-amber-500", icon: LuTablet },
	];
	return (
		<div>
			<div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.05]">
				{items.map((it) => {
					const val = devices[it.key] || 0;
					const pct = total === 0 ? 0 : (val / total) * 100;
					return (
						<motion.div
							key={it.key}
							className={it.color}
							initial={false}
							animate={{ width: `${pct}%` }}
							transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
						/>
					);
				})}
			</div>
			<div className="mt-3 grid grid-cols-3 gap-2 text-xs">
				{items.map((it) => {
					const Icon = it.icon;
					const val = devices[it.key] || 0;
					return (
						<div
							key={it.key}
							className="flex items-center gap-2 rounded-lg border border-gray-200/60 bg-white/60 px-2 py-1.5 dark:border-white/[0.06] dark:bg-white/[0.03]"
						>
							<Icon className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
							<div className="min-w-0">
								<p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
									{it.label}
								</p>
								<p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{val}</p>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

const LiveVisitorWidget: React.FC = () => {
	const [data, setData] = useState<LiveVisitorResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [refreshing, setRefreshing] = useState(false);

	const fetchLive = async (silent = false) => {
		try {
			if (!silent) setRefreshing(true);
			// silent=true tells the global axios interceptor to skip the timeout
			// Swal — background pollers must never disrupt the UI.
			const res = await api.get<LiveVisitorResponse>("/visitors/live", {
				timeout: 15_000,
				silent: true,
			});
			setData(res.data);
			setError(null);
		} catch (err: any) {
			// Keep the last good snapshot on transient failures
			if (!data) {
				setError(err?.response?.data?.error || "Gagal memuat data pengunjung aktif");
			}
		} finally {
			if (!silent) setRefreshing(false);
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchLive();
		const handle = window.setInterval(() => fetchLive(true), POLL_INTERVAL_MS);
		return () => window.clearInterval(handle);
	}, []);

	if (loading && !data) {
		return (
			<div className="relative overflow-hidden rounded-3xl border border-gray-200/60 bg-white/70 p-6 shadow-sm backdrop-blur-xl dark:border-white/[0.06] dark:bg-white/[0.025]">
				<div className="animate-pulse space-y-4">
					<div className="h-4 w-32 rounded-full bg-gray-200 dark:bg-white/[0.08]" />
					<div className="h-12 w-40 rounded bg-gray-200 dark:bg-white/[0.08]" />
					<div className="h-32 w-full rounded-2xl bg-gray-100 dark:bg-white/[0.04]" />
				</div>
			</div>
		);
	}

	if (error && !data) {
		return (
			<div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-6 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
				{error}
			</div>
		);
	}

	if (!data) return null;

	const active = data.active;
	const total = (data.devices.mobile || 0) + (data.devices.tablet || 0) + (data.devices.desktop || 0);

	return (
		<div className="relative overflow-hidden rounded-3xl border border-gray-200/60 bg-gradient-to-br from-white via-white to-red-50/40 shadow-sm backdrop-blur-xl dark:border-white/[0.06] dark:from-[#0d1224] dark:via-[#0d1224] dark:to-red-900/10">
			{/* Decorative blobs */}
			<div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-red-500/10 blur-3xl dark:bg-red-500/15" />
			<div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-orange-500/10 blur-3xl dark:bg-orange-500/10" />

			<div className="relative p-5 sm:p-6">
				<div className="flex items-start justify-between gap-3 mb-5">
					<div>
						<div className="inline-flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-red-600 dark:text-red-300">
							<span className="relative inline-flex h-2 w-2">
								<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
								<span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
							</span>
							LIVE · Realtime
						</div>
						<h3 className="mt-2 text-lg font-bold text-gray-900 dark:text-white">
							Pengunjung Aktif
						</h3>
						<p className="text-xs text-gray-500 dark:text-gray-400">
							Sedang membuka website saat ini
						</p>
					</div>
					<button
						type="button"
						onClick={() => fetchLive()}
						className="inline-flex items-center gap-1.5 rounded-full border border-gray-200/70 bg-white/60 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-white hover:text-gray-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
						aria-label="Refresh"
					>
						<LuRefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
						Refresh
					</button>
				</div>

				<div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.4fr]">
					{/* Big counter */}
					<div className="flex flex-col justify-between rounded-2xl border border-gray-200/60 bg-white/70 p-5 dark:border-white/[0.06] dark:bg-white/[0.03]">
						<div>
							<div className="flex items-baseline gap-3">
								<motion.span
									key={active}
									initial={{ scale: 0.92, opacity: 0.6 }}
									animate={{ scale: 1, opacity: 1 }}
									transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
									className="text-5xl sm:text-6xl font-black tracking-tight text-gray-900 dark:text-white"
								>
									<Counter value={active} />
								</motion.span>
								<span className="text-sm font-medium text-gray-500 dark:text-gray-400">pengunjung</span>
							</div>
							<div className="mt-2 flex flex-wrap items-center gap-2">
								<TrendBadge history={data.history} />
								<span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:bg-white/[0.05] dark:text-gray-300">
									<LuTrendingUp className="w-3 h-3" />
									Puncak hari ini {data.peak.count}
								</span>
							</div>
						</div>

						<div className="mt-5 grid grid-cols-2 gap-2.5">
							<div className="rounded-xl bg-gradient-to-br from-red-500 to-red-600 px-3 py-2.5 text-white shadow-md shadow-red-500/25">
								<div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide opacity-80">
									<LuUserCheck className="w-3 h-3" />
									Login
								</div>
								<p className="mt-0.5 text-2xl font-black leading-tight tabular-nums">
									<Counter value={data.authed} />
								</p>
							</div>
							<div className="rounded-xl border border-gray-200/70 bg-white/70 px-3 py-2.5 dark:border-white/[0.08] dark:bg-white/[0.03]">
								<div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									<LuUserRound className="w-3 h-3" />
									Tamu
								</div>
								<p className="mt-0.5 text-2xl font-black leading-tight tabular-nums text-gray-900 dark:text-white">
									<Counter value={data.guests} />
								</p>
							</div>
						</div>
					</div>

					{/* Chart */}
					<div className="rounded-2xl border border-gray-200/60 bg-white/70 p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
						<div className="flex items-center justify-between gap-2 mb-1.5">
							<div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200">
								<LuActivity className="w-3.5 h-3.5 text-red-500" />
								Aktivitas 1 jam terakhir
							</div>
							<div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
								<LuWifi className="w-3 h-3" />
								Update tiap {Math.round(POLL_INTERVAL_MS / 1000)} dtk
							</div>
						</div>
						<Sparkline history={data.history} nowTs={data.now} windowMs={data.windowMs} />
					</div>
				</div>

				{/* Device + roles + pages */}
				<div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
					<div className="rounded-2xl border border-gray-200/60 bg-white/70 p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
						<p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
							Perangkat
						</p>
						<DeviceBar devices={data.devices} total={total} />
					</div>

					<div className="rounded-2xl border border-gray-200/60 bg-white/70 p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
						<p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
							Per Role
						</p>
						{data.byRole.length === 0 ? (
							<p className="text-xs text-gray-400 dark:text-gray-500">Semua tamu</p>
						) : (
							<ul className="space-y-1.5">
								<AnimatePresence initial={false}>
									{data.byRole.slice(0, 6).map((row) => (
										<motion.li
											key={row.role}
											initial={{ opacity: 0, y: 6 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, y: -6 }}
											transition={{ duration: 0.25 }}
											className="flex items-center justify-between text-sm"
										>
											<span className="text-gray-700 dark:text-gray-200">{roleLabel(row.role)}</span>
											<span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-bold text-red-600 dark:text-red-300 tabular-nums">
												{row.count}
											</span>
										</motion.li>
									))}
								</AnimatePresence>
							</ul>
						)}
					</div>

					<div className="rounded-2xl border border-gray-200/60 bg-white/70 p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
						<p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
							Halaman Teraktif
						</p>
						{data.topPages.length === 0 ? (
							<p className="text-xs text-gray-400 dark:text-gray-500">Belum ada aktivitas</p>
						) : (
							<ul className="space-y-1.5">
								<AnimatePresence initial={false}>
									{data.topPages.slice(0, 5).map((row) => (
										<motion.li
											key={row.page}
											initial={{ opacity: 0, y: 6 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, y: -6 }}
											transition={{ duration: 0.25 }}
											className="flex items-center justify-between gap-2 text-sm"
										>
											<span className="min-w-0 truncate text-gray-700 dark:text-gray-200">
												{formatPageLabel(row.page)}
											</span>
											<span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-700 dark:bg-white/[0.06] dark:text-gray-200 tabular-nums">
												{row.count}
											</span>
										</motion.li>
									))}
								</AnimatePresence>
							</ul>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default LiveVisitorWidget;
