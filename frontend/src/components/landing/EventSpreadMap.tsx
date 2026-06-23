import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import IndonesiaMap from "@svg-maps/indonesia";
import { LuMapPin, LuCalendar, LuX, LuArrowUpRight, LuTicket } from "react-icons/lu";
import { api } from "../../utils/api";
import { config } from "../../utils/config";

interface MapEvent {
	id: string;
	title: string;
	slug: string | null;
	thumbnail: string | null;
	startDate: string;
	endDate: string | null;
	city: string | null;
	province: string | null;
	venue: string | null;
	status: string;
}

interface ProvinceGroup {
	provinceId: string; // id-jb, id-jt, ...
	label: string; // nama provinsi event
	events: MapEvent[];
}

// --- Pemetaan nama provinsi (DB) -> id provinsi pada @svg-maps/indonesia ---
const norm = (s: string) =>
	s
		.toLowerCase()
		.trim()
		.replace(/^provinsi\s+/, "")
		.replace(/^dki\s+/, "")
		.replace(/^di\s+/, "")
		.replace(/^daerah istimewa\s+/, "");

// Lookup nama (ternormalisasi) -> id, dibangun dari data peta + alias.
const NAME_TO_ID: Record<string, string> = (() => {
	const map: Record<string, string> = {};
	for (const loc of IndonesiaMap.locations) map[norm(loc.name)] = loc.id;
	// alias variasi penulisan
	map["jakarta"] = "id-jk";
	map["dki jakarta"] = "id-jk";
	map["jakarta raya"] = "id-jk";
	map["yogyakarta"] = "id-yo";
	map["di yogyakarta"] = "id-yo";
	map["daerah istimewa yogyakarta"] = "id-yo";
	map["bangka belitung"] = "id-bb";
	map["kepulauan bangka belitung"] = "id-bb";
	return map;
})();

// Fallback: tebak provinsi dari kota untuk event tanpa field province.
const CITY_TO_PROVINCE_ID: Record<string, string> = {
	semarang: "id-jt",
	"kota semarang": "id-jt",
	kediri: "id-ji",
	malang: "id-ji",
	"kota malang": "id-ji",
	surabaya: "id-ji",
	tasikmalaya: "id-jb",
	bogor: "id-jb",
	bandung: "id-jb",
	bekasi: "id-jb",
	depok: "id-jb",
	singkawang: "id-kb",
	"kota singkawang": "id-kb",
	pontianak: "id-kb",
	sleman: "id-yo",
	bantul: "id-yo",
	denpasar: "id-ba",
	"kota denpasar": "id-ba",
	"barito timur": "id-kt",
	"palangka raya": "id-kt",
	tangerang: "id-bt",
	"kota tangerang": "id-bt",
	serang: "id-bt",
};

const resolveProvinceId = (ev: MapEvent): string | null => {
	if (ev.province) {
		const id = NAME_TO_ID[norm(ev.province)];
		if (id) return id;
	}
	if (ev.city) {
		const id = CITY_TO_PROVINCE_ID[norm(ev.city)];
		if (id) return id;
	}
	return null;
};

const resolveThumb = (url: string | null): string => {
	if (!url) return "";
	if (url.startsWith("http://") || url.startsWith("https://")) return url;
	return `${config.api.backendUrl}${url}`;
};

const formatDate = (iso: string) =>
	new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

const statusTone = (status: string): string => {
	switch (status?.toUpperCase()) {
		case "ONGOING":
			return "bg-emerald-500";
		case "PUBLISHED":
			return "bg-blue-500";
		case "COMPLETED":
			return "bg-slate-500";
		default:
			return "bg-red-500";
	}
};

