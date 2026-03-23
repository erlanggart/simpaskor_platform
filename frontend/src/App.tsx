import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";

// Layouts
import { MainLayout, AuthLayout, DashboardLayout, ScoringLayout, PreAssignLayout } from "./layouts";

// Public Pages
import LandingPage from "./pages/LandingPage";
import EventDetail from "./pages/EventDetail";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";
import AllJuries from "./pages/AllJuries";

// Auth Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// Dashboard Pages
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";

// Role-based Dashboard Pages
import AdminDashboard from "./pages/admin/Dashboard";
import UserManagement from "./pages/admin/UserManagement";
import CouponManagement from "./pages/admin/CouponManagement";
import AssessmentCategoryManagement from "./pages/admin/AssessmentCategoryManagement";
import EventManagement from "./pages/admin/EventManagement";
import AdminManageEvent from "./pages/admin/ManageEvent";
import AdminEditEvent from "./pages/admin/EditEvent";
import PanitiaDashboard from "./pages/panitia/Dashboard";
import CreateEventWizard from "./pages/panitia/CreateEventWizard";
import EditEventForm from "./pages/panitia/EditEvent";
import ManageEvent from "./pages/panitia/ManageEvent";
import EventParticipantManagement from "./pages/panitia/EventParticipantManagement";
import PesertaDashboard from "./pages/peserta/Dashboard";
import PesertaRegistrations from "./pages/peserta/Registrations";
import PesertaEventRegister from "./pages/peserta/EventRegister";
import PesertaAssessmentHistory from "./pages/peserta/AssessmentHistory";
import PesertaEventsAvailable from "./pages/peserta/EventsAvailable";
import JuriDashboard from "./pages/juri/Dashboard";
import JuriInvitations from "./pages/juri/Invitations";
import JuriMyEvents from "./pages/juri/MyEvents";
import JuriEventInfo from "./pages/juri/EventInfo";
import JuriEventMateri from "./pages/juri/EventMateri";
import JuriEventPeserta from "./pages/juri/EventPeserta";
import JuriEventPenilaian from "./pages/juri/EventPenilaian";
import JuriPenilaianDetail from "./pages/juri/PenilaianDetail";
import JuriMaterialScoring from "./pages/juri/MaterialScoring";
import PelatihDashboard from "./pages/pelatih/Dashboard";
import ManageJury from "./pages/panitia/ManageJury";
import ManageJuara from "./pages/panitia/ManageJuara";
import ManageMateri from "./pages/panitia/ManageMateri";
import FieldRechecking from "./pages/panitia/FieldRechecking";
import PanitiaEventRecap from "./pages/panitia/EventRecap";
import PerformanceHistory from "./pages/shared/PerformanceHistory";

import "./App.css";

