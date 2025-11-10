import React, { useState, useEffect } from "react";
import { api } from "../../utils/api";
import { Event, SchoolCategory } from "../../types/landing";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import EventCard from "../../components/landing/EventCard";

const PesertaDashboard: React.FC = () => {
	const [events, setEvents] = useState<Event[]>([]);
	const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
	const [schoolCategories, setSchoolCategories] = useState<SchoolCategory[]>(
		[]
	);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<string>("");

	useEffect(() => {
		fetchData();
	}, []);

	useEffect(() => {
		filterEvents();
	}, [searchTerm, selectedCategory, events]);

	const fetchData = async () => {
		try {
			setLoading(true);
			const [eventsRes, categoriesRes] = await Promise.all([
				api.get("/events?status=PUBLISHED"),
				api.get("/events/meta/school-categories"),
			]);

			// API returns {data: [...], total: X} format
			setEvents(eventsRes.data.data || []);
			setSchoolCategories(categoriesRes.data || []);
		} catch (error) {
			console.error("Error fetching data:", error);
		} finally {
			setLoading(false);
		}
	};

	const filterEvents = () => {
		let filtered = events;

		if (searchTerm) {
			filtered = filtered.filter(
				(event) =>
					event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
					event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
					event.location?.toLowerCase().includes(searchTerm.toLowerCase())
			);
		}

		if (selectedCategory) {
			filtered = filtered.filter((event) =>
				event.schoolCategoryLimits?.some(
					(limit) => limit.schoolCategory.id === selectedCategory
				)
			);
		}

		setFilteredEvents(filtered);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
						Event Paskibra
					</h1>
					<p className="text-gray-600 dark:text-gray-400">
						Temukan dan daftar event paskibra yang sesuai untuk tim Anda
					</p>
				</div>

				{/* Search and Filters */}
				<div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
					{/* Search */}
					<div className="relative">
						<MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
						<input
							type="text"
							placeholder="Cari event..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
						/>
					</div>

					{/* Category Filter */}
					<select
						value={selectedCategory}
						onChange={(e) => setSelectedCategory(e.target.value)}
						className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
					>
						<option value="">Semua Kategori</option>
						{schoolCategories.map((category) => (
							<option key={category.id} value={category.id}>
								{category.name}
							</option>
						))}
					</select>
				</div>

			{/* Events Grid */}
			{filteredEvents.length === 0 ? (
				<div className="text-center py-12">
					<p className="text-gray-500 dark:text-gray-400">
						Tidak ada event yang ditemukan
					</p>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{filteredEvents.map((event) => (
						<EventCard key={event.id} event={event} />
					))}
				</div>
			)}
		</div>
	</div>
	);
};

export default PesertaDashboard;