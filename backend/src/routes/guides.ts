import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, authorize, AuthenticatedRequest } from "../middleware/auth";
import { uploadGuideSlide } from "../middleware/upload";
import fs from "fs";
import path from "path";

const router = Router();
const prisma = new PrismaClient();

// ==========================================
// PUBLIC: Get published guides by role
// ==========================================
router.get("/public", async (req, res: Response) => {
	try {
		const { role } = req.query;
		const where: any = { isPublished: true };
		if (role && ["PANITIA", "JURI", "PESERTA"].includes(String(role))) {
			where.role = String(role);
		}

		const guides = await prisma.guide.findMany({
			where,
			include: {
				slides: { orderBy: { order: "asc" } },
			},
			orderBy: { order: "asc" },
		});

		res.json(guides);
	} catch (error) {
		console.error("Error fetching public guides:", error);
		res.status(500).json({ error: "Failed to fetch guides" });
	}
});

// ==========================================
// ADMIN: Get all guides (SUPERADMIN only)
// ==========================================
router.get(
	"/",
	authenticate,
	authorize("SUPERADMIN"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { role } = req.query;
			const where: any = {};
			if (role && ["PANITIA", "JURI", "PESERTA"].includes(String(role))) {
				where.role = String(role);
			}

			const guides = await prisma.guide.findMany({
				where,
				include: {
					slides: { orderBy: { order: "asc" } },
					_count: { select: { slides: true } },
				},
				orderBy: [{ role: "asc" }, { order: "asc" }],
			});

			res.json(guides);
		} catch (error) {
			console.error("Error fetching guides:", error);
			res.status(500).json({ error: "Failed to fetch guides" });
		}
	}
);

// ==========================================
// ADMIN: Get single guide
// ==========================================
router.get(
	"/:id",
	authenticate,
	authorize("SUPERADMIN"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const guide = await prisma.guide.findUnique({
				where: { id: req.params.id },
				include: {
					slides: { orderBy: { order: "asc" } },
				},
			});

			if (!guide) {
				return res.status(404).json({ error: "Guide not found" });
			}

			res.json(guide);
		} catch (error) {
			console.error("Error fetching guide:", error);
			res.status(500).json({ error: "Failed to fetch guide" });
		}
	}
);

// ==========================================
// ADMIN: Create guide
// ==========================================
router.post(
	"/",
	authenticate,
	authorize("SUPERADMIN"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { role, title, description, icon, order, isPublished } = req.body;

			if (!role || !title) {
				return res.status(400).json({ error: "Role and title are required" });
			}

			if (!["PANITIA", "JURI", "PESERTA"].includes(role)) {
				return res.status(400).json({ error: "Invalid role" });
			}

			const guide = await prisma.guide.create({
				data: {
					role,
					title,
					description: description || null,
					icon: icon || null,
					order: order ?? 0,
					isPublished: isPublished ?? false,
				},
				include: { slides: true },
			});

			res.status(201).json(guide);
		} catch (error) {
			console.error("Error creating guide:", error);
			res.status(500).json({ error: "Failed to create guide" });
		}
	}
);

// ==========================================
// ADMIN: Update guide
// ==========================================
router.patch(
	"/:id",
	authenticate,
	authorize("SUPERADMIN"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { title, description, icon, order, isPublished, role } = req.body;

			const existing = await prisma.guide.findUnique({ where: { id: req.params.id } });
			if (!existing) {
				return res.status(404).json({ error: "Guide not found" });
			}

			const guide = await prisma.guide.update({
				where: { id: req.params.id },
				data: {
					...(title !== undefined && { title }),
					...(description !== undefined && { description }),
					...(icon !== undefined && { icon }),
					...(order !== undefined && { order }),
					...(isPublished !== undefined && { isPublished }),
					...(role !== undefined && ["PANITIA", "JURI", "PESERTA"].includes(role) && { role }),
				},
				include: { slides: { orderBy: { order: "asc" } } },
			});

			res.json(guide);
		} catch (error) {
			console.error("Error updating guide:", error);
			res.status(500).json({ error: "Failed to update guide" });
		}
	}
);