const EventSpreadMap: React.FC = () => {
	const [events, setEvents] = useState<MapEvent[]>([]);
	const [loading, setLoading] = useState(true);
	const [selected, setSelected] = useState<ProvinceGroup | null>(null);
	const [centroids, setCentroids] = useState<Record<string, { cx: number; cy: number }>>({});

	const pathRefs = useRef<Map<string, SVGPathElement>>(new Map());

	useEffect(() => {
		let cancelled = false;
		api
			.get("/events/public/map", { silent: true })
			.then((res) => {
				if (!cancelled) setEvents(Array.isArray(res.data?.data) ? res.data.data : []);
			})
			.catch(() => {
				if (!cancelled) setEvents([]);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	// Kelompokkan event per provinsi.
	const groups = useMemo<ProvinceGroup[]>(() => {
		const map = new Map<string, ProvinceGroup>();
		for (const ev of events) {
			const provinceId = resolveProvinceId(ev);
			if (!provinceId) continue;
			const existing = map.get(provinceId);
			if (existing) existing.events.push(ev);
			else map.set(provinceId, { provinceId, label: ev.province || ev.city || "Indonesia", events: [ev] });
		}
		return [...map.values()];
	}, [events]);

	const activeProvinceIds = useMemo(() => new Set(groups.map((g) => g.provinceId)), [groups]);

	// Hitung centroid (pusat bounding box) tiap provinsi ber-event dari path SVG.
	useLayoutEffect(() => {
		if (groups.length === 0) return;
		const next: Record<string, { cx: number; cy: number }> = {};
		for (const g of groups) {
			const el = pathRefs.current.get(g.provinceId);
			if (!el) continue;
			try {
				const box = el.getBBox();
				next[g.provinceId] = { cx: box.x + box.width / 2, cy: box.y + box.height / 2 };
			} catch {
				/* getBBox bisa gagal jika belum ter-render */
			}
		}
		setCentroids(next);
	}, [groups]);

	const totalEvents = groups.reduce((sum, g) => sum + g.events.length, 0);

	if (loading) {
		return (
			<div className="h-[420px] w-full animate-pulse rounded-3xl border border-gray-200/70 bg-white/60 dark:border-white/[0.07] dark:bg-white/[0.03]" />
		);
	}

	if (groups.length === 0) {
		return (
			<div className="rounded-3xl border border-dashed border-gray-300/70 bg-white/60 p-12 text-center dark:border-white/[0.1] dark:bg-white/[0.02]">
				<LuMapPin className="mx-auto mb-3 h-8 w-8 text-red-500" />
				<p className="text-sm text-gray-500 dark:text-gray-400">
					Belum ada event kolaborasi yang terpetakan.
				</p>
			</div>
		);
	}

	// Radius titik dalam satuan viewBox (793x288) — kecil agar proporsional.
	const dotRadius = (count: number) => Math.min(7, 3.5 + count * 0.9);

	return (
		<div className="relative overflow-hidden rounded-3xl border border-gray-200/70 bg-gradient-to-b from-sky-50 to-white p-4 shadow-xl shadow-gray-900/[0.06] dark:border-white/[0.08] dark:from-[#0e0e16] dark:to-[#0b0b12] dark:shadow-black/30 sm:p-6">
			{/* Badge ringkasan — mengalir di atas peta pada mobile, overlay pada sm+ */}
			<div className="mb-3 inline-block rounded-2xl border border-white/60 bg-white/85 px-4 py-2.5 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-[#13131c]/85 sm:absolute sm:left-5 sm:top-5 sm:z-20 sm:mb-0">
				<p className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
					Sebaran Kolaborasi
				</p>
				<p className="text-base font-black text-slate-900 dark:text-white sm:text-lg">
					{totalEvents} Event · {groups.length} Provinsi
				</p>
			</div>

			{/* Peta SVG statis — bisa digeser horizontal di layar sempit */}
			<div className="-mx-1 overflow-x-auto pb-1 sm:mx-0 sm:overflow-visible [scrollbar-width:thin]">
			<svg
				viewBox={IndonesiaMap.viewBox}
				className="mx-auto h-auto w-full min-w-[34rem] sm:min-w-0"
				role="img"
				aria-label="Peta sebaran event kolaborasi Simpaskor di Indonesia"
			>
				{/* Provinsi */}
				{IndonesiaMap.locations.map((loc) => {
					const isActive = activeProvinceIds.has(loc.id);
					return (
						<path
							key={loc.id}
							ref={(el) => {
								if (el) pathRefs.current.set(loc.id, el);
							}}
							d={loc.path}
							className={
								isActive
									? "fill-red-200 stroke-white dark:fill-red-500/30 dark:stroke-[#0b0b12]"
									: "fill-slate-200 stroke-white dark:fill-white/[0.06] dark:stroke-[#0b0b12]"
							}
							strokeWidth={0.4}
						/>
					);
				})}

				{/* Titik event */}
				{groups.map((g) => {
					const c = centroids[g.provinceId];
					if (!c) return null;
					const isSel = selected?.provinceId === g.provinceId;
					const r = dotRadius(g.events.length);
					return (
						<g
							key={g.provinceId}
							className="cursor-pointer"
							onClick={() => setSelected(g)}
							style={{ pointerEvents: "all" }}
						>
							<circle cx={c.cx} cy={c.cy} r={r + 3.5} className="fill-red-500/25" />
							<circle
								cx={c.cx}
								cy={c.cy}
								r={r}
								className={isSel ? "fill-red-700" : "fill-red-500"}
								stroke="#ffffff"
								strokeWidth={1}
							/>
							{g.events.length > 1 && (
								<text
									x={c.cx}
									y={c.cy}
									textAnchor="middle"
									dominantBaseline="central"
									className="pointer-events-none select-none fill-white font-bold"
									style={{ fontSize: r * 1.1 }}
								>
									{g.events.length}
								</text>
							)}
						</g>
					);
				})}
			</svg>
			</div>

			{/* Panel detail event */}
			{selected && (
				<div className="absolute inset-x-3 bottom-3 z-30 mx-auto max-h-[70%] w-auto overflow-y-auto rounded-2xl border border-gray-200/80 bg-white/95 shadow-2xl backdrop-blur-md dark:border-white/10 dark:bg-[#13131c]/95 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[20rem]">
					<div className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-white/[0.06] dark:bg-[#13131c]/95">
						<div className="flex items-start justify-between gap-2">
							<div className="flex min-w-0 items-center gap-1.5">
								<LuMapPin className="h-4 w-4 shrink-0 text-red-500" />
								<p className="truncate text-sm font-bold text-slate-900 dark:text-white">{selected.label}</p>
								<span className="shrink-0 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
									{selected.events.length} event
								</span>
							</div>
							<button
								type="button"
								onClick={() => setSelected(null)}
								aria-label="Tutup"
								className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/[0.06]"
							>
								<LuX className="h-4 w-4" />
							</button>
						</div>
						<p className="mt-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
							{selected.events.length > 1
								? "Lihat semua event di wilayah ini"
								: "Event di wilayah ini"}
						</p>
					</div>
					<div className="divide-y divide-gray-100 dark:divide-white/[0.06]">
						{selected.events.map((ev) => {
							const thumb = resolveThumb(ev.thumbnail);
							const card = (
								<div className="flex gap-3 p-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03]">
									<div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-white/[0.06]">
										{thumb ? (
											<img src={thumb} alt={ev.title} className="h-full w-full object-cover" />
										) : (
											<div className="grid h-full w-full place-items-center text-gray-300 dark:text-gray-600">
												<LuTicket className="h-5 w-5" />
											</div>
										)}
									</div>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-1.5">
											<span className={`h-1.5 w-1.5 rounded-full ${statusTone(ev.status)}`} />
											<span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
												{ev.status}
											</span>
										</div>
										<p className="mt-0.5 line-clamp-2 text-sm font-bold leading-snug text-slate-900 dark:text-white">
											{ev.title}
										</p>
										<p className="mt-1 flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
											<LuCalendar className="h-3 w-3" />
											{formatDate(ev.startDate)}
											{ev.city ? ` · ${ev.city}` : ""}
										</p>
									</div>
									{ev.slug && (
										<LuArrowUpRight className="h-4 w-4 shrink-0 self-center text-gray-300 dark:text-gray-600" />
									)}
								</div>
							);
							return ev.slug ? (
								<Link key={ev.id} to={`/events/${ev.slug}`} className="block">
									{card}
								</Link>
							) : (
								<div key={ev.id}>{card}</div>
							);
						})}
					</div>
				</div>
			)}

			{/* Hint */}
			<p className="mt-2 text-center text-[11px] text-gray-400 dark:text-gray-600">
				Klik titik merah untuk melihat event di provinsi tersebut.
			</p>
		</div>
	);
};

export default EventSpreadMap;
