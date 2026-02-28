import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Get all assessment categories
router.get("/", async (req, res) => {
	try {
		const categories = await prisma.assessmentCategory.findMany({
			orderBy: [{ order: "asc" }, { name: "asc" }],
		});

		res.json(categories);
	} catch (error) {
		console.error("Error fetching assessment categories:", error);
		res.status(500).json({ error: "Failed to fetch assessment categories" });
	}
});

// Get single assessment category
router.get("/:id", async (req, res) => {
	try {
		const { id } = req.params;

		const category = await prisma.assessmentCategory.findUnique({
			where: { id },
		});

		if (!category) {
			return res.status(404).json({ error: "Assessment category not found" });
		}

		res.json(category);
	} catch (error) {
		console.error("Error fetching assessment category:", error);
		res.status(500).json({ error: "Failed to fetch assessment category" });
	}
});

// Create assessment category (SuperAdmin only)
router.post("/", authenticate, authorize("SUPERADMIN"), async (req, res) => {
	try {
		const { name, description, order } = req.body;

		if (!name) {
			return res.status(400).json({ error: "Name is required" });
		}

		// Check if name already exists
		const existing = await prisma.assessmentCategory.findUnique({
			where: { name: name.trim() },
		});

		if (existing) {
			return res
				.status(409)
				.json({ error: "Assessment category with this name already exists" });
		}

		const category = await prisma.assessmentCategory.create({
			data: {
				name: name.trim(),
				description: description?.trim() || null,
				order: order ? parseInt(order) : 0,
			},
		});

		res.status(201).json(category);
	} catch (error) {
		console.error("Error creating assessment category:", error);
		res.status(500).json({ error: "Failed to create assessment category" });
	}
});

// Create custom assessment category (PANITIA can create during event creation)
router.post("/custom", authenticate, async (req, res) => {
	try {
		const { name } = req.body;

		if (!name || !name.trim()) {
			return res.status(400).json({ error: "Nama kategori harus diisi" });
		}

		const trimmedName = name.trim();

		// Check if name already exists (case-insensitive)
		const existing = await prisma.assessmentCategory.findFirst({
			where: { 
				name: { equals: trimmedName, mode: "insensitive" }
			},
		});

		if (existing) {
			// Return existing category instead of error
			return res.json({ 
				...existing, 
				existed: true,
				message: "Kategori sudah ada, menggunakan yang sudah tersedia" 
			});
		}

		// Get max order
		const maxOrder = await prisma.assessmentCategory.aggregate({
			_max: { order: true }
		});

		const category = await prisma.assessmentCategory.create({
			data: {
				name: trimmedName,
				description: null,
				order: (maxOrder._max.order || 0) + 1,
				isActive: true,
			},
		});

		res.status(201).json(category);
	} catch (error) {
		console.error("Error creating custom assessment category:", error);
		res.status(500).json({ error: "Gagal membuat kategori penilaian" });
	}
});

// Update assessment category (SuperAdmin only)
router.put("/:id", authenticate, authorize("SUPERADMIN"), async (req, res) => {
	try {
		const { id } = req.params;
		const { name, description, order, isActive } = req.body;

		const category = await prisma.assessmentCategory.findUnique({
			where: { id },
		});

		if (!category) {
			return res.status(404).json({ error: "Assessment category not found" });
		}

		// Check if new name conflicts with existing
		if (name && name.trim() !== category.name) {
			const existing = await prisma.assessmentCategory.findUnique({
				where: { name: name.trim() },
			});

			if (existing) {
				return res
					.status(409)
					.json({ error: "Assessment category with this name already exists" });
			}
		}

		const updated = await prisma.assessmentCategory.update({
			where: { id },
			data: {
				name: name?.trim() || category.name,
				description:
					description !== undefined
						? description?.trim() || null
						: category.description,
				order: order !== undefined ? parseInt(order) : category.order,
				isActive: isActive !== undefined ? isActive : category.isActive,
			},
		});

		res.json(updated);
	} catch (error) {
		console.error("Error updating assessment category:", error);
		res.status(500).json({ error: "Failed to update assessment category" });
	}
});

// Delete assessment category (SuperAdmin only)
router.delete(
	"/:id",
	authenticate,
	authorize("SUPERADMIN"),
	async (req, res) => {
		try {
			const { id } = req.params;

			const category = await prisma.assessmentCategory.findUnique({
				where: { id },
				include: {
					eventCategories: true,
					evaluations: true,
				},
			});

			if (!category) {
				return res.status(404).json({ error: "Assessment category not found" });
			}

			// Check if category is being used
			if (category.eventCategories.length > 0) {
				return res.status(400).json({
					error: "Cannot delete assessment category",
					message: `This category is used in ${category.eventCategories.length} event(s)`,
				});
			}

			if (category.evaluations.length > 0) {
				return res.status(400).json({
					error: "Cannot delete assessment category",
					message: `This category has ${category.evaluations.length} evaluation(s)`,
				});
			}

			await prisma.assessmentCategory.delete({
				where: { id },
			});

			res.json({ message: "Assessment category deleted successfully" });
		} catch (error) {
			console.error("Error deleting assessment category:", error);
			res.status(500).json({ error: "Failed to delete assessment category" });
		}
	}
);

export default router;
