import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import api from "../utils/api";

// Declare google global type
declare global {
	interface Window {
		google: any;
	}
}

const registerSchema = z.object({
	email: z.string().email("Format email tidak valid"),
	password: z.string().min(8, "Password minimal 8 karakter"),
	name: z.string().min(1, "Nama harus diisi"),
	phone: z.string().optional(),
	institution: z.string().optional(),
});

type RegisterForm = z.infer<typeof registerSchema>;

const Register = () => {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showPassword, setShowPassword] = useState(false);
	const { register: registerUser, login } = useAuth();
	const navigate = useNavigate();
	const { executeRecaptcha } = useGoogleReCaptcha();

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<RegisterForm>({
		resolver: zodResolver(registerSchema),
	});

	// Initialize Google Sign-In
	useEffect(() => {
		const initializeGoogleSignIn = () => {
			if (window.google && window.google.accounts) {
				window.google.accounts.id.initialize({
					client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
					callback: handleGoogleSignIn,
				});
			}
		};

		// Load Google Sign-In script
		const script = document.createElement("script");
		script.src = "https://accounts.google.com/gsi/client";
		script.async = true;
		script.defer = true;
		script.onload = initializeGoogleSignIn;
		document.body.appendChild(script);

		return () => {
			document.body.removeChild(script);
		};
	}, []);

	// Handle Google Sign-In response
	const handleGoogleSignIn = async (response: any) => {
		try {
			setIsLoading(true);
			setError(null);

			// Send credential to backend
			const result = await api.post("/auth/google", {
				credential: response.credential,
			});

			// Save token and user
			localStorage.setItem("token", result.data.token);
			localStorage.setItem("user", JSON.stringify(result.data.user));

			// Navigate to dashboard
			navigate("/dashboard");
		} catch (err: any) {
			setError(
				err.response?.data?.message ||
					"Gagal masuk dengan Google. Silakan coba lagi."
			);
		} finally {
			setIsLoading(false);
		}
	};

	// Trigger Google Sign-In popup
	const triggerGoogleSignIn = () => {
		if (window.google && window.google.accounts) {
			window.google.accounts.id.prompt();
		} else {
			setError(
				"Google Sign-In belum siap. Silakan refresh halaman dan coba lagi."
			);
		}
	};

	const onSubmit = async (data: RegisterForm) => {
		try {
			setIsLoading(true);
			setError(null);

			// Check if reCAPTCHA is available
			if (!executeRecaptcha) {
				setError("reCAPTCHA tidak tersedia. Silakan refresh halaman.");
				setIsLoading(false);
				return;
			}

			// Execute reCAPTCHA and get token
			const recaptchaToken = await executeRecaptcha("register");

			// Add reCAPTCHA token to registration data
			const registrationData = {
				...data,
				role: "PESERTA", // Always register as PESERTA
				recaptchaToken,
			};

			await registerUser(registrationData);
			navigate("/dashboard");
		} catch (err: any) {
			const errorMessage = err.response?.data?.message;

			// Handle specific error cases
			if (err.response?.status === 429) {
				setError(
					errorMessage ||
						"Terlalu banyak percobaan registrasi. Silakan coba lagi setelah 1 jam."
				);
			} else if (errorMessage?.includes("reCAPTCHA")) {
				setError(
					errorMessage ||
						"Verifikasi keamanan gagal. Silakan refresh halaman dan coba lagi."
				);
			} else {
				setError(errorMessage || "Registrasi gagal. Silakan coba lagi.");
			}
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<>
			{/* Title Inside Form Card */}
			<div className="text-center mb-6">
				<h2 className="text-2xl font-bold bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
					Daftar Akun Baru
				</h2>
				<p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
					Bergabung dengan Simpaskor Platform
				</p>
			</div>

			<form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
				{error && (
					<div className="bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl">
						{error}
					</div>
				)}

				{/* Two Column Grid */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					{/* Column 1 */}
					<div className="space-y-4">
						<div>
							<label
								htmlFor="name"
								className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
							>
								Nama Lengkap
							</label>
							<input
								{...register("name")}
								type="text"
								id="name"
								className={`block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border ${
									errors.name
										? "border-red-300 dark:border-red-800"
										: "border-gray-300 dark:border-gray-600"
								} text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-600 focus:border-transparent transition-colors sm:text-sm`}
								placeholder="John Doe"
							/>
							{errors.name && (
								<p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
									{errors.name.message}
								</p>
							)}
						</div>

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
								placeholder="john@example.com"
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
							<div className="relative">
								<input
									{...register("password")}
									type={showPassword ? "text" : "password"}
									id="password"
									className={`block w-full px-4 py-2.5 pr-12 bg-gray-50 dark:bg-gray-900/50 border ${
										errors.password
											? "border-red-300 dark:border-red-800"
											: "border-gray-300 dark:border-gray-600"
									} text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-600 focus:border-transparent transition-colors sm:text-sm`}
									placeholder="Minimal 8 karakter"
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
									tabIndex={-1}
								>
									{showPassword ? (
										<EyeSlashIcon className="h-5 w-5" />
									) : (
										<EyeIcon className="h-5 w-5" />
									)}
								</button>
							</div>
							{errors.password && (
								<p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
									{errors.password.message}
								</p>
							)}
						</div>
					</div>

					{/* Column 2 */}
					<div className="space-y-4">
						<div>
							<label
								htmlFor="phone"
								className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
							>
								No. Telepon{" "}
								<span className="text-gray-400 dark:text-gray-500">
									(Opsional)
								</span>
							</label>
							<input
								{...register("phone")}
								type="tel"
								id="phone"
								className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-600 focus:border-transparent transition-colors sm:text-sm"
								placeholder="+62812345678"
							/>
						</div>

						<div>
							<label
								htmlFor="institution"
								className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
							>
								Institusi{" "}
								<span className="text-gray-400 dark:text-gray-500">
									(Opsional)
								</span>
							</label>
							<input
								{...register("institution")}
								type="text"
								id="institution"
								className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-600 focus:border-transparent transition-colors sm:text-sm"
								placeholder="Nama sekolah/universitas"
							/>
						</div>
					</div>
				</div>
				{/* Divider */}
				<div className="relative">
					<div className="absolute inset-0 flex items-center">
						<div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
					</div>
					<div className="relative flex justify-center text-sm">
						<span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
							Daftar sebagai Peserta
						</span>
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
							"Daftar"
						)}
					</button>
				</div>

				{/* Google Sign-In */}
				<div className="relative">
					<div className="absolute inset-0 flex items-center">
						<div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
					</div>
					<div className="relative flex justify-center text-xs">
						<span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
							Atau
						</span>
					</div>
				</div>

				<div>
					<button
						type="button"
						onClick={triggerGoogleSignIn}
						disabled={isLoading}
						className="w-full flex justify-center items-center gap-3 px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
					>
						<svg className="h-5 w-5" viewBox="0 0 24 24">
							<path
								fill="#4285F4"
								d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
							/>
							<path
								fill="#34A853"
								d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
							/>
							<path
								fill="#FBBC05"
								d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
							/>
							<path
								fill="#EA4335"
								d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
							/>
						</svg>
						<span>Daftar dengan Google</span>
					</button>
				</div>

				{/* reCAPTCHA Badge */}
				<div className="text-center text-xs text-gray-500 dark:text-gray-400 pt-2">
					This site is protected by reCAPTCHA and the Google{" "}
					<a
						href="https://policies.google.com/privacy"
						target="_blank"
						rel="noopener noreferrer"
						className="text-red-600 dark:text-red-400 hover:underline"
					>
						Privacy Policy
					</a>{" "}
					and{" "}
					<a
						href="https://policies.google.com/terms"
						target="_blank"
						rel="noopener noreferrer"
						className="text-red-600 dark:text-red-400 hover:underline"
					>
						Terms of Service
					</a>{" "}
					apply.
				</div>

				<div className="text-center pt-1">
					<p className="text-sm text-gray-600 dark:text-gray-400">
						Sudah memiliki akun?{" "}
						<Link
							to="/login"
							className="font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
						>
							Masuk di sini
						</Link>
					</p>
				</div>
			</form>
		</>
	);
};

export default Register;
