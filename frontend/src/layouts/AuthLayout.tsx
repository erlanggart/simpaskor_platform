import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ThemeToggle } from "../components/ThemeToggle";
import "../components/landing/LandingPage.css";

export const AuthLayout: React.FC = () => {
	const location = useLocation();
	const isLogin = location.pathname === "/login";
	const isRegister = location.pathname === "/register";

	return (
		<div className="min-h-screen relative overflow-hidden flex flex-col">
			{/* Shared background from MainLayout */}
			<div className="main-layout-bg" />
			<div className="neon-red-lines" />

			{/* Top Header */}
			<header className="relative z-20 h-14 flex items-center justify-between px-4 sm:px-8">
				{/* Logo */}
				<Link to="/" className="flex items-center gap-3 group">
					<div className="w-9 h-9 rounded-xl bg-black border border-white/10 shadow-lg shadow-black/10 flex items-center justify-center overflow-hidden">
						<img
							src="/simpaskor.webp"
							alt="Logo"
							className="w-6 h-6 object-contain"
						/>
					</div>
					<span className="text-sm font-bold text-gray-800 dark:text-white tracking-wide hidden sm:block">
						SIMPASKOR
					</span>
				</Link>

				{/* Right: Auth links + Theme */}
				<div className="flex items-center gap-3">
					<div className="hidden sm:flex items-center gap-2">
						{!isLogin && (
							<Link
								to="/login"
								className="px-4 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
							>
								Masuk
							</Link>
						)}
						{!isRegister && (
							<Link
								to="/register"
								className="px-4 py-1.5 bg-red-600 text-white rounded-full text-xs font-semibold hover:bg-red-700 transition-colors shadow-lg hover:shadow-red-500/25"
							>
								Daftar
							</Link>
						)}
					</div>
					<ThemeToggle />
				</div>
			</header>

			{/* Main Content */}
			<main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
				<div className={`w-full ${isRegister ? "max-w-3xl" : "max-w-md"}`}>
					{/* Glassmorphic Form Card */}
					<div className="relative group">
						<div className="absolute -inset-1 bg-gradient-to-r from-red-500/20 to-red-400/10 rounded-2xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />

						<div className="relative bg-white/80 dark:bg-white/[0.04] backdrop-blur-xl border border-gray-200/60 dark:border-white/[0.08] rounded-2xl p-8 shadow-xl shadow-black/5 dark:shadow-black/30">
							<Outlet />
						</div>
					</div>

					{/* Mobile Auth Links */}
					<div className="sm:hidden mt-6 flex items-center justify-center gap-4">
						{!isLogin && (
							<Link
								to="/login"
								className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
							>
								Masuk
							</Link>
						)}
						{!isRegister && (
							<Link
								to="/register"
								className="px-4 py-1.5 bg-red-600 text-white rounded-full text-xs font-semibold hover:bg-red-700 transition-colors"
							>
								Daftar
							</Link>
						)}
					</div>
				</div>
			</main>

			{/* Footer */}
			<footer className="relative z-10 py-6 px-4 sm:px-8 border-t border-gray-200/20 dark:border-white/[0.04]">
				<div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
					<p className="text-xs text-gray-400 dark:text-gray-600">
						© 2025 Simpaskor Platform
					</p>
					<div className="flex items-center gap-6 text-[10px] text-gray-400 dark:text-gray-600">
						<a href="#" className="hover:text-red-500 transition-colors">Privacy</a>
						<a href="#" className="hover:text-red-500 transition-colors">Terms</a>
						<a href="#" className="hover:text-red-500 transition-colors">Help</a>
					</div>
				</div>
			</footer>
		</div>
	);
};
