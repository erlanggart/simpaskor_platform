import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
	ArrowLeftIcon,
	CalendarIcon,
	MapPinIcon,
	PlusIcon,
	TrashIcon,
	DocumentArrowUpIcon,
	ExclamationCircleIcon,
	CheckCircleIcon,
	UserIcon,
	CameraIcon,
} from "@heroicons/react/24/outline";
import api from "../../utils/api";
import { useAuth } from "../../hooks/useAuth";
import { usePayment } from "../../hooks/usePayment";
import Swal from "sweetalert2";

interface SchoolCategoryLimit {
	id: string;
	maxParticipants: number;
	currentParticipants?: number;
	schoolCategory: {
		id: string;
		name: string;
	};
}

interface Event {
	id: string;
	title: string;
	description: string | null;
	thumbnail: string | null;
	startDate: string;
	endDate: string;
	registrationDeadline: string | null;
	location: string | null;
	venue: string | null;
	registrationFee: number | null;
	organizer: string | null;
	status: string;
	contactPhone: string | null;
	contactPersonName: string | null;
	contactEmail: string | null;
	schoolCategoryLimits?: SchoolCategoryLimit[];
}

interface PersonMember {
	id: string;
	name: string;
	photo: File | null;
	photoPreview: string;
}

interface TeamData {
	id: string;
	groupName: string;
	schoolCategoryId: string;
	pasukan: PersonMember[];
	danton: PersonMember;
	cadangan: PersonMember[];
	official: PersonMember[];
	pelatih: PersonMember[];
	notes: string;
}

