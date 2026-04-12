import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../utils/api";
import Swal from "sweetalert2";
import {
	KeyIcon,
	EnvelopeIcon,
	DevicePhoneMobileIcon,
	ComputerDesktopIcon,
	ArrowRightOnRectangleIcon,
	ShieldCheckIcon,
	EyeIcon,
	EyeSlashIcon,
	ClockIcon,
	GlobeAltIcon,
} from "@heroicons/react/24/outline";

interface Session {
	id: string;
	ipAddress: string | null;
	userAgent: string | null;
	deviceName: string | null;
	lastActive: string;
	createdAt: string;
	isCurrent: boolean;
}

const Settings = () => {
	const { user, setAuth } = useAuth();

	// Password
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showCurrent, setShowCurrent] = useState(false);
	const [showNew, setShowNew] = useState(false);
	const [passwordLoading, setPasswordLoading] = useState(false);

	// Email
	const [newEmail, setNewEmail] = useState("");
	const [emailPassword, setEmailPassword] = useState("");
	const [emailLoading, setEmailLoading] = useState(false);

	// Sessions
	const [sessions, setSessions] = useState<Session[]>([]);
	const [sessionsLoading, setSessionsLoading] = useState(true);

	useEffect(() => {
		fetchSessions();
	}, []);

	const fetchSessions = async () => {
		try {
			setSessionsLoading(true);
			const res = await api.get("/settings/sessions");
			setSessions(res.data.sessions);
		} catch {
			// Silently fail
		} finally {
			setSessionsLoading(false);
		}
	};

	const handleChangePassword = async (e: React.FormEvent) => {
		e.preventDefault();
		if (newPassword !== confirmPassword) {
			Swal.fire("Error", "Password baru tidak cocok", "error");
			return;
		}
		if (newPassword.length < 8) {
			Swal.fire("Error", "Password minimal 8 karakter", "error");
			return;
		}

		try {
			setPasswordLoading(true);
			await api.put("/settings/password", { currentPassword, newPassword });
			Swal.fire("Berhasil", "Password berhasil diubah", "success");
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
		} catch (err: any) {
			Swal.fire("Error", err.response?.data?.error || "Gagal mengubah password", "error");
		} finally {
			setPasswordLoading(false);
		}
	};

	const handleChangeEmail = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newEmail || !emailPassword) {
			Swal.fire("Error", "Harap isi semua field", "error");
			return;
		}

		const result = await Swal.fire({
			title: "Ubah Email?",
			text: `Email akan diubah ke: ${newEmail}`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#ef4444",
			cancelButtonColor: "#6B7280",
			confirmButtonText: "Ya, Ubah",
			cancelButtonText: "Batal",
			reverseButtons: true,
		});

		if (!result.isConfirmed) return;

		try {
			setEmailLoading(true);
			const res = await api.put("/settings/email", {
				newEmail,
				password: emailPassword,
			});

			// Update token and user in auth context
			if (res.data.token && user) {
				localStorage.setItem("token", res.data.token);
				const updatedUser = { ...user, email: res.data.email };
				localStorage.setItem("user", JSON.stringify(updatedUser));
				setAuth(updatedUser, res.data.token);
			}

			Swal.fire("Berhasil", "Email berhasil diubah", "success");
			setNewEmail("");
			setEmailPassword("");
		} catch (err: any) {
			Swal.fire("Error", err.response?.data?.error || "Gagal mengubah email", "error");
		} finally {
			setEmailLoading(false);
		}
	};

	const handleRevokeSession = async (sessionId: string) => {
		const result = await Swal.fire({
			title: "Logout Device?",
			text: "Device ini akan di-logout paksa dari akun Anda",
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#ef4444",
			cancelButtonColor: "#6B7280",
			confirmButtonText: "Ya, Logout",
			cancelButtonText: "Batal",
			reverseButtons: true,
		});

		if (!result.isConfirmed) return;

		try {
			await api.delete(`/settings/sessions/${sessionId}`);
			setSessions((prev) => prev.filter((s) => s.id !== sessionId));
			Swal.fire("Berhasil", "Device berhasil di-logout", "success");
		} catch {
			Swal.fire("Error", "Gagal logout device", "error");
		}
	};

	const handleRevokeAll = async () => {
		const result = await Swal.fire({
			title: "Logout Semua Device?",
			text: "Semua device lain akan di-logout. Device ini tetap aktif.",
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#ef4444",
			cancelButtonColor: "#6B7280",
			confirmButtonText: "Ya, Logout Semua",
			cancelButtonText: "Batal",
			reverseButtons: true,
		});

		if (!result.isConfirmed) return;

		try {
			await api.delete("/settings/sessions");
			fetchSessions();
			Swal.fire("Berhasil", "Semua device lain berhasil di-logout", "success");
		} catch {
			Swal.fire("Error", "Gagal logout semua device", "error");
		}
	};

	const getDeviceIcon = (deviceName: string | null) => {
		if (!deviceName) return <ComputerDesktopIcon className="w-5 h-5" />;
		if (deviceName.includes("Android") || deviceName.includes("iOS")) {
			return <DevicePhoneMobileIcon className="w-5 h-5" />;
		}
		return <ComputerDesktopIcon className="w-5 h-5" />;
	};

	const formatDate = (dateStr: string) => {
		const d = new Date(dateStr);
		const now = new Date();
		const diffMs = now.getTime() - d.getTime();
		const diffMin = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMin < 1) return "Baru saja";
		if (diffMin < 60) return `${diffMin} menit lalu`;
		if (diffHours < 24) return `${diffHours} jam lalu`;
		if (diffDays < 7) return `${diffDays} hari lalu`;
		return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
	};

	return (
		<div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
			{/* Header */}
			<div className="flex items-center gap-3">
				<div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
					<ShieldCheckIcon className="w-5 h-5 text-red-500" />
				</div>
				<div>
					<h1 className="text-xl font-bold text-gray-900 dark:text-white">Setting Akun</h1>
					<p className="text-sm text-gray-500 dark:text-gray-400">Kelola keamanan dan perangkat login</p>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* ─── Change Password ─────────────────────── */}
				<div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.06] p-5">
					<div className="flex items-center gap-2 mb-4">
						<KeyIcon className="w-5 h-5 text-red-500" />
						<h2 className="font-semibold text-gray-900 dark:text-white">Ubah Password</h2>
					</div>

					<form onSubmit={handleChangePassword} className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
								Password Lama
							</label>
							<div className="relative">
								<input
									type={showCurrent ? "text" : "password"}
									value={currentPassword}
									onChange={(e) => setCurrentPassword(e.target.value)}
									className="w-full px-3 py-2 pr-10 rounded-xl bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50 outline-none transition"
									required
								/>
								<button
									type="button"
									onClick={() => setShowCurrent(!showCurrent)}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
								>
									{showCurrent ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
								</button>
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
								Password Baru
							</label>
							<div className="relative">
								<input
									type={showNew ? "text" : "password"}
									value={newPassword}
									onChange={(e) => setNewPassword(e.target.value)}
									className="w-full px-3 py-2 pr-10 rounded-xl bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50 outline-none transition"
									required
									minLength={8}
								/>
								<button
									type="button"
									onClick={() => setShowNew(!showNew)}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
								>
									{showNew ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
								</button>
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
								Konfirmasi Password Baru
							</label>
							<input
								type="password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50 outline-none transition"
								required
								minLength={8}
							/>
							{confirmPassword && newPassword !== confirmPassword && (
								<p className="text-xs text-red-500 mt-1">Password tidak cocok</p>
							)}
						</div>

						<button
							type="submit"
							disabled={passwordLoading || !currentPassword || !newPassword || newPassword !== confirmPassword}
							className="w-full py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
						>
							{passwordLoading ? "Menyimpan..." : "Ubah Password"}
						</button>
					</form>
				</div>

				{/* ─── Change Email ─────────────────────── */}
				<div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.06] p-5">
					<div className="flex items-center gap-2 mb-4">
						<EnvelopeIcon className="w-5 h-5 text-red-500" />
						<h2 className="font-semibold text-gray-900 dark:text-white">Ubah Email</h2>
					</div>

					<div className="mb-4 px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05]">
						<p className="text-xs text-gray-500 dark:text-gray-400">Email saat ini</p>
						<p className="text-sm font-medium text-gray-900 dark:text-white">{user?.email}</p>
					</div>

					<form onSubmit={handleChangeEmail} className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
								Email Baru
							</label>
							<input
								type="email"
								value={newEmail}
								onChange={(e) => setNewEmail(e.target.value)}
								className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50 outline-none transition"
								placeholder="email-baru@example.com"
								required
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
								Password (verifikasi)
							</label>
							<input
								type="password"
								value={emailPassword}
								onChange={(e) => setEmailPassword(e.target.value)}
								className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50 outline-none transition"
								placeholder="Masukkan password untuk verifikasi"
								required
							/>
						</div>

						<button
							type="submit"
							disabled={emailLoading || !newEmail || !emailPassword}
							className="w-full py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
						>
							{emailLoading ? "Menyimpan..." : "Ubah Email"}
						</button>
					</form>
				</div>
			</div>

			{/* ─── Active Sessions / Devices ────────────────── */}
			<div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.06] p-5">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-2">
						<DevicePhoneMobileIcon className="w-5 h-5 text-red-500" />
						<h2 className="font-semibold text-gray-900 dark:text-white">Perangkat Login</h2>
						<span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400">
							{sessions.length} aktif
						</span>
					</div>
					{sessions.filter((s) => !s.isCurrent).length > 0 && (
						<button
							onClick={handleRevokeAll}
							className="text-xs font-medium text-red-500 hover:text-red-600 transition"
						>
							Logout Semua Device Lain
						</button>
					)}
				</div>

				{sessionsLoading ? (
					<div className="flex items-center justify-center py-8">
						<div className="w-6 h-6 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
					</div>
				) : sessions.length === 0 ? (
					<p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
						Tidak ada sesi aktif
					</p>
				) : (
					<div className="space-y-3">
						{sessions.map((session) => (
							<div
								key={session.id}
								className={`flex items-center justify-between p-3 rounded-xl border transition ${
									session.isCurrent
										? "bg-green-50 dark:bg-green-500/[0.05] border-green-200 dark:border-green-500/20"
										: "bg-gray-50 dark:bg-white/[0.02] border-gray-100 dark:border-white/[0.05]"
								}`}
							>
								<div className="flex items-center gap-3 min-w-0">
									<div
										className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
											session.isCurrent
												? "bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400"
												: "bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400"
										}`}
									>
										{getDeviceIcon(session.deviceName)}
									</div>
									<div className="min-w-0">
										<div className="flex items-center gap-2">
											<p className="text-sm font-medium text-gray-900 dark:text-white truncate">
												{session.deviceName || "Unknown Device"}
											</p>
											{session.isCurrent && (
												<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 flex-shrink-0">
													Perangkat Ini
												</span>
											)}
										</div>
										<div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
											<span className="flex items-center gap-1">
												<GlobeAltIcon className="w-3 h-3" />
												{session.ipAddress || "Unknown"}
											</span>
											<span className="flex items-center gap-1">
												<ClockIcon className="w-3 h-3" />
												{formatDate(session.lastActive)}
											</span>
										</div>
									</div>
								</div>

								{!session.isCurrent && (
									<button
										onClick={() => handleRevokeSession(session.id)}
										className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition flex-shrink-0"
									>
										<ArrowRightOnRectangleIcon className="w-4 h-4" />
										<span className="hidden sm:inline">Logout</span>
									</button>
								)}
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

export default Settings;