function App() {
	return (
		<AuthProvider>
			<div className="App">
				<Routes>
					{/* Public Routes - Main Layout */}
					<Route element={<MainLayout />}>
						<Route index element={<LandingPage />} />
						<Route path="events/:id" element={<EventDetail />} />
						<Route path="juries" element={<AllJuries />} />
						<Route path="unauthorized" element={<Unauthorized />} />
					</Route>
					{/* Auth Routes - Auth Layout */}
					<Route element={<AuthLayout />}>
						<Route path="login" element={<Login />} />
						<Route path="register" element={<Register />} />
						<Route path="forgot-password" element={<ForgotPassword />} />
						<Route path="reset-password" element={<ResetPassword />} />
					</Route>{" "}
					{/* SuperAdmin Routes - Dashboard Layout */}
					<Route
						element={
							<ProtectedRoute allowedRoles={["SUPERADMIN"]}>
								<DashboardLayout />
							</ProtectedRoute>
						}
					>
						<Route path="admin">
							<Route path="dashboard" element={<AdminDashboard />} />
							<Route path="users" element={<UserManagement />} />
							<Route path="coupons" element={<CouponManagement />} />
							<Route path="events" element={<EventManagement />} />
							<Route path="events/:eventSlug/manage" element={<AdminManageEvent />} />
							<Route path="events/:eventId/edit" element={<AdminEditEvent />} />
							<Route path="events/:eventSlug/peserta" element={<EventParticipantManagement />} />
							<Route path="events/:eventSlug/juri" element={<ManageJury />} />
							<Route path="events/:eventSlug/materi" element={<ManageMateri />} />
							<Route path="events/:eventSlug/juara" element={<ManageJuara />} />
							<Route path="events/:eventSlug/manage-fields" element={<Navigate to="../field-rechecking" replace />} />
							<Route path="events/:eventSlug/field-rechecking" element={<FieldRechecking />} />
							<Route path="events/:eventSlug/performance-history" element={<PerformanceHistory />} />
							<Route path="events/:eventSlug/rekapitulasi" element={<PanitiaEventRecap />} />
							<Route
								path="assessment-categories"
								element={<AssessmentCategoryManagement />}
							/>
							<Route path="profile" element={<Profile />} />
						</Route>
					</Route>
					{/* Panitia Routes - Mixed Layout */}
					<Route path="panitia">
						{/* Standalone pages without layout */}
						<Route
							path="events/create"
							element={
								<ProtectedRoute allowedRoles={["PANITIA"]}>
									<CreateEventWizard />
								</ProtectedRoute>
							}
						/>
						<Route
							path="events/create/:draftId"
							element={
								<ProtectedRoute allowedRoles={["PANITIA"]}>
									<CreateEventWizard />
								</ProtectedRoute>
							}
						/>
						<Route
							path="events/:id/edit"
							element={
								<ProtectedRoute allowedRoles={["PANITIA"]}>
									<EditEventForm />
								</ProtectedRoute>
							}
						/>

						{/* Dashboard page - PreAssign Layout (before event assignment) */}
						<Route
							element={
								<ProtectedRoute allowedRoles={["PANITIA"]}>
									<PreAssignLayout />
								</ProtectedRoute>
							}
						>
							<Route path="dashboard" element={<PanitiaDashboard />} />
						</Route>

						{/* Event management pages - Dashboard Layout (after event assignment) */}
						<Route
							element={
								<ProtectedRoute allowedRoles={["PANITIA"]}>
									<DashboardLayout />
								</ProtectedRoute>
							}
						>
							<Route path="events/:eventSlug/manage" element={<ManageEvent />} />
							<Route path="events/:eventSlug/peserta" element={<EventParticipantManagement />} />
							<Route path="events/:eventSlug/juri" element={<ManageJury />} />
							<Route path="events/:eventSlug/materi" element={<ManageMateri />} />
							<Route path="events/:eventSlug/juara" element={<ManageJuara />} />
							<Route path="events/:eventSlug/manage-fields" element={<Navigate to="../field-rechecking" replace />} />
							<Route path="events/:eventSlug/field-rechecking" element={<FieldRechecking />} />
							<Route path="events/:eventSlug/performance-history" element={<PerformanceHistory />} />
							<Route path="events/:eventSlug/rekapitulasi" element={<PanitiaEventRecap />} />
							<Route path="profile" element={<Profile />} />
						</Route>
					</Route>
					{/* Peserta Routes - Dashboard Layout */}
					<Route
						element={
							<ProtectedRoute allowedRoles={["PESERTA"]}>
								<DashboardLayout />
							</ProtectedRoute>
						}
					>
						<Route path="peserta">
							<Route path="dashboard" element={<PesertaDashboard />} />
							<Route path="events" element={<PesertaEventsAvailable />} />
							<Route path="registrations" element={<PesertaRegistrations />} />
							<Route path="events/:eventSlug/performance-history" element={<PerformanceHistory />} />
							<Route path="assessment-history" element={<PesertaAssessmentHistory />} />
							<Route path="assessment-history/:eventSlug" element={<PesertaAssessmentHistory />} />
							<Route path="profile" element={<Profile />} />
						</Route>
					</Route>
					{/* Peserta Event Registration - Main Layout */}
					<Route element={<MainLayout />}>
						<Route
							path="peserta/events/:eventSlug/register"
							element={
								<ProtectedRoute allowedRoles={["PESERTA"]}>
									<PesertaEventRegister />
								</ProtectedRoute>
							}
						/>
					</Route>
					{/* Juri Routes - PreAssign Layout (before event assignment) */}
					<Route
						element={
							<ProtectedRoute allowedRoles={["JURI"]}>
								<PreAssignLayout />
							</ProtectedRoute>
						}
					>
						<Route path="juri">
							<Route path="dashboard" element={<JuriDashboard />} />
							<Route path="invitations" element={<JuriInvitations />} />
							<Route path="events" element={<JuriMyEvents />} />
						</Route>
					</Route>
					{/* Juri Routes - Dashboard Layout (after event assignment) */}
					<Route
						element={
							<ProtectedRoute allowedRoles={["JURI"]}>
								<DashboardLayout />
							</ProtectedRoute>
						}
					>
						<Route path="juri">
							<Route path="events/:eventSlug/info" element={<JuriEventInfo />} />
							<Route path="events/:eventSlug/materi" element={<JuriEventMateri />} />
							<Route path="events/:eventSlug/peserta" element={<JuriEventPeserta />} />
							<Route path="profile" element={<Profile />} />
						</Route>
					</Route>
					{/* Juri Scoring Routes - Minimal Scoring Layout for Tablets */}
					<Route
						element={
							<ProtectedRoute allowedRoles={["JURI"]}>
								<ScoringLayout />
							</ProtectedRoute>
						}
					>
						<Route path="juri">
							<Route path="events/:eventSlug/penilaian" element={<JuriEventPenilaian />} />
							<Route path="events/:eventSlug/penilaian/:participantId" element={<JuriMaterialScoring />} />
							<Route path="events/:eventSlug/penilaian/:participantId/kategori" element={<JuriPenilaianDetail />} />
						</Route>
					</Route>
					{/* Pelatih Routes - Dashboard Layout */}
					<Route
						element={
							<ProtectedRoute allowedRoles={["PELATIH"]}>
								<DashboardLayout />
							</ProtectedRoute>
						}
					>
						<Route path="pelatih">
							<Route path="dashboard" element={<PelatihDashboard />} />
							<Route path="profile" element={<Profile />} />
						</Route>
					</Route>
					{/* Legacy Dashboard Route - Redirect based on role */}
					<Route
						path="/dashboard"
						element={
							<ProtectedRoute>
								<Dashboard />
							</ProtectedRoute>
						}
					/>
					{/* Global Profile Route (fallback for legacy) */}
					<Route
						path="/profile"
						element={
							<ProtectedRoute>
								<DashboardLayout />
							</ProtectedRoute>
						}
					>
						<Route index element={<Profile />} />
					</Route>
					{/* Catch-all Not Found */}
					<Route path="*" element={<NotFound />} />
				</Routes>
			</div>
		</AuthProvider>
	);
}

export default App;
