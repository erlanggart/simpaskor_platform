import express, { Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";

const router = express.Router();

// GET /api/evaluations/event/:eventId/my-scores - Get juri's evaluations for an event
router.get(
	"/event/:eventId/my-scores",
	authenticate,
	async (req: AuthenticatedRequest, res) => {
		try {
			const user = req.user;
			const { eventId } = req.params;

			if (!user || user.role !== "JURI") {
				return res.status(403).json({ error: "Access denied" });
			}

			const evaluations = await prisma.evaluation.findMany({
				where: {
					eventId,
					juryId: user.userId,
				},
				select: {
					id: true,
					assessmentCategoryId: true,
					participantId: true,
					score: true,
					maxScore: true,
					notes: true,
				},
			});

			res.json(evaluations);
		} catch (error) {
			console.error("Error fetching evaluations:", error);
			res.status(500).json({ error: "Failed to fetch evaluations" });
		}
	}
);

// GET /api/evaluations/participant/:participantId - Get evaluations for a participant
router.get(
	"/participant/:participantId",
	authenticate,
	async (req: AuthenticatedRequest, res) => {
		try {
			const user = req.user;
			const { participantId } = req.params;

			if (!user || user.role !== "JURI") {
				return res.status(403).json({ error: "Access denied" });
			}

			// Get evaluations that this juri made for this participant
			const evaluations = await prisma.evaluation.findMany({
				where: {
					participantId,
					juryId: user.userId,
				},
				select: {
					id: true,
					assessmentCategoryId: true,
					score: true,
					maxScore: true,
					notes: true,
				},
			});

			res.json(evaluations);
		} catch (error) {
			console.error("Error fetching participant evaluations:", error);
			res.status(500).json({ error: "Failed to fetch evaluations" });
		}
	}
);

// POST /api/evaluations/submit - Submit or update evaluations for a participant
router.post(
	"/submit",
	authenticate,
	async (req: AuthenticatedRequest, res) => {
		try {
			const user = req.user;
			const { eventId, participantId, scores } = req.body;

			if (!user || user.role !== "JURI") {
				return res.status(403).json({ error: "Access denied" });
			}

			// Validate input
			if (!eventId || !participantId || !Array.isArray(scores)) {
				return res.status(400).json({ error: "Invalid input data" });
			}

			// Verify juri is assigned to this event
			const assignment = await prisma.juryEventAssignment.findFirst({
				where: {
					juryId: user.userId,
					eventId,
					status: "CONFIRMED",
				},
				include: {
					assignedCategories: {
						include: {
							assessmentCategory: {
								select: {
									id: true,
									name: true,
								},
							},
						},
					},
				},
			});

			if (!assignment) {
				return res.status(403).json({ error: "Anda tidak memiliki akses ke event ini" });
			}

			// Get event assessment categories to check custom max scores
			const eventCategories = await prisma.eventAssessmentCategory.findMany({
				where: { eventId },
				select: {
					assessmentCategoryId: true,
					customMaxScore: true,
				},
			});

			// Get the allowed category IDs for this juri
			const allowedCategoryIds = assignment.assignedCategories.map(
				(c) => c.assessmentCategoryId
			);

			// Create a map of category ID to max score (default 100)
			const categoryMaxScores = new Map(
				eventCategories.map((ec) => [
					ec.assessmentCategoryId,
					ec.customMaxScore || 100,
				])
			);

			// Validate that all submitted categories are allowed
			for (const score of scores) {
				if (!allowedCategoryIds.includes(score.assessmentCategoryId)) {
					return res.status(400).json({
						error: `Anda tidak ditugaskan untuk menilai kategori ${score.assessmentCategoryId}`,
					});
				}

				const maxScore = categoryMaxScores.get(score.assessmentCategoryId) || 100;
				if (score.score < 0 || score.score > maxScore) {
					return res.status(400).json({
						error: `Skor harus dalam rentang 0
 - ${maxScore}`,
					});
				}
			}

			// Upsert evaluations
			const results = await Promise.all(
				scores.map(async (score: { assessmentCategoryId: string; score: number; notes?: string }) => {
					const maxScore = categoryMaxScores.get(score.assessmentCategoryId) || 100;

					return prisma.evaluation.upsert({
						where: {
							eventId_assessmentCategoryId_juryId_participantId: {
								eventId,
								assessmentCategoryId: score.assessmentCategoryId,
								juryId: user.userId,
								participantId,
							},
						},
						update: {
							score: score.score,
							maxScore,
							notes: score.notes || null,
						},
						create: {
							eventId,
							assessmentCategoryId: score.assessmentCategoryId,
							juryId: user.userId,
							participantId,
							score: score.score,
							maxScore,
							notes: score.notes || null,
						},
					});
				})
			);

			res.json({
				message: "Penilaian berhasil disimpan",
				evaluations: results,
			});
		} catch (error) {
			console.error("Error submitting evaluations:", error);
			res.status(500).json({ error: "Failed to submit evaluations" });
		}
	}
);

// GET /api/evaluations/event/:eventId/summary - Get summary of all evaluations for an event (for panitia/superadmin)
router.get(
	"/event/:eventId/summary",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;
			const { eventId } = req.params;

			if (!user) {
				return res.status(401).json({ error: "Unauthorized" });
			}

			// Only panitia managing this event or superadmin can see summaries
			if (user.role === "PANITIA") {
				const event = await prisma.event.findFirst({
					where: {
						id: eventId,
						createdById: user.userId,
					},
				});

				if (!event) {
					return res.status(403).json({ error: "You are not managing this event" });
				}
			} else if (user.role !== "SUPERADMIN") {
				return res.status(403).json({ error: "Access denied" });
			}

			// Get all evaluations grouped by participant
			const evaluations = await prisma.evaluation.findMany({
				where: { eventId },
				include: {
					assessmentCategory: {
						select: {
							id: true,
							name: true,
						},
					},
					jury: {
						select: {
							id: true,
							name: true,
						},
					},
				},
				orderBy: [
					{ participantId: "asc" },
					{ assessmentCategoryId: "asc" },
				],
			});

			// Group by participant
			const grouped = evaluations.reduce((acc, evaluation) => {
				const pid = evaluation.participantId;
				if (!acc[pid]) {
					acc[pid] = {
						participantId: pid,
						scores: [],
						totalScore: 0,
						maxTotalScore: 0,
					};
				}
				acc[pid].scores.push({
					categoryId: evaluation.assessmentCategoryId,
					categoryName: evaluation.assessmentCategory.name,
					juryId: evaluation.juryId,
					juryName: evaluation.jury.name,
					score: evaluation.score,
					maxScore: evaluation.maxScore,
					notes: evaluation.notes,
				});
				acc[pid].totalScore += evaluation.score;
				acc[pid].maxTotalScore += evaluation.maxScore;
				return acc;
			}, {} as Record<string, {
				participantId: string;
				scores: {
					categoryId: string;
					categoryName: string;
					juryId: string;
					juryName: string;
					score: number;
					maxScore: number;
					notes: string | null;
				}[];
				totalScore: number;
				maxTotalScore: number;
			}>);

			res.json(Object.values(grouped));
		} catch (error) {
			console.error("Error fetching evaluation summary:", error);
			res.status(500).json({ error: "Failed to fetch evaluation summary" });
		}
	}
);

// ==================== MATERIAL EVALUATION ROUTES ====================

// GET /api/evaluations/materials/event/:eventSlug/all-materials
// Get ALL materials for juri's assigned categories (no school category filtering, no evaluations)
// Used by EventPenilaian to fetch materials once for all participants
router.get(
	"/materials/event/:eventSlug/all-materials",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;
			const { eventSlug } = req.params;

			if (!user || user.role !== "JURI") {
				return res.status(403).json({ error: "Access denied" });
			}

			const event = await prisma.event.findUnique({
				where: { slug: eventSlug },
				select: { id: true, title: true },
			});

			if (!event) {
				return res.status(404).json({ error: "Event tidak ditemukan" });
			}

			const assignment = await prisma.juryEventAssignment.findFirst({
				where: {
					juryId: user.userId,
					eventId: event.id,
					status: "CONFIRMED",
				},
				include: {
					assignedCategories: {
						include: {
							assessmentCategory: true,
						},
					},
				},
			});

			if (!assignment) {
				return res.status(403).json({ error: "Anda tidak memiliki akses ke event ini" });
			}

			const assignedCategoryIds = assignment.assignedCategories.map(
				(c) => c.assessmentCategoryId
			);

			const eventAssessmentCategories = await prisma.eventAssessmentCategory.findMany({
				where: {
					eventId: event.id,
					assessmentCategoryId: { in: assignedCategoryIds },
				},
				include: {
					assessmentCategory: true,
				},
			});

			const assignedEventCategoryIds = eventAssessmentCategories.map((c) => c.id);

			const materials = await prisma.eventMaterial.findMany({
				where: {
					eventId: event.id,
					eventAssessmentCategoryId: { in: assignedEventCategoryIds },
				},
				orderBy: [
					{ eventAssessmentCategoryId: "asc" },
					{ number: "asc" },
				],
			});

			const categorizedMaterials = eventAssessmentCategories
				.sort((a, b) => (a.assessmentCategory.order ?? 0) - (b.assessmentCategory.order ?? 0))
				.map((eac) => ({
					categoryId: eac.id,
					categoryName: eac.assessmentCategory.name,
					categoryOrder: eac.assessmentCategory.order ?? 0,
					materials: materials
						.filter((m) => m.eventAssessmentCategoryId === eac.id)
						.map((m) => ({
							id: m.id,
							number: m.number,
							name: m.name,
							description: m.description,
							scoreCategories: m.scoreCategories,
							schoolCategoryIds: m.schoolCategoryIds,
						})),
				}));

			res.json({
				eventId: event.id,
				eventTitle: event.title,
				categories: categorizedMaterials,
			});
		} catch (error) {
			console.error("Error fetching all materials:", error);
			res.status(500).json({ error: "Failed to fetch materials" });
		}
	}
);

// GET /api/evaluations/materials/event/:eventSlug/participant/:participantId/existing
// Get only existing evaluations for a participant (lightweight, no materials data)
router.get(
	"/materials/event/:eventSlug/participant/:participantId/existing",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;
			const { eventSlug, participantId } = req.params;

			if (!user || user.role !== "JURI") {
				return res.status(403).json({ error: "Access denied" });
			}

			const event = await prisma.event.findUnique({
				where: { slug: eventSlug },
				select: { id: true },
			});

			if (!event) {
				return res.status(404).json({ error: "Event tidak ditemukan" });
			}

			const assignment = await prisma.juryEventAssignment.findFirst({
				where: {
					juryId: user.userId,
					eventId: event.id,
					status: "CONFIRMED",
				},
			});

			if (!assignment) {
				return res.status(403).json({ error: "Anda tidak memiliki akses ke event ini" });
			}

			const existingEvaluations = await prisma.materialEvaluation.findMany({
				where: {
					eventId: event.id,
					juryId: user.userId,
					participantId,
				},
				select: {
					id: true,
					materialId: true,
					score: true,
					scoreCategoryName: true,
					isSkipped: true,
					skipReason: true,
					notes: true,
				},
			});

			res.json({ evaluations: existingEvaluations });
		} catch (error) {
			console.error("Error fetching existing evaluations:", error);
			res.status(500).json({ error: "Failed to fetch evaluations" });
		}
	}
);

