import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import {
	authenticate,
	authorize,
	AuthenticatedRequest,
} from "../middleware/auth";

const router = Router();

// GET /api/admin/stats - Dashboard statistics for SuperAdmin
router.get(
	"/stats",
	authenticate,
	authorize("SUPERADMIN"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			// Run all count queries in parallel
			const [
				totalUsers,
				usersByRole,
				usersByStatus,
				totalEvents,
				eventsByStatus,
				totalRegistrations,
				registrationsByStatus,
				totalCoupons,
				usedCoupons,
				totalAssessmentCategories,
				totalSchoolCategories,
				totalEvaluations,
				totalComments,
				totalLikes,
				recentUsers,
				recentEvents,
				recentRegistrations,
				upcomingEvents,
			] = await Promise.all([
				// Users
				prisma.user.count(),
				prisma.user.groupBy({ by: ["role"], _count: { id: true } }),
				prisma.user.groupBy({ by: ["status"], _count: { id: true } }),

				// Events
				prisma.event.count(),
				prisma.event.groupBy({ by: ["status"], _count: { id: true } }),

				// Registrations
				prisma.eventParticipation.count(),
				prisma.eventParticipation.groupBy({
					by: ["status"],
					_count: { id: true },
				}),

				// Coupons
				prisma.eventCoupon.count(),
				prisma.eventCoupon.count({ where: { isUsed: true } }),

				// Categories
				prisma.assessmentCategory.count(),
				prisma.schoolCategory.count(),

				// Activity
				prisma.evaluation.count(),
				prisma.eventComment.count(),
				prisma.eventLike.count(),

				// Recent users (last 7 days)
				prisma.user.findMany({
					where: {
						createdAt: {
							gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
						},
					},
					select: {
						id: true,
						name: true,
						email: true,
						role: true,
						status: true,
						createdAt: true,
					},
					orderBy: { createdAt: "desc" },
					take: 10,
				}),

				// Recent events
				prisma.event.findMany({
					select: {
						id: true,
						title: true,
						slug: true,
						status: true,
						createdAt: true,
						createdBy: {
							select: { name: true, email: true },
						},
					},
					orderBy: { createdAt: "desc" },
					take: 10,
				}),

				// Recent registrations
				prisma.eventParticipation.findMany({
					select: {
						id: true,
						status: true,
						createdAt: true,
						user: {
							select: { name: true, email: true },
						},
						event: {
							select: { title: true, slug: true },
						},
					},
					orderBy: { createdAt: "desc" },
					take: 10,
				}),

				// Upcoming events
				prisma.event.findMany({
					where: {
						startDate: { gte: new Date() },
						status: { in: ["PUBLISHED", "ONGOING"] },
					},
					select: {
						id: true,
						title: true,
						slug: true,
						startDate: true,
						endDate: true,
						venue: true,
						city: true,
						status: true,
						_count: {
							select: { participations: true },
						},
					},
					orderBy: { startDate: "asc" },
					take: 5,
				}),
			]);

			// Transform groupBy results into objects
			const roleMap: Record<string, number> = {};
			usersByRole.forEach((r) => {
				roleMap[r.role] = r._count.id;
			});

			const statusMap: Record<string, number> = {};
			usersByStatus.forEach((s) => {
				statusMap[s.status] = s._count.id;
			});

			const eventStatusMap: Record<string, number> = {};
			eventsByStatus.forEach((e) => {
				eventStatusMap[e.status] = e._count.id;
			});

			const regStatusMap: Record<string, number> = {};
			registrationsByStatus.forEach((r) => {
				regStatusMap[r.status] = r._count.id;
			});

			res.json({
				users: {
					total: totalUsers,
					byRole: roleMap,
					byStatus: statusMap,
					recent: recentUsers,
				},
				events: {
					total: totalEvents,
					byStatus: eventStatusMap,
					recent: recentEvents,
					upcoming: upcomingEvents,
				},
				registrations: {
					total: totalRegistrations,
					byStatus: regStatusMap,
					recent: recentRegistrations,
				},
				coupons: {
					total: totalCoupons,
					used: usedCoupons,
					available: totalCoupons - usedCoupons,
				},
				categories: {
					assessment: totalAssessmentCategories,
					school: totalSchoolCategories,
				},
				activity: {
					evaluations: totalEvaluations,
					comments: totalComments,
					likes: totalLikes,
				},
			});
		} catch (error) {
			console.error("Admin stats error:", error);
			res.status(500).json({
				error: "Failed to fetch admin statistics",
			});
		}
	}
);

