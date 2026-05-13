import React from "react";
import { Link } from "react-router-dom";
import { LuLogIn, LuStore, LuTicket, LuVote, LuLayoutDashboard } from "react-icons/lu";
import { useAuth } from "../../hooks/useAuth";

const QuickActions: React.FC = () => {
	const { isAuthenticated, user } = useAuth();

	const getDashboardPath = () => {
		switch (user?.role) {
			case "SUPERADMIN": return "/admin/dashboard";
			case "PANITIA": return "/panitia/dashboard";
			case "PESERTA": return "/peserta/dashboard";
			case "JURI": return "/juri/events";
			case "PELATIH": return "/pelatih/dashboard";
			case "MITRA": return "/mitra/dashboard";
			default: return "/login";
		}
	};

	const actions = [
		{
			to: isAuthenticated ? getDashboardPath() : "/login",
			label: isAuthenticated ? "Dashboard" : "Login",
			icon: isAuthenticated ? LuLayoutDashboard : LuLogIn,
			color: "bg-blue-500",
			lightBg: "bg-blue-50 dark:bg-blue-900/20",
		},
		{
			to: "/marketplace",
			label: "Marketplace",
			icon: LuStore,
			color: "bg-green-500",
			lightBg: "bg-green-50 dark:bg-green-900/20",
		},
		{
			to: "/e-ticketing",
			label: "E-Ticketing",
			icon: LuTicket,
			color: "bg-yellow-500",
			lightBg: "bg-orange-50 dark:bg-orange-900/20",
		},
		{
			to: "/e-voting",
			label: "E-Voting",
			icon: LuVote,
			color: "bg-purple-500",
			lightBg: "bg-purple-50 dark:bg-purple-900/20",
		},
	];

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
			<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6">
				<div className="grid grid-cols-4 gap-3 sm:gap-6">
					{actions.map((action) => (
						<Link
							key={action.label}
							to={action.to}
							className="flex flex-col items-center gap-2 sm:gap-3 group"
						>
							<div
								className={`w-12 h-12 sm:w-16 sm:h-16 ${action.lightBg} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110`}
							>
								<action.icon
									className={`w-6 h-6 sm:w-7 sm:h-7 ${action.color.replace("bg-", "text-")}`}
								/>
							</div>
							<span className="text-[11px] sm:text-sm font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">
								{action.label}
							</span>
						</Link>
					))}
				</div>
			</div>
		</div>
	);
};

export default QuickActions;
