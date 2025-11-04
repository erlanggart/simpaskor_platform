import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldExclamationIcon } from "@heroicons/react/24/outline";
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

	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
			<div className="max-w-md w-full text-center">
				<div className="flex justify-center mb-6">
					<div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center">
						<ShieldExclamationIcon className="w-16 h-16 text-red-600" />
					</div>
				</div>

				<h1 className="text-4xl font-bold text-gray-900 mb-2">403</h1>
				<h2 className="text-2xl font-semibold text-gray-800 mb-4">
					Akses Ditolak
				</h2>
				<p className="text-gray-600 mb-8">
					Maaf, Anda tidak memiliki izin untuk mengakses halaman ini.
					{user && (
						<span className="block mt-2">
							Role Anda: <span className="font-medium">{user.role}</span>
						</span>
					)}
				</p>

				<div className="flex flex-col sm:flex-row gap-4 justify-center">
					<button
						onClick={handleGoBack}
						className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
					>
						Kembali
					</button>
					{isAuthenticated ? (
						<Link
							to={getDashboardPath()}
							className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
						>
							Dashboard Saya
						</Link>
					) : (
						<Link
							to="/login"
							className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
						>
							Login
						</Link>
					)}
				</div>

				{!isAuthenticated && (
					<p className="mt-6 text-sm text-gray-500">
						Silakan login terlebih dahulu untuk mengakses halaman dashboard.
					</p>
				)}
			</div>
		</div>
	);
};

export default Unauthorized;
