import React from "react";
import { Link, Outlet } from "react-router-dom";
import { Logo } from "../components/Logo";
import { ThemeToggle } from "../components/ThemeToggle";
import { useAuth } from "../hooks/useAuth";

interface MainLayoutProps {
	showNavbar?: boolean;
	showFooter?: boolean;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
	showNavbar = true,
	showFooter = true,
}) => {
	const { isAuthenticated, user } = useAuth();

	return (
		<div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 transition-colors">
			{/* Navbar */}
			{showNavbar && (
				<nav className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700 transition-colors">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
						<div className="flex justify-between items-center h-16">
							{/* Logo */}
							<Logo size="sm" showText variant="auto" />

							{/* Navigation Links */}
							<div className="hidden md:flex items-center space-x-8">
								<Link
									to="/"
									className="text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 font-medium transition-colors"
								>
									Beranda
								</Link>
								<Link
									to="/events"
									className="text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 font-medium transition-colors"
								>
									Event
								</Link>
								<Link
									to="/about"
									className="text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 font-medium transition-colors"
								>
									Tentang
								</Link>
								<Link
									to="/contact"
									className="text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 font-medium transition-colors"
								>
									Kontak
								</Link>
							</div>

							{/* Auth Buttons & Theme Toggle */}
							<div className="flex items-center gap-3">
								<ThemeToggle />

								{isAuthenticated ? (
									<Link
										to={getDashboardPath(user?.role)}
										className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 transition-colors font-medium shadow-lg hover:shadow-blue-500/50 dark:hover:shadow-indigo-500/50"
									>
										Dashboard
									</Link>
								) : (
									<>
										<Link
											to="/login"
											className="px-4 py-2 text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 font-medium transition-colors"
										>
											Masuk
										</Link>
										<Link
											to="/register"
											className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 transition-colors font-medium shadow-lg hover:shadow-blue-500/50 dark:hover:shadow-indigo-500/50"
										>
											Daftar
										</Link>
									</>
								)}
							</div>
						</div>
					</div>
				</nav>
			)}

			{/* Main Content */}
			<main className="flex-1">
				<Outlet />
			</main>

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
	switch (role) {
		case "SUPERADMIN":
			return "/admin/dashboard";
		case "PANITIA":
			return "/panitia/dashboard";
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
