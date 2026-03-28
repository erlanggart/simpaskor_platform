import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import {
	verifySignature,
	resolvePaymentStatus,
	PaymentPrefix,
	MIDTRANS_CLIENT_KEY,
	MIDTRANS_IS_PRODUCTION,
} from "../lib/midtrans";

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/payments/client-key
 * Return Midtrans client key + environment for frontend Snap.js initialization
 */
router.get("/client-key", (req: Request, res: Response) => {
	res.json({
		clientKey: MIDTRANS_CLIENT_KEY,
		isProduction: MIDTRANS_IS_PRODUCTION,
	});
});

/**
 * POST /api/payments/notification
 * Midtrans HTTP notification (webhook) handler.
 * This endpoint receives payment status updates for ALL transaction types.
 * Must be publicly accessible (no auth middleware).
 */
router.post("/notification", async (req: Request, res: Response) => {
	try {
		const notification = req.body;

		const {
			order_id,
			transaction_status,
			fraud_status,
			status_code,
			gross_amount,
			signature_key,
			payment_type,
		} = notification;

		// Verify signature
		if (!verifySignature({ order_id, status_code, gross_amount, signature_key })) {
			console.error("Invalid Midtrans signature for order:", order_id);
			return res.status(403).json({ error: "Invalid signature" });
		}

		const paymentResult = resolvePaymentStatus(transaction_status, fraud_status);

		console.log(`[Midtrans] ${order_id} => ${transaction_status} (${paymentResult}), payment_type: ${payment_type}`);

		// Route to appropriate handler based on order_id prefix
		if (order_id.startsWith(PaymentPrefix.ORDER)) {
			await handleOrderPayment(order_id, paymentResult, payment_type);
		} else if (order_id.startsWith(PaymentPrefix.TICKET)) {
			await handleTicketPayment(order_id, paymentResult, payment_type);
		} else if (order_id.startsWith(PaymentPrefix.VOTING)) {
			await handleVotingPayment(order_id, paymentResult, payment_type);
		} else if (order_id.startsWith(PaymentPrefix.REGISTRATION)) {
			await handleRegistrationPayment(order_id, paymentResult, payment_type);
		} else {
			console.warn(`[Midtrans] Unknown order prefix: ${order_id}`);
		}

		// Always respond 200 to Midtrans
		res.status(200).json({ status: "ok" });
	} catch (error) {
		console.error("[Midtrans] Notification error:", error);
		// Still return 200 to prevent Midtrans from retrying
		res.status(200).json({ status: "ok" });
	}
});

// ==========================================
// PAYMENT HANDLERS
// ==========================================

async function handleOrderPayment(
	midtransOrderId: string,
	result: "success" | "pending" | "failed" | "expired",
	paymentType: string
) {
	const order = await prisma.order.findUnique({
		where: { midtransOrderId },
	});
	if (!order) {
		console.warn(`[Midtrans] Order not found: ${midtransOrderId}`);
		return;
	}

	if (result === "success") {
		// Payment confirmed: update status AND reduce stock now
		const items = await prisma.orderItem.findMany({
			where: { orderId: order.id },
		});
		await prisma.$transaction(async (tx) => {
			await tx.order.update({
				where: { id: order.id },
				data: {
					status: "CONFIRMED",
					paymentType,
					paidAt: new Date(),
				},
			});
			for (const item of items) {
				await tx.product.update({
					where: { id: item.productId },
					data: {
						stock: { decrement: item.quantity },
					},
				});
				const updated = await tx.product.findUnique({ where: { id: item.productId } });
				if (updated && updated.stock <= 0) {
					await tx.product.update({
						where: { id: item.productId },
						data: { status: "OUT_OF_STOCK" },
					});
				}
			}
		});
	} else if (result === "failed" || result === "expired") {
		// Payment failed/expired: just cancel the order (stock was never deducted)
		await prisma.order.update({
			where: { id: order.id },
			data: { status: "CANCELLED", paymentType },
		});
	}
	// pending: no action needed, order already in PENDING
}

async function handleTicketPayment(
	midtransOrderId: string,
	result: "success" | "pending" | "failed" | "expired",
	paymentType: string
) {
	const ticket = await prisma.ticketPurchase.findUnique({
		where: { midtransOrderId },
	});
	if (!ticket) {
		console.warn(`[Midtrans] Ticket not found: ${midtransOrderId}`);
		return;
	}

	if (result === "success") {
		// Payment confirmed: update status AND increment soldCount now
		await prisma.$transaction(async (tx) => {
			await tx.ticketPurchase.update({
				where: { id: ticket.id },
				data: {
					status: "PAID",
					paymentType,
					paidAt: new Date(),
				},
			});
			await tx.eventTicketConfig.update({
				where: { eventId: ticket.eventId },
				data: { soldCount: { increment: ticket.quantity } },
			});
		});
	} else if (result === "failed" || result === "expired") {
		// Payment failed/expired: just cancel (soldCount was never incremented for paid tickets)
		await prisma.ticketPurchase.update({
			where: { id: ticket.id },
			data: {
				status: result === "expired" ? "EXPIRED" : "CANCELLED",
				paymentType,
			},
		});
	}
}

async function handleVotingPayment(
	midtransOrderId: string,
	result: "success" | "pending" | "failed" | "expired",
	paymentType: string
) {
	const purchase = await prisma.votingPurchase.findUnique({
		where: { midtransOrderId },
	});
	if (!purchase) {
		console.warn(`[Midtrans] Voting purchase not found: ${midtransOrderId}`);
		return;
	}

	if (result === "success") {
		await prisma.votingPurchase.update({
			where: { id: purchase.id },
			data: {
				status: "PAID",
				paymentType,
				paidAt: new Date(),
			},
		});
	} else if (result === "failed" || result === "expired") {
		await prisma.votingPurchase.update({
			where: { id: purchase.id },
			data: {
				status: result === "expired" ? "EXPIRED" : "CANCELLED",
				paymentType,
			},
		});
	}
}

async function handleRegistrationPayment(
	midtransOrderId: string,
	result: "success" | "pending" | "failed" | "expired",
	paymentType: string
) {
	const payment = await prisma.registrationPayment.findUnique({
		where: { midtransOrderId },
		include: { participation: true },
	});
	if (!payment) {
		console.warn(`[Midtrans] Registration payment not found: ${midtransOrderId}`);
		return;
	}

	if (result === "success") {
		await prisma.$transaction(async (tx) => {
			await tx.registrationPayment.update({
				where: { id: payment.id },
				data: {
					status: "PAID",
					paymentType,
					paidAt: new Date(),
				},
			});
			// Auto-confirm the registration on payment success
			await tx.eventParticipation.update({
				where: { id: payment.participationId },
				data: { status: "CONFIRMED" },
			});
		});
	} else if (result === "failed" || result === "expired") {
		await prisma.registrationPayment.update({
			where: { id: payment.id },
			data: {
				status: result === "expired" ? "EXPIRED" : "CANCELLED",
				paymentType,
			},
		});
	}
}

export default router;
