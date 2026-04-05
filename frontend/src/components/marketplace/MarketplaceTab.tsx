import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
	LuSearch,
	LuX,
	LuShoppingCart,
	LuTrash2,
	LuMinus,
	LuPlus,
	LuChevronLeft,
	LuChevronRight,
	LuArrowUpDown,
	LuPackage,
} from "react-icons/lu";
import { api } from "../../utils/api";
import { config } from "../../utils/config";
import { useAuth } from "../../hooks/useAuth";
import { usePayment } from "../../hooks/usePayment";
import { Product, CartItem } from "../../types/marketplace";
import Swal from "sweetalert2";

type StockFilter = "all" | "available" | "limited";
type SortType = "default" | "price_low" | "price_high" | "newest";

const MarketplaceTab: React.FC = () => {
	const { isAuthenticated } = useAuth();
	const { pay, isSnapReady } = usePayment();
	const navigate = useNavigate();
	const [products, setProducts] = useState<Product[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [cart, setCart] = useState<CartItem[]>([]);
	const [showCart, setShowCart] = useState(false);
	const [ordering, setOrdering] = useState(false);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [stockFilter, setStockFilter] = useState<StockFilter>("all");
	const [sortBy, setSortBy] = useState<SortType>("default");

	const fetchProducts = async () => {
		try {
			setLoading(true);
			const params: any = { page, limit: 25 };
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

	const filteredAndSorted = useMemo(() => {
		let result = [...products];

		// Stock filter
		if (stockFilter === "available") {
			result = result.filter((p) => p.stock > 5);
		} else if (stockFilter === "limited") {
			result = result.filter((p) => p.stock > 0 && p.stock <= 5);
		}

		// Sort
		switch (sortBy) {
			case "price_low":
				result.sort((a, b) => a.price - b.price);
				break;
			case "price_high":
				result.sort((a, b) => b.price - a.price);
				break;
			case "newest":
				result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
				break;
			default:
				break;
		}

		return result;
	}, [products, stockFilter, sortBy]);

	const addToCart = (product: Product) => {
		if (!isAuthenticated) {
			Swal.fire({
				icon: "info",
				title: "Login Diperlukan",
				text: "Silakan login terlebih dahulu untuk memesan produk",
				confirmButtonText: "Login",
				showCancelButton: true,
				cancelButtonText: "Batal",
				confirmButtonColor: "#dc2626",
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
			confirmButtonColor: "#dc2626",
		});

		if (!confirm.isConfirmed) return;

		try {
			setOrdering(true);
			const res = await api.post("/orders", {
				items: cart.map((item) => ({
					productId: item.product.id,
					quantity: item.quantity,
				})),
			});

			const { snapToken } = res.data;

			if (snapToken && isSnapReady) {
				setShowCart(false);
				// Open Midtrans Snap payment popup
				pay(snapToken, {
					onSuccess: () => {
						setCart([]);
						Swal.fire({
							icon: "success",
							title: "Pembayaran Berhasil!",
							text: "Pesanan Anda telah dibayar",
							confirmButtonText: "OK",
							confirmButtonColor: "#dc2626",
						});
						fetchProducts();
					},
					onPending: () => {
						setCart([]);
						Swal.fire({
							icon: "warning",
							title: "Menunggu Pembayaran",
							text: "Pesanan belum dibayar. Silakan selesaikan pembayaran Anda.",
							confirmButtonText: "OK",
							confirmButtonColor: "#dc2626",
						});
						fetchProducts();
					},
					onError: () => {
						Swal.fire({
							icon: "error",
							title: "Pembayaran Gagal",
							text: "Pembayaran tidak berhasil. Pesanan dibatalkan.",
							confirmButtonText: "OK",
							confirmButtonColor: "#dc2626",
						});
						fetchProducts();
					},
					onClose: () => {
						Swal.fire({
							icon: "warning",
							title: "Pembayaran Belum Selesai",
							text: "Pesanan belum dibayar dan tidak akan diproses sampai pembayaran selesai.",
							confirmButtonText: "OK",
							confirmButtonColor: "#dc2626",
						});
						fetchProducts();
					},
				});
			} else {
				setCart([]);
				setShowCart(false);
				Swal.fire({
					icon: "success",
					title: "Pesanan Berhasil!",
					text: "Pesanan Anda telah dibuat",
					confirmButtonText: "OK",
					confirmButtonColor: "#dc2626",
				});
				fetchProducts();
			}
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

	const getImageUrl = (imageUrl: string | null): string => {
		if (!imageUrl) return "";
		if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;
		return `${config.api.backendUrl}${imageUrl}`;
	};

	const stockFilterOptions = [
		{ id: "all" as const, label: "Semua" },
		{ id: "available" as const, label: "Tersedia" },
		{ id: "limited" as const, label: "Stok Terbatas" },
	];

	const sortOptions = [
		{ id: "default" as const, label: "Default" },
		{ id: "price_low" as const, label: "Termurah" },
		{ id: "price_high" as const, label: "Termahal" },
		{ id: "newest" as const, label: "Terbaru" },
	];

	return (
		<div className="relative">
			{/* Search + Filters + Cart */}
			<div className="mb-6 space-y-4">
				{/* Search bar + Cart button */}
				<div className="flex items-center gap-3">
					<div className="relative flex-1">
						<LuSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
						<input
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Cari produk berdasarkan nama atau deskripsi..."
							className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-gray-100/80 dark:bg-white/[0.06] border border-gray-200/50 dark:border-white/[0.08] text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50 transition-colors"
						/>
						{search && (
							<button
								onClick={() => setSearch("")}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
							>
								<LuX className="w-4 h-4" />
							</button>
						)}
					</div>

					{isAuthenticated && (
						<button
							onClick={() => setShowCart(!showCart)}
							className="relative flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors text-sm font-medium"
						>
							<LuShoppingCart className="w-4 h-4" />
							<span className="hidden sm:inline">Keranjang</span>
							{cartCount > 0 && (
								<span className="absolute -top-2 -right-2 bg-white dark:bg-gray-900 text-red-600 text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold border-2 border-red-600">
									{cartCount}
								</span>
							)}
						</button>
					)}
				</div>

				{/* Filters row */}
				<div className="flex flex-wrap items-center gap-3">
					{/* Stock filter pills */}
					<div className="flex items-center gap-1.5">
						<span className="text-xs text-gray-500 dark:text-gray-400 mr-1">Stok:</span>
						{stockFilterOptions.map((opt) => (
							<button
								key={opt.id}
								onClick={() => setStockFilter(opt.id)}
								className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
									stockFilter === opt.id
										? "bg-red-500 text-white"
										: "bg-gray-200/60 dark:bg-white/[0.08] text-gray-600 dark:text-gray-300 hover:bg-gray-300/60 dark:hover:bg-white/[0.14]"
								}`}
							>
								{opt.label}
							</button>
						))}
					</div>

					<div className="w-px h-5 bg-gray-300/50 dark:bg-white/10 hidden sm:block" />

					{/* Sort options */}
					<div className="flex items-center gap-1.5">
						<span className="text-xs text-gray-500 dark:text-gray-400 mr-1">Urutkan:</span>
						{sortOptions.map((option) => (
							<button
								key={option.id}
								onClick={() => setSortBy(option.id)}
								className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all ${
									sortBy === option.id
										? "bg-red-500 text-white"
										: "bg-gray-200/60 dark:bg-white/[0.08] text-gray-600 dark:text-gray-300 hover:bg-gray-300/60 dark:hover:bg-white/[0.14]"
								}`}
							>
								{option.id === "default" && <LuArrowUpDown className="w-3.5 h-3.5" />}
								<span>{option.label}</span>
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Result info */}
			<p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
				{filteredAndSorted.length > 0
					? `Menampilkan ${filteredAndSorted.length} produk`
					: "Tidak ada produk yang ditemukan"}
			</p>

			{/* Cart Sidebar */}
			{showCart && (
				<div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowCart(false)}>
					<div className="absolute inset-0 bg-black/50" />
					<div
						className="relative w-full max-w-md bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl h-full overflow-y-auto shadow-xl border-l border-gray-200/50 dark:border-white/[0.06]"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="p-4 border-b border-gray-200/50 dark:border-white/[0.06] flex items-center justify-between">
							<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
								Keranjang ({cartCount})
							</h3>
							<button onClick={() => setShowCart(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
								<LuX className="w-5 h-5" />
							</button>
						</div>

						{cart.length === 0 ? (
							<div className="p-8 text-center text-gray-500 dark:text-gray-400">
								<LuShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
								<p>Keranjang kosong</p>
							</div>
						) : (
							<>
								<div className="p-4 space-y-3">
									{cart.map((item) => (
										<div
											key={item.product.id}
											className="flex items-center gap-3 p-3 bg-white/60 dark:bg-white/[0.03] rounded-xl border border-gray-200/50 dark:border-white/[0.06]"
										>
											<div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-white/[0.06] flex-shrink-0 overflow-hidden">
												{item.product.thumbnail && (
													<img
														src={getImageUrl(item.product.thumbnail)}
														alt={item.product.name}
														className="w-full h-full object-cover"
													/>
												)}
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium text-gray-900 dark:text-white truncate">
													{item.product.name}
												</p>
												<p className="text-xs text-red-600 dark:text-red-400">
													{formatCurrency(item.product.price)}
												</p>
											</div>
											<div className="flex items-center gap-1">
												<button
													onClick={() => updateCartQuantity(item.product.id, -1)}
													className="p-1 hover:bg-gray-200/60 dark:hover:bg-white/[0.08] rounded-lg"
												>
													<LuMinus className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
												</button>
												<span className="w-7 text-center text-sm font-medium text-gray-900 dark:text-white">
													{item.quantity}
												</span>
												<button
													onClick={() => updateCartQuantity(item.product.id, 1)}
													className="p-1 hover:bg-gray-200/60 dark:hover:bg-white/[0.08] rounded-lg"
												>
													<LuPlus className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
												</button>
											</div>
											<button
												onClick={() => removeFromCart(item.product.id)}
												className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
											>
												<LuTrash2 className="w-4 h-4" />
											</button>
										</div>
									))}
								</div>

								<div className="p-4 border-t border-gray-200/50 dark:border-white/[0.06]">
									<div className="flex justify-between mb-4">
										<span className="font-medium text-gray-700 dark:text-gray-300">Total</span>
										<span className="text-lg font-bold text-red-600 dark:text-red-400">
											{formatCurrency(cartTotal)}
										</span>
									</div>
									<button
										onClick={handleCheckout}
										disabled={ordering}
										className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl font-medium transition-colors"
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
				<div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
					{Array.from({ length: 25 }).map((_, i) => (
						<div
							key={i}
							className="rounded-xl bg-gray-200/50 dark:bg-white/[0.03] border border-gray-200/30 dark:border-white/[0.04] animate-pulse"
						>
							<div className="aspect-square" />
							<div className="p-2 space-y-1.5">
								<div className="h-2.5 bg-gray-300/50 dark:bg-white/[0.06] rounded w-3/4" />
								<div className="h-2 bg-gray-300/50 dark:bg-white/[0.06] rounded w-1/2" />
							</div>
						</div>
					))}
				</div>
			) : filteredAndSorted.length === 0 ? (
				<div className="text-center py-16">
					<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center">
						<LuPackage className="w-8 h-8 text-gray-400 dark:text-gray-500" />
					</div>
					<p className="text-gray-500 dark:text-gray-400 text-sm">
						{search ? "Tidak ada produk yang cocok" : "Belum ada produk tersedia"}
					</p>
				</div>
			) : (
				<>
					<div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
						{filteredAndSorted.map((product) => {
							const isOutOfStock = product.stock <= 0;

							return (
								<div
									key={product.id}
									onClick={() => !isOutOfStock && addToCart(product)}
									className={`group relative overflow-hidden rounded-xl border border-gray-200/70 bg-white shadow-md shadow-gray-200/80 transition-all duration-300 hover:scale-[1.02] hover:border-red-400/30 hover:shadow-lg hover:shadow-gray-300/80 dark:bg-white/[0.03] dark:border-white/[0.06] dark:shadow-none dark:hover:border-red-500/20 ${isOutOfStock ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
								>
									{/* Product image - square ratio */}
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
												<LuPackage className="w-6 h-6 text-gray-400/40 dark:text-gray-600" />
											</div>
										)}
										<div className="absolute top-1.5 left-1.5">
											<span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full backdrop-blur-sm ${
												isOutOfStock
													? "bg-gray-600/85 text-white"
													: product.stock <= 5
													? "bg-amber-500/85 text-white"
													: "bg-emerald-500/85 text-white"
											}`}>
												{isOutOfStock ? "Habis" : product.stock <= 5 ? `Sisa ${product.stock}` : "Tersedia"}
											</span>
										</div>
										{isOutOfStock && (
											<div className="absolute inset-0 bg-black/30 flex items-center justify-center">
												<span className="text-white text-xs font-bold bg-red-600/90 px-2 py-1 rounded-full">HABIS</span>
											</div>
										)}
										{!isOutOfStock && (
											<div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
												<span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-white/80 dark:bg-black/60 text-gray-700 dark:text-gray-200 backdrop-blur-sm">
													<LuShoppingCart className="w-3 h-3 inline mr-0.5" />
													Tambah
												</span>
											</div>
										)}
									</div>

									{/* Info */}
									<div className="flex min-h-[116px] flex-col p-2.5">
										<h4 className="text-[10px] lg:text-xs font-semibold text-gray-800 dark:text-white leading-tight line-clamp-2 mb-1.5">
											{product.name}
										</h4>
										{product.description && (
											<p className="text-[8px] lg:text-[9px] text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
												{product.description}
											</p>
										)}
										<div className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
											<LuPackage className="w-3 h-3 flex-shrink-0" />
											<span className="text-[8px] lg:text-[9px]">
												{product.stock > 0 ? `Stok: ${product.stock}` : "Stok Habis"}
											</span>
										</div>
										<div className="mt-auto pt-3">
											<p className="text-[11px] lg:text-sm font-bold text-red-600 dark:text-red-400">
												{formatCurrency(product.price)}
											</p>
										</div>
									</div>
								</div>
							);
						})}
					</div>

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex items-center justify-center gap-3 mt-8">
							<button
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								disabled={page === 1}
								className="w-8 h-8 rounded-full bg-gray-200/50 dark:bg-white/[0.06] border border-gray-300/50 dark:border-white/10 text-gray-500 dark:text-gray-400 flex items-center justify-center hover:bg-gray-300/50 dark:hover:bg-white/[0.12] transition-colors disabled:opacity-30 disabled:pointer-events-none"
							>
								<LuChevronLeft className="w-4 h-4" />
							</button>

							<div className="flex gap-1.5">
								{Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
									if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) {
										return (
											<button
												key={p}
												onClick={() => setPage(p)}
												className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
													p === page
														? "bg-red-500 text-white"
														: "bg-gray-200/50 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300 hover:bg-gray-300/50 dark:hover:bg-white/[0.12]"
												}`}
											>
												{p}
											</button>
										);
									} else if (p === page - 2 || p === page + 2) {
										return (
											<span key={p} className="w-8 h-8 flex items-center justify-center text-gray-400 dark:text-gray-500 text-xs">
												...
											</span>
										);
									}
									return null;
								})}
							</div>

							<button
								onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
								disabled={page === totalPages}
								className="w-8 h-8 rounded-full bg-gray-200/50 dark:bg-white/[0.06] border border-gray-300/50 dark:border-white/10 text-gray-500 dark:text-gray-400 flex items-center justify-center hover:bg-gray-300/50 dark:hover:bg-white/[0.12] transition-colors disabled:opacity-30 disabled:pointer-events-none"
							>
								<LuChevronRight className="w-4 h-4" />
							</button>
						</div>
					)}
				</>
			)}
		</div>
	);
};

export default MarketplaceTab;
