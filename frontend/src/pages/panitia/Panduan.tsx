import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
	LuArrowLeft,
	LuBookOpen,
	LuChevronLeft,
	LuChevronRight,
	LuImage,
	LuSettings,
	LuGavel,
	LuUserCheck,
	LuX,
} from "react-icons/lu";
import { api } from "../../utils/api";
import "../../components/landing/LandingPage.css";

type TabKey = "PANITIA" | "JURI" | "PESERTA";

interface GuideSlide {
	id: string;
	order: number;
	title: string;
	description: string;
	imageUrl: string | null;
}

interface Guide {
	id: string;
	role: TabKey;
	title: string;
	description: string | null;
	icon: string | null;
	order: number;
	slides: GuideSlide[];
}

const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
	{ key: "PANITIA", label: "Panitia", icon: LuSettings },
	{ key: "JURI", label: "Juri", icon: LuGavel },
	{ key: "PESERTA", label: "Peserta", icon: LuUserCheck },
];

const Panduan: React.FC = () => {
	const [activeTab, setActiveTab] = useState<TabKey>("PANITIA");
	const [guides, setGuides] = useState<Guide[]>([]);
	const [loading, setLoading] = useState(true);
	const [activeGuide, setActiveGuide] = useState<Guide | null>(null);
	const [activeSlideIdx, setActiveSlideIdx] = useState(0);
	const [imageModal, setImageModal] = useState<string | null>(null);

	const fetchGuides = useCallback(async () => {
		try {
			setLoading(true);
			const res = await api.get(`/guides/public?role=${activeTab}`);
			setGuides(res.data || []);
		} catch (error) {
			console.error("Error fetching guides:", error);
		} finally {
			setLoading(false);
		}
	}, [activeTab]);

	useEffect(() => {
		fetchGuides();
	}, [fetchGuides]);

	const openGuide = (guide: Guide) => {
		setActiveGuide(guide);
		setActiveSlideIdx(0);
	};

	const closeGuide = () => {
		setActiveGuide(null);
		setActiveSlideIdx(0);
	};

	const goSlide = (dir: "prev" | "next") => {
		if (!activeGuide) return;
		const total = activeGuide.slides.length;
		setActiveSlideIdx((prev) =>
			dir === "prev" ? Math.max(0, prev - 1) : Math.min(total - 1, prev + 1)
		);
	};

	// ====== FULL SCREEN GUIDE VIEW ======
	if (activeGuide) {
		const slide = activeGuide.slides[activeSlideIdx];
		const total = activeGuide.slides.length;

		return (
			<div className="h-screen flex flex-col overflow-hidden">
				{/* Top bar */}
				<div className="flex-shrink-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-white/[0.06]">
					<div className="px-4 md:px-6 py-3 flex items-center gap-3">
						<button
							onClick={closeGuide}
							className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
						>
							<LuArrowLeft className="w-4 h-4" />
							Kembali
						</button>
						<div className="w-px h-5 bg-gray-200 dark:bg-white/10" />
						<div className="flex-1 min-w-0">
							<h2 className="text-sm font-bold text-gray-900 dark:text-white truncate">
								{activeGuide.title}
							</h2>
						</div>
						<span className="px-2.5 py-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex-shrink-0">
							{activeSlideIdx + 1} / {total}
						</span>
						<button
							onClick={closeGuide}
							className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
						>
							<LuX className="w-4 h-4 text-gray-500" />
						</button>
					</div>
				</div>

				{/* Main content — fills remaining viewport */}
				<div className="flex-1 flex flex-col lg:flex-row w-full min-h-0">
					{slide ? (
						<>
							{/* LEFT: Screenshot (2/3) */}
							<div className="lg:w-2/3 flex-shrink-0 flex items-center justify-center bg-gray-50/50 dark:bg-black/20 p-4 md:p-6 lg:p-8 min-h-[40vh] lg:min-h-0">
								{slide.imageUrl ? (
									<div
										className="relative cursor-pointer group w-full flex items-center justify-center"
										onClick={() => setImageModal(slide.imageUrl)}
									>
										<img
											src={slide.imageUrl}
											alt={slide.title}
											className="max-w-full max-h-[40vh] lg:max-h-full object-contain rounded-xl shadow-lg shadow-black/10 dark:shadow-black/30"
										/>
										<div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
											<span className="text-[10px] font-bold text-white bg-black/50 px-3 py-1.5 rounded-lg">
												Klik untuk memperbesar
											</span>
										</div>
									</div>
								) : (
									<div className="w-full h-64 lg:h-96 rounded-xl bg-gray-100 dark:bg-white/[0.03] border border-dashed border-gray-300 dark:border-white/10 flex items-center justify-center">
										<div className="text-center">
											<LuImage className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
											<p className="text-xs text-gray-400 dark:text-gray-600">Screenshot belum tersedia</p>
										</div>
									</div>
								)}
							</div>

							{/* RIGHT: Description + Navigation (1/3) */}
							<div className="lg:w-1/3 flex flex-col lg:border-l border-gray-200/50 dark:border-white/[0.06] min-h-0">
								{/* Title + Description (3/5 height, scrollable) */}
								<div className="h-3/5 overflow-y-auto p-5 md:p-6 border-b border-gray-200/30 dark:border-white/[0.04]">
									{/* Step badge */}
									<div className="flex items-center gap-2 mb-3">
										<div className="w-7 h-7 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
											{activeSlideIdx + 1}
										</div>
										<span className="text-[10px] tracking-[0.2em] text-gray-400 dark:text-gray-500 font-medium uppercase">
											Step {activeSlideIdx + 1} dari {total}
										</span>
									</div>

									{/* Title */}
									<h3 className="text-base md:text-lg font-black text-gray-900 dark:text-white mb-2 leading-tight">
										{slide.title}
									</h3>

									{/* Description */}
									<p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
										{slide.description}
									</p>
								</div>

								{/* Navigation step list (2/5 height, scrollable) */}
								<div className="h-2/5 overflow-y-auto p-4 md:p-5">
									<p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
										Daftar Langkah
									</p>
									<div className="space-y-1">
										{activeGuide.slides.map((s, sIdx) => (
											<button
												key={s.id}
												onClick={() => setActiveSlideIdx(sIdx)}
												className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] transition-all ${
													sIdx === activeSlideIdx
														? "bg-red-500 text-white shadow-md shadow-red-500/20 font-bold"
														: "text-gray-600 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-white/[0.05] font-medium"
												}`}
											>
												<span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${
													sIdx === activeSlideIdx
														? "bg-white/20 text-white"
														: "bg-gray-200/80 dark:bg-white/[0.08] text-gray-500 dark:text-gray-500"
												}`}>
													{sIdx + 1}
												</span>
												<span className="truncate">{s.title}</span>
											</button>
										))}
									</div>
								</div>

								{/* Prev / Next buttons */}
								<div className="flex-shrink-0 border-t border-gray-200/30 dark:border-white/[0.04] p-3 flex items-center gap-2">
									<button
										disabled={activeSlideIdx === 0}
										onClick={() => goSlide("prev")}
										className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.06] disabled:opacity-30 transition-all border border-gray-200/50 dark:border-white/[0.06]"
									>
										<LuChevronLeft className="w-3.5 h-3.5" />
										Prev
									</button>
									<button
										disabled={activeSlideIdx === total - 1}
										onClick={() => goSlide("next")}
										className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-red-500 text-white hover:bg-red-600 disabled:opacity-30 shadow-lg shadow-red-500/20 transition-all"
									>
										Next
										<LuChevronRight className="w-3.5 h-3.5" />
									</button>
								</div>
							</div>
						</>
					) : (
						<div className="flex-1 flex items-center justify-center">
							<p className="text-sm text-gray-400">Panduan ini belum memiliki langkah-langkah.</p>
						</div>
					)}
				</div>

				{/* Image Modal */}
				{imageModal && (
					<div
						className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-pointer"
						onClick={() => setImageModal(null)}
					>
						<img
							src={imageModal}
							alt="Screenshot"
							className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
						/>
					</div>
				)}
			</div>
		);
	}

	// ====== GUIDE LIST VIEW ======
	return (
		<div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
			{/* Header */}
			<div className="mb-6">
				<Link
					to="/panitia/dashboard"
					className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors mb-4"
				>
					<LuArrowLeft className="w-3.5 h-3.5" />
					Kembali ke Dashboard
				</Link>
				<div className="relative overflow-hidden rounded-2xl bg-white/40 dark:bg-white/[0.02] backdrop-blur-sm border border-gray-200/50 dark:border-white/[0.06] p-6 md:p-8">
					<div className="relative z-10">
						<div className="flex items-center gap-3 mb-2">
							<div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
								<LuBookOpen className="w-5 h-5 text-red-500" />
							</div>
							<div>
								<p className="text-[10px] md:text-xs tracking-[0.3em] text-gray-400 dark:text-gray-500 font-medium">
									PUSAT BANTUAN
								</p>
								<h1 className="text-2xl sm:text-3xl font-black leading-none landing-title-gradient">
									Panduan Penggunaan
								</h1>
							</div>
						</div>
						<p className="text-xs md:text-sm text-gray-500 dark:text-gray-500 font-medium mt-3 ml-[52px]">
							Pelajari cara menggunakan Simpaskor sesuai peran Anda.
						</p>
					</div>
					<div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-red-500/[0.04] to-transparent pointer-events-none" />
				</div>
			</div>

			{/* Tabs */}
			<div className="flex gap-1 p-1 mb-6 rounded-xl bg-white/60 dark:bg-white/[0.03] border border-gray-200/50 dark:border-white/[0.06]">
				{tabs.map((tab) => {
					const Icon = tab.icon;
					const isActive = activeTab === tab.key;
					return (
						<button
							key={tab.key}
							onClick={() => setActiveTab(tab.key)}
							className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
								isActive
									? "bg-red-500 text-white shadow-lg shadow-red-500/20"
									: "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-white/[0.04]"
							}`}
						>
							<Icon className="w-4 h-4" />
							{tab.label}
						</button>
					);
				})}
			</div>

			{/* Loading */}
			{loading ? (
				<div className="flex items-center justify-center py-20">
					<div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-500" />
				</div>
			) : guides.length === 0 ? (
				<div className="text-center py-16 rounded-xl bg-white/60 dark:bg-white/[0.03] border border-gray-200/50 dark:border-white/[0.06]">
					<LuBookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
					<p className="text-sm text-gray-400 dark:text-gray-600">Panduan belum tersedia untuk role ini.</p>
				</div>
			) : (
				/* Guide button grid */
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					{guides.map((guide) => (
						<button
							key={guide.id}
							onClick={() => openGuide(guide)}
							className="group text-left rounded-xl bg-white/60 dark:bg-white/[0.03] backdrop-blur-sm border border-gray-200/50 dark:border-white/[0.06] p-5 transition-all hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:border-red-500/30 dark:hover:border-red-500/20"
						>
							<div className="flex items-start gap-3.5">
								<div className="w-10 h-10 rounded-xl bg-red-500/10 group-hover:bg-red-500/20 flex items-center justify-center flex-shrink-0 text-red-500 text-sm font-black transition-colors">
									{guide.order + 1}
								</div>
								<div className="flex-1 min-w-0">
									<h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors">
										{guide.title}
									</h3>
									<p className="text-[11px] text-gray-500 dark:text-gray-500 mt-1 line-clamp-2 leading-relaxed">
										{guide.description || "Klik untuk melihat panduan"}
									</p>
									<div className="flex items-center gap-2 mt-3">
										<span className="text-[10px] font-bold text-gray-400 dark:text-gray-600">
											{guide.slides.length} langkah
										</span>
										<LuChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-red-500 group-hover:translate-x-0.5 transition-all" />
									</div>
								</div>
							</div>
						</button>
					))}
				</div>
			)}
		</div>
	);
};

export default Panduan;
