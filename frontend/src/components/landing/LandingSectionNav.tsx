import React from "react";
import { LuHouse, LuStore, LuTicket, LuVote } from "react-icons/lu";

interface LandingSectionNavProps {
	activeSection: number;
	onNavigate: (index: number) => void;
}

const navItems = [
	{ id: "home", label: "Beranda", icon: LuHouse },
	{ id: "marketplace", label: "Marketplace", icon: LuStore },
	{ id: "e-ticketing", label: "E-Ticketing", icon: LuTicket },
	{ id: "e-voting", label: "E-Voting", icon: LuVote },
];

const LandingSectionNav: React.FC<LandingSectionNavProps> = ({
	activeSection,
	onNavigate,
}) => {
	return (
		<nav className="fixed left-0 top-0 h-screen w-14 md:w-[72px] z-50 flex flex-col items-center justify-center gap-2">
			{/* Logo at top */}
			<div className="absolute top-5 left-1/2 -translate-x-1/2">
				<div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-black border border-white/10 shadow-lg shadow-black/20 flex items-center justify-center overflow-hidden">
					<img
						src="/simpaskor.webp"
						alt="Logo"
						className="w-6 h-6 md:w-7 md:h-7 object-contain"
					/>
				</div>
			</div>

			{/* Navigation Items */}
			<div className="flex flex-col items-center gap-1.5">
				{navItems.map((item, index) => {
					const isActive = activeSection === index;
					const Icon = item.icon;

					return (
						<button
							key={item.id}
							onClick={() => onNavigate(index)}
							className="group relative flex flex-col items-center gap-0.5 outline-none"
							aria-label={item.label}
						>
							{/* Active indicator line */}
							{isActive && (
								<div className="absolute -left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-red-500 rounded-r-full transition-all" />
							)}

							<div
								className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
									isActive
										? "bg-red-500/15 text-red-400 scale-110 shadow-lg shadow-red-500/10"
										: "bg-white/[0.03] text-gray-500 hover:bg-white/[0.08] hover:text-gray-300"
								}`}
							>
								<Icon className="w-[18px] h-[18px] md:w-5 md:h-5" />
							</div>

							<span
								className={`text-[8px] md:text-[9px] font-medium transition-all duration-300 leading-tight ${
									isActive
										? "text-red-400 opacity-100"
										: "text-gray-600 opacity-0 group-hover:opacity-100"
								}`}
							>
								{item.label}
							</span>

							{/* Tooltip on hover */}
							<div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-gray-900 border border-white/10 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
								{item.label}
								<div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
							</div>
						</button>
					);
				})}
			</div>

			{/* Section indicator dots at bottom */}
			<div className="absolute bottom-6 flex flex-col items-center gap-1.5">
				{navItems.map((_, index) => (
					<button
						key={index}
						onClick={() => onNavigate(index)}
						className={`transition-all duration-300 rounded-full ${
							activeSection === index
								? "w-1.5 h-5 bg-red-500"
								: "w-1.5 h-1.5 bg-white/20 hover:bg-white/40"
						}`}
						aria-label={`Go to section ${index + 1}`}
					/>
				))}
			</div>
		</nav>
	);
};

export default LandingSectionNav;
