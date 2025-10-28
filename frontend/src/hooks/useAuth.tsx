import {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
} from "react";
import { User, authAPI } from "../utils/api";

interface AuthContextType {
	user: User | null;
	token: string | null;
	isLoading: boolean;
	login: (email: string, password: string) => Promise<void>;
	register: (data: any) => Promise<void>;
	logout: () => void;
	isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
	children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
	const [user, setUser] = useState<User | null>(null);
	const [token, setToken] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const savedToken = localStorage.getItem("token");
		const savedUser = localStorage.getItem("user");

		if (savedToken && savedUser) {
			setToken(savedToken);
			setUser(JSON.parse(savedUser));
		}
		setIsLoading(false);
	}, []);

	const login = async (email: string, password: string) => {
		try {
			setIsLoading(true);
			const response = await authAPI.login({ email, password });

			setUser(response.user);
			setToken(response.token);

			localStorage.setItem("token", response.token);
			localStorage.setItem("user", JSON.stringify(response.user));
		} catch (error) {
			throw error;
		} finally {
			setIsLoading(false);
		}
	};

	const register = async (data: any) => {
		try {
			setIsLoading(true);
			const response = await authAPI.register(data);

			setUser(response.user);
			setToken(response.token);

			localStorage.setItem("token", response.token);
			localStorage.setItem("user", JSON.stringify(response.user));
		} catch (error) {
			throw error;
		} finally {
			setIsLoading(false);
		}
	};

	const logout = () => {
		setUser(null);
		setToken(null);
		localStorage.removeItem("token");
		localStorage.removeItem("user");
		authAPI.logout().catch(console.error);
	};

	const value = {
		user,
		token,
		isLoading,
		login,
		register,
		logout,
		isAuthenticated: !!user && !!token,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};
