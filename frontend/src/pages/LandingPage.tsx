import React, { useState, useEffect, useRef, useCallback } from "react";
import {
	LuUsers,
	LuTrophy,
	LuLayoutGrid,
	LuHouse,
	LuEye,
	LuThumbsUp,
	LuStore,
	LuTicket,
	LuPackage,
} from "react-icons/lu";
import { useLandingData } from "../hooks/useLandingData";
import HeroSection from "../components/landing/HeroSection";
import EventSection from "../components/landing/EventSection";
import TicketingSection from "../components/landing/TicketingSection";
import VotingSection from "../components/landing/VotingSection";
import MarketplaceSection from "../components/landing/MarketplaceSection";
import PricingSection from "../components/landing/PricingSection";
import "../components/landing/LandingPage.css";

// Right-side section navigation labels
const sectionNavLabels = [
	{ id: "hero", label: "Hero", icon: LuHouse },
	{ id: "events", label: "Event", icon: LuLayoutGrid },
	{ id: "ticketing", label: "Ticketing", icon: LuTicket },
	{ id: "voting", label: "Voting", icon: LuThumbsUp },
	{ id: "marketplace", label: "Marketplace", icon: LuStore },
	{ id: "paket", label: "Paket", icon: LuPackage },
];

const LandingPage: React.FC = () => {
	const [activeSection, setActiveSection] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);
	const sectionRefs = useRef<(HTMLElement | null)[]>([]);
	const { pinnedEvents, publicStats, loading } = useLandingData();
	const isIPhone = typeof navigator !== "undefined" && /iPhone|iPod/i.test(navigator.userAgent);

	const scrollToSection = useCallback((index: number) => {
		sectionRefs.current[index]?.scrollIntoView({ behavior: "smooth" });
	}, []);

	// Track which section is visible + toggle transition class
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					const target = entry.target as HTMLElement;
					if (entry.isIntersecting) {
						target.classList.add("section-visible");
						const index = sectionRefs.current.indexOf(target);
						if (index !== -1) setActiveSection(index);
					} else {
						target.classList.remove("section-visible");
					}
				});
			},
			{
				root: container,
				threshold: 0.3,
			}
		);

		sectionRefs.current.forEach((ref) => {
			if (ref) observer.observe(ref);
		});

		return () => observer.disconnect();
	}, []);

	const setSectionRef = (index: number) => (el: HTMLElement | null) => {
		sectionRefs.current[index] = el;
	};

	// Stats for home section
	const stats = [
		{
			value: loading ? "..." : `${publicStats.todayVisitors || 0}`,
			label: "PENGUNJUNG HARI INI",
			icon: LuEye,
		},
		{
			value: loading ? "..." : `${publicStats.pesertaCount || 1185}+`,
			label: "ANGGOTA RESMI",
			icon: LuUsers,
		},
		{
			value: loading ? "..." : `${publicStats.eventsCount || 34}`,
			label: "TOTAL EVENT",
			icon: LuTrophy,
		},
	];

	return (
		<div className="relative h-full">
			{/* Right-side section scroll navigation */}
			<nav className="fixed right-4 md:right-6 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-center gap-1.5">
				{sectionNavLabels.map((item, index) => {
					const isActive = activeSection === index;
					const Icon = item.icon;
					return (
						<button
							key={item.id}
							onClick={() => scrollToSection(index)}
							className="group relative flex flex-col items-center gap-0.5 outline-none"
							aria-label={item.label}
						>
							{isActive && (
								<div className="absolute -right-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-red-500 rounded-l-full transition-all" />
							)}
							<div
								className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
									isActive
										? "bg-red-500/15 text-red-500 dark:text-red-400 scale-110"
										: "bg-gray-100/50 dark:bg-white/[0.03] text-gray-400 dark:text-gray-500 hover:bg-gray-200/70 dark:hover:bg-white/[0.08] hover:text-gray-700 dark:hover:text-gray-300"
								}`}
							>
								<Icon className="w-4 h-4" />
							</div>
							<span
								className={`text-[7px] font-medium transition-all duration-300 leading-tight ${
									isActive
										? "text-red-500 dark:text-red-400 opacity-100"
										: "text-gray-500 dark:text-gray-600 opacity-0 group-hover:opacity-100"
								}`}
							>
								{item.label}
							</span>
							<div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
								{item.label}
								<div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-white dark:border-l-gray-900" />
							</div>
						</button>
					);
				})}
			</nav>

			{/* Scroll snap container */}
			<div className="landing-scroll-container" ref={containerRef}>

				{/* ===== SECTION 1: HERO ===== */}
				<section ref={setSectionRef(0)} className="landing-section-inner section-visible">
					<HeroSection
						pinnedEvents={pinnedEvents}
						stats={stats}
						onScrollNext={() => scrollToSection(1)}
					/>
				</section>

				{/* ===== SECTION 2: EVENTS ===== */}
				<section ref={setSectionRef(1)} className="landing-section-inner">
					<EventSection />
				</section>

				{/* ===== SECTION 3: E-TICKETING ===== */}
				<section ref={setSectionRef(2)} className="landing-section-inner">
					<TicketingSection />
				</section>

				{/* ===== SECTION 4: E-VOTING ===== */}
				<section ref={setSectionRef(3)} className="landing-section-inner">
					<VotingSection />
				</section>

				{/* ===== SECTION 5: MARKETPLACE ===== */}
				<section ref={setSectionRef(4)} className="landing-section-inner">
					<MarketplaceSection />
				</section>

				{/* ===== SECTION 6: PAKET ===== */}
				<section ref={setSectionRef(5)} className="landing-section-inner">
					<PricingSection />
				</section>

			</div>

			{/* Fixed WhatsApp Button */}
			<a
				href="https://wa.me/6285111209133?text=Halo%20Admin%20Simpaskor!%20Saya%20ingin%20bertanya%20mengenai%20layanan%20Simpaskor."
				target="_blank"
				rel="noopener noreferrer"
				className={`fixed right-6 md:bottom-6 z-50 w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-[0_0_20px_rgba(37,211,102,0.5)] active:scale-95 wa-float-btn${isIPhone ? " wa-float-btn--iphone" : ""}`}
				aria-label="Hubungi Admin via WhatsApp"
			>
				<svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
					<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
				</svg>
				{/* Ping ring animation */}
				<span className="absolute inset-0 rounded-full bg-[#25D366] animate-wa-ping opacity-0" />
			</a>

		</div>
	);
};

export default LandingPage;
