import { useState, useEffect } from "react";
import { api } from "../../utils/api";
import Swal from "sweetalert2";
import {
	CircleStackIcon,
	ArrowDownTrayIcon,
	ArrowUpTrayIcon,
	TableCellsIcon,
	ServerIcon,
	ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

interface TableInfo {
	name: string;
	size: string;
	columns: number;
}

interface DbInfo {
	databaseSize: string;
	tableCount: number;
	tables: TableInfo[];
}

const Backup = () => {
	const [dbInfo, setDbInfo] = useState<DbInfo | null>(null);
	const [loading, setLoading] = useState(true);
	const [downloading, setDownloading] = useState(false);
	const [restoring, setRestoring] = useState(false);

	useEffect(() => {
		fetchDbInfo();
	}, []);

	const fetchDbInfo = async () => {
		try {
			setLoading(true);
			const res = await api.get("/backup/info");
			setDbInfo(res.data);
		} catch {
			// Silently fail
		} finally {
			setLoading(false);
		}
	};

	const handleDownload = async () => {
		try {
			setDownloading(true);
			const res = await api.get("/backup/download", { responseType: "blob" });

			const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
			const filename = `backup_simpaskor_${timestamp}.sql`;

			const url = window.URL.createObjectURL(new Blob([res.data]));
			const a = document.createElement("a");
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);

			Swal.fire("Berhasil", "Backup berhasil diunduh", "success");
		} catch (err: any) {
			Swal.fire("Error", err.response?.data?.error || "Gagal mengunduh backup", "error");
		} finally {
			setDownloading(false);
		}
	};

	const handleRestore = async () => {
		const result = await Swal.fire({
			title: "Restore Database?",
			html: `<div class="text-left text-sm">
				<p class="text-red-600 font-semibold mb-2">⚠️ PERHATIAN: Operasi ini berbahaya!</p>
				<ul class="list-disc pl-5 space-y-1">
					<li>Data yang ada saat ini bisa tertimpa</li>
					<li>Pastikan Anda sudah backup terlebih dahulu</li>
					<li>Proses tidak bisa dibatalkan</li>
				</ul>
			</div>`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#ef4444",
			cancelButtonColor: "#6B7280",
			confirmButtonText: "Ya, Lanjutkan",
			cancelButtonText: "Batal",
			reverseButtons: true,
		});

		if (!result.isConfirmed) return;

		// File picker
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".sql";
		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (!file) return;

			if (!file.name.endsWith(".sql")) {
				Swal.fire("Error", "Hanya file .sql yang diperbolehkan", "error");
				return;
			}

			if (file.size > 100 * 1024 * 1024) {
				Swal.fire("Error", "File terlalu besar (max 100MB)", "error");
				return;
			}

			const confirmRestore = await Swal.fire({
				title: "Konfirmasi Restore",
				text: `Anda akan restore dari file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
				icon: "warning",
				showCancelButton: true,
				confirmButtonColor: "#ef4444",
				cancelButtonColor: "#6B7280",
				confirmButtonText: "Restore Sekarang",
				cancelButtonText: "Batal",
				reverseButtons: true,
			});

			if (!confirmRestore.isConfirmed) return;

			try {
				setRestoring(true);
				const sqlContent = await file.text();
				await api.post("/backup/restore", { sqlContent });
				Swal.fire("Berhasil", "Database berhasil di-restore", "success");
				fetchDbInfo();
			} catch (err: any) {
				Swal.fire("Error", err.response?.data?.error || "Gagal restore database", "error");
			} finally {
				setRestoring(false);
			}
		};
		input.click();
	};

	return (
		<div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
			{/* Header */}
			<div className="flex items-center gap-3">
				<div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
					<CircleStackIcon className="w-5 h-5 text-red-500" />
				</div>
				<div>
					<h1 className="text-xl font-bold text-gray-900 dark:text-white">Backup & Restore</h1>
					<p className="text-sm text-gray-500 dark:text-gray-400">Kelola backup dan restore database</p>
				</div>
			</div>

			{/* Actions */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{/* Download Backup */}
				<div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.06] p-5">
					<div className="flex items-center gap-3 mb-3">
						<div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
							<ArrowDownTrayIcon className="w-5 h-5 text-blue-500" />
						</div>
						<div>
							<h2 className="font-semibold text-gray-900 dark:text-white">Download Backup</h2>
							<p className="text-xs text-gray-500 dark:text-gray-400">Unduh seluruh database dalam format .sql</p>
						</div>
					</div>

					<div className="mb-4 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-500/[0.05] border border-blue-100 dark:border-blue-500/10">
						<p className="text-xs text-blue-600 dark:text-blue-400">
							File backup berisi semua tabel, data, dan struktur database saat ini.
						</p>
					</div>

					<button
						onClick={handleDownload}
						disabled={downloading}
						className="w-full py-2.5 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
					>
						{downloading ? (
							<>
								<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
								Mengunduh...
							</>
						) : (
							<>
								<ArrowDownTrayIcon className="w-4 h-4" />
								Download Backup
							</>
						)}
					</button>
				</div>

				{/* Restore */}
				<div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.06] p-5">
					<div className="flex items-center gap-3 mb-3">
						<div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
							<ArrowUpTrayIcon className="w-5 h-5 text-amber-500" />
						</div>
						<div>
							<h2 className="font-semibold text-gray-900 dark:text-white">Restore Database</h2>
							<p className="text-xs text-gray-500 dark:text-gray-400">Upload file .sql untuk restore</p>
						</div>
					</div>

					<div className="mb-4 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/[0.05] border border-amber-100 dark:border-amber-500/10">
						<div className="flex items-start gap-2">
							<ExclamationTriangleIcon className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
							<p className="text-xs text-amber-600 dark:text-amber-400">
								Restore akan menjalankan SQL langsung ke database. Pastikan backup sudah diunduh terlebih dahulu.
							</p>
						</div>
					</div>

					<button
						onClick={handleRestore}
						disabled={restoring}
						className="w-full py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
					>
						{restoring ? (
							<>
								<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
								Restoring...
							</>
						) : (
							<>
								<ArrowUpTrayIcon className="w-4 h-4" />
								Upload & Restore
							</>
						)}
					</button>
				</div>
			</div>

			{/* Database Info */}
			<div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.06] p-5">
				<div className="flex items-center gap-2 mb-4">
					<ServerIcon className="w-5 h-5 text-red-500" />
					<h2 className="font-semibold text-gray-900 dark:text-white">Informasi Database</h2>
				</div>

				{loading ? (
					<div className="flex items-center justify-center py-8">
						<div className="w-6 h-6 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
					</div>
				) : dbInfo ? (
					<>
						{/* Stats */}
						<div className="grid grid-cols-2 gap-3 mb-5">
							<div className="px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05]">
								<p className="text-xs text-gray-500 dark:text-gray-400">Ukuran Database</p>
								<p className="text-lg font-bold text-gray-900 dark:text-white">{dbInfo.databaseSize}</p>
							</div>
							<div className="px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05]">
								<p className="text-xs text-gray-500 dark:text-gray-400">Jumlah Tabel</p>
								<p className="text-lg font-bold text-gray-900 dark:text-white">{dbInfo.tableCount}</p>
							</div>
						</div>

						{/* Table List */}
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b border-gray-100 dark:border-white/[0.06]">
										<th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs">Tabel</th>
										<th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs">Ukuran</th>
										<th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs">Kolom</th>
									</tr>
								</thead>
								<tbody>
									{dbInfo.tables.map((table) => (
										<tr
											key={table.name}
											className="border-b border-gray-50 dark:border-white/[0.03] last:border-0"
										>
											<td className="py-2 px-3">
												<div className="flex items-center gap-2">
													<TableCellsIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
													<span className="text-gray-900 dark:text-white font-medium">{table.name}</span>
												</div>
											</td>
											<td className="py-2 px-3 text-right text-gray-500 dark:text-gray-400">{table.size}</td>
											<td className="py-2 px-3 text-right text-gray-500 dark:text-gray-400">{Number(table.columns)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</>
				) : (
					<p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
						Gagal memuat informasi database
					</p>
				)}
			</div>
		</div>
	);
};

export default Backup;
