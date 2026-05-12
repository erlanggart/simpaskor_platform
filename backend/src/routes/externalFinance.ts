import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma";

const router = Router();

const TICKET_ADMIN_FEE_PER_TICKET = 2000;
const REGISTRATION_ADMIN_FEE = 5000;
const VOTING_ADMIN_FEE_PER_VOTE = 500;
const VOTING_MAX_ADMIN_FEE = 10000;
const EXTERNAL_FINANCE_API_KEY = "simpaskor-admin-fee-2026-7d4f6c9b2a8e41f0b5c3d9e7a1f8b6c4";

const calculateVotingAdminFee = (totalAmount: number, voteCount: number): number => {
	if (totalAmount <= 0) return 0;
	return Math.min(VOTING_ADMIN_FEE_PER_VOTE * voteCount, VOTING_MAX_ADMIN_FEE);
};

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

// GET /api/external/admin-fees
router.get("/admin-fees", requireExternalFinanceApiKey, async (req: Request, res: Response) => {
	try {
		const from = parseDateQuery(req.query.from, "from");
		const to = parseDateQuery(req.query.to, "to");
		const eventId = typeof req.query.eventId === "string" ? req.query.eventId.trim() : "";
		const includeDetails = req.query.includeDetails === "true";
		const paidAtFilter = buildPaidAtFilter(from, to);
		const eventFilter = eventId ? { eventId } : {};

		const [ticketPurchases, votingPurchases, registrationPayments] = await Promise.all([
			prisma.ticketPurchase.findMany({
				where: {
					...eventFilter,
					...paidAtFilter,
					status: { in: ["PAID", "USED"] },
					totalAmount: { gt: 0 },
					midtransOrderId: { not: null },
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
					midtransOrderId: { not: null },
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
					OR: [{ paymentMethod: "MIDTRANS" }, { midtransOrderId: { not: null } }],
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

		const ticketDetails = ticketPurchases.map((purchase) => ({
			source: "ticket",
			id: purchase.id,
			eventId: purchase.eventId,
			eventTitle: purchase.event.title,
			eventSlug: purchase.event.slug,
			baseAmount: purchase.totalAmount,
			adminFee: TICKET_ADMIN_FEE_PER_TICKET * purchase.quantity,
			quantity: purchase.quantity,
			status: purchase.status,
			paidAt: purchase.paidAt,
			midtransOrderId: purchase.midtransOrderId,
		}));

		const votingDetails = votingPurchases.map((purchase) => ({
			source: "voting",
			id: purchase.id,
			eventId: purchase.eventId,
			eventTitle: purchase.event.title,
			eventSlug: purchase.event.slug,
			baseAmount: purchase.totalAmount,
			adminFee: calculateVotingAdminFee(purchase.totalAmount, purchase.voteCount),
			voteCount: purchase.voteCount,
			status: purchase.status,
			paidAt: purchase.paidAt,
			midtransOrderId: purchase.midtransOrderId,
		}));

		const registrationDetails = registrationPayments.map((payment) => ({
			source: "registration",
			id: payment.id,
			eventId: payment.eventId,
			eventTitle: payment.participation.event.title,
			eventSlug: payment.participation.event.slug,
			baseAmount: payment.amount,
			adminFee: REGISTRATION_ADMIN_FEE,
			status: payment.status,
			paidAt: payment.paidAt,
			midtransOrderId: payment.midtransOrderId,
		}));

		const ticketAdminFee = sum(ticketDetails.map((item) => item.adminFee));
		const votingAdminFee = sum(votingDetails.map((item) => item.adminFee));
		const registrationAdminFee = sum(registrationDetails.map((item) => item.adminFee));
		const detailsBySource = {
			tickets: ticketDetails,
			voting: votingDetails,
			registrations: registrationDetails,
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
				tickets: ticketDetails.length,
				voting: votingDetails.length,
				registrations: registrationDetails.length,
			},
			...(includeDetails
				? {
						details: detailsBySource,
						data: [...ticketDetails, ...votingDetails, ...registrationDetails],
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
