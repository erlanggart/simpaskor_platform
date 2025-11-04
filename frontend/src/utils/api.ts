import axios from "axios";
import { config } from "./config";

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
		if (error.response?.status === 401) {
			localStorage.removeItem(TOKEN_KEY);
			localStorage.removeItem(USER_KEY);
			window.location.href = "/login";
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
	role?: "PESERTA" | "PELATIH" | "JURI" | "PANITIA";
	phone?: string;
	institution?: string;
}

export interface User {
	id: string;
	email: string;
	name: string;
	phone?: string;
	role: "SUPERADMIN" | "PANITIA" | "JURI" | "PESERTA" | "PELATIH";
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
		const response = await api.post("/api/auth/login", data);
		return response.data;
	},

	register: async (data: RegisterRequest): Promise<AuthResponse> => {
		const response = await api.post("/api/auth/register", data);
		return response.data;
	},

	logout: async (): Promise<void> => {
		await api.post("/api/auth/logout");
		localStorage.removeItem(TOKEN_KEY);
		localStorage.removeItem(USER_KEY);
	},

	getProfile: async (): Promise<User> => {
		const response = await api.get("/api/auth/me");
		return response.data.user;
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
		const response = await api.get("/api/users", { params });
		return response.data;
	},

	getUser: async (userId: string): Promise<User> => {
		const response = await api.get(`/api/users/${userId}`);
		return response.data.user;
	},

	updateUser: async (userId: string, data: Partial<User>) => {
		const response = await api.put(`/api/users/${userId}`, data);
		return response.data;
	},

	updateProfile: async (userId: string, data: any) => {
		const response = await api.put(`/api/users/${userId}/profile`, data);
		return response.data;
	},

	deleteUser: async (userId: string) => {
		const response = await api.delete(`/api/users/${userId}`);
		return response.data;
	},
};

export default api;
