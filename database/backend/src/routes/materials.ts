import express, { Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";

const router = express.Router();

// Score category interface for type safety
interface ScoreOption {
	name: string;
	score: number;
	order?: number;
}

interface ScoreCategory {
	name: string;
	color: string;
	order?: number;
	options: ScoreOption[];
}

// Helper to safely parse JSON field to ScoreCategory[]
function parseScoreCategories(json: Prisma.JsonValue | null | undefined): ScoreCategory[] {
	if (!json || typeof json !== 'object' || !Array.isArray(json)) return [];
	return json as unknown as ScoreCategory[];
}

// Middleware to check if user is PANITIA managing the event, SUPERADMIN, or JURI assigned to the event
const requireEventAccess = async (
	req: AuthenticatedRequest,
	res: Response,
	next: () => void
) => {
	const user = req.user;
	const eventIdOrSlug = req.params.eventIdOrSlug || req.params.eventId;

	if (!user) {
		return res.status(401).json({ error: "Unauthorized" });
	}

	// SuperAdmin can access any event
	if (user.role === "SUPERADMIN") {
		// Find and attach event
		const event = await prisma.event.findFirst({
			where: {
				OR: [{ slug: eventIdOrSlug }, { id: eventIdOrSlug }],
			},
		});
		if (!event) {
			return res.status(404).json({ error: "Event not found" });
		}
		(req as AuthenticatedRequest & { eventId: string }).eventId = event.id;
		return next();
	}

	// Find event by slug or ID
	const event = await prisma.event.findFirst({
		where: {
			OR: [{ slug: eventIdOrSlug }, { id: eventIdOrSlug }],
		},
	});

	if (!event) {
		return res.status(404).json({ error: "Event not found" });
	}

	// Check PANITIA access (owner of event)
	if (user.role === "PANITIA") {
		if (event.createdById === user.userId) {
			(req as AuthenticatedRequest & { eventId: string }).eventId = event.id;
			return next();
		}
	}

	// Check JURI access (read-only for materials)
	if (user.role === "JURI") {
		const juryAssignment = await prisma.juryEventAssignment.findFirst({
			where: {
				juryId: user.userId,
				eventId: event.id,
				status: "CONFIRMED",
			},
		});

		if (juryAssignment) {
			(req as AuthenticatedRequest & { eventId: string }).eventId = event.id;
			return next();
		}
	}

	return res.status(403).json({ error: "Access denied" });
};

// Helper to get school category names from IDs
async function getSchoolCategoryNames(schoolCategoryIds: string[]) {
	if (!schoolCategoryIds || schoolCategoryIds.length === 0) return [];
	
	const categories = await prisma.schoolCategory.findMany({
		where: { id: { in: schoolCategoryIds } },
		select: { id: true, name: true },
	});
	
	return categories;
}

// GET /api/materials/event/:eventIdOrSlug - Get all materials with school categories and score categories
router.get(
	"/event/:eventIdOrSlug",
	authenticate,
	requireEventAccess,
	async (req: AuthenticatedRequest & { eventId?: string }, res) => {
		try {
			const eventId = req.eventId;

			if (!eventId) {
				return res.status(400).json({ error: "Event ID not found" });
			}

			// Get event's school categories (from EventSchoolCategoryLimit)
			const eventSchoolCategories =
				await prisma.eventSchoolCategoryLimit.findMany({
					where: { eventId },
					include: {
						schoolCategory: {
							select: {
								id: true,
								name: true,
								order: true,
							},
						},
					},
					orderBy: {
						schoolCategory: {
							order: "asc",
						},
					},
				});

			// Get assessment categories for this event
			const eventCategories = await prisma.eventAssessmentCategory.findMany({
				where: { eventId },
				include: {
					assessmentCategory: {
						select: {
							id: true,
							name: true,
							description: true,
							order: true,
						},
					},
				},
				orderBy: {
					assessmentCategory: {
						order: "asc",
					},
				},
			});

			// Get jury assignments for this event to count juries per category
			const juryAssignments = await prisma.juryEventAssignment.findMany({
				where: {
					eventId,
					status: "CONFIRMED",
				},
				include: {
					assignedCategories: {
						select: {
							assessmentCategoryId: true,
						},
					},
				},
			});

			// Count juries per assessment category
			const juryCategoryCount = new Map<string, number>();
			juryAssignments.forEach((assignment) => {
				assignment.assignedCategories.forEach((ac) => {
					const count = juryCategoryCount.get(ac.assessmentCategoryId) || 0;
					juryCategoryCount.set(ac.assessmentCategoryId, count + 1);
				});
			});

			// Get materials - no more JOINs needed!
			const materials = await prisma.eventMaterial.findMany({
				where: { eventId },
				orderBy: [{ eventAssessmentCategoryId: "asc" }, { number: "asc" }],
			});

			// Get all unique school category IDs to fetch names
			const allSchoolCategoryIds = new Set<string>();
			materials.forEach(m => {
				(m.schoolCategoryIds || []).forEach(id => allSchoolCategoryIds.add(id));
			});
			
			const schoolCategoryMap = new Map<string, { id: string; name: string }>();
			if (allSchoolCategoryIds.size > 0) {
				const categories = await prisma.schoolCategory.findMany({
					where: { id: { in: Array.from(allSchoolCategoryIds) } },
					select: { id: true, name: true },
				});
				categories.forEach(cat => schoolCategoryMap.set(cat.id, cat));
			}

			// Transform materials to include schoolCategories names
			const transformedMaterials = materials.map((m) => {
				const scoreCategories = parseScoreCategories(m.scoreCategories).map((cat, catIndex) => ({
					id: `${m.id}-cat-${catIndex}`, // Generate virtual ID for frontend compatibility
					name: cat.name,
					color: cat.color || 'gray',
					order: cat.order ?? catIndex,
					options: (cat.options || []).map((opt, optIndex) => ({
						id: `${m.id}-cat-${catIndex}-opt-${optIndex}`, // Generate virtual ID
						name: opt.name,
						score: opt.score,
						order: opt.order ?? optIndex,
					})),
				}));

				const schoolCategoryIds = m.schoolCategoryIds || [];
				const schoolCategories = schoolCategoryIds
					.map(id => schoolCategoryMap.get(id))
					.filter((cat): cat is { id: string; name: string } => cat !== undefined);

				return {
					id: m.id,
					eventId: m.eventId,
					eventAssessmentCategoryId: m.eventAssessmentCategoryId,
					number: m.number,
					name: m.name,
					description: m.description,
					order: m.order,
					schoolCategoryIds,
					schoolCategories,
					scoreCategories,
				};
			});

			// Group materials by category and calculate max score per school category
			const materialsByCategory = eventCategories.map((ec) => {
				const categoryMaterials = transformedMaterials.filter(
					(m) => m.eventAssessmentCategoryId === ec.id
				);
				
				// Calculate max score per school category
				const maxScoreBySchoolCategory = new Map<string, number>();
				
				categoryMaterials.forEach((material) => {
					// Find the highest score for this material
					let materialMaxScore = 0;
					material.scoreCategories.forEach((scoreCat) => {
						scoreCat.options.forEach((opt) => {
							if ((opt.score || 0) > materialMaxScore) {
								materialMaxScore = opt.score || 0;
							}
						});
					});
					
					// Add this max score to each school category this material belongs to
					material.schoolCategoryIds.forEach((scId) => {
						const current = maxScoreBySchoolCategory.get(scId) || 0;
						maxScoreBySchoolCategory.set(scId, current + materialMaxScore);
					});
				});

				// Get jury count for this assessment category
				const juryCount = juryCategoryCount.get(ec.assessmentCategoryId) || 0;

				// Convert map to array with school category info
				const maxScoreBreakdown = Array.from(maxScoreBySchoolCategory.entries()).map(([scId, maxScore]) => {
					const schoolCat = schoolCategoryMap.get(scId);
					return {
						schoolCategoryId: scId,
						schoolCategoryName: schoolCat?.name || 'Unknown',
						maxScore,
						juryCount,
						totalMaxScore: maxScore * juryCount,
					};
				});

				// Calculate overall max score (sum of all materials' max scores)
				const maxScore = categoryMaterials.reduce((total, material) => {
					let materialMaxScore = 0;
					material.scoreCategories.forEach((scoreCat) => {
						scoreCat.options.forEach((opt) => {
							if ((opt.score || 0) > materialMaxScore) {
								materialMaxScore = opt.score || 0;
							}
						});
					});
					return total + materialMaxScore;
				}, 0);

				return {
					id: ec.id,
					assessmentCategoryId: ec.assessmentCategoryId,
					categoryName: ec.assessmentCategory.name,
					categoryDescription: ec.assessmentCategory.description,
					materials: categoryMaterials,
					maxScore,
					juryCount,
					totalMaxScore: maxScore * juryCount,
					maxScoreBreakdown,
				};
			});

			res.json({
				categories: materialsByCategory,
				eventSchoolCategories: eventSchoolCategories.map((esc) => ({
					id: esc.schoolCategory.id,
					name: esc.schoolCategory.name,
					order: esc.schoolCategory.order,
				})),
			});
		} catch (error) {
			console.error("Error fetching materials:", error);
			res.status(500).json({ error: "Failed to fetch materials" });
		}
	}
);

// POST /api/materials/event/:eventIdOrSlug - Create a new material with school categories and score categories
router.post(
	"/event/:eventIdOrSlug",
	authenticate,
	requireEventAccess,
	async (req: AuthenticatedRequest & { eventId?: string }, res) => {
		try {
			const eventId = req.eventId;
			const {
				eventAssessmentCategoryId,
				number,
				name,
				description,
				schoolCategoryIds,
				scoreCategories,
			} = req.body;

			if (!eventId) {
				return res.status(400).json({ error: "Event ID not found" });
			}

			if (!eventAssessmentCategoryId || !number || !name) {
				return res.status(400).json({ error: "Missing required fields" });
			}

			// Check if material with same number already exists for this category
			const existing = await prisma.eventMaterial.findUnique({
				where: {
					eventId_eventAssessmentCategoryId_number: {
						eventId,
						eventAssessmentCategoryId,
						number: parseInt(number),
					},
				},
			});

			if (existing) {
				return res
					.status(400)
					.json({ error: `Materi nomor ${number} sudah ada untuk kategori ini` });
			}

			// Format score categories for JSON storage
			const formattedScoreCategories: ScoreCategory[] = (scoreCategories || []).map(
				(cat: ScoreCategory, catIndex: number) => ({
					name: cat.name,
					color: cat.color || 'gray',
					order: catIndex,
					options: (cat.options || []).map((opt: ScoreOption, optIndex: number) => ({
						name: opt.name || '',
						score: opt.score,
						order: optIndex,
					})),
				})
			);

			// Create material with denormalized data - single INSERT!
			const material = await prisma.eventMaterial.create({
				data: {
					eventId,
					eventAssessmentCategoryId,
					number: parseInt(number),
					name,
					description: description || null,
					order: parseInt(number),
					scoreCategories: formattedScoreCategories as unknown as Prisma.InputJsonValue,
					schoolCategoryIds: schoolCategoryIds || [],
				},
			});

			// Get school category names for response
			const schoolCategories = await getSchoolCategoryNames(material.schoolCategoryIds);

			// Transform response to match frontend expectations
			const response = {
				id: material.id,
				eventId: material.eventId,
				eventAssessmentCategoryId: material.eventAssessmentCategoryId,
				number: material.number,
				name: material.name,
				description: material.description,
				order: material.order,
				schoolCategoryIds: material.schoolCategoryIds,
				schoolCategories,
				scoreCategories: parseScoreCategories(material.scoreCategories).map((cat, catIndex) => ({
					id: `${material.id}-cat-${catIndex}`,
					name: cat.name,
					color: cat.color,
					order: cat.order ?? catIndex,
					options: (cat.options || []).map((opt, optIndex) => ({
						id: `${material.id}-cat-${catIndex}-opt-${optIndex}`,
						name: opt.name,
						score: opt.score,
						order: opt.order ?? optIndex,
					})),
				})),
			};

			res.status(201).json(response);
		} catch (error) {
			console.error("Error creating material:", error);
			res.status(500).json({ error: "Failed to create material" });
		}
	}
);

// PUT /api/materials/:materialId - Update a material with school categories and score categories
router.put("/:materialId", authenticate, async (req: AuthenticatedRequest, res) => {
	try {
		const user = req.user;
		const materialId = req.params.materialId;
		const { number, name, description, schoolCategoryIds, scoreCategories } =
			req.body;

		if (!user) {
			return res.status(401).json({ error: "Unauthorized" });
		}

		if (!materialId) {
			return res.status(400).json({ error: "Material ID is required" });
		}

		// Get material and verify access
		const material = await prisma.eventMaterial.findUnique({
			where: { id: materialId },
			include: { event: true },
		});

		if (!material) {
			return res.status(404).json({ error: "Material not found" });
		}

		// Check access (must be event owner)
		if (user.role !== "SUPERADMIN") {
			const event = await prisma.event.findFirst({
				where: {
					id: material.eventId,
					createdById: user.userId,
				},
			});

			if (!event) {
				return res
					.status(403)
					.json({ error: "You are not managing this event" });
			}
		}

		// Check for duplicate number if number is being changed
		if (number && number !== material.number) {
			const existing = await prisma.eventMaterial.findUnique({
				where: {
					eventId_eventAssessmentCategoryId_number: {
						eventId: material.eventId,
						eventAssessmentCategoryId: material.eventAssessmentCategoryId,
						number: parseInt(number),
					},
				},
			});

			if (existing && existing.id !== materialId) {
				return res
					.status(400)
					.json({ error: `Materi nomor ${number} sudah ada` });
			}
		}

		// Format score categories for JSON storage if provided
		let formattedScoreCategories: ScoreCategory[] | undefined;
		if (scoreCategories !== undefined) {
			formattedScoreCategories = (scoreCategories || []).map(
				(cat: ScoreCategory, catIndex: number) => ({
					name: cat.name,
					color: cat.color || 'gray',
					order: catIndex,
					options: (cat.options || []).map((opt: ScoreOption, optIndex: number) => ({
						name: opt.name || '',
						score: opt.score,
						order: optIndex,
					})),
				})
			);
		}

		// Update material - single UPDATE!
		const updated = await prisma.eventMaterial.update({
			where: { id: materialId },
			data: {
				...(number && { number: parseInt(number), order: parseInt(number) }),
				...(name && { name }),
				...(description !== undefined && { description: description || null }),
				...(schoolCategoryIds !== undefined && { schoolCategoryIds }),
				...(formattedScoreCategories !== undefined && { scoreCategories: formattedScoreCategories as unknown as Prisma.InputJsonValue }),
			},
		});

		// Get school category names for response
		const schoolCategories = await getSchoolCategoryNames(updated.schoolCategoryIds);

		// Transform response
		const response = {
			id: updated.id,
			eventId: updated.eventId,
			eventAssessmentCategoryId: updated.eventAssessmentCategoryId,
			number: updated.number,
			name: updated.name,
			description: updated.description,
			order: updated.order,
			schoolCategoryIds: updated.schoolCategoryIds,
			schoolCategories,
			scoreCategories: parseScoreCategories(updated.scoreCategories).map((cat, catIndex) => ({
				id: `${updated.id}-cat-${catIndex}`,
				name: cat.name,
				color: cat.color,
				order: cat.order ?? catIndex,
				options: (cat.options || []).map((opt, optIndex) => ({
					id: `${updated.id}-cat-${catIndex}-opt-${optIndex}`,
					name: opt.name,
					score: opt.score,
					order: opt.order ?? optIndex,
				})),
			})),
		};

		res.json(response);
	} catch (error) {
		console.error("Error updating material:", error);
		res.status(500).json({ error: "Failed to update material" });
	}
});

// DELETE /api/materials/:materialId - Delete a material
router.delete(
	"/:materialId",
	authenticate,
	async (req: AuthenticatedRequest, res) => {
		try {
			const user = req.user;
			const { materialId } = req.params;

			if (!user) {
				return res.status(401).json({ error: "Unauthorized" });
			}

			// Get material and verify access
			const material = await prisma.eventMaterial.findUnique({
				where: { id: materialId },
			});

			if (!material) {
				return res.status(404).json({ error: "Material not found" });
			}

			// Check access (must be event owner)
			if (user.role !== "SUPERADMIN") {
				const event = await prisma.event.findFirst({
					where: {
						id: material.eventId,
						createdById: user.userId,
					},
				});

				if (!event) {
					return res
						.status(403)
						.json({ error: "You are not managing this event" });
				}
			}

			// Delete material - simple DELETE, no cascade needed!
			await prisma.eventMaterial.delete({
				where: { id: materialId },
			});

			res.json({ message: "Material deleted successfully" });
		} catch (error) {
			console.error("Error deleting material:", error);
			res.status(500).json({ error: "Failed to delete material" });
		}
	}
);

// GET /api/materials/:materialId - Get a single material with details
router.get("/:materialId", authenticate, async (req: AuthenticatedRequest, res) => {
	try {
		const { materialId } = req.params;

		// Simple single fetch - no JOINs!
		const material = await prisma.eventMaterial.findUnique({
			where: { id: materialId },
		});

		if (!material) {
			return res.status(404).json({ error: "Material not found" });
		}

		// Get school category names
		const schoolCategories = await getSchoolCategoryNames(material.schoolCategoryIds);

		res.json({
			id: material.id,
			eventId: material.eventId,
			eventAssessmentCategoryId: material.eventAssessmentCategoryId,
			number: material.number,
			name: material.name,
			description: material.description,
			order: material.order,
			schoolCategoryIds: material.schoolCategoryIds,
			schoolCategories,
			scoreCategories: parseScoreCategories(material.scoreCategories).map((cat, catIndex) => ({
				id: `${material.id}-cat-${catIndex}`,
				name: cat.name,
				color: cat.color,
				order: cat.order ?? catIndex,
				options: (cat.options || []).map((opt, optIndex) => ({
					id: `${material.id}-cat-${catIndex}-opt-${optIndex}`,
					name: opt.name,
					score: opt.score,
					order: opt.order ?? optIndex,
				})),
			})),
		});
	} catch (error) {
		console.error("Error fetching material:", error);
		res.status(500).json({ error: "Failed to fetch material" });
	}
});

// POST /api/materials/:materialId/copy-categories - Copy score categories from another material
router.post(
	"/:materialId/copy-categories",
	authenticate,
	async (req: AuthenticatedRequest, res) => {
		try {
			const user = req.user;
			const materialId = req.params.materialId;
			const { sourceMaterialId } = req.body;

			if (!user) {
				return res.status(401).json({ error: "Unauthorized" });
			}

			if (!materialId) {
				return res.status(400).json({ error: "Material ID is required" });
			}

			// Get target material
			const targetMaterial = await prisma.eventMaterial.findUnique({
				where: { id: materialId },
			});

			if (!targetMaterial) {
				return res.status(404).json({ error: "Target material not found" });
			}

			// Verify access (must be event owner)
			if (user.role !== "SUPERADMIN") {
				const event = await prisma.event.findFirst({
					where: {
						id: targetMaterial.eventId,
						createdById: user.userId,
					},
				});
				if (!event) {
					return res
						.status(403)
						.json({ error: "You are not managing this event" });
				}
			}

			// Get source material's score categories
			const sourceMaterial = await prisma.eventMaterial.findUnique({
				where: { id: sourceMaterialId },
			});

			if (!sourceMaterial) {
				return res.status(404).json({ error: "Source material not found" });
			}

			const sourceCategories = parseScoreCategories(sourceMaterial.scoreCategories);
			
			if (!sourceCategories || sourceCategories.length === 0) {
				return res
					.status(400)
					.json({ error: "Source material has no score categories" });
			}

			// Simply copy the JSON - no complex transactions!
			await prisma.eventMaterial.update({
				where: { id: materialId },
				data: {
					scoreCategories: sourceCategories as unknown as Prisma.InputJsonValue,
				},
			});

			// Return the copied categories
			res.json(
				sourceCategories.map((cat, catIndex) => ({
					id: `${materialId}-cat-${catIndex}`,
					name: cat.name,
					color: cat.color,
					order: cat.order ?? catIndex,
					options: (cat.options || []).map((opt, optIndex) => ({
						id: `${materialId}-cat-${catIndex}-opt-${optIndex}`,
						name: opt.name,
						score: opt.score,
						order: opt.order ?? optIndex,
					})),
				}))
			);
		} catch (error) {
			console.error("Error copying categories:", error);
			res.status(500).json({ error: "Failed to copy categories" });
		}
	}
);

// POST /api/materials/event/:eventIdOrSlug/create-defaults - Create default score categories for all materials
router.post(
	"/event/:eventIdOrSlug/create-defaults",
	authenticate,
	requireEventAccess,
	async (req: AuthenticatedRequest & { eventId?: string }, res) => {
		try {
			const eventId = req.eventId;

			if (!eventId) {
				return res.status(400).json({ error: "Event ID not found" });
			}

			// Default categories with options
			const defaultCategories: ScoreCategory[] = [
				{
					name: "Kurang",
					color: "red",
					order: 0,
					options: [
						{ name: "Sangat Kurang", score: 1, order: 0 },
						{ name: "Kurang", score: 2, order: 1 },
						{ name: "Hampir Cukup", score: 3, order: 2 },
					],
				},
				{
					name: "Cukup",
					color: "yellow",
					order: 1,
					options: [
						{ name: "Cukup", score: 4, order: 0 },
						{ name: "Agak Baik", score: 5, order: 1 },
					],
				},
				{
					name: "Baik",
					color: "green",
					order: 2,
					options: [
						{ name: "Baik", score: 6, order: 0 },
						{ name: "Sangat Baik", score: 7, order: 1 },
						{ name: "Sempurna", score: 8, order: 2 },
					],
				},
			];

			// Get all materials without score categories (empty array)
			const materialsWithoutCategories = await prisma.eventMaterial.findMany({
				where: {
					eventId,
					scoreCategories: {
						equals: Prisma.DbNull,
					},
				},
			});

			// Also get materials with empty array
			const materialsWithEmptyArray = await prisma.eventMaterial.findMany({
				where: {
					eventId,
					scoreCategories: {
						equals: Prisma.JsonNull,
					},
				},
			});

			const allMaterialsWithoutCategories = [...materialsWithoutCategories, ...materialsWithEmptyArray];

			if (allMaterialsWithoutCategories.length === 0) {
				return res
					.status(200)
					.json({ message: "All materials already have score categories" });
			}

			// Update all materials with default categories in a single batch
			await Promise.all(
				allMaterialsWithoutCategories.map((material) =>
					prisma.eventMaterial.update({
						where: { id: material.id },
						data: { scoreCategories: defaultCategories as unknown as Prisma.InputJsonValue },
					})
				)
			);

			res.json({
				message: `Default categories created for ${allMaterialsWithoutCategories.length} materials`,
				count: allMaterialsWithoutCategories.length,
			});
		} catch (error) {
			console.error("Error creating default categories:", error);
			res.status(500).json({ error: "Failed to create default categories" });
		}
	}
);

export default router;
