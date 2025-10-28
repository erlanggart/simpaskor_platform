import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";

const registerSchema = z.object({
	email: z.string().email("Format email tidak valid"),
	password: z.string().min(8, "Password minimal 8 karakter"),
	firstName: z.string().min(1, "Nama depan harus diisi"),
	lastName: z.string().min(1, "Nama belakang harus diisi"),
	role: z.enum(["PESERTA", "PELATIH"]),
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
						Daftar Akun Baru
					</h2>
					<p className="mt-2 text-center text-sm text-gray-600">
						Bergabung dengan Simpaskor Platform
					</p>
				</div>

				<form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
					{error && (
						<div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
							{error}
						</div>
					)}

					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label
									htmlFor="firstName"
									className="block text-sm font-medium text-gray-700"
								>
									Nama Depan
								</label>
								<input
									{...register("firstName")}
									type="text"
									id="firstName"
									className={`mt-1 block w-full px-3 py-2 border ${
										errors.firstName ? "border-red-300" : "border-gray-300"
									} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
									placeholder="John"
								/>
								{errors.firstName && (
									<p className="mt-1 text-sm text-red-600">
										{errors.firstName.message}
									</p>
								)}
							</div>

							<div>
								<label
									htmlFor="lastName"
									className="block text-sm font-medium text-gray-700"
								>
									Nama Belakang
								</label>
								<input
									{...register("lastName")}
									type="text"
									id="lastName"
									className={`mt-1 block w-full px-3 py-2 border ${
										errors.lastName ? "border-red-300" : "border-gray-300"
									} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
									placeholder="Doe"
								/>
								{errors.lastName && (
									<p className="mt-1 text-sm text-red-600">
										{errors.lastName.message}
									</p>
								)}
							</div>
						</div>

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
								className={`mt-1 block w-full px-3 py-2 border ${
									errors.email ? "border-red-300" : "border-gray-300"
								} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
								placeholder="john@example.com"
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
								className={`mt-1 block w-full px-3 py-2 border ${
									errors.password ? "border-red-300" : "border-gray-300"
								} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
								placeholder="Minimal 8 karakter"
							/>
							{errors.password && (
								<p className="mt-1 text-sm text-red-600">
									{errors.password.message}
								</p>
							)}
						</div>

						<div>
							<label
								htmlFor="role"
								className="block text-sm font-medium text-gray-700"
							>
								Role
							</label>
							<select
								{...register("role")}
								id="role"
								className={`mt-1 block w-full px-3 py-2 border ${
									errors.role ? "border-red-300" : "border-gray-300"
								} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
							>
								<option value="PESERTA">Peserta</option>
								<option value="PELATIH">Pelatih</option>
							</select>
							{errors.role && (
								<p className="mt-1 text-sm text-red-600">
									{errors.role.message}
								</p>
							)}
						</div>

						<div>
							<label
								htmlFor="phone"
								className="block text-sm font-medium text-gray-700"
							>
								No. Telepon (Opsional)
							</label>
							<input
								{...register("phone")}
								type="tel"
								id="phone"
								className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
								placeholder="+62812345678"
							/>
						</div>

						<div>
							<label
								htmlFor="institution"
								className="block text-sm font-medium text-gray-700"
							>
								Institusi (Opsional)
							</label>
							<input
								{...register("institution")}
								type="text"
								id="institution"
								className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
								placeholder="Nama sekolah/universitas/organisasi"
							/>
						</div>
					</div>

					<div>
						<button
							type="submit"
							disabled={isLoading}
							className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isLoading ? "Memproses..." : "Daftar"}
						</button>
					</div>

					<div className="text-center">
						<p className="text-sm text-gray-600">
							Sudah memiliki akun?{" "}
							<Link
								to="/login"
								className="font-medium text-indigo-600 hover:text-indigo-500"
							>
								Masuk di sini
							</Link>
						</p>
					</div>
				</form>
			</div>
		</div>
	);
};

export default Register;
