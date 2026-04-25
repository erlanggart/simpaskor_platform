import { Router, Response } from "express";
import { DisbursementStatus } from "@prisma/client";
import {
	authenticate,
	authorize,
	AuthenticatedRequest,
} from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router = Router();

// ==========================================
// PANITIA ROUTES - Request Disbursement
// ==========================================

// GET /api/disbursements/event/:eventId - Get disbursements for an event (panitia + superadmin)
router.get(
	"/event/:eventId",
	authenticate,
	authorize("SUPERADMIN", "PANITIA"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { eventId } = req.params;

			const event = await prisma.event.findUnique({
				where: { id: eventId },
				select: { id: true, title: true, startDate: true, createdById: true },
			});

			if (!event) {
				return res.status(404).json({ error: "Event tidak ditemukan" });
			}

			// Panitia can only see their own event's disbursements
			if (req.user?.role === "PANITIA" && event.createdById !== req.user.userId) {
				return res.status(403).json({ error: "Tidak memiliki akses" });
			}

			// Get total revenue from ticket + voting sales
			const [ticketRevenue, votingRevenue] = await Promise.all([
				prisma.ticketPurchase.aggregate({
					where: { eventId, status: { in: ["PAID", "USED"] } },
					_sum: { totalAmount: true },
				}),
				prisma.votingPurchase.aggregate({
					where: { eventId, status: "PAID" },
					_sum: { totalAmount: true },
				}),
			]);

			const totalRevenue = (ticketRevenue._sum.totalAmount ?? 0) + (votingRevenue._sum.totalAmount ?? 0);

			// Get all disbursements for this event
			const disbursements = await prisma.disbursement.findMany({
				where: { eventId },
				orderBy: { createdAt: "desc" },
				include: {
					requestedBy: { select: { id: true, name: true, email: true } },
					processedBy: { select: { id: true, name: true, email: true } },
				},
			});

			// Calculate totals
			const totalDisbursed = disbursements
				.filter((d) => d.status === "TRANSFERRED")
				.reduce((sum, d) => sum + d.amount, 0);
			const totalPending = disbursements
				.filter((d) => d.status === "PENDING" || d.status === "APPROVED")
				.reduce((sum, d) => sum + d.amount, 0);
			const remainingBalance = totalRevenue - totalDisbursed - totalPending;

			res.json({
				event: { id: event.id, title: event.title, startDate: event.startDate },
				summary: {
					totalRevenue,
					ticketRevenue: ticketRevenue._sum.totalAmount ?? 0,
					votingRevenue: votingRevenue._sum.totalAmount ?? 0,
					totalDisbursed,
					totalPending,
					remainingBalance,
				},
				disbursements,
			});
		} catch (error) {
			console.error("Error fetching disbursements:", error);
			res.status(500).json({ error: "Gagal memuat data pencairan" });
		}
	}
);

