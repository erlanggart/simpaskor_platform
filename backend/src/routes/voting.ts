import { Router, Response } from "express";
import {
	authenticate,
	authorize,
	optionalAuthenticate,
	AuthenticatedRequest,
} from "../middleware/auth";
import { prisma } from "../lib/prisma";
import crypto from "crypto";
import {
	coreApi,
	createSnapTransaction,
	resolvePaymentStatus,
} from "../lib/midtrans";
import { sendVotingPurchaseEmail } from "../lib/email";
import { uploadNomineePhoto } from "../middleware/upload";

const router = Router();

const INDONESIA_UTC_OFFSET_MINUTES = 7 * 60;
const DATETIME_LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const VOTING_ADMIN_FEE_PER_VOTE = 500;
const VOTING_MAX_ADMIN_FEE = 10000;
const REVENUE_SHARE_VOTING_TIERS = ["VOTING", "TICKETING_VOTING", "BRONZE", "GOLD"];

const requiresVotingRevenueShareAgreement = (event: { packageTier?: string | null; platformSharePercent?: number | null }) =>
	!!event.packageTier && REVENUE_SHARE_VOTING_TIERS.includes(event.packageTier) && event.platformSharePercent === null;

const calculateVotingAdminFee = (totalAmount: number, voteCount: number): number => {
	if (totalAmount <= 0) return 0;
	return Math.min(VOTING_ADMIN_FEE_PER_VOTE * voteCount, VOTING_MAX_ADMIN_FEE);
};

const parseIndonesiaDateTime = (value: unknown): Date | null => {
	if (!value) return null;

	if (value instanceof Date) {
		if (Number.isNaN(value.getTime())) throw new Error("Tanggal voting tidak valid");
		return value;
	}

	if (typeof value !== "string") {
		throw new Error("Tanggal voting tidak valid");
	}

	const trimmed = value.trim();
	const localMatch = trimmed.match(DATETIME_LOCAL_PATTERN);

	if (localMatch) {
		const year = Number(localMatch[1]);
		const month = Number(localMatch[2]);
		const day = Number(localMatch[3]);
		const hour = Number(localMatch[4]);
		const minute = Number(localMatch[5]);
		return new Date(Date.UTC(year, month - 1, day, hour, minute) - INDONESIA_UTC_OFFSET_MINUTES * 60 * 1000);
	}

	const parsed = new Date(trimmed);
	if (Number.isNaN(parsed.getTime())) {
		throw new Error("Tanggal voting tidak valid");
	}

	return parsed;
};

// Resolve event slug or ID to actual event ID
const resolveEventId = async (eventIdOrSlug: string | undefined): Promise<string | null> => {
	if (!eventIdOrSlug) return null;
	const event = await prisma.event.findFirst({
		where: { OR: [{ id: eventIdOrSlug }, { slug: eventIdOrSlug }] },
		select: { id: true },
	});
	return event?.id || null;
};

// Generate unique purchase code with strong randomness
const generatePurchaseCode = (): string => {
	const random = crypto.randomBytes(10).toString("hex").toUpperCase();
	return `VOT-${random.slice(0, 8)}-${random.slice(8)}`;
};

const normalizePurchaseCode = (value: unknown): string => {
	if (typeof value !== "string") return "";
	return value.trim().toUpperCase().replace(/[\s\u200B-\u200D\uFEFF]+/g, "");
};

const buildVotingPurchaseCodeLookupWhere = (code: string) => ({
	OR: [{ purchaseCode: code }, { midtransOrderId: code }],
});

const REFRESHABLE_VOTING_PURCHASE_STATUSES = ["PENDING", "CANCELLED", "EXPIRED"];

type VotingPurchasePaymentStatusSnapshot = { status: string; midtransOrderId: string | null };

const canRefreshVotingPurchasePaymentStatus = (
	purchase: VotingPurchasePaymentStatusSnapshot | null
): purchase is VotingPurchasePaymentStatusSnapshot & { midtransOrderId: string } => {
	return !!purchase?.midtransOrderId && REFRESHABLE_VOTING_PURCHASE_STATUSES.includes(purchase.status);
};

const getVotingPurchasePaymentMessage = (status: string | undefined | null): string => {
	if (status === "PENDING") {
		return "Pembayaran vote belum dikonfirmasi. Tunggu beberapa saat lalu coba lagi.";
	}
	if (status === "EXPIRED") {
		return "Pembayaran vote kedaluwarsa. Hubungi panitia jika pembayaran sudah berhasil.";
	}
	if (status === "CANCELLED") {
		return "Pembayaran vote dibatalkan. Hubungi panitia jika pembayaran sudah berhasil.";
	}
	return "Kode pembelian tidak valid atau belum dibayar";
};

