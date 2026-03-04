import React from "react";
import { BookOpenIcon } from "@heroicons/react/24/outline";
import Swal from "sweetalert2";
import { api } from "../../utils/api";

// Score input types for template
export interface ScoreOptionInput {
	name: string;
	score: number;
}

export interface ScoreCategoryInput {
	name: string;
	color: string;
	options: ScoreOptionInput[];
}

// PBB Material Template interface
interface PBBMaterialTemplate {
	number: number;
	name: string;
	scoreCategories: ScoreCategoryInput[];
}

// PBB Simpaskor Template berdasarkan Perpang TNI No 58
export const pbbSimpaskorTemplate: PBBMaterialTemplate[] = [
	{ number: 1, name: "Bershaf Kumpul", scoreCategories: [
		{ name: "Kurang", color: "red", options: [{ name: "", score: 50 }, { name: "", score: 55 }] },
		{ name: "Cukup", color: "yellow", options: [{ name: "", score: 60 }, { name: "", score: 65 }] },
		{ name: "Baik", color: "green", options: [{ name: "", score: 68 }, { name: "", score: 70 }] },
		{ name: "Sangat Baik", color: "blue", options: [{ name: "", score: 73 }, { name: "", score: 75 }] },
	]},
	{ number: 2, name: "Hadap Kanan Maju", scoreCategories: [
		{ name: "Kurang", color: "red", options: [{ name: "", score: 15 }, { name: "", score: 18 }] },
		{ name: "Cukup", color: "yellow", options: [{ name: "", score: 20 }, { name: "", score: 25 }] },
		{ name: "Baik", color: "green", options: [{ name: "", score: 30 }, { name: "", score: 33 }] },
		{ name: "Sangat Baik", color: "blue", options: [{ name: "", score: 36 }, { name: "", score: 40 }] },
	]},
	{ number: 3, name: "2 Kali Belok Kanan", scoreCategories: [
		{ name: "Kurang", color: "red", options: [{ name: "", score: 30 }, { name: "", score: 40 }] },
		{ name: "Cukup", color: "yellow", options: [{ name: "", score: 42 }, { name: "", score: 45 }] },
		{ name: "Baik", color: "green", options: [{ name: "", score: 50 }, { name: "", score: 55 }] },
		{ name: "Sangat Baik", color: "blue", options: [{ name: "", score: 58 }, { name: "", score: 60 }] },
	]},
	{ number: 4, name: "Langkah Tegap", scoreCategories: [
		{ name: "Kurang", color: "red", options: [{ name: "", score: 10 }, { name: "", score: 15 }] },
		{ name: "Cukup", color: "yellow", options: [{ name: "", score: 20 }, { name: "", score: 25 }] },
		{ name: "Baik", color: "green", options: [{ name: "", score: 28 }, { name: "", score: 30 }] },
		{ name: "Sangat Baik", color: "blue", options: [{ name: "", score: 32 }, { name: "", score: 35 }] },
	]},
	{ number: 5, name: "Langkah Biasa", scoreCategories: [
		{ name: "Kurang", color: "red", options: [{ name: "", score: 10 }, { name: "", score: 13 }] },
		{ name: "Cukup", color: "yellow", options: [{ name: "", score: 15 }, { name: "", score: 18 }] },
		{ name: "Baik", color: "green", options: [{ name: "", score: 20 }, { name: "", score: 25 }] },
		{ name: "Sangat Baik", color: "blue", options: [{ name: "", score: 28 }, { name: "", score: 30 }] },
	]},
	{ number: 6, name: "Tiap-Tiap Banjar 2 Kali Belok Kiri", scoreCategories: [
		{ name: "Kurang", color: "red", options: [{ name: "", score: 15 }, { name: "", score: 18 }] },
		{ name: "Cukup", color: "yellow", options: [{ name: "", score: 20 }, { name: "", score: 25 }] },
		{ name: "Baik", color: "green", options: [{ name: "", score: 30 }, { name: "", score: 32 }] },
		{ name: "Sangat Baik", color: "blue", options: [{ name: "", score: 35 }, { name: "", score: 40 }] },
	]},
	{ number: 7, name: "Langkah Perlahan", scoreCategories: [
		{ name: "Kurang", color: "red", options: [{ name: "", score: 10 }, { name: "", score: 15 }] },
		{ name: "Cukup", color: "yellow", options: [{ name: "", score: 20 }, { name: "", score: 25 }] },
		{ name: "Baik", color: "green", options: [{ name: "", score: 30 }, { name: "", score: 35 }] },
		{ name: "Sangat Baik", color: "blue", options: [{ name: "", score: 40 }, { name: "", score: 45 }] },
	]},
	{ number: 8, name: "Langkah Biasa (2)", scoreCategories: [
		{ name: "Kurang", color: "red", options: [{ name: "", score: 10 }, { name: "", score: 15 }] },
		{ name: "Cukup", color: "yellow", options: [{ name: "", score: 45 }, { name: "", score: 50 }] },
		{ name: "Baik", color: "green", options: [{ name: "", score: 28 }, { name: "", score: 30 }] },
		{ name: "Sangat Baik", color: "blue", options: [{ name: "", score: 32 }, { name: "", score: 35 }] },
	]},
	{ number: 9, name: "Melintas Kanan Maju", scoreCategories: [
		{ name: "Kurang", color: "red", options: [{ name: "", score: 30 }, { name: "", score: 40 }] },
		{ name: "Cukup", color: "yellow", options: [{ name: "", score: 45 }, { name: "", score: 50 }] },
		{ name: "Baik", color: "green", options: [{ name: "", score: 55 }, { name: "", score: 60 }] },
		{ name: "Sangat Baik", color: "blue", options: [{ name: "", score: 62 }, { name: "", score: 65 }] },
	]},
	{ number: 10, name: "Tiap-Tiap Banjar 2 Kali Belok Kanan", scoreCategories: [
		{ name: "Kurang", color: "red", options: [{ name: "", score: 20 }, { name: "", score: 30 }] },
		{ name: "Cukup", color: "yellow", options: [{ name: "", score: 35 }, { name: "", score: 40 }] },
		{ name: "Baik", color: "green", options: [{ name: "", score: 45 }, { name: "", score: 48 }] },
		{ name: "Sangat Baik", color: "blue", options: [{ name: "", score: 50 }, { name: "", score: 55 }] },
	]},
	{ number: 11, name: "Haluan Maju Kanan", scoreCategories: [
		{ name: "Kurang", color: "red", options: [{ name: "", score: 30 }, { name: "", score: 40 }] },
		{ name: "Cukup", color: "yellow", options: [{ name: "", score: 45 }, { name: "", score: 50 }] },
		{ name: "Baik", color: "green", options: [{ name: "", score: 55 }, { name: "", score: 60 }] },
		{ name: "Sangat Baik", color: "blue", options: [{ name: "", score: 62 }, { name: "", score: 65 }] },
	]},
	{ number: 12, name: "Hormat", scoreCategories: [
		{ name: "Kurang", color: "red", options: [{ name: "", score: 15 }, { name: "", score: 18 }] },
		{ name: "Cukup", color: "yellow", options: [{ name: "", score: 20 }, { name: "", score: 25 }] },
		{ name: "Baik", color: "green", options: [{ name: "", score: 30 }, { name: "", score: 32 }] },
		{ name: "Sangat Baik", color: "blue", options: [{ name: "", score: 35 }, { name: "", score: 40 }] },
	]},
	{ number: 13, name: "Hitung", scoreCategories: [
		{ name: "Kurang", color: "red", options: [{ name: "", score: 15 }, { name: "", score: 18 }] },
		{ name: "Cukup", color: "yellow", options: [{ name: "", score: 20 }, { name: "", score: 25 }] },
		{ name: "Baik", color: "green", options: [{ name: "", score: 30 }, { name: "", score: 32 }] },
		{ name: "Sangat Baik", color: "blue", options: [{ name: "", score: 35 }, { name: "", score: 40 }] },
	]},
	{ number: 14, name: "Hormat Kanan", scoreCategories: [
		{ name: "Kurang", color: "red", options: [{ name: "", score: 10 }, { name: "", score: 13 }] },
		{ name: "Cukup", color: "yellow", options: [{ name: "", score: 15 }, { name: "", score: 18 }] },
		{ name: "Baik", color: "green", options: [{ name: "", score: 20 }, { name: "", score: 25 }] },
		{ name: "Sangat Baik", color: "blue", options: [{ name: "", score: 28 }, { name: "", score: 30 }] },
	]},
	{ number: 15, name: "Parade Periksa Kerapihan", scoreCategories: [
		{ name: "Kurang", color: "red", options: [{ name: "", score: 20 }, { name: "", score: 30 }] },
		{ name: "Cukup", color: "yellow", options: [{ name: "", score: 35 }, { name: "", score: 38 }] },
		{ name: "Baik", color: "green", options: [{ name: "", score: 40 }, { name: "", score: 45 }] },
		{ name: "Sangat Baik", color: "blue", options: [{ name: "", score: 48 }, { name: "", score: 50 }] },
	]},
	{ number: 16, name: "Setengah Lencang Kanan", scoreCategories: [
		{ name: "Kurang", color: "red", options: [{ name: "", score: 10 }, { name: "", score: 13 }] },
		{ name: "Cukup", color: "yellow", options: [{ name: "", score: 15 }, { name: "", score: 18 }] },
		{ name: "Baik", color: "green", options: [{ name: "", score: 20 }, { name: "", score: 25 }] },
		{ name: "Sangat Baik", color: "blue", options: [{ name: "", score: 28 }, { name: "", score: 30 }] },
	]},
	{ number: 17, name: "Hadap Kanan", scoreCategories: [
		{ name: "Kurang", color: "red", options: [{ name: "", score: 10 }, { name: "", score: 15 }] },
		{ name: "Cukup", color: "yellow", options: [{ name: "", score: 20 }, { name: "", score: 25 }] },
		{ name: "Baik", color: "green", options: [{ name: "", score: 28 }, { name: "", score: 30 }] },
		{ name: "Sangat Baik", color: "blue", options: [{ name: "", score: 32 }, { name: "", score: 36 }] },
	]},
	{ number: 18, name: "Lencang Depan", scoreCategories: [
		{ name: "Kurang", color: "red", options: [{ name: "", score: 10 }, { name: "", score: 13 }] },
		{ name: "Cukup", color: "yellow", options: [{ name: "", score: 15 }, { name: "", score: 18 }] },
		{ name: "Baik", color: "green", options: [{ name: "", score: 20 }, { name: "", score: 25 }] },
		{ name: "Sangat Baik", color: "blue", options: [{ name: "", score: 28 }, { name: "", score: 30 }] },
	]},
	{ number: 19, name: "Hadap Serong Kiri", scoreCategories: [
		{ name: "Kurang", color: "red", options: [{ name: "", score: 10 }, { name: "", score: 15 }] },
		{ name: "Cukup", color: "yellow", options: [{ name: "", score: 20 }, { name: "", score: 25 }] },
		{ name: "Baik", color: "green", options: [{ name: "", score: 28 }, { name: "", score: 30 }] },
		{ name: "Sangat Baik", color: "blue", options: [{ name: "", score: 32 }, { name: "", score: 35 }] },
	]},
	{ number: 20, name: "4 Langkah Kanan", scoreCategories: [
		{ name: "Kurang", color: "red", options: [{ name: "", score: 20 }, { name: "", score: 30 }] },
		{ name: "Cukup", color: "yellow", options: [{ name: "", score: 35 }, { name: "", score: 40 }] },
		{ name: "Baik", color: "green", options: [{ name: "", score: 45 }, { name: "", score: 48 }] },
		{ name: "Sangat Baik", color: "blue", options: [{ name: "", score: 50 }, { name: "", score: 55 }] },
	]},
	{ number: 21, name: "4 Langkah Belakang", scoreCategories: [
		{ name: "Kurang", color: "red", options: [{ name: "", score: 20 }, { name: "", score: 30 }] },
		{ name: "Cukup", color: "yellow", options: [{ name: "", score: 35 }, { name: "", score: 40 }] },
		{ name: "Baik", color: "green", options: [{ name: "", score: 45 }, { name: "", score: 48 }] },
		{ name: "Sangat Baik", color: "blue", options: [{ name: "", score: 50 }, { name: "", score: 55 }] },
	]},
	{ number: 22, name: "3 Langkah ke Depan", scoreCategories: [
		{ name: "Kurang", color: "red", options: [{ name: "", score: 20 }, { name: "", score: 30 }] },
		{ name: "Cukup", color: "yellow", options: [{ name: "", score: 35 }, { name: "", score: 40 }] },
		{ name: "Baik", color: "green", options: [{ name: "", score: 45 }, { name: "", score: 48 }] },
		{ name: "Sangat Baik", color: "blue", options: [{ name: "", score: 50 }, { name: "", score: 55 }] },
	]},
	{ number: 23, name: "3 Langkah ke Kiri", scoreCategories: [
		{ name: "Kurang", color: "red", options: [{ name: "", score: 20 }, { name: "", score: 30 }] },
		{ name: "Cukup", color: "yellow", options: [{ name: "", score: 35 }, { name: "", score: 40 }] },
		{ name: "Baik", color: "green", options: [{ name: "", score: 45 }, { name: "", score: 48 }] },
		{ name: "Sangat Baik", color: "blue", options: [{ name: "", score: 50 }, { name: "", score: 55 }] },
	]},
	{ number: 24, name: "Hadap Kiri Serong", scoreCategories: [
		{ name: "Kurang", color: "red", options: [{ name: "", score: 10 }, { name: "", score: 15 }] },
		{ name: "Cukup", color: "yellow", options: [{ name: "", score: 20 }, { name: "", score: 25 }] },
		{ name: "Baik", color: "green", options: [{ name: "", score: 28 }, { name: "", score: 30 }] },
		{ name: "Sangat Baik", color: "blue", options: [{ name: "", score: 32 }, { name: "", score: 35 }] },
	]},
	{ number: 25, name: "Bubar", scoreCategories: [
		{ name: "Kurang", color: "red", options: [{ name: "", score: 50 }, { name: "", score: 55 }] },
		{ name: "Cukup", color: "yellow", options: [{ name: "", score: 60 }, { name: "", score: 65 }] },
		{ name: "Baik", color: "green", options: [{ name: "", score: 68 }, { name: "", score: 70 }] },
		{ name: "Sangat Baik", color: "blue", options: [{ name: "", score: 73 }, { name: "", score: 75 }] },
	]},
];

