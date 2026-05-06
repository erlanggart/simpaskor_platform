import React, { useState } from "react";
import {
	ListBulletIcon,
	AcademicCapIcon,
	PlusIcon,
	MinusIcon,
	XMarkIcon,
	CheckIcon,
	CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { LuMegaphone, LuTicket, LuThumbsUp, LuTicketPlus, LuMedal, LuCrown, LuTrophy } from "react-icons/lu";
import { Step2Props, Step2Data, PackageTier } from "../../types/eventWizard";
import { AssessmentCategory } from "../../types/eventWizard";
import { getRevenueShareLabel } from "../../utils/packagePricing";

interface PackageChoice {
	tier: PackageTier;
	name: string;
	icon: React.ElementType;
	color: string;
	borderColor: string;
	bgGlow: string;
	description: string;
}

const packageChoices: PackageChoice[] = [
	{
		tier: "IKLAN",
		name: "Iklan",
		icon: LuMegaphone,
		color: "emerald",
		borderColor: "border-emerald-400/50 dark:border-emerald-500/30",
		bgGlow: "from-emerald-500/10 to-emerald-600/5",
		description: "Event tampil di landing page",
	},
	{
		tier: "TICKETING",
		name: "Ticketing",
		icon: LuTicket,
		color: "blue",
		borderColor: "border-blue-400/50 dark:border-blue-500/30",
		bgGlow: "from-blue-500/10 to-blue-600/5",
		description: `E-Ticketing, bagi hasil ${getRevenueShareLabel("TICKETING")}`,
	},
	{
		tier: "VOTING",
		name: "Voting",
		icon: LuThumbsUp,
		color: "purple",
		borderColor: "border-purple-400/50 dark:border-purple-500/30",
		bgGlow: "from-purple-500/10 to-purple-600/5",
		description: `E-Voting, bagi hasil ${getRevenueShareLabel("VOTING")}`,
	},
	{
		tier: "TICKETING_VOTING",
		name: "Tiket + Voting",
		icon: LuTicketPlus,
		color: "indigo",
		borderColor: "border-indigo-400/50 dark:border-indigo-500/30",
		bgGlow: "from-indigo-500/10 to-indigo-600/5",
		description: `Ticketing & Voting, bagi hasil ${getRevenueShareLabel("TICKETING_VOTING")}`,
	},
	{
		tier: "BRONZE",
		name: "Bronze",
		icon: LuMedal,
		color: "amber",
		borderColor: "border-amber-400/50 dark:border-amber-500/30",
		bgGlow: "from-amber-500/10 to-amber-600/5",
		description: "Penilaian lengkap + Ticketing + Voting",
	},
	{
		tier: "SILVER",
		name: "Silver",
		icon: LuCrown,
		color: "gray",
		borderColor: "border-gray-300 dark:border-gray-400/30",
		bgGlow: "from-gray-300/20 to-gray-400/10",
		description: "Bronze + Tim Pendamping & Tablet",
	},
	{
		tier: "GOLD",
		name: "Gold",
		icon: LuTrophy,
		color: "yellow",
		borderColor: "border-yellow-400/50 dark:border-yellow-500/30",
		bgGlow: "from-yellow-500/10 to-yellow-600/5",
		description: "Silver + Tim Rekap & Materi",
	},
];

const SCORING_TIERS: PackageTier[] = ["BRONZE", "SILVER", "GOLD"];

const WizardStep2Categories: React.FC<Step2Props & { onCategoryCreated?: (category: AssessmentCategory) => void }> = ({
	data,
	setData,
	assessmentCategories,
	schoolCategories,
	errors,
	onBack,
	onNext,
	isLoading,
	onCategoryCreated,
}) => {
	const [searchTerm, setSearchTerm] = useState("");
	const [showAddCategory, setShowAddCategory] = useState(false);
	const [newCategoryName, setNewCategoryName] = useState("");
	const [isCreatingCategory, setIsCreatingCategory] = useState(false);
	const [categoryError, setCategoryError] = useState("");

	const needsCategories = data.packageTier && SCORING_TIERS.includes(data.packageTier);

	const handleSelectPackage = (tier: PackageTier) => {
		setData((prev: Step2Data) => {
			const updated: Step2Data = { ...prev, packageTier: tier };
			// If switching away from scoring tier, clear categories
			if (!SCORING_TIERS.includes(tier)) {
				updated.assessmentCategoryIds = [];
				updated.schoolCategoryLimits = [];
			}
			return updated;
		});
	};

	const toggleCategory = (categoryId: string) => {
		setData((prev: Step2Data) => {
			const newCategories = prev.assessmentCategoryIds.includes(categoryId)
				? prev.assessmentCategoryIds.filter((id: string) => id !== categoryId)
				: [...prev.assessmentCategoryIds, categoryId];
			return { ...prev, assessmentCategoryIds: newCategories };
		});
	};

	const toggleSchoolCategory = (categoryId: string) => {
		setData((prev: Step2Data) => {
			const exists = prev.schoolCategoryLimits.find((s) => s.categoryId === categoryId);
			if (exists) {
				return {
					...prev,
					schoolCategoryLimits: prev.schoolCategoryLimits.filter(
						(s) => s.categoryId !== categoryId
					),
				};
			} else {
				return {
					...prev,
					schoolCategoryLimits: [
						...prev.schoolCategoryLimits,
						{ categoryId, maxParticipants: 0 },
					],
				};
			}
		});
	};

	const updateSchoolLimit = (categoryId: string, maxParticipants: number) => {
		setData((prev: Step2Data) => ({
			...prev,
			schoolCategoryLimits: prev.schoolCategoryLimits.map((s) =>
				s.categoryId === categoryId ? { ...s, maxParticipants } : s
			),
		}));
	};

	const filteredCategories = assessmentCategories.filter((cat) =>
		cat.name.toLowerCase().includes(searchTerm.toLowerCase())
	);

	// Sort: selected categories first (in selection order), then unselected
	const sortedCategories = [...filteredCategories].sort((a, b) => {
		const aIndex = data.assessmentCategoryIds.indexOf(a.id);
		const bIndex = data.assessmentCategoryIds.indexOf(b.id);
		
		// Both selected: sort by selection order
		if (aIndex !== -1 && bIndex !== -1) {
			return aIndex - bIndex;
		}
		// Only a is selected: a comes first
		if (aIndex !== -1) return -1;
		// Only b is selected: b comes first
		if (bIndex !== -1) return 1;
		// Neither selected: maintain original order
		return 0;
	});

	// Show only first 16 when not searching, all when searching
	const isSearching = searchTerm.trim().length > 0;
	const displayLimit = 16;
	const displayedCategories = isSearching 
		? sortedCategories 
		: sortedCategories.slice(0, displayLimit);
	const hiddenCount = isSearching ? 0 : Math.max(0, sortedCategories.length - displayLimit);

	const handleCreateCategory = async () => {
		if (!newCategoryName.trim()) {
			setCategoryError("Nama kategori harus diisi");
			return;
		}

		setIsCreatingCategory(true);
		setCategoryError("");

		try {
			const token = localStorage.getItem("token");
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/assessment-categories/custom`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({ name: newCategoryName.trim() }),
				}
			);

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Gagal membuat kategori");
			}

			const newCategory = await response.json();

			// Notify parent to refresh categories list
			if (onCategoryCreated) {
				onCategoryCreated(newCategory);
			}

			// Auto-select the new category
			if (!data.assessmentCategoryIds.includes(newCategory.id)) {
				setData((prev: Step2Data) => ({
					...prev,
					assessmentCategoryIds: [...prev.assessmentCategoryIds, newCategory.id],
				}));
			}

			// Reset form
			setNewCategoryName("");
			setShowAddCategory(false);
		} catch (error: any) {
			setCategoryError(error.message || "Gagal membuat kategori");
		} finally {
			setIsCreatingCategory(false);
		}
	};

	const validateStep = (): boolean => {
		const newErrors: string[] = [];
		if (!data.packageTier) {
			newErrors.push("Pilih paket terlebih dahulu");
		}
		if (needsCategories) {
			if (data.assessmentCategoryIds.length === 0) {
				newErrors.push("Pilih minimal satu kategori penilaian");
			}
			if (data.schoolCategoryLimits.length === 0) {
				newErrors.push("Pilih minimal satu jenjang sekolah");
			}
		}
		return newErrors.length === 0;
	};

	const handleNext = () => {
		if (validateStep()) {
			onNext();
		}
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="text-center mb-8">
				<h2 className="text-2xl font-bold text-gray-900 dark:text-white">
					Pilih Paket & Kategori
				</h2>
				<p className="text-gray-600 dark:text-gray-400 mt-2">
					Tentukan paket layanan dan kategori penilaian untuk event Anda
				</p>
			</div>

			{/* Package Selection */}
			<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-950/20 border border-gray-200 dark:border-gray-700 p-6 transition-colors">
				<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
					Pilih Paket
				</h3>
				<p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
					Pilih jenis layanan yang Anda butuhkan untuk event ini
				</p>

				<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
					{packageChoices.map((pkg) => {
						const Icon = pkg.icon;
						const isSelected = data.packageTier === pkg.tier;

						return (
							<button
								key={pkg.tier}
								type="button"
								onClick={() => handleSelectPackage(pkg.tier)}
								className={`relative text-left p-4 rounded-xl border-2 transition-all duration-200 ${
									isSelected
										? `${pkg.borderColor} bg-white dark:bg-gray-800 shadow-md ring-2 ring-offset-1 dark:ring-offset-gray-900 ${
											pkg.tier === "IKLAN" ? "ring-emerald-400" :
											pkg.tier === "TICKETING" ? "ring-blue-400" :
											pkg.tier === "VOTING" ? "ring-purple-400" :
											pkg.tier === "TICKETING_VOTING" ? "ring-indigo-400" :
											pkg.tier === "BRONZE" ? "ring-amber-400" :
											pkg.tier === "SILVER" ? "ring-gray-400" :
											"ring-yellow-400"
										}`
										: "border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/30 hover:bg-white dark:hover:bg-gray-800/60 hover:shadow-sm"
								}`}
							>
								{isSelected && (
									<div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
										<CheckCircleIcon className="w-3.5 h-3.5 text-white" />
									</div>
								)}
								<div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${pkg.bgGlow} flex items-center justify-center mb-2`}>
									<Icon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
								</div>
								<h4 className="text-sm font-bold text-gray-900 dark:text-white">
									{pkg.name}
								</h4>
								<p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">
									{pkg.description}
								</p>
							</button>
						);
					})}
				</div>

				{errors.packageTier && (
					<p className="mt-3 text-sm text-red-600 dark:text-red-400">
						{errors.packageTier}
					</p>
				)}
			</div>

			{/* Assessment Categories - only for scoring packages */}
			{needsCategories && (
				<>
			<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-950/20 border border-gray-200 dark:border-gray-700 p-6 transition-colors">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-3">
						<ListBulletIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
							Kategori Penilaian
						</h3>
					</div>
					<span className="text-sm text-gray-500 dark:text-gray-400">
					{data.assessmentCategoryIds.length} dipilih
					</span>
				</div>

				{/* Search and Add */}
				<div className="mb-4 flex gap-2">
					<input
						type="text"
						placeholder="Cari kategori..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent transition-colors"
					/>
					<button
						type="button"
						onClick={() => setShowAddCategory(!showAddCategory)}
						className="flex items-center gap-2 px-4 py-2.5 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
					>
						<PlusIcon className="w-5 h-5" />
						<span className="hidden sm:inline">Tambah Baru</span>
					</button>
				</div>

				{/* Add New Category Form */}
				{showAddCategory && (
					<div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
						<div className="flex items-center gap-2 mb-3">
							<PlusIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
							<span className="font-medium text-green-800 dark:text-green-300">
								Tambah Kategori Penilaian Baru
							</span>
						</div>
						<div className="flex gap-2">
							<input
								type="text"
								placeholder="Nama kategori baru..."
								value={newCategoryName}
								onChange={(e) => {
									setNewCategoryName(e.target.value);
									setCategoryError("");
								}}
								onKeyDown={(e) => e.key === "Enter" && handleCreateCategory()}
								className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent transition-colors"
								disabled={isCreatingCategory}
							/>
							<button
								type="button"
								onClick={handleCreateCategory}
								disabled={isCreatingCategory || !newCategoryName.trim()}
								className="p-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
							>
								{isCreatingCategory ? (
									<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
								) : (
									<CheckIcon className="w-5 h-5" />
								)}
							</button>
							<button
								type="button"
								onClick={() => {
									setShowAddCategory(false);
									setNewCategoryName("");
									setCategoryError("");
								}}
								className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
							>
								<XMarkIcon className="w-5 h-5" />
							</button>
						</div>
						{categoryError && (
							<p className="mt-2 text-sm text-red-600 dark:text-red-400">
								{categoryError}
							</p>
						)}
					</div>
				)}

				{sortedCategories.length === 0 ? (
					<div className="text-center py-8 text-gray-500 dark:text-gray-400">
						Tidak ada kategori penilaian ditemukan
					</div>
				) : (
					<>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-2">
							{displayedCategories.map((category) => {
								const isSelected = data.assessmentCategoryIds.includes(category.id);
								return (
									<button
										key={category.id}
										type="button"
										onClick={() => toggleCategory(category.id)}
										className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all text-sm ${
											isSelected
												? "bg-red-100 dark:bg-red-900/30 border-red-500 dark:border-red-400 text-red-700 dark:text-red-300"
												: "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
										}`}
									>
										<span
											className={`w-4 h-4 rounded flex items-center justify-center text-xs ${
												isSelected
													? "bg-red-500 dark:bg-red-400 text-white"
													: "bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500"
											}`}
										>
											{isSelected && "✓"}
										</span>
										<span className="truncate">{category.name}</span>
									</button>
								);
							})}
						</div>
						{hiddenCount > 0 && (
							<div className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
								... {hiddenCount} kategori lainnya (gunakan pencarian untuk melihat)
							</div>
						)}
					</>
				)}

				{errors.selectedCategories && (
					<p className="mt-2 text-sm text-red-600 dark:text-red-400">
						{errors.selectedCategories}
					</p>
				)}
			</div>

			{/* School Categories */}
			<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-950/20 border border-gray-200 dark:border-gray-700 p-6 transition-colors">
				<div className="flex items-center gap-3 mb-4">
					<AcademicCapIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
						Jenjang Sekolah & Kuota
					</h3>
				</div>

				<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
					Pilih jenjang sekolah yang dapat mengikuti event ini dan tentukan kuota
					peserta (0 = tidak terbatas)
				</p>

				<div className="space-y-3">
					{schoolCategories.map((school) => {
						const limit = data.schoolCategoryLimits.find(
							(s) => s.categoryId === school.id
						);
						const isSelected = Boolean(limit);

						return (
							<div
								key={school.id}
								className={`border rounded-lg p-4 transition-all ${
									isSelected 
										? "border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20" 
										: "border-gray-200 dark:border-gray-700"
								}`}
							>
								<div className="flex items-center justify-between">
									<label className="flex items-center gap-3 cursor-pointer flex-1">
										<input
											type="checkbox"
											checked={isSelected}
											onChange={() => toggleSchoolCategory(school.id)}
											className="w-5 h-5 text-red-600 dark:text-red-400 rounded border-gray-300 dark:border-gray-600 focus:ring-red-500 dark:focus:ring-red-400"
										/>
										<span className="font-medium text-gray-900 dark:text-white">
											{school.name}
										</span>
									</label>

									{isSelected && (
										<div className="flex items-center gap-2">
											<span className="text-sm text-gray-600 dark:text-gray-400">Kuota:</span>
											<div className="flex items-center gap-1">
												<button
													type="button"
													onClick={() =>
														updateSchoolLimit(
															school.id,
															Math.max(0, (limit?.maxParticipants || 0) - 1)
														)
													}
													className="p-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
												>
													<MinusIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
												</button>
												<input
													type="number"
													min="0"
													value={limit?.maxParticipants || 0}
													onChange={(e) =>
														updateSchoolLimit(
															school.id,
															parseInt(e.target.value) || 0
														)
													}
													className="w-16 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent transition-colors"
												/>
												<button
													type="button"
													onClick={() =>
														updateSchoolLimit(
															school.id,
															(limit?.maxParticipants || 0) + 1
														)
													}
													className="p-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
												>
													<PlusIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
												</button>
											</div>
										</div>
									)}
								</div>
							</div>
						);
					})}
				</div>

				{errors.schoolCategoryLimits && (
					<p className="mt-2 text-sm text-red-600 dark:text-red-400">
						{errors.schoolCategoryLimits}
					</p>
				)}
			</div>
				</>
			)}

			{/* Info for non-scoring packages */}
			{data.packageTier && !needsCategories && (
				<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 text-center">
					<p className="text-sm text-blue-700 dark:text-blue-300">
						Paket <strong>{packageChoices.find(p => p.tier === data.packageTier)?.name}</strong> tidak memerlukan kategori penilaian.
						<br />
						<span className="text-blue-500 dark:text-blue-400">Lanjutkan ke langkah berikutnya untuk mengatur media & biaya.</span>
					</p>
				</div>
			)}

			{/* Navigation */}
			<div className="flex justify-between">
				<button
					type="button"
					onClick={onBack}
					className="px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
				>
					Kembali
				</button>
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

export default WizardStep2Categories;
