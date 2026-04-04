import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { LuArrowLeft, LuTrophy, LuSearch, LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { api } from "../utils/api";
import type { KlasemenEntry } from "../hooks/useLandingData";

interface KlasemenResponse {
	year: number;
	top5: KlasemenEntry[];
	full: KlasemenEntry[];
	totalEvents: number;
}

const rankColors = [
	"from-yellow-400 to-amber-500",
	"from-gray-300 to-gray-400",
	"from-amber-600 to-amber-700",
];

const PER_PAGE = 10;

const KlasemenPage: React.FC = () => {
	const [data, setData] = useState<KlasemenResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const currentYear = new Date().getFullYear();

	useEffect(() => {
		const fetchKlasemen = async () => {
			try {
				const res = await api.get(`/users/public/klasemen?year=${currentYear}`);
				setData(res.data);
			} catch (err) {
				console.error("Error fetching klasemen:", err);
			} finally {
				setLoading(false);
			}
		};
		fetchKlasemen();
	}, [currentYear]);

	const filtered = useMemo(() =>
		data?.full.filter((e) =>
			e.schoolName.toLowerCase().includes(search.toLowerCase())
		) || [],
		[data, search]
	);

	const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
	const safePage = Math.min(page, totalPages);
	const paginated = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

	// Reset to page 1 on search change
	useEffect(() => { setPage(1); }, [search]);

	// Build page numbers to display
	const getPageNumbers = (): (number | "...")[] => {
		const pages: (number | "...")[] = [];
		if (totalPages <= 7) {
			for (let i = 1; i <= totalPages; i++) pages.push(i);
		} else {
			pages.push(1);
			if (safePage > 3) pages.push("...");
			const start = Math.max(2, safePage - 1);
			const end = Math.min(totalPages - 1, safePage + 1);
			for (let i = start; i <= end; i++) pages.push(i);
			if (safePage < totalPages - 2) pages.push("...");
			pages.push(totalPages);
		}
		return pages;
	};

	return (
		<div className="relative z-10 min-h-screen">
			<div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12">
				{/* Header */}
				<div className="mb-8">
					<Link
						to="/"
						className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors mb-6"
					>
						<LuArrowLeft className="w-4 h-4" />
						<span>Kembali</span>
					</Link>
					<div className="flex items-center gap-3 mb-2">
						<LuTrophy className="w-7 h-7 text-yellow-500" />
						<h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white">
							Klasemen {currentYear}
						</h1>
					</div>
					<p className="text-sm md:text-base text-gray-500 dark:text-gray-400">
						Peringkat berdasarkan perolehan Juara Utama 1 di setiap event yang
						sudah selesai.
						{data && data.totalEvents > 0 && (
							<span className="ml-1 font-medium text-gray-600 dark:text-gray-300">
								{data.totalEvents} event selesai.
							</span>
						)}
					</p>
				</div>

				{/* Search */}
				<div className="relative mb-6">
					<LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
					<input
						type="text"
						placeholder="Cari nama sekolah..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-gray-800 dark:text-white text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50 transition-all"
					/>
				</div>

				{/* Table */}
				{loading ? (
					<div className="space-y-3">
						{[...Array(10)].map((_, i) => (
							<div key={i} className="h-14 rounded-xl bg-gray-100/50 dark:bg-white/[0.03] animate-pulse" />
						))}
					</div>
				) : filtered.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
						<LuTrophy className="w-16 h-16 mb-4 opacity-20" />
						<p className="text-base font-medium">
							{search ? "Tidak ditemukan" : "Belum ada data klasemen"}
						</p>
						{!search && (
							<p className="text-sm mt-1">Klasemen akan terisi setelah event selesai</p>
						)}
					</div>
				) : (
					<>
						<div className="space-y-2">
							{/* Header row */}
							<div className="flex items-center gap-3 px-3 py-2 text-[10px] md:text-xs font-medium tracking-wider text-gray-400 dark:text-gray-500 uppercase">
								<div className="w-9 md:w-10 text-center">#</div>
								<div className="w-9 md:w-10" />
								<div className="flex-1">Sekolah</div>
								<div className="w-16 text-center">Event</div>
								<div className="w-16 text-center">Poin</div>
							</div>

							{paginated.map((entry, idx) => {
								const globalIndex = (safePage - 1) * PER_PAGE + idx;
								const isTop3 = globalIndex < 3;
								return (
									<div
										key={entry.schoolName}
										className={`flex items-center gap-3 p-3 md:p-3.5 rounded-xl border transition-all duration-200 hover:bg-gray-100/60 dark:hover:bg-white/[0.05] ${
											isTop3
												? "bg-gray-50/80 dark:bg-white/[0.03] border-gray-200/50 dark:border-white/[0.08]"
												: "bg-transparent border-gray-100/50 dark:border-white/[0.04]"
										}`}
									>
										{/* Rank */}
										{isTop3 ? (
											<div
												className={`flex-shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-lg bg-gradient-to-br ${rankColors[globalIndex]} flex items-center justify-center shadow-sm`}
											>
												<span className="text-white font-bold text-sm">{globalIndex + 1}</span>
											</div>
										) : (
											<div className="flex-shrink-0 w-9 h-9 md:w-10 md:h-10 flex items-center justify-center">
												<span className="text-sm font-semibold text-gray-400 dark:text-gray-500">
													{globalIndex + 1}
												</span>
											</div>
										)}

										{/* Logo */}
										<div className="flex-shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-lg bg-gray-100 dark:bg-white/[0.06] border border-gray-200/50 dark:border-white/[0.08] flex items-center justify-center overflow-hidden">
											{entry.avatar ? (
												<img
													src={entry.avatar}
													alt={entry.schoolName}
													className="w-full h-full object-cover"
												/>
											) : (
												<span className="text-sm font-bold text-gray-400 dark:text-gray-500">
													{entry.schoolName.charAt(0).toUpperCase()}
												</span>
											)}
										</div>

										{/* Name */}
										<div className="flex-1 min-w-0">
											<p className={`text-sm md:text-base truncate ${isTop3 ? "font-bold text-gray-900 dark:text-white" : "font-medium text-gray-700 dark:text-gray-300"}`}>
												{entry.schoolName}
											</p>
										</div>

										{/* Events played */}
										<div className="flex-shrink-0 w-16 text-center">
											<span className="text-sm text-gray-500 dark:text-gray-400">
												{entry.participated || 0}
											</span>
										</div>

										{/* Points */}
										<div className="flex-shrink-0 w-16 text-center">
											<span className={`text-base font-bold ${isTop3 ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-300"}`}>
												{entry.wins}
											</span>
										</div>
									</div>
								);
							})}
						</div>

						{/* Pagination */}
						{totalPages > 1 && (
							<div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100 dark:border-white/[0.06]">
								{/* Info */}
								<p className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
									{(safePage - 1) * PER_PAGE + 1}–{Math.min(safePage * PER_PAGE, filtered.length)} dari {filtered.length}
								</p>

								{/* Page controls */}
								<div className="flex items-center gap-1.5 mx-auto sm:mx-0">
									{/* Prev */}
									<button
										onClick={() => setPage((p) => Math.max(1, p - 1))}
										disabled={safePage <= 1}
										className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 border border-gray-200/50 dark:border-white/[0.08] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-800 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none"
									>
										<LuChevronLeft className="w-4 h-4" />
									</button>

									{/* Page numbers */}
									{getPageNumbers().map((p, i) =>
										p === "..." ? (
											<span key={`dots-${i}`} className="w-9 h-9 flex items-center justify-center text-xs text-gray-400 dark:text-gray-500">
												···
											</span>
										) : (
											<button
												key={p}
												onClick={() => setPage(p)}
												className={`w-9 h-9 rounded-lg text-sm font-medium transition-all duration-200 ${
													p === safePage
														? "bg-red-500 text-white shadow-sm shadow-red-500/25"
														: "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-800 dark:hover:text-white"
												}`}
											>
												{p}
											</button>
										)
									)}

									{/* Next */}
									<button
										onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
										disabled={safePage >= totalPages}
										className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 border border-gray-200/50 dark:border-white/[0.08] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-800 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none"
									>
										<LuChevronRight className="w-4 h-4" />
									</button>
								</div>

								{/* Mobile info */}
								<p className="text-xs text-gray-400 dark:text-gray-500 sm:hidden">
									{safePage}/{totalPages}
								</p>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
};

export default KlasemenPage;
