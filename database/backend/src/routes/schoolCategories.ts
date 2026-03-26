import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Get all school categories
router.get("/", async (req, res) => {
	try {
		const categories = await prisma.schoolCategory.findMany({
			where: { isActive: true },
			orderBy: [{ order: "asc" }, { name: "asc" }],
		});

		res.json(categories);
	} catch (error) {
		console.error("Error fetching school categories:", error);
		res.status(500).json({ error: "Failed to fetch school categories" });
	}
});

// Get single school category
router.get("/:id", async (req, res) => {
	try {
		const { id } = req.params;

		const category = await prisma.schoolCategory.findUnique({
			where: { id },
		});

		if (!category) {
			return res.status(404).json({ error: "School category not found" });
		}

		res.json(category);
	} catch (error) {
		console.error("Error fetching school category:", error);
		res.status(500).json({ error: "Failed to fetch school category" });
	}
});

// Create school category (SuperAdmin only)
router.post("/", authenticate, authorize("SUPERADMIN"), async (req, res) => {
	try {
		const { name, description, order } = req.body;

		if (!name) {
			return res.status(400).json({ error: "Name is required" });
		}

		// Check if name already exists
		const existing = await prisma.schoolCategory.findUnique({
			where: { name: name.trim() },
		});

		if (existing) {
			return res
				.status(409)
				.json({ error: "School category with this name already exists" });
		}

		const category = await prisma.schoolCategory.create({
			data: {
				name: name.trim(),
				description: description?.trim() || null,
				order: order ? parseInt(order) : 0,
			},
		});

		res.status(201).json(category);
	} catch (error) {
		console.error("Error creating school category:", error);
		res.status(500).json({ error: "Failed to create school category" });
	}
});

// Update school category (SuperAdmin only)
router.put("/:id", authenticate, authorize("SUPERADMIN"), async (req, res) => {
	try {
		const { id } = req.params;
		const { name, description, order, isActive } = req.body;

		const existing = await prisma.schoolCategory.findUnique({
			where: { id },
		});

		if (!existing) {
			return res.status(404).json({ error: "School category not found" });
		}

		// If name is being changed, check for duplicates
		if (name && name.trim() !== existing.name) {
			const duplicate = await prisma.schoolCategory.findFirst({
				where: {
					name: name.trim(),
					NOT: { id },
				},
			});

			if (duplicate) {
				return res
					.status(409)
					.json({ error: "School category with this name already exists" });
			}
		}

		const category = await prisma.schoolCategory.update({
			where: { id },
			data: {
				...(name && { name: name.trim() }),
				...(description !== undefined && {
					description: description?.trim() || null,
				}),
				...(order !== undefined && { order: parseInt(order) }),
				...(isActive !== undefined && { isActive }),
			},
		});

		res.json(category);
	} catch (error) {
		console.error("Error updating school category:", error);
		res.status(500).json({ error: "Failed to update school category" });
	}
});

// Delete school category (SuperAdmin only)
router.delete(
	"/:id",
	authenticate,
	authorize("SUPERADMIN"),
	async (req, res) => {
		try {
			const { id } = req.params;

			const existing = await prisma.schoolCategory.findUnique({
				where: { id },
				include: {
					_count: {
						select: {
							participations: true,
							eventLimits: true,
						},
					},
				},
			});

			if (!existing) {
				return res.status(404).json({ error: "School category not found" });
			}

			// Check if category is in use
			if (
				existing._count.participations > 0 ||
				existing._count.eventLimits > 0
			) {
				return res.status(409).json({
					error: "Cannot delete school category that is in use by events or participants",
				});
			}

			await prisma.schoolCategory.delete({
				where: { id },
			});

			res.json({ message: "School category deleted successfully" });
		} catch (error) {
			console.error("Error deleting school category:", error);
			res.status(500).json({ error: "Failed to delete school category" });
		}
	}
);

export default router;
