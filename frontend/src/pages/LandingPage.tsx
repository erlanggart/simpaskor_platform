import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
	LuArrowRight,
	LuUsers,
	LuTrophy,
	LuCalendar,
	LuLayoutGrid,
	LuChartPie,
	LuGavel,
	LuChartBar,
	LuShield,
	LuHouse,
} from "react-icons/lu";
import { useLandingData } from "../hooks/useLandingData";
import HeroSection from "../components/landing/HeroSection";
import EventSection from "../components/landing/EventSection";
import PinnedPersonCarousel from "../components/landing/PinnedPersonCarousel";
import "../components/landing/LandingPage.css";

// Right-side section navigation labels
const sectionNavLabels = [
	{ id: "hero", label: "Hero", icon: LuHouse },
	{ id: "events", label: "Event", icon: LuLayoutGrid },
	{ id: "statistics", label: "Statistik", icon: LuChartPie },
	{ id: "jury", label: "Juri", icon: LuGavel },
	{ id: "pelatih", label: "Pelatih", icon: LuUsers },
];

const LandingPage: React.FC = () => {
	const [activeSection, setActiveSection] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);
	const sectionRefs = useRef<(HTMLElement | null)[]>([]);
	const { pinnedEvents, publicStats, juries, pelatih, loading } = useLandingData();

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
			value: loading ? "..." : `${publicStats.pesertaCount || 1185}+`,
			label: "ANGGOTA RESMI",
			icon: LuUsers,
		},
		{
			value: loading ? "..." : `${publicStats.eventsCount || 34}`,
			label: "TOTAL EVENT",
			icon: LuTrophy,
		},
		{
			value: "2025",
			label: "BERDIRI",
			icon: LuCalendar,
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

				{/* ===== SECTION 3: STATISTICS ===== */}
				<section ref={setSectionRef(2)} className="landing-section-inner">
					<div className="relative z-10 w-full max-w-6xl mx-auto px-6 md:px-12 lg:px-16">
						<div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
							{/* Left: Text */}
							<div className="flex-1 text-center lg:text-left max-w-2xl">
								<p className="text-[10px] md:text-xs tracking-[0.3em] text-gray-400 dark:text-gray-400 font-medium mb-4">
									DATA & STATISTIK
								</p>
								<h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-none mb-3 landing-title-gradient-ticketing">
									STATISTIK
								</h1>
								<p className="text-sm md:text-base text-gray-500 dark:text-gray-400 font-medium tracking-wide mb-6">
									Platform Terpercaya
								</p>
								<div className="w-12 h-[1px] bg-gradient-to-r from-yellow-500/50 to-transparent mx-auto lg:mx-0 mb-6" />
								<p className="text-sm md:text-base text-gray-500 dark:text-gray-500 leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">
									Simpaskor telah dipercaya oleh ribuan anggota dan puluhan
									penyelenggara event di seluruh Indonesia. Data real-time yang
									transparan dan akurat.
								</p>
								<Link
									to="/marketplace"
									className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gray-900/[0.06] dark:bg-white/[0.06] border border-gray-300/50 dark:border-white/10 text-gray-800 dark:text-white text-sm font-medium hover:bg-gray-900/[0.12] dark:hover:bg-white/[0.12] hover:border-gray-400/50 dark:hover:border-white/20 transition-all duration-300 group"
								>
									<span>Lihat Selengkapnya</span>
									<LuArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
								</Link>
							</div>

							{/* Right: Stats visual placeholder */}
							<div className="flex-shrink-0 hidden lg:flex flex-col items-center gap-6">
								<div className="relative section-icon-glow-yellow">
									<div className="grid grid-cols-2 gap-4">
										{[
											{ icon: LuChartBar, label: "Data" },
											{ icon: LuUsers, label: "Anggota" },
											{ icon: LuTrophy, label: "Event" },
											{ icon: LuShield, label: "Terpercaya" },
										].map((item, i) => (
											<div
												key={i}
												className={`w-20 h-20 xl:w-24 xl:h-24 rounded-2xl bg-gray-100/50 dark:bg-white/[0.03] border border-gray-200/50 dark:border-white/[0.06] flex flex-col items-center justify-center gap-2 transition-all duration-500 hover:bg-gray-200/50 dark:hover:bg-white/[0.08] hover:border-gray-300/50 dark:hover:border-white/[0.12] hover:scale-105 ${
													i % 2 === 0 ? "animate-float" : "animate-float-delayed"
												}`}
											>
												<item.icon className="w-6 h-6 xl:w-7 xl:h-7 text-gray-500 dark:text-gray-400" />
												<span className="text-[9px] xl:text-[10px] text-gray-400 dark:text-gray-500 font-medium">
													{item.label}
												</span>
											</div>
										))}
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* ===== SECTION 4: JURY ===== */}
				<section ref={setSectionRef(3)} className="landing-section-inner">
					<div className="relative z-10 w-full max-w-6xl mx-auto px-6 md:px-12 lg:px-16">
						<div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
							{/* Left: Text */}
							<div className="flex-1 text-center lg:text-left max-w-2xl">
								<p className="text-[10px] md:text-xs tracking-[0.3em] text-gray-400 dark:text-gray-400 font-medium mb-4">
									JURI PROFESIONAL
								</p>
								<h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-none mb-3 landing-title-gradient-voting">
									JURI
								</h1>
								<p className="text-sm md:text-base text-gray-500 dark:text-gray-400 font-medium tracking-wide mb-6">
									Tim Penilai Berpengalaman
								</p>
								<div className="w-12 h-[1px] bg-gradient-to-r from-purple-500/50 to-transparent mx-auto lg:mx-0 mb-6" />
								<p className="text-sm md:text-base text-gray-500 dark:text-gray-500 leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">
									Sistem penilaian yang adil dan transparan didukung oleh
									juri-juri berpengalaman. Setiap aspek dinilai secara
									profesional dengan standar nasional.
								</p>
								<div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
									<Link
										to="/juries"
										className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gray-900/[0.06] dark:bg-white/[0.06] border border-gray-300/50 dark:border-white/10 text-gray-800 dark:text-white text-sm font-medium hover:bg-gray-900/[0.12] dark:hover:bg-white/[0.12] hover:border-gray-400/50 dark:hover:border-white/20 transition-all duration-300 group"
									>
										<span>Lihat Semua Juri</span>
										<LuArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
									</Link>
									<Link
										to="/register"
										className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white text-sm font-medium shadow-sm hover:shadow-md transition-all duration-300 group"
									>
										<span>Daftar sebagai Juri</span>
										<LuArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
									</Link>
								</div>
							</div>

							{/* Right: Pinned Juri Carousel */}
							<div className="flex-shrink-0 hidden lg:flex flex-col items-center gap-6">
								<PinnedPersonCarousel persons={juries} accentColor="purple" linkPrefix="/juries" />
							</div>
						</div>
					</div>
				</section>

				{/* ===== SECTION 5: PELATIH ===== */}
				<section ref={setSectionRef(4)} className="landing-section-inner">
					<div className="relative z-10 w-full max-w-6xl mx-auto px-6 md:px-12 lg:px-16">
						<div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
							{/* Left: Text */}
							<div className="flex-1 text-center lg:text-left max-w-2xl">
								<p className="text-[10px] md:text-xs tracking-[0.3em] text-gray-400 dark:text-gray-400 font-medium mb-4">
									PELATIH PROFESIONAL
								</p>
								<h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-none mb-3 landing-title-gradient-coaching">
									PELATIH
								</h1>
								<p className="text-sm md:text-base text-gray-500 dark:text-gray-400 font-medium tracking-wide mb-6">
									Bimbing Atlet Unggulan
								</p>
								<div className="w-12 h-[1px] bg-gradient-to-r from-blue-500/50 to-transparent mx-auto lg:mx-0 mb-6" />
								<p className="text-sm md:text-base text-gray-500 dark:text-gray-500 leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">
									Pelatih profesional yang berpengalaman dalam membentuk
									atlet-atlet berprestasi. Dengan metode pelatihan terkini
									dan pendekatan personal untuk setiap atlet.
								</p>
								<div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
									<Link
										to="/pelatih"
										className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gray-900/[0.06] dark:bg-white/[0.06] border border-gray-300/50 dark:border-white/10 text-gray-800 dark:text-white text-sm font-medium hover:bg-gray-900/[0.12] dark:hover:bg-white/[0.12] hover:border-gray-400/50 dark:hover:border-white/20 transition-all duration-300 group"
									>
										<span>Lihat Semua Pelatih</span>
										<LuArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
									</Link>
									<Link
										to="/register"
										className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white text-sm font-medium shadow-sm hover:shadow-md transition-all duration-300 group"
									>
										<span>Daftar sebagai Pelatih</span>
										<LuArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
									</Link>
								</div>
							</div>

							{/* Right: Pinned Pelatih Carousel */}
							<div className="flex-shrink-0 hidden lg:flex flex-col items-center gap-6">
								<PinnedPersonCarousel persons={pelatih} accentColor="blue" linkPrefix="/pelatih" />
							</div>
						</div>
					</div>
				</section>

			</div>
		</div>
	);
};

export default LandingPage;
