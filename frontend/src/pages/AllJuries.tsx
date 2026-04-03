import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import {
	MagnifyingGlassIcon,
	ArrowLeftIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { api } from "../utils/api";
import JuriDetailModal from "../components/landing/JuriDetailModal";

interface Juri {
	id: string;
	name: string;
	status: string;
	isPinned: boolean;
	avatar: string | null;
	institution: string | null;
	city: string | null;
	bio: string | null;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const AllJuries: React.FC = () => {
	const [juries, setJuries] = useState<Juri[]>([]);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
	const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [selectedJuriId, setSelectedJuriId] = useState<string | null>(null);
	const ITEMS_PER_PAGE = 20;

	useEffect(() => {
		const fetchJuries = async () => {
			try {
				setLoading(true);
				const response = await api.get("/users/public/juries");
				setJuries(response.data.juries);
			} catch (error) {
				console.error("Error fetching juries:", error);
			} finally {
				setLoading(false);
			}
		};
		fetchJuries();
	}, []);

	const filteredJuries = useMemo(() => {
		return juries.filter((juri) => {
			const matchesStatus =
				activeTab === "ACTIVE"
					? juri.status === "ACTIVE"
					: juri.status !== "ACTIVE";
			const matchesLetter = selectedLetter
				? juri.name.charAt(0).toUpperCase() === selectedLetter
				: true;
			const matchesSearch = searchTerm
				? juri.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				  juri.institution?.toLowerCase().includes(searchTerm.toLowerCase()) ||
				  juri.city?.toLowerCase().includes(searchTerm.toLowerCase())
				: true;
			return matchesStatus && matchesLetter && matchesSearch;
		});
	}, [juries, activeTab, selectedLetter, searchTerm]);

	const activeCount = useMemo(
		() => juries.filter((j) => j.status === "ACTIVE").length,
		[juries]
	);
	const inactiveCount = useMemo(
		() => juries.filter((j) => j.status !== "ACTIVE").length,
		[juries]
	);

	// Get available letters in current tab
	const availableLetters = useMemo(() => {
		const tabJuries = juries.filter((j) =>
			activeTab === "ACTIVE" ? j.status === "ACTIVE" : j.status !== "ACTIVE"
		);
		return new Set(tabJuries.map((j) => j.name.charAt(0).toUpperCase()));
	}, [juries, activeTab]);

	const getInitials = (name: string) =>
		name
			.split(" ")
			.map((w) => w[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);

	const getAvatarUrl = (avatar: string | null): string | null => {
		if (!avatar) return null;
		if (avatar.startsWith("http://") || avatar.startsWith("https://")) return avatar;
		return avatar;
	};

	// Pagination
	const totalPages = Math.ceil(filteredJuries.length / ITEMS_PER_PAGE);
	const paginatedJuries = useMemo(() => {
		const start = (currentPage - 1) * ITEMS_PER_PAGE;
		return filteredJuries.slice(start, start + ITEMS_PER_PAGE);
	}, [filteredJuries, currentPage, ITEMS_PER_PAGE]);

	// Reset page when filters change
	useEffect(() => {
		setCurrentPage(1);
	}, [activeTab, selectedLetter, searchTerm]);

	if (loading) {
		return (
			<div className="min-h-screen">
				<div className="max-w-6xl mx-auto px-6 md:px-12 lg:px-16 py-12">
					<div className="animate-pulse space-y-6">
						<div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
						<div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
							{[...Array(10)].map((_, i) => (
								<div
									key={i}
									className="rounded-xl bg-gray-200/50 dark:bg-white/[0.03] border border-gray-200/30 dark:border-white/[0.04] animate-pulse"
								>
									<div className="aspect-[2/3]" />
									<div className="p-2 space-y-1.5">
										<div className="h-2.5 bg-gray-300/50 dark:bg-white/[0.06] rounded w-3/4" />
										<div className="h-2 bg-gray-300/50 dark:bg-white/[0.06] rounded w-1/2" />
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen">
			<div className="max-w-6xl mx-auto px-6 md:px-12 lg:px-16 py-8 md:py-12">
				{/* Header - EventSection style */}
				<div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4 lg:mb-6">
					<div>
						<Link
							to="/"
							className="inline-flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors mb-4"
						>
							<ArrowLeftIcon className="w-3.5 h-3.5" />
							Kembali ke Beranda
						</Link>
						<p className="text-[10px] md:text-xs tracking-[0.3em] text-gray-400 dark:text-gray-400 font-medium mb-3">
							DEWAN JURI PROFESIONAL
						</p>
						<h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-none mb-2 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 bg-clip-text text-transparent">
							JURI
						</h1>
						<div className="flex items-center gap-4">
							<div className="w-10 h-[1px] bg-gradient-to-r from-red-500/50 to-transparent" />
							<p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium tracking-wide">
								Tim Penilai Paskibra Se-Indonesia
							</p>
						</div>
					</div>
				</div>

				{/* Filters Row */}
				<div className="flex flex-col sm:flex-row gap-3 mb-4">
					{/* Active/Inactive Tabs */}
					<div className="flex gap-1.5">
						<button
							onClick={() => {
								setActiveTab("ACTIVE");
								setSelectedLetter(null);
							}}
							className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
								activeTab === "ACTIVE"
									? "bg-green-500/80 text-white"
									: "bg-gray-900/[0.06] dark:bg-white/[0.06] border border-gray-300/50 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-900/[0.12] dark:hover:bg-white/[0.12]"
							}`}
						>
							Aktif ({activeCount})
						</button>
						<button
							onClick={() => {
								setActiveTab("INACTIVE");
								setSelectedLetter(null);
							}}
							className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
								activeTab === "INACTIVE"
									? "bg-gray-500/80 text-white"
									: "bg-gray-900/[0.06] dark:bg-white/[0.06] border border-gray-300/50 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-900/[0.12] dark:hover:bg-white/[0.12]"
							}`}
						>
							Non-Aktif ({inactiveCount})
						</button>
					</div>

					{/* Search */}
					<div className="relative flex-1 max-w-sm">
						<MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
						<input
							type="text"
							placeholder="Cari juri..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-9 pr-3 py-2 bg-gray-900/[0.04] dark:bg-white/[0.04] border border-gray-200/50 dark:border-white/[0.06] rounded-full text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-1 focus:ring-red-500/50 focus:border-red-500/30 transition-all"
						/>
					</div>
				</div>

				{/* Alphabet Filter */}
				<div className="flex flex-wrap gap-1 mb-5">
					<button
						onClick={() => setSelectedLetter(null)}
						className={`w-7 h-7 rounded-md font-medium text-[10px] transition-all ${
							selectedLetter === null
								? "bg-red-500/80 text-white"
								: "bg-gray-900/[0.06] dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 hover:bg-gray-900/[0.12] dark:hover:bg-white/[0.12]"
						}`}
					>
						All
					</button>
					{ALPHABET.map((letter) => {
						const hasJuries = availableLetters.has(letter);
						return (
							<button
								key={letter}
								onClick={() => hasJuries && setSelectedLetter(letter)}
								disabled={!hasJuries}
								className={`w-7 h-7 rounded-md font-medium text-[10px] transition-all ${
									selectedLetter === letter
										? "bg-red-500/80 text-white"
										: hasJuries
										? "bg-gray-900/[0.06] dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 hover:bg-gray-900/[0.12] dark:hover:bg-white/[0.12]"
										: "bg-gray-100/50 dark:bg-white/[0.02] text-gray-300 dark:text-gray-700 cursor-not-allowed"
								}`}
							>
								{letter}
							</button>
						);
					})}
				</div>

				{/* Results info */}
				<p className="text-[10px] text-gray-400 dark:text-gray-500 mb-4">
					Menampilkan{" "}
					<span className="font-semibold text-gray-600 dark:text-gray-300">
						{filteredJuries.length}
					</span>{" "}
					juri · Halaman {currentPage}/{totalPages || 1}
					{selectedLetter && (
						<>
							{" "}· huruf{" "}
							<span className="font-semibold text-red-500">{selectedLetter}</span>
						</>
					)}
				</p>

				{/* Juries Grid - LandingEventGrid style */}
				{filteredJuries.length === 0 ? (
					<div className="text-center text-gray-400 dark:text-gray-500 py-12 text-sm">
						Tidak ada juri ditemukan
					</div>
				) : (
					<>
						<div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
							{paginatedJuries.map((juri) => (
								<div
									key={juri.id}
									onClick={() => setSelectedJuriId(juri.id)}
									className="group relative rounded-xl overflow-hidden bg-gray-100/50 dark:bg-white/[0.03] border border-gray-200/50 dark:border-white/[0.06] hover:border-red-400/30 dark:hover:border-red-500/20 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
								>
									{/* Poster - 2:3 ratio */}
									<div className="relative aspect-[2/3] w-full bg-gradient-to-br from-red-900/10 to-red-800/5 overflow-hidden">
										{juri.avatar ? (
											<img
												src={getAvatarUrl(juri.avatar) || ""}
												alt={juri.name}
												className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
												loading="lazy"
											/>
										) : (
											<div className="w-full h-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
												<span className="text-white/30 font-black text-4xl select-none">
													{getInitials(juri.name)}
												</span>
											</div>
										)}
										{/* Status badge */}
										<div className="absolute top-1.5 left-1.5">
											<span
												className={`text-[7px] font-semibold px-1.5 py-0.5 rounded-full backdrop-blur-sm ${
													juri.status === "ACTIVE"
														? "bg-green-500/80 text-white"
														: "bg-gray-500/80 text-white"
												}`}
											>
												{juri.status === "ACTIVE" ? "Aktif" : "Non-Aktif"}
											</span>
										</div>
										{/* Pinned badge */}
										{juri.isPinned && (
											<div className="absolute top-1.5 right-1.5">
												<span className="text-[7px] font-semibold px-1.5 py-0.5 rounded-full backdrop-blur-sm bg-red-500/80 text-white flex items-center gap-0.5">
													<StarIconSolid className="w-2.5 h-2.5" />
													Unggulan
												</span>
											</div>
										)}
									</div>

									{/* Info */}
									<div className="p-1.5 lg:p-2">
										<h4 className="text-[9px] lg:text-[10px] font-semibold text-gray-800 dark:text-white leading-tight line-clamp-2 mb-1">
											{juri.name}
										</h4>
										{juri.institution && (
											<p className="text-[7px] lg:text-[8px] text-gray-400 dark:text-gray-500 line-clamp-1">
												{juri.institution}
											</p>
										)}
										{juri.city && (
											<p className="text-[7px] lg:text-[8px] text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">
												{juri.city}
											</p>
										)}
									</div>
								</div>
							))}
						</div>

						{/* Pagination */}
						{totalPages > 1 && (
							<div className="flex items-center justify-center gap-1.5 mt-8">
								<button
									onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
									disabled={currentPage === 1}
									className="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-gray-900/[0.06] dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 hover:bg-gray-900/[0.12] dark:hover:bg-white/[0.12] disabled:opacity-30 disabled:cursor-not-allowed"
								>
									<ChevronLeftIcon className="w-4 h-4" />
								</button>
								{Array.from({ length: totalPages }, (_, i) => i + 1)
									.filter((page) => {
										if (totalPages <= 7) return true;
										if (page === 1 || page === totalPages) return true;
										if (Math.abs(page - currentPage) <= 1) return true;
										return false;
									})
									.map((page, idx, arr) => (
										<React.Fragment key={page}>
											{idx > 0 && arr[idx - 1] !== page - 1 && (
												<span className="text-[10px] text-gray-400 dark:text-gray-600 px-1">...</span>
											)}
											<button
												onClick={() => setCurrentPage(page)}
												className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
													currentPage === page
														? "bg-red-500/80 text-white"
														: "bg-gray-900/[0.06] dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 hover:bg-gray-900/[0.12] dark:hover:bg-white/[0.12]"
												}`}
											>
												{page}
											</button>
										</React.Fragment>
									))}
								<button
									onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
									disabled={currentPage === totalPages}
									className="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-gray-900/[0.06] dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 hover:bg-gray-900/[0.12] dark:hover:bg-white/[0.12] disabled:opacity-30 disabled:cursor-not-allowed"
								>
									<ChevronRightIcon className="w-4 h-4" />
								</button>
							</div>
						)}
					</>
				)}
			</div>

			{/* Juri Detail Modal */}
			{selectedJuriId && (
				<JuriDetailModal
					juriId={selectedJuriId}
					onClose={() => setSelectedJuriId(null)}
				/>
			)}
		</div>
	);
};

export default AllJuries;