// GET /api/evaluations/materials/event/:eventSlug/participant/:participantId
// Get materials and existing evaluations for a participant
router.get(
	"/materials/event/:eventSlug/participant/:participantId",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;
			const { eventSlug, participantId } = req.params;

			if (!user || user.role !== "JURI") {
				return res.status(403).json({ error: "Access denied" });
			}

			// Get event by slug
			const event = await prisma.event.findUnique({
				where: { slug: eventSlug },
				select: { id: true, title: true },
			});

			if (!event) {
				return res.status(404).json({ error: "Event tidak ditemukan" });
			}

			// Get participant to check their school category
			const participant = await prisma.participationGroup.findUnique({
				where: { id: participantId },
				select: { schoolCategoryId: true },
			});

			if (!participant) {
				return res.status(404).json({ error: "Peserta tidak ditemukan" });
			}

			const participantSchoolCategoryId = participant.schoolCategoryId;

			// Verify juri is assigned to this event
			const assignment = await prisma.juryEventAssignment.findFirst({
				where: {
					juryId: user.userId,
					eventId: event.id,
					status: "CONFIRMED",
				},
				include: {
					assignedCategories: {
						include: {
							assessmentCategory: true,
						},
					},
				},
			});

			if (!assignment) {
				return res.status(403).json({ error: "Anda tidak memiliki akses ke event ini" });
			}

			// Get the assessment category IDs assigned to this juri
			const assignedCategoryIds = assignment.assignedCategories.map(
				(c) => c.assessmentCategoryId
			);

			// Get materials for the event that belong to assigned categories
			const materials = await prisma.eventMaterial.findMany({
				where: {
					eventId: event.id,
				},
				orderBy: [
					{ eventAssessmentCategoryId: "asc" },
					{ number: "asc" },
				],
			});

			// Get event assessment categories to map
			const eventAssessmentCategories = await prisma.eventAssessmentCategory.findMany({
				where: {
					eventId: event.id,
					assessmentCategoryId: { in: assignedCategoryIds },
				},
				include: {
					assessmentCategory: true,
				},
			});

			// Filter materials to only those in assigned categories AND matching participant's school category
			const assignedEventCategoryIds = eventAssessmentCategories.map((c) => c.id);
			const filteredMaterials = materials.filter((m) => {
				// Must be in assigned assessment category
				if (!assignedEventCategoryIds.includes(m.eventAssessmentCategoryId)) {
					return false;
				}
				// Must match participant's school category (if material has schoolCategoryIds)
				const materialSchoolCategoryIds = m.schoolCategoryIds || [];
				if (materialSchoolCategoryIds.length > 0 && participantSchoolCategoryId) {
					return materialSchoolCategoryIds.includes(participantSchoolCategoryId);
				}
				// If material has no school category restriction, show it to all
				return materialSchoolCategoryIds.length === 0;
			});

			// Get existing evaluations for this participant by this juri
			const existingEvaluations = await prisma.materialEvaluation.findMany({
				where: {
					eventId: event.id,
					juryId: user.userId,
					participantId,
				},
			});

			// Map evaluations by materialId
			const evaluationMap = new Map(
				existingEvaluations.map((e) => [e.materialId, e])
			);

			// Build response with materials grouped by assessment category, sorted by order
			const categorizedMaterials = eventAssessmentCategories
				.sort((a, b) => (a.assessmentCategory.order ?? 0) - (b.assessmentCategory.order ?? 0))
				.map((eac) => ({
				categoryId: eac.id,
				categoryName: eac.assessmentCategory.name,
				categoryOrder: eac.assessmentCategory.order ?? 0,
				materials: filteredMaterials
					.filter((m) => m.eventAssessmentCategoryId === eac.id)
					.map((m) => ({
						id: m.id,
						number: m.number,
						name: m.name,
						description: m.description,
						scoreCategories: m.scoreCategories,
						existingEvaluation: evaluationMap.get(m.id) || null,
					})),
			}));

			res.json({
				eventId: event.id,
				eventTitle: event.title,
				categories: categorizedMaterials,
			});
		} catch (error) {
			console.error("Error fetching materials for evaluation:", error);
			res.status(500).json({ error: "Failed to fetch materials" });
		}
	}
);

// POST /api/evaluations/materials/submit
// Submit material evaluations for a participant
router.post(
	"/materials/submit",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;
			const { eventId, participantId, evaluations } = req.body;

			if (!user || user.role !== "JURI") {
				return res.status(403).json({ error: "Access denied" });
			}

			// Validate input
			if (!eventId || !participantId || !Array.isArray(evaluations)) {
				return res.status(400).json({ error: "Invalid input data" });
			}

			// Verify juri is assigned to this event
			const assignment = await prisma.juryEventAssignment.findFirst({
				where: {
					juryId: user.userId,
					eventId,
					status: "CONFIRMED",
				},
			});

			if (!assignment) {
				return res.status(403).json({ error: "Anda tidak memiliki akses ke event ini" });
			}

			// Get all materials for this event
			const materials = await prisma.eventMaterial.findMany({
				where: { eventId },
				select: { id: true, name: true },
			});

			const materialIds = materials.map((m) => m.id);

			// Validate evaluations
			for (const ev of evaluations) {
				if (!materialIds.includes(ev.materialId)) {
					return res.status(400).json({
						error: `Material ${ev.materialId} tidak ditemukan`,
					});
				}

				// Must have either score or be skipped
				if (ev.isSkipped) {
					if (!ev.skipReason || !["TIDAK_SESUAI", "TIDAK_DIJALANKAN"].includes(ev.skipReason)) {
						return res.status(400).json({
							error: "Alasan lewati materi harus dipilih",
						});
					}
				} else {
					if (ev.score === undefined || ev.score === null) {
						return res.status(400).json({
							error: "Skor harus diisi atau pilih lewati materi",
						});
					}
				}
			}

			// Upsert evaluations
			const results = await Promise.all(
				evaluations.map(async (ev: {
					materialId: string;
					score?: number | null;
					scoreCategoryName?: string;
					isSkipped?: boolean;
					skipReason?: string;
					notes?: string;
					scoredAt?: string; // Client-side timestamp when jury clicked score
				}) => {
					const scoredAtDate = ev.scoredAt ? new Date(ev.scoredAt) : new Date();
					
					return prisma.materialEvaluation.upsert({
						where: {
							eventId_materialId_juryId_participantId: {
								eventId,
								materialId: ev.materialId,
								juryId: user.userId,
								participantId,
							},
						},
						update: {
							score: ev.isSkipped ? null : ev.score,
							scoreCategoryName: ev.isSkipped ? null : ev.scoreCategoryName,
							isSkipped: ev.isSkipped || false,
							skipReason: ev.isSkipped ? ev.skipReason : null,
							notes: ev.notes || null,
							scoredAt: scoredAtDate,
						},
						create: {
							eventId,
							materialId: ev.materialId,
							juryId: user.userId,
							participantId,
							score: ev.isSkipped ? null : ev.score,
							scoreCategoryName: ev.isSkipped ? null : ev.scoreCategoryName,
							isSkipped: ev.isSkipped || false,
							skipReason: ev.isSkipped ? ev.skipReason : null,
							notes: ev.notes || null,
							scoredAt: scoredAtDate,
						},
					});
				})
			);

			res.json({
				message: "Penilaian berhasil disimpan",
				evaluations: results,
			});
		} catch (error) {
			console.error("Error submitting material evaluations:", error);
			res.status(500).json({ error: "Failed to submit evaluations" });
		}
	}
);

// GET /api/evaluations/materials/event/:eventSlug/status
// Get scoring status for all participants in an event for the current juri
router.get(
	"/materials/event/:eventSlug/status",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;
			const { eventSlug } = req.params;

			if (!user || user.role !== "JURI") {
				return res.status(403).json({ error: "Access denied" });
			}

			// Get event by slug
			const event = await prisma.event.findUnique({
				where: { slug: eventSlug },
				select: { id: true },
			});

			if (!event) {
				return res.status(404).json({ error: "Event tidak ditemukan" });
			}

			// Verify juri is assigned to this event
			const assignment = await prisma.juryEventAssignment.findFirst({
				where: {
					juryId: user.userId,
					eventId: event.id,
					status: "CONFIRMED",
				},
				include: {
					assignedCategories: true,
				},
			});

			if (!assignment) {
				return res.status(403).json({ error: "Anda tidak memiliki akses ke event ini" });
			}

			// Get assigned category IDs and event assessment categories for this juri
			const assignedCategoryIds = assignment.assignedCategories.map(
				(c) => c.assessmentCategoryId
			);

			const eventAssessmentCategories = await prisma.eventAssessmentCategory.findMany({
				where: {
					eventId: event.id,
					assessmentCategoryId: { in: assignedCategoryIds },
				},
			});

			const assignedEventCategoryIds = eventAssessmentCategories.map((c) => c.id);

			// Count total materials assigned to this juri for this event
			const totalMaterials = await prisma.eventMaterial.count({
				where: {
					eventId: event.id,
					eventAssessmentCategoryId: { in: assignedEventCategoryIds },
				},
			});

			// Get all evaluations by this juri for this event
			const evaluations = await prisma.materialEvaluation.findMany({
				where: {
					eventId: event.id,
					juryId: user.userId,
				},
				select: {
					participantId: true,
					materialId: true,
				},
			});

			// Group evaluations by participant
			const evaluationsByParticipant = new Map<string, Set<string>>();
			for (const ev of evaluations) {
				if (!evaluationsByParticipant.has(ev.participantId)) {
					evaluationsByParticipant.set(ev.participantId, new Set());
				}
				evaluationsByParticipant.get(ev.participantId)!.add(ev.materialId);
			}

			// Build status for each participant
			const participantStatus: Record<string, {
				scoredMaterials: number;
				totalMaterials: number;
				isComplete: boolean;
			}> = {};

			for (const [participantId, materialIds] of evaluationsByParticipant.entries()) {
				participantStatus[participantId] = {
					scoredMaterials: materialIds.size,
					totalMaterials,
					isComplete: materialIds.size >= totalMaterials,
				};
			}

			res.json({
				totalMaterials,
				participantStatus,
			});
		} catch (error) {
			console.error("Error fetching scoring status:", error);
			res.status(500).json({ error: "Failed to fetch scoring status" });
		}
	}
);

// GET /api/evaluations/materials/participant/:participantId/summary
// Get summary of material evaluations for a participant
router.get(
	"/materials/participant/:participantId/summary",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;
			const { participantId } = req.params;
			const eventId = req.query.eventId as string;

			if (!user) {
				return res.status(401).json({ error: "Unauthorized" });
			}

			// Get all evaluations for this participant
			const evaluations = await prisma.materialEvaluation.findMany({
				where: {
					participantId,
					...(eventId ? { eventId } : {}),
				},
				include: {
					jury: {
						select: { id: true, name: true },
					},
				},
			});

			// Calculate totals
			const scoredEvaluations = evaluations.filter((e) => !e.isSkipped && e.score !== null);
			const totalScore = scoredEvaluations.reduce((sum, e) => sum + (e.score || 0), 0);
			const totalMaterials = evaluations.length;
			const skippedCount = evaluations.filter((e) => e.isSkipped).length;

			res.json({
				evaluations,
				summary: {
					totalScore,
					totalMaterials,
					scoredCount: scoredEvaluations.length,
					skippedCount,
					averageScore: scoredEvaluations.length > 0 
						? totalScore / scoredEvaluations.length 
						: 0,
				},
			});
		} catch (error) {
			console.error("Error fetching evaluation summary:", error);
			res.status(500).json({ error: "Failed to fetch summary" });
		}
	}
);

