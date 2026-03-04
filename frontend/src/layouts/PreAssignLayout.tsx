import React from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { Logo } from "../components/Logo";
import { ThemeToggle } from "../components/ThemeToggle";
import { useAuth } from "../hooks/useAuth";
import {
	ArrowRightOnRectangleIcon,
	UserCircleIcon,
} from "@heroicons/react/24/outline";
import Swal from "sweetalert2";

/**
 * Layout for panitia/juri dashboard pages BEFORE event assignment.
 * Shows header with user info and logout, simple footer.
 * After event assignment, routes will use DashboardLayout instead.
 */
export const PreAssignLayout: React.FC = () => {
	const { user, logout } = useAuth();
	const navigate = useNavigate();

	const handleLogout = async () => {
		const result = await Swal.fire({
			title: "Logout?",
			text: "Yakin ingin keluar dari aplikasi?",
			icon: "question",
			showCancelButton: true,
			confirmButtonColor: "#6366F1",
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
		<div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors">
			{/* Header */}
			<header className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow transition-colors">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						{/* Logo */}
						<Logo size="sm" showText variant="auto" />

						{/* User Actions */}
						<div className="flex items-center gap-4">
							<ThemeToggle />

							{/* User Info */}
							<Link
								to="/profile"
								className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
							>
								<div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold text-xs">
									{user?.name
										?.split(" ")
										.map((n) => n[0])
										.join("")
										.substring(0, 2)
										.toUpperCase()}
								</div>
								<div className="hidden sm:block">
									<div className="text-sm font-medium text-gray-900 dark:text-white">
										{user?.name}
									</div>
									<div className="text-xs text-gray-500 dark:text-gray-400">
										{user?.role}
									</div>
								</div>
								<UserCircleIcon className="w-4 h-4 text-gray-400 hidden sm:block" />
							</Link>

							{/* Logout Button */}
							<button
								onClick={handleLogout}
								className="flex items-center gap-2 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
								title="Logout"
							>
								<ArrowRightOnRectangleIcon className="w-5 h-5" />
								<span className="hidden sm:inline text-sm font-medium">Logout</span>
							</button>
						</div>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="flex-1">
				<Outlet />
			</main>

			{/* Footer */}
			<footer className="bg-gray-900 text-white py-6">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex flex-col sm:flex-row justify-between items-center gap-4">
						<div className="flex items-center gap-2">
							<Logo size="sm" variant="white" showText={false} />
							<span className="text-gray-400 text-sm">
								© {new Date().getFullYear()} SIMPASKOR. All rights reserved.
							</span>
						</div>
						<div className="flex items-center gap-6 text-sm text-gray-400">
							<Link to="/about" className="hover:text-white transition-colors">
								Tentang
							</Link>
							<Link to="/contact" className="hover:text-white transition-colors">
								Kontak
							</Link>
							<Link to="/docs/CONTRIBUTING.md" className="hover:text-white transition-colors">
								Bantuan
							</Link>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
};

export default PreAssignLayout;
