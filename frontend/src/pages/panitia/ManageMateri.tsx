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
import ExcelJS from "exceljs";

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
								color: sc.color || "gray",
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
							const option = sortedOptions[i];
							if (option) {
								row.push({
									content: option.score.toString(),
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

	// Export all materials to Excel with clean formatting
	const exportToExcel = async () => {
		if (categories.length === 0) return;

		const workbook = new ExcelJS.Workbook();
		workbook.creator = "Simpaskor";
		workbook.created = new Date();

		// Color mapping for Excel (ARGB format)
		const excelColorMap: Record<string, string> = {
			red: "FFDC2626",
			orange: "FFEA580C",
			yellow: "FFCA8A04",
			green: "FF16A34A",
			blue: "FF2563EB",
			purple: "FF9333EA",
			gray: "FF6B7280",
		};

		categories.forEach((category) => {
			if (category.materials.length === 0) return;

			// Sheet name max 31 chars
			const sheetName = category.categoryName.substring(0, 31);
			const worksheet = workbook.addWorksheet(sheetName);

			const sortedMaterials = [...category.materials].sort((a, b) => a.number - b.number);

			// Collect all unique score categories
			const allScoreCats: { name: string; color: string; order: number; maxOptions: number }[] = [];
			sortedMaterials.forEach((mat) => {
				mat.scoreCategories.forEach((sc) => {
					const existing = allScoreCats.find((a) => a.name === sc.name);
					if (!existing) {
						allScoreCats.push({ name: sc.name, color: sc.color || "gray", order: sc.order, maxOptions: sc.options.length });
					} else if (sc.options.length > existing.maxOptions) {
						existing.maxOptions = sc.options.length;
					}
				});
			});
			allScoreCats.sort((a, b) => a.order - b.order);

			const totalOptionCols = allScoreCats.reduce((sum, sc) => sum + sc.maxOptions, 0);
			const totalCols = 2 + totalOptionCols; // No + Materi + score option columns

			// === Row 1: Title ===
			worksheet.mergeCells(1, 1, 1, totalCols);
			const titleCell = worksheet.getCell(1, 1);
			titleCell.value = "LEMBAR PENILAIAN MATERI";
			titleCell.font = { bold: true, size: 14, color: { argb: "FFDC2626" } };
			titleCell.alignment = { horizontal: "center", vertical: "middle" };
			titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF5F5" } };
			worksheet.getRow(1).height = 28;

			// === Row 2: Category name ===
			worksheet.mergeCells(2, 1, 2, totalCols);
			const catCell = worksheet.getCell(2, 1);
			catCell.value = `Kategori: ${category.categoryName}`;
			catCell.font = { bold: true, size: 11, color: { argb: "FF3C3C3C" } };
			catCell.alignment = { horizontal: "center", vertical: "middle" };
			worksheet.getRow(2).height = 22;

			// === Row 3: Info row ===
			const dateStr = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
			worksheet.mergeCells(3, 1, 3, Math.max(1, Math.floor(totalCols / 2)));
			worksheet.getCell(3, 1).value = `Total Materi: ${category.materials.length}`;
			worksheet.getCell(3, 1).font = { size: 9, color: { argb: "FF787878" } };
			worksheet.getCell(3, 1).alignment = { horizontal: "left", vertical: "middle" };

			if (totalCols > 1) {
				worksheet.mergeCells(3, Math.floor(totalCols / 2) + 1, 3, totalCols);
				const dateCell = worksheet.getCell(3, Math.floor(totalCols / 2) + 1);
				dateCell.value = `Dicetak: ${dateStr}`;
				dateCell.font = { size: 9, color: { argb: "FF787878" } };
				dateCell.alignment = { horizontal: "right", vertical: "middle" };
			}
			worksheet.getRow(3).height = 18;

			// === Row 4: Max score breakdown ===
			if (category.maxScoreBreakdown && category.maxScoreBreakdown.length > 0) {
				const maxInfo = category.maxScoreBreakdown
					.map((b) => `${b.schoolCategoryName}: ${b.maxScore} (×${b.juryCount} juri = ${b.totalMaxScore})`)
					.join("  |  ");
				worksheet.mergeCells(4, 1, 4, totalCols);
				const maxCell = worksheet.getCell(4, 1);
				maxCell.value = `Maks. Nilai: ${maxInfo}`;
				maxCell.font = { size: 9, italic: true, color: { argb: "FF646464" } };
				maxCell.alignment = { horizontal: "center", vertical: "middle" };
				worksheet.getRow(4).height = 18;
			}

			// === Row 5: Separator (empty row) ===
			worksheet.getRow(5).height = 6;

			// === Row 6: Header row 1 - Category group headers ===
			const headerRow1 = 6;
			const headerRow2 = 7;

			// No column header (merged 2 rows)
			worksheet.mergeCells(headerRow1, 1, headerRow2, 1);
			const noHeader = worksheet.getCell(headerRow1, 1);
			noHeader.value = "No";
			noHeader.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
			noHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
			noHeader.alignment = { horizontal: "center", vertical: "middle" };
			noHeader.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };

			// Materi column header (merged 2 rows)
			worksheet.mergeCells(headerRow1, 2, headerRow2, 2);
			const matHeader = worksheet.getCell(headerRow1, 2);
			matHeader.value = "Materi Penilaian";
			matHeader.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
			matHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
			matHeader.alignment = { horizontal: "center", vertical: "middle" };
			matHeader.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };

			// Score category group headers (Row 6) + option sub-headers (Row 7)
			let colIdx = 3;
			allScoreCats.forEach((sc) => {
				const startCol = colIdx;
				const endCol = colIdx + sc.maxOptions - 1;

				// Merge category header across its options
				if (sc.maxOptions > 1) {
					worksheet.mergeCells(headerRow1, startCol, headerRow1, endCol);
				}
				const catHeaderCell = worksheet.getCell(headerRow1, startCol);
				catHeaderCell.value = sc.name.toUpperCase();
				catHeaderCell.font = { bold: true, size: 9, color: { argb: "FFFFFFFF" } };
				catHeaderCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: excelColorMap[sc.color] || excelColorMap.gray } };
				catHeaderCell.alignment = { horizontal: "center", vertical: "middle" };
				catHeaderCell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };

				// Also style the merged cells
				for (let i = startCol + 1; i <= endCol; i++) {
					const mergedCell = worksheet.getCell(headerRow1, i);
					mergedCell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
				}

				// Sub-header row: option names from reference material
				const refMat = sortedMaterials.find((m) => m.scoreCategories.some((s) => s.name === sc.name));
				const refSc = refMat?.scoreCategories.find((s) => s.name === sc.name);
				const refOptions = refSc ? [...refSc.options].sort((a, b) => a.order - b.order) : [];

				for (let i = 0; i < sc.maxOptions; i++) {
					const subCell = worksheet.getCell(headerRow2, colIdx + i);
					subCell.value = refOptions[i]?.name || "";
					subCell.font = { size: 8, color: { argb: "FF374151" } };
					subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
					subCell.alignment = { horizontal: "center", vertical: "middle" };
					subCell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
				}

				colIdx += sc.maxOptions;
			});

			worksheet.getRow(headerRow1).height = 22;
			worksheet.getRow(headerRow2).height = 18;

			// === Data rows (starting at row 8) ===
			sortedMaterials.forEach((material, idx) => {
				const rowNum = headerRow2 + 1 + idx;
				const row = worksheet.getRow(rowNum);

				// Alternate row background
				const altBg = idx % 2 === 1 ? "FFF9FAFB" : "FFFFFFFF";

				// No column
				const noCell = row.getCell(1);
				noCell.value = material.number;
				noCell.font = { bold: true, size: 10, color: { argb: "FFDC2626" } };
				noCell.alignment = { horizontal: "center", vertical: "middle" };
				noCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: altBg } };
				noCell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };

				// Material name column
				const nameCell = row.getCell(2);
				nameCell.value = material.name.toUpperCase();
				nameCell.font = { bold: true, size: 9 };
				nameCell.alignment = { vertical: "middle", wrapText: true };
				nameCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: altBg } };
				nameCell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };

				// Score values
				let dataColIdx = 3;
				allScoreCats.forEach((sc) => {
					const materialSc = material.scoreCategories.find((s) => s.name === sc.name);
					const sortedOptions = materialSc ? [...materialSc.options].sort((a, b) => a.order - b.order) : [];

					for (let i = 0; i < sc.maxOptions; i++) {
						const cell = row.getCell(dataColIdx + i);
						if (sortedOptions[i]) {
							cell.value = sortedOptions[i].score;
							cell.font = { bold: true, size: 10 };
						} else {
							cell.value = materialSc ? "" : "—";
							cell.font = { color: { argb: "FFB4B4B4" } };
						}
						cell.alignment = { horizontal: "center", vertical: "middle" };
						cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: altBg } };
						cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
					}
					dataColIdx += sc.maxOptions;
				});

				row.height = 22;
			});

			// === Set column widths ===
			worksheet.getColumn(1).width = 6;   // No
			worksheet.getColumn(2).width = 32;   // Materi Penilaian
			for (let i = 3; i <= totalCols; i++) {
				worksheet.getColumn(i).width = 10; // Score columns
			}
		});

		// Generate and download
		const buffer = await workbook.xlsx.writeBuffer();
		const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = "lembar-penilaian-materi.xlsx";
		link.click();
		URL.revokeObjectURL(url);
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
						<div className="flex items-center gap-2">
							<button
								onClick={exportToExcel}
								className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
							>
								<ArrowDownTrayIcon className="w-4 h-4" />
								Ekspor Excel
							</button>
							<button
								onClick={exportToPDF}
								className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
							>
								<ArrowDownTrayIcon className="w-4 h-4" />
								Ekspor PDF
							</button>
						</div>
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
											<>
												{/* Scoring Sheet Table */}
												{(() => {
													const sortedMaterials = [...category.materials].sort((a, b) => a.number - b.number);

													// Collect all unique score categories across materials
													const allScoreCats: { name: string; color: string; order: number; maxOptions: number }[] = [];
													sortedMaterials.forEach((mat) => {
														mat.scoreCategories.forEach((sc) => {
															const existing = allScoreCats.find((a) => a.name === sc.name);
															if (!existing) {
																allScoreCats.push({ name: sc.name, color: sc.color || "gray", order: sc.order, maxOptions: sc.options.length });
															} else if (sc.options.length > existing.maxOptions) {
																existing.maxOptions = sc.options.length;
															}
														});
													});
													allScoreCats.sort((a, b) => a.order - b.order);

													const totalOptionCols = allScoreCats.reduce((sum, sc) => sum + sc.maxOptions, 0);

													// Color mapping for header backgrounds
													const headerColorMap: Record<string, string> = {
														red: "bg-red-600 text-white",
														orange: "bg-orange-500 text-white",
														yellow: "bg-yellow-500 text-white",
														green: "bg-green-600 text-white",
														blue: "bg-blue-600 text-white",
														purple: "bg-purple-600 text-white",
														gray: "bg-gray-500 text-white",
													};

													const cellColorMap: Record<string, string> = {
														red: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300",
														orange: "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300",
														yellow: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300",
														green: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300",
														blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300",
														purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300",
														gray: "bg-gray-50 dark:bg-gray-700/30 text-gray-700 dark:text-gray-300",
													};

													return (
														<div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden shadow-sm bg-white dark:bg-gray-900">
															{/* Paper Header */}
															<div className="bg-gradient-to-r from-red-700 to-red-600 px-5 py-3 text-center">
																<h3 className="text-white font-bold text-sm tracking-wider uppercase">
																	Lembar Penilaian — {category.categoryName}
																</h3>
																<p className="text-red-200 text-xs mt-0.5">
																	{sortedMaterials.length} Materi
																</p>
															</div>

															<div className="overflow-x-auto">
																<table className="w-full border-collapse min-w-[600px]">
																	<thead>
																		{/* Category headers spanning options */}
																		<tr>
																			<th
																				rowSpan={2}
																				className="bg-gray-800 dark:bg-gray-700 text-white text-xs font-bold px-3 py-2 text-center border border-gray-300 dark:border-gray-600 w-12"
																			>
																				No
																			</th>
																			<th
																				rowSpan={2}
																				className="bg-gray-800 dark:bg-gray-700 text-white text-xs font-bold px-3 py-2 text-left border border-gray-300 dark:border-gray-600"
																			>
																				Materi Penilaian
																			</th>
																			{allScoreCats.map((sc) => (
																				<th
																					key={sc.name}
																					colSpan={sc.maxOptions}
																					className={`text-xs font-bold px-2 py-2 text-center border border-gray-300 dark:border-gray-600 ${headerColorMap[sc.color] || headerColorMap.gray}`}
																				>
																					{sc.name.toUpperCase()}
																				</th>
																			))}
																			<th
																				rowSpan={2}
																				className="bg-gray-800 dark:bg-gray-700 text-white text-xs font-bold px-3 py-2 text-center border border-gray-300 dark:border-gray-600 w-20"
																			>
																				Aksi
																			</th>
																		</tr>
																		{/* Score value sub-headers */}
																		{totalOptionCols > 0 && (
																			<tr>
																				{allScoreCats.map((sc) => {
																					// Show placeholder score labels from first material that has this category
																					const refMat = sortedMaterials.find((m) => m.scoreCategories.some((s) => s.name === sc.name));
																					const refSc = refMat?.scoreCategories.find((s) => s.name === sc.name);
																					const refOptions = refSc ? [...refSc.options].sort((a, b) => a.order - b.order) : [];

																					return Array.from({ length: sc.maxOptions }, (_, i) => (
																						<th
																							key={`${sc.name}-sub-${i}`}
																							className={`text-xs font-medium px-1 py-1.5 text-center border border-gray-300 dark:border-gray-600 ${cellColorMap[sc.color] || cellColorMap.gray}`}
																						>
																							{refOptions[i]?.name || ""}
																						</th>
																					));
																				})}
																			</tr>
																		)}
																	</thead>
																	<tbody>
																		{sortedMaterials.map((material, idx) => (
																			<React.Fragment key={material.id}>
																				<tr
																					className={`group transition-colors ${
																						editingMaterial?.id === material.id
																							? "ring-2 ring-inset ring-red-500"
																							: idx % 2 === 0
																								? "bg-white dark:bg-gray-900"
																								: "bg-gray-50 dark:bg-gray-800/50"
																					} hover:bg-red-50/50 dark:hover:bg-red-900/10`}
																				>
																					{/* Number */}
																					<td className="px-3 py-3 text-center font-bold text-sm text-red-600 dark:text-red-400 border border-gray-200 dark:border-gray-700">
																						{material.number}
																					</td>

																					{/* Material Name + Info */}
																					<td className="px-3 py-3 border border-gray-200 dark:border-gray-700">
																						<p className="font-semibold text-sm text-gray-900 dark:text-white uppercase">
																							{material.name}
																						</p>
																						{material.description && (
																							<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
																								{material.description}
																							</p>
																						)}
																						{material.schoolCategories.length > 0 && (
																							<div className="flex flex-wrap gap-1 mt-1.5">
																								{material.schoolCategories.map((sc) => (
																									<span
																										key={sc.id}
																										className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded text-[10px] font-medium"
																									>
																										{sc.name}
																									</span>
																								))}
																							</div>
																						)}
																					</td>

																					{/* Score values per category */}
																					{allScoreCats.map((sc) => {
																						const materialSc = material.scoreCategories.find((s) => s.name === sc.name);
																						const sortedOptions = materialSc
																							? [...materialSc.options].sort((a, b) => a.order - b.order)
																							: [];

																						return Array.from({ length: sc.maxOptions }, (_, i) => (
																							<td
																								key={`${material.id}-${sc.name}-${i}`}
																								className={`px-1 py-3 text-center border border-gray-200 dark:border-gray-700 ${
																									sortedOptions[i]
																										? cellColorMap[sc.color] || cellColorMap.gray
																										: ""
																								}`}
																							>
																								{sortedOptions[i] ? (
																									<span className="font-bold text-sm">
																										{sortedOptions[i].score}
																									</span>
																								) : (
																									<span className="text-gray-300 dark:text-gray-600">—</span>
																								)}
																							</td>
																						));
																					})}

																					{/* Actions */}
																					<td className="px-2 py-3 text-center border border-gray-200 dark:border-gray-700">
																						<div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
																							<button
																								onClick={() => openEditMaterialForm(material)}
																								className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
																								title="Edit"
																							>
																								<PencilIcon className="h-4 w-4" />
																							</button>
																							<button
																								onClick={() => handleDeleteMaterial(material)}
																								className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
																								title="Hapus"
																							>
																								<TrashIcon className="h-4 w-4" />
																							</button>
																						</div>
																					</td>
																				</tr>
																				{/* Show form right below the material being edited */}
																				{editingMaterial?.id === material.id && showMaterialForm === category.id && (
																					<tr>
																						<td colSpan={2 + totalOptionCols + 1} className="p-0">
																							{renderMaterialForm()}
																						</td>
																					</tr>
																				)}
																			</React.Fragment>
																		))}
																	</tbody>
																</table>
															</div>
														</div>
													);
												})()}
											</>
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
