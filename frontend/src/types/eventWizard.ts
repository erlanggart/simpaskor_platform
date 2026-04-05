// Types for Event Creation Wizard

export interface AssessmentCategory {
	id: string;
	name: string;
	description: string | null;
	order: number;
	isActive: boolean;
}

export interface SchoolCategory {
	id: string;
	name: string;
	description: string | null;
	order: number;
	isActive: boolean;
}

export interface SchoolCategoryLimit {
	categoryId: string;
	maxParticipants: number;
}

// Step 1: Basic Information
export interface Step1Data {
	title: string;
	description: string;
	startDate: string;
	endDate: string;
	registrationDeadline: string;
	province: string;
	city: string;
	venue: string;
}

// Step 2: Categories
export interface Step2Data {
	assessmentCategoryIds: string[];
	schoolCategoryLimits: SchoolCategoryLimit[];
}

// Step 3: Media & Contact
export interface Step3Data {
	thumbnail: string;
	juknisUrl: string;
	registrationFee: number;
	organizer: string;
	contactPersonName: string;
	contactEmail: string;
	contactPhone: string;
}

// Step 4: Payment
export type PackageTier = 'BRONZE' | 'SILVER' | 'GOLD';

export interface EventPaymentData {
	id: string;
	eventId: string;
	packageTier: PackageTier;
	amount: number;
	status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
	snapToken: string | null;
	midtransOrderId: string | null;
	paidAt: string | null;
}

// Full Event Draft Data
export interface EventDraftData extends Step1Data, Step2Data, Step3Data {}

// Draft Event from API
export interface DraftEvent {
	id: string;
	title: string;
	slug: string | null;
	description: string | null;
	thumbnail: string | null;
	juknisUrl: string | null;
	startDate: string;
	endDate: string;
	registrationDeadline: string | null;
	province: string | null;
	city: string | null;
	venue: string | null;
	registrationFee: string | null;
	organizer: string | null;
	contactPersonName: string | null;
	contactEmail: string | null;
	contactPhone: string | null;
	status: string;
	wizardStep: number;
	wizardCompleted: boolean;
	couponId: string | null;
	packageTier: string | null;
	paymentStatus: string | null;
	eventPayment?: EventPaymentData | null;
	assessmentCategories: {
		id: string;
		assessmentCategory: AssessmentCategory;
	}[];
	schoolCategoryLimits: {
		id: string;
		maxParticipants: number;
		schoolCategory: SchoolCategory;
	}[];
	createdAt: string;
	updatedAt: string;
}

// Wizard Step Props
export interface WizardStepProps {
	onNext: () => void;
	onBack?: () => void;
	onSave?: () => Promise<void>;
	isLoading?: boolean;
}

export interface Step1Props extends WizardStepProps {
	data: Step1Data;
	setData: React.Dispatch<React.SetStateAction<Step1Data>>;
	errors: Record<string, string>;
	isEditMode?: boolean;
}

export interface Step2Props extends WizardStepProps {
	data: Step2Data;
	setData: React.Dispatch<React.SetStateAction<Step2Data>>;
	assessmentCategories: AssessmentCategory[];
	schoolCategories: SchoolCategory[];
	errors: Record<string, string>;
}

export interface Step3Props extends WizardStepProps {
	data: Step3Data;
	setData: React.Dispatch<React.SetStateAction<Step3Data>>;
	errors: Record<string, string>;
	isSubmitting?: boolean;
	isEditMode?: boolean;
}

export interface Step4Props extends WizardStepProps {
	eventId: string;
	eventTitle: string;
	existingPayment?: EventPaymentData | null;
	isEditMode?: boolean;
}