// Check if category name matches PBB related keywords
export const isPBBCategory = (categoryName: string): boolean => {
	const pbbKeywords = ["pbb", "peraturan baris", "baris berbaris", "baris-berbaris"];
	return pbbKeywords.some(keyword => categoryName.toLowerCase().includes(keyword));
};

// Props for the PBB Template Recommendation component
interface PBBTemplateRecommendationProps {
	categoryId: string;
	categoryName: string;
	eventSlug: string;
	schoolCategoryIds: string[];
	onImportComplete: () => void;
}

// PBB Template Recommendation Component
export const PBBTemplateRecommendation: React.FC<PBBTemplateRecommendationProps> = ({
	categoryId,
	categoryName,
	eventSlug,
	schoolCategoryIds,
	onImportComplete,
}) => {
	// Only show if category is PBB related and has school categories
	if (!isPBBCategory(categoryName) || schoolCategoryIds.length === 0) {
		return null;
	}

	const handleImportTemplate = async () => {
		const result = await Swal.fire({
			icon: "info",
			title: "Gunakan Format Simpaskor PBB?",
			html: `
				<p class="text-sm text-gray-600 mb-2">Format nilai berdasarkan <strong>Perpang TNI No. 58</strong></p>
				<p class="text-sm text-gray-500">Akan menambahkan 25 materi PBB lengkap dengan format penilaian standar.</p>
				<p class="text-sm text-gray-500 mt-2"><em>Nilai masih bisa disesuaikan setelah diimport.</em></p>
			`,
			showCancelButton: true,
			confirmButtonColor: "#4f46e5",
			confirmButtonText: "Ya, Gunakan Template",
			cancelButtonText: "Batal",
		});

		if (result.isConfirmed) {
			try {
				Swal.fire({
					title: "Mengimport materi...",
					allowOutsideClick: false,
					didOpen: () => {
						Swal.showLoading();
					},
				});

				// Import all PBB materials
				for (const template of pbbSimpaskorTemplate) {
					const payload = {
						eventAssessmentCategoryId: categoryId,
						number: template.number,
						name: template.name,
						description: null,
						schoolCategoryIds: schoolCategoryIds,
						scoreCategories: template.scoreCategories,
					};
					await api.post(`/materials/event/${eventSlug}`, payload);
				}

				await onImportComplete();

				Swal.fire({
					icon: "success",
					title: "Template PBB Berhasil Diimport",
					text: "25 materi PBB telah ditambahkan dengan format nilai Simpaskor.",
					timer: 2000,
					showConfirmButton: false,
				});
			} catch (error) {
				console.error("Error importing PBB template:", error);
				Swal.fire({
					icon: "error",
					title: "Gagal Import",
					text: "Terjadi kesalahan saat mengimport template PBB.",
				});
			}
		}
	};

	return (
		<div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg max-w-lg mx-auto">
			<div className="flex items-start gap-3">
				<div className="flex-shrink-0">
					<BookOpenIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
				</div>
				<div className="text-left">
					<h4 className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">
						Gunakan Format Simpaskor
					</h4>
					<p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
						Berdasarkan Perpang TNI No. 58
					</p>
					<p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
						25 materi PBB lengkap dengan format penilaian standar. Nilai masih bisa disesuaikan.
					</p>
					<button
						onClick={handleImportTemplate}
						className="mt-3 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
					>
						Gunakan Template PBB Simpaskor
					</button>
				</div>
			</div>
		</div>
	);
};

export default PBBTemplateRecommendation;
