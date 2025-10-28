import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
	PlusIcon,
	CalendarIcon,
	MapPinIcon,
	UsersIcon,
	ClockIcon,
	PencilIcon,
	TrashIcon,
	EyeIcon,
} from "@heroicons/react/24/outline";

const PanitiaDashboard = () => {
	const { user, logout } = useAuth();
	const [showCreateEvent, setShowCreateEvent] = useState(false);

	// Mock data untuk events yang dibuat panitia
	const events = [
		{
			id: 1,
			title: "Championship Taekwondo 2025",
			description: "Kejuaraan taekwondo tingkat nasional",
			date: "2025-02-15",
			time: "09:00",
			location: "GOR Senayan, Jakarta",
			maxParticipants: 200,
			currentParticipants: 45,
			status: "active",
			category: "Taekwondo",
		},
		{
			id: 2,
			title: "Karate Open Tournament",
			description: "Turnamen karate terbuka untuk semua tingkat",
			date: "2025-03-10",
			time: "08:00",
			location: "Istora Senayan, Jakarta",
			maxParticipants: 150,
			currentParticipants: 23,
			status: "draft",
			category: "Karate",
		},
		{
			id: 3,
			title: "Wushu Championship",
			description: "Kejuaraan wushu regional",
			date: "2025-01-20",
			time: "10:00",
			location: "GOR Satria, Purwokerto",
			maxParticipants: 100,
			currentParticipants: 100,
			status: "completed",
			category: "Wushu",
		},
	];

	const stats = [
		{
			name: "Total Events",
			value: events.length.toString(),
			icon: CalendarIcon,
			color: "bg-blue-500",
		},
		{
			name: "Active Events",
			value: events.filter((e) => e.status === "active").length.toString(),
			icon: ClockIcon,
			color: "bg-green-500",
		},
		{
			name: "Total Participants",
			value: events
				.reduce((sum, e) => sum + e.currentParticipants, 0)
				.toString(),
			icon: UsersIcon,
			color: "bg-purple-500",
		},
		{
			name: "Completed Events",
			value: events.filter((e) => e.status === "completed").length.toString(),
			icon: CalendarIcon,
			color: "bg-gray-500",
		},
	];

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "active":
				return (
					<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
						Active
					</span>
				);
			case "draft":
				return (
					<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
						Draft
					</span>
				);
			case "completed":
				return (
					<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
						Completed
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

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<header className="bg-white shadow">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center py-6">
						<div>
							<h1 className="text-3xl font-bold text-gray-900">
								Panitia Dashboard
							</h1>
							<p className="text-gray-600">
								Kelola Event - {user?.firstName} {user?.lastName}
							</p>
						</div>
						<div className="flex items-center space-x-4">
							<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
								Panitia
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

				{/* Create Event Section */}
				<div className="bg-white shadow rounded-lg mb-8">
					<div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
						<h3 className="text-lg font-medium text-gray-900">
							Event Management
						</h3>
						<button
							onClick={() => setShowCreateEvent(!showCreateEvent)}
							className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
						>
							<PlusIcon className="h-4 w-4 mr-2" />
							Buat Event Baru
						</button>
					</div>

					{showCreateEvent && (
						<div className="p-6 border-b border-gray-200 bg-gray-50">
							<form className="space-y-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-gray-700">
											Nama Event
										</label>
										<input
											type="text"
											className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
											placeholder="Masukkan nama event"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700">
											Kategori
										</label>
										<select className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
											<option value="">Pilih kategori</option>
											<option value="taekwondo">Taekwondo</option>
											<option value="karate">Karate</option>
											<option value="wushu">Wushu</option>
											<option value="pencak-silat">Pencak Silat</option>
										</select>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700">
											Tanggal
										</label>
										<input
											type="date"
											className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700">
											Waktu
										</label>
										<input
											type="time"
											className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700">
											Lokasi
										</label>
										<input
											type="text"
											className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
											placeholder="Masukkan lokasi event"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700">
											Max Peserta
										</label>
										<input
											type="number"
											className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
											placeholder="Jumlah maksimal peserta"
										/>
									</div>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700">
										Deskripsi
									</label>
									<textarea
										rows={3}
										className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
										placeholder="Deskripsi event"
									/>
								</div>
								<div className="flex justify-end space-x-3">
									<button
										type="button"
										onClick={() => setShowCreateEvent(false)}
										className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
									>
										Batal
									</button>
									<button
										type="submit"
										className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
									>
										Simpan Event
									</button>
								</div>
							</form>
						</div>
					)}
				</div>

				{/* Events List */}
				<div className="bg-white shadow rounded-lg">
					<div className="px-6 py-4 border-b border-gray-200">
						<h3 className="text-lg font-medium text-gray-900">Daftar Event</h3>
					</div>
					<div className="overflow-hidden">
						<ul className="divide-y divide-gray-200">
							{events.map((event) => (
								<li key={event.id} className="px-6 py-4">
									<div className="flex items-center justify-between">
										<div className="flex-1 min-w-0">
											<div className="flex items-center space-x-3">
												<h4 className="text-lg font-medium text-gray-900 truncate">
													{event.title}
												</h4>
												{getStatusBadge(event.status)}
											</div>
											<p className="text-sm text-gray-500 mt-1">
												{event.description}
											</p>
											<div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
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
													{event.currentParticipants}/{event.maxParticipants}{" "}
													peserta
												</div>
											</div>
										</div>
										<div className="flex items-center space-x-2">
											<button className="p-2 text-gray-400 hover:text-gray-600">
												<EyeIcon className="h-5 w-5" />
											</button>
											<button className="p-2 text-gray-400 hover:text-gray-600">
												<PencilIcon className="h-5 w-5" />
											</button>
											<button className="p-2 text-gray-400 hover:text-red-600">
												<TrashIcon className="h-5 w-5" />
											</button>
										</div>
									</div>
								</li>
							))}
						</ul>
					</div>
				</div>
			</main>
		</div>
	);
};

export default PanitiaDashboard;