// GET /api/evaluations/event/:eventSlug/recap - Get full score recapitulation for an event (for panitia/superadmin)
router.get(
	"/event/:eventSlug/recap",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;
			const { eventSlug } = req.params;

			if (!user || !["PANITIA", "SUPERADMIN"].includes(user.role)) {
				return res.status(403).json({ error: "Access denied" });
			}

			// Find event
			const event = await prisma.event.findFirst({
				where: {
					OR: [
						{ slug: eventSlug },
						{ id: eventSlug },
					],
				},
				include: {
					assessmentCategories: {
						include: {
							assessmentCategory: {
								select: {
									id: true,
									name: true,
									order: true,
								},
							},
						},
						orderBy: {
							assessmentCategory: {
								order: "asc",
							},
						},
					},
				},
			});

			if (!event) {
				return res.status(404).json({ error: "Event not found" });
			}

			// For panitia, verify they own this event
			if (user.role === "PANITIA") {
				if (event.createdById !== user.userId) {
					return res.status(403).json({ error: "Anda tidak memiliki akses ke event ini" });
				}
			}

			// Get all confirmed juries for this event
			const juries = await prisma.juryEventAssignment.findMany({
				where: {
					eventId: event.id,
					status: "CONFIRMED",
				},
				include: {
					jury: {
						select: {
							id: true,
							name: true,
						},
					},
					assignedCategories: {
						select: {
							assessmentCategoryId: true,
						},
					},
				},
			});

			// Get all participants
			const participants = await prisma.eventParticipation.findMany({
				where: {
					eventId: event.id,
					status: {
						in: ["REGISTERED", "CONFIRMED", "ATTENDED"],
					},
				},
				include: {
					user: {
						select: {
							id: true,
							name: true,
							profile: {
								select: {
									institution: true,
								},
							},
						},
					},
					groups: {
						where: { status: "ACTIVE" },
						include: {
							schoolCategory: {
								select: { id: true, name: true },
							},
						},
						orderBy: { orderNumber: "asc" },
					},
				},
				orderBy: { createdAt: "asc" },
			});

			// Flatten participants to groups
			interface ParticipantGroup {
				id: string;
				participationId: string;
				teamName: string;
				groupLabel: string | null;
				orderNumber: number | null;
				schoolCategory: { id: string; name: string } | null;
				registrant: {
					id: string;
					name: string;
					institution: string | null;
				};
			}

			const participantGroups: ParticipantGroup[] = participants.flatMap((p) => {
				const schoolOrInstitution = p.schoolName || p.user.profile?.institution || null;
				if (p.groups && p.groups.length > 0) {
					const hasMultipleGroups = p.groups.length > 1;
					return p.groups.map((group): ParticipantGroup => ({
						id: group.id,
						participationId: p.id,
						teamName: schoolOrInstitution || group.groupName,
						groupLabel: hasMultipleGroups ? group.groupName : null,
						orderNumber: group.orderNumber,
						schoolCategory: group.schoolCategory,
						registrant: {
							id: p.user.id,
							name: p.user.name,
							institution: schoolOrInstitution,
						},
					}));
				}
				return [{
					id: p.id,
					participationId: p.id,
					teamName: schoolOrInstitution || p.user.name,
					groupLabel: null,
					orderNumber: null,
					schoolCategory: null,
					registrant: {
						id: p.user.id,
						name: p.user.name,
						institution: schoolOrInstitution,
					},
				}] as ParticipantGroup[];
			});

			// Sort by orderNumber (null values last)
			participantGroups.sort((a: ParticipantGroup, b: ParticipantGroup) => {
				if (a.orderNumber === null && b.orderNumber === null) return 0;
				if (a.orderNumber === null) return 1;
				if (b.orderNumber === null) return -1;
				return a.orderNumber - b.orderNumber;
			});

			// Get all evaluations for this event
			const evaluations = await prisma.evaluation.findMany({
				where: { eventId: event.id },
				include: {
					assessmentCategory: {
						select: { id: true, name: true },
					},
					jury: {
						select: { id: true, name: true },
					},
				},
			});

			// Get material evaluations grouped by participant and jury
			const materialEvaluations = await prisma.materialEvaluation.findMany({
				where: { eventId: event.id },
				select: {
					participantId: true,
					juryId: true,
					materialId: true,
					score: true,
					isSkipped: true,
				},
			});

			// Get extra nilai (punishment & poin plus) for all participants
			const extraNilaiList = await prisma.extraNilai.findMany({
				where: { eventId: event.id },
				select: {
					id: true,
					participantId: true,
					type: true,
					scope: true,
					assessmentCategoryId: true,
					juaraCategoryId: true,
					value: true,
					reason: true,
				},
			});

			// Group extra nilai by participant
			const extraNilaiByParticipant: Record<string, typeof extraNilaiList> = {};
			extraNilaiList.forEach((en) => {
				if (!extraNilaiByParticipant[en.participantId]) {
					extraNilaiByParticipant[en.participantId] = [];
				}
				extraNilaiByParticipant[en.participantId]!.push(en);
			});

			// Get event materials to know which category each material belongs to
			const eventMaterials = await prisma.eventMaterial.findMany({
				where: { eventId: event.id },
				select: {
					id: true,
					eventAssessmentCategoryId: true,
					name: true,
					scoreCategories: true,
				},
			});

			// Map material ID to category ID
			const materialToCategoryMap = new Map(
				eventMaterials.map((m) => [m.id, m.eventAssessmentCategoryId])
			);

			// Compute real max score per event assessment category from materials
			const computedMaxScorePerEAC = new Map<string, number>();
			for (const eac of event.assessmentCategories) {
				const categoryMaterials = eventMaterials.filter(
					(m) => m.eventAssessmentCategoryId === eac.id
				);
				let categoryMax = 0;
				categoryMaterials.forEach((material) => {
					let materialMaxScore = 0;
					const scoreCats = material.scoreCategories as any[];
					if (Array.isArray(scoreCats)) {
						scoreCats.forEach((scoreCat: any) => {
							if (Array.isArray(scoreCat.options)) {
								scoreCat.options.forEach((opt: any) => {
									if ((opt.score || 0) > materialMaxScore) {
										materialMaxScore = opt.score || 0;
									}
								});
							}
						});
					}
					categoryMax += materialMaxScore;
				});
				computedMaxScorePerEAC.set(eac.id, categoryMax);
			}

			// Group material evaluations by participant, assessmentCategory, jury
			const materialEvalsByParticipant = materialEvaluations.reduce((acc, me) => {
				const categoryId = materialToCategoryMap.get(me.materialId);
				if (!categoryId) return acc;

				const key = `${me.participantId}:${categoryId}:${me.juryId}`;
				if (!acc[key]) {
					acc[key] = { totalScore: 0, count: 0 };
				}
				if (!me.isSkipped && me.score !== null) {
					acc[key].totalScore += me.score;
					acc[key].count += 1;
				}
				return acc;
			}, {} as Record<string, { totalScore: number; count: number }>);

			// Build evaluation map for quick lookup
			const evaluationMap = new Map<string, { score: number; maxScore: number; notes: string | null }>();
			evaluations.forEach((e) => {
				const key = `${e.participantId}:${e.assessmentCategoryId}:${e.juryId}`;
				evaluationMap.set(key, {
					score: e.score,
					maxScore: e.maxScore,
					notes: e.notes,
				});
			});

			// Get event assessment category IDs map for material-based scores
			const eventCategoryMap = new Map(
				event.assessmentCategories.map((eac) => [eac.id, eac.assessmentCategoryId])
			);

			// Build recap data
			const recap = participantGroups.map((participant) => {
				const categoryScores: Record<string, {
					categoryId: string;
					categoryName: string;
					scores: {
						juryId: string;
						juryName: string;
						score: number | null;
						maxScore: number;
						notes: string | null;
						scoredMaterials?: number;
					}[];
					totalScore: number;
					averageScore: number;
					extraAdjustment?: number;
				}> = {};

				// Initialize all categories
				event.assessmentCategories.forEach((eac) => {
					categoryScores[eac.assessmentCategoryId] = {
						categoryId: eac.assessmentCategoryId,
						categoryName: eac.assessmentCategory.name,
						scores: [],
						totalScore: 0,
						averageScore: 0,
					};
				});

				// Add scores per jury per category
				juries.forEach((juryAssignment) => {
					const jury = juryAssignment.jury;
					const assignedCategoryIds = juryAssignment.assignedCategories.map((ac) => ac.assessmentCategoryId);

					event.assessmentCategories.forEach((eac) => {
						const categoryId = eac.assessmentCategoryId;
						const isAssigned = assignedCategoryIds.includes(categoryId);

						// Check Evaluation table first
						const evalKey = `${participant.id}:${categoryId}:${jury.id}`;
						const evaluation = evaluationMap.get(evalKey);

						// Check material evaluations (using event assessment category ID, not assessment category ID)
						const materialKey = `${participant.id}:${eac.id}:${jury.id}`;
						const materialEval = materialEvalsByParticipant[materialKey];

						let score: number | null = null;
						// Use computed max from materials, fall back to customMaxScore or 100
						let maxScore = computedMaxScorePerEAC.get(eac.id) || eac.customMaxScore || 100;
						let notes: string | null = null;
						let scoredMaterials: number | undefined;

						if (evaluation) {
							score = evaluation.score;
							// Keep computed maxScore from materials (don't use stale evaluation.maxScore)
							notes = evaluation.notes;
						} else if (materialEval && materialEval.count > 0) {
							score = materialEval.totalScore;
							scoredMaterials = materialEval.count;
						}

						if (isAssigned && categoryScores[categoryId]) {
							categoryScores[categoryId].scores.push({
								juryId: jury.id,
								juryName: jury.name,
								score,
								maxScore,
								notes,
								scoredMaterials,
							});
						}
					});
				});

				// Calculate totals and averages
				Object.values(categoryScores).forEach((cat) => {
					const validScores = cat.scores.filter((s) => s.score !== null);
					cat.totalScore = validScores.reduce((sum, s) => sum + (s.score || 0), 0);
					cat.averageScore = validScores.length > 0 ? cat.totalScore / validScores.length : 0;
				});

				// Get extra nilai for this participant
				const participantExtraNilai = extraNilaiByParticipant[participant.id] || [];

				// Calculate extra nilai adjustments per category
				const categoryExtraAdjustments: Record<string, number> = {};
				let generalExtraAdjustment = 0;

				participantExtraNilai.forEach((en) => {
					const adjustmentValue = en.type === "PUNISHMENT" ? -en.value : en.value;
					
					if (en.scope === "GENERAL") {
						generalExtraAdjustment += adjustmentValue;
					} else if (en.scope === "CATEGORY" && en.assessmentCategoryId) {
						const catId = en.assessmentCategoryId;
						if (!categoryExtraAdjustments[catId]) {
							categoryExtraAdjustments[catId] = 0;
						}
						categoryExtraAdjustments[catId] = (categoryExtraAdjustments[catId] || 0) + adjustmentValue;
					}
				});

				// Apply category-level extra nilai adjustments to category scores
				Object.values(categoryScores).forEach((cat) => {
					const adjustment = categoryExtraAdjustments[cat.categoryId] || 0;
					cat.totalScore += adjustment;
					cat.extraAdjustment = adjustment;
				});

				// Grand total (including general extra nilai)
				const allScores = Object.values(categoryScores).flatMap((c) => 
					c.scores.filter((s) => s.score !== null).map((s) => s.score!)
				);
				const baseGrandTotal = allScores.reduce((sum, s) => sum + s, 0);
				
				// Add category adjustments to grand total
				const categoryAdjustmentsTotal = Object.values(categoryExtraAdjustments).reduce((sum, adj) => sum + adj, 0);
				const grandTotal = baseGrandTotal + categoryAdjustmentsTotal + generalExtraAdjustment;
				const grandAverage = allScores.length > 0 ? grandTotal / allScores.length : 0;

				return {
					participant,
					categoryScores: Object.values(categoryScores).sort((a, b) => {
						const orderA = event.assessmentCategories.find(
							(eac) => eac.assessmentCategoryId === a.categoryId
						)?.assessmentCategory.order || 0;
						const orderB = event.assessmentCategories.find(
							(eac) => eac.assessmentCategoryId === b.categoryId
						)?.assessmentCategory.order || 0;
						return orderA - orderB;
					}),
					grandTotal,
					grandAverage,
					extraNilai: participantExtraNilai,
					generalExtraAdjustment,
				};
			});

			res.json({
				event: {
					id: event.id,
					title: event.title,
					slug: event.slug,
				},
				categories: event.assessmentCategories.map((eac) => ({
					id: eac.assessmentCategoryId,
					name: eac.assessmentCategory.name,
					order: eac.assessmentCategory.order,
					customWeight: eac.customWeight ? Number(eac.customWeight) : null,
					customMaxScore: eac.customMaxScore,
				})),
				juries: juries.map((j) => ({
					id: j.jury.id,
					name: j.jury.name,
					assignedCategories: j.assignedCategories.map((ac) => ac.assessmentCategoryId),
				})),
				recap,
			});
		} catch (error) {
			console.error("Error fetching recap:", error);
			res.status(500).json({ error: "Failed to fetch recapitulation" });
		}
	}
);

