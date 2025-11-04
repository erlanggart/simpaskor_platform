/// <reference types="vite/client" />

interface ImportMetaEnv {
	// API Configuration
	readonly VITE_API_URL: string;

	// Application Configuration
	readonly VITE_APP_TITLE: string;
	readonly VITE_APP_DESCRIPTION: string;
	readonly VITE_APP_VERSION: string;

	// Authentication Configuration
	readonly VITE_AUTH_TOKEN_KEY: string;
	readonly VITE_AUTH_USER_KEY: string;
	readonly VITE_SESSION_TIMEOUT: string;

	// UI/UX Configuration
	readonly VITE_DEFAULT_THEME: string;
	readonly VITE_ENABLE_DARK_MODE: string;
	readonly VITE_DEFAULT_LANGUAGE: string;

	// Feature Flags
	readonly VITE_ENABLE_REGISTRATION: string;
	readonly VITE_ENABLE_SOCIAL_LOGIN: string;
	readonly VITE_ENABLE_NOTIFICATIONS: string;
	readonly VITE_ENABLE_ANALYTICS: string;

	// Development Configuration
	readonly VITE_DEBUG_MODE: string;
	readonly VITE_API_TIMEOUT: string;
	readonly VITE_ENABLE_MOCK_DATA: string;

	// Build Configuration
	readonly VITE_BASE_URL: string;
	readonly VITE_GENERATE_SOURCEMAP: string;

	// Performance Configuration
	readonly VITE_ENABLE_SERVICE_WORKER: string;
	readonly VITE_ENABLE_LAZY_LOADING: string;

	// Third-party Integrations
	readonly VITE_GA_TRACKING_ID?: string;
	readonly VITE_GOOGLE_MAPS_API_KEY?: string;
	readonly VITE_FIREBASE_API_KEY?: string;
	readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
	readonly VITE_FIREBASE_PROJECT_ID?: string;
	readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
	readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
	readonly VITE_FIREBASE_APP_ID?: string;

	// Social Media & SEO
	readonly VITE_OG_TITLE: string;
	readonly VITE_OG_DESCRIPTION: string;
	readonly VITE_OG_IMAGE: string;
	readonly VITE_OG_URL: string;

	// Error Tracking
	readonly VITE_SENTRY_DSN?: string;
	readonly VITE_SENTRY_ENVIRONMENT?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
