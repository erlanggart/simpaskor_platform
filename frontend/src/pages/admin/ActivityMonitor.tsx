import React, { useCallback, useEffect, useState } from "react";
import {
	LuActivity,
	LuMapPin,
	LuMonitor,
	LuSearch,
	LuRefreshCw,
	LuExternalLink,
} from "react-icons/lu";
import { activityAPI } from "../../utils/api";

type Tab = "logs" | "sessions";

const ACTION_OPTIONS = [
	{ value: "", label: "Semua aksi" },
	{ value: "LOGIN", label: "Login" },
	{ value: "LOGOUT", label: "Logout" },
	{ value: "PAGE_VIEW", label: "Buka halaman" },
	{ value: "CREATE", label: "Membuat" },
	{ value: "UPDATE", label: "Mengubah" },
	{ value: "DELETE", label: "Menghapus" },
	{ value: "OTHER", label: "Lainnya" },
];

const actionColor = (action: string): string => {
	switch (action) {
		case "LOGIN":
			return "bg-green-100 text-green-700";
		case "LOGOUT":
			return "bg-gray-100 text-gray-600";
		case "CREATE":
			return "bg-blue-100 text-blue-700";
		case "UPDATE":
			return "bg-amber-100 text-amber-700";
		case "DELETE":
			return "bg-red-100 text-red-700";
		case "PAGE_VIEW":
			return "bg-purple-100 text-purple-700";
		default:
			return "bg-slate-100 text-slate-600";
	}
};

const roleColor = (role: string): string => {
	switch (role) {
		case "SUPERADMIN":
			return "bg-red-100 text-red-700";
		case "PANITIA":
			return "bg-indigo-100 text-indigo-700";
		case "JURI":
			return "bg-cyan-100 text-cyan-700";
		case "PESERTA":
			return "bg-emerald-100 text-emerald-700";
		case "PELATIH":
			return "bg-orange-100 text-orange-700";
		case "MITRA":
			return "bg-pink-100 text-pink-700";
		default:
			return "bg-gray-100 text-gray-600";
	}
};

const fmt = (d: string) =>
	new Date(d).toLocaleString("id-ID", {
		day: "2-digit",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
	});

