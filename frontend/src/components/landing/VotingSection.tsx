import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { LuArrowRight, LuThumbsUp, LuUser } from "react-icons/lu";
import { api } from "../../utils/api";
import { config } from "../../utils/config";

interface VotingEventSummary {
	id: string;
	title: string;
	slug: string | null;
	thumbnail: string | null;
	startDate: string;
	votingConfig: {
		isPaid: boolean;
		pricePerVote: number;
		startDate: string | null;
		endDate: string | null;
		categories: {
			id: string;
			title: string;
			nominees?: {
				id: string;
				nomineeName: string;
				nomineePhoto: string | null;
				nomineeSubtitle: string | null;
				voteCount: number;
			}[];
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
				const eventsData = res.data.data || [];
				// Fetch detail for each event to get nominees
				const detailed = await Promise.all(
					eventsData.slice(0, 3).map(async (evt: any) => {
						try {
							const detail = await api.get(`/voting/events/${evt.id}`);
							return detail.data;
						} catch {
							return evt;
						}
					})
				);
				setEvents(detailed);
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

	const isVotingOpen = (evt: VotingEventSummary): boolean => {
		if (!evt.votingConfig) return false;
		const now = new Date();
		if (evt.votingConfig.startDate && new Date(evt.votingConfig.startDate) > now) return false;
		if (evt.votingConfig.endDate && new Date(evt.votingConfig.endDate) < now) return false;
		return true;
	};

	if (loading) {
		return (
			<div className="relative z-10 w-full max-w-6xl mx-auto px-6 md:px-12 lg:px-16">
				<div className="flex items-center justify-center py-20">
					<div className="animate-spin rounded-full h-8 w-8 border-2 border-red-600 border-t-transparent" />
				</div>
			</div>
		);
	}

	if (events.length === 0) return null;

	// Show the first event with nominees
	const featuredEvent = events.find(
		(e) => e.votingConfig?.categories?.some((c) => c.nominees && c.nominees.length > 0)
	) || events[0];

	const featuredCategory = featuredEvent?.votingConfig?.categories?.find(
		(c) => c.nominees && c.nominees.length > 0
	);

	const topNominees = featuredCategory?.nominees?.slice(0, 6) || [];

	return (
		<div className="relative z-10 w-full max-w-6xl mx-auto px-6 md:px-12 lg:px-16">
			{/* Header */}
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

			{/* Featured Event */}
			{featuredEvent && (
				<div className="mb-6">
					<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{featuredEvent.title}</h2>
					{featuredCategory && (
						<p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{featuredCategory.title}</p>
					)}
				</div>
			)}

			{/* Nominees Grid */}
			{topNominees.length > 0 ? (
				<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
					{topNominees.map((nominee, idx) => {
						const maxVotes = topNominees[0]?.voteCount || 1;
						const pct = maxVotes > 0 ? (nominee.voteCount / maxVotes) * 100 : 0;
						return (
							<Link
								to="/e-voting"
								key={nominee.id}
								className="group bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-white/[0.06] overflow-hidden hover:border-purple-300 dark:hover:border-purple-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/5"
							>
								{/* Photo */}
								<div className="h-28 sm:h-32 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 flex items-center justify-center relative">
									{nominee.nomineePhoto ? (
										<img
											src={nominee.nomineePhoto.startsWith("http") ? nominee.nomineePhoto : getImageUrl(nominee.nomineePhoto)}
											alt={nominee.nomineeName}
											className="w-full h-full object-cover"
										/>
									) : (
										<LuUser className="w-10 h-10 text-gray-400 dark:text-gray-500" />
									)}
									{idx < 3 && (
										<div className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
											idx === 0 ? "bg-yellow-500" : idx === 1 ? "bg-gray-400" : "bg-amber-700"
										}`}>
											{idx + 1}
										</div>
									)}
								</div>

								{/* Info */}
								<div className="p-3">
									<h3 className="text-xs font-semibold text-gray-900 dark:text-white truncate">{nominee.nomineeName}</h3>
									{nominee.nomineeSubtitle && (
										<p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{nominee.nomineeSubtitle}</p>
									)}
									<div className="mt-2">
										<div className="flex items-center justify-between text-[10px] mb-1">
											<span className="text-gray-400 flex items-center gap-0.5"><LuThumbsUp className="w-2.5 h-2.5" /> Vote</span>
											<span className="font-semibold text-purple-600 dark:text-purple-400">{nominee.voteCount}</span>
										</div>
										<div className="w-full bg-gray-100 dark:bg-white/[0.06] rounded-full h-1">
											<div
												className="h-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
												style={{ width: `${pct}%` }}
											/>
										</div>
									</div>
								</div>
							</Link>
						);
					})}
				</div>
			) : (
				<div className="text-center py-12">
					<LuThumbsUp className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
					<p className="text-sm text-gray-500 dark:text-gray-400">Belum ada nominasi voting tersedia</p>
					<Link
						to="/e-voting"
						className="inline-flex items-center gap-2 mt-4 text-sm text-purple-600 dark:text-purple-400 hover:underline"
					>
						Lihat halaman E-Voting <LuArrowRight className="w-3.5 h-3.5" />
					</Link>
				</div>
			)}

			{/* CTA */}
			{isVotingOpen(featuredEvent) && topNominees.length > 0 && (
				<div className="mt-6 text-center">
					<Link
						to="/e-voting"
						className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white text-sm font-medium shadow-sm hover:shadow-md transition-all duration-300 group"
					>
						<LuThumbsUp className="w-4 h-4" />
						<span>Vote Sekarang</span>
						<LuArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
					</Link>
				</div>
			)}
		</div>
	);
};

export default VotingSection;
