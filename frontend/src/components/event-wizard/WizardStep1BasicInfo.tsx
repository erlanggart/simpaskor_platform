import React from "react";
import {
	CalendarIcon,
	MapPinIcon,
	TicketIcon,
	DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { Step1Props, Step1Data } from "../../types/eventWizard";

const WizardStep1BasicInfo: React.FC<Step1Props> = ({
	data,
	setData,
	coupons,
	errors,
	onNext,
	isLoading,
	isEditMode,
	currentCouponCode,
}) => {
	const handleChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>
	) => {
		const { name, value } = e.target;
		setData((prev: Step1Data) => ({ ...prev, [name]: value }));
	};

	// Let parent handle validation - just call onNext directly
	const handleNext = () => {
		onNext();
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="text-center mb-8">
				<h2 className="text-2xl font-bold text-gray-900 dark:text-white">Informasi Dasar</h2>
				<p className="text-gray-600 dark:text-gray-400 mt-2">
					Masukkan informasi dasar event Anda
				</p>
			</div>

			{/* Coupon Selection */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-6 transition-colors">
				<div className="flex items-center gap-3 mb-4">
					<TicketIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
						{isEditMode ? "Kupon Event" : "Pilih Kupon"}
					</h3>
				</div>

				{isEditMode ? (
					/* Show existing coupon in edit mode */
					<div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
								<TicketIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
							</div>
							<div>
								<p className="font-semibold text-green-700 dark:text-green-300">
									{currentCouponCode || "Kupon terkait"}
								</p>
								<p className="text-sm text-green-600 dark:text-green-400">
									Kupon sudah terkait dengan event ini
								</p>
							</div>
						</div>
					</div>
				) : coupons.length === 0 ? (
					<div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
						<p className="text-yellow-700 dark:text-yellow-400">
							Anda tidak memiliki kupon yang tersedia. Hubungi admin untuk
							mendapatkan kupon pembuatan event.
						</p>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						{coupons.map((coupon) => {
							const isSelected = data.couponId === coupon.id;
							return (
								<label
									key={coupon.id}
									className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
										isSelected
											? "border-indigo-600 dark:border-indigo-500 bg-indigo-100 dark:bg-indigo-600/40 ring-2 ring-indigo-500/30 dark:ring-indigo-400/30"
											: "border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-gray-50 dark:hover:bg-gray-700/50"
									}`}
								>
									<input
										type="radio"
										name="couponId"
										value={coupon.id}
										checked={isSelected}
										onChange={handleChange}
										className="w-5 h-5 text-indigo-600 dark:text-indigo-400 border-2 border-gray-300 dark:border-gray-500 focus:ring-indigo-500"
									/>
									<div>
										<p className={`font-semibold ${isSelected ? "text-indigo-700 dark:text-indigo-200" : "text-gray-900 dark:text-white"}`}>
											{coupon.code}
										</p>
										{coupon.description && (
											<p className={`text-sm ${isSelected ? "text-indigo-600 dark:text-indigo-300" : "text-gray-500 dark:text-gray-400"}`}>
												{coupon.description}
											</p>
										)}
									</div>
								</label>
							);
						})}
					</div>
				)}
				{errors.couponId && !isEditMode && (
					<p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.couponId}</p>
				)}
			</div>

			{/* Event Details */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-6 transition-colors">
				<div className="flex items-center gap-3 mb-4">
					<DocumentTextIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">Detail Event</h3>
				</div>

				<div className="space-y-4">
					{/* Title */}
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							Judul Event <span className="text-red-500">*</span>
						</label>
						<input
							type="text"
							name="title"
							value={data.title}
							onChange={handleChange}
							placeholder="Contoh: Lomba Paskibra Tingkat Nasional 2026"
							className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-colors ${
								errors.title ? "border-red-500 dark:border-red-400" : "border-gray-300 dark:border-gray-600"
							}`}
						/>
						{errors.title && (
							<p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
						)}
					</div>

					{/* Description */}
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							Deskripsi
						</label>
						<textarea
							name="description"
							value={data.description}
							onChange={handleChange}
							rows={4}
							placeholder="Deskripsi singkat tentang event..."
							className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent resize-none transition-colors"
						/>
					</div>
				</div>
			</div>

			{/* Date & Location */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-6 transition-colors">
				<div className="flex items-center gap-3 mb-4">
					<CalendarIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
						Tanggal & Lokasi
					</h3>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{/* Start Date */}
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							Tanggal Mulai <span className="text-red-500">*</span>
						</label>
						<input
							type="date"
							name="startDate"
							value={data.startDate}
							onChange={handleChange}
							className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-colors ${
								errors.startDate ? "border-red-500 dark:border-red-400" : "border-gray-300 dark:border-gray-600"
							}`}
						/>
						{errors.startDate && (
							<p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.startDate}</p>
						)}
					</div>

					{/* End Date */}
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							Tanggal Selesai <span className="text-red-500">*</span>
						</label>
						<input
							type="date"
							name="endDate"
							value={data.endDate}
							onChange={handleChange}
							className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-colors ${
								errors.endDate ? "border-red-500 dark:border-red-400" : "border-gray-300 dark:border-gray-600"
							}`}
						/>
						{errors.endDate && (
							<p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.endDate}</p>
						)}
					</div>

					{/* Registration Deadline */}
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							Batas Pendaftaran
						</label>
						<input
							type="date"
							name="registrationDeadline"
							value={data.registrationDeadline}
							onChange={handleChange}
							className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-colors"
						/>
						<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
							Kosongkan jika sama dengan tanggal mulai
						</p>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
					{/* Location */}
					<div>
						<label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							<MapPinIcon className="w-4 h-4" />
							Lokasi (Kota/Provinsi) <span className="text-red-500">*</span>
						</label>
						<input
							type="text"
							name="location"
							value={data.location}
							onChange={handleChange}
							placeholder="Contoh: Jakarta, DKI Jakarta"
							className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-colors ${
								errors.location ? "border-red-500 dark:border-red-400" : "border-gray-300 dark:border-gray-600"
							}`}
						/>
						{errors.location && (
							<p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.location}</p>
						)}
					</div>

					{/* Venue */}
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							Tempat/Venue
						</label>
						<input
							type="text"
							name="venue"
							value={data.venue}
							onChange={handleChange}
							placeholder="Contoh: Stadion Utama GBK"
							className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-colors"
						/>
					</div>
				</div>
			</div>

			{/* Navigation */}
			<div className="flex justify-end">
				<button
					type="button"
					onClick={handleNext}
					disabled={isLoading || (!isEditMode && coupons.length === 0)}
					className={`px-8 py-3 rounded-lg text-white font-medium transition-colors ${
						isLoading || (!isEditMode && coupons.length === 0)
							? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed"
							: "bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600"
					}`}
				>
					{isLoading ? "Menyimpan..." : "Selanjutnya"}
				</button>
			</div>
		</div>
	);
};

export default WizardStep1BasicInfo;
