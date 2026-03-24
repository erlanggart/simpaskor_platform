import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Logo } from "../components/Logo";
import { ThemeToggle } from "../components/ThemeToggle";
import { useAuth } from "../hooks/useAuth";
import { LuHouse, LuStore, LuTicket, LuVote } from "react-icons/lu";

interface MainLayoutProps {
	showNavbar?: boolean;
	showFooter?: boolean;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
	showNavbar = true,
	showFooter = true,
}) => {
	const { isAuthenticated, user } = useAuth();
	const location = useLocation();

	return (
		<div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 transition-colors">
			{/* Navbar */}
			{showNavbar && (
				<nav className="hidden md:block sticky top-0 z-50 bg-white dark:bg-gray-900 transition-colors">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
						<div className="flex justify-between items-center h-16">
							{/* Logo */}
							<Logo size="sm" showText variant="auto" />

							{/* Navigation Links - floating pill */}
							<div className="flex items-center gap-1 bg-gray-900/80 dark:bg-gray-800/90 backdrop-blur-xl rounded-full px-2 py-1.5 shadow-lg shadow-black/10 border border-white/10">
								<Link
									to="/"
									className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
										location.pathname === "/"
											? "bg-white/15 text-white"
											: "text-gray-300 hover:text-white hover:bg-white/10"
									}`}
								>
									Beranda
								</Link>
								<Link
									to="/marketplace"
									className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
										location.pathname === "/marketplace"
											? "bg-white/15 text-white"
											: "text-gray-300 hover:text-white hover:bg-white/10"
									}`}
								>
									Marketplace
								</Link>
								<Link
									to="/e-ticketing"
									className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
										location.pathname === "/e-ticketing"
											? "bg-white/15 text-white"
											: "text-gray-300 hover:text-white hover:bg-white/10"
									}`}
								>
									E-Ticketing
								</Link>
								<Link
									to="/e-voting"
									className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
										location.pathname === "/e-voting"
											? "bg-white/15 text-white"
											: "text-gray-300 hover:text-white hover:bg-white/10"
									}`}
								>
									E-Voting
								</Link>
							</div>

							{/* Auth Buttons & Theme Toggle */}
							<div className="flex items-center gap-3">
								<ThemeToggle />
								{isAuthenticated ? (
									<Link
										to={getDashboardPath(user?.role)}
										className="px-4 py-2 bg-red-600 text-white rounded-full text-sm font-medium hover:bg-red-700 transition-colors shadow-lg hover:shadow-red-500/30"
									>
										Dashboard
									</Link>
								) : (
									<Link
										to="/login"
										className="px-4 py-2 bg-red-600 text-white rounded-full text-sm font-medium hover:bg-red-700 transition-colors shadow-lg hover:shadow-red-500/30"
									>
										Masuk
									</Link>
								)}
							</div>
						</div>
					</div>
				</nav>
			)}

			{/* Main Content */}
			<main className="flex-1 pb-16 md:pb-0">
				<Outlet />
			</main>

			{/* Mobile Bottom Navigation */}
			{showNavbar && (
				<nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 md:hidden">
					<div className="flex justify-around items-center h-16 px-2">
						<Link
							to="/"
							className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
								location.pathname === "/"
									? "text-red-600 dark:text-red-400"
									: "text-gray-500 dark:text-gray-400"
							}`}
						>
							<LuHouse className="w-5 h-5" />
							<span className="text-[10px] mt-0.5 font-medium">Home</span>
						</Link>
						<Link
							to="/marketplace"
							className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
								location.pathname === "/marketplace"
									? "text-red-600 dark:text-red-400"
									: "text-gray-500 dark:text-gray-400"
							}`}
						>
							<LuStore className="w-5 h-5" />
							<span className="text-[10px] mt-0.5 font-medium">Marketplace</span>
						</Link>
						<Link
							to="/e-ticketing"
							className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
								location.pathname === "/e-ticketing"
									? "text-red-600 dark:text-red-400"
									: "text-gray-500 dark:text-gray-400"
							}`}
						>
							<LuTicket className="w-5 h-5" />
							<span className="text-[10px] mt-0.5 font-medium">E-Ticketing</span>
						</Link>
						<Link
							to="/e-voting"
							className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
								location.pathname === "/e-voting"
									? "text-red-600 dark:text-red-400"
									: "text-gray-500 dark:text-gray-400"
							}`}
						>
							<LuVote className="w-5 h-5" />
							<span className="text-[10px] mt-0.5 font-medium">E-Voting</span>
						</Link>
					</div>
				</nav>
			)}

			{/* Footer */}
			{showFooter && (
				<footer className="bg-gray-900 text-white">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
						<div className="grid grid-cols-1 md:grid-cols-4 gap-8">
							{/* About */}
							<div className="col-span-1 md:col-span-2">
								<Logo size="md" showText variant="white" />
								<p className="mt-4 text-gray-400 text-sm">
									Platform Kompetisi Terdepan Indonesia untuk mengelola dan
									mengikuti berbagai event olahraga dan kompetisi.
								</p>
							</div>

							{/* Quick Links */}
							<div>
								<h3 className="text-lg font-semibold mb-4">Menu</h3>
								<ul className="space-y-2">
									<li>
										<Link
											to="/"
											className="text-gray-400 hover:text-white transition-colors"
										>
											Beranda
										</Link>
									</li>
									<li>
										<Link
											to="/marketplace"
											className="text-gray-400 hover:text-white transition-colors"
										>
											Marketplace
										</Link>
									</li>
									<li>
										<Link
											to="/e-ticketing"
											className="text-gray-400 hover:text-white transition-colors"
										>
											E-Ticketing
										</Link>
									</li>
									<li>
										<Link
											to="/events"
											className="text-gray-400 hover:text-white transition-colors"
										>
											Event
										</Link>
									</li>
									<li>
										<Link
											to="/about"
											className="text-gray-400 hover:text-white transition-colors"
										>
											Tentang Kami
										</Link>
									</li>
									<li>
										<Link
											to="/contact"
											className="text-gray-400 hover:text-white transition-colors"
										>
											Kontak
										</Link>
									</li>
								</ul>
							</div>

							{/* Contact */}
							<div>
								<h3 className="text-lg font-semibold mb-4">Kontak</h3>
								<ul className="space-y-2 text-gray-400 text-sm">
									<li>Email: info@simpaskor.com</li>
									<li>Telp: +62 21 1234 5678</li>
									<li>Jakarta, Indonesia</li>
								</ul>
							</div>
						</div>

						<div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400 text-sm">
							© 2025 Simpaskor Platform. All rights reserved.
						</div>
					</div>
				</footer>
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
	switch (role) {
		case "SUPERADMIN":
			return "/admin/dashboard";
		case "PESERTA":
			return "/peserta/dashboard";
		case "JURI":
			return "/juri/dashboard";
		case "PELATIH":
			return "/pelatih/dashboard";
		default:
			return "/dashboard";
	}
};
