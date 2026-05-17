import { Router, Response } from "express";
import { DisbursementStatus } from "@prisma/client";
import {
	authenticate,
	authorize,
	AuthenticatedRequest,
} from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { getEventRevenueLedgerSummary, reconcileEventRevenueLedger } from "../lib/revenueLedger";

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

async function getRevenueShareHistory(tx: any, eventId: string) {
	const shares = await tx.revenueShare.findMany({
		where: { eventId },
		orderBy: { createdAt: "desc" },
		take: 100,
		include: {
			transaction: true,
			withdrawalItems: {
				include: {
					withdrawal: {
						select: {
							id: true,
							status: true,
							processedAt: true,
							transferredAt: true,
							createdAt: true,
						},
					},
				},
			},
		},
	});

	return shares.map((share: any) => ({
		id: share.id,
		transactionId: share.transactionId,
		sourceType: share.transaction.sourceType,
		sourceCode: share.transaction.sourceCode,
		transactionStatus: share.transaction.status,
		nominalTransaksi: Number(share.grossAmount),
		platformSharePercent: Number(share.platformSharePercent),
		panitiaSharePercent: Number(share.panitiaSharePercent),
		platformAmount: Number(share.platformAmount),
		panitiaAmount: Number(share.panitiaAmount),
		withdrawnPanitiaAmount: Number(share.withdrawnPanitiaAmount),
		activePanitiaAmount: Math.max(0, Number(share.panitiaAmount) - Number(share.withdrawnPanitiaAmount)),
		status: share.status,
		fundStatus:
			share.transaction.status === "CANCELLED" || share.status === "CANCELLED"
				? "dibatalkan"
				: share.status === "WITHDRAWN"
				? "sudah ditarik"
				: share.status === "PARTIALLY_WITHDRAWN"
				? "sebagian ditarik"
				: "belum ditarik",
		paidAt: share.transaction.paidAt,
		createdAt: share.createdAt,
		withdrawnAt: share.withdrawnAt,
		withdrawalItems: share.withdrawalItems.map((item: any) => ({
			id: item.id,
			amount: Number(item.amount),
			withdrawalId: item.withdrawalId,
			withdrawalStatus: item.withdrawal.status,
			processedAt: item.withdrawal.processedAt,
			transferredAt: item.withdrawal.transferredAt,
		})),
	}));
}