const refreshVotingPurchasePaymentStatus = async (purchaseId: string) => {
	const purchase = await prisma.votingPurchase.findUnique({
		where: { id: purchaseId },
		include: { event: { select: { id: true, title: true, startDate: true, endDate: true, venue: true, city: true } } },
	});

	if (!canRefreshVotingPurchasePaymentStatus(purchase)) {
		return purchase;
	}

	const txStatus = await coreApi.transaction.status(purchase.midtransOrderId);
	const paymentResult = resolvePaymentStatus(txStatus.transaction_status, txStatus.fraud_status);

	if (paymentResult === "success") {
		return prisma.votingPurchase.update({
			where: { id: purchase.id },
			data: {
				status: "PAID",
				paymentType: txStatus.payment_type,
				paidAt: new Date(),
			},
			include: { event: { select: { id: true, title: true, startDate: true, endDate: true, venue: true, city: true } } },
		});
	}

	if (paymentResult === "failed" || paymentResult === "expired") {
		if (purchase.status !== "PENDING") {
			return purchase;
		}

		return prisma.votingPurchase.update({
			where: { id: purchase.id },
			data: {
				status: paymentResult === "expired" ? "EXPIRED" : "CANCELLED",
				paymentType: txStatus.payment_type,
			},
			include: { event: { select: { id: true, title: true, startDate: true, endDate: true, venue: true, city: true } } },
		});
	}

	return purchase;
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

// GET /api/voting/events - List events with e-voting enabled
router.get("/events", async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { search, page = "1", limit = "12" } = req.query;
		const pageNum = Math.max(1, parseInt(page as string));
		const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
		const skip = (pageNum - 1) * limitNum;

		const where: any = {
			status: { in: ["PUBLISHED", "ONGOING"] },
			votingConfig: {
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
					votingConfig: {
						select: {
							id: true,
							enabled: true,
							isPaid: true,
							pricePerVote: true,
							startDate: true,
							endDate: true,
							categories: {
								where: { isActive: true },
								orderBy: { order: "asc" },
								select: {
									id: true,
									title: true,
									mode: true,
								},
							},
						},
					},
				},
			}),
			prisma.event.count({ where }),
		]);

		// Debug logging for production troubleshooting
		if (total === 0) {
			const allVotingConfigs = await prisma.eventVotingConfig.findMany({
				where: { enabled: true },
				select: { eventId: true, enabled: true, event: { select: { id: true, title: true, status: true } } },
			});
			console.log("[voting/events] No voting events found. Debug info:", {
				search: search || null,
				enabledVotingConfigs: allVotingConfigs.length,
				configs: allVotingConfigs.map(c => ({
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
		console.error("Error fetching voting events:", error);
		res.status(500).json({ error: "Gagal memuat event" });
	}
});

// GET /api/voting/events/:eventId - Get event voting details with categories
router.get("/events/:eventId", async (req: AuthenticatedRequest, res: Response) => {
	try {
		const eventId = await resolveEventId(req.params.eventId);
		if (!eventId) return res.status(404).json({ error: "Event tidak ditemukan" });

		const event = await prisma.event.findUnique({
			where: { id: eventId },
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
				votingConfig: {
					select: {
						id: true,
						enabled: true,
						isPaid: true,
						pricePerVote: true,
						startDate: true,
						endDate: true,
						categories: {
							where: { isActive: true },
							orderBy: { order: "asc" },
							select: {
								id: true,
								title: true,
								description: true,
								mode: true,
								maxVotesPerVoter: true,
								nominees: {
									orderBy: { voteCount: "desc" },
									select: {
										id: true,
										nomineeName: true,
										nomineePhoto: true,
										nomineeSubtitle: true,
										voteCount: true,
									},
								},
							},
						},
					},
				},
			},
		});

		if (!event || !event.votingConfig?.enabled) {
			return res.status(404).json({ error: "Event tidak ditemukan atau voting tidak tersedia" });
		}

		res.json(event);
	} catch (error) {
		console.error("Error fetching event voting detail:", error);
		res.status(500).json({ error: "Gagal memuat detail event" });
	}
});

// POST /api/voting/vote - Cast a vote (free voting)
router.post("/vote", optionalAuthenticate, async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { categoryId, nomineeId, voterName, voterEmail } = req.body;

		if (!categoryId || !nomineeId) {
			return res.status(400).json({ error: "Kategori dan nominee wajib dipilih" });
		}

		const category = await prisma.votingCategory.findUnique({
			where: { id: categoryId },
			include: {
				config: true,
			},
		});

		if (!category || !category.isActive) {
			return res.status(404).json({ error: "Kategori voting tidak ditemukan" });
		}

		if (!category.config.enabled) {
			return res.status(400).json({ error: "Voting belum diaktifkan" });
		}

		// Check voting period
		const now = new Date();
		if (category.config.startDate && now < category.config.startDate) {
			return res.status(400).json({ error: "Voting belum dimulai" });
		}
		if (category.config.endDate && now > category.config.endDate) {
			return res.status(400).json({ error: "Voting sudah ditutup" });
		}

		// If paid, reject free voting
		if (category.config.isPaid) {
			return res.status(400).json({ error: "Voting ini berbayar. Silakan beli paket vote terlebih dahulu." });
		}

		// Check nominee belongs to category
		const nominee = await prisma.votingNominee.findFirst({
			where: { id: nomineeId, categoryId },
		});
		if (!nominee) {
			return res.status(404).json({ error: "Nominee tidak ditemukan dalam kategori ini" });
		}

		// Check max votes per voter (by email or IP)
		const voterIdentifier = voterEmail || req.user?.userId;
		const voterIp = req.headers["x-forwarded-for"]?.toString().split(",")[0] || req.socket.remoteAddress || "";

		if (voterIdentifier) {
			const existingVotes = await prisma.votingVote.count({
				where: {
					categoryId,
					OR: [
						...(voterEmail ? [{ voterEmail }] : []),
						...(req.user ? [{ voterEmail: req.user.userId }] : []),
					],
				},
			});

			if (existingVotes >= category.maxVotesPerVoter) {
				return res.status(400).json({ error: `Anda sudah mencapai batas maksimal ${category.maxVotesPerVoter} vote untuk kategori ini` });
			}
		}

		const result = await prisma.$transaction(async (tx) => {
			const vote = await tx.votingVote.create({
				data: {
					categoryId,
					nomineeId,
					voterName: voterName || req.user?.userId || null,
					voterEmail: voterEmail || null,
					voterIp,
				},
			});

			await tx.votingNominee.update({
				where: { id: nomineeId },
				data: { voteCount: { increment: 1 } },
			});

			return vote;
		});

		res.status(201).json({ message: "Vote berhasil!", vote: result });
	} catch (error) {
		console.error("Error casting vote:", error);
		res.status(500).json({ error: "Gagal melakukan vote" });
	}
});

