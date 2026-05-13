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
import { uploadTicketTeamLogo } from "../middleware/upload";

const router = Router();
type TicketTeamAssignmentInput = { attendeeId: string; ticketTeamId: string };
const REVENUE_SHARE_TICKET_TIERS = ["TICKETING", "TICKETING_VOTING", "BRONZE", "GOLD"];

const requiresTicketRevenueShareAgreement = (event: { packageTier?: string | null; platformSharePercent?: number | null }) =>
	!!event.packageTier && REVENUE_SHARE_TICKET_TIERS.includes(event.packageTier) && event.platformSharePercent === null;

// Resolve event slug or ID to actual event ID
const resolveEventId = async (eventIdOrSlug: string | undefined): Promise<string | null> => {
	if (!eventIdOrSlug) return null;
	const event = await prisma.event.findFirst({
		where: { OR: [{ id: eventIdOrSlug }, { slug: eventIdOrSlug }] },
		select: { id: true },
	});
	return event?.id || null;
};

// Generate unique ticket code with strong randomness
const generateTicketCode = (): string => {
	const random = crypto.randomBytes(10).toString("hex").toUpperCase();
	return `TKT-${random.slice(0, 8)}-${random.slice(8)}`;
};

const getTicketTeamStandings = async (eventId: string) => {
	const [teams, groupedViewers] = await Promise.all([
		prisma.ticketTeam.findMany({
			where: { eventId },
			orderBy: { createdAt: "asc" },
		}),
		prisma.ticketAttendee.groupBy({
			by: ["ticketTeamId"],
			where: {
				ticketTeamId: { not: null },
				status: { in: ["PAID", "USED"] },
				purchase: {
					eventId,
					status: { in: ["PAID", "USED"] },
				},
			},
			_count: { _all: true },
		}),
	]);

	const viewerMap = new Map(groupedViewers.map((row) => [row.ticketTeamId, row._count._all]));
	return teams
		.map((team) => ({
			...team,
			viewerCount: viewerMap.get(team.id) ?? 0,
		}))
		.sort((a, b) => b.viewerCount - a.viewerCount || a.teamName.localeCompare(b.teamName));
};

