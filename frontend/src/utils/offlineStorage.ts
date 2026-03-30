// Offline Storage Utility for Material Scoring

export interface MaterialScore {
	materialId: string;
	score: number | null;
	scoreCategoryName: string | null;
	isSkipped: boolean;
	skipReason: string | null;
	notes: string;
	scoredAt: string | null;
}

export interface OfflineParticipantData {
	participantId: string;
	eventSlug: string;
	eventId: string;
	scores: MaterialScore[];
	savedAt: string;
	participantName?: string;
	schoolCategoryName?: string;
}

const OFFLINE_STORAGE_KEY = 'simpaskor_offline_scores';

// Get all offline data
export function getAllOfflineData(): OfflineParticipantData[] {
	try {
		const stored = localStorage.getItem(OFFLINE_STORAGE_KEY);
		if (stored) {
			return JSON.parse(stored);
		}
	} catch (error) {
		console.error('Error reading offline data:', error);
	}
	return [];
}

// Get offline data for a specific event
export function getOfflineDataByEvent(eventSlug: string): OfflineParticipantData[] {
	return getAllOfflineData().filter(data => data.eventSlug === eventSlug);
}

// Get offline data for a specific participant
export function getOfflineDataForParticipant(eventSlug: string, participantId: string): OfflineParticipantData | null {
	const allData = getAllOfflineData();
	return allData.find(
		data => data.eventSlug === eventSlug && data.participantId === participantId
	) || null;
}

// Check if there's offline data for a participant
export function hasOfflineData(eventSlug: string, participantId: string): boolean {
	return getOfflineDataForParticipant(eventSlug, participantId) !== null;
}

// Save offline data for a participant
export function saveOfflineData(data: OfflineParticipantData): void {
	try {
		const allData = getAllOfflineData();
		const existingIndex = allData.findIndex(
			d => d.eventSlug === data.eventSlug && d.participantId === data.participantId
		);
		
		if (existingIndex >= 0) {
			allData[existingIndex] = data;
		} else {
			allData.push(data);
		}
		
		localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(allData));
	} catch (error) {
		console.error('Error saving offline data:', error);
	}
}

// Remove offline data for a participant
export function removeOfflineData(eventSlug: string, participantId: string): void {
	try {
		const allData = getAllOfflineData();
		const filtered = allData.filter(
			d => !(d.eventSlug === eventSlug && d.participantId === participantId)
		);
		localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(filtered));
	} catch (error) {
		console.error('Error removing offline data:', error);
	}
}

// Clear all offline data
export function clearAllOfflineData(): void {
	try {
		localStorage.removeItem(OFFLINE_STORAGE_KEY);
	} catch (error) {
		console.error('Error clearing offline data:', error);
	}
}

// Get participant IDs with offline data for an event
export function getParticipantIdsWithOfflineData(eventSlug: string): string[] {
	return getOfflineDataByEvent(eventSlug).map(d => d.participantId);
}

// Count total offline entries
export function countOfflineData(): number {
	return getAllOfflineData().length;
}

// Hook for online status
export function isOnline(): boolean {
	return navigator.onLine;
}

// ============ API Response Cache for Offline Mode ============
const CACHE_PREFIX = 'simpaskor_cache_';

export function cacheApiResponse(key: string, data: unknown): void {
	try {
		localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
			data,
			cachedAt: new Date().toISOString(),
		}));
	} catch (error) {
		console.error('Error caching API response:', error);
	}
}

export function getCachedApiResponse<T = unknown>(key: string): { data: T; cachedAt: string } | null {
	try {
		const stored = localStorage.getItem(CACHE_PREFIX + key);
		if (stored) {
			return JSON.parse(stored);
		}
	} catch (error) {
		console.error('Error reading cached API response:', error);
	}
	return null;
}
