import React, { useState, useEffect, useMemo } from "react";
import { api } from "../../utils/api";
import { Event, EventRegistration } from "../../types/landing";
import EventGrid from "../../components/landing/EventGrid";

const EventsAvailable: React.FC = () => {
	const [events, setEvents] = useState<Event[]>([]);
	const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchData();
	}, []);

	const fetchData = async () => {
		try {
			setLoading(true);
			const [availableRes, completedRes, registrationsRes] = await Promise.all([
				api.get("/events?limit=100"),
				api.get("/events?status=COMPLETED&limit=100"),
				api.get("/registrations/my"),
			]);
			const availableEvents = availableRes.data.data || availableRes.data || [];
			const completedEvents = completedRes.data.data || completedRes.data || [];
			setEvents([...availableEvents, ...completedEvents]);
			setRegistrations(registrationsRes.data || []);
		} catch (error) {
			console.error("Error fetching data:", error);
		} finally {
			setLoading(false);
		}
	};

	const activeRegisteredEventIds = useMemo(() => {
		return new Set(
			registrations
				.filter((registration) => registration.status !== "CANCELLED")
				.map((registration) => registration.eventId)
		);
	}, [registrations]);

	const availableEvents = useMemo(() => {
		return events.filter((event) => !activeRegisteredEventIds.has(event.id));
	}, [events, activeRegisteredEventIds]);

	const hiddenRegisteredCount = useMemo(() => {
		return activeRegisteredEventIds.size;
	}, [activeRegisteredEventIds]);

	if (loading) {
		return (
			<div className="min-h-screen transition-colors">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
					<div className="mb-6">
						<p className="text-[10px] md:text-xs tracking-[0.3em] text-gray-400 dark:text-gray-500 font-medium mb-2">
							EVENT PESERTA
						</p>
						<div className="h-10 w-72 bg-gray-200/50 dark:bg-white/[0.06] rounded animate-pulse mb-2" />
						<div className="h-4 w-80 bg-gray-200/50 dark:bg-white/[0.06] rounded animate-pulse" />
					</div>
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
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen transition-colors">
			<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Header */}
				<div className="mb-6">
					<p className="text-[10px] md:text-xs tracking-[0.3em] text-gray-400 dark:text-gray-500 font-medium mb-2">
						EVENT PESERTA
					</p>
					<h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-1">
						Event Belum Terdaftar
					</h1>
					<p className="text-sm text-gray-500 dark:text-gray-400">
						Lihat seluruh event publik dan temukan event yang belum pernah Anda daftari.
					</p>
				</div>

				<div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200/60 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] px-4 py-3 backdrop-blur-sm">
					<span className="inline-flex items-center rounded-full bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300 px-3 py-1 text-xs font-semibold">
						{availableEvents.length} event tersedia
					</span>
					{hiddenRegisteredCount > 0 && (
						<span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 px-3 py-1 text-xs font-semibold">
							{hiddenRegisteredCount} event disembunyikan karena sudah terdaftar
						</span>
					)}
				</div>

				{availableEvents.length === 0 ? (
					<div className="text-center py-16">
						<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center">
							<div className="w-7 h-7 rounded-full border-2 border-gray-300 dark:border-gray-600" />
						</div>
						<p className="text-gray-500 dark:text-gray-400 text-sm">
							Semua event yang tersedia sudah pernah Anda daftari.
						</p>
					</div>
				) : (
					<EventGrid events={availableEvents} />
				)}
			</div>
		</div>
	);
};

export default EventsAvailable;
