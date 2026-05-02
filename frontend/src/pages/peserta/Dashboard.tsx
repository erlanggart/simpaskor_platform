import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../utils/api";
import { config } from "../../utils/config";
import { useAuth } from "../../hooks/useAuth";
import { Event, EventRegistration } from "../../types/landing";
import { TicketPurchase } from "../../types/ticket";
import { VotingEvent } from "../../types/voting";
import {
	LuCalendar,
	LuChevronRight,
	LuCircleAlert,
	LuCircleCheck,
	LuClock,
	LuMapPin,
	LuSearch,
	LuTicket,
	LuTrophy,
	LuUser,
	LuVote,
	LuCircleX,
} from "react-icons/lu";

type SearchableEvent = {
	event: Event;
	registration?: EventRegistration;
};

type BadgeMeta = {
	label: string;
	className: string;
	icon: React.ReactNode;
};

const getImageUrl = (url?: string | null): string | null => {
	if (!url) return null;
	if (url.startsWith("http://") || url.startsWith("https://")) return url;
	return `${config.api.backendUrl}${url}`;
};

const formatDate = (dateString?: string | null) => {
	if (!dateString) return "-";
	return new Date(dateString).toLocaleDateString("id-ID", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
};

const formatCurrentTime = (date: Date) => {
	return date.toLocaleTimeString("id-ID", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
};

const formatCurrentDate = (date: Date) => {
	return date.toLocaleDateString("id-ID", {
		weekday: "short",
		day: "numeric",
		month: "short",
		year: "numeric",
	});
};

const formatCurrency = (amount?: number | null) => {
	if (!amount) return "Gratis";
	return new Intl.NumberFormat("id-ID", {
		style: "currency",
		currency: "IDR",
		minimumFractionDigits: 0,
	}).format(amount);
};

const getEventPath = (event: Pick<Event, "id" | "slug">) =>
	`/events/${event.slug || event.id}`;

const getAssessmentPath = (
	registration: EventRegistration,
	groupId?: string
) => {
	const event = registration.event;
	if (!event) return "/peserta/assessment-history";

	const eventKey = event.slug || event.id;
	return `/peserta/assessment-history/${eventKey}${groupId ? `/${groupId}` : ""}`;
};

const getEventLocation = (
	event?: Pick<Event, "venue" | "city" | "location"> | null
) => event?.venue || event?.city || event?.location || "Lokasi belum tersedia";

const isActiveRegistration = (status?: string) =>
	status !== "CANCELLED" && status !== "REJECTED";

const isAssessmentRegistration = (status?: string) =>
	status === "CONFIRMED" || status === "ATTENDED";

const getActiveRegistrationGroups = (registration: EventRegistration) =>
	(registration.groups || []).filter((group) => group.status === "ACTIVE");

const shouldAnimateTeamName = (teamName: string) => teamName.length > 18;

const getStartOfDay = (date: Date) => {
	const result = new Date(date);
	result.setHours(0, 0, 0, 0);
	return result.getTime();
};

const getDateTime = (dateString?: string | null) => {
	if (!dateString) return null;
	const time = new Date(dateString).getTime();
	return Number.isNaN(time) ? null : time;
};

const getSortableDateTime = (dateString?: string | null) =>
	getDateTime(dateString) ?? 0;

const compareByClosestEventStart = (
	a: EventRegistration,
	b: EventRegistration,
	now: Date
) => {
	const today = getStartOfDay(now);
	const aStartTime = getDateTime(a.event?.startDate);
	const bStartTime = getDateTime(b.event?.startDate);

	if (aStartTime === null && bStartTime === null) {
		return getSortableDateTime(b.createdAt) - getSortableDateTime(a.createdAt);
	}
	if (aStartTime === null) return 1;
	if (bStartTime === null) return -1;

	const aDiff = getStartOfDay(new Date(aStartTime)) - today;
	const bDiff = getStartOfDay(new Date(bStartTime)) - today;
	const distanceDiff = Math.abs(aDiff) - Math.abs(bDiff);
	if (distanceDiff !== 0) return distanceDiff;

	const aIsUpcoming = aDiff >= 0;
	const bIsUpcoming = bDiff >= 0;
	if (aIsUpcoming !== bIsUpcoming) return aIsUpcoming ? -1 : 1;

	return bStartTime - aStartTime;
};

const getRegistrationStatusMeta = (status?: string): BadgeMeta => {
	switch (status) {
		case "PENDING_PAYMENT":
			return {
				label: "Menunggu Pembayaran",
				className:
					"bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/20",
				icon: <LuClock className="h-3.5 w-3.5" />,
			};
		case "REGISTERED":
		case "PENDING":
			return {
				label: "Menunggu Persetujuan",
				className:
					"bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
				icon: <LuClock className="h-3.5 w-3.5" />,
			};
		case "CONFIRMED":
		case "APPROVED":
			return {
				label: "Terdaftar",
				className:
					"bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
				icon: <LuCircleCheck className="h-3.5 w-3.5" />,
			};
		case "CANCELLED":
			return {
				label: "Dibatalkan",
				className:
					"bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20",
				icon: <LuCircleX className="h-3.5 w-3.5" />,
			};
		case "REJECTED":
			return {
				label: "Ditolak",
				className:
					"bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20",
				icon: <LuCircleX className="h-3.5 w-3.5" />,
			};
		default:
			return {
				label: "Terdaftar",
				className:
					"bg-gray-50 text-gray-700 border-gray-200 dark:bg-white/[0.04] dark:text-gray-300 dark:border-white/10",
				icon: <LuCircleCheck className="h-3.5 w-3.5" />,
			};
	}
};

const getTicketStatusMeta = (status: TicketPurchase["status"]): BadgeMeta => {
	switch (status) {
		case "PAID":
			return {
				label: "Dibayar",
				className:
					"bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
				icon: <LuCircleCheck className="h-3.5 w-3.5" />,
			};
		case "USED":
			return {
				label: "Sudah Dipakai",
				className:
					"bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20",
				icon: <LuTicket className="h-3.5 w-3.5" />,
			};
		case "PENDING":
			return {
				label: "Menunggu Pembayaran",
				className:
					"bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
				icon: <LuClock className="h-3.5 w-3.5" />,
			};
		case "CANCELLED":
			return {
				label: "Dibatalkan",
				className:
					"bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20",
				icon: <LuCircleX className="h-3.5 w-3.5" />,
			};
		case "EXPIRED":
			return {
				label: "Kedaluwarsa",
				className:
					"bg-gray-50 text-gray-700 border-gray-200 dark:bg-white/[0.04] dark:text-gray-300 dark:border-white/10",
				icon: <LuClock className="h-3.5 w-3.5" />,
			};
		default:
			return {
				label: status,
				className:
					"bg-gray-50 text-gray-700 border-gray-200 dark:bg-white/[0.04] dark:text-gray-300 dark:border-white/10",
				icon: <LuTicket className="h-3.5 w-3.5" />,
			};
	}
};

const getVotingStatusMeta = (event: VotingEvent): BadgeMeta => {
	const now = new Date();
	const startDate = event.votingConfig?.startDate
		? new Date(event.votingConfig.startDate)
		: null;
	const endDate = event.votingConfig?.endDate
		? new Date(event.votingConfig.endDate)
		: null;

	if (startDate && startDate > now) {
		return {
			label: "Akan Dibuka",
			className:
				"bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
			icon: <LuClock className="h-3.5 w-3.5" />,
		};
	}

	if (endDate && endDate < now) {
		return {
			label: "Ditutup",
			className:
				"bg-gray-50 text-gray-700 border-gray-200 dark:bg-white/[0.04] dark:text-gray-300 dark:border-white/10",
			icon: <LuCircleX className="h-3.5 w-3.5" />,
		};
	}

	return {
		label: "Voting Dibuka",
		className:
			"bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
		icon: <LuVote className="h-3.5 w-3.5" />,
	};
};

const StatusBadge: React.FC<{ meta: BadgeMeta }> = ({ meta }) => (
	<span
		className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold ${meta.className}`}
	>
		{meta.icon}
		{meta.label}
	</span>
);

const EventThumb: React.FC<{
	src?: string | null;
	alt: string;
	className?: string;
}> = ({ src, alt, className = "h-14 w-14" }) => {
	const imageUrl = getImageUrl(src);

	return (
		<div
			className={`${className} flex flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-300`}
		>
			{imageUrl ? (
				<img src={imageUrl} alt={alt} className="h-full w-full object-cover" />
			) : (
				<LuCalendar className="h-5 w-5" />
			)}
		</div>
	);
};

const EmptyState: React.FC<{
	icon: React.ReactNode;
	title: string;
	action?: React.ReactNode;
}> = ({ icon, title, action }) => (
	<div className="rounded-lg border border-dashed border-gray-200 bg-white/50 px-4 py-6 text-center dark:border-white/10 dark:bg-white/[0.02]">
		<div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-400 dark:bg-white/[0.05]">
			{icon}
		</div>
		<p className="text-sm font-medium text-gray-600 dark:text-gray-300">
			{title}
		</p>
		{action && <div className="mt-4">{action}</div>}
	</div>
);

const PesertaDashboard: React.FC = () => {
	const { user } = useAuth();
	const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
	const [events, setEvents] = useState<Event[]>([]);
	const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
	const [tickets, setTickets] = useState<TicketPurchase[]>([]);
	const [votingEvents, setVotingEvents] = useState<VotingEvent[]>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [currentTime, setCurrentTime] = useState(new Date());
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchDashboardData();
	}, []);

	useEffect(() => {
		const timer = window.setInterval(() => {
			setCurrentTime(new Date());
		}, 30000);

		return () => window.clearInterval(timer);
	}, []);

	const fetchDashboardData = async () => {
		try {
			setLoading(true);
			const [
				registrationsRes,
				eventsRes,
				featuredRes,
				ticketsRes,
				votingRes,
			] = await Promise.all([
				api.get("/registrations/my"),
				api.get("/events?limit=100"),
				api.get("/events/featured?limit=8"),
				api.get("/tickets/my"),
				api.get("/voting/events", { params: { limit: 50 } }),
			]);

			setRegistrations(registrationsRes.data || []);
			setEvents(eventsRes.data?.data || eventsRes.data || []);
			setFeaturedEvents(featuredRes.data || []);
			setTickets(ticketsRes.data || []);
			setVotingEvents(votingRes.data?.data || votingRes.data || []);
		} catch (error) {
			console.error("Error fetching peserta dashboard data:", error);
		} finally {
			setLoading(false);
		}
	};

	const registrationByEventId = useMemo(() => {
		return new Map(
			registrations.map((registration) => [registration.eventId, registration])
		);
	}, [registrations]);

	const searchableEvents = useMemo(() => {
		const eventMap = new Map<string, SearchableEvent>();

		events.forEach((event) => {
			eventMap.set(event.id, {
				event,
				registration: registrationByEventId.get(event.id),
			});
		});

		registrations.forEach((registration) => {
			if (registration.event) {
				eventMap.set(registration.event.id, {
					event: registration.event,
					registration,
				});
			}
		});

		return Array.from(eventMap.values());
	}, [events, registrationByEventId, registrations]);

	const searchResults = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) return [];

		return searchableEvents
			.filter(({ event }) => {
				const haystack = [
					event.title,
					event.category,
					event.level,
					event.location,
					event.city,
					event.province,
					event.organizer,
				]
					.filter(Boolean)
					.join(" ")
					.toLowerCase();

				return haystack.includes(query);
			})
			.sort((a, b) => {
				const aRegistered = a.registration && isActiveRegistration(a.registration.status);
				const bRegistered = b.registration && isActiveRegistration(b.registration.status);
				if (aRegistered !== bRegistered) return aRegistered ? -1 : 1;
				return (
					new Date(a.event.startDate).getTime() -
					new Date(b.event.startDate).getTime()
				);
			})
			.slice(0, 6);
	}, [searchQuery, searchableEvents]);

	const latestRegistrations = useMemo(
		() => registrations.slice(0, 7),
		[registrations]
	);

	const assessmentRegistrations = useMemo(
		() =>
			registrations
				.filter(
					(registration) =>
						registration.event &&
						isAssessmentRegistration(registration.status) &&
						getActiveRegistrationGroups(registration).length > 0
				)
				.sort((a, b) => compareByClosestEventStart(a, b, currentTime)),
		[currentTime, registrations]
	);

	const latestTickets = useMemo(() => tickets.slice(0, 7), [tickets]);

	const participantVotingEvents = useMemo(() => {
		const activeEventIds = new Set(
			registrations
				.filter((registration) => isActiveRegistration(registration.status))
				.map((registration) => registration.eventId)
		);
		const now = new Date();

		return votingEvents
			.filter((event) => {
				const endDate = event.votingConfig?.endDate
					? new Date(event.votingConfig.endDate)
					: null;

				return (
					activeEventIds.has(event.id) &&
					event.votingConfig?.enabled &&
					(!endDate || endDate >= now)
				);
			})
			.slice(0, 3);
	}, [registrations, votingEvents]);

	const avatarUrl = getImageUrl(user?.profile?.avatar);
	const displayName = user?.name || "Peserta";

	if (loading) {
		return (
			<div className="flex min-h-[60vh] items-center justify-center">
				<div className="h-10 w-10 animate-spin rounded-full border-2 border-red-200 border-t-red-600" />
			</div>
		);
	}

	return (
		<div className="min-h-screen ">
			<div className=" px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
				<header className="mb-5 flex items-center justify-between gap-4">
					<div className="flex min-w-0 items-center gap-3">
						<div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300">
							{avatarUrl ? (
								<img
									src={avatarUrl}
									alt={displayName}
									className="h-full w-full object-cover"
								/>
							) : (
								<LuUser className="h-6 w-6" />
							)}
						</div>
						<div className="min-w-0">
							<p className="text-sm text-gray-500 dark:text-gray-400">
								Selamat datang
							</p>
							<h1 className="truncate text-xl font-bold text-gray-950 dark:text-white sm:text-2xl">
								{displayName}
							</h1>
						</div>
					</div>
					<div className="flex-shrink-0 text-right">
						<p className="text-lg font-bold leading-none text-gray-950 dark:text-white">
							{formatCurrentTime(currentTime)}
						</p>
						<p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
							{formatCurrentDate(currentTime)}
						</p>
					</div>
				</header>

				<section className="mb-7">
					<div className="relative">
						<LuSearch className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
						<input
							type="search"
							value={searchQuery}
							onChange={(event) => setSearchQuery(event.target.value)}
							placeholder="Cari event"
							className="h-12 w-full rounded-lg border border-gray-200 bg-white pl-11 pr-4 text-sm font-medium text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-gray-500"
						/>
					</div>

					{searchQuery.trim() && (
						<div className="mt-3 space-y-2">
							{searchResults.length > 0 ? (
								searchResults.map(({ event, registration }) => {
									const isRegistered =
										registration && isActiveRegistration(registration.status);

									return (
										<Link
											key={event.id}
											to={getEventPath(event)}
											className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 transition hover:border-red-200 hover:bg-red-50/40 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-red-500/30 dark:hover:bg-red-500/10"
										>
											<EventThumb
												src={event.thumbnail}
												alt={event.title}
												className="h-12 w-12"
											/>
											<div className="min-w-0 flex-1">
												<p className="truncate text-sm font-semibold text-gray-950 dark:text-white">
													{event.title}
												</p>
												<p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
													{getEventLocation(event)}
												</p>
											</div>
											<span
												className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${
													isRegistered
														? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
														: "border-gray-200 bg-gray-50 text-gray-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-300"
												}`}
											>
												{isRegistered ? "Terdaftar" : "Belum Terdaftar"}
											</span>
										</Link>
									);
								})
							) : (
								<EmptyState
									icon={<LuSearch className="h-5 w-5" />}
									title="Event tidak ditemukan"
								/>
							)}
						</div>
					)}

					<div className="mt-5 flex items-center justify-between gap-3">
						<div>
							<h2 className="text-base font-bold text-gray-950 dark:text-white">
								Event yang Diikuti
							</h2>
							<p className="text-xs text-gray-500 dark:text-gray-400">
								Pilih tim untuk melihat detail penilaian
							</p>
						</div>
						<Link
							to="/peserta/assessment-history"
							className="inline-flex flex-shrink-0 items-center gap-1 text-sm font-semibold text-red-600 hover:text-red-700 dark:text-red-400"
						>
							Riwayat
							<LuChevronRight className="h-4 w-4" />
						</Link>
					</div>

					{assessmentRegistrations.length > 0 ? (
						<div className="-mx-4 mt-3 overflow-x-auto px-4 pb-2">
							<div className="flex items-stretch gap-3">
								{assessmentRegistrations.map((registration) => {
									const event = registration.event!;
									const activeGroups = getActiveRegistrationGroups(registration);
									const posterUrl = getImageUrl(event.thumbnail);

									return (
										<article
											key={registration.id}
											className="w-60 flex-none overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]"
										>
											<div className="relative aspect-[16/9] bg-red-50 dark:bg-red-500/10">
												{posterUrl ? (
													<img
														src={posterUrl}
														alt={event.title}
														className="h-full w-full object-cover"
													/>
												) : (
													<div className="flex h-full items-center justify-center text-red-500 dark:text-red-300">
														<LuTrophy className="h-10 w-10" />
													</div>
												)}
												<div className="absolute left-3 top-3">
													<StatusBadge
														meta={getRegistrationStatusMeta(registration.status)}
													/>
												</div>
											</div>

											<div className="p-4">
												<h3 className="line-clamp-2 min-h-[3rem] text-base font-bold text-gray-950 dark:text-white">
													{event.title}
												</h3>

												<div className="mt-3 space-y-2 text-xs text-gray-500 dark:text-gray-400">
													<div className="flex min-w-0 items-center gap-1.5">
														<LuCalendar className="h-3.5 w-3.5 flex-shrink-0" />
														<span className="truncate">
															{formatDate(event.startDate)}
															{event.endDate
																? ` - ${formatDate(event.endDate)}`
																: ""}
														</span>
													</div>
													<div className="flex min-w-0 items-center gap-1.5">
														<LuMapPin className="h-3.5 w-3.5 flex-shrink-0" />
														<span className="truncate">{getEventLocation(event)}</span>
													</div>
												</div>

												<div className="mt-4 border-t border-gray-100 pt-3 dark:border-white/10">
													<p className="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
														Pilih Tim
													</p>
													<div className="space-y-2">
														{activeGroups.map((group) => {
															const teamName = group.groupName || "Tim Peserta";
															const animateName = shouldAnimateTeamName(teamName);

															return (
																<Link
																	key={group.id}
																	to={getAssessmentPath(registration, group.id)}
																	className="group flex min-h-[4.25rem] items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50/80 px-3 py-3 text-left transition hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-100 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 dark:border-red-500/20 dark:bg-red-500/10 dark:hover:border-red-400/40 dark:hover:bg-red-500/20"
																>
																	<div className="flex min-w-0 items-center gap-3">
																		<div className="min-w-0">
																			{animateName ? (
																				<div className="team-name-marquee overflow-hidden whitespace-nowrap text-sm font-bold text-gray-950 dark:text-white">
																					<span className="team-name-marquee-track inline-flex min-w-max gap-6">
																						<span>{teamName}</span>
																						<span aria-hidden="true">{teamName}</span>
																					</span>
																				</div>
																			) : (
																				<p className="whitespace-nowrap text-sm font-bold text-gray-950 dark:text-white">
																					{teamName}
																				</p>
																			)}
																			<p className="mt-0.5 truncate text-xs font-medium text-red-700 dark:text-red-300">
																				Lihat detail penilaian
																				{group.schoolCategory?.name
																					? ` - ${group.schoolCategory.name}`
																					: ""}
																			</p>
																		</div>
																	</div>
																	<LuChevronRight className="h-5 w-5 flex-shrink-0 text-red-500 transition group-hover:translate-x-0.5 dark:text-red-300" />
																</Link>
															);
														})}
													</div>
												</div>
											</div>
										</article>
									);
								})}
							</div>
						</div>
					) : (
						<div className="mt-3">
							<EmptyState
								icon={<LuTrophy className="h-5 w-5" />}
								title="Belum ada event terkonfirmasi untuk dilihat nilainya"
							/>
						</div>
					)}

					<div className="mt-5 flex items-center justify-between gap-3">
						<div>
							<h2 className="text-base font-bold text-gray-950 dark:text-white">
								Event Unggulan Simpaskor
							</h2>
							<p className="text-xs text-gray-500 dark:text-gray-400">
								Rekomendasi event pilihan
							</p>
						</div>
						<Link
							to="/peserta/events"
							className="inline-flex flex-shrink-0 items-center gap-1 text-sm font-semibold text-red-600 hover:text-red-700 dark:text-red-400"
						>
							Event
							<LuChevronRight className="h-4 w-4" />
						</Link>
					</div>

					{featuredEvents.length > 0 ? (
						<div className="-mx-4 mt-3 overflow-x-auto px-4 pb-2">
							<div className="flex gap-3">
								{featuredEvents.map((event) => (
									<Link
										key={event.id}
										to={getEventPath(event)}
										className="w-60 flex-none overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:border-red-200 hover:shadow-md dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-red-500/30"
									>
										<div className="relative aspect-[2/3] bg-red-50 dark:bg-red-500/10">
											{event.thumbnail ? (
												<img
													src={getImageUrl(event.thumbnail) || ""}
													alt={event.title}
													className="h-full w-full object-cover"
												/>
											) : (
												<div className="flex h-full items-center justify-center text-red-500 dark:text-red-300">
													<LuTrophy className="h-8 w-8" />
												</div>
											)}
											<span className="absolute left-2 top-2 rounded-lg bg-amber-500 px-2 py-1 text-[11px] font-bold text-white">
												Unggulan
											</span>
										</div>
										<div className="p-3">
											<h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-bold text-gray-950 dark:text-white">
												{event.title}
											</h3>
											<div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
												<LuCalendar className="h-3.5 w-3.5 flex-shrink-0" />
												<span>{formatDate(event.startDate)}</span>
											</div>
											<div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
												<LuMapPin className="h-3.5 w-3.5 flex-shrink-0" />
												<span className="truncate">{getEventLocation(event)}</span>
											</div>
										</div>
									</Link>
								))}
							</div>
						</div>
					) : (
						<EmptyState
							icon={<LuTrophy className="h-5 w-5" />}
							title="Belum ada event unggulan"
						/>
					)}
				</section>

				{user && (user.status === "PENDING" || !user.emailVerified) && (
					<div className="mb-7 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
						<div className="flex items-start gap-3">
							<LuCircleAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-300" />
							<div>
								<h2 className="text-sm font-bold text-amber-800 dark:text-amber-200">
									Akun Belum Diverifikasi
								</h2>
								<p className="mt-1 text-sm text-amber-700 dark:text-amber-200/80">
									Hubungi admin atau panitia event untuk verifikasi akun Anda.
								</p>
							</div>
						</div>
					</div>
				)}

				<section className="mb-7">
					<div className="mb-3 flex items-center justify-between gap-3">
						<div>
							<h2 className="text-base font-bold text-gray-950 dark:text-white">
								Pendaftaran Terbaru
							</h2>
							<p className="text-xs text-gray-500 dark:text-gray-400">
								Pendaftaran event terbaru yang Anda ikuti
							</p>
						</div>
						<Link
							to="/peserta/registrations"
							className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
						>
							Lihat Lainnya
							<LuChevronRight className="h-4 w-4" />
						</Link>
					</div>

					{latestRegistrations.length > 0 ? (
						<div className="space-y-3">
							{latestRegistrations.map((registration) => (
								<Link
									key={registration.id}
									to="/peserta/registrations"
									className="flex gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition hover:border-red-200 hover:bg-red-50/30 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-red-500/30 dark:hover:bg-red-500/10"
								>
									<EventThumb
										src={registration.event?.thumbnail}
										alt={registration.event?.title || "Event"}
										className="h-16 w-16"
									/>
									<div className="min-w-0 flex-1">
										<div className="flex min-w-0 items-start justify-between gap-2">
											<div className="min-w-0">
												<h3 className="line-clamp-2 text-sm font-bold text-gray-950 dark:text-white">
													{registration.event?.title || "Event"}
												</h3>
												<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
													{formatDate(registration.event?.startDate)}
												</p>
											</div>
											<LuChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
										</div>
										<div className="mt-3">
											<StatusBadge
												meta={getRegistrationStatusMeta(registration.status)}
											/>
										</div>
									</div>
								</Link>
							))}
						</div>
					) : (
						<EmptyState
							icon={<LuCalendar className="h-5 w-5" />}
							title="Belum ada pendaftaran"
							action={
								<Link
									to="/peserta/events"
									className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
								>
									Cari Event
								</Link>
							}
						/>
					)}
				</section>

				<section className="mb-7">
					<div className="mb-3 flex items-center justify-between gap-3">
						<div>
							<h2 className="text-base font-bold text-gray-950 dark:text-white">
								Pembelian Ticket
							</h2>
							<p className="text-xs text-gray-500 dark:text-gray-400">
								Ticket event yang baru saja Anda beli
							</p>
						</div>
						<Link
							to="/e-ticketing"
							className="inline-flex flex-shrink-0 items-center gap-1 text-sm font-semibold text-red-600 hover:text-red-700 dark:text-red-400"
						>
							Ticket
							<LuChevronRight className="h-4 w-4" />
						</Link>
					</div>

					{latestTickets.length > 0 ? (
						<div className="space-y-3">
							{latestTickets.map((ticket) => (
								<Link
									key={ticket.id}
									to="/e-ticketing"
									className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition hover:border-red-200 hover:bg-red-50/30 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-red-500/30 dark:hover:bg-red-500/10"
								>
									<div className="flex gap-3">
										<EventThumb
											src={ticket.event?.thumbnail}
											alt={ticket.event?.title || "Ticket"}
											className="h-16 w-16"
										/>
										<div className="min-w-0 flex-1">
											<div className="flex min-w-0 items-start justify-between gap-2">
												<div className="min-w-0">
													<h3 className="line-clamp-2 text-sm font-bold text-gray-950 dark:text-white">
														{ticket.event?.title || "Event Ticket"}
													</h3>
													<p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
														{ticket.quantity} tiket · {formatCurrency(ticket.totalAmount)}
													</p>
												</div>
												<LuChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
											</div>
											<div className="mt-3 flex flex-wrap items-center gap-2">
												<StatusBadge meta={getTicketStatusMeta(ticket.status)} />
												<span className="rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600 dark:bg-white/[0.06] dark:text-gray-300">
													{ticket.ticketCode}
												</span>
											</div>
										</div>
									</div>
								</Link>
							))}
						</div>
					) : (
						<EmptyState
							icon={<LuTicket className="h-5 w-5" />}
							title="Belum ada pembelian ticket"
							action={
								<Link
									to="/e-ticketing"
									className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
								>
									Cari Ticket
								</Link>
							}
						/>
					)}
				</section>

				{participantVotingEvents.length > 0 && (
					<section className="mb-7">
						<div className="mb-3 flex items-center justify-between gap-3">
							<div>
								<h2 className="text-base font-bold text-gray-950 dark:text-white">
									E-Voting Event Anda
								</h2>
								<p className="text-xs text-gray-500 dark:text-gray-400">
									Event yang sedang membuka voting
								</p>
							</div>
							<Link
								to="/e-voting"
								className="inline-flex flex-shrink-0 items-center gap-1 text-sm font-semibold text-red-600 hover:text-red-700 dark:text-red-400"
							>
								Voting
								<LuChevronRight className="h-4 w-4" />
							</Link>
						</div>

						<div className="space-y-3">
							{participantVotingEvents.map((event) => {
								const categoryCount =
									event.votingConfig?.categories?.length || 0;

								return (
									<Link
										key={event.id}
										to="/e-voting"
										className="flex gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition hover:border-red-200 hover:bg-red-50/30 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-red-500/30 dark:hover:bg-red-500/10"
									>
										<EventThumb
											src={event.thumbnail}
											alt={event.title}
											className="h-16 w-16"
										/>
										<div className="min-w-0 flex-1">
											<div className="flex min-w-0 items-start justify-between gap-2">
												<div className="min-w-0">
													<h3 className="line-clamp-2 text-sm font-bold text-gray-950 dark:text-white">
														{event.title}
													</h3>
													<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
														{categoryCount} kategori voting
													</p>
												</div>
												<LuChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
											</div>
											<div className="mt-3 flex flex-wrap items-center gap-2">
												<StatusBadge meta={getVotingStatusMeta(event)} />
												<span className="rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600 dark:bg-white/[0.06] dark:text-gray-300">
													{event.votingConfig?.isPaid
														? `${formatCurrency(
																event.votingConfig.pricePerVote
														  )}/vote`
														: "Gratis"}
												</span>
											</div>
										</div>
									</Link>
								);
							})}
						</div>
					</section>
				)}
			</div>
		</div>
	);
};

export default PesertaDashboard;
