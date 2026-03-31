import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { LuCalendar, LuMapPin, LuHeart, LuMessageCircle } from "react-icons/lu";
import { api } from "../../utils/api";
import { Event } from "../../types/landing";
import { config } from "../../utils/config";

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
	likesCount?: number;
	commentsCount?: number;
}

const MAX_ITEMS = 10;

const LandingEventGrid: React.FC = () => {
	const [pinnedEvents, setPinnedEvents] = useState<PinnedEvent[]>([]);
	const [events, setEvents] = useState<Event[]>([]);
	const [completedEvents, setCompletedEvents] = useState<Event[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchData = async () => {
			try {
				setLoading(true);
				const [pinnedRes, eventsRes, completedRes] = await Promise.all([
					api.get("/events/pinned/carousel"),
					api.get("/events?limit=12"),
					api.get("/events?status=COMPLETED&limit=12"),
				]);
				setPinnedEvents(pinnedRes.data);
				setEvents(eventsRes.data.data || eventsRes.data);
				setCompletedEvents(completedRes.data.data || completedRes.data);
			} catch (err) {
				console.error("Error fetching landing events:", err);
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, []);

	// Merge: pinned first → newest available → completed, up to 10
	const displayEvents = useMemo(() => {
		const result: {
			id: string;
			title: string;
			slug: string | null;
			thumbnail: string | null;
			startDate: string;
			location: string | null;
			status: string;
			isPinned: boolean;
			likesCount: number;
			commentsCount: number;
		}[] = [];
		const usedIds = new Set<string>();

		// 1. Pinned events first
		for (const pe of pinnedEvents) {
			if (result.length >= MAX_ITEMS) break;
			result.push({
				id: pe.id,
				title: pe.title,
				slug: pe.slug,
				thumbnail: pe.thumbnail,
				startDate: pe.startDate,
				location: pe.location,
				status: "PINNED",
				isPinned: true,
				likesCount: pe.likesCount || 0,
				commentsCount: pe.commentsCount || 0,
			});
			usedIds.add(pe.id);
		}

		// 2. Fill with newest available events
		for (const e of events) {
			if (result.length >= MAX_ITEMS) break;
			if (usedIds.has(e.id)) continue;
			result.push({
				id: e.id,
				title: e.title,
				slug: e.slug,
				thumbnail: e.thumbnail,
				startDate: e.startDate,
				location: e.location,
				status: e.status,
				isPinned: false,
				likesCount: e.likesCount || 0,
				commentsCount: e.commentsCount || 0,
			});
			usedIds.add(e.id);
		}

		// 3. Fill remainder with completed events
		for (const e of completedEvents) {
			if (result.length >= MAX_ITEMS) break;
			if (usedIds.has(e.id)) continue;
			result.push({
				id: e.id,
				title: e.title,
				slug: e.slug,
				thumbnail: e.thumbnail,
				startDate: e.startDate,
				location: e.location,
				status: e.status,
				isPinned: false,
				likesCount: e.likesCount || 0,
				commentsCount: e.commentsCount || 0,
			});
			usedIds.add(e.id);
		}

		return result;
	}, [pinnedEvents, events, completedEvents]);

	const getImageUrl = (imageUrl: string | null): string => {
		if (!imageUrl) return "";
		if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
			return imageUrl;
		}
		return `${config.api.backendUrl}${imageUrl}`;
	};

	const formatDate = (dateString: string): string => {
		return new Date(dateString).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "short",
		});
	};

	const getStatusLabel = (
		status: string,
		isPinned: boolean
	): { label: string; className: string } => {
		if (isPinned)
			return { label: "Pinned", className: "bg-red-500/80 text-white" };
		switch (status) {
			case "REGISTRATION_OPEN":
				return { label: "Buka", className: "bg-green-500/80 text-white" };
			case "ACTIVE":
				return { label: "Aktif", className: "bg-emerald-500/80 text-white" };
			case "COMPLETED":
				return { label: "Selesai", className: "bg-gray-500/80 text-white" };
			default:
				return { label: "Segera", className: "bg-orange-500/80 text-white" };
		}
	};

	if (loading) {
		return (
			<div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
				{Array.from({ length: 10 }).map((_, i) => (
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
		);
	}

	if (displayEvents.length === 0) {
		return (
			<div className="text-center text-gray-400 dark:text-gray-500 py-12 text-sm">
				Belum ada event tersedia
			</div>
		);
	}

	return (
		<div className="w-full">
			<div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
				{displayEvents.map((event) => {
					const status = getStatusLabel(event.status, event.isPinned);

					return (
						<Link
							key={event.id}
							to={`/events/${event.slug || event.id}`}
							className="group relative rounded-xl overflow-hidden bg-gray-100/50 dark:bg-white/[0.03] border border-gray-200/50 dark:border-white/[0.06] hover:border-orange-400/30 dark:hover:border-orange-500/20 transition-all duration-300 hover:scale-[1.02]"
						>
							{/* Poster - 2:3 ratio */}
							<div className="relative aspect-[2/3] w-full bg-gradient-to-br from-orange-900/10 to-red-900/10 overflow-hidden">
								{event.thumbnail ? (
									<img
										src={getImageUrl(event.thumbnail)}
										alt={event.title}
										className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
										loading="lazy"
									/>
								) : (
									<div className="w-full h-full flex items-center justify-center">
										<LuCalendar className="w-5 h-5 text-gray-400/40 dark:text-gray-600" />
									</div>
								)}
								<div className="absolute top-1.5 left-1.5">
									<span
										className={`text-[7px] font-semibold px-1.5 py-0.5 rounded-full backdrop-blur-sm ${status.className}`}
									>
										{status.label}
									</span>
								</div>
								<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1.5 pt-4">
									<div className="flex items-center gap-2 text-white/80">
										<div className="flex items-center gap-0.5">
											<LuHeart className="w-2.5 h-2.5" />
											<span className="text-[7px] lg:text-[8px] font-medium">{event.likesCount}</span>
										</div>
										<div className="flex items-center gap-0.5">
											<LuMessageCircle className="w-2.5 h-2.5" />
											<span className="text-[7px] lg:text-[8px] font-medium">{event.commentsCount}</span>
										</div>
									</div>
								</div>
							</div>

							<div className="p-1.5 lg:p-2">
								<h4 className="text-[9px] lg:text-[10px] font-semibold text-gray-800 dark:text-white leading-tight line-clamp-2 mb-1">
									{event.title}
								</h4>
								<div className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
									<LuCalendar className="w-2.5 h-2.5 flex-shrink-0" />
									<span className="text-[7px] lg:text-[8px]">
										{formatDate(event.startDate)}
									</span>
								</div>
								{event.location && (
									<div className="flex items-center gap-1 text-gray-400 dark:text-gray-500 mt-0.5">
										<LuMapPin className="w-2.5 h-2.5 flex-shrink-0" />
										<span className="text-[7px] lg:text-[8px] line-clamp-1">
											{event.location}
										</span>
									</div>
							)}
						</div>
						</Link>
					);
				})}
			</div>
		</div>
	);
};

export default LandingEventGrid;
