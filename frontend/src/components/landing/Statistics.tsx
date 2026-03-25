import React, { useMemo } from "react";

interface Event {
	id: string;
	status: string;
	startDate: string;
	endDate: string;
	registrationDeadline: string | null;
}

interface StatisticsProps {
	events: Event[];
}

const Statistics: React.FC<StatisticsProps> = ({ events }) => {
	// Calculate statistics from ALL events using computed status from backend
	const statistics = useMemo(() => {
		// Count events with PUBLISHED status (registration open)
		const openRegistration = events.filter((event) => {
			return event.status === "PUBLISHED";
		}).length;

		// Count completed events (status is COMPLETED)
		const finishedEvents = events.filter((event) => {
			return event.status === "COMPLETED";
		}).length;

		// Count ongoing events
		const ongoingEvents = events.filter((event) => {
			return event.status === "ONGOING";
		}).length;

		return {
			total: events.length,
			openRegistration,
			ongoing: ongoingEvents,
			finished: finishedEvents,
		};
	}, [events]);

	return (
		<section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
			{/* Trust Building Section */}
			<div className="text-center mb-8">
				<h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-3">
					Event Paskibra Terpercaya
				</h2>
				<p className="text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
					Platform resmi untuk kompetisi dan pelatihan Paskibra se-Indonesia.
					<br className="hidden sm:block" />
					Didukung oleh{" "}
					<span className="font-semibold text-red-600 dark:text-red-400">
						ratusan sekolah
					</span>{" "}
					dan{" "}
					<span className="font-semibold text-red-600 dark:text-red-400">
						ribuan peserta
					</span>{" "}
					dari seluruh nusantara.
				</p>
			</div>

			{/* Statistics Cards - Minimalist Design */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
				{/* Total Event */}
				<div className="group relative overflow-hidden bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-800 transition-all duration-300 hover:shadow-lg hover:shadow-red-100 dark:hover:shadow-red-900/20">
					{/* Subtle gradient accent */}
					<div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-red-500/5 to-transparent rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>

					<div className="relative flex items-center justify-between">
						<div className="flex-1">
							<div className="flex items-center gap-2 mb-1">
								<div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
								<p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									Total Event
								</p>
							</div>
							<div className="flex items-baseline gap-2">
								<p className="text-4xl font-bold bg-gradient-to-br from-red-600 to-red-400 dark:from-red-400 dark:to-red-300 bg-clip-text text-transparent">
									{statistics.total}
								</p>
								<span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
									events
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
									d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
								/>
							</svg>
						</div>
					</div>
				</div>

				{/* Pendaftaran Dibuka */}
				<div className="group relative overflow-hidden bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:border-green-200 dark:hover:border-green-800 transition-all duration-300 hover:shadow-lg hover:shadow-green-100 dark:hover:shadow-green-900/20">
					{/* Subtle gradient accent */}
					<div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-500/5 to-transparent rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>

					<div className="relative flex items-center justify-between">
						<div className="flex-1">
							<div className="flex items-center gap-2 mb-1">
								<div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
								<p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									Dibuka
								</p>
							</div>
							<div className="flex items-baseline gap-2">
								<p className="text-4xl font-bold bg-gradient-to-br from-green-600 to-green-400 dark:from-green-400 dark:to-green-300 bg-clip-text text-transparent">
									{statistics.openRegistration}
								</p>
								<span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
									open
								</span>
							</div>
						</div>
						<div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
							<svg
								className="w-5 h-5 text-green-500 dark:text-green-400"
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

				{/* Event Selesai */}
				<div className="group relative overflow-hidden bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-300 hover:shadow-lg hover:shadow-gray-100 dark:hover:shadow-gray-900/20">
					{/* Subtle gradient accent */}
					<div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-gray-500/5 to-transparent rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>

					<div className="relative flex items-center justify-between">
						<div className="flex-1">
							<div className="flex items-center gap-2 mb-1">
								<div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
								<p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									Selesai
								</p>
							</div>
							<div className="flex items-baseline gap-2">
								<p className="text-4xl font-bold bg-gradient-to-br from-gray-600 to-gray-400 dark:from-gray-400 dark:to-gray-300 bg-clip-text text-transparent">
									{statistics.finished}
								</p>
								<span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
									done
								</span>
							</div>
						</div>
						<div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
							<svg
								className="w-5 h-5 text-gray-500 dark:text-gray-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M5 13l4 4L19 7"
								/>
							</svg>
						</div>
					</div>
				</div>
			</div>

			{/* Trust Indicators */}
			<div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
				<div className="flex items-center gap-2">
					<svg
						className="w-5 h-5 text-red-500"
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path
							fillRule="evenodd"
							d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
							clipRule="evenodd"
						/>
					</svg>
					<span className="font-medium">Terverifikasi Resmi</span>
				</div>
				<div className="flex items-center gap-2">
					<svg
						className="w-5 h-5 text-red-500"
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
					</svg>
					<span className="font-medium">1000+ Peserta Aktif</span>
				</div>
				<div className="flex items-center gap-2">
					<svg
						className="w-5 h-5 text-red-500"
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path
							fillRule="evenodd"
							d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
							clipRule="evenodd"
						/>
					</svg>
					<span className="font-medium">Rating 4.8/5</span>
				</div>
				<div className="flex items-center gap-2">
					<svg
						className="w-5 h-5 text-red-500"
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path
							fillRule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
							clipRule="evenodd"
						/>
					</svg>
					<span className="font-medium">Support 24/7</span>
				</div>
			</div>
		</section>
	);
};

export default Statistics;