const generateClientId = (): string => {
	const cryptoObject = globalThis.crypto;

	if (typeof cryptoObject?.randomUUID === "function") {
		return cryptoObject.randomUUID();
	}

	if (typeof cryptoObject?.getRandomValues === "function") {
		const bytes = cryptoObject.getRandomValues(new Uint8Array(16));
		const byte6 = bytes.at(6) ?? 0;
		const byte8 = bytes.at(8) ?? 0;
		bytes[6] = (byte6 & 0x0f) | 0x40;
		bytes[8] = (byte8 & 0x3f) | 0x80;

		const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));

		return [
			hex.slice(0, 4).join(""),
			hex.slice(4, 6).join(""),
			hex.slice(6, 8).join(""),
			hex.slice(8, 10).join(""),
			hex.slice(10, 16).join(""),
		].join("-");
	}

	return `fallback-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const createEmptyMember = (): PersonMember => ({
	id: generateClientId(),
	name: "",
	photo: null,
	photoPreview: "",
});

const createInitialTeam = (name: string, categoryId: string = ""): TeamData => ({
	id: generateClientId(),
	groupName: name,
	schoolCategoryId: categoryId,
	pasukan: Array.from({ length: 6 }, () => createEmptyMember()), // Default 6 pasukan
	danton: createEmptyMember(),
	cadangan: [], // Start empty, add as needed
	official: [], // Start empty, add as needed
	pelatih: [], // Start empty, add as needed
	notes: "",
});

const EventRegister: React.FC = () => {
	const { eventSlug } = useParams<{ eventSlug: string }>();
	const navigate = useNavigate();
	const { user } = useAuth();
	const { pay, isSnapReady } = usePayment();

	const [event, setEvent] = useState<Event | null>(null);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; label: string } | null>(null);

	// Form state
	const [schoolName, setSchoolName] = useState<string>("");
	const [teams, setTeams] = useState<TeamData[]>([createInitialTeam("Tim 1")]);
	const [supportingDoc, setSupportingDoc] = useState<File | null>(null);
	const [supportingDocPreview, setSupportingDocPreview] = useState<string>("");
	const [paymentMethod, setPaymentMethod] = useState<"MIDTRANS" | "MANUAL">("MIDTRANS");

	// Check if registration is closed
	const isRegistrationClosed = event?.registrationDeadline
		? new Date(event.registrationDeadline) < new Date()
		: false;

	useEffect(() => {
		fetchEventDetail();
	}, [eventSlug]);

	useEffect(() => {
		// Auto-fill institution from user profile
		if (user?.profile?.institution) {
			setSchoolName(user.profile.institution);
		}
	}, [user]);

	const fetchEventDetail = async () => {
		try {
			setLoading(true);
			const response = await api.get(`/events/${eventSlug}`);
			setEvent(response.data);

			// Set default school category for first team if only one option
			if (response.data.schoolCategoryLimits?.length === 1) {
				setTeams(prev => prev.map((t, i) => i === 0 ? { ...t, schoolCategoryId: response.data.schoolCategoryLimits[0].schoolCategory.id } : t));
			}
		} catch (err: any) {
			setError(err.response?.data?.message || "Gagal memuat detail event");
		} finally {
			setLoading(false);
		}
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString("id-ID", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	};

	const formatCurrency = (amount: number | null) => {
		if (!amount) return "Gratis";
		return new Intl.NumberFormat("id-ID", {
			style: "currency",
			currency: "IDR",
			minimumFractionDigits: 0,
		}).format(amount);
	};

	const getAvailableSlotsForTeam = (categoryId: string, currentTeamId: string): number => {
		if (!event?.schoolCategoryLimits) return 0;
		const limit = event.schoolCategoryLimits.find(
			(l) => l.schoolCategory.id === categoryId
		);
		if (!limit) return 0;
		// Count how many OTHER teams in current form already use this category
		const teamsUsingCategory = teams.filter(t => t.schoolCategoryId === categoryId && t.id !== currentTeamId).length;
		return Math.max(0, limit.maxParticipants - (limit.currentParticipants || 0) - teamsUsingCategory);
	};

	const getTotalFee = (): number => {
		if (!event?.registrationFee) return 0;
		return event.registrationFee * teams.length;
	};

	const getTotalMembers = (team: TeamData): number => {
		return team.pasukan.length + 1 + team.cadangan.length + team.official.length + team.pelatih.length; // pasukan + danton + cadangan + official + pelatih
	};

	const addTeam = () => {
		const newTeamNumber = teams.length + 1;
		// Find first category with available slots
		const defaultCategoryId = event?.schoolCategoryLimits?.find(l => {
			const available = l.maxParticipants - (l.currentParticipants || 0);
			const used = teams.filter(t => t.schoolCategoryId === l.schoolCategory.id).length;
			return available - used > 0;
		})?.schoolCategory.id || "";

		setTeams([...teams, createInitialTeam(`Tim ${newTeamNumber}`, defaultCategoryId)]);
	};

	const removeTeam = (teamId: string) => {
		if (teams.length <= 1) {
			Swal.fire({
				icon: "warning",
				title: "Tidak dapat menghapus",
				text: "Minimal harus ada satu tim",
			});
			return;
		}
		setTeams(teams.filter((t) => t.id !== teamId));
	};

	const updateTeam = (teamId: string, field: keyof TeamData, value: any) => {
		setTeams(
			teams.map((t) => (t.id !== teamId ? t : { ...t, [field]: value }))
		);
	};

	// Update member in specific role array
	const updateMember = (
		teamId: string,
		role: "pasukan" | "danton" | "cadangan" | "official" | "pelatih",
		memberId: string,
		field: keyof PersonMember,
		value: any
	) => {
		setTeams(
			teams.map((t) => {
				if (t.id !== teamId) return t;
				if (role === "danton") {
					const updatedDanton: PersonMember = { ...t.danton, [field]: value };
					return { ...t, danton: updatedDanton };
				}
				const members = [...t[role]];
				const idx = members.findIndex((m) => m.id === memberId);
				if (idx !== -1 && members[idx]) {
					const updatedMember: PersonMember = { ...members[idx], [field]: value };
					members[idx] = updatedMember;
				}
				return { ...t, [role]: members };
			})
		);
	};

	// Handle photo upload for a member
	const handleMemberPhoto = (
		teamId: string,
		role: "pasukan" | "danton" | "cadangan" | "official" | "pelatih",
		memberId: string,
		file: File | null
	) => {
		if (file) {
			// Validate file type
			const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
			if (!allowedTypes.includes(file.type)) {
				Swal.fire({
					icon: "error",
					title: "Format tidak didukung",
					text: "File harus berupa JPG atau PNG",
				});
				return;
			}
			// Validate file size (max 2MB)
			if (file.size > 2 * 1024 * 1024) {
				Swal.fire({
					icon: "error",
					title: "File terlalu besar",
					text: "Ukuran foto maksimal 2MB",
				});
				return;
			}
			const preview = URL.createObjectURL(file);
			setTeams(
				teams.map((t) => {
					if (t.id !== teamId) return t;
					if (role === "danton") {
						const updatedDanton: PersonMember = { ...t.danton, photo: file, photoPreview: preview };
						return { ...t, danton: updatedDanton };
					}
					const members = [...t[role]];
					const idx = members.findIndex((m) => m.id === memberId);
					if (idx !== -1 && members[idx]) {
						const updatedMember: PersonMember = { ...members[idx], photo: file, photoPreview: preview };
						members[idx] = updatedMember;
					}
					return { ...t, [role]: members };
				})
			);
		}
	};

	// Add/remove members from role arrays
	const addMemberToRole = (teamId: string, role: "pasukan" | "cadangan" | "official" | "pelatih") => {
		setTeams(
			teams.map((t) => {
				if (t.id !== teamId) return t;
				return { ...t, [role]: [...t[role], createEmptyMember()] };
			})
		);
	};

	const removeMemberFromRole = (teamId: string, role: "pasukan" | "cadangan" | "official" | "pelatih", memberId: string) => {
		setTeams(
			teams.map((t) => {
				if (t.id !== teamId) return t;
				const members = t[role].filter((m) => m.id !== memberId);
				// Only pasukan requires minimum 1
				if (role === "pasukan" && members.length === 0) {
					Swal.fire({
						icon: "warning",
						title: "Tidak dapat menghapus",
						text: "Minimal harus ada satu pasukan",
					});
					return t;
				}
				return { ...t, [role]: members };
			})
		);
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			// Validate file type
			const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
			if (!allowedTypes.includes(file.type)) {
				Swal.fire({
					icon: "error",
					title: "Format tidak didukung",
					text: "File harus berupa PDF, JPG, atau PNG",
				});
				return;
			}

			// Validate file size (max 5MB)
			if (file.size > 5 * 1024 * 1024) {
				Swal.fire({
					icon: "error",
					title: "File terlalu besar",
					text: "Ukuran file maksimal 5MB",
				});
				return;
			}

			setSupportingDoc(file);
			setSupportingDocPreview(file.name);
		}
	};

	const validateForm = (): boolean => {
		if (!schoolName.trim()) {
			Swal.fire({
				icon: "error",
				title: "Nama organisasi belum diisi",
				text: "Silakan isi nama organisasi/sekolah",
			});
			return false;
		}

		// Validate each team
		for (let i = 0; i < teams.length; i++) {
			const team = teams[i];
			if (!team) continue;
			if (!team.schoolCategoryId) {
				Swal.fire({
					icon: "error",
					title: "Kategori belum dipilih",
					text: `Silakan pilih kategori sekolah untuk Tim #${i + 1}`,
				});
				return false;
			}
			if (!team.groupName.trim()) {
				Swal.fire({
					icon: "error",
					title: "Nama tim belum diisi",
					text: `Setiap tim harus memiliki nama (Tim #${i + 1})`,
				});
				return false;
			}
		}

		// Check slot availability per category
		const categoryUsage: Record<string, number> = {};
		for (const team of teams) {
			categoryUsage[team.schoolCategoryId] = (categoryUsage[team.schoolCategoryId] || 0) + 1;
		}

		for (const [categoryId, count] of Object.entries(categoryUsage)) {
			const limit = event?.schoolCategoryLimits?.find(l => l.schoolCategory.id === categoryId);
			if (limit) {
				const available = limit.maxParticipants - (limit.currentParticipants || 0);
				if (count > available) {
					Swal.fire({
						icon: "error",
						title: "Slot tidak cukup",
						text: `Kategori ${limit.schoolCategory.name} hanya tersisa ${available} slot, Anda mendaftarkan ${count} tim`,
					});
					return false;
				}
			}
		}

		return true;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!event) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: "Data event tidak ditemukan",
			});
			return;
		}

		if (!validateForm()) return;

		setSubmitting(true);
		setUploadProgress(null);

		try {
			// Count total photos to upload for progress tracking
			let totalPhotos = supportingDoc ? 1 : 0;
			for (const team of teams) {
				totalPhotos += team.pasukan.filter(m => m.photo).length;
				if (team.danton.photo) totalPhotos++;
				totalPhotos += team.cadangan.filter(m => m.photo).length;
				totalPhotos += team.official.filter(m => m.photo).length;
				totalPhotos += team.pelatih.filter(m => m.photo).length;
			}
			let uploadedCount = 0;

			// Upload a single file with retry logic
			const uploadSingleFile = async (photo: File, label: string, maxRetries = 2): Promise<string> => {
				let lastError: any;
				for (let attempt = 0; attempt <= maxRetries; attempt++) {
					try {
						const formData = new FormData();
						formData.append("file", photo);
						formData.append("type", "member");
						const uploadResponse = await api.post("/upload/document", formData, {
							headers: { "Content-Type": "multipart/form-data" },
							timeout: 60000, // 60 seconds per file
						});
						uploadedCount++;
						setUploadProgress({ current: uploadedCount, total: totalPhotos, label });
						return uploadResponse.data.url;
					} catch (err: any) {
						lastError = err;
						if (attempt < maxRetries) {
							// Wait before retry (1s, 2s)
							await new Promise(r => setTimeout(r, (attempt + 1) * 1000));
						}
					}
				}
				// All retries failed - throw with descriptive message
				const isTimeout = lastError.code === 'ECONNABORTED' || lastError.message?.includes('timeout');
				const isServerError = lastError.response?.status >= 500;
				const isTooLarge = lastError.response?.status === 413;
				if (isTooLarge) throw new Error(`File "${label}" terlalu besar. Maksimal 5MB per file.`);
				if (isTimeout) throw new Error(`Upload "${label}" timeout setelah ${maxRetries + 1}x percobaan. Coba kurangi ukuran foto atau periksa koneksi.`);
				if (isServerError) throw new Error(`Server error saat upload "${label}". Silakan coba lagi nanti.`);
				throw new Error(lastError.response?.data?.error || `Gagal upload "${label}": ${lastError.message}`);
			};

			// Upload member photo (returns null if no photo)
			const uploadMemberPhoto = async (photo: File | null, label: string): Promise<string | null> => {
				if (!photo) return null;
				return uploadSingleFile(photo, label);
			};

			// First upload supporting document if provided
			let supportingDocUrl: string | undefined;
			if (supportingDoc) {
				setUploadProgress({ current: 0, total: totalPhotos, label: "Dokumen pendukung" });
				supportingDocUrl = await uploadSingleFile(supportingDoc, "Dokumen pendukung");
			}

			// Upload photos sequentially with controlled concurrency (3 at a time)
			const CONCURRENCY = 3;
			const uploadBatch = async <T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> => {
				const results: R[] = [];
				for (let i = 0; i < items.length; i += CONCURRENCY) {
					const batch = items.slice(i, i + CONCURRENCY);
					const batchResults = await Promise.all(batch.map(fn));
					results.push(...batchResults);
				}
				return results;
			};

			// Prepare registration data - process teams sequentially
			const groupsData = [];
			for (let ti = 0; ti < teams.length; ti++) {
				const team = teams[ti]!;
				const teamLabel = team.groupName || `Tim ${ti + 1}`;

				// Upload pasukan photos in batches
				const pasukanWithPhotos = await uploadBatch(team.pasukan, async (m) => ({
					name: m.name.trim(),
					photo: await uploadMemberPhoto(m.photo, `${teamLabel} - Pasukan ${m.name || 'tanpa nama'}`),
					role: "PASUKAN",
				}));

				const dantonPhoto = await uploadMemberPhoto(team.danton.photo, `${teamLabel} - Danton ${team.danton.name || ''}`);
				const dantonData = {
					name: team.danton.name.trim(),
					photo: dantonPhoto,
					role: "DANTON",
				};

				const cadanganWithPhotos = await uploadBatch(team.cadangan, async (m) => ({
					name: m.name.trim(),
					photo: await uploadMemberPhoto(m.photo, `${teamLabel} - Cadangan ${m.name || 'tanpa nama'}`),
					role: "CADANGAN",
				}));

				const officialWithPhotos = await uploadBatch(team.official, async (m) => ({
					name: m.name.trim(),
					photo: await uploadMemberPhoto(m.photo, `${teamLabel} - Official ${m.name || 'tanpa nama'}`),
					role: "OFFICIAL",
				}));

				const pelatihWithPhotos = await uploadBatch(team.pelatih, async (m) => ({
					name: m.name.trim(),
					photo: await uploadMemberPhoto(m.photo, `${teamLabel} - Pelatih ${m.name || 'tanpa nama'}`),
					role: "PELATIH",
				}));

				const allMembers = [...pasukanWithPhotos, dantonData, ...cadanganWithPhotos, ...officialWithPhotos, ...pelatihWithPhotos];
				const memberNames = allMembers.filter(m => m.name).map(m => m.name);
				const totalMembers = allMembers.length;

				groupsData.push({
					groupName: team.groupName.trim(),
					schoolCategoryId: team.schoolCategoryId,
					teamMembers: totalMembers,
					memberNames: JSON.stringify(memberNames),
					memberData: JSON.stringify(allMembers),
					notes: team.notes.trim() || undefined,
				});
			}

			const registrationData = {
				eventId: event.id, // Use event.id (UUID) instead of URL param (might be slug)
				schoolName: schoolName.trim(),
				supportingDoc: supportingDocUrl,
				groups: groupsData,
				paymentMethod: event.registrationFee && event.registrationFee > 0 ? paymentMethod : undefined,
			};

			const regRes = await api.post("/registrations", registrationData);
			const { registration, paymentRequired } = regRes.data;

			// If payment required, initiate Midtrans payment
			if (paymentRequired) {
				try {
					const paymentRes = await api.post(`/registrations/${registration.id}/pay`);
					const { snapToken, midtransOrderId } = paymentRes.data.payment;

				if (snapToken && isSnapReady) {
					await new Promise<void>((resolve) => {
						pay(snapToken, {
							onSuccess: async () => {
								// Verify payment status directly with Midtrans to avoid race condition with webhook
								try {
									await api.post(`/registrations/${registration.id}/verify-payment`);
								} catch {}
								Swal.fire({
									icon: "success",
									title: "Pembayaran Berhasil!",
									html: `
										<p class="mb-2">Anda telah mendaftarkan <strong>${teams.length} tim</strong> untuk event ini.</p>
										<p class="text-sm text-gray-600">Pembayaran sebesar <strong>${formatCurrency(event.registrationFee)}</strong> telah diterima.</p>
										<p class="text-sm text-gray-600">Panitia akan meninjau pendaftaran Anda.</p>
									`,
									confirmButtonText: "Lihat Pendaftaran Saya",
								});
								resolve();
							},
							onPending: () => {
								Swal.fire({
									icon: "info",
									title: "Pembayaran Pending",
									html: `
										<p class="mb-2">Pendaftaran berhasil disimpan.</p>
										<p class="text-sm text-gray-600">Silakan selesaikan pembayaran untuk mengaktifkan pendaftaran Anda.</p>
										<p class="text-sm text-gray-600">Order ID: <code class="bg-gray-100 px-1 rounded">${midtransOrderId}</code></p>
									`,
									confirmButtonText: "OK",
								});
								resolve();
							},
							onError: () => {
								Swal.fire({
									icon: "error",
									title: "Pembayaran Gagal",
									html: `
										<p class="mb-2">Pendaftaran tersimpan, tapi pembayaran gagal.</p>
										<p class="text-sm text-gray-600">Silakan coba bayar lagi dari halaman pendaftaran Anda.</p>
									`,
									confirmButtonText: "OK",
								});
								resolve();
							},
							onClose: () => {
								Swal.fire({
									icon: "info",
									title: "Pembayaran Ditutup",
									html: `
										<p class="mb-2">Pendaftaran berhasil disimpan.</p>
										<p class="text-sm text-gray-600">Selesaikan pembayaran Anda untuk mengkonfirmasi pendaftaran.</p>
									`,
									confirmButtonText: "OK",
								});
								resolve();
							},
						});
					});
				} else {
					// Snap not ready, show manual payment info
					await Swal.fire({
						icon: "warning",
						title: "Pendaftaran Berhasil - Pembayaran Pending",
						html: `
							<p class="mb-2">Anda telah mendaftarkan <strong>${teams.length} tim</strong> untuk event ini.</p>
							<p class="text-sm text-gray-600">Segera selesaikan pembayaran sebesar <strong>${formatCurrency(event.registrationFee)}</strong>.</p>
							<p class="text-sm text-gray-600">Order ID: <code class="bg-gray-100 px-1 rounded">${midtransOrderId}</code></p>
						`,
						confirmButtonText: "Lihat Pendaftaran Saya",
					});
				}
				} catch (paymentErr: any) {
					// Registration succeeded but payment initiation failed
					await Swal.fire({
						icon: "warning",
						title: "Pendaftaran Berhasil - Pembayaran Belum Bisa Diproses",
						html: `
							<p class="mb-2">Pendaftaran <strong>${teams.length} tim</strong> berhasil disimpan.</p>
							<p class="text-sm text-gray-600">${paymentErr.response?.data?.message || "Sistem pembayaran sedang tidak tersedia. Silakan coba bayar nanti dari halaman pendaftaran Anda."}</p>
						`,
						confirmButtonText: "Lihat Pendaftaran Saya",
					});
				}
				navigate("/peserta/registrations");
			} else if (event.registrationFee && event.registrationFee > 0 && paymentMethod === "MANUAL") {
				// Manual payment - show contact info
				const contactInfo = event.contactPhone
					? `<p class="text-sm text-gray-600 mt-2">Hubungi panitia: <strong>${event.contactPersonName || "Panitia"}</strong></p>
					   <p class="text-sm text-gray-600">No. HP/WA: <a href="https://wa.me/${event.contactPhone.replace(/[^0-9]/g, "")}" target="_blank" class="text-green-600 font-bold hover:underline">${event.contactPhone}</a></p>`
					: "";
				await Swal.fire({
					icon: "success",
					title: "Pendaftaran Berhasil!",
					html: `
						<p class="mb-2">Anda telah mendaftarkan <strong>${teams.length} tim</strong> untuk event ini.</p>
						<p class="text-sm text-gray-600">Biaya pendaftaran: <strong>${formatCurrency(event.registrationFee)}</strong></p>
						<p class="text-sm text-gray-600 mt-1">Silakan lakukan pembayaran langsung ke panitia.</p>
						${contactInfo}
						<p class="text-sm text-gray-500 mt-2">Pendaftaran Anda akan dikonfirmasi setelah pembayaran diterima oleh panitia.</p>
					`,
					confirmButtonText: "Lihat Pendaftaran Saya",
				});
				navigate("/peserta/registrations");
			} else {
				// No payment required
				await Swal.fire({
					icon: "success",
					title: "Pendaftaran Berhasil!",
					html: `
						<p class="mb-2">Anda telah mendaftarkan <strong>${teams.length} tim</strong> untuk event ini.</p>
						<p class="text-sm text-gray-600">Status pendaftaran Anda saat ini: <strong>REGISTERED</strong></p>
						<p class="text-sm text-gray-600">Panitia akan meninjau pendaftaran Anda.</p>
					`,
					confirmButtonText: "Lihat Pendaftaran Saya",
				});
				navigate("/peserta/registrations");
			}
		} catch (err: any) {
			const errorMessage = err.message || err.response?.data?.error || "Terjadi kesalahan saat mendaftar";
			const isUploadError = errorMessage.includes('upload') || errorMessage.includes('Upload') || errorMessage.includes('timeout') || errorMessage.includes('terlalu besar');
			Swal.fire({
				icon: "error",
				title: isUploadError ? "Upload Gagal" : "Pendaftaran Gagal",
				html: `
					<p class="mb-2">${errorMessage}</p>
					${isUploadError ? '<p class="text-sm text-gray-500">Tips: Pastikan ukuran setiap foto di bawah 2MB dan koneksi internet stabil. Coba kompres foto terlebih dahulu.</p>' : ''}
				`,
			});
		} finally {
			setSubmitting(false);
			setUploadProgress(null);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
			</div>
		);
	}

	if (error || !event) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<ExclamationCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
					<h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
						{error || "Event tidak ditemukan"}
					</h2>
					<Link
						to="/"
						className="text-red-600 dark:text-red-400 hover:underline"
					>
						Kembali ke Beranda
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen py-4 sm:py-8 px-3 sm:px-4">
			<div className="max-w-6xl mx-auto">
				{/* Header */}
				<div className="mb-4 sm:mb-6">
					<button
						onClick={() => navigate(`/events/${eventSlug}`)}
						className="flex items-center text-sm sm:text-base text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 mb-3 sm:mb-4"
					>
						<ArrowLeftIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
						Kembali ke Detail Event
					</button>
					<h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
						Pendaftaran Event
					</h1>
					<p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
						Lengkapi formulir di bawah untuk mendaftar ke event ini
					</p>
				</div>

				<form onSubmit={handleSubmit}>
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
						{/* Main Form */}
						<div className="lg:col-span-2 space-y-4 sm:space-y-6">
							{/* Event Info Card */}
							<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-md p-4 sm:p-6">
								<h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
									Informasi Event
								</h2>
								<div className="flex flex-col sm:flex-row items-start gap-4">
									{event.thumbnail && (
										<img
											src={`${import.meta.env.VITE_API_URL?.replace("/api", "")}${event.thumbnail}`}
											alt={event.title}
											className="w-full sm:w-24 h-32 sm:h-30 object-cover rounded-lg"
										/>
									)}
									<div className="flex-1">
										<h3 className="font-semibold text-gray-900 dark:text-white">
											{event.title}
										</h3>
										<div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
											<div className="flex items-center">
												<CalendarIcon className="w-4 h-4 mr-2" />
												{formatDate(event.startDate)} - {formatDate(event.endDate)}
											</div>
											{event.location && (
												<div className="flex items-center">
													<MapPinIcon className="w-4 h-4 mr-2" />
													{event.location}
													{event.venue && ` - ${event.venue}`}
												</div>
											)}
										</div>
									</div>
								</div>
							</div>

							{/* Organization Info */}
							<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-md p-4 sm:p-6">
								<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
									Informasi Organisasi
								</h2>

								<div className="space-y-4">
									{/* Organization/School Name */}
									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
											Nama Organisasi/Sekolah <span className="text-red-500">*</span>
										</label>
										<input
											type="text"
											value={schoolName}
											onChange={(e) => setSchoolName(e.target.value)}
											placeholder="Contoh: SMAN 1 Jakarta"
											className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
											required
										/>
										{user?.profile?.institution && (
											<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
												Diisi otomatis dari profil Anda
											</p>
										)}
									</div>

									{/* Supporting Document */}
									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
											Dokumen Pendukung (Opsional)
										</label>
										<div className="mt-1 flex items-center gap-4">
											<label className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
												<DocumentArrowUpIcon className="w-5 h-5 mr-2 text-gray-500" />
												<span className="text-sm text-gray-600 dark:text-gray-400">
													{supportingDocPreview || "Pilih File"}
												</span>
												<input
													type="file"
													accept=".pdf,.jpg,.jpeg,.png"
													onChange={handleFileChange}
													className="hidden"
												/>
											</label>
											{supportingDoc && (
												<button
													type="button"
													onClick={() => {
														setSupportingDoc(null);
														setSupportingDocPreview("");
													}}
													className="text-red-500 hover:text-red-700"
												>
													<TrashIcon className="w-5 h-5" />
												</button>
											)}
										</div>
										<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
											Format: PDF, JPG, PNG. Maksimal 5MB. Contoh: Surat Rekomendasi Sekolah, Surat tugas, SK Paskibra
										</p>
									</div>
								</div>
							</div>

							{/* Teams Section */}
							<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-md p-4 sm:p-6">
								<div className="flex items-center justify-between mb-4">
									<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
										Daftar Tim ({teams.length})
									</h2>
									<button
										type="button"
										onClick={addTeam}
										className="flex items-center px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<PlusIcon className="w-4 h-4 mr-1" />
										Tambah Tim
									</button>
								</div>

								<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
									Setiap tim dapat memilih kategori sekolah yang berbeda sesuai kuota tersedia
								</p>

								<div className="space-y-4 sm:space-y-6">
									{teams.map((team, teamIndex) => (
										<div
											key={team.id}
											className="border border-gray-200/60 dark:border-gray-700/40 rounded-lg p-3 sm:p-4"
										>
											<div className="flex items-start justify-between mb-4">
												<h3 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
													Tim #{teamIndex + 1}
													<span className="ml-1 sm:ml-2 text-xs sm:text-sm font-normal text-gray-500">
														({getTotalMembers(team)} personil)
													</span>
												</h3>
												{teams.length > 1 && (
													<button
														type="button"
														onClick={() => removeTeam(team.id)}
														className="text-red-500 hover:text-red-700"
													>
														<TrashIcon className="w-5 h-5" />
													</button>
												)}
											</div>

											{/* School Category per Team */}
											<div className="mb-4">
												<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
													Kategori Sekolah <span className="text-red-500">*</span>
												</label>
												<select
													value={team.schoolCategoryId}
													onChange={(e) => updateTeam(team.id, "schoolCategoryId", e.target.value)}
													className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
													required
												>
													<option value="">Pilih Kategori</option>
													{event.schoolCategoryLimits?.map((limit) => {
														const available = getAvailableSlotsForTeam(limit.schoolCategory.id, team.id);
														const isCurrentSelection = team.schoolCategoryId === limit.schoolCategory.id;
														return (
															<option
																key={limit.schoolCategory.id}
																value={limit.schoolCategory.id}
																disabled={available <= 0 && !isCurrentSelection}
															>
																{limit.schoolCategory.name}{" "}
																{isCurrentSelection
																	? "(Dipilih)"
																	: available > 0
																		? `(${available} slot tersedia)`
																		: "(Penuh)"}
															</option>
														);
													})}
												</select>
											</div>

											{/* Team Name */}
											<div className="mb-4">
												<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
													Nama Tim <span className="text-red-500">*</span>
												</label>
												<input
													type="text"
													value={team.groupName}
													onChange={(e) =>
														updateTeam(team.id, "groupName", e.target.value)
													}
													placeholder="Contoh: Tim A"
													className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
													required
												/>
											</div>

											{/* Pasukan and Danton Grid */}
											<div className="mb-6">
												<div className="mb-3">
													<h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
														Pasukan ({team.pasukan.length} orang)
													</h4>
												</div>
												<div className="flex flex-col md:flex-row gap-4">
													{/* Pasukan Grid - responsive columns */}
													<div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 order-2 md:order-1">
														{team.pasukan.map((member, idx) => (
															<div
																key={member.id}
																className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2 sm:p-3 relative group"
															>
																{team.pasukan.length > 1 && (
																	<button
																		type="button"
																		onClick={() => removeMemberFromRole(team.id, "pasukan", member.id)}
																		className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
																	>
																		×
																	</button>
																)}
																{/* Photo Upload */}
																<div className="flex justify-center mb-2">
																	<label className="relative cursor-pointer">
																		<div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-500 hover:border-red-500">
																			{member.photoPreview ? (
																				<img
																					src={member.photoPreview}
																					alt={member.name || `Pasukan ${idx + 1}`}
																					className="w-full h-full object-cover"
																				/>
																			) : (
																				<CameraIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
																			)}
																		</div>
																		<input
																			type="file"
																			accept="image/jpeg,image/png,image/jpg"
																			onChange={(e) => {
																				const file = e.target.files?.[0];
																				if (file) handleMemberPhoto(team.id, "pasukan", member.id, file);
																			}}
																			className="hidden"
																		/>
																	</label>
																</div>
																<input
																	type="text"
																	value={member.name}
																	onChange={(e) =>
																		updateMember(team.id, "pasukan", member.id, "name", e.target.value)
																	}
																	placeholder={`Pasukan ${idx + 1}`}
																	className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm text-gray-900 dark:text-white text-center"
																/>
															</div>
														))}
													{/* Add Pasukan Button */}
													<button
														type="button"
														onClick={() => addMemberToRole(team.id, "pasukan")}
														className="flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg p-2 sm:p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-green-500 transition-colors min-h-[100px]"
													>
														<PlusIcon className="w-6 h-6 text-gray-400 hover:text-green-500" />
														<span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Tambah</span>
													</button>
												</div>

													{/* Danton - Top on mobile, Right Side on desktop */}
													<div className="w-full md:w-32 order-1 md:order-2">
														<div className="text-center mb-2">
															<span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase">
																Komandan
															</span>
														</div>
														<div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-3 border-2 border-red-200 dark:border-red-700 flex md:flex-col items-center md:items-stretch gap-3 md:gap-0">
															{/* Photo Upload */}
															<div className="flex justify-center md:mb-2 flex-shrink-0">
																<label className="relative cursor-pointer">
																	<div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-100 dark:bg-red-800 flex items-center justify-center overflow-hidden border-2 border-dashed border-red-300 dark:border-red-600 hover:border-red-500">
																		{team.danton.photoPreview ? (
																			<img
																				src={team.danton.photoPreview}
																				alt={team.danton.name || "Danton"}
																				className="w-full h-full object-cover"
																			/>
																		) : (
																			<UserIcon className="w-6 h-6 md:w-8 md:h-8 text-red-400" />
																		)}
																	</div>
																	<input
																		type="file"
																		accept="image/jpeg,image/png,image/jpg"
																		onChange={(e) => {
																			const file = e.target.files?.[0];
																			if (file) handleMemberPhoto(team.id, "danton", team.danton.id, file);
																		}}
																		className="hidden"
																	/>
																</label>
															</div>
															<input
																type="text"
																value={team.danton.name}
																onChange={(e) =>
																	updateMember(team.id, "danton", team.danton.id, "name", e.target.value)
																}
																placeholder="Nama Danton"
																className="flex-1 md:w-full px-2 py-1 text-xs border border-red-300 dark:border-red-600 rounded bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm text-gray-900 dark:text-white text-center"
															/>
														</div>
													</div>
												</div>
											</div>

											{/* Cadangan Section */}
											<div className="mb-4">
												<div className="mb-3">
													<h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
														Cadangan ({team.cadangan.length} orang)
													</h4>
												</div>
												<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
													{team.cadangan.map((member, idx) => (
														<div
															key={member.id}
															className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2 sm:p-3 relative group border border-amber-200 dark:border-amber-700"
														>
															<button
																type="button"
																onClick={() => removeMemberFromRole(team.id, "cadangan", member.id)}
																className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
															>
																×
															</button>
															{/* Photo Upload */}
															<div className="flex justify-center mb-2">
																<label className="relative cursor-pointer">
																	<div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center overflow-hidden border-2 border-dashed border-amber-300 dark:border-amber-600 hover:border-amber-500">
																		{member.photoPreview ? (
																			<img
																				src={member.photoPreview}
																				alt={member.name || `Cadangan ${idx + 1}`}
																				className="w-full h-full object-cover"
																			/>
																		) : (
																			<CameraIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
																		)}
																	</div>
																	<input
																		type="file"
																		accept="image/jpeg,image/png,image/jpg"
																		onChange={(e) => {
																			const file = e.target.files?.[0];
																			if (file) handleMemberPhoto(team.id, "cadangan", member.id, file);
																		}}
																		className="hidden"
																	/>
																</label>
															</div>
															<input
																type="text"
																value={member.name}
																onChange={(e) =>
																	updateMember(team.id, "cadangan", member.id, "name", e.target.value)
																}
																placeholder={`Cadangan ${idx + 1}`}
																className="w-full px-2 py-1 text-xs border border-amber-300 dark:border-amber-600 rounded bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm text-gray-900 dark:text-white text-center"
															/>
														</div>
													))}
												{/* Add Cadangan Button */}
												<button
													type="button"
													onClick={() => addMemberToRole(team.id, "cadangan")}
													className="flex flex-col items-center justify-center bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg p-2 sm:p-3 border-2 border-dashed border-amber-300 dark:border-amber-600 hover:border-amber-500 transition-colors min-h-[90px]"
												>
													<PlusIcon className="w-5 h-5 text-amber-400 hover:text-amber-500" />
													<span className="text-xs text-amber-500 dark:text-amber-400 mt-1">Tambah</span>
												</button>
												</div>
											</div>

											{/* Official Section */}
											<div className="mb-4">
												<div className="mb-3">
													<h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
														Official ({team.official.length} orang)
													</h4>
												</div>
												<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
													{team.official.map((member, idx) => (
														<div
															key={member.id}
															className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 sm:p-3 relative group border border-blue-200 dark:border-blue-700"
														>
															<button
																type="button"
																onClick={() => removeMemberFromRole(team.id, "official", member.id)}
																className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
															>
																×
															</button>
															<div className="flex justify-center mb-2">
																<label className="relative cursor-pointer">
																	<div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center overflow-hidden border-2 border-dashed border-blue-300 dark:border-blue-600 hover:border-blue-500">
																		{member.photoPreview ? (
																			<img
																				src={member.photoPreview}
																				alt={member.name || `Official ${idx + 1}`}
																				className="w-full h-full object-cover"
																			/>
																		) : (
																			<CameraIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
																		)}
																	</div>
																	<input
																		type="file"
																		accept="image/jpeg,image/png,image/jpg"
																		onChange={(e) => {
																			const file = e.target.files?.[0];
																			if (file) handleMemberPhoto(team.id, "official", member.id, file);
																		}}
																		className="hidden"
																	/>
																</label>
															</div>
															<input
																type="text"
																value={member.name}
																onChange={(e) =>
																	updateMember(team.id, "official", member.id, "name", e.target.value)
																}
																placeholder={`Official ${idx + 1}`}
																className="w-full px-2 py-1 text-xs border border-blue-300 dark:border-blue-600 rounded bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm text-gray-900 dark:text-white text-center"
															/>
														</div>
													))}
												<button
													type="button"
													onClick={() => addMemberToRole(team.id, "official")}
													className="flex flex-col items-center justify-center bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg p-2 sm:p-3 border-2 border-dashed border-blue-300 dark:border-blue-600 hover:border-blue-500 transition-colors min-h-[90px]"
												>
													<PlusIcon className="w-5 h-5 text-blue-400 hover:text-blue-500" />
													<span className="text-xs text-blue-500 dark:text-blue-400 mt-1">Tambah</span>
												</button>
												</div>
											</div>

											{/* Pelatih Section */}
											<div className="mb-4">
												<div className="mb-3">
													<h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
														Pelatih ({team.pelatih.length} orang)
													</h4>
												</div>
												<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
													{team.pelatih.map((member, idx) => (
														<div
															key={member.id}
															className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 sm:p-3 relative group border border-green-200 dark:border-green-700"
														>
															<button
																type="button"
																onClick={() => removeMemberFromRole(team.id, "pelatih", member.id)}
																className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
															>
																×
															</button>
															<div className="flex justify-center mb-2">
																<label className="relative cursor-pointer">
																	<div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center overflow-hidden border-2 border-dashed border-green-300 dark:border-green-600 hover:border-green-500">
																		{member.photoPreview ? (
																			<img
																				src={member.photoPreview}
																				alt={member.name || `Pelatih ${idx + 1}`}
																				className="w-full h-full object-cover"
																			/>
																		) : (
																			<CameraIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
																		)}
																	</div>
																	<input
																		type="file"
																		accept="image/jpeg,image/png,image/jpg"
																		onChange={(e) => {
																			const file = e.target.files?.[0];
																			if (file) handleMemberPhoto(team.id, "pelatih", member.id, file);
																		}}
																		className="hidden"
																	/>
																</label>
															</div>
															<input
																type="text"
																value={member.name}
																onChange={(e) =>
																	updateMember(team.id, "pelatih", member.id, "name", e.target.value)
																}
																placeholder={`Pelatih ${idx + 1}`}
																className="w-full px-2 py-1 text-xs border border-green-300 dark:border-green-600 rounded bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm text-gray-900 dark:text-white text-center"
															/>
														</div>
													))}
												<button
													type="button"
													onClick={() => addMemberToRole(team.id, "pelatih")}
													className="flex flex-col items-center justify-center bg-green-50 dark:bg-green-900/10 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg p-2 sm:p-3 border-2 border-dashed border-green-300 dark:border-green-600 hover:border-green-500 transition-colors min-h-[90px]"
												>
													<PlusIcon className="w-5 h-5 text-green-400 hover:text-green-500" />
													<span className="text-xs text-green-500 dark:text-green-400 mt-1">Tambah</span>
												</button>
												</div>
											</div>

											<div>
												<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
													Catatan (Opsional)
												</label>
												<textarea
													value={team.notes}
													onChange={(e) => updateTeam(team.id, "notes", e.target.value)}
													placeholder="Catatan tambahan untuk tim ini..."
													rows={2}
													className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
												/>
											</div>
										</div>
									))}
								</div>
							</div>
						</div>

						{/* Sidebar */}
						<div className="lg:col-span-1">
							<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-md p-4 sm:p-6 sticky top-4">
								<h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
									Ringkasan Pendaftaran
								</h2>

								<div className="space-y-3 text-sm">
									<div className="flex justify-between">
										<span className="text-gray-600 dark:text-gray-400">
											Jumlah Tim:
										</span>
										<span className="font-medium text-gray-900 dark:text-white">
											{teams.length}
										</span>
									</div>

									{/* Personnel breakdown */}
									<div className="space-y-1">
										<span className="text-gray-600 dark:text-gray-400">Total Personil:</span>
										<div className="flex justify-between pl-2">
											<span className="text-gray-500 dark:text-gray-400 text-xs">Pasukan</span>
											<span className="font-medium text-gray-900 dark:text-white text-xs">
												{teams.reduce((sum, t) => sum + t.pasukan.length, 0)} orang
											</span>
										</div>
										<div className="flex justify-between pl-2">
											<span className="text-gray-500 dark:text-gray-400 text-xs">Komandan</span>
											<span className="font-medium text-gray-900 dark:text-white text-xs">
												{teams.length} orang
											</span>
										</div>
										<div className="flex justify-between pl-2">
											<span className="text-gray-500 dark:text-gray-400 text-xs">Cadangan</span>
											<span className="font-medium text-gray-900 dark:text-white text-xs">
												{teams.reduce((sum, t) => sum + t.cadangan.length, 0)} orang
											</span>
										</div>
										<div className="flex justify-between pl-2">
											<span className="text-gray-500 dark:text-gray-400 text-xs">Official</span>
											<span className="font-medium text-gray-900 dark:text-white text-xs">
												{teams.reduce((sum, t) => sum + t.official.length, 0)} orang
											</span>
										</div>
										<div className="flex justify-between pl-2">
											<span className="text-gray-500 dark:text-gray-400 text-xs">Pelatih</span>
											<span className="font-medium text-gray-900 dark:text-white text-xs">
												{teams.reduce((sum, t) => sum + t.pelatih.length, 0)} orang
											</span>
										</div>
									</div>

									{/* Category breakdown */}
									{(() => {
										const categoryCount: Record<string, { name: string; count: number }> = {};
										teams.forEach(team => {
											if (team.schoolCategoryId) {
												const cat = event.schoolCategoryLimits?.find(l => l.schoolCategory.id === team.schoolCategoryId);
												if (cat) {
													if (!categoryCount[team.schoolCategoryId]) {
														categoryCount[team.schoolCategoryId] = { name: cat.schoolCategory.name, count: 0 };
													}
													const entry = categoryCount[team.schoolCategoryId];
													if (entry) entry.count++;
												}
											}
										});
										const entries = Object.values(categoryCount);
										if (entries.length === 0) return null;
										return (
											<div className="space-y-1">
												<span className="text-gray-600 dark:text-gray-400">Kategori:</span>
												{entries.map((entry, idx) => (
													<div key={idx} className="flex justify-between pl-2">
														<span className="text-gray-500 dark:text-gray-400 text-xs">{entry.name}</span>
														<span className="font-medium text-gray-900 dark:text-white text-xs">{entry.count} tim</span>
													</div>
												))}
											</div>
										);
									})()}

									<div className="flex justify-between">
										<span className="text-gray-600 dark:text-gray-400">
											Biaya per Tim:
										</span>
										<span className="font-medium text-gray-900 dark:text-white">
											{formatCurrency(event.registrationFee)}
										</span>
									</div>

									<hr className="border-gray-200/60 dark:border-gray-700/40" />

									<div className="flex justify-between text-lg">
										<span className="font-semibold text-gray-900 dark:text-white">
											Total Biaya:
										</span>
										<span className="font-bold text-red-600 dark:text-red-400">
											{formatCurrency(getTotalFee())}
										</span>
									</div>
								</div>

								{/* Payment Method Selection */}
								{event.registrationFee && event.registrationFee > 0 && (
									<div className="mt-4">
										<label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
											Metode Pembayaran
										</label>
										<div className="space-y-2">
											<label
												className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
													paymentMethod === "MIDTRANS"
														? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
														: "border-gray-200 dark:border-gray-600 hover:border-blue-300"
												}`}
											>
												<input
													type="radio"
													name="paymentMethod"
													value="MIDTRANS"
													checked={paymentMethod === "MIDTRANS"}
													onChange={() => setPaymentMethod("MIDTRANS")}
													className="text-blue-600 focus:ring-blue-500"
												/>
												<div>
													<p className="font-medium text-gray-900 dark:text-white text-sm">
														Bayar Online (Midtrans)
													</p>
													<p className="text-xs text-gray-500 dark:text-gray-400">
														Transfer bank, e-wallet, QRIS, dll.
													</p>
												</div>
											</label>
											<label
												className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
													paymentMethod === "MANUAL"
														? "border-green-500 bg-green-50 dark:bg-green-900/20"
														: "border-gray-200 dark:border-gray-600 hover:border-green-300"
												}`}
											>
												<input
													type="radio"
													name="paymentMethod"
													value="MANUAL"
													checked={paymentMethod === "MANUAL"}
													onChange={() => setPaymentMethod("MANUAL")}
													className="text-green-600 focus:ring-green-500"
												/>
												<div>
													<p className="font-medium text-gray-900 dark:text-white text-sm">
														Bayar Langsung ke Panitia
													</p>
													<p className="text-xs text-gray-500 dark:text-gray-400">
														Pembayaran tunai/transfer langsung ke panitia
													</p>
												</div>
											</label>
										</div>
										{paymentMethod === "MANUAL" && event.contactPhone && (
											<div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
												<p className="text-sm font-medium text-green-800 dark:text-green-200">
													Hubungi Panitia:
												</p>
												<p className="text-sm text-green-700 dark:text-green-300">
													{event.contactPersonName || "Panitia"} - {event.contactPhone}
												</p>
											</div>
										)}
									</div>
								)}

								<button
									type="submit"
									disabled={submitting || isRegistrationClosed}
									className={`w-full mt-6 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center ${isRegistrationClosed
										? 'bg-gray-400 cursor-not-allowed text-white'
										: 'bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
									}`}
								>
									{isRegistrationClosed ? (
										<>
											<ExclamationCircleIcon className="w-5 h-5 mr-2" />
											Pendaftaran Telah Ditutup
										</>
									) : submitting ? (
										<>
											<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
											{uploadProgress
												? `Mengupload ${uploadProgress.current}/${uploadProgress.total}...`
												: "Mendaftar..."}
										</>
									) : (
										<>
											<CheckCircleIcon className="w-5 h-5 mr-2" />
											Daftar Sekarang
										</>
									)}
								</button>

								{/* Upload progress bar */}
								{submitting && uploadProgress && uploadProgress.total > 0 && (
									<div className="mt-4">
										<div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
											<span>Upload: {uploadProgress.label}</span>
											<span>{uploadProgress.current}/{uploadProgress.total} file</span>
										</div>
										<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
											<div
												className="bg-red-600 h-2.5 rounded-full transition-all duration-300"
												style={{ width: `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%` }}
											></div>
										</div>
										<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
											Jangan tutup halaman ini sampai proses upload selesai
										</p>
									</div>
								)}

								<p className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
									Dengan mendaftar, Anda menyetujui syarat dan ketentuan event ini
								</p>
							</div>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
};

export default EventRegister;