// POST /api/voting/vote-paid - Cast a vote using purchased vote credits
router.post("/vote-paid", optionalAuthenticate, async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { categoryId, nomineeId, purchaseCode, voterName, voterEmail } = req.body;
		const normalizedPurchaseCode = normalizePurchaseCode(purchaseCode);

		if (!categoryId || !nomineeId || !normalizedPurchaseCode) {
			return res.status(400).json({ error: "Kategori, nominee, dan kode pembelian wajib diisi" });
		}

		const category = await prisma.votingCategory.findUnique({
			where: { id: categoryId },
			include: { config: true },
		});

		if (!category || !category.isActive || !category.config.enabled) {
			return res.status(404).json({ error: "Kategori voting tidak tersedia" });
		}

		// Check voting period
		const now = new Date();
		if (category.config.startDate && now < category.config.startDate) {
			return res.status(400).json({ error: "Voting belum dimulai" });
		}
		if (category.config.endDate && now > category.config.endDate) {
			return res.status(400).json({ error: "Voting sudah ditutup" });
		}

		// Validate purchase
		let purchase = await prisma.votingPurchase.findFirst({
			where: buildVotingPurchaseCodeLookupWhere(normalizedPurchaseCode),
		});

		if (!purchase) {
			return res.status(400).json({ error: "Kode pembelian tidak valid" });
		}

		if (canRefreshVotingPurchasePaymentStatus(purchase)) {
			try {
				const refreshedPurchase = await refreshVotingPurchasePaymentStatus(purchase.id);
				if (refreshedPurchase) purchase = refreshedPurchase;
			} catch (midtransError) {
				console.error("Error refreshing voting payment status:", midtransError);
			}
		}

		if (!purchase || purchase.status !== "PAID") {
			return res.status(400).json({
				error: getVotingPurchasePaymentMessage(purchase?.status),
			});
		}

		if (purchase.eventId !== category.config.eventId) {
			return res.status(400).json({ error: "Kode pembelian tidak valid untuk event ini" });
		}

		// Check nominee belongs to category
		const nominee = await prisma.votingNominee.findFirst({
			where: { id: nomineeId, categoryId },
		});
		if (!nominee) {
			return res.status(404).json({ error: "Nominee tidak ditemukan dalam kategori ini" });
		}

		const voterIp = req.headers["x-forwarded-for"]?.toString().split(",")[0] || req.socket.remoteAddress || "";

		const result = await prisma.$transaction(async (tx) => {
			// Atomically increment usedVotes only if credits remain (prevents double-spend)
			const reserved = await tx.votingPurchase.updateMany({
				where: {
					id: purchase.id,
					status: "PAID",
					usedVotes: { lt: purchase.voteCount },
				},
				data: { usedVotes: { increment: 1 } },
			});

			if (reserved.count === 0) {
				throw new Error("Semua vote pada kode pembelian ini sudah digunakan");
			}

			const vote = await tx.votingVote.create({
				data: {
					categoryId,
					nomineeId,
					purchaseId: purchase.id,
					voterName: voterName || purchase.buyerName,
					voterEmail: voterEmail || purchase.buyerEmail,
					voterIp,
				},
			});

			await tx.votingNominee.update({
				where: { id: nomineeId },
				data: { voteCount: { increment: 1 } },
			});

			// usedVotes already incremented atomically above

			const updatedPurchase = await tx.votingPurchase.findUnique({
				where: { id: purchase.id },
				select: { voteCount: true, usedVotes: true },
			});

			return { vote, purchase: updatedPurchase };
		});

		res.status(201).json({
			message: "Vote berhasil!",
			vote: result.vote,
			purchaseCode: purchase.purchaseCode,
			remainingVotes: result.purchase ? Math.max(0, result.purchase.voteCount - result.purchase.usedVotes) : 0,
			voteCount: result.purchase?.voteCount ?? purchase.voteCount,
			usedVotes: result.purchase?.usedVotes ?? purchase.usedVotes + 1,
		});
	} catch (error: any) {
		if (error.message?.includes("Semua vote")) {
			return res.status(400).json({ error: error.message });
		}
		console.error("Error casting paid vote:", error);
		res.status(500).json({ error: "Gagal melakukan vote" });
	}
});

// POST /api/voting/purchase - Purchase vote credits
router.post("/purchase", optionalAuthenticate, async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { eventId, buyerName, buyerEmail, buyerPhone, voteCount = 1 } = req.body;

		if (!eventId || !buyerName || !buyerEmail) {
			return res.status(400).json({ error: "Event, nama, dan email pembeli wajib diisi" });
		}

		if (voteCount < 1 || voteCount > 100) {
			return res.status(400).json({ error: "Jumlah vote harus antara 1-100" });
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(buyerEmail)) {
			return res.status(400).json({ error: "Format email tidak valid" });
		}

		const resolvedEventId = await resolveEventId(eventId);
		if (!resolvedEventId) {
			return res.status(404).json({ error: "Event tidak ditemukan" });
		}

		const votingConfig = await prisma.eventVotingConfig.findUnique({
			where: { eventId: resolvedEventId },
		});

		if (!votingConfig || !votingConfig.enabled || !votingConfig.isPaid) {
			return res.status(400).json({ error: "Voting berbayar tidak tersedia untuk event ini" });
		}

		const purchaseCode = generatePurchaseCode();
		const totalAmount = votingConfig.pricePerVote * voteCount;
		const adminFee = calculateVotingAdminFee(totalAmount, voteCount);

		const purchase = await prisma.votingPurchase.create({
			data: {
				eventId: resolvedEventId,
				buyerName,
				buyerEmail,
				buyerPhone: buyerPhone || null,
				voteCount,
				totalAmount,
				purchaseCode,
				status: totalAmount === 0 ? "PAID" : "PENDING",
				paidAt: totalAmount === 0 ? new Date() : null,
			},
		});

		// Generate Midtrans Snap token for paid voting
		let snapToken: string | null = null;
		let midtransOrderId: string | null = null;
		if (totalAmount > 0) {
			try {
				midtransOrderId = purchaseCode;
				const snapResult = await createSnapTransaction({
					orderId: midtransOrderId,
					grossAmount: totalAmount,
					customerName: buyerName,
					customerEmail: buyerEmail,
					customerPhone: buyerPhone,
					adminFee,
					itemDetails: [
						{
							id: resolvedEventId,
							price: votingConfig.pricePerVote,
							quantity: voteCount,
							name: "Paket Vote",
						},
					],
				});
				snapToken = snapResult.token;

				await prisma.votingPurchase.update({
					where: { id: purchase.id },
					data: { midtransOrderId, snapToken },
				});
			} catch (midtransError) {
				console.error("Midtrans Snap token generation failed:", midtransError);
			}
		}

		res.status(201).json({
			message: totalAmount === 0 ? "Vote berhasil didapatkan!" : "Pesanan vote berhasil dibuat!",
			purchase: { ...purchase, snapToken, midtransOrderId, adminFee, paymentAmount: totalAmount + adminFee },
		});
	} catch (error) {
		console.error("Error purchasing votes:", error);
		res.status(500).json({ error: "Gagal memesan vote" });
	}
});

