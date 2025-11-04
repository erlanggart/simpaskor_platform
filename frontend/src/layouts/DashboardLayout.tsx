import React, { useState } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Logo } from "../components/Logo";
import {
	HomeIcon,
	CalendarIcon,
	TrophyIcon,
	UsersIcon,
	ChartBarIcon,
	Cog6ToothIcon,
	UserCircleIcon,
	ArrowRightOnRectangleIcon,
	Bars3Icon,
	XMarkIcon,
	TicketIcon,
	ScaleIcon,
} from "@heroicons/react/24/outline";

interface MenuItem {
	name: string;
	icon: React.ComponentType<{ className?: string }>;
	path: string;
	roles?: string[];
}

export const DashboardLayout: React.FC = () => {
	const { user, logout } = useAuth();
	const location = useLocation();
	const navigate = useNavigate();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [showUserMenu, setShowUserMenu] = useState(false);

	// Menu items berdasarkan role
	const getMenuItems = (): MenuItem[] => {
		const baseItems: MenuItem[] = [
			{
				name: "Dashboard",
				icon: HomeIcon,
				path: getDashboardPath(),
			},
		];

		const roleSpecificItems: MenuItem[] = [];

		switch (user?.role) {
			case "SUPERADMIN":
				roleSpecificItems.push(
					{ name: "Kelola Pengguna", icon: UsersIcon, path: "/admin/users" },
					{ name: "Kelola Kupon", icon: TicketIcon, path: "/admin/coupons" },
					{
						name: "Kategori Penilaian",
						icon: ScaleIcon,
						path: "/admin/assessment-categories",
					},
					{ name: "Kelola Event", icon: CalendarIcon, path: "/admin/events" },
					{ name: "Statistik", icon: ChartBarIcon, path: "/admin/statistics" },
					{ name: "Pengaturan", icon: Cog6ToothIcon, path: "/admin/settings" }
				);
				break;
			case "PANITIA":
				roleSpecificItems.push(
					{ name: "Event Saya", icon: CalendarIcon, path: "/panitia/events" },
					{
						name: "Peserta",
						icon: UsersIcon,
						path: "/panitia/participants",
					},
					{ name: "Laporan", icon: ChartBarIcon, path: "/panitia/reports" }
				);
				break;
			case "PESERTA":
				roleSpecificItems.push(
					{
						name: "Event Tersedia",
						icon: CalendarIcon,
						path: "/peserta/events",
					},
					{
						name: "Pendaftaran Saya",
						icon: TrophyIcon,
						path: "/peserta/registrations",
					},
					{ name: "Riwayat", icon: ChartBarIcon, path: "/peserta/history" }
				);
				break;
			case "JURI":
				roleSpecificItems.push(
					{
						name: "Event Saya",
						icon: CalendarIcon,
						path: "/juri/events",
					},
					{ name: "Penilaian", icon: TrophyIcon, path: "/juri/evaluations" },
					{ name: "Jadwal", icon: ChartBarIcon, path: "/juri/schedule" }
				);
				break;
			case "PELATIH":
				roleSpecificItems.push(
					{ name: "Atlet Saya", icon: UsersIcon, path: "/pelatih/athletes" },
					{ name: "Event", icon: CalendarIcon, path: "/pelatih/events" },
					{
						name: "Performa",
						icon: ChartBarIcon,
						path: "/pelatih/performance",
					}
				);
				break;
		}

		return [...baseItems, ...roleSpecificItems];
	};

	const getDashboardPath = () => {
		switch (user?.role) {
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

	const handleLogout = () => {
		if (confirm("Yakin ingin keluar?")) {
			logout();
			navigate("/login");
		}
	};

	const isActive = (path: string) => {
		return location.pathname === path;
	};

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Sidebar untuk Desktop */}
			<aside className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
				<div className="flex flex-col flex-grow bg-white border-r border-gray-200 overflow-y-auto">
					{/* Logo */}
					<div className="flex items-center flex-shrink-0 px-6 py-4 border-b border-gray-200">
						<Logo size="sm" showText />
					</div>

					{/* Navigation */}
					<nav className="flex-1 px-4 py-4 space-y-1">
						{getMenuItems().map((item) => {
							const Icon = item.icon;
							return (
								<Link
									key={item.path}
									to={item.path}
									className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
										isActive(item.path)
											? "bg-blue-50 text-blue-600"
											: "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
									}`}
								>
									<Icon className="w-5 h-5" />
									{item.name}
								</Link>
							);
						})}
					</nav>

					{/* User Profile */}
					<div className="flex-shrink-0 border-t border-gray-200 p-4">
						<div className="relative">
							<button
								onClick={() => setShowUserMenu(!showUserMenu)}
								className="flex items-center w-full gap-3 px-4 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
							>
								<div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs">
									{user?.name
										?.split(" ")
										.map((n) => n[0])
										.join("")
										.substring(0, 2)
										.toUpperCase()}
								</div>
								<div className="flex-1 text-left">
									<div className="text-sm font-medium text-gray-900">
										{user?.name}
									</div>
									<div className="text-xs text-gray-500">{user?.role}</div>
								</div>
							</button>

							{/* User Dropdown */}
							{showUserMenu && (
								<>
									<div
										className="fixed inset-0 z-10"
										onClick={() => setShowUserMenu(false)}
									/>
									<div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
										<Link
											to="/profile"
											className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
											onClick={() => setShowUserMenu(false)}
										>
											<UserCircleIcon className="w-5 h-5" />
											Profil Saya
										</Link>
										<Link
											to="/profile"
											className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
											onClick={() => setShowUserMenu(false)}
										>
											<Cog6ToothIcon className="w-5 h-5" />
											Pengaturan
										</Link>
										<hr className="my-1" />
										<button
											onClick={handleLogout}
											className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
										>
											<ArrowRightOnRectangleIcon className="w-5 h-5" />
											Keluar
										</button>
									</div>
								</>
							)}
						</div>
					</div>
				</div>
			</aside>

			{/* Mobile Sidebar */}
			{sidebarOpen && (
				<>
					{/* Backdrop */}
					<div
						className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 md:hidden"
						onClick={() => setSidebarOpen(false)}
					/>

					{/* Sidebar */}
					<aside className="fixed inset-y-0 left-0 flex flex-col w-64 bg-white z-50 md:hidden">
						<div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
							<Logo size="sm" showText />
							<button
								onClick={() => setSidebarOpen(false)}
								className="text-gray-400 hover:text-gray-600"
							>
								<XMarkIcon className="w-6 h-6" />
							</button>
						</div>

						<nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
							{getMenuItems().map((item) => {
								const Icon = item.icon;
								return (
									<Link
										key={item.path}
										to={item.path}
										onClick={() => setSidebarOpen(false)}
										className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
											isActive(item.path)
												? "bg-blue-50 text-blue-600"
												: "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
										}`}
									>
										<Icon className="w-5 h-5" />
										{item.name}
									</Link>
								);
							})}
						</nav>

						<div className="flex-shrink-0 border-t border-gray-200 p-4">
							<div className="flex items-center gap-3 px-4 py-3">
								<div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs">
									{user?.name
										?.split(" ")
										.map((n) => n[0])
										.join("")
										.substring(0, 2)
										.toUpperCase()}
								</div>
								<div className="flex-1">
									<div className="text-sm font-medium text-gray-900">
										{user?.name}
									</div>
									<div className="text-xs text-gray-500">{user?.role}</div>
								</div>
							</div>
							<div className="mt-2 space-y-1">
								<Link
									to="/profile"
									onClick={() => setSidebarOpen(false)}
									className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
								>
									<UserCircleIcon className="w-5 h-5" />
									Profil Saya
								</Link>
								<button
									onClick={handleLogout}
									className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
								>
									<ArrowRightOnRectangleIcon className="w-5 h-5" />
									Keluar
								</button>
							</div>
						</div>
					</aside>
				</>
			)}

			{/* Main Content */}
			<div className="md:pl-64 flex flex-col flex-1">
				{/* Top bar untuk Mobile */}
				<div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white shadow md:hidden">
					<button
						onClick={() => setSidebarOpen(true)}
						className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
					>
						<Bars3Icon className="h-6 w-6" />
					</button>
					<div className="flex-1 px-4 flex items-center justify-between">
						<Logo size="sm" />
						<button
							onClick={() => setShowUserMenu(!showUserMenu)}
							className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs"
						>
							{user?.name
								?.split(" ")
								.map((n) => n[0])
								.join("")
								.substring(0, 2)
								.toUpperCase()}
						</button>
					</div>
				</div>

				{/* Page Content */}
				<main className="flex-1">
					<div className="py-6">
						<div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
							<Outlet />
						</div>
					</div>
				</main>
			</div>
		</div>
	);
};
