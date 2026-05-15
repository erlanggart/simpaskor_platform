import React from "react";
import { Link } from "react-router-dom";
import { LuArrowRight } from "react-icons/lu";
import LandingEventGrid from "./LandingEventGrid";

const EventSection: React.FC = () => {
	return (
		<div className="relative z-10 w-full max-w-5xl mx-auto px-6 md:px-10 lg:px-12 md:pr-20 lg:pr-24">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
				<div>
					<p className="text-[10px] md:text-xs tracking-[0.3em] text-gray-400 dark:text-gray-400 font-medium mb-3">
						KELOLA & IKUTI EVENT
					</p>
					<h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-none mb-2 landing-title-gradient-marketplace">
						EVENT
					</h1>
					<div className="flex items-center gap-4">
						<div className="w-10 h-[1px] bg-gradient-to-r from-orange-500/50 to-transparent" />
						<p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium tracking-wide">
							Kompetisi Paskibra Se-Indonesia
						</p>
					</div>
				</div>
				<Link
					to="/events"
					className="landing-modern-btn landing-modern-btn-orange group flex-shrink-0"
				>
					<span>Jelajahi Event</span>
					<LuArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
				</Link>
			</div>

			{/* Event Grid - fetches its own data */}
			<LandingEventGrid />
		</div>
	);
};

export default EventSection;