// POST /api/voting/code-status - Public check for a purchased vote code
router.post("/code-status", optionalAuthenticate, async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { purchaseCode, eventId } = req.body;
		const normalizedPurchaseCode = normalizePurchaseCode(purchaseCode);

		if (!normalizedPurchaseCode) {
			return res.status(400).json({ error: "Kode pembelian wajib diisi" });
		}

		let purchase = await prisma.votingPurchase.findFirst({
			where: buildVotingPurchaseCodeLookupWhere(normalizedPurchaseCode),
			include: { event: { select: { id: true, title: true } } },
		});

		if (!purchase) {
			return res.status(404).json({ error: "Kode pembelian tidak valid" });
		}

		if (canRefreshVotingPurchasePaymentStatus(purchase)) {
			try {
				const refreshedPurchase = await refreshVotingPurchasePaymentStatus(purchase.id);
				if (refreshedPurchase) purchase = refreshedPurchase;
			} catch (midtransError) {
				console.error("Error refreshing voting payment status before code check:", midtransError);
			}
		}

		const resolvedEventId = eventId ? await resolveEventId(String(eventId)) : null;
		if (resolvedEventId && purchase.eventId !== resolvedEventId) {
			return res.status(400).json({ error: "Kode pembelian tidak valid untuk event ini" });
		}

		const remainingVotes = Math.max(0, purchase.voteCount - purchase.usedVotes);
		res.json({
			purchaseCode: purchase.purchaseCode,
			eventId: purchase.eventId,
			eventTitle: purchase.event.title,
			status: purchase.status,
			voteCount: purchase.voteCount,
			usedVotes: purchase.usedVotes,
			remainingVotes,
			message: purchase.status === "PAID"
				? remainingVotes > 0
					? "Kode vote aktif"
					: "Semua vote pada kode pembelian ini sudah digunakan"
				: getVotingPurchasePaymentMessage(purchase.status),
		});
	} catch (error) {
		console.error("Error checking vote code:", error);
		res.status(500).json({ error: "Gagal memeriksa kode vote" });
	}
});

// GET /api/voting/check/:purchaseCode - Check purchase status (requires auth)
router.get("/check/:purchaseCode", authenticate, async (req: AuthenticatedRequest, res: Response) => {
	try {
		const normalizedPurchaseCode = normalizePurchaseCode(req.params.purchaseCode);
		if (!normalizedPurchaseCode) {
			return res.status(400).json({ error: "Kode pembelian wajib diisi" });
		}

		let purchase = await prisma.votingPurchase.findFirst({
			where: buildVotingPurchaseCodeLookupWhere(normalizedPurchaseCode),
			include: {
				event: {
					select: { title: true, startDate: true, endDate: true, venue: true, city: true },
				},
			},
		});

		if (!purchase) {
			return res.status(404).json({ error: "Pembelian vote tidak ditemukan" });
		}

		if (canRefreshVotingPurchasePaymentStatus(purchase)) {
			try {
				const refreshedPurchase = await refreshVotingPurchasePaymentStatus(purchase.id);
				if (refreshedPurchase) purchase = refreshedPurchase;
			} catch (midtransError) {
				console.error("Error refreshing voting payment status before check:", midtransError);
			}
		}

		res.json({
			purchaseCode: purchase.purchaseCode,
			buyerName: purchase.buyerName,
			eventTitle: purchase.event.title,
			voteCount: purchase.voteCount,
			usedVotes: purchase.usedVotes,
			remainingVotes: purchase.voteCount - purchase.usedVotes,
			totalAmount: purchase.totalAmount,
			status: purchase.status,
		});
	} catch (error) {
		console.error("Error checking purchase:", error);
		res.status(500).json({ error: "Gagal memeriksa pembelian" });
	}
});

// ==========================================
// SEND VOTING CODE TO EMAIL
// ==========================================

// POST /api/voting/confirm-payment - Sync voting purchase payment status and email the original buyer
router.post("/confirm-payment", async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { purchaseCode, email } = req.body;
		const normalizedPurchaseCode = normalizePurchaseCode(purchaseCode);

		if (!normalizedPurchaseCode || !email) {
			return res.status(400).json({ error: "Kode pembelian dan email wajib diisi" });
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		const normalizedEmail = String(email).trim().toLowerCase();
		if (!emailRegex.test(normalizedEmail)) {
			return res.status(400).json({ error: "Format email tidak valid" });
		}

		let purchase = await prisma.votingPurchase.findFirst({
			where: buildVotingPurchaseCodeLookupWhere(normalizedPurchaseCode),
			include: { event: { select: { title: true } } },
		});

		if (!purchase) {
			return res.status(404).json({ error: "Pembelian vote tidak ditemukan" });
		}

		if (purchase.buyerEmail.trim().toLowerCase() !== normalizedEmail) {
			return res.status(403).json({ error: "Email tidak sesuai dengan pembelian vote" });
		}

		if (canRefreshVotingPurchasePaymentStatus(purchase)) {
			try {
				const refreshedPurchase = await refreshVotingPurchasePaymentStatus(purchase.id);
				if (refreshedPurchase) purchase = refreshedPurchase;
			} catch (midtransError) {
				console.error("Error confirming voting payment status:", midtransError);
			}
		}

		if (!purchase || purchase.status !== "PAID") {
			return res.json({
				status: purchase?.status || "UNKNOWN",
				message: getVotingPurchasePaymentMessage(purchase?.status),
			});
		}

		await sendVotingPurchaseEmail({
			to: purchase.buyerEmail,
			buyerName: purchase.buyerName,
			purchaseCode: purchase.purchaseCode,
			eventTitle: purchase.event.title,
			voteCount: purchase.voteCount,
			totalAmount: purchase.totalAmount,
		});

		res.json({
			status: purchase.status,
			message: "Pembayaran vote terkonfirmasi",
			purchaseCode: purchase.purchaseCode,
			voteCount: purchase.voteCount,
			usedVotes: purchase.usedVotes,
		});
	} catch (error: any) {
		console.error("Error confirming voting payment:", error);
		res.status(500).json({ error: "Gagal mengonfirmasi pembayaran vote" });
	}
});

