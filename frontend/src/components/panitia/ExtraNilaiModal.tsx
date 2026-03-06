import React, { useState } from "react";
import {
	XMarkIcon,
	PlusIcon,
	MinusIcon,
	TrashIcon,
} from "@heroicons/react/24/outline";
import Swal from "sweetalert2";
import { api } from "../../utils/api";

interface ExtraNilai {
	id: string;
	participantId: string;
	type: "PUNISHMENT" | "POINPLUS";
	scope: "GENERAL" | "CATEGORY";
	assessmentCategoryId: string | null;
	value: number;
	reason: string | null;
}

interface Category {
	id: string;
	name: string;
}

interface Participant {
	id: string;
	teamName: string;
}

interface RecapParticipant {
	participant: Participant;
	extraNilai?: ExtraNilai[];
}

interface ExtraNilaiModalProps {
	participant: RecapParticipant;
	eventId: string;
	categories: Category[];
	onClose: () => void;
	onDataChange: () => void;
}

const ExtraNilaiModal: React.FC<ExtraNilaiModalProps> = ({
	participant,
	eventId,
	categories,
	onClose,
	onDataChange,
}) => {
	const [form, setForm] = useState({
		type: "PUNISHMENT" as "PUNISHMENT" | "POINPLUS",
		scope: "GENERAL" as "GENERAL" | "CATEGORY",
		assessmentCategoryId: "",
		value: 0,
		reason: "",
	});
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			setLoading(true);
			await api.post("/evaluations/extra-nilai", {
				eventId,
				participantId: participant.participant.id,
				type: form.type,
				scope: form.scope,
				assessmentCategoryId:
					form.scope === "CATEGORY" ? form.assessmentCategoryId : null,
				value: form.value,
				reason: form.reason || null,
			});
			onClose();
			onDataChange();
		} catch (err) {
			console.error("Error creating extra nilai:", err);
			Swal.fire({
				icon: "error",
				title: "Gagal",
				text: "Gagal menambahkan extra nilai",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async (extraNilaiId: string, e: React.MouseEvent) => {
		e.stopPropagation();
		const result = await Swal.fire({
			title: "Konfirmasi",
			text: "Yakin ingin menghapus extra nilai ini?",
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#d33",
			cancelButtonColor: "#6b7280",
			confirmButtonText: "Ya, Hapus",
			cancelButtonText: "Batal",
		});
		if (!result.isConfirmed) return;

		try {
			await api.delete(`/evaluations/extra-nilai/${extraNilaiId}`);
			onDataChange();
		} catch (err) {
			console.error("Error deleting extra nilai:", err);
			Swal.fire({
				icon: "error",
				title: "Gagal",
				text: "Gagal menghapus extra nilai",
			});
		}
	};

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
				{/* Modal Header */}
				<div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
					<div>
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
							Tambah Extra Nilai
						</h3>
						<p className="text-sm text-gray-500 dark:text-gray-400">
							{participant.participant.teamName}
						</p>
					</div>
					<button
						onClick={onClose}
						className="p-1 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
					>
						<XMarkIcon className="w-5 h-5" />
					</button>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="p-4 space-y-4">
					{/* Type Selection */}
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Tipe
						</label>
						<div className="flex gap-2">
							<button
								type="button"
								onClick={() => setForm((prev) => ({ ...prev, type: "PUNISHMENT" }))}
								className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
									form.type === "PUNISHMENT"
										? "bg-red-600 text-white"
										: "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
								}`}
							>
								<MinusIcon className="w-4 h-4 inline mr-1" />
								Punishment
							</button>
							<button
								type="button"
								onClick={() => setForm((prev) => ({ ...prev, type: "POINPLUS" }))}
								className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
									form.type === "POINPLUS"
										? "bg-green-600 text-white"
										: "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
								}`}
							>
								<PlusIcon className="w-4 h-4 inline mr-1" />
								Poin Plus
							</button>
						</div>
					</div>

					{/* Scope Selection */}
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Penerapan
						</label>
						<div className="flex gap-2">
							<button
								type="button"
								onClick={() =>
									setForm((prev) => ({
										...prev,
										scope: "GENERAL",
										assessmentCategoryId: "",
									}))
								}
								className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
									form.scope === "GENERAL"
										? "bg-indigo-600 text-white"
										: "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
								}`}
							>
								Total (Umum)
							</button>
							<button
								type="button"
								onClick={() => setForm((prev) => ({ ...prev, scope: "CATEGORY" }))}
								className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
									form.scope === "CATEGORY"
										? "bg-indigo-600 text-white"
										: "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
								}`}
							>
								Per Kategori
							</button>
						</div>
					</div>

					{/* Category Selection (if scope is CATEGORY) */}
					{form.scope === "CATEGORY" && (
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Kategori Penilaian
							</label>
							<select
								value={form.assessmentCategoryId}
								onChange={(e) =>
									setForm((prev) => ({
										...prev,
										assessmentCategoryId: e.target.value,
									}))
								}
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
								required
							>
								<option value="">Pilih Kategori</option>
								{categories.map((cat) => (
									<option key={cat.id} value={cat.id}>
										{cat.name}
									</option>
								))}
							</select>
						</div>
					)}

					{/* Value Input */}
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Nilai ({form.type === "PUNISHMENT" ? "Pengurangan" : "Penambahan"})
						</label>
						<input
							type="number"
							min="0"
							step="0.1"
							value={form.value}
							onChange={(e) =>
								setForm((prev) => ({
									...prev,
									value: parseFloat(e.target.value) || 0,
								}))
							}
							className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
							required
						/>
					</div>

					{/* Reason Input */}
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Alasan (Opsional)
						</label>
						<textarea
							value={form.reason}
							onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
							rows={3}
							className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 resize-none"
							placeholder="Contoh: Pelanggaran aturan, bonus kreativitas, dll."
						/>
					</div>

					{/* Existing Extra Nilai List */}
					{participant.extraNilai && participant.extraNilai.length > 0 && (
						<div className="pt-4 border-t border-gray-200 dark:border-gray-700">
							<h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Extra Nilai yang Ada
							</h4>
							<div className="space-y-2">
								{participant.extraNilai.map((en) => (
									<div
										key={en.id}
										className={`flex items-center justify-between p-2 rounded-lg ${
											en.type === "PUNISHMENT"
												? "bg-red-50 dark:bg-red-900/20"
												: "bg-green-50 dark:bg-green-900/20"
										}`}
									>
										<div>
											<span
												className={`text-sm font-medium ${
													en.type === "PUNISHMENT"
														? "text-red-600 dark:text-red-400"
														: "text-green-600 dark:text-green-400"
												}`}
											>
												{en.type === "PUNISHMENT" ? "-" : "+"}
												{en.value}
											</span>
											<span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
												{en.scope === "GENERAL"
													? "Total"
													: categories.find((c) => c.id === en.assessmentCategoryId)?.name ||
													  "Kategori"}
											</span>
											{en.reason && (
												<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
													{en.reason}
												</p>
											)}
										</div>
										<button
											type="button"
											onClick={(e) => handleDelete(en.id, e)}
											className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
											title="Hapus"
										>
											<TrashIcon className="w-4 h-4" />
										</button>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Submit Button */}
					<div className="pt-4">
						<button
							type="submit"
							disabled={loading || form.value <= 0}
							className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
								form.type === "PUNISHMENT"
									? "bg-red-600 hover:bg-red-700 text-white"
									: "bg-green-600 hover:bg-green-700 text-white"
							} disabled:opacity-50 disabled:cursor-not-allowed`}
						>
							{loading
								? "Menyimpan..."
								: `Tambah ${form.type === "PUNISHMENT" ? "Punishment" : "Poin Plus"}`}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default ExtraNilaiModal;
