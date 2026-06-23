import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "react-router-dom";
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

interface EventGroup {
	key: string;
	label: string;
	province: string | null;
	coord: [number, number];
	events: MapEvent[];
}

// --- Tabel koordinat (lat, lng) untuk geocode lokasi event Indonesia ---
const CITY_COORDS: Record<string, [number, number]> = {
	semarang: [-6.9667, 110.4167],
	kediri: [-7.8166, 112.0114],
	tasikmalaya: [-7.3274, 108.2207],
	singkawang: [0.9028, 108.9847],
	sleman: [-7.7167, 110.3556],
	bogor: [-6.595, 106.8166],
	denpasar: [-8.65, 115.2167],
	malang: [-7.9797, 112.6304],
	"barito timur": [-2.18, 115.04],
	tangerang: [-6.1781, 106.63],
	jakarta: [-6.2, 106.8167],
	bandung: [-6.9147, 107.6098],
	surabaya: [-7.2575, 112.7521],
	yogyakarta: [-7.7956, 110.3695],
	medan: [3.5952, 98.6722],
	makassar: [-5.1477, 119.4327],
	palembang: [-2.9761, 104.7754],
	pontianak: [-0.0226, 109.3414],
	"palangka raya": [-2.2088, 113.9213],
	palangkaraya: [-2.2088, 113.9213],
	balikpapan: [-1.2379, 116.8529],
	samarinda: [-0.5022, 117.1536],
	pekanbaru: [0.5071, 101.4478],
	padang: [-0.9471, 100.4172],
	manado: [1.4748, 124.8421],
	banjarmasin: [-3.3186, 114.5944],
	mataram: [-8.5833, 116.1167],
	kupang: [-10.1772, 123.6073],
	jayapura: [-2.5337, 140.7181],
	ambon: [-3.6954, 128.1814],
};

const PROVINCE_COORDS: Record<string, [number, number]> = {
	"dki jakarta": [-6.2, 106.8167],
	"jawa barat": [-6.9, 107.6],
	"jawa tengah": [-7.15, 110.14],
	"jawa timur": [-7.54, 112.23],
	"di yogyakarta": [-7.8, 110.37],
	"daerah istimewa yogyakarta": [-7.8, 110.37],
	yogyakarta: [-7.8, 110.37],
	banten: [-6.45, 106.13],
	bali: [-8.45, 115.18],
	"kalimantan barat": [-0.0226, 109.3414],
	"kalimantan tengah": [-2.2088, 113.9213],
	"kalimantan selatan": [-3.3186, 114.5944],
	"kalimantan timur": [-0.5022, 117.1536],
	"kalimantan utara": [2.8, 116.0],
	"sumatera utara": [3.5952, 98.6722],
	"sumatera barat": [-0.9471, 100.4172],
	"sumatera selatan": [-2.9761, 104.7754],
	"riau": [0.5071, 101.4478],
	"kepulauan riau": [0.9, 104.45],
	jambi: [-1.6101, 103.6131],
	bengkulu: [-3.8004, 102.2655],
	lampung: [-5.45, 105.2667],
	aceh: [5.5483, 95.3238],
	"bangka belitung": [-2.13, 106.11],
	"sulawesi selatan": [-5.1477, 119.4327],
	"sulawesi utara": [1.4748, 124.8421],
	"sulawesi tengah": [-0.9, 119.87],
	"sulawesi tenggara": [-3.99, 122.51],
	"sulawesi barat": [-2.68, 118.9],
	gorontalo: [0.5435, 123.0568],
	"nusa tenggara barat": [-8.5833, 116.1167],
	"nusa tenggara timur": [-10.1772, 123.6073],
	maluku: [-3.6954, 128.1814],
	"maluku utara": [0.7, 127.4],
	papua: [-2.5337, 140.7181],
	"papua barat": [-0.86, 134.06],
};

const norm = (s: string) => s.toLowerCase().trim();
const cityKey = (s: string) => norm(s).replace(/^(kota|kabupaten|kab\.?)\s+/i, "").trim();

