import React, { useState, useEffect, useCallback, useMemo } from "react";
import { LuChevronLeft, LuChevronRight, LuBuilding2, LuUser } from "react-icons/lu";
import { config } from "../../utils/config";

interface Person {
	id: string;
	name: string;
	avatar: string | null;
	institution: string | null;
}

interface PinnedPersonCarouselProps {
	persons: Person[];
	accentColor: "purple";
	linkPrefix: string;
	onPersonClick?: (personId: string) => void;
}

const getPositionStyle = (
	offset: number
): React.CSSProperties => {
	switch (offset) {
		case -2:
			return {
				transform: "translateX(-35%) scale(0.78) rotateY(8deg)",
				zIndex: 0,
				opacity: 0,
				filter: "brightness(0.3)",
				pointerEvents: "none",
			};
		case -1:
			return {
				transform: "translateX(-25%) scale(0.88) rotateY(5deg)",
				zIndex: 2,
				opacity: 0.75,
				filter: "brightness(0.4)",
				pointerEvents: "none",
			};
		case 0:
			return {
				transform: "translateX(0%) scale(1) rotateY(0deg)",
				zIndex: 10,
				opacity: 1,
				filter: "brightness(1)",
				pointerEvents: "auto",
			};
		case 1:
			return {
				transform: "translateX(25%) scale(0.88) rotateY(-5deg)",
				zIndex: 2,
				opacity: 0.75,
				filter: "brightness(0.4)",
				pointerEvents: "none",
			};
		case 2:
			return {
				transform: "translateX(35%) scale(0.78) rotateY(-8deg)",
				zIndex: 0,
				opacity: 0,
				filter: "brightness(0.3)",
				pointerEvents: "none",
			};
		default:
			return {
				transform: `translateX(${offset > 0 ? "40%" : "-40%"}) scale(0.7)`,
				zIndex: 0,
				opacity: 0,
				filter: "brightness(0.2)",
				pointerEvents: "none",
			};
	}
};

const accentGradients = {
	purple: "from-purple-800 to-purple-950",
};

const accentBadge = {
	purple: "bg-purple-600/90",
};

const accentGlow = {
	purple: "section-icon-glow-purple",
};

const PinnedPersonCarousel: React.FC<PinnedPersonCarouselProps> = ({
	persons,
	accentColor,
	linkPrefix,
	onPersonClick,
}) => {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isAutoPlaying, setIsAutoPlaying] = useState(true);

	const getImageUrl = (imageUrl: string | null): string | null => {
		if (!imageUrl) return null;
		if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
			return imageUrl;
		}
		return `${config.api.backendUrl}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
	};

	const goNext = useCallback(() => {
		setCurrentIndex((prev) => (prev + 1) % persons.length);
	}, [persons.length]);

	const goPrev = useCallback(() => {
		setCurrentIndex((prev) => (prev - 1 + persons.length) % persons.length);
	}, [persons.length]);

	useEffect(() => {
		if (!isAutoPlaying || persons.length <= 1) return;
		const interval = setInterval(goNext, 4000);
		return () => clearInterval(interval);
	}, [isAutoPlaying, persons.length, goNext]);

	const visibleCards = useMemo(() => {
		if (persons.length === 0) return [];
		if (persons.length === 1) return [{ personIndex: 0, offset: 0 }];

		const cards: { personIndex: number; offset: number }[] = [];
		for (let off = -2; off <= 2; off++) {
			const idx =
				((currentIndex + off) % persons.length + persons.length) %
				persons.length;
			cards.push({ personIndex: idx, offset: off });
		}
		return cards;
	}, [currentIndex, persons.length]);

	// Fallback: show glow placeholder if no persons
	if (persons.length === 0) {
		return (
			<div className={`relative ${accentGlow[accentColor]}`}>
				<div className="w-[220px] h-[300px] rounded-2xl bg-gray-100/50 dark:bg-white/[0.03] border border-gray-200/50 dark:border-white/[0.06] flex items-center justify-center">
					<LuUser className="w-12 h-12 text-gray-300 dark:text-gray-600" />
				</div>
			</div>
		);
	}

	const hasMultiple = persons.length > 1;

	return (
		<div
			className="relative"
			onMouseEnter={() => setIsAutoPlaying(false)}
			onMouseLeave={() => setIsAutoPlaying(true)}
			style={{ perspective: "1200px" }}
		>
			{/* Cards container */}
			<div
				className="relative group"
				style={{ width: "220px", height: "300px" }}
			>
				{visibleCards.map(({ personIndex, offset }) => {
					const person = persons[personIndex];
					if (!person) return null;
					const isCenter = offset === 0;
					const posStyle = getPositionStyle(offset);
					const avatarUrl = getImageUrl(person.avatar);

					return (
						<div
							key={`${person.id}-${offset}`}
							className="absolute inset-0"
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
								<div className={`relative w-full h-full bg-gradient-to-br ${accentGradients[accentColor]}`}>
									{avatarUrl ? (
										<img
											src={avatarUrl}
											alt={person.name}
											className="w-full h-full object-cover"
											loading="lazy"
											onError={(e) => {
												e.currentTarget.style.display = "none";
											}}
										/>
									) : (
										<div className="w-full h-full flex items-center justify-center">
											<span className="text-6xl font-black text-white/20">
												{person.name.charAt(0).toUpperCase()}
											</span>
										</div>
									)}

									{/* Overlay - only visible on center card */}
									<div
										className="absolute inset-0 flex flex-col justify-end"
										style={{
											opacity: isCenter ? 1 : 0,
											transition: "opacity 400ms ease",
										}}
									>
										{/* Role badge */}
										<div className="absolute top-3 left-3 z-10">
											<div className={`${accentBadge[accentColor]} backdrop-blur-sm text-white px-3 py-1 rounded-full text-[11px] font-semibold shadow-lg`}>
												Juri
											</div>
										</div>

										{/* Bottom info overlay */}
										<div className="bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-16">
											<h3 className="text-white font-bold text-sm leading-tight mb-1.5 line-clamp-2">
												{person.name}
											</h3>
											{person.institution && (
												<div className="flex items-center text-gray-300 text-[11px] mb-3">
													<LuBuilding2 className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
													<span className="line-clamp-1">{person.institution}</span>
												</div>
											)}
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													if (onPersonClick) {
														onPersonClick(person.id);
													} else {
														window.location.href = linkPrefix;
													}
												}}
												className="block w-full py-2 px-3 bg-red-600 hover:bg-red-700 text-white text-center text-xs font-semibold rounded-lg transition-colors"
											>
												Lihat Profil
											</button>
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
							aria-label="Previous"
						/>
						<button
							onClick={() => {
								goNext();
								setIsAutoPlaying(false);
							}}
							className="absolute right-0 top-0 w-[30%] h-full z-20 cursor-pointer"
							style={{ background: "transparent", border: "none" }}
							aria-label="Next"
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
						{persons.map((_, index) => (
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
								aria-label={`Person ${index + 1}`}
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

export default PinnedPersonCarousel;
