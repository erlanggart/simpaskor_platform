import React, { useState, useEffect } from "react";
import {
	ShoppingBagIcon,
	PlusIcon,
	PencilSquareIcon,
	TrashIcon,
	MagnifyingGlassIcon,
	XMarkIcon,
	PhotoIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../utils/api";
import { showSuccess, showError, showDeleteConfirm } from "../../utils/sweetalert";
import { Product } from "../../types/marketplace";

const ProductManagement: React.FC = () => {
	const [products, setProducts] = useState<Product[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [showModal, setShowModal] = useState(false);
	const [editingProduct, setEditingProduct] = useState<Product | null>(null);
	const [formData, setFormData] = useState({
		name: "",
		description: "",
		price: "",
		stock: "",
	});
	const [thumbnail, setThumbnail] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const fetchProducts = async () => {
		try {
			setLoading(true);
			const params: any = { page, limit: 20 };
			if (search) params.search = search;
			if (statusFilter) params.status = statusFilter;
			const res = await api.get("/products/admin/all", { params });
			setProducts(res.data.data || []);
			setTotalPages(res.data.totalPages || 1);
		} catch (err) {
			showError("Gagal memuat produk");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchProducts();
	}, [page, statusFilter]);

	useEffect(() => {
		const timeout = setTimeout(() => {
			setPage(1);
			fetchProducts();
		}, 300);
		return () => clearTimeout(timeout);
	}, [search]);

	const openCreateModal = () => {
		setEditingProduct(null);
		setFormData({ name: "", description: "", price: "", stock: "" });
		setThumbnail(null);
		setPreviewUrl(null);
		setShowModal(true);
	};

	const openEditModal = (product: Product) => {
		setEditingProduct(product);
		setFormData({
			name: product.name,
			description: product.description || "",
			price: product.price.toString(),
			stock: product.stock.toString(),
		});
		setThumbnail(null);
		setPreviewUrl(product.thumbnail ? getImageUrl(product.thumbnail) : null);
		setShowModal(true);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.name.trim()) {
			showError("Nama produk wajib diisi", "Validasi");
			return;
		}
		if (!formData.price || parseFloat(formData.price) < 0) {
			showError("Harga harus valid", "Validasi");
			return;
		}

		setSubmitting(true);
		try {
			const data = new FormData();
			data.append("name", formData.name);
			data.append("description", formData.description);
			data.append("price", formData.price);
			data.append("stock", formData.stock || "0");
			if (thumbnail) data.append("thumbnail", thumbnail);

			if (editingProduct) {
				await api.put(`/products/${editingProduct.id}`, data, {
					headers: { "Content-Type": "multipart/form-data" },
				});
				showSuccess("Produk berhasil diupdate");
			} else {
				await api.post("/products", data, {
					headers: { "Content-Type": "multipart/form-data" },
				});
				showSuccess("Produk berhasil ditambahkan");
			}

			setShowModal(false);
			fetchProducts();
		} catch (err: any) {
			showError(err.response?.data?.error || "Gagal menyimpan produk");
		} finally {
			setSubmitting(false);
		}
	};

	const handleDelete = async (product: Product) => {
		const result = await showDeleteConfirm(
			`Hapus produk "${product.name}"?`,
			"Produk dengan pesanan terkait akan dinonaktifkan"
		);
		if (!result.isConfirmed) return;

		try {
			await api.delete(`/products/${product.id}`);
			showSuccess("Produk berhasil dihapus/dinonaktifkan");
			fetchProducts();
		} catch (err) {
			showError("Gagal menghapus produk");
		}
	};

	const handleStockUpdate = async (productId: string, newStock: number) => {
		try {
			await api.patch(`/products/${productId}/stock`, { stock: newStock });
			fetchProducts();
		} catch (err) {
			showError("Gagal mengupdate stok");
		}
	};

	const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setThumbnail(file);
			setPreviewUrl(URL.createObjectURL(file));
		}
	};

	const getImageUrl = (path: string | null) => {
		if (!path) return null;
		if (path.startsWith("http")) return path;
		return `${import.meta.env.VITE_BACKEND_URL || ""}${path}`;
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("id-ID", {
			style: "currency",
			currency: "IDR",
			minimumFractionDigits: 0,
		}).format(amount);
	};

	const getStatusBadge = (status: string) => {
		const styles: Record<string, string> = {
			ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
			INACTIVE: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400",
			OUT_OF_STOCK: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
		};
		const labels: Record<string, string> = {
			ACTIVE: "Aktif",
			INACTIVE: "Nonaktif",
			OUT_OF_STOCK: "Habis",
		};
		return (
			<span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || ""}`}>
				{labels[status] || status}
			</span>
		);
	};

	return (
		<div className="p-6">
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-3">
					<ShoppingBagIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
					<div>
						<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manajemen Produk</h1>
						<p className="text-sm text-gray-500 dark:text-gray-400">Kelola produk dan stok marketplace</p>
					</div>
				</div>
				<button
					onClick={openCreateModal}
					className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
				>
					<PlusIcon className="w-5 h-5" />
					Tambah Produk
				</button>
			</div>

			{/* Filters */}
			<div className="flex flex-col sm:flex-row gap-3 mb-6">
				<div className="relative flex-1">
					<MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
					<input
						type="text"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Cari produk..."
						className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
					/>
				</div>
				<select
					value={statusFilter}
					onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
					className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm text-gray-900 dark:text-white"
				>
					<option value="">Semua Status</option>
					<option value="ACTIVE">Aktif</option>
					<option value="INACTIVE">Nonaktif</option>
					<option value="OUT_OF_STOCK">Habis</option>
				</select>
			</div>

			{/* Table */}
			{loading ? (
				<div className="flex justify-center py-12">
					<div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
				</div>
			) : products.length === 0 ? (
				<div className="text-center py-12 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg">
					<ShoppingBagIcon className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
					<p className="text-gray-500 dark:text-gray-400">Belum ada produk</p>
				</div>
			) : (
				<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
							<thead className="bg-gray-50 dark:bg-gray-900">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Produk</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Harga</th>
									<th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Stok</th>
									<th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Pesanan</th>
									<th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
									<th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Aksi</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-200 dark:divide-gray-700">
								{products.map((product) => (
									<tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
										<td className="px-4 py-3">
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 rounded bg-gray-200 dark:bg-gray-600 flex-shrink-0 overflow-hidden">
													{product.thumbnail ? (
														<img
															src={getImageUrl(product.thumbnail) || ""}
															alt={product.name}
															className="w-full h-full object-cover"
														/>
													) : (
														<div className="flex items-center justify-center h-full">
															<PhotoIcon className="w-5 h-5 text-gray-400" />
														</div>
													)}
												</div>
												<div>
													<p className="font-medium text-gray-900 dark:text-white text-sm">{product.name}</p>
													{product.description && (
														<p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
															{product.description}
														</p>
													)}
												</div>
											</div>
										</td>
										<td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
											{formatCurrency(product.price)}
										</td>
										<td className="px-4 py-3">
											<div className="flex items-center justify-center gap-1">
												<button
													onClick={() => handleStockUpdate(product.id, Math.max(0, product.stock - 1))}
													className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300"
												>
													-
												</button>
												<input
													type="number"
													value={product.stock}
													onChange={(e) => {
														const val = parseInt(e.target.value);
														if (!isNaN(val) && val >= 0) handleStockUpdate(product.id, val);
													}}
													className="w-16 text-center text-sm border border-gray-300 dark:border-gray-600 rounded bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white"
													min="0"
												/>
												<button
													onClick={() => handleStockUpdate(product.id, product.stock + 1)}
													className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300"
												>
													+
												</button>
											</div>
										</td>
										<td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
											{product._count?.orderItems || 0}
										</td>
										<td className="px-4 py-3 text-center">
											{getStatusBadge(product.status)}
										</td>
										<td className="px-4 py-3">
											<div className="flex items-center justify-center gap-2">
												<button
													onClick={() => openEditModal(product)}
													className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
													title="Edit"
												>
													<PencilSquareIcon className="w-5 h-5" />
												</button>
												<button
													onClick={() => handleDelete(product)}
													className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
													title="Hapus"
												>
													<TrashIcon className="w-5 h-5" />
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex items-center justify-between px-4 py-3 border-t border-gray-200/60 dark:border-gray-700/40">
							<p className="text-sm text-gray-500 dark:text-gray-400">Halaman {page} dari {totalPages}</p>
							<div className="flex gap-2">
								<button
									onClick={() => setPage(Math.max(1, page - 1))}
									disabled={page === 1}
									className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
								>
									Prev
								</button>
								<button
									onClick={() => setPage(Math.min(totalPages, page + 1))}
									disabled={page === totalPages}
									className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
								>
									Next
								</button>
							</div>
						</div>
					)}
				</div>
			)}

			{/* Create/Edit Modal */}
			{showModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
					<div className="absolute inset-0 bg-black/50" />
					<div
						className="relative bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="p-6 border-b border-gray-200/60 dark:border-gray-700/40 flex items-center justify-between">
							<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
								{editingProduct ? "Edit Produk" : "Tambah Produk"}
							</h2>
							<button onClick={() => setShowModal(false)}>
								<XMarkIcon className="w-6 h-6 text-gray-400 hover:text-gray-600" />
							</button>
						</div>

						<form onSubmit={handleSubmit} className="p-6 space-y-4">
							{/* Thumbnail */}
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									Gambar Produk
								</label>
								<div className="flex items-center gap-4">
									{previewUrl ? (
										<img src={previewUrl} alt="Preview" className="w-20 h-20 rounded-lg object-cover" />
									) : (
										<div className="w-20 h-20 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
											<PhotoIcon className="w-8 h-8 text-gray-400" />
										</div>
									)}
									<label className="cursor-pointer px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300">
										Pilih Gambar
										<input type="file" accept="image/*" onChange={handleThumbnailChange} className="hidden" />
									</label>
								</div>
							</div>

							{/* Name */}
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									Nama Produk *
								</label>
								<input
									type="text"
									value={formData.name}
									onChange={(e) => setFormData({ ...formData, name: e.target.value })}
									className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
									required
								/>
							</div>

							{/* Description */}
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									Deskripsi
								</label>
								<textarea
									value={formData.description}
									onChange={(e) => setFormData({ ...formData, description: e.target.value })}
									rows={3}
									className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
								/>
							</div>

							{/* Price & Stock */}
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
										Harga (Rp) *
									</label>
									<input
										type="number"
										value={formData.price}
										onChange={(e) => setFormData({ ...formData, price: e.target.value })}
										className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
										min="0"
										required
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
										Stok
									</label>
									<input
										type="number"
										value={formData.stock}
										onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
										className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
										min="0"
									/>
								</div>
							</div>

							{/* Actions */}
							<div className="flex justify-end gap-3 pt-4">
								<button
									type="button"
									onClick={() => setShowModal(false)}
									className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
								>
									Batal
								</button>
								<button
									type="submit"
									disabled={submitting}
									className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors"
								>
									{submitting ? "Menyimpan..." : editingProduct ? "Update" : "Simpan"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
};

export default ProductManagement;
