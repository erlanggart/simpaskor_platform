import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../utils/api";
import {
	TrophyIcon,
	ScaleIcon,
	AcademicCapIcon,
	ClipboardDocumentListIcon,
	UserGroupIcon,
	CalendarDaysIcon,
	ChartBarIcon,
	ClockIcon,
	StarIcon,
	ClipboardDocumentCheckIcon,
	UsersIcon,
	DocumentChartBarIcon,
	EnvelopeIcon,
	AdjustmentsHorizontalIcon,
	IdentificationIcon,
	ArrowTrendingUpIcon,
	PresentationChartLineIcon,
	BookOpenIcon,
	ChatBubbleLeftRightIcon,
	TicketIcon,
	BanknotesIcon,
	ChartPieIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
} from "@heroicons/react/24/outline";

interface RoleOption {
	id: "PESERTA" | "PANITIA" | "JURI" | "PELATIH" | "MITRA";
	title: string;
	tagline: string;
	icon: React.ElementType;
	description: string;
	features: { label: string; icon: React.ElementType }[];
	gradient: string;
	iconBg: string;
	accent: string;
}

// Order requested: Peserta, Panitia, Juri, Pelatih, Mitra.
const roles: RoleOption[] = [
	{
		id: "PESERTA",
		title: "Peserta",
		tagline: "Saya ingin ikut lomba",
		icon: TrophyIcon,
		description:
			"Ikuti berbagai event paskibra dan tunjukkan kemampuan terbaikmu di hadapan juri profesional.",
		features: [
			{ label: "Daftar event paskibra", icon: CalendarDaysIcon },
			{ label: "Lihat hasil penilaian", icon: ChartBarIcon },
			{ label: "Riwayat kompetisi", icon: ClockIcon },
			{ label: "Sertifikat & peringkat", icon: StarIcon },
		],
		gradient: "from-amber-500 to-orange-600",
		iconBg: "bg-amber-500/10 text-amber-500",
		accent: "text-amber-500",
	},
	{
		id: "PANITIA",
		title: "Panitia",
		tagline: "Saya ingin mengadakan event",
		icon: ClipboardDocumentListIcon,
		description:
			"Buat dan kelola event paskibra secara profesional dengan sistem penilaian digital.",
		features: [
			{ label: "Buat & kelola event", icon: CalendarDaysIcon },
			{ label: "Sistem penilaian digital", icon: ClipboardDocumentCheckIcon },
			{ label: "Kelola peserta & juri", icon: UsersIcon },
			{ label: "Laporan & rekap otomatis", icon: DocumentChartBarIcon },
		],
		gradient: "from-red-500 to-rose-600",
		iconBg: "bg-red-500/10 text-red-500",
		accent: "text-red-500",
	},
	{
		id: "JURI",
		title: "Juri",
		tagline: "Saya ingin menilai peserta",
		icon: ScaleIcon,
		description:
			"Nilai peserta secara profesional dengan standar nasional dan berikan penilaian yang adil.",
		features: [
			{ label: "Terima undangan event", icon: EnvelopeIcon },
			{ label: "Penilaian digital", icon: ClipboardDocumentCheckIcon },
			{ label: "Kelola kategori penilaian", icon: AdjustmentsHorizontalIcon },
			{ label: "Profil juri publik", icon: IdentificationIcon },
		],
		gradient: "from-blue-500 to-indigo-600",
		iconBg: "bg-blue-500/10 text-blue-500",
		accent: "text-blue-500",
	},
	{
		id: "PELATIH",
		title: "Pelatih",
		tagline: "Saya ingin membina atlet",
		icon: AcademicCapIcon,
		description:
			"Bimbing dan pantau perkembangan atlet-atlet paskibra untuk meraih prestasi tertinggi.",
		features: [
			{ label: "Pantau perkembangan atlet", icon: ArrowTrendingUpIcon },
			{ label: "Lihat statistik performa", icon: PresentationChartLineIcon },
			{ label: "Akses materi pelatihan", icon: BookOpenIcon },
			{ label: "Koordinasi dengan panitia", icon: ChatBubbleLeftRightIcon },
		],
		gradient: "from-emerald-500 to-teal-600",
		iconBg: "bg-emerald-500/10 text-emerald-500",
		accent: "text-emerald-500",
	},
	{
		id: "MITRA",
		title: "Mitra",
		tagline: "Saya ingin jadi mitra & dapat komisi",
		icon: UserGroupIcon,
		description:
			"Bagikan kode referral ke panitia dan dapatkan komisi untuk setiap event yang menggunakan kode Anda.",
		features: [
			{ label: "Kode referral unik", icon: TicketIcon },
			{ label: "Komisi Rp200.000/event", icon: BanknotesIcon },
			{ label: "Riwayat referral event", icon: ClockIcon },
			{ label: "Dashboard komisi", icon: ChartPieIcon },
		],
		gradient: "from-red-500 to-pink-600",
		iconBg: "bg-red-500/10 text-red-500",
		accent: "text-pink-500",
	},
];

