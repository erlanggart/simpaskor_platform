import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
	PlusIcon,
	CalendarIcon,
	MapPinIcon,
	UsersIcon,
	Cog6ToothIcon,
	ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { LuChevronRight } from "react-icons/lu";
import { api } from "../../utils/api";
import { DraftEventsList } from "../../components/event-wizard";
import Swal from "sweetalert2";

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
	isUsed: boolean;
}

const PanitiaEvents: React.FC = () => {
	const navigate = useNavigate();
	const [events, setEvents] = useState<Event[]>([]);
	const [coupons, setCoupons] = useState<Coupon[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchData();
	}, []);

	const fetchData = async () => {
		try {
			setLoading(true);
			const [eventsRes, couponsRes] = await Promise.all([
				api.get("/events/my"),
				api.get("/coupons/my"),
			]);

			const myEvents = eventsRes.data || [];
			myEvents.sort((a: Event, b: Event) => {
				const dateA = new Date(a.startDate).getTime();
				const dateB = new Date(b.startDate).getTime();
				return dateB - dateA;
			});
			setEvents(myEvents);
			setCoupons(couponsRes.data);
		} catch (error) {
			console.error("Error fetching events:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleEnterEvent = (event: Event) => {
		if (!event.slug) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: "Event belum memiliki slug",
			});
			return;
		}

		localStorage.setItem(
			"panitia_active_event",
			JSON.stringify({
				slug: event.slug,
				title: event.title,
				id: event.id,
			})
		);

		navigate(`/panitia/events/${event.slug}/manage`);
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	};

	const getStatusBadge = (status: string) => {
		const statusConfig: Record<string, { label: string; className: string }> = {
			DRAFT: { label: "Draft", className: "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400" },
			PUBLISHED: { label: "Published", className: "bg-green-500/10 text-green-600 dark:text-green-400" },
			ONGOING: { label: "Ongoing", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
			COMPLETED: { label: "Completed", className: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
			CANCELLED: { label: "Cancelled", className: "bg-red-500/10 text-red-600 dark:text-red-400" },
		};

		const config = statusConfig[status] || {
			label: "Draft",
			className: "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400",
		};
		return (
			<span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${config.className}`}>
				{config.label}
			</span>
		);
	};

	const getImageUrl = (thumbnail: string | null) => {
		if (!thumbnail) return null;
		if (thumbnail.startsWith("http://") || thumbnail.startsWith("https://")) {
			return thumbnail;
		}
		const backendUrl = import.meta.env.VITE_BACKEND_URL || "";
		return `${backendUrl}${thumbnail}`;
	};

	const availableCoupons = coupons.filter((c) => !c.isUsed).length;

	if (loading) {
		return (
			<div className="flex items-center justify-center py-32">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 mx-auto mb-4"></div>
					<p className="text-sm text-gray-500 dark:text-gray-400">Memuat data...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
			{/* Draft Events */}
			<div className="mb-6">
				<DraftEventsList />
			</div>

			{/* Header + Create */}
			<div className="flex items-center justify-between mb-5">
				<div>
					<h2 className="text-lg font-bold text-gray-900 dark:text-white">
						Daftar Event
					</h2>
					<p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
						{events.length} event terdaftar
					</p>
				</div>
				{availableCoupons > 0 ? (
					<Link
						to="/panitia/events/create"
						className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-full text-xs font-semibold hover:bg-red-700 transition-colors shadow-lg hover:shadow-red-500/25"
					>
						<PlusIcon className="w-4 h-4" />
						Buat Event
					</Link>
				) : (
					<button
						disabled
						className="flex items-center gap-2 px-4 py-2 bg-gray-300 dark:bg-white/10 text-gray-500 dark:text-gray-600 rounded-full text-xs font-semibold cursor-not-allowed"
						title="Anda memerlukan coupon untuk membuat event"
					>
						<PlusIcon className="w-4 h-4" />
						Buat Event
					</button>
				)}
			</div>

			{/* Event List */}
			{events.length === 0 ? (
				<div className="rounded-2xl bg-white/60 dark:bg-white/[0.03] backdrop-blur-sm border border-gray-200/50 dark:border-white/[0.06] p-12 text-center">
					<CalendarIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
					<h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
						Belum Ada Event
					</h3>
					<p className="text-xs text-gray-500 dark:text-gray-500 mb-5">
						Mulai dengan membuat event pertama Anda.
					</p>
					{availableCoupons > 0 && (
						<Link
							to="/panitia/events/create"
							className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-full text-xs font-semibold hover:bg-red-700 transition-colors"
						>
							<PlusIcon className="w-4 h-4" />
							Buat Event Baru
						</Link>
					)}
				</div>
			) : (
				<div className="flex flex-col gap-2">
					{events.map((event) => {
						const eventStartDate = new Date(event.startDate);
						const today = new Date();
						const canEdit = today < eventStartDate;
						const imgUrl = getImageUrl(event.thumbnail);

						return (
							<div
								key={event.id}
								className="group rounded-xl bg-white/60 dark:bg-white/[0.03] backdrop-blur-sm border border-gray-200/50 dark:border-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.12] transition-all duration-300 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20"
							>
								<div className="flex items-center gap-4 p-3 md:p-4">
									{/* Thumbnail */}
									<div className="flex-shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-lg overflow-hidden bg-gradient-to-br from-red-500/20 to-purple-500/20 border border-gray-200/30 dark:border-white/5">
										{imgUrl ? (
											<img
												src={imgUrl}
												alt={event.title}
												className="w-full h-full object-cover"
												onError={(e) => {
													e.currentTarget.style.display = "none";
												}}
											/>
										) : (
											<div className="flex items-center justify-center h-full">
												<CalendarIcon className="w-6 h-6 text-gray-400 dark:text-gray-600" />
											</div>
										)}
									</div>

									{/* Info */}
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 mb-1">
											<h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
												{event.title}
											</h3>
											{getStatusBadge(event.status)}
										</div>
										<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500 dark:text-gray-500">
											<span className="flex items-center gap-1">
												<CalendarIcon className="w-3 h-3" />
												{formatDate(event.startDate)}
											</span>
											{event.location && (
												<span className="flex items-center gap-1">
													<MapPinIcon className="w-3 h-3" />
													<span className="truncate max-w-[120px]">{event.location}</span>
												</span>
											)}
											<span className="flex items-center gap-1">
												<UsersIcon className="w-3 h-3" />
												{event.currentParticipants}/{event.maxParticipants || "∞"}
											</span>
										</div>
									</div>

									{/* Actions */}
									<div className="flex items-center gap-2 flex-shrink-0">
										{canEdit && (
											<Link
												to={`/panitia/events/create/${event.id}`}
												className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100/80 dark:bg-white/[0.06] border border-gray-200/50 dark:border-white/[0.08] text-gray-600 dark:text-gray-400 text-xs font-medium hover:bg-gray-200 dark:hover:bg-white/[0.12] transition-colors"
											>
												<Cog6ToothIcon className="w-3.5 h-3.5" />
												Setting
											</Link>
										)}
										<button
											onClick={() => handleEnterEvent(event)}
											className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors shadow-sm hover:shadow-red-500/20"
										>
											<ArrowRightOnRectangleIcon className="w-3.5 h-3.5" />
											<span className="hidden sm:inline">Kelola</span>
											<LuChevronRight className="w-3 h-3 sm:hidden" />
										</button>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};

export default PanitiaEvents;
