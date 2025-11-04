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

interface UseLandingDataReturn {
	pinnedEvents: PinnedEvent[];
	events: Event[];
	loading: boolean;
	error: string | null;
	refetch: () => void;
}

export const useLandingData = (): UseLandingDataReturn => {
	const [pinnedEvents, setPinnedEvents] = useState<PinnedEvent[]>([]);
	const [events, setEvents] = useState<Event[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchData = async () => {
		try {
			setLoading(true);
			const [pinnedRes, eventsRes] = await Promise.all([
				api.get("api/events/pinned/carousel"),
				api.get("api/events?limit=12"),
			]);

			setPinnedEvents(pinnedRes.data);
			setEvents(eventsRes.data.data || eventsRes.data);
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
		loading,
		error,
		refetch: fetchData,
	};
};
