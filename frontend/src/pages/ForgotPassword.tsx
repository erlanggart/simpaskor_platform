import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { api } from "../utils/api";
import Swal from "sweetalert2";

const forgotPasswordSchema = z.object({
	email: z.string().email("Format email tidak valid"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

const ForgotPassword = () => {
	const [isLoading, setIsLoading] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<ForgotPasswordForm>({
		resolver: zodResolver(forgotPasswordSchema),
	});

	const onSubmit = async (data: ForgotPasswordForm) => {
		try {
			setIsLoading(true);

			const response = await api.post("/api/auth/forgot-password", data);

			setIsSuccess(true);

			// Show success with development link (if available)
			if (response.data.devLink) {
				await Swal.fire({
					icon: "success",
					title: "Link Reset Terkirim!",
					html: `
						<p class="mb-4">Link reset password telah dikirim ke email Anda.</p>
						<div class="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
							<p class="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Development Mode:</p>
							<a href="${response.data.devLink}" class="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all">
								${response.data.devLink}
							</a>
						</div>
					`,
					confirmButtonText: "OK",
					customClass: {
						confirmButton:
							"bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-medium px-6 py-2.5 rounded-xl transition-all duration-200",
					},
					buttonsStyling: false,
				});
			} else {
				await Swal.fire({
					icon: "success",
					title: "Link Reset Terkirim!",
					text: "Jika email terdaftar, link reset password telah dikirim ke email Anda.",
					confirmButtonText: "OK",
					customClass: {
						confirmButton:
							"bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-medium px-6 py-2.5 rounded-xl transition-all duration-200",
					},
					buttonsStyling: false,
				});
			}
		} catch (err: any) {
			await Swal.fire({
				icon: "error",
				title: "Gagal Mengirim Link",
				text:
					err.response?.data?.message ||
					"Terjadi kesalahan. Silakan coba lagi.",
				confirmButtonText: "Coba Lagi",
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

	if (isSuccess) {
		return (
			<div className="text-center">
				<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 mb-4">
					<svg
						className="w-8 h-8 text-green-600 dark:text-green-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</div>
				<h2 className="text-2xl font-bold bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-3">
					Email Terkirim!
				</h2>
				<p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
					Silakan cek email Anda untuk link reset password.
					<br />
					Link akan kedaluwarsa dalam 1 jam.
				</p>
				<Link
					to="/login"
					className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
				>
					<svg
						className="w-4 h-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M10 19l-7-7m0 0l7-7m-7 7h18"
						/>
					</svg>
					Kembali ke Login
				</Link>
			</div>
		);
	}

	return (
		<>
			{/* Title Inside Form Card */}
			<div className="text-center mb-6">
				<h2 className="text-2xl font-bold bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
					Lupa Password?
				</h2>
				<p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
					Masukkan email Anda untuk menerima link reset password
				</p>
			</div>

			<form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
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
						autoFocus
						className={`block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border ${
							errors.email
								? "border-red-300 dark:border-red-800"
								: "border-gray-300 dark:border-gray-600"
						} text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent transition-colors sm:text-sm`}
						placeholder="nama@email.com"
					/>
					{errors.email && (
						<p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
							{errors.email.message}
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
								<span>Mengirim...</span>
							</>
						) : (
							"Kirim Link Reset"
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

export default ForgotPassword;