// ==========================================
// ADMIN: Delete guide
// ==========================================
router.delete(
	"/:id",
	authenticate,
	authorize("SUPERADMIN"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			// Delete slide images first
			const slides = await prisma.guideSlide.findMany({
				where: { guideId: req.params.id },
			});
			for (const slide of slides) {
				if (slide.imageUrl) {
					const filePath = path.join(__dirname, "../..", slide.imageUrl);
					if (fs.existsSync(filePath)) {
						fs.unlinkSync(filePath);
					}
				}
			}

			await prisma.guide.delete({ where: { id: req.params.id } });
			res.json({ message: "Guide deleted" });
		} catch (error) {
			console.error("Error deleting guide:", error);
			res.status(500).json({ error: "Failed to delete guide" });
		}
	}
);

// ==========================================
// ADMIN: Add slide to guide
// ==========================================
router.post(
	"/:id/slides",
	authenticate,
	authorize("SUPERADMIN"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { title, description, order, imageUrl } = req.body;

			if (!title || !description) {
				return res.status(400).json({ error: "Title and description are required" });
			}

			const guide = await prisma.guide.findUnique({ where: { id: req.params.id } });
			if (!guide) {
				return res.status(404).json({ error: "Guide not found" });
			}

			const slide = await prisma.guideSlide.create({
				data: {
					guide: { connect: { id: req.params.id } },
					title,
					description,
					order: order ?? 0,
					imageUrl: imageUrl || null,
				},
			});

			res.status(201).json(slide);
		} catch (error) {
			console.error("Error creating slide:", error);
			res.status(500).json({ error: "Failed to create slide" });
		}
	}
);

// ==========================================
// ADMIN: Update slide
// ==========================================
router.patch(
	"/slides/:slideId",
	authenticate,
	authorize("SUPERADMIN"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { title, description, order, imageUrl } = req.body;

			const existing = await prisma.guideSlide.findUnique({ where: { id: req.params.slideId } });
			if (!existing) {
				return res.status(404).json({ error: "Slide not found" });
			}

			const slide = await prisma.guideSlide.update({
				where: { id: req.params.slideId },
				data: {
					...(title !== undefined && { title }),
					...(description !== undefined && { description }),
					...(order !== undefined && { order }),
					...(imageUrl !== undefined && { imageUrl }),
				},
			});

			res.json(slide);
		} catch (error) {
			console.error("Error updating slide:", error);
			res.status(500).json({ error: "Failed to update slide" });
		}
	}
);

// ==========================================
// ADMIN: Delete slide
// ==========================================
router.delete(
	"/slides/:slideId",
	authenticate,
	authorize("SUPERADMIN"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const slide = await prisma.guideSlide.findUnique({ where: { id: req.params.slideId } });
			if (!slide) {
				return res.status(404).json({ error: "Slide not found" });
			}

			// Delete image file
			if (slide.imageUrl) {
				const filePath = path.join(__dirname, "../..", slide.imageUrl);
				if (fs.existsSync(filePath)) {
					fs.unlinkSync(filePath);
				}
			}

			await prisma.guideSlide.delete({ where: { id: req.params.slideId } });
			res.json({ message: "Slide deleted" });
		} catch (error) {
			console.error("Error deleting slide:", error);
			res.status(500).json({ error: "Failed to delete slide" });
		}
	}
);

// ==========================================
// ADMIN: Upload slide image
// ==========================================
router.post(
	"/slides/upload-image",
	authenticate,
	authorize("SUPERADMIN"),
	uploadGuideSlide.single("image"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			if (!req.file) {
				return res.status(400).json({ error: "No image uploaded" });
			}
			const imageUrl = `/uploads/guides/${req.file.filename}`;
			res.json({ imageUrl });
		} catch (error) {
			console.error("Error uploading guide image:", error);
			res.status(500).json({ error: "Failed to upload image" });
		}
	}
);

// ==========================================
// ADMIN: Reorder slides within a guide
// ==========================================
router.patch(
	"/:id/slides/reorder",
	authenticate,
	authorize("SUPERADMIN"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { slideIds } = req.body; // Array of slide IDs in new order
			if (!Array.isArray(slideIds)) {
				return res.status(400).json({ error: "slideIds array is required" });
			}

			await prisma.$transaction(
				slideIds.map((id: string, index: number) =>
					prisma.guideSlide.update({
						where: { id },
						data: { order: index },
					})
				)
			);

			const guide = await prisma.guide.findUnique({
				where: { id: req.params.id },
				include: { slides: { orderBy: { order: "asc" } } },
			});

			res.json(guide);
		} catch (error) {
			console.error("Error reordering slides:", error);
			res.status(500).json({ error: "Failed to reorder slides" });
		}
	}
);

export default router;
