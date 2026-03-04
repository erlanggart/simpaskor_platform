import React, { useState } from "react";
import EventCard from "./EventCard";

interface SchoolCategoryLimit {
	id: string;
	maxParticipants: number;
	schoolCategory: {
		id: string;
		name: string;
	};
}

interface Event {
	id: string;
	title: string;
	slug: string | null;
	description: string | null;
	thumbnail: string | null;
	category: string | null;
	level: string | null;
	startDate: string;
	endDate: string;
	registrationDeadline: string | null;
	location: string | null;
	venue: string | null;
	maxParticipants: number | null;
	currentParticipants: number;
	registrationFee: number | null;
	organizer: string | null;
	status: string;
	featured: boolean;
	schoolCategoryLimits?: SchoolCategoryLimit[];
}

interface EventGridProps {
	events: Event[];
	completedEvents?: Event[];
}

type TabType = "available" | "completed";

const EventGrid: React.FC<EventGridProps> = ({ events, completedEvents = [] }) => {
	const [activeTab, setActiveTab] = useState<TabType>("available");
	const [currentPage, setCurrentPage] = useState(1);
	const eventsPerPage = 9;

	// Get current events based on active tab
	const currentTabEvents = activeTab === "available" ? events : completedEvents;

	// Pagination calculations
	const totalPages = Math.ceil(currentTabEvents.length / eventsPerPage);
	const startIndex = (currentPage - 1) * eventsPerPage;
	const endIndex = startIndex + eventsPerPage;
	const paginatedEvents = currentTabEvents.slice(startIndex, endIndex);

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const handleTabChange = (tab: TabType) => {
		setActiveTab(tab);
		setCurrentPage(1); // Reset to first page when switching tabs
	};

	const tabs = [
		{
			id: "available" as TabType,
			label: "Event Tersedia",
			count: events.length,
			icon: (
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
				</svg>
			),
		},
		{
			id: "completed" as TabType,
			label: "Event Selesai",
			count: completedEvents.length,
			icon: (
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			),
		},
	];

	return (
		<section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
			{/* Tab Navigation */}
			<div className="mb-8">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<h2 className="text-3xl font-bold text-gray-900 dark:text-white">
						Daftar Event
					</h2>
					<div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
						{tabs.map((tab) => (
							<button
								key={tab.id}
								onClick={() => handleTabChange(tab.id)}
								className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
									activeTab === tab.id
										? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
										: "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
								}`}
							>
								{tab.icon}
								<span className="hidden sm:inline">{tab.label}</span>
								<span className={`px-2 py-0.5 rounded-full text-xs ${
									activeTab === tab.id
										? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
										: "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
								}`}>
									{tab.count}
								</span>
							</button>
						))}
					</div>
				</div>
				<p className="text-gray-600 dark:text-gray-400 mt-2">
					{currentTabEvents.length > 0 ? (
						<>
							Menampilkan {startIndex + 1}-{Math.min(endIndex, currentTabEvents.length)}{" "}
							dari {currentTabEvents.length} event
						</>
					) : (
						activeTab === "available" 
							? "Tidak ada event yang tersedia saat ini" 
							: "Belum ada event yang selesai"
					)}
				</p>
			</div>

			{currentTabEvents.length === 0 ? (
				<div className="text-center py-16">
					<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
						<svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
						</svg>
					</div>
					<p className="text-gray-500 dark:text-gray-400 text-lg">
						{activeTab === "available" 
							? "Tidak ada event yang tersedia saat ini." 
							: "Belum ada event yang telah selesai."}
					</p>
				</div>
			) : (
				<>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{paginatedEvents.map((event) => (
							<EventCard key={event.id} event={event} />
						))}
					</div>

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex justify-center items-center gap-2 mt-12">
							<button
								onClick={() => handlePageChange(currentPage - 1)}
								disabled={currentPage === 1}
								className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								<svg
									className="w-5 h-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M15 19l-7-7 7-7"
									/>
								</svg>
							</button>

							{Array.from({ length: totalPages }, (_, i) => i + 1).map(
								(page) => {
									// Show first, last, current, and adjacent pages
									if (
										page === 1 ||
										page === totalPages ||
										(page >= currentPage - 1 && page <= currentPage + 1)
									) {
										return (
											<button
												key={page}
												onClick={() => handlePageChange(page)}
												className={`px-4 py-2 rounded-lg border transition-colors ${
													page === currentPage
														? "bg-blue-600 dark:bg-indigo-600 text-white border-blue-600 dark:border-indigo-600"
														: "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
												}`}
											>
												{page}
											</button>
										);
									} else if (
										page === currentPage - 2 ||
										page === currentPage + 2
									) {
										return (
											<span
												key={page}
												className="px-2 text-gray-500 dark:text-gray-400"
											>
												...
											</span>
										);
									}
									return null;
								}
							)}

							<button
								onClick={() => handlePageChange(currentPage + 1)}
								disabled={currentPage === totalPages}
								className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								<svg
									className="w-5 h-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9 5l7 7-7 7"
									/>
								</svg>
							</button>
						</div>
					)}
				</>
			)}
		</section>
	);
};

export default EventGrid;
