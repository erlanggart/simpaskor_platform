import React from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface SearchBarProps {
	searchTerm: string;
	onSearchChange: (value: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
	searchTerm,
	onSearchChange,
}) => {
	return (
		<section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
			<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg p-6 transition-colors">
				<div className="relative">
					<MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
					<input
						type="text"
						placeholder="Cari event berdasarkan nama, kategori, lokasi..."
						value={searchTerm}
						onChange={(e) => onSearchChange(e.target.value)}
						className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-600 focus:border-transparent transition-colors"
					/>
				</div>
			</div>
		</section>
	);
};

export default SearchBar;
