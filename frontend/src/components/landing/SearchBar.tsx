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
		<section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
			<div className="bg-white rounded-lg shadow-lg p-6">
				<div className="relative">
					<MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
					<input
						type="text"
						placeholder="Cari event berdasarkan nama, kategori, lokasi..."
						value={searchTerm}
						onChange={(e) => onSearchChange(e.target.value)}
						className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
					/>
				</div>
			</div>
		</section>
	);
};

export default SearchBar;
