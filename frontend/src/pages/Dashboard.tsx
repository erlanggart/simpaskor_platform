import { useAuth } from "../hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { api } from "../utils/api";

const Dashboard = () => {
	const { user, isAuthenticated, isLoading } = useAuth();
	const [checkingAssignment, setCheckingAssignment] = useState(false);
	const [activeEvent, setActiveEvent] = useState<any>(null);
	const [assignmentChecked, setAssignmentChecked] = useState(false);

	useEffect(() => {
		if (user?.role === "PANITIA" && !assignmentChecked) {
			checkActiveEvent();
		}
	}, [user, assignmentChecked]);

	const checkActiveEvent = async () => {
		setCheckingAssignment(true);
		try {
			const response = await api.get("/api/panitia-assignment/current");
			if (response.data && response.data.event) {
				setActiveEvent(response.data);
			}
		} catch (error) {
			// No active event
		} finally {
			setCheckingAssignment(false);
			setAssignmentChecked(true);
		}
	};

	if (
		isLoading ||
		(user?.role === "PANITIA" && !assignmentChecked) ||
		checkingAssignment
	) {
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

	// For PANITIA, check if they have active event assignment
	if (user.role === "PANITIA" && activeEvent && activeEvent.event) {
		return (
			<Navigate to={`/panitia/events/${activeEvent.event.id}/manage`} replace />
		);
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
