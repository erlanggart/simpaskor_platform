import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import {
	createSnapTransaction,
	generateMidtransOrderId,
	PaymentPrefix,
	isMidtransConfigured,
} from "../lib/midtrans";

const router = Router();

// Package pricing (in Rupiah)
const PACKAGE_PRICES: Record<string, number> = {
	BRONZE: 500000,
	SILVER: 1000000,
	GOLD: 1500000,
};

const PACKAGE_NAMES: Record<string, string> = {
	BRONZE: "Paket Bronze",
	SILVER: "Paket Silver",
	GOLD: "Paket Gold",
};

/**
 * POST /api/event-payments/create
 * Create event payment - panitia selects a package and gets Midtrans snap token
 */
router.post("/create", authenticate, async (req: AuthenticatedRequest, res: Response) => {
	try {
		const userId = req.user!.userId;
		const { eventId, packageTier } = req.body;

		if (!eventId || !packageTier) {
			return res.status(400).json({ error: "eventId dan packageTier wajib diisi" });
		}

		// Validate package tier
		if (!["BRONZE", "SILVER", "GOLD"].includes(packageTier)) {
			return res.status(400).json({ error: "Package tier tidak valid" });
		}

		// Verify event ownership
		const event = await prisma.event.findFirst({
			where: { id: eventId, createdById: userId },
			include: {
				eventPayment: true,
				createdBy: { select: { name: true, email: true, phone: true } },
			},
		});

		if (!event) {
			return res.status(404).json({ error: "Event tidak ditemukan" });
		}

		// Check if already paid
		if (event.eventPayment?.status === "PAID") {
			return res.status(400).json({ error: "Pembayaran event sudah selesai" });
		}

		if (!isMidtransConfigured) {
			return res.status(500).json({ error: "Payment gateway belum dikonfigurasi" });
		}

		const amount = PACKAGE_PRICES[packageTier];
		if (!amount) {
			return res.status(400).json({ error: "Package tier tidak valid" });
		}
		const orderId = generateMidtransOrderId(PaymentPrefix.EVENT, eventId);

		// Create or update payment record
		let payment;
		if (event.eventPayment) {
			// Update existing pending/expired/cancelled payment
			payment = await prisma.eventPayment.update({
				where: { id: event.eventPayment.id },
				data: {
					packageTier: packageTier as any,
					amount,
					status: "PENDING",
					midtransOrderId: orderId,
					snapToken: null,
					paymentType: null,
					paidAt: null,
				},
			});
		} else {
			payment = await prisma.eventPayment.create({
				data: {
					eventId,
					userId,
					packageTier: packageTier as any,
					amount,
					status: "PENDING",
					midtransOrderId: orderId,
				},
			});
		}

		// Update event with selected package tier
		await prisma.event.update({
			where: { id: eventId },
			data: {
				packageTier: packageTier as any,
				paymentStatus: "PENDING",
			},
		});

		// Create Midtrans snap transaction
		const snap = await createSnapTransaction({
			orderId,
			grossAmount: amount,
			customerName: event.createdBy.name,
			customerEmail: event.createdBy.email,
			customerPhone: event.createdBy.phone || undefined,
			itemDetails: [
				{
					id: `PKG-${packageTier}`,
					price: amount,
					quantity: 1,
					name: `${PACKAGE_NAMES[packageTier]} - ${event.title}`.substring(0, 50),
				},
			],
		});

		// Save snap token
		await prisma.eventPayment.update({
			where: { id: payment.id },
			data: { snapToken: snap.token },
		});

		res.json({
			snapToken: snap.token,
			orderId,
			amount,
			packageTier,
			paymentId: payment.id,
		});
	} catch (error: any) {
		console.error("Error creating event payment:", error);
		res.status(500).json({ error: "Gagal membuat pembayaran", details: error.message });
	}
});

/**
 * GET /api/event-payments/:eventId/status
 * Check payment status for an event
 */
router.get("/:eventId/status", authenticate, async (req: AuthenticatedRequest, res: Response) => {
	try {
		const userId = req.user!.userId;
		const { eventId } = req.params;

		const payment = await prisma.eventPayment.findFirst({
			where: { eventId, userId },
		});

		if (!payment) {
			return res.json({ status: null, message: "Belum ada pembayaran" });
		}

		res.json({
			status: payment.status,
			packageTier: payment.packageTier,
			amount: payment.amount,
			paidAt: payment.paidAt,
			snapToken: payment.snapToken,
			midtransOrderId: payment.midtransOrderId,
		});
	} catch (error) {
		console.error("Error checking event payment status:", error);
		res.status(500).json({ error: "Gagal memeriksa status pembayaran" });
	}
});

/**
 * POST /api/event-payments/:eventId/complete
 * Mark event as paid and allow publishing (called after webhook confirms payment)
 * This can also be called by frontend to finalize after payment success callback
 */
router.post("/:eventId/complete", authenticate, async (req: AuthenticatedRequest, res: Response) => {
	try {
		const userId = req.user!.userId;
		const { eventId } = req.params;

		const payment = await prisma.eventPayment.findFirst({
			where: { eventId, userId, status: "PAID" },
		});

		if (!payment) {
			return res.status(400).json({ error: "Pembayaran belum berhasil" });
		}

		// Mark wizard as completed, event ready to publish
		await prisma.event.update({
			where: { id: eventId },
			data: {
				wizardStep: 0,
				wizardCompleted: true,
				paymentStatus: "PAID",
			},
		});

		res.json({ message: "Event siap dipublish", eventId });
	} catch (error) {
		console.error("Error completing event:", error);
		res.status(500).json({ error: "Gagal menyelesaikan event" });
	}
});

/**
 * POST /api/event-payments/:eventId/dp-request
 * Mark event as DP requested - admin will create/publish the event
 */
router.post("/:eventId/dp-request", authenticate, async (req: AuthenticatedRequest, res: Response) => {
	try {
		const userId = req.user!.userId;
		const { eventId } = req.params;
		const { packageTier } = req.body;

		if (!packageTier || !["BRONZE", "SILVER", "GOLD"].includes(packageTier)) {
			return res.status(400).json({ error: "Package tier tidak valid" });
		}

		// Verify event ownership
		const event = await prisma.event.findFirst({
			where: { id: eventId, createdById: userId },
		});

		if (!event) {
			return res.status(404).json({ error: "Event tidak ditemukan" });
		}

		// Mark event as DP requested and complete the wizard
		await prisma.event.update({
			where: { id: eventId },
			data: {
				packageTier: packageTier as any,
				paymentStatus: "DP_REQUESTED",
				wizardStep: 0,
				wizardCompleted: true,
			},
		});

		res.json({ message: "Permintaan DP berhasil dikirim. Hubungi admin untuk proses selanjutnya.", eventId });
	} catch (error) {
		console.error("Error requesting DP:", error);
		res.status(500).json({ error: "Gagal memproses permintaan DP" });
	}
});

export default router;