// POST /api/disbursements/event/:eventId/request - Request a new disbursement
router.post(
	"/event/:eventId/request",
	authenticate,
	authorize("SUPERADMIN", "PANITIA"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { eventId } = req.params;
			const { amount, bankName, accountNumber, accountHolder, notes } = req.body;

			const parsedAmount = Number(amount);
			if (!parsedAmount || !Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > 10_000_000_000) {
				return res.status(400).json({ error: "Jumlah pencairan tidak valid" });
			}
			if (!bankName?.trim() || !accountNumber?.trim() || !accountHolder?.trim()) {
				return res.status(400).json({ error: "Data rekening bank wajib diisi lengkap" });
			}

			const event = await prisma.event.findUnique({
				where: { id: eventId },
				select: { id: true, title: true, startDate: true, createdById: true },
			});

			if (!event) {
				return res.status(404).json({ error: "Event tidak ditemukan" });
			}

			// Panitia can only request for their own event
			if (req.user?.role === "PANITIA" && event.createdById !== req.user?.userId) {
				return res.status(403).json({ error: "Tidak memiliki akses" });
			}

			// Check H-4 rule: can only request disbursement if event is at least 4 days away
			const now = new Date();
			const eventDate = new Date(event.startDate);
			const diffDays = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
			if (diffDays < 4) {
				return res.status(400).json({
					error: `Pengajuan pencairan hanya bisa dilakukan maksimal H-4 sebelum event. Event dimulai dalam ${diffDays} hari.`,
				});
			}

			// Calculate available balance and create disbursement in a single transaction
			// to prevent race condition where multiple requests pass the balance check
			const disbursement = await prisma.$transaction(async (tx) => {
				// Lock existing disbursements for this event to prevent concurrent requests
				await tx.$queryRaw`SELECT id FROM "Disbursement" WHERE "eventId" = ${eventId} FOR UPDATE`;

				const [ticketRevenue, votingRevenue] = await Promise.all([
					tx.ticketPurchase.aggregate({
						where: { eventId, status: { in: ["PAID", "USED"] } },
						_sum: { totalAmount: true },
					}),
					tx.votingPurchase.aggregate({
						where: { eventId, status: "PAID" },
						_sum: { totalAmount: true },
					}),
				]);

				const totalRevenue = (ticketRevenue._sum.totalAmount ?? 0) + (votingRevenue._sum.totalAmount ?? 0);

				const existingDisbursements = await tx.disbursement.findMany({
					where: { eventId, status: { in: ["PENDING", "APPROVED", "TRANSFERRED"] } },
				});

				const totalCommitted = existingDisbursements.reduce((sum, d) => sum + d.amount, 0);
				const availableBalance = totalRevenue - totalCommitted;

				if (parsedAmount > availableBalance) {
					throw new Error(`Saldo tidak mencukupi. Saldo tersedia: Rp ${availableBalance.toLocaleString("id-ID")}`);
				}

				return tx.disbursement.create({
					data: {
						eventId: event.id,
						requestedById: req.user!.userId,
						amount: parsedAmount,
						bankName: bankName.trim(),
						accountNumber: accountNumber.trim(),
						accountHolder: accountHolder.trim(),
						notes: notes?.trim() || null,
					},
					include: {
						requestedBy: { select: { id: true, name: true, email: true } },
					},
				});
			});

			res.status(201).json({
				message: "Pengajuan pencairan berhasil dibuat",
				disbursement,
			});
		} catch (error: any) {
			// Handle balance insufficient error from transaction
			if (error.message?.includes("Saldo tidak mencukupi")) {
				return res.status(400).json({ error: error.message });
			}
			console.error("Error creating disbursement:", error);
			res.status(500).json({ error: "Gagal membuat pengajuan pencairan" });
		}
	}
);

// ==========================================
// SUPERADMIN ROUTES - Manage Disbursements
// ==========================================

// GET /api/disbursements/admin/all - Get all disbursements across all events (superadmin only)
router.get(
	"/admin/all",
	authenticate,
	authorize("SUPERADMIN"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { status, page = "1", limit = "20", search } = req.query;
			const pageNum = Math.max(1, parseInt(page as string));
			const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
			const skip = (pageNum - 1) * limitNum;

			const where: any = {};
			if (status) where.status = status;
			if (search) {
				where.OR = [
					{ event: { title: { contains: search as string, mode: "insensitive" } } },
					{ requestedBy: { name: { contains: search as string, mode: "insensitive" } } },
					{ bankName: { contains: search as string, mode: "insensitive" } },
					{ accountHolder: { contains: search as string, mode: "insensitive" } },
				];
			}

			const [disbursements, total] = await Promise.all([
				prisma.disbursement.findMany({
					where,
					orderBy: { createdAt: "desc" },
					skip,
					take: limitNum,
					include: {
						event: { select: { id: true, title: true, startDate: true, slug: true } },
						requestedBy: { select: { id: true, name: true, email: true } },
						processedBy: { select: { id: true, name: true, email: true } },
					},
				}),
				prisma.disbursement.count({ where }),
			]);

			// Summary stats
			const [pendingTotal, approvedTotal, transferredTotal] = await Promise.all([
				prisma.disbursement.aggregate({ where: { status: "PENDING" }, _sum: { amount: true }, _count: true }),
				prisma.disbursement.aggregate({ where: { status: "APPROVED" }, _sum: { amount: true }, _count: true }),
				prisma.disbursement.aggregate({ where: { status: "TRANSFERRED" }, _sum: { amount: true }, _count: true }),
			]);

			res.json({
				data: disbursements,
				total,
				page: pageNum,
				totalPages: Math.ceil(total / limitNum),
				stats: {
					pending: { count: pendingTotal._count, amount: pendingTotal._sum.amount ?? 0 },
					approved: { count: approvedTotal._count, amount: approvedTotal._sum.amount ?? 0 },
					transferred: { count: transferredTotal._count, amount: transferredTotal._sum.amount ?? 0 },
				},
			});
		} catch (error) {
			console.error("Error fetching all disbursements:", error);
			res.status(500).json({ error: "Gagal memuat data pencairan" });
		}
	}
);

