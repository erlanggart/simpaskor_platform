import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LuArrowRight, LuPackage, LuShoppingCart } from "react-icons/lu";
import { api } from "../../utils/api";
import { config } from "../../utils/config";
import type { Product } from "../../types/marketplace";

const MarketplaceSection: React.FC = () => {
	const [products, setProducts] = useState<Product[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchProducts = async () => {
			try {
				const res = await api.get("/products", { params: { limit: 6 } });
				setProducts(res.data.data || []);
			} catch {
				console.error("Failed to fetch marketplace products");
			} finally {
				setLoading(false);
			}
		};

		fetchProducts();
	}, []);

	const getImageUrl = (imageUrl: string | null): string => {
		if (!imageUrl) return "";
		if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;
		return `${config.api.backendUrl}${imageUrl}`;
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("id-ID", {
			style: "currency",
			currency: "IDR",
			minimumFractionDigits: 0,
		}).format(amount);
	};

	return (
		<div className="relative z-10 w-full max-w-6xl mx-auto px-6 md:px-12 lg:px-16">
			<div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 lg:mb-8">
				<div>
					<p className="text-[10px] md:text-xs tracking-[0.3em] text-gray-400 dark:text-gray-400 font-medium mb-3">
						TEMUKAN PRODUK
					</p>
					<h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-none mb-2 landing-title-gradient-marketplace">
						MARKETPLACE
					</h1>
					<div className="flex items-center gap-4">
						<div className="w-10 h-[1px] bg-gradient-to-r from-orange-500/50 to-transparent" />
						<p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium tracking-wide">
							Produk komunitas Paskibra & marching band
						</p>
					</div>
				</div>
				<Link
					to="/marketplace"
					className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gray-900/[0.06] dark:bg-white/[0.06] border border-gray-300/50 dark:border-white/10 text-gray-800 dark:text-white text-xs font-medium hover:bg-gray-900/[0.12] dark:hover:bg-white/[0.12] hover:border-gray-400/50 dark:hover:border-white/20 transition-all duration-300 group flex-shrink-0"
				>
					<span>Buka Marketplace</span>
					<LuArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
				</Link>
			</div>

			{loading ? (
				<div className="flex items-center justify-center py-20">
					<div className="animate-spin rounded-full h-8 w-8 border-2 border-red-600 border-t-transparent" />
				</div>
			) : products.length === 0 ? (
				<div className="text-center py-12">
					<LuPackage className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
					<p className="text-sm text-gray-500 dark:text-gray-400">Belum ada produk tersedia</p>
				</div>
			) : (
				<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
					{products.map((product) => {
						const isOutOfStock = product.stock <= 0;

						return (
							<Link
								key={product.id}
								to="/marketplace"
								className={`group overflow-hidden rounded-xl border border-gray-200/70 bg-white shadow-md shadow-gray-200/80 transition-all duration-300 hover:scale-[1.02] hover:border-orange-400/30 hover:shadow-lg hover:shadow-gray-300/80 dark:bg-white/[0.03] dark:border-white/[0.06] dark:shadow-none dark:hover:border-orange-500/20 ${
									isOutOfStock ? "opacity-60" : ""
								}`}
							>
								<div className="relative aspect-square w-full bg-gradient-to-br from-red-100 via-orange-50 to-amber-100 overflow-hidden dark:from-red-900/10 dark:via-orange-900/10 dark:to-amber-900/10">
									{product.thumbnail ? (
										<img
											src={getImageUrl(product.thumbnail)}
											alt={product.name}
											className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
											loading="lazy"
										/>
									) : (
										<div className="w-full h-full flex items-center justify-center">
											<LuPackage className="w-7 h-7 text-gray-400/50 dark:text-gray-600" />
										</div>
									)}
									<div className="absolute top-1.5 left-1.5">
										<span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full backdrop-blur-sm text-white ${
											isOutOfStock ? "bg-gray-600/85" : product.stock <= 5 ? "bg-amber-500/85" : "bg-emerald-500/85"
										}`}>
											{isOutOfStock ? "Habis" : product.stock <= 5 ? `Sisa ${product.stock}` : "Tersedia"}
										</span>
									</div>
									{!isOutOfStock && (
										<div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
											<span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-white/80 dark:bg-black/60 text-gray-700 dark:text-gray-200 backdrop-blur-sm">
												<LuShoppingCart className="w-3 h-3 inline mr-0.5" />
												Lihat
											</span>
										</div>
									)}
								</div>
								<div className="flex min-h-[108px] flex-col p-2.5">
									<h3 className="text-[10px] lg:text-xs font-semibold text-gray-800 dark:text-white leading-tight line-clamp-2 mb-1.5">
										{product.name}
									</h3>
									{product.description && (
										<p className="text-[8px] lg:text-[9px] text-gray-500 dark:text-gray-400 line-clamp-2">
											{product.description}
										</p>
									)}
									<div className="mt-auto pt-3">
										<p className="text-[11px] lg:text-sm font-bold text-red-600 dark:text-red-400">
											{formatCurrency(product.price)}
										</p>
									</div>
								</div>
							</Link>
						);
					})}
				</div>
			)}
		</div>
	);
};

export default MarketplaceSection;
