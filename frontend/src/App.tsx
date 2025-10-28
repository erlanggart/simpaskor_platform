import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";

// Role-based dashboard imports
import AdminDashboard from "./pages/admin/Dashboard";
import PanitiaDashboard from "./pages/panitia/Dashboard";
import PesertaDashboard from "./pages/peserta/Dashboard";
import JuriDashboard from "./pages/juri/Dashboard";
import PelatihDashboard from "./pages/pelatih/Dashboard";

import "./App.css";

function App() {
	return (
		<AuthProvider>
			<div className="App">
				<Routes>
					<Route path="/" element={<LandingPage />} />
					<Route path="/login" element={<Login />} />
					<Route path="/register" element={<Register />} />

					{/* Role-based dashboard routes */}
					<Route
						path="/admin/dashboard"
						element={
							<ProtectedRoute allowedRoles={["SUPERADMIN"]}>
								<AdminDashboard />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/panitia/dashboard"
						element={
							<ProtectedRoute allowedRoles={["PANITIA"]}>
								<PanitiaDashboard />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/peserta/dashboard"
						element={
							<ProtectedRoute allowedRoles={["PESERTA"]}>
								<PesertaDashboard />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/juri/dashboard"
						element={
							<ProtectedRoute allowedRoles={["JURI"]}>
								<JuriDashboard />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/pelatih/dashboard"
						element={
							<ProtectedRoute allowedRoles={["PELATIH"]}>
								<PelatihDashboard />
							</ProtectedRoute>
						}
					/>

					{/* Legacy dashboard route - redirect based on role */}
					<Route
						path="/dashboard"
						element={
							<ProtectedRoute>
								<Dashboard />
							</ProtectedRoute>
						}
					/>

					<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
			</div>
		</AuthProvider>
	);
}

export default App;
