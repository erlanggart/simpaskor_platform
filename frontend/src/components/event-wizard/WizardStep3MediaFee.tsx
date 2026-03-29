import React, { useState, useRef } from "react";
import {
	PhotoIcon,
	DocumentArrowUpIcon,
	CurrencyDollarIcon,
	PhoneIcon,
	BuildingOfficeIcon,
	PlayCircleIcon,
	XMarkIcon,
	UserIcon,
} from "@heroicons/react/24/outline";
import { Step3Props, Step3Data } from "../../types/eventWizard";
import { api } from "../../utils/api";

// Helper to get full image URL for existing thumbnails
const getImageUrl = (thumbnail: string | null) => {
	if (!thumbnail) return null;
	if (thumbnail.startsWith("http://") || thumbnail.startsWith("https://") || thumbnail.startsWith("data:")) {
		return thumbnail;
	}
	const backendUrl = import.meta.env.VITE_BACKEND_URL || "";
	return `${backendUrl}${thumbnail}`;
};

const WizardStep3MediaFee: React.FC<Step3Props> = ({
	data,
	setData,
	errors: _errors,
	onBack,
	onNext,
	isLoading,
	isSubmitting,
	isEditMode,
}) => {
	const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(
		getImageUrl(data.thumbnail)
	);
	const [juknisFileName, setJuknisFileName] = useState<string | null>(
		data.juknisUrl ? data.juknisUrl.split("/").pop() || "Juknis uploaded" : null
	);
	const [posterError, setPosterError] = useState<string | null>(null);
	const [juknisError, setJuknisError] = useState<string | null>(null);
	const [isUploadingPoster, setIsUploadingPoster] = useState(false);
	const [isUploadingJuknis, setIsUploadingJuknis] = useState(false);
	const posterInputRef = useRef<HTMLInputElement>(null);
	const juknisInputRef = useRef<HTMLInputElement>(null);

	// Max file sizes in bytes
	const MAX_POSTER_SIZE = 5 * 1024 * 1024; // 5MB
	const MAX_JUKNIS_SIZE = 10 * 1024 * 1024; // 10MB

	const formatFileSize = (bytes: number) => {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	};

	const handlePosterChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		setPosterError(null);
		
		if (file) {
			// Validate file size
			if (file.size > MAX_POSTER_SIZE) {
				setPosterError(`File terlalu besar (${formatFileSize(file.size)}). Maksimal ${formatFileSize(MAX_POSTER_SIZE)}`);
				if (posterInputRef.current) posterInputRef.current.value = "";
				return;
			}

			// Show preview immediately
			const reader = new FileReader();
			reader.onloadend = () => {
				setThumbnailPreview(reader.result as string);
			};
			reader.readAsDataURL(file);

			// Upload file to server
			setIsUploadingPoster(true);
			try {
				const formData = new FormData();
				formData.append("thumbnail", file);

				const response = await api.post("/events/upload-thumbnail", formData, {
					headers: {
						"Content-Type": "multipart/form-data",
					},
				});

				setData((prev: Step3Data) => ({ ...prev, thumbnail: response.data.thumbnailUrl }));
			} catch (error: any) {
				setPosterError(error.response?.data?.message || error.message || "Gagal upload poster");
				setThumbnailPreview(null);
				if (posterInputRef.current) posterInputRef.current.value = "";
			} finally {
				setIsUploadingPoster(false);
			}
		}
	};

	const handleJuknisChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		setJuknisError(null);
		
		if (file) {
			// Validate file size
			if (file.size > MAX_JUKNIS_SIZE) {
				setJuknisError(`File terlalu besar (${formatFileSize(file.size)}). Maksimal ${formatFileSize(MAX_JUKNIS_SIZE)}`);
				if (juknisInputRef.current) juknisInputRef.current.value = "";
				return;
			}

			// Upload file to server
			setIsUploadingJuknis(true);
			setJuknisFileName(file.name);
			try {
				const formData = new FormData();
				formData.append("juknis", file);

				const response = await api.post("/events/upload-juknis", formData, {
					headers: {
						"Content-Type": "multipart/form-data",
					},
				});

				setData((prev: Step3Data) => ({ ...prev, juknisUrl: response.data.juknisUrl }));
			} catch (error: any) {
				setJuknisError(error.response?.data?.message || error.message || "Gagal upload juknis");
				setJuknisFileName(null);
				if (juknisInputRef.current) juknisInputRef.current.value = "";
			} finally {
				setIsUploadingJuknis(false);
			}
		}
	};

	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
	) => {
		const { name, value } = e.target;
		setData((prev: Step3Data) => ({ ...prev, [name]: value }));
	};

	const removePoster = () => {
		setThumbnailPreview(null);
		setPosterError(null);
		setData((prev: Step3Data) => ({ ...prev, thumbnail: "" }));
		if (posterInputRef.current) posterInputRef.current.value = "";
	};

	const removeJuknis = () => {
		setJuknisFileName(null);
		setJuknisError(null);
		setData((prev: Step3Data) => ({ ...prev, juknisUrl: "" }));
		if (juknisInputRef.current) juknisInputRef.current.value = "";
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="text-center mb-8">
				<h2 className="text-2xl font-bold text-gray-900 dark:text-white">
					Media & Biaya
				</h2>
				<p className="text-gray-600 dark:text-gray-400 mt-2">
					Upload poster, juknis, dan tentukan biaya pendaftaran
				</p>
			</div>

			{/* Poster Upload */}
			<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-950/20 border border-gray-200 dark:border-gray-700 p-6 transition-colors">
				<div className="flex items-center gap-3 mb-4">
					<PhotoIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
						Poster Event
					</h3>
				</div>

				<label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
					Upload Poster (Opsional)
				</label>

				{thumbnailPreview ? (
					/* Image Preview - replaces the drop zone */
					<div className="relative rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 max-w-xs">
						<img
							src={thumbnailPreview}
							alt="Preview Poster"
							className="w-full aspect-[3/4] object-cover cursor-pointer"
							onClick={() => !isUploadingPoster && posterInputRef.current?.click()}
							title="Klik untuk ganti poster"
						/>
						{isUploadingPoster && (
							<div className="absolute inset-0 bg-black/50 flex items-center justify-center">
								<div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
							</div>
						)}
						{!isUploadingPoster && (
							<>
								<div
									onClick={() => posterInputRef.current?.click()}
									className="absolute inset-0 bg-black/0 hover:bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-all cursor-pointer"
								>
									<span className="text-white text-sm font-medium bg-black/60 px-3 py-1.5 rounded-lg">
										Ganti Poster
									</span>
								</div>
								<button
									type="button"
									onClick={(e) => { e.stopPropagation(); removePoster(); }}
									className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow"
								>
									<XMarkIcon className="w-4 h-4" />
								</button>
							</>
						)}
					</div>
				) : (
					/* Drop Zone - shown when no image selected */
					<div
						onClick={() => !isUploadingPoster && posterInputRef.current?.click()}
						className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors bg-gray-50 dark:bg-gray-900 ${
							isUploadingPoster 
								? "border-red-400 dark:border-red-500 cursor-wait"
								: posterError 
									? "border-red-400 dark:border-red-500 hover:border-red-500 dark:hover:border-red-400 cursor-pointer" 
									: "border-gray-300 dark:border-gray-600 hover:border-red-500 dark:hover:border-red-400 cursor-pointer"
						}`}
					>
						{isUploadingPoster ? (
							<>
								<div className="w-12 h-12 mx-auto mb-4 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
								<p className="text-red-600 dark:text-red-400 font-medium">
									Mengupload poster...
								</p>
							</>
						) : (
							<>
								<PhotoIcon className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
								<p className="text-gray-600 dark:text-gray-400">
									Klik untuk upload atau drag & drop
								</p>
								<p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
									PNG, JPG, WEBP (maks 5MB)
								</p>
							</>
						)}
					</div>
				)}

				{posterError && (
					<p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
						<span className="font-medium">⚠️</span> {posterError}
					</p>
				)}
				<input
					ref={posterInputRef}
					type="file"
					accept="image/png,image/jpeg,image/webp"
					onChange={handlePosterChange}
					className="hidden"
				/>
			</div>

			{/* Juknis Upload */}
			<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-950/20 border border-gray-200 dark:border-gray-700 p-6 transition-colors">
				<div className="flex items-center gap-3 mb-4">
					<DocumentArrowUpIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
						Petunjuk Teknis (Juknis)
					</h3>
				</div>

				<label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
					Upload Juknis (Opsional)
				</label>
				<div
					onClick={() => !isUploadingJuknis && juknisInputRef.current?.click()}
					className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors bg-gray-50 dark:bg-gray-900 ${
						isUploadingJuknis
							? "border-red-400 dark:border-red-500 cursor-wait"
							: juknisError 
								? "border-red-400 dark:border-red-500 hover:border-red-500 dark:hover:border-red-400 cursor-pointer" 
								: "border-gray-300 dark:border-gray-600 hover:border-red-500 dark:hover:border-red-400 cursor-pointer"
					}`}
				>
					{isUploadingJuknis ? (
						<>
							<div className="w-10 h-10 mx-auto mb-3 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
							<p className="text-red-600 dark:text-red-400 font-medium">
								Mengupload juknis...
							</p>
						</>
					) : (
						<>
							<DocumentArrowUpIcon className="w-10 h-10 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
							<p className="text-gray-600 dark:text-gray-400">
								Klik untuk upload dokumen juknis
							</p>
							<p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
								PDF (maks 10MB)
							</p>
						</>
					)}
				</div>
				{juknisError && (
					<p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
						<span className="font-medium">⚠️</span> {juknisError}
					</p>
				)}
				<input
					ref={juknisInputRef}
					type="file"
					accept=".pdf"
					onChange={handleJuknisChange}
					className="hidden"
				/>

				{juknisFileName && (
					<div className="mt-3 flex items-center justify-between bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2">
						<div className="flex items-center gap-2 truncate">
							{isUploadingJuknis && (
								<div className="w-4 h-4 border-2 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
							)}
							<span className="text-sm text-gray-700 dark:text-gray-300 truncate">
								{juknisFileName}
							</span>
						</div>
						{!isUploadingJuknis && (
							<button
								type="button"
								onClick={removeJuknis}
								className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
							>
								<XMarkIcon className="w-5 h-5" />
							</button>
						)}
					</div>
				)}
			</div>

			{/* Contact Person */}
			<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-950/20 border border-gray-200 dark:border-gray-700 p-6 transition-colors">
				<div className="flex items-center gap-3 mb-4">
					<UserIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
						Contact Person
					</h3>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{/* Contact Person Name */}
					<div>
						<label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							<UserIcon className="w-4 h-4" />
							Nama Contact Person
						</label>
						<input
							type="text"
							name="contactPersonName"
							value={data.contactPersonName}
							onChange={handleChange}
							placeholder="Nama lengkap contact person"
							className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent transition-colors"
						/>
					</div>

					{/* Contact Phone/WA */}
					<div>
						<label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							<PhoneIcon className="w-4 h-4" />
							Nomor Telepon / WhatsApp
						</label>
						<input
							type="tel"
							name="contactPhone"
							value={data.contactPhone}
							onChange={handleChange}
							placeholder="08xxxxxxxxxx"
							className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent transition-colors"
						/>
					</div>
				</div>
			</div>

			{/* Fee & Organizer */}
			<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-950/20 border border-gray-200 dark:border-gray-700 p-6 transition-colors">
				<div className="flex items-center gap-3 mb-4">
					<CurrencyDollarIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
						Biaya & Penyelenggara
					</h3>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{/* Registration Fee */}
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							Biaya Pendaftaran (Rp)
						</label>
						<input
							type="number"
							name="registrationFee"
							value={data.registrationFee}
							onChange={handleChange}
							min="0"
							placeholder="0 = Gratis"
							className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent transition-colors"
						/>
						<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
							Kosongkan atau 0 jika event gratis
						</p>
					</div>

					{/* Organizer */}
					<div>
						<label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							<BuildingOfficeIcon className="w-4 h-4" />
							Penyelenggara
						</label>
						<input
							type="text"
							name="organizer"
							value={data.organizer}
							onChange={handleChange}
							placeholder="Nama penyelenggara"
							className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent transition-colors"
						/>
					</div>
				</div>
			</div>

			{/* Event Status */}
			<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-950/20 border border-gray-200 dark:border-gray-700 p-6 transition-colors">
				<div className="flex items-center gap-3 mb-4">
					<PlayCircleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
						Status Event
					</h3>
				</div>

				<div className="space-y-4">
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
						Pilih status event setelah dibuat
					</label>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<label
							className={`flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
								data.status === "DRAFT"
									? "border-red-600 dark:border-red-400 bg-red-50 dark:bg-red-900/30"
									: "border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-600"
							}`}
						>
							<div className="flex items-center gap-3 mb-2">
								<input
									type="radio"
									name="status"
									value="DRAFT"
									checked={data.status === "DRAFT"}
									onChange={handleChange}
									className="w-4 h-4 text-red-600 dark:text-red-400"
								/>
								<span className="font-medium text-gray-900 dark:text-white">Draft</span>
							</div>
							<p className="text-sm text-gray-500 dark:text-gray-400 ml-7">
								Simpan sebagai draft, event tidak ditampilkan ke publik
							</p>
						</label>

						<label
							className={`flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
								data.status === "PUBLISHED"
									? "border-red-600 dark:border-red-400 bg-red-50 dark:bg-red-900/30"
									: "border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-600"
							}`}
						>
							<div className="flex items-center gap-3 mb-2">
								<input
									type="radio"
									name="status"
									value="PUBLISHED"
									checked={data.status === "PUBLISHED"}
									onChange={handleChange}
									className="w-4 h-4 text-red-600 dark:text-red-400"
								/>
								<span className="font-medium text-gray-900 dark:text-white">
									Publish (Publikasikan)
								</span>
							</div>
							<p className="text-sm text-gray-500 dark:text-gray-400 ml-7">
								Langsung publikasikan, event akan terlihat di halaman publik
							</p>
						</label>
					</div>

					{/* Auto status info */}
					<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
						<p className="text-xs text-blue-800 dark:text-blue-200">
							<strong>ℹ️ Status otomatis:</strong> Setelah dipublish, status akan berubah otomatis:
							<br />• <strong>Published</strong> → saat pendaftaran masih buka
							<br />• <strong>Ongoing</strong> → saat batas pendaftaran lewat hingga event selesai
							<br />• <strong>Completed</strong> → setelah tanggal event berakhir
						</p>
					</div>
				</div>
			</div>

			{/* Navigation */}
			<div className="flex justify-between">
				<button
					type="button"
					onClick={onBack}
					disabled={isUploadingPoster || isUploadingJuknis}
					className={`px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium transition-colors ${
						isUploadingPoster || isUploadingJuknis
							? "opacity-50 cursor-not-allowed"
							: "hover:bg-gray-50 dark:hover:bg-gray-700"
					}`}
				>
					Kembali
				</button>
				<button
					type="button"
					onClick={onNext}
					disabled={isLoading || isSubmitting || isUploadingPoster || isUploadingJuknis}
					className={`px-8 py-3 rounded-lg text-white font-medium transition-colors ${
						isLoading || isSubmitting || isUploadingPoster || isUploadingJuknis
							? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed"
							: "bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600"
					}`}
				>
					{isSubmitting 
						? (isEditMode ? "Menyimpan..." : "Membuat Event...") 
						: isUploadingPoster || isUploadingJuknis
							? "Mengupload..."
							: (isEditMode ? "Simpan Perubahan" : "Buat Event")}
				</button>
			</div>
		</div>
	);
};

export default WizardStep3MediaFee;
