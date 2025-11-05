import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../utils/api";
import Swal from "sweetalert2";

const resetPasswordSchema = z
	.object({
		newPassword: z.string().min(8, "Password minimal 8 karakter"),
		confirmPassword: z.string().min(1, "Konfirmasi password harus diisi"),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Password tidak cocok",
		path: ["confirmPassword"],
	});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

const ResetPassword = () => {
	const [searchParams] = useSearchParams();
	const [isLoading, setIsLoading] = useState(false);
	const [token, setToken] = useState<string | null>(null);
	const navigate = useNavigate();

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<ResetPasswordForm>({
		resolver: zodResolver(resetPasswordSchema),
	});

	useEffect(() => {
		const tokenParam = searchParams.get("token");
		if (!tokenParam) {
			Swal.fire({
				icon: "error",
				title: "Token Tidak Valid",
				text: "Link reset password tidak valid atau telah kedaluwarsa.",
				confirmButtonText: "Ke Halaman Login",
				customClass: {
					confirmButton:
						"bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-medium px-6 py-2.5 rounded-xl transition-all duration-200",
				},
				buttonsStyling: false,
			}).then(() => {
				navigate("/login");
			});
		} else {
			setToken(tokenParam);
		}
	}, [searchParams, navigate]);

	const onSubmit = async (data: ResetPasswordForm) => {
		if (!token) return;

		try {
			setIsLoading(true);

			await api.post("/api/auth/reset-password", {
				token,
				newPassword: data.newPassword,
			});

			await Swal.fire({
				icon: "success",
				title: "Password Berhasil Direset!",
				text: "Silakan login dengan password baru Anda.",
				confirmButtonText: "Ke Halaman Login",
				customClass: {
					confirmButton:
						"bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-medium px-6 py-2.5 rounded-xl transition-all duration-200",
				},
				buttonsStyling: false,
			});

			navigate("/login");
		} catch (err: any) {
			await Swal.fire({
				icon: "error",
				title: "Reset Password Gagal",
				text:
					err.response?.data?.message ||
					"Token tidak valid atau telah kedaluwarsa. Silakan request link baru.",
				confirmButtonText: "OK",
				customClass: {
					confirmButton:
						"bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-medium px-6 py-2.5 rounded-xl transition-all duration-200",
				},
				buttonsStyling: false,
			});
		} finally {
			setIsLoading(false);
		}
	};

	if (!token) {
		return (
			<div className="text-center">
				<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 mb-4">
					<svg
						className="w-8 h-8 text-red-600 dark:text-red-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</div>
				<h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
					Token Tidak Valid
				</h2>
				<p className="text-sm text-gray-600 dark:text-gray-400">
					Memuat ulang...
				</p>
			</div>
		);
	}

	return (
		<>
			{/* Title Inside Form Card */}
			<div className="text-center mb-6">
				<h2 className="text-2xl font-bold bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
					Reset Password
				</h2>
				<p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
					Masukkan password baru Anda
				</p>
			</div>

			<form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
				<div>
					<label
						htmlFor="newPassword"
						className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
					>
						Password Baru
					</label>
					<input
						{...register("newPassword")}
						type="password"
						id="newPassword"
						autoFocus
						className={`block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border ${
							errors.newPassword
								? "border-red-300 dark:border-red-800"
								: "border-gray-300 dark:border-gray-600"
						} text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent transition-colors sm:text-sm`}
						placeholder="Minimal 8 karakter"
					/>
					{errors.newPassword && (
						<p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
							{errors.newPassword.message}
						</p>
					)}
				</div>

				<div>
					<label
						htmlFor="confirmPassword"
						className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
					>
						Konfirmasi Password
					</label>
					<input
						{...register("confirmPassword")}
						type="password"
						id="confirmPassword"
						className={`block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border ${
							errors.confirmPassword
								? "border-red-300 dark:border-red-800"
								: "border-gray-300 dark:border-gray-600"
						} text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent transition-colors sm:text-sm`}
						placeholder="Ulangi password baru"
					/>
					{errors.confirmPassword && (
						<p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
							{errors.confirmPassword.message}
						</p>
					)}
				</div>

				<div className="pt-2">
					<button
						type="submit"
						disabled={isLoading}
						className="w-full flex justify-center items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-medium rounded-xl shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
							"Reset Password"
						)}
					</button>
				</div>

				<div className="text-center pt-1">
					<Link
						to="/login"
						className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
					>
						Kembali ke Login
					</Link>
				</div>
			</form>
		</>
	);
};

export default ResetPassword;
