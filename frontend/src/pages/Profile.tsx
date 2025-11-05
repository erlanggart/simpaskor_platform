import React, { useState, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../utils/api";
import { showDeleteConfirm } from "../utils/sweetalert";

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
			await api.put("/api/users/profile", profileData);
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
			await api.put("/api/users/password", {
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

			await api.post("/api/users/avatar", formData, {
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
			await api.delete("/api/users/avatar");
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
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
			<div className="max-w-4xl mx-auto">
				{/* Message Alert */}
				{message && (
					<div
						className={`mb-6 p-4 rounded-lg ${
							message.type === "success"
								? "bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-800"
								: "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800"
						}`}
					>
						{message.text}
					</div>
				)}

				{/* Tabs */}
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50">
					<div className="border-b border-gray-200 dark:border-gray-700">
						<nav className="flex -mb-px">
							<button
								onClick={() => setActiveTab("profile")}
								className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
									activeTab === "profile"
										? "border-red-600 text-red-600 dark:text-red-400"
										: "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
								}`}
							>
								Profil
							</button>
							<button
								onClick={() => setActiveTab("password")}
								className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
									activeTab === "password"
										? "border-red-600 text-red-600 dark:text-red-400"
										: "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
								}`}
							>
								Ganti Password
							</button>
							<button
								onClick={() => setActiveTab("avatar")}
								className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
									activeTab === "avatar"
										? "border-red-600 text-red-600 dark:text-red-400"
										: "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
								}`}
							>
								Foto Profil
							</button>
						</nav>
					</div>

					<div className="p-6">
						{/* Profile Tab */}
						{activeTab === "profile" && (
							<form onSubmit={handleProfileSubmit} className="space-y-6">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="md:col-span-2">
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
											Nama Lengkap
										</label>
										<input
											type="text"
											name="name"
											value={profileData.name}
											onChange={handleProfileChange}
											placeholder="Contoh: John Doe"
											className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
											required
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
											Email
										</label>
										<input
											type="email"
											name="email"
											value={profileData.email}
											onChange={handleProfileChange}
											className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
											disabled
										/>
										<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
											Email tidak dapat diubah
										</p>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
											Nomor Telepon
										</label>
										<input
											type="tel"
											name="phone"
											value={profileData.phone}
											onChange={handleProfileChange}
											className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
											placeholder="+62"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
											Tanggal Lahir
										</label>
										<input
											type="date"
											name="birthDate"
											value={profileData.birthDate}
											onChange={handleProfileChange}
											className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
											Jenis Kelamin
										</label>
										<select
											name="gender"
											value={profileData.gender}
											onChange={handleProfileChange}
											className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
										>
											<option value="">Pilih</option>
											<option value="Laki-laki">Laki-laki</option>
											<option value="Perempuan">Perempuan</option>
										</select>
									</div>

									<div className="md:col-span-2">
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
											Institusi / Organisasi
										</label>
										<input
											type="text"
											name="institution"
											value={profileData.institution}
											onChange={handleProfileChange}
											className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
											placeholder="Nama sekolah, universitas, atau organisasi"
										/>
									</div>

									<div className="md:col-span-2">
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
											Bio
										</label>
										<textarea
											name="bio"
											value={profileData.bio}
											onChange={handleProfileChange}
											rows={3}
											className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
											placeholder="Ceritakan sedikit tentang diri Anda..."
										/>
									</div>

									<div className="md:col-span-2">
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
											Alamat
										</label>
										<input
											type="text"
											name="address"
											value={profileData.address}
											onChange={handleProfileChange}
											className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
											placeholder="Jalan, nomor rumah, RT/RW"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
											Kota
										</label>
										<input
											type="text"
											name="city"
											value={profileData.city}
											onChange={handleProfileChange}
											className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
											placeholder="Nama kota"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
											Provinsi
										</label>
										<input
											type="text"
											name="province"
											value={profileData.province}
											onChange={handleProfileChange}
											className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
											placeholder="Nama provinsi"
										/>
									</div>
								</div>

								<div className="flex justify-end">
									<button
										type="submit"
										disabled={isLoading}
										className="px-6 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600"
									>
										{isLoading ? "Menyimpan..." : "Simpan Perubahan"}
									</button>
								</div>
							</form>
						)}

						{/* Password Tab */}
						{activeTab === "password" && (
							<form onSubmit={handlePasswordSubmit} className="space-y-6">
								<div className="max-w-md">
									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
											Password Saat Ini
										</label>
										<input
											type="password"
											name="currentPassword"
											value={passwordData.currentPassword}
											onChange={handlePasswordChange}
											className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
											required
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
											Password Baru
										</label>
										<input
											type="password"
											name="newPassword"
											value={passwordData.newPassword}
											onChange={handlePasswordChange}
											className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
											required
											minLength={6}
										/>
										<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
											Minimal 6 karakter
										</p>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
											Konfirmasi Password Baru
										</label>
										<input
											type="password"
											name="confirmPassword"
											value={passwordData.confirmPassword}
											onChange={handlePasswordChange}
											className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
											required
										/>
									</div>
								</div>

								<div className="flex justify-end">
									<button
										type="submit"
										disabled={isLoading}
										className="px-6 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600"
									>
										{isLoading ? "Mengubah..." : "Ubah Password"}
									</button>
								</div>
							</form>
						)}

						{/* Avatar Tab */}
						{activeTab === "avatar" && (
							<div className="max-w-md mx-auto">
								<div className="text-center">
									<div className="mb-6">
										{avatarPreview ? (
											<img
												src={avatarPreview}
												alt="Avatar"
												className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-gray-200 dark:border-gray-600"
											/>
										) : (
											<div className="w-32 h-32 rounded-full mx-auto bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-4xl font-bold text-red-600 dark:text-red-400">
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

									<div className="space-y-3">
										<button
											type="button"
											onClick={() => fileInputRef.current?.click()}
											className="w-full px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
										>
											Pilih Foto
										</button>

										{avatarPreview &&
											avatarPreview !== user?.profile?.avatar && (
												<button
													type="button"
													onClick={handleAvatarUpload}
													disabled={isLoading}
													className="w-full px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600"
												>
													{isLoading ? "Mengupload..." : "Upload Foto"}
												</button>
											)}

										{avatarPreview && (
											<button
												type="button"
												onClick={handleRemoveAvatar}
												disabled={isLoading}
												className="w-full px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600"
											>
												Hapus Foto
											</button>
										)}
									</div>

									<p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
										Format: JPG, PNG, GIF. Maksimal 2MB.
									</p>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default ProfilePage;
