import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { LuArrowLeft, LuTrophy, LuSearch } from "react-icons/lu";
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

const KlasemenPage: React.FC = () => {
	const [data, setData] = useState<KlasemenResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
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

	const filtered = data?.full.filter((e) =>
		e.schoolName.toLowerCase().includes(search.toLowerCase())
	) || [];

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
					<div className="space-y-2">
						{/* Header row */}
						<div className="flex items-center gap-3 px-3 py-2 text-[10px] md:text-xs font-medium tracking-wider text-gray-400 dark:text-gray-500 uppercase">
							<div className="w-9 md:w-10 text-center">#</div>
							<div className="w-9 md:w-10" />
							<div className="flex-1">Sekolah</div>
							<div className="w-16 text-center">Event</div>
							<div className="w-16 text-center">Poin</div>
						</div>

						{filtered.map((entry, i) => {
							const isTop3 = i < 3;
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
											className={`flex-shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-lg bg-gradient-to-br ${rankColors[i]} flex items-center justify-center shadow-sm`}
										>
											<span className="text-white font-bold text-sm">{i + 1}</span>
										</div>
									) : (
										<div className="flex-shrink-0 w-9 h-9 md:w-10 md:h-10 flex items-center justify-center">
											<span className="text-sm font-semibold text-gray-400 dark:text-gray-500">
												{i + 1}
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
				)}
			</div>
		</div>
	);
};

export default KlasemenPage;
