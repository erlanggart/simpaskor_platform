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
	EllipsisHorizontalIcon,
	TicketIcon,
	ScaleIcon,
	SunIcon,
	MoonIcon,
	ChevronDoubleLeftIcon,
	ChevronDoubleRightIcon,
	AcademicCapIcon,
	MapPinIcon,
	ShoppingBagIcon,
	ClipboardDocumentListIcon,
	HandThumbUpIcon,
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
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const [showUserMenu, setShowUserMenu] = useState(false);
	const [showMoreMenu, setShowMoreMenu] = useState(false);
	const [activeEvent, setActiveEvent] = useState<any>(null);
	const [activeJuryEvent, setActiveJuryEvent] = useState<any>(null);
	const userButtonRef = useRef<HTMLButtonElement>(null);

	// Extract eventSlug from URL for Juri
	const juryEventSlugMatch = location.pathname.match(/\/juri\/events\/([^/]+)/);
	const juryEventSlug = juryEventSlugMatch ? juryEventSlugMatch[1] : null;

	// Extract eventSlug from URL for Panitia
	const panitiaEventSlugMatch = location.pathname.match(/\/panitia\/events\/([^/]+)/);
	const panitiaEventSlug = panitiaEventSlugMatch ? panitiaEventSlugMatch[1] : null;

	// Check for active event assignment (for PANITIA role)
	// Re-check when navigating to event routes to ensure sidebar updates
	useEffect(() => {
		if (user?.role === "PANITIA") {
			// If we're on an event route but don't have activeEvent loaded, fetch it
			if (panitiaEventSlug && !activeEvent) {
				checkActiveEvent();
			} else if (!panitiaEventSlug && !activeEvent) {
				checkActiveEvent();
			}
		}
	}, [user, panitiaEventSlug]);

	// Also check on initial mount
	useEffect(() => {
		if (user?.role === "PANITIA") {
			checkActiveEvent();
		}
	}, [user]);

	// Check for juri event (for JURI role)
	useEffect(() => {
		if (user?.role === "JURI" && juryEventSlug) {
			fetchJuryEvent(juryEventSlug);
		} else if (user?.role === "JURI" && !juryEventSlug) {
			setActiveJuryEvent(null);
		}
	}, [user, juryEventSlug]);

	// Note: Removed auto-redirect to event - now handled explicitly via "Kelola" button in Dashboard

	const checkActiveEvent = () => {
		// Read from localStorage instead of API
		try {
			const stored = localStorage.getItem("panitia_active_event");
			if (stored) {
				const eventData = JSON.parse(stored);
				// Wrap in { event: {...} } structure for compatibility
				setActiveEvent({ event: eventData });
			} else {
				setActiveEvent(null);
			}
		} catch (error) {
			// Invalid data in localStorage
			localStorage.removeItem("panitia_active_event");
			setActiveEvent(null);
		}
	};

	const fetchJuryEvent = async (eventId: string) => {
		try {
			const response = await api.get(`/juries/events/${eventId}`);
			if (response.data && response.data.event) {
				// Clear the exit flag since user is entering an event
				sessionStorage.removeItem("juri_exited_event");
				setActiveJuryEvent(response.data);
			}
		} catch (error) {
			// Not assigned to this event
			setActiveJuryEvent(null);
		}
	};

	const handleLeaveJuryEvent = () => {
		// Set flag to prevent auto-redirect until browser session ends
		sessionStorage.setItem("juri_exited_event", "true");
		setActiveJuryEvent(null);
		navigate("/juri/events");
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
			// Remove from localStorage
			localStorage.removeItem("panitia_active_event");
			setActiveEvent(null);

			await Swal.fire({
				title: "Berhasil!",
				text: "Anda telah keluar dari pengelolaan event",
				icon: "success",
				timer: 2000,
				showConfirmButton: false,
			});

			navigate("/panitia/dashboard");
		}
	};

	// Menu items berdasarkan role
	const getMenuItems = (): MenuItem[] => {
		const isInEventMode = (activeEvent && user?.role === "PANITIA") || (activeJuryEvent && user?.role === "JURI");
		const baseItems: MenuItem[] = [
			{
				name: isInEventMode ? "Event" : "Dashboard",
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
					{ name: "Produk", icon: ShoppingBagIcon, path: "/admin/products" },
					{ name: "Pesanan", icon: ClipboardDocumentListIcon, path: "/admin/orders" },
					{ name: "Statistik", icon: ChartBarIcon, path: "/admin/statistics" },
					{ name: "Pengaturan", icon: Cog6ToothIcon, path: "/admin/settings" }
				);
				break;
			case "PANITIA":
				// DashboardLayout is now only used when in event mode
				// Dashboard page uses PreAssignLayout
				if (activeEvent && activeEvent.event) {
					roleSpecificItems.push(
						{
							name: "Peserta",
							icon: UsersIcon,
							path: `/panitia/events/${activeEvent.event.slug}/peserta`,
						},
						{
							name: "Juri",
							icon: ScaleIcon,
							path: `/panitia/events/${activeEvent.event.slug}/juri`,
						},
						{
							name: "Materi",
							icon: AcademicCapIcon,
							path: `/panitia/events/${activeEvent.event.slug}/materi`,
						},
						{
							name: "Kategori Juara",
							icon: TrophyIcon,
							path: `/panitia/events/${activeEvent.event.slug}/juara`,
						},
						{
							name: "Perform",
							icon: MapPinIcon,
							path: `/panitia/events/${activeEvent.event.slug}/field-rechecking`,
						},
						{
							name: "Rekapitulasi",
							icon: ChartBarIcon,
							path: `/panitia/events/${activeEvent.event.slug}/rekapitulasi`,
						},
						{
							name: "E-Ticketing",
							icon: TicketIcon,
							path: `/panitia/events/${activeEvent.event.slug}/ticketing`,
						},
						{
							name: "E-Voting",
							icon: HandThumbUpIcon,
							path: `/panitia/events/${activeEvent.event.slug}/voting`,
						}
					);
				}
				// Note: If no activeEvent, menu will be empty (loading state)
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
					{ name: "Riwayat Penilaian", icon: ChartBarIcon, path: "/peserta/assessment-history" }
				);
				break;
			case "JURI":
				// DashboardLayout is now only used when in event mode
				// Dashboard page uses PreAssignLayout
				if (activeJuryEvent && activeJuryEvent.event) {
					roleSpecificItems.push(
						{
							name: "Materi",
							icon: AcademicCapIcon,
							path: `/juri/events/${activeJuryEvent.event.slug}/materi`,
						},
						{
							name: "Peserta",
							icon: UsersIcon,
							path: `/juri/events/${activeJuryEvent.event.slug}/peserta`,
						},
						{
							name: "Penilaian",
							icon: TrophyIcon,
							path: `/juri/events/${activeJuryEvent.event.slug}/penilaian`,
						}
					);
				}
				// Note: If no activeJuryEvent, menu will be empty (loading state)
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
					return `/panitia/events/${activeEvent.event.slug}/manage`;
				}
				return "/panitia/dashboard";
			case "PESERTA":
				return "/peserta/dashboard";
			case "JURI":
				// If juri is viewing an event, go to event info page
				if (activeJuryEvent && activeJuryEvent.event) {
					return `/juri/events/${activeJuryEvent.event.slug}/info`;
				}
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

	// Mobile bottom navigation config per role
	const getMobileNavConfig = (): { primaryItems: MenuItem[]; moreItems: MenuItem[] } => {
		const allItems = getMenuItems();

		if (user?.role === "PANITIA" && activeEvent?.event) {
			const primaryPaths = new Set(
				allItems
					.filter(
						(i) =>
							i.path.endsWith("/manage") ||
							i.path.endsWith("/field-rechecking") ||
							i.path.endsWith("/ticketing")
					)
					.map((i) => i.path)
			);
			const primaryItems = allItems.filter((i) => primaryPaths.has(i.path));
			const moreItems = allItems.filter((i) => !primaryPaths.has(i.path));
			return { primaryItems, moreItems };
		}

		if (user?.role === "SUPERADMIN") {
			const primaryPaths = new Set(["/admin/dashboard", "/admin/users", "/admin/events"]);
			const primaryItems = allItems.filter((i) => primaryPaths.has(i.path));
			const moreItems = allItems.filter((i) => !primaryPaths.has(i.path));
			return { primaryItems, moreItems };
		}

		// PESERTA, JURI, PELATIH, or PANITIA without event
		return { primaryItems: allItems.slice(0, 4), moreItems: allItems.slice(4) };
	};

	const { primaryItems: mobilePrimaryItems, moreItems: mobileMoreItems } = getMobileNavConfig();
	const mobileHasMore = mobileMoreItems.length > 0;

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
										{activeJuryEvent && (
											<>
												<hr className="my-1 border-gray-200 dark:border-gray-700" />
												<div className="px-4 py-2">
													<div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
														Menilai Event:
													</div>
													<div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
														{activeJuryEvent.event.title}
													</div>
													<button
														onClick={() => {
															setShowUserMenu(false);
															handleLeaveJuryEvent();
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



			{/* Main Content */}
			<div
				className={`md:flex md:flex-col md:flex-1 transition-all duration-300 ${
					sidebarCollapsed ? "md:pl-20" : "md:pl-64"
				}`}
			>


				{/* Page Content */}
				<main className="flex-1 pb-16 md:pb-0">
					<div className="">
						<Outlet />
					</div>
				</main>
			</div>

			{/* Mobile Bottom Navigation */}
			<nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 md:hidden z-40">
				<div className="flex items-center justify-around h-16">
					{mobilePrimaryItems.map((item) => {
						const Icon = item.icon;
						return (
							<Link
								key={item.path}
								to={item.path}
								className={`flex flex-col items-center justify-center flex-1 h-full ${isActive(item.path) ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400"}`}
							>
								<Icon className="w-6 h-6" />
								<span className="text-xs mt-1">{item.name}</span>
							</Link>
						);
					})}
					{mobileHasMore ? (
						<button
							onClick={() => setShowMoreMenu(!showMoreMenu)}
							className={`flex flex-col items-center justify-center flex-1 h-full ${showMoreMenu ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400"}`}
						>
							<EllipsisHorizontalIcon className="w-6 h-6" />
							<span className="text-xs mt-1">Lainnya</span>
						</button>
					) : (
						<Link
							to="/profile"
							className={`flex flex-col items-center justify-center flex-1 h-full ${isActive("/profile") ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400"}`}
						>
							<UserCircleIcon className="w-6 h-6" />
							<span className="text-xs mt-1">Profil</span>
						</Link>
					)}
				</div>
			</nav>

			{/* Mobile "Lainnya" Slide-up Panel */}
			{showMoreMenu && (
				<>
					<div
						className="fixed inset-0 bg-black/50 z-40 md:hidden"
						onClick={() => setShowMoreMenu(false)}
					/>
					<div className="fixed bottom-16 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl z-50 md:hidden max-h-[70vh] flex flex-col">
						{/* Handle bar */}
						<div className="flex justify-center pt-3 pb-1">
							<div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
						</div>

						{/* Profile & Event Info */}
						<div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
									{user?.name
										?.split(" ")
										.map((n) => n[0])
										.join("")
										.substring(0, 2)
										.toUpperCase()}
								</div>
								<div className="flex-1">
									<div className="text-sm font-semibold text-gray-900 dark:text-white">
										{user?.name}
									</div>
									<div className="text-xs text-gray-500 dark:text-gray-400">
										{user?.role}
									</div>
								</div>
							</div>
							{activeEvent && (
								<div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
									<div className="text-xs text-gray-500 dark:text-gray-400">Mengelola Event:</div>
									<div className="text-sm font-medium text-gray-900 dark:text-white mt-0.5 mb-2">
										{activeEvent.event.title}
									</div>
									<button
										onClick={() => {
											setShowMoreMenu(false);
											handleLeaveEvent();
										}}
										className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/40"
									>
										<ArrowRightOnRectangleIcon className="w-4 h-4" />
										Keluar Event
									</button>
								</div>
							)}
							{activeJuryEvent && (
								<div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
									<div className="text-xs text-gray-500 dark:text-gray-400">Menilai Event:</div>
									<div className="text-sm font-medium text-gray-900 dark:text-white mt-0.5 mb-2">
										{activeJuryEvent.event.title}
									</div>
									<button
										onClick={() => {
											setShowMoreMenu(false);
											handleLeaveJuryEvent();
										}}
										className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/40"
									>
										<ArrowRightOnRectangleIcon className="w-4 h-4" />
										Keluar Event
									</button>
								</div>
							)}
						</div>

						{/* Menu Items */}
						<div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
							{mobileMoreItems.map((item) => {
								const Icon = item.icon;
								return (
									<Link
										key={item.path}
										to={item.path}
										onClick={() => setShowMoreMenu(false)}
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
							<Link
								to="/profile"
								onClick={() => setShowMoreMenu(false)}
								className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
									isActive("/profile")
										? "bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400"
										: "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
								}`}
							>
								<UserCircleIcon className="w-5 h-5" />
								Profil Saya
							</Link>
							<button
								onClick={() => {
									toggleTheme();
									setShowMoreMenu(false);
								}}
								className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
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
						</div>

						{/* Logout */}
						<div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 px-3 py-2">
							<button
								onClick={() => {
									setShowMoreMenu(false);
									handleLogout();
								}}
								className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
							>
								<ArrowRightOnRectangleIcon className="w-5 h-5" />
								Keluar
							</button>
						</div>
					</div>
				</>
			)}
		</div>
	);
};
