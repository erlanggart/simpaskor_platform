import { Router, Response } from "express";
import { PrismaClient, TicketStatus } from "@prisma/client";
import {
	authenticate,
	authorize,
	optionalAuthenticate,
	AuthenticatedRequest,
} from "../middleware/auth";
import crypto from "crypto";
import {
	createSnapTransaction,
	generateMidtransOrderId,
	PaymentPrefix,
} from "../lib/midtrans";
import { sendTicketEmail, sendTicketEmailFromServer } from "../lib/email";

const router = Router();
const prisma = new PrismaClient();

// Resolve event slug or ID to actual event ID
const resolveEventId = async (eventIdOrSlug: string | undefined): Promise<string | null> => {
	if (!eventIdOrSlug) return null;
	const event = await prisma.event.findFirst({
		where: { OR: [{ id: eventIdOrSlug }, { slug: eventIdOrSlug }] },
		select: { id: true },
	});
	return event?.id || null;
};

// Generate unique ticket code
const generateTicketCode = (): string => {
	const timestamp = Date.now().toString(36).toUpperCase();
	const random = crypto.randomBytes(4).toString("hex").toUpperCase();
	return `TKT-${timestamp}-${random}`;
};

// ==========================================
// PUBLIC ROUTES
// ==========================================

// GET /api/tickets/events - List events with e-ticketing enabled
router.get("/events", async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { search, page = "1", limit = "12" } = req.query;
		const pageNum = Math.max(1, parseInt(page as string));
		const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
		const skip = (pageNum - 1) * limitNum;

		const where: any = {
			status: { in: ["PUBLISHED", "ONGOING"] },
			ticketConfig: {
				enabled: true,
			},
		};

		if (search) {
			where.OR = [
				{ title: { contains: search as string, mode: "insensitive" } },
				{ description: { contains: search as string, mode: "insensitive" } },
				{ location: { contains: search as string, mode: "insensitive" } },
				{ organizer: { contains: search as string, mode: "insensitive" } },
			];
		}

		const [events, total] = await Promise.all([
			prisma.event.findMany({
				where,
				orderBy: { startDate: "asc" },
				skip,
				take: limitNum,
				select: {
					id: true,
					title: true,
					slug: true,
					description: true,
					thumbnail: true,
					startDate: true,
					endDate: true,
					location: true,
					city: true,
					venue: true,
					organizer: true,
					ticketConfig: {
						select: {
							id: true,
							price: true,
							quota: true,
							soldCount: true,
							description: true,
							salesStartDate: true,
							salesEndDate: true,
						},
					},
				},
			}),
			prisma.event.count({ where }),
		]);

		res.json({
			data: events,
			total,
			page: pageNum,
			totalPages: Math.ceil(total / limitNum),
		});
	} catch (error) {
		console.error("Error fetching ticketed events:", error);
		res.status(500).json({ error: "Gagal memuat event" });
	}
});

// GET /api/tickets/events/:eventId - Get event ticket details
router.get("/events/:eventId", async (req: AuthenticatedRequest, res: Response) => {
	try {
		const event = await prisma.event.findUnique({
			where: { id: req.params.eventId },
			select: {
				id: true,
				title: true,
				slug: true,
				description: true,
				thumbnail: true,
				startDate: true,
				endDate: true,
				location: true,
				city: true,
				venue: true,
				organizer: true,
				contactEmail: true,
				contactPhone: true,
				ticketConfig: {
					select: {
						id: true,
						price: true,
						quota: true,
						soldCount: true,
						description: true,
						salesStartDate: true,
						salesEndDate: true,
						enabled: true,
					},
				},
			},
		});

		if (!event || !event.ticketConfig?.enabled) {
			return res.status(404).json({ error: "Event tidak ditemukan atau tiket tidak tersedia" });
		}

		res.json(event);
	} catch (error) {
		console.error("Error fetching event ticket detail:", error);
		res.status(500).json({ error: "Gagal memuat detail event" });
	}
});