// ============================================================
// GET /api/admin/transactions/live
// Real-time view of in-flight transactions across every paid surface
// (tickets, votes, registrations, event packages, marketplace orders).
// Cached briefly so concurrent admin polls don't hit the DB hard.
// ============================================================

type LiveTxPayload = {
	pending: {
		total: number;
		ticket: number;
		vote: number;
		registration: number;
		event: number;
		order: number;
	};
	lastHour: {
		paid: number;
		pending: number;
		failed: number;
		revenue: number;
	};
	byType: Array<{
		key: string;
		label: string;
		pending: number;
		paid: number;
		failed: number;
		revenue: number;
	}>;
	recent: Array<{
		id: string;
		type: "TICKET" | "VOTE" | "REGISTRATION" | "EVENT_PACKAGE" | "ORDER";
		typeLabel: string;
		buyerName: string;
		buyerEmail: string | null;
		amount: number;
		amountLabel: "DP" | null;
		status: string;
		context: string | null;
		createdAt: string;
		updatedAt: string;
	}>;
	now: number;
};

const TX_CACHE_TTL_MS = 10_000;
const PER_QUERY_TIMEOUT_MS = 4_000;
let liveTxCache: { computedAt: number; payload: LiveTxPayload } | null = null;
// Inflight promise dedupe: if a slow query is already in flight, a second
// admin tab that polls in the same window waits on the SAME promise instead
// of triggering another round of queries.
let liveTxInflight: Promise<LiveTxPayload> | null = null;

const PAID_TICKET_STATUSES = ["PAID", "USED"] as const;
const PAID_ORDER_STATUSES = ["CONFIRMED", "PROCESSING", "SHIPPED", "COMPLETED"] as const;

// Run a Prisma query but fall back to a default if it hangs longer than the
// per-query budget. Prevents one slow table from timing out the whole
// endpoint and keeps the widget responsive even under partial DB stress.
const withTimeout = <T,>(promise: Promise<T>, fallback: T, label: string): Promise<T> => {
	return new Promise<T>((resolve) => {
		const timer = setTimeout(() => {
			console.warn(`[transactions/live] query "${label}" exceeded ${PER_QUERY_TIMEOUT_MS}ms, using fallback`);
			resolve(fallback);
		}, PER_QUERY_TIMEOUT_MS);
		promise
			.then((value) => {
				clearTimeout(timer);
				resolve(value);
			})
			.catch((err) => {
				clearTimeout(timer);
				console.warn(`[transactions/live] query "${label}" failed:`, err?.message || err);
				resolve(fallback);
			});
	});
};

