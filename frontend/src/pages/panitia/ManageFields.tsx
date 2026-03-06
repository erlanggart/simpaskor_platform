import React, { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import {
	MapPinIcon,
	PlusIcon,
	PencilIcon,
	TrashIcon,
	ArrowLeftIcon,
	UserGroupIcon,
	PlayIcon,
	ClockIcon,
} from "@heroicons/react/24/outline";
import Swal from "sweetalert2";
import { api } from "../../utils/api";

interface PerformanceField {
	id: string;
	name: string;
	description: string | null;
	order: number;
	isActive: boolean;
	currentPerformer: CurrentPerformer | null;
}

interface CurrentPerformer {
	session: {
		id: string;
		startTime: string;
		status: string;
	};
	participant: {
		id: string;
		groupName: string;
		orderNumber: number | null;
		schoolCategory: {
			id: string;
			name: string;
		};
		participation: {
			user: {
				name: string;
			};
			schoolName: string | null;
		};
	} | null;
}

const ManageFields: React.FC = () => {
	const { eventSlug } = useParams<{ eventSlug: string }>();
	const location = useLocation();

	// Detect admin vs panitia route
	const isAdminRoute = location.pathname.startsWith("/admin");
	const basePath = isAdminRoute ? "/admin" : "/panitia";

	const [fields, setFields] = useState<PerformanceField[]>([]);
	const [loading, setLoading] = useState(true);
	const [showForm, setShowForm] = useState(false);
	const [editingField, setEditingField] = useState<PerformanceField | null>(null);
	const [formData, setFormData] = useState({
		name: "",
		description: "",
	});

	useEffect(() => {
		if (eventSlug) {
			fetchFields();
		}
	}, [eventSlug]);

	const fetchFields = async () => {
		try {
			setLoading(true);
			const res = await api.get(`/performance/events/${eventSlug}/fields`);
			setFields(res.data || []);
		} catch (error) {
			console.error("Error fetching fields:", error);
			Swal.fire({
				icon: "error",
				title: "Gagal Memuat Data",
				text: "Terjadi kesalahan saat memuat data lapangan.",
			});
		} finally {
			setLoading(false);
		}
	};

	const openAddForm = () => {
		setShowForm(true);
		setEditingField(null);
		setFormData({ name: "", description: "" });
	};

	const openEditForm = (field: PerformanceField) => {
		setShowForm(true);
		setEditingField(field);
		setFormData({
			name: field.name,
			description: field.description || "",
		});
	};

	const closeForm = () => {
		setShowForm(false);
		setEditingField(null);
		setFormData({ name: "", description: "" });
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.name.trim()) {
			Swal.fire({
				icon: "warning",
				title: "Nama Diperlukan",
				text: "Silakan masukkan nama lapangan.",
			});
			return;
		}

		try {
			if (editingField) {
				// Update existing field
				await api.put(
					`/performance/events/${eventSlug}/fields/${editingField.id}`,
					formData
				);
				Swal.fire({
					icon: "success",
					title: "Berhasil",
					text: "Lapangan berhasil diperbarui.",
					timer: 1500,
					showConfirmButton: false,
				});
			} else {
				// Create new field
				await api.post(`/performance/events/${eventSlug}/fields`, formData);
				Swal.fire({
					icon: "success",
					title: "Berhasil",
					text: "Lapangan berhasil ditambahkan.",
					timer: 1500,
					showConfirmButton: false,
				});
			}

			closeForm();
			fetchFields();
		} catch (error: unknown) {
			const err = error as { response?: { data?: { error?: string } } };
			Swal.fire({
				icon: "error",
				title: "Gagal Menyimpan",
				text: err.response?.data?.error || "Terjadi kesalahan saat menyimpan.",
			});
		}
	};

	const handleDelete = async (field: PerformanceField) => {
		const result = await Swal.fire({
			icon: "warning",
			title: "Hapus Lapangan?",
			text: `Yakin ingin menghapus "${field.name}"? Data sesi penampilan di lapangan ini juga akan terhapus.`,
			showCancelButton: true,
			confirmButtonText: "Hapus",
			cancelButtonText: "Batal",
			confirmButtonColor: "#dc2626",
		});

		if (result.isConfirmed) {
			try {
				await api.delete(`/performance/events/${eventSlug}/fields/${field.id}`);
				Swal.fire({
					icon: "success",
					title: "Berhasil",
					text: "Lapangan berhasil dihapus.",
					timer: 1500,
					showConfirmButton: false,
				});
				fetchFields();
			} catch (error: unknown) {
				const err = error as { response?: { data?: { error?: string } } };
				Swal.fire({
					icon: "error",
					title: "Gagal Menghapus",
					text: err.response?.data?.error || "Terjadi kesalahan saat menghapus.",
				});
			}
		}
	};

	const getParticipantDisplay = (performer: CurrentPerformer) => {
		const { participant } = performer;
		
		if (!participant) {
			return <span className="text-gray-500">Data peserta tidak tersedia</span>;
		}
		
		const user = participant.participation?.user;
		const schoolName = participant.participation?.schoolName || "-";
		const categoryName = participant.schoolCategory?.name || "";
		const orderNum = participant.orderNumber;

		if (participant.groupName) {
			return (
				<>
					<span className="font-semibold">{participant.groupName}</span>
					<span className="text-sm text-gray-600 block">
						{schoolName} - {categoryName} #{orderNum}
					</span>
				</>
			);
		}

		return (
			<>
				<span className="font-semibold">{user?.name || "Peserta"}</span>
				<span className="text-sm text-gray-600 block">
					{schoolName} - {categoryName} #{orderNum}
				</span>
			</>
		);
	};

	const formatDuration = (startTime: string) => {
		const start = new Date(startTime);
		const now = new Date();
		const diffSecs = Math.floor((now.getTime() - start.getTime()) / 1000);
		const mins = Math.floor(diffSecs / 60);
		const secs = diffSecs % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
			</div>
		);
	}

	return (
		<div className="p-6 max-w-4xl mx-auto">
			{/* Header */}
			<div className="mb-6">
				<Link
					to={`${basePath}/events/${eventSlug}/manage`}
					className="text-gray-600 hover:text-gray-800 flex items-center gap-1 mb-4"
				>
					<ArrowLeftIcon className="h-4 w-4" />
					Kembali ke Kelola Event
				</Link>

				<div className="flex justify-between items-center">
					<div>
						<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
							<MapPinIcon className="h-7 w-7 text-red-600" />
							Kelola Lapangan
						</h1>
						<p className="text-gray-600 mt-1">
							Atur lapangan atau tempat penampilan peserta
						</p>
					</div>

					<div className="flex gap-2">
						<Link
							to={`${basePath}/events/${eventSlug}/performance-history`}
							className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
						>
							<ClockIcon className="h-5 w-5" />
							Riwayat
						</Link>
						<Link
							to={`${basePath}/events/${eventSlug}/field-rechecking`}
							className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
						>
							<PlayIcon className="h-5 w-5" />
							Kelola Penampilan
						</Link>
						<button
							onClick={openAddForm}
							className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
						>
							<PlusIcon className="h-5 w-5" />
							Tambah Lapangan
						</button>
					</div>
				</div>
			</div>

			{/* Form Modal */}
			{showForm && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
						<h2 className="text-xl font-bold mb-4">
							{editingField ? "Edit Lapangan" : "Tambah Lapangan Baru"}
						</h2>

						<form onSubmit={handleSubmit} className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Nama Lapangan <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									value={formData.name}
									onChange={(e) =>
										setFormData({ ...formData, name: e.target.value })
									}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
									placeholder="Contoh: Lapangan A, Stage 1, dll."
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
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
									rows={3}
									placeholder="Deskripsi opsional tentang lapangan ini..."
								/>
							</div>

							<div className="flex justify-end gap-3 pt-4">
								<button
									type="button"
									onClick={closeForm}
									className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
								>
									Batal
								</button>
								<button
									type="submit"
									className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
								>
									{editingField ? "Simpan Perubahan" : "Tambah Lapangan"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Fields List */}
			{fields.length === 0 ? (
				<div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
					<MapPinIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
					<h3 className="text-lg font-medium text-gray-900 mb-2">
						Belum Ada Lapangan
					</h3>
					<p className="text-gray-600 mb-4">
						Tambahkan lapangan untuk mulai mengatur penampilan peserta.
					</p>
					<button
						onClick={openAddForm}
						className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
					>
						Tambah Lapangan Pertama
					</button>
				</div>
			) : (
				<div className="grid gap-4 md:grid-cols-2">
					{fields.map((field) => (
						<div
							key={field.id}
							className={`bg-white rounded-lg shadow-md border ${
								field.currentPerformer
									? "border-green-500 ring-2 ring-green-200"
									: "border-gray-200"
							}`}
						>
							<div className="p-4">
								<div className="flex justify-between items-start mb-3">
									<div>
										<h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
											<MapPinIcon className="h-5 w-5 text-red-600" />
											{field.name}
										</h3>
										{field.description && (
											<p className="text-sm text-gray-600 mt-1">
												{field.description}
											</p>
										)}
									</div>

									<div className="flex gap-1">
										<button
											onClick={() => openEditForm(field)}
											className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
											title="Edit"
										>
											<PencilIcon className="h-5 w-5" />
										</button>
										<button
											onClick={() => handleDelete(field)}
											className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
											title="Hapus"
										>
											<TrashIcon className="h-5 w-5" />
										</button>
									</div>
								</div>

								{/* Current Performer Status */}
								<div
									className={`rounded-lg p-3 ${
										field.currentPerformer
											? "bg-green-50 border border-green-200"
											: "bg-gray-50 border border-gray-200"
									}`}
								>
									{field.currentPerformer ? (
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
													<UserGroupIcon className="h-6 w-6 text-white" />
												</div>
												<div>
													<span className="text-xs font-medium text-green-700 uppercase">
														Sedang Tampil
													</span>
													{getParticipantDisplay(field.currentPerformer)}
												</div>
											</div>
											<div className="text-right">
												<span className="text-2xl font-mono font-bold text-green-700">
													{formatDuration(field.currentPerformer.session.startTime)}
												</span>
											</div>
										</div>
									) : (
										<div className="flex items-center gap-3 text-gray-500">
											<div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
												<UserGroupIcon className="h-6 w-6 text-gray-400" />
											</div>
											<span className="text-sm">Tidak ada peserta tampil</span>
										</div>
									)}
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default ManageFields;
