import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ThemeToggle } from "../components/ThemeToggle";
import { useAuth } from "../hooks/useAuth";
import { LuHouse, LuStore, LuTicket, LuVote, LuCalendar } from "react-icons/lu";
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

	return (
		<div className="h-screen w-screen overflow-hidden relative">
			{/* Fixed background with grid + gradient (dark/light aware) */}
			<div className="main-layout-bg" />
			<div className="neon-red-lines" />

			{/* ===== Top Header Bar ===== */}
			{showNavbar && (
				<header className="fixed top-0 left-0 md:left-[72px] right-0 h-14 z-40 flex items-center justify-between md:justify-end px-4 md:px-8">
					{/* Left: Logo + Brand */}
					<div className="flex md:hidden items-center gap-3">
						<img
							src="/simpaskor.webp"
							alt="Simpaskor"
							className="w-7 h-7 object-contain"
						/>
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

			{/* ===== Left Sidebar Navigation (desktop only) ===== */}
			{showNavbar && (
				<nav className="fixed left-0 top-0 h-screen w-14 md:w-[72px] z-50 hidden md:flex flex-col items-center justify-center gap-2 border-r border-gray-200/10 dark:border-white/5">
					{/* Logo at top */}
					<div className="absolute top-4 left-1/2 -translate-x-1/2">
						<Link to="/">
							<div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-gray-100 dark:bg-white/5 backdrop-blur-sm border border-gray-200/50 dark:border-white/10 flex items-center justify-center overflow-hidden transition-colors">
								<img
									src="/simpaskor.webp"
									alt="Logo"
									className="w-6 h-6 md:w-7 md:h-7 object-contain"
								/>
							</div>
						</Link>
					</div>

					{/* Navigation Items */}
					<div className="flex flex-col items-center gap-1.5">
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
												? "bg-red-500/15 text-red-500 dark:text-red-400 scale-110 shadow-lg shadow-red-500/10"
												: "bg-gray-100/50 dark:bg-white/[0.03] text-gray-400 dark:text-gray-500 hover:bg-gray-200/70 dark:hover:bg-white/[0.08] hover:text-gray-700 dark:hover:text-gray-300"
										}`}
									>
										<Icon className="w-[18px] h-[18px] md:w-5 md:h-5" />
									</div>

									<span
										className={`text-[8px] md:text-[9px] font-medium transition-all duration-300 leading-tight ${
											isActive
												? "text-red-500 dark:text-red-400 opacity-100"
												: "text-gray-500 dark:text-gray-600 opacity-0 group-hover:opacity-100"
										}`}
									>
										{item.label}
									</span>

									{/* Tooltip on hover */}
									<div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
										{item.label}
										<div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-white dark:border-r-gray-900" />
									</div>
								</Link>
							);
						})}
					</div>
				</nav>
			)}

			{/* ===== Main Content Area ===== */}
			<main
				className={`h-screen overflow-y-auto relative z-10 ${
					showNavbar ? "pl-0 md:pl-[72px] pt-14 pb-16 md:pb-0" : ""
				}`}
				style={showNavbar ? { height: "100vh" } : undefined}
			>
				<Outlet />
			</main>

			{/* ===== Mobile Bottom Navigation ===== */}
			{showNavbar && (
				<nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
					<div className="mx-3 mb-3 px-2 py-2 rounded-2xl bg-white/80 dark:bg-white/[0.06] backdrop-blur-xl border border-gray-200/50 dark:border-white/[0.08] shadow-lg shadow-black/5 dark:shadow-black/20">
						<div className="flex items-center justify-around">
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
										className="group relative flex flex-col items-center gap-0.5 outline-none"
										aria-label={item.label}
									>
										{/* Active indicator dot */}
										{isActive && (
											<div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-red-500 rounded-full" />
										)}

										<div
											className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
												isActive
													? "bg-red-500/15 text-red-500 dark:text-red-400 scale-110"
													: "text-gray-400 dark:text-gray-500"
											}`}
										>
											<Icon className="w-[18px] h-[18px]" />
										</div>

										<span
											className={`text-[8px] font-medium leading-tight ${
												isActive
													? "text-red-500 dark:text-red-400"
													: "text-gray-400 dark:text-gray-500"
											}`}
										>
											{item.label}
										</span>
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
		default:
			return "/dashboard";
	}
};
