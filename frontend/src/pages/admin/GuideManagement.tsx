import React, { useState, useEffect, useCallback, useRef } from "react";
import {
	LuBookOpen,
	LuPlus,
	LuPencil,
	LuTrash2,
	LuImage,
	LuEye,
	LuEyeOff,
	LuChevronLeft,
	LuChevronRight,
	LuChevronUp,
	LuChevronDown,
	LuX,
	LuSave,
	LuUpload,
	LuArrowLeft,
} from "react-icons/lu";
import { api } from "../../utils/api";

type GuideRole = "PANITIA" | "JURI" | "PESERTA";

interface GuideSlide {
	id: string;
	guideId: string;
	order: number;
	title: string;
	description: string;
	imageUrl: string | null;
}

interface Guide {
	id: string;
	role: GuideRole;
	title: string;
	description: string | null;
	icon: string | null;
	order: number;
	isPublished: boolean;
	slides: GuideSlide[];
	_count?: { slides: number };
}

const ROLE_TABS: { key: GuideRole; label: string }[] = [
	{ key: "PANITIA", label: "Panitia" },
	{ key: "JURI", label: "Juri" },
	{ key: "PESERTA", label: "Peserta" },
];

const GuideManagement: React.FC = () => {
	const [guides, setGuides] = useState<Guide[]>([]);
	const [loading, setLoading] = useState(true);
	const [activeRole, setActiveRole] = useState<GuideRole>("PANITIA");

	// Guide form
	const [showGuideForm, setShowGuideForm] = useState(false);
	const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
	const [guideForm, setGuideForm] = useState({ title: "", description: "", icon: "", order: 0 });

	// Slide editor (full screen)
	const [editingGuideSlides, setEditingGuideSlides] = useState<Guide | null>(null);
	const [activeSlideIdx, setActiveSlideIdx] = useState(0);
	const [slideForm, setSlideForm] = useState({ title: "", description: "" });
	const [slideImage, setSlideImage] = useState<File | null>(null);
	const [slideImagePreview, setSlideImagePreview] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const fetchGuides = useCallback(async () => {
		try {
			setLoading(true);
			const res = await api.get(`/guides?role=${activeRole}`);
			setGuides(res.data || []);
		} catch (error) {
			console.error("Error fetching guides:", error);
		} finally {
			setLoading(false);
		}
	}, [activeRole]);

	useEffect(() => {
		fetchGuides();
	}, [fetchGuides]);

	// Refresh the editing guide data
	const refreshEditingGuide = useCallback(async (guideId: string, slideIdx?: number) => {
		try {
			const res = await api.get(`/guides/${guideId}`);
			const guide: Guide = res.data;
			setEditingGuideSlides(guide);
			// Update guides list too
			setGuides((prev) => prev.map((g) => (g.id === guide.id ? guide : g)));
			const idx = slideIdx ?? activeSlideIdx;
			const clampedIdx = Math.min(idx, guide.slides.length - 1);
			const finalIdx = Math.max(0, clampedIdx);
			setActiveSlideIdx(finalIdx);
			loadSlideIntoForm(guide.slides[finalIdx] || null);
		} catch (error) {
			console.error("Error refreshing guide:", error);
		}
	}, [activeSlideIdx]);

	const loadSlideIntoForm = (slide: GuideSlide | null) => {
		if (slide) {
			setSlideForm({ title: slide.title, description: slide.description });
			setSlideImagePreview(slide.imageUrl);
		} else {
			setSlideForm({ title: "", description: "" });
			setSlideImagePreview(null);
		}
		setSlideImage(null);
		setHasUnsavedChanges(false);
	};

	// ====== Guide CRUD ======
	const openGuideForm = (guide?: Guide) => {
		if (guide) {
			setEditingGuide(guide);
			setGuideForm({ title: guide.title, description: guide.description || "", icon: guide.icon || "", order: guide.order });
		} else {
			setEditingGuide(null);
			const filtered = guides.filter((g) => g.role === activeRole);
			const maxOrder = filtered.length > 0 ? Math.max(...filtered.map((g) => g.order)) + 1 : 0;
			setGuideForm({ title: "", description: "", icon: "", order: maxOrder });
		}
		setShowGuideForm(true);
	};

	const saveGuide = async () => {
		if (!guideForm.title.trim()) return;
		setSaving(true);
		try {
			if (editingGuide) {
				await api.patch(`/guides/${editingGuide.id}`, guideForm);
			} else {
				await api.post("/guides", { ...guideForm, role: activeRole });
			}
			setShowGuideForm(false);
			fetchGuides();
		} catch (error) {
			console.error("Error saving guide:", error);
		} finally {
			setSaving(false);
		}
	};

	const togglePublish = async (guide: Guide) => {
		try {
			await api.patch(`/guides/${guide.id}`, { isPublished: !guide.isPublished });
			fetchGuides();
		} catch (error) {
			console.error("Error toggling publish:", error);
		}
	};

	const deleteGuide = async (guide: Guide) => {
		if (!window.confirm(`Hapus panduan "${guide.title}" beserta semua slide?`)) return;
		try {
			await api.delete(`/guides/${guide.id}`);
			fetchGuides();
		} catch (error) {
			console.error("Error deleting guide:", error);
		}
	};

	// ====== Slide Editor ======
	const openSlideEditor = (guide: Guide) => {
		setEditingGuideSlides(guide);
		setActiveSlideIdx(0);
		loadSlideIntoForm(guide.slides[0] || null);
	};

	const closeSlideEditor = () => {
		if (hasUnsavedChanges && !window.confirm("Ada perubahan yang belum disimpan. Yakin keluar?")) return;
		setEditingGuideSlides(null);
		setActiveSlideIdx(0);
		setSlideForm({ title: "", description: "" });
		setSlideImage(null);
		setSlideImagePreview(null);
		setHasUnsavedChanges(false);
		fetchGuides();
	};

	const navigateSlide = (idx: number) => {
		if (!editingGuideSlides) return;
		if (hasUnsavedChanges && !window.confirm("Ada perubahan yang belum disimpan. Pindah slide?")) return;
		setActiveSlideIdx(idx);
		loadSlideIntoForm(editingGuideSlides.slides[idx] || null);
	};

	const uploadImageFile = async (): Promise<string | null> => {
		if (!slideImage) return slideImagePreview;
		const formData = new FormData();
		formData.append("image", slideImage);
		const res = await api.post("/guides/slides/upload-image", formData, {
			headers: { "Content-Type": "multipart/form-data" },
		});
		return res.data.imageUrl;
	};

	const saveCurrentSlide = async () => {
		if (!editingGuideSlides || !slideForm.title.trim() || !slideForm.description.trim()) return;
		setSaving(true);
		try {
			const imageUrl = await uploadImageFile();
			const slide = editingGuideSlides.slides[activeSlideIdx];
			if (slide) {
				await api.patch(`/guides/slides/${slide.id}`, { ...slideForm, imageUrl });
			}
			await refreshEditingGuide(editingGuideSlides.id, activeSlideIdx);
			setHasUnsavedChanges(false);
		} catch (error) {
			console.error("Error saving slide:", error);
		} finally {
			setSaving(false);
		}
	};

	const addNewSlide = async (insertAtIdx?: number) => {
		if (!editingGuideSlides) return;
		if (hasUnsavedChanges && !window.confirm("Simpan perubahan sebelum menambah slide baru?")) return;
		setSaving(true);
		try {
			const slides = editingGuideSlides.slides;
			if (insertAtIdx !== undefined && insertAtIdx < slides.length) {
				// Insert at position: create slide then reorder
				const maxOrder = slides.length > 0 ? Math.max(...slides.map((s) => s.order)) + 1 : 0;
				const res = await api.post(`/guides/${editingGuideSlides.id}/slides`, {
					title: "Langkah Baru",
					description: "Deskripsi langkah...",
					order: maxOrder,
				});
				const newSlideId = res.data.id;
				// Build new order: insert the new slide at insertAtIdx
				const reordered = [...slides.map((s) => s.id)];
				reordered.splice(insertAtIdx, 0, newSlideId);
				await api.patch(`/guides/${editingGuideSlides.id}/slides/reorder`, { slideIds: reordered });
				await refreshEditingGuide(editingGuideSlides.id, insertAtIdx);
			} else {
				// Append at end
				const maxOrder = slides.length > 0 ? Math.max(...slides.map((s) => s.order)) + 1 : 0;
				await api.post(`/guides/${editingGuideSlides.id}/slides`, {
					title: "Langkah Baru",
					description: "Deskripsi langkah...",
					order: maxOrder,
				});
				await refreshEditingGuide(editingGuideSlides.id, slides.length);
			}
			setHasUnsavedChanges(false);
		} catch (error) {
			console.error("Error adding slide:", error);
		} finally {
			setSaving(false);
		}
	};

	const deleteCurrentSlide = async () => {
		if (!editingGuideSlides) return;
		const slide = editingGuideSlides.slides[activeSlideIdx];
		if (!slide) return;
		if (!window.confirm(`Hapus slide "${slide.title}"?`)) return;
		try {
			await api.delete(`/guides/slides/${slide.id}`);
			const newIdx = Math.max(0, activeSlideIdx - 1);
			await refreshEditingGuide(editingGuideSlides.id, newIdx);
		} catch (error) {
			console.error("Error deleting slide:", error);
		}
	};

	const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setSlideImage(file);
			setSlideImagePreview(URL.createObjectURL(file));
			setHasUnsavedChanges(true);
		}
	};

	const moveSlide = async (fromIdx: number, direction: "up" | "down") => {
		if (!editingGuideSlides) return;
		const toIdx = direction === "up" ? fromIdx - 1 : fromIdx + 1;
		if (toIdx < 0 || toIdx >= editingGuideSlides.slides.length) return;
		if (hasUnsavedChanges && !window.confirm("Simpan perubahan sebelum mengubah urutan?")) return;
		try {
			const reordered = [...editingGuideSlides.slides.map((s) => s.id)];
			const tmp = reordered[fromIdx]!;
			reordered[fromIdx] = reordered[toIdx]!;
			reordered[toIdx] = tmp;
			await api.patch(`/guides/${editingGuideSlides.id}/slides/reorder`, { slideIds: reordered });
			// Keep viewing the slide that moved
			await refreshEditingGuide(editingGuideSlides.id, toIdx);
			setHasUnsavedChanges(false);
		} catch (error) {
			console.error("Error moving slide:", error);
		}
	};

	const handleFormChange = (field: "title" | "description", value: string) => {
		setSlideForm((prev) => ({ ...prev, [field]: value }));
		setHasUnsavedChanges(true);
	};

	const filteredGuides = guides.filter((g) => g.role === activeRole);

	// ====== FULL SCREEN SLIDE EDITOR ======
	if (editingGuideSlides) {
		const slide = editingGuideSlides.slides[activeSlideIdx];
		const total = editingGuideSlides.slides.length;

		return (
			<div className="h-screen flex flex-col overflow-hidden">
				{/* Top bar */}
				<div className="flex-shrink-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-white/[0.06]">
					<div className="px-4 md:px-6 py-3 flex items-center gap-3">
						<button
							onClick={closeSlideEditor}
							className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors"
						>
							<LuArrowLeft className="w-4 h-4" />
							Kembali
						</button>
						<div className="w-px h-5 bg-gray-200 dark:bg-white/10" />
						<div className="flex-1 min-w-0">
							<h2 className="text-sm font-bold text-gray-900 dark:text-white truncate">
								{editingGuideSlides.title}
							</h2>
							<p className="text-[10px] text-gray-400 dark:text-gray-500">
								{total} slide · Editing mode
							</p>
						</div>
						{hasUnsavedChanges && (
							<span className="text-[10px] font-bold text-orange-500 bg-orange-500/10 px-2 py-1 rounded-full">
								Belum disimpan
							</span>
						)}
						<button
							onClick={saveCurrentSlide}
							disabled={saving || !slideForm.title.trim() || !slideForm.description.trim()}
							className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 disabled:opacity-50 shadow-lg shadow-red-500/20 transition-colors"
						>
							<LuSave className="w-3.5 h-3.5" />
							{saving ? "Menyimpan..." : "Simpan Slide"}
						</button>
					</div>
				</div>

				{/* Main content */}
				<div className="flex-1 flex flex-col lg:flex-row w-full min-h-0">
					{/* LEFT: Slide list with reorder */}
					<div className="lg:w-1/3 flex flex-col lg:border-r border-b lg:border-b-0 border-gray-200/50 dark:border-white/[0.06] min-h-0 bg-white/40 dark:bg-white/[0.01]">
						<div className="flex-shrink-0 px-4 py-3 border-b border-gray-200/30 dark:border-white/[0.04] flex items-center justify-between">
							<p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
								Daftar Slide ({total})
							</p>
							<button
								onClick={() => addNewSlide()}
								disabled={saving}
								className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-red-500 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
							>
								<LuPlus className="w-3 h-3" />
								Tambah
							</button>
						</div>

						<div className="flex-1 overflow-y-auto p-2.5 md:p-3">
							{editingGuideSlides.slides.map((s, sIdx) => (
								<React.Fragment key={s.id}>
									<button
										onClick={() => addNewSlide(sIdx)}
										disabled={saving}
										className="w-full flex items-center justify-center gap-1 py-0.5 my-0.5 rounded text-[9px] font-bold text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/5 opacity-0 hover:opacity-100 focus:opacity-100 transition-all disabled:opacity-0"
									>
										<LuPlus className="w-2.5 h-2.5" />
										Sisipkan
									</button>

									<div
										onClick={() => navigateSlide(sIdx)}
										className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
											sIdx === activeSlideIdx
												? "bg-red-500 text-white shadow-md shadow-red-500/20"
												: "text-gray-600 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-white/[0.05]"
										}`}
									>
										<div className="flex items-center gap-2.5 flex-1 min-w-0">
											<span className={`w-7 h-7 rounded-full text-[11px] font-bold flex items-center justify-center flex-shrink-0 ${
												sIdx === activeSlideIdx
													? "bg-white/20 text-white"
													: "bg-gray-200/80 dark:bg-white/[0.08] text-gray-500 dark:text-gray-500"
											}`}>
												{sIdx + 1}
											</span>
											<p className="flex-1 min-w-0 truncate text-[12px] font-semibold" title={s.title}>
												{s.title}
											</p>
										</div>

										<div className="flex flex-col gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
											<button
												disabled={sIdx === 0}
												onClick={() => moveSlide(sIdx, "up")}
												className={`p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-20 transition-colors ${
													sIdx === activeSlideIdx ? "text-white/70 hover:text-white" : "text-gray-400"
												}`}
												title="Pindah ke atas"
											>
												<LuChevronUp className="w-3 h-3" />
											</button>
											<button
												disabled={sIdx === total - 1}
												onClick={() => moveSlide(sIdx, "down")}
												className={`p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-20 transition-colors ${
													sIdx === activeSlideIdx ? "text-white/70 hover:text-white" : "text-gray-400"
												}`}
												title="Pindah ke bawah"
											>
												<LuChevronDown className="w-3 h-3" />
											</button>
										</div>
									</div>
								</React.Fragment>
							))}

							{total > 0 && (
								<button
									onClick={() => addNewSlide()}
									disabled={saving}
									className="w-full flex items-center justify-center gap-1.5 py-2.5 mt-1 rounded-lg border-2 border-dashed border-gray-200/50 dark:border-white/[0.06] text-gray-400 dark:text-gray-600 hover:border-red-500/30 hover:text-red-500 text-[11px] font-bold transition-colors disabled:opacity-50"
								>
									<LuPlus className="w-3.5 h-3.5" />
									Tambah Slide
								</button>
							)}
						</div>

						<div className="flex-shrink-0 border-t border-gray-200/30 dark:border-white/[0.04] p-3 flex items-center gap-2">
							<button
								disabled={activeSlideIdx === 0 || total === 0}
								onClick={() => navigateSlide(activeSlideIdx - 1)}
								className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.06] disabled:opacity-30 transition-all border border-gray-200/50 dark:border-white/[0.06]"
							>
								<LuChevronLeft className="w-3.5 h-3.5" />
								Prev
							</button>
							<button
								disabled={activeSlideIdx === total - 1 || total === 0}
								onClick={() => navigateSlide(activeSlideIdx + 1)}
								className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-red-500 text-white hover:bg-red-600 disabled:opacity-30 shadow-lg shadow-red-500/20 transition-all"
							>
								Next
								<LuChevronRight className="w-3.5 h-3.5" />
							</button>
						</div>
					</div>

					{/* RIGHT: Image upload (2/3) — top half image, bottom half form */}
					<div className="lg:w-2/3 flex flex-col min-h-0">
						{/* Image (1/2 height) */}
						<div className="h-1/2 flex items-center justify-center bg-gray-50/50 dark:bg-black/20 p-4 md:p-6 lg:p-8 overflow-hidden">
							{slideImagePreview ? (
								<div className="relative w-full flex items-center justify-center">
									<img
										src={slideImagePreview}
										alt={slideForm.title}
										className="max-w-full max-h-full object-contain rounded-xl shadow-lg shadow-black/10 dark:shadow-black/30"
									/>
									<button
										onClick={() => {
											setSlideImage(null);
											setSlideImagePreview(null);
											setHasUnsavedChanges(true);
										}}
										className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
									>
										<LuX className="w-4 h-4" />
									</button>
									<button
										onClick={() => fileInputRef.current?.click()}
										className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/50 text-white text-[11px] font-bold hover:bg-black/70 transition-colors"
									>
										<LuUpload className="w-3.5 h-3.5" />
										Ganti Gambar
									</button>
								</div>
							) : (
								<label className="w-full h-full max-h-64 rounded-xl border-2 border-dashed border-gray-300 dark:border-white/10 hover:border-red-500/40 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors">
									<LuImage className="w-12 h-12 text-gray-300 dark:text-gray-600" />
									<p className="text-sm font-bold text-gray-400 dark:text-gray-500">Upload Screenshot</p>
									<p className="text-[11px] text-gray-300 dark:text-gray-600">Klik · JPG, PNG, WebP · Max 5MB</p>
									<input type="file" accept="image/*" onChange={handleImageChange} className="hidden" ref={fileInputRef} />
								</label>
							)}
							<input type="file" accept="image/*" onChange={handleImageChange} className="hidden" ref={fileInputRef} />
						</div>

						{/* Form inputs (1/2 height) */}
						{slide && (
							<div className="h-1/2 overflow-y-auto p-4 md:p-6 lg:px-8 border-t border-gray-200/30 dark:border-white/[0.04]">
								<div className="flex items-center justify-between mb-4">
									<div className="flex items-center gap-2">
										<div className="w-7 h-7 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
											{activeSlideIdx + 1}
										</div>
										<span className="text-[10px] tracking-[0.2em] text-gray-400 dark:text-gray-500 font-medium uppercase">
											Slide {activeSlideIdx + 1} dari {total}
										</span>
									</div>
									<button
										onClick={deleteCurrentSlide}
										className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
									>
										<LuTrash2 className="w-3.5 h-3.5" />
										Hapus Slide
									</button>
								</div>

								<div className="space-y-3">
									<div>
										<label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Judul Step *</label>
										<input
											value={slideForm.title}
											onChange={(e) => handleFormChange("title", e.target.value)}
											placeholder="e.g. Buka menu Dashboard"
											className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
										/>
									</div>
									<div>
										<label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Penjelasan Detail *</label>
										<textarea
											value={slideForm.description}
											onChange={(e) => handleFormChange("description", e.target.value)}
											placeholder="Penjelasan detail langkah ini..."
											rows={5}
											className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none leading-relaxed"
										/>
									</div>
								</div>
							</div>
						)}

						{!slide && (
							<div className="flex-1 flex flex-col items-center justify-center text-center py-12">
								<LuBookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-3" />
								<p className="text-sm font-bold text-gray-400 dark:text-gray-500 mb-1">Belum ada slide</p>
								<p className="text-xs text-gray-300 dark:text-gray-600 mb-4">Mulai tambahkan slide pertama</p>
								<button
									onClick={() => addNewSlide()}
									disabled={saving}
									className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 disabled:opacity-50 shadow-lg shadow-red-500/20 transition-colors"
								>
									<LuPlus className="w-4 h-4" />
									Tambah Slide Pertama
								</button>
							</div>
						)}
					</div>

				</div>
			</div>
		);
	}

	// ====== GUIDE LIST VIEW ======
	if (loading) {
		return (
			<div className="flex items-center justify-center py-32">
				<div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-500" />
			</div>
		);
	}

	return (
		<div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
			{/* Header */}
			<div className="mb-6">
				<div className="relative overflow-hidden rounded-2xl bg-white/40 dark:bg-white/[0.02] backdrop-blur-sm border border-gray-200/50 dark:border-white/[0.06] p-6">
					<div className="relative z-10 flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
								<LuBookOpen className="w-5 h-5 text-red-500" />
							</div>
							<div>
								<p className="text-[10px] tracking-[0.3em] text-gray-400 dark:text-gray-500 font-medium">
									SUPERADMIN
								</p>
								<h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
									Kelola Panduan
								</h1>
							</div>
						</div>
						<button
							onClick={() => openGuideForm()}
							className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
						>
							<LuPlus className="w-4 h-4" />
							Tambah Materi
						</button>
					</div>
				</div>
			</div>

			{/* Role Tabs */}
			<div className="flex gap-1 p-1 mb-6 rounded-xl bg-white/60 dark:bg-white/[0.03] border border-gray-200/50 dark:border-white/[0.06]">
				{ROLE_TABS.map((tab) => (
					<button
						key={tab.key}
						onClick={() => setActiveRole(tab.key)}
						className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
							activeRole === tab.key
								? "bg-red-500 text-white shadow-lg shadow-red-500/20"
								: "text-gray-500 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-white/[0.04]"
						}`}
					>
						{tab.label}
					</button>
				))}
			</div>

			{/* Guide List */}
			{filteredGuides.length === 0 ? (
				<div className="text-center py-16 rounded-xl bg-white/60 dark:bg-white/[0.03] border border-gray-200/50 dark:border-white/[0.06]">
					<LuBookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
					<p className="text-sm text-gray-400 dark:text-gray-600">Belum ada panduan untuk role {activeRole}</p>
					<button onClick={() => openGuideForm()} className="mt-3 text-xs font-bold text-red-500 hover:text-red-600">
						+ Tambah Materi Pertama
					</button>
				</div>
			) : (
				<div className="space-y-3">
					{filteredGuides.map((guide) => (
						<div
							key={guide.id}
							className="rounded-xl bg-white/60 dark:bg-white/[0.03] backdrop-blur-sm border border-gray-200/50 dark:border-white/[0.06] overflow-hidden"
						>
							<div className="flex items-center gap-3 p-4">
								{/* Order number */}
								<div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 text-xs font-bold flex-shrink-0">
									{guide.order + 1}
								</div>

								{/* Info */}
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2">
										<h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{guide.title}</h3>
										{guide.isPublished ? (
											<span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-500 font-bold">PUBLISHED</span>
										) : (
											<span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-400/10 text-gray-400 font-bold">DRAFT</span>
										)}
									</div>
									<p className="text-[11px] text-gray-500 dark:text-gray-500 truncate">
										{guide.description || "Tidak ada deskripsi"} · {guide.slides.length} slide
									</p>
								</div>

								{/* Actions */}
								<div className="flex items-center gap-1">
									<button
										onClick={() => openSlideEditor(guide)}
										className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 text-[11px] font-bold transition-colors"
									>
										<LuPencil className="w-3.5 h-3.5" />
										Edit Slide
									</button>
									<button onClick={() => togglePublish(guide)} className="p-1.5 rounded-lg hover:bg-gray-100/50 dark:hover:bg-white/[0.05] transition-colors" title={guide.isPublished ? "Unpublish" : "Publish"}>
										{guide.isPublished ? <LuEye className="w-4 h-4 text-green-500" /> : <LuEyeOff className="w-4 h-4 text-gray-400" />}
									</button>
									<button onClick={() => openGuideForm(guide)} className="p-1.5 rounded-lg hover:bg-gray-100/50 dark:hover:bg-white/[0.05] transition-colors" title="Edit Materi">
										<LuPencil className="w-4 h-4 text-gray-400 hover:text-blue-500" />
									</button>
									<button onClick={() => deleteGuide(guide)} className="p-1.5 rounded-lg hover:bg-gray-100/50 dark:hover:bg-white/[0.05] transition-colors" title="Hapus">
										<LuTrash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
									</button>
								</div>
							</div>

							{/* Slide thumbnails preview */}
							{guide.slides.length > 0 && (
								<div className="border-t border-gray-200/30 dark:border-white/[0.04] px-4 py-3">
									<div className="flex gap-2 overflow-x-auto pb-1">
										{guide.slides.map((s, idx) => (
											<button
												key={s.id}
												onClick={() => {
													openSlideEditor(guide);
													setTimeout(() => {
														setActiveSlideIdx(idx);
														loadSlideIntoForm(s);
													}, 0);
												}}
												className="flex-shrink-0 w-20 rounded-lg border border-gray-200/50 dark:border-white/[0.06] overflow-hidden hover:border-red-500/30 transition-colors group"
											>
												<div className="w-full h-12 bg-gray-100 dark:bg-white/[0.03] flex items-center justify-center">
													{s.imageUrl ? (
														<img src={s.imageUrl} alt={s.title} className="w-full h-full object-cover" />
													) : (
														<LuImage className="w-4 h-4 text-gray-300 dark:text-gray-600" />
													)}
												</div>
												<div className="px-1.5 py-1">
													<p className="text-[8px] font-bold text-gray-500 dark:text-gray-400 truncate group-hover:text-red-500 transition-colors">
														{idx + 1}. {s.title}
													</p>
												</div>
											</button>
										))}
									</div>
								</div>
							)}
						</div>
					))}
				</div>
			)}

			{/* =========== Guide Form Modal =========== */}
			{showGuideForm && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowGuideForm(false)}>
					<div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
						<div className="flex items-center justify-between mb-5">
							<h2 className="text-base font-bold text-gray-900 dark:text-white">
								{editingGuide ? "Edit Materi Panduan" : "Tambah Materi Panduan"}
							</h2>
							<button onClick={() => setShowGuideForm(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
								<LuX className="w-4 h-4 text-gray-400" />
							</button>
						</div>
						<div className="space-y-4">
							<div>
								<label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Judul Materi *</label>
								<input
									value={guideForm.title}
									onChange={(e) => setGuideForm({ ...guideForm, title: e.target.value })}
									placeholder="e.g. Membuat Event"
									className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
								/>
							</div>
							<div>
								<label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Deskripsi</label>
								<textarea
									value={guideForm.description}
									onChange={(e) => setGuideForm({ ...guideForm, description: e.target.value })}
									placeholder="Deskripsi singkat panduan..."
									rows={3}
									className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none"
								/>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Icon (opsional)</label>
									<input
										value={guideForm.icon}
										onChange={(e) => setGuideForm({ ...guideForm, icon: e.target.value })}
										placeholder="e.g. LuCalendarPlus"
										className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
									/>
								</div>
								<div>
									<label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Urutan</label>
									<input
										type="number"
										value={guideForm.order}
										onChange={(e) => setGuideForm({ ...guideForm, order: parseInt(e.target.value) || 0 })}
										className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
									/>
								</div>
							</div>
						</div>
						<div className="flex justify-end gap-2 mt-6">
							<button onClick={() => setShowGuideForm(false)} className="px-4 py-2 rounded-lg text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
								Batal
							</button>
							<button disabled={saving || !guideForm.title.trim()} onClick={saveGuide} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 disabled:opacity-50 transition-colors">
								<LuSave className="w-3.5 h-3.5" />
								{saving ? "Menyimpan..." : "Simpan"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default GuideManagement;