// POST /api/tickets/purchase - Purchase ticket (public, optional auth)
router.post("/purchase", optionalAuthenticate, async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { eventId, buyerName, buyerEmail, buyerPhone, quantity = 1, notes } = req.body;

		if (!eventId || !buyerName || !buyerEmail) {
			return res.status(400).json({ error: "Event, nama, dan email pembeli wajib diisi" });
		}

		if (quantity < 1 || quantity > 10) {
			return res.status(400).json({ error: "Jumlah tiket harus antara 1-10" });
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(buyerEmail)) {
			return res.status(400).json({ error: "Format email tidak valid" });
		}

		const result = await prisma.$transaction(async (tx) => {
			// Get ticket config with lock
			const ticketConfig = await tx.eventTicketConfig.findUnique({
				where: { eventId },
			});

			if (!ticketConfig || !ticketConfig.enabled) {
				throw new Error("Tiket tidak tersedia untuk event ini");
			}

			// Check sales period
			const now = new Date();
			if (ticketConfig.salesStartDate && now < ticketConfig.salesStartDate) {
				throw new Error("Penjualan tiket belum dimulai");
			}
			if (ticketConfig.salesEndDate && now > ticketConfig.salesEndDate) {
				throw new Error("Penjualan tiket sudah ditutup");
			}

			// Check quota
			const remaining = ticketConfig.quota - ticketConfig.soldCount;
			if (remaining < quantity) {
				throw new Error(remaining === 0 ? "Tiket sudah habis" : `Sisa tiket hanya ${remaining}`);
			}

			// Create purchase
			const ticketCode = generateTicketCode();
			const totalAmount = ticketConfig.price * quantity;

			const purchase = await tx.ticketPurchase.create({
				data: {
					eventId,
					userId: req.user?.userId || null,
					buyerName,
					buyerEmail,
					buyerPhone: buyerPhone || null,
					quantity,
					totalAmount,
					ticketCode,
					status: ticketConfig.price === 0 ? "PAID" : "PENDING",
					paidAt: ticketConfig.price === 0 ? new Date() : null,
					notes: notes || null,
				},
				include: {
					event: {
						select: { title: true, startDate: true, endDate: true, venue: true, city: true },
					},
				},
			});

			// Only update sold count for FREE tickets (paid tickets update via webhook after payment)
			if (ticketConfig.price === 0) {
				await tx.eventTicketConfig.update({
					where: { eventId },
					data: { soldCount: { increment: quantity } },
				});
			}

			return purchase;
		});

		// Generate Midtrans Snap token for paid tickets
		let snapToken: string | null = null;
		let midtransOrderId: string | null = null;
		if (result.totalAmount > 0) {
			try {
				midtransOrderId = generateMidtransOrderId(PaymentPrefix.TICKET, result.id);
				const snapResult = await createSnapTransaction({
					orderId: midtransOrderId,
					grossAmount: result.totalAmount,
					customerName: buyerName,
					customerEmail: buyerEmail,
					customerPhone: buyerPhone,
					adminFee: 2000,
					itemDetails: [
						{
							id: result.eventId,
							price: result.totalAmount / result.quantity,
							quantity: result.quantity,
							name: `Tiket ${result.event?.title || "Event"}`,
						},
					],
				});
				snapToken = snapResult.token;

				await prisma.ticketPurchase.update({
					where: { id: result.id },
					data: { midtransOrderId, snapToken },
				});
			} catch (midtransError) {
				console.error("Midtrans Snap token generation failed:", midtransError);
			}
		}

		// Send email for free tickets (paid tickets get email via webhook)
		if (result.totalAmount === 0) {
			try {
				await sendTicketEmailFromServer({
					to: buyerEmail,
					buyerName,
					ticketCode: result.ticketCode,
					eventTitle: result.event?.title || "Event",
					eventDate: result.event?.startDate?.toISOString() || new Date().toISOString(),
					venue: result.event?.venue || null,
					city: result.event?.city || null,
					quantity: result.quantity,
					totalAmount: 0,
				});
			} catch (emailError) {
				console.error("Failed to send free ticket email:", emailError);
			}
		}

		res.status(201).json({
			message: result.totalAmount === 0 ? "Tiket berhasil didapatkan! E-Ticket dikirim ke email Anda." : "Pesanan tiket berhasil dibuat!",
			ticket: { ...result, snapToken, midtransOrderId },
		});
	} catch (error: any) {
		console.error("Error purchasing ticket:", error);
		res.status(400).json({ error: error.message || "Gagal memesan tiket" });
	}
});

