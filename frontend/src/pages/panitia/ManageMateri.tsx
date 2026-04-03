import React, { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import {
	BookOpenIcon,
	PlusIcon,
	PencilIcon,
	TrashIcon,
	ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import Swal from "sweetalert2";
import { api } from "../../utils/api";
import { PBBTemplateRecommendation } from "../../components/materials/PBBTemplateImporter";
import MaterialForm, { ScoreCategoryInput, SchoolCategory } from "../../components/materials/MaterialForm";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ScoreOption {
	id?: string;
	name: string;
	score: number;
	order: number;
}

interface ScoreCategory {
	id?: string;
	name: string;
	color: string | null;
	order: number;
	options: ScoreOption[];
}

export type { SchoolCategory };

interface Material {
	id: string;
	eventAssessmentCategoryId: string;
	number: number;
	name: string;
	description: string | null;
	schoolCategoryIds: string[];
	schoolCategories: { id: string; name: string }[];
	scoreCategories: ScoreCategory[];
}

interface SchoolCategoryMaxScore {
	schoolCategoryId: string;
	schoolCategoryName: string;
	maxScore: number;
	juryCount: number;
	totalMaxScore: number;
}

interface CategoryWithMaterials {
	id: string;
	assessmentCategoryId: string;
	categoryName: string;
	categoryDescription: string | null;
	materials: Material[];
	maxScore?: number;
	juryCount?: number;
	totalMaxScore?: number;
	maxScoreBreakdown?: SchoolCategoryMaxScore[];
}

export type { ScoreCategoryInput };

const defaultCategories: ScoreCategoryInput[] = [
	{
		name: "Kurang",
		color: "red",
		options: [
			{ name: "", score: 1 },
			{ name: "", score: 2 },
			{ name: "", score: 3 },
		],
	},
	{
		name: "Cukup",
		color: "yellow",
		options: [
			{ name: "", score: 4 },
			{ name: "", score: 5 },
		],
	},
	{
		name: "Baik",
		color: "green",
		options: [
			{ name: "", score: 6 },
			{ name: "", score: 7 },
			{ name: "", score: 8 },
		],
	},
];

const ManageMateri: React.FC = () => {
	const { eventSlug } = useParams<{ eventSlug: string }>();
	const location = useLocation();
	
	// Detect admin vs panitia route
	const isAdminRoute = location.pathname.startsWith("/admin");
	const basePath = isAdminRoute ? "/admin" : "/panitia";
	
	const [categories, setCategories] = useState<CategoryWithMaterials[]>([]);
	const [eventSchoolCategories, setEventSchoolCategories] = useState<SchoolCategory[]>([]);
	const [loading, setLoading] = useState(true);
	const [activeAssessmentCategoryTab, setActiveAssessmentCategoryTab] = useState<string | null>(null);

	// Material form state
	const [showMaterialForm, setShowMaterialForm] = useState<string | null>(null);
	const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
	const [materialForm, setMaterialForm] = useState({
		number: 1,
		name: "",
		description: "",
	});
	const [selectedSchoolCategories, setSelectedSchoolCategories] = useState<string[]>([]);
	const [categoryInputs, setCategoryInputs] = useState<ScoreCategoryInput[]>(
		JSON.parse(JSON.stringify(defaultCategories))
	);
	const [activeCategoryTab, setActiveCategoryTab] = useState(0);

	useEffect(() => {
		if (eventSlug) {
			fetchData();
		}
	}, [eventSlug]);

	const fetchData = async (isRefresh = false) => {
		try {
			if (!isRefresh) setLoading(true);
			const res = await api.get(`/materials/event/${eventSlug}`);
			setCategories(res.data.categories || []);
			setEventSchoolCategories(res.data.eventSchoolCategories || []);

			// Set first category as active tab
			if (res.data.categories && res.data.categories.length > 0 && !activeAssessmentCategoryTab) {
				setActiveAssessmentCategoryTab(res.data.categories[0].id);
			}
		} catch (error) {
			console.error("Error fetching materials:", error);
			Swal.fire({
				icon: "error",
				title: "Gagal Memuat Data",
				text: "Terjadi kesalahan saat memuat data materi.",
			});
		} finally {
			setLoading(false);
		}
	};



	const openAddMaterialForm = (categoryId: string) => {
		const category = categories.find((c) => c.id === categoryId);
		const nextNumber = category
			? Math.max(0, ...category.materials.map((m) => m.number)) + 1
			: 1;

		setShowMaterialForm(categoryId);
		setEditingMaterial(null);
		setMaterialForm({
			number: nextNumber,
			name: "",
			description: "",
		});
		setSelectedSchoolCategories(eventSchoolCategories.map((sc) => sc.id));
		setCategoryInputs(JSON.parse(JSON.stringify(defaultCategories)));
		setActiveCategoryTab(0);
	};

	const openEditMaterialForm = (material: Material) => {
		setShowMaterialForm(material.eventAssessmentCategoryId);
		setEditingMaterial(material);
		setMaterialForm({
			number: material.number,
			name: material.name,
			description: material.description || "",
		});
		setSelectedSchoolCategories(material.schoolCategoryIds || []);
		setCategoryInputs(
			material.scoreCategories.length > 0
				? material.scoreCategories.map((cat) => ({
						name: cat.name,
						color: cat.color || "gray",
						options: cat.options.map((opt) => ({
							name: opt.name,
							score: opt.score,
						})),
					}))
				: JSON.parse(JSON.stringify(defaultCategories))
		);
		setActiveCategoryTab(0);
	};

	const closeMaterialForm = () => {
		setShowMaterialForm(null);
		setEditingMaterial(null);
		setMaterialForm({
			number: 1,
			name: "",
			description: "",
		});
		setSelectedSchoolCategories([]);
		setCategoryInputs(JSON.parse(JSON.stringify(defaultCategories)));
		setActiveCategoryTab(0);
	};

	const toggleSchoolCategory = (categoryId: string) => {
		setSelectedSchoolCategories((prev) => {
			if (prev.includes(categoryId)) {
				return prev.filter((id) => id !== categoryId);
			}
			return [...prev, categoryId];
		});
	};

	const selectAllSchoolCategories = () => {
		setSelectedSchoolCategories(eventSchoolCategories.map((sc) => sc.id));
	};

	const deselectAllSchoolCategories = () => {
		setSelectedSchoolCategories([]);
	};

	const handleSaveMaterial = async () => {
		if (!materialForm.name.trim()) {
			Swal.fire({
				icon: "warning",
				title: "Nama Materi Wajib Diisi",
			});
			return;
		}

		if (selectedSchoolCategories.length === 0) {
			Swal.fire({
				icon: "warning",
				title: "Pilih Kategori Sekolah",
				text: "Pilih minimal satu kategori sekolah untuk materi ini.",
			});
			return;
		}

		// Validate categories
		for (const cat of categoryInputs) {
			if (!cat.name.trim()) {
				Swal.fire({
					icon: "warning",
					title: "Nama Kategori Wajib Diisi",
					text: "Semua kategori penilaian harus memiliki nama.",
				});
				return;
			}
			if (cat.options.length === 0) {
				Swal.fire({
					icon: "warning",
					title: "Pilihan Nilai Kosong",
					text: `Kategori "${cat.name}" harus memiliki minimal satu pilihan nilai.`,
				});
				return;
			}
		}

		try {
			const payload = {
				eventAssessmentCategoryId: showMaterialForm,
				number: materialForm.number,
				name: materialForm.name,
				description: materialForm.description || null,
				schoolCategoryIds: selectedSchoolCategories,
				scoreCategories: categoryInputs,
			};

			if (editingMaterial) {
				await api.put(`/materials/${editingMaterial.id}`, payload);
			} else {
				await api.post(`/materials/event/${eventSlug}`, payload);
			}

			closeMaterialForm();
			fetchData(true);

			Swal.fire({
				icon: "success",
				title: editingMaterial ? "Materi Diperbarui" : "Materi Ditambahkan",
				timer: 1500,
				showConfirmButton: false,
			});
		} catch (error: unknown) {
			const errorMessage =
				(error as { response?: { data?: { error?: string } } })?.response?.data
					?.error || "Terjadi kesalahan saat menyimpan materi.";
			Swal.fire({
				icon: "error",
				title: "Gagal Menyimpan",
				text: errorMessage,
			});
		}
	};

	const handleDeleteMaterial = async (material: Material) => {
		const result = await Swal.fire({
			icon: "warning",
			title: "Hapus Materi?",
			text: `Apakah Anda yakin ingin menghapus materi "${material.name}"?`,
			showCancelButton: true,
			confirmButtonColor: "#dc2626",
			confirmButtonText: "Hapus",
			cancelButtonText: "Batal",
		});

		if (result.isConfirmed) {
			try {
				await api.delete(`/materials/${material.id}`);
				fetchData(true);
				Swal.fire({
					icon: "success",
					title: "Materi Dihapus",
					timer: 1500,
					showConfirmButton: false,
				});
			} catch (error) {
				console.error("Error deleting material:", error);
				Swal.fire({
					icon: "error",
					title: "Gagal Menghapus",
					text: "Terjadi kesalahan saat menghapus materi.",
				});
			}
		}
	};

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

	const getAllMaterialsWithCategories = () => {
		const allMaterials: Material[] = [];
		categories.forEach((cat) => {
			cat.materials.forEach((mat) => {
				if (mat.scoreCategories.length > 0 && mat.id !== editingMaterial?.id) {
					allMaterials.push(mat);
				}
			});
		});
		return allMaterials;
	};

	// Render the material form component
	const renderMaterialForm = () => (
		<MaterialForm
			isEditing={!!editingMaterial}
			materialForm={materialForm}
			setMaterialForm={setMaterialForm}
			eventSchoolCategories={eventSchoolCategories}
			selectedSchoolCategories={selectedSchoolCategories}
			onToggleSchoolCategory={toggleSchoolCategory}
			onSelectAllSchoolCategories={selectAllSchoolCategories}
			onDeselectAllSchoolCategories={deselectAllSchoolCategories}
			categoryInputs={categoryInputs}
			setCategoryInputs={setCategoryInputs}
			activeCategoryTab={activeCategoryTab}
			setActiveCategoryTab={setActiveCategoryTab}
			onClose={closeMaterialForm}
			onSave={handleSaveMaterial}
			materialsForCopy={getAllMaterialsWithCategories()}
		/>
	);

	// Export all materials to PDF (format like Juri scoring layout)
	const exportToPDF = () => {
		if (categories.length === 0) return;

		const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
		const pageWidth = doc.internal.pageSize.getWidth();
		const primaryRed: [number, number, number] = [220, 38, 38];

		let isFirstPage = true;

		categories.forEach((category) => {
			if (category.materials.length === 0) return;

			if (!isFirstPage) {
				doc.addPage();
			}
			isFirstPage = false;

			// Header
			doc.setFontSize(14);
			doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
			doc.setFont("helvetica", "bold");
			doc.text("LEMBAR PENILAIAN MATERI", pageWidth / 2, 15, { align: "center" });

			doc.setFontSize(11);
			doc.setTextColor(60, 60, 60);
			doc.setFont("helvetica", "bold");
			doc.text(`Kategori: ${category.categoryName}`, pageWidth / 2, 22, { align: "center" });

			// Date on right, total on left
			const dateStr = new Date().toLocaleDateString("id-ID", {
				day: "numeric",
				month: "long",
				year: "numeric",
			});
			doc.setFontSize(8);
			doc.setFont("helvetica", "normal");
			doc.setTextColor(120, 120, 120);
			doc.text(`Total Materi: ${category.materials.length}`, 14, 28);
			doc.text(`Dicetak: ${dateStr}`, pageWidth - 14, 28, { align: "right" });

			// Max score info
			if (category.maxScoreBreakdown && category.maxScoreBreakdown.length > 0) {
				const maxInfo = category.maxScoreBreakdown
					.map((b) => `${b.schoolCategoryName}: ${b.maxScore} (×${b.juryCount} juri = ${b.totalMaxScore})`)
					.join("  |  ");
				doc.setFontSize(7);
				doc.setTextColor(100, 100, 100);
				doc.text(`Maks. Nilai: ${maxInfo}`, pageWidth / 2, 33, { align: "center" });
			}

			// Line
			doc.setDrawColor(primaryRed[0], primaryRed[1], primaryRed[2]);
			doc.setLineWidth(0.8);
			doc.line(14, 36, pageWidth - 14, 36);

			// Build table matching Juri scoring layout:
			// | No | Kriteria | ScoreCategory1 options... | ScoreCategory2 options... | ... |
			const sortedMaterials = [...category.materials].sort((a, b) => a.number - b.number);

			// Collect all unique score categories across materials (sorted by order)
			const allScoreCategories: { name: string; color: string; order: number; maxOptions: number }[] = [];
			sortedMaterials.forEach((material) => {
				material.scoreCategories.forEach((sc) => {
					const existing = allScoreCategories.find((a) => a.name === sc.name);
					if (!existing) {
						allScoreCategories.push({
							name: sc.name,
							color: sc.color,
							order: sc.order,
							maxOptions: sc.options.length,
						});
					} else if (sc.options.length > existing.maxOptions) {
						existing.maxOptions = sc.options.length;
					}
				});
			});
			allScoreCategories.sort((a, b) => a.order - b.order);

			// Build header row: No | Kriteria | [category name spans across its options] | ...
			const headerRow: any[] = [
				{ content: "No", styles: { halign: "center", valign: "middle" } },
				{ content: "Kriteria", styles: { halign: "center", valign: "middle" } },
			];

			allScoreCategories.forEach((sc) => {
				headerRow.push({
					content: sc.name.toUpperCase(),
					colSpan: sc.maxOptions,
					styles: { halign: "center", valign: "middle", fontSize: 7 },
				});
			});

			// Build body rows
			const bodyRows = sortedMaterials.map((material) => {
				const row: any[] = [
					{ content: material.number, styles: { halign: "center", fontStyle: "bold" } },
					{ content: material.name.toUpperCase(), styles: { fontStyle: "bold", fontSize: 7 } },
				];

				allScoreCategories.forEach((sc) => {
					const materialSc = material.scoreCategories.find((s) => s.name === sc.name);
					if (materialSc) {
						const sortedOptions = [...materialSc.options].sort((a, b) => a.order - b.order);
						for (let i = 0; i < sc.maxOptions; i++) {
							if (i < sortedOptions.length) {
								row.push({
									content: sortedOptions[i].score.toString(),
									styles: { halign: "center", fontSize: 8, fontStyle: "bold" },
								});
							} else {
								row.push({ content: "", styles: { halign: "center" } });
							}
						}
					} else {
						for (let i = 0; i < sc.maxOptions; i++) {
							row.push({ content: "-", styles: { halign: "center", textColor: [180, 180, 180] } });
						}
					}
				});

				return row;
			});

			// Calculate column widths
			const tableWidth = pageWidth - 28;
			const noWidth = 8;
			const kriteriaWidth = 30;
			const remainingWidth = tableWidth - noWidth - kriteriaWidth;
			const totalOptionCols = allScoreCategories.reduce((sum, sc) => sum + sc.maxOptions, 0);
			const optColWidth = totalOptionCols > 0 ? remainingWidth / totalOptionCols : 15;

			const columnStyles: any = {
				0: { cellWidth: noWidth },
				1: { cellWidth: kriteriaWidth },
			};
			let colIdx = 2;
			allScoreCategories.forEach((sc) => {
				for (let i = 0; i < sc.maxOptions; i++) {
					columnStyles[colIdx] = { cellWidth: optColWidth };
					colIdx++;
				}
			});

			// Color mapping for category headers
			const colorMap: Record<string, [number, number, number]> = {
				red: [220, 38, 38],
				orange: [234, 88, 12],
				yellow: [202, 138, 4],
				green: [22, 163, 74],
				blue: [37, 99, 235],
				purple: [147, 51, 234],
			};

			autoTable(doc, {
				head: [headerRow],
				body: bodyRows,
				startY: 39,
				styles: {
					fontSize: 7,
					cellPadding: 1.5,
					lineColor: [200, 200, 200],
					lineWidth: 0.1,
					overflow: "linebreak",
				},
				headStyles: {
					fillColor: primaryRed,
					textColor: 255,
					fontStyle: "bold",
					halign: "center",
					minCellHeight: 10,
				},
				bodyStyles: {
					textColor: [50, 50, 50],
					minCellHeight: 9,
					valign: "middle",
				},
				alternateRowStyles: {
					fillColor: [254, 242, 242],
				},
				columnStyles,
				didParseCell: (data) => {
					// Color category header cells
					if (data.section === "head" && data.column.index >= 2) {
						let optCount = 0;
						for (const sc of allScoreCategories) {
							if (data.column.index >= 2 + optCount && data.column.index < 2 + optCount + sc.maxOptions) {
								const catColor = colorMap[sc.color] || primaryRed;
								data.cell.styles.fillColor = catColor;
								break;
							}
							optCount += sc.maxOptions;
						}
					}
				},
			});
		});

		doc.save("lembar-penilaian-materi.pdf");
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
			</div>
		);
	}

	return (
		<div className="min-h-screen">
			<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Header */}
				<div className="flex items-center justify-between mb-8">
					<div>
						<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
							Kelola Materi
						</h1>
						<p className="mt-1 text-gray-600 dark:text-gray-400">
							Atur materi, kategori sekolah, dan pilihan penilaian per materi
						</p>
					</div>
					{categories.some((c) => c.materials.length > 0) && (
						<button
							onClick={exportToPDF}
							className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
						>
							<ArrowDownTrayIcon className="w-4 h-4" />
							Ekspor PDF
						</button>
					)}
				</div>

				{/* Event School Categories Info
				{eventSchoolCategories.length > 0 && (
					<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow mb-6 p-6">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
							<AcademicCapIcon className="h-5 w-5 text-red-600" />
							Kategori Sekolah Event
						</h2>
						<div className="flex flex-wrap gap-2">
							{eventSchoolCategories.map((sc) => (
								<span
									key={sc.id}
									className="px-3 py-1.5 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium"
								>
									{sc.name}
								</span>
							))}
						</div>
						<p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
							Setiap materi dapat di-assign ke kategori sekolah yang berbeda.
						</p>
					</div>
				)} */}

				{/* No School Categories Warning */}
				{eventSchoolCategories.length === 0 && (
					<div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
						<p className="text-yellow-800 dark:text-yellow-300 font-medium">
							Event belum memiliki kategori sekolah.
						</p>
						<p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
							Tambahkan kategori sekolah di halaman edit event terlebih dahulu.
						</p>
					</div>
				)}

				{/* Categories and Materials */}
				<div className="space-y-4">
					{categories.length === 0 ? (
						<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow p-12 text-center">
							<BookOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
							<h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
								Tidak Ada Kategori Penilaian
							</h3>
							<p className="mt-2 text-gray-600 dark:text-gray-400">
								Event ini belum memiliki kategori penilaian. Tambahkan kategori di
								halaman edit event.
							</p>
							<Link
								to={`${basePath}/events/${eventSlug}/manage`}
								className="mt-4 inline-flex items-center text-red-600 hover:text-red-500"
							>
								Kembali ke Kelola Event
							</Link>
						</div>
					) : (
						<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow overflow-hidden">
							{/* Assessment Category Tabs */}
							<div className="flex border-b border-gray-200 dark:border-gray-600 overflow-x-auto bg-gray-50 dark:bg-gray-700/50">
								{categories.map((category) => (
									<button
										key={category.id}
										type="button"
										onClick={() => setActiveAssessmentCategoryTab(category.id)}
										className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
											activeAssessmentCategoryTab === category.id
												? "border-red-600 text-red-600 dark:text-red-400 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm"
												: "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
										}`}
									>
										<span className="font-semibold">{category.categoryName}</span>
										<span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 rounded-full">
											{category.materials.length}
										</span>
									</button>
								))}
							</div>

							{/* Active Assessment Category Content */}
							{(() => {
								const category = categories.find(c => c.id === activeAssessmentCategoryTab) || categories[0];
								if (!category) return null;
								return (
									<div className="p-6">
										{/* Score Summary Section */}
										<div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-purple-50 dark:from-red-900/20 dark:to-purple-900/20 rounded-lg border border-red-100 dark:border-red-800">
											<div className="flex items-center justify-between mb-3">
												<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Maksimal Nilai per Kategori Sekolah</h4>
												<span className="text-xs text-gray-500 dark:text-gray-400">Juri: {category.juryCount ?? 0}</span>
											</div>
											{category.maxScoreBreakdown && category.maxScoreBreakdown.length > 0 ? (
												<div className="overflow-x-auto">
													<table className="w-full text-sm">
														<thead>
															<tr className="text-left text-xs text-gray-500 dark:text-gray-400 uppercase">
																<th className="pb-2 pr-4">Kategori Sekolah</th>
																<th className="pb-2 pr-4 text-center">Maks. Nilai</th>
																<th className="pb-2 pr-4 text-center">Juri</th>
																<th className="pb-2 text-center">Total Maks.</th>
															</tr>
														</thead>
														<tbody className="divide-y divide-gray-200 dark:divide-gray-700">
															{category.maxScoreBreakdown.map((item) => (
																<tr key={item.schoolCategoryId}>
																	<td className="py-2 pr-4 font-medium text-gray-700 dark:text-gray-300">{item.schoolCategoryName}</td>
																	<td className="py-2 pr-4 text-center text-red-600 dark:text-red-400 font-semibold">{item.maxScore}</td>
																	<td className="py-2 pr-4 text-center text-purple-600 dark:text-purple-400">{item.juryCount}</td>
																	<td className="py-2 text-center text-green-600 dark:text-green-400 font-bold">{item.totalMaxScore}</td>
																</tr>
															))}
														</tbody>
													</table>
												</div>
											) : (
												<p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
													Belum ada materi dengan kategori sekolah
												</p>
											)}
										</div>

										{category.materials.length === 0 ? (
											<div className="text-center py-4">
												<p className="text-gray-500 dark:text-gray-400 mb-4">
													Belum ada materi untuk kategori ini
												</p>
												
												{/* PBB Simpaskor Recommendation */}
												<PBBTemplateRecommendation
													categoryId={category.id}
													categoryName={category.categoryName}
													eventSlug={eventSlug || ''}
													schoolCategoryIds={eventSchoolCategories.map(sc => sc.id)}
													onImportComplete={fetchData}
												/>
											</div>
										) : (
											<div className="space-y-3">
												{/* Materials List */}
												{category.materials
													.sort((a, b) => a.number - b.number)
													.map((material) => (
														<React.Fragment key={material.id}>
															<div
																className={`p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg ${
																	editingMaterial?.id === material.id 
																		? "ring-2 ring-red-500 dark:ring-red-400" 
																		: ""
																}`}
															>
																<div className="flex items-start justify-between">
																	<div className="flex-1">
																		<div className="flex items-center gap-3 mb-2">
																			<span className="flex items-center justify-center w-8 h-8 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-full font-semibold text-sm">
																				{material.number}
																			</span>
																			<p className="font-medium text-lg text-gray-900 dark:text-white">
																				{material.name}
																			</p>
																		</div>
																		{material.description && (
																			<p className="text-sm text-gray-500 dark:text-gray-400 mb-3 ml-11">
																				{material.description}
																			</p>
																		)}

																		{/* School Categories */}
																		<div className="mt-3 ml-11">
																			<p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
																				Kategori Sekolah:
																			</p>
																			<div className="flex flex-wrap gap-1.5">
																				{material.schoolCategories.length > 0 ? (
																					material.schoolCategories.map((sc) => (
																						<span
																							key={sc.id}
																							className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded text-xs"
																						>
																							{sc.name}
																						</span>
																					))
																				) : (
																					<span className="text-xs text-gray-400">
																						Semua kategori
																					</span>
																				)}
																			</div>
																		</div>

																		{/* Score Categories with Options */}
																		<div className="mt-3 ml-11">
																			<p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
																				Kategori & Pilihan Nilai:
																			</p>
																			{material.scoreCategories.length > 0 ? (
																				<div className="flex flex-wrap gap-2">
																					{material.scoreCategories.map((cat) => (
																						<div key={cat.id} className={`flex items-center gap-1.5 px-2 py-1 rounded ${getColorClasses(cat.color || "gray")}`}>
																							<span className="text-xs font-medium">
																								{cat.name}:
																							</span>
																							{cat.options.map((opt) => (
																								<span
																									key={opt.id}
																									className="px-1.5 py-0.5 bg-white/50 dark:bg-gray-800/50 rounded text-xs"
																									title={opt.name || undefined}
																								>
																									{opt.score}{opt.name && ` (${opt.name})`}
																								</span>
																							))}
																						</div>
																					))}
																				</div>
																			) : (
																				<span className="text-xs text-gray-400">
																					Belum diatur
																				</span>
																			)}
																		</div>
																	</div>
																	<div className="flex items-center gap-2">
																		<button
																			onClick={() => openEditMaterialForm(material)}
																			className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
																			title="Edit"
																		>
																			<PencilIcon className="h-4 w-4" />
																		</button>
																		<button
																			onClick={() => handleDeleteMaterial(material)}
																			className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
																			title="Hapus"
																		>
																			<TrashIcon className="h-4 w-4" />
																		</button>
																	</div>
																</div>
															</div>
															{/* Show form right below the material being edited */}
															{editingMaterial?.id === material.id && showMaterialForm === category.id && renderMaterialForm()}
														</React.Fragment>
													))}
											</div>
										)}

										{/* Add Material Button - only show when not editing */}
										{showMaterialForm === category.id && !editingMaterial ? (
											renderMaterialForm()
										) : (
											eventSchoolCategories.length > 0 && !editingMaterial && (
												<button
													onClick={() => openAddMaterialForm(category.id)}
													className="mt-4 flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
												>
													<PlusIcon className="h-5 w-5" />
													Tambah Materi
												</button>
											)
										)}
									</div>
								);
							})()}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default ManageMateri;
