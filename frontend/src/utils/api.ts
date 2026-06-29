import axios from "axios";
import { config } from "./config";
import type { SweetAlertOptions, SweetAlertResult } from "sweetalert2";

// Extend axios's request config with a `silent` flag. When set, the global
// response interceptor below skips the timeout / network-error Swal popup —
// background pollers (live widgets, heartbeats) must never disrupt the UI.
declare module "axios" {
	interface AxiosRequestConfig {
		silent?: boolean;
	}
	interface InternalAxiosRequestConfig {
		silent?: boolean;
	}
}

// Lazy-load sweetalert2 so it does not bloat the initial entry bundle.
// The popup is only needed when an API call actually fails — for the typical
// happy-path landing visit, we never download ~80 KB of dialog code.
let swalPromise: Promise<typeof import("sweetalert2").default> | null = null;
const loadSwal = () => {
	if (!swalPromise) {
		swalPromise = import("sweetalert2").then((m) => m.default);
	}
	return swalPromise;
};
const fireAlert = (options: SweetAlertOptions): Promise<SweetAlertResult> =>
	loadSwal().then((Swal) => Swal.fire(options));

// Debug log for development
if (config.dev.debugMode) {
	console.log("🌐 API Configuration:", {
		baseUrl: config.api.baseUrl,
		timeout: config.api.timeout,
	});
}

export const api = axios.create({
	baseURL: config.api.baseUrl,
	headers: {
		"Content-Type": "application/json",
	},
	withCredentials: true, // Enable credentials for CORS
	timeout: config.api.timeout, // Configurable timeout
});

// Configuration constants from environment
const TOKEN_KEY = config.auth.tokenKey;
const USER_KEY = config.auth.userKey;

