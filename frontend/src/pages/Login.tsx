import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";

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
		<div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-md w-full space-y-8">
				<div>
					<div className="text-center">
						<Link
							to="/"
							className="inline-flex items-center text-indigo-600 hover:text-indigo-800 mb-4"
						>
							← Kembali ke Beranda
						</Link>
					</div>
					<h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
						Masuk ke Akun Anda
					</h2>
					<p className="mt-2 text-center text-sm text-gray-600">
						Sistem Informasi Simpaskor Platform
					</p>
				</div>

				<form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
					{error && (
						<div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
							{error}
						</div>
					)}

					<div className="space-y-4">
						<div>
							<label
								htmlFor="email"
								className="block text-sm font-medium text-gray-700"
							>
								Email
							</label>
							<input
								{...register("email")}
								type="email"
								id="email"
								className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
									errors.email ? "border-red-300" : "border-gray-300"
								} placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
								placeholder="Masukkan email Anda"
							/>
							{errors.email && (
								<p className="mt-1 text-sm text-red-600">
									{errors.email.message}
								</p>
							)}
						</div>

						<div>
							<label
								htmlFor="password"
								className="block text-sm font-medium text-gray-700"
							>
								Password
							</label>
							<input
								{...register("password")}
								type="password"
								id="password"
								className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
									errors.password ? "border-red-300" : "border-gray-300"
								} placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
								placeholder="Masukkan password Anda"
							/>
							{errors.password && (
								<p className="mt-1 text-sm text-red-600">
									{errors.password.message}
								</p>
							)}
						</div>
					</div>

					<div>
						<button
							type="submit"
							disabled={isLoading}
							className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isLoading ? "Memproses..." : "Masuk"}
						</button>
					</div>

					<div className="text-center">
						<p className="text-sm text-gray-600">
							Belum memiliki akun?{" "}
							<Link
								to="/register"
								className="font-medium text-indigo-600 hover:text-indigo-500"
							>
								Daftar di sini
							</Link>
						</p>
					</div>
				</form>

				{/* Demo Accounts Info */}
				<div className="mt-8 p-4 bg-blue-50 rounded-md">
					<h3 className="text-sm font-medium text-blue-800 mb-2">Akun Demo:</h3>
					<div className="text-xs text-blue-700 space-y-1">
						<div>
							<strong>Superadmin:</strong> superadmin@simpaskor.com / Admin123!
						</div>
						<div>
							<strong>Panitia:</strong> panitia@simpaskor.com / Panitia123!
						</div>
						<div>
							<strong>Juri:</strong> juri@simpaskor.com / Juri123!
						</div>
						<div>
							<strong>Pelatih:</strong> pelatih@simpaskor.com / Pelatih123!
						</div>
						<div>
							<strong>Peserta:</strong> peserta@simpaskor.com / Peserta123!
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Login;