// GET /api/evaluations/event/:eventSlug/verify - Verify score integrity (detect duplicates, missing, mismatches)
router.get(
	"/event/:eventSlug/verify",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;
			const { eventSlug } = req.params;

			if (!user || !["PANITIA", "SUPERADMIN"].includes(user.role)) {
				return res.status(403).json({ error: "Access denied" });
			}

			const event = await prisma.event.findFirst({
				where: {
					OR: [{ slug: eventSlug }, { id: eventSlug }],
				},
				include: {
					assessmentCategories: {
						include: {
							assessmentCategory: { select: { id: true, name: true } },
						},
					},
				},
			});

			if (!event) {
				return res.status(404).json({ error: "Event not found" });
			}

			// Get event materials grouped by category
			const eventMaterials = await prisma.eventMaterial.findMany({
				where: { eventId: event.id },
				select: {
					id: true,
					eventAssessmentCategoryId: true,
					name: true,
					number: true,
					scoreCategories: true,
					schoolCategoryIds: true,
				},
			});

			// Map: categoryId -> expected material count
			const materialsPerCategory = new Map<string, number>();
			const materialToCategoryMap = new Map<string, string>();
			const materialNameMap = new Map<string, string>();
			eventMaterials.forEach((m) => {
				materialToCategoryMap.set(m.id, m.eventAssessmentCategoryId);
				materialNameMap.set(m.id, m.name);
				const count = materialsPerCategory.get(m.eventAssessmentCategoryId) || 0;
				materialsPerCategory.set(m.eventAssessmentCategoryId, count + 1);
			});

			// Compute real max score per category from materials' scoreCategories
			const computedMaxScorePerCategory = new Map<string, number>();
			for (const eac of event.assessmentCategories) {
				const categoryMaterials = eventMaterials.filter(
					(m) => m.eventAssessmentCategoryId === eac.id
				);
				let categoryMax = 0;
				categoryMaterials.forEach((material) => {
					let materialMaxScore = 0;
					const scoreCats = material.scoreCategories as any[];
					if (Array.isArray(scoreCats)) {
						scoreCats.forEach((scoreCat: any) => {
							if (Array.isArray(scoreCat.options)) {
								scoreCat.options.forEach((opt: any) => {
									if ((opt.score || 0) > materialMaxScore) {
										materialMaxScore = opt.score || 0;
									}
								});
							}
						});
					}
					categoryMax += materialMaxScore;
				});
				computedMaxScorePerCategory.set(eac.id, categoryMax);
			}

			// Get ALL material evaluations with full detail
			const materialEvaluations = await prisma.materialEvaluation.findMany({
				where: { eventId: event.id },
				select: {
					id: true,
					participantId: true,
					juryId: true,
					materialId: true,
					score: true,
					isSkipped: true,
				},
			});

			// Get participants
			const participants = await prisma.participationGroup.findMany({
				where: {
					participation: { eventId: event.id },
					status: { in: ["REGISTERED", "CONFIRMED", "ATTENDED", "ACTIVE"] },
				},
				select: {
					id: true,
					groupName: true,
				},
			});
			const participantNameMap = new Map(participants.map((p) => [p.id, p.groupName]));

			// Get juries with assignments
			const juryAssignments = await prisma.juryEventAssignment.findMany({
				where: { eventId: event.id, status: "CONFIRMED" },
				include: {
					jury: { select: { id: true, name: true } },
					assignedCategories: {
						select: { assessmentCategoryId: true },
					},
				},
			});

			const juryNameMap = new Map(juryAssignments.map((j) => [j.jury.id, j.jury.name]));

			// Build: for each (participantId, categoryId, juryId) -> count material evaluations.
			// Duplicates are only rows for the same material scored more than once by the same jury.
			const materialCountMap = new Map<string, {
				totalRows: number;
				scoredCount: number;
				materialIds: Set<string>;
				duplicateMaterialIds: Set<string>;
			}>();
			const materialRowCountMap = new Map<string, {
				count: number;
				participantId: string;
				eventCategoryId: string;
				juryId: string;
				materialId: string;
			}>();
			for (const me of materialEvaluations) {
				const catId = materialToCategoryMap.get(me.materialId);
				if (!catId) continue;
				const key = `${me.participantId}:${catId}:${me.juryId}`;
				if (!materialCountMap.has(key)) {
					materialCountMap.set(key, {
						totalRows: 0,
						scoredCount: 0,
						materialIds: new Set(),
						duplicateMaterialIds: new Set(),
					});
				}
				const entry = materialCountMap.get(key)!;
				entry.totalRows += 1;
				if (!me.isSkipped && me.score !== null) {
					entry.scoredCount += 1;
				}
				if (entry.materialIds.has(me.materialId)) {
					entry.duplicateMaterialIds.add(me.materialId);
				} else {
					entry.materialIds.add(me.materialId);
				}

				const rowKey = `${key}:${me.materialId}`;
				if (!materialRowCountMap.has(rowKey)) {
					materialRowCountMap.set(rowKey, {
						count: 0,
						participantId: me.participantId,
						eventCategoryId: catId,
						juryId: me.juryId,
						materialId: me.materialId,
					});
				}
				materialRowCountMap.get(rowKey)!.count += 1;
			}

			const issues: Array<{
				type: "material_duplicate" | "material_excess" | "missing_score" | "score_exceeds_max" | "jury_score_gap";
				severity: "error" | "warning";
				participantId: string;
				participantName: string;
				category?: string;
				juryId?: string;
				juryName?: string;
				eventCategoryId?: string;
				message: string;
				fixAction?: "delete_jury_category" | "recalculate" | "none";
			}> = [];

			const eventAssessmentCategoryMap = new Map(
				event.assessmentCategories.map((eac) => [eac.id, eac])
			);

			for (const duplicate of materialRowCountMap.values()) {
				if (duplicate.count <= 1) continue;

				const eac = eventAssessmentCategoryMap.get(duplicate.eventCategoryId);
				const categoryName = eac?.assessmentCategory.name || "Unknown";
				const juryName = juryNameMap.get(duplicate.juryId) || "Unknown";
				const materialName = materialNameMap.get(duplicate.materialId) || "Unknown";

				issues.push({
					type: "material_duplicate",
					severity: "error",
					participantId: duplicate.participantId,
					participantName: participantNameMap.get(duplicate.participantId) || "Unknown",
					category: categoryName,
					juryId: duplicate.juryId,
					juryName,
					eventCategoryId: duplicate.eventCategoryId,
					message: `Juri "${juryName}" memiliki ${duplicate.count} nilai untuk materi "${materialName}" pada kategori "${categoryName}". Ini termasuk materi ganda karena materi yang sama tersimpan lebih dari sekali oleh juri yang sama.`,
					fixAction: "delete_jury_category",
				});
			}

			// Check each participant x category x jury
			for (const participant of participants) {
				for (const eac of event.assessmentCategories) {
					const catId = eac.assessmentCategoryId;
					const catName = eac.assessmentCategory.name;
					const expectedMaterialCount = materialsPerCategory.get(eac.id) || 0;
					const assignedJuries = juryAssignments.filter((ja) =>
						ja.assignedCategories.some((ac) => ac.assessmentCategoryId === catId)
					);
					const scoredCounts: Array<{ juryId: string; juryName: string; count: number }> = [];

					for (const ja of assignedJuries) {
						const key = `${participant.id}:${eac.id}:${ja.jury.id}`;
						const evalData = materialCountMap.get(key);
						const scoredCount = evalData?.scoredCount || 0;
						scoredCounts.push({
							juryId: ja.jury.id,
							juryName: ja.jury.name,
							count: scoredCount,
						});

						if (!evalData || evalData.totalRows === 0) {
							// Missing: jury hasn't scored any material for this participant-category
							issues.push({
								type: "missing_score",
								severity: "warning",
								participantId: participant.id,
								participantName: participant.groupName,
								category: catName,
								juryId: ja.jury.id,
								juryName: ja.jury.name,
								eventCategoryId: eac.id,
								message: `Juri "${ja.jury.name}" belum menilai materi apapun untuk kategori "${catName}"`,
								fixAction: "none",
							});
						} else if (
							assignedJuries.length === 1 &&
							expectedMaterialCount > 0 &&
							scoredCount > expectedMaterialCount &&
							evalData.duplicateMaterialIds.size === 0
						) {
							issues.push({
								type: "jury_score_gap",
								severity: "warning",
								participantId: participant.id,
								participantName: participant.groupName,
								category: catName,
								juryId: ja.jury.id,
								juryName: ja.jury.name,
								eventCategoryId: eac.id,
								message: `Jumlah nilai materi juri "${ja.jury.name}" (${scoredCount}) tidak sesuai dengan jumlah materi acuan (${expectedMaterialCount}) pada kategori "${catName}". Periksa apakah ada materi yang belum dinilai atau data penilaian belum lengkap.`,
								fixAction: "none",
							});
						}
					}

					if (scoredCounts.length >= 2) {
						const uniqueCounts = new Set(scoredCounts.map((item) => item.count));
						const hasAnyScore = scoredCounts.some((item) => item.count > 0);
						if (hasAnyScore && uniqueCounts.size > 1) {
							issues.push({
								type: "jury_score_gap",
								severity: "warning",
								participantId: participant.id,
								participantName: participant.groupName,
								category: catName,
								eventCategoryId: eac.id,
								message: `Kesenjangan jumlah nilai antar juri di kategori "${catName}": ${scoredCounts.map((item) => `${item.juryName} (${item.count})`).join(", ")}. Ini bukan nilai ganda; periksa apakah ada materi yang belum dinilai, dilewati, atau bernilai 0.`,
								fixAction: "none",
							});
						}
					}
				}
			}

			// Check for direct evaluations that exceed the computed maxScore
			const directEvaluations = await prisma.evaluation.findMany({
				where: { eventId: event.id },
				select: {
					participantId: true,
					juryId: true,
					assessmentCategoryId: true,
					score: true,
					maxScore: true,
				},
			});

			for (const ev of directEvaluations) {
				const eac = event.assessmentCategories.find(
					(c) => c.assessmentCategoryId === ev.assessmentCategoryId
				);
				// Use computed max from materials, fall back to stored maxScore
				const realMaxScore = eac ? (computedMaxScorePerCategory.get(eac.id) || ev.maxScore) : ev.maxScore;
				if (ev.score > realMaxScore && realMaxScore > 0) {
					issues.push({
						type: "score_exceeds_max",
						severity: "error",
						participantId: ev.participantId,
						participantName: participantNameMap.get(ev.participantId) || "Unknown",
						category: eac?.assessmentCategory.name || "Unknown",
						juryId: ev.juryId,
						juryName: juryNameMap.get(ev.juryId) || "Unknown",
						eventCategoryId: eac?.id,
						message: `Nilai juri "${juryNameMap.get(ev.juryId)}" (${ev.score}) melebihi batas maksimum (${realMaxScore}) di kategori "${eac?.assessmentCategory.name}". Periksa konfigurasi maksimum atau rincian nilai materi.`,
						fixAction: "none",
					});
				}
			}

			// Also check summed material scores against computed maxScore
			for (const key of materialCountMap.keys()) {
				const parts = key.split(":");
				const participantId = parts[0]!;
				const eacId = parts[1]!;
				const juryId = parts[2]!;
				const eac = event.assessmentCategories.find((c) => c.id === eacId);
				if (!eac) continue;

				// Use computed max from materials instead of customMaxScore or default 100
				const maxScore = computedMaxScorePerCategory.get(eacId) || eac.customMaxScore || 100;

				// Sum scores for this combo
				const relevantEvals = materialEvaluations.filter(
					(me) =>
						me.participantId === participantId &&
						me.juryId === juryId &&
						materialToCategoryMap.get(me.materialId) === eacId &&
						!me.isSkipped &&
						me.score !== null
				);
				const totalScore = relevantEvals.reduce((sum, me) => sum + (me.score || 0), 0);

				if (totalScore > maxScore) {
					issues.push({
						type: "score_exceeds_max",
						severity: "error",
						participantId,
						participantName: participantNameMap.get(participantId) || "Unknown",
						category: eac.assessmentCategory.name,
						juryId: juryId,
						juryName: juryNameMap.get(juryId) || "Unknown",
						eventCategoryId: eac.id,
						message: `Total nilai materi oleh juri "${juryNameMap.get(juryId)}" = ${totalScore}, melebihi batas maksimum (${maxScore}) di kategori "${eac.assessmentCategory.name}". Periksa konfigurasi maksimum atau rincian nilai materi.`,
						fixAction: "none",
					});
				}
			}

			// Summary
			const materialDuplicates = issues.filter((i) => i.type === "material_duplicate");
			const juryScoreGaps = issues.filter((i) => i.type === "jury_score_gap" || i.type === "material_excess");
			const missingScores = issues.filter((i) => i.type === "missing_score");
			const scoreExceeds = issues.filter((i) => i.type === "score_exceeds_max");

			res.json({
				isClean: issues.length === 0,
				totalIssues: issues.length,
				summary: {
					materialDuplicates: materialDuplicates.length,
					juryScoreGaps: juryScoreGaps.length,
					missingScores: missingScores.length,
					scoreExceedsMax: scoreExceeds.length,
				},
				issues,
			});
		} catch (error) {
			console.error("Error verifying scores:", error);
			res.status(500).json({ error: "Failed to verify scores" });
		}
	}
);

