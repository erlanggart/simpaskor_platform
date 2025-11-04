import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
	CalendarIcon,
	MapPinIcon,
	UsersIcon,
	ClockIcon,
	StarIcon,
	CheckCircleIcon,
	ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";

const JuriDashboard = () => {
	const { user, logout } = useAuth();
	const [selectedTab, setSelectedTab] = useState("assigned");

	// Mock data untuk events yang di-assign ke juri ini
	const assignedEvents = [
		{
			id: 1,
			title: "Championship Taekwondo 2025",
			description: "Kejuaraan taekwondo tingkat nasional",
			date: "2025-02-15",
			time: "09:00",
			location: "GOR Senayan, Jakarta",
			participants: 45,
			category: "Taekwondo",
			status: "upcoming",
			myRole: "Ketua Juri",
			assignedDate: "2024-12-10",
			coordinator: "Ahmad Fauzi",
		},
		{
			id: 2,
			title: "Karate Open Tournament",
			description: "Turnamen karate terbuka untuk semua tingkat",
			date: "2025-03-10",
			time: "08:00",
			location: "Istora Senayan, Jakarta",
			participants: 23,
			category: "Karate",
			status: "upcoming",
			myRole: "Juri Lapangan",
			assignedDate: "2024-12-15",
			coordinator: "Siti Nurhaliza",
		},
	];

	// Mock data untuk events yang sudah selesai dinilai
	const completedEvents = [
		{
			id: 3,
			title: "Wushu Championship Regional",
			description: "Kejuaraan wushu tingkat regional",
			date: "2024-11-20",
			time: "10:00",
			location: "GOR Satria, Purwokerto",
			participants: 87,
			category: "Wushu",
			status: "completed",
			myRole: "Juri Teknik",
			score: "Selesai dinilai",
			rating: 4.8,
		},
	];

	// Mock data untuk tugas penilaian
	const judgingTasks = [
		{
			id: 1,
			eventTitle: "Championship Taekwondo 2025",
			task: "Penilaian Teknik - Poomsae",
			participants: 25,
			deadline: "2025-02-15",
			status: "pending",
			priority: "high",
		},
		{
			id: 2,
			eventTitle: "Championship Taekwondo 2025",
			task: "Penilaian Sparring - Kategori Junior",
			participants: 20,
			deadline: "2025-02-15",
			status: "pending",
			priority: "medium",
		},
	];

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "upcoming":
				return (
					<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
						Akan Datang
					</span>
				);
			case "completed":
				return (
					<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
						Selesai
					</span>
				);
			case "ongoing":
				return (
					<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
						Berlangsung
					</span>
				);
			default:
				return (
					<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
						{status}
					</span>
				);
		}
	};

	const getPriorityBadge = (priority: string) => {
		switch (priority) {
			case "high":
				return (
					<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
						Tinggi
					</span>
				);
			case "medium":
				return (
					<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
						Sedang
					</span>
				);
			case "low":
				return (
					<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
						Rendah
					</span>
				);
			default:
				return null;
		}
	};

	const stats = [
		{
			name: "Event Ditugaskan",
			value: assignedEvents.length.toString(),
			icon: CalendarIcon,
			color: "bg-blue-500",
		},
		{
			name: "Event Selesai",
			value: completedEvents.length.toString(),
			icon: CheckCircleIcon,
			color: "bg-green-500",
		},
		{
			name: "Tugas Pending",
			value: judgingTasks
				.filter((task) => task.status === "pending")
				.length.toString(),
			icon: ClipboardDocumentListIcon,
			color: "bg-yellow-500",
		},
		{
			name: "Rating Rata-rata",
			value: "4.8",
			icon: StarIcon,
			color: "bg-purple-500",
		},
	];

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<header className="bg-white shadow">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center py-6">
						<div>
							<h1 className="text-3xl font-bold text-gray-900">
								Juri Dashboard
							</h1>
							<p className="text-gray-600">
								Panel Penilaian Event - {user?.name}
							</p>
						</div>
						<div className="flex items-center space-x-4">
							<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
								Juri
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
								onClick={() => setSelectedTab("assigned")}
								className={`py-4 px-1 border-b-2 font-medium text-sm ${
									selectedTab === "assigned"
										? "border-indigo-500 text-indigo-600"
										: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
								}`}
							>
								Event Ditugaskan ({assignedEvents.length})
							</button>
							<button
								onClick={() => setSelectedTab("tasks")}
								className={`py-4 px-1 border-b-2 font-medium text-sm ${
									selectedTab === "tasks"
										? "border-indigo-500 text-indigo-600"
										: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
								}`}
							>
								Tugas Penilaian ({judgingTasks.length})
							</button>
							<button
								onClick={() => setSelectedTab("completed")}
								className={`py-4 px-1 border-b-2 font-medium text-sm ${
									selectedTab === "completed"
										? "border-indigo-500 text-indigo-600"
										: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
								}`}
							>
								Event Selesai ({completedEvents.length})
							</button>
						</nav>
					</div>

					{/* Tab Content */}
					<div className="p-6">
						{selectedTab === "assigned" && (
							<div className="space-y-6">
								{assignedEvents.map((event) => (
									<div
										key={event.id}
										className="border border-gray-200 rounded-lg p-6"
									>
										<div className="flex justify-between items-start">
											<div className="flex-1">
												<div className="flex items-center space-x-3 mb-2">
													<h3 className="text-lg font-semibold text-gray-900">
														{event.title}
													</h3>
													{getStatusBadge(event.status)}
													<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
														{event.myRole}
													</span>
												</div>
												<p className="text-gray-600 mb-3">
													{event.description}
												</p>

												<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500">
													<div className="flex items-center">
														<CalendarIcon className="h-4 w-4 mr-1" />
														{event.date} at {event.time}
													</div>
													<div className="flex items-center">
														<MapPinIcon className="h-4 w-4 mr-1" />
														{event.location}
													</div>
													<div className="flex items-center">
														<UsersIcon className="h-4 w-4 mr-1" />
														{event.participants} peserta
													</div>
													<div className="flex items-center">
														<ClockIcon className="h-4 w-4 mr-1" />
														Ditugaskan: {event.assignedDate}
													</div>
												</div>

												<div className="mt-3 text-sm">
													<span className="font-medium text-gray-900">
														Koordinator:{" "}
													</span>
													<span className="text-gray-600">
														{event.coordinator}
													</span>
												</div>
											</div>

											<div className="ml-6 flex flex-col space-y-2">
												<button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">
													Mulai Penilaian
												</button>
												<button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
													Lihat Detail
												</button>
											</div>
										</div>
									</div>
								))}
							</div>
						)}

						{selectedTab === "tasks" && (
							<div className="space-y-4">
								{judgingTasks.map((task) => (
									<div
										key={task.id}
										className="border border-gray-200 rounded-lg p-4"
									>
										<div className="flex justify-between items-start">
											<div className="flex-1">
												<div className="flex items-center space-x-3 mb-2">
													<h4 className="font-semibold text-gray-900">
														{task.task}
													</h4>
													{getPriorityBadge(task.priority)}
												</div>
												<p className="text-sm text-gray-600 mb-2">
													Event: {task.eventTitle}
												</p>
												<div className="flex items-center space-x-4 text-sm text-gray-500">
													<div className="flex items-center">
														<UsersIcon className="h-4 w-4 mr-1" />
														{task.participants} peserta
													</div>
													<div className="flex items-center">
														<ClockIcon className="h-4 w-4 mr-1" />
														Deadline: {task.deadline}
													</div>
												</div>
											</div>
											<div className="flex space-x-2">
												<button className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm">
													Mulai
												</button>
												<button className="px-3 py-1 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50">
													Detail
												</button>
											</div>
										</div>
									</div>
								))}
							</div>
						)}

						{selectedTab === "completed" && (
							<div className="space-y-6">
								{completedEvents.map((event) => (
									<div
										key={event.id}
										className="border border-gray-200 rounded-lg p-6 bg-gray-50"
									>
										<div className="flex justify-between items-start">
											<div className="flex-1">
												<div className="flex items-center space-x-3 mb-2">
													<h3 className="text-lg font-semibold text-gray-900">
														{event.title}
													</h3>
													{getStatusBadge(event.status)}
													<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
														{event.myRole}
													</span>
												</div>
												<p className="text-gray-600 mb-3">
													{event.description}
												</p>

												<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500">
													<div className="flex items-center">
														<CalendarIcon className="h-4 w-4 mr-1" />
														{event.date} at {event.time}
													</div>
													<div className="flex items-center">
														<MapPinIcon className="h-4 w-4 mr-1" />
														{event.location}
													</div>
													<div className="flex items-center">
														<UsersIcon className="h-4 w-4 mr-1" />
														{event.participants} peserta
													</div>
													<div className="flex items-center">
														<StarIcon className="h-4 w-4 mr-1" />
														Rating: {event.rating}/5.0
													</div>
												</div>

												<div className="mt-3 text-sm">
													<span className="font-medium text-gray-900">
														Status:{" "}
													</span>
													<span className="text-green-600">{event.score}</span>
												</div>
											</div>

											<div className="ml-6 flex flex-col space-y-2">
												<button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
													Lihat Hasil
												</button>
												<button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
													Download Laporan
												</button>
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</main>
		</div>
	);
};

export default JuriDashboard;
