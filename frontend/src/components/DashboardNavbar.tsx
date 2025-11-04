import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Logo } from "./Logo";
import {
	UserCircleIcon,
	Cog6ToothIcon,
	ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

interface DashboardNavbarProps {
	title?: string;
}

export const DashboardNavbar: React.FC<DashboardNavbarProps> = ({ title }) => {
	const { user, logout } = useAuth();
	const [showDropdown, setShowDropdown] = React.useState(false);

	return (
		<nav className="bg-white shadow-sm border-b border-gray-200">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between items-center h-16">
					{/* Logo */}
					<div className="flex items-center gap-4">
						<Logo size="sm" showText />
						{title && (
							<>
								<div className="h-8 w-px bg-gray-300"></div>
								<h1 className="text-xl font-semibold text-gray-900">{title}</h1>
							</>
						)}
					</div>

					{/* User Menu */}
					<div className="relative">
						<button
							onClick={() => setShowDropdown(!showDropdown)}
							className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
						>
							<div className="text-right hidden sm:block">
								<div className="text-sm font-medium text-gray-900">
									{user?.name}
								</div>
								<div className="text-xs text-gray-500">{user?.role}</div>
							</div>
							<div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
								{user?.name
									?.split(" ")
									.map((n) => n[0])
									.join("")
									.substring(0, 2)
									.toUpperCase()}
							</div>
						</button>

						{/* Dropdown Menu */}
						{showDropdown && (
							<>
								<div
									className="fixed inset-0 z-10"
									onClick={() => setShowDropdown(false)}
								/>
								<div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
									<div className="px-4 py-3 border-b border-gray-200">
										<div className="text-sm font-medium text-gray-900">
											{user?.name}
										</div>
										<div className="text-xs text-gray-500">{user?.email}</div>
									</div>

									<Link
										to="/profile"
										className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
										onClick={() => setShowDropdown(false)}
									>
										<UserCircleIcon className="w-5 h-5" />
										Profil Saya
									</Link>

									<Link
										to="/profile"
										className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
										onClick={() => setShowDropdown(false)}
									>
										<Cog6ToothIcon className="w-5 h-5" />
										Pengaturan
									</Link>

									<hr className="my-1" />

									<button
										onClick={() => {
											setShowDropdown(false);
											logout();
										}}
										className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
									>
										<ArrowRightOnRectangleIcon className="w-5 h-5" />
										Keluar
									</button>
								</div>
							</>
						)}
					</div>
				</div>
			</div>
		</nav>
	);
};
