import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
	calculateRegistrationAdminFee,
	calculateTicketAdminFee,
	calculateVotingAdminFee,
} from "../lib/adminFeeLedger";

const router = Router();

const EXTERNAL_FINANCE_API_KEY = "simpaskor-admin-fee-2026-7d4f6c9b2a8e41f0b5c3d9e7a1f8b6c4";

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

const buildPaidAtFilter = (from: Date | null, to: Date | null) => {
	if (!from && !to) return {};

	return {
		paidAt: {
			...(from ? { gte: from } : {}),
			...(to ? { lte: to } : {}),
		},
	};
};

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

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

// GET /api/external/admin-fees
router.get("/admin-fees", requireExternalFinanceApiKey, async (req: Request, res: Response) => {
	try {
		const from = parseDateQuery(req.query.from, "from");
		const to = parseDateQuery(req.query.to, "to");
		const eventId = typeof req.query.eventId === "string" ? req.query.eventId.trim() : "";
		const includeDetails = req.query.includeDetails === "true";
		const paidAtFilter = buildPaidAtFilter(from, to);
		const eventFilter = eventId ? { eventId } : {};

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
				"base_amount" AS "baseAmount",
				"admin_fee" AS "adminFee",
				"quantity",
				"vote_count" AS "voteCount",
				"status",
				"payment_type" AS "paymentType",
				"paid_at" AS "paidAt"
			FROM "admin_fee_transactions"
			WHERE ${ledgerWhere}
			ORDER BY "paid_at" ASC
		`;
		const loggedOrderIds = ledgerTransactions.map((transaction) => transaction.midtransOrderId);
		const midtransOrderFilter: any = { not: null };
		if (loggedOrderIds.length > 0) {
			midtransOrderFilter.notIn = loggedOrderIds;
		}

		const [ticketPurchases, votingPurchases, registrationPayments] = await Promise.all([
			prisma.ticketPurchase.findMany({
				where: {
					...eventFilter,
					...paidAtFilter,
					status: { in: ["PAID", "USED"] },
					totalAmount: { gt: 0 },
					midtransOrderId: midtransOrderFilter,
				},
				select: {
					id: true,
					eventId: true,
					quantity: true,
					totalAmount: true,
					status: true,
					paidAt: true,
					midtransOrderId: true,
					event: { select: { title: true, slug: true } },
				},
			}),
			prisma.votingPurchase.findMany({
				where: {
					...eventFilter,
					...paidAtFilter,
					status: "PAID",
					totalAmount: { gt: 0 },
					midtransOrderId: midtransOrderFilter,
				},
				select: {
					id: true,
					eventId: true,
					voteCount: true,
					totalAmount: true,
					status: true,
					paidAt: true,
					midtransOrderId: true,
					event: { select: { title: true, slug: true } },
				},
			}),
			prisma.registrationPayment.findMany({
				where: {
					...eventFilter,
					...paidAtFilter,
					status: "PAID",
					amount: { gt: 0 },
					midtransOrderId: midtransOrderFilter,
				},
				select: {
					id: true,
					eventId: true,
					amount: true,
					status: true,
					paidAt: true,
					midtransOrderId: true,
					participation: { select: { event: { select: { title: true, slug: true } } } },
				},
			}),
		]);

		const ledgerDetails = ledgerTransactions.map((transaction) => ({
			source: transaction.source,
			id: transaction.sourceId,
			eventId: transaction.eventId,
			eventTitle: transaction.eventTitle,
			eventSlug: transaction.eventSlug,
			baseAmount: transaction.baseAmount,
			adminFee: transaction.adminFee,
			quantity: transaction.quantity,
			voteCount: transaction.voteCount,
			status: transaction.status,
			paidAt: transaction.paidAt,
			midtransOrderId: transaction.midtransOrderId,
			paymentType: transaction.paymentType,
		}));

		const ticketDetails = ticketPurchases.map((purchase) => ({
			source: "ticket",
			id: purchase.id,
			eventId: purchase.eventId,
			eventTitle: purchase.event.title,
			eventSlug: purchase.event.slug,
			baseAmount: purchase.totalAmount,
			adminFee: calculateTicketAdminFee(purchase.quantity),
			quantity: purchase.quantity,
			voteCount: null,
			status: purchase.status,
			paidAt: purchase.paidAt,
			midtransOrderId: purchase.midtransOrderId,
			paymentType: null,
		}));

		const votingDetails = votingPurchases.map((purchase) => ({
			source: "voting",
			id: purchase.id,
			eventId: purchase.eventId,
			eventTitle: purchase.event.title,
			eventSlug: purchase.event.slug,
			baseAmount: purchase.totalAmount,
			adminFee: calculateVotingAdminFee(purchase.totalAmount, purchase.voteCount),
			quantity: null,
			voteCount: purchase.voteCount,
			status: purchase.status,
			paidAt: purchase.paidAt,
			midtransOrderId: purchase.midtransOrderId,
			paymentType: null,
		}));

		const registrationDetails = registrationPayments.map((payment) => ({
			source: "registration",
			id: payment.id,
			eventId: payment.eventId,
			eventTitle: payment.participation.event.title,
			eventSlug: payment.participation.event.slug,
			baseAmount: payment.amount,
			adminFee: calculateRegistrationAdminFee(),
			quantity: null,
			voteCount: null,
			status: payment.status,
			paidAt: payment.paidAt,
			midtransOrderId: payment.midtransOrderId,
			paymentType: null,
		}));

		const allDetails = [...ledgerDetails, ...ticketDetails, ...votingDetails, ...registrationDetails];
		const ticketAdminFee = sum(allDetails.filter((item) => item.source === "ticket").map((item) => item.adminFee));
		const votingAdminFee = sum(allDetails.filter((item) => item.source === "voting").map((item) => item.adminFee));
		const registrationAdminFee = sum(allDetails.filter((item) => item.source === "registration").map((item) => item.adminFee));
		const detailsBySource = {
			tickets: allDetails.filter((item) => item.source === "ticket"),
			voting: allDetails.filter((item) => item.source === "voting"),
			registrations: allDetails.filter((item) => item.source === "registration"),
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
						data: allDetails,
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

export default router;
