import React from "react";
import MarketplaceTab from "../components/marketplace/MarketplaceTab";

const MarketplacePage: React.FC = () => {
	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
						Marketplace
					</h1>
					<p className="mt-2 text-gray-600 dark:text-gray-400">
						Temukan dan pesan produk yang tersedia
					</p>
				</div>
				<MarketplaceTab />
			</div>
		</div>
	);
};

export default MarketplacePage;
