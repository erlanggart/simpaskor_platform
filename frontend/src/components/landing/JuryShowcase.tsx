import React from "react";
import { Link } from "react-router-dom";

interface Juri {
	id: string;
	name: string;
	avatar: string | null;
	institution: string | null;
}

interface Stats {
	juriCount: number;
	pesertaCount: number;
	eventsCount: number;
	availableEventsCount: number;
	completedEventsCount: number;
}

interface JuryShowcaseProps {
	juries: Juri[];
	stats: Stats;
	loading?: boolean;
}

const JuryShowcase: React.FC<JuryShowcaseProps> = ({
	juries,
	stats,
	loading = false,
}) => {
	// Get initials from name
	const getInitials = (name: string) => {
		return name
			.split(" ")
			.map((word) => word[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	};

	if (loading) {
		return (
			<section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
				<div className="animate-pulse">
					<div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mx-auto mb-4"></div>
					<div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto mb-8"></div>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						{[1, 2, 3, 4].map((i) => (
							<div
								key={i}
								className="h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl"
							></div>
						))}
					</div>
				</div>
			</section>
		);
	}

	return (
		<section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
			{/* Section Header */}
			<div className="text-center mb-10">
				<h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-3">
					Tim Juri & Statistik
				</h2>
				<p className="text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
					Didukung oleh juri profesional dan ribuan peserta dari seluruh
					Indonesia
				</p>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
				{/* Juri Count */}
				<div className="group relative overflow-hidden bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-800 transition-all duration-300 hover:shadow-lg hover:shadow-red-100 dark:hover:shadow-red-900/20">
					<div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-red-500/5 to-transparent rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
					<div className="relative flex items-center justify-between">
						<div className="flex-1">
							<div className="flex items-center gap-2 mb-1">
								<div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
								<p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									Total Juri
								</p>
							</div>
							<div className="flex items-baseline gap-2">
								<p className="text-4xl font-bold bg-gradient-to-br from-red-600 to-red-400 dark:from-red-400 dark:to-red-300 bg-clip-text text-transparent">
									{stats.juriCount}
								</p>
								<span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
									profesional
								</span>
							</div>
						</div>
						<div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
							<svg
								className="w-5 h-5 text-red-500 dark:text-red-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
								/>
							</svg>
						</div>
					</div>
				</div>

				{/* Peserta Count */}
				<div className="group relative overflow-hidden bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-100 dark:hover:shadow-emerald-900/20">
					<div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
					<div className="relative flex items-center justify-between">
						<div className="flex-1">
							<div className="flex items-center gap-2 mb-1">
								<div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
								<p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									Total Peserta
								</p>
							</div>
							<div className="flex items-baseline gap-2">
								<p className="text-4xl font-bold bg-gradient-to-br from-emerald-600 to-emerald-400 dark:from-emerald-400 dark:to-emerald-300 bg-clip-text text-transparent">
									{stats.pesertaCount}
								</p>
								<span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
									terdaftar
								</span>
							</div>
						</div>
						<div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
							<svg
								className="w-5 h-5 text-emerald-500 dark:text-emerald-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
								/>
							</svg>
						</div>
					</div>
				</div>

				{/* Available Events Count */}
				<div className="group relative overflow-hidden bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:border-amber-200 dark:hover:border-amber-800 transition-all duration-300 hover:shadow-lg hover:shadow-amber-100 dark:hover:shadow-amber-900/20">
					<div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/5 to-transparent rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
					<div className="relative flex items-center justify-between">
						<div className="flex-1">
							<div className="flex items-center gap-2 mb-1">
								<div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
								<p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									Event Tersedia
								</p>
							</div>
							<div className="flex items-baseline gap-2">
								<p className="text-4xl font-bold bg-gradient-to-br from-amber-600 to-amber-400 dark:from-amber-400 dark:to-amber-300 bg-clip-text text-transparent">
									{stats.availableEventsCount || 0}
								</p>
								<span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
									kompetisi
								</span>
							</div>
						</div>
						<div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
							<svg
								className="w-5 h-5 text-amber-500 dark:text-amber-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
								/>
							</svg>
						</div>
					</div>
				</div>

				{/* Completed Events Count */}
				<div className="group relative overflow-hidden bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-800 transition-all duration-300 hover:shadow-lg hover:shadow-purple-100 dark:hover:shadow-purple-900/20">
					<div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/5 to-transparent rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
					<div className="relative flex items-center justify-between">
						<div className="flex-1">
							<div className="flex items-center gap-2 mb-1">
								<div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></div>
								<p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									Event Selesai
								</p>
							</div>
							<div className="flex items-baseline gap-2">
								<p className="text-4xl font-bold bg-gradient-to-br from-purple-600 to-purple-400 dark:from-purple-400 dark:to-purple-300 bg-clip-text text-transparent">
									{stats.completedEventsCount || 0}
								</p>
								<span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
									kompetisi
								</span>
							</div>
						</div>
						<div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
							<svg
								className="w-5 h-5 text-purple-500 dark:text-purple-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</div>
					</div>
				</div>
			</div>

			{/* Juri List */}
			{juries.length > 0 && (
				<div>
					<h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
						Daftar Juri Simpaskor
					</h3>
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
						{juries.map((juri) => (
							<div
								key={juri.id}
								className="group flex flex-col items-center p-4 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-800 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
							>
								{/* Avatar */}
								<div className="relative mb-3">
									{juri.avatar ? (
										<img
											src={juri.avatar}
											alt={juri.name}
											className="w-16 h-16 rounded-full object-cover ring-2 ring-red-100 dark:ring-red-900 group-hover:ring-red-300 dark:group-hover:ring-red-700 transition-all duration-300"
										/>
									) : (
										<div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center ring-2 ring-red-100 dark:ring-red-900 group-hover:ring-red-300 dark:group-hover:ring-red-700 transition-all duration-300">
											<span className="text-white font-semibold text-lg">
												{getInitials(juri.name)}
											</span>
										</div>
									)}
									{/* Verified badge */}
									<div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-800">
										<svg
											className="w-3 h-3 text-white"
											fill="currentColor"
											viewBox="0 0 20 20"
										>
											<path
												fillRule="evenodd"
												d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
												clipRule="evenodd"
											/>
										</svg>
									</div>
								</div>
								{/* Name */}
								<h4 className="text-sm font-medium text-gray-900 dark:text-white text-center line-clamp-2">
									{juri.name}
								</h4>
								{/* Institution */}
								{juri.institution && (
									<p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1 line-clamp-1">
										{juri.institution}
									</p>
								)}
							</div>
						))}
					</div>

					{/* View All Link */}
					<div className="text-center mt-8">
						<Link
							to="/juries"
							className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 transition-all duration-300"
						>
							Lihat Semua Juri
							<svg
								className="w-4 h-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M13 7l5 5m0 0l-5 5m5-5H6"
								/>
							</svg>
						</Link>
					</div>
				</div>
			)}

			{/* Empty State if no juries */}
			{juries.length === 0 && (
				<div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
					<svg
						className="w-12 h-12 mx-auto text-gray-400 mb-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={1.5}
							d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
					<p className="text-gray-500 dark:text-gray-400">
						Belum ada juri terdaftar
					</p>
				</div>
			)}
		</section>
	);
};

export default JuryShowcase;
