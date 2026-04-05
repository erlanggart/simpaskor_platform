import React from "react";
import { Link } from "react-router-dom";
import {
	LuArrowRight,
	LuChevronDown,
} from "react-icons/lu";
import HeroBannerCarousel from "./HeroBannerCarousel";

interface HeroSectionProps {
	pinnedEvents: any[];
	stats: {
		value: string;
		label: string;
		icon: React.ComponentType<{ className?: string }>;
	}[];
	onScrollNext: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({
	pinnedEvents,
	stats,
	onScrollNext,
}) => {
	return (
		<>
			<div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-12 lg:px-16">
				<div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-16">
					{/* Left: Hero Text */}
					<div className="flex-1 text-center lg:text-left max-w-2xl">
						<p className="text-[10px] md:text-xs tracking-[0.3em] text-slate-700 dark:text-gray-400 font-medium mb-2 md:mb-4">
							Teamwork Makes The Dream Work
						</p>
						<h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black leading-none mb-0 md:mb-0 simpaskor-animated-title">
							{"SIMPASKOR".split("").map((letter, i) => (
								<span
									key={i}
									className="simpaskor-letter"
									style={{
										"--letter-delay": `${i * 0.08}s`,
										"--shimmer-offset": `${i * 22}%`,
									} as React.CSSProperties}
								>
									{letter}
								</span>
							))}
						</h1>
						<div className="simpaskor-underline mx-auto lg:mx-0" />

						<p className="text-xs md:text-base text-gray-500 dark:text-gray-500 leading-relaxed mb-5 md:mb-8 max-w-lg mx-auto lg:mx-0">
							Mengelola kompetisi, penilaian, dan pelatihan Paskibra modern
							dengan teknologi digital terkini untuk membentuk generasi muda
							yang disiplin, tangguh, dan berkarakter.
						</p>
						<div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
							<Link
								to="/events"
								className="inline-flex items-center gap-2 px-5 py-2.5 md:px-6 md:py-3 rounded-full bg-gray-900/[0.06] dark:bg-white/[0.06] border border-gray-300/50 dark:border-white/10 text-gray-800 dark:text-white text-xs md:text-sm font-medium hover:bg-gray-900/[0.12] dark:hover:bg-white/[0.12] hover:border-gray-400/50 dark:hover:border-white/20 transition-all duration-300 group"
							>
								<span>Jelajahi Event</span>
								<LuArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
							</Link>
							<Link
								to="/register"
								className="inline-flex items-center gap-2 px-5 py-2.5 md:px-6 md:py-3 rounded-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white text-xs md:text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-300 group"
							>
								<span>Selenggarakan Event Anda</span>
								<LuArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
							</Link>
						</div>

						{/* Stats */}
						<div className="mt-8 md:mt-12">
							<div className="w-16 h-[1px] bg-gray-300 dark:bg-white/10 mx-auto lg:mx-0 mb-5 md:mb-8" />
							<div className="flex items-center justify-center lg:justify-start gap-3 sm:gap-6 md:gap-10">
								{stats.map((stat, i) => (
									<React.Fragment key={stat.label}>
										{i > 0 && (
											<div className="w-[1px] h-8 sm:h-12 bg-gray-200 dark:bg-white/10" />
										)}
										<div className="flex items-center gap-2 sm:gap-3">
											<div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] flex items-center justify-center">
												<stat.icon className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 dark:text-red-400/80" />
											</div>
											<div>
												<p className="text-base sm:text-lg md:text-xl font-bold text-gray-800 dark:text-white">
													{stat.value}
												</p>
												<p className="text-[7px] sm:text-[9px] md:text-[10px] tracking-wider text-gray-400 dark:text-gray-500 font-medium">
													{stat.label}
												</p>
											</div>
										</div>
									</React.Fragment>
								))}
							</div>
						</div>
					</div>

					{/* Right: Banner Carousel */}
					<div className="flex-shrink-0 flex flex-col items-center">
						<div className="relative section-icon-glow scale-[0.7] sm:scale-[0.85] lg:scale-100 origin-center">
							<HeroBannerCarousel events={pinnedEvents} />
						</div>
					</div>
				</div>
			</div>

			{/* Scroll down indicator */}
			<button
				onClick={onScrollNext}
				className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
			>
				<span className="text-[10px] tracking-widest font-medium">
					SCROLL
				</span>
				<LuChevronDown className="w-4 h-4 animate-scroll-bounce" />
			</button>
		</>
	);
};

export default HeroSection;