const ActivityMonitor: React.FC = () => {
	const [tab, setTab] = useState<Tab>("logs");

	// logs state
	const [logs, setLogs] = useState<any[]>([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [action, setAction] = useState("");
	const [search, setSearch] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [loading, setLoading] = useState(false);

	// sessions state
	const [sessions, setSessions] = useState<any[]>([]);
	const [sessionsLoading, setSessionsLoading] = useState(false);

	const loadLogs = useCallback(async () => {
		setLoading(true);
		try {
			const res = await activityAPI.getActivity({
				page,
				limit: 50,
				action: action || undefined,
				search: search || undefined,
			});
			setLogs(res.logs);
			setTotalPages(res.pagination?.totalPages || 1);
		} catch {
			setLogs([]);
		} finally {
			setLoading(false);
		}
	}, [page, action, search]);

	const loadSessions = useCallback(async () => {
		setSessionsLoading(true);
		try {
			const res = await activityAPI.getSessions();
			setSessions(res.sessions);
		} catch {
			setSessions([]);
		} finally {
			setSessionsLoading(false);
		}
	}, []);

	useEffect(() => {
		if (tab === "logs") loadLogs();
		else loadSessions();
	}, [tab, loadLogs, loadSessions]);

	const submitSearch = (e: React.FormEvent) => {
		e.preventDefault();
		setPage(1);
		setSearch(searchInput.trim());
	};

	return (
		<div className="p-4 md:p-6 max-w-7xl mx-auto">
			{/* Header */}
			<div className="flex items-center gap-3 mb-6">
				<div className="w-11 h-11 rounded-xl bg-red-600 flex items-center justify-center text-white">
					<LuActivity className="w-6 h-6" />
				</div>
				<div>
					<h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">
						Monitor Aktivitas
					</h1>
					<p className="text-sm text-gray-500">
						Pantau login, lokasi, dan aktivitas setiap akun
					</p>
				</div>
			</div>

			{/* Tabs */}
			<div className="flex gap-2 mb-4">
				<button
					onClick={() => setTab("logs")}
					className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
						tab === "logs"
							? "bg-red-600 text-white"
							: "bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10"
					}`}
				>
					Log Aktivitas
				</button>
				<button
					onClick={() => setTab("sessions")}
					className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
						tab === "sessions"
							? "bg-red-600 text-white"
							: "bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10"
					}`}
				>
					Sesi & Lokasi
				</button>
			</div>

			{tab === "logs" ? (
				<div className="bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
					{/* Filters */}
					<div className="p-3 flex flex-col sm:flex-row gap-2 border-b border-gray-100 dark:border-white/10">
						<form onSubmit={submitSearch} className="flex-1 flex gap-2">
							<div className="relative flex-1">
								<LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
								<input
									value={searchInput}
									onChange={(e) => setSearchInput(e.target.value)}
									placeholder="Cari nama, email, atau aktivitas…"
									className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-transparent text-sm text-gray-800 dark:text-white"
								/>
							</div>
							<button
								type="submit"
								className="px-4 py-2 rounded-lg bg-gray-800 text-white text-sm"
							>
								Cari
							</button>
						</form>
						<select
							value={action}
							onChange={(e) => {
								setPage(1);
								setAction(e.target.value);
							}}
							className="px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-transparent text-sm text-gray-800 dark:text-white"
						>
							{ACTION_OPTIONS.map((o) => (
								<option key={o.value} value={o.value}>
									{o.label}
								</option>
							))}
						</select>
						<button
							onClick={loadLogs}
							className="px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300"
							title="Muat ulang"
						>
							<LuRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
						</button>
					</div>

					{/* Table */}
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead className="bg-gray-50 dark:bg-white/5 text-gray-500 text-left">
								<tr>
									<th className="px-4 py-3 font-medium">Waktu</th>
									<th className="px-4 py-3 font-medium">Pengguna</th>
									<th className="px-4 py-3 font-medium">Aksi</th>
									<th className="px-4 py-3 font-medium">Aktivitas</th>
									<th className="px-4 py-3 font-medium">Lokasi / Device</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100 dark:divide-white/5">
								{loading ? (
									<tr>
										<td colSpan={5} className="px-4 py-10 text-center text-gray-400">
											Memuat…
										</td>
									</tr>
								) : logs.length === 0 ? (
									<tr>
										<td colSpan={5} className="px-4 py-10 text-center text-gray-400">
											Belum ada aktivitas
										</td>
									</tr>
								) : (
									logs.map((log) => (
										<tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
											<td className="px-4 py-3 whitespace-nowrap text-gray-500">
												{fmt(log.createdAt)}
											</td>
											<td className="px-4 py-3">
												<div className="font-medium text-gray-800 dark:text-white">
													{log.user?.name || "—"}
												</div>
												<div className="flex items-center gap-2">
													<span
														className={`text-[10px] px-1.5 py-0.5 rounded ${roleColor(
															log.user?.role
														)}`}
													>
														{log.user?.role}
													</span>
													<span className="text-xs text-gray-400">
														{log.user?.email}
													</span>
												</div>
											</td>
											<td className="px-4 py-3">
												<span
													className={`text-xs px-2 py-1 rounded-full font-medium ${actionColor(
														log.action
													)}`}
												>
													{log.action}
												</span>
											</td>
											<td className="px-4 py-3 text-gray-700 dark:text-gray-200">
												{log.description || log.path}
											</td>
											<td className="px-4 py-3 text-gray-500">
												{log.session?.latitude != null ? (
													<a
														href={`https://www.google.com/maps?q=${log.session.latitude},${log.session.longitude}`}
														target="_blank"
														rel="noreferrer"
														className="inline-flex items-center gap-1 text-red-600 hover:underline"
													>
														<LuMapPin className="w-3.5 h-3.5" />
														{log.session.locationLabel
															? log.session.locationLabel.split(",").slice(0, 2).join(",")
															: "Lihat peta"}
														<LuExternalLink className="w-3 h-3" />
													</a>
												) : (
													<span className="text-xs text-gray-400">—</span>
												)}
												{log.session?.deviceName && (
													<div className="text-xs text-gray-400 flex items-center gap-1">
														<LuMonitor className="w-3 h-3" />
														{log.session.deviceName}
													</div>
												)}
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>

					{/* Pagination */}
					<div className="flex items-center justify-between p-3 border-t border-gray-100 dark:border-white/10">
						<span className="text-xs text-gray-500">
							Halaman {page} dari {totalPages}
						</span>
						<div className="flex gap-2">
							<button
								disabled={page <= 1}
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-sm disabled:opacity-40"
							>
								Sebelumnya
							</button>
							<button
								disabled={page >= totalPages}
								onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
								className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-sm disabled:opacity-40"
							>
								Berikutnya
							</button>
						</div>
					</div>
				</div>
			) : (
				/* Sessions tab */
				<div className="bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
					<div className="p-3 flex justify-between items-center border-b border-gray-100 dark:border-white/10">
						<span className="text-sm text-gray-500">
							Sesi aktif (belum kedaluwarsa)
						</span>
						<button
							onClick={loadSessions}
							className="px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300"
						>
							<LuRefreshCw
								className={`w-4 h-4 ${sessionsLoading ? "animate-spin" : ""}`}
							/>
						</button>
					</div>
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead className="bg-gray-50 dark:bg-white/5 text-gray-500 text-left">
								<tr>
									<th className="px-4 py-3 font-medium">Pengguna</th>
									<th className="px-4 py-3 font-medium">Device / IP</th>
									<th className="px-4 py-3 font-medium">Lokasi</th>
									<th className="px-4 py-3 font-medium">Status</th>
									<th className="px-4 py-3 font-medium">Aktif terakhir</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100 dark:divide-white/5">
								{sessionsLoading ? (
									<tr>
										<td colSpan={5} className="px-4 py-10 text-center text-gray-400">
											Memuat…
										</td>
									</tr>
								) : sessions.length === 0 ? (
									<tr>
										<td colSpan={5} className="px-4 py-10 text-center text-gray-400">
											Tidak ada sesi aktif
										</td>
									</tr>
								) : (
									sessions.map((s) => (
										<tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
											<td className="px-4 py-3">
												<div className="font-medium text-gray-800 dark:text-white">
													{s.user?.name}
												</div>
												<div className="flex items-center gap-2">
													<span
														className={`text-[10px] px-1.5 py-0.5 rounded ${roleColor(
															s.user?.role
														)}`}
													>
														{s.user?.role}
													</span>
													<span className="text-xs text-gray-400">{s.user?.email}</span>
												</div>
											</td>
											<td className="px-4 py-3 text-gray-500">
												<div className="flex items-center gap-1">
													<LuMonitor className="w-3.5 h-3.5" />
													{s.deviceName || "—"}
												</div>
												<div className="text-xs text-gray-400">{s.ipAddress}</div>
											</td>
											<td className="px-4 py-3">
												{s.latitude != null ? (
													<a
														href={`https://www.google.com/maps?q=${s.latitude},${s.longitude}`}
														target="_blank"
														rel="noreferrer"
														className="inline-flex items-center gap-1 text-red-600 hover:underline"
													>
														<LuMapPin className="w-3.5 h-3.5" />
														{s.locationLabel
															? s.locationLabel.split(",").slice(0, 3).join(",")
															: "Lihat peta"}
													</a>
												) : (
													<span className="text-xs text-gray-400">—</span>
												)}
											</td>
											<td className="px-4 py-3">
												<span
													className={`text-xs px-2 py-1 rounded-full font-medium ${
														s.locationStatus === "GRANTED"
															? "bg-green-100 text-green-700"
															: s.locationStatus === "DENIED"
															? "bg-red-100 text-red-700"
															: "bg-gray-100 text-gray-600"
													}`}
												>
													{s.locationStatus}
												</span>
											</td>
											<td className="px-4 py-3 text-gray-500 whitespace-nowrap">
												{fmt(s.lastActive)}
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
};

export default ActivityMonitor;
