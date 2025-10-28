import axios from "axios";

const API_BASE_URL =
	(import.meta as any).env?.VITE_API_URL || "http://localhost:3001";

export const api = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		"Content-Type": "application/json",
	},
	withCredentials: true, // Enable credentials for CORS
	timeout: 10000, // 10 second timeout
});

// Request interceptor untuk menambahkan token
api.interceptors.request.use((config) => {
	const token = localStorage.getItem("token");
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
			localStorage.removeItem("token");
			localStorage.removeItem("user");
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
	firstName: string;
	lastName: string;
	role?: "PESERTA" | "PELATIH";
	phone?: string;
	institution?: string;
}

export interface User {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	role: "SUPERADMIN" | "PANITIA" | "JURI" | "PESERTA" | "PELATIH";
	status: "ACTIVE" | "INACTIVE" | "PENDING" | "SUSPENDED";
	emailVerified: boolean;
	lastLogin?: string;
	createdAt: string;
	profile?: {
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
		localStorage.removeItem("token");
		localStorage.removeItem("user");
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