// POST /api/voting/send-email - Send voting purchase code to email (requires auth)
router.post("/send-email", authenticate, async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { purchaseCode, email } = req.body;
		const normalizedPurchaseCode = normalizePurchaseCode(purchaseCode);

		if (!normalizedPurchaseCode || !email) {
			return res.status(400).json({ error: "Kode pembelian dan email wajib diisi" });
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return res.status(400).json({ error: "Format email tidak valid" });
		}

		let purchase = await prisma.votingPurchase.findFirst({
			where: buildVotingPurchaseCodeLookupWhere(normalizedPurchaseCode),
			include: {
				event: {
					select: { title: true },
				},
			},
		});

		if (!purchase) {
			return res.status(404).json({ error: "Pembelian vote tidak ditemukan" });
		}

		if (canRefreshVotingPurchasePaymentStatus(purchase)) {
			try {
				const refreshedPurchase = await refreshVotingPurchasePaymentStatus(purchase.id);
				if (refreshedPurchase) purchase = refreshedPurchase;
			} catch (midtransError) {
				console.error("Error refreshing voting payment status before email:", midtransError);
			}
		}

		if (!purchase || purchase.status !== "PAID") {
			return res.status(400).json({
				error: getVotingPurchasePaymentMessage(purchase?.status),
			});
		}

		await sendVotingPurchaseEmail({
			to: email,
			buyerName: purchase.buyerName,
			purchaseCode: purchase.purchaseCode,
			eventTitle: purchase.event.title,
			voteCount: purchase.voteCount,
			totalAmount: purchase.totalAmount,
		});

		res.json({ message: "Kode vote berhasil dikirim ke email" });
	} catch (error: any) {
		console.error("Error sending voting email:", error);
		res.status(500).json({ error: "Gagal mengirim email. Pastikan konfigurasi SMTP sudah benar." });
	}
});

// ==========================================
// ADMIN/PANITIA ROUTES
// ==========================================

// GET /api/voting/admin/event/:eventId/config - Get voting config
router.get(
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

			const event = await prisma.event.findUnique({
				where: { id: eventId },
				select: {
					startDate: true,
					endDate: true,
					registrationDeadline: true,
					packageTier: true,
					paymentStatus: true,
					platformSharePercent: true,
					schoolCategoryLimits: {
						include: { schoolCategory: { select: { id: true, name: true } } },
						orderBy: { schoolCategory: { order: "asc" } },
					},
				},
			});

			const config = await prisma.eventVotingConfig.findUnique({
				where: { eventId },
				include: {
					categories: {
						orderBy: { order: "asc" },
						include: {
							_count: {
								select: { nominees: true, votes: true },
							},
						},
					},
				},
			});

			const eventData = {
				startDate: event?.startDate || null,
				endDate: event?.endDate || null,
				registrationDeadline: event?.registrationDeadline || null,
				schoolCategories: (event?.schoolCategoryLimits || []).map((l) => ({
					id: l.schoolCategory.id,
					name: l.schoolCategory.name,
				})),
			};

			if (!config) {
				return res.json({
					eventId,
					enabled: false,
					isPaid: false,
					pricePerVote: 0,
					startDate: null,
					endDate: null,
					categories: [],
					event: eventData,
				});
			}

			res.json({ ...config, event: eventData });
		} catch (error) {
			console.error("Error fetching voting config:", error);
			res.status(500).json({ error: "Gagal memuat konfigurasi voting" });
		}
	}
);

// PUT /api/voting/admin/event/:eventId/config - Update voting config
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

			const { enabled, isPaid, pricePerVote, startDate, endDate } = req.body;
			const parsedStartDate = parseIndonesiaDateTime(startDate);
			const parsedEndDate = parseIndonesiaDateTime(endDate);
			const event = await prisma.event.findUnique({
				where: { id: eventId },
				select: { packageTier: true, platformSharePercent: true },
			});

			if (enabled && event && requiresVotingRevenueShareAgreement(event)) {
				return res.status(400).json({
					error: "Voting belum bisa diaktifkan. Hubungi admin untuk negosiasi dan pengaturan persentase bagi hasil terlebih dahulu.",
				});
			}

			const config = await prisma.eventVotingConfig.upsert({
				where: { eventId },
				create: {
					event: { connect: { id: eventId } },
					enabled: enabled ?? false,
					isPaid: isPaid ?? false,
					pricePerVote: pricePerVote ?? 0,
					startDate: parsedStartDate,
					endDate: parsedEndDate,
				},
				update: {
					enabled: enabled ?? false,
					isPaid: isPaid ?? false,
					pricePerVote: pricePerVote ?? 0,
					startDate: parsedStartDate,
					endDate: parsedEndDate,
				},
			});

			res.json(config);
		} catch (error: any) {
			if (error.message === "Tanggal voting tidak valid") {
				return res.status(400).json({ error: error.message });
			}
			console.error("Error updating voting config:", error);
			res.status(500).json({ error: "Gagal menyimpan konfigurasi voting" });
		}
	}
);

// POST /api/voting/admin/event/:eventId/close-voting - Close voting immediately
router.post(
	"/admin/event/:eventId/close-voting",
	authenticate,
	authorize("SUPERADMIN", "PANITIA"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const eventId = await resolveEventId(req.params.eventId);
			if (!eventId) return res.status(404).json({ error: "Event tidak ditemukan" });

			if (!(await verifyEventOwnership(req, eventId))) {
				return res.status(403).json({ error: "Tidak memiliki akses ke event ini" });
			}

			const config = await prisma.eventVotingConfig.update({
				where: { eventId },
				data: {
					enabled: false,
					endDate: new Date(),
				},
			});

			res.json(config);
		} catch (error) {
			console.error("Error closing voting:", error);
			res.status(500).json({ error: "Gagal menutup voting" });
		}
	}
);

