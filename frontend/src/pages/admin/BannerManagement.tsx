import React, { useState, useEffect } from "react";
import {
	PhotoIcon,
	PlusIcon,
	TrashIcon,
	PencilIcon,
	MagnifyingGlassIcon,
	EyeIcon,
	EyeSlashIcon,
	LinkIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../utils/api";
import {
	showSuccess,
	showError,
	showDeleteConfirm,
} from "../../utils/sweetalert";

interface Banner {
	id: string;
	title: string;
	description: string | null;
	imageUrl: string;
	linkUrl: string | null;
	buttonText: string | null;
	order: number;
	isActive: boolean;
	startDate: string | null;
	endDate: string | null;
	createdAt: string;
	updatedAt: string;
}

const BannerManagement: React.FC = () => {
	const [banners, setBanners] = useState<Banner[]>([]);
	const [loading, setLoading] = useState(true);
	const [showModal, setShowModal] = useState(false);
	const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [filterActive, setFilterActive] = useState<string>("ALL");
	const [uploading, setUploading] = useState(false);
	const [dragActive, setDragActive] = useState(false);

	const [formData, setFormData] = useState({
		title: "",
		description: "",
		imageUrl: "",
		linkUrl: "",
		buttonText: "",
		order: 0,
		isActive: true,
		startDate: "",
		endDate: "",
	});

	const [submitLoading, setSubmitLoading] = useState(false);

	useEffect(() => {
		fetchBanners();
	}, []);

	// Helper function to get full image URL
	const getImageUrl = (imageUrl: string) => {
		if (!imageUrl) return "";
		// If already a full URL, return as is
		if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
			return imageUrl;
		}
		// Otherwise, prepend backend URL
		return `http://localhost:3001${imageUrl}`;
	};

	const fetchBanners = async () => {
		try {
			setLoading(true);
			const response = await api.get("/banners/all");
			setBanners(response.data);
		} catch (error) {
			console.error("Error fetching banners:", error);
			showError("Gagal memuat data banner");
		} finally {
			setLoading(false);
		}
	};

	const resetForm = () => {
		setFormData({
			title: "",
			description: "",
			imageUrl: "",
			linkUrl: "",
			buttonText: "",
			order: 0,
			isActive: true,
			startDate: "",
			endDate: "",
		});
		setEditingBanner(null);
	};

	const handleFileUpload = async (file: File) => {
		// Validate file type
		const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
		if (!allowedTypes.includes(file.type)) {
			showError(
				"File harus berupa JPG, JPEG, atau PNG",
				"Tipe File Tidak Valid"
			);
			return;
		}

		// Validate file size (10MB)
		if (file.size > 10 * 1024 * 1024) {
			showError("Ukuran file maksimal 10MB", "File Terlalu Besar");
			return;
		}

		setUploading(true);
		const formData = new FormData();
		formData.append("image", file);

		try {
			const response = await api.post("/banners/upload", formData, {
				headers: {
					"Content-Type": "multipart/form-data",
				},
			});

			// Save relative path to database for preview
			const relativePath = response.data.imageUrl;
			setFormData((prev) => ({ ...prev, imageUrl: relativePath }));
			showSuccess("Gambar berhasil diupload!");
		} catch (error: any) {
			console.error("Error uploading image:", error);
			showError(error.response?.data?.message || "Gagal mengupload gambar");
		} finally {
			setUploading(false);
		}
	};

	const handleDrag = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (e.type === "dragenter" || e.type === "dragover") {
			setDragActive(true);
		} else if (e.type === "dragleave") {
			setDragActive(false);
		}
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setDragActive(false);

		if (e.dataTransfer.files && e.dataTransfer.files[0]) {
			handleFileUpload(e.dataTransfer.files[0]);
		}
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			handleFileUpload(e.target.files[0]);
		}
	};

	const handleOpenModal = (banner?: Banner) => {
		if (banner) {
			setEditingBanner(banner);

			// Format dates properly - handle null/undefined safely
			const formattedStartDate: string =
				(banner.startDate
					? new Date(banner.startDate as string).toISOString().split("T")[0]
					: "") || "";

			const formattedEndDate: string =
				(banner.endDate
					? new Date(banner.endDate as string).toISOString().split("T")[0]
					: "") || "";

			setFormData({
				title: banner.title,
				description: banner.description || "",
				imageUrl: banner.imageUrl,
				linkUrl: banner.linkUrl || "",
				buttonText: banner.buttonText || "",
				order: banner.order,
				isActive: banner.isActive,
				startDate: formattedStartDate,
				endDate: formattedEndDate,
			});
		} else {
			resetForm();
		}
		setShowModal(true);
	};

	const handleCloseModal = () => {
		setShowModal(false);
		resetForm();
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.title.trim()) {
			showError("Judul banner wajib diisi", "Validasi");
			return;
		}

		if (!formData.imageUrl.trim()) {
			showError("Gambar banner wajib diupload", "Validasi");
			return;
		}

		setSubmitLoading(true);
		try {
			const submitData = {
				title: formData.title,
				description: formData.description || null,
				imageUrl: formData.imageUrl,
				linkUrl: formData.linkUrl || null,
				buttonText: formData.buttonText || null,
				order: formData.order,
				isActive: formData.isActive,
				startDate: formData.startDate || null,
				endDate: formData.endDate || null,
			};

			if (editingBanner) {
				await api.patch(`api/banners/${editingBanner.id}`, submitData);
				showSuccess("Banner berhasil diperbarui!");
			} else {
				await api.post("/banners", submitData);
				showSuccess("Banner berhasil dibuat!");
			}

			handleCloseModal();
			fetchBanners();
		} catch (error: any) {
			console.error("Error saving banner:", error);
			showError(error.response?.data?.message || "Gagal menyimpan banner");
		} finally {
			setSubmitLoading(false);
		}
	};

	const handleDelete = async (id: string, title: string) => {
		const result = await showDeleteConfirm(`banner "${title}"`);
		if (!result.isConfirmed) {
			return;
		}

		try {
			await api.delete(`api/banners/${id}`);
			showSuccess("Banner berhasil dihapus");
			fetchBanners();
		} catch (error: any) {
			console.error("Error deleting banner:", error);
			showError(error.response?.data?.message || "Gagal menghapus banner");
		}
	};

	const handleToggleActive = async (banner: Banner) => {
		try {
			await api.patch(`api/banners/${banner.id}`, {
				isActive: !banner.isActive,
			});
			showSuccess(
				`Banner ${!banner.isActive ? "diaktifkan" : "dinonaktifkan"}`
			);
			fetchBanners();
		} catch (error: any) {
			console.error("Error toggling banner:", error);
			showError("Gagal mengubah status banner");
		}
	};

	const filteredBanners = banners.filter((banner) => {
		const matchesSearch =
			banner.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			(banner.description &&
				banner.description.toLowerCase().includes(searchTerm.toLowerCase()));

		const matchesFilter =
			filterActive === "ALL" ||
			(filterActive === "ACTIVE" && banner.isActive) ||
			(filterActive === "INACTIVE" && !banner.isActive);

		return matchesSearch && matchesFilter;
	});

	if (loading) {
		return (
			<div className="flex justify-center items-center h-64">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Manajemen Banner</h1>
					<p className="text-sm text-gray-600 mt-1">
						Kelola banner untuk landing page
					</p>
				</div>
				<button
					onClick={() => handleOpenModal()}
					className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
				>
					<PlusIcon className="w-5 h-5" />
					Tambah Banner
				</button>
			</div>

			{/* Filters */}
			<div className="bg-white rounded-lg shadow p-4">
				<div className="flex flex-col sm:flex-row gap-4">
					<div className="flex-1">
						<div className="relative">
							<MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
							<input
								type="text"
								placeholder="Cari banner..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							/>
						</div>
					</div>
					<div className="flex gap-2">
						<button
							onClick={() => setFilterActive("ALL")}
							className={`px-4 py-2 rounded-lg font-medium transition-colors ${
								filterActive === "ALL"
									? "bg-indigo-600 text-white shadow-md"
									: "bg-gray-100 text-gray-700 hover:bg-gray-200"
							}`}
						>
							Semua
						</button>
						<button
							onClick={() => setFilterActive("ACTIVE")}
							className={`px-4 py-2 rounded-lg font-medium transition-colors ${
								filterActive === "ACTIVE"
									? "bg-indigo-600 text-white shadow-md"
									: "bg-gray-100 text-gray-700 hover:bg-gray-200"
							}`}
						>
							Aktif
						</button>
						<button
							onClick={() => setFilterActive("INACTIVE")}
							className={`px-4 py-2 rounded-lg font-medium transition-colors ${
								filterActive === "INACTIVE"
									? "bg-indigo-600 text-white shadow-md"
									: "bg-gray-100 text-gray-700 hover:bg-gray-200"
							}`}
						>
							Nonaktif
						</button>
					</div>
				</div>
			</div>

			{/* Banners Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{filteredBanners.length === 0 ? (
					<div className="col-span-full text-center py-12 bg-white rounded-lg shadow">
						<PhotoIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
						<p className="text-gray-500">
							{searchTerm || filterActive !== "ALL"
								? "Tidak ada banner yang ditemukan"
								: "Belum ada banner. Klik 'Tambah Banner' untuk membuat banner baru."}
						</p>
					</div>
				) : (
					filteredBanners.map((banner) => (
						<div
							key={banner.id}
							className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow"
						>
							<div className="relative h-48 bg-gray-200">
								<img
									src={getImageUrl(banner.imageUrl)}
									alt={banner.title}
									className="w-full h-full object-cover"
									onError={(e) => {
										e.currentTarget.src =
											"https://via.placeholder.com/400x200?text=Image+Not+Found";
									}}
								/>
								<div className="absolute top-2 right-2 flex gap-2">
									<span
										className={`px-2 py-1 text-xs font-semibold rounded ${
											banner.isActive
												? "bg-green-100 text-green-800"
												: "bg-gray-100 text-gray-800"
										}`}
									>
										{banner.isActive ? "Aktif" : "Nonaktif"}
									</span>
									<span className="px-2 py-1 text-xs font-semibold bg-indigo-100 text-indigo-800 rounded">
										Urutan: {banner.order}
									</span>
								</div>
							</div>
							<div className="p-4">
								<h3 className="font-semibold text-gray-900 mb-2 truncate">
									{banner.title}
								</h3>
								{banner.description && (
									<p className="text-sm text-gray-600 mb-3 line-clamp-2">
										{banner.description}
									</p>
								)}
								{banner.linkUrl && (
									<div className="flex items-center gap-1 text-xs text-indigo-600 mb-3">
										<LinkIcon className="w-4 h-4" />
										<span className="truncate">{banner.linkUrl}</span>
									</div>
								)}
								{(banner.startDate || banner.endDate) && (
									<div className="text-xs text-gray-500 mb-3">
										{banner.startDate && (
											<div>
												Mulai:{" "}
												{new Date(banner.startDate).toLocaleDateString("id-ID")}
											</div>
										)}
										{banner.endDate && (
											<div>
												Sampai:{" "}
												{new Date(banner.endDate).toLocaleDateString("id-ID")}
											</div>
										)}
									</div>
								)}
								<div className="flex gap-2">
									<button
										onClick={() => handleToggleActive(banner)}
										className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
											banner.isActive
												? "bg-gray-100 text-gray-700 hover:bg-gray-200"
												: "bg-green-100 text-green-700 hover:bg-green-200"
										}`}
									>
										{banner.isActive ? (
											<>
												<EyeSlashIcon className="w-4 h-4" />
												Nonaktifkan
											</>
										) : (
											<>
												<EyeIcon className="w-4 h-4" />
												Aktifkan
											</>
										)}
									</button>
									<button
										onClick={() => handleOpenModal(banner)}
										className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm font-medium"
									>
										<PencilIcon className="w-4 h-4" />
										Edit
									</button>
									<button
										onClick={() => handleDelete(banner.id, banner.title)}
										className="flex items-center justify-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
									>
										<TrashIcon className="w-4 h-4" />
									</button>
								</div>
							</div>
						</div>
					))
				)}
			</div>

			{/* Modal */}
			{showModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
					<div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
						<div className="p-6">
							<h2 className="text-xl font-bold text-gray-900 mb-4">
								{editingBanner ? "Edit Banner" : "Tambah Banner Baru"}
							</h2>
							<form onSubmit={handleSubmit} className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Judul Banner <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										value={formData.title}
										onChange={(e) =>
											setFormData({ ...formData, title: e.target.value })
										}
										placeholder="Contoh: Pendaftaran Lomba Paskibra 2024"
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
										placeholder="Deskripsi singkat tentang banner"
										rows={3}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Gambar Banner <span className="text-red-500">*</span>
									</label>

									{/* Drag & Drop Upload Area */}
									<div
										onDragEnter={handleDrag}
										onDragLeave={handleDrag}
										onDragOver={handleDrag}
										onDrop={handleDrop}
										className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
											dragActive
												? "border-indigo-500 bg-indigo-50"
												: "border-gray-300 bg-gray-50"
										}`}
									>
										<input
											type="file"
											id="image-upload"
											accept="image/jpeg,image/jpg,image/png"
											onChange={handleFileChange}
											className="hidden"
										/>

										{formData.imageUrl ? (
											<div className="space-y-3">
												<img
													src={getImageUrl(formData.imageUrl)}
													alt="Preview"
													className="w-full h-48 object-cover rounded-lg"
													onError={(e) => {
														e.currentTarget.src =
															"https://via.placeholder.com/400x200?text=Image+Error";
													}}
												/>
												<div className="flex gap-2">
													<label
														htmlFor="image-upload"
														className="flex-1 cursor-pointer px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-center text-sm font-medium"
													>
														Ganti Gambar
													</label>
													<button
														type="button"
														onClick={() => {
															setFormData({ ...formData, imageUrl: "" });
														}}
														className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
													>
														Hapus
													</button>
												</div>
											</div>
										) : (
											<label
												htmlFor="image-upload"
												className="flex flex-col items-center cursor-pointer"
											>
												<PhotoIcon className="w-12 h-12 text-gray-400 mb-3" />
												<p className="text-sm font-medium text-gray-700 mb-1">
													{uploading
														? "Mengupload..."
														: "Drag & drop gambar atau klik untuk pilih"}
												</p>
												<p className="text-xs text-gray-500">
													PNG, JPG, JPEG (Max 10MB)
												</p>
												{uploading && (
													<div className="mt-3 w-full bg-gray-200 rounded-full h-2">
														<div className="bg-indigo-600 h-2 rounded-full animate-pulse w-1/2"></div>
													</div>
												)}
											</label>
										)}
									</div>
									<p className="text-xs text-gray-500 mt-1">
										Ukuran rekomendasi: 1920x1080px (16:9)
									</p>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										URL Link (Opsional)
									</label>
									<input
										type="url"
										value={formData.linkUrl}
										onChange={(e) =>
											setFormData({ ...formData, linkUrl: e.target.value })
										}
										placeholder="https://example.com/event"
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
									/>
									<p className="text-xs text-gray-500 mt-1">
										Link yang akan dibuka ketika banner diklik
									</p>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Teks Tombol (Opsional)
									</label>
									<input
										type="text"
										value={formData.buttonText}
										onChange={(e) =>
											setFormData({ ...formData, buttonText: e.target.value })
										}
										placeholder="Contoh: Daftar Sekarang"
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
									/>
								</div>

								<div className="grid grid-cols-2 gap-4">
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
													order: parseInt(e.target.value) || 0,
												})
											}
											min="0"
											className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
										/>
										<p className="text-xs text-gray-500 mt-1">
											Urutan tampilan banner (0 = paling awal)
										</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Status
										</label>
										<select
											value={formData.isActive ? "true" : "false"}
											onChange={(e) =>
												setFormData({
													...formData,
													isActive: e.target.value === "true",
												})
											}
											className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
										>
											<option value="true">Aktif</option>
											<option value="false">Nonaktif</option>
										</select>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Tanggal Mulai (Opsional)
										</label>
										<input
											type="date"
											value={formData.startDate}
											onChange={(e) =>
												setFormData({ ...formData, startDate: e.target.value })
											}
											className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Tanggal Selesai (Opsional)
										</label>
										<input
											type="date"
											value={formData.endDate}
											onChange={(e) =>
												setFormData({ ...formData, endDate: e.target.value })
											}
											className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
										/>
									</div>
								</div>

								<div className="flex justify-end gap-3 pt-4 border-t">
									<button
										type="button"
										onClick={handleCloseModal}
										className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
										disabled={submitLoading}
									>
										Batal
									</button>
									<button
										type="submit"
										disabled={submitLoading}
										className={`px-4 py-2 rounded-lg text-white transition-colors ${
											submitLoading
												? "bg-gray-400 cursor-not-allowed"
												: "bg-indigo-600 hover:bg-indigo-700"
										}`}
									>
										{submitLoading
											? "Menyimpan..."
											: editingBanner
											? "Perbarui Banner"
											: "Tambah Banner"}
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

export default BannerManagement;
