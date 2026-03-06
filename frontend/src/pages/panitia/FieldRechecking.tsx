import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link, useLocation, useSearchParams } from "react-router-dom";
import {
	MapPinIcon,
	ArrowLeftIcon,
	PlayIcon,
	StopIcon,
	CheckIcon,
	ClockIcon,
	UserGroupIcon,
	ArrowPathIcon,
	UserIcon,
	PlusIcon,
	PencilIcon,
	TrashIcon,
} from "@heroicons/react/24/outline";
import Swal from "sweetalert2";
import { api } from "../../utils/api";

interface PerformanceField {
	id: string;
	name: string;
	description: string | null;
	order: number;
	isActive: boolean;
	currentPerformer: CurrentPerformer | null;
}

interface CurrentPerformer {
	session: Session;
	participant: Participant | null;
}

interface Session {
	id: string;
	participantId: string;
	startTime: string | null;
	endTime: string | null;
	duration: number | null;
	status: string;
	notes: string | null;
	materialChecks: MaterialCheckData[];
}

interface Participant {
	id: string;
	groupName: string;
	orderNumber: number | null;
	schoolCategory: {
		id: string;
		name: string;
	};
	participation: {
		user: {
			id: string;
			name: string;
		};
		schoolName: string | null;
	};
	sessionStatus: string | null;
	isAvailable: boolean;
}

interface MaterialCheckData {
	id?: string;
	materialId: string;
	isChecked: boolean;
	notes: string | null;
}

interface MaterialCategory {
	id: string;
	name: string;
}

interface Material {
	id: string;
	name: string;
	description: string | null;
	number: number;
	eventAssessmentCategoryId: string;
	category: MaterialCategory | null;
}

interface MaterialWithCheck {
	material: Material;
	check: MaterialCheckData | null;
	isChecked: boolean;
}

interface SchoolCategory {
	id: string;
	name: string;
}

