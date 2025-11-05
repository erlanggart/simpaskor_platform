import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";

const registerSchema = z.object({
	email: z.string().email("Format email tidak valid"),
	password: z.string().min(8, "Password minimal 8 karakter"),
	name: z.string().min(1, "Nama harus diisi"),
	role: z.enum(["PESERTA", "PELATIH", "JURI", "PANITIA"]),
	phone: z.string().optional(),
	institution: z.string().optional(),
});

type RegisterForm = z.infer<typeof registerSchema>;

const Register = () => {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { register: registerUser } = useAuth();
	const navigate = useNavigate();

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<RegisterForm>({
		resolver: zodResolver(registerSchema),
		defaultValues: {
			role: "PESERTA",
		},
	});

	const onSubmit = async (data: RegisterForm) => {
		try {
			setIsLoading(true);
			setError(null);

			await registerUser(data);
			navigate("/dashboard");
		} catch (err: any) {
			setError(
				err.response?.data?.message || "Registrasi gagal. Silakan coba lagi."
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
							<input
								{...register("password")}
								type="password"
								id="password"
								className={`block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border ${
									errors.password
										? "border-red-300 dark:border-red-800"
										: "border-gray-300 dark:border-gray-600"
								} text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-600 focus:border-transparent transition-colors sm:text-sm`}
								placeholder="Minimal 8 karakter"
							/>
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
								htmlFor="role"
								className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
							>
								Role
							</label>
							<select
								{...register("role")}
								id="role"
								className={`block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border ${
									errors.role
										? "border-red-300 dark:border-red-800"
										: "border-gray-300 dark:border-gray-600"
								} text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-600 focus:border-transparent transition-colors sm:text-sm`}
							>
								<option value="PESERTA">Peserta</option>
								<option value="PELATIH">Pelatih</option>
								<option value="JURI">Juri</option>
								<option value="PANITIA">Panitia</option>
							</select>
							{errors.role && (
								<p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
									{errors.role.message}
								</p>
							)}
						</div>

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
