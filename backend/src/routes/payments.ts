import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import {
	verifySignature,
	resolvePaymentStatus,
	PaymentPrefix,
	MIDTRANS_CLIENT_KEY,
	MIDTRANS_IS_PRODUCTION,
} from "../lib/midtrans";
import { sendTicketEmailFromServer, sendVotingPurchaseEmail } from "../lib/email";

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
			// Return 200 to prevent Midtrans from retrying (test notifications have invalid signatures)
			return res.status(200).json({ status: "ok", message: "Invalid signature, ignored" });
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
		} else if (order_id.startsWith(PaymentPrefix.EVENT)) {
			await handleEventPayment(order_id, paymentResult, payment_type);
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
		include: {
			event: {
				select: { title: true, startDate: true, venue: true, city: true },
			},
			attendees: true,
		},
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
			// Also mark all attendees as PAID
			await tx.ticketAttendee.updateMany({
				where: { purchaseId: ticket.id },
				data: { status: "PAID" },
			});
			await tx.eventTicketConfig.update({
				where: { eventId: ticket.eventId },
				data: { soldCount: { increment: ticket.quantity } },
			});
		});

		// Send ticket email with QR code to buyer (include all attendee tickets)
		try {
			await sendTicketEmailFromServer({
				to: ticket.buyerEmail,
				buyerName: ticket.buyerName,
				ticketCode: ticket.ticketCode,
				eventTitle: ticket.event.title,
				eventDate: ticket.event.startDate.toISOString(),
				venue: ticket.event.venue,
				city: ticket.event.city,
				quantity: ticket.quantity,
				totalAmount: ticket.totalAmount,
				attendees: ticket.attendees.map((a) => ({
					name: a.attendeeName,
					email: a.attendeeEmail,
					gender: a.attendeeGender,
					ticketCode: a.ticketCode,
				})),
			});
			console.log(`[Email] Ticket email sent to ${ticket.buyerEmail} for ${ticket.ticketCode} with ${ticket.attendees.length} attendee(s)`);
		} catch (emailError) {
			console.error(`[Email] Failed to send ticket email to ${ticket.buyerEmail}:`, emailError);
		}
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
		include: {
			event: {
				select: { title: true },
			},
		},
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

		// Send voting purchase code email to buyer
		try {
			await sendVotingPurchaseEmail({
				to: purchase.buyerEmail,
				buyerName: purchase.buyerName,
				purchaseCode: purchase.purchaseCode,
				eventTitle: purchase.event.title,
				voteCount: purchase.voteCount,
				totalAmount: purchase.totalAmount,
			});
			console.log(`[Email] Voting email sent to ${purchase.buyerEmail} for ${purchase.purchaseCode}`);
		} catch (emailError) {
			console.error(`[Email] Failed to send voting email to ${purchase.buyerEmail}:`, emailError);
		}
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
			// Payment success: move from PENDING_PAYMENT to REGISTERED
			// Panitia will then confirm (REGISTERED -> CONFIRMED)
			await tx.eventParticipation.update({
				where: { id: payment.participationId },
				data: { status: "REGISTERED" },
			});
		});
	} else if (result === "failed" || result === "expired") {
		await prisma.$transaction(async (tx) => {
			await tx.registrationPayment.update({
				where: { id: payment.id },
				data: {
					status: result === "expired" ? "EXPIRED" : "CANCELLED",
					paymentType,
				},
			});
			// Keep as PENDING_PAYMENT so user can retry
		});
	}
}

async function handleEventPayment(
	midtransOrderId: string,
	result: "success" | "pending" | "failed" | "expired",
	paymentType: string
) {
	const payment = await prisma.eventPayment.findUnique({
		where: { midtransOrderId },
	});
	if (!payment) {
		console.warn(`[Midtrans] Event payment not found: ${midtransOrderId}`);
		return;
	}

	if (result === "success") {
		await prisma.$transaction(async (tx) => {
			await tx.eventPayment.update({
				where: { id: payment.id },
				data: {
					status: "PAID",
					paymentType,
					paidAt: new Date(),
				},
			});
			// Mark event as paid - wizard completed, ready to publish
			await tx.event.update({
				where: { id: payment.eventId },
				data: {
					paymentStatus: "PAID",
					wizardStep: 0,
					wizardCompleted: true,
				},
			});
		});
		console.log(`[Midtrans] Event payment confirmed: ${midtransOrderId} for event ${payment.eventId}`);
	} else if (result === "failed" || result === "expired") {
		await prisma.eventPayment.update({
			where: { id: payment.id },
			data: {
				status: result === "expired" ? "EXPIRED" : "CANCELLED",
				paymentType,
			},
		});
	}
}

export default router;
