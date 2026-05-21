import { prisma } from "./prisma";
import { cancelMidtransTransaction } from "./midtrans";

/**
 * Safety-net sweeper that expires PENDING payment records the Midtrans
 * webhook never finished marking — e.g. when the buyer closed the QRIS
 * popup and never paid, and Midtrans' expired notification failed to
 * deliver.
 *
 * QRIS tokens on Midtrans expire after 15 minutes; we wait 30 minutes
 * before declaring a record dead so we never race the webhook.
 *
 * Idempotent: only touches rows still in PENDING. Safe to re-run.
 */

// 30 minutes — longer than Midtrans' 15-minute QRIS expiry window so we
// never close a record that's still legitimately payable.
const PENDING_TTL_MS = 30 * 60 * 1000;

// Run every 5 minutes. Cheap query (indexed on status + paidAt + updatedAt).
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

const log = (msg: string) => console.log(`[PendingSweep] ${msg}`);

async function sweepTicketPurchases(cutoff: Date): Promise<number> {
	const candidates = await prisma.ticketPurchase.findMany({
		where: { status: "PENDING", createdAt: { lt: cutoff } },
		select: { id: true, eventId: true, quantity: true, midtransOrderId: true },
		take: 500,
	});
	if (candidates.length === 0) return 0;

	for (const purchase of candidates) {
		try {
			await prisma.$transaction(async (tx) => {
				// Guard inside the transaction so concurrent webhook updates
				// don't double-cancel.
				const current = await tx.ticketPurchase.findUnique({
					where: { id: purchase.id },
					select: { status: true },
				});
				if (current?.status !== "PENDING") return;

				await tx.ticketAttendee.updateMany({
					where: { purchaseId: purchase.id, status: "PENDING" },
					data: { status: "EXPIRED" },
				});
				await tx.eventTicketConfig.update({
					where: { eventId: purchase.eventId },
					data: { soldCount: { decrement: purchase.quantity } },
				});
				await tx.ticketPurchase.update({
					where: { id: purchase.id },
					data: { status: "EXPIRED" },
				});
			});
			if (purchase.midtransOrderId) {
				void cancelMidtransTransaction(purchase.midtransOrderId);
			}
		} catch (err) {
			console.warn(`[PendingSweep] ticket ${purchase.id} failed:`, err);
		}
	}
	return candidates.length;
}

async function sweepVotingPurchases(cutoff: Date): Promise<number> {
	const candidates = await prisma.votingPurchase.findMany({
		where: { status: "PENDING", createdAt: { lt: cutoff } },
		select: { id: true, midtransOrderId: true },
		take: 500,
	});
	if (candidates.length === 0) return 0;

	const result = await prisma.votingPurchase.updateMany({
		where: { id: { in: candidates.map((c) => c.id) }, status: "PENDING" },
		data: { status: "EXPIRED" },
	});

	for (const purchase of candidates) {
		if (purchase.midtransOrderId) {
			void cancelMidtransTransaction(purchase.midtransOrderId);
		}
	}
	return result.count;
}

async function sweepOrders(cutoff: Date): Promise<number> {
	const candidates = await prisma.order.findMany({
		where: {
			status: "PENDING",
			paidAt: null,
			createdAt: { lt: cutoff },
		},
		select: { id: true, midtransOrderId: true },
		take: 500,
	});
	if (candidates.length === 0) return 0;

	const result = await prisma.order.updateMany({
		where: {
			id: { in: candidates.map((c) => c.id) },
			status: "PENDING",
			paidAt: null,
		},
		data: { status: "CANCELLED" },
	});

	for (const order of candidates) {
		if (order.midtransOrderId) {
			void cancelMidtransTransaction(order.midtransOrderId);
		}
	}
	return result.count;
}

async function sweepRegistrationPayments(cutoff: Date): Promise<number> {
	const candidates = await prisma.registrationPayment.findMany({
		where: { status: "PENDING", createdAt: { lt: cutoff } },
		select: { id: true, midtransOrderId: true },
		take: 500,
	});
	if (candidates.length === 0) return 0;

	const result = await prisma.registrationPayment.updateMany({
		where: { id: { in: candidates.map((c) => c.id) }, status: "PENDING" },
		data: { status: "EXPIRED" },
	});

	for (const payment of candidates) {
		if (payment.midtransOrderId) {
			void cancelMidtransTransaction(payment.midtransOrderId);
		}
	}
	return result.count;
}

async function sweepEventPayments(cutoff: Date): Promise<number> {
	const candidates = await prisma.eventPayment.findMany({
		where: { status: "PENDING", createdAt: { lt: cutoff } },
		select: { id: true, eventId: true, midtransOrderId: true },
		take: 500,
	});
	if (candidates.length === 0) return 0;

	let updated = 0;
	for (const payment of candidates) {
		try {
			await prisma.$transaction(async (tx) => {
				const current = await tx.eventPayment.findUnique({
					where: { id: payment.id },
					select: { status: true },
				});
				if (current?.status !== "PENDING") return;
				await tx.eventPayment.update({
					where: { id: payment.id },
					data: { status: "EXPIRED" },
				});
				await tx.event.update({
					where: { id: payment.eventId },
					data: { paymentStatus: "EXPIRED" },
				});
				updated += 1;
			});
			if (payment.midtransOrderId) {
				void cancelMidtransTransaction(payment.midtransOrderId);
			}
		} catch (err) {
			console.warn(`[PendingSweep] event payment ${payment.id} failed:`, err);
		}
	}
	return updated;
}

let sweepInFlight = false;

async function runSweep(): Promise<void> {
	if (sweepInFlight) return;
	sweepInFlight = true;
	try {
		const cutoff = new Date(Date.now() - PENDING_TTL_MS);
		const [tickets, votes, orders, regs, events] = await Promise.all([
			sweepTicketPurchases(cutoff),
			sweepVotingPurchases(cutoff),
			sweepOrders(cutoff),
			sweepRegistrationPayments(cutoff),
			sweepEventPayments(cutoff),
		]);
		const total = tickets + votes + orders + regs + events;
		if (total > 0) {
			log(
				`expired ${total} stale PENDING — tickets=${tickets}, votes=${votes}, orders=${orders}, registrations=${regs}, events=${events}`
			);
		}
	} catch (err) {
		console.warn("[PendingSweep] sweep failed:", err);
	} finally {
		sweepInFlight = false;
	}
}

/**
 * Start the background sweep loop. Call once at server startup.
 * The interval is unref'd so it never holds the process alive on exit.
 */
export function startPendingPaymentSweeper(): void {
	// Fire once shortly after boot so a long-running server picks up the
	// backlog without waiting a full interval.
	const bootTimeout = setTimeout(() => void runSweep(), 30_000);
	bootTimeout.unref?.();

	const handle = setInterval(() => void runSweep(), SWEEP_INTERVAL_MS);
	handle.unref?.();

	log(
		`scheduled — TTL=${PENDING_TTL_MS / 60_000}min, interval=${SWEEP_INTERVAL_MS / 60_000}min`
	);
}
