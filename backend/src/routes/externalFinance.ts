import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { reconcileAdminFeeLedger } from "../lib/adminFeeLedger";
import { getEventRevenueLedgerSummary, reconcileEventRevenueLedger } from "../lib/revenueLedger";

const router = Router();

const EXTERNAL_FINANCE_API_KEY = process.env.EXTERNAL_FINANCE_API_KEY?.trim() || "";

const getExternalApiKey = (req: Request): string => {
	const apiKeyHeader = req.headers["x-api-key"];
	if (typeof apiKeyHeader === "string") return apiKeyHeader.trim();

	const authHeader = req.headers.authorization;
	if (authHeader?.startsWith("Bearer ")) {
		return authHeader.substring(7).trim();
	}

	return "";
};

const secureEquals = (value: string, expected: string): boolean => {
	if (!value || !expected) return false;

	const valueBuffer = Buffer.from(value);
	const expectedBuffer = Buffer.from(expected);

	if (valueBuffer.length !== expectedBuffer.length) return false;
	return crypto.timingSafeEqual(valueBuffer, expectedBuffer);
};

const requireExternalFinanceApiKey = (req: Request, res: Response, next: NextFunction): Response | void => {
	if (!EXTERNAL_FINANCE_API_KEY) {
		return res.status(503).json({
			error: "Service unavailable",
			message: "External finance API belum dikonfigurasi",
		});
	}

	if (!secureEquals(getExternalApiKey(req), EXTERNAL_FINANCE_API_KEY)) {
		return res.status(401).json({
			error: "Access denied",
			message: "API key tidak valid",
		});
	}

	next();
};

const parseDateQuery = (value: unknown, fieldName: string): Date | null => {
	if (!value) return null;
	if (typeof value !== "string") {
		throw new Error(`${fieldName} harus berupa tanggal ISO`);
	}

	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		throw new Error(`${fieldName} harus berupa tanggal yang valid`);
	}

	return parsed;
};

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const toNumber = (value: unknown) => (value === null || value === undefined ? 0 : Number(value) || 0);

async function reconcileExternalRevenueShareEvents(eventId: string) {
	const events = await prisma.event.findMany({
		where: eventId
			? { id: eventId }
			: {
					OR: [
						{ transactions: { some: { sourceType: { in: ["TICKET", "VOTING"] } } } },
						{
							ticketPurchases: {
								some: { status: { in: ["PAID", "USED"] }, totalAmount: { gt: 0 } },
							},
						},
						{
							votingPurchases: {
								some: { status: "PAID", totalAmount: { gt: 0 } },
							},
						},
					],
			  },
		select: {
			id: true,
			title: true,
			slug: true,
			packageTier: true,
			platformSharePercent: true,
			startDate: true,
		},
		orderBy: { startDate: "desc" },
	});

	await Promise.all(events.map((event) => prisma.$transaction((tx) => reconcileEventRevenueLedger(tx, event.id))));

	return events;
}

type AdminFeeLedgerRow = {
	source: string;
	sourceId: string | null;
	eventId: string | null;
	eventTitle: string | null;
	eventSlug: string | null;
	midtransOrderId: string;
	baseAmount: number;
	adminFee: number;
	quantity: number | null;
	voteCount: number | null;
	status: string;
	paymentType: string | null;
	paidAt: Date;
};

type RevenueShareRow = {
	id: string;
	transactionId: string;
	eventId: string;
	eventTitle: string | null;
	eventSlug: string | null;
	packageTier: string | null;
	sourceType: "TICKET" | "VOTING";
	sourceCode: string | null;
	grossAmount: number;
	platformAmount: number;
	panitiaAmount: number;
	platformSharePercent: number;
	panitiaSharePercent: number;
	withdrawnPanitiaAmount: number;
	status: string;
	paidAt: Date;
};

type PackagePaymentRow = {
	id: string;
	eventId: string;
	eventTitle: string | null;
	eventSlug: string | null;
	userId: string;
	packageTier: string;
	tier: string;
	amount: number;
	status: string;
	paymentType: string | null;
	midtransOrderId: string | null;
	paidAt: Date;
	description: string;
};

type ExternalRevenueShareDetailRow = {
	id: string;
	transactionId: string;
	eventId: string;
	eventTitle: string | null;
	eventSlug: string | null;
	sourceType: "TICKET" | "VOTING";
	sourceCode: string | null;
	grossAmount: number;
	platformAmount: number;
	panitiaAmount: number;
	withdrawnPanitiaAmount: number;
	activePanitiaAmount: number;
	status: string;
	paidAt: Date;
};

