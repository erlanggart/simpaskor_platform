import { Router, Response } from "express";
import { PrismaClient, VotingPurchaseStatus } from "@prisma/client";
import {
	authenticate,
	authorize,
	optionalAuthenticate,
	AuthenticatedRequest,
} from "../middleware/auth";
import crypto from "crypto";

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

// Generate unique purchase code
const generatePurchaseCode = (): string => {
	const timestamp = Date.now().toString(36).toUpperCase();
	const random = crypto.randomBytes(4).toString("hex").toUpperCase();
	return `VOT-${timestamp}-${random}`;
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

		if (!categoryId || !nomineeId || !purchaseCode) {
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
		const purchase = await prisma.votingPurchase.findUnique({
			where: { purchaseCode },
		});

		if (!purchase || purchase.status !== "PAID") {
			return res.status(400).json({ error: "Kode pembelian tidak valid atau belum dibayar" });
		}

		if (purchase.eventId !== category.config.eventId) {
			return res.status(400).json({ error: "Kode pembelian tidak valid untuk event ini" });
		}

		if (purchase.usedVotes >= purchase.voteCount) {
			return res.status(400).json({ error: "Semua vote pada kode pembelian ini sudah digunakan" });
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

			await tx.votingPurchase.update({
				where: { id: purchase.id },
				data: { usedVotes: { increment: 1 } },
			});

			return vote;
		});

		res.status(201).json({ message: "Vote berhasil!", vote: result });
	} catch (error) {
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

		res.status(201).json({
			message: totalAmount === 0 ? "Vote berhasil didapatkan!" : "Pesanan vote berhasil dibuat!",
			purchase,
		});
	} catch (error) {
		console.error("Error purchasing votes:", error);
		res.status(500).json({ error: "Gagal memesan vote" });
	}
});

// GET /api/voting/check/:purchaseCode - Check purchase status
router.get("/check/:purchaseCode", async (req: AuthenticatedRequest, res: Response) => {
	try {
		const purchase = await prisma.votingPurchase.findUnique({
			where: { purchaseCode: req.params.purchaseCode },
			include: {
				event: {
					select: { title: true, startDate: true, endDate: true, venue: true, city: true },
				},
			},
		});

		if (!purchase) {
			return res.status(404).json({ error: "Pembelian vote tidak ditemukan" });
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

			const event = await prisma.event.findUnique({
				where: { id: eventId },
				select: {
					startDate: true,
					endDate: true,
					registrationDeadline: true,
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

			const { enabled, isPaid, pricePerVote, startDate, endDate } = req.body;

			const config = await prisma.eventVotingConfig.upsert({
				where: { eventId },
				create: {
					event: { connect: { id: eventId } },
					enabled: enabled ?? false,
					isPaid: isPaid ?? false,
					pricePerVote: pricePerVote ?? 0,
					startDate: startDate ? new Date(startDate) : null,
					endDate: endDate ? new Date(endDate) : null,
				},
				update: {
					enabled: enabled ?? false,
					isPaid: isPaid ?? false,
					pricePerVote: pricePerVote ?? 0,
					startDate: startDate ? new Date(startDate) : null,
					endDate: endDate ? new Date(endDate) : null,
				},
			});

			res.json(config);
		} catch (error) {
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
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { nomineeName, nomineePhoto, nomineeSubtitle, groupId } = req.body;

			if (!nomineeName) {
				return res.status(400).json({ error: "Nama nominee wajib diisi" });
			}

			const nominee = await prisma.votingNominee.create({
				data: {
					category: { connect: { id: req.params.categoryId } },
					groupId: groupId || null,
					nomineeName,
					nomineePhoto: nomineePhoto || null,
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
			});
		} catch (error) {
			console.error("Error fetching voting results:", error);
			res.status(500).json({ error: "Gagal memuat hasil voting" });
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

			const where: any = { eventId };

			if (status) {
				where.status = status;
			}

			if (search) {
				where.OR = [
					{ buyerName: { contains: search as string, mode: "insensitive" } },
					{ buyerEmail: { contains: search as string, mode: "insensitive" } },
					{ purchaseCode: { contains: search as string, mode: "insensitive" } },
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

// PATCH /api/voting/admin/purchases/:purchaseId/status - Update purchase status
router.patch(
	"/admin/purchases/:purchaseId/status",
	authenticate,
	authorize("SUPERADMIN", "PANITIA"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { status } = req.body;
			const validStatuses: VotingPurchaseStatus[] = ["PENDING", "PAID", "EXPIRED", "CANCELLED"];

			if (!validStatuses.includes(status)) {
				return res.status(400).json({ error: "Status tidak valid" });
			}

			const purchase = await prisma.votingPurchase.findUnique({
				where: { id: req.params.purchaseId },
			});

			if (!purchase) {
				return res.status(404).json({ error: "Pembelian vote tidak ditemukan" });
			}

			const updateData: any = { status };

			if (status === "PAID") {
				updateData.paidAt = new Date();
			}

			const updated = await prisma.votingPurchase.update({
				where: { id: req.params.purchaseId },
				data: updateData,
			});

			res.json(updated);
		} catch (error) {
			console.error("Error updating purchase status:", error);
			res.status(500).json({ error: "Gagal mengubah status pembelian" });
		}
	}
);

export default router;
