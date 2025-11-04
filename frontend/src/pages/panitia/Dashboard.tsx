import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
	PlusIcon,
	CalendarIcon,
	MapPinIcon,
	UsersIcon,
	PencilIcon,
	TicketIcon,
	ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../utils/api";
import { Logo } from "../../components/Logo";

interface SchoolCategoryLimit {
	id: string;
	maxParticipants: number;
	schoolCategory: {
		id: string;
		name: string;
	};
}

interface Event {
	id: string;
	title: string;
	slug: string | null;
	description: string | null;
	category: string | null;
	level: string | null;
	startDate: string;
	endDate: string;
	location: string | null;
	venue: string | null;
	maxParticipants: number | null;
	currentParticipants: number;
	status: string;
	featured: boolean;
	couponId: string | null;
	thumbnail: string | null;
	schoolCategoryLimits?: SchoolCategoryLimit[];
}

interface Coupon {
	id: string;
	code: string;
	description: string | null;
	isUsed: boolean;
	expiresAt: string | null;
}

const PanitiaDashboard: React.FC = () => {
	const [events, setEvents] = useState<Event[]>([]);
	const [coupons, setCoupons] = useState<Coupon[]>([]);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState<"events" | "coupons">("events");
	const [user, setUser] = useState<any>(null);

	useEffect(() => {
		fetchData();
		loadUser();
	}, []);

	const loadUser = () => {
		const userData = localStorage.getItem("user");
		if (userData) {
			setUser(JSON.parse(userData));
		}
	};

	const fetchData = async () => {
		try {
			setLoading(true);
			const [eventsRes, couponsRes] = await Promise.all([
				api.get("api/events/my"), // Get only events created by this Panitia
				api.get("api/coupons/my"),
			]);

			const myEvents = eventsRes.data || [];
			setEvents(myEvents);
			setCoupons(couponsRes.data);
		} catch (error) {
			console.error("Error fetching data:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleLogout = () => {
		localStorage.removeItem("token");
		localStorage.removeItem("user");
		window.location.href = "/login";
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	};

	const getStatusBadge = (status: string) => {
		const statusConfig: {
			[key: string]: { label: string; className: string };
		} = {
			DRAFT: { label: "Draft", className: "bg-gray-100 text-gray-800" },
			PUBLISHED: {
				label: "Published",
				className: "bg-green-100 text-green-800",
			},
			ONGOING: { label: "Ongoing", className: "bg-blue-100 text-blue-800" },
			COMPLETED: {
				label: "Completed",
				className: "bg-purple-100 text-purple-800",
			},
			CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-800" },
		};

		const config = statusConfig[status] || {
			label: "Draft",
			className: "bg-gray-100 text-gray-800",
		};
		return (
			<span
				className={`px-2 py-1 text-xs font-semibold rounded-full ${config.className}`}
			>
				{config.label}
			</span>
		);
	};
	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Memuat data...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<header className="bg-white shadow-sm">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center py-4">
						<div className="flex items-center gap-4">
							<Logo size="sm" />
							<div>
								<h1 className="text-xl font-bold text-gray-900">
									Dashboard Panitia
								</h1>
								<p className="text-sm text-gray-500">Kelola Event Anda</p>
							</div>
						</div>
						<div className="flex items-center gap-4">
							{user && (
								<div className="text-right">
									<p className="text-sm font-medium text-gray-900">
										{user.name}
									</p>
									<p className="text-xs text-gray-500">{user.email}</p>
								</div>
							)}
							<button
								onClick={handleLogout}
								className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
							>
								<ArrowRightOnRectangleIcon className="w-5 h-5" />
								Logout
							</button>
						</div>
					</div>
				</div>
			</header>

			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
					<div className="bg-white rounded-lg shadow p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600">Total Event</p>
								<p className="text-3xl font-bold text-gray-900">
									{events.length}
								</p>
							</div>
							<CalendarIcon className="w-12 h-12 text-indigo-600" />
						</div>
					</div>

					<div className="bg-white rounded-lg shadow p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600">Event Published</p>
								<p className="text-3xl font-bold text-green-600">
									{events.filter((e) => e.status === "PUBLISHED").length}
								</p>
							</div>
							<CalendarIcon className="w-12 h-12 text-green-600" />
						</div>
					</div>

					<div className="bg-white rounded-lg shadow p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600">Coupon Tersedia</p>
								<p className="text-3xl font-bold text-blue-600">
									{coupons.filter((c) => !c.isUsed).length}
								</p>
							</div>
							<TicketIcon className="w-12 h-12 text-blue-600" />
						</div>
					</div>
				</div>

				<div className="bg-white rounded-lg shadow mb-6">
					<div className="border-b border-gray-200">
						<nav className="flex -mb-px">
							<button
								onClick={() => setActiveTab("events")}
								className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
									activeTab === "events"
										? "border-indigo-600 text-indigo-600"
										: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
								}`}
							>
								Event Saya
							</button>
							<button
								onClick={() => setActiveTab("coupons")}
								className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
									activeTab === "coupons"
										? "border-indigo-600 text-indigo-600"
										: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
								}`}
							>
								Coupon Tersedia ({coupons.filter((c) => !c.isUsed).length})
							</button>
						</nav>
					</div>
				</div>

				{activeTab === "events" && (
					<div>
						<div className="flex justify-between items-center mb-6">
							<h2 className="text-2xl font-bold text-gray-900">Daftar Event</h2>
							{coupons.filter((c) => !c.isUsed).length > 0 ? (
								<Link
									to="/panitia/events/create"
									className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
								>
									<PlusIcon className="w-5 h-5" />
									Buat Event Baru
								</Link>
							) : (
								<div className="text-right">
									<button
										disabled
										className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
									>
										<PlusIcon className="w-5 h-5" />
										Buat Event Baru
									</button>
								</div>
							)}
						</div>

						{events.length === 0 ? (
							<div className="bg-white rounded-lg shadow p-12 text-center">
								<CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
								<h3 className="text-lg font-medium text-gray-900 mb-2">
									Belum Ada Event
								</h3>
								<p className="text-gray-500 mb-6">
									Mulai dengan membuat event pertama Anda. Setiap event
									memerlukan 1 kupon.
								</p>
								{coupons.filter((c) => !c.isUsed).length > 0 ? (
									<Link
										to="/panitia/events/create"
										className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
									>
										<PlusIcon className="w-5 h-5" />
										Buat Event Baru
									</Link>
								) : (
									<div>
										<button
											disabled
											className="inline-flex items-center gap-2 px-6 py-3 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed mb-2"
										>
											<PlusIcon className="w-5 h-5" />
											Buat Event Baru
										</button>
										<p className="text-sm text-red-600">
											Anda memerlukan kupon untuk membuat event. Hubungi admin
											untuk mendapatkan kupon.
										</p>
									</div>
								)}
							</div>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
								{events.map((event) => {
									const eventStartDate = new Date(event.startDate);
									const today = new Date();
									const canEdit = today < eventStartDate; // Can edit if event hasn't started yet

									const getImageUrl = (thumbnail: string | null) => {
										if (!thumbnail) return null;
										if (
											thumbnail.startsWith("http://") ||
											thumbnail.startsWith("https://")
										) {
											return thumbnail;
										}
										const backendUrl =
											import.meta.env.VITE_BACKEND_URL ||
											"http://localhost:3001";
										return `${backendUrl}${thumbnail}`;
									};

									return (
										<div
											key={event.id}
											className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden flex flex-col"
										>
											{/* Thumbnail with 4:5 ratio */}
											<div className="relative w-full aspect-[4/5] bg-gradient-to-br from-indigo-500 to-purple-600">
												{event.thumbnail ? (
													<img
														src={getImageUrl(event.thumbnail) || ""}
														alt={event.title}
														className="w-full h-full object-cover"
														onError={(e) => {
															e.currentTarget.style.display = "none";
														}}
													/>
												) : (
													<div className="flex items-center justify-center h-full">
														<CalendarIcon className="w-16 h-16 text-white/50" />
													</div>
												)}
												{/* Status Badge */}
												<div className="absolute top-4 right-4">
													{getStatusBadge(event.status)}
												</div>
											</div>

											{/* Content */}
											<div className="p-6 flex flex-col flex-1">
												<h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
													{event.title}
												</h3>

												{event.description && (
													<p className="text-sm text-gray-600 mb-4 line-clamp-2">
														{event.description}
													</p>
												)}

												<div className="space-y-2 mb-4 flex-1">
													<div className="flex items-center text-sm text-gray-600">
														<CalendarIcon className="w-4 h-4 mr-2 flex-shrink-0" />
														<span>{formatDate(event.startDate)}</span>
													</div>
													{event.location && (
														<div className="flex items-center text-sm text-gray-600">
															<MapPinIcon className="w-4 h-4 mr-2 flex-shrink-0" />
															<span className="line-clamp-1">
																{event.location}
															</span>
														</div>
													)}

													{/* Display school category limits */}
													{event.schoolCategoryLimits &&
													event.schoolCategoryLimits.length > 0 ? (
														<div className="space-y-1">
															{event.schoolCategoryLimits.map((limit) => (
																<div
																	key={limit.id}
																	className="flex items-start text-sm text-gray-600"
																>
																	<UsersIcon className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
																	<span className="line-clamp-2">
																		<span className="font-medium">
																			{limit.schoolCategory.name}:
																		</span>{" "}
																		Max {limit.maxParticipants} peserta
																	</span>
																</div>
															))}
														</div>
													) : (
														<div className="flex items-center text-sm text-gray-600">
															<UsersIcon className="w-4 h-4 mr-2 flex-shrink-0" />
															<span>
																{event.currentParticipants} /{" "}
																{event.maxParticipants || "∞"} peserta
															</span>
														</div>
													)}
												</div>

												{/* Action Buttons */}
												<div className="flex gap-2 mt-auto">
													{canEdit && (
														<Link
															to={`/panitia/events/${event.id}/edit`}
															className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
														>
															<PencilIcon className="w-4 h-4" />
															Edit
														</Link>
													)}
													<Link
														to={`/panitia/events/${event.id}/manage`}
														className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
															canEdit
																? "bg-gray-100 text-gray-700 hover:bg-gray-200"
																: "bg-indigo-600 text-white hover:bg-indigo-700"
														}`}
													>
														<ArrowRightOnRectangleIcon className="w-4 h-4" />
														Kelola
													</Link>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>
				)}

				{activeTab === "coupons" && (
					<div>
						<h2 className="text-2xl font-bold text-gray-900 mb-6">
							Coupon Tersedia
						</h2>
						{coupons.length === 0 ? (
							<div className="bg-white rounded-lg shadow p-12 text-center">
								<TicketIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
								<h3 className="text-lg font-medium text-gray-900 mb-2">
									Tidak Ada Coupon
								</h3>
								<p className="text-gray-500">
									Anda belum memiliki coupon untuk membuat event. Hubungi admin
									untuk mendapatkan coupon.
								</p>
							</div>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
								{coupons.map((coupon) => (
									<div
										key={coupon.id}
										className={`bg-white rounded-lg shadow p-6 ${
											coupon.isUsed ? "opacity-50" : "hover:shadow-lg"
										} transition-shadow`}
									>
										<div className="flex items-start justify-between mb-4">
											<TicketIcon className="w-8 h-8 text-indigo-600" />
											<span
												className={`px-2 py-1 text-xs font-semibold rounded-full ${
													coupon.isUsed
														? "bg-gray-100 text-gray-600"
														: "bg-green-100 text-green-800"
												}`}
											>
												{coupon.isUsed ? "Terpakai" : "Tersedia"}
											</span>
										</div>
										<h3 className="text-lg font-bold text-gray-900 mb-2 font-mono">
											{coupon.code}
										</h3>
										{coupon.description && (
											<p className="text-sm text-gray-600 mb-4">
												{coupon.description}
											</p>
										)}
										{coupon.expiresAt && (
											<p className="text-xs text-gray-500">
												Berlaku hingga: {formatDate(coupon.expiresAt)}
											</p>
										)}
										{!coupon.isUsed && (
											<p className="mt-4 text-xs text-indigo-600 font-medium">
												💡 Kupon ini akan otomatis terpakai saat Anda membuat
												event
											</p>
										)}
									</div>
								))}
							</div>
						)}
					</div>
				)}
			</main>
		</div>
	);
};

export default PanitiaDashboard;
