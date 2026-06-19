import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { Event } from "../types/landing";
import EventGrid from "../components/landing/EventGrid";
import SEO from "../components/SEO";
import { absoluteUrl } from "../utils/seo";

const eventsPageDescription =
	"Temukan daftar event dan kompetisi Paskibra di Simpaskor, lengkap dengan jadwal, lokasi, biaya pendaftaran, dan status pendaftaran.";

const EventsPage: React.FC = () => {
	const [events, setEvents] = useState<Event[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchEvents = async () => {
			try {
				setLoading(true);
				const [availableRes, completedRes] = await Promise.all([
					api.get("/events?limit=100"),
					api.get("/events?status=COMPLETED&limit=100"),
				]);
				const available = availableRes.data.data || availableRes.data;
				const completed = completedRes.data.data || completedRes.data;
				setEvents([...available, ...completed]);
			} catch (err) {
				console.error("Error fetching events:", err);
			} finally {
				setLoading(false);
			}
		};
		fetchEvents();
	}, []);

	const eventsJsonLd = {
		"@context": "https://schema.org",
		"@type": "CollectionPage",
		name: "Daftar Event Paskibra di Simpaskor",
		url: absoluteUrl("/events"),
		description: eventsPageDescription,
		mainEntity: {
			"@type": "ItemList",
			itemListElement: events.slice(0, 50).map((event, index) => ({
				"@type": "ListItem",
				position: index + 1,
				name: event.title,
				url: absoluteUrl(`/events/${event.slug || event.id}`),
			})),
		},
	};

	return (
		<div className="min-h-screen transition-colors">
			<SEO
				title="Event Paskibra"
				description={eventsPageDescription}
				path="/events"
				jsonLd={eventsJsonLd}
			/>
			<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="mb-6">
					<p className="text-[10px] md:text-xs tracking-[0.3em] text-gray-400 dark:text-gray-500 font-medium mb-2">
						JELAJAHI EVENT
					</p>
					<h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-1">
						Event
					</h1>
					<p className="text-sm text-gray-500 dark:text-gray-400">
						Temukan berbagai event dan kompetisi Paskibra dari seluruh Indonesia
					</p>
				</div>
				{loading ? (
					<div className="grid grid-cols-2 md:grid-cols-5 gap-3">
						{Array.from({ length: 25 }).map((_, i) => (
							<div
								key={i}
								className="rounded-xl bg-gray-200/50 dark:bg-white/[0.03] border border-gray-200/30 dark:border-white/[0.04] animate-pulse"
							>
								<div className="aspect-[2/3]" />
								<div className="p-2 space-y-1.5">
									<div className="h-2.5 bg-gray-300/50 dark:bg-white/[0.06] rounded w-3/4" />
									<div className="h-2 bg-gray-300/50 dark:bg-white/[0.06] rounded w-1/2" />
								</div>
							</div>
						))}
					</div>
				) : (
					<EventGrid events={events} />
				)}
			</div>
		</div>
	);
};

export default EventsPage;