const computeLiveTransactions = async (): Promise<LiveTxPayload> => {
	const now = Date.now();
	const oneHourAgo = new Date(now - 60 * 60 * 1000);

	// Status counts via parallel COUNT(*) queries instead of groupBy.
	// On unindexed tables Prisma's groupBy degenerates to a full table scan +
	// in-memory aggregation; a targeted count with a WHERE clause lets the
	// planner use the smallest data path. Each query has its own timeout so
	// one slow table can't drag the rest down.
	const tickets = await Promise.all([
		withTimeout(prisma.ticketPurchase.count({ where: { status: "PENDING", totalAmount: { gt: 0 }, midtransOrderId: { not: null } } }), 0, "ticket.pending"),
		withTimeout(prisma.ticketPurchase.count({ where: { status: { in: [...PAID_TICKET_STATUSES] }, totalAmount: { gt: 0 }, midtransOrderId: { not: null } } }), 0, "ticket.paid"),
		withTimeout(prisma.ticketPurchase.count({ where: { status: { in: ["CANCELLED", "EXPIRED"] }, totalAmount: { gt: 0 }, midtransOrderId: { not: null } } }), 0, "ticket.failed"),
		withTimeout(
			prisma.ticketPurchase.aggregate({
				_sum: { totalAmount: true },
				where: { status: { in: [...PAID_TICKET_STATUSES] }, totalAmount: { gt: 0 }, midtransOrderId: { not: null }, paidAt: { gte: oneHourAgo } },
			}),
			{ _sum: { totalAmount: 0 } },
			"ticket.revenue"
		),
	]);

	const votes = await Promise.all([
		withTimeout(prisma.votingPurchase.count({ where: { status: "PENDING", totalAmount: { gt: 0 }, midtransOrderId: { not: null } } }), 0, "vote.pending"),
		withTimeout(prisma.votingPurchase.count({ where: { status: "PAID", totalAmount: { gt: 0 }, midtransOrderId: { not: null } } }), 0, "vote.paid"),
		withTimeout(prisma.votingPurchase.count({ where: { status: { in: ["CANCELLED", "EXPIRED"] }, totalAmount: { gt: 0 }, midtransOrderId: { not: null } } }), 0, "vote.failed"),
		withTimeout(
			prisma.votingPurchase.aggregate({
				_sum: { totalAmount: true },
				where: { status: "PAID", totalAmount: { gt: 0 }, midtransOrderId: { not: null }, paidAt: { gte: oneHourAgo } },
			}),
			{ _sum: { totalAmount: 0 } },
			"vote.revenue"
		),
	]);

	const regs = await Promise.all([
		withTimeout(prisma.registrationPayment.count({ where: { status: "PENDING", amount: { gt: 0 }, midtransOrderId: { not: null } } }), 0, "reg.pending"),
		withTimeout(prisma.registrationPayment.count({ where: { status: "PAID", amount: { gt: 0 }, midtransOrderId: { not: null } } }), 0, "reg.paid"),
		withTimeout(prisma.registrationPayment.count({ where: { status: { in: ["CANCELLED", "EXPIRED"] }, amount: { gt: 0 }, midtransOrderId: { not: null } } }), 0, "reg.failed"),
		withTimeout(
			prisma.registrationPayment.aggregate({
				_sum: { amount: true },
				where: { status: "PAID", amount: { gt: 0 }, midtransOrderId: { not: null }, paidAt: { gte: oneHourAgo } },
			}),
			{ _sum: { amount: 0 } },
			"reg.revenue"
		),
	]);

	const events = await Promise.all([
		withTimeout(prisma.eventPayment.count({ where: { status: "PENDING", amount: { gt: 0 }, midtransOrderId: { not: null } } }), 0, "event.pending"),
		withTimeout(prisma.eventPayment.count({ where: { status: "PAID", amount: { gt: 0 }, midtransOrderId: { not: null } } }), 0, "event.paid"),
		withTimeout(prisma.eventPayment.count({ where: { status: { in: ["CANCELLED", "EXPIRED"] }, amount: { gt: 0 }, midtransOrderId: { not: null } } }), 0, "event.failed"),
		withTimeout(
			prisma.eventPayment.aggregate({
				_sum: { amount: true },
				where: { status: "PAID", amount: { gt: 0 }, midtransOrderId: { not: null }, paidAt: { gte: oneHourAgo } },
			}),
			{ _sum: { amount: 0 } },
			"event.revenue"
		),
	]);

	const orders = await Promise.all([
		withTimeout(prisma.order.count({ where: { status: "PENDING", totalAmount: { gt: 0 }, midtransOrderId: { not: null } } }), 0, "order.pending"),
		withTimeout(prisma.order.count({ where: { status: { in: [...PAID_ORDER_STATUSES] }, totalAmount: { gt: 0 }, midtransOrderId: { not: null } } }), 0, "order.paid"),
		withTimeout(prisma.order.count({ where: { status: "CANCELLED", totalAmount: { gt: 0 }, midtransOrderId: { not: null } } }), 0, "order.failed"),
		withTimeout(
			prisma.order.aggregate({
				_sum: { totalAmount: true },
				where: { status: { in: [...PAID_ORDER_STATUSES] }, totalAmount: { gt: 0 }, midtransOrderId: { not: null }, paidAt: { gte: oneHourAgo } },
			}),
			{ _sum: { totalAmount: 0 } },
			"order.revenue"
		),
	]);

	// Recent feed — just take the most recently updated rows per source
	// (no OR clause, no joins). We rely on the natural row ordering instead
	// of a date filter so the query never has to scan + filter.
	const empty: never[] = [];
	const [recentTickets, recentVotes, recentRegs, recentEvents, recentOrders] = await Promise.all([
		withTimeout(
			prisma.ticketPurchase.findMany({
				where: { totalAmount: { gt: 0 }, midtransOrderId: { not: null } },
				orderBy: { updatedAt: "desc" },
				take: 10,
				select: {
					id: true,
					buyerName: true,
					buyerEmail: true,
					totalAmount: true,
					status: true,
					createdAt: true,
					updatedAt: true,
					event: { select: { title: true } },
				},
			}),
			empty,
			"ticket.recent"
		),
		withTimeout(
			prisma.votingPurchase.findMany({
				where: { totalAmount: { gt: 0 }, midtransOrderId: { not: null } },
				orderBy: { updatedAt: "desc" },
				take: 10,
				select: {
					id: true,
					buyerName: true,
					buyerEmail: true,
					totalAmount: true,
					status: true,
					createdAt: true,
					updatedAt: true,
					event: { select: { title: true } },
				},
			}),
			empty,
			"vote.recent"
		),
		withTimeout(
			prisma.registrationPayment.findMany({
				where: { amount: { gt: 0 }, midtransOrderId: { not: null } },
				orderBy: { updatedAt: "desc" },
				take: 6,
				select: {
					id: true,
					amount: true,
					status: true,
					createdAt: true,
					updatedAt: true,
					participation: {
						select: {
							user: { select: { name: true, email: true } },
							event: { select: { title: true } },
						},
					},
				},
			}),
			empty,
			"reg.recent"
		),
		withTimeout(
			prisma.eventPayment.findMany({
				where: {
					OR: [
						{ amount: { gt: 0 }, midtransOrderId: { not: null } },
						{ paymentType: { in: ["DP_REQUEST", "DP_CONFIRMED"] } },
					],
				},
				orderBy: { updatedAt: "desc" },
				take: 6,
				select: {
					id: true,
					amount: true,
					status: true,
					packageTier: true,
					paymentType: true,
					createdAt: true,
					updatedAt: true,
					event: { select: { title: true } },
				},
			}),
			empty,
			"event.recent"
		),
		withTimeout(
			prisma.order.findMany({
				where: { totalAmount: { gt: 0 }, midtransOrderId: { not: null } },
				orderBy: { updatedAt: "desc" },
				take: 6,
				select: {
					id: true,
					totalAmount: true,
					status: true,
					createdAt: true,
					updatedAt: true,
					user: { select: { name: true, email: true } },
				},
			}),
			empty,
			"order.recent"
		),
	]);

	const byType = [
		{
			key: "ticket",
			label: "E-Ticketing",
			pending: tickets[0],
			paid: tickets[1],
			failed: tickets[2],
			revenue: tickets[3]._sum.totalAmount || 0,
		},
		{
			key: "vote",
			label: "E-Voting",
			pending: votes[0],
			paid: votes[1],
			failed: votes[2],
			revenue: votes[3]._sum.totalAmount || 0,
		},
		{
			key: "registration",
			label: "Registrasi Event",
			pending: regs[0],
			paid: regs[1],
			failed: regs[2],
			revenue: regs[3]._sum.amount || 0,
		},
		{
			key: "event",
			label: "Paket Event",
			pending: events[0],
			paid: events[1],
			failed: events[2],
			revenue: events[3]._sum.amount || 0,
		},
		{
			key: "order",
			label: "Marketplace",
			pending: orders[0],
			paid: orders[1],
			failed: orders[2],
			revenue: orders[3]._sum.totalAmount || 0,
		},
	];

	const pendingTotal = byType.reduce((s, t) => s + t.pending, 0);
	const lastHourPaid = byType.reduce((s, t) => s + t.paid, 0);
	const lastHourRevenue = byType.reduce((s, t) => s + t.revenue, 0);
	const lastHourFailed = byType.reduce((s, t) => s + t.failed, 0);

	// Build recent feed — normalize each source into a common row shape
	type RecentRow = LiveTxPayload["recent"][number];
	const recent: RecentRow[] = [];

	for (const tx of recentTickets) {
		recent.push({
			id: tx.id,
			type: "TICKET",
			typeLabel: "Tiket",
			buyerName: tx.buyerName,
			buyerEmail: tx.buyerEmail,
			amount: tx.totalAmount,
			amountLabel: null,
			status: tx.status,
			context: tx.event?.title || null,
			createdAt: tx.createdAt.toISOString(),
			updatedAt: tx.updatedAt.toISOString(),
		});
	}
	for (const tx of recentVotes) {
		recent.push({
			id: tx.id,
			type: "VOTE",
			typeLabel: "Vote",
			buyerName: tx.buyerName,
			buyerEmail: tx.buyerEmail,
			amount: tx.totalAmount,
			amountLabel: null,
			status: tx.status,
			context: tx.event?.title || null,
			createdAt: tx.createdAt.toISOString(),
			updatedAt: tx.updatedAt.toISOString(),
		});
	}
	for (const tx of recentRegs) {
		recent.push({
			id: tx.id,
			type: "REGISTRATION",
			typeLabel: "Registrasi",
			buyerName: tx.participation?.user?.name || "—",
			buyerEmail: tx.participation?.user?.email || null,
			amount: tx.amount,
			amountLabel: null,
			status: tx.status,
			context: tx.participation?.event?.title || null,
			createdAt: tx.createdAt.toISOString(),
			updatedAt: tx.updatedAt.toISOString(),
		});
	}
	for (const tx of recentEvents) {
		recent.push({
			id: tx.id,
			type: "EVENT_PACKAGE",
			typeLabel: "Paket Event",
			buyerName: tx.event?.title || "—",
			buyerEmail: null,
			amount: tx.amount,
			amountLabel:
				tx.paymentType === "DP_REQUEST" || tx.paymentType === "DP_CONFIRMED"
					? "DP"
					: null,
			status: tx.status,
			context: `Paket ${tx.packageTier}`,
			createdAt: tx.createdAt.toISOString(),
			updatedAt: tx.updatedAt.toISOString(),
		});
	}
	for (const tx of recentOrders) {
		recent.push({
			id: tx.id,
			type: "ORDER",
			typeLabel: "Marketplace",
			buyerName: tx.user?.name || "—",
			buyerEmail: tx.user?.email || null,
			amount: tx.totalAmount,
			amountLabel: null,
			status: tx.status,
			context: null,
			createdAt: tx.createdAt.toISOString(),
			updatedAt: tx.updatedAt.toISOString(),
		});
	}

	recent.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
	const recentTrimmed = recent.slice(0, 20);

	return {
		pending: {
			total: pendingTotal,
			ticket: tickets[0],
			vote: votes[0],
			registration: regs[0],
			event: events[0],
			order: orders[0],
		},
		lastHour: {
			paid: lastHourPaid,
			pending: pendingTotal,
			failed: lastHourFailed,
			revenue: lastHourRevenue,
		},
		byType,
		recent: recentTrimmed,
		now,
	};
};

