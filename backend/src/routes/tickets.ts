import { Router, Response } from "express";
import { TicketStatus } from "@prisma/client";
import {
	authenticate,
	authorize,
	optionalAuthenticate,
	AuthenticatedRequest,
} from "../middleware/auth";
import { prisma } from "../lib/prisma";
import crypto from "crypto";
import {
	createSnapTransaction,
	generateMidtransOrderId,
	PaymentPrefix,
} from "../lib/midtrans";
import { sendTicketEmailFromServer } from "../lib/email";

const router = Router();

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
				is: { enabled: true },
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

		// Debug logging for production troubleshooting
		if (total === 0) {
			const allTicketConfigs = await prisma.eventTicketConfig.findMany({
				where: { enabled: true },
				select: { eventId: true, enabled: true, event: { select: { id: true, title: true, status: true } } },
			});
			console.log("[tickets/events] No ticketed events found. Debug info:", {
				search: search || null,
				enabledTicketConfigs: allTicketConfigs.length,
				configs: allTicketConfigs.map(c => ({
					eventId: c.eventId,
					eventTitle: c.event.title,
					eventStatus: c.event.status,
					enabled: c.enabled,
				})),
			});
		}

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

// Max tickets per account per event
const MAX_TICKETS_PER_ACCOUNT = 5;

// POST /api/tickets/purchase - Purchase ticket (public, optional auth)
router.post("/purchase", optionalAuthenticate, async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { eventId, buyerName, buyerEmail, buyerPhone, attendees, notes } = req.body;

		if (!eventId || !buyerName || !buyerEmail) {
			return res.status(400).json({ error: "Event, nama, dan email pembeli wajib diisi" });
		}

		// Validate attendees array
		if (!attendees || !Array.isArray(attendees) || attendees.length < 1 || attendees.length > MAX_TICKETS_PER_ACCOUNT) {
			return res.status(400).json({ error: `Data peserta wajib diisi (maksimal ${MAX_TICKETS_PER_ACCOUNT} tiket)` });
		}

		// Validate each attendee
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		for (let i = 0; i < attendees.length; i++) {
			const att = attendees[i];
			if (!att.name || !att.name.trim()) {
				return res.status(400).json({ error: `Nama peserta tiket #${i + 1} wajib diisi` });
			}
			if (!att.email || !emailRegex.test(att.email.trim())) {
				return res.status(400).json({ error: `Email peserta tiket #${i + 1} tidak valid` });
			}
		}

		const quantity = attendees.length;
		// Validate buyer email format
		if (!emailRegex.test(buyerEmail)) {
			return res.status(400).json({ error: "Format email pembeli tidak valid" });
		}

		// Check existing purchases for this email + event (max 5 total)
		const existingPurchases = await prisma.ticketPurchase.aggregate({
			where: {
				eventId,
				buyerEmail: buyerEmail.trim(),
				status: { in: ["PENDING", "PAID", "USED"] },
			},
			_sum: { quantity: true },
		});
		const alreadyPurchased = existingPurchases._sum.quantity || 0;
		if (alreadyPurchased + quantity > MAX_TICKETS_PER_ACCOUNT) {
			const remaining = MAX_TICKETS_PER_ACCOUNT - alreadyPurchased;
			return res.status(400).json({
				error: remaining <= 0
					? `Anda sudah mencapai batas maksimal ${MAX_TICKETS_PER_ACCOUNT} tiket untuk event ini`
					: `Anda hanya bisa membeli ${remaining} tiket lagi untuk event ini (sudah memiliki ${alreadyPurchased} tiket)`,
			});
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
			const isFree = ticketConfig.price === 0;

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
					status: isFree ? "PAID" : "PENDING",
					paidAt: isFree ? new Date() : null,
					notes: notes || null,
				},
				include: {
					event: {
						select: { title: true, startDate: true, endDate: true, venue: true, city: true },
					},
				},
			});

			// Create individual attendee records with unique ticket codes
			const attendeeRecords = [];
			for (const att of attendees) {
				const attendeeCode = generateTicketCode();
				const attendeeRecord = await tx.ticketAttendee.create({
					data: {
						purchaseId: purchase.id,
						attendeeName: att.name.trim(),
						attendeeEmail: att.email.trim(),
						attendeePhone: att.phone?.trim() || null,
						ticketCode: attendeeCode,
						status: isFree ? "PAID" : "PENDING",
					},
				});
				attendeeRecords.push(attendeeRecord);
			}

			// Only update sold count for FREE tickets (paid tickets update via webhook after payment)
			if (isFree) {
				await tx.eventTicketConfig.update({
					where: { eventId },
					data: { soldCount: { increment: quantity } },
				});
			}

			return { ...purchase, attendees: attendeeRecords };
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
					adminFee: 2000 * result.quantity,
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
					attendees: result.attendees.map((a: any) => ({
						name: a.attendeeName,
						email: a.attendeeEmail,
						phone: a.attendeePhone,
						ticketCode: a.ticketCode,
					})),
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

