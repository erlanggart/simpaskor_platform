import express, { Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";

const router = express.Router();

// GET /api/juara-categories/event/:eventSlug - Get all juara categories for an event
router.get(
	"/event/:eventSlug",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { eventSlug } = req.params;

			// Find event by slug
			const event = await prisma.event.findUnique({
				where: { slug: eventSlug },
				select: { id: true },
			});

			if (!event) {
				return res.status(404).json({ error: "Event tidak ditemukan" });
			}

			const juaraCategories = await prisma.juaraCategory.findMany({
				where: { eventId: event.id },
				include: {
					assessmentCategories: {
						select: {
							assessmentCategoryId: true,
						},
					},
					ranks: {
						orderBy: { order: "asc" },
					},
				},
				orderBy: [{ type: "asc" }, { order: "asc" }],
			});

			// Transform to include assessment category IDs as array and ranks
			const result = juaraCategories.map((jc) => ({
				id: jc.id,
				eventId: jc.eventId,
				type: jc.type,
				name: jc.name,
				description: jc.description,
				order: jc.order,
				assessmentCategoryIds: jc.assessmentCategories.map(
					(ac: { assessmentCategoryId: string }) => ac.assessmentCategoryId
				),
				ranks: jc.ranks.map((r: { id: string; startRank: number; endRank: number; label: string; order: number }) => ({
					id: r.id,
					startRank: r.startRank,
					endRank: r.endRank,
					label: r.label,
					order: r.order,
				})),
				createdAt: jc.createdAt,
				updatedAt: jc.updatedAt,
			}));

			res.json(result);
		} catch (error) {
			console.error("Error fetching juara categories:", error);
			res.status(500).json({ error: "Gagal mengambil data kategori juara" });
		}
	}
);

// POST /api/juara-categories - Create a new juara category
router.post(
	"/",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { eventId, type, name, description, order, assessmentCategoryIds } =
				req.body;

			// Validate required fields
			if (!eventId || !type || !name) {
				return res.status(400).json({ error: "eventId, type, dan name wajib diisi" });
			}

			// Validate type
			if (!["UTAMA", "UMUM", "CUSTOM"].includes(type)) {
				return res.status(400).json({ error: "Tipe tidak valid" });
			}

			// Check if event exists
			const event = await prisma.event.findUnique({
				where: { id: eventId },
			});

			if (!event) {
				return res.status(404).json({ error: "Event tidak ditemukan" });
			}

			// Count existing custom categories (max 2)
			if (type === "CUSTOM") {
				const customCount = await prisma.juaraCategory.count({
					where: { eventId, type: "CUSTOM" },
				});

				if (customCount >= 2) {
					return res.status(400).json({
						error: "Maksimal 2 kategori juara custom per event",
					});
				}
			}

			// Check for UTAMA and UMUM uniqueness
			if (type === "UTAMA" || type === "UMUM") {
				const existing = await prisma.juaraCategory.findFirst({
					where: { eventId, type },
				});

				if (existing) {
					return res.status(400).json({
						error: `Kategori Juara ${type === "UTAMA" ? "Utama" : "Umum"} sudah ada`,
					});
				}
			}

			// Create juara category with assessment categories
			const juaraCategory = await prisma.juaraCategory.create({
				data: {
					eventId,
					type,
					name,
					description,
					order: order || 0,
					assessmentCategories: {
						create: (assessmentCategoryIds || []).map(
							(assessmentCategoryId: string) => ({
								assessmentCategoryId,
							})
						),
					},
				},
				include: {
					assessmentCategories: true,
				},
			});

			res.status(201).json({
				...juaraCategory,
				assessmentCategoryIds: juaraCategory.assessmentCategories.map(
					(ac) => ac.assessmentCategoryId
				),
			});
		} catch (error) {
			console.error("Error creating juara category:", error);
			res.status(500).json({ error: "Gagal membuat kategori juara" });
		}
	}
);

