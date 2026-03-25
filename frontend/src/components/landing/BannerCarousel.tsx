import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	CalendarIcon,
	MapPinIcon,
} from "@heroicons/react/24/outline";
import "./BannerCarousel.css";
import { config } from "../../utils/config";

interface PinnedEvent {
	id: string;
	title: string;
	description: string | null;
	thumbnail: string | null;
	slug: string | null;
	startDate: string;
	endDate: string;
	location: string | null;
	venue: string | null;
	pinnedOrder: number | null;
}

interface BannerCarouselProps {
	events: PinnedEvent[];
}

const BannerCarousel: React.FC<BannerCarouselProps> = ({ events }) => {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isAutoPlaying, setIsAutoPlaying] = useState(true);
	const [, setTick] = useState(0); // For forcing re-render to update countdown

	// Helper function to get full image URL
	const getImageUrl = (imageUrl: string | null): string => {
		if (!imageUrl) {
			return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='500'%3E%3Crect fill='%234F46E5' width='400' height='500'/%3E%3Ctext fill='%23fff' font-size='24' font-family='Arial' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3ENo Image%3C/text%3E%3C/svg%3E";
		}
		if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
			return imageUrl;
		}
		return `${config.api.backendUrl}${imageUrl}`;
	};

	// Helper to format date
	const formatDate = (dateString: string): string => {
		const date = new Date(dateString);
		return date.toLocaleDateString("id-ID", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	};

	// Calculate countdown to event start
	const getCountdown = (startDate: string): string => {
		const now = new Date();
		const start = new Date(startDate);
		const diff = start.getTime() - now.getTime();

		if (diff < 0) {
			return "Event Berlangsung";
		}

		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

		if (days > 0) {
			return `${days} Hari Lagi`;
		} else if (hours > 0) {
			return `${hours} Jam ${minutes} Menit Lagi`;
		} else {
			return `${minutes} Menit Lagi`;
		}
	};

	// Auto-play functionality
	useEffect(() => {
		if (!isAutoPlaying || events.length <= 1) return;

		const interval = setInterval(() => {
			setCurrentIndex((prev) => (prev + 1) % events.length);
		}, 5000);

		return () => clearInterval(interval);
	}, [isAutoPlaying, events.length]);

	// Update countdown every minute
	useEffect(() => {
		const interval = setInterval(() => {
			setTick((prev) => prev + 1);
		}, 60000); // Update every minute

		return () => clearInterval(interval);
	}, []);

	const handlePrev = () => {
		setCurrentIndex((prev) => (prev - 1 + events.length) % events.length);
		setIsAutoPlaying(false);
	};

	const handleNext = () => {
		setCurrentIndex((prev) => (prev + 1) % events.length);
		setIsAutoPlaying(false);
	};

	const handleDotClick = (index: number) => {
		setCurrentIndex(index);
		setIsAutoPlaying(false);
	};

	if (events.length === 0) {
		return null;
	}

	// Calculate positions for stacked cards
	const getCardStyle = (index: number) => {
		const diff = index - currentIndex;
		const totalCards = events.length;

		// Normalize diff to handle circular array
		let normalizedDiff = diff;
		if (Math.abs(diff) > totalCards / 2) {
			normalizedDiff = diff > 0 ? diff - totalCards : diff + totalCards;
		}

		// Current card (front)
		if (normalizedDiff === 0) {
			return {
				transform: "translateX(0) scale(1) translateZ(0)",
				opacity: 1,
				zIndex: 30,
				filter: "grayscale(0) brightness(1)",
			};
		}

		// Cards on the right (back stack) - more visible stacking
		if (normalizedDiff > 0) {
			const offset = Math.min(normalizedDiff, 4);
			// Increase horizontal offset to show half of each card
			const horizontalOffset = offset * 160; // Half of card width (320px / 2)
			// Scale down more gradually
			const scale = 1 - offset * 0.05;
			// More depth with translateZ
			const depth = -offset * 80;

			return {
				transform: `translateX(${horizontalOffset}px) scale(${scale}) translateZ(${depth}px)`,
				opacity: 0.8 - offset * 0.1,
				zIndex: 30 - offset,
				filter: "grayscale(1) brightness(0.6)",
			};
		}

		// Cards on the left (previous cards stack) - mirror the right stack
		const offset = Math.min(Math.abs(normalizedDiff), 4);
		// Negative horizontal offset to show on the left
		const horizontalOffset = -offset * 160; // Half of card width to the left
		// Same scale down
		const scale = 1 - offset * 0.05;
		// Same depth
		const depth = -offset * 80;

		return {
			transform: `translateX(${horizontalOffset}px) scale(${scale}) translateZ(${depth}px)`,
			opacity: 0.8 - offset * 0.1,
			zIndex: 30 - offset,
			filter: "grayscale(1) brightness(0.5)",
		};
	};

	return (
		<section className="relative  overflow-hidden py-16 md:py-20 transition-colors">
			{/* Background decoration */}
			{/* <div className="absolute inset-0 overflow-hidden">
				<div className="absolute -top-40 -right-40 w-96 h-96 bg-red-400 dark:bg-blue-900 rounded-full mix-blend-multiply filter blur-3xl opacity-30 dark:opacity-20 animate-pulse"></div>
				<div className="absolute -bottom-40 -left-40 w-96 h-96 bg-red-400 dark:bg-red-900 rounded-full mix-blend-multiply filter blur-3xl opacity-30 dark:opacity-20 animate-pulse delay-1000"></div>
				<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-300 dark:bg-purple-950 rounded-full mix-blend-overlay filter blur-3xl opacity-20 dark:opacity-15"></div>
			</div> */}

			<div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="text-center mb-8">
					<h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-red-500">
						SIMPASKOR
					</h2>
					<p className="text-gray-600 dark:text-gray-400 mb-2">
						Sistem Paskibra Skor
					</p>
					<h2 className="text-3xl md:text-4xl font-bold text-red-600 dark:text-white mb-2">
						Semakin Maju Dunia Baris Kita !
					</h2>
				</div>

				{/* Stacked Cards Container */}
				<div className="relative h-[50vh] md:h-[50vh] flex items-center justify-center perspective-1000">
					{events.map((event, index) => {
						const style = getCardStyle(index);
						const isActive = index === currentIndex;
						const countdown = getCountdown(event.startDate);

						return (
							<div
								key={event.id}
								className="absolute transition-all duration-700 ease-out"
								style={{
									...style,
									transitionProperty: "transform, opacity, filter",
								}}
							>
								{/* Card - 4:5 Aspect Ratio (Portrait) - Full Image */}
								<div
									className={`relative rounded-2xl shadow-2xl overflow-hidden group ${
										isActive ? "cursor-pointer" : "pointer-events-none"
									}`}
									style={{
										width: "320px",
										height: "400px",
									}}
								>
									{/* Countdown Label - Always Visible on Active Card */}
									{isActive && (
										<div className="absolute top-4 left-4 z-20">
											<div className="bg-gradient-to-r from-blue-500 to-red-500 dark:from-blue-600 dark:to-red-600 text-white px-4 py-2 rounded-full shadow-lg">
												<div className="flex items-center gap-2">
													<svg
														className="w-4 h-4 animate-pulse"
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path
															fillRule="evenodd"
															d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
															clipRule="evenodd"
														/>
													</svg>
													<span className="text-sm font-bold">{countdown}</span>
												</div>
											</div>
										</div>
									)}

									{/* Full Image Poster */}
									<div className="relative w-full h-full bg-gradient-to-br from-red-500 to-purple-600">
										<img
											src={getImageUrl(event.thumbnail)}
											alt={event.title}
											className="w-full h-full object-cover"
											loading="lazy"
											onError={(e) => {
												e.currentTarget.style.display = "none";
											}}
										/>

										{/* Overlay with Info - Show on Hover (only for active card) */}
										{isActive && (
											<div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
												{/* Event Info */}
												<div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
													<h3 className="text-2xl font-bold text-white mb-3 line-clamp-2">
														{event.title}
													</h3>

													{event.description && (
														<p className="text-sm text-gray-200 mb-4 line-clamp-2">
															{event.description}
														</p>
													)}

													<div className="space-y-2 mb-4">
														<div className="flex items-center text-sm text-white">
															<CalendarIcon className="w-4 h-4 mr-2 flex-shrink-0" />
															<span>{formatDate(event.startDate)}</span>
														</div>
														{event.location && (
															<div className="flex items-center text-sm text-white">
																<MapPinIcon className="w-4 h-4 mr-2 flex-shrink-0" />
																<span className="line-clamp-1">
																	{event.location}
																</span>
															</div>
														)}
													</div>

													<Link
														to={`/events/${event.slug || event.id}`}
														className="inline-block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 dark:bg-red-600 dark:hover:bg-red-700 text-white text-center font-bold rounded-lg transition-colors shadow-lg"
													>
														Lihat Detail Event
													</Link>
												</div>
											</div>
										)}
									</div>
								</div>
							</div>
						);
					})}
				</div>

				{/* Navigation Controls */}
				{events.length > 1 && (
					<>
						{/* Arrow Buttons */}
						<div className="flex justify-center items-center gap-4 mt-8">
							<button
								onClick={handlePrev}
								className="p-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 backdrop-blur-sm text-gray-800 dark:text-gray-200 rounded-full transition-all hover:scale-110 border border-gray-300 dark:border-gray-700"
								aria-label="Previous"
							>
								<ChevronLeftIcon className="w-6 h-6" />
							</button>

							<div className="flex gap-2">
								{events.map((_, index) => (
									<button
										key={index}
										onClick={() => handleDotClick(index)}
										className={`transition-all rounded-full ${
											index === currentIndex
												? "w-8 h-3 bg-blue-600 dark:bg-red-500"
												: "w-3 h-3 bg-gray-400 dark:bg-gray-600 hover:bg-blue-400 dark:hover:bg-red-400"
										}`}
										aria-label={`Go to slide ${index + 1}`}
									/>
								))}
							</div>

							<button
								onClick={handleNext}
								className="p-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 backdrop-blur-sm text-gray-800 dark:text-gray-200 rounded-full transition-all hover:scale-110 border border-gray-300 dark:border-gray-700"
								aria-label="Next"
							>
								<ChevronRightIcon className="w-6 h-6" />
							</button>
						</div>

						{/* Auto-play toggle */}
						<div className="flex justify-center mt-4">
							<button
								onClick={() => setIsAutoPlaying(!isAutoPlaying)}
								className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
							>
								{isAutoPlaying ? "⏸ Pause" : "▶ Play"} Auto-play
							</button>
						</div>
					</>
				)}
			</div>
		</section>
	);
};

export default BannerCarousel;