// POST /api/voting/admin/event/:eventId/categories - Create voting category
router.post(
	"/admin/event/:eventId/categories",
	authenticate,
	authorize("SUPERADMIN", "PANITIA"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const eventId = await resolveEventId(req.params.eventId);
			if (!eventId) return res.status(404).json({ error: "Event tidak ditemukan" });

			if (!(await verifyEventOwnership(req, eventId))) {
				return res.status(403).json({ error: "Tidak memiliki akses ke event ini" });
			}

			// Ensure config exists
			let config = await prisma.eventVotingConfig.findUnique({ where: { eventId } });
			if (!config) {
				config = await prisma.eventVotingConfig.create({
					data: { event: { connect: { id: eventId } } },
				});
			}

			const { title, description, mode, position, schoolCategoryIds, maxVotesPerVoter, order } = req.body;

			if (!title) {
				return res.status(400).json({ error: "Judul kategori wajib diisi" });
			}

			const category = await prisma.votingCategory.create({
				data: {
					configId: config.id,
					title,
					description: description || null,
					mode: mode || "TEAM",
					position: position || null,
					schoolCategoryIds: schoolCategoryIds || [],
					maxVotesPerVoter: maxVotesPerVoter ?? 1,
					order: order ?? 0,
				},
			});

			res.status(201).json(category);
		} catch (error) {
			console.error("Error creating voting category:", error);
			res.status(500).json({ error: "Gagal membuat kategori voting" });
		}
	}
);

// PUT /api/voting/admin/categories/:categoryId - Update voting category
router.put(
	"/admin/categories/:categoryId",
	authenticate,
	authorize("SUPERADMIN", "PANITIA"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { title, description, mode, position, schoolCategoryIds, maxVotesPerVoter, isActive, order } = req.body;

			const category = await prisma.votingCategory.update({
				where: { id: req.params.categoryId },
				data: {
					...(title !== undefined && { title }),
					...(description !== undefined && { description: description || null }),
					...(mode !== undefined && { mode }),
					...(position !== undefined && { position: position || null }),
					...(schoolCategoryIds !== undefined && { schoolCategoryIds }),
					...(maxVotesPerVoter !== undefined && { maxVotesPerVoter }),
					...(isActive !== undefined && { isActive }),
					...(order !== undefined && { order }),
				},
			});

			res.json(category);
		} catch (error) {
			console.error("Error updating voting category:", error);
			res.status(500).json({ error: "Gagal mengubah kategori voting" });
		}
	}
);

// DELETE /api/voting/admin/categories/:categoryId - Delete voting category
router.delete(
	"/admin/categories/:categoryId",
	authenticate,
	authorize("SUPERADMIN", "PANITIA"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			await prisma.votingCategory.delete({
				where: { id: req.params.categoryId },
			});

			res.json({ message: "Kategori voting berhasil dihapus" });
		} catch (error) {
			console.error("Error deleting voting category:", error);
			res.status(500).json({ error: "Gagal menghapus kategori voting" });
		}
	}
);

// POST /api/voting/admin/categories/:categoryId/sync-nominees - Sync nominees from participation groups
router.post(
	"/admin/categories/:categoryId/sync-nominees",
	authenticate,
	authorize("SUPERADMIN", "PANITIA"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const category = await prisma.votingCategory.findUnique({
				where: { id: req.params.categoryId },
				include: {
					config: true,
					nominees: true,
				},
			});

			if (!category) {
				return res.status(404).json({ error: "Kategori voting tidak ditemukan" });
			}

			const eventId = category.config.eventId;

			// Build query to find participation groups
			const groupWhere: any = {
				participation: {
					eventId,
					status: "CONFIRMED",
				},
				status: "ACTIVE",
			};

			// Filter by school category if specified
			if (category.schoolCategoryIds.length > 0) {
				groupWhere.schoolCategoryId = { in: category.schoolCategoryIds };
			}

			const groups = await prisma.participationGroup.findMany({
				where: groupWhere,
				include: {
					participation: {
						include: {
							user: { select: { name: true } },
						},
					},
					schoolCategory: { select: { name: true } },
				},
			});

			let newNominees = 0;

			if (category.mode === "TEAM") {
				// TEAM mode: each group becomes a nominee
				for (const group of groups) {
					const existing = category.nominees.find((n) => n.groupId === group.id);
					if (!existing) {
						await prisma.votingNominee.create({
							data: {
								category: { connect: { id: category.id } },
								groupId: group.id,
								nomineeName: group.groupName,
								nomineeSubtitle: `${group.schoolCategory.name} - ${group.participation.schoolName || group.participation.user.name}`,
							},
						});
						newNominees++;
					}
				}
			} else {
				// PERSONAL mode: individual members from groups become nominees
				for (const group of groups) {
					// Parse memberData JSON to find members with matching position
					let members: any[] = [];
					if (group.memberData) {
						try {
							members = JSON.parse(group.memberData);
						} catch {
							continue;
						}
					}

					for (const member of members) {
						// Filter by position if specified
						if (category.position && member.position !== category.position) {
							continue;
						}

						// Check if already nominated (by group + member name combo)
						const existingByName = category.nominees.find(
							(n) => n.groupId === group.id && n.nomineeName === member.name
						);
						if (!existingByName) {
							await prisma.votingNominee.create({
								data: {
									category: { connect: { id: category.id } },
									groupId: group.id,
									nomineeName: member.name,
									nomineePhoto: member.photo || null,
									nomineeSubtitle: `${group.groupName} - ${group.schoolCategory.name}`,
								},
							});
							newNominees++;
						}
					}
				}
			}

			// Reload nominees
			const updatedCategory = await prisma.votingCategory.findUnique({
				where: { id: category.id },
				include: {
					nominees: {
						orderBy: { voteCount: "desc" },
					},
					_count: { select: { votes: true } },
				},
			});

			res.json({
				message: `Berhasil sinkronisasi ${newNominees} nominee baru`,
				category: updatedCategory,
			});
		} catch (error) {
			console.error("Error syncing nominees:", error);
			res.status(500).json({ error: "Gagal sinkronisasi nominee" });
		}
	}
);

