import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
	LuArrowLeft,
	LuBookOpen,
	LuChevronDown,
	LuChevronLeft,
	LuChevronRight,
	LuImage,
	LuSettings,
	LuGavel,
	LuUserCheck,
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
	const [expandedGuide, setExpandedGuide] = useState<string | null>(null);
	const [activeSlideIndex, setActiveSlideIndex] = useState<Record<string, number>>({});
	const [imageModal, setImageModal] = useState<string | null>(null);

	const fetchGuides = useCallback(async () => {
		try {
			setLoading(true);
			const res = await api.get(`/guides/public?role=${activeTab}`);
			const data: Guide[] = res.data || [];
			setGuides(data);
			if (data.length > 0 && data[0]) {
				setExpandedGuide(data[0].id);
			} else {
				setExpandedGuide(null);
			}
		} catch (error) {
			console.error("Error fetching guides:", error);
		} finally {
			setLoading(false);
		}
	}, [activeTab]);

	useEffect(() => {
		fetchGuides();
	}, [fetchGuides]);

	const toggleGuide = (id: string) => {
		setExpandedGuide((prev) => (prev === id ? null : id));
	};

	const goToSlide = (guideId: string, direction: "prev" | "next", totalSlides: number) => {
		setActiveSlideIndex((prev) => {
			const current = prev[guideId] || 0;
			const next = direction === "prev" ? Math.max(0, current - 1) : Math.min(totalSlides - 1, current + 1);
			return { ...prev, [guideId]: next };
		});
	};

	const setSlide = (guideId: string, index: number) => {
		setActiveSlideIndex((prev) => ({ ...prev, [guideId]: index }));
	};

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
							onClick={() => {
								setActiveTab(tab.key);
								setActiveSlideIndex({});
							}}
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
				<div className="space-y-3">
					{guides.map((guide) => {
						const isOpen = expandedGuide === guide.id;
						const currentSlideIdx = activeSlideIndex[guide.id] || 0;
						const currentSlide = guide.slides[currentSlideIdx];
						const totalSlides = guide.slides.length;

						return (
							<div
								key={guide.id}
								className="rounded-xl bg-white/60 dark:bg-white/[0.03] backdrop-blur-sm border border-gray-200/50 dark:border-white/[0.06] overflow-hidden"
							>
								{/* Section Header */}
								<button
									onClick={() => toggleGuide(guide.id)}
									className="w-full flex items-center gap-3 p-4 md:p-5 text-left hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
								>
									<div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0 text-red-500 text-sm font-bold">
										{guide.order + 1}
									</div>
									<div className="flex-1 min-w-0">
										<h3 className="text-sm font-bold text-gray-900 dark:text-white">
											{guide.title}
										</h3>
										<p className="text-[11px] text-gray-500 dark:text-gray-500 mt-0.5 truncate">
											{guide.description || `${totalSlides} langkah`}
										</p>
									</div>
									<span className="text-[10px] text-gray-400 dark:text-gray-600 font-medium mr-1">
										{totalSlides} step
									</span>
									<div className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
										<LuChevronDown className="w-4 h-4 text-gray-400" />
									</div>
								</button>

								{/* Slide Content */}
								{isOpen && totalSlides > 0 && currentSlide && (
									<div className="border-t border-gray-200/30 dark:border-white/[0.04]">
										{/* Screenshot */}
										{currentSlide.imageUrl ? (
											<div
												className="relative cursor-pointer group"
												onClick={() => setImageModal(currentSlide.imageUrl)}
											>
												<img
													src={currentSlide.imageUrl}
													alt={currentSlide.title}
													className="w-full max-h-[400px] object-contain bg-gray-100 dark:bg-black/20"
												/>
												<div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
													<span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-white bg-black/50 px-2 py-1 rounded-lg transition-opacity">
														Klik untuk memperbesar
													</span>
												</div>
											</div>
										) : (
											<div className="w-full h-48 bg-gray-100/50 dark:bg-white/[0.02] flex items-center justify-center">
												<div className="text-center">
													<LuImage className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-1" />
													<p className="text-[10px] text-gray-300 dark:text-gray-600">Screenshot belum tersedia</p>
												</div>
											</div>
										)}

										{/* Step info + Navigation */}
										<div className="p-4 md:p-5">
											{/* Step badge */}
											<div className="flex items-center gap-2 mb-2">
												<span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
													Step {currentSlideIdx + 1} / {totalSlides}
												</span>
											</div>

											{/* Title & Description */}
											<h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1.5">
												{currentSlide.title}
											</h4>
											<p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
												{currentSlide.description}
											</p>

											{/* Step dots + arrows */}
											<div className="flex items-center justify-between mt-5">
												<button
													disabled={currentSlideIdx === 0}
													onClick={() => goToSlide(guide.id, "prev", totalSlides)}
													className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-white/[0.04] disabled:opacity-30 transition-all"
												>
													<LuChevronLeft className="w-4 h-4" />
													Sebelumnya
												</button>

												{/* Dots */}
												<div className="flex gap-1.5">
													{guide.slides.map((_, sIdx) => (
														<button
															key={sIdx}
															onClick={() => setSlide(guide.id, sIdx)}
															className={`w-2 h-2 rounded-full transition-all ${
																sIdx === currentSlideIdx
																	? "bg-red-500 scale-125"
																	: "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400"
															}`}
														/>
													))}
												</div>

												<button
													disabled={currentSlideIdx === totalSlides - 1}
													onClick={() => goToSlide(guide.id, "next", totalSlides)}
													className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-white/[0.04] disabled:opacity-30 transition-all"
												>
													Selanjutnya
													<LuChevronRight className="w-4 h-4" />
												</button>
											</div>

											{/* Step list sidebar */}
											<div className="mt-4 pt-4 border-t border-gray-200/30 dark:border-white/[0.04]">
												<div className="flex flex-wrap gap-1.5">
													{guide.slides.map((s, sIdx) => (
														<button
															key={s.id}
															onClick={() => setSlide(guide.id, sIdx)}
															className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
																sIdx === currentSlideIdx
																	? "bg-red-500 text-white"
																	: "bg-gray-100/50 dark:bg-white/[0.04] text-gray-500 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-white/[0.06]"
															}`}
														>
															{sIdx + 1}. {s.title}
														</button>
													))}
												</div>
											</div>
										</div>
									</div>
								)}

								{isOpen && totalSlides === 0 && (
									<div className="border-t border-gray-200/30 dark:border-white/[0.04] p-8 text-center">
										<p className="text-xs text-gray-400 dark:text-gray-600">Panduan ini belum memiliki langkah-langkah.</p>
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}

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
};

export default Panduan;
