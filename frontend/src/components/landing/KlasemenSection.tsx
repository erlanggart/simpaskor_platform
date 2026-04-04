import React from "react";
import { Link } from "react-router-dom";
import { LuArrowRight, LuTrophy } from "react-icons/lu";
import type { KlasemenEntry } from "../../hooks/useLandingData";

interface KlasemenSectionProps {
	top5: KlasemenEntry[];
	year: number;
	totalEvents: number;
	loading: boolean;
}

const rankColors = [
	"from-yellow-400 to-amber-500",
	"from-gray-300 to-gray-400",
	"from-amber-600 to-amber-700",
	"from-red-400/60 to-red-500/60",
	"from-red-400/40 to-red-500/40",
];

const rankBorders = [
	"border-yellow-400/30 dark:border-yellow-400/20",
	"border-gray-300/30 dark:border-gray-300/20",
	"border-amber-600/30 dark:border-amber-600/20",
	"border-red-400/20 dark:border-red-400/10",
	"border-red-400/15 dark:border-red-400/10",
];

const KlasemenSection: React.FC<KlasemenSectionProps> = ({
	top5,
	year,
	totalEvents,
	loading,
}) => {
	return (
		<div className="relative z-10 w-full max-w-6xl mx-auto px-6 md:px-12 lg:px-16">
			<div className="flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-16">
				{/* Left: Text */}
				<div className="flex-1 text-center lg:text-left max-w-md">
					<p className="text-[10px] md:text-xs tracking-[0.3em] text-gray-400 dark:text-gray-400 font-medium mb-4">
						KLASEMEN SEMENTARA
					</p>
					<h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-none mb-3 landing-title-gradient-ticketing">
						{year}
					</h1>
					<p className="text-sm md:text-base text-gray-500 dark:text-gray-400 font-medium tracking-wide mb-6">
						{totalEvents > 0 ? `${totalEvents} Event Selesai` : "Klasemen Tahun Ini"}
					</p>
					<div className="w-12 h-[1px] bg-gradient-to-r from-yellow-500/50 to-transparent mx-auto lg:mx-0 mb-6" />
					<p className="text-sm md:text-base text-gray-500 dark:text-gray-500 leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">
						Peringkat berdasarkan perolehan Juara Utama 1 di setiap event
						yang telah selesai sepanjang tahun {year}.
					</p>
					<Link
						to="/klasemen"
						className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gray-900/[0.06] dark:bg-white/[0.06] border border-gray-300/50 dark:border-white/10 text-gray-800 dark:text-white text-sm font-medium hover:bg-gray-900/[0.12] dark:hover:bg-white/[0.12] hover:border-gray-400/50 dark:hover:border-white/20 transition-all duration-300 group"
					>
						<span>Lihat Klasemen Detail</span>
						<LuArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
					</Link>
				</div>

				{/* Right: Top 5 */}
				<div className="flex-1 w-full max-w-xl">
					{loading ? (
						<div className="space-y-3">
							{[...Array(5)].map((_, i) => (
								<div key={i} className="h-14 rounded-xl bg-gray-100/50 dark:bg-white/[0.03] animate-pulse" />
							))}
						</div>
					) : top5.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
							<LuTrophy className="w-12 h-12 mb-3 opacity-30" />
							<p className="text-sm">Belum ada data klasemen</p>
						</div>
					) : (
						<div className="space-y-2.5">
							{top5.map((entry, i) => (
								<div
									key={entry.schoolName}
									className={`flex items-center gap-3 md:gap-4 p-3 md:p-3.5 rounded-xl border bg-gray-50/50 dark:bg-white/[0.02] backdrop-blur-sm transition-all duration-300 hover:bg-gray-100/60 dark:hover:bg-white/[0.05] ${rankBorders[i] || ""}`}
								>
									{/* Rank badge */}
									<div
										className={`flex-shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-lg bg-gradient-to-br ${rankColors[i] || "from-gray-400 to-gray-500"} flex items-center justify-center shadow-sm`}
									>
										<span className="text-white font-bold text-sm md:text-base">
											{i + 1}
										</span>
									</div>

									{/* School logo/initial */}
									<div className="flex-shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-lg bg-gray-100 dark:bg-white/[0.06] border border-gray-200/50 dark:border-white/[0.08] flex items-center justify-center overflow-hidden">
										{entry.avatar ? (
											<img
												src={entry.avatar}
												alt={entry.schoolName}
												className="w-full h-full object-cover"
											/>
										) : (
											<span className="text-sm md:text-base font-bold text-gray-400 dark:text-gray-500">
												{entry.schoolName.charAt(0).toUpperCase()}
											</span>
										)}
									</div>

									{/* School name */}
									<div className="flex-1 min-w-0">
										<p className="text-sm md:text-base font-semibold text-gray-800 dark:text-white truncate">
											{entry.schoolName}
										</p>
										{entry.events && entry.events.length > 0 && (
											<p className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500 truncate">
												{entry.events.map((e) => e.title).join(", ")}
											</p>
										)}
									</div>

									{/* Points */}
									<div className="flex-shrink-0 text-right">
										<p className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">
											{entry.wins}
										</p>
										<p className="text-[9px] md:text-[10px] text-gray-400 dark:text-gray-500 font-medium tracking-wider">
											POIN
										</p>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default KlasemenSection;
