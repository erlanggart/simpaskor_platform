import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { CalendarIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
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

interface HeroBannerCarouselProps {
	events: PinnedEvent[];
}

// Position styles for each offset from center
const getPositionStyle = (
	offset: number
): React.CSSProperties => {
	switch (offset) {
		case -2: // far left — mostly hidden
			return {
				transform: "translateX(-70%) scale(0.75)",
				zIndex: 0,
				opacity: 0,
				filter: "brightness(0.3) grayscale(1)",
				pointerEvents: "none",
			};
		case -1: // left
			return {
				transform: "translateX(-40%) scale(0.88)",
				zIndex: 2,
				opacity: 0.7,
				filter: "brightness(0.5) grayscale(0.8)",
				pointerEvents: "none",
			};
		case 0: // center (active)
			return {
				transform: "translateX(0%) scale(1)",
				zIndex: 10,
				opacity: 1,
				filter: "brightness(1) grayscale(0)",
				pointerEvents: "auto",
			};
		case 1: // right
			return {
				transform: "translateX(40%) scale(0.88)",
				zIndex: 2,
				opacity: 0.7,
				filter: "brightness(0.5) grayscale(0.8)",
				pointerEvents: "none",
			};
		case 2: // far right — mostly hidden
			return {
				transform: "translateX(70%) scale(0.75)",
				zIndex: 0,
				opacity: 0,
				filter: "brightness(0.3) grayscale(1)",
				pointerEvents: "none",
			};
		default: // completely hidden
			return {
				transform: `translateX(${offset > 0 ? "80%" : "-80%"}) scale(0.7)`,
				zIndex: 0,
				opacity: 0,
				filter: "brightness(0.2) grayscale(1)",
				pointerEvents: "none",
			};
	}
};

const HeroBannerCarousel: React.FC<HeroBannerCarouselProps> = ({ events }) => {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isAutoPlaying, setIsAutoPlaying] = useState(true);

	const getImageUrl = (imageUrl: string | null): string => {
		if (!imageUrl) {
			return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='400'%3E%3Crect fill='%23991b1b' width='300' height='400'/%3E%3Ctext fill='%23fff' font-size='18' font-family='Arial' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3ENo Image%3C/text%3E%3C/svg%3E";
		}
		if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
			return imageUrl;
		}
		return `${config.api.backendUrl}${imageUrl}`;
	};

	const formatDate = (dateString: string): string => {
		const date = new Date(dateString);
		return date.toLocaleDateString("id-ID", {
			day: "numeric",
			month: "short",
			year: "numeric",
		});
	};

	const getCountdown = (startDate: string): string => {
		const now = new Date();
		const start = new Date(startDate);
		const diff = start.getTime() - now.getTime();
		if (diff < 0) return "Berlangsung";
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		if (days > 0) return `${days} Hari Lagi`;
		const hours = Math.floor(
			(diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
		);
		return hours > 0 ? `${hours} Jam Lagi` : "Segera";
	};

	const goNext = useCallback(() => {
		setCurrentIndex((prev) => (prev + 1) % events.length);
	}, [events.length]);

	const goPrev = useCallback(() => {
		setCurrentIndex((prev) => (prev - 1 + events.length) % events.length);
	}, [events.length]);

	useEffect(() => {
		if (!isAutoPlaying || events.length <= 1) return;
		const interval = setInterval(goNext, 5000);
		return () => clearInterval(interval);
	}, [isAutoPlaying, events.length, goNext]);

	// Calculate offset from center for each event (stable per event)
	const getOffset = useCallback(
		(index: number): number => {
			const total = events.length;
			let diff = index - currentIndex;
			// Normalize to shortest circular path
			if (diff > total / 2) diff -= total;
			if (diff < -total / 2) diff += total;
			return diff;
		},
		[currentIndex, events.length]
	);

	if (events.length === 0) return null;

	const hasMultiple = events.length > 1;

	return (
		<div
			className="relative"
			onMouseEnter={() => setIsAutoPlaying(false)}
			onMouseLeave={() => setIsAutoPlaying(true)}
		>
			{/* Cards container */}
			<div
				className="relative group"
				style={{ width: "280px", height: "370px" }}
			>
				{events.map((evt, index) => {
					const offset = getOffset(index);
					const isCenter = offset === 0;
					const posStyle = getPositionStyle(offset);

					return (
						<div
							key={evt.id}
							className="absolute inset-0 will-change-transform"
							style={{
								...posStyle,
								transformOrigin: "center center",
								transition:
									"transform 650ms cubic-bezier(0.33, 1, 0.68, 1), opacity 650ms cubic-bezier(0.33, 1, 0.68, 1), filter 650ms cubic-bezier(0.33, 1, 0.68, 1)",
							}}
						>
							<div
								className={`relative w-full h-full rounded-2xl overflow-hidden ${
									isCenter
										? "shadow-2xl shadow-black/30 dark:shadow-black/50"
										: "shadow-xl shadow-black/10 dark:shadow-black/20"
								}`}
							>
								<div className="relative w-full h-full bg-gradient-to-br from-red-800 to-red-950">
									<img
										src={getImageUrl(evt.thumbnail)}
										alt={evt.title}
										className="w-full h-full object-cover"
										loading="lazy"
										onError={(e) => {
											e.currentTarget.style.display = "none";
										}}
									/>

									{/* Only show overlay on center card */}
									<div
										className="absolute inset-0 flex flex-col justify-end"
										style={{
											opacity: isCenter ? 1 : 0,
											transition: "opacity 400ms ease",
										}}
									>
										{/* Countdown badge */}
										<div className="absolute top-3 left-3 z-10">
											<div className="bg-red-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-[11px] font-semibold shadow-lg">
												{getCountdown(evt.startDate)}
											</div>
										</div>

										{/* Bottom overlay */}
										<div className="bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-16">
											<h3 className="text-white font-bold text-sm leading-tight mb-2 line-clamp-2">
												{evt.title}
											</h3>
											<div className="flex flex-col gap-1 mb-3">
												<div className="flex items-center text-gray-300 text-[11px]">
													<CalendarIcon className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
													<span>
														{formatDate(evt.startDate)}
													</span>
												</div>
												{evt.location && (
													<div className="flex items-center text-gray-300 text-[11px]">
														<MapPinIcon className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
														<span className="line-clamp-1">
															{evt.location}
														</span>
													</div>
												)}
											</div>
											<Link
												to={`/events/${evt.slug || evt.id}`}
												className="block w-full py-2 px-3 bg-red-600 hover:bg-red-700 text-white text-center text-xs font-semibold rounded-lg transition-colors"
											>
												Lihat Detail
											</Link>
										</div>
									</div>
								</div>
							</div>
						</div>
					);
				})}

				{/* Clickable side areas */}
				{hasMultiple && (
					<>
						<button
							onClick={() => {
								goPrev();
								setIsAutoPlaying(false);
							}}
							className="absolute left-0 top-0 w-[30%] h-full z-20 cursor-pointer"
							style={{ background: "transparent", border: "none" }}
							aria-label="Previous event"
						/>
						<button
							onClick={() => {
								goNext();
								setIsAutoPlaying(false);
							}}
							className="absolute right-0 top-0 w-[30%] h-full z-20 cursor-pointer"
							style={{ background: "transparent", border: "none" }}
							aria-label="Next event"
						/>
					</>
				)}
			</div>

			{/* Navigation controls */}
			{hasMultiple && (
				<div className="flex items-center justify-center gap-3 mt-4">
					<button
						onClick={() => {
							goPrev();
							setIsAutoPlaying(false);
						}}
						className="w-8 h-8 rounded-full bg-gray-200/50 dark:bg-white/[0.06] border border-gray-300/50 dark:border-white/10 text-gray-600 dark:text-gray-400 flex items-center justify-center hover:bg-gray-300/50 dark:hover:bg-white/[0.12] transition-colors"
						aria-label="Previous"
					>
						<LuChevronLeft className="w-4 h-4" />
					</button>

					<div className="flex gap-1.5">
						{events.map((_, index) => (
							<button
								key={index}
								onClick={() => {
									setCurrentIndex(index);
									setIsAutoPlaying(false);
								}}
								className={`transition-all duration-300 rounded-full ${
									index === currentIndex
										? "w-5 h-1.5 bg-red-500"
										: "w-1.5 h-1.5 bg-gray-400/50 dark:bg-white/20 hover:bg-red-400/50"
								}`}
								aria-label={`Slide ${index + 1}`}
							/>
						))}
					</div>

					<button
						onClick={() => {
							goNext();
							setIsAutoPlaying(false);
						}}
						className="w-8 h-8 rounded-full bg-gray-200/50 dark:bg-white/[0.06] border border-gray-300/50 dark:border-white/10 text-gray-600 dark:text-gray-400 flex items-center justify-center hover:bg-gray-300/50 dark:hover:bg-white/[0.12] transition-colors"
						aria-label="Next"
					>
						<LuChevronRight className="w-4 h-4" />
					</button>
				</div>
			)}
		</div>
	);
};

export default HeroBannerCarousel;
