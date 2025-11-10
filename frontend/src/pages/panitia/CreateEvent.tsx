import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
	ArrowLeftIcon,
	CalendarIcon,
	MapPinIcon,
	UsersIcon,
	CurrencyDollarIcon,
	DocumentTextIcon,
	TicketIcon,
	CheckIcon,
	PhoneIcon,
	EnvelopeIcon,
	PhotoIcon,
	XMarkIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../utils/api";
import { Logo } from "../../components/Logo";
import { showSuccess, showError } from "../../utils/sweetalert";

interface Coupon {
	id: string;
	code: string;
	description: string | null;
	isUsed: boolean;
	expiresAt: string | null;
}

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
	thumbnail: string; // Add thumbnail URL
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
const CreateEventForm: React.FC = () => {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(false);
	const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
	const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
	const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
	const [selectedCoupon, setSelectedCoupon] = useState<string>("");
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
		thumbnail: "", // Add thumbnail field
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

	useEffect(() => {
		fetchAvailableCoupons();
		fetchAssessmentCategories();
		fetchSchoolCategories();
		loadUserData();
	}, []);

	const loadUserData = () => {
		const userData = localStorage.getItem("user");
		if (userData) {
			const user = JSON.parse(userData);
			setFormData((prev) => ({
				...prev,
				contactEmail: user.email || "",
				organizer: user.name || "",
			}));
		}
	};

	const fetchAvailableCoupons = async () => {
		try {
			const response = await api.get("/coupons/my");
			const available = response.data.filter((c: Coupon) => !c.isUsed);
			setAvailableCoupons(available);
			if (available.length === 1) {
				setSelectedCoupon(available[0].id);
			}
		} catch (error) {
			console.error("Error fetching coupons:", error);
		}
	};

	const fetchAssessmentCategories = async () => {
		try {
			const response = await api.get("/events/meta/assessment-categories");
			setAssessmentCategories(response.data);
		} catch (error) {
			console.error("Error fetching assessment categories:", error);
		}
	};

	const fetchSchoolCategories = async () => {
		try {
			const response = await api.get("/events/meta/school-categories");
			setSchoolCategories(response.data);
		} catch (error) {
			console.error("Error fetching school categories:", error);
		}
	};

	const handleChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>
	) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
		if (errors[name]) {
			setErrors((prev) => ({ ...prev, [name]: "" }));
		}
	};

	const toggleAssessmentCategory = (categoryId: string) => {
		setFormData((prev) => {
			const ids = prev.assessmentCategoryIds.includes(categoryId)
				? prev.assessmentCategoryIds.filter((id) => id !== categoryId)
				: [...prev.assessmentCategoryIds, categoryId];
			return { ...prev, assessmentCategoryIds: ids };
		});
		if (errors.assessmentCategoryIds) {
			setErrors((prev) => ({ ...prev, assessmentCategoryIds: "" }));
		}
	};

	const toggleSchoolCategory = (categoryId: string) => {
		setSelectedSchoolCategories((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(categoryId)) {
				newSet.delete(categoryId);
				setFormData((prevData) => ({
					...prevData,
					schoolCategoryLimits: prevData.schoolCategoryLimits.filter(
						(l) => l.categoryId !== categoryId
					),
				}));
			} else {
				newSet.add(categoryId);
				setFormData((prevData) => ({
					...prevData,
					schoolCategoryLimits: [
						...prevData.schoolCategoryLimits,
						{ categoryId, maxParticipants: 20 }, // Changed from 50 to 20
					],
				}));
			}
			return newSet;
		});
		if (errors.schoolCategories) {
			setErrors((prev) => ({ ...prev, schoolCategories: "" }));
		}
	};

	const updateSchoolCategoryLimit = (categoryId: string, value: number) => {
		setFormData((prev) => ({
			...prev,
			schoolCategoryLimits: prev.schoolCategoryLimits.map((limit) =>
				limit.categoryId === categoryId
					? { ...limit, maxParticipants: value }
					: limit
			),
		}));
	};

	const validateForm = (): boolean => {
		const newErrors: Record<string, string> = {};
		if (!selectedCoupon)
			newErrors.coupon = "Anda harus memilih kupon untuk membuat event";
		if (!formData.title.trim()) newErrors.title = "Judul event wajib diisi";
		if (formData.assessmentCategoryIds.length === 0)
			newErrors.assessmentCategoryIds = "Pilih minimal 1 kategori penilaian";
		if (!formData.startDate) newErrors.startDate = "Tanggal mulai wajib diisi";
		if (!formData.endDate) newErrors.endDate = "Tanggal selesai wajib diisi";
		if (
			formData.startDate &&
			formData.endDate &&
			new Date(formData.startDate) > new Date(formData.endDate)
		) {
			newErrors.endDate =
				"Tanggal selesai tidak boleh lebih awal dari tanggal mulai";
		}
		if (!formData.location.trim()) newErrors.location = "Lokasi wajib diisi";
		if (selectedSchoolCategories.size === 0)
			newErrors.schoolCategories = "Pilih minimal 1 kategori sekolah";
		if (!formData.contactEmail.trim())
			newErrors.contactEmail = "Email kontak wajib diisi";
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleThumbnailUpload = async (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Validate file type
		if (!file.type.startsWith("image/")) {
			showError("File harus berupa gambar!");
			return;
		}

		// Validate file size (max 10MB)
		if (file.size > 10 * 1024 * 1024) {
			showError("Ukuran file maksimal 10MB!");
			return;
		}

		try {
			setUploadingThumbnail(true);

			// Preview image
			const reader = new FileReader();
			reader.onloadend = () => {
				setThumbnailPreview(reader.result as string);
			};
			reader.readAsDataURL(file);

			// Upload to server
			const uploadFormData = new FormData();
			uploadFormData.append("thumbnail", file);

			const response = await api.post(
				"api/events/upload-thumbnail",
				uploadFormData,
				{
					headers: {
						"Content-Type": "multipart/form-data",
					},
				}
			);

			// Save thumbnail URL to form data
			setFormData((prev) => ({
				...prev,
				thumbnail: response.data.thumbnailUrl,
			}));

			if (errors.thumbnail) {
				setErrors((prev) => ({ ...prev, thumbnail: "" }));
			}
		} catch (error: any) {
			console.error("Error uploading thumbnail:", error);
			showError("Gagal upload gambar. Silakan coba lagi.");
			setThumbnailPreview("");
		} finally {
			setUploadingThumbnail(false);
		}
	};

	const removeThumbnail = () => {
		setFormData((prev) => ({ ...prev, thumbnail: "" }));
		setThumbnailPreview("");
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!validateForm()) return;
		setLoading(true);
		try {
			// Remove duplicate school category limits before submit
			const uniqueLimits = formData.schoolCategoryLimits.filter(
				(limit, index, self) =>
					index === self.findIndex((l) => l.categoryId === limit.categoryId)
			);

			const submitData = {
				...formData,
				schoolCategoryLimits: uniqueLimits,
				couponId: selectedCoupon,
			};

			await api.post("/events", submitData);
			showSuccess("Event Paskibra berhasil dibuat!");
			navigate("/panitia/dashboard");
		} catch (error: any) {
			console.error("Error creating event:", error);
			showError(
				error.response?.data?.message ||
					"Gagal membuat event. Silakan coba lagi."
			);
		} finally {
			setLoading(false);
		}
	};

	if (availableCoupons.length === 0) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
					<TicketIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
					<h2 className="text-2xl font-bold text-gray-900 mb-2">
						Kupon Tidak Tersedia
					</h2>
					<p className="text-gray-600 mb-6">
						Anda memerlukan kupon untuk membuat event. Silakan hubungi admin
						untuk mendapatkan kupon.
					</p>
					<Link
						to="/panitia/dashboard"
						className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
					>
						<ArrowLeftIcon className="w-5 h-5" />
						Kembali ke Dashboard
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<header className="bg-white shadow-sm">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center gap-4 py-4">
						<Logo size="sm" />
						<div className="flex-1">
							<h1 className="text-xl font-bold text-gray-900">
								Buat Event Paskibra Baru
							</h1>
							<p className="text-sm text-gray-500">
								Isi form di bawah untuk membuat lomba Paskibra
							</p>
						</div>
						<Link
							to="/panitia/dashboard"
							className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
						>
							<ArrowLeftIcon className="w-5 h-5" />
							Kembali
						</Link>
					</div>
				</div>
			</header>

			<main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<form onSubmit={handleSubmit} className="space-y-6">
					<div className="bg-white rounded-lg shadow p-6">
						<div className="flex items-center gap-3 mb-6">
							<TicketIcon className="w-6 h-6 text-indigo-600" />
							<h2 className="text-lg font-semibold text-gray-900">
								Pilih Kupon
							</h2>
						</div>
						<select
							name="coupon"
							value={selectedCoupon}
							onChange={(e) => setSelectedCoupon(e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
						>
							<option value="">-- Pilih Kupon --</option>
							{availableCoupons.map((coupon) => (
								<option key={coupon.id} value={coupon.id}>
									{coupon.code}{" "}
									{coupon.description ? `- ${coupon.description}` : ""}
								</option>
							))}
						</select>
						{errors.coupon && (
							<p className="mt-2 text-sm text-red-600">{errors.coupon}</p>
						)}
					</div>

					<div className="bg-white rounded-lg shadow p-6">
						<div className="flex items-center gap-3 mb-6">
							<DocumentTextIcon className="w-6 h-6 text-indigo-600" />
							<h2 className="text-lg font-semibold text-gray-900">
								Informasi Dasar
							</h2>
						</div>
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Judul Event <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									name="title"
									value={formData.title}
									onChange={handleChange}
									placeholder="Contoh: Lomba Paskibra Tingkat Nasional 2024"
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
								/>
								{errors.title && (
									<p className="mt-1 text-sm text-red-600">{errors.title}</p>
								)}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Deskripsi
								</label>
								<textarea
									name="description"
									value={formData.description}
									onChange={handleChange}
									rows={4}
									placeholder="Deskripsi lengkap tentang event (opsional)"
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
								/>
							</div>

							{/* Thumbnail Upload */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									<div className="flex items-center gap-2">
										<PhotoIcon className="w-5 h-5" />
										Poster Event (Rasio 4:5)
									</div>
									<span className="text-xs text-gray-500 font-normal">
										Ukuran maksimal 10MB. Format: JPG, PNG
									</span>
								</label>

								{!thumbnailPreview ? (
									<div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors">
										<input
											type="file"
											accept="image/*"
											onChange={handleThumbnailUpload}
											className="hidden"
											id="thumbnail-upload"
											disabled={uploadingThumbnail}
										/>
										<label
											htmlFor="thumbnail-upload"
											className={`cursor-pointer flex flex-col items-center ${
												uploadingThumbnail
													? "opacity-50 cursor-not-allowed"
													: ""
											}`}
										>
											<PhotoIcon className="w-12 h-12 text-gray-400 mb-2" />
											<span className="text-sm text-gray-600 mb-1">
												{uploadingThumbnail
													? "Mengupload..."
													: "Klik untuk upload poster"}
											</span>
											<span className="text-xs text-gray-500">
												Rekomendasi: 800x1000px atau 1600x2000px
											</span>
										</label>
									</div>
								) : (
									<div className="relative">
										<div className="relative inline-block">
											<img
												src={thumbnailPreview}
												alt="Thumbnail Preview"
												className="w-64 h-80 object-cover rounded-lg border-2 border-indigo-200"
												style={{ aspectRatio: "4/5" }}
											/>
											<button
												type="button"
												onClick={removeThumbnail}
												className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
											>
												<XMarkIcon className="w-5 h-5" />
											</button>
										</div>
										<p className="mt-2 text-sm text-green-600">
											✓ Poster berhasil diupload
										</p>
									</div>
								)}

								{errors.thumbnail && (
									<p className="mt-2 text-sm text-red-600">
										{errors.thumbnail}
									</p>
								)}
							</div>
						</div>
					</div>

					<div className="bg-white rounded-lg shadow p-6">
						<div className="flex items-center gap-3 mb-4">
							<CheckIcon className="w-6 h-6 text-indigo-600" />
							<h2 className="text-lg font-semibold text-gray-900">
								Kategori Penilaian
							</h2>
						</div>
						<p className="text-sm text-gray-600 mb-6">
							Pilih kategori penilaian yang akan digunakan dalam lomba
						</p>

						{/* Main Categories */}
						<div className="mb-6">
							<h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
								<span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded">
									Utama
								</span>
								Kategori Utama
							</h3>
							<div className="space-y-3">
								{assessmentCategories
									.filter(
										(cat) =>
											cat.name.toUpperCase() === "PBB" ||
											cat.name.toUpperCase() === "KOMANDAN"
									)
									.map((category) => {
										const isSelected = formData.assessmentCategoryIds.includes(
											category.id
										);
										return (
											<label
												key={category.id}
												className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
													isSelected
														? "bg-indigo-50 border-indigo-300"
														: "bg-white border-gray-200 hover:border-indigo-200 hover:bg-gray-50"
												}`}
											>
												<input
													type="checkbox"
													checked={isSelected}
													onChange={() => toggleAssessmentCategory(category.id)}
													className="mt-1 w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
												/>
												<div className="flex-1">
													<div className="font-semibold text-gray-900 mb-1">
														{category.name}
													</div>
													<p className="text-sm text-gray-600">
														{category.description}
													</p>
												</div>
											</label>
										);
									})}
							</div>
						</div>

						{/* Additional Categories */}
						<div>
							<h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
								<span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
									Tambahan
								</span>
								Kategori Tambahan
								{formData.assessmentCategoryIds.filter((id) => {
									const cat = assessmentCategories.find((c) => c.id === id);
									return (
										cat &&
										cat.name.toUpperCase() !== "PBB" &&
										cat.name.toUpperCase() !== "KOMANDAN"
									);
								}).length > 0 && (
									<span className="text-gray-500 text-xs font-normal">
										(
										{
											formData.assessmentCategoryIds.filter((id) => {
												const cat = assessmentCategories.find(
													(c) => c.id === id
												);
												return (
													cat &&
													cat.name.toUpperCase() !== "PBB" &&
													cat.name.toUpperCase() !== "KOMANDAN"
												);
											}).length
										}{" "}
										dipilih)
									</span>
								)}
							</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								{assessmentCategories
									.filter(
										(cat) =>
											cat.name.toUpperCase() !== "PBB" &&
											cat.name.toUpperCase() !== "KOMANDAN"
									)
									.sort((a, b) => a.name.localeCompare(b.name))
									.map((category) => {
										const isSelected = formData.assessmentCategoryIds.includes(
											category.id
										);
										return (
											<label
												key={category.id}
												className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
													isSelected
														? "bg-indigo-50 border-indigo-300"
														: "bg-white border-gray-200 hover:border-indigo-200 hover:bg-gray-50"
												}`}
											>
												<input
													type="checkbox"
													checked={isSelected}
													onChange={() => toggleAssessmentCategory(category.id)}
													className="mt-1 w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
												/>
												<div className="flex-1 min-w-0">
													<div className="font-semibold text-gray-900 mb-1">
														{category.name}
													</div>
													<p className="text-sm text-gray-600 line-clamp-2">
														{category.description}
													</p>
												</div>
											</label>
										);
									})}
							</div>
						</div>

						{errors.assessmentCategoryIds && (
							<p className="mt-4 text-sm text-red-600">
								{errors.assessmentCategoryIds}
							</p>
						)}
					</div>

					<div className="bg-white rounded-lg shadow p-6">
						<div className="flex items-center gap-3 mb-6">
							<CalendarIcon className="w-6 h-6 text-indigo-600" />
							<h2 className="text-lg font-semibold text-gray-900">
								Jadwal Event
							</h2>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Tanggal Mulai <span className="text-red-500">*</span>
								</label>
								<input
									type="date"
									name="startDate"
									value={formData.startDate}
									onChange={handleChange}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
								/>
								{errors.startDate && (
									<p className="mt-1 text-sm text-red-600">
										{errors.startDate}
									</p>
								)}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Tanggal Selesai <span className="text-red-500">*</span>
								</label>
								<input
									type="date"
									name="endDate"
									value={formData.endDate}
									onChange={handleChange}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
								/>
								{errors.endDate && (
									<p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
								)}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Batas Pendaftaran
								</label>
								<input
									type="date"
									name="registrationDeadline"
									value={formData.registrationDeadline}
									onChange={handleChange}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
								/>
							</div>
						</div>
					</div>

					<div className="bg-white rounded-lg shadow p-6">
						<div className="flex items-center gap-3 mb-6">
							<MapPinIcon className="w-6 h-6 text-indigo-600" />
							<h2 className="text-lg font-semibold text-gray-900">
								Lokasi Event
							</h2>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Kota/Kabupaten <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									name="location"
									value={formData.location}
									onChange={handleChange}
									placeholder="Contoh: Jakarta Pusat"
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
								/>
								{errors.location && (
									<p className="mt-1 text-sm text-red-600">{errors.location}</p>
								)}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Nama Venue
								</label>
								<input
									type="text"
									name="venue"
									value={formData.venue}
									onChange={handleChange}
									placeholder="Contoh: Stadion Utama Gelora Bung Karno"
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
								/>
							</div>
						</div>
					</div>

					<div className="bg-white rounded-lg shadow p-6">
						<div className="flex items-center gap-3 mb-4">
							<UsersIcon className="w-6 h-6 text-indigo-600" />
							<h2 className="text-lg font-semibold text-gray-900">
								Kategori Peserta & Kuota
							</h2>
						</div>
						<p className="text-sm text-gray-600 mb-4">
							Pilih kategori sekolah dan tentukan kuota maksimal per kategori
						</p>
						<div className="space-y-4">
							{schoolCategories
								.sort((a, b) => a.order - b.order)
								.map((category) => {
									const isSelected = selectedSchoolCategories.has(category.id);
									const limit = formData.schoolCategoryLimits.find(
										(l) => l.categoryId === category.id
									);
									const categoryColors: Record<string, string> = {
										SD: "bg-green-500 hover:bg-green-600",
										SMP: "bg-blue-500 hover:bg-blue-600",
										SMA: "bg-purple-500 hover:bg-purple-600",
										PURNA: "bg-orange-500 hover:bg-orange-600",
									};
									const bgColor =
										categoryColors[category.name] ||
										"bg-gray-500 hover:bg-gray-600";
									return (
										<div key={category.id} className="flex items-center gap-4">
											<button
												type="button"
												onClick={() => toggleSchoolCategory(category.id)}
												className={`px-6 py-3 rounded-lg text-white font-semibold transition-all flex-shrink-0 w-32 ${
													isSelected ? bgColor : "bg-gray-300 hover:bg-gray-400"
												}`}
											>
												{category.name}
											</button>
											<div className="flex-1">
												<p className="text-sm text-gray-600">
													{category.description}
												</p>
											</div>
											{isSelected && (
												<div className="flex-shrink-0 w-48">
													<label className="block text-xs font-medium text-gray-700 mb-1">
														Maks. Peserta
													</label>
													<input
														type="number"
														value={limit?.maxParticipants || ""}
														onChange={(e) => {
															let value = e.target.value;

															// Remove leading zeros
															value = value.replace(/^0+/, "");

															if (value === "") {
																// Allow empty for editing
																updateSchoolCategoryLimit(category.id, 0);
															} else {
																const numValue = parseInt(value, 10);
																if (!isNaN(numValue) && numValue >= 0) {
																	updateSchoolCategoryLimit(
																		category.id,
																		numValue
																	);
																}
															}
														}}
														onBlur={(e) => {
															// On blur, ensure minimum value is 20
															const value = parseInt(e.target.value, 10);
															if (isNaN(value) || value < 20) {
																updateSchoolCategoryLimit(category.id, 20);
															}
														}}
														min="20"
														placeholder="Min. 20"
														className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
													/>
												</div>
											)}
										</div>
									);
								})}
						</div>
						{errors.schoolCategories && (
							<p className="mt-2 text-sm text-red-600">
								{errors.schoolCategories}
							</p>
						)}
					</div>

					<div className="bg-white rounded-lg shadow p-6">
						<div className="flex items-center gap-3 mb-6">
							<CurrencyDollarIcon className="w-6 h-6 text-indigo-600" />
							<h2 className="text-lg font-semibold text-gray-900">
								Biaya & Kontak
							</h2>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
								/>
								<p className="text-xs text-gray-500 mt-1">
									Contoh: 100.000 atau 250.000
								</p>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Penyelenggara
								</label>
								<input
									type="text"
									name="organizer"
									value={formData.organizer}
									onChange={handleChange}
									placeholder="Nama organisasi penyelenggara"
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
								/>
							</div>
							<div>
								<label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
									<EnvelopeIcon className="w-4 h-4" />
									Email Kontak <span className="text-red-500">*</span>
								</label>
								<input
									type="email"
									name="contactEmail"
									value={formData.contactEmail}
									onChange={handleChange}
									placeholder="email@example.com"
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
								/>
								{errors.contactEmail && (
									<p className="mt-1 text-sm text-red-600">
										{errors.contactEmail}
									</p>
								)}
							</div>
							<div>
								<label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
									<PhoneIcon className="w-4 h-4" />
									Nomor Telepon
								</label>
								<input
									type="tel"
									name="contactPhone"
									value={formData.contactPhone}
									onChange={handleChange}
									placeholder="08123456789"
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
								/>
							</div>
						</div>
					</div>

					<div className="bg-white rounded-lg shadow p-6">
						<div className="flex items-center gap-3 mb-6">
							<DocumentTextIcon className="w-6 h-6 text-indigo-600" />
							<h2 className="text-lg font-semibold text-gray-900">
								Status Publikasi
							</h2>
						</div>
						<select
							name="status"
							value={formData.status}
							onChange={handleChange}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
						>
							<option value="DRAFT">Draft (Tidak ditampilkan)</option>
							<option value="PUBLISHED">
								Publikasi (Ditampilkan di landing page)
							</option>
						</select>
					</div>

					<div className="flex items-center justify-end gap-4 pt-4">
						<Link
							to="/panitia/dashboard"
							className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
						>
							Batal
						</Link>
						<button
							type="submit"
							disabled={loading}
							className={`px-6 py-3 rounded-lg text-white font-medium transition-colors ${
								loading
									? "bg-gray-400 cursor-not-allowed"
									: "bg-indigo-600 hover:bg-indigo-700"
							}`}
						>
							{loading ? "Membuat Event..." : "Buat Event"}
						</button>
					</div>
				</form>
			</main>
		</div>
	);
};

export default CreateEventForm;
