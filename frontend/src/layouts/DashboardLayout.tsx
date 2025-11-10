import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { Logo } from "../components/Logo";
import { api } from "../utils/api";
import Swal from "sweetalert2";
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
	SunIcon,
	MoonIcon,
	ChevronDoubleLeftIcon,
	ChevronDoubleRightIcon,
	AcademicCapIcon,
	DocumentChartBarIcon,
} from "@heroicons/react/24/outline";

interface MenuItem {
	name: string;
	icon: React.ComponentType<{ className?: string }>;
	path: string;
	roles?: string[];
}

export const DashboardLayout: React.FC = () => {
	const { user, logout } = useAuth();
	const { theme, toggleTheme } = useTheme();
	const location = useLocation();
	const navigate = useNavigate();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const [showUserMenu, setShowUserMenu] = useState(false);
	const [activeEvent, setActiveEvent] = useState<any>(null);
	const userButtonRef = useRef<HTMLButtonElement>(null);

	// Check for active event assignment (for PANITIA role)
	useEffect(() => {
		if (user?.role === "PANITIA") {
			checkActiveEvent();
		}
	}, [user]);

	// Redirect to manage event if panitia is assigned
	useEffect(() => {
		if (
			user?.role === "PANITIA" &&
			activeEvent &&
			location.pathname === "/panitia/dashboard"
		) {
			navigate(`/panitia/events/${activeEvent.event.id}/manage`);
		}
	}, [user, activeEvent, location.pathname]);

	const checkActiveEvent = async () => {
		try {
			const response = await api.get("/panitia-assignment/current");
			if (response.data && response.data.event) {
				setActiveEvent(response.data);
			}
		} catch (error) {
			// No active event
		}
	};

	const handleLeaveEvent = async () => {
		const result = await Swal.fire({
			title: "Keluar dari Event?",
			text: `Yakin ingin keluar dari pengelolaan event "${activeEvent?.event?.title}"?`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#EF4444",
			cancelButtonColor: "#6B7280",
			confirmButtonText: "Ya, Keluar",
			cancelButtonText: "Batal",
			reverseButtons: true,
		});

		if (result.isConfirmed) {
			try {
				await api.post("/panitia-assignment/leave");
				setActiveEvent(null);

				await Swal.fire({
					title: "Berhasil!",
					text: "Anda telah keluar dari pengelolaan event",
					icon: "success",
					timer: 2000,
					showConfirmButton: false,
				});

				navigate("/panitia/dashboard");
			} catch (error: any) {
				Swal.fire({
					title: "Gagal!",
					text: error.response?.data?.message || "Gagal keluar dari event",
					icon: "error",
					confirmButtonText: "OK",
				});
			}
		}
	};

	// Menu items berdasarkan role
	const getMenuItems = (): MenuItem[] => {
		const baseItems: MenuItem[] = [
			{
				name: activeEvent && user?.role === "PANITIA" ? "Event" : "Dashboard",
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
				// Jika panitia sedang mengelola event, tampilkan menu pengelolaan event
				if (activeEvent && activeEvent.event) {
					roleSpecificItems.push(
						{
							name: "Peserta",
							icon: UsersIcon,
							path: `/panitia/events/${activeEvent.event.id}/peserta`,
						},
						{
							name: "Juri",
							icon: ScaleIcon,
							path: `/panitia/events/${activeEvent.event.id}/juri`,
						},
						{
							name: "Materi",
							icon: AcademicCapIcon,
							path: `/panitia/events/${activeEvent.event.id}/materi`,
						},
						{
							name: "Rekap Nilai",
							icon: DocumentChartBarIcon,
							path: `/panitia/events/${activeEvent.event.id}/rekap`,
						}
					);
				} else {
					// Menu default ketika tidak sedang mengelola event
					roleSpecificItems.push(
						{ name: "Event Saya", icon: CalendarIcon, path: "/panitia/events" },
						{ name: "Laporan", icon: ChartBarIcon, path: "/panitia/reports" }
					);
				}
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
				// If panitia has active event assignment, go to manage event page
				if (activeEvent && activeEvent.event) {
					return `/panitia/events/${activeEvent.event.id}/manage`;
				}
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

	const isActive = (path: string) => {
		return location.pathname === path;
	};

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			{/* Sidebar untuk Desktop */}
			<aside
				className={`hidden md:fixed md:inset-y-0 md:flex md:flex-col transition-all duration-300 z-30 ${
					sidebarCollapsed ? "md:w-20" : "md:w-64"
				}`}
			>
				{/* Tombol Collapse - Mencuat keluar sejajar dengan logo */}
				<button
					onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
					className="absolute -right-3 top-[3.25rem] z-50 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg hover:shadow-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/50 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200"
					title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
				>
					{sidebarCollapsed ? (
						<ChevronDoubleRightIcon className="w-4 h-4" />
					) : (
						<ChevronDoubleLeftIcon className="w-4 h-4" />
					)}
				</button>

				<div className="flex flex-col flex-grow bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
					{/* Logo */}
					<div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
						<div
							className={`flex items-center ${
								sidebarCollapsed ? "justify-center py-4" : "px-4 py-4"
							}`}
						>
							<Logo size="sm" showText={!sidebarCollapsed} variant="auto" />
						</div>
					</div>

					{/* Navigation */}
					<nav className="flex-1 px-3 py-4 space-y-1">
						{getMenuItems().map((item) => {
							const Icon = item.icon;
							return (
								<Link
									key={item.path}
									to={item.path}
									className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
										isActive(item.path)
											? "bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400"
											: "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
									} ${sidebarCollapsed ? "justify-center" : ""}`}
									title={sidebarCollapsed ? item.name : ""}
								>
									<Icon className="w-5 h-5 flex-shrink-0" />
									{!sidebarCollapsed && <span>{item.name}</span>}
								</Link>
							);
						})}
					</nav>

					{/* User Profile */}
					<div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-3">
						<div className="relative">
							<button
								ref={userButtonRef}
								onClick={() => setShowUserMenu(!showUserMenu)}
								className={`flex items-center w-full gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
									sidebarCollapsed ? "justify-center" : ""
								}`}
								title={sidebarCollapsed ? user?.name : ""}
							>
								<div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold text-xs flex-shrink-0">
									{user?.name
										?.split(" ")
										.map((n) => n[0])
										.join("")
										.substring(0, 2)
										.toUpperCase()}
								</div>
								{!sidebarCollapsed && (
									<div className="flex-1 text-left">
										<div className="text-sm font-medium text-gray-900 dark:text-white truncate">
											{user?.name}
										</div>
										<div className="text-xs text-gray-500 dark:text-gray-400">
											{user?.role}
										</div>
									</div>
								)}
							</button>

							{/* Desktop User Dropdown */}
							{showUserMenu && (
								<>
									<div
										className="fixed inset-0 z-40 hidden md:block"
										onClick={() => setShowUserMenu(false)}
									/>
									<div
										className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50 hidden md:block"
										style={{
											minWidth: sidebarCollapsed ? "240px" : "auto",
										}}
									>
										<Link
											to="/profile"
											className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
											onClick={() => setShowUserMenu(false)}
										>
											<UserCircleIcon className="w-5 h-5" />
											Profil Saya
										</Link>
										<button
											onClick={toggleTheme}
											className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
										>
											{theme === "dark" ? (
												<>
													<SunIcon className="w-5 h-5" />
													Mode Terang
												</>
											) : (
												<>
													<MoonIcon className="w-5 h-5" />
													Mode Gelap
												</>
											)}
										</button>
										{activeEvent && (
											<>
												<hr className="my-1 border-gray-200 dark:border-gray-700" />
												<div className="px-4 py-2">
													<div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
														Mengelola Event:
													</div>
													<div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
														{activeEvent.event.title}
													</div>
													<button
														onClick={() => {
															setShowUserMenu(false);
															handleLeaveEvent();
														}}
														className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/40"
													>
														<ArrowRightOnRectangleIcon className="w-4 h-4" />
														Events Dashboard
													</button>
												</div>
											</>
										)}
										<hr className="my-1 border-gray-200 dark:border-gray-700" />
										<button
											onClick={handleLogout}
											className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
										>
											<ArrowRightOnRectangleIcon className="w-5 h-5" />
											Sign Out
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
						className="fixed inset-0 bg-gray-600 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 z-40 md:hidden"
						onClick={() => setSidebarOpen(false)}
					/>

					{/* Sidebar */}
					<aside className="fixed inset-y-0 left-0 flex flex-col w-64 bg-white dark:bg-gray-800 z-50 md:hidden">
						<div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
							<Logo size="sm" showText variant="auto" />
							<button
								onClick={() => setSidebarOpen(false)}
								className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
												? "bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400"
												: "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
										}`}
									>
										<Icon className="w-5 h-5" />
										{item.name}
									</Link>
								);
							})}
						</nav>

						<div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
							<div className="flex items-center gap-3 px-4 py-3">
								<div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold text-xs">
									{user?.name
										?.split(" ")
										.map((n) => n[0])
										.join("")
										.substring(0, 2)
										.toUpperCase()}
								</div>
								<div className="flex-1">
									<div className="text-sm font-medium text-gray-900 dark:text-white">
										{user?.name}
									</div>
									<div className="text-xs text-gray-500 dark:text-gray-400">
										{user?.role}
									</div>
								</div>
							</div>
							<div className="mt-2 space-y-1">
								<Link
									to="/profile"
									onClick={() => setSidebarOpen(false)}
									className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
								>
									<UserCircleIcon className="w-5 h-5" />
									Profil Saya
								</Link>
								<button
									onClick={toggleTheme}
									className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
								>
									{theme === "dark" ? (
										<>
											<SunIcon className="w-5 h-5" />
											Mode Terang
										</>
									) : (
										<>
											<MoonIcon className="w-5 h-5" />
											Mode Gelap
										</>
									)}
								</button>
								{activeEvent && (
									<>
										<hr className="my-2 border-gray-200 dark:border-gray-700" />
										<div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
											<div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
												Mengelola Event:
											</div>
											<div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
												{activeEvent.event.title}
											</div>
											<button
												onClick={() => {
													setSidebarOpen(false);
													handleLeaveEvent();
												}}
												className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/40"
											>
												<ArrowRightOnRectangleIcon className="w-4 h-4" />
												Keluar Event
											</button>
										</div>
									</>
								)}
								<hr className="my-2 border-gray-200 dark:border-gray-700" />
								<button
									onClick={handleLogout}
									className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
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
			<div
				className={`md:flex md:flex-col md:flex-1 transition-all duration-300 ${
					sidebarCollapsed ? "md:pl-20" : "md:pl-64"
				}`}
			>
				{/* Top bar untuk Mobile */}
				<div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white dark:bg-gray-800 shadow md:hidden">
					<button
						onClick={() => setSidebarOpen(true)}
						className="px-4 border-r border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
					>
						<Bars3Icon className="h-6 w-6" />
					</button>
					<div className="flex-1 px-4 flex items-center justify-between">
						<Logo size="sm" />
						<div className="relative">
							<button
								ref={userButtonRef}
								onClick={() => setShowUserMenu(!showUserMenu)}
								className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold text-xs"
							>
								{user?.name
									?.split(" ")
									.map((n) => n[0])
									.join("")
									.substring(0, 2)
									.toUpperCase()}
							</button>

							{/* Mobile User Dropdown */}
							{showUserMenu && (
								<>
									<div
										className="fixed inset-0 z-40 md:hidden"
										onClick={() => setShowUserMenu(false)}
									/>
									<div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50 md:hidden">
										<div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
											<div className="text-sm font-medium text-gray-900 dark:text-white">
												{user?.name}
											</div>
											<div className="text-xs text-gray-500 dark:text-gray-400">
												{user?.role}
											</div>
										</div>
										<Link
											to="/profile"
											className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
											onClick={() => setShowUserMenu(false)}
										>
											<UserCircleIcon className="w-5 h-5" />
											Profil Saya
										</Link>
										<button
											onClick={() => {
												toggleTheme();
												setShowUserMenu(false);
											}}
											className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
										>
											{theme === "dark" ? (
												<>
													<SunIcon className="w-5 h-5" />
													Mode Terang
												</>
											) : (
												<>
													<MoonIcon className="w-5 h-5" />
													Mode Gelap
												</>
											)}
										</button>
										{activeEvent && (
											<>
												<hr className="my-1 border-gray-200 dark:border-gray-700" />
												<div className="px-4 py-2">
													<div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
														Mengelola Event:
													</div>
													<div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
														{activeEvent.event.title}
													</div>
													<button
														onClick={() => {
															setShowUserMenu(false);
															handleLeaveEvent();
														}}
														className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/40"
													>
														<ArrowRightOnRectangleIcon className="w-4 h-4" />
														Keluar Event
													</button>
												</div>
											</>
										)}
										<hr className="my-1 border-gray-200 dark:border-gray-700" />
										<button
											onClick={() => {
												setShowUserMenu(false);
												handleLogout();
											}}
											className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
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

				{/* Page Content */}
				<main className="flex-1">
					<div className="max-w-7xl mx-auto">
						<Outlet />
					</div>
				</main>
			</div>
		</div>
	);
};