// POST /api/tickets/send-email - Send ticket QR code to email (server-generated QR codes)
router.post("/send-email", async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { ticketCode, email } = req.body;

		if (!ticketCode || !email) {
			return res.status(400).json({ error: "Kode tiket dan email wajib diisi" });
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
				attendees: true,
			},
		});

		if (!ticket) {
			return res.status(404).json({ error: "Tiket tidak ditemukan" });
		}

		await sendTicketEmailFromServer({
			to: email,
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
				phone: a.attendeePhone,
				ticketCode: a.ticketCode,
			})),
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

			// Compute real soldCount from actual PAID/USED purchases
			const realSoldCount = await prisma.ticketPurchase.aggregate({
				where: { eventId, status: { in: ["PAID", "USED"] } },
				_sum: { quantity: true },
			});
			const actualSoldCount = realSoldCount._sum.quantity ?? 0;

			// Auto-fix if stored soldCount is out of sync
			if (actualSoldCount !== config.soldCount) {
				console.log(`[tickets] soldCount out of sync for event ${eventId}: stored=${config.soldCount}, actual=${actualSoldCount}. Auto-fixing.`);
				config = await prisma.eventTicketConfig.update({
					where: { eventId },
					data: { soldCount: actualSoldCount },
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
// POST /api/tickets/admin/event/:eventId/sync-sold-count - Recalculate soldCount from actual PAID/USED purchases
router.post(
	"/admin/event/:eventId/sync-sold-count",
	authenticate,
	authorize("SUPERADMIN", "PANITIA"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const eventId = await resolveEventId(req.params.eventId);
			if (!eventId) return res.status(404).json({ error: "Event tidak ditemukan" });

			const realSoldCount = await prisma.ticketPurchase.aggregate({
				where: { eventId, status: { in: ["PAID", "USED"] } },
				_sum: { quantity: true },
			});
			const actualSoldCount = realSoldCount._sum.quantity ?? 0;

			const config = await prisma.eventTicketConfig.update({
				where: { eventId },
				data: { soldCount: actualSoldCount },
			});

			console.log(`[tickets] soldCount synced for event ${eventId}: soldCount=${actualSoldCount}`);
			res.json({ message: `Sinkronisasi berhasil. Terjual: ${actualSoldCount} tiket`, config });
		} catch (error) {
			console.error("Error syncing sold count:", error);
			res.status(500).json({ error: "Gagal sinkronisasi data terjual" });
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

// GET /api/tickets/admin/event/:eventId/dashboard - Dashboard stats for ticket sales
router.get(
	"/admin/event/:eventId/dashboard",
	authenticate,
	authorize("SUPERADMIN", "PANITIA"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const eventId = await resolveEventId(req.params.eventId);
			if (!eventId) return res.status(404).json({ error: "Event tidak ditemukan" });

			const config = await prisma.eventTicketConfig.findUnique({ where: { eventId } });

			// Revenue by status
			const [paidStats, usedStats, cancelledCount, expiredCount, pendingCount] = await Promise.all([
				prisma.ticketPurchase.aggregate({
					where: { eventId, status: "PAID" },
					_sum: { totalAmount: true, quantity: true },
					_count: true,
				}),
				prisma.ticketPurchase.aggregate({
					where: { eventId, status: "USED" },
					_sum: { totalAmount: true, quantity: true },
					_count: true,
				}),
				prisma.ticketPurchase.count({ where: { eventId, status: "CANCELLED" } }),
				prisma.ticketPurchase.count({ where: { eventId, status: "EXPIRED" } }),
				prisma.ticketPurchase.count({ where: { eventId, status: "PENDING" } }),
			]);

			// Daily sales (last 30 days)
			const thirtyDaysAgo = new Date();
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
			const dailySales: { date: string; count: number; revenue: number }[] = [];

			const recentPurchases = await prisma.ticketPurchase.findMany({
				where: {
					eventId,
					status: { in: ["PAID", "USED"] },
					paidAt: { gte: thirtyDaysAgo },
				},
				select: { paidAt: true, totalAmount: true, quantity: true },
				orderBy: { paidAt: "asc" },
			});

			const salesByDate = new Map<string, { count: number; revenue: number; tickets: number }>();
			for (const p of recentPurchases) {
				const date = (p.paidAt || new Date()).toISOString().split("T")[0]!;
				const existing = salesByDate.get(date) || { count: 0, revenue: 0, tickets: 0 };
				existing.count += 1;
				existing.revenue += p.totalAmount;
				existing.tickets += p.quantity;
				salesByDate.set(date, existing);
			}
			for (const [date, data] of salesByDate) {
				dailySales.push({ date, ...data });
			}

			// Recent purchases (last 10)
			const recentTransactions = await prisma.ticketPurchase.findMany({
				where: { eventId, status: { in: ["PAID", "USED"] } },
				orderBy: { paidAt: "desc" },
				take: 10,
				select: {
					id: true,
					buyerName: true,
					buyerEmail: true,
					quantity: true,
					totalAmount: true,
					status: true,
					paidAt: true,
					ticketCode: true,
				},
			});

			const totalRevenue = (paidStats._sum.totalAmount ?? 0) + (usedStats._sum.totalAmount ?? 0);
			const totalTickets = (paidStats._sum.quantity ?? 0) + (usedStats._sum.quantity ?? 0);
			const totalTransactions = paidStats._count + usedStats._count;
			const checkedIn = usedStats._sum.quantity ?? 0;

			res.json({
				summary: {
					totalRevenue,
					totalTickets,
					totalTransactions,
					checkedIn,
					quota: config?.quota ?? 0,
					price: config?.price ?? 0,
					remaining: Math.max(0, (config?.quota ?? 0) - totalTickets),
				},
				breakdown: {
					paid: { count: paidStats._count, tickets: paidStats._sum.quantity ?? 0, revenue: paidStats._sum.totalAmount ?? 0 },
					used: { count: usedStats._count, tickets: usedStats._sum.quantity ?? 0, revenue: usedStats._sum.totalAmount ?? 0 },
					cancelled: cancelledCount,
					expired: expiredCount,
					pending: pendingCount,
				},
				dailySales,
				recentTransactions,
			});
		} catch (error) {
			console.error("Error fetching ticket dashboard:", error);
			res.status(500).json({ error: "Gagal memuat dashboard tiket" });
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
					include: { attendees: true },
				}),
				prisma.ticketPurchase.count({ where }),
			]);

			// Also compute count of PAID/USED purchases (for badge) and total tickets sold
			const [paidUsedCount, ticketsSold] = await Promise.all([
				prisma.ticketPurchase.count({
					where: { eventId, status: { in: ["PAID", "USED"] } },
				}),
				prisma.ticketPurchase.aggregate({
					where: { eventId, status: { in: ["PAID", "USED"] } },
					_sum: { quantity: true },
				}),
			]);

			res.json({
				data: purchases,
				total,
				paidUsedCount,
				totalTicketsSold: ticketsSold._sum.quantity ?? 0,
				page: pageNum,
				totalPages: Math.ceil(total / limitNum),
			});
		} catch (error) {
			console.error("Error fetching ticket purchases:", error);
			res.status(500).json({ error: "Gagal memuat data pembelian tiket" });
		}
	}
);

