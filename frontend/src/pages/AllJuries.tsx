import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import {
	MagnifyingGlassIcon,
	ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import { api } from "../utils/api";

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

	if (loading) {
		return (
			<div className="min-h-screen">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
					<div className="animate-pulse space-y-6">
						<div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
						<div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
						<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
							{[...Array(8)].map((_, i) => (
								<div
									key={i}
									className="h-48 bg-gray-200 dark:bg-gray-700 rounded-2xl"
								></div>
							))}
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
				{/* Header */}
				<div className="mb-8">
					<Link
						to="/"
						className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors mb-4"
					>
						<ArrowLeftIcon className="w-4 h-4" />
						Kembali ke Beranda
					</Link>
					<h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
						Semua Juri Simpaskor
					</h1>
					<p className="text-gray-600 dark:text-gray-400 mt-2">
						Daftar lengkap juri profesional yang tergabung dalam platform
						Simpaskor
					</p>
				</div>

				{/* Active/Inactive Tabs */}
				<div className="flex gap-2 mb-6">
					<button
						onClick={() => {
							setActiveTab("ACTIVE");
							setSelectedLetter(null);
						}}
						className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
							activeTab === "ACTIVE"
								? "bg-green-600 text-white shadow-lg shadow-green-600/25"
								: "bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm text-gray-600 dark:text-gray-400 border border-gray-200/60 dark:border-gray-700/40 hover:bg-gray-50 dark:hover:bg-gray-700"
						}`}
					>
						Aktif ({activeCount})
					</button>
					<button
						onClick={() => {
							setActiveTab("INACTIVE");
							setSelectedLetter(null);
						}}
						className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
							activeTab === "INACTIVE"
								? "bg-gray-600 text-white shadow-lg shadow-gray-600/25"
								: "bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm text-gray-600 dark:text-gray-400 border border-gray-200/60 dark:border-gray-700/40 hover:bg-gray-50 dark:hover:bg-gray-700"
						}`}
					>
						Non-Aktif ({inactiveCount})
					</button>
				</div>

				{/* Search */}
				<div className="relative mb-6">
					<MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
					<input
						type="text"
						placeholder="Cari juri berdasarkan nama, institusi, atau kota..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full pl-12 pr-4 py-3 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/60 dark:border-gray-700/40 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent transition-all"
					/>
				</div>

				{/* Alphabet Tabs */}
				<div className="flex flex-wrap gap-1.5 mb-8">
					<button
						onClick={() => setSelectedLetter(null)}
						className={`w-9 h-9 rounded-lg font-medium text-sm transition-all ${
							selectedLetter === null
								? "bg-red-600 text-white shadow-md"
								: "bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm text-gray-600 dark:text-gray-400 border border-gray-200/60 dark:border-gray-700/40 hover:bg-red-50 dark:hover:bg-gray-700"
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
								className={`w-9 h-9 rounded-lg font-medium text-sm transition-all ${
									selectedLetter === letter
										? "bg-red-600 text-white shadow-md"
										: hasJuries
										? "bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm text-gray-600 dark:text-gray-400 border border-gray-200/60 dark:border-gray-700/40 hover:bg-red-50 dark:hover:bg-gray-700"
										: "bg-gray-100 dark:bg-gray-800/50 text-gray-300 dark:text-gray-600 cursor-not-allowed"
								}`}
							>
								{letter}
							</button>
						);
					})}
				</div>

				{/* Results Count */}
				<div className="mb-6">
					<p className="text-sm text-gray-500 dark:text-gray-400">
						Menampilkan{" "}
						<span className="font-semibold text-gray-900 dark:text-white">
							{filteredJuries.length}
						</span>{" "}
						juri
						{selectedLetter && (
							<>
								{" "}
								dengan huruf{" "}
								<span className="font-semibold text-red-600 dark:text-red-400">
									{selectedLetter}
								</span>
							</>
						)}
					</p>
				</div>

				{/* Juries Grid */}
				{filteredJuries.length === 0 ? (
					<div className="text-center py-16">
						<div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
							<MagnifyingGlassIcon className="w-8 h-8 text-gray-400 dark:text-gray-600" />
						</div>
						<p className="text-gray-500 dark:text-gray-400 text-lg">
							Tidak ada juri ditemukan
						</p>
						<p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
							Coba ubah filter atau kata kunci pencarian
						</p>
					</div>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
						{filteredJuries.map((juri) => (
							<div
								key={juri.id}
								className="group relative bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/40 p-6 hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50 hover:border-red-200 dark:hover:border-red-800 transition-all duration-300"
							>
								{/* Pin Indicator */}
								{juri.isPinned && (
									<div className="absolute top-3 right-3">
										<StarIconSolid
											className="w-5 h-5 text-amber-500"
											title="Juri Unggulan"
										/>
									</div>
								)}

								{/* Avatar */}
								<div className="flex justify-center mb-4">
									{juri.avatar ? (
										<img
											src={juri.avatar}
											alt={juri.name}
											className="w-20 h-20 rounded-full object-cover border-3 border-gray-200/60 dark:border-gray-700/40 group-hover:border-red-200 dark:group-hover:border-red-800 transition-colors"
										/>
									) : (
										<div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center border-3 border-gray-200/60 dark:border-gray-700/40 group-hover:border-red-200 dark:group-hover:border-red-800 transition-colors">
											<span className="text-white font-bold text-xl">
												{getInitials(juri.name)}
											</span>
										</div>
									)}
								</div>

								{/* Name */}
								<h3 className="text-center font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">
									{juri.name}
								</h3>

								{/* Institution */}
								{juri.institution && (
									<p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-1 line-clamp-1">
										{juri.institution}
									</p>
								)}

								{/* City */}
								{juri.city && (
									<p className="text-center text-xs text-gray-400 dark:text-gray-500 line-clamp-1">
										{juri.city}
									</p>
								)}

								{/* Bio */}
								{juri.bio && (
									<p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2 line-clamp-2">
										{juri.bio}
									</p>
								)}
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

export default AllJuries;
