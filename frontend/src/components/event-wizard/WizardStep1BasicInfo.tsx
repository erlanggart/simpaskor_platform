import React, { useMemo } from "react";
import {
	CalendarIcon,
	MapPinIcon,
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
	errors,
	onNext,
	isLoading,
	isEditMode: _isEditMode,
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
					disabled={isLoading}
					className={`px-8 py-3 rounded-lg text-white font-medium transition-colors ${
						isLoading
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
