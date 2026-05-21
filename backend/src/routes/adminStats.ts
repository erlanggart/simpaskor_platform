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
		status: string;
		context: string | null;
		createdAt: string;
		updatedAt: string;
	}>;
	now: number;
};

const TX_CACHE_TTL_MS = 5_000;
let liveTxCache: { computedAt: number; payload: LiveTxPayload } | null = null;

const FAILED_STATUSES = new Set(["CANCELLED", "EXPIRED"]);
const PAID_STATUSES = new Set(["PAID", "USED", "CONFIRMED", "PROCESSING", "SHIPPED", "COMPLETED"]);

const computeLiveTransactions = async (): Promise<LiveTxPayload> => {
	const now = Date.now();
	const oneHourAgo = new Date(now - 60 * 60 * 1000);

	const [
		ticketGroups,
		voteGroups,
		regGroups,
		eventGroups,
		orderGroups,
		ticketRevenueAgg,
		voteRevenueAgg,
		regRevenueAgg,
		eventRevenueAgg,
		orderRevenueAgg,
		recentTickets,
		recentVotes,
		recentRegs,
		recentEvents,
		recentOrders,
	] = await Promise.all([
		// Status counts (all-time pending + last-hour activity)
		prisma.ticketPurchase.groupBy({
			by: ["status"],
			_count: { _all: true },
		}),
		prisma.votingPurchase.groupBy({
			by: ["status"],
			_count: { _all: true },
		}),
		prisma.registrationPayment.groupBy({
			by: ["status"],
			_count: { _all: true },
		}),
		prisma.eventPayment.groupBy({
			by: ["status"],
			_count: { _all: true },
		}),
		prisma.order.groupBy({
			by: ["status"],
			_count: { _all: true },
		}),

		// Last-hour PAID revenue per type
		prisma.ticketPurchase.aggregate({
			_sum: { totalAmount: true },
			where: { status: { in: ["PAID", "USED"] }, paidAt: { gte: oneHourAgo } },
		}),
		prisma.votingPurchase.aggregate({
			_sum: { totalAmount: true },
			where: { status: "PAID", paidAt: { gte: oneHourAgo } },
		}),
		prisma.registrationPayment.aggregate({
			_sum: { amount: true },
			where: { status: "PAID", paidAt: { gte: oneHourAgo } },
		}),
		prisma.eventPayment.aggregate({
			_sum: { amount: true },
			where: { status: "PAID", paidAt: { gte: oneHourAgo } },
		}),
		prisma.order.aggregate({
			_sum: { totalAmount: true },
			where: { status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "COMPLETED"] }, paidAt: { gte: oneHourAgo } },
		}),

		// Recent feed — pending OR updated within last hour, ranked by activity
		prisma.ticketPurchase.findMany({
			where: { OR: [{ status: "PENDING" }, { updatedAt: { gte: oneHourAgo } }] },
			orderBy: { updatedAt: "desc" },
			take: 12,
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
		prisma.votingPurchase.findMany({
			where: { OR: [{ status: "PENDING" }, { updatedAt: { gte: oneHourAgo } }] },
			orderBy: { updatedAt: "desc" },
			take: 12,
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
		prisma.registrationPayment.findMany({
			where: { OR: [{ status: "PENDING" }, { updatedAt: { gte: oneHourAgo } }] },
			orderBy: { updatedAt: "desc" },
			take: 8,
			include: {
				participation: { include: { user: { select: { name: true, email: true } }, event: { select: { title: true } } } },
			},
		}),
		prisma.eventPayment.findMany({
			where: { OR: [{ status: "PENDING" }, { updatedAt: { gte: oneHourAgo } }] },
			orderBy: { updatedAt: "desc" },
			take: 6,
			include: { event: { select: { title: true } } },
		}),
		prisma.order.findMany({
			where: { OR: [{ status: "PENDING" }, { updatedAt: { gte: oneHourAgo } }] },
			orderBy: { updatedAt: "desc" },
			take: 8,
			include: { user: { select: { name: true, email: true } } },
		}),
	]);

	const bucketize = (groups: { status: string; _count: { _all: number } }[]) => {
		let pending = 0;
		let paid = 0;
		let failed = 0;
		for (const g of groups) {
			if (g.status === "PENDING") pending += g._count._all;
			else if (FAILED_STATUSES.has(g.status)) failed += g._count._all;
			else if (PAID_STATUSES.has(g.status)) paid += g._count._all;
		}
		return { pending, paid, failed };
	};

	const ticketB = bucketize(ticketGroups);
	const voteB = bucketize(voteGroups);
	const regB = bucketize(regGroups);
	const eventB = bucketize(eventGroups);
	const orderB = bucketize(orderGroups);

	const byType = [
		{
			key: "ticket",
			label: "E-Ticketing",
			pending: ticketB.pending,
			paid: ticketB.paid,
			failed: ticketB.failed,
			revenue: ticketRevenueAgg._sum.totalAmount || 0,
		},
		{
			key: "vote",
			label: "E-Voting",
			pending: voteB.pending,
			paid: voteB.paid,
			failed: voteB.failed,
			revenue: voteRevenueAgg._sum.totalAmount || 0,
		},
		{
			key: "registration",
			label: "Registrasi Event",
			pending: regB.pending,
			paid: regB.paid,
			failed: regB.failed,
			revenue: regRevenueAgg._sum.amount || 0,
		},
		{
			key: "event",
			label: "Paket Event",
			pending: eventB.pending,
			paid: eventB.paid,
			failed: eventB.failed,
			revenue: eventRevenueAgg._sum.amount || 0,
		},
		{
			key: "order",
			label: "Marketplace",
			pending: orderB.pending,
			paid: orderB.paid,
			failed: orderB.failed,
			revenue: orderRevenueAgg._sum.totalAmount || 0,
		},
	];

	const pendingTotal =
		ticketB.pending + voteB.pending + regB.pending + eventB.pending + orderB.pending;

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
			status: tx.status,
			context: null,
			createdAt: tx.createdAt.toISOString(),
			updatedAt: tx.updatedAt.toISOString(),
		});
	}

	// Sort by recency, cap at 20 rows for the UI
	recent.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
	const recentTrimmed = recent.slice(0, 20);

	return {
		pending: {
			total: pendingTotal,
			ticket: ticketB.pending,
			vote: voteB.pending,
			registration: regB.pending,
			event: eventB.pending,
			order: orderB.pending,
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
			if (liveTxCache && now - liveTxCache.computedAt < TX_CACHE_TTL_MS) {
				return res.json(liveTxCache.payload);
			}
			const payload = await computeLiveTransactions();
			liveTxCache = { computedAt: now, payload };
			res.json(payload);
		} catch (error) {
			console.error("Error fetching live transactions:", error);
			res.status(500).json({ error: "Gagal memuat transaksi aktif" });
		}
	}
);

export default router;
