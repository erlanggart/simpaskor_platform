import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ExclamationTriangleIcon, HomeIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";

const NotFound: React.FC = () => {
	const navigate = useNavigate();

	const handleGoBack = () => {
		navigate(-1);
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4 sm:px-6 lg:px-8">
			<div className="max-w-lg w-full text-center">
				{/* Animated Icon */}
				<div className="flex justify-center mb-8">
					<div className="relative">
						<div className="w-32 h-32 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center animate-pulse">
							<ExclamationTriangleIcon className="w-20 h-20 text-yellow-500 dark:text-yellow-400" />
						</div>
						<div className="absolute -bottom-2 -right-2 w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center shadow-lg">
							<span className="text-2xl font-bold text-gray-600 dark:text-gray-300">?</span>
						</div>
					</div>
				</div>

				{/* Error Code */}
				<h1 className="text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-orange-500 mb-4">
					404
				</h1>

				{/* Title */}
				<h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
					Halaman Tidak Ditemukan
				</h2>

				{/* Description */}
				<p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
					Maaf, halaman yang Anda cari tidak dapat ditemukan. 
					Halaman mungkin telah dipindahkan, dihapus, atau URL tidak valid.
				</p>

				{/* Illustration */}
				<div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
					<div className="flex items-center justify-center gap-4 text-gray-400 dark:text-gray-500">
						<div className="h-3 w-3 rounded-full bg-red-400"></div>
						<div className="h-3 w-3 rounded-full bg-yellow-400"></div>
						<div className="h-3 w-3 rounded-full bg-green-400"></div>
					</div>
					<div className="mt-4 font-mono text-sm text-gray-500 dark:text-gray-400">
						<span className="text-red-500">Error:</span> Page not found
						<br />
						<span className="text-gray-400">at</span> <span className="text-blue-500">{window.location.pathname}</span>
					</div>
				</div>

				{/* Action Buttons */}
				<div className="flex flex-col sm:flex-row gap-4 justify-center">
					<button
						onClick={handleGoBack}
						className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-medium shadow-sm"
					>
						<ArrowLeftIcon className="w-5 h-5" />
						Kembali
					</button>
					<Link
						to="/"
						className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-medium shadow-lg shadow-indigo-500/25"
					>
						<HomeIcon className="w-5 h-5" />
						Ke Beranda
					</Link>
				</div>

				{/* Help Section */}
				<div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
					<p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
						Butuh bantuan? Hubungi kami:
					</p>
					<div className="flex justify-center gap-6 text-sm">
						<a
							href="mailto:info@simpaskor.com"
							className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors font-medium"
						>
							info@simpaskor.com
						</a>
					</div>
				</div>
			</div>
		</div>
	);
};

export default NotFound;