// POST /api/evaluations/event/:eventSlug/verify/fix
// Fix a specific verification issue (PANITIA/SUPERADMIN only)
router.post(
	"/event/:eventSlug/verify/fix",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;
			const { eventSlug } = req.params;
			const { action, participantId, juryId, eventCategoryId } = req.body;

			if (!user || !["PANITIA", "SUPERADMIN"].includes(user.role)) {
				return res.status(403).json({ error: "Access denied" });
			}

			const event = await prisma.event.findFirst({
				where: {
					OR: [{ slug: eventSlug }, { id: eventSlug }],
				},
			});

			if (!event) {
				return res.status(404).json({ error: "Event not found" });
			}

			// For panitia, verify they own this event
			if (user.role === "PANITIA" && event.createdById !== user.userId) {
				return res.status(403).json({ error: "Anda tidak memiliki akses ke event ini" });
			}

			if (action === "delete_jury_category") {
				// Delete all material evaluations for a specific jury + participant + category
				if (!participantId || !juryId || !eventCategoryId) {
					return res.status(400).json({ error: "participantId, juryId, dan eventCategoryId wajib diisi" });
				}

				// Get all materials in this event assessment category
				const materials = await prisma.eventMaterial.findMany({
					where: {
						eventId: event.id,
						eventAssessmentCategoryId: eventCategoryId,
					},
					select: { id: true },
				});

				const materialIds = materials.map((m) => m.id);

				// Delete material evaluations
				const deletedMaterial = await prisma.materialEvaluation.deleteMany({
					where: {
						eventId: event.id,
						juryId,
						participantId,
						materialId: { in: materialIds },
					},
				});

				// Also delete direct evaluation if exists
				const eac = await prisma.eventAssessmentCategory.findUnique({
					where: { id: eventCategoryId },
					select: { assessmentCategoryId: true },
				});

				let deletedDirect = 0;
				if (eac) {
					const result = await prisma.evaluation.deleteMany({
						where: {
							eventId: event.id,
							juryId,
							participantId,
							assessmentCategoryId: eac.assessmentCategoryId,
						},
					});
					deletedDirect = result.count;
				}

				return res.json({
					message: `Berhasil menghapus ${deletedMaterial.count} nilai materi dan ${deletedDirect} nilai langsung`,
					deletedMaterialCount: deletedMaterial.count,
					deletedDirectCount: deletedDirect,
				});
			}

			if (action === "recalculate") {
				// Recalculate the Evaluation (direct) score from MaterialEvaluation sums
				if (!participantId || !juryId || !eventCategoryId) {
					return res.status(400).json({ error: "participantId, juryId, dan eventCategoryId wajib diisi" });
				}

				const eac = await prisma.eventAssessmentCategory.findUnique({
					where: { id: eventCategoryId },
					select: { assessmentCategoryId: true, customMaxScore: true },
				});

				if (!eac) {
					return res.status(404).json({ error: "Kategori penilaian tidak ditemukan" });
				}

				// Get all materials in this category
				const materials = await prisma.eventMaterial.findMany({
					where: {
						eventId: event.id,
						eventAssessmentCategoryId: eventCategoryId,
					},
					select: { id: true },
				});

				const materialIds = materials.map((m) => m.id);

				// Sum material evaluation scores
				const matEvals = await prisma.materialEvaluation.findMany({
					where: {
						eventId: event.id,
						juryId,
						participantId,
						materialId: { in: materialIds },
						isSkipped: false,
					},
					select: { score: true },
				});

				const totalScore = matEvals.reduce((sum, me) => sum + (me.score || 0), 0);
				const maxScore = eac.customMaxScore || 100;

				// Upsert the direct Evaluation record
				await prisma.evaluation.upsert({
					where: {
						eventId_assessmentCategoryId_juryId_participantId: {
							eventId: event.id,
							assessmentCategoryId: eac.assessmentCategoryId,
							juryId,
							participantId,
						},
					},
					update: {
						score: totalScore,
						maxScore,
					},
					create: {
						eventId: event.id,
						assessmentCategoryId: eac.assessmentCategoryId,
						juryId,
						participantId,
						score: totalScore,
						maxScore,
					},
				});

				return res.json({
					message: `Nilai berhasil dihitung ulang: ${totalScore} (maks: ${maxScore})`,
					newScore: totalScore,
					maxScore,
				});
			}

			return res.status(400).json({ error: "Action tidak dikenal" });
		} catch (error) {
			console.error("Error fixing verification issue:", error);
			res.status(500).json({ error: "Gagal memperbaiki masalah" });
		}
	}
);

// GET /api/evaluations/event/:eventSlug/participant/:participantId/detail
// Get detailed material evaluations for a participant (PANITIA/SUPERADMIN only)
router.get(
	"/event/:eventSlug/participant/:participantId/detail",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;
			const { eventSlug, participantId } = req.params;

			if (!user || !["PANITIA", "SUPERADMIN"].includes(user.role)) {
				return res.status(403).json({ error: "Access denied" });
			}

			// Get event by slug
			const event = await prisma.event.findUnique({
				where: { slug: eventSlug },
				include: {
					assessmentCategories: {
						include: {
							assessmentCategory: true,
						},
						orderBy: {
							assessmentCategory: { order: "asc" },
						},
					},
				},
			});

			if (!event) {
				return res.status(404).json({ error: "Event tidak ditemukan" });
			}

			// Check panitia ownership (if not SUPERADMIN)
			if (user.role === "PANITIA") {
				if (event.createdById !== user.userId) {
					return res.status(403).json({ error: "Anda tidak memiliki akses ke event ini" });
				}
			}

			// Get participant info
			const participant = await prisma.participationGroup.findUnique({
				where: { id: participantId },
				include: {
					participation: {
						include: {
							user: {
								select: { id: true, name: true, profile: { select: { institution: true } } },
							},
							groups: {
								where: { status: "ACTIVE" },
								select: { id: true },
							},
						},
					},
					schoolCategory: true,
				},
			});

			if (!participant) {
				return res.status(404).json({ error: "Peserta tidak ditemukan" });
			}

			// Get all juries assigned to this event
			const juries = await prisma.juryEventAssignment.findMany({
				where: {
					eventId: event.id,
					status: "CONFIRMED",
				},
				include: {
					jury: {
						select: { id: true, name: true },
					},
					assignedCategories: true,
				},
			});

			// Get all materials for this event grouped by assessment category
			const materials = await prisma.eventMaterial.findMany({
				where: { eventId: event.id },
				orderBy: [
					{ eventAssessmentCategoryId: "asc" },
					{ number: "asc" },
				],
			});

			// Get all material evaluations for this participant
			const materialEvaluations = await prisma.materialEvaluation.findMany({
				where: {
					eventId: event.id,
					participantId,
				},
				include: {
					jury: {
						select: { id: true, name: true },
					},
				},
			});

			// Build detailed response
			interface MaterialWithEvaluations {
				id: string;
				number: number;
				name: string;
				description: string | null;
				scoreCategories: unknown;
				evaluations: {
					id: string;
					juryId: string;
					juryName: string;
					score: number | null;
					scoreCategoryName: string | null;
					isSkipped: boolean;
					skipReason: string | null;
					notes: string | null;
					scoredAt: Date | null;
					createdAt: Date;
					updatedAt: Date;
				}[];
			}

			interface CategoryDetail {
				categoryId: string;
				eventCategoryId: string;
				categoryName: string;
				materials: MaterialWithEvaluations[];
				juries: {
					id: string;
					name: string;
					totalScore: number;
					materialCount: number;
				}[];
			}

			const categoryDetails: CategoryDetail[] = event.assessmentCategories.map((eac) => {
				const categoryMaterials = materials.filter(
					(m) => m.eventAssessmentCategoryId === eac.id
				);

				// Get juries assigned to this category
				const assignedJuries = juries.filter((j) =>
					j.assignedCategories.some((ac) => ac.assessmentCategoryId === eac.assessmentCategoryId)
				);

				const materialDetails: MaterialWithEvaluations[] = categoryMaterials.map((material) => {
					const evals = materialEvaluations.filter((me) => me.materialId === material.id);
					
					return {
						id: material.id,
						number: material.number,
						name: material.name,
						description: material.description,
						scoreCategories: material.scoreCategories,
						evaluations: evals.map((e) => ({
							id: e.id,
							juryId: e.juryId,
							juryName: e.jury.name,
							score: e.score,
							scoreCategoryName: e.scoreCategoryName,
							isSkipped: e.isSkipped,
							skipReason: e.skipReason,
							notes: e.notes,
							scoredAt: e.scoredAt,
							createdAt: e.createdAt,
							updatedAt: e.updatedAt,
						})),
					};
				});

				// Calculate jury totals for this category
				const juryTotals = assignedJuries.map((j) => {
					let totalScore = 0;
					let materialCount = 0;

					categoryMaterials.forEach((material) => {
						const eval_ = materialEvaluations.find(
							(me) => me.materialId === material.id && me.juryId === j.jury.id
						);
						if (eval_ && !eval_.isSkipped && eval_.score !== null) {
							totalScore += eval_.score;
							materialCount++;
						}
					});

					return {
						id: j.jury.id,
						name: j.jury.name,
						totalScore,
						materialCount,
					};
				});

				return {
					categoryId: eac.assessmentCategoryId,
					eventCategoryId: eac.id,
					categoryName: eac.assessmentCategory.name,
					materials: materialDetails,
					juries: juryTotals,
				};
			});

			const schoolOrInstitution = participant.participation.schoolName || participant.participation.user.profile?.institution || null;
			const hasMultipleGroups = (participant.participation.groups?.length || 0) > 1;

			res.json({
				participant: {
					id: participant.id,
					teamName: schoolOrInstitution || participant.groupName,
					groupLabel: hasMultipleGroups ? participant.groupName : null,
					orderNumber: participant.orderNumber,
					schoolCategory: participant.schoolCategory
						? { id: participant.schoolCategory.id, name: participant.schoolCategory.name }
						: null,
					registrant: {
						id: participant.participation.user.id,
						name: participant.participation.user.name,
						institution: schoolOrInstitution,
					},
				},
				eventId: event.id,
				categories: categoryDetails,
			});
		} catch (error) {
			console.error("Error fetching participant detail:", error);
			res.status(500).json({ error: "Failed to fetch participant detail" });
		}
	}
);

// PUT /api/evaluations/material-evaluation/:evaluationId
// Update a material evaluation (PANITIA/SUPERADMIN only)
router.put(
	"/material-evaluation/:evaluationId",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;
			const { evaluationId } = req.params;
			const { score, scoreCategoryName, isSkipped, skipReason, notes } = req.body;

			if (!user || !["PANITIA", "SUPERADMIN"].includes(user.role)) {
				return res.status(403).json({ error: "Access denied" });
			}

			// Get the evaluation
			const evaluation = await prisma.materialEvaluation.findUnique({
				where: { id: evaluationId },
				include: {
					event: true,
				},
			});

			if (!evaluation) {
				return res.status(404).json({ error: "Evaluasi tidak ditemukan" });
			}

			// Check panitia ownership (if not SUPERADMIN)
			if (user.role === "PANITIA") {
				if (evaluation.event.createdById !== user.userId) {
					return res.status(403).json({ error: "Anda tidak memiliki akses ke event ini" });
				}
			}

			// Update the evaluation
			const updated = await prisma.materialEvaluation.update({
				where: { id: evaluationId },
				data: {
					score: isSkipped ? null : score,
					scoreCategoryName: isSkipped ? null : scoreCategoryName,
					isSkipped: isSkipped || false,
					skipReason: isSkipped ? skipReason : null,
					notes: notes || null,
				},
			});

			res.json({
				message: "Evaluasi berhasil diperbarui",
				evaluation: updated,
			});
		} catch (error) {
			console.error("Error updating material evaluation:", error);
			res.status(500).json({ error: "Failed to update evaluation" });
		}
	}
);

// POST /api/evaluations/material-evaluation
// Create a new material evaluation (PANITIA/SUPERADMIN only)
router.post(
	"/material-evaluation",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;
			const { eventId, materialId, juryId, participantId, score, scoreCategoryName, isSkipped, skipReason, notes } = req.body;

			if (!user || !["PANITIA", "SUPERADMIN"].includes(user.role)) {
				return res.status(403).json({ error: "Access denied" });
			}

			// Check panitia ownership (if not SUPERADMIN)
			if (user.role === "PANITIA") {
				const event = await prisma.event.findFirst({
					where: {
						id: eventId,
						createdById: user.userId,
					},
				});

				if (!event) {
					return res.status(403).json({ error: "Anda tidak memiliki akses ke event ini" });
				}
			}

			// Check if evaluation already exists
			const existing = await prisma.materialEvaluation.findUnique({
				where: {
					eventId_materialId_juryId_participantId: {
						eventId,
						materialId,
						juryId,
						participantId,
					},
				},
			});

			if (existing) {
				return res.status(400).json({ error: "Evaluasi sudah ada, gunakan endpoint update" });
			}

			// Create the evaluation
			const created = await prisma.materialEvaluation.create({
				data: {
					eventId,
					materialId,
					juryId,
					participantId,
					score: isSkipped ? null : score,
					scoreCategoryName: isSkipped ? null : scoreCategoryName,
					isSkipped: isSkipped || false,
					skipReason: isSkipped ? skipReason : null,
					notes: notes || null,
				},
			});

			res.json({
				message: "Evaluasi berhasil dibuat",
				evaluation: created,
			});
		} catch (error) {
			console.error("Error creating material evaluation:", error);
			res.status(500).json({ error: "Failed to create evaluation" });
		}
	}
);

