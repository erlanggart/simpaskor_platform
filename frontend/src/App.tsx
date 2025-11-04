import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";

// Layouts
import { MainLayout, AuthLayout, DashboardLayout } from "./layouts";

// Public Pages
import LandingPage from "./pages/LandingPage";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";

// Auth Pages
import Login from "./pages/Login";
import Register from "./pages/Register";

// Dashboard Pages
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";

// Role-based Dashboard Pages
import AdminDashboard from "./pages/admin/Dashboard";
import UserManagement from "./pages/admin/UserManagement";
import CouponManagement from "./pages/admin/CouponManagement";
import AssessmentCategoryManagement from "./pages/admin/AssessmentCategoryManagement";
import EventManagement from "./pages/admin/EventManagement";
import PanitiaDashboard from "./pages/panitia/Dashboard";
import CreateEventForm from "./pages/panitia/CreateEvent";
import EditEventForm from "./pages/panitia/EditEvent";
import PesertaDashboard from "./pages/peserta/Dashboard";
import JuriDashboard from "./pages/juri/Dashboard";
import PelatihDashboard from "./pages/pelatih/Dashboard";

import "./App.css";

function App() {
	return (
		<AuthProvider>
			<div className="App">
				<Routes>
					{/* Public Routes - Main Layout */}
					<Route element={<MainLayout />}>
						<Route index element={<LandingPage />} />
						<Route path="unauthorized" element={<Unauthorized />} />
					</Route>

					{/* Auth Routes - Auth Layout */}
					<Route element={<AuthLayout />}>
						<Route path="login" element={<Login />} />
						<Route path="register" element={<Register />} />
					</Route>

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
							<Route
								path="assessment-categories"
								element={<AssessmentCategoryManagement />}
							/>
							<Route path="profile" element={<Profile />} />
						</Route>
					</Route>

					{/* Panitia Routes - Standalone Dashboard (No Layout) */}
					<Route path="panitia">
						<Route
							path="dashboard"
							element={
								<ProtectedRoute allowedRoles={["PANITIA"]}>
									<PanitiaDashboard />
								</ProtectedRoute>
							}
						/>
						<Route
							path="events/create"
							element={
								<ProtectedRoute allowedRoles={["PANITIA"]}>
									<CreateEventForm />
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
						{/* Profile with Dashboard Layout */}
						<Route
							element={
								<ProtectedRoute allowedRoles={["PANITIA"]}>
									<DashboardLayout />
								</ProtectedRoute>
							}
						>
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
							<Route path="profile" element={<Profile />} />
						</Route>
					</Route>

					{/* Juri Routes - Dashboard Layout */}
					<Route
						element={
							<ProtectedRoute allowedRoles={["JURI"]}>
								<DashboardLayout />
							</ProtectedRoute>
						}
					>
						<Route path="juri">
							<Route path="dashboard" element={<JuriDashboard />} />
							<Route path="profile" element={<Profile />} />
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
