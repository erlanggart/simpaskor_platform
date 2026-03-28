import React, { useState, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../utils/api";
import { showDeleteConfirm } from "../utils/sweetalert";
import {
	LuUser,
	LuLock,
	LuCamera,
	LuArrowLeft,
} from "react-icons/lu";
import { useNavigate } from "react-router-dom";

interface ProfileFormData {
	name: string;
	email: string;
	phone: string;
	bio: string;
	institution: string;
	address: string;
	city: string;
	province: string;
	birthDate: string;
	gender: string;
}

interface PasswordFormData {
	currentPassword: string;
	newPassword: string;
	confirmPassword: string;
}

const ProfilePage: React.FC = () => {
	const { user } = useAuth();
	const navigate = useNavigate();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [activeTab, setActiveTab] = useState<"profile" | "password" | "avatar">(
		"profile"
	);
	const [isLoading, setIsLoading] = useState(false);
	const [message, setMessage] = useState<{
		type: "success" | "error";
		text: string;
	} | null>(null);
	const [avatarPreview, setAvatarPreview] = useState<string | null>(
		user?.profile?.avatar || null
	);

	const [profileData, setProfileData] = useState<ProfileFormData>({
		name: user?.name || "",
		email: user?.email || "",
		phone: user?.phone || "",
		bio: user?.profile?.bio || "",
		institution: user?.profile?.institution || "",
		address: user?.profile?.address || "",
		city: user?.profile?.city || "",
		province: user?.profile?.province || "",
		birthDate: (user?.profile?.birthDate
			? new Date(user.profile.birthDate).toISOString().split("T")[0]
			: "") as string,
		gender: user?.profile?.gender || "",
	});

	const [passwordData, setPasswordData] = useState<PasswordFormData>({
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	});

	const showMessage = (type: "success" | "error", text: string) => {
		setMessage({ type, text });
		setTimeout(() => setMessage(null), 5000);
	};

	const handleProfileChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>
	) => {
		setProfileData({
			...profileData,
			[e.target.name]: e.target.value,
		});
	};

	const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setPasswordData({
			...passwordData,
			[e.target.name]: e.target.value,
		});
	};

	const handleProfileSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			await api.put("/users/profile", profileData);
			showMessage("success", "Profil berhasil diperbarui!");

			// Update localStorage
			const updatedUser = { ...user, ...profileData };
			localStorage.setItem("user", JSON.stringify(updatedUser));
			window.location.reload(); // Reload to update context
		} catch (error: any) {
			showMessage(
				"error",
				error.response?.data?.error || "Gagal memperbarui profil"
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handlePasswordSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (passwordData.newPassword !== passwordData.confirmPassword) {
			showMessage("error", "Password baru tidak cocok!");
			return;
		}

		if (passwordData.newPassword.length < 6) {
			showMessage("error", "Password minimal 6 karakter!");
			return;
		}

		setIsLoading(true);

		try {
			await api.put("/users/password", {
				currentPassword: passwordData.currentPassword,
				newPassword: passwordData.newPassword,
			});

			showMessage("success", "Password berhasil diubah!");
			setPasswordData({
				currentPassword: "",
				newPassword: "",
				confirmPassword: "",
			});
		} catch (error: any) {
			showMessage(
				"error",
				error.response?.data?.error || "Gagal mengubah password"
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Validate file type
		if (!file.type.startsWith("image/")) {
			showMessage("error", "File harus berupa gambar!");
			return;
		}

		// Validate file size (max 2MB)
		if (file.size > 2 * 1024 * 1024) {
			showMessage("error", "Ukuran file maksimal 2MB!");
			return;
		}

		// Preview
		const reader = new FileReader();
		reader.onloadend = () => {
			setAvatarPreview(reader.result as string);
		};
		reader.readAsDataURL(file);
	};

	const handleAvatarUpload = async () => {
		const file = fileInputRef.current?.files?.[0];
		if (!file) return;

		setIsLoading(true);

		try {
			const formData = new FormData();
			formData.append("avatar", file);

			await api.post("/users/avatar", formData, {
				headers: {
					"Content-Type": "multipart/form-data",
				},
			});

			showMessage("success", "Foto profil berhasil diperbarui!");
			window.location.reload();
		} catch (error: any) {
			showMessage(
				"error",
				error.response?.data?.error || "Gagal upload foto profil"
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleRemoveAvatar = async () => {
		const result = await showDeleteConfirm("foto profil");
		if (!result.isConfirmed) return;

		setIsLoading(true);

		try {
			await api.delete("/users/avatar");
			setAvatarPreview(null);
			showMessage("success", "Foto profil berhasil dihapus!");
			window.location.reload();
		} catch (error: any) {
			showMessage(
				"error",
				error.response?.data?.error || "Gagal menghapus foto profil"
			);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen py-6 px-4">
			<div className="max-w-3xl mx-auto">
				

				{/* Header */}
				<div className="mb-6">
					<h1 className="text-lg font-bold text-gray-900 dark:text-white">Pengaturan Profil</h1>
					<p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
						Kelola informasi akun dan keamanan Anda
					</p>
				</div>

				{/* Message Alert */}
				{message && (
					<div
						className={`mb-4 px-4 py-3 rounded-xl text-sm ${
							message.type === "success"
								? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
								: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
						}`}
					>
						{message.text}
					</div>
				)}

				{/* Tabs */}
				<div className="flex gap-1 mb-6 p-1 rounded-xl bg-white/60 dark:bg-white/[0.03] backdrop-blur-sm border border-gray-200/50 dark:border-white/[0.06]">
					{[
						{ key: "profile" as const, label: "Profil", icon: LuUser },
						{ key: "password" as const, label: "Password", icon: LuLock },
						{ key: "avatar" as const, label: "Foto", icon: LuCamera },
					].map((tab) => {
						const isActive = activeTab === tab.key;
						const Icon = tab.icon;
						return (
							<button
								key={tab.key}
								onClick={() => setActiveTab(tab.key)}
								className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
									isActive
										? "bg-red-600 text-white shadow-sm"
										: "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-white/[0.05]"
								}`}
							>
								<Icon className="w-3.5 h-3.5" />
								{tab.label}
							</button>
						);
					})}
				</div>

				{/* Content Card */}
				<div className="rounded-2xl bg-white/60 dark:bg-white/[0.03] backdrop-blur-sm border border-gray-200/50 dark:border-white/[0.06] p-5 md:p-6">

					{/* Profile Tab */}
					{activeTab === "profile" && (
						<form onSubmit={handleProfileSubmit} className="space-y-5">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="md:col-span-2">
									<label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
										Nama Lengkap
									</label>
									<input
										type="text"
										name="name"
										value={profileData.name}
										onChange={handleProfileChange}
										placeholder="Contoh: John Doe"
										className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white/80 dark:bg-white/[0.05] text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/30 focus:border-red-500 dark:focus:border-red-400 transition-colors"
										required
									/>
								</div>

								<div>
									<label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
										Email
									</label>
									<input
										type="email"
										name="email"
										value={profileData.email}
										className="w-full px-3 py-2 text-sm border border-gray-200/50 dark:border-white/5 rounded-lg bg-gray-100/50 dark:bg-white/[0.02] text-gray-400 dark:text-gray-500 cursor-not-allowed"
										disabled
									/>
									<p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1">
										Email tidak dapat diubah
									</p>
								</div>

								<div>
									<label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
										Nomor Telepon
									</label>
									<input
										type="tel"
										name="phone"
										value={profileData.phone}
										onChange={handleProfileChange}
										className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white/80 dark:bg-white/[0.05] text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/30 focus:border-red-500 dark:focus:border-red-400 transition-colors"
										placeholder="+62"
									/>
								</div>

								<div>
									<label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
										Tanggal Lahir
									</label>
									<input
										type="date"
										name="birthDate"
										value={profileData.birthDate}
										onChange={handleProfileChange}
										className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white/80 dark:bg-white/[0.05] text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/30 focus:border-red-500 dark:focus:border-red-400 transition-colors"
									/>
								</div>

								<div>
									<label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
										Jenis Kelamin
									</label>
									<select
										name="gender"
										value={profileData.gender}
										onChange={handleProfileChange}
										className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white/80 dark:bg-white/[0.05] text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/30 focus:border-red-500 dark:focus:border-red-400 transition-colors"
									>
										<option value="">Pilih</option>
										<option value="Laki-laki">Laki-laki</option>
										<option value="Perempuan">Perempuan</option>
									</select>
								</div>

								<div className="md:col-span-2">
									<label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
										Institusi / Organisasi
									</label>
									<input
										type="text"
										name="institution"
										value={profileData.institution}
										onChange={handleProfileChange}
										className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white/80 dark:bg-white/[0.05] text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/30 focus:border-red-500 dark:focus:border-red-400 transition-colors"
										placeholder="Nama sekolah, universitas, atau organisasi"
									/>
								</div>

								<div className="md:col-span-2">
									<label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
										Bio
									</label>
									<textarea
										name="bio"
										value={profileData.bio}
										onChange={handleProfileChange}
										rows={3}
										className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white/80 dark:bg-white/[0.05] text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/30 focus:border-red-500 dark:focus:border-red-400 transition-colors resize-none"
										placeholder="Ceritakan sedikit tentang diri Anda..."
									/>
								</div>

								<div className="md:col-span-2">
									<label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
										Alamat
									</label>
									<input
										type="text"
										name="address"
										value={profileData.address}
										onChange={handleProfileChange}
										className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white/80 dark:bg-white/[0.05] text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/30 focus:border-red-500 dark:focus:border-red-400 transition-colors"
										placeholder="Jalan, nomor rumah, RT/RW"
									/>
								</div>

								<div>
									<label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
										Kota
									</label>
									<input
										type="text"
										name="city"
										value={profileData.city}
										onChange={handleProfileChange}
										className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white/80 dark:bg-white/[0.05] text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/30 focus:border-red-500 dark:focus:border-red-400 transition-colors"
										placeholder="Nama kota"
									/>
								</div>

								<div>
									<label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
										Provinsi
									</label>
									<input
										type="text"
										name="province"
										value={profileData.province}
										onChange={handleProfileChange}
										className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white/80 dark:bg-white/[0.05] text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/30 focus:border-red-500 dark:focus:border-red-400 transition-colors"
										placeholder="Nama provinsi"
									/>
								</div>
							</div>

							<div className="flex justify-end pt-2">
								<button
									type="submit"
									disabled={isLoading}
									className="px-5 py-2 bg-red-600 text-white rounded-full text-xs font-semibold hover:bg-red-700 transition-colors shadow-lg hover:shadow-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{isLoading ? "Menyimpan..." : "Simpan Perubahan"}
								</button>
							</div>
						</form>
					)}

					{/* Password Tab */}
					{activeTab === "password" && (
						<form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
							<div>
								<label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
									Password Saat Ini
								</label>
								<input
									type="password"
									name="currentPassword"
									value={passwordData.currentPassword}
									onChange={handlePasswordChange}
									className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white/80 dark:bg-white/[0.05] text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/30 focus:border-red-500 dark:focus:border-red-400 transition-colors"
									required
								/>
							</div>

							<div>
								<label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
									Password Baru
								</label>
								<input
									type="password"
									name="newPassword"
									value={passwordData.newPassword}
									onChange={handlePasswordChange}
									className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white/80 dark:bg-white/[0.05] text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/30 focus:border-red-500 dark:focus:border-red-400 transition-colors"
									required
									minLength={6}
								/>
								<p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1">
									Minimal 6 karakter
								</p>
							</div>

							<div>
								<label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
									Konfirmasi Password Baru
								</label>
								<input
									type="password"
									name="confirmPassword"
									value={passwordData.confirmPassword}
									onChange={handlePasswordChange}
									className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white/80 dark:bg-white/[0.05] text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/30 focus:border-red-500 dark:focus:border-red-400 transition-colors"
									required
								/>
							</div>

							<div className="flex justify-end pt-2">
								<button
									type="submit"
									disabled={isLoading}
									className="px-5 py-2 bg-red-600 text-white rounded-full text-xs font-semibold hover:bg-red-700 transition-colors shadow-lg hover:shadow-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{isLoading ? "Mengubah..." : "Ubah Password"}
								</button>
							</div>
						</form>
					)}

					{/* Avatar Tab */}
					{activeTab === "avatar" && (
						<div className="max-w-sm mx-auto text-center">
							<div className="mb-6">
								{avatarPreview ? (
									<img
										src={avatarPreview}
										alt="Avatar"
										className="w-28 h-28 rounded-full mx-auto object-cover border-4 border-gray-200/50 dark:border-white/10"
									/>
								) : (
									<div className="w-28 h-28 rounded-full mx-auto bg-red-500/10 flex items-center justify-center text-3xl font-bold text-red-500 dark:text-red-400 border-4 border-red-500/20">
										{user?.name
											?.split(" ")
											.map((n) => n[0])
											.join("")
											.substring(0, 2)
											.toUpperCase()}
									</div>
								)}
							</div>

							<input
								type="file"
								ref={fileInputRef}
								onChange={handleAvatarChange}
								accept="image/*"
								className="hidden"
							/>

							<div className="flex flex-col gap-2">
								<button
									type="button"
									onClick={() => fileInputRef.current?.click()}
									className="w-full px-4 py-2 bg-red-600 text-white rounded-full text-xs font-semibold hover:bg-red-700 transition-colors shadow-lg hover:shadow-red-500/25"
								>
									Pilih Foto
								</button>

								{avatarPreview &&
									avatarPreview !== user?.profile?.avatar && (
										<button
											type="button"
											onClick={handleAvatarUpload}
											disabled={isLoading}
											className="w-full px-4 py-2 rounded-full text-xs font-semibold transition-colors bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
										>
											{isLoading ? "Mengupload..." : "Upload Foto"}
										</button>
									)}

								{avatarPreview && (
									<button
										type="button"
										onClick={handleRemoveAvatar}
										disabled={isLoading}
										className="w-full px-4 py-2 rounded-full text-xs font-semibold transition-colors bg-gray-100/80 dark:bg-white/[0.06] border border-gray-200/50 dark:border-white/[0.08] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/[0.12] disabled:opacity-50"
									>
										Hapus Foto
									</button>
								)}
							</div>

							<p className="text-[10px] text-gray-400 dark:text-gray-600 mt-4">
								Format: JPG, PNG, GIF. Maksimal 2MB.
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default ProfilePage;
