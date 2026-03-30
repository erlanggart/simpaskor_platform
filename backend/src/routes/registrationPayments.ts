import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import {
	createSnapTransaction,
	generateMidtransOrderId,
	PaymentPrefix,
} from "../lib/midtrans";

const router = Router();
const prisma = new PrismaClient();

/**
 * POST /api/registration-payments/create
 * Create a registration payment and get Snap token.
 * Called after user registers for an event that has a registration fee.
 */
router.post("/create", authenticate, async (req: AuthenticatedRequest, res: Response) => {
	try {
		const userId = req.user!.userId;
		const { participationId } = req.body;

		if (!participationId) {
			return res.status(400).json({ error: "participationId wajib diisi" });
		}

		// Find the participation
		const participation = await prisma.eventParticipation.findFirst({
			where: { id: participationId, userId },
			include: {
				event: { select: { id: true, title: true, registrationFee: true } },
				user: { select: { name: true, email: true, phone: true } },
				registrationPayment: true,
			},
		});

		if (!participation) {
			return res.status(404).json({ error: "Registrasi tidak ditemukan" });
		}

		const fee = participation.event.registrationFee;
		if (!fee || Number(fee) <= 0) {
			return res.status(400).json({ error: "Event ini tidak memiliki biaya registrasi" });
		}

		// Check if an active payment already exists
		if (participation.registrationPayment) {
			const existingPayment = participation.registrationPayment;
			if (existingPayment.status === "PAID") {
				return res.status(400).json({ error: "Pembayaran sudah selesai" });
			}
			// If there's an existing PENDING payment with a snap token, return it
			if (existingPayment.status === "PENDING" && existingPayment.snapToken) {
				return res.json({
					message: "Lanjutkan pembayaran sebelumnya",
					payment: existingPayment,
				});
			}
		}

		const amount = Number(fee);
		const midtransOrderId = generateMidtransOrderId(PaymentPrefix.REGISTRATION, participationId);

		const snapResult = await createSnapTransaction({
			orderId: midtransOrderId,
			grossAmount: amount,
			customerName: participation.user.name || "Peserta",
			customerEmail: participation.user.email,
			customerPhone: participation.user.phone || undefined,
			adminFee: 5000,
			itemDetails: [
				{
					id: participation.event.id,
					price: amount,
					quantity: 1,
					name: `Biaya Registrasi ${participation.event.title}`,
				},
			],
		});

		// Upsert payment record
		const payment = await prisma.registrationPayment.upsert({
			where: { participationId },
			create: {
				participationId,
				eventId: participation.event.id,
				userId,
				amount,
				midtransOrderId,
				snapToken: snapResult.token,
			},
			update: {
				midtransOrderId,
				snapToken: snapResult.token,
				status: "PENDING",
			},
		});

		res.status(201).json({
			message: "Silakan selesaikan pembayaran",
			payment,
		});
	} catch (error) {
		console.error("Error creating registration payment:", error);
		res.status(500).json({ error: "Gagal membuat pembayaran registrasi" });
	}
});

/**
 * GET /api/registration-payments/my
 * Get current user's registration payments
 */
router.get("/my", authenticate, async (req: AuthenticatedRequest, res: Response) => {
	try {
		const userId = req.user!.userId;

		const payments = await prisma.registrationPayment.findMany({
			where: { userId },
			include: {
				participation: {
					include: {
						event: { select: { title: true, slug: true, startDate: true, thumbnail: true } },
					},
				},
			},
			orderBy: { createdAt: "desc" },
		});

		res.json(payments);
	} catch (error) {
		console.error("Error fetching registration payments:", error);
		res.status(500).json({ error: "Gagal memuat pembayaran" });
	}
});

/**
 * GET /api/registration-payments/:id/status
 * Check payment status for a specific registration payment
 */
router.get("/:id/status", authenticate, async (req: AuthenticatedRequest, res: Response) => {
	try {
		const userId = req.user!.userId;

		const payment = await prisma.registrationPayment.findFirst({
			where: { id: req.params.id, userId },
		});

		if (!payment) {
			return res.status(404).json({ error: "Pembayaran tidak ditemukan" });
		}

		res.json({
			status: payment.status,
			paidAt: payment.paidAt,
			paymentType: payment.paymentType,
		});
	} catch (error) {
		console.error("Error checking payment status:", error);
		res.status(500).json({ error: "Gagal memeriksa status pembayaran" });
	}
});

export default router;
