import React, { useState } from "react";
import { api } from "../../utils/api";
import { Event, SchoolCategory } from "../../types/landing";
import {
	XMarkIcon,
	PlusIcon,
	TrashIcon,
	UserGroupIcon,
} from "@heroicons/react/24/outline";
import Swal from "sweetalert2";

interface Group {
	groupName: string;
	teamMembers: number;
	notes: string;
}

interface RegisterEventModalProps {
	event: Event;
	schoolCategories: SchoolCategory[];
	onClose: () => void;
	onSuccess: () => void;
}

const RegisterEventModal: React.FC<RegisterEventModalProps> = ({
	event,
	schoolCategories,
	onClose,
	onSuccess,
}) => {
	const [schoolCategoryId, setSchoolCategoryId] = useState("");
	const [schoolName, setSchoolName] = useState("");
	const [groups, setGroups] = useState<Group[]>([
		{ groupName: "Tim A", teamMembers: 1, notes: "" },
	]);
	const [loading, setLoading] = useState(false);

	// Filter categories that are available for this event
	const availableCategories = schoolCategories.filter((cat) =>
		event.schoolCategoryLimits?.some(
			(limit) => limit.schoolCategory.id === cat.id
		)
	);

	const addGroup = () => {
		const nextLetter = String.fromCharCode(65 + groups.length); // A, B, C, ...
		setGroups([
			...groups,
			{ groupName: `Tim ${nextLetter}`, teamMembers: 1, notes: "" },
		]);
	};

	const removeGroup = (index: number) => {
		if (groups.length === 1) {
			Swal.fire({
				icon: "warning",
				title: "Minimal 1 Tim",
				text: "Anda harus mendaftarkan minimal 1 tim",
			});
			return;
		}
		setGroups(groups.filter((_, i) => i !== index));
	};

	const updateGroup = (
		index: number,
		field: keyof Group,
		value: string | number
	) => {
		const updated = [...groups];
		updated[index] = { ...updated[index], [field]: value } as Group;
		setGroups(updated);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validation
		if (!schoolCategoryId) {
			Swal.fire({
				icon: "error",
				title: "Kategori Diperlukan",
				text: "Pilih kategori sekolah terlebih dahulu",
			});
			return;
		}

		if (!schoolName.trim()) {
			Swal.fire({
				icon: "error",
				title: "Nama Sekolah Diperlukan",
				text: "Masukkan nama sekolah Anda",
			});
			return;
		}

		// Validate all groups
		for (let i = 0; i < groups.length; i++) {
			const group = groups[i];
			if (!group || !group.groupName.trim()) {
				Swal.fire({
					icon: "error",
					title: "Nama Tim Diperlukan",
					text: `Masukkan nama untuk Tim ${i + 1}`,
				});
				return;
			}
			if (group.teamMembers < 1) {
				Swal.fire({
					icon: "error",
					title: "Jumlah Anggota Invalid",
					text: `Tim ${i + 1} harus memiliki minimal 1 anggota`,
				});
				return;
			}
		}

		// Check for duplicate group names
		const groupNames = groups.map((g) => g.groupName.toLowerCase());
		if (new Set(groupNames).size !== groupNames.length) {
			Swal.fire({
				icon: "error",
				title: "Nama Tim Duplikat",
				text: "Setiap tim harus memiliki nama yang unik",
			});
			return;
		}

		try {
			setLoading(true);

			await api.post("/registrations", {
				eventId: event.id,
				schoolCategoryId,
				schoolName: schoolName.trim(),
				groups: groups.map((g) => ({
					groupName: g.groupName.trim(),
					teamMembers: g.teamMembers,
					notes: g.notes.trim() || undefined,
				})),
			});

			await Swal.fire({
				icon: "success",
				title: "Pendaftaran Berhasil!",
				html: `
					<p>Anda telah mendaftarkan <strong>${
						groups.length
					} tim</strong> untuk event:</p>
					<p class="font-semibold mt-2">${event.title}</p>
					<ul class="mt-2 text-sm text-left">
						${groups
							.map(
								(g) => `<li>• ${g.groupName} (${g.teamMembers} anggota)</li>`
							)
							.join("")}
					</ul>
				`,
				confirmButtonText: "OK",
			});

			onSuccess();
		} catch (error: any) {
			console.error("Error registering:", error);

			const errorMessage =
				error.response?.data?.error || "Gagal mendaftar event";

			Swal.fire({
				icon: "error",
				title: "Pendaftaran Gagal",
				text: errorMessage,
			});
		} finally {
			setLoading(false);
		}
	};

	const getAvailableSlots = () => {
		if (!schoolCategoryId) return null;

		const limit = event.schoolCategoryLimits?.find(
			(l) => l.schoolCategory.id === schoolCategoryId
		);

		if (!limit) return null;

		return limit.maxParticipants - event.currentParticipants;
	};

	const availableSlots = getAvailableSlots();

	return (
		<div className="fixed inset-0 z-50 overflow-y-auto">
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
				onClick={onClose}
			/>

			{/* Modal */}
			<div className="flex min-h-full items-center justify-center p-4">
				<div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
					{/* Header */}
					<div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
						<h2 className="text-xl font-semibold text-gray-900 dark:text-white">
							Daftar Event
						</h2>
						<button
							onClick={onClose}
							className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
						>
							<XMarkIcon className="h-6 w-6" />
						</button>
					</div>

					{/* Event Info */}
					<div className="px-6 py-4 bg-indigo-50 dark:bg-indigo-900/20 border-b border-gray-200 dark:border-gray-700">
						<h3 className="font-semibold text-gray-900 dark:text-white">
							{event.title}
						</h3>
						<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
							{event.location} •{" "}
							{new Date(event.startDate).toLocaleDateString("id-ID", {
								day: "numeric",
								month: "long",
								year: "numeric",
							})}
						</p>
					</div>

					{/* Form */}
					<form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
						{/* School Category */}
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Kategori Sekolah <span className="text-red-500">*</span>
							</label>
							<select
								value={schoolCategoryId}
								onChange={(e) => setSchoolCategoryId(e.target.value)}
								className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
								required
							>
								<option value="">Pilih Kategori</option>
								{availableCategories.map((cat) => {
									const limit = event.schoolCategoryLimits?.find(
										(l) => l.schoolCategory.id === cat.id
									);
									return (
										<option key={cat.id} value={cat.id}>
											{cat.name}
											{limit && ` (Max: ${limit.maxParticipants} tim)`}
										</option>
									);
								})}
							</select>
							{availableSlots !== null && (
								<p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
									Kuota tersedia: <strong>{availableSlots} tim</strong>
								</p>
							)}
						</div>

						{/* School Name */}
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Nama Sekolah <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								value={schoolName}
								onChange={(e) => setSchoolName(e.target.value)}
								placeholder="Contoh: SMA Negeri 1 Jakarta"
								className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
								required
							/>
						</div>

						{/* Groups Section */}
						<div>
							<div className="flex items-center justify-between mb-4">
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
									Daftar Tim <span className="text-red-500">*</span>
								</label>
								<button
									type="button"
									onClick={addGroup}
									disabled={
										availableSlots !== null && groups.length >= availableSlots
									}
									className="flex items-center gap-1 px-3 py-1 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
								>
									<PlusIcon className="h-4 w-4" />
									Tambah Tim
								</button>
							</div>

							<div className="space-y-4">
								{groups.map((group, index) => (
									<div
										key={index}
										className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50"
									>
										<div className="flex items-start justify-between mb-3">
											<div className="flex items-center gap-2">
												<UserGroupIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
												<span className="font-medium text-gray-900 dark:text-white">
													Tim {index + 1}
												</span>
											</div>
											{groups.length > 1 && (
												<button
													type="button"
													onClick={() => removeGroup(index)}
													className="text-red-600 hover:text-red-700 dark:text-red-400"
												>
													<TrashIcon className="h-5 w-5" />
												</button>
											)}
										</div>

										<div className="space-y-3">
											{/* Group Name */}
											<div>
												<label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
													Nama Tim
												</label>
												<input
													type="text"
													value={group.groupName}
													onChange={(e) =>
														updateGroup(index, "groupName", e.target.value)
													}
													placeholder="Contoh: Tim A"
													className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
													required
												/>
											</div>

											{/* Team Members */}
											<div>
												<label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
													Jumlah Anggota
												</label>
												<input
													type="number"
													min="1"
													value={group.teamMembers}
													onChange={(e) =>
														updateGroup(
															index,
															"teamMembers",
															parseInt(e.target.value) || 1
														)
													}
													className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
													required
												/>
											</div>

											{/* Notes */}
											<div>
												<label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
													Catatan (Opsional)
												</label>
												<textarea
													value={group.notes}
													onChange={(e) =>
														updateGroup(index, "notes", e.target.value)
													}
													placeholder="Catatan tambahan..."
													rows={2}
													className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
												/>
											</div>
										</div>
									</div>
								))}
							</div>

							<p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
								Total: <strong>{groups.length} tim</strong> akan didaftarkan
							</p>
						</div>

						{/* Actions */}
						<div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
							<button
								type="button"
								onClick={onClose}
								className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
							>
								Batal
							</button>
							<button
								type="submit"
								disabled={loading}
								className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-medium transition-colors"
							>
								{loading ? "Mendaftar..." : `Daftar ${groups.length} Tim`}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
};

export default RegisterEventModal;