// GET /api/voting/admin/categories/:categoryId/nominees - Get nominees for a category
router.get(
	"/admin/categories/:categoryId/nominees",
	authenticate,
	authorize("SUPERADMIN", "PANITIA"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const nominees = await prisma.votingNominee.findMany({
				where: { categoryId: req.params.categoryId },
				orderBy: { voteCount: "desc" },
			});

			res.json(nominees);
		} catch (error) {
			console.error("Error fetching nominees:", error);
			res.status(500).json({ error: "Gagal memuat nominee" });
		}
	}
);

// POST /api/voting/admin/categories/:categoryId/nominees - Add nominee manually
router.post(
	"/admin/categories/:categoryId/nominees",
	authenticate,
	authorize("SUPERADMIN", "PANITIA"),
	uploadNomineePhoto.single("nomineePhoto"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { nomineeName, nomineeSubtitle, groupId } = req.body;

			if (!nomineeName) {
				return res.status(400).json({ error: "Nama nominee wajib diisi" });
			}

			// Build photo URL from uploaded file or fallback to body field
			let nomineePhoto: string | null = null;
			if (req.file) {
				nomineePhoto = `/uploads/nominees/${req.file.filename}`;
			} else if (req.body.nomineePhotoUrl) {
				nomineePhoto = req.body.nomineePhotoUrl;
			}

			const nominee = await prisma.votingNominee.create({
				data: {
					category: { connect: { id: req.params.categoryId } },
					groupId: groupId || null,
					nomineeName,
					nomineePhoto,
					nomineeSubtitle: nomineeSubtitle || null,
				},
			});

			res.status(201).json(nominee);
		} catch (error) {
			console.error("Error creating nominee:", error);
			res.status(500).json({ error: "Gagal menambahkan nominee" });
		}
	}
);

// PUT /api/voting/admin/nominees/:nomineeId - Update nominee
router.put(
	"/admin/nominees/:nomineeId",
	authenticate,
	authorize("SUPERADMIN", "PANITIA"),
	uploadNomineePhoto.single("nomineePhoto"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { nomineeName, nomineeSubtitle, clearPhoto } = req.body;

			if (!nomineeName) {
				return res.status(400).json({ error: "Nama nominee wajib diisi" });
			}

			const updateData: Record<string, unknown> = {
				nomineeName,
				nomineeSubtitle: nomineeSubtitle || null,
			};

			if (req.file) {
				updateData.nomineePhoto = `/uploads/nominees/${req.file.filename}`;
			} else if (clearPhoto === "true") {
				updateData.nomineePhoto = null;
			}

			const nominee = await prisma.votingNominee.update({
				where: { id: req.params.nomineeId },
				data: updateData,
			});

			res.json(nominee);
		} catch (error) {
			console.error("Error updating nominee:", error);
			res.status(500).json({ error: "Gagal memperbarui nominee" });
		}
	}
);

// DELETE /api/voting/admin/nominees/:nomineeId - Delete nominee
router.delete(
	"/admin/nominees/:nomineeId",
	authenticate,
	authorize("SUPERADMIN", "PANITIA"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			await prisma.votingNominee.delete({
				where: { id: req.params.nomineeId },
			});

			res.json({ message: "Nominee berhasil dihapus" });
		} catch (error) {
			console.error("Error deleting nominee:", error);
			res.status(500).json({ error: "Gagal menghapus nominee" });
		}
	}
);

// GET /api/voting/admin/event/:eventId/results - Get voting results
router.get(
	"/admin/event/:eventId/results",
	authenticate,
	authorize("SUPERADMIN", "PANITIA"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const eventId = await resolveEventId(req.params.eventId);
			if (!eventId) return res.status(404).json({ error: "Event tidak ditemukan" });

			if (!(await verifyEventOwnership(req, eventId))) {
				return res.status(403).json({ error: "Tidak memiliki akses ke event ini" });
			}

			const config = await prisma.eventVotingConfig.findUnique({
				where: { eventId },
				include: {
					categories: {
						orderBy: { order: "asc" },
						include: {
							nominees: {
								orderBy: { voteCount: "desc" },
							},
							_count: {
								select: { votes: true },
							},
						},
					},
				},
			});

			if (!config) {
				return res.json({ categories: [], totalVotes: 0 });
			}

			const totalVotes = config.categories.reduce((sum, cat) => sum + cat._count.votes, 0);

			res.json({
				categories: config.categories,
				totalVotes,
				pricePerVote: config.pricePerVote,
				isPaid: config.isPaid,
			});
		} catch (error) {
			console.error("Error fetching voting results:", error);
			res.status(500).json({ error: "Gagal memuat hasil voting" });
		}
	}
);

