import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
	ShoppingCartIcon,
	MagnifyingGlassIcon,
	XMarkIcon,
	TrashIcon,
	MinusIcon,
	PlusIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../utils/api";
import { useAuth } from "../../hooks/useAuth";
import { Product, CartItem } from "../../types/marketplace";
import ProductCard from "./ProductCard";
import Swal from "sweetalert2";

const MarketplaceTab: React.FC = () => {
	const { isAuthenticated } = useAuth();
	const navigate = useNavigate();
	const [products, setProducts] = useState<Product[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [cart, setCart] = useState<CartItem[]>([]);
	const [showCart, setShowCart] = useState(false);
	const [ordering, setOrdering] = useState(false);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);

	const fetchProducts = async () => {
		try {
			setLoading(true);
			const params: any = { page, limit: 12 };
			if (search) params.search = search;
			const res = await api.get("/products", { params });
			setProducts(res.data.data || []);
			setTotalPages(res.data.totalPages || 1);
		} catch (err) {
			console.error("Error fetching products:", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchProducts();
	}, [page]);

	useEffect(() => {
		const delaySearch = setTimeout(() => {
			setPage(1);
			fetchProducts();
		}, 300);
		return () => clearTimeout(delaySearch);
	}, [search]);

	const addToCart = (product: Product) => {
		if (!isAuthenticated) {
			Swal.fire({
				icon: "info",
				title: "Login Diperlukan",
				text: "Silakan login terlebih dahulu untuk memesan produk",
				confirmButtonText: "Login",
				showCancelButton: true,
				cancelButtonText: "Batal",
			}).then((result) => {
				if (result.isConfirmed) navigate("/login");
			});
			return;
		}

		setCart((prev) => {
			const existing = prev.find((item) => item.product.id === product.id);
			if (existing) {
				if (existing.quantity >= product.stock) {
					Swal.fire({ icon: "warning", title: "Stok tidak mencukupi", timer: 1500, showConfirmButton: false });
					return prev;
				}
				return prev.map((item) =>
					item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
				);
			}
			return [...prev, { product, quantity: 1 }];
		});

		Swal.fire({
			icon: "success",
			title: "Ditambahkan ke keranjang",
			timer: 1000,
			showConfirmButton: false,
			toast: true,
			position: "top-end",
		});
	};

	const removeFromCart = (productId: string) => {
		setCart((prev) => prev.filter((item) => item.product.id !== productId));
	};

	const updateCartQuantity = (productId: string, delta: number) => {
		setCart((prev) =>
			prev
				.map((item) => {
					if (item.product.id !== productId) return item;
					const newQty = item.quantity + delta;
					if (newQty <= 0) return null;
					if (newQty > item.product.stock) return item;
					return { ...item, quantity: newQty };
				})
				.filter(Boolean) as CartItem[]
		);
	};

	const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
	const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

	const handleCheckout = async () => {
		if (cart.length === 0) return;
		if (!isAuthenticated) {
			navigate("/login");
			return;
		}

		const confirm = await Swal.fire({
			title: "Konfirmasi Pesanan",
			html: `<p>Total: <strong>${formatCurrency(cartTotal)}</strong></p><p>${cart.length} produk, ${cartCount} item</p>`,
			icon: "question",
			showCancelButton: true,
			confirmButtonText: "Pesan Sekarang",
			cancelButtonText: "Batal",
		});

		if (!confirm.isConfirmed) return;

		try {
			setOrdering(true);
			await api.post("/orders", {
				items: cart.map((item) => ({
					productId: item.product.id,
					quantity: item.quantity,
				})),
			});

			setCart([]);
			setShowCart(false);

			Swal.fire({
				icon: "success",
				title: "Pesanan Berhasil!",
				text: "Pesanan Anda telah dibuat",
				confirmButtonText: "OK",
			});

			fetchProducts(); // Refresh stock
		} catch (err: any) {
			Swal.fire({
				icon: "error",
				title: "Gagal",
				text: err.response?.data?.error || "Gagal membuat pesanan",
			});
		} finally {
			setOrdering(false);
		}
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("id-ID", {
			style: "currency",
			currency: "IDR",
			minimumFractionDigits: 0,
		}).format(amount);
	};

	return (
		<div className="relative">
			{/* Search & Cart Header */}
			<div className="flex items-center gap-3 mb-6">
				<div className="relative flex-1">
					<MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
					<input
						type="text"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Cari produk..."
						className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
					/>
					{search && (
						<button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
							<XMarkIcon className="w-5 h-5 text-gray-400 hover:text-gray-600" />
						</button>
					)}
				</div>

				{isAuthenticated && (
					<button
						onClick={() => setShowCart(!showCart)}
						className="relative flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
					>
						<ShoppingCartIcon className="w-5 h-5" />
						<span className="hidden sm:inline">Keranjang</span>
						{cartCount > 0 && (
							<span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
								{cartCount}
							</span>
						)}
					</button>
				)}
			</div>

			{/* Cart Sidebar */}
			{showCart && (
				<div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowCart(false)}>
					<div className="absolute inset-0 bg-black/50" />
					<div
						className="relative w-full max-w-md bg-white dark:bg-gray-800 h-full overflow-y-auto shadow-xl"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
							<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
								Keranjang ({cartCount})
							</h3>
							<button onClick={() => setShowCart(false)}>
								<XMarkIcon className="w-6 h-6 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" />
							</button>
						</div>

						{cart.length === 0 ? (
							<div className="p-8 text-center text-gray-500 dark:text-gray-400">
								<ShoppingCartIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
								<p>Keranjang kosong</p>
							</div>
						) : (
							<>
								<div className="p-4 space-y-3">
									{cart.map((item) => (
										<div
											key={item.product.id}
											className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
										>
											<div className="w-12 h-12 rounded bg-gray-200 dark:bg-gray-600 flex-shrink-0 overflow-hidden">
												{item.product.thumbnail && (
													<img
													src={`${import.meta.env.VITE_BACKEND_URL || ""}${item.product.thumbnail}`}
														alt={item.product.name}
														className="w-full h-full object-cover"
													/>
												)}
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium text-gray-900 dark:text-white truncate">
													{item.product.name}
												</p>
												<p className="text-xs text-indigo-600 dark:text-indigo-400">
													{formatCurrency(item.product.price)}
												</p>
											</div>
											<div className="flex items-center gap-1">
												<button
													onClick={() => updateCartQuantity(item.product.id, -1)}
													className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
												>
													<MinusIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
												</button>
												<span className="w-8 text-center text-sm font-medium text-gray-900 dark:text-white">
													{item.quantity}
												</span>
												<button
													onClick={() => updateCartQuantity(item.product.id, 1)}
													className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
												>
													<PlusIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
												</button>
											</div>
											<button
												onClick={() => removeFromCart(item.product.id)}
												className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
											>
												<TrashIcon className="w-4 h-4" />
											</button>
										</div>
									))}
								</div>

								<div className="p-4 border-t border-gray-200 dark:border-gray-700">
									<div className="flex justify-between mb-4">
										<span className="font-medium text-gray-700 dark:text-gray-300">Total</span>
										<span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
											{formatCurrency(cartTotal)}
										</span>
									</div>
									<button
										onClick={handleCheckout}
										disabled={ordering}
										className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-medium transition-colors"
									>
										{ordering ? "Memproses..." : "Pesan Sekarang"}
									</button>
								</div>
							</>
						)}
					</div>
				</div>
			)}

			{/* Products Grid */}
			{loading ? (
				<div className="flex justify-center py-12">
					<div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
				</div>
			) : products.length === 0 ? (
				<div className="text-center py-12">
					<ShoppingCartIcon className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
					<p className="text-gray-500 dark:text-gray-400 text-lg">
						{search ? "Tidak ada produk yang cocok" : "Belum ada produk tersedia"}
					</p>
				</div>
			) : (
				<>
					<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
						{products.map((product) => (
							<ProductCard
								key={product.id}
								product={product}
								onAddToCart={addToCart}
								isAuthenticated={isAuthenticated}
							/>
						))}
					</div>

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex justify-center gap-2 mt-8">
							{Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
								<button
									key={p}
									onClick={() => setPage(p)}
									className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
										p === page
											? "bg-indigo-600 text-white"
											: "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600"
									}`}
								>
									{p}
								</button>
							))}
						</div>
					)}
				</>
			)}
		</div>
	);
};

export default MarketplaceTab;