// Request interceptor untuk menambahkan token
api.interceptors.request.use((config) => {
	const token = localStorage.getItem(TOKEN_KEY);
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

// Response interceptor untuk handle error
api.interceptors.response.use(
	(response) => response,
	(error) => {
		// Ignore canceled/aborted requests entirely. These happen on normal
		// navigation (component unmount, tab switch, page reload while a
		// request is in flight) and are NOT connection failures — showing a
		// "Koneksi Terputus" popup for them falsely tells users with perfectly
		// good internet that they're offline.
		if (axios.isCancel(error) || error.code === "ERR_CANCELED") {
			return Promise.reject(error);
		}

		// Handle 429 Rate Limiting
		if (error.response?.status === 429) {
			const retryAfter = error.response.headers['retry-after'];
			const waitTime = retryAfter ? `${retryAfter} detik` : 'beberapa saat';

			void fireAlert({
				icon: "warning",
				title: "Terlalu Banyak Permintaan",
				html: `
					<p>Anda telah mencapai batas maksimal permintaan.</p>
					<p>Silakan tunggu <strong>${waitTime}</strong> sebelum mencoba lagi.</p>
				`,
				confirmButtonText: "Mengerti",
				confirmButtonColor: "#f59e0b",
				allowOutsideClick: false,
				timer: 5000,
				timerProgressBar: true,
			});

			return Promise.reject(error);
		}
		
		// Handle 401 Unauthorized
		if (error.response?.status === 401) {
			// Dapatkan URL request yang error
			const requestUrl = error.config?.url || '';
			
			// Jangan handle otomatis untuk endpoint autentikasi (login/register/google)
			// Biarkan component menangani error ini dengan pesan yang sesuai
			const isAuthEndpoint = requestUrl.includes('/auth/login') || 
			                      requestUrl.includes('/auth/register') || 
			                      requestUrl.includes('/auth/google');
			
			if (!isAuthEndpoint) {
				// Ini adalah session expired untuk authenticated route
				localStorage.removeItem(TOKEN_KEY);
				localStorage.removeItem(USER_KEY);

				void fireAlert({
					icon: "error",
					title: "Sesi Berakhir",
					text: "Sesi Anda telah berakhir. Silakan login kembali.",
					confirmButtonText: "Login",
					allowOutsideClick: false,
				}).then(() => {
					window.location.href = "/login";
				});
			}
			
			return Promise.reject(error);
		}
		
		// Handle Network Error
		if (!error.response) {
			// Don't show global popup for upload requests (handled locally) or
			// for any request that opted out via `silent: true` in axios config
			// (background pollers, live widgets, heartbeats — they handle their
			// own inline error state).
			const isUploadRequest = error.config?.url?.includes('/upload/');
			const isSilent = error.config?.silent === true;
			if (!isUploadRequest && !isSilent) {
				const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
				void fireAlert({
					icon: "error",
					title: isTimeout ? "Request Timeout" : "Koneksi Terputus",
					text: isTimeout
						? "Server terlalu lama merespons. Silakan coba lagi."
						: "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.",
					confirmButtonText: "OK",
				});
			}
		}
		
		return Promise.reject(error);
	}
);

export interface LoginRequest {
	email: string;
	password: string;
}

export interface RegisterRequest {
	email: string;
	password: string;
	name: string;
	role?: "PESERTA" | "PELATIH" | "JURI" | "PANITIA" | "MITRA";
	phone?: string;
	institution?: string;
}

export interface User {
	id: string;
	email: string;
	name: string;
	phone?: string;
	role: "SUPERADMIN" | "PANITIA" | "JURI" | "PESERTA" | "PELATIH" | "MITRA";
	status: "ACTIVE" | "INACTIVE" | "PENDING" | "SUSPENDED";
	emailVerified: boolean;
	lastLogin?: string;
	createdAt: string;
	profile?: {
		avatar?: string;
		bio?: string;
		institution?: string;
		address?: string;
		city?: string;
		province?: string;
		birthDate?: string;
		gender?: string;
	};
}

export interface AuthResponse {
	message: string;
	user: User;
	token: string;
}

export const authAPI = {
	login: async (data: LoginRequest): Promise<AuthResponse> => {
		const response = await api.post("/auth/login", data);
		return response.data;
	},

	register: async (data: RegisterRequest): Promise<AuthResponse> => {
		const response = await api.post("/auth/register", data);
		return response.data;
	},

	logout: async (): Promise<void> => {
		await api.post("/auth/logout");
		localStorage.removeItem(TOKEN_KEY);
		localStorage.removeItem(USER_KEY);
	},

	verifyEmail: async (token: string): Promise<AuthResponse> => {
		const response = await api.post("/auth/verify-email", { token });
		return response.data;
	},

	resendVerification: async (): Promise<{ message: string }> => {
		const response = await api.post("/auth/resend-verification");
		return response.data;
	},

	getProfile: async (): Promise<User> => {
		const response = await api.get("/auth/me");
		return response.data.user;
	},

	sendLocation: async (data: {
		latitude?: number;
		longitude?: number;
		accuracy?: number;
		status: "GRANTED" | "DENIED";
	}): Promise<{ message: string; locationLabel?: string | null }> => {
		const response = await api.post("/auth/location", data);
		return response.data;
	},
};

export const activityAPI = {
	logPage: async (path: string, title?: string): Promise<void> => {
		try {
			await api.post("/activity/page", { path, title });
		} catch {
			// non-blocking
		}
	},

	getActivity: async (params?: {
		page?: number;
		limit?: number;
		userId?: string;
		action?: string;
		search?: string;
	}): Promise<{ logs: any[]; pagination: any }> => {
		const response = await api.get("/activity", { params });
		return response.data;
	},

	getSessions: async (): Promise<{ sessions: any[] }> => {
		const response = await api.get("/activity/sessions");
		return response.data;
	},
};

export interface MailUsage {
	dailyLimit: number;
	warnThreshold: number;
	totals: { all: number; today: number; month: number };
	failedToday: number;
	byCategory: {
		category: string;
		all: number;
		today: number;
		month: number;
		failed: number;
	}[];
	recent: {
		id: string;
		category: string;
		recipient: string;
		recipientName: string | null;
		userId: string | null;
		subject: string;
		status: string;
		error: string | null;
		createdAt: string;
	}[];
}

export const mailAPI = {
	getUsage: async (params?: {
		category?: string;
		limit?: number;
	}): Promise<MailUsage> => {
		const response = await api.get("/admin/mail", { params });
		return response.data;
	},
};

export const userAPI = {
	getUsers: async (params?: {
		page?: number;
		limit?: number;
		role?: string;
		status?: string;
		search?: string;
	}) => {
		const response = await api.get("/users", { params });
		return response.data;
	},

	getUser: async (userId: string): Promise<User> => {
		const response = await api.get(`/users/${userId}`);
		return response.data.user;
	},

	updateUser: async (userId: string, data: Partial<User>) => {
		const response = await api.put(`/users/${userId}`, data);
		return response.data;
	},

	updateProfile: async (userId: string, data: any) => {
		const response = await api.put(`/users/${userId}/profile`, data);
		return response.data;
	},

	deleteUser: async (userId: string) => {
		const response = await api.delete(`/users/${userId}`);
		return response.data;
	},
};

export default api;