// =====================================================
// EXTRA NILAI ROUTES (Punishment & Poin Plus)
// =====================================================

// GET /api/evaluations/event/:eventSlug/extra-nilai - Get all extra nilai for an event
router.get(
	"/event/:eventSlug/extra-nilai",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;
			const { eventSlug } = req.params;
			const { participantId } = req.query;

			if (!user || !["PANITIA", "SUPERADMIN"].includes(user.role)) {
				return res.status(403).json({ error: "Access denied" });
			}

			// Find event
			const event = await prisma.event.findFirst({
				where: {
					OR: [
						{ slug: eventSlug },
						{ id: eventSlug },
					],
				},
			});

			if (!event) {
				return res.status(404).json({ error: "Event not found" });
			}

			// For panitia, verify they own this event
			if (user.role === "PANITIA" && event.createdById !== user.userId) {
				return res.status(403).json({ error: "Anda tidak memiliki akses ke event ini" });
			}

			const whereClause: { eventId: string; participantId?: string } = { eventId: event.id };
			if (participantId) {
				whereClause.participantId = participantId as string;
			}

			const extraNilai = await prisma.extraNilai.findMany({
				where: whereClause,
				orderBy: { createdAt: "desc" },
			});

			res.json(extraNilai);
		} catch (error) {
			console.error("Error fetching extra nilai:", error);
			res.status(500).json({ error: "Failed to fetch extra nilai" });
		}
	}
);

// POST /api/evaluations/extra-nilai - Create extra nilai (punishment/poin plus)
router.post(
	"/extra-nilai",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;
			const { eventId, participantId, type, scope, assessmentCategoryId, juaraCategoryId, value, reason } = req.body;

			if (!user || !["PANITIA", "SUPERADMIN"].includes(user.role)) {
				return res.status(403).json({ error: "Access denied" });
			}

			// Validate input
			if (!eventId || !participantId || !type || !scope || value === undefined) {
				return res.status(400).json({ error: "Data tidak lengkap" });
			}

			if (!["PUNISHMENT", "POINPLUS"].includes(type)) {
				return res.status(400).json({ error: "Tipe tidak valid" });
			}

			if (!["GENERAL", "CATEGORY", "JUARA"].includes(scope)) {
				return res.status(400).json({ error: "Scope tidak valid" });
			}

			if (scope === "CATEGORY" && !assessmentCategoryId) {
				return res.status(400).json({ error: "Kategori penilaian harus dipilih untuk scope CATEGORY" });
			}

			if (scope === "JUARA" && !juaraCategoryId) {
				return res.status(400).json({ error: "Kategori juara harus dipilih untuk scope JUARA" });
			}

			if (typeof value !== "number" || value < 0) {
				return res.status(400).json({ error: "Nilai harus berupa angka positif" });
			}

			// Find event
			const event = await prisma.event.findUnique({
				where: { id: eventId },
			});

			if (!event) {
				return res.status(404).json({ error: "Event tidak ditemukan" });
			}

			// For panitia, verify they own this event
			if (user.role === "PANITIA" && event.createdById !== user.userId) {
				return res.status(403).json({ error: "Anda tidak memiliki akses ke event ini" });
			}

			// If scope is CATEGORY, verify the category exists for this event
			if (scope === "CATEGORY") {
				const categoryExists = await prisma.eventAssessmentCategory.findFirst({
					where: {
						eventId,
						assessmentCategoryId,
					},
				});

				if (!categoryExists) {
					return res.status(400).json({ error: "Kategori penilaian tidak ditemukan untuk event ini" });
				}
			}

			// If scope is JUARA, verify the juara category exists for this event
			if (scope === "JUARA") {
				const juaraExists = await prisma.juaraCategory.findFirst({
					where: {
						id: juaraCategoryId,
						eventId,
					},
				});

				if (!juaraExists) {
					return res.status(400).json({ error: "Kategori juara tidak ditemukan untuk event ini" });
				}
			}

			const extraNilai = await prisma.extraNilai.create({
				data: {
					eventId,
					participantId,
					type,
					scope,
					assessmentCategoryId: scope === "CATEGORY" ? assessmentCategoryId : null,
					juaraCategoryId: scope === "JUARA" ? juaraCategoryId : null,
					value,
					reason: reason || null,
					createdById: user.userId,
				},
			});

			res.json({
				message: type === "PUNISHMENT" ? "Punishment berhasil ditambahkan" : "Poin plus berhasil ditambahkan",
				extraNilai,
			});
		} catch (error) {
			console.error("Error creating extra nilai:", error);
			res.status(500).json({ error: "Failed to create extra nilai" });
		}
	}
);

// PUT /api/evaluations/extra-nilai/:id - Update extra nilai
router.put(
	"/extra-nilai/:id",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;
			const { id } = req.params;
			const { type, scope, assessmentCategoryId, juaraCategoryId, value, reason } = req.body;

			if (!user || !["PANITIA", "SUPERADMIN"].includes(user.role)) {
				return res.status(403).json({ error: "Access denied" });
			}

			// Find existing
			const existing = await prisma.extraNilai.findUnique({
				where: { id },
			});

			if (!existing) {
				return res.status(404).json({ error: "Extra nilai tidak ditemukan" });
			}

			// Check access
			const event = await prisma.event.findUnique({
				where: { id: existing.eventId },
			});

			if (!event) {
				return res.status(404).json({ error: "Event tidak ditemukan" });
			}

			if (user.role === "PANITIA" && event.createdById !== user.userId) {
				return res.status(403).json({ error: "Anda tidak memiliki akses ke event ini" });
			}

			// Validate
			if (scope === "CATEGORY" && !assessmentCategoryId) {
				return res.status(400).json({ error: "Kategori penilaian harus dipilih untuk scope CATEGORY" });
			}

			if (scope === "JUARA" && !juaraCategoryId) {
				return res.status(400).json({ error: "Kategori juara harus dipilih untuk scope JUARA" });
			}

			if (value !== undefined && (typeof value !== "number" || value < 0)) {
				return res.status(400).json({ error: "Nilai harus berupa angka positif" });
			}

			const updated = await prisma.extraNilai.update({
				where: { id },
				data: {
					type: type || existing.type,
					scope: scope || existing.scope,
					assessmentCategoryId: scope === "CATEGORY" ? assessmentCategoryId : null,
					juaraCategoryId: scope === "JUARA" ? juaraCategoryId : null,
					value: value !== undefined ? value : existing.value,
					reason: reason !== undefined ? reason : existing.reason,
				},
			});

			res.json({
				message: "Extra nilai berhasil diperbarui",
				extraNilai: updated,
			});
		} catch (error) {
			console.error("Error updating extra nilai:", error);
			res.status(500).json({ error: "Failed to update extra nilai" });
		}
	}
);

// DELETE /api/evaluations/extra-nilai/:id - Delete extra nilai
router.delete(
	"/extra-nilai/:id",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;
			const { id } = req.params;

			if (!user || !["PANITIA", "SUPERADMIN"].includes(user.role)) {
				return res.status(403).json({ error: "Access denied" });
			}

			// Find existing
			const existing = await prisma.extraNilai.findUnique({
				where: { id },
			});

			if (!existing) {
				return res.status(404).json({ error: "Extra nilai tidak ditemukan" });
			}

			// Check access
			const event = await prisma.event.findUnique({
				where: { id: existing.eventId },
			});

			if (!event) {
				return res.status(404).json({ error: "Event tidak ditemukan" });
			}

			if (user.role === "PANITIA" && event.createdById !== user.userId) {
				return res.status(403).json({ error: "Anda tidak memiliki akses ke event ini" });
			}

			await prisma.extraNilai.delete({
				where: { id },
			});

			res.json({ message: "Extra nilai berhasil dihapus" });
		} catch (error) {
			console.error("Error deleting extra nilai:", error);
			res.status(500).json({ error: "Failed to delete extra nilai" });
		}
	}
);

// DELETE /api/evaluations/jury-category - Delete all evaluations for a jury in a category
router.delete(
	"/jury-category",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;
			const { eventId, juryId, eventCategoryId, participantId } = req.body;

			if (!user || !["PANITIA", "SUPERADMIN"].includes(user.role)) {
				return res.status(403).json({ error: "Access denied" });
			}

			if (!eventId || !juryId || !eventCategoryId || !participantId) {
				return res.status(400).json({ error: "Missing required fields" });
			}

			// Check event access
			const event = await prisma.event.findUnique({
				where: { id: eventId },
			});

			if (!event) {
				return res.status(404).json({ error: "Event tidak ditemukan" });
			}

			if (user.role === "PANITIA" && event.createdById !== user.userId) {
				return res.status(403).json({ error: "Anda tidak memiliki akses ke event ini" });
			}

			// Get all materials in the category
			const materials = await prisma.eventMaterial.findMany({
				where: {
					eventId,
					eventAssessmentCategoryId: eventCategoryId,
				},
				select: { id: true },
			});

			const materialIds = materials.map((m: { id: string }) => m.id);

			// Delete all evaluations for this jury on these materials for this participant
			const deleted = await prisma.materialEvaluation.deleteMany({
				where: {
					eventId,
					juryId,
					participantId,
					materialId: { in: materialIds },
				},
			});

			res.json({ 
				message: `${deleted.count} nilai berhasil dihapus`,
				deletedCount: deleted.count,
			});
		} catch (error) {
			console.error("Error deleting jury category evaluations:", error);
			res.status(500).json({ error: "Failed to delete evaluations" });
		}
	}
);

// =====================================================
// PESERTA ROUTES - View own assessment results
// =====================================================

// GET /api/evaluations/my-events - Get list of confirmed events for peserta
router.get(
	"/my-events",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;

			if (!user || user.role !== "PESERTA") {
				return res.status(403).json({ error: "Access denied" });
			}

			// Get all confirmed participations for this user
			const participations = await prisma.eventParticipation.findMany({
				where: {
					userId: user.userId,
					status: {
						in: ["CONFIRMED", "ATTENDED"],
					},
				},
				include: {
					event: {
						select: {
							id: true,
							title: true,
							slug: true,
							startDate: true,
							endDate: true,
							location: true,
							thumbnail: true,
							status: true,
						},
					},
					groups: {
						where: { status: "ACTIVE" },
						include: {
							schoolCategory: {
								select: { id: true, name: true },
							},
						},
					},
				},
				orderBy: { createdAt: "desc" },
			});

			res.json(participations);
		} catch (error) {
			console.error("Error fetching my events:", error);
			res.status(500).json({ error: "Failed to fetch events" });
		}
	}
);

