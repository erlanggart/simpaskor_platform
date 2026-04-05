import React, { useState, useEffect } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import {
	ArrowLeftIcon,
	CalendarIcon,
	MapPinIcon,
	UsersIcon,
	CurrencyDollarIcon,
	DocumentTextIcon,
	CheckIcon,
	PhoneIcon,
	EnvelopeIcon,
	PhotoIcon,
	XMarkIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../utils/api";
import { Logo } from "../../components/Logo";
import { showSuccess, showError, showConfirm } from "../../utils/sweetalert";

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

const EditEventForm: React.FC = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [loading, setLoading] = useState(false);
	const [loadingData, setLoadingData] = useState(true);
	const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
	const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
	const [selectedCoupon] = useState<string>("");
	const [registrationFeeDisplay, setRegistrationFeeDisplay] =
		useState<string>("0");
	const [assessmentCategories, setAssessmentCategories] = useState<
		AssessmentCategory[]
	>([]);
	const [schoolCategories, setSchoolCategories] = useState<SchoolCategory[]>(
		[]
	);
	const [selectedSchoolCategories, setSelectedSchoolCategories] = useState<
		Set<string>
	>(new Set());
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

	// Helper function to format number with thousand separator
	const formatNumber = (num: number): string => {
		return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
	};

	// Fetch existing event data
	useEffect(() => {
		const fetchEventData = async () => {
			try {
				setLoadingData(true);
				const response = await api.get(`/api/events/${id}`);
				const event = response.data;

				// Set form data from event
				setFormData({
					title: event.title || "",
					description: event.description || "",
					thumbnail: event.thumbnail || "",
					assessmentCategoryIds:
						event.assessmentCategories?.map(
							(cat: any) => cat.assessmentCategoryId
						) || [],
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

				// Set registration fee display with formatting
				setRegistrationFeeDisplay(formatNumber(event.registrationFee || 0));

				// Set selected categories
				if (event.schoolCategoryLimits) {
					const categoryIds = new Set<string>(
						event.schoolCategoryLimits.map(
							(limit: any) => limit.schoolCategoryId
						)
					);
					setSelectedSchoolCategories(categoryIds);
				}

				// Set thumbnail preview
				if (event.thumbnail) {
					const imageUrl = event.thumbnail.startsWith("http")
						? event.thumbnail
						: `${import.meta.env.VITE_BACKEND_URL || ""}${
								event.thumbnail
						  }`;
					setThumbnailPreview(imageUrl);
				}
			} catch (error: any) {
				console.error("Failed to fetch event:", error);
				showError(
					"Gagal memuat data event",
					error.response?.data?.message || "Terjadi kesalahan"
				);
				navigate("/panitia/dashboard");
			} finally {
				setLoadingData(false);
			}
		};

		if (id) {
			fetchEventData();
		}
	}, [id, navigate]);

	// Fetch dropdown data
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
			// Remove from schoolCategoryLimits
			setFormData((prev) => ({
				...prev,
				schoolCategoryLimits: prev.schoolCategoryLimits.filter(
					(limit) => limit.categoryId !== categoryId
				),
			}));
		} else {
			newSelected.add(categoryId);
			// Add to schoolCategoryLimits with default value
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

	const updateSchoolCategoryLimit = (
		categoryId: string,
		maxParticipants: number
	) => {
		setFormData((prev) => ({
			...prev,
			schoolCategoryLimits: prev.schoolCategoryLimits.map((limit) =>
				limit.categoryId === categoryId ? { ...limit, maxParticipants } : limit
			),
		}));
	};

	const handleThumbnailUpload = async (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		const file = event.target.files?.[0];
		if (!file) return;

		// Validate file type
		if (!file.type.startsWith("image/")) {
			showError("Format Tidak Valid", "File harus berupa gambar");
			return;
		}

		// Validate file size (max 5MB)
		if (file.size > 5 * 1024 * 1024) {
			showError("Ukuran File Terlalu Besar", "Maksimal ukuran file adalah 5MB");
			return;
		}

		try {
			setUploadingThumbnail(true);

			// Create FormData
			const formData = new FormData();
			formData.append("thumbnail", file);

			// Upload to backend
			const response = await api.post(
				"/events/upload-thumbnail",
				formData,
				{
					headers: {
						"Content-Type": "multipart/form-data",
					},
				}
			);

			const thumbnailPath = response.data.path;
			setFormData((prev) => ({ ...prev, thumbnail: thumbnailPath }));

			// Set preview
			const reader = new FileReader();
			reader.onloadend = () => {
				setThumbnailPreview(reader.result as string);
			};
			reader.readAsDataURL(file);

			showSuccess("Berhasil!", "Thumbnail berhasil diunggah");
		} catch (error: any) {
			console.error("Failed to upload thumbnail:", error);
			showError(
				"Gagal Mengunggah Thumbnail",
				error.response?.data?.message ||
					"Terjadi kesalahan saat mengunggah file"
			);
		} finally {
			setUploadingThumbnail(false);
		}
	};

	const removeThumbnail = () => {
		setFormData((prev) => ({ ...prev, thumbnail: "" }));
		setThumbnailPreview("");
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
				newErrors.endDate =
					"Tanggal selesai tidak boleh lebih awal dari tanggal mulai";
			}
		}

		if (
			formData.registrationDeadline &&
			formData.startDate &&
			new Date(formData.registrationDeadline) > new Date(formData.startDate)
		) {
			newErrors.registrationDeadline =
				"Batas pendaftaran harus sebelum event dimulai";
		}

		if (formData.assessmentCategoryIds.length === 0) {
			newErrors.assessmentCategories = "Pilih minimal satu kategori penilaian";
		}

		if (formData.schoolCategoryLimits.length === 0) {
			newErrors.schoolCategories = "Pilih minimal satu kategori sekolah";
		}

		// Validate minimum participants
		for (const limit of formData.schoolCategoryLimits) {
			if (limit.maxParticipants < 20) {
				newErrors.schoolCategories = "Minimal peserta per kategori adalah 20";
				break;
			}
		}

		if (!formData.contactEmail.trim()) {
			newErrors.contactEmail = "Email kontak wajib diisi";
		} else if (!/\S+@\S+\.\S+/.test(formData.contactEmail)) {
			newErrors.contactEmail = "Format email tidak valid";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validate()) {
			showError("Validasi Gagal", "Mohon periksa kembali form Anda");
			return;
		}

		// Filter out duplicate categoryIds in schoolCategoryLimits
		const uniqueLimits = formData.schoolCategoryLimits.filter(
			(limit, index, self) =>
				index === self.findIndex((l) => l.categoryId === limit.categoryId)
		);

		const confirmed = await showConfirm(
			"Update Event?",
			"Apakah Anda yakin ingin menyimpan perubahan event ini?"
		);

		if (!confirmed) return;

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
				contactEmail: formData.contactEmail,
				contactPhone: formData.contactPhone || null,
				status: formData.status,
				couponId: selectedCoupon || null,
			};

			await api.patch(`/api/events/${id}`, payload);

			await showSuccess("Berhasil!", "Event berhasil diperbarui");
			navigate("/panitia/dashboard");
		} catch (error: any) {
			console.error("Failed to update event:", error);
			showError(
				"Gagal Memperbarui Event",
				error.response?.data?.message || "Terjadi kesalahan"
			);
		} finally {
			setLoading(false);
		}
	};

	const toggleAssessmentCategory = (categoryId: string) => {
		setFormData((prev) => ({
			...prev,
			assessmentCategoryIds: prev.assessmentCategoryIds.includes(categoryId)
				? prev.assessmentCategoryIds.filter((id) => id !== categoryId)
				: [...prev.assessmentCategoryIds, categoryId],
		}));
	};

	// Split categories into main and additional
	const mainCategories = assessmentCategories.filter(
		(cat) => cat.name === "PBB" || cat.name === "KOMANDAN"
	);
	const additionalCategories = assessmentCategories
		.filter((cat) => cat.name !== "PBB" && cat.name !== "KOMANDAN")
		.sort((a, b) => a.name.localeCompare(b.name));

	if (loadingData) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
					<p className="mt-4 text-gray-600">Memuat data event...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen">
			{/* Header */}
			<div className="bg-white shadow-sm border-b sticky top-0 z-10">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between h-16">
						<div className="flex items-center space-x-4">
							<Link to="/">
								<Logo size="sm" />
							</Link>
							<div className="hidden sm:block h-8 w-px bg-gray-300" />
							<h1 className="text-xl font-bold text-gray-900">Edit Event</h1>
						</div>
						<Link
							to="/panitia/dashboard"
							className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
						>
							<ArrowLeftIcon className="w-5 h-5" />
							<span>Kembali</span>
						</Link>
					</div>
				</div>
			</div>

			{/* Form */}
			<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Basic Information */}
					<div className="bg-white rounded-lg shadow p-6">
						<h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
							<DocumentTextIcon className="w-5 h-5 mr-2" />
							Informasi Dasar
						</h2>

						<div className="space-y-4">
							{/* Title */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Judul Event <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									value={formData.title}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, title: e.target.value }))
									}
									className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
										errors.title ? "border-red-500" : "border-gray-300"
									}`}
									placeholder="Contoh: Lomba Paskibra Tingkat Nasional 2024"
								/>
								{errors.title && (
									<p className="text-red-500 text-sm mt-1">{errors.title}</p>
								)}
							</div>

							{/* Description */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Deskripsi
								</label>
								<textarea
									value={formData.description}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											description: e.target.value,
										}))
									}
									rows={4}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
									placeholder="Jelaskan detail tentang event..."
								/>
							</div>

							{/* Thumbnail */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Thumbnail Event
								</label>
								{thumbnailPreview ? (
									<div className="relative inline-block">
										<img
											src={thumbnailPreview}
											alt="Preview"
											className="w-48 h-60 object-cover rounded-lg border-2 border-gray-200"
										/>
										<button
											type="button"
											onClick={removeThumbnail}
											className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
										>
											<XMarkIcon className="w-5 h-5" />
										</button>
									</div>
								) : (
									<div className="flex items-center justify-center w-48 h-60 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-500 cursor-pointer relative">
										<input
											type="file"
											accept="image/*"
											onChange={handleThumbnailUpload}
											disabled={uploadingThumbnail}
											className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
										/>
										<div className="text-center">
											{uploadingThumbnail ? (
												<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
											) : (
												<>
													<PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
													<p className="mt-2 text-sm text-gray-500">
														Upload Thumbnail
													</p>
													<p className="text-xs text-gray-400">
														PNG, JPG (Max 5MB)
													</p>
												</>
											)}
										</div>
									</div>
								)}
								<p className="text-sm text-gray-500 mt-2">
									Rasio yang disarankan: 4:5 (contoh: 800x1000px)
								</p>
							</div>
						</div>
					</div>

					{/* Assessment Categories */}
					<div className="bg-white rounded-lg shadow p-6">
						<h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
							<CheckIcon className="w-5 h-5 mr-2" />
							Kategori Penilaian <span className="text-red-500 ml-1">*</span>
						</h2>

						{/* Main Categories */}
						{mainCategories.length > 0 && (
							<div className="mb-6">
								<h3 className="text-sm font-medium text-gray-700 mb-3">
									Kategori Utama
								</h3>
								<div className="space-y-2">
									{mainCategories.map((category) => (
										<label
											key={category.id}
											className="flex items-start p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
										>
											<input
												type="checkbox"
												checked={formData.assessmentCategoryIds.includes(
													category.id
												)}
												onChange={() => toggleAssessmentCategory(category.id)}
												className="mt-1 h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
											/>
											<div className="ml-3 flex-1">
												<div className="font-medium text-gray-900">
													{category.name}
												</div>
												{category.description && (
													<div className="text-sm text-gray-500 mt-1">
														{category.description}
													</div>
												)}
											</div>
										</label>
									))}
								</div>
							</div>
						)}

						{/* Additional Categories */}
						{additionalCategories.length > 0 && (
							<div>
								<h3 className="text-sm font-medium text-gray-700 mb-3">
									Kategori Tambahan
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
									{additionalCategories.map((category) => (
										<label
											key={category.id}
											className="flex items-start p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
										>
											<input
												type="checkbox"
												checked={formData.assessmentCategoryIds.includes(
													category.id
												)}
												onChange={() => toggleAssessmentCategory(category.id)}
												className="mt-1 h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
											/>
											<div className="ml-3 flex-1">
												<div className="font-medium text-gray-900">
													{category.name}
												</div>
												{category.description && (
													<div className="text-sm text-gray-500 mt-1">
														{category.description}
													</div>
												)}
											</div>
										</label>
									))}
								</div>
							</div>
						)}

						{errors.assessmentCategories && (
							<p className="text-red-500 text-sm mt-3">
								{errors.assessmentCategories}
							</p>
						)}
					</div>

					{/* School Categories */}
					<div className="bg-white rounded-lg shadow p-6">
						<h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
							<UsersIcon className="w-5 h-5 mr-2" />
							Kategori Sekolah & Kuota{" "}
							<span className="text-red-500 ml-1">*</span>
						</h2>

						<div className="space-y-4">
							{schoolCategories.map((category) => {
								const isSelected = selectedSchoolCategories.has(category.id);
								const limit = formData.schoolCategoryLimits.find(
									(l) => l.categoryId === category.id
								);

								return (
									<div
										key={category.id}
										className="border border-gray-200 rounded-lg p-4"
									>
										<label className="flex items-center cursor-pointer">
											<input
												type="checkbox"
												checked={isSelected}
												onChange={() => toggleSchoolCategory(category.id)}
												className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
											/>
											<div className="ml-3 flex-1">
												<div className="font-medium text-gray-900">
													{category.name}
												</div>
												{category.description && (
													<div className="text-sm text-gray-500">
														{category.description}
													</div>
												)}
											</div>
										</label>

										{isSelected && (
											<div className="mt-3 ml-7">
												<label className="block text-sm font-medium text-gray-700 mb-1">
													Maksimal Peserta
												</label>
												<input
													type="number"
													min="20"
													value={limit?.maxParticipants || ""}
													onChange={(e) => {
														let value = e.target.value;

														// Remove leading zeros
														value = value.replace(/^0+/, "");

														// Allow any input during typing (including empty)
														updateSchoolCategoryLimit(
															category.id,
															value === "" ? 0 : parseInt(value)
														);
													}}
													onBlur={(e) => {
														// Validate minimum on blur
														const value = parseInt(e.target.value);
														if (isNaN(value) || value < 20) {
															updateSchoolCategoryLimit(category.id, 20);
														}
													}}
													className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
													placeholder="Minimal 20 peserta"
												/>
												<p className="text-xs text-gray-500 mt-1">
													Jumlah maksimal untuk kategori ini
												</p>
											</div>
										)}
									</div>
								);
							})}
						</div>

						{errors.schoolCategories && (
							<p className="text-red-500 text-sm mt-3">
								{errors.schoolCategories}
							</p>
						)}
					</div>

					{/* Date & Time */}
					<div className="bg-white rounded-lg shadow p-6">
						<h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
							<CalendarIcon className="w-5 h-5 mr-2" />
							Tanggal & Waktu
						</h2>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{/* Start Date */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Tanggal Mulai <span className="text-red-500">*</span>
								</label>
								<input
									type="datetime-local"
									value={formData.startDate}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											startDate: e.target.value,
										}))
									}
									className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
										errors.startDate ? "border-red-500" : "border-gray-300"
									}`}
								/>
								{errors.startDate && (
									<p className="text-red-500 text-sm mt-1">
										{errors.startDate}
									</p>
								)}
							</div>

							{/* End Date */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Tanggal Selesai <span className="text-red-500">*</span>
								</label>
								<input
									type="datetime-local"
									value={formData.endDate}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											endDate: e.target.value,
										}))
									}
									className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
										errors.endDate ? "border-red-500" : "border-gray-300"
									}`}
								/>
								{errors.endDate && (
									<p className="text-red-500 text-sm mt-1">{errors.endDate}</p>
								)}
							</div>

							{/* Registration Deadline */}
							<div className="md:col-span-2">
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Batas Pendaftaran
								</label>
								<input
									type="datetime-local"
									value={formData.registrationDeadline}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											registrationDeadline: e.target.value,
										}))
									}
									className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
										errors.registrationDeadline
											? "border-red-500"
											: "border-gray-300"
									}`}
								/>
								{errors.registrationDeadline && (
									<p className="text-red-500 text-sm mt-1">
										{errors.registrationDeadline}
									</p>
								)}
							</div>
						</div>
					</div>

					{/* Location */}
					<div className="bg-white rounded-lg shadow p-6">
						<h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
							<MapPinIcon className="w-5 h-5 mr-2" />
							Lokasi
						</h2>

						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Kota/Kabupaten
								</label>
								<input
									type="text"
									value={formData.location}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											location: e.target.value,
										}))
									}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
									placeholder="Contoh: Jakarta Selatan"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Venue/Tempat
								</label>
								<input
									type="text"
									value={formData.venue}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, venue: e.target.value }))
									}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
									placeholder="Contoh: Gedung Serbaguna XYZ"
								/>
							</div>
						</div>
					</div>

					{/* Registration & Contact */}
					<div className="bg-white rounded-lg shadow p-6">
						<h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
							<CurrencyDollarIcon className="w-5 h-5 mr-2" />
							Pendaftaran & Kontak
						</h2>

						<div className="space-y-4">
							{/* Registration Fee */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Biaya Pendaftaran (Rp)
								</label>
								<input
									type="text"
									value={registrationFeeDisplay}
									onChange={(e) => {
										let value = e.target.value;

										// Remove all non-digit characters except dots
										value = value.replace(/[^\d.]/g, "");

										// Remove dots for processing
										const cleanValue = value.replace(/\./g, "");

										// Remove leading zeros
										const withoutLeadingZeros =
											cleanValue.replace(/^0+/, "") || "0";

										// Parse to number
										const numValue = parseInt(withoutLeadingZeros, 10) || 0;

										// Update formData with actual number
										setFormData((prev) => ({
											...prev,
											registrationFee: numValue,
										}));

										// Format for display with thousand separator
										const formatted = formatNumber(numValue);
										setRegistrationFeeDisplay(formatted);
									}}
									placeholder="0 untuk gratis"
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
								/>
								<p className="text-xs text-gray-500 mt-1">
									Contoh: 100.000 atau 250.000
								</p>
							</div>

							{/* Organizer */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Penyelenggara
								</label>
								<input
									type="text"
									value={formData.organizer}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											organizer: e.target.value,
										}))
									}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
									placeholder="Nama organisasi atau institusi"
								/>
							</div>

							{/* Contact Email */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Email Kontak <span className="text-red-500">*</span>
								</label>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<EnvelopeIcon className="h-5 w-5 text-gray-400" />
									</div>
									<input
										type="email"
										value={formData.contactEmail}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												contactEmail: e.target.value,
											}))
										}
										className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
											errors.contactEmail ? "border-red-500" : "border-gray-300"
										}`}
										placeholder="contact@example.com"
									/>
								</div>
								{errors.contactEmail && (
									<p className="text-red-500 text-sm mt-1">
										{errors.contactEmail}
									</p>
								)}
							</div>

							{/* Contact Phone */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Nomor Telepon
								</label>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<PhoneIcon className="h-5 w-5 text-gray-400" />
									</div>
									<input
										type="tel"
										value={formData.contactPhone}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												contactPhone: e.target.value,
											}))
										}
										className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
										placeholder="08123456789"
									/>
								</div>
							</div>
						</div>
					</div>

					{/* Status */}
					<div className="bg-white rounded-lg shadow p-6">
						<h2 className="text-lg font-semibold text-gray-900 mb-4">Status</h2>

						<div className="space-y-2">
							<label className="flex items-center">
								<input
									type="radio"
									name="status"
									value="DRAFT"
									checked={formData.status === "DRAFT"}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, status: e.target.value }))
									}
									className="h-4 w-4 text-red-600 border-gray-300 focus:ring-red-500"
								/>
								<span className="ml-2">
									<span className="font-medium">Draft</span>
									<span className="text-sm text-gray-500 ml-2">
										(Tidak terlihat oleh publik)
									</span>
								</span>
							</label>

							<label className="flex items-center">
								<input
									type="radio"
									name="status"
									value="PUBLISHED"
									checked={formData.status === "PUBLISHED"}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, status: e.target.value }))
									}
									className="h-4 w-4 text-red-600 border-gray-300 focus:ring-red-500"
								/>
								<span className="ml-2">
									<span className="font-medium">Published</span>
									<span className="text-sm text-gray-500 ml-2">
										(Terlihat di halaman utama)
									</span>
								</span>
							</label>
						</div>
					</div>

					{/* Actions */}
					<div className="flex gap-4">
						<button
							type="submit"
							disabled={loading}
							className="flex-1 px-6 py-3 rounded-lg font-medium transition-colors bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{loading ? "Menyimpan..." : "Simpan Perubahan"}
						</button>
						<Link
							to="/panitia/dashboard"
							className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
						>
							Batal
						</Link>
					</div>
				</form>
			</div>
		</div>
	);
};

export default EditEventForm;
