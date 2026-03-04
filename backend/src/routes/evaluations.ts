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

			// Filter materials to only those in assigned categories
			const assignedEventCategoryIds = eventAssessmentCategories.map((c) => c.id);
			const filteredMaterials = materials.filter((m) =>
				assignedEventCategoryIds.includes(m.eventAssessmentCategoryId)
			);

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

			// Build response with materials grouped by assessment category
			const categorizedMaterials = eventAssessmentCategories.map((eac) => ({
				categoryId: eac.id,
				categoryName: eac.assessmentCategory.name,
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
				orderNumber: number | null;
				schoolCategory: { id: string; name: string } | null;
				registrant: {
					id: string;
					name: string;
					institution: string | null;
				};
			}

			const participantGroups: ParticipantGroup[] = participants.flatMap((p) => {
				if (p.groups && p.groups.length > 0) {
					return p.groups.map((group): ParticipantGroup => ({
						id: group.id,
						participationId: p.id,
						teamName: group.groupName,
						orderNumber: group.orderNumber,
						schoolCategory: group.schoolCategory,
						registrant: {
							id: p.user.id,
							name: p.user.name,
							institution: p.user.profile?.institution || null,
						},
					}));
				}
				return [{
					id: p.id,
					participationId: p.id,
					teamName: p.user.name,
					orderNumber: null,
					schoolCategory: null,
					registrant: {
						id: p.user.id,
						name: p.user.name,
						institution: p.user.profile?.institution || null,
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
				},
			});

			// Map material ID to category ID
			const materialToCategoryMap = new Map(
				eventMaterials.map((m) => [m.id, m.eventAssessmentCategoryId])
			);

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
						let maxScore = eac.customMaxScore || 100;
						let notes: string | null = null;
						let scoredMaterials: number | undefined;

						if (evaluation) {
							score = evaluation.score;
							maxScore = evaluation.maxScore;
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
								select: { id: true, name: true },
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

			res.json({
				participant: {
					id: participant.id,
					teamName: participant.groupName,
					orderNumber: participant.orderNumber,
					schoolCategory: participant.schoolCategory
						? { id: participant.schoolCategory.id, name: participant.schoolCategory.name }
						: null,
					registrant: {
						id: participant.participation.user.id,
						name: participant.participation.user.name,
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
			const { eventId, participantId, type, scope, assessmentCategoryId, value, reason } = req.body;

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

			if (!["GENERAL", "CATEGORY"].includes(scope)) {
				return res.status(400).json({ error: "Scope tidak valid" });
			}

			if (scope === "CATEGORY" && !assessmentCategoryId) {
				return res.status(400).json({ error: "Kategori penilaian harus dipilih untuk scope CATEGORY" });
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

			const extraNilai = await prisma.extraNilai.create({
				data: {
					eventId,
					participantId,
					type,
					scope,
					assessmentCategoryId: scope === "CATEGORY" ? assessmentCategoryId : null,
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
			const { type, scope, assessmentCategoryId, value, reason } = req.body;

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

			if (value !== undefined && (typeof value !== "number" || value < 0)) {
				return res.status(400).json({ error: "Nilai harus berupa angka positif" });
			}

			const updated = await prisma.extraNilai.update({
				where: { id },
				data: {
					type: type || existing.type,
					scope: scope || existing.scope,
					assessmentCategoryId: scope === "CATEGORY" ? assessmentCategoryId : null,
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

export default router;
