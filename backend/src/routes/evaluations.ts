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
				const assignment = await prisma.panitiaEventAssignment.findFirst({
					where: {
						panitiaId: user.userId,
						eventId,
						isActive: true,
					},
				});

				if (!assignment) {
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

export default router;
