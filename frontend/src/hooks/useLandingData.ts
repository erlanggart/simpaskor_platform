import { useState, useEffect } from "react";
import { api } from "../utils/api";
import { Event } from "../types/landing";

interface PinnedEvent {
	id: string;
	title: string;
	description: string | null;
	thumbnail: string | null;
	slug: string | null;
	startDate: string;
	endDate: string;
	location: string | null;
	venue: string | null;
	pinnedOrder: number | null;
}

interface Juri {
	id: string;
	name: string;
	avatar: string | null;
	institution: string | null;
}

interface Pelatih {
	id: string;
	name: string;
	avatar: string | null;
	institution: string | null;
}

interface PublicStats {
	juriCount: number;
	pesertaCount: number;
	eventsCount: number;
	availableEventsCount: number;
	completedEventsCount: number;
	todayVisitors: number;
}

export interface KlasemenEntry {
	schoolName: string;
	avatar: string | null;
	wins: number;
	participated?: number;
	events?: { title: string; slug: string | null; date: string }[];
}

export interface KlasemenData {
	year: number;
	top5: KlasemenEntry[];
	full: KlasemenEntry[];
	totalEvents: number;
}

interface UseLandingDataReturn {
	pinnedEvents: PinnedEvent[];
	events: Event[];
	completedEvents: Event[];
	juries: Juri[];
	pelatih: Pelatih[];
	publicStats: PublicStats;
	klasemen: KlasemenData;
	loading: boolean;
	error: string | null;
	refetch: () => void;
}

let hasTrackedLandingVisit = false;

export const useLandingData = (): UseLandingDataReturn => {
	const [pinnedEvents, setPinnedEvents] = useState<PinnedEvent[]>([]);
	const [events, setEvents] = useState<Event[]>([]);
	const [completedEvents, setCompletedEvents] = useState<Event[]>([]);
	const [juries, setJuries] = useState<Juri[]>([]);
	const [pelatih, setPelatih] = useState<Pelatih[]>([]);
	const [publicStats, setPublicStats] = useState<PublicStats>({
		juriCount: 0,
		pesertaCount: 0,
		eventsCount: 0,
		availableEventsCount: 0,
		completedEventsCount: 0,
		todayVisitors: 0,
	});
	const [klasemen, setKlasemen] = useState<KlasemenData>({
		year: new Date().getFullYear(),
		top5: [],
		full: [],
		totalEvents: 0,
	});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchData = async () => {
		try {
			setLoading(true);
			const [pinnedRes, eventsRes, completedRes, statsRes, klasemenRes, visitorsRes] = await Promise.all([
				api.get("/events/pinned/carousel"),
				api.get("/events?limit=12"),
				api.get("/events?status=COMPLETED&limit=50"),
				api.get("/users/public/stats"),
				api.get("/users/public/klasemen"),
				api.get("/visitors/today"),
			]);

			let todayVisitors = visitorsRes.data.count || 0;
			if (!hasTrackedLandingVisit) {
				hasTrackedLandingVisit = true;
				const trackRes = await api.post("/visitors/track").catch(() => null);
				todayVisitors = trackRes?.data?.count || todayVisitors;
			}

			pinnedRes && setPinnedEvents(pinnedRes.data);
			eventsRes && setEvents(eventsRes.data.data || eventsRes.data);
			completedRes && setCompletedEvents(completedRes.data.data || completedRes.data);
			statsRes && setJuries(statsRes.data.juries || []);
			statsRes && setPelatih(statsRes.data.pelatih || []);
			setPublicStats({
				...(statsRes.data.stats || { juriCount: 0, pesertaCount: 0, eventsCount: 0, availableEventsCount: 0, completedEventsCount: 0 }),
				todayVisitors,
			});
			setKlasemen(klasemenRes.data || { year: new Date().getFullYear(), top5: [], full: [], totalEvents: 0 });
			setError(null);
		} catch (err: any) {
			console.error("Error fetching data:", err);
			setError("Gagal memuat data. Silakan coba lagi nanti.");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
	}, []);

	return {
		pinnedEvents,
		events,
		completedEvents,
		juries,
		pelatih,
		publicStats,
		klasemen,
		loading,
		error,
		refetch: fetchData,
	};
};
