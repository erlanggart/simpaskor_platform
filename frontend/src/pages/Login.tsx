import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../utils/api";

const loginSchema = z.object({
	email: z.string().email("Format email tidak valid"),
	password: z.string().min(1, "Password harus diisi"),
});

type LoginForm = z.infer<typeof loginSchema>;

const Login = () => {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { login } = useAuth();
	const navigate = useNavigate();

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<LoginForm>({
		resolver: zodResolver(loginSchema),
	});

	const onSubmit = async (data: LoginForm) => {
		try {
			setIsLoading(true);
			setError(null);

			await login(data.email, data.password);

			// Get user data from localStorage (set by login function)
			const userData = localStorage.getItem("user");
			const user = userData ? JSON.parse(userData) : null;

			// If user is PANITIA, check for active assignment
			if (user && user.role === "PANITIA") {
				try {
					const response = await api.get("/api/panitia-assignment/current");

					if (response.data && response.data.event) {
						// Redirect to event management
						navigate(`/panitia/events/${response.data.event.id}/manage`);
						return;
					}
				} catch (error) {
					// No active assignment or error, continue to dashboard
					console.log("No active assignment found");
				}
			}

			navigate("/dashboard");
		} catch (err: any) {
			setError(
				err.response?.data?.message || "Login gagal. Silakan coba lagi."
			);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<>
			{/* Title Inside Form Card */}
			<div className="text-center mb-6">
				<h2 className="text-2xl font-bold bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
					Masuk ke Akun Anda
				</h2>
				<p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
					Sistem Paskibra Skor
				</p>
			</div>

			<form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
				{error && (
					<div className="bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl">
						{error}
					</div>
				)}

				<div className="space-y-4">
					<div>
						<label
							htmlFor="email"
							className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
						>
							Email
						</label>
						<input
							{...register("email")}
							type="email"
							id="email"
							className={`block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border ${
								errors.email
									? "border-red-300 dark:border-red-800"
									: "border-gray-300 dark:border-gray-600"
							} text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-600 focus:border-transparent transition-colors sm:text-sm`}
							placeholder="nama@email.com"
						/>
						{errors.email && (
							<p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
								{errors.email.message}
							</p>
						)}
					</div>

					<div>
						<label
							htmlFor="password"
							className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
						>
							Password
						</label>
						<input
							{...register("password")}
							type="password"
							id="password"
							className={`block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border ${
								errors.password
									? "border-red-300 dark:border-red-800"
									: "border-gray-300 dark:border-gray-600"
							} text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-600 focus:border-transparent transition-colors sm:text-sm`}
							placeholder="••••••••"
						/>
						{errors.password && (
							<p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
								{errors.password.message}
							</p>
						)}
					</div>
				</div>

				<div className="flex items-center justify-between mb-4">
					<div className="text-sm">
						<Link
							to="/forgot-password"
							className="font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
						>
							Lupa password?
						</Link>
					</div>
				</div>

				<div className="pt-2">
					<button
						type="submit"
						disabled={isLoading}
						className="w-full flex justify-center items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white text-sm font-medium rounded-xl shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
					>
						{isLoading ? (
							<>
								<svg
									className="animate-spin h-4 w-4"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle
										className="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										strokeWidth="4"
									></circle>
									<path
										className="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
								<span>Memproses...</span>
							</>
						) : (
							"Masuk"
						)}
					</button>
				</div>

				<div className="text-center pt-1">
					<p className="text-sm text-gray-600 dark:text-gray-400">
						Belum memiliki akun?{" "}
						<Link
							to="/register"
							className="font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
						>
							Daftar di sini
						</Link>
					</p>
				</div>
			</form>
		</>
	);
};

export default Login;
