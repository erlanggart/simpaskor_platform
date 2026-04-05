import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../utils/api";
import {
	TrophyIcon,
	ScaleIcon,
	AcademicCapIcon,
	CheckCircleIcon,
	ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";

interface RoleOption {
	id: "PESERTA" | "JURI" | "PELATIH" | "PANITIA";
	title: string;
	icon: React.ElementType;
	description: string;
	features: string[];
	gradient: string;
	borderColor: string;
	iconBg: string;
}

const roles: RoleOption[] = [
	{
		id: "PANITIA",
		title: "Panitia",
		icon: ClipboardDocumentListIcon,
		description:
			"Buat dan kelola event paskibra secara profesional dengan sistem penilaian digital.",
		features: [
			"Buat & kelola event",
			"Sistem penilaian digital",
			"Kelola peserta & juri",
			"Laporan & rekap otomatis",
		],
		gradient: "from-red-500 to-rose-600",
		borderColor: "border-red-500/50 hover:border-red-400",
		iconBg: "bg-red-500/10 text-red-500",
	},
	{
		id: "PESERTA",
		title: "Peserta",
		icon: TrophyIcon,
		description:
			"Ikuti berbagai event paskibra dan tunjukkan kemampuan terbaikmu di hadapan juri profesional.",
		features: [
			"Daftar event paskibra",
			"Lihat hasil penilaian",
			"Riwayat kompetisi",
			"Sertifikat & peringkat",
		],
		gradient: "from-amber-500 to-orange-600",
		borderColor: "border-amber-500/50 hover:border-amber-400",
		iconBg: "bg-amber-500/10 text-amber-500",
	},
	{
		id: "JURI",
		title: "Juri",
		icon: ScaleIcon,
		description:
			"Nilai peserta secara profesional dengan standar nasional dan berikan penilaian yang adil.",
		features: [
			"Terima undangan event",
			"Penilaian digital",
			"Kelola kategori penilaian",
			"Profil juri publik",
		],
		gradient: "from-blue-500 to-indigo-600",
		borderColor: "border-blue-500/50 hover:border-blue-400",
		iconBg: "bg-blue-500/10 text-blue-500",
	},
	{
		id: "PELATIH",
		title: "Pelatih",
		icon: AcademicCapIcon,
		description:
			"Bimbing dan pantau perkembangan atlet-atlet paskibra untuk meraih prestasi tertinggi.",
		features: [
			"Pantau perkembangan atlet",
			"Lihat statistik performa",
			"Akses materi pelatihan",
			"Koordinasi dengan panitia",
		],
		gradient: "from-emerald-500 to-teal-600",
		borderColor: "border-emerald-500/50 hover:border-emerald-400",
		iconBg: "bg-emerald-500/10 text-emerald-500",
	},
];

const RoleSelection = () => {
	const [selectedRole, setSelectedRole] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { setAuth } = useAuth();
	const navigate = useNavigate();

	const handleSelectRole = async () => {
		if (!selectedRole) return;

		try {
			setIsLoading(true);
			setError(null);

			const response = await api.patch("/auth/select-role", {
				role: selectedRole,
			});

			// Update auth context with new user data and token
			setAuth(response.data.user, response.data.token);

			// Navigate to the role-specific dashboard
			const dashboardPaths: Record<string, string> = {
				PANITIA: "/panitia/dashboard",
				PESERTA: "/peserta/dashboard",
				JURI: "/juri/dashboard",
				PELATIH: "/pelatih/dashboard",
			};
			navigate(dashboardPaths[selectedRole] || "/dashboard", { replace: true });
		} catch (err: any) {
			setError(
				err.response?.data?.message || "Gagal memilih role. Silakan coba lagi."
			);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
			<div className="w-full max-w-5xl">
				{/* Header */}
				<div className="text-center mb-10">
					<h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
						Pilih Role Anda
					</h1>
					<p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base max-w-lg mx-auto">
						Pilih role yang sesuai dengan Anda. Role ini akan menentukan akses
						dan fitur yang tersedia di platform SIMPASKOR.
					</p>
				</div>

				{/* Role Cards */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
					{roles.map((role) => {
						const Icon = role.icon;
						const isSelected = selectedRole === role.id;

						return (
							<button
								key={role.id}
								type="button"
								onClick={() => setSelectedRole(role.id)}
								className={`relative text-left p-5 sm:p-6 rounded-2xl border-2 transition-all duration-300 ${
									isSelected
										? `${role.borderColor} bg-white dark:bg-gray-800/80 shadow-lg scale-[1.02]`
										: "border-gray-200 dark:border-gray-700/50 bg-white/60 dark:bg-gray-800/30 hover:bg-white dark:hover:bg-gray-800/60 hover:shadow-md"
								}`}
							>
								{/* Selected indicator */}
								{isSelected && (
									<div
										className={`absolute top-3 right-3 w-6 h-6 rounded-full bg-gradient-to-r ${role.gradient} flex items-center justify-center`}
									>
										<CheckCircleIcon className="w-4 h-4 text-white" />
									</div>
								)}

								{/* Icon */}
								<div
									className={`w-12 h-12 rounded-xl ${role.iconBg} flex items-center justify-center mb-4`}
								>
									<Icon className="w-6 h-6" />
								</div>

								{/* Title */}
								<h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
									{role.title}
								</h3>

								{/* Description */}
								<p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
									{role.description}
								</p>

								{/* Features */}
								<ul className="space-y-2">
									{role.features.map((feature, i) => (
										<li
											key={i}
											className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300"
										>
											<div
												className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${role.gradient} flex-shrink-0`}
											/>
											{feature}
										</li>
									))}
								</ul>
							</button>
						);
					})}
				</div>

				{/* Error */}
				{error && (
					<div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-center">
						<p className="text-sm text-red-600 dark:text-red-400">{error}</p>
					</div>
				)}

				{/* Confirm Button */}
				<div className="text-center">
					<button
						type="button"
						onClick={handleSelectRole}
						disabled={!selectedRole || isLoading}
						className={`px-8 py-3 rounded-xl font-semibold text-white transition-all duration-300 ${
							selectedRole
								? "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 shadow-lg hover:shadow-xl cursor-pointer"
								: "bg-gray-300 dark:bg-gray-700 cursor-not-allowed"
						}`}
					>
						{isLoading ? (
							<span className="flex items-center gap-2">
								<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
								Memproses...
							</span>
						) : (
							"Konfirmasi Pilihan"
						)}
					</button>
					
				</div>
			</div>
		</div>
	);
};

export default RoleSelection;