const dashboardPaths: Record<string, string> = {
	PANITIA: "/panitia/dashboard",
	PESERTA: "/peserta/dashboard",
	JURI: "/juri/dashboard",
	PELATIH: "/pelatih/dashboard",
	MITRA: "/mitra/dashboard",
};

const RoleSelection = () => {
	const location = useLocation();
	const navigate = useNavigate();
	const { setAuth } = useAuth();

	// Preselect from ?role= if it matches a known role, else start at Peserta.
	const initialRole = new URLSearchParams(location.search)
		.get("role")
		?.toUpperCase();
	const initialIndex = Math.max(
		0,
		roles.findIndex((r) => r.id === initialRole)
	);

	const scrollRef = useRef<HTMLDivElement>(null);
	// Target of an in-progress programmatic smooth-scroll. While set, onScroll
	// ignores the intermediate slides the carousel passes through so the active
	// tab's gradient doesn't flicker through every color en route.
	const snapTarget = useRef<number | null>(null);
	const [activeIndex, setActiveIndex] = useState(initialIndex);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const activeRole = roles[activeIndex]!;

	// scrollLeft that centers slide i (cards are narrower than the viewport so
	// neighbors peek, hence we can't assume one slide == clientWidth).
	const centerLeft = (el: HTMLDivElement, i: number) => {
		const child = el.children[i] as HTMLElement | undefined;
		if (!child) return 0;
		return child.offsetLeft - (el.clientWidth - child.clientWidth) / 2;
	};

	// Index of the slide currently nearest the viewport center.
	const nearestIndex = (el: HTMLDivElement) => {
		const center = el.scrollLeft + el.clientWidth / 2;
		let best = Infinity;
		let i = 0;
		for (let k = 0; k < el.children.length; k++) {
			const c = el.children[k] as HTMLElement;
			const d = Math.abs(c.offsetLeft + c.clientWidth / 2 - center);
			if (d < best) {
				best = d;
				i = k;
			}
		}
		return i;
	};

	// Jump to the preselected slide on mount (no animation).
	useEffect(() => {
		const el = scrollRef.current;
		if (el && initialIndex > 0) {
			el.scrollLeft = centerLeft(el, initialIndex);
		}
		// run once
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Slide the carousel to a given role and mark it selected.
	const goTo = (i: number) => {
		const el = scrollRef.current;
		if (el) {
			snapTarget.current = i;
			el.scrollTo({ left: centerLeft(el, i), behavior: "smooth" });
		}
		setActiveIndex(i);
	};

	// Swipe/scroll updates the active role so the tabs stay in sync.
	const onScroll = () => {
		const el = scrollRef.current;
		if (!el) return;
		const i = nearestIndex(el);
		// During a programmatic scroll, wait until we land on the target before
		// reacting — otherwise intermediate slides flicker the tab color.
		if (snapTarget.current !== null) {
			if (i === snapTarget.current) snapTarget.current = null;
			return;
		}
		setActiveIndex((prev) => (prev === i ? prev : i));
	};

	const handleConfirm = async () => {
		try {
			setIsLoading(true);
			setError(null);

			const response = await api.patch("/auth/select-role", {
				role: activeRole.id,
			});

			setAuth(response.data.user, response.data.token);
			navigate(dashboardPaths[activeRole.id] || "/dashboard", {
				replace: true,
			});
		} catch (err: any) {
			setError(
				err.response?.data?.message ||
					"Gagal menyimpan pilihan. Silakan coba lagi."
			);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
			<div className="w-full max-w-5xl">
				{/* Header — bahasa ramah, bukan istilah teknis */}
				<div className="text-center mb-8">
					<h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
						Anda ingin bergabung sebagai apa?
					</h1>
					<p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base max-w-lg mx-auto">
						Pilih yang paling sesuai dengan tujuan Anda di SIMPASKOR. Geser
						pilihan atau ketuk salah satu di samping untuk melihat detailnya.
					</p>
				</div>

				{/* Mobile: tab vertikal kiri + slide kanan.
				    Desktop: tab baris atas + slide bawah. */}
				<div className="flex flex-row lg:flex-col gap-3 sm:gap-5 mb-8">
					{/* Tabs */}
					<div className="flex flex-col lg:flex-row gap-2 shrink-0 lg:justify-center">
						{roles.map((role, i) => {
							const Icon = role.icon;
							const active = i === activeIndex;
							return (
								<button
									key={role.id}
									type="button"
									onClick={() => goTo(i)}
									aria-pressed={active}
									className={`flex flex-col lg:flex-row items-center gap-1.5 lg:gap-2 w-20 sm:w-24 lg:w-auto px-2 py-3 lg:px-4 rounded-xl border-2 transition-all duration-300 ${
										active
											? `border-transparent bg-gradient-to-r ${role.gradient} text-white shadow-lg`
											: "border-gray-200 dark:border-gray-700/50 text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800/60"
									}`}
								>
									<Icon className="w-5 h-5 shrink-0" />
									<span className="text-[11px] sm:text-xs lg:text-sm font-semibold leading-tight text-center">
										{role.title}
									</span>
								</button>
							);
						})}
					</div>

					{/* Slider — CSS scroll-snap, swipe native di mobile & trackpad.
					    Tombol panah kiri/kanan hanya tampil di desktop. */}
					<div className="relative flex-1 lg:px-14">
						<button
							type="button"
							onClick={() => goTo(activeIndex - 1)}
							disabled={activeIndex === 0}
							aria-label="Role sebelumnya"
							className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 shadow-md hover:bg-white dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-all disabled:opacity-0 disabled:pointer-events-none"
						>
							<ChevronLeftIcon className="w-5 h-5" />
						</button>
						<button
							type="button"
							onClick={() => goTo(activeIndex + 1)}
							disabled={activeIndex === roles.length - 1}
							aria-label="Role berikutnya"
							className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 shadow-md hover:bg-white dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-all disabled:opacity-0 disabled:pointer-events-none"
						>
							<ChevronRightIcon className="w-5 h-5" />
						</button>
						<div
							ref={scrollRef}
							onScroll={onScroll}
							className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
						>
						{roles.map((role) => {
							const Icon = role.icon;
							return (
								<div
									key={role.id}
									className="snap-center shrink-0 w-[88%] sm:w-[90%] px-1.5"
								>
									<div className="h-full rounded-2xl border-2 border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-800/60 p-5 sm:p-8 shadow-sm">
										{/* Header kartu */}
										<div className="flex items-center gap-4 mb-4">
											<div
												className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${role.iconBg} flex items-center justify-center shrink-0`}
											>
												<Icon className="w-6 h-6 sm:w-7 sm:h-7" />
											</div>
											<div>
												<h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
													{role.title}
												</h3>
												<p
													className={`text-sm font-medium bg-gradient-to-r ${role.gradient} bg-clip-text text-transparent`}
												>
													{role.tagline}
												</p>
											</div>
										</div>

										<p className="text-sm text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
											{role.description}
										</p>

										<ul className="grid sm:grid-cols-2 gap-2.5">
											{role.features.map((feature, idx) => {
												const FeatureIcon = feature.icon;
												return (
													<li
														key={idx}
														className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300"
													>
														<FeatureIcon
															className={`w-4 h-4 shrink-0 ${role.accent}`}
														/>
														{feature.label}
													</li>
												);
											})}
										</ul>
									</div>
								</div>
							);
						})}
						</div>
					</div>
				</div>

				{/* Error */}
				{error && (
					<div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-center">
						<p className="text-sm text-red-600 dark:text-red-400">{error}</p>
					</div>
				)}

				{/* Konfirmasi — sebut role aktif agar jelas */}
				<div className="text-center">
					<button
						type="button"
						onClick={handleConfirm}
						disabled={isLoading}
						className="px-8 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
					>
						{isLoading ? (
							<span className="flex items-center gap-2">
								<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
								Memproses...
							</span>
						) : (
							`Lanjutkan sebagai ${activeRole.title}`
						)}
					</button>
				</div>
			</div>
		</div>
	);
};

export default RoleSelection;
