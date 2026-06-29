import { useAuth } from "../../hooks/useAuth";
import LiveVisitorWidget from "../../components/admin/LiveVisitorWidget";
import LiveTransactionWidget from "../../components/admin/LiveTransactionWidget";
import OnlineSidebar from "../../components/admin/OnlineSidebar";

const AdminDashboard = () => {
	const { user } = useAuth();

	return (
		<div className="p-4 sm:p-6 lg:p-8 flex gap-6 items-start">
			<div className="flex-1 min-w-0 space-y-6">
				{/* Header */}
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
					<p className="text-gray-500 dark:text-gray-400 mt-1">Selamat datang kembali, {user?.name}</p>
				</div>

				{/* ── Live Visitor Widget ── */}
				<LiveVisitorWidget />
				{/* ── Live Transaction Widget ── */}
				<LiveTransactionWidget />
			</div>

			{/* ── Online Sidebar ── */}
			<OnlineSidebar />
		</div>
	);
};

export default AdminDashboard;
