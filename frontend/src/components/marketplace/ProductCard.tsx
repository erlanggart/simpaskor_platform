import React from "react";
import { ShoppingCartIcon } from "@heroicons/react/24/outline";
import { Product } from "../../types/marketplace";

interface ProductCardProps {
	product: Product;
	onAddToCart: (product: Product) => void;
	isAuthenticated: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, isAuthenticated }) => {
	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("id-ID", {
			style: "currency",
			currency: "IDR",
			minimumFractionDigits: 0,
		}).format(amount);
	};

	const getImageUrl = (thumbnail: string | null) => {
		if (!thumbnail) return null;
		if (thumbnail.startsWith("http://") || thumbnail.startsWith("https://")) {
			return thumbnail;
		}
		const backendUrl = import.meta.env.VITE_BACKEND_URL || "";
		return `${backendUrl}${thumbnail}`;
	};

	const isOutOfStock = product.stock <= 0;

	return (
		<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col">
			{/* Product Image */}
			<div className="relative w-full aspect-square bg-gradient-to-br from-blue-100 to-blue-200 dark:from-gray-700 dark:to-gray-600">
				{product.thumbnail ? (
					<img
						src={getImageUrl(product.thumbnail) || ""}
						alt={product.name}
						className="w-full h-full object-cover"
						onError={(e) => {
							e.currentTarget.style.display = "none";
						}}
					/>
				) : (
					<div className="flex items-center justify-center h-full">
						<ShoppingCartIcon className="w-16 h-16 text-gray-400 dark:text-gray-500" />
					</div>
				)}
				{isOutOfStock && (
					<div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
						Habis
					</div>
				)}
			</div>

			{/* Product Info */}
			<div className="p-4 flex flex-col flex-1">
				<h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2 mb-1">
					{product.name}
				</h3>
				{product.description && (
					<p className="text-gray-500 dark:text-gray-400 text-xs line-clamp-2 mb-3">
						{product.description}
					</p>
				)}
				<div className="mt-auto">
					<p className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">
						{formatCurrency(product.price)}
					</p>
					<p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
						Stok: {product.stock > 0 ? product.stock : "Habis"}
					</p>
					{isAuthenticated ? (
						<button
							onClick={() => onAddToCart(product)}
							disabled={isOutOfStock}
							className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
								isOutOfStock
									? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
									: "bg-red-600 hover:bg-red-700 text-white"
							}`}
						>
							<ShoppingCartIcon className="w-4 h-4" />
							{isOutOfStock ? "Stok Habis" : "Tambah ke Keranjang"}
						</button>
					) : (
						<p className="text-center text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg py-2">
							Login untuk memesan
						</p>
					)}
				</div>
			</div>
		</div>
	);
};

export default ProductCard;
