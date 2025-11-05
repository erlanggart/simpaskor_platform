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
}

const EventGrid: React.FC<EventGridProps> = ({ events }) => {
	const [currentPage, setCurrentPage] = useState(1);
	const eventsPerPage = 9;

	// Pagination calculations
	const totalPages = Math.ceil(events.length / eventsPerPage);
	const startIndex = (currentPage - 1) * eventsPerPage;
	const endIndex = startIndex + eventsPerPage;
	const currentEvents = events.slice(startIndex, endIndex);

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	return (
		<section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
			<div className="flex justify-between items-center mb-8">
				<div>
					<h2 className="text-3xl font-bold text-gray-900 dark:text-white">
						Event Tersedia
					</h2>
					<p className="text-gray-600 dark:text-gray-400 mt-2">
						Menampilkan {startIndex + 1}-{Math.min(endIndex, events.length)}{" "}
						dari {events.length} event
					</p>
				</div>
			</div>

			{events.length === 0 ? (
				<div className="text-center py-16">
					<p className="text-gray-500 dark:text-gray-400 text-lg">
						Tidak ada event yang sesuai dengan pencarian Anda.
					</p>
				</div>
			) : (
				<>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{currentEvents.map((event) => (
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