// =============================================================================
// GET /api/external/admin-fees
// Lifetime admin fee revenue (Simpaskor's per-transaction service fee).
// Reconciles the ledger on every read so totals stay authoritative even when
// older PAID rows were never recorded at payment time.
// =============================================================================
router.get("/admin-fees", requireExternalFinanceApiKey, async (req: Request, res: Response) => {
	try {
		const from = parseDateQuery(req.query.from, "from");
		const to = parseDateQuery(req.query.to, "to");
		const eventId = typeof req.query.eventId === "string" ? req.query.eventId.trim() : "";
		const includeDetails = req.query.includeDetails === "true";

		await reconcileAdminFeeLedger();

		const ledgerWhere = Prisma.sql`
			"status" = 'PAID'
			${eventId ? Prisma.sql`AND "event_id" = ${eventId}` : Prisma.empty}
			${from ? Prisma.sql`AND "paid_at" >= ${from}` : Prisma.empty}
			${to ? Prisma.sql`AND "paid_at" <= ${to}` : Prisma.empty}
		`;

		const ledgerTransactions = await prisma.$queryRaw<AdminFeeLedgerRow[]>`
			SELECT
				"source",
				"source_id" AS "sourceId",
				"event_id" AS "eventId",
				"event_title" AS "eventTitle",
				"event_slug" AS "eventSlug",
				"midtrans_order_id" AS "midtransOrderId",
				"base_amount"::double precision AS "baseAmount",
				"admin_fee"::double precision AS "adminFee",
				"quantity",
				"vote_count" AS "voteCount",
				"status",
				"payment_type" AS "paymentType",
				"paid_at" AS "paidAt"
			FROM "admin_fee_transactions"
			WHERE ${ledgerWhere}
			ORDER BY "paid_at" ASC
		`;

		const details = ledgerTransactions.map((tx) => ({
			source: tx.source,
			id: tx.sourceId,
			eventId: tx.eventId,
			eventTitle: tx.eventTitle,
			eventSlug: tx.eventSlug,
			baseAmount: toNumber(tx.baseAmount),
			adminFee: toNumber(tx.adminFee),
			quantity: tx.quantity,
			voteCount: tx.voteCount,
			status: tx.status,
			paidAt: tx.paidAt,
			midtransOrderId: tx.midtransOrderId,
			paymentType: tx.paymentType,
		}));

		const ticketAdminFee = sum(details.filter((d) => d.source === "ticket").map((d) => d.adminFee));
		const votingAdminFee = sum(details.filter((d) => d.source === "voting").map((d) => d.adminFee));
		const registrationAdminFee = sum(details.filter((d) => d.source === "registration").map((d) => d.adminFee));

		const detailsBySource = {
			tickets: details.filter((d) => d.source === "ticket"),
			voting: details.filter((d) => d.source === "voting"),
			registrations: details.filter((d) => d.source === "registration"),
		};

		res.json({
			currency: "IDR",
			filters: {
				from: from?.toISOString() || null,
				to: to?.toISOString() || null,
				eventId: eventId || null,
			},
			summary: {
				totalAdminFee: ticketAdminFee + votingAdminFee + registrationAdminFee,
				ticketAdminFee,
				votingAdminFee,
				registrationAdminFee,
				qrisFee: 0,
			},
			counts: {
				tickets: detailsBySource.tickets.length,
				voting: detailsBySource.voting.length,
				registrations: detailsBySource.registrations.length,
			},
			...(includeDetails
				? {
						details: detailsBySource,
						data: details,
				  }
				: {}),
		});
	} catch (error: any) {
		if (error.message?.includes("tanggal")) {
			return res.status(400).json({ error: error.message });
		}

		console.error("Error fetching external admin fee revenue:", error);
		res.status(500).json({ error: "Gagal mengambil data pemasukan admin fee" });
	}
});

