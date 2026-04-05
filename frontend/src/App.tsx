import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";

import "./App.css";

// Layouts (named exports)
const MainLayout = lazy(() => import("./layouts/MainLayout").then(m => ({ default: m.MainLayout })));
const AuthLayout = lazy(() => import("./layouts/AuthLayout").then(m => ({ default: m.AuthLayout })));
const DashboardLayout = lazy(() => import("./layouts/DashboardLayout").then(m => ({ default: m.DashboardLayout })));

const PreAssignLayout = lazy(() => import("./layouts/PreAssignLayout").then(m => ({ default: m.PreAssignLayout })));

// Public Pages
const LandingPage = lazy(() => import("./pages/LandingPage"));
const MarketplacePage = lazy(() => import("./pages/MarketplacePage"));
const ETicketingPage = lazy(() => import("./pages/ETicketingPage"));
const EVotingPage = lazy(() => import("./pages/EVotingPage"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Unauthorized = lazy(() => import("./pages/Unauthorized"));
const AllJuries = lazy(() => import("./pages/AllJuries"));
const AllPelatih = lazy(() => import("./pages/AllPelatih"));
const KlasemenPage = lazy(() => import("./pages/KlasemenPage"));
const EventsPage = lazy(() => import("./pages/EventsPage"));
const PaymentSuccessPage = lazy(() => import("./pages/PaymentSuccessPage"));

// Auth Pages
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const RoleSelection = lazy(() => import("./pages/RoleSelection"));

// Dashboard Pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));

// Role-based Dashboard Pages
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const UserDetail = lazy(() => import("./pages/admin/UserDetail"));
const CouponManagement = lazy(() => import("./pages/admin/CouponManagement"));
const AssessmentCategoryManagement = lazy(() => import("./pages/admin/AssessmentCategoryManagement"));
const EventManagement = lazy(() => import("./pages/admin/EventManagement"));
const AdminManageEvent = lazy(() => import("./pages/admin/ManageEvent"));
const AdminEditEvent = lazy(() => import("./pages/admin/EditEvent"));
const ProductManagement = lazy(() => import("./pages/admin/ProductManagement"));
const OrderManagement = lazy(() => import("./pages/admin/OrderManagement"));
const GuideManagement = lazy(() => import("./pages/admin/GuideManagement"));
const EventSubmissionManagement = lazy(() => import("./pages/admin/EventSubmissionManagement"));
const PanitiaDashboard = lazy(() => import("./pages/panitia/Dashboard"));
const PanitiaEventsList = lazy(() => import("./pages/panitia/Events"));
const PanitiaPanduan = lazy(() => import("./pages/panitia/Panduan"));
const CreateEventWizard = lazy(() => import("./pages/panitia/CreateEventWizard"));
const EditEventForm = lazy(() => import("./pages/panitia/EditEvent"));
const ManageEvent = lazy(() => import("./pages/panitia/ManageEvent"));
const EventParticipantManagement = lazy(() => import("./pages/panitia/EventParticipantManagement"));
const PesertaDashboard = lazy(() => import("./pages/peserta/Dashboard"));
const PesertaRegistrations = lazy(() => import("./pages/peserta/Registrations"));
const PesertaEventRegister = lazy(() => import("./pages/peserta/EventRegister"));
const PesertaAssessmentHistory = lazy(() => import("./pages/peserta/AssessmentHistory"));
const PesertaEventsAvailable = lazy(() => import("./pages/peserta/EventsAvailable"));
const JuriDashboard = lazy(() => import("./pages/juri/Dashboard"));
const JuriInvitations = lazy(() => import("./pages/juri/Invitations"));
const JuriMyEvents = lazy(() => import("./pages/juri/MyEvents"));
const JuriEventInfo = lazy(() => import("./pages/juri/EventInfo"));
const JuriEventMateri = lazy(() => import("./pages/juri/EventMateri"));
const JuriEventPeserta = lazy(() => import("./pages/juri/EventPeserta"));
import JuriEventPenilaian from "./pages/juri/EventPenilaian";
const JuriPenilaianDetail = lazy(() => import("./pages/juri/PenilaianDetail"));
import JuriMaterialScoring from "./pages/juri/MaterialScoring";
const PelatihDashboard = lazy(() => import("./pages/pelatih/Dashboard"));
const ManageJury = lazy(() => import("./pages/panitia/ManageJury"));
const ManageJuara = lazy(() => import("./pages/panitia/ManageJuara"));
const ManageMateri = lazy(() => import("./pages/panitia/ManageMateri"));
const FieldRechecking = lazy(() => import("./pages/panitia/FieldRechecking"));
const PanitiaEventRecap = lazy(() => import("./pages/panitia/EventRecap"));
const EventTicketing = lazy(() => import("./pages/panitia/EventTicketing"));
const EventVoting = lazy(() => import("./pages/panitia/EventVoting"));
const PerformanceHistory = lazy(() => import("./pages/shared/PerformanceHistory"));

const LoadingFallback = () => (
	<div className="h-screen w-screen flex items-center justify-center bg-[#080810]">
		<div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
	</div>
);

function App() {
	return (
		<AuthProvider>
			<div className="App">
				<Suspense fallback={<LoadingFallback />}>
				<Routes>
					{/* Public Routes - Main Layout */}
					<Route element={<MainLayout />}>
						<Route index element={<LandingPage />} />
						<Route path="events" element={<EventsPage />} />
						<Route path="marketplace" element={<MarketplacePage />} />
						<Route path="e-ticketing" element={<ETicketingPage />} />
						<Route path="e-voting" element={<EVotingPage />} />
						<Route path="events/:id" element={<EventDetail />} />
						<Route path="juries" element={<AllJuries />} />
						<Route path="pelatih" element={<AllPelatih />} />
						<Route path="klasemen" element={<KlasemenPage />} />
						<Route path="unauthorized" element={<Unauthorized />} />
						<Route path="payment/success" element={<PaymentSuccessPage />} />
					</Route>
					{/* Auth Routes - Auth Layout */}
					<Route element={<AuthLayout />}>
						<Route path="login" element={<Login />} />
						<Route path="register" element={<Register />} />
						<Route path="forgot-password" element={<ForgotPassword />} />
						<Route path="reset-password" element={<ResetPassword />} />
					</Route>
					{/* Role Selection - Protected, no layout */}
					<Route
						path="select-role"
						element={
							<ProtectedRoute>
								<RoleSelection />
							</ProtectedRoute>
						}
					/>
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
								<Route path="users/:userId" element={<UserDetail />} />
							<Route path="coupons" element={<CouponManagement />} />
							<Route path="events" element={<EventManagement />} />
							<Route path="events/:eventId/edit" element={<AdminEditEvent />} />
							<Route path="events/:eventSlug/manage" element={<AdminManageEvent />} />
							<Route path="events/:eventSlug/peserta" element={<EventParticipantManagement />} />
							<Route path="events/:eventSlug/juri" element={<ManageJury />} />
							<Route path="events/:eventSlug/materi" element={<ManageMateri />} />
							<Route path="events/:eventSlug/juara" element={<ManageJuara />} />
							<Route path="events/:eventSlug/manage-fields" element={<Navigate to="../field-rechecking" replace />} />
							<Route path="events/:eventSlug/field-rechecking" element={<FieldRechecking />} />
							<Route path="events/:eventSlug/performance-history" element={<PerformanceHistory />} />
							<Route path="events/:eventSlug/rekapitulasi" element={<PanitiaEventRecap />} />
							<Route path="events/:eventSlug/ticketing" element={<EventTicketing />} />
							<Route path="events/:eventSlug/voting" element={<EventVoting />} />
							<Route
								path="assessment-categories"
								element={<AssessmentCategoryManagement />}
							/>
							<Route path="products" element={<ProductManagement />} />
							<Route path="orders" element={<OrderManagement />} />
							<Route path="guides" element={<GuideManagement />} />
							<Route path="event-submissions" element={<EventSubmissionManagement />} />
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

						{/* Dashboard + Profile - PreAssign Layout (before event assignment) */}
						<Route
							element={
								<ProtectedRoute allowedRoles={["PANITIA"]}>
									<PreAssignLayout />
								</ProtectedRoute>
							}
						>
							<Route path="dashboard" element={<PanitiaDashboard />} />
							<Route path="events-list" element={<PanitiaEventsList />} />
							<Route path="panduan" element={<PanitiaPanduan />} />
							<Route path="profile" element={<Profile />} />
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
							<Route path="events/:eventSlug/ticketing" element={<EventTicketing />} />
							<Route path="events/:eventSlug/voting" element={<EventVoting />} />
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
							<Route path="profile" element={<Profile />} />
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
					{/* Juri Scoring Routes - No layout wrapper, header in each page */}
					<Route
						element={
							<ProtectedRoute allowedRoles={["JURI"]} />
						}
					>
						<Route path="juri">
							<Route path="events/:eventSlug/penilaian" element={<JuriEventPenilaian />}>
								<Route path=":participantId" element={<JuriMaterialScoring />} />
							</Route>
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
				</Suspense>
			</div>
		</AuthProvider>
	);
}

export default App;
