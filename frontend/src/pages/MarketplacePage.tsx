import React from "react";
import MarketplaceTab from "../components/marketplace/MarketplaceTab";

const MarketplacePage: React.FC = () => {
	return (
		<div className="min-h-screen transition-colors">
			<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="mb-6">
					<p className="text-[10px] md:text-xs tracking-[0.3em] text-gray-400 dark:text-gray-500 font-medium mb-2">
						TEMUKAN PRODUK
					</p>
					<h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-1">
						Marketplace
					</h1>
					<p className="text-sm text-gray-500 dark:text-gray-400">
						Temukan dan pesan produk yang tersedia
					</p>
				</div>
				<MarketplaceTab />
			</div>
		</div>
	);
};

export default MarketplacePage;