// =============================================================================
// GET /api/external/platform-revenue
// Simpaskor's revenue from event packages:
//   - Revenue share (platform cut) of ticket & voting sales on revenue-share tiers
//   - Upfront package payments (BRONZE / GOLD)
// =============================================================================
router.get("/platform-revenue", requireExternalFinanceApiKey, async (req: Request, res: Response) => {
	try {
		const from = parseDateQuery(req.query.from, "from");
		const to = parseDateQuery(req.query.to, "to");
		const eventId = typeof req.query.eventId === "string" ? req.query.eventId.trim() : "";
		const includeDetails = req.query.includeDetails === "true";

		await reconcileExternalRevenueShareEvents(eventId);

		const revenueShareWhere = Prisma.sql`
			t."status" = 'PAID'
			AND rs."status" <> 'CANCELLED'
			${eventId ? Prisma.sql`AND rs."event_id" = ${eventId}` : Prisma.empty}
			${from ? Prisma.sql`AND t."paid_at" >= ${from}` : Prisma.empty}
			${to ? Prisma.sql`AND t."paid_at" <= ${to}` : Prisma.empty}
		`;

		const revenueShares = await prisma.$queryRaw<RevenueShareRow[]>`
			SELECT
				rs."id",
				rs."transaction_id" AS "transactionId",
				rs."event_id" AS "eventId",
				e."title" AS "eventTitle",
				e."slug" AS "eventSlug",
				e."package_tier"::text AS "packageTier",
				t."source_type"::text AS "sourceType",
				t."source_code" AS "sourceCode",
				rs."gross_amount"::double precision AS "grossAmount",
				rs."platform_amount"::double precision AS "platformAmount",
				rs."panitia_amount"::double precision AS "panitiaAmount",
				rs."platform_share_percent"::double precision AS "platformSharePercent",
				rs."panitia_share_percent"::double precision AS "panitiaSharePercent",
				rs."withdrawn_panitia_amount"::double precision AS "withdrawnPanitiaAmount",
				rs."status"::text AS "status",
				t."paid_at" AS "paidAt"
			FROM "revenue_shares" rs
			INNER JOIN "transactions" t ON t."id" = rs."transaction_id"
			INNER JOIN "events" e ON e."id" = rs."event_id"
			WHERE ${revenueShareWhere}
			ORDER BY t."paid_at" ASC
		`;

		const eventPaymentWhere: any = {
			status: "PAID",
			amount: { gt: 0 },
			...(eventId ? { eventId } : {}),
			...(from || to
				? {
						paidAt: {
							...(from ? { gte: from } : {}),
							...(to ? { lte: to } : {}),
						},
				  }
				: {}),
		};

		const packagePaymentsRaw = await prisma.eventPayment.findMany({
			where: eventPaymentWhere,
			select: {
				id: true,
				eventId: true,
				userId: true,
				packageTier: true,
				amount: true,
				status: true,
				paymentType: true,
				midtransOrderId: true,
				paidAt: true,
				event: { select: { title: true, slug: true } },
			},
			orderBy: { paidAt: "asc" },
		});

		const packagePayments: PackagePaymentRow[] = packagePaymentsRaw.map((p) => ({
			id: p.id,
			eventId: p.eventId,
			eventTitle: p.event.title,
			eventSlug: p.event.slug,
			userId: p.userId,
			packageTier: p.packageTier,
			tier: p.packageTier,
			amount: toNumber(p.amount),
			status: p.status,
			paymentType: p.paymentType,
			midtransOrderId: p.midtransOrderId,
			paidAt: p.paidAt!,
			description: `Pembayaran paket ${p.packageTier}`,
		}));

		const revenueShareDetails = revenueShares.map((rs) => ({
			id: rs.id,
			transactionId: rs.transactionId,
			eventId: rs.eventId,
			eventTitle: rs.eventTitle,
			eventSlug: rs.eventSlug,
			packageTier: rs.packageTier,
			sourceType: rs.sourceType,
			sourceCode: rs.sourceCode,
			grossAmount: toNumber(rs.grossAmount),
			platformAmount: toNumber(rs.platformAmount),
			panitiaAmount: toNumber(rs.panitiaAmount),
			platformSharePercent: toNumber(rs.platformSharePercent),
			panitiaSharePercent: toNumber(rs.panitiaSharePercent),
			withdrawnPanitiaAmount: toNumber(rs.withdrawnPanitiaAmount),
			status: rs.status,
			paidAt: rs.paidAt,
		}));

		const ticketShares = revenueShareDetails.filter((r) => r.sourceType === "TICKET");
		const votingShares = revenueShareDetails.filter((r) => r.sourceType === "VOTING");

		const platformShareFromTickets = sum(ticketShares.map((r) => r.platformAmount));
		const platformShareFromVoting = sum(votingShares.map((r) => r.platformAmount));
		const grossRevenueFromTickets = sum(ticketShares.map((r) => r.grossAmount));
		const grossRevenueFromVoting = sum(votingShares.map((r) => r.grossAmount));
		const panitiaShareFromTickets = sum(ticketShares.map((r) => r.panitiaAmount));
		const panitiaShareFromVoting = sum(votingShares.map((r) => r.panitiaAmount));

		const totalPackagePayments = sum(packagePayments.map((p) => p.amount));
		const packageTotalsByTier: Record<string, number> = {};
		packagePayments.forEach((p) => {
			packageTotalsByTier[p.packageTier] = (packageTotalsByTier[p.packageTier] || 0) + p.amount;
		});

		const totalPlatformShare = platformShareFromTickets + platformShareFromVoting;
		const totalPlatformRevenue = totalPlatformShare + totalPackagePayments;

		res.json({
			currency: "IDR",
			filters: {
				from: from?.toISOString() || null,
				to: to?.toISOString() || null,
				eventId: eventId || null,
			},
			summary: {
				totalPlatformRevenue,
				totalPlatformShare,
				platformShareFromTickets,
				platformShareFromVoting,
				totalPackagePayments,
				packageTotalsByTier,
				grossRevenue: {
					tickets: grossRevenueFromTickets,
					voting: grossRevenueFromVoting,
					total: grossRevenueFromTickets + grossRevenueFromVoting,
				},
				panitiaShare: {
					tickets: panitiaShareFromTickets,
					voting: panitiaShareFromVoting,
					total: panitiaShareFromTickets + panitiaShareFromVoting,
				},
			},
			counts: {
				revenueShares: revenueShareDetails.length,
				ticketShares: ticketShares.length,
				votingShares: votingShares.length,
				packagePayments: packagePayments.length,
			},
			...(includeDetails
				? {
						details: {
							revenueShares: revenueShareDetails,
							packagePayments,
						},
				  }
				: {}),
		});
	} catch (error: any) {
		if (error.message?.includes("tanggal")) {
			return res.status(400).json({ error: error.message });
		}

		console.error("Error fetching platform revenue:", error);
		res.status(500).json({ error: "Gagal mengambil data pendapatan platform" });
	}
});