// GET /api/tickets/my - Get my ticket purchases (authenticated)
router.get("/my", authenticate, async (req: AuthenticatedRequest, res: Response) => {
	try {
		const tickets = await prisma.ticketPurchase.findMany({
			where: { userId: req.user!.userId },
			orderBy: { createdAt: "desc" },
			include: {
				event: {
					select: { title: true, slug: true, startDate: true, endDate: true, venue: true, city: true, thumbnail: true },
				},
			},
		});

		res.json(tickets);
	} catch (error) {
		console.error("Error fetching my tickets:", error);
		res.status(500).json({ error: "Gagal memuat tiket" });
	}
});

// GET /api/tickets/check/:ticketCode - Check ticket status by code (public)
router.get("/check/:ticketCode", async (req: AuthenticatedRequest, res: Response) => {
	try {
		const ticket = await prisma.ticketPurchase.findUnique({
			where: { ticketCode: req.params.ticketCode },
			include: {
				event: {
					select: { title: true, startDate: true, endDate: true, venue: true, city: true },
				},
			},
		});

		if (!ticket) {
			return res.status(404).json({ error: "Tiket tidak ditemukan" });
		}

		res.json({
			ticketCode: ticket.ticketCode,
			buyerName: ticket.buyerName,
			eventTitle: ticket.event.title,
			eventDate: ticket.event.startDate,
			venue: ticket.event.venue,
			city: ticket.event.city,
			quantity: ticket.quantity,
			status: ticket.status,
		});
	} catch (error) {
		console.error("Error checking ticket:", error);
		res.status(500).json({ error: "Gagal memeriksa tiket" });
	}
});

// ==========================================
// SEND TICKET TO EMAIL
// ==========================================

// POST /api/tickets/send-email - Send ticket QR code to email
router.post("/send-email", async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { ticketCode, email, qrImageBase64 } = req.body;

		if (!ticketCode || !email || !qrImageBase64) {
			return res.status(400).json({ error: "Kode tiket, email, dan QR code wajib diisi" });
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return res.status(400).json({ error: "Format email tidak valid" });
		}

		const ticket = await prisma.ticketPurchase.findUnique({
			where: { ticketCode },
			include: {
				event: {
					select: { title: true, startDate: true, venue: true, city: true },
				},
			},
		});

		if (!ticket) {
			return res.status(404).json({ error: "Tiket tidak ditemukan" });
		}

		await sendTicketEmail({
			to: email,
			buyerName: ticket.buyerName,
			ticketCode: ticket.ticketCode,
			eventTitle: ticket.event.title,
			eventDate: ticket.event.startDate.toISOString(),
			venue: ticket.event.venue,
			city: ticket.event.city,
			quantity: ticket.quantity,
			totalAmount: ticket.totalAmount,
			qrImageBase64,
		});

		res.json({ message: "Tiket berhasil dikirim ke email" });
	} catch (error: any) {
		console.error("Error sending ticket email:", error);
		res.status(500).json({ error: "Gagal mengirim email. Pastikan konfigurasi SMTP sudah benar." });
	}
});

// ==========================================
// PANITIA ROUTES - TICKET CONFIG MANAGEMENT
// ==========================================

// GET /api/tickets/admin/event/:eventId/config - Get ticket config for event
router.get(
	"/admin/event/:eventId/config",
	authenticate,
	authorize("SUPERADMIN", "PANITIA"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const eventId = await resolveEventId(req.params.eventId);
			if (!eventId) return res.status(404).json({ error: "Event tidak ditemukan" });

			const event = await prisma.event.findUnique({
				where: { id: eventId },
				select: {
					startDate: true,
					endDate: true,
					registrationDeadline: true,
				},
			});

			let config = await prisma.eventTicketConfig.findUnique({
				where: { eventId },
			});

			if (!config) {
				// Return default config structure
				return res.json({
					eventId,
					enabled: false,
					price: 0,
					quota: 0,
					soldCount: 0,
					description: null,
					salesStartDate: null,
					salesEndDate: null,
					event: event || null,
				});
			}

			res.json({ ...config, event: event || null });
		} catch (error) {
			console.error("Error fetching ticket config:", error);
			res.status(500).json({ error: "Gagal memuat konfigurasi tiket" });
		}
	}
);

