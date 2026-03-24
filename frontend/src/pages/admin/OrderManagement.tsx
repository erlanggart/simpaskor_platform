import React, { useState, useEffect } from "react";
import {
	ClipboardDocumentListIcon,
	EyeIcon,
	XMarkIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../utils/api";
import { showSuccess, showError } from "../../utils/sweetalert";
import { Order } from "../../types/marketplace";

const OrderManagement: React.FC = () => {
	const [orders, setOrders] = useState<Order[]>([]);
	const [loading, setLoading] = useState(true);
	const [statusFilter, setStatusFilter] = useState("");
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
	const [updatingStatus, setUpdatingStatus] = useState(false);

	const fetchOrders = async () => {
		try {
			setLoading(true);
			const params: any = { page, limit: 20 };
			if (statusFilter) params.status = statusFilter;
			const res = await api.get("/orders/admin/all", { params });
			setOrders(res.data.data || []);
			setTotalPages(res.data.totalPages || 1);
		} catch (err) {
			showError("Gagal memuat pesanan");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchOrders();
	}, [page, statusFilter]);

	const handleStatusUpdate = async (orderId: string, newStatus: string) => {
		setUpdatingStatus(true);
		try {
			const res = await api.patch(`/orders/admin/${orderId}/status`, { status: newStatus });
			showSuccess(`Status diubah ke ${getStatusLabel(newStatus)}`);
			setSelectedOrder(res.data);
			fetchOrders();
		} catch (err: any) {
			showError(err.response?.data?.error || "Gagal mengupdate status");
		} finally {
			setUpdatingStatus(false);
		}
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("id-ID", {
			style: "currency",
			currency: "IDR",
			minimumFractionDigits: 0,
		}).format(amount);
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const getStatusLabel = (status: string) => {
		const labels: Record<string, string> = {
			PENDING: "Menunggu",
			CONFIRMED: "Dikonfirmasi",
			PROCESSING: "Diproses",
			SHIPPED: "Dikirim",
			COMPLETED: "Selesai",
			CANCELLED: "Dibatalkan",
		};
		return labels[status] || status;
	};

	const getStatusColor = (status: string) => {
		const colors: Record<string, string> = {
			PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
			CONFIRMED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
			PROCESSING: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
			SHIPPED: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
			COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
			CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
		};
		return colors[status] || "";
	};

	const statusFlow = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "COMPLETED"];

	return (
		<div className="p-6">
			{/* Header */}
			<div className="flex items-center gap-3 mb-6">
				<ClipboardDocumentListIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
				<div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manajemen Pesanan</h1>
					<p className="text-sm text-gray-500 dark:text-gray-400">Kelola pesanan marketplace</p>
				</div>
			</div>

			{/* Filter */}
			<div className="mb-6">
				<select
					value={statusFilter}
					onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
					className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
				>
					<option value="">Semua Status</option>
					<option value="PENDING">Menunggu</option>
					<option value="CONFIRMED">Dikonfirmasi</option>
					<option value="PROCESSING">Diproses</option>
					<option value="SHIPPED">Dikirim</option>
					<option value="COMPLETED">Selesai</option>
					<option value="CANCELLED">Dibatalkan</option>
				</select>
			</div>

			{/* Table */}
			{loading ? (
				<div className="flex justify-center py-12">
					<div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
				</div>
			) : orders.length === 0 ? (
				<div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
					<ClipboardDocumentListIcon className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
					<p className="text-gray-500 dark:text-gray-400">Belum ada pesanan</p>
				</div>
			) : (
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
							<thead className="bg-gray-50 dark:bg-gray-900">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tanggal</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Pemesan</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Item</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total</th>
									<th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
									<th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Aksi</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-200 dark:divide-gray-700">
								{orders.map((order) => (
									<tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
										<td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
											{formatDate(order.createdAt)}
										</td>
										<td className="px-4 py-3">
											<p className="text-sm font-medium text-gray-900 dark:text-white">{order.user?.name}</p>
											<p className="text-xs text-gray-500 dark:text-gray-400">{order.user?.email}</p>
										</td>
										<td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
											{order.items.length} produk
										</td>
										<td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
											{formatCurrency(order.totalAmount)}
										</td>
										<td className="px-4 py-3 text-center">
											<span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
												{getStatusLabel(order.status)}
											</span>
										</td>
										<td className="px-4 py-3 text-center">
											<button
												onClick={() => setSelectedOrder(order)}
												className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
												title="Detail"
											>
												<EyeIcon className="w-5 h-5" />
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{totalPages > 1 && (
						<div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
							<p className="text-sm text-gray-500 dark:text-gray-400">Halaman {page} dari {totalPages}</p>
							<div className="flex gap-2">
								<button
									onClick={() => setPage(Math.max(1, page - 1))}
									disabled={page === 1}
									className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
								>
									Prev
								</button>
								<button
									onClick={() => setPage(Math.min(totalPages, page + 1))}
									disabled={page === totalPages}
									className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
								>
									Next
								</button>
							</div>
						</div>
					)}
				</div>
			)}

			{/* Order Detail Modal */}
			{selectedOrder && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
					<div className="absolute inset-0 bg-black/50" />
					<div
						className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
							<h2 className="text-lg font-semibold text-gray-900 dark:text-white">Detail Pesanan</h2>
							<button onClick={() => setSelectedOrder(null)}>
								<XMarkIcon className="w-6 h-6 text-gray-400 hover:text-gray-600" />
							</button>
						</div>

						<div className="p-6 space-y-4">
							{/* Order Info */}
							<div className="grid grid-cols-2 gap-4 text-sm">
								<div>
									<p className="text-gray-500 dark:text-gray-400">Pemesan</p>
									<p className="font-medium text-gray-900 dark:text-white">{selectedOrder.user?.name}</p>
									<p className="text-xs text-gray-500">{selectedOrder.user?.email}</p>
								</div>
								<div>
									<p className="text-gray-500 dark:text-gray-400">Tanggal</p>
									<p className="font-medium text-gray-900 dark:text-white">{formatDate(selectedOrder.createdAt)}</p>
								</div>
							</div>

							{/* Items */}
							<div>
								<p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Item Pesanan</p>
								<div className="space-y-2">
									{selectedOrder.items.map((item) => (
										<div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
											<div>
												<p className="text-sm font-medium text-gray-900 dark:text-white">{item.product?.name || "Produk dihapus"}</p>
												<p className="text-xs text-gray-500">{item.quantity} x {formatCurrency(item.price)}</p>
											</div>
											<p className="text-sm font-medium text-gray-900 dark:text-white">
												{formatCurrency(item.price * item.quantity)}
											</p>
										</div>
									))}
								</div>
							</div>

							{/* Total */}
							<div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
								<span className="font-medium text-gray-700 dark:text-gray-300">Total</span>
								<span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
									{formatCurrency(selectedOrder.totalAmount)}
								</span>
							</div>

							{selectedOrder.notes && (
								<div>
									<p className="text-sm text-gray-500 dark:text-gray-400">Catatan</p>
									<p className="text-sm text-gray-900 dark:text-white">{selectedOrder.notes}</p>
								</div>
							)}

							{/* Status Update */}
							<div>
								<p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Update Status</p>
								<div className="flex flex-wrap gap-2">
									{[...statusFlow, "CANCELLED"].map((status) => (
										<button
											key={status}
											onClick={() => handleStatusUpdate(selectedOrder.id, status)}
											disabled={updatingStatus || selectedOrder.status === status}
											className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
												selectedOrder.status === status
													? getStatusColor(status) + " ring-2 ring-offset-1 ring-indigo-500"
													: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
											} ${updatingStatus ? "opacity-50 cursor-not-allowed" : ""}`}
										>
											{getStatusLabel(status)}
										</button>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default OrderManagement;