const FieldRechecking: React.FC = () => {
	const { eventSlug } = useParams<{ eventSlug: string }>();
	const location = useLocation();
	const [searchParams, setSearchParams] = useSearchParams();

	// Detect admin vs panitia route
	const isAdminRoute = location.pathname.startsWith("/admin");
	const basePath = isAdminRoute ? "/admin" : "/panitia";

	// Get field from URL params
	const fieldIdFromUrl = searchParams.get("field");

	// Data state
	const [fields, setFields] = useState<PerformanceField[]>([]);
	const [participants, setParticipants] = useState<Participant[]>([]);
	const [schoolCategories, setSchoolCategories] = useState<SchoolCategory[]>([]);
	const [materialChecks, setMaterialChecks] = useState<MaterialWithCheck[]>([]);
	const [loading, setLoading] = useState(true);

	// View state
	const [activeField, setActiveField] = useState<PerformanceField | null>(null);
	const [selectedSchoolCategoryId, setSelectedSchoolCategoryId] = useState<string | null>(null);

	// Session state
	const [currentSession, setCurrentSession] = useState<Session | null>(null);
	const [isPerforming, setIsPerforming] = useState(false);

	// Stopwatch state
	const [useStopwatch, setUseStopwatch] = useState(false);
	const [elapsedTime, setElapsedTime] = useState(0);
	const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// Material checklist state
	const [useMaterialCheck, setUseMaterialCheck] = useState(false);
	const [selectedMaterialCategoryId, setSelectedMaterialCategoryId] = useState<string | null>(null);

	// Field CRUD state
	const [showFieldForm, setShowFieldForm] = useState(false);
	const [editingField, setEditingField] = useState<PerformanceField | null>(null);
	const [fieldFormData, setFieldFormData] = useState({ name: "", description: "" });

	// Fetch fields
	const fetchFields = useCallback(async () => {
		try {
			const res = await api.get(`/performance/events/${eventSlug}/fields`);
			setFields(res.data || []);
			return res.data || [];
		} catch (error) {
			console.error("Error fetching fields:", error);
			return [];
		}
	}, [eventSlug]);

	// Fetch participants
	const fetchParticipants = useCallback(async () => {
		try {
			const params = selectedSchoolCategoryId
				? `?schoolCategoryId=${selectedSchoolCategoryId}`
				: "";
			const res = await api.get(
				`/performance/events/${eventSlug}/participants-for-field${params}`
			);
			setParticipants(res.data || []);

			// Extract unique school categories
			const categories: SchoolCategory[] = [];
			const categoryIds = new Set<string>();

			res.data?.forEach((p: Participant) => {
				if (p.schoolCategory && !categoryIds.has(p.schoolCategory.id)) {
					categoryIds.add(p.schoolCategory.id);
					categories.push(p.schoolCategory);
				}
			});

			setSchoolCategories(categories);
		} catch (error) {
			console.error("Error fetching participants:", error);
		}
	}, [eventSlug, selectedSchoolCategoryId]);

	// Fetch material checks for current session
	const fetchMaterialChecks = useCallback(async () => {
		if (!currentSession) {
			setMaterialChecks([]);
			return;
		}

		try {
			const res = await api.get(
				`/performance/events/${eventSlug}/sessions/${currentSession.id}/material-checks`
			);
			setMaterialChecks(res.data || []);
		} catch (error) {
			console.error("Error fetching material checks:", error);
		}
	}, [eventSlug, currentSession]);

	// Field CRUD functions
	const openAddFieldForm = () => {
		setShowFieldForm(true);
		setEditingField(null);
		setFieldFormData({ name: "", description: "" });
	};

	const openEditFieldForm = (field: PerformanceField, e: React.MouseEvent) => {
		e.stopPropagation();
		setShowFieldForm(true);
		setEditingField(field);
		setFieldFormData({
			name: field.name,
			description: field.description || "",
		});
	};

	const closeFieldForm = () => {
		setShowFieldForm(false);
		setEditingField(null);
		setFieldFormData({ name: "", description: "" });
	};

	const handleFieldSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!fieldFormData.name.trim()) {
			Swal.fire({
				icon: "warning",
				title: "Nama Diperlukan",
				text: "Silakan masukkan nama lapangan.",
			});
			return;
		}

		try {
			if (editingField) {
				await api.put(
					`/performance/events/${eventSlug}/fields/${editingField.id}`,
					fieldFormData
				);
				Swal.fire({
					icon: "success",
					title: "Berhasil",
					text: "Lapangan berhasil diperbarui.",
					timer: 1500,
					showConfirmButton: false,
				});
			} else {
				await api.post(`/performance/events/${eventSlug}/fields`, fieldFormData);
				Swal.fire({
					icon: "success",
					title: "Berhasil",
					text: "Lapangan berhasil ditambahkan.",
					timer: 1500,
					showConfirmButton: false,
				});
			}

			closeFieldForm();
			fetchFields();
		} catch (error: unknown) {
			const err = error as { response?: { data?: { error?: string } } };
			Swal.fire({
				icon: "error",
				title: "Gagal Menyimpan",
				text: err.response?.data?.error || "Terjadi kesalahan saat menyimpan.",
			});
		}
	};

	const handleDeleteField = async (field: PerformanceField, e: React.MouseEvent) => {
		e.stopPropagation();
		
		const result = await Swal.fire({
			icon: "warning",
			title: "Hapus Lapangan?",
			text: `Yakin ingin menghapus "${field.name}"? Data sesi penampilan di lapangan ini juga akan terhapus.`,
			showCancelButton: true,
			confirmButtonText: "Hapus",
			cancelButtonText: "Batal",
			confirmButtonColor: "#dc2626",
		});

		if (result.isConfirmed) {
			try {
				await api.delete(`/performance/events/${eventSlug}/fields/${field.id}`);
				Swal.fire({
					icon: "success",
					title: "Berhasil",
					text: "Lapangan berhasil dihapus.",
					timer: 1500,
					showConfirmButton: false,
				});
				fetchFields();
			} catch (error: unknown) {
				const err = error as { response?: { data?: { error?: string } } };
				Swal.fire({
					icon: "error",
					title: "Gagal Menghapus",
					text: err.response?.data?.error || "Terjadi kesalahan saat menghapus.",
				});
			}
		}
	};

	// Enter a field
	const enterField = useCallback((field: PerformanceField) => {
		setActiveField(field);
		setSearchParams({ field: field.id });
		
		// If field has current performer, load their session
		if (field.currentPerformer) {
			setCurrentSession(field.currentPerformer.session);
			setIsPerforming(true);
			// Stopwatch is independent - don't auto-start
		}
	}, [setSearchParams]);

	// Initial load
	useEffect(() => {
		const loadData = async () => {
			setLoading(true);
			const fieldsData = await fetchFields();
			await fetchParticipants();
			
			// If field ID in URL, set active field
			if (fieldIdFromUrl && fieldsData.length > 0) {
				const field = fieldsData.find((f: PerformanceField) => f.id === fieldIdFromUrl);
				if (field) {
					enterField(field);
				}
			}
			
			setLoading(false);
		};
		loadData();
	}, [fetchFields, fetchParticipants, fieldIdFromUrl, enterField]);

	// Fetch material checks when session changes
	useEffect(() => {
		if (currentSession && useMaterialCheck) {
			fetchMaterialChecks();
		}
	}, [currentSession, fetchMaterialChecks, useMaterialCheck]);

	// Update active field when fields change
	useEffect(() => {
		if (activeField) {
			const updatedField = fields.find((f) => f.id === activeField.id);
			if (updatedField) {
				setActiveField(updatedField);
				
				// Update session state
				if (updatedField.currentPerformer) {
					setCurrentSession(updatedField.currentPerformer.session);
					setIsPerforming(true);
					// Stopwatch is independent - don't auto-update elapsed time
				} else {
					setCurrentSession(null);
					setIsPerforming(false);
				}
			}
		}
	}, [fields, activeField?.id]);

	// Stopwatch logic - independent timer, starts from 0 and counts up when running
	useEffect(() => {
		if (isStopwatchRunning) {
			intervalRef.current = setInterval(() => {
				setElapsedTime((prev) => prev + 1);
			}, 1000);
		} else {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		}

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, [isStopwatchRunning, currentSession]);

	// Exit field view
	const exitField = () => {
		setActiveField(null);
		setCurrentSession(null);
		setIsPerforming(false);
		setUseStopwatch(false);
		setUseMaterialCheck(false);
		setElapsedTime(0);
		setIsStopwatchRunning(false);
		setMaterialChecks([]);
		setSearchParams({});
	};

	// Select participant and start session immediately
	const handleSelectParticipant = async (participant: Participant) => {
		if (!activeField) return;

		const participantName = participant.groupName || participant.participation?.user?.name || "Peserta";
		const schoolName = participant.participation?.schoolName || "-";
		const categoryName = participant.schoolCategory?.name || "-";
		const orderNum = participant.orderNumber || "-";

		// Confirm selection
		const result = await Swal.fire({
			title: "Mulai Penampilan?",
			html: `
				<div class="text-left">
					<p class="font-semibold">${participantName}</p>
					<p class="text-sm text-gray-600">${schoolName}</p>
					<p class="text-sm text-gray-600">${categoryName} - No. Urut ${orderNum}</p>
				</div>
			`,
			icon: "question",
			showCancelButton: true,
			confirmButtonText: "Mulai Tampil",
			cancelButtonText: "Batal",
			confirmButtonColor: "#16a34a",
		});

		if (!result.isConfirmed) return;

		try {
			// Create session and start immediately
			const createRes = await api.post(
				`/performance/events/${eventSlug}/fields/${activeField.id}/sessions`,
				{ participantId: participant.id, startImmediately: true }
			);

			setCurrentSession(createRes.data);
			setIsPerforming(true);
			setElapsedTime(0);

			// Refresh fields to show current performer
			await fetchFields();
			await fetchParticipants();

			Swal.fire({
				icon: "success",
				title: "Peserta Mulai Tampil",
				text: `${participantName} sekarang tampil di ${activeField.name}`,
				timer: 2000,
				showConfirmButton: false,
			});
		} catch (error: unknown) {
			const err = error as { response?: { data?: { error?: string } } };
			Swal.fire({
				icon: "error",
				title: "Gagal Memulai",
				text: err.response?.data?.error || "Terjadi kesalahan.",
			});
		}
	};

	// Toggle stopwatch
	const toggleStopwatch = () => {
		if (!useStopwatch) {
			setUseStopwatch(true);
			setIsStopwatchRunning(true);
		} else {
			setIsStopwatchRunning(!isStopwatchRunning);
		}
	};

	// Finish performance
	const handleFinishPerformance = async () => {
		if (!currentSession) return;

		const result = await Swal.fire({
			icon: "question",
			title: "Selesai Penampilan?",
			text: "Data penampilan akan disimpan.",
			showCancelButton: true,
			confirmButtonText: "Ya, Selesai",
			cancelButtonText: "Batal",
			confirmButtonColor: "#dc2626",
		});

		if (!result.isConfirmed) return;

		try {
			// Send duration only if stopwatch was used
			const requestBody: { duration?: number } = {};
			if (useStopwatch) {
				requestBody.duration = elapsedTime;
			}

			await api.post(
				`/performance/events/${eventSlug}/sessions/${currentSession.id}/stop`,
				requestBody
			);

			const finalDuration = elapsedTime;
			const checkedMaterials = materialChecks.filter((m) => m.isChecked).length;
			const totalMaterials = materialChecks.length;
			const hadStopwatch = useStopwatch;
			const hadMaterialCheck = useMaterialCheck;

			setCurrentSession(null);
			setIsPerforming(false);
			setUseStopwatch(false);
			setUseMaterialCheck(false);
			setElapsedTime(0);
			setIsStopwatchRunning(false);
			setMaterialChecks([]);

			// Refresh data
			await fetchFields();
			await fetchParticipants();

			const durationText = hadStopwatch ? `<p>Durasi: <strong>${formatTime(finalDuration)}</strong></p>` : "";
			const materiText = hadMaterialCheck ? `<p>Materi: <strong>${checkedMaterials}/${totalMaterials}</strong></p>` : "";

			Swal.fire({
				icon: "success",
				title: "Penampilan Selesai",
				html: `<div class="text-center">${durationText}${materiText}</div>`,
				timer: 2500,
				showConfirmButton: false,
			});
		} catch (error: unknown) {
			const err = error as { response?: { data?: { error?: string } } };
			Swal.fire({
				icon: "error",
				title: "Gagal Mengakhiri",
				text: err.response?.data?.error || "Terjadi kesalahan.",
			});
		}
	};

	// Handle material check toggle
	const handleMaterialToggle = async (materialId: string, currentChecked: boolean) => {
		if (!currentSession) return;

		try {
			await api.post(
				`/performance/events/${eventSlug}/sessions/${currentSession.id}/material-checks/${materialId}`,
				{ isChecked: !currentChecked }
			);

			setMaterialChecks((prev) =>
				prev.map((item) =>
					item.material.id === materialId
						? { ...item, isChecked: !currentChecked }
						: item
				)
			);
		} catch (error) {
			console.error("Error toggling material check:", error);
		}
	};

	// Enable material checklist
	const handleEnableMaterialCheck = async () => {
		setUseMaterialCheck(true);
		if (currentSession) {
			await fetchMaterialChecks();
		}
	};

	// Format time (seconds to mm:ss)
	const formatTime = (seconds: number): string => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	};

	// Get participant display name
	const getParticipantDisplayName = (participant: Participant): string => {
		if (participant.groupName) {
			return participant.groupName;
		}
		const user = participant.participation?.user;
		return user?.name || "Peserta";
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px] bg-gray-50 dark:bg-gray-900">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 dark:border-red-500"></div>
			</div>
		);
	}

	// Field Selection View
	if (!activeField) {
		return (
			<div className="p-4 md:p-6 max-w-4xl mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen">
				{/* Header */}
				<div className="mb-6">
					<Link
						to={`${basePath}/events/${eventSlug}/manage`}
						className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 flex items-center gap-1 mb-4 text-sm"
					>
						<ArrowLeftIcon className="h-4 w-4" />
						<span className="hidden sm:inline">Kembali ke Kelola Event</span>
						<span className="sm:hidden">Kembali</span>
					</Link>

					{/* Title Section */}
					<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
						<div>
							<h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
								<MapPinIcon className="h-6 w-6 md:h-7 md:w-7 text-red-600 dark:text-red-500" />
								Kelola Lapangan
							</h1>
							<p className="text-sm text-gray-600 dark:text-gray-400 mt-1 hidden sm:block">
								Atur lapangan dan kelola penampilan peserta
							</p>
						</div>

						{/* Action Buttons - Responsive */}
						<div className="flex gap-2">
							<Link
								to={`${basePath}/events/${eventSlug}/performance-history`}
								className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2 border border-gray-300 dark:border-gray-600 text-sm"
								title="Riwayat Penampilan"
							>
								<ClockIcon className="h-5 w-5" />
								<span className="hidden sm:inline">Riwayat</span>
							</Link>
							<button
								onClick={() => fetchFields()}
								className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600"
								title="Refresh"
							>
								<ArrowPathIcon className="h-5 w-5" />
							</button>
							<button
								onClick={openAddFieldForm}
								className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm active:scale-95 transition-transform"
							>
								<PlusIcon className="h-5 w-5" />
								<span className="hidden sm:inline">Tambah Lapangan</span>
								<span className="sm:hidden">Tambah</span>
							</button>
						</div>
					</div>
				</div>

				{/* Field Form Modal */}
				{showFieldForm && (
					<div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
						<div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
							<h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
								{editingField ? "Edit Lapangan" : "Tambah Lapangan Baru"}
							</h2>

							<form onSubmit={handleFieldSubmit} className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
										Nama Lapangan <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										value={fieldFormData.name}
										onChange={(e) =>
											setFieldFormData({ ...fieldFormData, name: e.target.value })
										}
										className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-red-500 focus:border-red-500"
										placeholder="Contoh: Lapangan A, Stage 1, dll."
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
										Deskripsi
									</label>
									<textarea
										value={fieldFormData.description}
										onChange={(e) =>
											setFieldFormData({ ...fieldFormData, description: e.target.value })
										}
										className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-red-500 focus:border-red-500"
										rows={3}
										placeholder="Deskripsi opsional tentang lapangan ini..."
									/>
								</div>

								<div className="flex justify-end gap-3 pt-4">
									<button
										type="button"
										onClick={closeFieldForm}
										className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
									>
										Batal
									</button>
									<button
										type="submit"
										className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
									>
										{editingField ? "Simpan Perubahan" : "Tambah Lapangan"}
									</button>
								</div>
							</form>
						</div>
					</div>
				)}

				{fields.length === 0 ? (
					<div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
						<MapPinIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
						<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
							Belum Ada Lapangan
						</h3>
						<p className="text-gray-600 dark:text-gray-400 mb-4">
							Tambahkan lapangan untuk mulai mengatur penampilan peserta.
						</p>
						<button
							onClick={openAddFieldForm}
							className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
						>
							Tambah Lapangan Pertama
						</button>
					</div>
				) : (
					<div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
						{fields.map((field) => (
							<div
								key={field.id}
								className={`p-4 sm:p-6 rounded-xl border transition-all hover:shadow-lg active:scale-[0.98] ${
									field.currentPerformer
										? "border-green-500 bg-white dark:bg-gray-800"
										: "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-red-500"
								}`}
							>
								<div className="flex items-start justify-between mb-3">
									<div className="flex items-center gap-2">
										<MapPinIcon className={`h-6 w-6 ${field.currentPerformer ? "text-green-500" : "text-red-500"}`} />
										<h3 className="text-lg font-bold text-gray-900 dark:text-white">{field.name}</h3>
									</div>
									<div className="flex items-center gap-1">
										{field.currentPerformer && (
											<span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full animate-pulse mr-1">
												LIVE
											</span>
										)}
										<button
											onClick={(e) => openEditFieldForm(field, e)}
											className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
											title="Edit"
										>
											<PencilIcon className="h-4 w-4" />
										</button>
										<button
											onClick={(e) => handleDeleteField(field, e)}
											className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
											title="Hapus"
										>
											<TrashIcon className="h-4 w-4" />
										</button>
									</div>
								</div>

								{field.description && (
									<p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{field.description}</p>
								)}

								{field.currentPerformer ? (
									field.currentPerformer.participant ? (
										<div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-green-500/30">
											<p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Sedang Tampil:</p>
											<p className="font-semibold text-gray-900 dark:text-white">
												#{field.currentPerformer.participant.orderNumber || "-"}{" "}
												{getParticipantDisplayName(field.currentPerformer.participant)}
											</p>
											<p className="text-sm text-gray-600 dark:text-gray-400">
												{field.currentPerformer.participant.participation?.schoolName || "-"}
											</p>
										</div>
									) : (
										<div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-3 border border-yellow-300 dark:border-yellow-500/30">
											<p className="text-sm text-yellow-700 dark:text-yellow-400">Data peserta tidak tersedia</p>
										</div>
									)
								) : (
									<div className="text-center py-4 text-gray-500">
										<UserGroupIcon className="h-8 w-8 mx-auto mb-1" />
										<p className="text-sm">Tidak ada peserta tampil</p>
									</div>
								)}

								/* Button to enter field management */
								<button
									onClick={() => enterField(field)}
									className={`w-full mt-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
										field.currentPerformer
											? "bg-green-600 text-white hover:bg-green-700"
											: "bg-red-600 text-white hover:bg-red-700"
									}`}
								>
									<PlayIcon className="h-5 w-5" />
									{field.currentPerformer ? "Lihat Penampilan" : "Kelola Penampilan"}
								</button>
							</div>
						))}
					</div>
				)}
			</div>
		);
	}

	// Field View (Inside a Field)
	return (
		<div className="p-4 md:p-6 max-w-6xl mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen">
			{/* Header */}
			<div className="mb-4 md:mb-6">
				<button
					onClick={exitField}
					className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 flex items-center gap-1 mb-4 text-sm"
				>
					<ArrowLeftIcon className="h-4 w-4" />
					<span className="hidden sm:inline">Kembali ke Pilih Lapangan</span>
					<span className="sm:hidden">Kembali</span>
				</button>

				<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
					<div className="flex items-center gap-3">
						<div className={`p-2.5 sm:p-3 rounded-xl ${isPerforming ? "bg-green-100 dark:bg-green-900/50" : "bg-red-100 dark:bg-red-900/50"}`}>
							<MapPinIcon className={`h-6 w-6 sm:h-8 sm:w-8 ${isPerforming ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} />
						</div>
						<div>
							<h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
								{activeField.name}
								{isPerforming && (
									<span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full animate-pulse">
										LIVE
									</span>
								)}
							</h1>
							{activeField.description && (
								<p className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block">{activeField.description}</p>
							)}
						</div>
					</div>

					<button
						onClick={() => {
							fetchFields();
							fetchParticipants();
						}}
						className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg self-start sm:self-center"
						title="Refresh"
					>
						<ArrowPathIcon className="h-5 w-5 sm:h-6 sm:w-6" />
					</button>
				</div>
			</div>

			<div className="flex flex-col md:grid md:grid-cols-3 gap-6">
				{/* Mobile-first: Stopwatch & Quick Stats (shows first on mobile) */}
				<div className="order-first md:order-last space-y-4">
					{/* Stopwatch Card */}
					{isPerforming && (
						<div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-md border border-gray-200 dark:border-gray-700">
							<div className="flex items-center justify-between mb-3 md:mb-4">
								<h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
									<ClockIcon className="h-5 w-5 md:h-6 md:w-6 text-orange-600 dark:text-orange-400" />
									Stopwatch
									<span className="text-xs bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400 px-2 py-1 rounded border border-orange-200 dark:border-orange-500/30">Opsional</span>
								</h3>
							</div>

							{/* Stopwatch Display */}
							<div
								className={`text-4xl md:text-5xl font-mono font-bold text-center py-4 md:py-6 rounded-xl ${
									isStopwatchRunning ? "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border border-orange-300 dark:border-orange-500" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
								}`}
							>
								{formatTime(elapsedTime)}
							</div>

							<div className="mt-3 md:mt-4 flex gap-2">
								{!useStopwatch ? (
									<button
										onClick={toggleStopwatch}
										className="flex-1 py-2.5 md:py-3 bg-orange-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-orange-700"
									>
										<PlayIcon className="h-5 w-5" />
										Mulai Stopwatch
									</button>
								) : (
									<button
										onClick={toggleStopwatch}
										className={`flex-1 py-2.5 md:py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
											isStopwatchRunning
												? "bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/70 border border-orange-300 dark:border-orange-500"
												: "bg-orange-600 text-white hover:bg-orange-700"
										}`}
									>
										{isStopwatchRunning ? (
											<>
												<StopIcon className="h-5 w-5" />
												Pause
											</>
										) : (
											<>
												<PlayIcon className="h-5 w-5" />
												Lanjut
											</>
										)}
									</button>
								)}
							</div>

							{!useStopwatch && (
								<p className="text-xs text-gray-500 text-center mt-2 md:mt-3">
									Klik "Mulai Stopwatch" untuk mencatat durasi penampilan.
								</p>
							)}
						</div>
					)}

					{/* Quick Stats - Desktop only (mobile shows below materials) */}
					<div className="hidden md:block">
						{isPerforming && useMaterialCheck && materialChecks.length > 0 && (
							<div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
								<h4 className="text-sm font-medium text-gray-700 dark:text-gray-400 mb-3">Progress Materi</h4>
								<div className="flex items-center gap-4">
									<div className="text-3xl font-bold text-green-600 dark:text-green-400">
										{materialChecks.filter((m) => m.isChecked).length}
									</div>
									<div className="text-gray-400 dark:text-gray-500">/</div>
									<div className="text-2xl font-semibold text-gray-600 dark:text-gray-400">
										{materialChecks.length}
									</div>
								</div>
								<div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
									<div
										className="bg-green-500 h-full transition-all duration-300"
										style={{
											width: `${(materialChecks.filter((m) => m.isChecked).length / materialChecks.length) * 100}%`,
										}}
									/>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Left Column: Current Performer / Participant Selection */}
				<div className="order-2 md:order-first md:col-span-2 space-y-4">
					{/* Current Performer Card */}
					{isPerforming && activeField.currentPerformer ? (
						activeField.currentPerformer.participant ? (
							<div className="bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 rounded-xl p-6 text-white shadow-lg border border-green-400 dark:border-green-500">
								<div className="flex items-center justify-between mb-4">
									<div className="flex items-center gap-3">
										<div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
											<UserIcon className="h-8 w-8 text-white" />
										</div>
										<div>
											<p className="text-green-100 dark:text-green-200 text-sm font-medium">SEDANG TAMPIL</p>
											<h2 className="text-2xl font-bold">
												#{activeField.currentPerformer.participant.orderNumber || "-"}{" "}
												{getParticipantDisplayName(activeField.currentPerformer.participant)}
											</h2>
											<p className="text-green-100 dark:text-green-200">
												{activeField.currentPerformer.participant.participation?.schoolName || "-"} |{" "}
												{activeField.currentPerformer.participant.schoolCategory?.name}
											</p>
										</div>
									</div>
								</div>

								{/* Action Buttons */}
								<div className="flex gap-3 mt-4">
									<button
										onClick={handleFinishPerformance}
										className="flex-1 py-3 bg-white text-red-600 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"
									>
										<StopIcon className="h-5 w-5" />
										Selesai Tampil
									</button>
								</div>
							</div>
						) : (
							<div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-xl p-6 text-yellow-700 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-500/30">
								<p className="font-medium">Data peserta tidak tersedia</p>
								<div className="flex gap-3 mt-4">
									<button
										onClick={handleFinishPerformance}
										className="flex-1 py-3 bg-red-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-red-700 transition-colors"
									>
										<StopIcon className="h-5 w-5" />
										Selesai Tampil
									</button>
								</div>
							</div>
						)
					) : (
						/* Participant Selection Card */
						<div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
							<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
								<UserGroupIcon className="h-6 w-6 text-red-600 dark:text-red-500" />
								Pilih Peserta untuk Tampil
							</h3>

							{/* School Category Tabs */}
							{schoolCategories.length > 0 && (
								<div className="flex gap-2 mb-4 border-b border-gray-200 dark:border-gray-700 pb-4 overflow-x-auto">
									{schoolCategories.map((cat, index) => {
										const categoryParticipants = participants.filter(
											p => p.schoolCategory?.id === cat.id
										);
										const completedCount = categoryParticipants.filter(
											p => p.sessionStatus === "COMPLETED"
										).length;

										return (
											<button
												key={cat.id}
												onClick={() => setSelectedSchoolCategoryId(
													selectedSchoolCategoryId === cat.id && schoolCategories.length > 1 ? null : cat.id
												)}
												className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap flex items-center gap-2 ${
													selectedSchoolCategoryId === cat.id || (selectedSchoolCategoryId === null && index === 0 && schoolCategories.length === 1)
														? "bg-red-600 text-white"
														: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
												}`}
											>
												{cat.name}
												<span className={`text-xs px-1.5 py-0.5 rounded ${
													selectedSchoolCategoryId === cat.id || (selectedSchoolCategoryId === null && index === 0 && schoolCategories.length === 1)
														? "bg-red-500"
														: "bg-gray-200 dark:bg-gray-600"
												}`}>
													{completedCount}/{categoryParticipants.length}
												</span>
											</button>
										);
									})}
								</div>
							)}

							{/* Participants List - Vertical */}
							{schoolCategories.length > 0 ? (
								<div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
									{(() => {
										// Get active category (first one if none selected)
										const activeCategory = selectedSchoolCategoryId 
											? schoolCategories.find(c => c.id === selectedSchoolCategoryId)
											: schoolCategories[0];

										if (!activeCategory) return null;

										const categoryParticipants = participants
											.filter(p => p.schoolCategory?.id === activeCategory.id)
											.sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0));

										if (categoryParticipants.length === 0) {
											return (
												<div className="text-center py-8 text-gray-500">
													<UserGroupIcon className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-2" />
													<p>Tidak ada peserta di kategori ini</p>
												</div>
											);
										}

										return categoryParticipants.map((participant) => {
											const schoolName = participant.participation?.schoolName;
											const hasPerformed = participant.sessionStatus === "COMPLETED";
											const isCurrentlyPerforming = participant.sessionStatus === "PERFORMING";
											const isUnavailable = !participant.isAvailable;

											return (
												<button
													key={participant.id}
													onClick={() => !isUnavailable && !hasPerformed && handleSelectParticipant(participant)}
													disabled={isUnavailable || hasPerformed}
													className={`w-full p-4 rounded-lg border text-left flex items-center gap-4 transition-all ${
														hasPerformed
															? "bg-gray-100 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-500 cursor-not-allowed"
															: isCurrentlyPerforming
															? "bg-orange-50 dark:bg-orange-900/30 border-orange-500 cursor-not-allowed"
															: isUnavailable
															? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-600/30 text-gray-500 dark:text-gray-400 cursor-not-allowed"
															: "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-green-500 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
													}`}
												>
													{/* Order Number */}
													<div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-bold ${
														hasPerformed
															? "bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
															: isCurrentlyPerforming
															? "bg-orange-500 text-white"
															: "bg-red-600 text-white"
													}`}>
														{participant.orderNumber || "-"}
													</div>

													{/* Participant Info */}
													<div className="flex-1 min-w-0">
														<div className={`font-semibold text-base ${
															hasPerformed ? "text-gray-500" : "text-gray-900 dark:text-white"
														}`}>
															{getParticipantDisplayName(participant)}
														</div>
														<div className="text-sm text-gray-600 dark:text-gray-400 truncate">
															{schoolName || "-"}
														</div>
													</div>

													{/* Status Badge */}
													{hasPerformed ? (
														<div className="flex items-center gap-2 text-green-600 dark:text-green-400">
															<CheckIcon className="h-6 w-6" />
															<span className="text-sm">Selesai</span>
														</div>
													) : isCurrentlyPerforming ? (
														<span className="px-3 py-1.5 bg-orange-500 text-white text-sm rounded-full animate-pulse">
															Tampil
														</span>
													) : isUnavailable ? (
														<span className="px-3 py-1.5 bg-yellow-100 dark:bg-yellow-600/30 text-yellow-700 dark:text-yellow-400 text-sm rounded-lg">
															Antrian
														</span>
													) : (
														<PlayIcon className="h-6 w-6 text-gray-400" />
													)}
												</button>
											);
										});
									})()}
								</div>
							) : (
								<div className="text-center py-8 text-gray-500">
									<UserGroupIcon className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-2" />
									<p>Tidak ada peserta tersedia</p>
								</div>
							)}
						</div>
					)}

					{/* Optional: Material Checklist */}
					{isPerforming && (
						<div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-md border border-gray-200 dark:border-gray-700">
							<div className="flex items-center justify-between mb-3 md:mb-4">
								<h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
									<CheckIcon className="h-5 w-5 md:h-6 md:w-6 text-blue-600 dark:text-blue-400" />
									Checklist Materi
									<span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 px-2 py-1 rounded border border-blue-200 dark:border-blue-500/30">Opsional</span>
								</h3>
								{!useMaterialCheck && (
									<button
										onClick={handleEnableMaterialCheck}
										className="px-3 md:px-4 py-1.5 md:py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
									>
										Aktifkan
									</button>
								)}
							</div>

							{useMaterialCheck ? (
								materialChecks.length === 0 ? (
									<div className="text-center text-gray-500 py-6">
										<p className="text-sm">Tidak ada materi untuk dicek</p>
									</div>
								) : (
									(() => {
										// Group by category
										const grouped = materialChecks.reduce((acc, item) => {
											const categoryId = item.material.eventAssessmentCategoryId || "uncategorized";
											const categoryName = item.material.category?.name || "Lainnya";
											if (!acc[categoryId]) {
												acc[categoryId] = {
													id: categoryId,
													name: categoryName,
													items: [],
												};
											}
											acc[categoryId].items.push(item);
											return acc;
										}, {} as Record<string, { id: string; name: string; items: MaterialWithCheck[] }>);

										const categories = Object.values(grouped);
										// Get active category (first if none selected)
										const activeCategory = selectedMaterialCategoryId
											? categories.find(c => c.id === selectedMaterialCategoryId) || categories[0]
											: categories[0];

										return (
											<>
												{/* Material Category Tabs */}
												{categories.length > 1 && (
													<div className="flex gap-2 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
														{categories.map((cat) => {
															const checkedCount = cat.items.filter(i => i.isChecked).length;
															const isActive = cat.id === (activeCategory?.id);
															return (
																<button
																	key={cat.id}
																	onClick={() => setSelectedMaterialCategoryId(cat.id)}
																	className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap flex items-center gap-2 ${
																		isActive
																			? "bg-blue-600 text-white"
																			: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
																	}`}
																>
																	{cat.name}
																	<span className={`text-xs px-1.5 py-0.5 rounded ${
																		isActive
																			? checkedCount === cat.items.length ? "bg-green-400" : "bg-blue-500"
																			: checkedCount === cat.items.length ? "bg-green-500 text-white" : "bg-gray-200 dark:bg-gray-600"
																	}`}>
																		{checkedCount}/{cat.items.length}
																	</span>
																</button>
															);
														})}
													</div>
												)}

												{/* Material Items for Active Category */}
												{activeCategory && (
													<div className="space-y-2 max-h-[350px] md:max-h-[400px] overflow-y-auto pr-1">
														{/* Single category header on desktop when no tabs */}
														{categories.length === 1 && (
															<h4 className="hidden md:flex font-medium text-gray-700 dark:text-gray-300 text-sm items-center gap-2 sticky top-0 bg-white dark:bg-gray-800 py-1 z-10">
																<span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-full text-xs border border-blue-200 dark:border-blue-500/30">
																	{activeCategory.name}
																</span>
																<span className="text-gray-500 text-xs">
																	({activeCategory.items.filter(i => i.isChecked).length}/{activeCategory.items.length})
																</span>
															</h4>
														)}

														{activeCategory.items.map((item) => (
															<button
																key={item.material.id}
																onClick={() => handleMaterialToggle(item.material.id, item.isChecked)}
																className={`w-full p-3 rounded-lg border flex items-center gap-3 transition-colors active:scale-[0.98] ${
																	item.isChecked
																		? "bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-500"
																		: "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
																}`}
															>
																<div
																	className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
																		item.isChecked
																			? "bg-green-500 text-white"
																			: "bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
																	}`}
																>
																	{item.isChecked ? (
																		<CheckIcon className="h-5 w-5 md:h-6 md:w-6" />
																	) : (
																		<span className="text-sm font-medium">{item.material.number}</span>
																	)}
																</div>
																<div className="text-left flex-1 min-w-0">
																	<div className={`font-medium truncate ${item.isChecked ? "text-green-700 dark:text-green-400" : "text-gray-700 dark:text-gray-200"}`}>
																		{item.material.number}. {item.material.name}
																	</div>
																	{item.material.description && (
																		<div className="text-xs text-gray-500 mt-0.5 truncate">
																			{item.material.description}
																		</div>
																	)}
																</div>
																{item.isChecked && (
																	<CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
																)}
															</button>
														))}
													</div>
												)}
											</>
										);
									})()
								)
							) : (
								<p className="text-sm text-gray-500">
									Klik "Aktifkan" untuk menggunakan checklist materi.
								</p>
							)}
						</div>
					)}

					{/* Mobile-only: Quick Stats Progress Bar */}
					{isPerforming && useMaterialCheck && materialChecks.length > 0 && (
						<div className="md:hidden bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md border border-gray-200 dark:border-gray-700">
							<div className="flex items-center justify-between mb-2">
								<h4 className="text-sm font-medium text-gray-700 dark:text-gray-400">Progress Materi</h4>
								<span className="text-sm font-bold text-green-600 dark:text-green-400">
									{materialChecks.filter((m) => m.isChecked).length}/{materialChecks.length}
								</span>
							</div>
							<div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
								<div
									className="bg-green-500 h-full transition-all duration-300"
									style={{
										width: `${(materialChecks.filter((m) => m.isChecked).length / materialChecks.length) * 100}%`,
									}}
								/>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default FieldRechecking;
