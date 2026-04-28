import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LuArrowRight, LuCalendar, LuMapPin, LuThumbsUp } from "react-icons/lu";
import { api } from "../../utils/api";
import { config } from "../../utils/config";

interface VotingEventSummary {
	id: string;
	title: string;
	slug: string | null;
	thumbnail: string | null;
	startDate: string;
	location: string | null;
	city: string | null;
	venue: string | null;
	votingConfig: {
		isPaid: boolean;
		pricePerVote: number;
		startDate: string | null;
		endDate: string | null;
		categories: {
			id: string;
			title: string;
		}[];
	} | null;
}

const VotingSection: React.FC = () => {
	const [events, setEvents] = useState<VotingEventSummary[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchVotingEvents = async () => {
			try {
				const res = await api.get("/voting/events", { params: { limit: 6 } });
				setEvents((res.data.data || []).slice(0, 3));
			} catch {
				console.error("Failed to fetch voting events");
			} finally {
				setLoading(false);
			}
		};

		fetchVotingEvents();
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

	const getVotingStatusBadge = (event: VotingEventSummary): { label: string; className: string } => {
		if (!event.votingConfig) return { label: "Vote", className: "bg-red-500/85 text-white" };
		const now = new Date();
		if (event.votingConfig.startDate && new Date(event.votingConfig.startDate) > now) {
			return { label: "Segera", className: "bg-orange-500/85 text-white" };
		}
		if (event.votingConfig.endDate && new Date(event.votingConfig.endDate) < now) {
			return { label: "Selesai", className: "bg-gray-600/85 text-white" };
		}
		return { label: "Buka", className: "bg-emerald-500/85 text-white" };
	};

	const getVotingPriceLabel = (event: VotingEventSummary): string => {
		if (!event.votingConfig) return "Voting";
		if (!event.votingConfig.isPaid) return "Gratis Vote";
		return `${new Intl.NumberFormat("id-ID", {
			style: "currency",
			currency: "IDR",
			minimumFractionDigits: 0,
		}).format(event.votingConfig.pricePerVote)}/vote`;
	};

	return (
		<div className="relative z-10 w-full max-w-6xl mx-auto px-6 md:px-12 lg:px-16">
			<div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 lg:mb-8">
				<div>
					<p className="text-[10px] md:text-xs tracking-[0.3em] text-gray-400 dark:text-gray-400 font-medium mb-3">
						DUKUNG FAVORITMU
					</p>
					<h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-none mb-2 landing-title-gradient-voting">
						E-VOTING
					</h1>
					<div className="flex items-center gap-4">
						<div className="w-10 h-[1px] bg-gradient-to-r from-purple-500/50 to-transparent" />
						<p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium tracking-wide">
							Vote untuk Tim & Peserta Favoritmu
						</p>
					</div>
				</div>
				<Link
					to="/e-voting"
					className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gray-900/[0.06] dark:bg-white/[0.06] border border-gray-300/50 dark:border-white/10 text-gray-800 dark:text-white text-xs font-medium hover:bg-gray-900/[0.12] dark:hover:bg-white/[0.12] hover:border-gray-400/50 dark:hover:border-white/20 transition-all duration-300 group flex-shrink-0"
				>
					<span>Lihat Semua Voting</span>
					<LuArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
				</Link>
			</div>

			{loading ? (
				<div className="flex items-center justify-center py-20">
					<div className="animate-spin rounded-full h-8 w-8 border-2 border-red-600 border-t-transparent" />
				</div>
			) : events.length === 0 ? (
				<div className="text-center py-12">
					<LuThumbsUp className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
					<p className="text-sm text-gray-500 dark:text-gray-400">Belum ada event voting tersedia</p>
					<Link
						to="/e-voting"
						className="inline-flex items-center gap-2 mt-4 text-sm text-purple-600 dark:text-purple-400 hover:underline"
					>
						Lihat halaman E-Voting <LuArrowRight className="w-3.5 h-3.5" />
					</Link>
				</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
					{events.map((event) => {
						const badge = getVotingStatusBadge(event);
						return (
							<Link
								to="/e-voting"
								key={event.id}
								className="group overflow-hidden rounded-2xl border border-gray-200/70 bg-white shadow-lg shadow-gray-200/80 transition-all duration-300 hover:-translate-y-1 hover:border-purple-400/30 hover:shadow-xl hover:shadow-purple-200/70 dark:bg-white/[0.03] dark:border-white/[0.06] dark:shadow-none dark:hover:border-purple-500/20"
							>
								<div className="relative aspect-[4/5] w-full bg-gradient-to-br from-purple-100 via-pink-50 to-red-100 overflow-hidden dark:from-purple-900/10 dark:via-pink-900/10 dark:to-red-900/10">
									{event.thumbnail ? (
										<img
											src={getImageUrl(event.thumbnail)}
											alt={event.title}
											className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
											loading="lazy"
										/>
									) : (
										<div className="w-full h-full flex items-center justify-center">
											<LuThumbsUp className="w-10 h-10 text-gray-400/50 dark:text-gray-600" />
										</div>
									)}
									<div className="absolute top-3 left-3">
										<span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm ${badge.className}`}>
											{badge.label}
										</span>
									</div>
									<div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
								</div>

								<div className="flex min-h-[150px] flex-col p-4">
									<h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug line-clamp-2 mb-3">
										{event.title}
									</h3>
									<div className="space-y-1.5 text-gray-400 dark:text-gray-500">
										<div className="flex items-center gap-2">
											<LuCalendar className="w-4 h-4 flex-shrink-0" />
											<span className="text-xs">{formatShortDate(event.startDate)}</span>
										</div>
										{(event.venue || event.city || event.location) && (
											<div className="flex items-center gap-2">
												<LuMapPin className="w-4 h-4 flex-shrink-0" />
												<span className="text-xs line-clamp-1">{event.city || event.venue || event.location}</span>
											</div>
										)}
									</div>
									<div className="mt-auto pt-5 flex items-center justify-between gap-3">
										<p className="text-lg font-black text-red-600 dark:text-red-400">
											{getVotingPriceLabel(event)}
										</p>
										<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
											Detail
											<LuArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
										</span>
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

export default VotingSection;