async function finalizeEventDisbursement(
	tx: any,
	params: {
		disbursementId: string;
		processedById: string;
		adminNotes?: string | null;
		finalStatus: "APPROVED" | "TRANSFERRED";
		transferProof?: string | null;
	}
) {
	const lockedRows = await tx.$queryRaw<any[]>`
		SELECT *
		FROM "disbursements"
		WHERE "id" = ${params.disbursementId}
		FOR UPDATE
	`;
	const disbursement = lockedRows[0];

	if (!disbursement) {
		throw new Error("Pengajuan tidak ditemukan");
	}

	const now = new Date();

	if (disbursement.status === "APPROVED" && params.finalStatus === "TRANSFERRED") {
		const processedAt = disbursement.processed_at ?? now;
		return tx.disbursement.update({
			where: { id: params.disbursementId },
			data: {
				status: "TRANSFERRED",
				adminNotes: params.adminNotes?.trim() || disbursement.admin_notes,
				processedById: params.processedById,
				processedAt,
				transferProof: params.transferProof?.trim() || null,
				transferredAt: now,
			},
			include: {
				event: { select: { id: true, title: true } },
				requestedBy: { select: { id: true, name: true, email: true } },
				processedBy: { select: { id: true, name: true, email: true } },
			},
		});
	}

	if (disbursement.status !== "PENDING") {
		throw new Error(
			params.finalStatus === "APPROVED"
				? "Hanya pengajuan PENDING yang bisa disetujui"
				: "Hanya pengajuan PENDING atau APPROVED yang bisa ditandai sudah ditransfer"
		);
	}

	await tx.$queryRaw`SELECT "id" FROM "events" WHERE "id" = ${disbursement.event_id} FOR UPDATE`;
	await tx.$queryRaw`
		SELECT "id"
		FROM "revenue_shares"
		WHERE "event_id" = ${disbursement.event_id}
			AND "status" IN ('AVAILABLE', 'PARTIALLY_WITHDRAWN')
			AND "panitia_amount" - "withdrawn_panitia_amount" > 0
		FOR UPDATE
	`;

	const shares = await tx.revenueShare.findMany({
		where: {
			eventId: disbursement.event_id,
			status: { in: ["AVAILABLE", "PARTIALLY_WITHDRAWN"] },
		},
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
	});

	const availableShares = shares
		.map((share: any) => ({
			...share,
			availableAmount: Math.max(0, Number(share.panitiaAmount) - Number(share.withdrawnPanitiaAmount)),
		}))
		.filter((share: any) => share.availableAmount > 0);
	const finalAmount = roundCurrency(availableShares.reduce((sum: number, share: any) => sum + share.availableAmount, 0));

	if (finalAmount <= 0) {
		throw new Error("Tidak ada saldo aktif yang bisa ditarik");
	}

	for (const share of availableShares) {
		await tx.withdrawalItem.create({
			data: {
				withdrawalId: params.disbursementId,
				revenueShareId: share.id,
				amount: share.availableAmount,
			},
		});
		await tx.revenueShare.update({
			where: { id: share.id },
			data: {
				withdrawnPanitiaAmount: Number(share.panitiaAmount),
				status: "WITHDRAWN",
				withdrawnAt: now,
			},
		});
	}

	return tx.disbursement.update({
		where: { id: params.disbursementId },
		data: {
			amount: finalAmount,
			status: params.finalStatus,
			adminNotes: params.adminNotes?.trim() || null,
			processedById: params.processedById,
			processedAt: now,
			...(params.finalStatus === "TRANSFERRED"
				? {
						transferProof: params.transferProof?.trim() || null,
						transferredAt: now,
				  }
				: {}),
		},
		include: {
			event: { select: { id: true, title: true } },
			requestedBy: { select: { id: true, name: true, email: true } },
			processedBy: { select: { id: true, name: true, email: true } },
			items: true,
		},
	});
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
			const eventId = req.params.eventId;
			if (!eventId) {
				return res.status(400).json({ error: "Event ID wajib diisi" });
			}

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

			await prisma.$transaction((tx) => reconcileEventRevenueLedger(tx, eventId));

			const [ledgerSummary, disbursements, revenueShares] = await Promise.all([
				getEventRevenueLedgerSummary(prisma, eventId),
				prisma.disbursement.findMany({
					where: { eventId },
					orderBy: { createdAt: "desc" },
					include: {
						requestedBy: { select: { id: true, name: true, email: true } },
						processedBy: { select: { id: true, name: true, email: true } },
						items: {
							include: {
								revenueShare: {
									include: { transaction: true },
								},
							},
						},
					},
				}),
				getRevenueShareHistory(prisma, eventId),
			]);

			res.json({
				event: { id: event.id, title: event.title, startDate: event.startDate },
				summary: {
					totalRevenue: ledgerSummary.panitiaShare,
					totalIncome: ledgerSummary.grossRevenue,
					grossRevenue: ledgerSummary.grossRevenue,
					ticketRevenue: ledgerSummary.ticketRevenue,
					votingRevenue: ledgerSummary.votingRevenue,
					ticketGrossRevenue: ledgerSummary.ticketGrossRevenue,
					votingGrossRevenue: ledgerSummary.votingGrossRevenue,
					platformShare: ledgerSummary.platformShare,
					panitiaShare: ledgerSummary.panitiaShare,
					platformShareRate: ledgerSummary.platformShareRate,
					panitiaShareRate: ledgerSummary.panitiaShareRate,
					totalDisbursed: ledgerSummary.totalWithdrawn,
					totalWithdrawals: ledgerSummary.totalWithdrawn,
					totalPending: ledgerSummary.totalPending,
					remainingBalance: ledgerSummary.activeBalance,
					activeBalance: ledgerSummary.activeBalance,
				},
				disbursements,
				revenueShares,
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
			const eventId = req.params.eventId;
			const { amount, bankName, accountNumber, accountHolder, notes } = req.body;

			if (!eventId) {
				return res.status(400).json({ error: "Event ID wajib diisi" });
			}

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

			const disbursement = await prisma.$transaction(async (tx) => {
				await tx.$queryRaw`SELECT "id" FROM "events" WHERE "id" = ${eventId} FOR UPDATE`;
				await tx.$queryRaw`SELECT id FROM "disbursements" WHERE "event_id" = ${eventId} FOR UPDATE`;
				const activeRequest = await tx.disbursement.findFirst({
					where: { eventId, status: "PENDING" },
					select: { id: true },
				});

				if (activeRequest) {
					throw new Error("Masih ada pengajuan penarikan yang menunggu ACC admin");
				}

				await reconcileEventRevenueLedger(tx, eventId);

				const ledgerSummary = await getEventRevenueLedgerSummary(tx, eventId);
				const availableBalance = roundCurrency(ledgerSummary.activeBalance);

				if (availableBalance <= 0) {
					throw new Error("Belum ada saldo aktif yang bisa ditarik");
				}

				if (roundCurrency(parsedAmount) !== availableBalance) {
					throw new Error(`Penarikan harus sebesar seluruh saldo aktif periode ini: Rp ${availableBalance.toLocaleString("id-ID")}`);
				}

				return tx.disbursement.create({
					data: {
						eventId: event.id,
						requestedById: req.user!.userId,
						amount: availableBalance,
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
			if (
				error.message?.includes("saldo aktif") ||
				error.message?.includes("pengajuan penarikan")
			) {
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
			const paginatedEventIds = Array.from(
				new Set(
					paginated
						.filter((item) => item.kind === "EVENT" && item.event?.id)
						.map((item) => item.event!.id)
				)
			);
			await Promise.all(paginatedEventIds.map((eventId) => prisma.$transaction((tx) => reconcileEventRevenueLedger(tx, eventId))));
			const eventBalanceEntries = await Promise.all(
				paginatedEventIds.map(async (eventId) => [eventId, await getEventRevenueLedgerSummary(prisma, eventId)] as const)
			);
			const eventBalanceMap = new Map(eventBalanceEntries);
			const data = paginated.map((item) => {
				if (item.kind !== "EVENT" || !item.event?.id) return item;
				const balance = eventBalanceMap.get(item.event.id);
				return {
					...item,
					eventBalance: balance
						? {
								grossRevenue: balance.grossRevenue,
								ticketGrossRevenue: balance.ticketGrossRevenue,
								votingGrossRevenue: balance.votingGrossRevenue,
								platformShare: balance.platformShare,
								panitiaShare: balance.panitiaShare,
								totalWithdrawn: balance.totalWithdrawn,
								totalPending: balance.totalPending,
								activeBalance: balance.activeBalance,
						  }
						: null,
				};
			});

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
				data,
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
			const disbursementId = req.params.disbursementId;
			const { adminNotes } = req.body;

			if (!disbursementId) {
				return res.status(400).json({ error: "ID pengajuan wajib diisi" });
			}

			const updated = await prisma.$transaction((tx) => {
				return finalizeEventDisbursement(tx, {
					disbursementId,
					processedById: req.user!.userId,
					adminNotes,
					finalStatus: "APPROVED",
				});
			});

			res.json({ message: "Pengajuan pencairan disetujui", disbursement: updated });
		} catch (error: any) {
			if (error.message?.includes("Pengajuan") || error.message?.includes("saldo") || error.message?.includes("PENDING")) {
				const status = error.message?.includes("tidak ditemukan") ? 404 : 400;
				return res.status(status).json({ error: error.message });
			}
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
			const disbursementId = req.params.disbursementId;
			const { adminNotes, transferProof } = req.body;

			if (!disbursementId) {
				return res.status(400).json({ error: "ID pengajuan wajib diisi" });
			}

			const updated = await prisma.$transaction((tx) => {
				return finalizeEventDisbursement(tx, {
					disbursementId,
					processedById: req.user!.userId,
					adminNotes,
					finalStatus: "TRANSFERRED",
					transferProof,
				});
			});

			res.json({ message: "Pencairan berhasil ditandai sudah ditransfer", disbursement: updated });
		} catch (error: any) {
			if (error.message?.includes("Pengajuan") || error.message?.includes("saldo") || error.message?.includes("PENDING")) {
				const status = error.message?.includes("tidak ditemukan") ? 404 : 400;
				return res.status(status).json({ error: error.message });
			}
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

			if (disbursement.status !== "PENDING") {
				return res.status(400).json({ error: "Hanya pengajuan PENDING yang bisa ditolak" });
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