// =============================================================================
// GET /api/external/revenue-share-balances
// Lifetime panitia revenue-share balances from paid ticket + voting sales.
// This endpoint is intentionally lifetime-based: activeBalance only makes sense
// after subtracting every approved/transferred withdrawal and every pending
// withdrawal for the event, not only rows inside a date window.
// =============================================================================
router.get("/revenue-share-balances", requireExternalFinanceApiKey, async (req: Request, res: Response) => {
	try {
		const eventId = typeof req.query.eventId === "string" ? req.query.eventId.trim() : "";
		const includeDetails = req.query.includeDetails === "true";

		const events = await reconcileExternalRevenueShareEvents(eventId);

		if (eventId && events.length === 0) {
			return res.status(404).json({ error: "Event tidak ditemukan" });
		}

		const perEvent = await Promise.all(
			events.map(async (event) => {
				const ledger = await getEventRevenueLedgerSummary(prisma, event.id);
				const platformSharePercent = Math.round(ledger.platformShareRate * 10000) / 100;
				const panitiaSharePercent = Math.round(ledger.panitiaShareRate * 10000) / 100;

				return {
					event: {
						id: event.id,
						title: event.title,
						slug: event.slug,
						startDate: event.startDate,
						packageTier: event.packageTier,
						configuredPlatformSharePercent: event.platformSharePercent,
						platformSharePercent,
						panitiaSharePercent,
					},
					balance: {
						grossRevenue: ledger.grossRevenue,
						ticketGrossRevenue: ledger.ticketGrossRevenue,
						votingGrossRevenue: ledger.votingGrossRevenue,
						platformShare: ledger.platformShare,
						panitiaShare: ledger.panitiaShare,
						ticketRevenue: ledger.ticketRevenue,
						votingRevenue: ledger.votingRevenue,
						totalWithdrawn: ledger.totalWithdrawn,
						totalPending: ledger.totalPending,
						activeBalance: ledger.activeBalance,
						lockedPlatformShare: ledger.lockedPlatformShare,
						activePlatformShare: ledger.activePlatformShare,
					},
				};
			})
		);

		const totals = perEvent.reduce(
			(acc, row) => {
				acc.grossRevenue += row.balance.grossRevenue;
				acc.ticketGrossRevenue += row.balance.ticketGrossRevenue;
				acc.votingGrossRevenue += row.balance.votingGrossRevenue;
				acc.platformShare += row.balance.platformShare;
				acc.panitiaShare += row.balance.panitiaShare;
				acc.ticketRevenue += row.balance.ticketRevenue;
				acc.votingRevenue += row.balance.votingRevenue;
				acc.totalWithdrawn += row.balance.totalWithdrawn;
				acc.totalPending += row.balance.totalPending;
				acc.activeBalance += row.balance.activeBalance;
				acc.lockedPlatformShare += row.balance.lockedPlatformShare;
				acc.activePlatformShare += row.balance.activePlatformShare;
				return acc;
			},
			{
				grossRevenue: 0,
				ticketGrossRevenue: 0,
				votingGrossRevenue: 0,
				platformShare: 0,
				panitiaShare: 0,
				ticketRevenue: 0,
				votingRevenue: 0,
				totalWithdrawn: 0,
				totalPending: 0,
				activeBalance: 0,
				lockedPlatformShare: 0,
				activePlatformShare: 0,
			}
		);

		let details: ExternalRevenueShareDetailRow[] | undefined;
		if (includeDetails) {
			const detailsWhere = Prisma.sql`
				t."status" = 'PAID'
				AND rs."status" <> 'CANCELLED'
				${eventId ? Prisma.sql`AND rs."event_id" = ${eventId}` : Prisma.empty}
			`;

			details = await prisma.$queryRaw<ExternalRevenueShareDetailRow[]>`
				SELECT
					rs."id",
					rs."transaction_id" AS "transactionId",
					rs."event_id" AS "eventId",
					e."title" AS "eventTitle",
					e."slug" AS "eventSlug",
					t."source_type"::text AS "sourceType",
					t."source_code" AS "sourceCode",
					rs."gross_amount"::double precision AS "grossAmount",
					rs."platform_amount"::double precision AS "platformAmount",
					rs."panitia_amount"::double precision AS "panitiaAmount",
					rs."withdrawn_panitia_amount"::double precision AS "withdrawnPanitiaAmount",
					(rs."panitia_amount" - rs."withdrawn_panitia_amount")::double precision AS "activePanitiaAmount",
					rs."status"::text AS "status",
					t."paid_at" AS "paidAt"
				FROM "revenue_shares" rs
				INNER JOIN "transactions" t ON t."id" = rs."transaction_id"
				INNER JOIN "events" e ON e."id" = rs."event_id"
				WHERE ${detailsWhere}
				ORDER BY t."paid_at" ASC
			`;
		}

		res.json({
			currency: "IDR",
			filters: {
				eventId: eventId || null,
				scope: "lifetime",
			},
			summary: totals,
			counts: {
				events: perEvent.length,
				revenueShares: details?.length ?? undefined,
			},
			events: perEvent,
			...(includeDetails ? { details } : {}),
		});
	} catch (error) {
		console.error("Error fetching external revenue share balances:", error);
		res.status(500).json({ error: "Gagal mengambil saldo bagi hasil" });
	}
});

