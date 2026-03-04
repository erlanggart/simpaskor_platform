import { useAuth } from "../hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { api } from "../utils/api";

interface JuryEvent {
	id: string;
	status: string;
	event: {
		id: string;
		title: string;
		slug: string;
		status: string;
	};
}

const Dashboard = () => {
	const { user, isAuthenticated, isLoading } = useAuth();
	const [checkingAssignment, setCheckingAssignment] = useState(false);
	const [activeEvent, setActiveEvent] = useState<any>(null);
	const [activeJuryEvent, setActiveJuryEvent] = useState<JuryEvent | null>(null);
	const [assignmentChecked, setAssignmentChecked] = useState(false);

	useEffect(() => {
		if (user?.role === "PANITIA" && !assignmentChecked) {
			checkActiveEvent();
		} else if (user?.role === "JURI" && !assignmentChecked) {
			checkActiveJuryEvent();
		}
	}, [user, assignmentChecked]);

	const checkActiveEvent = () => {
		setCheckingAssignment(true);
		try {
			// Read from localStorage instead of API
			const stored = localStorage.getItem("panitia_active_event");
			if (stored) {
				const eventData = JSON.parse(stored);
				setActiveEvent({ event: eventData });
			}
		} catch (error) {
			// Invalid data, remove it
			localStorage.removeItem("panitia_active_event");
		} finally {
			setCheckingAssignment(false);
			setAssignmentChecked(true);
		}
	};

	const checkActiveJuryEvent = async () => {
		setCheckingAssignment(true);
		
		// Check if user manually exited the event (session-based)
		const hasManuallyExited = sessionStorage.getItem("juri_exited_event");
		if (hasManuallyExited) {
			setCheckingAssignment(false);
			setAssignmentChecked(true);
			return;
		}

		try {
			const response = await api.get("/juries/my-events");
			const events: JuryEvent[] = response.data;
			
			// Find active confirmed event (status CONFIRMED and event is ONGOING or PUBLISHED)
			const activeEvt = events.find(
				(e) => e.status === "CONFIRMED" && 
					(e.event.status === "ONGOING" || e.event.status === "PUBLISHED")
			);
			
			if (activeEvt) {
				setActiveJuryEvent(activeEvt);
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
		((user?.role === "PANITIA" || user?.role === "JURI") && !assignmentChecked) ||
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
			<Navigate to={`/panitia/events/${activeEvent.event.slug}/manage`} replace />
		);
	}

	// For JURI, check if they have active event assignment
	if (user.role === "JURI" && activeJuryEvent && activeJuryEvent.event) {
		return (
			<Navigate to={`/juri/events/${activeJuryEvent.event.slug}/info`} replace />
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