// GET /api/evaluations/my-performance-summary - Get peserta performance summary across all events
router.get(
	"/my-performance-summary",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;

			if (!user || user.role !== "PESERTA") {
				return res.status(403).json({ error: "Access denied" });
			}

			const participations = await prisma.eventParticipation.findMany({
				where: {
					userId: user.userId,
					status: {
						in: ["CONFIRMED", "ATTENDED"],
					},
				},
				include: {
					event: {
						select: {
							id: true,
							title: true,
							slug: true,
							startDate: true,
							endDate: true,
							location: true,
							thumbnail: true,
							status: true,
						},
					},
					groups: {
						where: { status: "ACTIVE" },
						include: {
							schoolCategory: {
								select: { id: true, name: true },
							},
						},
					},
				},
				orderBy: { createdAt: "desc" },
			});

			const emptyResponse = {
				participations: [],
				performance: {
					summary: {
						totalEvents: 0,
						eventsWithScores: 0,
						totalScore: 0,
						totalMaterials: 0,
						evaluatedMaterials: 0,
						averageScore: null,
						latestScoredAt: null,
					},
					categoryRankings: [],
					strongestCategory: null,
					weakestCategory: null,
					highestMaterial: null,
					lowestMaterial: null,
					bestEvent: null,
				},
			};

			if (participations.length === 0) {
				return res.json(emptyResponse);
			}

			const eventIds = [...new Set(participations.map((participation) => participation.eventId))];
			const groupIds = participations.flatMap((participation) =>
				participation.groups.map((group) => group.id)
			);

			const eventInfoMap = new Map(
				participations.map((participation) => [participation.eventId, participation.event])
			);
			const participationGroupIds = new Map<string, Set<string>>();
			const eventSchoolCategoryMap = new Map<string, Set<string>>();

			participations.forEach((participation) => {
				participationGroupIds.set(
					participation.eventId,
					new Set(participation.groups.map((group) => group.id))
				);

				eventSchoolCategoryMap.set(
					participation.eventId,
					new Set(
						participation.groups
							.map((group) => group.schoolCategory?.id)
							.filter((value): value is string => Boolean(value))
					)
				);
			});

			const materials = await prisma.eventMaterial.findMany({
				where: {
					eventId: { in: eventIds },
				},
				select: {
					id: true,
					eventId: true,
					eventAssessmentCategoryId: true,
					name: true,
					number: true,
					order: true,
					schoolCategoryIds: true,
				},
				orderBy: [{ eventId: "asc" }, { eventAssessmentCategoryId: "asc" }, { order: "asc" }],
			});

			const relevantMaterials = materials.filter((material) => {
				if (material.schoolCategoryIds.length === 0) {
					return true;
				}

				const allowedSchoolCategoryIds = eventSchoolCategoryMap.get(material.eventId);
				if (!allowedSchoolCategoryIds || allowedSchoolCategoryIds.size === 0) {
					return false;
				}

				return material.schoolCategoryIds.some((schoolCategoryId) =>
					allowedSchoolCategoryIds.has(schoolCategoryId)
				);
			});

			if (relevantMaterials.length === 0) {
				return res.json({
					participations: participations.map((participation) => ({
						...participation,
						summary: {
							totalScore: 0,
							totalMaterials: 0,
							evaluatedMaterials: 0,
							averageScore: null,
						},
					})),
					performance: emptyResponse.performance,
				});
			}

			const categoryIds = [
				...new Set(relevantMaterials.map((material) => material.eventAssessmentCategoryId)),
			];

			const eventCategories = await prisma.eventAssessmentCategory.findMany({
				where: {
					id: { in: categoryIds },
				},
				include: {
					assessmentCategory: {
						select: { id: true, name: true, order: true },
					},
				},
			});

			const categoryMap = new Map(
				eventCategories.map((category) => [
					category.id,
					{
						assessmentCategoryId: category.assessmentCategoryId,
						categoryName: category.assessmentCategory.name,
						order: category.assessmentCategory.order ?? 0,
					},
				])
			);

			const relevantMaterialIds = relevantMaterials.map((material) => material.id);
			const materialEvaluations = await prisma.materialEvaluation.findMany({
				where: {
					eventId: { in: eventIds },
					materialId: { in: relevantMaterialIds },
					participantId: { in: groupIds },
				},
				select: {
					eventId: true,
					materialId: true,
					participantId: true,
					score: true,
					isSkipped: true,
					scoredAt: true,
				},
			});

			const evaluationsByMaterial = new Map<string, typeof materialEvaluations>();
			materialEvaluations.forEach((evaluation) => {
				const existing = evaluationsByMaterial.get(evaluation.materialId) || [];
				existing.push(evaluation);
				evaluationsByMaterial.set(evaluation.materialId, existing);
			});

			const materialPerformances = relevantMaterials
				.map((material) => {
					const participantIdsForEvent = participationGroupIds.get(material.eventId) || new Set<string>();
					const validEvaluations = (evaluationsByMaterial.get(material.id) || []).filter(
						(evaluation) =>
							participantIdsForEvent.has(evaluation.participantId) &&
							evaluation.score !== null &&
							!evaluation.isSkipped
					);

					const averageScore =
						validEvaluations.length > 0
							? validEvaluations.reduce((sum, evaluation) => sum + (evaluation.score || 0), 0) /
							  validEvaluations.length
							: null;

					const latestScoredAt = validEvaluations.reduce<Date | null>((latest, evaluation) => {
						if (!evaluation.scoredAt) return latest;
						if (!latest || evaluation.scoredAt > latest) return evaluation.scoredAt;
						return latest;
					}, null);

					const categoryInfo = categoryMap.get(material.eventAssessmentCategoryId);
					const eventInfo = eventInfoMap.get(material.eventId);

					return {
						materialId: material.id,
						materialName: material.name,
						materialNumber: material.number,
						categoryId: categoryInfo?.assessmentCategoryId || material.eventAssessmentCategoryId,
						categoryName: categoryInfo?.categoryName || "Lainnya",
						eventId: material.eventId,
						eventTitle: eventInfo?.title || "Event",
						eventSlug: eventInfo?.slug || null,
						averageScore,
						evaluationCount: validEvaluations.length,
						latestScoredAt: latestScoredAt ? latestScoredAt.toISOString() : null,
					};
				})
				.filter(
					(material): material is {
						materialId: string;
						materialName: string;
						materialNumber: number;
						categoryId: string;
						categoryName: string;
						eventId: string;
						eventTitle: string;
						eventSlug: string | null;
						averageScore: number;
						evaluationCount: number;
						latestScoredAt: string | null;
					} => material.averageScore !== null
				);

			const participationSummaries = participations.map((participation) => {
				const eventMaterials = relevantMaterials.filter(
					(material) => material.eventId === participation.eventId
				);
				const eventMaterialPerformances = materialPerformances.filter(
					(material) => material.eventId === participation.eventId
				);

				const totalScore = eventMaterialPerformances.reduce(
					(sum, material) => sum + material.averageScore,
					0
				);
				const evaluatedMaterials = eventMaterialPerformances.length;

				return {
					...participation,
					summary: {
						totalScore,
						totalMaterials: eventMaterials.length,
						evaluatedMaterials,
						averageScore: evaluatedMaterials > 0 ? totalScore / evaluatedMaterials : null,
					},
				};
			});

			const categoryAccumulator = new Map<
				string,
				{
					categoryId: string;
					categoryName: string;
					totalScore: number;
					scoredMaterials: number;
					eventIds: Set<string>;
				}
			>();

			materialPerformances.forEach((material) => {
				const current =
					categoryAccumulator.get(material.categoryId) || {
						categoryId: material.categoryId,
						categoryName: material.categoryName,
						totalScore: 0,
						scoredMaterials: 0,
						eventIds: new Set<string>(),
					};

				current.totalScore += material.averageScore;
				current.scoredMaterials += 1;
				current.eventIds.add(material.eventId);
				categoryAccumulator.set(material.categoryId, current);
			});

			const categoryRankings = Array.from(categoryAccumulator.values())
				.map((category) => ({
					categoryId: category.categoryId,
					categoryName: category.categoryName,
					totalScore: category.totalScore,
					scoredMaterials: category.scoredMaterials,
					eventCount: category.eventIds.size,
					averageScore:
						category.scoredMaterials > 0
							? category.totalScore / category.scoredMaterials
							: 0,
				}))
				.sort((a, b) => b.averageScore - a.averageScore);

			const sortedMaterials = [...materialPerformances].sort((a, b) => {
				if (b.averageScore !== a.averageScore) {
					return b.averageScore - a.averageScore;
				}
				return b.evaluationCount - a.evaluationCount;
			});

			const eventPerformanceRankings = [...participationSummaries]
				.filter((participation) => participation.summary.evaluatedMaterials > 0)
				.sort((a, b) => {
					const averageA = a.summary.averageScore ?? -1;
					const averageB = b.summary.averageScore ?? -1;
					if (averageB !== averageA) {
						return averageB - averageA;
					}
					return b.summary.totalScore - a.summary.totalScore;
				});

			const totalScore = materialPerformances.reduce(
				(sum, material) => sum + material.averageScore,
				0
			);
			const evaluatedMaterials = materialPerformances.length;
			const latestScoredAt = materialPerformances.reduce<string | null>((latest, material) => {
				if (!material.latestScoredAt) return latest;
				if (!latest || new Date(material.latestScoredAt) > new Date(latest)) {
					return material.latestScoredAt;
				}
				return latest;
			}, null);

			res.json({
				participations: participationSummaries,
				performance: {
					summary: {
						totalEvents: participations.length,
						eventsWithScores: eventPerformanceRankings.length,
						totalScore,
						totalMaterials: relevantMaterials.length,
						evaluatedMaterials,
						averageScore: evaluatedMaterials > 0 ? totalScore / evaluatedMaterials : null,
						latestScoredAt,
					},
					categoryRankings,
					strongestCategory: categoryRankings[0] || null,
					weakestCategory:
						categoryRankings.length > 0
							? categoryRankings[categoryRankings.length - 1]
							: null,
					highestMaterial: sortedMaterials[0] || null,
					lowestMaterial:
						sortedMaterials.length > 0
							? [...sortedMaterials].reverse()[0]
							: null,
					bestEvent: eventPerformanceRankings[0] || null,
				},
			});
		} catch (error) {
			console.error("Error fetching my performance summary:", error);
			res.status(500).json({ error: "Failed to fetch performance summary" });
		}
	}
);

// GET /api/evaluations/my-scores/:eventSlug - Get peserta's scores for an event
router.get(
	"/my-scores/:eventSlug",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;
			const { eventSlug } = req.params;

			if (!user || user.role !== "PESERTA") {
				return res.status(403).json({ error: "Access denied" });
			}

			// Find event
			const event = await prisma.event.findFirst({
				where: {
					OR: [{ slug: eventSlug }, { id: eventSlug }],
				},
				include: {
					assessmentCategories: {
						include: {
							assessmentCategory: {
								select: { id: true, name: true, order: true },
							},
						},
						orderBy: {
							assessmentCategory: { order: "asc" },
						},
					},
				},
			});

			if (!event) {
				return res.status(404).json({ error: "Event not found" });
			}

			// Verify user is a confirmed participant
			const participation = await prisma.eventParticipation.findFirst({
				where: {
					userId: user.userId,
					eventId: event.id,
					status: { in: ["CONFIRMED", "ATTENDED"] },
				},
				include: {
					groups: {
						where: { status: "ACTIVE" },
						include: {
							schoolCategory: { select: { id: true, name: true } },
						},
					},
				},
			});

			if (!participation) {
				return res.status(403).json({ error: "Anda tidak terdaftar sebagai peserta di event ini" });
			}

			// Get participant group IDs
			const groupIds = participation.groups.map((g) => g.id);

			// Get materials for this event filtered by school category
			const schoolCategoryIds = participation.groups.map((g) => g.schoolCategoryId).filter(Boolean) as string[];
			const materials = await prisma.eventMaterial.findMany({
				where: {
					eventId: event.id,
					OR: [
						{ schoolCategoryIds: { hasSome: schoolCategoryIds } },
						{ schoolCategoryIds: { isEmpty: true } },
					],
				},
				orderBy: [
					{ eventAssessmentCategoryId: "asc" },
					{ order: "asc" },
				],
			});

			// Get assessment categories for material grouping
			const categoryIds = [...new Set(materials.map((m) => m.eventAssessmentCategoryId))];
			const eventCategories = await prisma.eventAssessmentCategory.findMany({
				where: { id: { in: categoryIds } },
				include: { assessmentCategory: { select: { id: true, name: true } } },
			});
			const categoryMap = new Map(
				eventCategories.map((c) => [c.id, c.assessmentCategory])
			);

			// Get all material evaluations for this participant
			const materialEvaluations = await prisma.materialEvaluation.findMany({
				where: {
					eventId: event.id,
					participantId: { in: groupIds },
				},
				include: {
					jury: {
						select: { id: true, name: true },
					},
				},
			});

			// Get juries who evaluated this participant
			const juriesMap = new Map<string, { id: string; name: string }>();
			materialEvaluations.forEach((me) => {
				if (me.jury && !juriesMap.has(me.jury.id)) {
					juriesMap.set(me.jury.id, me.jury);
				}
			});
			const juries = Array.from(juriesMap.values());

			// Group scores by material and jury
			interface MaterialScore {
				material: {
					id: string;
					name: string;
					number: number;
					categoryId: string;
					categoryName: string;
				};
				scores: {
					juryId: string;
					juryName: string;
					score: number | null;
					scoreCategoryName: string | null;
					isSkipped: boolean;
					skipReason: string | null;
					scoredAt: Date | null;
				}[];
				averageScore: number | null;
			}

			const materialScores: MaterialScore[] = materials.map((material) => {
				const evals = materialEvaluations.filter((me) => me.materialId === material.id);
				const scores = juries.map((jury) => {
					const eval_ = evals.find((e) => e.juryId === jury.id);
					return {
						juryId: jury.id,
						juryName: jury.name,
						score: eval_?.score ?? null,
						scoreCategoryName: eval_?.scoreCategoryName ?? null,
						isSkipped: eval_?.isSkipped ?? false,
						skipReason: eval_?.skipReason ?? null,
						scoredAt: eval_?.scoredAt ?? null,
					};
				});

				const validScores = scores.filter((s) => s.score !== null).map((s) => s.score as number);
				const averageScore = validScores.length > 0
					? validScores.reduce((a, b) => a + b, 0) / validScores.length
					: null;

				return {
					material: {
						id: material.id,
						name: material.name,
						number: material.number,
						categoryId: material.eventAssessmentCategoryId,
						categoryName: categoryMap.get(material.eventAssessmentCategoryId)?.name || "Lainnya",
					},
					scores,
					averageScore,
				};
			});

			// Group by category
			const scoresByCategory = materialScores.reduce((acc, ms) => {
				const catId = ms.material.categoryId;
				if (!acc[catId]) {
					acc[catId] = {
						categoryName: ms.material.categoryName,
						materials: [],
					};
				}
				acc[catId].materials.push(ms);
				return acc;
			}, {} as Record<string, { categoryName: string; materials: MaterialScore[] }>);

			// Calculate totals
			const allValidScores = materialScores
				.filter((ms) => ms.averageScore !== null)
				.map((ms) => ms.averageScore as number);
			const totalScore = allValidScores.reduce((a, b) => a + b, 0);
			const totalMaterials = materials.length;
			const evaluatedMaterials = materialScores.filter((ms) => ms.averageScore !== null).length;

			res.json({
				event: {
					id: event.id,
					title: event.title,
					slug: event.slug,
				},
				participation: {
					id: participation.id,
					groups: participation.groups,
				},
				juries,
				scoresByCategory: Object.values(scoresByCategory),
				summary: {
					totalScore,
					totalMaterials,
					evaluatedMaterials,
					averageScore: evaluatedMaterials > 0 ? totalScore / evaluatedMaterials : null,
				},
			});
		} catch (error) {
			console.error("Error fetching my scores:", error);
			res.status(500).json({ error: "Failed to fetch scores" });
		}
	}
);

