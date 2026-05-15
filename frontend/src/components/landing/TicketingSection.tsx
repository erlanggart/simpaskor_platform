import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LuArrowRight, LuCalendar, LuMapPin, LuTicket } from "react-icons/lu";
import { api } from "../../utils/api";
import { config } from "../../utils/config";
import type { TicketedEvent } from "../../types/ticket";

const TicketingSection: React.FC = () => {
	const [events, setEvents] = useState<TicketedEvent[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchTicketedEvents = async () => {
			try {
				const res = await api.get("/tickets/events", { params: { limit: 6 } });
				setEvents(res.data.data || []);
			} catch {
				console.error("Failed to fetch ticketed events");
			} finally {
				setLoading(false);
			}
		};

		fetchTicketedEvents();
	}, []);

	const getImageUrl = (imageUrl: string | null): string => {
		if (!imageUrl) return "";
		if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;
		return `${config.api.backendUrl}${imageUrl}`;
	};

	const formatShortDate = (date: string) => {
		return new Date(date).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "short",
		});
	};

	const formatCurrency = (amount: number) => {
		if (amount === 0) return "GRATIS";
		return new Intl.NumberFormat("id-ID", {
			style: "currency",
			currency: "IDR",
			minimumFractionDigits: 0,
		}).format(amount);
	};

	const getAvailability = (event: TicketedEvent) => {
		const quota = event.ticketConfig?.quota || 0;
		const soldCount = event.ticketConfig?.soldCount || 0;
		return Math.max(0, quota - soldCount);
	};

	return (
		<div className="relative z-10 w-full max-w-6xl mx-auto px-6 md:px-12 lg:px-16">
			<div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 lg:mb-8">
				<div>
					<p className="text-[10px] md:text-xs tracking-[0.3em] text-gray-400 dark:text-gray-400 font-medium mb-3">
						BELI TIKET ONLINE
					</p>
					<h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-none mb-2 landing-title-gradient-ticketing">
						E-TICKETING
					</h1>
					<div className="flex items-center gap-4">
						<div className="w-10 h-[1px] bg-gradient-to-r from-yellow-500/50 to-transparent" />
						<p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium tracking-wide">
							Tiket digital untuk event favoritmu
						</p>
					</div>
				</div>
				<Link
					to="/e-ticketing"
					className="landing-modern-btn landing-modern-btn-yellow group flex-shrink-0"
				>
					<span>Lihat Semua Tiket</span>
					<LuArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
				</Link>
			</div>

			{loading ? (
				<div className="flex items-center justify-center py-20">
					<div className="animate-spin rounded-full h-8 w-8 border-2 border-red-600 border-t-transparent" />
				</div>
			) : events.length === 0 ? (
				<div className="text-center py-12">
					<LuTicket className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
					<p className="text-sm text-gray-500 dark:text-gray-400">Belum ada tiket event tersedia</p>
				</div>
			) : (
				<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
					{events.map((event) => {
						const available = getAvailability(event);
						const isSoldOut = available <= 0;

						return (
							<Link
								key={event.id}
								to="/e-ticketing"
								className={`landing-modern-card landing-modern-card-yellow group ${
									isSoldOut ? "opacity-60" : ""
								}`}
							>
								<div className="relative aspect-[2/3] w-full bg-gradient-to-br from-yellow-100 via-orange-50 to-red-100 overflow-hidden dark:from-yellow-900/10 dark:via-orange-900/10 dark:to-red-900/10">
									{event.thumbnail ? (
										<img
											src={getImageUrl(event.thumbnail)}
											alt={event.title}
											className="w-full h-full object-cover"
											loading="lazy"
										/>
									) : (
										<div className="w-full h-full flex items-center justify-center">
											<LuTicket className="w-7 h-7 text-gray-400/50 dark:text-gray-600" />
										</div>
									)}
									<div className="absolute top-1.5 left-1.5">
										<span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full backdrop-blur-sm text-white ${
											isSoldOut ? "bg-gray-600/85" : available <= 10 ? "bg-amber-500/85" : "bg-emerald-500/85"
										}`}>
											{isSoldOut ? "Habis" : `Sisa ${available}`}
										</span>
									</div>
								</div>
								<div className="flex min-h-[116px] flex-col p-2.5">
									<h3 className="text-[10px] lg:text-xs font-semibold text-gray-800 dark:text-white leading-tight line-clamp-2 mb-1.5">
										{event.title}
									</h3>
									<div className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
										<LuCalendar className="w-3 h-3 flex-shrink-0" />
										<span className="text-[8px] lg:text-[9px]">{formatShortDate(event.startDate)}</span>
									</div>
									{(event.city || event.venue || event.location) && (
										<div className="flex items-center gap-1 text-gray-400 dark:text-gray-500 mt-0.5">
											<LuMapPin className="w-3 h-3 flex-shrink-0" />
											<span className="text-[8px] lg:text-[9px] line-clamp-1">
												{event.city || event.venue || event.location}
											</span>
										</div>
									)}
									<div className="mt-auto pt-3">
										<p className="text-[11px] lg:text-sm font-bold text-yellow-600 dark:text-yellow-400">
											{formatCurrency(event.ticketConfig?.price || 0)}
										</p>
									</div>
								</div>
							</Link>
						);
					})}
				</div>
			)}
		</div>
	);
};

export default TicketingSection;
