import React, { useState, useEffect, useCallback } from "react";
import {
	LuBookOpen,
	LuPlus,
	LuPencil,
	LuTrash2,
	LuImage,
	LuEye,
	LuEyeOff,
	LuChevronDown,
	LuX,
	LuSave,
	LuUpload,
	LuArrowUp,
	LuArrowDown,
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
	const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

	// Guide form
	const [showGuideForm, setShowGuideForm] = useState(false);
	const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
	const [guideForm, setGuideForm] = useState({ title: "", description: "", icon: "", order: 0 });

	// Slide form
	const [showSlideForm, setShowSlideForm] = useState<string | null>(null); // guideId
	const [editingSlide, setEditingSlide] = useState<GuideSlide | null>(null);
	const [slideForm, setSlideForm] = useState({ title: "", description: "", order: 0 });
	const [slideImage, setSlideImage] = useState<File | null>(null);
	const [slideImagePreview, setSlideImagePreview] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

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

	// ====== Guide CRUD ======
	const openGuideForm = (guide?: Guide) => {
		if (guide) {
			setEditingGuide(guide);
			setGuideForm({ title: guide.title, description: guide.description || "", icon: guide.icon || "", order: guide.order });
		} else {
			setEditingGuide(null);
			const maxOrder = guides.length > 0 ? Math.max(...guides.map((g) => g.order)) + 1 : 0;
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

	// ====== Slide CRUD ======
	const openSlideForm = (guideId: string, slide?: GuideSlide) => {
		if (slide) {
			setEditingSlide(slide);
			setSlideForm({ title: slide.title, description: slide.description, order: slide.order });
			setSlideImagePreview(slide.imageUrl);
		} else {
			setEditingSlide(null);
			const guide = guides.find((g) => g.id === guideId);
			const maxOrder = guide && guide.slides.length > 0 ? Math.max(...guide.slides.map((s) => s.order)) + 1 : 0;
			setSlideForm({ title: "", description: "", order: maxOrder });
			setSlideImagePreview(null);
		}
		setSlideImage(null);
		setShowSlideForm(guideId);
	};

	const uploadImage = async (): Promise<string | null> => {
		if (!slideImage) return editingSlide?.imageUrl || null;
		const formData = new FormData();
		formData.append("image", slideImage);
		const res = await api.post("/guides/slides/upload-image", formData, {
			headers: { "Content-Type": "multipart/form-data" },
		});
		return res.data.imageUrl;
	};

	const saveSlide = async () => {
		if (!slideForm.title.trim() || !slideForm.description.trim() || !showSlideForm) return;
		setSaving(true);
		try {
			const imageUrl = await uploadImage();
			if (editingSlide) {
				await api.patch(`/guides/slides/${editingSlide.id}`, { ...slideForm, imageUrl });
			} else {
				await api.post(`/guides/${showSlideForm}/slides`, { ...slideForm, imageUrl });
			}
			setShowSlideForm(null);
			setEditingSlide(null);
			fetchGuides();
		} catch (error) {
			console.error("Error saving slide:", error);
		} finally {
			setSaving(false);
		}
	};

	const deleteSlide = async (slide: GuideSlide) => {
		if (!window.confirm(`Hapus slide "${slide.title}"?`)) return;
		try {
			await api.delete(`/guides/slides/${slide.id}`);
			fetchGuides();
		} catch (error) {
			console.error("Error deleting slide:", error);
		}
	};

	const moveSlide = async (guideId: string, slides: GuideSlide[], index: number, direction: "up" | "down") => {
		const newIndex = direction === "up" ? index - 1 : index + 1;
		if (newIndex < 0 || newIndex >= slides.length) return;
		const reordered = [...slides];
		const a = reordered[index];
		const b = reordered[newIndex];
		if (!a || !b) return;
		reordered[index] = b;
		reordered[newIndex] = a;
		try {
			await api.patch(`/guides/${guideId}/slides/reorder`, {
				slideIds: reordered.map((s) => s.id),
			});
			fetchGuides();
		} catch (error) {
			console.error("Error reordering:", error);
		}
	};

	const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setSlideImage(file);
			setSlideImagePreview(URL.createObjectURL(file));
		}
	};

	const filteredGuides = guides.filter((g) => g.role === activeRole);

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
						onClick={() => { setActiveRole(tab.key); setExpandedGuide(null); }}
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
					{filteredGuides.map((guide) => {
						const isExpanded = expandedGuide === guide.id;
						return (
							<div
								key={guide.id}
								className="rounded-xl bg-white/60 dark:bg-white/[0.03] backdrop-blur-sm border border-gray-200/50 dark:border-white/[0.06] overflow-hidden"
							>
								{/* Guide Header */}
								<div className="flex items-center gap-3 p-4">
									<button onClick={() => setExpandedGuide(isExpanded ? null : guide.id)} className="flex-1 flex items-center gap-3 text-left">
										<div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 text-xs font-bold">
											{guide.order + 1}
										</div>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2">
												<h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{guide.title}</h3>
												{guide.isPublished ? (
													<span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-500 font-bold">PUBLISHED</span>
												) : (
													<span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-400/10 text-gray-400 font-bold">DRAFT</span>
												)}
											</div>
											<p className="text-[11px] text-gray-500 dark:text-gray-500 truncate">{guide.description || "Tidak ada deskripsi"} · {guide.slides.length} slide</p>
										</div>
										<div className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
											<LuChevronDown className="w-4 h-4 text-gray-400" />
										</div>
									</button>
									<div className="flex items-center gap-1 ml-2">
										<button onClick={() => togglePublish(guide)} className="p-1.5 rounded-lg hover:bg-gray-100/50 dark:hover:bg-white/[0.05] transition-colors" title={guide.isPublished ? "Unpublish" : "Publish"}>
											{guide.isPublished ? <LuEye className="w-4 h-4 text-green-500" /> : <LuEyeOff className="w-4 h-4 text-gray-400" />}
										</button>
										<button onClick={() => openGuideForm(guide)} className="p-1.5 rounded-lg hover:bg-gray-100/50 dark:hover:bg-white/[0.05] transition-colors">
											<LuPencil className="w-4 h-4 text-gray-400 hover:text-blue-500" />
										</button>
										<button onClick={() => deleteGuide(guide)} className="p-1.5 rounded-lg hover:bg-gray-100/50 dark:hover:bg-white/[0.05] transition-colors">
											<LuTrash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
										</button>
									</div>
								</div>

								{/* Slides */}
								{isExpanded && (
									<div className="border-t border-gray-200/30 dark:border-white/[0.04] p-4 space-y-2">
										{guide.slides.length === 0 ? (
											<p className="text-xs text-gray-400 dark:text-gray-600 text-center py-4">Belum ada slide</p>
										) : (
											guide.slides.map((slide, idx) => (
												<div key={slide.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50/50 dark:bg-white/[0.02] border border-gray-200/30 dark:border-white/[0.04]">
													<div className="flex flex-col gap-0.5 pt-1">
														<button disabled={idx === 0} onClick={() => moveSlide(guide.id, guide.slides, idx, "up")} className="p-0.5 rounded hover:bg-gray-200/50 dark:hover:bg-white/[0.05] disabled:opacity-20">
															<LuArrowUp className="w-3 h-3 text-gray-400" />
														</button>
														<button disabled={idx === guide.slides.length - 1} onClick={() => moveSlide(guide.id, guide.slides, idx, "down")} className="p-0.5 rounded hover:bg-gray-200/50 dark:hover:bg-white/[0.05] disabled:opacity-20">
															<LuArrowDown className="w-3 h-3 text-gray-400" />
														</button>
													</div>

													{/* Thumbnail */}
													<div className="w-16 h-16 rounded-lg bg-gray-200/50 dark:bg-white/[0.04] overflow-hidden flex-shrink-0">
														{slide.imageUrl ? (
															<img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover" />
														) : (
															<div className="w-full h-full flex items-center justify-center">
																<LuImage className="w-5 h-5 text-gray-300 dark:text-gray-600" />
															</div>
														)}
													</div>

													<div className="flex-1 min-w-0">
														<p className="text-xs font-bold text-gray-900 dark:text-white">
															Step {idx + 1}: {slide.title}
														</p>
														<p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{slide.description}</p>
													</div>

													<div className="flex items-center gap-1">
														<button onClick={() => openSlideForm(guide.id, slide)} className="p-1.5 rounded-lg hover:bg-gray-200/50 dark:hover:bg-white/[0.05]">
															<LuPencil className="w-3.5 h-3.5 text-gray-400 hover:text-blue-500" />
														</button>
														<button onClick={() => deleteSlide(slide)} className="p-1.5 rounded-lg hover:bg-gray-200/50 dark:hover:bg-white/[0.05]">
															<LuTrash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
														</button>
													</div>
												</div>
											))
										)}
										<button
											onClick={() => openSlideForm(guide.id)}
											className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed border-gray-200/50 dark:border-white/[0.06] text-gray-400 dark:text-gray-600 hover:border-red-500/30 hover:text-red-500 transition-colors text-xs font-bold"
										>
											<LuPlus className="w-3.5 h-3.5" />
											Tambah Slide
										</button>
									</div>
								)}
							</div>
						);
					})}
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

			{/* =========== Slide Form Modal =========== */}
			{showSlideForm && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => { setShowSlideForm(null); setEditingSlide(null); }}>
					<div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
						<div className="flex items-center justify-between mb-5">
							<h2 className="text-base font-bold text-gray-900 dark:text-white">
								{editingSlide ? "Edit Slide" : "Tambah Slide"}
							</h2>
							<button onClick={() => { setShowSlideForm(null); setEditingSlide(null); }} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
								<LuX className="w-4 h-4 text-gray-400" />
							</button>
						</div>
						<div className="space-y-4">
							<div>
								<label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Judul Step *</label>
								<input
									value={slideForm.title}
									onChange={(e) => setSlideForm({ ...slideForm, title: e.target.value })}
									placeholder="e.g. Buka menu Dashboard"
									className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
								/>
							</div>
							<div>
								<label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Penjelasan *</label>
								<textarea
									value={slideForm.description}
									onChange={(e) => setSlideForm({ ...slideForm, description: e.target.value })}
									placeholder="Penjelasan detail langkah ini..."
									rows={4}
									className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none"
								/>
							</div>

							{/* Image Upload */}
							<div>
								<label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Screenshot (opsional)</label>
								{slideImagePreview ? (
									<div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
										<img src={slideImagePreview} alt="Preview" className="w-full h-48 object-contain bg-gray-100 dark:bg-gray-800" />
										<button
											onClick={() => { setSlideImage(null); setSlideImagePreview(null); }}
											className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
										>
											<LuX className="w-3.5 h-3.5" />
										</button>
									</div>
								) : (
									<label className="flex flex-col items-center justify-center gap-2 py-8 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-red-500/30 cursor-pointer transition-colors">
										<LuUpload className="w-6 h-6 text-gray-300 dark:text-gray-600" />
										<span className="text-xs text-gray-400">Klik untuk upload screenshot</span>
										<span className="text-[10px] text-gray-300 dark:text-gray-600">JPG, PNG, WebP · Max 5MB</span>
										<input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
									</label>
								)}
							</div>

							<div>
								<label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Urutan</label>
								<input
									type="number"
									value={slideForm.order}
									onChange={(e) => setSlideForm({ ...slideForm, order: parseInt(e.target.value) || 0 })}
									className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
								/>
							</div>
						</div>
						<div className="flex justify-end gap-2 mt-6">
							<button onClick={() => { setShowSlideForm(null); setEditingSlide(null); }} className="px-4 py-2 rounded-lg text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
								Batal
							</button>
							<button disabled={saving || !slideForm.title.trim() || !slideForm.description.trim()} onClick={saveSlide} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 disabled:opacity-50 transition-colors">
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