// POST /api/tickets/admin/event/:eventId/toggle-ticketing - Open/close ticketing
router.post(
	"/admin/event/:eventId/toggle-ticketing",
	authenticate,
	authorize("SUPERADMIN", "PANITIA"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const eventId = await resolveEventId(req.params.eventId);
			if (!eventId) return res.status(404).json({ error: "Event tidak ditemukan" });

			const existing = await prisma.eventTicketConfig.findUnique({
				where: { eventId },
			});

			if (!existing) {
				return res.status(404).json({ error: "Konfigurasi tiket belum dibuat. Simpan konfigurasi terlebih dahulu." });
			}

			const config = await prisma.eventTicketConfig.update({
				where: { eventId },
				data: {
					enabled: !existing.enabled,
				},
			});

			res.json(config);
		} catch (error) {
			console.error("Error toggling ticketing:", error);
			res.status(500).json({ error: "Gagal mengubah status ticketing" });
		}
	}
);

// PUT /api/tickets/admin/event/:eventId/config - Update ticket config
router.put(
	"/admin/event/:eventId/config",
	authenticate,
	authorize("SUPERADMIN", "PANITIA"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const eventId = await resolveEventId(req.params.eventId);
			if (!eventId) return res.status(404).json({ error: "Event tidak ditemukan" });

			const { enabled, price, quota, description, salesStartDate, salesEndDate } = req.body;

			const config = await prisma.eventTicketConfig.upsert({
				where: { eventId },
				create: {
					event: { connect: { id: eventId } },
					enabled: enabled ?? false,
					price: price ?? 0,
					quota: quota ?? 0,
					description: description || null,
					salesStartDate: salesStartDate ? new Date(salesStartDate) : null,
					salesEndDate: salesEndDate ? new Date(salesEndDate) : null,
				},
				update: {
					enabled: enabled ?? false,
					price: price ?? 0,
					quota: quota ?? 0,
					description: description || null,
					salesStartDate: salesStartDate ? new Date(salesStartDate) : null,
					salesEndDate: salesEndDate ? new Date(salesEndDate) : null,
				},
			});

			res.json(config);
		} catch (error) {
			console.error("Error updating ticket config:", error);
			res.status(500).json({ error: "Gagal menyimpan konfigurasi tiket" });
		}
	}
);

// GET /api/tickets/admin/event/:eventId/purchases - List ticket purchases for event
router.get(
	"/admin/event/:eventId/purchases",
	authenticate,
	authorize("SUPERADMIN", "PANITIA"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { status, search, page = "1", limit = "20" } = req.query;
			const pageNum = Math.max(1, parseInt(page as string));
			const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
			const skip = (pageNum - 1) * limitNum;

			const eventId = await resolveEventId(req.params.eventId);
			if (!eventId) return res.status(404).json({ error: "Event tidak ditemukan" });

			const where: any = { eventId };

			if (status) {
				where.status = status;
			}

			if (search) {
				where.OR = [
					{ buyerName: { contains: search as string, mode: "insensitive" } },
					{ buyerEmail: { contains: search as string, mode: "insensitive" } },
					{ ticketCode: { contains: search as string, mode: "insensitive" } },
				];
			}

			const [purchases, total] = await Promise.all([
				prisma.ticketPurchase.findMany({
					where,
					orderBy: { createdAt: "desc" },
					skip,
					take: limitNum,
				}),
				prisma.ticketPurchase.count({ where }),
			]);

			res.json({
				data: purchases,
				total,
				page: pageNum,
				totalPages: Math.ceil(total / limitNum),
			});
		} catch (error) {
			console.error("Error fetching ticket purchases:", error);
			res.status(500).json({ error: "Gagal memuat data pembelian tiket" });
		}
	}
);