// PUT /api/juara-categories/:id - Update a juara category
router.put(
	"/:id",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { id } = req.params;
			const { name, description, order, assessmentCategoryIds } = req.body;

			// Check if juara category exists
			const existing = await prisma.juaraCategory.findUnique({
				where: { id },
			});

			if (!existing) {
				return res.status(404).json({ error: "Kategori juara tidak ditemukan" });
			}

			// Update with transaction
			const updated = await prisma.$transaction(async (tx) => {
				// Delete existing assessment category links
				await tx.juaraCategoryAssessment.deleteMany({
					where: { juaraCategoryId: id },
				});

				// Update juara category with new assessment categories
				return tx.juaraCategory.update({
					where: { id },
					data: {
						name,
						description,
						order,
						assessmentCategories: {
							create: (assessmentCategoryIds || []).map(
								(assessmentCategoryId: string) => ({
									assessmentCategoryId,
								})
							),
						},
					},
					include: {
						assessmentCategories: true,
					},
				});
			});

			res.json({
				...updated,
				assessmentCategoryIds: updated.assessmentCategories.map(
					(ac) => ac.assessmentCategoryId
				),
			});
		} catch (error) {
			console.error("Error updating juara category:", error);
			res.status(500).json({ error: "Gagal mengubah kategori juara" });
		}
	}
);

// DELETE /api/juara-categories/:id - Delete a juara category
router.delete(
	"/:id",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { id } = req.params;

			// Check if exists
			const existing = await prisma.juaraCategory.findUnique({
				where: { id },
			});

			if (!existing) {
				return res.status(404).json({ error: "Kategori juara tidak ditemukan" });
			}

			await prisma.juaraCategory.delete({
				where: { id },
			});

			res.json({ message: "Kategori juara berhasil dihapus" });
		} catch (error) {
			console.error("Error deleting juara category:", error);
			res.status(500).json({ error: "Gagal menghapus kategori juara" });
		}
	}
);

// POST /api/juara-categories/event/:eventSlug/bulk - Bulk save juara categories
router.post(
	"/event/:eventSlug/bulk",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { eventSlug } = req.params;
			const { categories } = req.body;

			// Find event by slug
			const event = await prisma.event.findUnique({
				where: { slug: eventSlug },
				select: { id: true },
			});

			if (!event) {
				return res.status(404).json({ error: "Event tidak ditemukan" });
			}

			// Validate categories
			if (!Array.isArray(categories)) {
				return res.status(400).json({ error: "Categories harus berupa array" });
			}

			// Count custom categories
			const customCount = categories.filter((c: any) => c.type === "CUSTOM").length;
			if (customCount > 2) {
				return res.status(400).json({
					error: "Maksimal 2 kategori juara custom per event",
				});
			}

			// Transaction: delete existing and create new
			const result = await prisma.$transaction(async (tx) => {
				// Delete all existing juara ranks for this event
				await tx.juaraRank.deleteMany({
					where: {
						juaraCategory: {
							eventId: event.id,
						},
					},
				});

				// Delete all existing juara categories for this event
				await tx.juaraCategoryAssessment.deleteMany({
					where: {
						juaraCategory: {
							eventId: event.id,
						},
					},
				});

				await tx.juaraCategory.deleteMany({
					where: { eventId: event.id },
				});

				// Create new categories with ranks
				const created = [];
				for (const cat of categories) {
					const juaraCategory = await tx.juaraCategory.create({
						data: {
							eventId: event.id,
							type: cat.type,
							name: cat.name,
							description: cat.description || null,
							order: cat.order || 0,
							assessmentCategories: {
								create: (cat.assessmentCategoryIds || []).map(
									(assessmentCategoryId: string) => ({
										assessmentCategoryId,
									})
								),
							},
							ranks: {
								create: (cat.ranks || []).map(
									(rank: { startRank: number; endRank: number; label: string; order: number }, idx: number) => ({
										startRank: rank.startRank,
										endRank: rank.endRank,
										label: rank.label,
										order: rank.order ?? idx,
									})
								),
							},
						},
						include: {
							assessmentCategories: true,
							ranks: {
								orderBy: { order: "asc" },
							},
						},
					});

					created.push({
						...juaraCategory,
						assessmentCategoryIds: juaraCategory.assessmentCategories.map(
							(ac: { assessmentCategoryId: string }) => ac.assessmentCategoryId
						),
						ranks: juaraCategory.ranks.map((r: { id: string; startRank: number; endRank: number; label: string; order: number }) => ({
							id: r.id,
							startRank: r.startRank,
							endRank: r.endRank,
							label: r.label,
							order: r.order,
						})),
					});
				}

				return created;
			});

			res.json(result);
		} catch (error) {
			console.error("Error bulk saving juara categories:", error);
			res.status(500).json({ error: "Gagal menyimpan kategori juara" });
		}
	}
);

export default router;
