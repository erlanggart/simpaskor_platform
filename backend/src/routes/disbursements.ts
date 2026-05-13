import { Router, Response } from "express";
import { DisbursementStatus } from "@prisma/client";
import {
	authenticate,
	authorize,
	AuthenticatedRequest,
} from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router = Router();

const PLATFORM_SHARE_RATE = 0.15;
const PANITIA_SHARE_RATE = 0.85;
const BUNDLE_PLATFORM_SHARE_RATE = 0.25;
const BUNDLE_PANITIA_SHARE_RATE = 0.75;

function roundCurrency(amount: number) {
	return Math.round(amount);
}

function getRevenueShareRates(packageTier?: string | null, platformSharePercent?: number | null) {
	if (platformSharePercent !== null && platformSharePercent !== undefined) {
		const platformShareRate = platformSharePercent / 100;
		return {
			platformShareRate,
			panitiaShareRate: 1 - platformShareRate,
		};
	}
	if (packageTier === "TICKETING_VOTING") {
		return {
			platformShareRate: BUNDLE_PLATFORM_SHARE_RATE,
			panitiaShareRate: BUNDLE_PANITIA_SHARE_RATE,
		};
	}
	return { platformShareRate: PLATFORM_SHARE_RATE, panitiaShareRate: PANITIA_SHARE_RATE };
}

function calculateRevenueShare(grossRevenue: number, packageTier?: string | null, platformSharePercent?: number | null) {
	const { platformShareRate, panitiaShareRate } = getRevenueShareRates(packageTier, platformSharePercent);
	const platformShare = roundCurrency(grossRevenue * platformShareRate);
	const panitiaShare = roundCurrency(grossRevenue - platformShare);
	return { platformShare, panitiaShare, platformShareRate, panitiaShareRate };
}

const WITHDRAWABLE_COMMISSION_STATUSES = ["PENDING", "APPROVED", "PAID"] as const;

