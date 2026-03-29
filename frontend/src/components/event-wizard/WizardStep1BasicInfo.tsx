import React, { useMemo } from "react";
import {
	CalendarIcon,
	MapPinIcon,
	TicketIcon,
	DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { Step1Props, Step1Data } from "../../types/eventWizard";
import {
	indonesiaCities,
	provinces,
} from "../../utils/indonesiaCities";

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
	// Filter cities based on selected province
	const filteredCities = useMemo(() => {
		if (!data.province) return [];
		return indonesiaCities.filter((city) => city.province === data.province);
	}, [data.province]);

	const handleChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>
	) => {
		const { name, value } = e.target;
		// Reset city when province changes
		if (name === "province") {
			setData((prev: Step1Data) => ({ ...prev, province: value, city: "" }));
		} else if (name === "startDate") {
			// When start date changes, reset end date if it's before start date
			setData((prev: Step1Data) => {
				const newData = { ...prev, startDate: value };
				if (prev.endDate && value && prev.endDate < value) {
					newData.endDate = value;
				}
				return newData;
			});
		} else {
			setData((prev: Step1Data) => ({ ...prev, [name]: value }));
		}
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
			<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-950/20 border border-gray-200 dark:border-gray-700 p-6 transition-colors">
				<div className="flex items-center gap-3 mb-4">
					<TicketIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
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
											? "border-red-600 dark:border-red-500 bg-red-100 dark:bg-red-600/40 ring-2 ring-red-500/30 dark:ring-red-400/30"
											: "border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-600 hover:bg-gray-50 dark:hover:bg-gray-700/50"
									}`}
								>
									<input
										type="radio"
										name="couponId"
										value={coupon.id}
										checked={isSelected}
										onChange={handleChange}
										className="w-5 h-5 text-red-600 dark:text-red-400 border-2 border-gray-300 dark:border-gray-500 focus:ring-red-500"
									/>
									<div>
										<p className={`font-semibold ${isSelected ? "text-red-700 dark:text-red-200" : "text-gray-900 dark:text-white"}`}>
											{coupon.code}
										</p>
										{coupon.description && (
											<p className={`text-sm ${isSelected ? "text-red-600 dark:text-red-300" : "text-gray-500 dark:text-gray-400"}`}>
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
			<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-950/20 border border-gray-200 dark:border-gray-700 p-6 transition-colors">
				<div className="flex items-center gap-3 mb-4">
					<DocumentTextIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
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
							className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent transition-colors ${
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
							className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent resize-none transition-colors"
						/>
					</div>
				</div>
			</div>

			{/* Date & Location */}
			<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-950/20 border border-gray-200 dark:border-gray-700 p-6 transition-colors">
				<div className="flex items-center gap-3 mb-4">
					<CalendarIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
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
							className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent transition-colors ${
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
							min={data.startDate || undefined}
							className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent transition-colors ${
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
							className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent transition-colors"
						/>
						<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
							Kosongkan jika sama dengan tanggal mulai
						</p>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
					{/* Province */}
					<div>
						<label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							<MapPinIcon className="w-4 h-4" />
							Provinsi <span className="text-red-500">*</span>
						</label>
						<select
							name="province"
							value={data.province}
							onChange={handleChange}
							className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent transition-colors ${
								errors.province ? "border-red-500 dark:border-red-400" : "border-gray-300 dark:border-gray-600"
							}`}
						>
							<option value="">Pilih Provinsi</option>
							{provinces.map((prov) => (
								<option key={prov.id} value={prov.name}>
									{prov.name}
								</option>
							))}
						</select>
						{errors.province && (
							<p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.province}</p>
						)}
					</div>

					{/* City/Kabupaten */}
					<div>
						<label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							<MapPinIcon className="w-4 h-4" />
							Kota/Kabupaten <span className="text-red-500">*</span>
						</label>
						<select
							name="city"
							value={data.city}
							onChange={handleChange}
							disabled={!data.province}
							className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent transition-colors disabled:bg-gray-100 disabled:dark:bg-gray-800 disabled:cursor-not-allowed ${
								errors.city ? "border-red-500 dark:border-red-400" : "border-gray-300 dark:border-gray-600"
							}`}
						>
							<option value="">{data.province ? "Pilih Kota/Kabupaten" : "Pilih Provinsi dulu"}</option>
							{filteredCities.map((city) => (
								<option key={city.id} value={city.name}>
									{city.name}
								</option>
							))}
						</select>
						{errors.city && (
							<p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.city}</p>
						)}
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
							className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent transition-colors"
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
							: "bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600"
					}`}
				>
					{isLoading ? "Menyimpan..." : "Selanjutnya"}
				</button>
			</div>
		</div>
	);
};

export default WizardStep1BasicInfo;
