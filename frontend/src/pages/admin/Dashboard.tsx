import { useAuth } from "../../hooks/useAuth";
import { Link } from "react-router-dom";
import {
	UserGroupIcon,
	CalendarIcon,
	ChartBarIcon,
	CogIcon,
	ExclamationTriangleIcon,
	CheckCircleIcon,
	PhotoIcon,
	TicketIcon,
} from "@heroicons/react/24/outline";

const AdminDashboard = () => {
	const { user, logout } = useAuth();

	// Mock data untuk dashboard admin
	const stats = [
		{
			name: "Total Users",
			value: "1,247",
			icon: UserGroupIcon,
			change: "+12%",
			changeType: "increase",
		},
		{
			name: "Active Events",
			value: "23",
			icon: CalendarIcon,
			change: "+3",
			changeType: "increase",
		},
		{
			name: "System Health",
			value: "98.2%",
			icon: ChartBarIcon,
			change: "-0.1%",
			changeType: "decrease",
		},
		{
			name: "Pending Approvals",
			value: "15",
			icon: ExclamationTriangleIcon,
			change: "+5",
			changeType: "increase",
		},
	];

	const recentActivities = [
		{
			id: 1,
			type: "user_registered",
			description: "New user registered: john.doe@example.com",
			timestamp: "2 minutes ago",
			status: "info",
		},
		{
			id: 2,
			type: "event_created",
			description: "New event created: Championship 2025",
			timestamp: "15 minutes ago",
			status: "success",
		},
		{
			id: 3,
			type: "system_warning",
			description: "High server load detected",
			timestamp: "1 hour ago",
			status: "warning",
		},
		{
			id: 4,
			type: "user_approved",
			description: "User account approved: jane.smith@example.com",
			timestamp: "2 hours ago",
			status: "success",
		},
	];

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "success":
				return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
			case "warning":
				return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
			default:
				return <ChartBarIcon className="h-5 w-5 text-blue-500" />;
		}
	};

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<header className="bg-white shadow">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center py-6">
						<div>
							<h1 className="text-3xl font-bold text-gray-900">
								SuperAdmin Dashboard
							</h1>
							<p className="text-gray-600">Selamat datang, {user?.name}</p>
						</div>
						<div className="flex items-center space-x-4">
							<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
								SuperAdmin
							</span>
							<button
								onClick={logout}
								className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
							>
								Logout
							</button>
						</div>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
				{/* Stats Grid */}
				<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
					{stats.map((item) => (
						<div
							key={item.name}
							className="bg-white overflow-hidden shadow rounded-lg"
						>
							<div className="p-5">
								<div className="flex items-center">
									<div className="flex-shrink-0">
										<item.icon className="h-6 w-6 text-gray-400" />
									</div>
									<div className="ml-5 w-0 flex-1">
										<dl>
											<dt className="text-sm font-medium text-gray-500 truncate">
												{item.name}
											</dt>
											<dd className="flex items-baseline">
												<div className="text-2xl font-semibold text-gray-900">
													{item.value}
												</div>
												<div
													className={`ml-2 flex items-baseline text-sm font-semibold ${
														item.changeType === "increase"
															? "text-green-600"
															: "text-red-600"
													}`}
												>
													{item.change}
												</div>
											</dd>
										</dl>
									</div>
								</div>
							</div>
						</div>
					))}
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					{/* Recent Activities */}
					<div className="bg-white shadow rounded-lg">
						<div className="px-6 py-4 border-b border-gray-200">
							<h3 className="text-lg font-medium text-gray-900">
								Recent Activities
							</h3>
						</div>
						<div className="divide-y divide-gray-200">
							{recentActivities.map((activity) => (
								<div key={activity.id} className="px-6 py-4">
									<div className="flex items-start space-x-3">
										{getStatusIcon(activity.status)}
										<div className="flex-1 min-w-0">
											<p className="text-sm text-gray-900">
												{activity.description}
											</p>
											<p className="text-sm text-gray-500">
												{activity.timestamp}
											</p>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Quick Actions */}
					<div className="bg-white shadow rounded-lg">
						<div className="px-6 py-4 border-b border-gray-200">
							<h3 className="text-lg font-medium text-gray-900">
								Quick Actions
							</h3>
						</div>
						<div className="p-6">
							<div className="grid grid-cols-2 gap-4">
								<Link
									to="/admin/users"
									className="flex flex-col items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
								>
									<UserGroupIcon className="h-8 w-8 text-blue-500 mb-2" />
									<span className="text-sm font-medium">Manage Users</span>
								</Link>
								<Link
									to="/admin/coupons"
									className="flex flex-col items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
								>
									<TicketIcon className="h-8 w-8 text-green-500 mb-2" />
									<span className="text-sm font-medium">Manage Coupons</span>
								</Link>
								<Link
									to="/admin/banners"
									className="flex flex-col items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
								>
									<PhotoIcon className="h-8 w-8 text-purple-500 mb-2" />
									<span className="text-sm font-medium">Manage Banners</span>
								</Link>
								<Link
									to="/admin/assessment-categories"
									className="flex flex-col items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
								>
									<ChartBarIcon className="h-8 w-8 text-orange-500 mb-2" />
									<span className="text-sm font-medium">
										Assessment Categories
									</span>
								</Link>
								<Link
									to="/admin/events"
									className="flex flex-col items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
								>
									<CalendarIcon className="h-8 w-8 text-indigo-500 mb-2" />
									<span className="text-sm font-medium">Manage Events</span>
								</Link>
								<button className="flex flex-col items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50">
									<CogIcon className="h-8 w-8 text-gray-500 mb-2" />
									<span className="text-sm font-medium">System Settings</span>
								</button>
							</div>
						</div>
					</div>
				</div>

				{/* System Status */}
				<div className="mt-8">
					<div className="bg-white shadow rounded-lg">
						<div className="px-6 py-4 border-b border-gray-200">
							<h3 className="text-lg font-medium text-gray-900">
								System Status
							</h3>
						</div>
						<div className="p-6">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
								<div className="text-center">
									<div className="text-2xl font-bold text-green-600">99.9%</div>
									<div className="text-sm text-gray-500">Uptime</div>
								</div>
								<div className="text-center">
									<div className="text-2xl font-bold text-blue-600">45ms</div>
									<div className="text-sm text-gray-500">Response Time</div>
								</div>
								<div className="text-center">
									<div className="text-2xl font-bold text-purple-600">
										2.1GB
									</div>
									<div className="text-sm text-gray-500">Memory Usage</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
};

export default AdminDashboard;