// PATCH /api/tickets/admin/purchases/:purchaseId/status - Update purchase status (USED/CANCELLED only)
router.patch(
	"/admin/purchases/:purchaseId/status",
	authenticate,
	authorize("SUPERADMIN", "PANITIA"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { status } = req.body;
			const validStatuses: TicketStatus[] = ["USED", "CANCELLED"];

			if (!validStatuses.includes(status)) {
				return res.status(400).json({ error: "Status tidak valid. Hanya USED dan CANCELLED yang diizinkan." });
			}

			const purchase = await prisma.ticketPurchase.findUnique({
				where: { id: req.params.purchaseId },
			});

			if (!purchase) {
				return res.status(404).json({ error: "Pembelian tiket tidak ditemukan" });
			}

			// USED only allowed from PAID status
			if (status === "USED" && purchase.status !== "PAID") {
				return res.status(400).json({ error: "Hanya tiket yang sudah dibayar yang bisa ditandai digunakan." });
			}

			// CANCELLED only allowed from PAID status
			if (status === "CANCELLED" && purchase.status !== "PAID") {
				return res.status(400).json({ error: "Hanya tiket yang sudah dibayar yang bisa dibatalkan." });
			}

			const updateData: any = { status };

			if (status === "USED") {
				updateData.usedAt = new Date();
			}

			// If cancelling, restore quota
			if (status === "CANCELLED") {
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
			const code = req.params.ticketCode;

			// First, check if it's an attendee ticket code
			const attendee = await prisma.ticketAttendee.findUnique({
				where: { ticketCode: code },
				include: {
					purchase: {
						include: {
							event: {
								select: { id: true, title: true, startDate: true, endDate: true, venue: true, city: true },
							},
						},
					},
				},
			});

			if (attendee) {
				// Validate attendee ticket
				if (attendee.status === "USED") {
					return res.status(400).json({
						valid: false,
						error: "Tiket sudah digunakan",
						usedAt: attendee.usedAt,
						ticket: {
							ticketCode: attendee.ticketCode,
							buyerName: attendee.attendeeName,
							buyerEmail: attendee.attendeeEmail,
							eventTitle: attendee.purchase.event.title,
							quantity: 1,
							status: attendee.status,
						},
					});
				}

					if (attendee.purchase.status === "CANCELLED") {
					return res.status(400).json({ valid: false, error: "Tiket telah dibatalkan" });
				}

				if (attendee.status === "PENDING" || attendee.purchase.status === "PENDING") {
					return res.status(400).json({ valid: false, error: "Tiket belum dibayar" });
				}

				// If purchase was scanned as a whole (USED) but attendee hasn't been marked yet, sync & block
				if (attendee.purchase.status === "USED") {
					// Auto-sync attendee status then reject to prevent re-entry
					await prisma.ticketAttendee.update({
						where: { id: attendee.id },
						data: { status: "USED", usedAt: new Date() },
					});
					return res.status(400).json({ valid: false, error: "Tiket ini sudah digunakan (seluruh paket tiket sudah di-scan)", ticket: { ticketCode: attendee.ticketCode, buyerName: attendee.attendeeName, status: "USED" } });
				}

				// Mark attendee ticket as USED
				const updated = await prisma.ticketAttendee.update({
					where: { id: attendee.id },
					data: { status: "USED", usedAt: new Date() },
				});

				return res.json({
					valid: true,
					message: "Tiket berhasil diverifikasi",
					ticket: {
						ticketCode: updated.ticketCode,
						buyerName: updated.attendeeName,
						buyerEmail: updated.attendeeEmail,
						buyerPhone: attendee.attendeePhone,
						eventTitle: attendee.purchase.event.title,
						eventDate: attendee.purchase.event.startDate,
						venue: attendee.purchase.event.venue,
						quantity: 1,
						status: updated.status,
						usedAt: updated.usedAt,
					},
				});
			}

			// Fallback: check legacy purchase ticket code
			const ticket = await prisma.ticketPurchase.findUnique({
				where: { ticketCode: code },
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

			// Status is PAID — mark purchase AND all attendees as USED atomically
			const usedAt = new Date();
			const [updated] = await prisma.$transaction([
				prisma.ticketPurchase.update({
					where: { id: ticket.id },
					data: { status: "USED", usedAt },
				}),
				prisma.ticketAttendee.updateMany({
					where: { purchaseId: ticket.id, status: "PAID" },
					data: { status: "USED", usedAt },
				}),
			]);

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

// POST /api/tickets/admin/resend-email/:purchaseId - Resend ticket email (admin troubleshoot)
router.post(
	"/admin/resend-email/:purchaseId",
	authenticate,
	authorize("SUPERADMIN", "PANITIA"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { email } = req.body;

			const purchase = await prisma.ticketPurchase.findUnique({
				where: { id: req.params.purchaseId },
				include: {
					event: {
						select: { title: true, startDate: true, venue: true, city: true },
					},
					attendees: true,
				},
			});

			if (!purchase) {
				return res.status(404).json({ error: "Pembelian tiket tidak ditemukan" });
			}

			if (purchase.status !== "PAID" && purchase.status !== "USED") {
				return res.status(400).json({ error: "Email hanya bisa dikirim untuk tiket yang sudah dibayar" });
			}

			const targetEmail = email?.trim() || purchase.buyerEmail;
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(targetEmail)) {
				return res.status(400).json({ error: "Format email tidak valid" });
			}

			await sendTicketEmailFromServer({
				to: targetEmail,
				buyerName: purchase.buyerName,
				ticketCode: purchase.ticketCode,
				eventTitle: purchase.event.title,
				eventDate: purchase.event.startDate.toISOString(),
				venue: purchase.event.venue,
				city: purchase.event.city,
				quantity: purchase.quantity,
				totalAmount: purchase.totalAmount,
				attendees: purchase.attendees.map((a) => ({
					name: a.attendeeName,
					email: a.attendeeEmail,
					phone: a.attendeePhone,
					ticketCode: a.ticketCode,
				})),
			});

			console.log(`[Admin] Ticket email resent to ${targetEmail} for purchase ${purchase.id} by admin ${req.user?.userId}`);

			res.json({ message: `Email tiket berhasil dikirim ke ${targetEmail}` });
		} catch (error: any) {
			console.error("Error resending ticket email:", error);
			res.status(500).json({ error: "Gagal mengirim email. Pastikan konfigurasi SMTP sudah benar." });
		}
	}
);

export default router;
