import React from "react";
import {
	PlusIcon,
	TrashIcon,
	Cog6ToothIcon,
	CheckCircleIcon,
	XMarkIcon,
} from "@heroicons/react/24/outline";

export interface ScoreOptionInput {
	name: string;
	score: number;
}

export interface ScoreCategoryInput {
	name: string;
	color: string;
	options: ScoreOptionInput[];
}

export interface SchoolCategory {
	id: string;
	name: string;
	order: number;
}

export interface MaterialForCopy {
	id: string;
	name: string;
	scoreCategories: {
		name: string;
		color: string | null;
		options: { name: string; score: number }[];
	}[];
}

interface MaterialFormProps {
	// Form state
	isEditing: boolean;
	materialForm: {
		number: number;
		name: string;
		description: string;
	};
	setMaterialForm: React.Dispatch<React.SetStateAction<{
		number: number;
		name: string;
		description: string;
	}>>;

	// School categories
	eventSchoolCategories: SchoolCategory[];
	selectedSchoolCategories: string[];
	onToggleSchoolCategory: (categoryId: string) => void;
	onSelectAllSchoolCategories: () => void;
	onDeselectAllSchoolCategories: () => void;

	// Score categories
	categoryInputs: ScoreCategoryInput[];
	setCategoryInputs: React.Dispatch<React.SetStateAction<ScoreCategoryInput[]>>;
	activeCategoryTab: number;
	setActiveCategoryTab: React.Dispatch<React.SetStateAction<number>>;

	// Actions
	onClose: () => void;
	onSave: () => void;

	// Materials for copying categories
	materialsForCopy: MaterialForCopy[];
}

const getColorClasses = (color: string) => {
	const colors: Record<string, string> = {
		red: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
		yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
		green: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
		blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
		purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
		orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
		gray: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
	};
	return colors[color] || colors.gray;
};

