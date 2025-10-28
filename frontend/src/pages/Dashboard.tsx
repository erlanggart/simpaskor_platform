import { useAuth } from "../hooks/useAuth";
import { Navigate } from "react-router-dom";

const Dashboard = () => {
	const { user, isAuthenticated, isLoading } = useAuth();

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
					<p className="mt-4 text-gray-600">Loading...</p>
				</div>
			</div>
		);
	}

	if (!isAuthenticated || !user) {
		return <Navigate to="/login" replace />;
	}

	// Redirect to role-specific dashboard
	const getRoleDashboardPath = (role: string) => {
		switch (role) {
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
				// Default fallback for unknown roles
				return "/peserta/dashboard";
		}
	};

	return <Navigate to={getRoleDashboardPath(user.role)} replace />;
};

export default Dashboard;
