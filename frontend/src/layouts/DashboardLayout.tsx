import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { api } from "../utils/api";
import { hasFeature, MENU_FEATURE_MAP } from "../utils/packageFeatures";
import Swal from "sweetalert2";
import {
	LuHouse,
	LuUsers,
	LuTicket,
	LuScale,
	LuCalendar,
	LuChartBar,
	LuSettings,
	LuUser,
	LuLogOut,
	LuSun,
	LuMoon,
	LuGraduationCap,
	LuMapPin,
	LuTrophy,
	LuShoppingBag,
	LuClipboardList,
	LuThumbsUp,
	LuArrowRightFromLine,
	LuEllipsis,
	LuBookOpen,
	LuDatabase,
	LuCreditCard,
	LuBanknote,
	LuBell,
	LuCode,
} from "react-icons/lu";
import "../components/landing/LandingPage.css";

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
	const mainRef = useRef<HTMLElement | null>(null);
	const [showMoreMenu, setShowMoreMenu] = useState(false);
	const [showNotifications, setShowNotifications] = useState(false);
	const [themeAnimating, setThemeAnimating] = useState(false);
	const [isMobileContentAtTop, setIsMobileContentAtTop] = useState(true);
	const [activeEvent, setActiveEvent] = useState<any>(null);
	const [activeJuryEvent, setActiveJuryEvent] = useState<any>(null);

	// Extract eventSlug from URL for Juri
	const juryEventSlugMatch = location.pathname.match(/\/juri\/events\/([^/]+)/);
	const juryEventSlug = juryEventSlugMatch ? juryEventSlugMatch[1] : null;

	// Extract eventSlug from URL for Panitia
	const panitiaEventSlugMatch = location.pathname.match(/\/panitia\/events\/([^/]+)/);
	const panitiaEventSlug = panitiaEventSlugMatch ? panitiaEventSlugMatch[1] : null;

	useEffect(() => {
		setShowNotifications(false);
		setShowMoreMenu(false);
		setIsMobileContentAtTop(true);
	}, [location.pathname]);

	useEffect(() => {
		if (user?.role === "PANITIA") {
			if (panitiaEventSlug && !activeEvent) {
				checkActiveEvent();
			} else if (!panitiaEventSlug && !activeEvent) {
				checkActiveEvent();
			}
		}
	}, [user, panitiaEventSlug]);

	useEffect(() => {
		if (user?.role === "PANITIA") {
			checkActiveEvent();
		}
	}, [user]);

	useEffect(() => {
		if (user?.role === "JURI" && juryEventSlug) {
			fetchJuryEvent(juryEventSlug);
		} else if (user?.role === "JURI" && !juryEventSlug) {
			setActiveJuryEvent(null);
		}
	}, [user, juryEventSlug]);

	const checkActiveEvent = () => {
		try {
			const stored = localStorage.getItem("panitia_active_event");
			if (stored) {
				const eventData = JSON.parse(stored);
				setActiveEvent({ event: eventData });
			} else {
				setActiveEvent(null);
			}
		} catch (error) {
			localStorage.removeItem("panitia_active_event");
			setActiveEvent(null);
		}
	};

	const fetchJuryEvent = async (eventId: string) => {
		try {
			const response = await api.get(`/juries/events/${eventId}`);
			if (response.data && response.data.event) {
				sessionStorage.removeItem("juri_exited_event");
				setActiveJuryEvent(response.data);
				localStorage.setItem("juri_active_event", JSON.stringify({
					slug: response.data.event.slug,
					title: response.data.event.title,
					id: response.data.event.id,
				}));
			}
		} catch (error) {
			setActiveJuryEvent(null);
		}
	};

	const handleLeaveJuryEvent = () => {
		sessionStorage.setItem("juri_exited_event", "true");
		localStorage.removeItem("juri_active_event");
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

	const getMenuItems = (): MenuItem[] => {
		const isInEventMode = (activeEvent && user?.role === "PANITIA") || (activeJuryEvent && user?.role === "JURI");
		const baseItems: MenuItem[] = [
			{
				name: isInEventMode ? "Event" : "Dashboard",
				icon: LuHouse,
				path: getDashboardPath(),
			},
		];

		const roleSpecificItems: MenuItem[] = [];

		switch (user?.role) {
			case "SUPERADMIN":
				roleSpecificItems.push(
					{ name: "Pengguna", icon: LuUsers, path: "/admin/users" },

					{ name: "Penilaian", icon: LuScale, path: "/admin/assessment-categories" },
					{ name: "Event", icon: LuCalendar, path: "/admin/events" },
					{ name: "Produk", icon: LuShoppingBag, path: "/admin/products" },
					{ name: "Pesanan", icon: LuClipboardList, path: "/admin/orders" },
					{ name: "Panduan", icon: LuBookOpen, path: "/admin/guides" },
					{ name: "Kelola Paket", icon: LuCreditCard, path: "/admin/packages" },
					{ name: "Pencairan", icon: LuBanknote, path: "/admin/disbursements" },
					{ name: "API", icon: LuCode, path: "/admin/api-integration" },
					{ name: "Setting", icon: LuSettings, path: "/admin/settings" },
					{ name: "Backup", icon: LuDatabase, path: "/admin/backup" }
				);
				break;
			case "PANITIA":
				if (activeEvent && activeEvent.event) {
					const slug = activeEvent.event.slug;
					const tier = activeEvent.event.packageTier;
					const allPanitiaItems: MenuItem[] = [
						{ name: "Peserta", icon: LuUsers, path: `/panitia/events/${slug}/peserta` },
						{ name: "Juri", icon: LuScale, path: `/panitia/events/${slug}/juri` },
						{ name: "Materi", icon: LuGraduationCap, path: `/panitia/events/${slug}/materi` },
						{ name: "Juara", icon: LuTrophy, path: `/panitia/events/${slug}/juara` },
						{ name: "Perform", icon: LuMapPin, path: `/panitia/events/${slug}/field-rechecking` },
						{ name: "Rekap", icon: LuChartBar, path: `/panitia/events/${slug}/rekapitulasi` },
						{ name: "Tiket", icon: LuTicket, path: `/panitia/events/${slug}/ticketing` },
						{ name: "Voting", icon: LuThumbsUp, path: `/panitia/events/${slug}/voting` },
						{ name: "Pencairan", icon: LuCreditCard, path: `/panitia/events/${slug}/disbursement` },
					];
					// Filter menu items based on package tier features
					const filteredItems = allPanitiaItems.filter(item => {
						const requiredFeature = MENU_FEATURE_MAP[item.name];
						if (!requiredFeature) return true; // No feature requirement = always show
						return hasFeature(tier, requiredFeature);
					});
					roleSpecificItems.push(...filteredItems);
				}
				break;
			case "PESERTA":
				roleSpecificItems.push(
					{ name: "Event", icon: LuCalendar, path: "/peserta/events" },
					{ name: "Pendaftaran", icon: LuTrophy, path: "/peserta/registrations" },
					{ name: "Riwayat", icon: LuChartBar, path: "/peserta/assessment-history" }
				);
				break;
			case "JURI":
				if (activeJuryEvent && activeJuryEvent.event) {
					roleSpecificItems.push(
						{ name: "Materi", icon: LuGraduationCap, path: `/juri/events/${activeJuryEvent.event.slug}/materi` },
						{ name: "Peserta", icon: LuUsers, path: `/juri/events/${activeJuryEvent.event.slug}/peserta` },
						{ name: "Penilaian", icon: LuTrophy, path: `/juri/events/${activeJuryEvent.event.slug}/penilaian` }
					);
				}
				break;
			case "PELATIH":
				roleSpecificItems.push(
					{ name: "Atlet", icon: LuUsers, path: "/pelatih/athletes" },
					{ name: "Event", icon: LuCalendar, path: "/pelatih/events" },
					{ name: "Performa", icon: LuChartBar, path: "/pelatih/performance" }
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
				if (activeEvent && activeEvent.event) {
					return `/panitia/events/${activeEvent.event.slug}/manage`;
				}
				return "/panitia/dashboard";
			case "PESERTA":
				return "/peserta/dashboard";
			case "JURI":
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

	const getProfilePath = () => {
		switch (user?.role) {
			case "SUPERADMIN": return "/admin/profile";
			case "PANITIA": return "/panitia/profile";
			case "PESERTA": return "/peserta/profile";
			case "JURI": return "/juri/profile";
			case "PELATIH": return "/pelatih/profile";
			default: return "/profile";
		}
	};

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

	const isActive = (path: string) => location.pathname === path;

	const handleMainScroll = () => {
		const scrollTop = mainRef.current?.scrollTop ?? 0;
		const nextIsAtTop = scrollTop <= 2;
		setIsMobileContentAtTop((current) => (
			current === nextIsAtTop ? current : nextIsAtTop
		));
	};

	const menuItems = getMenuItems();
	const profilePath = getProfilePath();

	// For mobile: show first 4 items as primary, rest in "More"
	const mobilePrimaryItems = menuItems.slice(0, 4);
	const mobileMoreItems = menuItems.slice(4);
	const mobileHasMore = mobileMoreItems.length > 0;

	// Active event info for display
	const activeEventTitle = activeEvent?.event?.title || activeJuryEvent?.event?.title || null;
	const hasActiveEvent = !!(activeEvent || activeJuryEvent);

	return (
		<div className="h-screen w-screen overflow-hidden relative">
			{/* Fixed background with grid + gradient */}
			<div className="main-layout-bg" />
			<div className="neon-red-lines" />

			{/* ===== Mobile Top Bar ===== */}
			<header className="fixed top-0 left-0 right-0 z-40 md:hidden h-14 px-3 flex items-center justify-between">
				<Link to="/" className="flex min-w-0 items-center gap-2" aria-label="Simpaskor">
					<div className="w-10 h-10 rounded-xl bg-black border border-white/10 shadow-lg shadow-black/10 flex items-center justify-center overflow-hidden">
						<img
							src="/simpaskor.webp"
							alt="Simpaskor"
							className="w-7 h-7 object-contain"
						/>
					</div>
					<span
						className={`overflow-hidden whitespace-nowrap text-sm font-bold tracking-wide text-gray-900 dark:text-white transition-all duration-300 ${
							isMobileContentAtTop
								? "max-w-28 opacity-100 translate-x-0"
								: "max-w-0 opacity-0 -translate-x-2"
						}`}
					>
						Simpaskor
					</span>
				</Link>

				<div className="flex items-center gap-2">
					<div className="relative">
						<button
							type="button"
							onClick={() => {
								setShowMoreMenu(false);
								setShowNotifications((current) => !current);
							}}
							className="relative w-10 h-10 rounded-xl bg-gray-100/80 hover:bg-gray-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border border-gray-200/60 dark:border-white/[0.08] text-gray-700 dark:text-gray-200 flex items-center justify-center backdrop-blur-xl transition-all"
							aria-label="Notifikasi"
							aria-expanded={showNotifications}
						>
							<LuBell className="w-5 h-5" />
							<span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-950" />
						</button>

						{showNotifications && (
							<>
								<button
									type="button"
									className="fixed inset-0 z-30 cursor-default"
									onClick={() => setShowNotifications(false)}
									aria-label="Tutup notifikasi"
								/>
								<div className="fixed right-3 top-14 z-50 w-[calc(100vw-1.5rem)] max-w-72 overflow-hidden rounded-2xl bg-white/95 dark:bg-gray-900/95 border border-gray-200/60 dark:border-white/[0.08] shadow-2xl shadow-black/10 dark:shadow-black/40 backdrop-blur-xl">
									<div className="px-4 py-3 border-b border-gray-200/50 dark:border-white/[0.06]">
										<p className="text-xs font-semibold text-gray-900 dark:text-white">Notifikasi</p>
									</div>
									<div className="px-4 py-4">
										<p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
											Belum ada notifikasi baru.
										</p>
									</div>
								</div>
							</>
						)}
					</div>

					<button
						type="button"
						onClick={() => {
							setShowNotifications(false);
							setThemeAnimating(true);
							toggleTheme();
							setTimeout(() => setThemeAnimating(false), 500);
						}}
						className="w-10 h-10 rounded-xl bg-gray-100/80 hover:bg-gray-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border border-gray-200/60 dark:border-white/[0.08] text-gray-700 dark:text-gray-200 flex items-center justify-center backdrop-blur-xl transition-all"
						aria-label={theme === "light" ? "Aktifkan mode gelap" : "Aktifkan mode terang"}
					>
						<div className={`transition-all duration-500 ${themeAnimating ? "scale-0 rotate-180" : "scale-100 rotate-0"}`}>
							{theme === "light" ? (
								<LuMoon className="w-5 h-5" />
							) : (
								<LuSun className="w-5 h-5" />
							)}
						</div>
					</button>
				</div>
			</header>

			{/* ===== Left Sidebar Navigation (desktop) ===== */}
			<nav className="fixed left-0 top-0 h-screen w-16 md:w-20 z-50 hidden md:flex flex-col items-center gap-2 border-r border-gray-200/10 dark:border-white/5 overflow-hidden">
				{/* Logo at top */}
				<div className="mt-4 mb-4">
					<Link to="/">
						<div className="w-10 h-10 rounded-xl bg-black border border-white/10 shadow-lg shadow-black/20 flex items-center justify-center overflow-hidden">
							<img
								src="/simpaskor.webp"
								alt="Logo"
								className="w-8 h-8 object-contain"
							/>
						</div>
					</Link>
				</div>

				{/* Active event indicator */}
				{activeEventTitle && (
					<div className="w-10 mb-2">
						<div className="w-full h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
					</div>
				)}

				{/* Navigation Items (centered) */}
				<div className="flex-1 flex flex-col items-center gap-1.5 overflow-y-auto overflow-x-hidden py-2 sidebar-scroll min-h-0">
					{menuItems.map((item) => {
						const active = isActive(item.path);
						const Icon = item.icon;

						return (
							<Link
								key={item.path}
								to={item.path}
								className="group relative flex flex-col items-center gap-0.5 outline-none flex-shrink-0"
								aria-label={item.name}
							>
								{active && (
									<div className="absolute -left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-red-500 rounded-r-full transition-all" />
								)}

								<div
									className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 ${
										active
											? "bg-red-500/15 text-red-500 dark:text-red-400 shadow-lg shadow-red-500/10"
											: "bg-gray-100/50 dark:bg-white/[0.03] text-gray-400 dark:text-gray-500 hover:bg-gray-200/70 dark:hover:bg-white/[0.08] hover:text-gray-700 dark:hover:text-gray-300"
									}`}
								>
									<Icon className="w-5 h-5" />
								</div>

								<span
									className={`text-[10px] font-medium transition-all duration-300 leading-tight ${
										active
											? "text-red-500 dark:text-red-400 opacity-100"
											: "text-gray-500 dark:text-gray-600 opacity-0 group-hover:opacity-100"
									}`}
								>
									{item.name}
								</span>

								{/* Tooltip */}
								<div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl z-[60]">
									{item.name}
									<div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-white dark:border-r-gray-900" />
								</div>
							</Link>
						);
					})}

					{/* Profile nav item */}
					{/* <Link
						to={profilePath}
						className="group relative flex flex-col items-center gap-0.5 outline-none mt-1"
						aria-label="Profile"
					>
						{isActive(profilePath) && (
							<div className="absolute -left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-red-500 rounded-r-full transition-all" />
						)}
						<div
							className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
								isActive(profilePath)
									? "bg-red-500/15 text-red-500 dark:text-red-400 scale-110 shadow-lg shadow-red-500/10"
									: "bg-gray-100/50 dark:bg-white/[0.03] text-gray-400 dark:text-gray-500 hover:bg-gray-200/70 dark:hover:bg-white/[0.08] hover:text-gray-700 dark:hover:text-gray-300"
							}`}
						>
							<LuUser className="w-5 h-5" />
						</div>
						<span
							className={`text-[9px] font-medium transition-all duration-300 leading-tight ${
								isActive(profilePath)
									? "text-red-500 dark:text-red-400 opacity-100"
									: "text-gray-500 dark:text-gray-600 opacity-0 group-hover:opacity-100"
							}`}
						>
							Profile
						</span>
						<div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl z-[60]">
							Profile
							<div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-white dark:border-r-gray-900" />
						</div>
					</Link> */}
				</div>

				{/* Bottom: Leave Event / Theme Toggle / Logout */}
				<div className="mb-6 flex flex-col items-center gap-1.5">
					{/* Leave Event */}
					{hasActiveEvent && (
						<button
							onClick={activeJuryEvent ? handleLeaveJuryEvent : handleLeaveEvent}
							className="group relative flex flex-col items-center gap-0.5 outline-none"
							aria-label="Keluar Event"
						>
							<div className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-500/20">
								<LuArrowRightFromLine className="w-5 h-5" />
							</div>
							<span className="text-[10px] font-medium text-red-500 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-300 leading-tight">
								Keluar
							</span>
							<div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl z-[60]">
								Keluar Event
								<div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-white dark:border-r-gray-900" />
							</div>
						</button>
					)}

					{/* Theme Toggle */}
					<button
						onClick={() => { setThemeAnimating(true); toggleTheme(); setTimeout(() => setThemeAnimating(false), 500); }}
						className="group relative flex flex-col items-center gap-0.5 outline-none"
						aria-label="Toggle theme"
					>
						<div className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 bg-gray-100/50 dark:bg-white/[0.03] text-gray-400 dark:text-gray-500 hover:bg-gray-200/70 dark:hover:bg-white/[0.08] hover:text-gray-700 dark:hover:text-gray-300">
							<div className={`transition-all duration-500 ${themeAnimating ? "scale-0 rotate-180" : "scale-100 rotate-0"}`}>
								{theme === "light" ? (
									<LuMoon className="w-5 h-5" />
								) : (
									<LuSun className="w-5 h-5" />
								)}
							</div>
						</div>
						<span className="text-[10px] font-medium text-gray-500 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-all duration-300 leading-tight">
							Theme
						</span>
						<div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl z-[60]">
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
						<div className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 bg-gray-100/50 dark:bg-white/[0.03] text-gray-400 dark:text-gray-500 hover:bg-red-500/15 hover:text-red-500 dark:hover:text-red-400">
							<LuLogOut className="w-5 h-5" />
						</div>
						<span className="text-[10px] font-medium text-gray-500 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-all duration-300 leading-tight">
							Logout
						</span>
						<div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl z-[60]">
							Logout
							<div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-white dark:border-r-gray-900" />
						</div>
					</button>
				</div>
			</nav>

			{/* ===== Main Content Area ===== */}
			<main
				ref={mainRef}
				onScroll={handleMainScroll}
				className="h-screen overflow-y-auto relative z-10 pl-0 md:pl-20 pt-14 md:pt-0 pb-20 md:pb-6"
			>
				<Outlet />
			</main>

			{/* ===== Mobile Bottom Navigation ===== */}
			<nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
				<div className="mx-3 mb-3 px-2 py-2 rounded-2xl bg-white/80 dark:bg-white/[0.06] backdrop-blur-xl border border-gray-200/50 dark:border-white/[0.08] shadow-lg shadow-black/5 dark:shadow-black/20">
					<div className="flex items-center justify-around">
						{mobilePrimaryItems.map((item) => {
							const active = isActive(item.path);
							const Icon = item.icon;
							return (
								<Link
									key={item.path}
									to={item.path}
									className="group relative flex flex-col items-center gap-0.5 outline-none"
									aria-label={item.name}
								>
									{active && (
										<div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-red-500 rounded-full" />
									)}
									<div
										className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
											active
												? "bg-red-500/15 text-red-500 dark:text-red-400 scale-110"
												: "text-gray-400 dark:text-gray-500"
										}`}
									>
										<Icon className="w-[18px] h-[18px]" />
									</div>
									<span
										className={`text-[8px] font-medium leading-tight ${
											active
												? "text-red-500 dark:text-red-400"
												: "text-gray-400 dark:text-gray-500"
										}`}
									>
										{item.name}
									</span>
								</Link>
							);
						})}
						{mobileHasMore ? (
							<button
								onClick={() => setShowMoreMenu(!showMoreMenu)}
								className="group relative flex flex-col items-center gap-0.5 outline-none"
								aria-label="Lainnya"
							>
								<div
									className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
										showMoreMenu
											? "bg-red-500/15 text-red-500 dark:text-red-400"
											: "text-gray-400 dark:text-gray-500"
									}`}
								>
									<LuEllipsis className="w-[18px] h-[18px]" />
								</div>
								<span
									className={`text-[8px] font-medium leading-tight ${
										showMoreMenu
											? "text-red-500 dark:text-red-400"
											: "text-gray-400 dark:text-gray-500"
									}`}
								>
									Lainnya
								</span>
							</button>
						) : (
							<Link
								to={profilePath}
								className="group relative flex flex-col items-center gap-0.5 outline-none"
								aria-label="Profile"
							>
								{isActive(profilePath) && (
									<div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-red-500 rounded-full" />
								)}
								<div
									className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
										isActive(profilePath)
											? "bg-red-500/15 text-red-500 dark:text-red-400 scale-110"
											: "text-gray-400 dark:text-gray-500"
									}`}
								>
									<LuUser className="w-[18px] h-[18px]" />
								</div>
								<span
									className={`text-[8px] font-medium leading-tight ${
										isActive(profilePath)
											? "text-red-500 dark:text-red-400"
											: "text-gray-400 dark:text-gray-500"
									}`}
								>
									Profile
								</span>
							</Link>
						)}
					</div>
				</div>
			</nav>

			{/* ===== Mobile "Lainnya" Slide-up Panel ===== */}
			{showMoreMenu && (
				<>
					<div
						className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
						onClick={() => setShowMoreMenu(false)}
					/>
					<div className="fixed bottom-[76px] left-3 right-3 z-50 md:hidden max-h-[60vh] flex flex-col rounded-2xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200/50 dark:border-white/[0.08] shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden">
						{/* Handle bar */}
						<div className="flex justify-center pt-3 pb-1">
							<div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
						</div>

						{/* Active Event Info */}
						{activeEventTitle && (
							<div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-red-500/5 dark:bg-red-500/10 border border-red-500/10 dark:border-red-500/20">
								<p className="text-[10px] text-gray-500 dark:text-gray-500 mb-0.5">Mengelola Event:</p>
								<p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{activeEventTitle}</p>
								<button
									onClick={() => {
										setShowMoreMenu(false);
										activeJuryEvent ? handleLeaveJuryEvent() : handleLeaveEvent();
									}}
									className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
								>
									<LuArrowRightFromLine className="w-3.5 h-3.5" />
									Keluar Event
								</button>
							</div>
						)}

						{/* Menu Items */}
						<div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
							{mobileMoreItems.map((item) => {
								const Icon = item.icon;
								return (
									<Link
										key={item.path}
										to={item.path}
										onClick={() => setShowMoreMenu(false)}
										className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
											isActive(item.path)
												? "bg-red-500/10 text-red-500 dark:text-red-400"
												: "text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-white/[0.05]"
										}`}
									>
										<Icon className="w-5 h-5" />
										{item.name}
									</Link>
								);
							})}

							{/* Profile link */}
							<Link
								to={profilePath}
								onClick={() => setShowMoreMenu(false)}
								className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
									isActive(profilePath)
										? "bg-red-500/10 text-red-500 dark:text-red-400"
										: "text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-white/[0.05]"
								}`}
							>
								<LuUser className="w-5 h-5" />
								Profile
							</Link>

							{/* Theme Toggle */}
							<button
								onClick={() => {
									setThemeAnimating(true);
									toggleTheme();
									setShowMoreMenu(false);
									setTimeout(() => setThemeAnimating(false), 500);
								}}
								className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-white/[0.05] rounded-xl transition-all"
							>
								<div className={`transition-all duration-500 ${themeAnimating ? "scale-0 rotate-180" : "scale-100 rotate-0"}`}>
									{theme === "light" ? <LuMoon className="w-5 h-5" /> : <LuSun className="w-5 h-5" />}
								</div>
								{theme === "light" ? "Mode Gelap" : "Mode Terang"}
							</button>
						</div>

						{/* Logout */}
						<div className="flex-shrink-0 border-t border-gray-200/30 dark:border-white/[0.06] px-3 py-2">
							<button
								onClick={() => {
									setShowMoreMenu(false);
									handleLogout();
								}}
								className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
							>
								<LuLogOut className="w-5 h-5" />
								Keluar
							</button>
						</div>
					</div>
				</>
			)}
		</div>
	);
};
