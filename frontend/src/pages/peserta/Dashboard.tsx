import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
	MagnifyingGlassIcon,
	CalendarIcon,
	MapPinIcon,
	UsersIcon,
	ClockIcon,
	CheckCircleIcon,
	ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

const PesertaDashboard = () => {
	const { user, logout } = useAuth();
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("");
	const [selectedLocation, setSelectedLocation] = useState("");

	// Mock data untuk events yang tersedia
	const availableEvents = [
		{
			id: 1,
			title: "Championship Taekwondo 2025",
			description: "Kejuaraan taekwondo tingkat nasional untuk semua tingkat",
			date: "2025-02-15",
			time: "09:00",
			location: "GOR Senayan, Jakarta",
			maxParticipants: 200,
			currentParticipants: 45,
			category: "Taekwondo",
			level: "Semua Tingkat",
			registrationDeadline: "2025-02-10",
			fee: "Rp 150.000",
			organizer: "PBTI Jakarta",
			isRegistered: false,
			spots: 155,
		},
		{
			id: 2,
			title: "Karate Open Tournament",
			description: "Turnamen karate terbuka untuk tingkat pemula hingga mahir",
			date: "2025-03-10",
			time: "08:00",
			location: "Istora Senayan, Jakarta",
			maxParticipants: 150,
			currentParticipants: 23,
			category: "Karate",
			level: "Pemula - Mahir",
			registrationDeadline: "2025-03-05",
			fee: "Rp 100.000",
			organizer: "FORKI DKI Jakarta",
			isRegistered: true,
			spots: 127,
		},
		{
			id: 3,
			title: "Wushu Championship Regional",
			description: "Kejuaraan wushu tingkat regional Jawa Tengah",
			date: "2025-01-20",
			time: "10:00",
			location: "GOR Satria, Purwokerto",
			maxParticipants: 100,
			currentParticipants: 87,
			category: "Wushu",
			level: "Regional",
			registrationDeadline: "2025-01-15",
			fee: "Rp 75.000",
			organizer: "Pengprov Wushu Jateng",
			isRegistered: false,
			spots: 13,
		},
		{
			id: 4,
			title: "Pencak Silat Open Championship",
			description: "Kejuaraan pencak silat terbuka untuk pelajar dan umum",
			date: "2025-04-22",
			time: "07:30",
			location: "GOR Pajajaran, Bogor",
			maxParticipants: 300,
			currentParticipants: 156,
			category: "Pencak Silat",
			level: "Pelajar & Umum",
			registrationDeadline: "2025-04-15",
			fee: "Rp 125.000",
			organizer: "IPSI Jawa Barat",
			isRegistered: false,
			spots: 144,
		},
	];

	// Mock data untuk events yang sudah diikuti
	const myEvents = [
		{
			id: 2,
			title: "Karate Open Tournament",
			date: "2025-03-10",
			status: "registered",
			registrationDate: "2024-12-15",
		},
	];

	const categories = ["Taekwondo", "Karate", "Wushu", "Pencak Silat"];
	const locations = ["Jakarta", "Bogor", "Purwokerto", "Bandung"];

	const filteredEvents = availableEvents.filter((event) => {
		const matchesSearch =
			event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			event.description.toLowerCase().includes(searchTerm.toLowerCase());
		const matchesCategory =
			selectedCategory === "" || event.category === selectedCategory;
		const matchesLocation =
			selectedLocation === "" || event.location.includes(selectedLocation);

		return matchesSearch && matchesCategory && matchesLocation;
	});

	const getAvailabilityStatus = (spots: number) => {
		if (spots > 50) return { color: "text-green-600", text: "Banyak Slot" };
		if (spots > 10) return { color: "text-yellow-600", text: "Slot Terbatas" };
		return { color: "text-red-600", text: "Hampir Penuh" };
	};

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<header className="bg-white shadow">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center py-6">
						<div>
							<h1 className="text-3xl font-bold text-gray-900">
								Peserta Dashboard
							</h1>
							<p className="text-gray-600">
								Temukan & Daftar Event - {user?.firstName} {user?.lastName}
							</p>
						</div>
						<div className="flex items-center space-x-4">
							<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
								Peserta
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
				{/* My Events Summary */}
				<div className="mb-8 bg-white shadow rounded-lg">
					<div className="px-6 py-4 border-b border-gray-200">
						<h3 className="text-lg font-medium text-gray-900">Event Saya</h3>
					</div>
					<div className="p-6">
						{myEvents.length > 0 ? (
							<div className="space-y-3">
								{myEvents.map((event) => (
									<div
										key={event.id}
										className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
									>
										<div>
											<h4 className="font-medium text-gray-900">
												{event.title}
											</h4>
											<p className="text-sm text-gray-500">
												Terdaftar pada: {event.registrationDate}
											</p>
										</div>
										<div className="flex items-center space-x-2">
											<CheckCircleIcon className="h-5 w-5 text-green-500" />
											<span className="text-sm font-medium text-green-700">
												Terdaftar
											</span>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="text-center py-4">
								<ExclamationCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
								<p className="mt-2 text-sm text-gray-500">
									Anda belum mendaftar ke event apapun
								</p>
							</div>
						)}
					</div>
				</div>

				{/* Search and Filter */}
				<div className="mb-6 bg-white shadow rounded-lg">
					<div className="px-6 py-4 border-b border-gray-200">
						<h3 className="text-lg font-medium text-gray-900 flex items-center">
							<MagnifyingGlassIcon className="h-5 w-5 mr-2" />
							Cari Event
						</h3>
					</div>
					<div className="p-6">
						<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
							<div className="md:col-span-2">
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Kata Kunci
								</label>
								<input
									type="text"
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
									placeholder="Cari nama event atau deskripsi..."
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Kategori
								</label>
								<select
									value={selectedCategory}
									onChange={(e) => setSelectedCategory(e.target.value)}
									className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
								>
									<option value="">Semua Kategori</option>
									{categories.map((category) => (
										<option key={category} value={category}>
											{category}
										</option>
									))}
								</select>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Lokasi
								</label>
								<select
									value={selectedLocation}
									onChange={(e) => setSelectedLocation(e.target.value)}
									className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
								>
									<option value="">Semua Lokasi</option>
									{locations.map((location) => (
										<option key={location} value={location}>
											{location}
										</option>
									))}
								</select>
							</div>
						</div>
					</div>
				</div>

				{/* Available Events */}
				<div className="bg-white shadow rounded-lg">
					<div className="px-6 py-4 border-b border-gray-200">
						<h3 className="text-lg font-medium text-gray-900">
							Event Tersedia ({filteredEvents.length})
						</h3>
					</div>
					<div className="divide-y divide-gray-200">
						{filteredEvents.map((event) => {
							const availability = getAvailabilityStatus(event.spots);
							return (
								<div key={event.id} className="p-6">
									<div className="flex justify-between items-start">
										<div className="flex-1">
											<div className="flex items-center space-x-3 mb-2">
												<h4 className="text-lg font-semibold text-gray-900">
													{event.title}
												</h4>
												<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
													{event.category}
												</span>
												{event.isRegistered && (
													<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
														Sudah Terdaftar
													</span>
												)}
											</div>
											<p className="text-gray-600 mb-3">{event.description}</p>

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
													{event.currentParticipants}/{event.maxParticipants}{" "}
													peserta
												</div>
												<div className="flex items-center">
													<ClockIcon className="h-4 w-4 mr-1" />
													Daftar sampai: {event.registrationDeadline}
												</div>
											</div>

											<div className="mt-3 flex items-center justify-between">
												<div className="flex items-center space-x-4 text-sm">
													<span className="font-medium text-gray-900">
														Biaya: {event.fee}
													</span>
													<span className="text-gray-500">
														Level: {event.level}
													</span>
													<span className="text-gray-500">
														Organizer: {event.organizer}
													</span>
												</div>
												<div className="flex items-center space-x-2">
													<span
														className={`text-sm font-medium ${availability.color}`}
													>
														{availability.text} ({event.spots} slot)
													</span>
												</div>
											</div>
										</div>

										<div className="ml-6 flex flex-col space-y-2">
											{event.isRegistered ? (
												<button
													disabled
													className="px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
												>
													Sudah Terdaftar
												</button>
											) : (
												<button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">
													Daftar Event
												</button>
											)}
											<button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
												Lihat Detail
											</button>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>

				{filteredEvents.length === 0 && (
					<div className="bg-white shadow rounded-lg p-6 text-center">
						<MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
						<h3 className="mt-2 text-sm font-medium text-gray-900">
							Tidak ada event ditemukan
						</h3>
						<p className="mt-1 text-sm text-gray-500">
							Coba ubah filter pencarian atau kata kunci untuk menemukan event
							yang sesuai.
						</p>
					</div>
				)}
			</main>
		</div>
	);
};

export default PesertaDashboard;
