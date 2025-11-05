import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Logo } from "../components/Logo";
import { ThemeToggle } from "../components/ThemeToggle";

export const AuthLayout: React.FC = () => {
	const location = useLocation();
	const isLogin = location.pathname === "/login";
	const isRegister = location.pathname === "/register";

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex flex-col transition-colors duration-300">
			{/* Modern Navbar */}
			<nav className="sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between h-16">
						{/* Logo */}
						<Link to="/" className="flex items-center gap-3 group">
							<Logo variant="auto" size="sm" showText />
						</Link>

						{/* Right Section */}
						<div className="flex items-center gap-4">
							{/* Auth Links */}
							<div className="hidden sm:flex items-center gap-2">
								{!isLogin && (
									<Link
										to="/login"
										className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200"
									>
										Masuk
									</Link>
								)}
								{!isRegister && (
									<Link
										to="/register"
										className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
									>
										Daftar
									</Link>
								)}
							</div>

							{/* Theme Toggle */}
							<ThemeToggle />
						</div>
					</div>
				</div>
			</nav>

			{/* Main Content */}
			<main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
				<div className={`w-full ${isRegister ? "max-w-3xl" : "max-w-md"}`}>
					{/* Form Card - Modern Minimalist */}
					<div className="relative group">
						{/* Subtle glow effect */}
						<div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-red-400 rounded-2xl opacity-0 group-hover:opacity-10 blur transition-opacity duration-300"></div>

						<div className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 shadow-xl dark:shadow-2xl dark:shadow-black/20">
							<Outlet />
						</div>
					</div>

					{/* Mobile Auth Links */}
					<div className="sm:hidden mt-6 flex items-center justify-center gap-4">
						{!isLogin && (
							<Link
								to="/login"
								className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200"
							>
								Masuk
							</Link>
						)}
						{!isRegister && (
							<Link
								to="/register"
								className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
							>
								Daftar
							</Link>
						)}
					</div>
				</div>
			</main>

			{/* Minimal Footer */}
			<footer className="py-6 px-4 sm:px-6 lg:px-8 border-t border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
				<div className="max-w-7xl mx-auto">
					<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
						<p className="text-sm text-gray-500 dark:text-gray-400">
							© 2025 Simpaskor Platform. All rights reserved.
						</p>
						<div className="flex items-center gap-6 text-xs text-gray-400 dark:text-gray-500">
							<a
								href="#"
								className="hover:text-red-600 dark:hover:text-red-400 transition-colors"
							>
								Privacy
							</a>
							<a
								href="#"
								className="hover:text-red-600 dark:hover:text-red-400 transition-colors"
							>
								Terms
							</a>
							<a
								href="#"
								className="hover:text-red-600 dark:hover:text-red-400 transition-colors"
							>
								Help
							</a>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
};