// PATCH /api/tickets/admin/purchases/:purchaseId/status - Update purchase status
router.patch(
	"/admin/purchases/:purchaseId/status",
	authenticate,
	authorize("SUPERADMIN", "PANITIA"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { status } = req.body;
			const validStatuses: TicketStatus[] = ["PENDING", "PAID", "USED", "CANCELLED", "EXPIRED"];

			if (!validStatuses.includes(status)) {
				return res.status(400).json({ error: "Status tidak valid" });
			}

			const purchase = await prisma.ticketPurchase.findUnique({
				where: { id: req.params.purchaseId },
			});

			if (!purchase) {
				return res.status(404).json({ error: "Pembelian tiket tidak ditemukan" });
			}

			// Prevent marking as PAID if not yet paid via Midtrans
			if (status === "PAID" && !purchase.paidAt && purchase.status === "PENDING" && purchase.totalAmount > 0) {
				return res.status(400).json({ error: "Tiket belum dibayar via Midtrans. Tidak bisa dikonfirmasi sebelum pembayaran diterima." });
			}

			const updateData: any = { status };

			if (status === "PAID") {
				updateData.paidAt = new Date();
			} else if (status === "USED") {
				updateData.usedAt = new Date();
			}

			// If cancelling, restore quota
			if (status === "CANCELLED" && purchase.status !== "CANCELLED") {
				await prisma.eventTicketConfig.update({
					where: { eventId: purchase.eventId },
					data: { soldCount: { decrement: purchase.quantity } },
				});
			}

			const updated = await prisma.ticketPurchase.update({
				where: { id: req.params.purchaseId },
				data: updateData,
			});

			res.json(updated);
		} catch (error) {
			console.error("Error updating ticket status:", error);
			res.status(500).json({ error: "Gagal mengubah status tiket" });
		}
	}
);

// POST /api/tickets/admin/scan/:ticketCode - Scan and validate ticket (mark as USED)
router.post(
	"/admin/scan/:ticketCode",
	authenticate,
	authorize("SUPERADMIN", "PANITIA"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const ticket = await prisma.ticketPurchase.findUnique({
				where: { ticketCode: req.params.ticketCode },
				include: {
					event: {
						select: { id: true, title: true, startDate: true, endDate: true, venue: true, city: true },
					},
				},
			});

			if (!ticket) {
				return res.status(404).json({
					valid: false,
					error: "Tiket tidak ditemukan",
				});
			}

			if (ticket.status === "USED") {
				return res.status(400).json({
					valid: false,
					error: "Tiket sudah digunakan",
					usedAt: ticket.usedAt,
					ticket: {
						ticketCode: ticket.ticketCode,
						buyerName: ticket.buyerName,
						buyerEmail: ticket.buyerEmail,
						eventTitle: ticket.event.title,
						quantity: ticket.quantity,
						status: ticket.status,
					},
				});
			}

			if (ticket.status === "CANCELLED") {
				return res.status(400).json({
					valid: false,
					error: "Tiket telah dibatalkan",
					ticket: {
						ticketCode: ticket.ticketCode,
						buyerName: ticket.buyerName,
						status: ticket.status,
					},
				});
			}

			if (ticket.status === "EXPIRED") {
				return res.status(400).json({
					valid: false,
					error: "Tiket sudah kedaluwarsa",
					ticket: {
						ticketCode: ticket.ticketCode,
						buyerName: ticket.buyerName,
						status: ticket.status,
					},
				});
			}

			if (ticket.status === "PENDING") {
				return res.status(400).json({
					valid: false,
					error: "Tiket belum dibayar",
					ticket: {
						ticketCode: ticket.ticketCode,
						buyerName: ticket.buyerName,
						status: ticket.status,
					},
				});
			}

			// Status is PAID — mark as USED
			const updated = await prisma.ticketPurchase.update({
				where: { id: ticket.id },
				data: {
					status: "USED",
					usedAt: new Date(),
				},
			});

			res.json({
				valid: true,
				message: "Tiket berhasil diverifikasi",
				ticket: {
					ticketCode: updated.ticketCode,
					buyerName: updated.buyerName,
					buyerEmail: updated.buyerEmail,
					buyerPhone: updated.buyerPhone,
					eventTitle: ticket.event.title,
					eventDate: ticket.event.startDate,
					venue: ticket.event.venue,
					quantity: updated.quantity,
					status: updated.status,
					usedAt: updated.usedAt,
				},
			});
		} catch (error) {
			console.error("Error scanning ticket:", error);
			res.status(500).json({ valid: false, error: "Gagal memindai tiket" });
		}
	}
);

export default router;
