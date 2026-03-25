import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
	UserGroupIcon,
	CalendarIcon,
	MapPinIcon,
	UsersIcon,
	ClockIcon,
	AcademicCapIcon,
	TrophyIcon,
	PlusIcon,
} from "@heroicons/react/24/outline";

const PelatihDashboard = () => {
	const { user, logout } = useAuth();
	const [selectedTab, setSelectedTab] = useState("students");

	// Mock data untuk siswa yang dilatih
	const students = [
		{
			id: 1,
			name: "Ahmad Rizki",
			email: "ahmad.rizki@email.com",
			level: "Pelajar",
			category: "Taekwondo",
			joinDate: "2024-01-15",
			progress: 85,
			lastTraining: "2024-12-20",
			achievements: 3,
			status: "active",
		},
		{
			id: 2,
			name: "Siti Fatimah",
			email: "siti.fatimah@email.com",
			level: "Mahir",
			category: "Karate",
			joinDate: "2023-08-10",
			progress: 92,
			lastTraining: "2024-12-18",
			achievements: 7,
			status: "active",
		},
		{
			id: 3,
			name: "Budi Santoso",
			email: "budi.santoso@email.com",
			level: "Pemula",
			category: "Wushu",
			joinDate: "2024-10-05",
			progress: 45,
			lastTraining: "2024-12-19",
			achievements: 1,
			status: "active",
		},
	];

	// Mock data untuk events yang peserta ikuti
	const upcomingEvents = [
		{
			id: 1,
			title: "Championship Taekwondo 2025",
			date: "2025-02-15",
			location: "GOR Senayan, Jakarta",
			students: ["Ahmad Rizki"],
			category: "Taekwondo",
			status: "registered",
		},
		{
			id: 2,
			title: "Karate Open Tournament",
			date: "2025-03-10",
			location: "Istora Senayan, Jakarta",
			students: ["Siti Fatimah"],
			category: "Karate",
			status: "registered",
		},
	];

	// Mock data untuk program latihan
	const trainingPrograms = [
		{
			id: 1,
			name: "Program Dasar Taekwondo",
			description: "Program pelatihan dasar untuk pemula",
			duration: "3 bulan",
			students: 12,
			schedule: "Senin, Rabu, Jumat - 16:00-18:00",
			progress: 60,
		},
		{
			id: 2,
			name: "Persiapan Kompetisi Karate",
			description: "Program intensif untuk persiapan kompetisi",
			duration: "2 bulan",
			students: 8,
			schedule: "Selasa, Kamis, Sabtu - 17:00-19:00",
			progress: 80,
		},
	];

	const stats = [
		{
			name: "Total Siswa",
			value: students.length.toString(),
			icon: UserGroupIcon,
			color: "bg-blue-500",
		},
		{
			name: "Program Aktif",
			value: trainingPrograms.length.toString(),
			icon: AcademicCapIcon,
			color: "bg-green-500",
		},
		{
			name: "Event Mendatang",
			value: upcomingEvents.length.toString(),
			icon: CalendarIcon,
			color: "bg-purple-500",
		},
		{
			name: "Prestasi Siswa",
			value: students
				.reduce((sum, student) => sum + student.achievements, 0)
				.toString(),
			icon: TrophyIcon,
			color: "bg-yellow-500",
		},
	];

	const getProgressColor = (progress: number) => {
		if (progress >= 80) return "text-green-600";
		if (progress >= 60) return "text-yellow-600";
		return "text-red-600";
	};

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "active":
				return (
					<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
						Aktif
					</span>
				);
			case "inactive":
				return (
					<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
						Tidak Aktif
					</span>
				);
			case "registered":
				return (
					<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
						Terdaftar
					</span>
				);
			default:
				return null;
		}
	};

	return (
		<div className="min-h-screen">
			{/* Header */}
			<header className="bg-white shadow">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center py-6">
						<div>
							<h1 className="text-3xl font-bold text-gray-900">
								Pelatih Dashboard
							</h1>
							<p className="text-gray-600">
								Kelola Siswa & Program Latihan - {user?.name}
							</p>
						</div>
						<div className="flex items-center space-x-4">
							<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
								Pelatih
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
										<div className={`${item.color} p-3 rounded-lg`}>
											<item.icon className="h-6 w-6 text-white" />
										</div>
									</div>
									<div className="ml-5 w-0 flex-1">
										<dl>
											<dt className="text-sm font-medium text-gray-500 truncate">
												{item.name}
											</dt>
											<dd className="text-2xl font-semibold text-gray-900">
												{item.value}
											</dd>
										</dl>
									</div>
								</div>
							</div>
						</div>
					))}
				</div>

				{/* Tabs */}
				<div className="bg-white shadow rounded-lg mb-6">
					<div className="border-b border-gray-200">
						<nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
							<button
								onClick={() => setSelectedTab("students")}
								className={`py-4 px-1 border-b-2 font-medium text-sm ${
									selectedTab === "students"
										? "border-red-500 text-red-600"
										: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
								}`}
							>
								Siswa ({students.length})
							</button>
							<button
								onClick={() => setSelectedTab("programs")}
								className={`py-4 px-1 border-b-2 font-medium text-sm ${
									selectedTab === "programs"
										? "border-red-500 text-red-600"
										: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
								}`}
							>
								Program Latihan ({trainingPrograms.length})
							</button>
							<button
								onClick={() => setSelectedTab("events")}
								className={`py-4 px-1 border-b-2 font-medium text-sm ${
									selectedTab === "events"
										? "border-red-500 text-red-600"
										: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
								}`}
							>
								Event Siswa ({upcomingEvents.length})
							</button>
						</nav>
					</div>

					{/* Tab Content */}
					<div className="p-6">
						{selectedTab === "students" && (
							<div>
								<div className="flex justify-between items-center mb-6">
									<h3 className="text-lg font-medium text-gray-900">
										Daftar Siswa
									</h3>
									<button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700">
										<PlusIcon className="h-4 w-4 mr-2" />
										Tambah Siswa
									</button>
								</div>
								<div className="grid gap-6">
									{students.map((student) => (
										<div
											key={student.id}
											className="border border-gray-200 rounded-lg p-6"
										>
											<div className="flex justify-between items-start">
												<div className="flex-1">
													<div className="flex items-center space-x-3 mb-2">
														<h4 className="text-lg font-semibold text-gray-900">
															{student.name}
														</h4>
														{getStatusBadge(student.status)}
														<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
															{student.category}
														</span>
													</div>
													<p className="text-gray-600 mb-3">{student.email}</p>

													<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500">
														<div>
															<span className="font-medium">Level: </span>
															{student.level}
														</div>
														<div>
															<span className="font-medium">Bergabung: </span>
															{student.joinDate}
														</div>
														<div>
															<span className="font-medium">
																Latihan Terakhir:{" "}
															</span>
															{student.lastTraining}
														</div>
														<div>
															<span className="font-medium">Prestasi: </span>
															{student.achievements} pencapaian
														</div>
													</div>

													<div className="mt-4">
														<div className="flex items-center justify-between text-sm mb-1">
															<span className="font-medium text-gray-700">
																Progress
															</span>
															<span
																className={`font-medium ${getProgressColor(
																	student.progress
																)}`}
															>
																{student.progress}%
															</span>
														</div>
														<div className="w-full bg-gray-200 rounded-full h-2">
															<div
																className="bg-red-600 h-2 rounded-full"
																style={{ width: `${student.progress}%` }}
															></div>
														</div>
													</div>
												</div>

												<div className="ml-6 flex flex-col space-y-2">
													<button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">
														Lihat Progress
													</button>
													<button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
														Edit Profil
													</button>
												</div>
											</div>
										</div>
									))}
								</div>
							</div>
						)}

						{selectedTab === "programs" && (
							<div>
								<div className="flex justify-between items-center mb-6">
									<h3 className="text-lg font-medium text-gray-900">
										Program Latihan
									</h3>
									<button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700">
										<PlusIcon className="h-4 w-4 mr-2" />
										Buat Program Baru
									</button>
								</div>
								<div className="space-y-6">
									{trainingPrograms.map((program) => (
										<div
											key={program.id}
											className="border border-gray-200 rounded-lg p-6"
										>
											<div className="flex justify-between items-start">
												<div className="flex-1">
													<h4 className="text-lg font-semibold text-gray-900 mb-2">
														{program.name}
													</h4>
													<p className="text-gray-600 mb-3">
														{program.description}
													</p>

													<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500">
														<div className="flex items-center">
															<ClockIcon className="h-4 w-4 mr-1" />
															Durasi: {program.duration}
														</div>
														<div className="flex items-center">
															<UsersIcon className="h-4 w-4 mr-1" />
															{program.students} siswa
														</div>
														<div className="flex items-center">
															<CalendarIcon className="h-4 w-4 mr-1" />
															{program.schedule}
														</div>
													</div>

													<div className="mt-4">
														<div className="flex items-center justify-between text-sm mb-1">
															<span className="font-medium text-gray-700">
																Progress Program
															</span>
															<span className="font-medium text-red-600">
																{program.progress}%
															</span>
														</div>
														<div className="w-full bg-gray-200 rounded-full h-2">
															<div
																className="bg-red-600 h-2 rounded-full"
																style={{ width: `${program.progress}%` }}
															></div>
														</div>
													</div>
												</div>

												<div className="ml-6 flex flex-col space-y-2">
													<button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">
														Kelola Program
													</button>
													<button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
														Lihat Detail
													</button>
												</div>
											</div>
										</div>
									))}
								</div>
							</div>
						)}

						{selectedTab === "events" && (
							<div>
								<h3 className="text-lg font-medium text-gray-900 mb-6">
									Event Siswa
								</h3>
								<div className="space-y-6">
									{upcomingEvents.map((event) => (
										<div
											key={event.id}
											className="border border-gray-200 rounded-lg p-6"
										>
											<div className="flex justify-between items-start">
												<div className="flex-1">
													<div className="flex items-center space-x-3 mb-2">
														<h4 className="text-lg font-semibold text-gray-900">
															{event.title}
														</h4>
														{getStatusBadge(event.status)}
														<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
															{event.category}
														</span>
													</div>

													<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500 mb-3">
														<div className="flex items-center">
															<CalendarIcon className="h-4 w-4 mr-1" />
															{event.date}
														</div>
														<div className="flex items-center">
															<MapPinIcon className="h-4 w-4 mr-1" />
															{event.location}
														</div>
														<div className="flex items-center">
															<UsersIcon className="h-4 w-4 mr-1" />
															{event.students.length} siswa terdaftar
														</div>
													</div>

													<div className="mt-3">
														<span className="font-medium text-gray-900">
															Siswa yang berpartisipasi:{" "}
														</span>
														<span className="text-gray-600">
															{event.students.join(", ")}
														</span>
													</div>
												</div>

												<div className="ml-6 flex flex-col space-y-2">
													<button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">
														Monitor Progress
													</button>
													<button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
														Lihat Detail
													</button>
												</div>
											</div>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				</div>
			</main>
		</div>
	);
};

export default PelatihDashboard;