router.get(
	"/transactions/live",
	authenticate,
	authorize("SUPERADMIN"),
	async (_req: AuthenticatedRequest, res: Response) => {
		try {
			const now = Date.now();
			// Fresh cache → return immediately
			if (liveTxCache && now - liveTxCache.computedAt < TX_CACHE_TTL_MS) {
				return res.json(liveTxCache.payload);
			}
			// Already computing → wait on the same promise so concurrent admin
			// polls don't trigger N parallel rounds of DB queries
			if (!liveTxInflight) {
				liveTxInflight = computeLiveTransactions()
					.then((payload) => {
						liveTxCache = { computedAt: Date.now(), payload };
						return payload;
					})
					.catch((err) => {
						console.error("[transactions/live] compute failed:", err);
						// Return the previous cached payload if we have one — better
						// stale data than a broken UI
						if (liveTxCache) return liveTxCache.payload;
						throw err;
					})
					.finally(() => {
						liveTxInflight = null;
					});
			}
			const payload = await liveTxInflight;
			res.json(payload);
		} catch (error) {
			console.error("Error fetching live transactions:", error);
			// Last-resort fallback: never let this endpoint take down the admin page
			res.status(200).json({
				pending: { total: 0, ticket: 0, vote: 0, registration: 0, event: 0, order: 0 },
				lastHour: { paid: 0, pending: 0, failed: 0, revenue: 0 },
				byType: [],
				recent: [],
				now: Date.now(),
				degraded: true,
			});
		}
	}
);

export default router;
