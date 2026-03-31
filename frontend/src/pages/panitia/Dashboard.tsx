import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
	CalendarIcon,
	UsersIcon,
	TicketIcon,
	ChartBarIcon,
	ClockIcon,
	ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";
import { LuChevronRight, LuBookOpen } from "react-icons/lu";
import { api } from "../../utils/api";
import { useAuth } from "../../hooks/useAuth";
import "../../components/landing/LandingPage.css";

interface Event {
	id: string;
	title: string;
	slug: string | null;
	startDate: string;
	endDate: string;
	currentParticipants: number;
	maxParticipants: number | null;
	status: string;
}

interface Coupon {
	id: string;
	isUsed: boolean;
}

const PanitiaDashboard: React.FC = () => {
	const { user } = useAuth();
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
			myEvents.sort((a: Event, b: Event) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
			setEvents(myEvents);
			setCoupons(couponsRes.data || []);
		} catch (error) {
			console.error("Error fetching data:", error);
		} finally {
			setLoading(false);
		}
	};

	const formatDate = (dateString: string) =>
		new Date(dateString).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "short",
			year: "numeric",
		});

	// Stats
	const totalEvents = events.length;
	const activeEvents = events.filter((e) => e.status === "PUBLISHED" || e.status === "ONGOING").length;
	const completedEvents = events.filter((e) => e.status === "COMPLETED").length;
	const totalParticipants = events.reduce((sum, e) => sum + e.currentParticipants, 0);
	const availableCoupons = coupons.filter((c) => !c.isUsed).length;

	// Recent events (last 5)
	const recentEvents = events.slice(0, 5);

	// Status distribution for simple bar chart
	const statusCounts = {
		DRAFT: events.filter((e) => e.status === "DRAFT").length,
		PUBLISHED: events.filter((e) => e.status === "PUBLISHED").length,
		ONGOING: events.filter((e) => e.status === "ONGOING").length,
		COMPLETED: events.filter((e) => e.status === "COMPLETED").length,
		CANCELLED: events.filter((e) => e.status === "CANCELLED").length,
	};
	const maxStatusCount = Math.max(...Object.values(statusCounts), 1);

	const statusColors: Record<string, string> = {
		DRAFT: "bg-gray-400",
		PUBLISHED: "bg-green-500",
		ONGOING: "bg-blue-500",
		COMPLETED: "bg-purple-500",
		CANCELLED: "bg-red-500",
	};

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

			{/* ===== Greeting Hero ===== */}
			<div className="mb-8">
				<div className="relative overflow-hidden rounded-2xl bg-white/40 dark:bg-white/[0.02] backdrop-blur-sm border border-gray-200/50 dark:border-white/[0.06] p-6 md:p-8">
					<div className="relative z-10">
						<p className="text-[10px] md:text-xs tracking-[0.3em] text-gray-400 dark:text-gray-500 font-medium mb-2">
							DASHBOARD PANITIA
						</p>
						<h1 className="text-2xl sm:text-3xl md:text-4xl font-black leading-none mb-2 landing-title-gradient">
							Halo, {user?.name || "Panitia"}
						</h1>
						<p className="text-xs md:text-sm text-gray-500 dark:text-gray-500 font-medium">
							{user?.email}
						</p>
						<div className="flex items-center gap-3 mt-4">
							<div className="w-12 h-[1px] bg-gradient-to-r from-red-500/50 to-transparent" />
							<Link
								to="/panitia/panduan"
								className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-colors text-xs font-bold"
							>
								<LuBookOpen className="w-4 h-4" />
								Panduan Penggunaan
							</Link>
						</div>
					</div>
					<div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-red-500/[0.04] to-transparent pointer-events-none" />
				</div>
			</div>

			{/* ===== Stat Cards ===== */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
				{[
					{ label: "Total Event", value: totalEvents, icon: CalendarIcon, color: "text-blue-500 dark:text-blue-400", bg: "bg-blue-500/10" },
					{ label: "Event Aktif", value: activeEvents, icon: ArrowTrendingUpIcon, color: "text-green-500 dark:text-green-400", bg: "bg-green-500/10" },
					{ label: "Total Peserta", value: totalParticipants, icon: UsersIcon, color: "text-purple-500 dark:text-purple-400", bg: "bg-purple-500/10" },
					{ label: "Kupon Tersedia", value: availableCoupons, icon: TicketIcon, color: "text-orange-500 dark:text-orange-400", bg: "bg-orange-500/10" },
				].map((stat) => {
					const Icon = stat.icon;
					return (
						<div
							key={stat.label}
							className="rounded-xl bg-white/60 dark:bg-white/[0.03] backdrop-blur-sm border border-gray-200/50 dark:border-white/[0.06] p-4 transition-all hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20"
						>
							<div className="flex items-center gap-3">
								<div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center flex-shrink-0`}>
									<Icon className={`w-5 h-5 ${stat.color}`} />
								</div>
								<div>
									<p className="text-xl md:text-2xl font-black text-gray-900 dark:text-white leading-none">
										{stat.value}
									</p>
									<p className="text-[10px] text-gray-500 dark:text-gray-500 font-medium mt-0.5">
										{stat.label}
									</p>
								</div>
							</div>
						</div>
					);
				})}
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
				{/* ===== Status Distribution Chart ===== */}
				<div className="rounded-xl bg-white/60 dark:bg-white/[0.03] backdrop-blur-sm border border-gray-200/50 dark:border-white/[0.06] p-5">
					<div className="flex items-center gap-2 mb-4">
						<ChartBarIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
						<h3 className="text-sm font-bold text-gray-900 dark:text-white">
							Distribusi Status Event
						</h3>
					</div>
					{totalEvents === 0 ? (
						<p className="text-xs text-gray-400 dark:text-gray-600 text-center py-6">
							Belum ada data event
						</p>
					) : (
						<div className="space-y-2.5">
							{Object.entries(statusCounts)
								.filter(([, count]) => count > 0)
								.map(([status, count]) => (
									<div key={status} className="flex items-center gap-3">
										<span className="text-[10px] font-medium text-gray-500 dark:text-gray-500 w-20 text-right">
											{status}
										</span>
										<div className="flex-1 h-5 bg-gray-100/50 dark:bg-white/[0.04] rounded-full overflow-hidden">
											<div
												className={`h-full ${statusColors[status]} rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-2`}
												style={{ width: `${Math.max((count / maxStatusCount) * 100, 10)}%` }}
											>
												<span className="text-[9px] font-bold text-white drop-shadow-sm">
													{count}
												</span>
											</div>
										</div>
									</div>
								))}
						</div>
					)}
				</div>

				{/* ===== Quick Summary ===== */}
				<div className="rounded-xl bg-white/60 dark:bg-white/[0.03] backdrop-blur-sm border border-gray-200/50 dark:border-white/[0.06] p-5">
					<div className="flex items-center gap-2 mb-4">
						<ArrowTrendingUpIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
						<h3 className="text-sm font-bold text-gray-900 dark:text-white">
							Ringkasan
						</h3>
					</div>
					<div className="space-y-3">
						{[
							{ label: "Event Selesai", value: completedEvents, total: totalEvents },
							{ label: "Kupon Terpakai", value: coupons.filter((c) => c.isUsed).length, total: coupons.length },
						].map((item) => (
							<div key={item.label}>
								<div className="flex items-center justify-between mb-1">
									<span className="text-xs text-gray-600 dark:text-gray-400">{item.label}</span>
									<span className="text-xs font-bold text-gray-900 dark:text-white">
										{item.value}/{item.total}
									</span>
								</div>
								<div className="h-1.5 bg-gray-100/50 dark:bg-white/[0.04] rounded-full overflow-hidden">
									<div
										className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-700"
										style={{ width: item.total > 0 ? `${(item.value / item.total) * 100}%` : "0%" }}
									/>
								</div>
							</div>
						))}
					</div>

					{/* Quick Links */}
					<div className="mt-5 pt-4 border-t border-gray-200/30 dark:border-white/[0.04] flex flex-col gap-2">
						<Link
							to="/panitia/events-list"
							className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50/50 dark:bg-white/[0.02] border border-gray-200/30 dark:border-white/[0.04] hover:bg-gray-100/50 dark:hover:bg-white/[0.05] transition-colors text-xs font-medium text-gray-700 dark:text-gray-300"
						>
							<span className="flex items-center gap-2">
								<CalendarIcon className="w-3.5 h-3.5" />
								Lihat Semua Event
							</span>
							<LuChevronRight className="w-3.5 h-3.5 text-gray-400" />
						</Link>
						<Link
							to="/panitia/coupons"
							className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50/50 dark:bg-white/[0.02] border border-gray-200/30 dark:border-white/[0.04] hover:bg-gray-100/50 dark:hover:bg-white/[0.05] transition-colors text-xs font-medium text-gray-700 dark:text-gray-300"
						>
							<span className="flex items-center gap-2">
								<TicketIcon className="w-3.5 h-3.5" />
								Lihat Semua Kupon
							</span>
							<LuChevronRight className="w-3.5 h-3.5 text-gray-400" />
						</Link>
					</div>
				</div>
			</div>

			{/* ===== Recent Activity ===== */}
			<div className="rounded-xl bg-white/60 dark:bg-white/[0.03] backdrop-blur-sm border border-gray-200/50 dark:border-white/[0.06] p-5">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-2">
						<ClockIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
						<h3 className="text-sm font-bold text-gray-900 dark:text-white">
							Event Terbaru
						</h3>
					</div>
					{events.length > 5 && (
						<Link
							to="/panitia/events-list"
							className="text-[11px] font-medium text-red-500 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1 transition-colors"
						>
							Lihat Semua
							<LuChevronRight className="w-3 h-3" />
						</Link>
					)}
				</div>

				{recentEvents.length === 0 ? (
					<div className="text-center py-8">
						<CalendarIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
						<p className="text-xs text-gray-400 dark:text-gray-600">Belum ada event</p>
					</div>
				) : (
					<div className="space-y-1">
						{recentEvents.map((event, idx) => {
							const statusLabel: Record<string, string> = {
								DRAFT: "Draft",
								PUBLISHED: "Published",
								ONGOING: "Berlangsung",
								COMPLETED: "Selesai",
								CANCELLED: "Dibatalkan",
							};
							const statusDot: Record<string, string> = {
								DRAFT: "bg-gray-400",
								PUBLISHED: "bg-green-500",
								ONGOING: "bg-blue-500",
								COMPLETED: "bg-purple-500",
								CANCELLED: "bg-red-500",
							};

							return (
								<div
									key={event.id}
									className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
								>
									{/* Timeline dot */}
									<div className="relative flex flex-col items-center">
										<div className={`w-2 h-2 rounded-full ${statusDot[event.status] || "bg-gray-400"}`} />
										{idx < recentEvents.length - 1 && (
											<div className="w-px h-8 bg-gray-200/50 dark:bg-white/[0.06] absolute top-3" />
										)}
									</div>

									<div className="flex-1 min-w-0">
										<p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
											{event.title}
										</p>
										<div className="flex items-center gap-2 mt-0.5">
											<span className="text-[10px] text-gray-400 dark:text-gray-600">
												{formatDate(event.startDate)}
											</span>
											<span className="text-[10px] text-gray-300 dark:text-gray-700">·</span>
											<span className="text-[10px] text-gray-400 dark:text-gray-600">
												{statusLabel[event.status] || event.status}
											</span>
											<span className="text-[10px] text-gray-300 dark:text-gray-700">·</span>
											<span className="text-[10px] text-gray-400 dark:text-gray-600">
												{event.currentParticipants} peserta
											</span>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
};

export default PanitiaDashboard;
