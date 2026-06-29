import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
	EnvelopeIcon,
	CheckCircleIcon,
	ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../hooks/useAuth";
import { authAPI } from "../utils/api";

const dashboardPaths: Record<string, string> = {
	PANITIA: "/panitia/dashboard",
	PESERTA: "/peserta/dashboard",
	JURI: "/juri/dashboard",
	PELATIH: "/pelatih/dashboard",
	MITRA: "/mitra/dashboard",
};

type Phase = "verifying" | "success" | "error" | "await";

const VerifyEmail = () => {
	const [params] = useSearchParams();
	const navigate = useNavigate();
	const { user, setAuth } = useAuth();
	const token = params.get("token");

	const [phase, setPhase] = useState<Phase>(token ? "verifying" : "await");
	const [message, setMessage] = useState<string | null>(null);
	const [resending, setResending] = useState(false);
	// Verify exactly once even under React StrictMode double-mount.
	const verified = useRef(false);

	useEffect(() => {
		if (!token || verified.current) return;
		verified.current = true;

		authAPI
			.verifyEmail(token)
			.then((res) => {
				setAuth(res.user, res.token);
				setPhase("success");
				setTimeout(() => {
					navigate(dashboardPaths[res.user.role] || "/dashboard", {
						replace: true,
					});
				}, 1500);
			})
			.catch((err) => {
				setPhase("error");
				setMessage(
					err.response?.data?.message ||
						"Link verifikasi tidak valid atau sudah kedaluwarsa."
				);
			});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [token]);

	const handleResend = async () => {
		try {
			setResending(true);
			setMessage(null);
			const res = await authAPI.resendVerification();
			setMessage(res.message || "Email verifikasi telah dikirim ulang.");
			setPhase("await");
		} catch (err: any) {
			setMessage(
				err.response?.data?.message ||
					"Gagal mengirim ulang. Pastikan Anda sudah login lalu coba lagi."
			);
		} finally {
			setResending(false);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
			<div className="w-full max-w-md rounded-2xl border-2 border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-800/60 p-8 shadow-sm text-center">
				{phase === "success" ? (
					<>
						<CheckCircleIcon className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
						<h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
							Email Terverifikasi!
						</h1>
						<p className="text-sm text-gray-500 dark:text-gray-400">
							Mengarahkan ke dashboard Anda...
						</p>
					</>
				) : phase === "error" ? (
					<>
						<ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
						<h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
							Verifikasi Gagal
						</h1>
						<p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
							{message}
						</p>
						{user && (
							<button
								type="button"
								onClick={handleResend}
								disabled={resending}
								className="px-6 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 shadow-lg transition-all disabled:opacity-60"
							>
								{resending ? "Mengirim..." : "Kirim Ulang Link Verifikasi"}
							</button>
						)}
					</>
				) : phase === "verifying" ? (
					<>
						<div className="w-12 h-12 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto mb-4" />
						<h1 className="text-xl font-bold text-gray-900 dark:text-white">
							Memverifikasi email...
						</h1>
					</>
				) : (
					<>
						<EnvelopeIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
						<h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
							Cek Email Anda
						</h1>
						<p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
							Kami telah mengirim link verifikasi ke
							{user?.email ? (
								<>
									{" "}
									<strong className="text-gray-700 dark:text-gray-200">
										{user.email}
									</strong>
								</>
							) : (
								" email Anda"
							)}
							. Klik link di email tersebut untuk mengaktifkan akun.
						</p>
						<p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
							Tidak menerima email? Cek folder spam, atau kirim ulang.
						</p>
						{message && (
							<p className="text-sm text-emerald-600 dark:text-emerald-400 mb-4">
								{message}
							</p>
						)}
						{user && (
							<button
								type="button"
								onClick={handleResend}
								disabled={resending}
								className="px-6 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 shadow-lg transition-all disabled:opacity-60"
							>
								{resending ? "Mengirim..." : "Kirim Ulang Link Verifikasi"}
							</button>
						)}
					</>
				)}
			</div>
		</div>
	);
};

export default VerifyEmail;
