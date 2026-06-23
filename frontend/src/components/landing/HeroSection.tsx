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
		iconClassName?: string;
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
			<div className="relative z-10 w-full max-w-6xl mx-auto px-5 sm:px-6 md:px-12 lg:px-16">
				<div className="flex flex-col lg:flex-row items-center justify-between gap-5 lg:gap-16">
					{/* Left: Hero Text */}
					<div className="w-full flex-1 text-center lg:text-left max-w-2xl">
						<p className="text-[9px] sm:text-[10px] md:text-xs tracking-[0.24em] sm:tracking-[0.3em] text-slate-700 dark:text-gray-400 font-medium mb-2 md:mb-4">
							Teamwork Makes The Dream Work
						</p>
						<h1 className="text-[2.55rem] sm:text-5xl md:text-7xl lg:text-8xl font-black leading-none mb-0 md:mb-0 simpaskor-animated-title">
							{"SIMPASKOR".split("").map((letter, i) => (
								<span
									key={i}
									className="simpaskor-letter"
									style={{
										"--letter-delay": `${i * 0.055}s`,
									} as React.CSSProperties}
								>
									{letter}
								</span>
							))}
						</h1>
						<div className="simpaskor-underline mx-auto lg:mx-0" />

						<p className="text-xs sm:text-sm md:text-base text-gray-500 dark:text-gray-500 leading-relaxed mb-4 md:mb-8 max-w-[20rem] sm:max-w-lg mx-auto lg:mx-0">
							Solusi All-in-One: Transformasi Digital untuk Rekap Nilai, Tiketing, dan Voting.
						</p>
						<div className="grid w-full max-w-[18.5rem] grid-cols-1 gap-2.5 mx-auto sm:max-w-none sm:flex sm:flex-row sm:flex-wrap sm:items-center sm:justify-center lg:justify-start">
							<Link
								to="/tentang"
								className="landing-modern-btn landing-modern-btn-ghost group w-full sm:w-auto md:px-6 md:py-3"
							>
								<span>Apa itu SIMPASKOR</span>
								<LuArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
							</Link>
							<Link
								to="/register"
								className="landing-modern-btn landing-modern-btn-primary group w-full sm:w-auto md:px-6 md:py-3"
							>
								<span>Selenggarakan Event Anda</span>
								<LuArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
							</Link>
						</div>

						{/* Stats */}
						<div className="mt-6 md:mt-12">
							<div className="w-16 h-[1px] bg-gray-300 dark:bg-white/10 mx-auto lg:mx-0 mb-4 md:mb-8" />
							<div className="grid grid-cols-2 gap-2.5 sm:flex sm:items-center sm:justify-center lg:justify-start sm:gap-6 md:gap-10">
								{stats.map((stat, i) => (
									<React.Fragment key={stat.label}>
										{i > 0 && (
											<div className="hidden sm:block w-[1px] h-8 sm:h-12 bg-gray-200 dark:bg-white/10" />
										)}
										<div className="landing-stat-card flex items-center gap-2 rounded-2xl border border-gray-200/70 bg-white/80 px-2.5 py-2 text-left shadow-sm shadow-gray-900/[0.03] dark:border-white/[0.08] dark:bg-white/[0.04] sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:gap-3">
											<div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-gray-900 dark:bg-black border border-gray-800 dark:border-white/10 flex shrink-0 items-center justify-center overflow-hidden">
												<stat.icon className={`${stat.iconClassName ?? "w-7 h-7 sm:w-8 sm:h-8"} text-red-500 dark:text-red-400/80`} />
											</div>
											<div className="min-w-0 sm:min-w-fit">
												<p className="text-base sm:text-lg md:text-xl font-bold text-gray-800 dark:text-white whitespace-nowrap">
													{stat.value}
												</p>
												<p className="text-[7px] sm:text-[9px] md:text-[10px] tracking-normal sm:tracking-wide text-gray-400 dark:text-gray-500 font-medium leading-tight sm:whitespace-nowrap">
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
					<div className="hidden lg:flex flex-shrink-0 flex-col items-center">
						<div className="relative section-icon-glow scale-[0.7] sm:scale-[0.85] lg:scale-100 origin-center">
							<HeroBannerCarousel events={pinnedEvents} />
						</div>
					</div>
				</div>
			</div>

			{/* Scroll down indicator */}
			<button
				onClick={onScrollNext}
				className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
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