const MaterialForm: React.FC<MaterialFormProps> = ({
	isEditing,
	materialForm,
	setMaterialForm,
	eventSchoolCategories,
	selectedSchoolCategories,
	onToggleSchoolCategory,
	onSelectAllSchoolCategories,
	onDeselectAllSchoolCategories,
	categoryInputs,
	setCategoryInputs,
	activeCategoryTab,
	setActiveCategoryTab,
	onClose,
	onSave,
	materialsForCopy,
}) => {
	// Score Category Functions
	const addCategoryInput = () => {
		const newIndex = categoryInputs.length;
		setCategoryInputs([
			...categoryInputs,
			{ name: "", color: "gray", options: [{ name: "", score: 0 }] },
		]);
		setActiveCategoryTab(newIndex);
	};

	const removeCategoryInput = (index: number) => {
		if (categoryInputs.length <= 1) return;
		setCategoryInputs(categoryInputs.filter((_, i) => i !== index));
		if (activeCategoryTab >= index && activeCategoryTab > 0) {
			setActiveCategoryTab(activeCategoryTab - 1);
		}
	};

	const updateCategoryInput = (
		index: number,
		field: "name" | "color",
		value: string
	) => {
		setCategoryInputs((prev) =>
			prev.map((cat, i) => (i === index ? { ...cat, [field]: value } : cat))
		);
	};

	// Score Option Functions
	const addOptionToCategory = (categoryIndex: number) => {
		setCategoryInputs((prev) =>
			prev.map((cat, i) => {
				if (i === categoryIndex) {
					const lastOption = cat.options[cat.options.length - 1];
					const lastScore = lastOption ? lastOption.score + 1 : 1;
					return {
						...cat,
						options: [...cat.options, { name: "", score: lastScore }],
					};
				}
				return cat;
			})
		);
	};

	const removeOptionFromCategory = (categoryIndex: number, optionIndex: number) => {
		setCategoryInputs((prev) =>
			prev.map((cat, i) => {
				if (i === categoryIndex && cat.options.length > 1) {
					return {
						...cat,
						options: cat.options.filter((_, oi) => oi !== optionIndex),
					};
				}
				return cat;
			})
		);
	};

	const updateOption = (
		categoryIndex: number,
		optionIndex: number,
		field: "name" | "score",
		value: string | number
	) => {
		setCategoryInputs((prev) =>
			prev.map((cat, i) => {
				if (i === categoryIndex) {
					return {
						...cat,
						options: cat.options.map((opt, oi) =>
							oi === optionIndex ? { ...opt, [field]: value } : opt
						),
					};
				}
				return cat;
			})
		);
	};

	const copyCategoriesFromMaterial = (sourceMaterial: MaterialForCopy) => {
		if (sourceMaterial.scoreCategories.length > 0) {
			setCategoryInputs(
				sourceMaterial.scoreCategories.map((cat) => ({
					name: cat.name,
					color: cat.color || "gray",
					options: cat.options.map((opt) => ({
						name: opt.name,
						score: opt.score,
					})),
				}))
			);
		}
	};

	return (
		<div className="mt-4 p-6 border-2 border-red-200 dark:border-red-800 rounded-lg bg-red-50/50 dark:bg-red-900/20">
			<div className="flex items-center justify-between mb-4">
				<h4 className="text-lg font-semibold text-gray-900 dark:text-white">
					{isEditing ? "Edit Materi" : "Tambah Materi Baru"}
				</h4>
				<button
					onClick={onClose}
					className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
				>
					<XMarkIcon className="h-5 w-5" />
				</button>
			</div>

			{/* Basic Info */}
			<div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
				<div>
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
						Nomor
					</label>
					<input
						type="number"
						min="1"
						value={materialForm.number}
						onChange={(e) =>
							setMaterialForm({
								...materialForm,
								number: parseInt(e.target.value) || 1,
							})
						}
						className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
					/>
				</div>
				<div className="md:col-span-3">
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
						Nama Materi *
					</label>
					<input
						type="text"
						placeholder="e.g., Maju Langkah"
						value={materialForm.name}
						onChange={(e) =>
							setMaterialForm({
								...materialForm,
								name: e.target.value,
							})
						}
						className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
					/>
				</div>
				<div className="md:col-span-2">
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
						Deskripsi
					</label>
					<input
						type="text"
						placeholder="Opsional..."
						value={materialForm.description}
						onChange={(e) =>
							setMaterialForm({
								...materialForm,
								description: e.target.value,
							})
						}
						className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
					/>
				</div>
			</div>

			{/* School Categories Selection */}
			<div className="mb-6">
				<div className="flex items-center justify-between mb-2">
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
						Kategori Sekolah *
					</label>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={onSelectAllSchoolCategories}
							className="text-xs text-red-600 dark:text-red-400 hover:underline"
						>
							Pilih Semua
						</button>
						<span className="text-gray-300">|</span>
						<button
							type="button"
							onClick={onDeselectAllSchoolCategories}
							className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
						>
							Hapus Semua
						</button>
					</div>
				</div>
				<div className="flex flex-wrap gap-3 p-4 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-600">
					{eventSchoolCategories.map((sc) => (
						<label
							key={sc.id}
							className="flex items-center gap-2 cursor-pointer"
						>
							<input
								type="checkbox"
								checked={selectedSchoolCategories.includes(sc.id)}
								onChange={() => onToggleSchoolCategory(sc.id)}
								className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
							/>
							<span className="text-sm text-gray-700 dark:text-gray-300">
								{sc.name}
							</span>
						</label>
					))}
				</div>
			</div>

			{/* Score Categories */}
			<div className="mb-6">
				<div className="flex items-center justify-between mb-2">
					<label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
						<Cog6ToothIcon className="h-4 w-4" />
						Kategori & Pilihan Nilai
					</label>
					{/* Copy from existing material */}
					{materialsForCopy.length > 0 && (
						<div className="flex items-center gap-2">
							<label className="text-xs text-gray-500 dark:text-gray-400">
								Salin dari:
							</label>
							<select
								onChange={(e) => {
									const mat = materialsForCopy.find(
										(m) => m.id === e.target.value
									);
									if (mat) copyCategoriesFromMaterial(mat);
									e.target.value = "";
								}}
								className="text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
							>
								<option value="">-- Pilih --</option>
								{materialsForCopy.map((mat) => (
									<option key={mat.id} value={mat.id}>
										{mat.name}
									</option>
								))}
							</select>
						</div>
					)}
				</div>

				{/* Category Editor with Tabs */}
				<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
					{/* Tabs */}
					<div className="flex border-b border-gray-200 dark:border-gray-600 overflow-x-auto">
						{categoryInputs.map((cat, catIndex) => (
							<button
								key={catIndex}
								type="button"
								onClick={() => setActiveCategoryTab(catIndex)}
								className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
									activeCategoryTab === catIndex
										? `border-red-600 text-red-600 dark:text-red-400 ${getColorClasses(cat.color)}`
										: "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
								}`}
							>
								<span
									className={`w-3 h-3 rounded-full ${
										cat.color === "red" ? "bg-red-500" :
										cat.color === "orange" ? "bg-orange-500" :
										cat.color === "yellow" ? "bg-yellow-500" :
										cat.color === "green" ? "bg-green-500" :
										cat.color === "blue" ? "bg-blue-500" :
										cat.color === "purple" ? "bg-purple-500" :
										"bg-gray-500"
									}`}
								/>
								{cat.name || `Kategori ${catIndex + 1}`}
							</button>
						))}
						<button
							type="button"
							onClick={addCategoryInput}
							className="flex items-center gap-1 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 whitespace-nowrap"
						>
							<PlusIcon className="h-4 w-4" />
							Tambah
						</button>
					</div>

					{/* Active Tab Content */}
					{categoryInputs[activeCategoryTab] && (
						<div className="p-4">
							{/* Category Settings */}
							<div className="flex flex-wrap items-center gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-600">
								<div className="flex items-center gap-2">
									<label className="text-sm text-gray-600 dark:text-gray-400">Nama:</label>
									<input
										type="text"
										placeholder="Nama Kategori"
										value={categoryInputs[activeCategoryTab].name}
										onChange={(e) => updateCategoryInput(activeCategoryTab, "name", e.target.value)}
										className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm w-36"
									/>
								</div>
								<div className="flex items-center gap-2">
									<label className="text-sm text-gray-600 dark:text-gray-400">Warna:</label>
									<select
										value={categoryInputs[activeCategoryTab].color}
										onChange={(e) => updateCategoryInput(activeCategoryTab, "color", e.target.value)}
										className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
									>
										<option value="red">Merah</option>
										<option value="orange">Oranye</option>
										<option value="yellow">Kuning</option>
										<option value="green">Hijau</option>
										<option value="blue">Biru</option>
										<option value="purple">Ungu</option>
										<option value="gray">Abu</option>
									</select>
								</div>
								<button
									type="button"
									onClick={() => removeCategoryInput(activeCategoryTab)}
									disabled={categoryInputs.length <= 1}
									className="ml-auto p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									title="Hapus Kategori"
								>
									<TrashIcon className="h-4 w-4" />
								</button>
							</div>

							{/* Options - Horizontal Layout */}
							<div className="space-y-3">
								<p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
									Pilihan Nilai ({categoryInputs[activeCategoryTab]?.options.length || 0} pilihan):
								</p>
								<div className="flex flex-wrap gap-3">
									{categoryInputs[activeCategoryTab]?.options.map((opt, optIndex) => (
										<div
											key={optIndex}
											className={`flex items-center gap-2 p-2 rounded-lg border ${getColorClasses(categoryInputs[activeCategoryTab]?.color || "gray")} border-current`}
										>
											<input
												type="number"
												min="0"
												step="any"
												value={opt.score}
												onChange={(e) =>
													updateOption(activeCategoryTab, optIndex, "score", parseFloat(e.target.value) || 0)
												}
												className="w-16 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm text-center font-semibold"
												title="Skor (bisa desimal: 50.5, 75.25)"
											/>
											<input
												type="text"
												placeholder="Keterangan (opsional)"
												value={opt.name}
												onChange={(e) =>
													updateOption(activeCategoryTab, optIndex, "name", e.target.value)
												}
												className="w-36 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
											/>
											<button
												type="button"
												onClick={() => removeOptionFromCategory(activeCategoryTab, optIndex)}
												disabled={(categoryInputs[activeCategoryTab]?.options.length || 0) <= 1}
												className="p-1 text-gray-500 hover:text-red-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
											>
												<XMarkIcon className="h-4 w-4" />
											</button>
										</div>
									))}
									<button
										type="button"
										onClick={() => addOptionToCategory(activeCategoryTab)}
										className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg border-2 border-dashed border-red-300 dark:border-red-700"
									>
										<PlusIcon className="h-4 w-4" />
										Tambah
									</button>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Actions */}
			<div className="flex justify-end gap-3">
				<button
					type="button"
					onClick={onClose}
					className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
				>
					Batal
				</button>
				<button
					type="button"
					onClick={onSave}
					className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
				>
					<CheckCircleIcon className="h-5 w-5" />
					{isEditing ? "Simpan Perubahan" : "Tambah Materi"}
				</button>
			</div>
		</div>
	);
};

export default MaterialForm;
