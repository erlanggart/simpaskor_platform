import React, { useState } from "react";
import BannerCarousel from "../components/landing/BannerCarousel";
import Statistics from "../components/landing/Statistics";
import SearchBar from "../components/landing/SearchBar";
import EventGrid from "../components/landing/EventGrid";
import LoadingSpinner from "../components/landing/LoadingSpinner";
import ErrorMessage from "../components/landing/ErrorMessage";
import { useLandingData } from "../hooks/useLandingData";

const LandingPage: React.FC = () => {
	const { pinnedEvents, events, loading, error, refetch } = useLandingData();
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

			<Statistics events={events} />

			<SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />

			<EventGrid events={filteredEvents} />
		</div>
	);
};

export default LandingPage;
