import React, { useEffect } from "react";
import { Outlet, useParams, useNavigate } from "react-router-dom";
import { Logo } from "../components/Logo";
import { ThemeToggle } from "../components/ThemeToggle";

/**
 * ScoringLayout - A minimal layout for juri scoring pages
 * Optimized for tablet devices with focus on the scoring interface
 */
export const ScoringLayout: React.FC = () => {
	const { eventSlug } = useParams<{ eventSlug: string }>();
	const navigate = useNavigate();

	// Clear the exit flag when entering an event via scoring layout
	useEffect(() => {
		if (eventSlug) {
			sessionStorage.removeItem("juri_exited_event");
		}
	}, [eventSlug]);

	const handleLogoClick = () => {
		if (eventSlug) {
			navigate(`/juri/events/${eventSlug}/info`);
		} else {
			navigate("/juri/events");
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
			{/* Minimal Header */}
			<header className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
				<div className="px-4 py-3 flex items-center justify-between">
					<button
						onClick={handleLogoClick}
						className="flex items-center gap-2 hover:opacity-80 transition-opacity"
					>
						<Logo size="md" showText variant="auto" />
					</button>
					<ThemeToggle />
				</div>
			</header>

			{/* Main Content */}
			<main className="flex-1">
				<Outlet />
			</main>
		</div>
	);
};

export default ScoringLayout;