const geocode = (city: string | null, province: string | null): [number, number] | null => {
	if (city) {
		const c = CITY_COORDS[cityKey(city)];
		if (c) return c;
	}
	if (province) {
		const p = PROVINCE_COORDS[norm(province)];
		if (p) return p;
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

/** Sesuaikan viewport peta agar semua titik terlihat. */
const FitBounds: React.FC<{ coords: [number, number][] }> = ({ coords }) => {
	const map = useMap();
	useEffect(() => {
		if (coords.length === 0) return;
		if (coords.length === 1) {
			map.setView(coords[0]!, 6);
			return;
		}
		map.fitBounds(coords as LatLngBoundsExpression, { padding: [48, 48], maxZoom: 7 });
	}, [coords, map]);
	return null;
};

const EventSpreadMap: React.FC = () => {
	const [events, setEvents] = useState<MapEvent[]>([]);
	const [loading, setLoading] = useState(true);
	const [selected, setSelected] = useState<EventGroup | null>(null);

	const isDark =
		typeof document !== "undefined" && document.documentElement.classList.contains("dark");

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

	// Kelompokkan event per lokasi + offset titik yang bertumpuk.
	const groups = useMemo<EventGroup[]>(() => {
		const map = new Map<string, EventGroup>();
		for (const ev of events) {
			const coord = geocode(ev.city, ev.province);
			if (!coord) continue;
			const key = `${cityKey(ev.city || "")}|${norm(ev.province || "")}`;
			const label = ev.city || ev.province || "Indonesia";
			const existing = map.get(key);
			if (existing) existing.events.push(ev);
			else map.set(key, { key, label, province: ev.province, coord, events: [ev] });
		}

		// Offset grup yang punya koordinat identik (mis. fallback provinsi sama).
		const byCoord = new Map<string, EventGroup[]>();
		for (const g of map.values()) {
			const k = g.coord.join(",");
			byCoord.set(k, [...(byCoord.get(k) || []), g]);
		}
		for (const list of byCoord.values()) {
			if (list.length < 2) continue;
			list.forEach((g, i) => {
				const angle = (i / list.length) * Math.PI * 2;
				g.coord = [g.coord[0] + Math.sin(angle) * 0.5, g.coord[1] + Math.cos(angle) * 0.5];
			});
		}
		return [...map.values()];
	}, [events]);

	const allCoords = useMemo(() => groups.map((g) => g.coord), [groups]);
	const totalEvents = groups.reduce((sum, g) => sum + g.events.length, 0);

	const tileUrl = isDark
		? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
		: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

	if (loading) {
		return (
			<div className="h-[460px] w-full animate-pulse rounded-3xl border border-gray-200/70 bg-white/60 dark:border-white/[0.07] dark:bg-white/[0.03]" />
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

	return (
		<div className="relative overflow-hidden rounded-3xl border border-gray-200/70 shadow-xl shadow-gray-900/[0.06] dark:border-white/[0.08] dark:shadow-black/30">
			{/* Badge ringkasan */}
			<div className="pointer-events-none absolute left-4 top-4 z-[500] rounded-2xl border border-white/60 bg-white/85 px-4 py-2.5 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-[#13131c]/85">
				<p className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
					Sebaran Kolaborasi
				</p>
				<p className="text-lg font-black text-slate-900 dark:text-white">
					{totalEvents} Event · {groups.length} Lokasi
				</p>
			</div>

			<MapContainer
				center={[-2.3, 117.5]}
				zoom={4}
				scrollWheelZoom={false}
				className="h-[460px] w-full md:h-[540px]"
				style={{ background: isDark ? "#0b0b14" : "#e8edf2" }}
			>
				<TileLayer
					url={tileUrl}
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
				/>
				<FitBounds coords={allCoords} />

				{groups.map((g) => {
					const isActive = selected?.key === g.key;
					const radius = Math.min(18, 8 + g.events.length * 2);
					return (
						<React.Fragment key={g.key}>
							{/* halo */}
							<CircleMarker
								center={g.coord}
								radius={radius + 6}
								pathOptions={{
									color: "transparent",
									fillColor: "#ef4444",
									fillOpacity: isActive ? 0.28 : 0.16,
								}}
							/>
							{/* titik inti */}
							<CircleMarker
								center={g.coord}
								radius={radius}
								pathOptions={{
									color: "#ffffff",
									weight: 2,
									fillColor: isActive ? "#b91c1c" : "#ef4444",
									fillOpacity: 1,
								}}
								eventHandlers={{ click: () => setSelected(g) }}
							/>
						</React.Fragment>
					);
				})}
			</MapContainer>

			{/* Panel detail event */}
			{selected && (
				<div className="absolute bottom-4 right-4 z-[500] max-h-[80%] w-[min(20rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-gray-200/80 bg-white/95 shadow-2xl backdrop-blur-md dark:border-white/10 dark:bg-[#13131c]/95">
					<div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3 dark:border-white/[0.06]">
						<div className="flex min-w-0 items-center gap-1.5">
							<LuMapPin className="h-4 w-4 shrink-0 text-red-500" />
							<p className="truncate text-sm font-bold text-slate-900 dark:text-white">
								{selected.label}
							</p>
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
		</div>
	);
};

export default EventSpreadMap;
