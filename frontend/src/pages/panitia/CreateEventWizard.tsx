import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
	ArrowLeftIcon,
	CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../utils/api";
import { Logo } from "../../components/Logo";
import { ThemeToggle } from "../../components/ThemeToggle";
import { showError, showConfirm } from "../../utils/sweetalert";
import {
	WizardStep1BasicInfo,
	WizardStep2Categories,
	WizardStep3MediaFee,
	WizardStep4Payment,
} from "../../components/event-wizard";
import {
	Step1Data,
	Step2Data,
	Step3Data,
	AssessmentCategory,
	SchoolCategory,
	DraftEvent,
	EventPaymentData,
} from "../../types/eventWizard";

const STEPS = [
	{ number: 1, title: "Informasi Dasar", description: "Judul, tanggal, lokasi" },
	{ number: 2, title: "Paket & Kategori", description: "Pilih paket & penilaian" },
	{ number: 3, title: "Media & Biaya", description: "Poster, juknis, biaya" },
	{ number: 4, title: "Pembayaran", description: "Konfirmasi & bayar" },
];

const CreateEventWizard: React.FC = () => {
	const navigate = useNavigate();
	const { draftId } = useParams<{ draftId?: string }>();

	// Current step
	const [currentStep, setCurrentStep] = useState(1);
	const [isLoading, setIsLoading] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isFetching, setIsFetching] = useState(true);
	// Edit mode: editing a completed event (wizardCompleted: true)
	const [isEditMode, setIsEditMode] = useState(false);

	// Draft ID (created after step 1)
	const [eventDraftId, setEventDraftId] = useState<string | null>(
		draftId || null
	);

	// Event title for payment step
	const [eventTitle, setEventTitle] = useState("");

	// Payment data
	const [existingPayment, setExistingPayment] = useState<EventPaymentData | null>(null);

	// Step 1 data
	const [step1Data, setStep1Data] = useState<Step1Data>({
		title: "",
		description: "",
		startDate: "",
		endDate: "",
		registrationDeadline: "",
		province: "",
		city: "",
		venue: "",
	});

	// Step 2 data
	const [step2Data, setStep2Data] = useState<Step2Data>({
		packageTier: null,
		assessmentCategoryIds: [],
		schoolCategoryLimits: [],
	});

	// Step 3 data
	const [step3Data, setStep3Data] = useState<Step3Data>({
		thumbnail: "",
		juknisUrl: "",
		registrationFee: 0,
		organizer: "",
		contactPersonName: "",
		contactEmail: "",
		contactPhone: "",
	});

	// Options
	const [assessmentCategories, setAssessmentCategories] = useState<
		AssessmentCategory[]
	>([]);
	const [schoolCategories, setSchoolCategories] = useState<SchoolCategory[]>(
		[]
	);

	// Errors
	const [errors, setErrors] = useState<Record<string, string>>({});

	// Load initial data
	useEffect(() => {
		const loadInitialData = async () => {
			setIsFetching(true);
			try {
				await Promise.all([
					fetchAssessmentCategories(),
					fetchSchoolCategories(),
					loadUserData(),
				]);

				// If we have a draft ID, load the draft
				if (draftId) {
					await loadDraft(draftId);
				}
			} catch (error) {
				console.error("Error loading initial data:", error);
			} finally {
				setIsFetching(false);
			}
		};

		loadInitialData();
	}, [draftId]);

	const fetchAssessmentCategories = async () => {
		try {
			const response = await api.get("/assessment-categories");
			setAssessmentCategories(
				response.data.filter((c: AssessmentCategory) => c.isActive)
			);
		} catch (error) {
			console.error("Error fetching assessment categories:", error);
		}
	};

	const fetchSchoolCategories = async () => {
		try {
			const response = await api.get("/school-categories");
			setSchoolCategories(
				response.data.filter((c: SchoolCategory) => c.isActive)
			);
		} catch (error) {
			console.error("Error fetching school categories:", error);
		}
	};

	const loadUserData = async () => {
		const userData = localStorage.getItem("user");
		if (userData) {
			const user = JSON.parse(userData);
			setStep3Data((prev) => ({
				...prev,
				organizer: user.name || "",
				contactEmail: user.email || "",
			}));
		}
	};

	const loadDraft = async (id: string) => {
		try {
			const response = await api.get(`/events/drafts/${id}`);
			const draft: DraftEvent = response.data;

			// For completed events (edit mode): start at step 1 for review
			// For drafts: resume at saved step
			if (draft.wizardCompleted) {
				setIsEditMode(true);
				setCurrentStep(1);
			} else {
				// Also set edit mode for existing drafts
				setIsEditMode(true);
				setCurrentStep(draft.wizardStep || 1);
			}

			// Store event title for payment step
			setEventTitle(draft.title || "");

			// Store existing payment data
			if (draft.eventPayment) {
				setExistingPayment(draft.eventPayment);
			}

			// Load Step 1 data
			setStep1Data({
				title: draft.title || "",
				description: draft.description || "",
				startDate: draft.startDate
					? new Date(draft.startDate).toISOString().slice(0, 10)
					: "",
				endDate: draft.endDate
					? new Date(draft.endDate).toISOString().slice(0, 10)
					: "",
				registrationDeadline: draft.registrationDeadline
					? new Date(draft.registrationDeadline).toISOString().slice(0, 10)
					: "",
				province: draft.province || "",
				city: draft.city || "",
				venue: draft.venue || "",
			});

			// Load Step 2 data
			setStep2Data({
				packageTier: (draft.packageTier as Step2Data['packageTier']) || null,
				assessmentCategoryIds: draft.assessmentCategories.map(
					(ac) => ac.assessmentCategory.id
				),
				schoolCategoryLimits: draft.schoolCategoryLimits.map((scl) => ({
					categoryId: scl.schoolCategory.id,
					maxParticipants: scl.maxParticipants,
				})),
			});

			// Load Step 3 data
			setStep3Data({
				thumbnail: draft.thumbnail || "",
				juknisUrl: draft.juknisUrl || "",
				registrationFee: draft.registrationFee
					? parseFloat(draft.registrationFee)
					: 0,
				organizer: draft.organizer || "",
				contactPersonName: draft.contactPersonName || "",
				contactEmail: draft.contactEmail || "",
				contactPhone: draft.contactPhone || "",
			});

			setEventDraftId(id);
		} catch (error) {
			console.error("Error loading draft:", error);
			showError("Gagal memuat draft event");
			navigate("/panitia/events/create");
		}
	};

	// Save Step 1 (Create draft)
	const saveStep1 = useCallback(async () => {
		setIsLoading(true);
		setErrors({});

		try {
			// Validate
			const newErrors: Record<string, string> = {};
			if (!step1Data.title.trim()) newErrors.title = "Judul wajib diisi";
			if (!step1Data.startDate) newErrors.startDate = "Tanggal mulai wajib diisi";
			if (!step1Data.endDate) newErrors.endDate = "Tanggal selesai wajib diisi";
			if (!step1Data.province) newErrors.province = "Provinsi wajib diisi";
			if (!step1Data.city) newErrors.city = "Kota/Kabupaten wajib diisi";

			if (Object.keys(newErrors).length > 0) {
				setErrors(newErrors);
				setIsLoading(false);
				return false;
			}

			if (eventDraftId) {
				// Update existing draft
				await api.patch(`/events/drafts/${eventDraftId}/step1`, step1Data);
			} else {
				// Create new draft
				const response = await api.post("/events/drafts", step1Data);
				setEventDraftId(response.data.event.id);
				// Update URL without full navigation
				window.history.replaceState(
					null,
					"",
					`/panitia/events/create/${response.data.event.id}`
				);
			}

			return true;
		} catch (error: any) {
			console.error("Error saving step 1:", error);
			showError(error.response?.data?.message || "Gagal menyimpan data");
			return false;
		} finally {
			setIsLoading(false);
		}
	}, [step1Data, eventDraftId, isEditMode]);

	// Save Step 2
	const saveStep2 = useCallback(async () => {
		setIsLoading(true);
		setErrors({});

		try {
			// Validate
			const newErrors: Record<string, string> = {};
			if (!step2Data.packageTier) {
				newErrors.packageTier = "Pilih paket terlebih dahulu";
			}

			// Only require categories for scoring packages
			const SCORING_TIERS = ['BRONZE', 'SILVER', 'GOLD'];
			const needsCategories = step2Data.packageTier && SCORING_TIERS.includes(step2Data.packageTier);

			if (needsCategories) {
				if (step2Data.assessmentCategoryIds.length === 0) {
					newErrors.assessmentCategoryIds = "Pilih minimal 1 kategori penilaian";
				}
				if (step2Data.schoolCategoryLimits.length === 0) {
					newErrors.schoolCategories = "Pilih minimal 1 kategori peserta";
				}
			}

			if (Object.keys(newErrors).length > 0) {
				setErrors(newErrors);
				setIsLoading(false);
				return false;
			}

			await api.patch(`/events/drafts/${eventDraftId}/step2`, {
				packageTier: step2Data.packageTier,
				assessmentCategoryIds: needsCategories ? step2Data.assessmentCategoryIds : [],
				schoolCategoryLimits: needsCategories ? step2Data.schoolCategoryLimits : [],
			});
			return true;
		} catch (error: any) {
			console.error("Error saving step 2:", error);
			showError(error.response?.data?.message || "Gagal menyimpan data");
			return false;
		} finally {
			setIsLoading(false);
		}
	}, [step2Data, eventDraftId]);

	// Save Step 3 (Media & Fee - no longer final step)
	const saveStep3 = useCallback(async () => {
		setIsSubmitting(true);
		setErrors({});

		try {
			await api.patch(`/events/drafts/${eventDraftId}/step3`, step3Data);
			// Update event title in case it changed
			setEventTitle(step1Data.title);
			return true;
		} catch (error: any) {
			console.error("Error saving step 3:", error);
			showError(error.response?.data?.message || "Gagal menyimpan data");
			return false;
		} finally {
			setIsSubmitting(false);
		}
	}, [step3Data, eventDraftId, step1Data.title]);

	// Handle next step
	const handleNextStep = async () => {
		let success = false;

		switch (currentStep) {
			case 1:
				success = await saveStep1();
				break;
			case 2:
				success = await saveStep2();
				break;
			case 3:
				success = await saveStep3();
				break;
			case 4:
				// Step 4 (payment) handles its own navigation
				navigate("/panitia/dashboard");
				return;
		}

		if (success) {
			setCurrentStep((prev) => Math.min(prev + 1, 4));
		}
	};

	// Handle previous step
	const handlePrevStep = () => {
		setCurrentStep((prev) => Math.max(prev - 1, 1));
	};

	// Handle cancel
	const handleCancel = async () => {
		const confirmed = await showConfirm(
			"Batalkan Pembuatan Event?",
			eventDraftId
				? "Draft akan tetap tersimpan dan dapat dilanjutkan nanti."
				: "Data yang sudah diisi akan hilang.",
			"Ya, Batalkan",
			"Lanjutkan Edit"
		);

		if (confirmed) {
			navigate("/panitia/dashboard");
		}
	};

	// Loading state
	if (isFetching) {
		return (
			<div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 dark:border-red-400 border-t-transparent mx-auto mb-4"></div>
					<p className="text-gray-600 dark:text-gray-400">Memuat data...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
			{/* Header */}
			<header className="bg-white/90 dark:bg-gray-800/80 backdrop-blur-md shadow-sm dark:shadow-gray-950/30 border-b border-gray-200 dark:border-gray-700/60 sticky top-0 z-50 transition-colors">
				<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between h-16">
						<div className="flex items-center gap-4">
							<button
								onClick={handleCancel}
								className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
							>
								<ArrowLeftIcon className="w-5 h-5" />
							</button>
							<Logo size="sm" variant="auto" />
							<div className="hidden sm:block">
								<span className="text-gray-300 dark:text-gray-600 mx-2">|</span>
								<span className="text-gray-600 dark:text-gray-300 font-medium">
									{isEditMode ? "Edit Event" : "Buat Event"}
								</span>
							</div>
						</div>

						<div className="flex items-center gap-3">
							<ThemeToggle />
							{eventDraftId && (
								<div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
									<CheckCircleIcon className="w-5 h-5" />
									<span className="hidden sm:inline">Draft tersimpan</span>
								</div>
							)}
						</div>
					</div>
				</div>
			</header>

			{/* Progress Steps */}
			<div className="bg-white/90 dark:bg-gray-800/60 backdrop-blur-md border-b border-gray-200 dark:border-gray-700/60 transition-colors">
				<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
					<div className="flex items-center justify-between">
						{STEPS.map((step, index) => {
							const isCompleted = currentStep > step.number;
							const isCurrent = currentStep === step.number;

							return (
								<React.Fragment key={step.number}>
									{/* Step indicator */}
									<div className="flex items-center">
										<div
											className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${
												isCompleted
													? "bg-green-500 dark:bg-green-600 text-white"
													: isCurrent
													? "bg-red-600 dark:bg-red-500 text-white ring-4 ring-red-100 dark:ring-red-900"
													: "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
											}`}
										>
											{isCompleted ? (
												<CheckCircleIcon className="w-6 h-6" />
											) : (
												step.number
											)}
										</div>
										<div className="ml-3 hidden sm:block">
											<p
												className={`text-sm font-medium ${
													isCurrent
														? "text-red-600 dark:text-red-400"
														: isCompleted
														? "text-green-600 dark:text-green-400"
														: "text-gray-500 dark:text-gray-400"
												}`}
											>
												{step.title}
											</p>
											<p className="text-xs text-gray-400 dark:text-gray-500">
												{step.description}
											</p>
										</div>
									</div>

									{/* Connector line */}
									{index < STEPS.length - 1 && (
										<div
											className={`flex-1 h-1 mx-4 rounded-full transition-all ${
												currentStep > step.number
													? "bg-green-500 dark:bg-green-600"
													: "bg-gray-200 dark:bg-gray-700"
											}`}
										/>
									)}
								</React.Fragment>
							);
						})}
					</div>
				</div>
			</div>

			{/* Main Content */}
			<main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Step Content */}
				{currentStep === 1 && (
					<WizardStep1BasicInfo
						data={step1Data}
						setData={setStep1Data}
						errors={errors}
						onNext={handleNextStep}
						isLoading={isLoading}
						isEditMode={isEditMode}
					/>
				)}

				{currentStep === 2 && (
					<WizardStep2Categories
						data={step2Data}
						setData={setStep2Data}
						assessmentCategories={assessmentCategories}
						schoolCategories={schoolCategories}
						errors={errors}
						onNext={handleNextStep}
						onBack={handlePrevStep}
						isLoading={isLoading}
						onCategoryCreated={(newCategory: AssessmentCategory) => {
							// Add new category to the list if not already present
							setAssessmentCategories((prev) => {
								const exists = prev.some((c) => c.id === newCategory.id);
								if (exists) return prev;
								return [...prev, newCategory].sort((a, b) => 
									(a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name)
								);
							});
						}}
					/>
				)}

				{currentStep === 3 && (
					<WizardStep3MediaFee
						data={step3Data}
						setData={setStep3Data}
						errors={errors}
						onNext={handleNextStep}
						onBack={handlePrevStep}
						isLoading={isLoading}
						isSubmitting={isSubmitting}
						isEditMode={isEditMode}
						packageTier={step2Data.packageTier}
					/>
				)}

				{currentStep === 4 && eventDraftId && (
					<WizardStep4Payment
						eventId={eventDraftId}
						eventTitle={eventTitle || step1Data.title}
						existingPayment={existingPayment}
						isEditMode={isEditMode}
						onNext={handleNextStep}
						onBack={handlePrevStep}
						packageTier={step2Data.packageTier}
						eventStartDate={step1Data.startDate}
						eventEndDate={step1Data.endDate}
						eventProvince={step1Data.province}
						eventCity={step1Data.city}
						eventVenue={step1Data.venue}
					/>
				)}
			</main>
		</div>
	);
};

export default CreateEventWizard;
