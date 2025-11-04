import React, { useState, useEffect } from "react";
import { api } from "../../utils/api";
import {
	PlusIcon,
	PencilIcon,
	TrashIcon,
	XMarkIcon,
	ChartBarIcon,
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
			const response = await api.get("/api/assessment-categories");
			setCategories(response.data);
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
			setFormData({
				name: "",
				description: "",
				order: categories.length,
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
				await api.post("/api/assessment-categories", formData);
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

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-gray-600">Memuat data...</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">
						Kelola Kategori Penilaian
					</h1>
					<p className="text-gray-600 mt-1">
						Kelola kategori penilaian lomba (PBB, Komandan, Variasi, Formasi,
						dll)
					</p>
				</div>
				<button
					onClick={() => handleOpenModal()}
					className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
				>
					<PlusIcon className="w-5 h-5" />
					Tambah Kategori
				</button>
			</div>

			{categories.length === 0 ? (
				<div className="bg-white rounded-lg shadow p-12 text-center">
					<ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
					<h3 className="text-lg font-medium text-gray-900 mb-2">
						Belum Ada Kategori Penilaian
					</h3>
					<p className="text-gray-600 mb-6">
						Mulai dengan menambahkan kategori penilaian untuk lomba
					</p>
					<button
						onClick={() => handleOpenModal()}
						className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
					>
						<PlusIcon className="w-5 h-5" />
						Tambah Kategori Pertama
					</button>
				</div>
			) : (
				<div className="bg-white rounded-lg shadow overflow-hidden">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Urutan
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Nama Kategori
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Deskripsi
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Status
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Aksi
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{categories.map((category) => (
								<tr key={category.id} className="hover:bg-gray-50">
									<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
										{category.order}
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<div className="text-sm font-medium text-gray-900">
											{category.name}
										</div>
									</td>
									<td className="px-6 py-4 text-sm text-gray-600">
										{category.description || "-"}
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<span
											className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
												category.isActive
													? "bg-green-100 text-green-800"
													: "bg-red-100 text-red-800"
											}`}
										>
											{category.isActive ? "Aktif" : "Nonaktif"}
										</span>
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
										<button
											onClick={() => handleOpenModal(category)}
											className="text-indigo-600 hover:text-indigo-900"
											title="Edit"
										>
											<PencilIcon className="w-5 h-5" />
										</button>
										<button
											onClick={() => handleDelete(category.id, category.name)}
											className="text-red-600 hover:text-red-900"
											title="Hapus"
										>
											<TrashIcon className="w-5 h-5" />
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Modal */}
			{showModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
					<div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
						<div className="p-6">
							<div className="flex justify-between items-center mb-6">
								<h2 className="text-xl font-bold text-gray-900">
									{editingId
										? "Edit Kategori Penilaian"
										: "Tambah Kategori Penilaian"}
								</h2>
								<button
									onClick={handleCloseModal}
									className="text-gray-400 hover:text-gray-600"
								>
									<XMarkIcon className="w-6 h-6" />
								</button>
							</div>

							<form onSubmit={handleSubmit} className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Nama Kategori <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										value={formData.name}
										onChange={(e) =>
											setFormData({ ...formData, name: e.target.value })
										}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
										placeholder="Contoh: PBB, KOMANDAN, VARIASI"
										required
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Deskripsi
									</label>
									<textarea
										value={formData.description}
										onChange={(e) =>
											setFormData({ ...formData, description: e.target.value })
										}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
										placeholder="Deskripsi kategori penilaian"
										rows={3}
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Urutan Tampilan
									</label>
									<input
										type="number"
										value={formData.order}
										onChange={(e) =>
											setFormData({
												...formData,
												order: parseInt(e.target.value),
											})
										}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
										min="0"
									/>
									<p className="text-sm text-gray-500 mt-1">
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
										className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
									/>
									<label
										htmlFor="isActive"
										className="ml-2 text-sm text-gray-700"
									>
										Kategori Aktif
									</label>
								</div>

								<div className="flex gap-3 pt-4">
									<button
										type="button"
										onClick={handleCloseModal}
										className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
									>
										Batal
									</button>
									<button
										type="submit"
										className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
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