// GET /api/voting/admin/event/:eventId/dashboard - Voting dashboard summary
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

			const config = await prisma.eventVotingConfig.findUnique({
				where: { eventId },
				include: {
					categories: {
						orderBy: { order: "asc" },
						include: {
							nominees: {
								orderBy: { voteCount: "desc" },
							},
							_count: {
								select: { votes: true, nominees: true },
							},
						},
					},
				},
			});

			if (!config) {
				return res.json({
					enabled: false,
					isPaid: false,
					pricePerVote: 0,
					totalVotes: 0,
					categoryCount: 0,
					nomineeCount: 0,
					topNominees: [],
					categoryBreakdown: [],
					purchaseSummary: null,
					dailyTrend: [],
				});
			}

			const totalVotes = config.categories.reduce((sum, cat) => sum + cat._count.votes, 0);
			const nomineeCount = config.categories.reduce((sum, cat) => sum + cat._count.nominees, 0);
			const topNominees = config.categories
				.flatMap((cat) =>
					cat.nominees.map((nominee) => ({
						id: nominee.id,
						categoryId: cat.id,
						categoryTitle: cat.title,
						name: nominee.nomineeName,
						subtitle: nominee.nomineeSubtitle,
						photo: nominee.nomineePhoto,
						votes: nominee.voteCount,
					}))
				)
				.sort((a, b) => b.votes - a.votes)
				.slice(0, 8);

			const categoryBreakdown = config.categories.map((cat) => ({
				id: cat.id,
				title: cat.title,
				votes: cat._count.votes,
				nomineeCount: cat._count.nominees,
				leadingNominee: cat.nominees[0]
					? {
							id: cat.nominees[0].id,
							name: cat.nominees[0].nomineeName,
							votes: cat.nominees[0].voteCount,
						}
					: null,
			}));

			const since = new Date();
			since.setDate(since.getDate() - 6);
			since.setHours(0, 0, 0, 0);

			const recentVotes = await prisma.votingVote.findMany({
				where: { category: { config: { eventId } }, createdAt: { gte: since } },
				select: { createdAt: true },
			});

			const dailyTrend = Array.from({ length: 7 }, (_, index) => {
				const date = new Date(since);
				date.setDate(since.getDate() + index);
				const key = date.toISOString().slice(0, 10);
				return {
					date: key,
					label: date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
					votes: recentVotes.filter((vote) => vote.createdAt.toISOString().slice(0, 10) === key).length,
				};
			});

			const purchases = config.isPaid
				? await prisma.votingPurchase.findMany({
						where: { eventId },
						select: {
							status: true,
							totalAmount: true,
							voteCount: true,
							usedVotes: true,
						},
					})
				: [];

			const purchaseSummary = config.isPaid
				? purchases.reduce(
						(summary, purchase) => {
							summary.total += 1;
							if (purchase.status === "PAID") {
								summary.paid += 1;
								summary.revenue += purchase.totalAmount;
								summary.voteCredits += purchase.voteCount;
								summary.usedVotes += purchase.usedVotes;
							} else if (purchase.status === "PENDING") {
								summary.pending += 1;
							} else if (purchase.status === "CANCELLED") {
								summary.cancelled += 1;
							} else if (purchase.status === "EXPIRED") {
								summary.expired += 1;
							}
							return summary;
						},
						{
							total: 0,
							paid: 0,
							pending: 0,
							cancelled: 0,
							expired: 0,
							revenue: 0,
							voteCredits: 0,
							usedVotes: 0,
							unusedVotes: 0,
							conversionRate: 0,
						}
					)
				: null;

			if (purchaseSummary) {
				purchaseSummary.unusedVotes = Math.max(0, purchaseSummary.voteCredits - purchaseSummary.usedVotes);
				purchaseSummary.conversionRate = purchaseSummary.total > 0 ? Math.round((purchaseSummary.paid / purchaseSummary.total) * 100) : 0;
			}

			res.json({
				enabled: config.enabled,
				isPaid: config.isPaid,
				pricePerVote: config.pricePerVote,
				totalVotes,
				categoryCount: config.categories.length,
				nomineeCount,
				topNominees,
				categoryBreakdown,
				purchaseSummary,
				dailyTrend,
			});
		} catch (error) {
			console.error("Error fetching voting dashboard:", error);
			res.status(500).json({ error: "Gagal memuat dashboard voting" });
		}
	}
);

// GET /api/voting/admin/event/:eventId/purchases - List vote purchases
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
					{ purchaseCode: { contains: search as string, mode: "insensitive" } },
					{ midtransOrderId: { contains: search as string, mode: "insensitive" } },
				];
			}

			const [purchases, total] = await Promise.all([
				prisma.votingPurchase.findMany({
					where,
					orderBy: { createdAt: "desc" },
					skip,
					take: limitNum,
				}),
				prisma.votingPurchase.count({ where }),
			]);

			res.json({
				data: purchases,
				total,
				page: pageNum,
				totalPages: Math.ceil(total / limitNum),
			});
		} catch (error) {
			console.error("Error fetching vote purchases:", error);
			res.status(500).json({ error: "Gagal memuat data pembelian vote" });
		}
	}
);

// Purchase status is managed automatically by Midtrans payment webhook
// No manual confirmation/cancellation endpoint needed

// POST /api/voting/admin/resend-email/:purchaseId - Resend voting purchase code email (admin troubleshoot)
router.post(
	"/admin/resend-email/:purchaseId",
	authenticate,
	authorize("SUPERADMIN", "PANITIA"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { email } = req.body;

			let purchase = await prisma.votingPurchase.findUnique({
				where: { id: req.params.purchaseId },
				include: {
					event: {
						select: { title: true },
					},
				},
			});

			if (!purchase) {
				return res.status(404).json({ error: "Pembelian vote tidak ditemukan" });
			}

			if (canRefreshVotingPurchasePaymentStatus(purchase)) {
				try {
					const refreshedPurchase = await refreshVotingPurchasePaymentStatus(purchase.id);
					if (refreshedPurchase) purchase = refreshedPurchase;
				} catch (midtransError) {
					console.error("Error refreshing voting payment status before resend:", midtransError);
				}
			}

			if (purchase.status !== "PAID") {
				return res.status(400).json({ error: getVotingPurchasePaymentMessage(purchase.status) });
			}

			const targetEmail = email?.trim() || purchase.buyerEmail;
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(targetEmail)) {
				return res.status(400).json({ error: "Format email tidak valid" });
			}

			await sendVotingPurchaseEmail({
				to: targetEmail,
				buyerName: purchase.buyerName,
				purchaseCode: purchase.purchaseCode,
				eventTitle: purchase.event.title,
				voteCount: purchase.voteCount,
				totalAmount: purchase.totalAmount,
			});

			console.log(`[Admin] Voting email resent to ${targetEmail} for purchase ${purchase.id} by admin ${req.user?.userId}`);

			res.json({ message: `Email kode vote berhasil dikirim ke ${targetEmail}` });
		} catch (error: any) {
			console.error("Error resending voting email:", error);
			res.status(500).json({ error: "Gagal mengirim email. Pastikan konfigurasi SMTP sudah benar." });
		}
	}
);

export default router;
