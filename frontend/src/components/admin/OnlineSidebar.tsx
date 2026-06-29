import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../utils/api";
import {
	SignalIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
} from "@heroicons/react/24/outline";

interface OnlineUser {
	id: string;
	name: string;
	role: string;
	isOnline?: boolean;
}

const ONLINE_PER_PAGE = 20;
const POLL_INTERVAL_MS = 30_000;

const getRoleBadgeColor = (role: string) => {
	const colors: Record<string, string> = {
		SUPERADMIN: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
		PANITIA: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
		PESERTA: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
		JURI: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
		PELATIH: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
		MITRA: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
	};
	return colors[role] || "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
};

const OnlineSidebar = () => {
	const navigate = useNavigate();
	const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
	const [onlinePage, setOnlinePage] = useState(1);
	const [onlineTotalUsers, setOnlineTotalUsers] = useState(0);
	const [onlineTotalPages, setOnlineTotalPages] = useState(0);
	const [onlineLoading, setOnlineLoading] = useState(false);
	const [showRecentFallback, setShowRecentFallback] = useState(false);

	const fetchOnlineUsers = useCallback(async (silent = false) => {
		try {
			if (!silent) setOnlineLoading(true);
			const params = new URLSearchParams({
				page: String(onlinePage),
				limit: String(ONLINE_PER_PAGE),
				online: "true",
			});
			const response = await api.get(`/users?${params.toString()}`, { silent: true });
			const total = response.data.pagination?.total || 0;

			if (total > 0) {
				setOnlineUsers(response.data.users || []);
				setOnlineTotalUsers(total);
				setOnlineTotalPages(response.data.pagination?.pages || 0);
				setShowRecentFallback(false);
				return;
			}

			// No online users – show recently active (one page, no pagination)
			const fallbackParams = new URLSearchParams({
				page: "1",
				limit: String(ONLINE_PER_PAGE),
				sort: "lastLogin",
			});
			const fallbackRes = await api.get(`/users?${fallbackParams.toString()}`, { silent: true });
			setOnlineUsers(fallbackRes.data.users || []);
			setOnlineTotalUsers(0);
			setOnlineTotalPages(0);
			setShowRecentFallback(true);
		} catch (error) {
			console.error("Error fetching online users:", error);
		} finally {
			if (!silent) setOnlineLoading(false);
		}
	}, [onlinePage]);

	useEffect(() => {
		fetchOnlineUsers();
		const handle = window.setInterval(() => fetchOnlineUsers(true), POLL_INTERVAL_MS);
		return () => window.clearInterval(handle);
	}, [fetchOnlineUsers]);

	return (
		<aside className="hidden lg:flex flex-col w-[280px] flex-shrink-0">
			<div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow dark:shadow-gray-900/50 border border-gray-200/60 dark:border-gray-700/40 p-3 flex flex-col sticky top-4 h-[calc(100vh-2rem)]">
				<div className="flex items-center justify-between gap-2 mb-2">
					<div className="flex items-center gap-1.5">
						<SignalIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
						<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
							{showRecentFallback ? "Terakhir Aktif" : "Online"}
						</h3>
						{!showRecentFallback && (
							<span className="px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
								{onlineTotalUsers}
							</span>
						)}
					</div>
					{!showRecentFallback && onlineTotalPages > 1 && (
						<div className="flex items-center gap-0.5">
							<button
								onClick={() => setOnlinePage((p) => Math.max(1, p - 1))}
								disabled={onlinePage === 1}
								className="p-0.5 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
							>
								<ChevronLeftIcon className="w-3.5 h-3.5" />
							</button>
							<span className="text-[10px] text-gray-500 dark:text-gray-400 min-w-[40px] text-center">
								{onlinePage}/{onlineTotalPages}
							</span>
							<button
								onClick={() => setOnlinePage((p) => Math.min(onlineTotalPages, p + 1))}
								disabled={onlinePage === onlineTotalPages}
								className="p-0.5 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
							>
								<ChevronRightIcon className="w-3.5 h-3.5" />
							</button>
						</div>
					)}
				</div>

				{showRecentFallback && (
					<p className="text-[10px] text-gray-400 dark:text-gray-500 mb-2">Tidak ada user online. Menampilkan yang terakhir aktif.</p>
				)}

				{onlineLoading ? (
					<div className="flex-1 flex items-center justify-center">
						<div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-500/30 border-t-emerald-500"></div>
					</div>
				) : onlineUsers.length === 0 ? (
					<div className="flex-1 flex items-center justify-center">
						<p className="text-xs text-gray-400 dark:text-gray-500 text-center px-3">Belum ada data aktivitas user.</p>
					</div>
				) : (
					<div className="flex-1 overflow-y-auto min-h-0 -mx-1 px-1">
						<div className="divide-y divide-gray-100 dark:divide-gray-700/50">
							{onlineUsers.map((u) => (
								<button
									key={u.id}
									onClick={() => navigate(`/admin/users/${u.id}`)}
									className="flex items-center gap-2 w-full px-1.5 py-1.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 rounded transition-colors"
								>
									<span className={`relative flex-shrink-0 h-6 w-6 ${u.isOnline ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-gray-100 dark:bg-gray-700"} rounded-full flex items-center justify-center`}>
										<span className={`text-[9px] font-bold ${u.isOnline ? "text-emerald-700 dark:text-emerald-300" : "text-gray-500 dark:text-gray-400"}`}>
											{u.name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()}
										</span>
										{u.isOnline && (
											<span className="absolute -bottom-px -right-px h-2 w-2 rounded-full bg-emerald-500 border border-white dark:border-gray-800"></span>
										)}
									</span>
									<span className="text-xs font-medium text-gray-900 dark:text-white truncate flex-1">{u.name}</span>
									<span className={`px-1 py-px rounded text-[9px] font-semibold leading-tight ${getRoleBadgeColor(u.role)}`}>{u.role}</span>
								</button>
							))}
						</div>
					</div>
				)}
			</div>
		</aside>
	);
};

export default OnlineSidebar;
