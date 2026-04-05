import React, { useState, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";

export const ThemeToggle: React.FC = () => {
	const { theme, toggleTheme } = useTheme();
	const [isAnimating, setIsAnimating] = useState(false);
	const [showHint, setShowHint] = useState(false);

	// Pulse hint on first visit
	useEffect(() => {
		const hasSeenToggle = sessionStorage.getItem("theme-toggle-seen");
		if (!hasSeenToggle) {
			const timer = setTimeout(() => setShowHint(true), 2000);
			const hideTimer = setTimeout(() => {
				setShowHint(false);
				sessionStorage.setItem("theme-toggle-seen", "1");
			}, 6000);
			return () => {
				clearTimeout(timer);
				clearTimeout(hideTimer);
			};
		}
	}, []);

	const handleToggle = () => {
		setIsAnimating(true);
		setShowHint(false);
		toggleTheme();
		setTimeout(() => setIsAnimating(false), 500);
	};

	return (
		<div className="relative">
			<button
				onClick={handleToggle}
				className={`relative p-2 rounded-lg transition-all duration-300 backdrop-blur-sm border overflow-hidden
					${theme === "light"
						? "bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-700"
						: "bg-white/10 hover:bg-white/20 border-transparent text-yellow-300"
					}
					${showHint ? "animate-pulse ring-2 ring-orange-400/50 dark:ring-yellow-400/50" : ""}
				`}
				aria-label="Toggle theme"
				title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
			>
				<div className={`relative w-5 h-5 transition-transform duration-500 ${isAnimating ? "scale-0 rotate-180" : "scale-100 rotate-0"}`}>
					{theme === "light" ? (
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
						</svg>
					) : (
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
						</svg>
					)}
				</div>
			</button>

			{/* Hint tooltip */}
			{showHint && (
				<div className="absolute -bottom-9 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md text-[10px] font-medium whitespace-nowrap bg-gray-800 dark:bg-white text-white dark:text-gray-800 shadow-lg animate-bounce pointer-events-none z-50">
					Ganti tema
					<div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-gray-800 dark:bg-white" />
				</div>
			)}
		</div>
	);
};