async function getMitraWithdrawalSummary(tx: any, mitraProfileId: string) {
	const [commissionTotal, withdrawnTotal, pendingTotal] = await Promise.all([
		tx.mitraCommission.aggregate({
			where: { mitraProfileId, status: { in: WITHDRAWABLE_COMMISSION_STATUSES } },
			_sum: { amount: true },
			_count: true,
		}),
		tx.mitraWithdrawal.aggregate({
			where: { mitraProfileId, status: "TRANSFERRED" },
			_sum: { amount: true },
			_count: true,
		}),
		tx.mitraWithdrawal.aggregate({
			where: { mitraProfileId, status: { in: ["PENDING", "APPROVED"] } },
			_sum: { amount: true },
			_count: true,
		}),
	]);

	const totalCommission = commissionTotal._sum.amount ?? 0;
	const totalWithdrawn = withdrawnTotal._sum.amount ?? 0;
	const totalPending = pendingTotal._sum.amount ?? 0;

	return {
		totalCommission,
		totalWithdrawn,
		totalPending,
		remainingBalance: Math.max(0, totalCommission - totalWithdrawn - totalPending),
		totalCommissionEvents: commissionTotal._count,
	};
}

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
				select: { id: true, title: true, startDate: true, createdById: true, packageTier: true, platformSharePercent: true },
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

			const ticketGrossRevenue = ticketRevenue._sum.totalAmount ?? 0;
			const votingGrossRevenue = votingRevenue._sum.totalAmount ?? 0;
			const grossRevenue = ticketGrossRevenue + votingGrossRevenue;
			const { platformShare, panitiaShare, platformShareRate, panitiaShareRate } = calculateRevenueShare(grossRevenue, event.packageTier, event.platformSharePercent);

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
			const remainingBalance = panitiaShare - totalDisbursed - totalPending;

			res.json({
				event: { id: event.id, title: event.title, startDate: event.startDate },
				summary: {
					totalRevenue: panitiaShare,
					grossRevenue,
					ticketRevenue: roundCurrency(ticketGrossRevenue * panitiaShareRate),
					votingRevenue: roundCurrency(votingGrossRevenue * panitiaShareRate),
					ticketGrossRevenue,
					votingGrossRevenue,
					platformShare,
					panitiaShare,
					platformShareRate,
					panitiaShareRate,
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
				select: { id: true, title: true, startDate: true, createdById: true, packageTier: true, platformSharePercent: true },
			});

			if (!event) {
				return res.status(404).json({ error: "Event tidak ditemukan" });
			}

			// Panitia can only request for their own event
			if (req.user?.role === "PANITIA" && event.createdById !== req.user?.userId) {
				return res.status(403).json({ error: "Tidak memiliki akses" });
			}

			// Calculate available balance and create disbursement in a single transaction
			// to prevent race condition where multiple requests pass the balance check
			const disbursement = await prisma.$transaction(async (tx) => {
				// Lock existing disbursements for this event to prevent concurrent requests.
				await tx.$queryRaw`SELECT id FROM "disbursements" WHERE "event_id" = ${eventId} FOR UPDATE`;

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

				const grossRevenue = (ticketRevenue._sum.totalAmount ?? 0) + (votingRevenue._sum.totalAmount ?? 0);
				const { panitiaShare } = calculateRevenueShare(grossRevenue, event.packageTier, event.platformSharePercent);

				const existingDisbursements = await tx.disbursement.findMany({
					where: { eventId, status: { in: ["PENDING", "APPROVED", "TRANSFERRED"] } },
				});

				const totalCommitted = existingDisbursements.reduce((sum, d) => sum + d.amount, 0);
				const availableBalance = panitiaShare - totalCommitted;

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
// MITRA ROUTES - Request Commission Withdrawal
// ==========================================

router.get(
	"/mitra",
	authenticate,
	authorize("MITRA"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const profile = await prisma.mitraProfile.findUnique({
				where: { userId: req.user!.userId },
				select: {
					id: true,
					referralCode: true,
					commissionPerEvent: true,
				},
			});

			if (!profile) {
				return res.status(404).json({ error: "Profil mitra tidak ditemukan" });
			}

			const [summary, withdrawals] = await Promise.all([
				getMitraWithdrawalSummary(prisma, profile.id),
				prisma.mitraWithdrawal.findMany({
					where: { mitraProfileId: profile.id },
					orderBy: { createdAt: "desc" },
					include: {
						requestedBy: { select: { id: true, name: true, email: true } },
						processedBy: { select: { id: true, name: true, email: true } },
					},
				}),
			]);

			res.json({ profile, summary, withdrawals });
		} catch (error) {
			console.error("Error fetching mitra withdrawals:", error);
			res.status(500).json({ error: "Gagal memuat data penarikan mitra" });
		}
	}
);

router.post(
	"/mitra/request",
	authenticate,
	authorize("MITRA"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { amount, bankName, accountNumber, accountHolder, notes } = req.body;
			const parsedAmount = Number(amount);

			if (!parsedAmount || !Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > 10_000_000_000) {
				return res.status(400).json({ error: "Jumlah penarikan tidak valid" });
			}
			if (!bankName?.trim() || !accountNumber?.trim() || !accountHolder?.trim()) {
				return res.status(400).json({ error: "Data rekening bank wajib diisi lengkap" });
			}

			const withdrawal = await prisma.$transaction(async (tx) => {
				const profile = await tx.mitraProfile.findUnique({
					where: { userId: req.user!.userId },
					select: { id: true },
				});

				if (!profile) {
					throw new Error("Profil mitra tidak ditemukan");
				}

				await tx.$queryRaw`SELECT id FROM "mitra_profiles" WHERE "id" = ${profile.id} FOR UPDATE`;
				await tx.$queryRaw`SELECT id FROM "mitra_withdrawals" WHERE "mitra_profile_id" = ${profile.id} FOR UPDATE`;
				const summary = await getMitraWithdrawalSummary(tx, profile.id);

				if (parsedAmount > summary.remainingBalance) {
					throw new Error(`Saldo komisi tidak mencukupi. Saldo tersedia: Rp ${summary.remainingBalance.toLocaleString("id-ID")}`);
				}

				return tx.mitraWithdrawal.create({
					data: {
						mitraProfileId: profile.id,
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
				message: "Pengajuan penarikan komisi berhasil dibuat",
				withdrawal,
			});
		} catch (error: any) {
			if (error.message?.includes("Saldo komisi tidak mencukupi") || error.message?.includes("Profil mitra")) {
				return res.status(400).json({ error: error.message });
			}
			console.error("Error creating mitra withdrawal:", error);
			res.status(500).json({ error: "Gagal membuat pengajuan penarikan mitra" });
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
			const mitraWhere: any = {};
			if (status) {
				where.status = status;
				mitraWhere.status = status;
			}
			if (search) {
				const term = search as string;
				where.OR = [
					{ event: { title: { contains: term, mode: "insensitive" } } },
					{ requestedBy: { name: { contains: term, mode: "insensitive" } } },
					{ requestedBy: { email: { contains: term, mode: "insensitive" } } },
					{ bankName: { contains: term, mode: "insensitive" } },
					{ accountHolder: { contains: term, mode: "insensitive" } },
				];
				mitraWhere.OR = [
					{ mitraProfile: { referralCode: { contains: term, mode: "insensitive" } } },
					{ mitraProfile: { user: { name: { contains: term, mode: "insensitive" } } } },
					{ mitraProfile: { user: { email: { contains: term, mode: "insensitive" } } } },
					{ requestedBy: { name: { contains: term, mode: "insensitive" } } },
					{ requestedBy: { email: { contains: term, mode: "insensitive" } } },
					{ bankName: { contains: term, mode: "insensitive" } },
					{ accountHolder: { contains: term, mode: "insensitive" } },
				];
			}

			const [eventDisbursements, mitraWithdrawals] = await Promise.all([
				prisma.disbursement.findMany({
					where,
					orderBy: { createdAt: "desc" },
					include: {
						event: { select: { id: true, title: true, startDate: true, slug: true } },
						requestedBy: { select: { id: true, name: true, email: true } },
						processedBy: { select: { id: true, name: true, email: true } },
					},
				}),
				prisma.mitraWithdrawal.findMany({
					where: mitraWhere,
					orderBy: { createdAt: "desc" },
					include: {
						mitraProfile: {
							select: {
								id: true,
								referralCode: true,
								user: { select: { id: true, name: true, email: true } },
							},
						},
						requestedBy: { select: { id: true, name: true, email: true } },
						processedBy: { select: { id: true, name: true, email: true } },
					},
				}),
			]);

			const disbursements = [
				...eventDisbursements.map((item) => ({ ...item, kind: "EVENT" })),
				...mitraWithdrawals.map((item) => ({ ...item, kind: "MITRA", event: null })),
			].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

			const total = disbursements.length;
			const paginated = disbursements.slice(skip, skip + limitNum);

			// Summary stats
			const [pendingTotal, approvedTotal, transferredTotal, mitraPendingTotal, mitraApprovedTotal, mitraTransferredTotal] = await Promise.all([
				prisma.disbursement.aggregate({ where: { status: "PENDING" }, _sum: { amount: true }, _count: true }),
				prisma.disbursement.aggregate({ where: { status: "APPROVED" }, _sum: { amount: true }, _count: true }),
				prisma.disbursement.aggregate({ where: { status: "TRANSFERRED" }, _sum: { amount: true }, _count: true }),
				prisma.mitraWithdrawal.aggregate({ where: { status: "PENDING" }, _sum: { amount: true }, _count: true }),
				prisma.mitraWithdrawal.aggregate({ where: { status: "APPROVED" }, _sum: { amount: true }, _count: true }),
				prisma.mitraWithdrawal.aggregate({ where: { status: "TRANSFERRED" }, _sum: { amount: true }, _count: true }),
			]);

			res.json({
				data: paginated,
				total,
				page: pageNum,
				totalPages: Math.ceil(total / limitNum),
				stats: {
					pending: {
						count: pendingTotal._count + mitraPendingTotal._count,
						amount: (pendingTotal._sum.amount ?? 0) + (mitraPendingTotal._sum.amount ?? 0),
					},
					approved: {
						count: approvedTotal._count + mitraApprovedTotal._count,
						amount: (approvedTotal._sum.amount ?? 0) + (mitraApprovedTotal._sum.amount ?? 0),
					},
					transferred: {
						count: transferredTotal._count + mitraTransferredTotal._count,
						amount: (transferredTotal._sum.amount ?? 0) + (mitraTransferredTotal._sum.amount ?? 0),
					},
				},
			});
		} catch (error) {
			console.error("Error fetching all disbursements:", error);
			res.status(500).json({ error: "Gagal memuat data pencairan" });
		}
	}
);

// PATCH /api/disbursements/admin/mitra/:withdrawalId/approve - Approve a mitra withdrawal
router.patch(
	"/admin/mitra/:withdrawalId/approve",
	authenticate,
	authorize("SUPERADMIN"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { withdrawalId } = req.params;
			const { adminNotes } = req.body;

			const withdrawal = await prisma.mitraWithdrawal.findUnique({
				where: { id: withdrawalId },
			});

			if (!withdrawal) {
				return res.status(404).json({ error: "Pengajuan penarikan mitra tidak ditemukan" });
			}

			if (withdrawal.status !== "PENDING") {
				return res.status(400).json({ error: "Hanya pengajuan PENDING yang bisa disetujui" });
			}

			const updated = await prisma.mitraWithdrawal.update({
				where: { id: withdrawalId },
				data: {
					status: "APPROVED",
					adminNotes: adminNotes?.trim() || null,
					processedById: req.user!.userId,
					processedAt: new Date(),
				},
				include: {
					mitraProfile: {
						select: {
							id: true,
							referralCode: true,
							user: { select: { id: true, name: true, email: true } },
						},
					},
					requestedBy: { select: { id: true, name: true, email: true } },
					processedBy: { select: { id: true, name: true, email: true } },
				},
			});

			res.json({ message: "Pengajuan penarikan mitra disetujui", withdrawal: updated });
		} catch (error) {
			console.error("Error approving mitra withdrawal:", error);
			res.status(500).json({ error: "Gagal menyetujui pengajuan mitra" });
		}
	}
);

// PATCH /api/disbursements/admin/mitra/:withdrawalId/transfer - Mark mitra withdrawal as transferred
router.patch(
	"/admin/mitra/:withdrawalId/transfer",
	authenticate,
	authorize("SUPERADMIN"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { withdrawalId } = req.params;
			const { adminNotes, transferProof } = req.body;

			const withdrawal = await prisma.mitraWithdrawal.findUnique({
				where: { id: withdrawalId },
			});

			if (!withdrawal) {
				return res.status(404).json({ error: "Pengajuan penarikan mitra tidak ditemukan" });
			}

			if (withdrawal.status !== "PENDING" && withdrawal.status !== "APPROVED") {
				return res.status(400).json({ error: "Hanya pengajuan PENDING atau APPROVED yang bisa ditandai sudah ditransfer" });
			}

			const updated = await prisma.mitraWithdrawal.update({
				where: { id: withdrawalId },
				data: {
					status: "TRANSFERRED",
					adminNotes: adminNotes?.trim() || withdrawal.adminNotes,
					processedById: req.user!.userId,
					processedAt: new Date(),
					transferProof: transferProof?.trim() || null,
					transferredAt: new Date(),
				},
				include: {
					mitraProfile: {
						select: {
							id: true,
							referralCode: true,
							user: { select: { id: true, name: true, email: true } },
						},
					},
					requestedBy: { select: { id: true, name: true, email: true } },
					processedBy: { select: { id: true, name: true, email: true } },
				},
			});

			res.json({ message: "Penarikan mitra berhasil ditandai sudah ditransfer", withdrawal: updated });
		} catch (error) {
			console.error("Error marking mitra transfer:", error);
			res.status(500).json({ error: "Gagal memproses penarikan mitra" });
		}
	}
);

// PATCH /api/disbursements/admin/mitra/:withdrawalId/reject - Reject a mitra withdrawal
router.patch(
	"/admin/mitra/:withdrawalId/reject",
	authenticate,
	authorize("SUPERADMIN"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { withdrawalId } = req.params;
			const { adminNotes } = req.body;

			if (!adminNotes?.trim()) {
				return res.status(400).json({ error: "Alasan penolakan wajib diisi" });
			}

			const withdrawal = await prisma.mitraWithdrawal.findUnique({
				where: { id: withdrawalId },
			});

			if (!withdrawal) {
				return res.status(404).json({ error: "Pengajuan penarikan mitra tidak ditemukan" });
			}

			if (withdrawal.status === "TRANSFERRED") {
				return res.status(400).json({ error: "Penarikan yang sudah ditransfer tidak bisa ditolak" });
			}

			const updated = await prisma.mitraWithdrawal.update({
				where: { id: withdrawalId },
				data: {
					status: "REJECTED",
					adminNotes: adminNotes.trim(),
					processedById: req.user!.userId,
					processedAt: new Date(),
				},
				include: {
					mitraProfile: {
						select: {
							id: true,
							referralCode: true,
							user: { select: { id: true, name: true, email: true } },
						},
					},
					requestedBy: { select: { id: true, name: true, email: true } },
					processedBy: { select: { id: true, name: true, email: true } },
				},
			});

			res.json({ message: "Pengajuan penarikan mitra ditolak", withdrawal: updated });
		} catch (error) {
			console.error("Error rejecting mitra withdrawal:", error);
			res.status(500).json({ error: "Gagal menolak pengajuan mitra" });
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
