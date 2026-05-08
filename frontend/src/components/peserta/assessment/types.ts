export interface AssessmentEventParticipation {
	id: string;
	status: string;
	event: {
		id: string;
		title: string;
		slug: string | null;
		startDate: string;
		endDate: string;
		location: string | null;
		thumbnail: string | null;
		status: string;
	};
	groups: {
		id: string;
		groupName: string;
		orderNumber: number | null;
		schoolCategory: {
			id: string;
			name: string;
		} | null;
	}[];
	summary: {
		totalScore: number;
		totalMaterials: number;
		evaluatedMaterials: number;
		averageScore: number | null;
	};
}

export interface AssessmentMaterialScore {
	material: {
		id: string;
		name: string;
		number: number;
		categoryId: string;
		categoryName: string;
	};
	scores: {
		juryId: string;
		juryName: string;
		score: number | null;
		scoreCategoryName: string | null;
		isSkipped: boolean;
		skipReason: string | null;
		scoredAt: string | null;
	}[];
	totalScore: number;
	averageScore: number | null;
}

export interface AssessmentScoreCategory {
	categoryId: string;
	eventAssessmentCategoryId: string;
	categoryName: string;
	materials: AssessmentMaterialScore[];
	extraAdjustment: number;
}

export interface AssessmentExtraNilai {
	id: string;
	participantId: string;
	participantName: string | null;
	type: "PUNISHMENT" | "POINPLUS";
	scope: "GENERAL" | "CATEGORY" | "JUARA";
	assessmentCategoryId: string | null;
	assessmentCategoryName: string | null;
	juaraCategoryId: string | null;
	juaraCategoryName: string | null;
	value: number;
	adjustment: number;
	reason: string | null;
	createdAt: string;
}

export interface AssessmentExtraSummary {
	baseTotalScore: number;
	categoryExtraAdjustment: number;
	generalExtraAdjustment: number;
	juaraExtraAdjustment: number;
	totalAdjustment: number;
	punishment: number;
	poinplus: number;
}

export interface AssessmentScoreData {
	event: {
		id: string;
		title: string;
		slug: string;
	};
	participation: {
		id: string;
		groups: {
			id: string;
			groupName: string;
			schoolCategory: { id: string; name: string } | null;
		}[];
	};
	juries: { id: string; name: string }[];
	scoresByCategory: AssessmentScoreCategory[];
	extraNilai: AssessmentExtraNilai[];
	extraSummary: AssessmentExtraSummary;
	summary: {
		totalScore: number;
		totalMaterials: number;
		evaluatedMaterials: number;
		averageScore: number | null;
	};
}

export interface AssessmentPerformanceMaterialCheck {
	id: string;
	isChecked: boolean;
	notes: string | null;
	material: {
		id: string;
		name: string;
		description: string | null;
		number: number;
		eventAssessmentCategoryId: string;
		category: {
			id: string;
			name: string;
		} | null;
	} | null;
}

export interface AssessmentPerformanceSession {
	id: string;
	startTime: string | null;
	endTime: string | null;
	duration: number | null;
	status: string;
	notes: string | null;
	field: {
		id: string;
		name: string;
	};
	materialChecks: AssessmentPerformanceMaterialCheck[];
}

export interface AssessmentPerformanceCategory {
	categoryId: string;
	categoryName: string;
	totalScore: number;
	scoredMaterials: number;
	eventCount: number;
	averageScore: number;
}

export interface AssessmentPerformanceMaterial {
	materialId: string;
	materialName: string;
	materialNumber: number;
	categoryId: string;
	categoryName: string;
	eventId: string;
	eventTitle: string;
	eventSlug: string | null;
	averageScore: number;
	evaluationCount: number;
	latestScoredAt: string | null;
}

export interface AssessmentPerformanceSummary {
	summary: {
		totalEvents: number;
		eventsWithScores: number;
		totalScore: number;
		totalMaterials: number;
		evaluatedMaterials: number;
		averageScore: number | null;
		latestScoredAt: string | null;
	};
	categoryRankings: AssessmentPerformanceCategory[];
	strongestCategory: AssessmentPerformanceCategory | null;
	weakestCategory: AssessmentPerformanceCategory | null;
	highestMaterial: AssessmentPerformanceMaterial | null;
	lowestMaterial: AssessmentPerformanceMaterial | null;
	bestEvent: AssessmentEventParticipation | null;
}

export interface AssessmentDashboardData {
	participations: AssessmentEventParticipation[];
	performance: AssessmentPerformanceSummary;
}
