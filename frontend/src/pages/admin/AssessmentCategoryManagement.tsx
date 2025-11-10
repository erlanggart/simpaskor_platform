import React, { useState, useEffect } from "react";
import { api } from "../../utils/api";
import {
	PlusIcon,
	PencilIcon,
	TrashIcon,
	XMarkIcon,
	ChartBarIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
} from "@heroicons/react/24/outline";
import {
	showSuccess,
	showError,
	showDeleteConfirm,
} from "../../utils/sweetalert";

interface AssessmentCategory {
	id: string;
	name: string;
	description: string | null;
	order: number;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

interface FormData {
	name: string;
	description: string;
	order: number;
	isActive: boolean;
}

const AssessmentCategoryManagement: React.FC = () => {
	const [categories, setCategories] = useState<AssessmentCategory[]>([]);
	const [loading, setLoading] = useState(true);
	const [showModal, setShowModal] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);

	// Pagination states
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);

	const [formData, setFormData] = useState<FormData>({
		name: "",
		description: "",
		order: 0,
		isActive: true,
	});

	useEffect(() => {
		fetchCategories();
	}, []);

	const fetchCategories = async () => {
		try {
			const response = await api.get("/assessment-categories");
			// Sort by order ascending (smallest first)
			const sortedCategories = (response.data || []).sort(
				(a: AssessmentCategory, b: AssessmentCategory) => a.order - b.order
			);
			setCategories(sortedCategories);
		} catch (error) {
			console.error("Error fetching assessment categories:", error);
			showError("Gagal memuat kategori penilaian");
		} finally {
			setLoading(false);
		}
	};

	const handleOpenModal = (category?: AssessmentCategory) => {
		if (category) {
			setEditingId(category.id);
			setFormData({
				name: category.name,
				description: category.description || "",
				order: category.order,
				isActive: category.isActive,
			});
		} else {
			setEditingId(null);
			// Set default order to next available number
			const maxOrder =
				categories.length > 0 ? Math.max(...categories.map((c) => c.order)) : 0;
			setFormData({
				name: "",
				description: "",
				order: maxOrder + 1,
				isActive: true,
			});
		}
		setShowModal(true);
	};

	const handleCloseModal = () => {
		setShowModal(false);
		setEditingId(null);
		setFormData({
			name: "",
			description: "",
			order: 0,
			isActive: true,
		});
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.name.trim()) {
			showError("Nama kategori harus diisi", "Validasi");
			return;
		}

		try {
			if (editingId) {
				await api.put(`/api/assessment-categories/${editingId}`, formData);
				showSuccess("Kategori penilaian berhasil diupdate");
			} else {
				await api.post("/assessment-categories", formData);
				showSuccess("Kategori penilaian berhasil ditambahkan");
			}

			fetchCategories();
			handleCloseModal();
		} catch (error: any) {
			console.error("Error saving assessment category:", error);
			showError(
				error.response?.data?.error || "Gagal menyimpan kategori penilaian"
			);
		}
	};

	const handleDelete = async (id: string, name: string) => {
		const result = await showDeleteConfirm(`kategori "${name}"`);
		if (!result.isConfirmed) {
			return;
		}

		try {
			await api.delete(`/api/assessment-categories/${id}`);
			showSuccess("Kategori penilaian berhasil dihapus");
			fetchCategories();
		} catch (error: any) {
			console.error("Error deleting assessment category:", error);
			showError(
				error.response?.data?.message || "Gagal menghapus kategori penilaian"
			);
		}
	};

	// Pagination calculations
	const totalPages = Math.ceil(categories.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const paginatedCategories = categories.slice(startIndex, endIndex);

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const handleItemsPerPageChange = (value: number) => {
		setItemsPerPage(value);
		setCurrentPage(1);
	};

	// Generate page numbers to display
	const getPageNumbers = () => {
		const pages: (number | string)[] = [];
		const maxVisiblePages = 5;

		if (totalPages <= maxVisiblePages) {
			for (let i = 1; i <= totalPages; i++) {
				pages.push(i);
			}
		} else {
			pages.push(1);

			if (currentPage > 3) {
				pages.push("...");
			}

			const start = Math.max(2, currentPage - 1);
			const end = Math.min(totalPages - 1, currentPage + 1);

			for (let i = start; i <= end; i++) {
				pages.push(i);
			}

			if (currentPage < totalPages - 2) {
				pages.push("...");
			}

			pages.push(totalPages);
		}

		return pages;
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-gray-600 dark:text-gray-400">Memuat data...</div>
			</div>
		);
	}

	return (
		<div className="space-y-6 p-6">
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
						Kelola Kategori Penilaian
					</h1>
					<p className="text-gray-600 dark:text-gray-400 mt-1">
						Kelola kategori penilaian lomba (PBB, Komandan, Variasi, Formasi,
						dll)
					</p>
				</div>
				<div className="flex items-center gap-4">
					{categories.length > 0 && (
						<div className="flex items-center gap-2">
							<span className="text-sm text-gray-600 dark:text-gray-400">
								Per halaman:
							</span>
							<select
								value={itemsPerPage}
								onChange={(e) =>
									handleItemsPerPageChange(Number(e.target.value))
								}
								className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
							>
								<option value={5}>5</option>
								<option value={10}>10</option>
								<option value={25}>25</option>
								<option value={50}>50</option>
							</select>
						</div>
					)}
					<button
						onClick={() => handleOpenModal()}
						className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
					>
						<PlusIcon className="w-5 h-5" />
						Tambah Kategori
					</button>
				</div>
			</div>

			{categories.length === 0 ? (
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-12 text-center">
					<ChartBarIcon className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
					<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
						Belum Ada Kategori Penilaian
					</h3>
					<p className="text-gray-600 dark:text-gray-400 mb-6">
						Mulai dengan menambahkan kategori penilaian untuk lomba
					</p>
					<button
						onClick={() => handleOpenModal()}
						className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
					>
						<PlusIcon className="w-5 h-5" />
						Tambah Kategori Pertama
					</button>
				</div>
			) : (
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 overflow-hidden">
					<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
						<thead className="bg-gray-50 dark:bg-gray-700">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									Urutan
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									Nama Kategori
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									Deskripsi
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									Status
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									Aksi
								</th>
							</tr>
						</thead>
						<tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
							{paginatedCategories.map((category) => (
								<tr
									key={category.id}
									className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
								>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
										{category.order}
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<div className="text-sm font-medium text-gray-900 dark:text-white">
											{category.name}
										</div>
									</td>
									<td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
										{category.description || "-"}
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<span
											className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
												category.isActive
													? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
													: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400"
											}`}
										>
											{category.isActive ? "Aktif" : "Nonaktif"}
										</span>
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
										<button
											onClick={() => handleOpenModal(category)}
											className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
											title="Edit"
										>
											<PencilIcon className="w-5 h-5" />
										</button>
										<button
											onClick={() => handleDelete(category.id, category.name)}
											className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
											title="Hapus"
										>
											<TrashIcon className="w-5 h-5" />
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="bg-white dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
							<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
								{/* Info */}
								<div className="text-sm text-gray-600 dark:text-gray-400">
									Menampilkan{" "}
									<span className="font-medium text-gray-900 dark:text-white">
										{startIndex + 1}
									</span>{" "}
									-{" "}
									<span className="font-medium text-gray-900 dark:text-white">
										{Math.min(endIndex, categories.length)}
									</span>{" "}
									dari{" "}
									<span className="font-medium text-gray-900 dark:text-white">
										{categories.length}
									</span>{" "}
									kategori
								</div>

								{/* Pagination Controls */}
								<div className="flex items-center gap-2">
									{/* Previous Button */}
									<button
										onClick={() => handlePageChange(currentPage - 1)}
										disabled={currentPage === 1}
										className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
										aria-label="Previous page"
									>
										<ChevronLeftIcon className="w-5 h-5" />
									</button>

									{/* Page Numbers */}
									<div className="flex items-center gap-1">
										{getPageNumbers().map((page, index) => (
											<React.Fragment key={index}>
												{page === "..." ? (
													<span className="px-3 py-2 text-gray-400 dark:text-gray-500">
														...
													</span>
												) : (
													<button
														onClick={() => handlePageChange(page as number)}
														className={`min-w-[40px] px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
															currentPage === page
																? "bg-red-600 dark:bg-red-500 text-white"
																: "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
														}`}
													>
														{page}
													</button>
												)}
											</React.Fragment>
										))}
									</div>

									{/* Next Button */}
									<button
										onClick={() => handlePageChange(currentPage + 1)}
										disabled={currentPage === totalPages}
										className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
										aria-label="Next page"
									>
										<ChevronRightIcon className="w-5 h-5" />
									</button>
								</div>
							</div>
						</div>
					)}
				</div>
			)}

			{/* Modal */}
			{showModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-4 z-50">
					<div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
						<div className="p-6">
							<div className="flex justify-between items-center mb-6">
								<h2 className="text-xl font-bold text-gray-900 dark:text-white">
									{editingId
										? "Edit Kategori Penilaian"
										: "Tambah Kategori Penilaian"}
								</h2>
								<button
									onClick={handleCloseModal}
									className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
								>
									<XMarkIcon className="w-6 h-6" />
								</button>
							</div>

							<form onSubmit={handleSubmit} className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
										Nama Kategori <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										value={formData.name}
										onChange={(e) =>
											setFormData({ ...formData, name: e.target.value })
										}
										className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
										placeholder="Contoh: PBB, KOMANDAN, VARIASI"
										required
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
										Deskripsi
									</label>
									<textarea
										value={formData.description}
										onChange={(e) =>
											setFormData({ ...formData, description: e.target.value })
										}
										className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
										placeholder="Deskripsi kategori penilaian"
										rows={3}
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
										Urutan Tampilan
									</label>
									<input
										type="number"
										value={formData.order}
										onChange={(e) =>
											setFormData({
												...formData,
												order: parseInt(e.target.value) || 0,
											})
										}
										className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
										min="0"
										required
									/>
									<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
										Menentukan urutan tampilan kategori (angka kecil di atas)
									</p>
								</div>

								<div className="flex items-center">
									<input
										type="checkbox"
										id="isActive"
										checked={formData.isActive}
										onChange={(e) =>
											setFormData({ ...formData, isActive: e.target.checked })
										}
										className="w-4 h-4 text-red-600 dark:text-red-500 border-gray-300 dark:border-gray-600 rounded focus:ring-red-500 dark:focus:ring-red-400"
									/>
									<label
										htmlFor="isActive"
										className="ml-2 text-sm text-gray-700 dark:text-gray-300"
									>
										Kategori Aktif
									</label>
								</div>

								<div className="flex gap-3 pt-4">
									<button
										type="button"
										onClick={handleCloseModal}
										className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
									>
										Batal
									</button>
									<button
										type="submit"
										className="flex-1 px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
									>
										{editingId ? "Update" : "Tambah"}
									</button>
								</div>
							</form>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default AssessmentCategoryManagement;
