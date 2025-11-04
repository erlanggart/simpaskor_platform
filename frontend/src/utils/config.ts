/**
 * Application configuration from environment variables
 * Centralized configuration management for the frontend application
 */

// Helper function to convert string to boolean
const toBool = (value: string | undefined): boolean => {
	return value === "true";
};

// Helper function to convert string to number
const toNumber = (value: string | undefined, defaultValue: number): number => {
	return value ? parseInt(value, 10) : defaultValue;
};

export const config = {
	// API Configuration
	api: {
		baseUrl: import.meta.env.VITE_API_URL || "http://localhost:3001/api",
		backendUrl: import.meta.env.VITE_BACKEND_URL || "http://localhost:3001",
		timeout: toNumber(import.meta.env.VITE_API_TIMEOUT, 10000),
	},

	// Application Information
	app: {
		title: import.meta.env.VITE_APP_TITLE || "Simpaskor Platform",
		description:
			import.meta.env.VITE_APP_DESCRIPTION ||
			"Platform Kompetisi Terdepan Indonesia",
		version: import.meta.env.VITE_APP_VERSION || "1.0.0",
		baseUrl: import.meta.env.VITE_BASE_URL || "/",
	},

	// Authentication Settings
	auth: {
		tokenKey: import.meta.env.VITE_AUTH_TOKEN_KEY || "token",
		userKey: import.meta.env.VITE_AUTH_USER_KEY || "user",
		sessionTimeout: toNumber(import.meta.env.VITE_SESSION_TIMEOUT, 1440), // minutes
	},

	// UI/UX Settings
	ui: {
		defaultTheme: import.meta.env.VITE_DEFAULT_THEME || "light",
		enableDarkMode: toBool(import.meta.env.VITE_ENABLE_DARK_MODE),
		defaultLanguage: import.meta.env.VITE_DEFAULT_LANGUAGE || "id",
	},

	// Feature Flags
	features: {
		enableRegistration: toBool(import.meta.env.VITE_ENABLE_REGISTRATION),
		enableSocialLogin: toBool(import.meta.env.VITE_ENABLE_SOCIAL_LOGIN),
		enableNotifications: toBool(import.meta.env.VITE_ENABLE_NOTIFICATIONS),
		enableAnalytics: toBool(import.meta.env.VITE_ENABLE_ANALYTICS),
		enableMockData: toBool(import.meta.env.VITE_ENABLE_MOCK_DATA),
	},

	// Development Settings
	dev: {
		debugMode: toBool(import.meta.env.VITE_DEBUG_MODE),
		isDevelopment: import.meta.env.DEV,
		isProduction: import.meta.env.PROD,
	},

	// Build Settings
	build: {
		generateSourcemap: toBool(import.meta.env.VITE_GENERATE_SOURCEMAP),
	},

	// Performance Settings
	performance: {
		enableServiceWorker: toBool(import.meta.env.VITE_ENABLE_SERVICE_WORKER),
		enableLazyLoading: toBool(import.meta.env.VITE_ENABLE_LAZY_LOADING),
	},

	// Third-party Integrations
	integrations: {
		googleAnalytics: {
			trackingId: import.meta.env.VITE_GA_TRACKING_ID,
		},
		googleMaps: {
			apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
		},
		firebase: {
			apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
			authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
			projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
			storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
			messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
			appId: import.meta.env.VITE_FIREBASE_APP_ID,
		},
		sentry: {
			dsn: import.meta.env.VITE_SENTRY_DSN,
			environment: import.meta.env.VITE_SENTRY_ENVIRONMENT,
		},
	},

	// SEO & Social Media
	seo: {
		ogTitle: import.meta.env.VITE_OG_TITLE || "Simpaskor Platform",
		ogDescription:
			import.meta.env.VITE_OG_DESCRIPTION ||
			"Platform Kompetisi Terdepan Indonesia",
		ogImage: import.meta.env.VITE_OG_IMAGE || "/og-image.jpg",
		ogUrl: import.meta.env.VITE_OG_URL || "https://simpaskor.com",
	},
};

// Validation function to check required environment variables
export const validateConfig = (): void => {
	const requiredVars = ["VITE_API_URL"];

	const missing = requiredVars.filter(
		(varName) => !import.meta.env[varName as keyof ImportMetaEnv]
	);

	if (missing.length > 0) {
		console.error("Missing required environment variables:", missing);
		if (config.dev.isProduction) {
			throw new Error(
				`Missing required environment variables: ${missing.join(", ")}`
			);
		}
	}
};

// Debug logging in development
if (config.dev.debugMode) {
	console.group("🔧 Application Configuration");
	console.log("API Base URL:", config.api.baseUrl);
	console.log(
		"Environment:",
		config.dev.isDevelopment ? "Development" : "Production"
	);
	console.log("Debug Mode:", config.dev.debugMode);
	console.log("Features:", config.features);
	console.groupEnd();
}

// Validate configuration on load
validateConfig();

export default config;