// PATCH /api/disbursements/admin/:disbursementId/approve - Approve a disbursement
router.patch(
	"/admin/:disbursementId/approve",
	authenticate,
	authorize("SUPERADMIN"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { disbursementId } = req.params;
			const { adminNotes } = req.body;

			const disbursement = await prisma.disbursement.findUnique({
				where: { id: disbursementId },
			});

			if (!disbursement) {
				return res.status(404).json({ error: "Pengajuan tidak ditemukan" });
			}

			if (disbursement.status !== "PENDING") {
				return res.status(400).json({ error: "Hanya pengajuan PENDING yang bisa disetujui" });
			}

			const updated = await prisma.disbursement.update({
				where: { id: disbursementId },
				data: {
					status: "APPROVED",
					adminNotes: adminNotes?.trim() || null,
					processedById: req.user!.userId,
					processedAt: new Date(),
				},
				include: {
					event: { select: { id: true, title: true } },
					requestedBy: { select: { id: true, name: true, email: true } },
					processedBy: { select: { id: true, name: true, email: true } },
				},
			});

			res.json({ message: "Pengajuan pencairan disetujui", disbursement: updated });
		} catch (error) {
			console.error("Error approving disbursement:", error);
			res.status(500).json({ error: "Gagal menyetujui pengajuan" });
		}
	}
);

// PATCH /api/disbursements/admin/:disbursementId/transfer - Mark as transferred
router.patch(
	"/admin/:disbursementId/transfer",
	authenticate,
	authorize("SUPERADMIN"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { disbursementId } = req.params;
			const { adminNotes, transferProof } = req.body;

			const disbursement = await prisma.disbursement.findUnique({
				where: { id: disbursementId },
			});

			if (!disbursement) {
				return res.status(404).json({ error: "Pengajuan tidak ditemukan" });
			}

			if (disbursement.status !== "PENDING" && disbursement.status !== "APPROVED") {
				return res.status(400).json({ error: "Hanya pengajuan PENDING atau APPROVED yang bisa ditandai sudah ditransfer" });
			}

			const updated = await prisma.disbursement.update({
				where: { id: disbursementId },
				data: {
					status: "TRANSFERRED",
					adminNotes: adminNotes?.trim() || disbursement.adminNotes,
					processedById: req.user!.userId,
					processedAt: new Date(),
					transferProof: transferProof?.trim() || null,
					transferredAt: new Date(),
				},
				include: {
					event: { select: { id: true, title: true } },
					requestedBy: { select: { id: true, name: true, email: true } },
					processedBy: { select: { id: true, name: true, email: true } },
				},
			});

			res.json({ message: "Pencairan berhasil ditandai sudah ditransfer", disbursement: updated });
		} catch (error) {
			console.error("Error marking transfer:", error);
			res.status(500).json({ error: "Gagal memproses pencairan" });
		}
	}
);

// PATCH /api/disbursements/admin/:disbursementId/reject - Reject a disbursement
router.patch(
	"/admin/:disbursementId/reject",
	authenticate,
	authorize("SUPERADMIN"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { disbursementId } = req.params;
			const { adminNotes } = req.body;

			if (!adminNotes?.trim()) {
				return res.status(400).json({ error: "Alasan penolakan wajib diisi" });
			}

			const disbursement = await prisma.disbursement.findUnique({
				where: { id: disbursementId },
			});

			if (!disbursement) {
				return res.status(404).json({ error: "Pengajuan tidak ditemukan" });
			}

			if (disbursement.status === "TRANSFERRED") {
				return res.status(400).json({ error: "Pencairan yang sudah ditransfer tidak bisa ditolak" });
			}

			const updated = await prisma.disbursement.update({
				where: { id: disbursementId },
				data: {
					status: "REJECTED",
					adminNotes: adminNotes.trim(),
					processedById: req.user!.userId,
					processedAt: new Date(),
				},
				include: {
					event: { select: { id: true, title: true } },
					requestedBy: { select: { id: true, name: true, email: true } },
					processedBy: { select: { id: true, name: true, email: true } },
				},
			});

			res.json({ message: "Pengajuan pencairan ditolak", disbursement: updated });
		} catch (error) {
			console.error("Error rejecting disbursement:", error);
			res.status(500).json({ error: "Gagal menolak pengajuan" });
		}
	}
);

export default router;
