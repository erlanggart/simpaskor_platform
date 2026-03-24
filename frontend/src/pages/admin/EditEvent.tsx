import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
	ArrowLeftIcon,
	CalendarIcon,
	MapPinIcon,
	CurrencyDollarIcon,
	DocumentTextIcon,
	CheckIcon,
	PhoneIcon,
	EnvelopeIcon,
	PhotoIcon,
	XMarkIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../utils/api";
import Swal from "sweetalert2";

interface AssessmentCategory {
	id: string;
	name: string;
	description: string;
	maxScore: number;
	weight: string;
	order: number;
}

interface SchoolCategory {
	id: string;
	name: string;
	description: string;
	order: number;
}

interface SchoolCategoryLimit {
	categoryId: string;
	maxParticipants: number;
}

interface EventFormData {
	title: string;
	description: string;
	thumbnail: string;
	assessmentCategoryIds: string[];
	startDate: string;
	endDate: string;
	registrationDeadline: string;
	location: string;
	venue: string;
	schoolCategoryLimits: SchoolCategoryLimit[];
	registrationFee: number;
	organizer: string;
	contactEmail: string;
	contactPhone: string;
	status: string;
}

const AdminEditEvent: React.FC = () => {
	const { eventId } = useParams<{ eventId: string }>();
	const navigate = useNavigate();
	const [loading, setLoading] = useState(false);
	const [loadingData, setLoadingData] = useState(true);
	const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
	const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
	const [registrationFeeDisplay, setRegistrationFeeDisplay] = useState<string>("0");
	const [assessmentCategories, setAssessmentCategories] = useState<AssessmentCategory[]>([]);
	const [schoolCategories, setSchoolCategories] = useState<SchoolCategory[]>([]);
	const [selectedSchoolCategories, setSelectedSchoolCategories] = useState<Set<string>>(new Set());
	const [eventTitle, setEventTitle] = useState("");
	const [formData, setFormData] = useState<EventFormData>({
		title: "",
		description: "",
		thumbnail: "",
		assessmentCategoryIds: [],
		startDate: "",
		endDate: "",
		registrationDeadline: "",
		location: "",
		venue: "",
		schoolCategoryLimits: [],
		registrationFee: 0,
		organizer: "",
		contactEmail: "",
		contactPhone: "",
		status: "DRAFT",
	});
	const [errors, setErrors] = useState<Record<string, string>>({});

	const formatNumber = (num: number): string => {
		return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
	};

	useEffect(() => {
		const fetchEventData = async () => {
			try {
				setLoadingData(true);
				const response = await api.get(`/events/${eventId}`);
				const event = response.data;

				setEventTitle(event.title);
				setFormData({
					title: event.title || "",
					description: event.description || "",
					thumbnail: event.thumbnail || "",
					assessmentCategoryIds:
						event.assessmentCategories?.map((cat: any) => cat.assessmentCategoryId) || [],
					startDate: event.startDate
						? new Date(event.startDate).toISOString().slice(0, 16)
						: "",
					endDate: event.endDate
						? new Date(event.endDate).toISOString().slice(0, 16)
						: "",
					registrationDeadline: event.registrationDeadline
						? new Date(event.registrationDeadline).toISOString().slice(0, 16)
						: "",
					location: event.location || "",
					venue: event.venue || "",
					schoolCategoryLimits:
						event.schoolCategoryLimits?.map((limit: any) => ({
							categoryId: limit.schoolCategoryId,
							maxParticipants: limit.maxParticipants,
						})) || [],
					registrationFee: event.registrationFee || 0,
					organizer: event.organizer || "",
					contactEmail: event.contactEmail || "",
					contactPhone: event.contactPhone || "",
					status: event.status || "DRAFT",
				});

				setRegistrationFeeDisplay(formatNumber(event.registrationFee || 0));

				if (event.schoolCategoryLimits) {
					const categoryIds = new Set<string>(
						event.schoolCategoryLimits.map((limit: any) => limit.schoolCategoryId)
					);
					setSelectedSchoolCategories(categoryIds);
				}

				if (event.thumbnail) {
					const imageUrl = event.thumbnail.startsWith("http")
						? event.thumbnail
						: `${import.meta.env.VITE_BACKEND_URL || ""}${event.thumbnail}`;
					setThumbnailPreview(imageUrl);
				}
			} catch (error: any) {
				console.error("Failed to fetch event:", error);
				Swal.fire({
					icon: "error",
					title: "Gagal memuat data event",
					text: error.response?.data?.message || "Terjadi kesalahan",
				});
				navigate("/admin/events");
			} finally {
				setLoadingData(false);
			}
		};

		if (eventId) {
			fetchEventData();
		}
	}, [eventId, navigate]);

	useEffect(() => {
		fetchAssessmentCategories();
		fetchSchoolCategories();
	}, []);

	const fetchAssessmentCategories = async () => {
		try {
			const response = await api.get("/assessment-categories");
			setAssessmentCategories(response.data);
		} catch (error) {
			console.error("Failed to fetch assessment categories:", error);
		}
	};

	const fetchSchoolCategories = async () => {
		try {
			const response = await api.get("/school-categories");
			setSchoolCategories(response.data);
		} catch (error) {
			console.error("Failed to fetch school categories:", error);
		}
	};

	const toggleSchoolCategory = (categoryId: string) => {
		const newSelected = new Set(selectedSchoolCategories);
		if (newSelected.has(categoryId)) {
			newSelected.delete(categoryId);
			setFormData((prev) => ({
				...prev,
				schoolCategoryLimits: prev.schoolCategoryLimits.filter(
					(limit) => limit.categoryId !== categoryId
				),
			}));
		} else {
			newSelected.add(categoryId);
			setFormData((prev) => ({
				...prev,
				schoolCategoryLimits: [
					...prev.schoolCategoryLimits,
					{ categoryId, maxParticipants: 20 },
				],
			}));
		}
		setSelectedSchoolCategories(newSelected);
	};

	const updateSchoolCategoryLimit = (categoryId: string, maxParticipants: number) => {
		setFormData((prev) => ({
			...prev,
			schoolCategoryLimits: prev.schoolCategoryLimits.map((limit) =>
				limit.categoryId === categoryId ? { ...limit, maxParticipants } : limit
			),
		}));
	};

	const handleThumbnailUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		if (!file.type.startsWith("image/")) {
			Swal.fire({ icon: "error", title: "Format Tidak Valid", text: "File harus berupa gambar" });
			return;
		}

		if (file.size > 5 * 1024 * 1024) {
			Swal.fire({ icon: "error", title: "Ukuran File Terlalu Besar", text: "Maksimal ukuran file adalah 5MB" });
			return;
		}

		try {
			setUploadingThumbnail(true);
			const formDataUpload = new FormData();
			formDataUpload.append("thumbnail", file);

			const response = await api.post("/events/upload-thumbnail", formDataUpload, {
				headers: { "Content-Type": "multipart/form-data" },
			});

			const thumbnailPath = response.data.path;
			setFormData((prev) => ({ ...prev, thumbnail: thumbnailPath }));

			const reader = new FileReader();
			reader.onloadend = () => {
				setThumbnailPreview(reader.result as string);
			};
			reader.readAsDataURL(file);
		} catch (error: any) {
			console.error("Failed to upload thumbnail:", error);
			Swal.fire({
				icon: "error",
				title: "Gagal Mengunggah Thumbnail",
				text: error.response?.data?.message || "Terjadi kesalahan saat mengunggah file",
			});
		} finally {
			setUploadingThumbnail(false);
		}
	};

	const removeThumbnail = () => {
		setFormData((prev) => ({ ...prev, thumbnail: "" }));
		setThumbnailPreview("");
	};

	const toggleAssessmentCategory = (categoryId: string) => {
		setFormData((prev) => ({
			...prev,
			assessmentCategoryIds: prev.assessmentCategoryIds.includes(categoryId)
				? prev.assessmentCategoryIds.filter((id) => id !== categoryId)
				: [...prev.assessmentCategoryIds, categoryId],
		}));
	};

	const validate = (): boolean => {
		const newErrors: Record<string, string> = {};

		if (!formData.title.trim()) {
			newErrors.title = "Judul event wajib diisi";
		}

		if (!formData.startDate) {
			newErrors.startDate = "Tanggal mulai wajib diisi";
		}

		if (!formData.endDate) {
			newErrors.endDate = "Tanggal selesai wajib diisi";
		}

		if (formData.startDate && formData.endDate) {
			if (new Date(formData.startDate) > new Date(formData.endDate)) {
				newErrors.endDate = "Tanggal selesai tidak boleh lebih awal dari tanggal mulai";
			}
		}

		if (formData.registrationDeadline && formData.startDate && new Date(formData.registrationDeadline) > new Date(formData.startDate)) {
			newErrors.registrationDeadline = "Batas pendaftaran harus sebelum event dimulai";
		}

		if (formData.assessmentCategoryIds.length === 0) {
			newErrors.assessmentCategories = "Pilih minimal satu kategori penilaian";
		}

		if (formData.schoolCategoryLimits.length === 0) {
			newErrors.schoolCategories = "Pilih minimal satu kategori sekolah";
		}

		for (const limit of formData.schoolCategoryLimits) {
			if (limit.maxParticipants < 1) {
				newErrors.schoolCategories = "Minimal peserta per kategori adalah 1";
				break;
			}
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validate()) {
			Swal.fire({ icon: "error", title: "Validasi Gagal", text: "Mohon periksa kembali form Anda" });
			return;
		}

		const uniqueLimits = formData.schoolCategoryLimits.filter(
			(limit, index, self) =>
				index === self.findIndex((l) => l.categoryId === limit.categoryId)
		);

		const result = await Swal.fire({
			title: "Update Event?",
			text: "Apakah Anda yakin ingin menyimpan perubahan event ini?",
			icon: "question",
			showCancelButton: true,
			confirmButtonColor: "#DC2626",
			cancelButtonColor: "#6B7280",
			confirmButtonText: "Ya, Simpan",
			cancelButtonText: "Batal",
		});

		if (!result.isConfirmed) return;

		try {
			setLoading(true);

			const payload = {
				title: formData.title,
				description: formData.description || null,
				thumbnail: formData.thumbnail || null,
				assessmentCategoryIds: formData.assessmentCategoryIds,
				startDate: new Date(formData.startDate).toISOString(),
				endDate: new Date(formData.endDate).toISOString(),
				registrationDeadline: formData.registrationDeadline
					? new Date(formData.registrationDeadline).toISOString()
					: null,
				location: formData.location || null,
				venue: formData.venue || null,
				schoolCategoryLimits: uniqueLimits,
				registrationFee: Number(formData.registrationFee),
				organizer: formData.organizer || null,
				contactEmail: formData.contactEmail || null,
				contactPhone: formData.contactPhone || null,
			};

			await api.patch(`/events/${eventId}`, payload);

			await Swal.fire({
				icon: "success",
				title: "Berhasil!",
				text: "Event berhasil diperbarui",
				timer: 2000,
				showConfirmButton: false,
			});
			navigate(`/admin/events/${eventId}`);
		} catch (error: any) {
			console.error("Failed to update event:", error);
			Swal.fire({
				icon: "error",
				title: "Gagal Memperbarui Event",
				text: error.response?.data?.message || "Terjadi kesalahan",
			});
		} finally {
			setLoading(false);
		}
	};

	if (loadingData) {
		return (
			<div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
					<p className="mt-4 text-gray-600 dark:text-gray-400">Memuat data event...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			{/* Header */}
			<header className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900/50 sticky top-0 z-10">
				<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between py-4">
						<div className="flex items-center gap-4">
							<button
								onClick={() => navigate(`/admin/events/${eventId}`)}
								className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
							>
								<ArrowLeftIcon className="w-5 h-5" />
							</button>
							<div>
								<h1 className="text-xl font-bold text-gray-900 dark:text-white">Edit Event</h1>
								<p className="text-sm text-gray-600 dark:text-gray-400">{eventTitle}</p>
							</div>
						</div>
						<button
							type="submit"
							form="event-form"
							disabled={loading}
							className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors"
						>
							{loading ? (
								<div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
							) : (
								<CheckIcon className="w-5 h-5" />
							)}
							{loading ? "Menyimpan..." : "Simpan"}
						</button>
					</div>
				</div>
			</header>

			<main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<form id="event-form" onSubmit={handleSubmit} className="space-y-6">
					{/* Basic Information */}
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
							<DocumentTextIcon className="w-5 h-5" />
							Informasi Dasar
						</h2>
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									Judul Event *
								</label>
								<input
									type="text"
									value={formData.title}
									onChange={(e) => setFormData({ ...formData, title: e.target.value })}
									className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
										errors.title ? "border-red-500" : "border-gray-300 dark:border-gray-600"
									} focus:ring-2 focus:ring-red-500 focus:border-transparent`}
									placeholder="Masukkan judul event"
								/>
								{errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									Deskripsi
								</label>
								<textarea
									value={formData.description}
									onChange={(e) => setFormData({ ...formData, description: e.target.value })}
									rows={4}
									className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
									placeholder="Deskripsi event"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									Penyelenggara
								</label>
								<input
									type="text"
									value={formData.organizer}
									onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
									className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
									placeholder="Nama penyelenggara"
								/>
							</div>
						</div>
					</div>

					{/* Date & Time */}
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
							<CalendarIcon className="w-5 h-5" />
							Tanggal & Waktu
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									Tanggal Mulai *
								</label>
								<input
									type="datetime-local"
									value={formData.startDate}
									onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
									className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
										errors.startDate ? "border-red-500" : "border-gray-300 dark:border-gray-600"
									} focus:ring-2 focus:ring-red-500 focus:border-transparent`}
								/>
								{errors.startDate && <p className="mt-1 text-sm text-red-500">{errors.startDate}</p>}
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									Tanggal Selesai *
								</label>
								<input
									type="datetime-local"
									value={formData.endDate}
									onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
									className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
										errors.endDate ? "border-red-500" : "border-gray-300 dark:border-gray-600"
									} focus:ring-2 focus:ring-red-500 focus:border-transparent`}
								/>
								{errors.endDate && <p className="mt-1 text-sm text-red-500">{errors.endDate}</p>}
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									Batas Pendaftaran
								</label>
								<input
									type="datetime-local"
									value={formData.registrationDeadline}
									onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })}
									className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
										errors.registrationDeadline ? "border-red-500" : "border-gray-300 dark:border-gray-600"
									} focus:ring-2 focus:ring-red-500 focus:border-transparent`}
								/>
								{errors.registrationDeadline && <p className="mt-1 text-sm text-red-500">{errors.registrationDeadline}</p>}
							</div>
						</div>
					</div>

					{/* Location */}
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
							<MapPinIcon className="w-5 h-5" />
							Lokasi
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									Kota / Daerah
								</label>
								<input
									type="text"
									value={formData.location}
									onChange={(e) => setFormData({ ...formData, location: e.target.value })}
									className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
									placeholder="Contoh: Jakarta Selatan"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									Venue / Tempat
								</label>
								<input
									type="text"
									value={formData.venue}
									onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
									className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
									placeholder="Contoh: Gedung Serbaguna"
								/>
							</div>
						</div>
					</div>

					{/* Contact & Fee */}
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
							<CurrencyDollarIcon className="w-5 h-5" />
							Kontak & Biaya
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
									<EnvelopeIcon className="w-4 h-4" />
									Email Kontak
								</label>
								<input
									type="email"
									value={formData.contactEmail}
									onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
									className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
									placeholder="email@example.com"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
									<PhoneIcon className="w-4 h-4" />
									No. Telepon
								</label>
								<input
									type="tel"
									value={formData.contactPhone}
									onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
									className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
									placeholder="08xxxxxxxxxx"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									Biaya Registrasi (Rp)
								</label>
								<input
									type="text"
									value={registrationFeeDisplay}
									onChange={(e) => {
										const value = e.target.value.replace(/\D/g, "");
										const num = parseInt(value) || 0;
										setFormData({ ...formData, registrationFee: num });
										setRegistrationFeeDisplay(formatNumber(num));
									}}
									className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
									placeholder="0"
								/>
							</div>
						</div>
					</div>

					{/* Thumbnail */}
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
							<PhotoIcon className="w-5 h-5" />
							Poster / Thumbnail
						</h2>
						{thumbnailPreview ? (
							<div className="relative inline-block">
								<img
									src={thumbnailPreview}
									alt="Thumbnail"
									className="max-w-xs rounded-lg shadow"
								/>
								<button
									type="button"
									onClick={removeThumbnail}
									className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
								>
									<XMarkIcon className="w-4 h-4" />
								</button>
							</div>
						) : (
							<label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
								<div className="flex flex-col items-center justify-center">
									{uploadingThumbnail ? (
										<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
									) : (
										<>
											<PhotoIcon className="w-10 h-10 text-gray-400" />
											<p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
												Klik untuk upload thumbnail
											</p>
											<p className="text-xs text-gray-400 dark:text-gray-500">
												PNG, JPG atau WEBP (max 5MB)
											</p>
										</>
									)}
								</div>
								<input
									type="file"
									accept="image/*"
									className="hidden"
									onChange={handleThumbnailUpload}
									disabled={uploadingThumbnail}
								/>
							</label>
						)}
					</div>

					{/* Assessment Categories */}
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
							Kategori Penilaian *
						</h2>
						{errors.assessmentCategories && (
							<p className="mb-3 text-sm text-red-500">{errors.assessmentCategories}</p>
						)}
						<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
							{assessmentCategories.map((category) => (
								<button
									key={category.id}
									type="button"
									onClick={() => toggleAssessmentCategory(category.id)}
									className={`p-3 rounded-lg border-2 text-left transition-colors ${
										formData.assessmentCategoryIds.includes(category.id)
											? "border-red-500 bg-red-50 dark:bg-red-900/20"
											: "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
									}`}
								>
									<p className={`font-medium ${
										formData.assessmentCategoryIds.includes(category.id)
											? "text-red-700 dark:text-red-400"
											: "text-gray-900 dark:text-white"
									}`}>
										{category.name}
									</p>
									{category.description && (
										<p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
											{category.description}
										</p>
									)}
								</button>
							))}
						</div>
					</div>

					{/* School Categories */}
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
							Kategori Sekolah & Kuota *
						</h2>
						{errors.schoolCategories && (
							<p className="mb-3 text-sm text-red-500">{errors.schoolCategories}</p>
						)}
						<div className="space-y-3">
							{schoolCategories.map((category) => (
								<div
									key={category.id}
									className={`flex items-center justify-between p-4 rounded-lg border-2 transition-colors ${
										selectedSchoolCategories.has(category.id)
											? "border-red-500 bg-red-50 dark:bg-red-900/20"
											: "border-gray-200 dark:border-gray-600"
									}`}
								>
									<button
										type="button"
										onClick={() => toggleSchoolCategory(category.id)}
										className="flex-1 text-left"
									>
										<p className={`font-medium ${
											selectedSchoolCategories.has(category.id)
												? "text-red-700 dark:text-red-400"
												: "text-gray-900 dark:text-white"
										}`}>
											{category.name}
										</p>
										{category.description && (
											<p className="text-sm text-gray-500 dark:text-gray-400">{category.description}</p>
										)}
									</button>
									{selectedSchoolCategories.has(category.id) && (
										<div className="flex items-center gap-2 ml-4">
											<label className="text-sm text-gray-600 dark:text-gray-400">Kuota:</label>
											<input
												type="number"
												min="1"
												value={
													formData.schoolCategoryLimits.find((l) => l.categoryId === category.id)
														?.maxParticipants || 20
												}
												onChange={(e) =>
													updateSchoolCategoryLimit(category.id, parseInt(e.target.value) || 1)
												}
												className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center"
											/>
										</div>
									)}
								</div>
							))}
						</div>
					</div>

					{/* Submit Button (Mobile) */}
					<div className="md:hidden">
						<button
							type="submit"
							disabled={loading}
							className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors"
						>
							{loading ? "Menyimpan..." : "Simpan Perubahan"}
						</button>
					</div>
				</form>
			</main>
		</div>
	);
};

export default AdminEditEvent;
