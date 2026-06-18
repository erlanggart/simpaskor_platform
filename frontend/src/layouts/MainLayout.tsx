import React, { useState, Suspense } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ThemeToggle } from "../components/ThemeToggle";
import { RouteFallback } from "../components/RouteFallback";
import { useAuth } from "../hooks/useAuth";
import { LuHouse, LuStore, LuTicket, LuVote, LuCalendar, LuMenu, LuX } from "react-icons/lu";
import "../components/landing/LandingPage.css";

interface MainLayoutProps {
	showNavbar?: boolean;
	showFooter?: boolean;
}

const featureNav = [
	{ to: "/", label: "Home", icon: LuHouse },
	{ to: "/events", label: "Event", icon: LuCalendar },
	{ to: "/marketplace", label: "Marketplace", icon: LuStore },
	{ to: "/e-ticketing", label: "E-Ticketing", icon: LuTicket },
	{ to: "/e-voting", label: "E-Voting", icon: LuVote },
];

export const MainLayout: React.FC<MainLayoutProps> = ({
	showNavbar = true,
}) => {
	const { isAuthenticated, user } = useAuth();
	const location = useLocation();
	const [showMobileMenu, setShowMobileMenu] = useState(false);
	const isIPhone = typeof navigator !== "undefined" && /iPhone|iPod/i.test(navigator.userAgent);

	return (
		<div
			className={`h-screen w-screen overflow-hidden relative ${
				showNavbar && !isIPhone ? "has-mobile-bottom-nav" : ""
			}`}
		>
			{/* Fixed background with grid + gradient (dark/light aware) */}
			<div className="main-layout-bg" />

			{/* ===== Top Header Bar ===== */}
			{showNavbar && (
				<header className="main-top-header absolute top-0 left-0 right-0 h-14 z-40 flex items-center justify-between px-4 md:px-8">
					{/* Left: Logo + iPhone hamburger */}
					<div className="flex items-center gap-3">
						{isIPhone && (
							<button
								type="button"
								onClick={() => setShowMobileMenu(true)}
								className="w-10 h-10 rounded-xl bg-gray-100/80 dark:bg-white/[0.06] border border-gray-200/60 dark:border-white/[0.08] text-gray-700 dark:text-gray-200 flex items-center justify-center backdrop-blur-xl"
								aria-label="Buka menu"
							>
								<LuMenu className="w-5 h-5" />
							</button>
						)}
						<Link to="/" aria-label="Simpaskor Home">
							<div className="w-9 h-9 rounded-xl bg-black border border-white/10 shadow-lg shadow-black/10 flex items-center justify-center">
								<img
									src="/simpaskor.webp"
									alt="Simpaskor"
									className="w-7 h-7 object-contain"
								/>
							</div>
						</Link>
						{/* <span className="text-sm font-bold text-gray-800 dark:text-white tracking-wide hidden sm:block">
							SIMPASKOR
						</span> */}
					</div>

					{/* Right: Theme toggle + Auth */}
					<div className="flex items-center gap-3">
						<ThemeToggle />
						{isAuthenticated ? (
							<Link
								to={getDashboardPath(user?.role)}
								className="px-4 py-1.5 bg-red-600 text-white rounded-full text-xs font-semibold hover:bg-red-700 transition-colors shadow-lg hover:shadow-red-500/25"
							>
								Dashboard
							</Link>
						) : (
							<Link
								to="/login"
								className="px-4 py-1.5 bg-red-600 text-white rounded-full text-xs font-semibold hover:bg-red-700 transition-colors shadow-lg hover:shadow-red-500/25"
							>
								Masuk
							</Link>
						)}
					</div>
				</header>
			)}

			{/* ===== Main Content Area ===== */}
			<main
				className={`main-content-shell h-screen overflow-y-auto relative z-10 ${
					showNavbar
						? isIPhone
							? "pt-14 pb-0 md:pb-0"
							: "pt-14 pb-16 md:pb-0"
						: ""
				}`}
				style={showNavbar ? { height: "100vh" } : undefined}
			>
				<Suspense fallback={<RouteFallback />}>
					<Outlet />
				</Suspense>
			</main>

			{/* ===== iPhone Hamburger Menu ===== */}
			{showNavbar && isIPhone && showMobileMenu && (
				<>
					<button
						type="button"
						className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden"
						onClick={() => setShowMobileMenu(false)}
						aria-label="Tutup menu"
					/>
					<div className="fixed left-3 right-3 top-3 z-[60] md:hidden rounded-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/60 dark:border-white/[0.08] shadow-2xl shadow-black/10 overflow-hidden">
						<div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/50 dark:border-white/[0.06]">
							<div className="flex items-center gap-3 min-w-0">
								<div className="w-10 h-10 rounded-xl bg-black border border-white/10 shadow-lg shadow-black/10 flex items-center justify-center">
									<img
										src="/simpaskor.webp"
										alt="Simpaskor"
										className="w-8 h-8 object-contain"
									/>
								</div>
								<span className="text-sm font-bold text-gray-900 dark:text-white">Simpaskor</span>
							</div>
							<button
								type="button"
								onClick={() => setShowMobileMenu(false)}
								className="w-9 h-9 rounded-xl text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white flex items-center justify-center"
								aria-label="Tutup menu"
							>
								<LuX className="w-5 h-5" />
							</button>
						</div>
						<div className="p-2">
							{featureNav.map((item) => {
								const isActive =
									item.to === "/"
										? location.pathname === "/"
										: location.pathname.startsWith(item.to);
								const Icon = item.icon;

								return (
									<Link
										key={item.to}
										to={item.to}
										onClick={() => setShowMobileMenu(false)}
										className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
											isActive
												? "bg-red-500/10 text-red-600 dark:text-red-400"
												: "text-gray-700 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-white/[0.06]"
										}`}
									>
										<Icon className="w-5 h-5" />
										{item.label}
									</Link>
								);
							})}
						</div>
					</div>
				</>
			)}

			{/* ===== Mobile Bottom Navigation ===== */}
			{showNavbar && !isIPhone && (
				<nav className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 md:hidden">
					<div className="mobile-bottom-nav-shell mx-3 mb-3">
						<div className="flex items-stretch justify-between">
							{featureNav.map((item) => {
								const isActive =
									item.to === "/"
										? location.pathname === "/"
										: location.pathname.startsWith(item.to);
								const Icon = item.icon;
								return (
									<Link
										key={item.to}
										to={item.to}
										className={`mobile-nav-item ${isActive ? "mobile-nav-item-active" : ""}`}
										aria-label={item.label}
										aria-current={isActive ? "page" : undefined}
									>
										<span className="mobile-nav-icon-wrap">
											<Icon className="mobile-nav-icon-svg" strokeWidth={isActive ? 2.4 : 2} />
										</span>
										<span className="mobile-nav-label">{item.label}</span>
									</Link>
								);
							})}
						</div>
					</div>
				</nav>
			)}
		</div>
	);
};

// Helper function
const getDashboardPath = (role?: string) => {
	if (role === "PANITIA") {
		try {
			const stored = localStorage.getItem("panitia_active_event");
			if (stored) {
				const eventData = JSON.parse(stored);
				if (eventData.slug) return `/panitia/events/${eventData.slug}/manage`;
			}
		} catch {
			// ignore
		}
		return "/panitia/dashboard";
	}
	if (role === "JURI") {
		try {
			const stored = localStorage.getItem("juri_active_event");
			if (stored) {
				const eventData = JSON.parse(stored);
				if (eventData.slug) return `/juri/events/${eventData.slug}/info`;
			}
		} catch {
			// ignore
		}
		return "/juri/dashboard";
	}
	switch (role) {
		case "SUPERADMIN":
			return "/admin/dashboard";
		case "PESERTA":
			return "/peserta/dashboard";
		case "PELATIH":
			return "/pelatih/dashboard";
		case "MITRA":
			return "/mitra/dashboard";
		default:
			return "/dashboard";
	}
};
