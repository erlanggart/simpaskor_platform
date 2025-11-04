import React from "react";
import { Link, Outlet } from "react-router-dom";
import { Logo } from "../components/Logo";

interface AuthLayoutProps {
	title?: string;
	subtitle?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle }) => {
	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col">
			{/* Header */}
			<header className="w-full py-4 px-4 sm:px-6 lg:px-8">
				<div className="max-w-7xl mx-auto">
					<Link to="/">
						<Logo size="md" showText />
					</Link>
				</div>
			</header>

			{/* Main Content */}
			<main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
				<div className="max-w-md w-full space-y-8">
					{/* Title */}
					{title && (
						<div className="text-center">
							<h2 className="text-3xl font-extrabold text-gray-900">{title}</h2>
							{subtitle && (
								<p className="mt-2 text-sm text-gray-600">{subtitle}</p>
							)}
						</div>
					)}

					{/* Form Card */}
					<div className="bg-white shadow-xl rounded-lg p-8">
						<Outlet />
					</div>
				</div>
			</main>

			{/* Footer */}
			<footer className="w-full py-6 px-4 sm:px-6 lg:px-8 bg-white border-t border-gray-200">
				<div className="max-w-7xl mx-auto text-center text-sm text-gray-500">
					© 2025 Simpaskor Platform. All rights reserved.
				</div>
			</footer>
		</div>
	);
};
