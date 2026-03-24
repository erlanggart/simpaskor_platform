import React, { useState } from "react";
import BannerCarousel from "../components/landing/BannerCarousel";
import QuickActions from "../components/landing/QuickActions";
import Statistics from "../components/landing/Statistics";
import JuryShowcase from "../components/landing/JuryShowcase";
import SearchBar from "../components/landing/SearchBar";
import EventGrid from "../components/landing/EventGrid";
import LoadingSpinner from "../components/landing/LoadingSpinner";
import ErrorMessage from "../components/landing/ErrorMessage";
import { useLandingData } from "../hooks/useLandingData";

const LandingPage: React.FC = () => {
	const { pinnedEvents, events, completedEvents, juries, publicStats, loading, error, refetch } =
		useLandingData();
	const [searchTerm, setSearchTerm] = useState("");

	// Filter events based on search
	const filteredEvents = events.filter((event) => {
		if (!searchTerm) return true;
		const search = searchTerm.toLowerCase();
		return (
			event.title.toLowerCase().includes(search) ||
			event.description?.toLowerCase().includes(search) ||
			event.category?.toLowerCase().includes(search) ||
			event.location?.toLowerCase().includes(search) ||
			event.organizer?.toLowerCase().includes(search)
		);
	});

	// Filter completed events based on search
	const filteredCompletedEvents = completedEvents.filter((event) => {
		if (!searchTerm) return true;
		const search = searchTerm.toLowerCase();
		return (
			event.title.toLowerCase().includes(search) ||
			event.description?.toLowerCase().includes(search) ||
			event.category?.toLowerCase().includes(search) ||
			event.location?.toLowerCase().includes(search) ||
			event.organizer?.toLowerCase().includes(search)
		);
	});

	// Combine all events for statistics
	const allEvents = [...events, ...completedEvents];

	// Loading state
	if (loading) {
		return <LoadingSpinner />;
	}

	// Error state
	if (error) {
		return <ErrorMessage message={error} onRetry={refetch} />;
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
			<BannerCarousel events={pinnedEvents} />

			<QuickActions />

			<Statistics events={allEvents} />

			<SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
			<EventGrid events={filteredEvents} completedEvents={filteredCompletedEvents} />

			<JuryShowcase juries={juries} stats={publicStats} loading={loading} />
		</div>
	);
};

export default LandingPage;