// Get overall statistics for peserta dashboard
router.get(
	"/my-statistics",
	authenticate,
	async (req: AuthenticatedRequest, res: Response): Promise<void> => {
		try {
			const user = req.user;
			if (!user || user.role !== "PESERTA") {
				res.status(403).json({ error: "Access denied" });
				return;
			}
			const userId = user.userId;

			// Get all confirmed participations for this user
			const participations = await prisma.eventParticipation.findMany({
				where: {
					userId,
					status: "CONFIRMED",
				},
				include: {
					event: {
						select: {
							id: true,
							title: true,
							slug: true,
							materials: { select: { id: true } },
						},
					},
					groups: true,
				},
			});

			// For each participation, calculate scores
			let totalEvents = participations.length;
			let eventsWithScores = 0;
			let totalOverallScore = 0;
			let totalMaterialsEvaluated = 0;
			let totalMaterials = 0;

			for (const participation of participations) {
				// Get all group IDs for this participation
				const groupIds = participation.groups.map((g) => g.id);
				
				if (groupIds.length === 0) continue;

				// Get evaluations for this participation
				const evaluations = await prisma.materialEvaluation.findMany({
					where: {
						participantId: { in: groupIds },
						eventId: participation.eventId,
						score: { not: null },
					},
					select: { score: true },
				});

				const materialsInEvent = participation.event.materials.length;
				totalMaterials += materialsInEvent;

				if (evaluations.length > 0) {
					eventsWithScores++;
					const scores = evaluations.map((e) => e.score!);
					const eventTotalScore = scores.reduce((a, b) => a + b, 0);
					totalOverallScore += eventTotalScore;
					totalMaterialsEvaluated += scores.length;
				}
			}

			res.json({
				totalEvents,
				eventsWithScores,
				totalScore: totalOverallScore,
				totalMaterialsEvaluated,
				averageScore: totalMaterialsEvaluated > 0 ? totalOverallScore / totalMaterialsEvaluated : null,
			});
		} catch (error) {
			console.error("Error fetching statistics:", error);
			res.status(500).json({ error: "Failed to fetch statistics" });
		}
	}
);

// POST /api/evaluations/event/:eventSlug/verify/seed-test
// Seed dummy problematic data for testing verification (SUPERADMIN only, development)
router.get(
	"/event/:eventSlug/verify/seed-test",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;
			const { eventSlug } = req.params;

			if (!user || user.role !== "SUPERADMIN") {
				return res.status(403).json({ error: "Superadmin only" });
			}

			const event = await prisma.event.findFirst({
				where: {
					OR: [{ slug: eventSlug }, { id: eventSlug }],
				},
				include: {
					assessmentCategories: {
						include: {
							assessmentCategory: true,
						},
					},
				},
			});

			if (!event) {
				return res.status(404).json({ error: "Event not found" });
			}

			if (event.assessmentCategories.length === 0) {
				return res.status(400).json({ error: "Event harus memiliki minimal 1 kategori penilaian" });
			}

			const seeded: string[] = [];

			// ---- AUTO-CREATE: Juri dummy users if needed ----
			let juryAssignments = await prisma.juryEventAssignment.findMany({
				where: { eventId: event.id, status: "CONFIRMED" },
				include: {
					jury: { select: { id: true, name: true } },
					assignedCategories: { select: { assessmentCategoryId: true } },
				},
				take: 2,
			});

			if (juryAssignments.length === 0) {
				// Create 2 dummy jury users
				const bcrypt = await import("bcryptjs");
				const dummyHash = await bcrypt.hash("testjuri123", 10);

				for (let i = 1; i <= 2; i++) {
					const juryEmail = `test-juri-${i}@simpaskor-test.id`;
					const juryUser = await prisma.user.upsert({
						where: { email: juryEmail },
						update: {},
						create: {
							email: juryEmail,
							passwordHash: dummyHash,
							name: `Juri Test ${i}`,
							role: "JURI",
							status: "ACTIVE",
							emailVerified: true,
						},
					});

					// Create jury event assignment
					const assignment = await prisma.juryEventAssignment.upsert({
						where: {
							juryId_eventId: { juryId: juryUser.id, eventId: event.id },
						},
						update: { status: "CONFIRMED" },
						create: {
							juryId: juryUser.id,
							eventId: event.id,
							status: "CONFIRMED",
						},
					});

					// Assign all assessment categories
					for (const eac of event.assessmentCategories) {
						await prisma.juryAssignedCategory.upsert({
							where: {
								assignmentId_assessmentCategoryId: {
									assignmentId: assignment.id,
									assessmentCategoryId: eac.assessmentCategoryId,
								},
							},
							update: {},
							create: {
								assignmentId: assignment.id,
								assessmentCategoryId: eac.assessmentCategoryId,
							},
						});
					}
					seeded.push(`Created jury user: ${juryEmail}`);
				}

				// Re-fetch jury assignments
				juryAssignments = await prisma.juryEventAssignment.findMany({
					where: { eventId: event.id, status: "CONFIRMED" },
					include: {
						jury: { select: { id: true, name: true } },
						assignedCategories: { select: { assessmentCategoryId: true } },
					},
					take: 2,
				});
			}

			// ---- AUTO-CREATE: Peserta dummy if needed ----
			let participants = await prisma.participationGroup.findMany({
				where: {
					participation: { eventId: event.id },
					status: { in: ["REGISTERED", "CONFIRMED", "ATTENDED", "ACTIVE"] },
				},
				take: 3,
				select: { id: true, groupName: true },
			});

			if (participants.length === 0) {
				// Get a school category
				const schoolCat = await prisma.schoolCategory.findFirst({ where: { isActive: true } });
				if (!schoolCat) {
					return res.status(400).json({ error: "Tidak ada school category di database" });
				}

				// Create dummy peserta user
				const bcrypt = await import("bcryptjs");
				const dummyHash = await bcrypt.hash("testpeserta123", 10);

				for (let i = 1; i <= 2; i++) {
					const pesertaEmail = `test-peserta-${i}@simpaskor-test.id`;
					const pesertaUser = await prisma.user.upsert({
						where: { email: pesertaEmail },
						update: {},
						create: {
							email: pesertaEmail,
							passwordHash: dummyHash,
							name: `Peserta Test ${i}`,
							role: "PESERTA",
							status: "ACTIVE",
							emailVerified: true,
						},
					});

					// Create EventParticipation
					const participation = await prisma.eventParticipation.upsert({
						where: {
							eventId_userId: { eventId: event.id, userId: pesertaUser.id },
						},
						update: { status: "CONFIRMED" },
						create: {
							eventId: event.id,
							userId: pesertaUser.id,
							schoolCategoryId: schoolCat.id,
							teamName: `Tim Test ${i}`,
							schoolName: `Sekolah Test ${i}`,
							status: "CONFIRMED",
						},
					});

					// Create ParticipationGroup
					const existingGroup = await prisma.participationGroup.findFirst({
						where: { participationId: participation.id },
					});
					if (!existingGroup) {
						await prisma.participationGroup.create({
							data: {
								participationId: participation.id,
								schoolCategoryId: schoolCat.id,
								groupName: `Tim Test ${i}`,
								teamMembers: 5,
								orderNumber: i,
								status: "ACTIVE",
							},
						});
					}
					seeded.push(`Created peserta: ${pesertaEmail} with group "Tim Test ${i}"`);
				}

				// Re-fetch participants
				participants = await prisma.participationGroup.findMany({
					where: {
						participation: { eventId: event.id },
						status: { in: ["REGISTERED", "CONFIRMED", "ATTENDED", "ACTIVE"] },
					},
					take: 3,
					select: { id: true, groupName: true },
				});
			}

			// ---- AUTO-CREATE: Event materials if needed ----
			let materials = await prisma.eventMaterial.findMany({
				where: { eventId: event.id },
				select: { id: true, eventAssessmentCategoryId: true, number: true },
				orderBy: { number: "asc" },
			});

			if (materials.length === 0) {
				const firstCat = event.assessmentCategories[0]!;
				for (let i = 1; i <= 3; i++) {
					await prisma.eventMaterial.create({
						data: {
							eventId: event.id,
							eventAssessmentCategoryId: firstCat.id,
							number: i,
							name: `Materi Test ${i}`,
							order: i,
						},
					});
				}
				seeded.push(`Created 3 test materials for category "${firstCat.assessmentCategory.name}"`);

				// Re-fetch materials
				materials = await prisma.eventMaterial.findMany({
					where: { eventId: event.id },
					select: { id: true, eventAssessmentCategoryId: true, number: true },
					orderBy: { number: "asc" },
				});
			}

			// ---- Now seed problematic data ----
			const participant = participants[0]!;
			const jury = juryAssignments[0]!;
			const firstCat = event.assessmentCategories[0]!;

			// 1. Seed "score_exceeds_max": Create material evaluations that sum > maxScore
			const catMaterials = materials.filter(
				(m) => m.eventAssessmentCategoryId === firstCat.id
			);
			const maxScore = firstCat.customMaxScore || 100;

			for (const mat of catMaterials) {
				await prisma.materialEvaluation.upsert({
					where: {
						eventId_materialId_juryId_participantId: {
							eventId: event.id,
							materialId: mat.id,
							juryId: jury.jury.id,
							participantId: participant.id,
						},
					},
					update: { score: maxScore },
					create: {
						eventId: event.id,
						materialId: mat.id,
						juryId: jury.jury.id,
						participantId: participant.id,
						score: maxScore,
						scoreCategoryName: "Test Exceed",
					},
				});
			}
			seeded.push(
				`score_exceeds_max: ${catMaterials.length} material evals with score=${maxScore} each for "${participant.groupName}" by "${jury.jury.name}" in "${firstCat.assessmentCategory.name}" (total=${catMaterials.length * maxScore}, max=${maxScore})`
			);

			// 2. Seed "mismatch": Create a direct Evaluation with wrong total
			await prisma.evaluation.upsert({
				where: {
					eventId_assessmentCategoryId_juryId_participantId: {
						eventId: event.id,
						assessmentCategoryId: firstCat.assessmentCategoryId,
						juryId: jury.jury.id,
						participantId: participant.id,
					},
				},
				update: { score: 999 },
				create: {
					eventId: event.id,
					assessmentCategoryId: firstCat.assessmentCategoryId,
					juryId: jury.jury.id,
					participantId: participant.id,
					score: 999,
					maxScore: firstCat.customMaxScore || 100,
				},
			});
			seeded.push(
				`mismatch: Direct evaluation score=999 for "${participant.groupName}" by "${jury.jury.name}"`
			);

			res.json({
				message: `Test data berhasil di-seed untuk event "${event.title}"`,
				eventSlug: event.slug,
				seeded,
				testData: {
					participant: { id: participant.id, name: participant.groupName },
					jury: { id: jury.jury.id, name: jury.jury.name },
					category: { id: firstCat.id, name: firstCat.assessmentCategory.name },
					materialsCount: catMaterials.length,
				},
				hint: "Jalankan Verifikasi Nilai di halaman rekap untuk melihat masalah yang terdeteksi. Gunakan tombol 'Perbaiki' untuk menghapus data test.",
			});
		} catch (error) {
			console.error("Error seeding test data:", error);
			res.status(500).json({ error: "Failed to seed test data" });
		}
	}
);

export default router;