// Verify PANITIA owns the event (SUPERADMIN bypasses)
const verifyEventOwnership = async (
	req: AuthenticatedRequest,
	eventId: string
): Promise<boolean> => {
	if (req.user?.role === "SUPERADMIN") return true;
	const event = await prisma.event.findUnique({
		where: { id: eventId },
		select: { createdById: true },
	});
	return event?.createdById === req.user?.userId;
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
							ticketTeamSelectionEnabled: true,
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
						ticketTeamSelectionEnabled: true,
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

// GET /api/tickets/events/:eventId/teams - List ticketing teams for public purchase form
router.get("/events/:eventId/teams", async (req: AuthenticatedRequest, res: Response) => {
	try {
		const eventId = await resolveEventId(req.params.eventId);
		if (!eventId) return res.status(404).json({ error: "Event tidak ditemukan" });

		const event = await prisma.event.findUnique({
			where: { id: eventId },
			select: { ticketConfig: { select: { enabled: true, ticketTeamSelectionEnabled: true } } },
		});

		if (!event?.ticketConfig?.enabled) {
			return res.status(404).json({ error: "Tiket tidak tersedia untuk event ini" });
		}

		if (!event.ticketConfig.ticketTeamSelectionEnabled) {
			return res.json([]);
		}

		res.json(await getTicketTeamStandings(eventId));
	} catch (error) {
		console.error("Error fetching ticket teams:", error);
		res.status(500).json({ error: "Gagal memuat daftar pasukan" });
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
			if (!att) {
				return res.status(400).json({ error: `Data peserta tiket #${i + 1} tidak valid` });
			}
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

		const ticketSettings = await prisma.eventTicketConfig.findUnique({
			where: { eventId },
			select: { enabled: true, ticketTeamSelectionEnabled: true },
		});

		if (!ticketSettings?.enabled) {
			return res.status(400).json({ error: "Tiket tidak tersedia untuk event ini" });
		}

		if (ticketSettings.ticketTeamSelectionEnabled) {
			const ticketTeams = await prisma.ticketTeam.findMany({
				where: { eventId },
				select: { id: true },
			});
			if (ticketTeams.length === 0) {
				return res.status(400).json({ error: "Panitia belum menambahkan pasukan untuk pilihan penonton" });
			}

			const validTeamIds = new Set(ticketTeams.map((team) => team.id));
			for (let i = 0; i < attendees.length; i++) {
				const attendee = attendees[i];
				if (!attendee) continue;
				const ticketTeamId = String(attendee.ticketTeamId || "").trim();
				if (!ticketTeamId) {
					return res.status(400).json({ error: `Pasukan yang ditonton untuk tiket #${i + 1} wajib dipilih` });
				}
				if (!validTeamIds.has(ticketTeamId)) {
					return res.status(400).json({ error: `Pasukan yang dipilih untuk tiket #${i + 1} tidak valid` });
				}
			}
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
			// Atomically reserve tickets: increment soldCount only if quota allows.
			// This single UPDATE is concurrency-safe — no race condition possible.
			// soldCount is reserved immediately for BOTH free and paid tickets.
			// Failed/expired payments will release the reservation via webhook.
			const reserved = await tx.$executeRaw`
				UPDATE "event_ticket_configs"
				SET "sold_count" = "sold_count" + ${quantity}
				WHERE "event_id" = ${eventId}
					AND "enabled" = true
					AND "sold_count" + ${quantity} <= "quota"
					AND (
						"sales_start_date" IS NULL
						OR "sales_start_date" <= NOW()
					)
					AND (
						"sales_end_date" IS NULL
						OR "sales_end_date" >= NOW()
					)
			`;

			if (reserved === 0) {
				// Check why it failed for a specific error message
				const config = await tx.eventTicketConfig.findUnique({
					where: { eventId },
					select: { enabled: true, quota: true, soldCount: true, salesStartDate: true, salesEndDate: true },
				});
				if (!config || !config.enabled) throw new Error("Tiket tidak tersedia untuk event ini");
				const now = new Date();
				if (config.salesStartDate && now < config.salesStartDate) throw new Error("Penjualan tiket belum dimulai");
				if (config.salesEndDate && now > config.salesEndDate) throw new Error("Penjualan tiket sudah ditutup");
				const remaining = config.quota - config.soldCount;
				throw new Error(remaining === 0 ? "Tiket sudah habis" : `Sisa tiket hanya ${remaining}`);
			}

			// Get ticket price after reservation is confirmed
			const ticketConfig = await tx.eventTicketConfig.findUnique({
				where: { eventId },
				select: { price: true, description: true },
			});

			// Create purchase
			const ticketCode = generateTicketCode();
			const totalAmount = (ticketConfig?.price ?? 0) * quantity;
			const isFree = (ticketConfig?.price ?? 0) === 0;

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
						ticketTeamId: ticketSettings.ticketTeamSelectionEnabled ? String(att.ticketTeamId).trim() : null,
						attendeeName: att.name.trim(),
						attendeeEmail: att.email.trim(),
						attendeePhone: att.phone?.trim() || null,
						ticketCode: attendeeCode,
						status: isFree ? "PAID" : "PENDING",
					},
					include: {
						ticketTeam: true,
					},
				});
				attendeeRecords.push(attendeeRecord);
			}

			// soldCount already incremented atomically above for both free and paid tickets

			return { ...purchase, attendees: attendeeRecords, ticketDescription: ticketConfig?.description || null };
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
					ticketDescription: result.ticketDescription,
					attendees: result.attendees.map((a: any) => ({
						name: a.attendeeName,
						email: a.attendeeEmail,
						phone: a.attendeePhone,
						ticketCode: a.ticketCode,
						supportTeam: a.ticketTeam?.teamName || null,
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

// GET /api/tickets/check/:ticketCode - Check ticket status by code (requires auth)
router.get("/check/:ticketCode", authenticate, async (req: AuthenticatedRequest, res: Response) => {
	try {
		const ticket = await prisma.ticketPurchase.findUnique({
			where: { ticketCode: req.params.ticketCode },
			include: {
				event: {
					select: { title: true, startDate: true, endDate: true, venue: true, city: true, createdById: true },
				},
			},
		});

		if (!ticket) {
			return res.status(404).json({ error: "Tiket tidak ditemukan" });
		}

		// Only allow: ticket owner, event organizer, or superadmin
		const isOwner = ticket.userId === req.user?.userId || ticket.buyerEmail === req.user?.email;
		const isOrganizer = ticket.event.createdById === req.user?.userId;
		const isSuperadmin = req.user?.role === "SUPERADMIN";
		if (!isOwner && !isOrganizer && !isSuperadmin) {
			return res.status(403).json({ error: "Tidak memiliki akses" });
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

// POST /api/tickets/send-email - Send ticket QR code to email (requires auth)
router.post("/send-email", authenticate, async (req: AuthenticatedRequest, res: Response) => {
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
					select: {
						title: true,
						startDate: true,
						venue: true,
						city: true,
						ticketConfig: { select: { description: true } },
					},
				},
				attendees: { include: { ticketTeam: true } },
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
			ticketDescription: ticket.event.ticketConfig?.description || null,
			attendees: ticket.attendees.map((a) => ({
				name: a.attendeeName,
				email: a.attendeeEmail,
				phone: a.attendeePhone,
				ticketCode: a.ticketCode,
				supportTeam: a.ticketTeam?.teamName || null,
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

			// Verify PANITIA only accesses their own events
			if (!(await verifyEventOwnership(req, eventId))) {
				return res.status(403).json({ error: "Tidak memiliki akses ke event ini" });
			}

			const event = await prisma.event.findUnique({
				where: { id: eventId },
				select: {
					startDate: true,
					endDate: true,
					registrationDeadline: true,
					packageTier: true,
					paymentStatus: true,
					platformSharePercent: true,
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
					ticketTeamSelectionEnabled: true,
					price: 0,
					quota: 0,
					soldCount: 0,
					description: null,
					salesStartDate: null,
					salesEndDate: null,
					event: event || null,
				});
			}

			// Compute real soldCount from active reservations (PENDING + PAID + USED)
			const realSoldCount = await prisma.ticketPurchase.aggregate({
				where: { eventId, status: { in: ["PENDING", "PAID", "USED"] } },
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
// POST /api/tickets/admin/event/:eventId/sync-sold-count - Recalculate soldCount from actual reservations
router.post(
	"/admin/event/:eventId/sync-sold-count",
	authenticate,
	authorize("SUPERADMIN", "PANITIA"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const eventId = await resolveEventId(req.params.eventId);
			if (!eventId) return res.status(404).json({ error: "Event tidak ditemukan" });

			if (!(await verifyEventOwnership(req, eventId))) {
				return res.status(403).json({ error: "Tidak memiliki akses ke event ini" });
			}

			// Count PENDING + PAID + USED (all active reservations)
			const realSoldCount = await prisma.ticketPurchase.aggregate({
				where: { eventId, status: { in: ["PENDING", "PAID", "USED"] } },
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

			if (!(await verifyEventOwnership(req, eventId))) {
				return res.status(403).json({ error: "Tidak memiliki akses ke event ini" });
			}

			const existing = await prisma.eventTicketConfig.findUnique({
				where: { eventId },
			});
			const event = await prisma.event.findUnique({
				where: { id: eventId },
				select: { packageTier: true, platformSharePercent: true },
			});

			if (!existing) {
				return res.status(404).json({ error: "Konfigurasi tiket belum dibuat. Simpan konfigurasi terlebih dahulu." });
			}

			if (!existing.enabled && event && requiresTicketRevenueShareAgreement(event)) {
				return res.status(400).json({
					error: "Penjualan tiket belum bisa dibuka. Hubungi admin untuk negosiasi dan pengaturan persentase bagi hasil terlebih dahulu.",
				});
			}

			if (!existing.enabled && existing.ticketTeamSelectionEnabled) {
				const teamCount = await prisma.ticketTeam.count({ where: { eventId } });
				if (teamCount === 0) {
					return res.status(400).json({ error: "Tambahkan minimal satu pasukan/sekolah sebelum membuka penjualan tiket berbasis pasukan." });
				}
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

			if (!(await verifyEventOwnership(req, eventId))) {
				return res.status(403).json({ error: "Tidak memiliki akses ke event ini" });
			}

			const { enabled, ticketTeamSelectionEnabled, price, quota, description, salesStartDate, salesEndDate } = req.body;
			const normalizedTicketTeamSelectionEnabled = ticketTeamSelectionEnabled !== undefined
				? Boolean(ticketTeamSelectionEnabled)
				: true;
			const event = await prisma.event.findUnique({
				where: { id: eventId },
				select: { packageTier: true, platformSharePercent: true },
			});

			if (enabled && event && requiresTicketRevenueShareAgreement(event)) {
				return res.status(400).json({
					error: "Penjualan tiket belum bisa diaktifkan. Hubungi admin untuk negosiasi dan pengaturan persentase bagi hasil terlebih dahulu.",
				});
			}

			if (enabled && normalizedTicketTeamSelectionEnabled) {
				const teamCount = await prisma.ticketTeam.count({ where: { eventId } });
				if (teamCount === 0) {
					return res.status(400).json({ error: "Tambahkan minimal satu pasukan/sekolah atau nonaktifkan mode wajib pilih pasukan sebelum mengaktifkan ticketing." });
				}
			}

			const config = await prisma.eventTicketConfig.upsert({
				where: { eventId },
				create: {
					event: { connect: { id: eventId } },
					enabled: enabled ?? false,
					ticketTeamSelectionEnabled: normalizedTicketTeamSelectionEnabled,
					price: price ?? 0,
					quota: quota ?? 0,
					description: description || null,
					salesStartDate: salesStartDate ? new Date(salesStartDate) : null,
					salesEndDate: salesEndDate ? new Date(salesEndDate) : null,
				},
				update: {
					enabled: enabled ?? false,
					ticketTeamSelectionEnabled: normalizedTicketTeamSelectionEnabled,
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

// GET /api/tickets/admin/event/:eventId/teams - Manage manual ticketing teams
router.get(
	"/admin/event/:eventId/teams",
	authenticate,
	authorize("SUPERADMIN", "PANITIA"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const eventId = await resolveEventId(req.params.eventId);
			if (!eventId) return res.status(404).json({ error: "Event tidak ditemukan" });

			if (!(await verifyEventOwnership(req, eventId))) {
				return res.status(403).json({ error: "Tidak memiliki akses ke event ini" });
			}

			res.json(await getTicketTeamStandings(eventId));
		} catch (error) {
			console.error("Error fetching ticket teams:", error);
			res.status(500).json({ error: "Gagal memuat daftar pasukan ticketing" });
		}
	}
);

// POST /api/tickets/admin/event/:eventId/teams - Add manual ticketing team
router.post(
	"/admin/event/:eventId/teams",
	authenticate,
	authorize("SUPERADMIN", "PANITIA"),
	uploadTicketTeamLogo.single("ticketTeamLogo"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const eventId = await resolveEventId(req.params.eventId);
			if (!eventId) return res.status(404).json({ error: "Event tidak ditemukan" });

			if (!(await verifyEventOwnership(req, eventId))) {
				return res.status(403).json({ error: "Tidak memiliki akses ke event ini" });
			}

			const teamName = String(req.body.teamName || "").trim();
			const schoolName = String(req.body.schoolName || "").trim();
			if (!teamName) {
				return res.status(400).json({ error: "Nama pasukan/sekolah wajib diisi" });
			}

			let logoUrl: string | null = null;
			if (req.file) {
				logoUrl = `/uploads/ticket-teams/${req.file.filename}`;
			} else if (req.body.logoUrl) {
				logoUrl = String(req.body.logoUrl).trim();
			}

			const team = await prisma.ticketTeam.create({
				data: {
					eventId,
					teamName,
					schoolName: schoolName || null,
					logoUrl,
				},
			});

			res.status(201).json({ ...team, viewerCount: 0 });
		} catch (error) {
			console.error("Error creating ticket team:", error);
			res.status(500).json({ error: "Gagal menambahkan pasukan ticketing" });
		}
	}
);

// DELETE /api/tickets/admin/teams/:teamId - Delete manual ticketing team
router.delete(
	"/admin/teams/:teamId",
	authenticate,
	authorize("SUPERADMIN", "PANITIA"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const team = await prisma.ticketTeam.findUnique({
				where: { id: req.params.teamId },
				select: { id: true, eventId: true },
			});
			if (!team) return res.status(404).json({ error: "Pasukan ticketing tidak ditemukan" });

			if (!(await verifyEventOwnership(req, team.eventId))) {
				return res.status(403).json({ error: "Tidak memiliki akses ke event ini" });
			}

			const viewerCount = await prisma.ticketAttendee.count({
				where: { ticketTeamId: team.id },
			});
			if (viewerCount > 0) {
				return res.status(400).json({ error: "Pasukan sudah dipilih oleh penonton dan tidak bisa dihapus." });
			}

			await prisma.ticketTeam.delete({ where: { id: team.id } });
			res.json({ message: "Pasukan ticketing berhasil dihapus" });
		} catch (error) {
			console.error("Error deleting ticket team:", error);
			res.status(500).json({ error: "Gagal menghapus pasukan ticketing" });
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

			if (!(await verifyEventOwnership(req, eventId))) {
				return res.status(403).json({ error: "Tidak memiliki akses ke event ini" });
			}

			const config = await prisma.eventTicketConfig.findUnique({ where: { eventId } });

			// Revenue by status
			const [paidStats, usedStats, cancelledCount, expiredCount, pendingCount, checkedInCount] = await Promise.all([
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
				prisma.ticketAttendee.count({ where: { status: "USED", purchase: { eventId } } }),
			]);
			const teamStandings = await getTicketTeamStandings(eventId);

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
			const checkedIn = checkedInCount;

			res.json({
				summary: {
					totalRevenue,
					totalTickets,
					totalTransactions,
					checkedIn,
					quota: config?.quota ?? 0,
					price: config?.price ?? 0,
					remaining: Math.max(0, (config?.quota ?? 0) - (config?.soldCount ?? totalTickets)),
				},
				breakdown: {
					paid: { count: paidStats._count, tickets: paidStats._sum.quantity ?? 0, revenue: paidStats._sum.totalAmount ?? 0 },
					used: { count: usedStats._count, tickets: checkedInCount, revenue: usedStats._sum.totalAmount ?? 0 },
					cancelled: cancelledCount,
					expired: expiredCount,
					pending: pendingCount,
				},
				dailySales,
				recentTransactions,
				teamStandings,
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

			if (!(await verifyEventOwnership(req, eventId))) {
				return res.status(403).json({ error: "Tidak memiliki akses ke event ini" });
			}

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
					include: { attendees: { include: { ticketTeam: true } } },
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

			if (status === "CANCELLED") {
				const usedAttendeeCount = await prisma.ticketAttendee.count({
					where: { purchaseId: purchase.id, status: "USED" },
				});
				if (usedAttendeeCount > 0) {
					return res.status(400).json({ error: "Tiket tidak bisa dibatalkan karena sebagian tiket sudah digunakan." });
				}
			}

			const updated = await prisma.$transaction(async (tx) => {
				if (status === "USED") {
					const usedAt = new Date();
					await tx.ticketAttendee.updateMany({
						where: { purchaseId: purchase.id, status: "PAID" },
						data: { status: "USED", usedAt },
					});
					return tx.ticketPurchase.update({
						where: { id: purchase.id },
						data: { status, usedAt },
					});
				}

				await tx.ticketAttendee.updateMany({
					where: { purchaseId: purchase.id, status: { in: ["PAID", "PENDING"] } },
					data: { status: "CANCELLED" },
				});
				await tx.eventTicketConfig.update({
					where: { eventId: purchase.eventId },
					data: { soldCount: { decrement: purchase.quantity } },
				});
				return tx.ticketPurchase.update({
					where: { id: purchase.id },
					data: { status: "CANCELLED" },
				});
			});

			res.json(updated);
		} catch (error) {
			console.error("Error updating ticket status:", error);
			res.status(500).json({ error: "Gagal mengubah status tiket" });
		}
	}
);

// PATCH /api/tickets/admin/purchases/:purchaseId/attendees - Assign or update watched team per ticket
router.patch(
	"/admin/purchases/:purchaseId/attendees",
	authenticate,
	authorize("SUPERADMIN", "PANITIA"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const rawAssignments = Array.isArray(req.body.assignments) ? req.body.assignments : [];
			const fallbackTicketTeamId = typeof req.body.ticketTeamId === "string" ? req.body.ticketTeamId.trim() : "";

			const purchase = await prisma.ticketPurchase.findUnique({
				where: { id: req.params.purchaseId },
				include: { attendees: true },
			});

			if (!purchase) {
				return res.status(404).json({ error: "Pembelian tiket tidak ditemukan" });
			}

			if (!(await verifyEventOwnership(req, purchase.eventId))) {
				return res.status(403).json({ error: "Tidak memiliki akses ke event ini" });
			}

			if (purchase.status === "CANCELLED" || purchase.status === "EXPIRED") {
				return res.status(400).json({ error: "Pilihan pasukan tidak bisa diubah untuk tiket dibatalkan atau kedaluwarsa" });
			}

			const assignments: TicketTeamAssignmentInput[] = rawAssignments.length > 0
				? rawAssignments.map((item: any) => ({
					attendeeId: typeof item.attendeeId === "string" ? item.attendeeId.trim() : "",
					ticketTeamId: typeof item.ticketTeamId === "string" ? item.ticketTeamId.trim() : "",
				}))
				: fallbackTicketTeamId
					? Array.from({ length: purchase.attendees.length || purchase.quantity }, () => ({ attendeeId: "", ticketTeamId: fallbackTicketTeamId }))
					: [];

			if (assignments.length === 0 || assignments.some((item) => !item.ticketTeamId)) {
				return res.status(400).json({ error: "Pilihan pasukan wajib diisi" });
			}

			const uniqueTeamIds = Array.from(new Set(assignments.map((item) => item.ticketTeamId)));
			const validTeamCount = await prisma.ticketTeam.count({
				where: { id: { in: uniqueTeamIds }, eventId: purchase.eventId },
			});

			if (validTeamCount !== uniqueTeamIds.length) {
				return res.status(400).json({ error: "Pilihan pasukan tidak valid untuk event ini" });
			}

			if (purchase.attendees.length > 0) {
				const attendeeIds = new Set(purchase.attendees.map((att) => att.id));
				if (assignments.some((item) => !item.attendeeId || !attendeeIds.has(item.attendeeId))) {
					return res.status(400).json({ error: "Data tiket peserta tidak valid" });
				}

				await prisma.$transaction(async (tx) => {
					for (const assignment of assignments) {
						await tx.ticketAttendee.update({
							where: { id: assignment.attendeeId },
							data: { ticketTeamId: assignment.ticketTeamId },
						});
					}
				});
			} else {
				if (assignments.length !== purchase.quantity) {
					return res.status(400).json({ error: `Tentukan pasukan untuk ${purchase.quantity} tiket` });
				}

				await prisma.$transaction(async (tx) => {
					for (let i = 0; i < assignments.length; i++) {
						const assignment = assignments[i]!;
						await tx.ticketAttendee.create({
							data: {
								purchaseId: purchase.id,
								ticketTeamId: assignment.ticketTeamId,
								attendeeName: assignments.length === 1 ? purchase.buyerName : `${purchase.buyerName} #${i + 1}`,
								attendeeEmail: purchase.buyerEmail,
								attendeePhone: purchase.buyerPhone,
								ticketCode: generateTicketCode(),
								status: purchase.status,
								usedAt: purchase.status === "USED" ? purchase.usedAt || new Date() : null,
							},
						});
					}
				});
			}

			const updated = await prisma.ticketPurchase.findUnique({
				where: { id: purchase.id },
				include: { attendees: { include: { ticketTeam: true } } },
			});

			res.json(updated);
		} catch (error) {
			console.error("Error updating ticket attendee teams:", error);
			res.status(500).json({ error: "Gagal mengubah pilihan pasukan tiket" });
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
								select: { id: true, title: true, startDate: true, endDate: true, venue: true, city: true, createdById: true },
							},
						},
					},
					ticketTeam: true,
				},
			});

			if (attendee) {
				// Verify PANITIA owns this event
				if (!(await verifyEventOwnership(req, attendee.purchase.event.id))) {
					return res.status(403).json({ error: "Tidak memiliki akses ke event ini" });
				}

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
							ticketTeam: attendee.ticketTeam,
						},
					});
				}

				if (attendee.status === "CANCELLED" || attendee.purchase.status === "CANCELLED") {
					return res.status(400).json({
						valid: false,
						error: "Tiket telah dibatalkan",
						ticket: {
							ticketCode: attendee.ticketCode,
							buyerName: attendee.attendeeName,
							buyerEmail: attendee.attendeeEmail,
							eventTitle: attendee.purchase.event.title,
							quantity: 1,
							status: "CANCELLED",
							ticketTeam: attendee.ticketTeam,
						},
					});
				}

				if (attendee.status === "EXPIRED" || attendee.purchase.status === "EXPIRED") {
					return res.status(400).json({
						valid: false,
						error: "Tiket sudah kedaluwarsa",
						ticket: {
							ticketCode: attendee.ticketCode,
							buyerName: attendee.attendeeName,
							buyerEmail: attendee.attendeeEmail,
							eventTitle: attendee.purchase.event.title,
							quantity: 1,
							status: "EXPIRED",
							ticketTeam: attendee.ticketTeam,
						},
					});
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

				// Mark attendee ticket as USED and close the purchase once all attendee tickets are used.
				const usedAt = new Date();
				const updated = await prisma.$transaction(async (tx) => {
					const updatedAttendee = await tx.ticketAttendee.update({
						where: { id: attendee.id },
						data: { status: "USED", usedAt },
					});

					const remainingPaidAttendees = await tx.ticketAttendee.count({
						where: { purchaseId: attendee.purchaseId, status: "PAID" },
					});
					if (remainingPaidAttendees === 0 && attendee.purchase.status === "PAID") {
						await tx.ticketPurchase.update({
							where: { id: attendee.purchaseId },
							data: { status: "USED", usedAt },
						});
					}

					return updatedAttendee;
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
						ticketTeam: attendee.ticketTeam,
					},
				});
			}

			// Fallback: check legacy purchase ticket code
			const ticket = await prisma.ticketPurchase.findUnique({
				where: { ticketCode: code },
				include: {
					event: {
						select: { id: true, title: true, startDate: true, endDate: true, venue: true, city: true, createdById: true },
					},
				},
			});

			if (!ticket) {
				return res.status(404).json({
					valid: false,
					error: "Tiket tidak ditemukan",
				});
			}

			// Verify PANITIA owns this event
			if (!(await verifyEventOwnership(req, ticket.event.id))) {
				return res.status(403).json({ error: "Tidak memiliki akses ke event ini" });
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
						select: {
							title: true,
							startDate: true,
							venue: true,
							city: true,
							ticketConfig: { select: { description: true } },
						},
					},
					attendees: { include: { ticketTeam: true } },
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
				ticketDescription: purchase.event.ticketConfig?.description || null,
				attendees: purchase.attendees.map((a) => ({
					name: a.attendeeName,
					email: a.attendeeEmail,
					phone: a.attendeePhone,
					ticketCode: a.ticketCode,
					supportTeam: a.ticketTeam?.teamName || null,
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
