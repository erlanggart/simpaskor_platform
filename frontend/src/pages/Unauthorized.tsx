import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldExclamationIcon, HomeIcon, ArrowLeftIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../hooks/useAuth";

const Unauthorized: React.FC = () => {
	const navigate = useNavigate();
	const { user, isAuthenticated } = useAuth();

	const handleGoBack = () => {
		navigate(-1);
	};

	const getDashboardPath = () => {
		if (!user) return "/login";

		switch (user.role) {
			case "SUPERADMIN":
				return "/admin/dashboard";
			case "PANITIA":
				return "/panitia/dashboard";
			case "PESERTA":
				return "/peserta/dashboard";
			case "JURI":
				return "/juri/dashboard";
			case "PELATIH":
				return "/pelatih/dashboard";
			default:
				return "/dashboard";
		}
	};

	const getRoleLabel = (role: string) => {
		switch (role) {
			case "SUPERADMIN":
				return "Super Admin";
			case "PANITIA":
				return "Panitia";
			case "PESERTA":
				return "Peserta";
			case "JURI":
				return "Juri";
			case "PELATIH":
				return "Pelatih";
			default:
				return role;
		}
	};

	return (
		<div className="min-h-screen  flex items-center justify-center px-4 sm:px-6 lg:px-8">
			<div className="max-w-lg w-full text-center">
				{/* Animated Icon */}
				<div className="flex justify-center mb-8">
					<div className="relative">
						<div className="w-32 h-32 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
							<ShieldExclamationIcon className="w-20 h-20 text-red-500 dark:text-red-400" />
						</div>
						<div className="absolute -bottom-2 -right-2 w-12 h-12 bg-red-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
							<LockClosedIcon className="w-6 h-6 text-white" />
						</div>
					</div>
				</div>

				{/* Error Code */}
				<h1 className="text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-pink-500 mb-4">
					403
				</h1>

				{/* Title */}
				<h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
					Akses Ditolak
				</h2>

				{/* Description */}
				<p className="text-lg text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
					Maaf, Anda tidak memiliki izin untuk mengakses halaman ini.
				</p>

				{/* User Info Card */}
				{user && (
					<div className="mb-8 p-6 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 dark:border-gray-700/40">
						<div className="flex items-center justify-center gap-4">
							<div className="w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
								<span className="text-xl font-bold text-red-600 dark:text-red-400">
									{user.name?.charAt(0).toUpperCase() || "U"}
								</span>
							</div>
							<div className="text-left">
								<p className="font-semibold text-gray-900 dark:text-white">
									{user.name || "User"}
								</p>
								<p className="text-sm text-gray-500 dark:text-gray-400">
									Role: <span className="font-medium text-red-600 dark:text-red-400">{getRoleLabel(user.role)}</span>
								</p>
							</div>
						</div>
						<div className="mt-4 pt-4 border-t border-gray-200/60 dark:border-gray-700/40">
							<p className="text-sm text-gray-500 dark:text-gray-400">
								Halaman ini memerlukan role atau izin yang berbeda dari yang Anda miliki saat ini.
							</p>
						</div>
					</div>
				)}

				{/* Not Logged In Info */}
				{!isAuthenticated && (
					<div className="mb-8 p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl border border-yellow-200 dark:border-yellow-800">
						<p className="text-yellow-800 dark:text-yellow-200">
							<span className="font-semibold">Anda belum login.</span>
							<br />
							Silakan login terlebih dahulu untuk mengakses halaman ini.
						</p>
					</div>
				)}

				{/* Action Buttons */}
				<div className="flex flex-col sm:flex-row gap-4 justify-center">
					<button
						onClick={handleGoBack}
						className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-medium shadow-sm"
					>
						<ArrowLeftIcon className="w-5 h-5" />
						Kembali
					</button>
					{isAuthenticated ? (
						<Link
							to={getDashboardPath()}
							className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-purple-600 text-white rounded-xl hover:from-red-700 hover:to-purple-700 transition-all font-medium shadow-lg shadow-red-500/25"
						>
							<HomeIcon className="w-5 h-5" />
							Dashboard Saya
						</Link>
					) : (
						<Link
							to="/login"
							className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-purple-600 text-white rounded-xl hover:from-red-700 hover:to-purple-700 transition-all font-medium shadow-lg shadow-red-500/25"
						>
							<LockClosedIcon className="w-5 h-5" />
							Login
						</Link>
					)}
				</div>

				{/* Help Section */}
				<div className="mt-12 pt-8 border-t border-gray-200/60 dark:border-gray-700/40">
					<p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
						Jika Anda yakin seharusnya memiliki akses, hubungi administrator.
					</p>
					<div className="flex justify-center gap-6 text-sm">
						<a
							href="mailto:admin@simpaskor.com"
							className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors font-medium"
						>
							admin@simpaskor.com
						</a>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Unauthorized;
