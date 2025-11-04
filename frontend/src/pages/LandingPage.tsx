import React, { useState } from "react";
import {
	BannerCarousel,
	SearchBar,
	EventGrid,
	LoadingSpinner,
	ErrorMessage,
} from "../components/landing";
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
		<div className="min-h-screen bg-gray-50">
			<BannerCarousel events={pinnedEvents} />

			<SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />

			<EventGrid events={filteredEvents} />
		</div>
	);
};

export default LandingPage;
