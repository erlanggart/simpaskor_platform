import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import {
	LuCalendar,
	LuUser,
	LuLogOut,
	LuSun,
	LuMoon,
	LuMail,
	LuHouse,
} from "react-icons/lu";
import Swal from "sweetalert2";
import "../components/landing/LandingPage.css";

interface NavItem {
	to: string;
	label: string;
	icon: React.ComponentType<{ className?: string }>;
}

const getNavItems = (role?: string): NavItem[] => {
	if (role === "JURI") {
		return [
			{ to: "/juri/dashboard", label: "Dashboard", icon: LuHouse },
			{ to: "/juri/invitations", label: "Undangan", icon: LuMail },
			{ to: "/juri/events", label: "Event", icon: LuCalendar },
			{ to: "/juri/profile", label: "Profile", icon: LuUser },
		];
	}
	// PANITIA (default)
	return [
		{ to: "/panitia/dashboard", label: "Dashboard", icon: LuHouse },
		{ to: "/panitia/events-list", label: "Events", icon: LuCalendar },
		{ to: "/panitia/profile", label: "Profile", icon: LuUser },
	];
};

export const PreAssignLayout: React.FC = () => {
	const { user, logout } = useAuth();
	const { theme, toggleTheme } = useTheme();
	const navigate = useNavigate();
	const location = useLocation();
	const [themeAnimating, setThemeAnimating] = useState(false);

	const navItems = getNavItems(user?.role);

	const handleLogout = async () => {
		const result = await Swal.fire({
			title: "Logout?",
			text: "Yakin ingin keluar dari aplikasi?",
			icon: "question",
			showCancelButton: true,
			confirmButtonColor: "#ef4444",
			cancelButtonColor: "#6B7280",
			confirmButtonText: "Ya, Logout",
			cancelButtonText: "Batal",
			reverseButtons: true,
		});

		if (result.isConfirmed) {
			logout();
			navigate("/login");
		}
	};

	return (
		<div className="h-screen w-screen overflow-hidden relative">
			{/* Fixed background with grid + gradient */}
			<div className="main-layout-bg" />
			<div className="neon-red-lines" />

			{/* ===== Left Sidebar Navigation (desktop) ===== */}
			<nav className="fixed left-0 top-0 h-screen w-14 md:w-[72px] z-50 hidden md:flex flex-col items-center gap-2 border-r border-gray-200/10 dark:border-white/5">
				{/* Logo at top */}
				<div className="mt-4 mb-6">
					<Link to="/">
						<div className="w-9 h-9 rounded-xl bg-black border border-white/10 shadow-lg shadow-black/20 flex items-center justify-center overflow-hidden">
							<img
								src="/simpaskor.webp"
								alt="Logo"
								className="w-7 h-7 object-contain"
							/>
						</div>
					</Link>
				</div>

				{/* Navigation Items (centered) */}
				<div className="flex-1 flex flex-col items-center justify-center gap-1.5">
					{navItems.map((item) => {
						const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
						const Icon = item.icon;

						return (
							<Link
								key={item.to}
								to={item.to}
								className="group relative flex flex-col items-center gap-0.5 outline-none"
								aria-label={item.label}
							>
								{isActive && (
									<div className="absolute -left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-red-500 rounded-r-full transition-all" />
								)}

								<div
									className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
										isActive
											? "bg-red-500/15 text-red-500 dark:text-red-400 scale-110 shadow-lg shadow-red-500/10"
											: "bg-gray-100/50 dark:bg-white/[0.03] text-gray-400 dark:text-gray-500 hover:bg-gray-200/70 dark:hover:bg-white/[0.08] hover:text-gray-700 dark:hover:text-gray-300"
									}`}
								>
									<Icon className="w-5 h-5" />
								</div>

								<span
									className={`text-[9px] font-medium transition-all duration-300 leading-tight ${
										isActive
											? "text-red-500 dark:text-red-400 opacity-100"
											: "text-gray-500 dark:text-gray-600 opacity-0 group-hover:opacity-100"
									}`}
								>
									{item.label}
								</span>

								{/* Tooltip */}
								<div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
									{item.label}
									<div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-white dark:border-r-gray-900" />
								</div>
							</Link>
						);
					})}
				</div>

				{/* Bottom: Theme Toggle + Logout */}
				<div className="mb-6 flex flex-col items-center gap-1.5">
					{/* Theme Toggle */}
					<button
						onClick={() => { setThemeAnimating(true); toggleTheme(); setTimeout(() => setThemeAnimating(false), 500); }}
						className="group relative flex flex-col items-center gap-0.5 outline-none"
						aria-label="Toggle theme"
					>
						<div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 bg-gray-100/50 dark:bg-white/[0.03] text-gray-400 dark:text-gray-500 hover:bg-gray-200/70 dark:hover:bg-white/[0.08] hover:text-gray-700 dark:hover:text-gray-300">
							<div className={`transition-all duration-500 ${themeAnimating ? "scale-0 rotate-180" : "scale-100 rotate-0"}`}>
								{theme === "light" ? (
									<LuMoon className="w-5 h-5" />
								) : (
									<LuSun className="w-5 h-5" />
								)}
							</div>
						</div>
						<span className="text-[9px] font-medium text-gray-500 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-all duration-300 leading-tight">
							Theme
						</span>
						<div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
							{theme === "light" ? "Dark Mode" : "Light Mode"}
							<div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-white dark:border-r-gray-900" />
						</div>
					</button>

					{/* Logout */}
					<button
						onClick={handleLogout}
						className="group relative flex flex-col items-center gap-0.5 outline-none"
						aria-label="Logout"
					>
						<div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 bg-gray-100/50 dark:bg-white/[0.03] text-gray-400 dark:text-gray-500 hover:bg-red-500/15 hover:text-red-500 dark:hover:text-red-400">
							<LuLogOut className="w-5 h-5" />
						</div>
						<span className="text-[9px] font-medium text-gray-500 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-all duration-300 leading-tight">
							Logout
						</span>
						<div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
							Logout
							<div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-white dark:border-r-gray-900" />
						</div>
					</button>
				</div>
			</nav>

			{/* ===== Main Content Area ===== */}
			<main className="h-screen overflow-y-auto relative z-10 pl-0 md:pl-[72px] pb-20 md:pb-6">
				<Outlet />
			</main>

			{/* ===== Mobile Bottom Navigation ===== */}
			<nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
				<div className="mx-3 mb-3 px-2 py-2 rounded-2xl bg-white/80 dark:bg-white/[0.06] backdrop-blur-xl border border-gray-200/50 dark:border-white/[0.08] shadow-lg shadow-black/5 dark:shadow-black/20">
					<div className="flex items-center justify-around">
						{navItems.map((item) => {
							const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
							const Icon = item.icon;
							return (
								<Link
									key={item.to}
									to={item.to}
									className="group relative flex flex-col items-center gap-0.5 outline-none"
									aria-label={item.label}
								>
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
		</div>
	);
};

export default PreAssignLayout;