// =============================================================================
// GET /api/external/summary
// One-shot lifetime summary that combines admin fees + platform revenue share +
// package payments. Convenient for dashboards that just want the total balance.
// =============================================================================
router.get("/summary", requireExternalFinanceApiKey, async (req: Request, res: Response) => {
	try {
		const from = parseDateQuery(req.query.from, "from");
		const to = parseDateQuery(req.query.to, "to");
		const eventId = typeof req.query.eventId === "string" ? req.query.eventId.trim() : "";

		await reconcileAdminFeeLedger();
		await reconcileExternalRevenueShareEvents(eventId);

		const adminFeeWhere = Prisma.sql`
			"status" = 'PAID'
			${eventId ? Prisma.sql`AND "event_id" = ${eventId}` : Prisma.empty}
			${from ? Prisma.sql`AND "paid_at" >= ${from}` : Prisma.empty}
			${to ? Prisma.sql`AND "paid_at" <= ${to}` : Prisma.empty}
		`;

		const adminFeeTotals = await prisma.$queryRaw<
			{ source: string; total: number; count: number }[]
		>`
			SELECT
				"source",
				COALESCE(SUM("admin_fee"), 0)::double precision AS "total",
				COUNT(*)::int AS "count"
			FROM "admin_fee_transactions"
			WHERE ${adminFeeWhere}
			GROUP BY "source"
		`;

		const revenueShareWhere = Prisma.sql`
			t."status" = 'PAID'
			AND rs."status" <> 'CANCELLED'
			${eventId ? Prisma.sql`AND rs."event_id" = ${eventId}` : Prisma.empty}
			${from ? Prisma.sql`AND t."paid_at" >= ${from}` : Prisma.empty}
			${to ? Prisma.sql`AND t."paid_at" <= ${to}` : Prisma.empty}
		`;

		const revenueShareTotals = await prisma.$queryRaw<
			{ sourceType: string; platformAmount: number; grossAmount: number; count: number }[]
		>`
			SELECT
				t."source_type"::text AS "sourceType",
				COALESCE(SUM(rs."platform_amount"), 0)::double precision AS "platformAmount",
				COALESCE(SUM(rs."gross_amount"), 0)::double precision AS "grossAmount",
				COUNT(*)::int AS "count"
			FROM "revenue_shares" rs
			INNER JOIN "transactions" t ON t."id" = rs."transaction_id"
			WHERE ${revenueShareWhere}
			GROUP BY t."source_type"
		`;

		const eventPaymentWhere: any = {
			status: "PAID",
			amount: { gt: 0 },
			...(eventId ? { eventId } : {}),
			...(from || to
				? {
						paidAt: {
							...(from ? { gte: from } : {}),
							...(to ? { lte: to } : {}),
						},
				  }
				: {}),
		};

		const packageTotals = await prisma.eventPayment.groupBy({
			by: ["packageTier"],
			where: eventPaymentWhere,
			_sum: { amount: true },
			_count: true,
		});

		const findAdminFee = (source: string) =>
			toNumber(adminFeeTotals.find((row) => row.source === source)?.total);
		const findRevenueShare = (sourceType: string) =>
			revenueShareTotals.find((row) => row.sourceType === sourceType);

		const ticketAdminFee = findAdminFee("ticket");
		const votingAdminFee = findAdminFee("voting");
		const registrationAdminFee = findAdminFee("registration");
		const totalAdminFee = ticketAdminFee + votingAdminFee + registrationAdminFee;

		const ticketShare = findRevenueShare("TICKET");
		const votingShare = findRevenueShare("VOTING");
		const platformShareFromTickets = toNumber(ticketShare?.platformAmount);
		const platformShareFromVoting = toNumber(votingShare?.platformAmount);
		const totalPlatformShare = platformShareFromTickets + platformShareFromVoting;

		const packageTotalsByTier: Record<string, number> = {};
		let totalPackagePayments = 0;
		packageTotals.forEach((row) => {
			const amount = toNumber(row._sum.amount);
			packageTotalsByTier[row.packageTier] = amount;
			totalPackagePayments += amount;
		});

		const totalSimpaskorBalance = totalAdminFee + totalPlatformShare + totalPackagePayments;

		res.json({
			currency: "IDR",
			filters: {
				from: from?.toISOString() || null,
				to: to?.toISOString() || null,
				eventId: eventId || null,
			},
			summary: {
				totalSimpaskorBalance,
				adminFee: {
					total: totalAdminFee,
					ticket: ticketAdminFee,
					voting: votingAdminFee,
					registration: registrationAdminFee,
				},
				platformShare: {
					total: totalPlatformShare,
					fromTickets: platformShareFromTickets,
					fromVoting: platformShareFromVoting,
					ticketGrossRevenue: toNumber(ticketShare?.grossAmount),
					votingGrossRevenue: toNumber(votingShare?.grossAmount),
				},
				packagePayments: {
					total: totalPackagePayments,
					byTier: packageTotalsByTier,
				},
			},
			counts: {
				ticketAdminFee: toNumber(adminFeeTotals.find((row) => row.source === "ticket")?.count),
				votingAdminFee: toNumber(adminFeeTotals.find((row) => row.source === "voting")?.count),
				registrationAdminFee: toNumber(
					adminFeeTotals.find((row) => row.source === "registration")?.count
				),
				ticketRevenueShares: toNumber(ticketShare?.count),
				votingRevenueShares: toNumber(votingShare?.count),
				packagePayments: packageTotals.reduce((acc, row) => acc + toNumber(row._count), 0),
			},
		});
	} catch (error: any) {
		if (error.message?.includes("tanggal")) {
			return res.status(400).json({ error: error.message });
		}

		console.error("Error fetching external finance summary:", error);
		res.status(500).json({ error: "Gagal mengambil ringkasan pendapatan" });
	}
});

export default router;
