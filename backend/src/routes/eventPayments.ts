import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, authorize, AuthenticatedRequest } from "../middleware/auth";
import {
	createSnapTransaction,
	generateMidtransOrderId,
	PaymentPrefix,
	isMidtransConfigured,
} from "../lib/midtrans";

const router = Router();

// Package pricing (in Rupiah)
const PACKAGE_PRICES: Record<string, number> = {
	IKLAN: 0,
	TICKETING: 0,
	VOTING: 0,
	TICKETING_VOTING: 0,
	BRONZE: 500000,
	SILVER: 1000000,
	GOLD: 1500000,
};

const PACKAGE_NAMES: Record<string, string> = {
	IKLAN: "Paket Iklan",
	TICKETING: "Paket Ticketing",
	VOTING: "Paket Voting",
	TICKETING_VOTING: "Paket Ticketing + Voting",
	BRONZE: "Paket Bronze",
	SILVER: "Paket Silver",
	GOLD: "Paket Gold",
};

// Free tiers that don't require payment
const FREE_TIERS = ["IKLAN", "TICKETING", "VOTING", "TICKETING_VOTING"];

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
		if (!["IKLAN", "TICKETING", "VOTING", "TICKETING_VOTING", "BRONZE", "SILVER", "GOLD"].includes(packageTier)) {
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

		const amount = PACKAGE_PRICES[packageTier];
		if (amount === undefined) {
			return res.status(400).json({ error: "Package tier tidak valid" });
		}

		// Handle free packages - no payment needed
		if (FREE_TIERS.includes(packageTier)) {
			let payment;
			if (event.eventPayment) {
				payment = await prisma.eventPayment.update({
					where: { id: event.eventPayment.id },
					data: {
						packageTier: packageTier as any,
						amount: 0,
						status: "PAID",
						midtransOrderId: null,
						snapToken: null,
						paymentType: "FREE",
						paidAt: new Date(),
					},
				});
			} else {
				payment = await prisma.eventPayment.create({
					data: {
						eventId,
						userId,
						packageTier: packageTier as any,
						amount: 0,
						status: "PAID",
						paymentType: "FREE",
						paidAt: new Date(),
					},
				});
			}

			await prisma.event.update({
				where: { id: eventId },
				data: {
					packageTier: packageTier as any,
					paymentStatus: "PAID",
					wizardStep: 0,
					wizardCompleted: true,
				},
			});

			return res.json({
				snapToken: null,
				orderId: null,
				amount: 0,
				packageTier,
				paymentId: payment.id,
				status: "PAID",
			});
		}

		if (!isMidtransConfigured) {
			return res.status(500).json({ error: "Payment gateway belum dikonfigurasi" });
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

		if (!packageTier || !["IKLAN", "TICKETING", "VOTING", "TICKETING_VOTING", "BRONZE", "SILVER", "GOLD"].includes(packageTier)) {
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

// ==========================================
// ADMIN ROUTES - Package Management
// ==========================================

/**
 * GET /api/event-payments/admin/packages
 * List all events with active packages (events that have a packageTier assigned)
 */
router.get("/admin/packages", authenticate, authorize("SUPERADMIN"), async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { search, packageTier, paymentStatus, eventStatus, page = "1", limit = "15" } = req.query;
		const pageNum = Math.max(1, parseInt(page as string));
		const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
		const skip = (pageNum - 1) * limitNum;

		const where: any = {
			packageTier: { not: null },
		};

		if (packageTier) {
			where.packageTier = packageTier as string;
		}
		if (paymentStatus) {
			where.paymentStatus = paymentStatus as string;
		}
		if (eventStatus) {
			where.status = eventStatus as string;
		}
		if (search) {
			where.OR = [
				{ title: { contains: search as string, mode: "insensitive" } },
				{ organizer: { contains: search as string, mode: "insensitive" } },
				{ createdBy: { name: { contains: search as string, mode: "insensitive" } } },
				{ createdBy: { email: { contains: search as string, mode: "insensitive" } } },
			];
		}

		const [events, total] = await Promise.all([
			prisma.event.findMany({
				where,
				orderBy: { createdAt: "desc" },
				skip,
				take: limitNum,
				select: {
					id: true,
					title: true,
					slug: true,
					status: true,
					packageTier: true,
					paymentStatus: true,
					startDate: true,
					endDate: true,
					organizer: true,
					createdAt: true,
					createdBy: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},
					eventPayment: {
						select: {
							id: true,
							amount: true,
							status: true,
							paymentType: true,
							paidAt: true,
						},
					},
					ticketConfig: {
						select: { enabled: true },
					},
					votingConfig: {
						select: { enabled: true },
					},
				},
			}),
			prisma.event.count({ where }),
		]);

		// Stats
		const allPackagedEvents = await prisma.event.groupBy({
			by: ["packageTier"],
			where: { packageTier: { not: null } },
			_count: true,
		});

		const paidCount = await prisma.event.count({
			where: { packageTier: { not: null }, paymentStatus: "PAID" },
		});
		const pendingCount = await prisma.event.count({
			where: { packageTier: { not: null }, paymentStatus: { in: ["PENDING", "DP_REQUESTED"] } },
		});

		const tierStats: Record<string, number> = {};
		allPackagedEvents.forEach((g) => {
			if (g.packageTier) tierStats[g.packageTier] = g._count;
		});

		res.json({
			data: events,
			total,
			page: pageNum,
			totalPages: Math.ceil(total / limitNum),
			stats: {
				total: Object.values(tierStats).reduce((a, b) => a + b, 0),
				paid: paidCount,
				pending: pendingCount,
				byTier: tierStats,
			},
		});
	} catch (error) {
		console.error("Error fetching packages:", error);
		res.status(500).json({ error: "Gagal memuat data paket" });
	}
});

/**
 * PUT /api/event-payments/admin/packages/:eventId
 * Update event package tier and payment status
 */
router.put("/admin/packages/:eventId", authenticate, authorize("SUPERADMIN"), async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { eventId } = req.params;
		const { packageTier: newTier, paymentStatus: newPaymentStatus } = req.body;

		const event = await prisma.event.findUnique({
			where: { id: eventId },
			include: { eventPayment: true },
		});

		if (!event) {
			return res.status(404).json({ error: "Event tidak ditemukan" });
		}

		const updateData: any = {};

		if (newTier && ["IKLAN", "TICKETING", "VOTING", "TICKETING_VOTING", "BRONZE", "SILVER", "GOLD"].includes(newTier)) {
			updateData.packageTier = newTier;
		}

		if (newPaymentStatus && ["PENDING", "PAID", "DP_REQUESTED"].includes(newPaymentStatus)) {
			updateData.paymentStatus = newPaymentStatus;
		}

		const updated = await prisma.event.update({
			where: { id: eventId },
			data: updateData,
			select: {
				id: true,
				title: true,
				packageTier: true,
				paymentStatus: true,
			},
		});

		// If marking as PAID, also update payment record if exists
		if (newPaymentStatus === "PAID" && event.eventPayment && event.eventPayment.status !== "PAID") {
			await prisma.eventPayment.update({
				where: { id: event.eventPayment.id },
				data: {
					status: "PAID",
					paidAt: new Date(),
					...(newTier ? { packageTier: newTier } : {}),
				},
			});
		}

		res.json(updated);
	} catch (error) {
		console.error("Error updating package:", error);
		res.status(500).json({ error: "Gagal memperbarui paket" });
	}
});

export default router;
