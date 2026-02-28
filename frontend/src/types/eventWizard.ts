// Types for Event Creation Wizard

export interface Coupon {
	id: string;
	code: string;
	description: string | null;
	isUsed: boolean;
	expiresAt: string | null;
}

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
	couponId: string;
	title: string;
	description: string;
	startDate: string;
	endDate: string;
	registrationDeadline: string;
	location: string;
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
	contactEmail: string;
	contactPhone: string;
	status: 'DRAFT' | 'PUBLISHED';
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
	location: string | null;
	venue: string | null;
	registrationFee: string | null;
	organizer: string | null;
	contactEmail: string | null;
	contactPhone: string | null;
	status: string;
	wizardStep: number;
	wizardCompleted: boolean;
	couponId: string | null;
	coupon?: {
		id: string;
		code: string;
	} | null;
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
	coupons: Coupon[];
	errors: Record<string, string>;
	isEditMode?: boolean;
	currentCouponCode?: string;
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
