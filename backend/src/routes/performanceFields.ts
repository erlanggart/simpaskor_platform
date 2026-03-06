import express, { Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";

const router = express.Router();

// Extended request with eventId
interface EventAuthenticatedRequest extends AuthenticatedRequest {
	eventId?: string;
}

// Middleware to check if user is PANITIA managing the event or SUPERADMIN
const requireEventAccess = async (
	req: EventAuthenticatedRequest,
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
		const event = await prisma.event.findFirst({
			where: {
				OR: [{ slug: eventIdOrSlug }, { id: eventIdOrSlug }],
			},
		});
		if (!event) {
			return res.status(404).json({ error: "Event not found" });
		}
		req.eventId = event.id;
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
			req.eventId = event.id;
			return next();
		}
	}

	return res.status(403).json({ error: "Access denied" });
};

// ========================
// PERFORMANCE FIELDS CRUD
// ========================

// GET - List all fields for an event
router.get(
	"/events/:eventIdOrSlug/fields",
	authenticate,
	requireEventAccess,
	async (req: EventAuthenticatedRequest, res: Response) => {
		try {
			const fields = await prisma.performanceField.findMany({
				where: {
					eventId: req.eventId!,
				},
				orderBy: { order: "asc" },
				include: {
					sessions: {
						where: {
							status: "PERFORMING",
						},
						include: {
							materialChecks: true,
						},
						take: 1, // Only current performer
					},
				},
			});

			// Enhance fields with current performer info
			const enhancedFields = await Promise.all(
				fields.map(async (field) => {
					const currentSession = field.sessions[0];
					let currentPerformer = null;

					if (currentSession) {
						const participant = await prisma.participationGroup.findUnique({
							where: { id: currentSession.participantId },
							include: {
								schoolCategory: true,
								participation: {
									select: {
										schoolName: true,
										user: {
											select: {
												id: true,
												name: true,
											},
										},
									},
								},
							},
						});
						currentPerformer = {
							session: currentSession,
							participant,
						};
					}

					return {
						...field,
						sessions: undefined,
						currentPerformer,
					};
				})
			);

			res.json(enhancedFields);
		} catch (error) {
			console.error("Error fetching fields:", error);
			res.status(500).json({ error: "Failed to fetch fields" });
		}
	}
);

// POST - Create a new field
router.post(
	"/events/:eventIdOrSlug/fields",
	authenticate,
	requireEventAccess,
	async (req: EventAuthenticatedRequest, res: Response) => {
		try {
			const { name, description, order } = req.body;

			if (!name) {
				return res.status(400).json({ error: "Field name is required" });
			}

			// Check if field with same name already exists
			const existing = await prisma.performanceField.findFirst({
				where: {
					eventId: req.eventId!,
					name,
				},
			});

			if (existing) {
				return res.status(400).json({ error: "Field with this name already exists" });
			}

			// Get next order if not specified
			let fieldOrder = order;
			if (fieldOrder === undefined) {
				const maxOrder = await prisma.performanceField.aggregate({
					where: { eventId: req.eventId! },
					_max: { order: true },
				});
				fieldOrder = (maxOrder._max.order ?? -1) + 1;
			}

			const field = await prisma.performanceField.create({
				data: {
					eventId: req.eventId!,
					name,
					description: description || null,
					order: fieldOrder,
				},
			});

			res.status(201).json(field);
		} catch (error) {
			console.error("Error creating field:", error);
			res.status(500).json({ error: "Failed to create field" });
		}
	}
);

// PUT - Update a field
router.put(
	"/events/:eventIdOrSlug/fields/:fieldId",
	authenticate,
	requireEventAccess,
	async (req: EventAuthenticatedRequest, res: Response) => {
		try {
			const { fieldId } = req.params;
			const { name, description, order, isActive } = req.body;

			// Check field exists and belongs to event
			const existing = await prisma.performanceField.findFirst({
				where: {
					id: fieldId,
					eventId: req.eventId!,
				},
			});

			if (!existing) {
				return res.status(404).json({ error: "Field not found" });
			}

			// Check for name conflict
			if (name && name !== existing.name) {
				const conflict = await prisma.performanceField.findFirst({
					where: {
						eventId: req.eventId!,
						name,
						id: { not: fieldId },
					},
				});
				if (conflict) {
					return res.status(400).json({ error: "Field with this name already exists" });
				}
			}

			const field = await prisma.performanceField.update({
				where: { id: fieldId },
				data: {
					name: name ?? existing.name,
					description: description ?? existing.description,
					order: order ?? existing.order,
					isActive: isActive ?? existing.isActive,
				},
			});

			res.json(field);
		} catch (error) {
			console.error("Error updating field:", error);
			res.status(500).json({ error: "Failed to update field" });
		}
	}
);

// DELETE - Remove a field
router.delete(
	"/events/:eventIdOrSlug/fields/:fieldId",
	authenticate,
	requireEventAccess,
	async (req: EventAuthenticatedRequest, res: Response) => {
		try {
			const { fieldId } = req.params;

			// Check field exists and belongs to event
			const existing = await prisma.performanceField.findFirst({
				where: {
					id: fieldId,
					eventId: req.eventId!,
				},
			});

			if (!existing) {
				return res.status(404).json({ error: "Field not found" });
			}

			// Check if there are any active sessions
			const activeSessions = await prisma.performanceSession.count({
				where: {
					fieldId,
					status: "PERFORMING",
				},
			});

			if (activeSessions > 0) {
				return res.status(400).json({ 
					error: "Cannot delete field with active performance sessions" 
				});
			}

			await prisma.performanceField.delete({
				where: { id: fieldId },
			});

			res.json({ success: true, message: "Field deleted" });
		} catch (error) {
			console.error("Error deleting field:", error);
			res.status(500).json({ error: "Failed to delete field" });
		}
	}
);

// ============================
// PERFORMANCE SESSIONS
// ============================

// GET - List sessions for a field
router.get(
	"/events/:eventIdOrSlug/fields/:fieldId/sessions",
	authenticate,
	requireEventAccess,
	async (req: EventAuthenticatedRequest, res: Response) => {
		try {
			const { fieldId } = req.params;
			const { status } = req.query;

			const sessions = await prisma.performanceSession.findMany({
				where: {
					fieldId,
					...(status && { status: status as string }),
				},
				include: {
					materialChecks: true,
				},
				orderBy: [
					{ status: "asc" }, // PERFORMING first, then QUEUED, then COMPLETED
					{ createdAt: "asc" },
				],
			});

			// Enhance with participant details
			const enhancedSessions = await Promise.all(
				sessions.map(async (session) => {
					const participant = await prisma.participationGroup.findUnique({
						where: { id: session.participantId },
						include: {
							schoolCategory: true,
							participation: {
								include: {
									user: {
										select: {
											id: true,
											name: true,
										},
									},
								},
							},
						},
					});

					return {
						...session,
						participant,
					};
				})
			);

			res.json(enhancedSessions);
		} catch (error) {
			console.error("Error fetching sessions:", error);
			res.status(500).json({ error: "Failed to fetch sessions" });
		}
	}
);

// POST - Create a new session (assign participant to field)
router.post(
	"/events/:eventIdOrSlug/fields/:fieldId/sessions",
	authenticate,
	requireEventAccess,
	async (req: EventAuthenticatedRequest, res: Response) => {
		try {
			const { fieldId } = req.params;
			const { participantId, notes, startImmediately } = req.body;

			if (!participantId) {
				return res.status(400).json({ error: "Participant ID is required" });
			}

			// Check field exists
			const field = await prisma.performanceField.findFirst({
				where: {
					id: fieldId,
					eventId: req.eventId!,
				},
			});

			if (!field) {
				return res.status(404).json({ error: "Field not found" });
			}

			// Check participant exists and belongs to this event via participation
			const participant = await prisma.participationGroup.findFirst({
				where: {
					id: participantId,
					participation: {
						eventId: req.eventId!,
					},
				},
			});

			if (!participant) {
				return res.status(404).json({ error: "Participant not found in this event" });
			}

			// Check if participant already has an active session in any field
			const existingSession = await prisma.performanceSession.findFirst({
				where: {
					participantId,
					status: { in: ["QUEUED", "PERFORMING"] },
				},
			});

			if (existingSession) {
				return res.status(400).json({ 
					error: "Participant already has an active or queued session" 
				});
			}

			// If starting immediately, check no one else is performing in this field
			if (startImmediately) {
				const currentPerforming = await prisma.performanceSession.findFirst({
					where: {
						fieldId,
						status: "PERFORMING",
					},
				});

				if (currentPerforming) {
					return res.status(400).json({ 
						error: "Another participant is already performing in this field" 
					});
				}
			}

			const session = await prisma.performanceSession.create({
				data: {
					field: { connect: { id: fieldId } },
					participantId,
					notes: notes || null,
					status: startImmediately ? "PERFORMING" : "QUEUED",
					startTime: startImmediately ? new Date() : null,
				},
				include: {
					materialChecks: true,
				},
			});

			res.status(201).json(session);
		} catch (error) {
			console.error("Error creating session:", error);
			res.status(500).json({ error: "Failed to create session" });
		}
	}
);

// POST - Start a session (begin performance)
router.post(
	"/events/:eventIdOrSlug/sessions/:sessionId/start",
	authenticate,
	requireEventAccess,
	async (req: EventAuthenticatedRequest, res: Response) => {
		try {
			const { sessionId } = req.params;

			const session = await prisma.performanceSession.findUnique({
				where: { id: sessionId },
				include: { field: true },
			});

			if (!session) {
				return res.status(404).json({ error: "Session not found" });
			}

			if (session.field.eventId !== req.eventId) {
				return res.status(403).json({ error: "Access denied" });
			}

			if (session.status !== "QUEUED") {
				return res.status(400).json({ 
					error: "Session must be in QUEUED status to start" 
				});
			}

			// Check if there's already a performing session in this field
			const currentPerforming = await prisma.performanceSession.findFirst({
				where: {
					fieldId: session.fieldId,
					status: "PERFORMING",
				},
			});

			if (currentPerforming) {
				return res.status(400).json({ 
					error: "Another session is already performing in this field" 
				});
			}

			const updatedSession = await prisma.performanceSession.update({
				where: { id: sessionId },
				data: {
					status: "PERFORMING",
					startTime: new Date(),
				},
				include: {
					materialChecks: true,
				},
			});

			res.json(updatedSession);
		} catch (error) {
			console.error("Error starting session:", error);
			res.status(500).json({ error: "Failed to start session" });
		}
	}
);

// POST - Stop a session (end performance)
router.post(
	"/events/:eventIdOrSlug/sessions/:sessionId/stop",
	authenticate,
	requireEventAccess,
	async (req: EventAuthenticatedRequest, res: Response) => {
		try {
			const { sessionId } = req.params;
			const { notes, duration: clientDuration } = req.body;

			const session = await prisma.performanceSession.findUnique({
				where: { id: sessionId },
				include: { field: true },
			});

			if (!session) {
				return res.status(404).json({ error: "Session not found" });
			}

			if (session.field.eventId !== req.eventId) {
				return res.status(403).json({ error: "Access denied" });
			}

			if (session.status !== "PERFORMING") {
				return res.status(400).json({ 
					error: "Session must be in PERFORMING status to stop" 
				});
			}

			const endTime = new Date();
			// Use client-provided duration if available (from stopwatch), otherwise null
			const duration = typeof clientDuration === 'number' ? clientDuration : null;

			const updatedSession = await prisma.performanceSession.update({
				where: { id: sessionId },
				data: {
					status: "COMPLETED",
					endTime,
					duration,
					notes: notes || session.notes,
				},
				include: {
					materialChecks: true,
				},
			});

			res.json(updatedSession);
		} catch (error) {
			console.error("Error stopping session:", error);
			res.status(500).json({ error: "Failed to stop session" });
		}
	}
);

// DELETE - Cancel a session
router.delete(
	"/events/:eventIdOrSlug/sessions/:sessionId",
	authenticate,
	requireEventAccess,
	async (req: EventAuthenticatedRequest, res: Response) => {
		try {
			const { sessionId } = req.params;

			const session = await prisma.performanceSession.findUnique({
				where: { id: sessionId },
				include: { field: true },
			});

			if (!session) {
				return res.status(404).json({ error: "Session not found" });
			}

			if (session.field.eventId !== req.eventId) {
				return res.status(403).json({ error: "Access denied" });
			}

			if (session.status === "PERFORMING") {
				return res.status(400).json({ 
					error: "Cannot delete a performing session. Stop it first." 
				});
			}

			await prisma.performanceSession.delete({
				where: { id: sessionId },
			});

			res.json({ success: true, message: "Session deleted" });
		} catch (error) {
			console.error("Error deleting session:", error);
			res.status(500).json({ error: "Failed to delete session" });
		}
	}
);

// ============================
// MATERIAL CHECKS
// ============================

// GET - List material checks for a session
router.get(
	"/events/:eventIdOrSlug/sessions/:sessionId/material-checks",
	authenticate,
	requireEventAccess,
	async (req: EventAuthenticatedRequest, res: Response) => {
		try {
			const { sessionId } = req.params;

			const session = await prisma.performanceSession.findUnique({
				where: { id: sessionId },
				include: { field: true },
			});

			if (!session) {
				return res.status(404).json({ error: "Session not found" });
			}

			if (session.field.eventId !== req.eventId) {
				return res.status(403).json({ error: "Access denied" });
			}

			// Get existing material checks
			const checks = await prisma.materialCheck.findMany({
				where: { sessionId },
			});

			// Get all materials for this event (for the participant's school category)
			const participant = await prisma.participationGroup.findUnique({
				where: { id: session.participantId },
				select: { schoolCategoryId: true },
			});

			const materials = await prisma.eventMaterial.findMany({
				where: {
					eventId: req.eventId!,
					OR: [
						{ schoolCategoryIds: { has: participant?.schoolCategoryId } },
						{ schoolCategoryIds: { isEmpty: true } },
					],
				},
				orderBy: [
					{ eventAssessmentCategoryId: "asc" },
					{ order: "asc" },
				],
			});

			// Fetch assessment categories for grouping
			const categoryIds = [...new Set(materials.map((m) => m.eventAssessmentCategoryId))];
			const eventCategories = await prisma.eventAssessmentCategory.findMany({
				where: { id: { in: categoryIds } },
				include: { assessmentCategory: true },
			});
			const categoryMap = new Map(
				eventCategories.map((c) => [c.id, c.assessmentCategory])
			);

			// Combine materials with their check status and category info
			const materialChecks = materials.map((material) => {
				const check = checks.find((c) => c.materialId === material.id);
				return {
					material: {
						...material,
						category: categoryMap.get(material.eventAssessmentCategoryId) || null,
					},
					check: check || null,
					isChecked: check?.isChecked ?? false,
				};
			});

			res.json(materialChecks);
		} catch (error) {
			console.error("Error fetching material checks:", error);
			res.status(500).json({ error: "Failed to fetch material checks" });
		}
	}
);

// POST/PUT - Toggle material check
router.post(
	"/events/:eventIdOrSlug/sessions/:sessionId/material-checks/:materialId",
	authenticate,
	requireEventAccess,
	async (req: EventAuthenticatedRequest, res: Response) => {
		try {
			const { sessionId, materialId } = req.params;
			const { isChecked, notes } = req.body;

			const session = await prisma.performanceSession.findUnique({
				where: { id: sessionId },
				include: { field: true },
			});

			if (!session) {
				return res.status(404).json({ error: "Session not found" });
			}

			if (session.field.eventId !== req.eventId) {
				return res.status(403).json({ error: "Access denied" });
			}

			// Verify material exists
			const material = await prisma.eventMaterial.findUnique({
				where: { id: materialId },
			});

			if (!material || material.eventId !== req.eventId) {
				return res.status(404).json({ error: "Material not found" });
			}

			// Get params with proper type assertions
			const sessionIdStr = sessionId as string;
			const materialIdStr = materialId as string;

			// Upsert the material check
			const check = await prisma.materialCheck.upsert({
				where: {
					sessionId_materialId: {
						sessionId: sessionIdStr,
						materialId: materialIdStr,
					},
				},
				create: {
					session: { connect: { id: sessionIdStr } },
					materialId: materialIdStr,
					isChecked: isChecked ?? true,
					notes: notes || null,
					checkedAt: isChecked ? new Date() : null,
				},
				update: {
					isChecked: isChecked ?? true,
					notes: notes || null,
					checkedAt: isChecked ? new Date() : null,
				},
			});

			res.json(check);
		} catch (error) {
			console.error("Error updating material check:", error);
			res.status(500).json({ error: "Failed to update material check" });
		}
	}
);

// ============================
// PARTICIPANTS FOR SELECTION
// ============================

// GET - List participants by school category for session assignment
router.get(
	"/events/:eventIdOrSlug/participants-for-field",
	authenticate,
	requireEventAccess,
	async (req: EventAuthenticatedRequest, res: Response) => {
		try {
			const { schoolCategoryId } = req.query;

			// Build where clause to filter by event through participation relation
			interface ParticipationGroupWhere {
				participation: {
					eventId: string;
				};
				schoolCategoryId?: string;
			}

			const whereClause: ParticipationGroupWhere = {
				participation: {
					eventId: req.eventId!,
				},
			};

			if (schoolCategoryId) {
				whereClause.schoolCategoryId = schoolCategoryId as string;
			}

			const participants = await prisma.participationGroup.findMany({
				where: whereClause,
				include: {
					schoolCategory: true,
					participation: {
						select: {
							schoolName: true,
							user: {
								select: {
									id: true,
									name: true,
								},
							},
						},
					},
				},
				orderBy: [
					{ schoolCategoryId: "asc" },
					{ orderNumber: "asc" },
				],
			});

			// Check which participants already have sessions (active or completed)
			const participantIds = participants.map((p) => p.id);
			const existingSessions = await prisma.performanceSession.findMany({
				where: {
					participantId: { in: participantIds },
					status: { in: ["QUEUED", "PERFORMING", "COMPLETED"] },
				},
				select: {
					participantId: true,
					status: true,
				},
			});

			const sessionMap = new Map(
				existingSessions.map((s) => [s.participantId, s.status])
			);

			const enhancedParticipants = participants.map((p) => ({
				...p,
				sessionStatus: sessionMap.get(p.id) || null,
				isAvailable: !sessionMap.has(p.id),
			}));

			res.json(enhancedParticipants);
		} catch (error) {
			console.error("Error fetching participants:", error);
			res.status(500).json({ error: "Failed to fetch participants" });
		}
	}
);

// ============================
// PERFORMANCE HISTORY (FOR PESERTA)
// ============================

// GET - Get performance history for a participant or all completed sessions
router.get(
	"/events/:eventIdOrSlug/sessions",
	authenticate,
	async (req: EventAuthenticatedRequest, res: Response) => {
		try {
			const eventIdOrSlug = req.params.eventIdOrSlug;
			const { participantId, status } = req.query;
			const user = req.user;

			// Find event by slug or ID
			const event = await prisma.event.findFirst({
				where: {
					OR: [{ slug: eventIdOrSlug }, { id: eventIdOrSlug }],
				},
			});

			if (!event) {
				return res.status(404).json({ error: "Event not found" });
			}

			// Build where clause
			interface SessionWhere {
				field: { eventId: string };
				participantId?: string;
				status?: string | { in: string[] };
			}

			const whereClause: SessionWhere = {
				field: { eventId: event.id },
			};

			// If participant ID provided, filter by it
			if (participantId) {
				whereClause.participantId = participantId as string;
			} else if (user?.role === "PESERTA") {
				// If user is PESERTA, only show their own sessions
				// Find their participation groups
				const participation = await prisma.eventParticipation.findFirst({
					where: {
						eventId: event.id,
						userId: user.userId,
					},
					include: {
						groups: true,
					},
				});

				if (!participation || participation.groups.length === 0) {
					return res.json([]);
				}

				const groupIds = participation.groups.map((g) => g.id);
				whereClause.participantId = { in: groupIds } as unknown as string;
			}

			// Filter by status if provided
			if (status) {
				whereClause.status = status as string;
			}

			const sessions = await prisma.performanceSession.findMany({
				where: whereClause,
				include: {
					field: true,
					materialChecks: true,
				},
				orderBy: { createdAt: "desc" },
			});

			// Collect all unique material IDs
			const allMaterialIds = new Set<string>();
			sessions.forEach((session) => {
				session.materialChecks.forEach((mc) => {
					allMaterialIds.add(mc.materialId);
				});
			});

			// Fetch all materials at once
			const materials = await prisma.eventMaterial.findMany({
				where: { id: { in: Array.from(allMaterialIds) } },
			});
			const materialMap = new Map(materials.map((m) => [m.id, m]));

			// Fetch assessment categories for material grouping
			const categoryIds = [...new Set(materials.map((m) => m.eventAssessmentCategoryId))];
			const eventCategories = await prisma.eventAssessmentCategory.findMany({
				where: { id: { in: categoryIds } },
				include: { assessmentCategory: true },
			});
			const categoryMap = new Map(
				eventCategories.map((c) => [c.id, c.assessmentCategory])
			);

			// Enhance with participant details and material info
			const enhancedSessions = await Promise.all(
				sessions.map(async (session) => {
					const participant = await prisma.participationGroup.findUnique({
						where: { id: session.participantId },
						include: {
							schoolCategory: true,
							participation: {
								select: {
									schoolName: true,
									user: {
										select: {
											id: true,
											name: true,
										},
									},
								},
							},
						},
					});

					// Attach material data to each check with category info
					const materialChecksWithMaterial = session.materialChecks.map(
						(mc) => {
							const material = materialMap.get(mc.materialId);
							return {
								...mc,
								material: material ? {
									...material,
									category: categoryMap.get(material.eventAssessmentCategoryId) || null,
								} : null,
							};
						}
					);

					return {
						...session,
						materialChecks: materialChecksWithMaterial,
						participant,
					};
				})
			);

			res.json(enhancedSessions);
		} catch (error) {
			console.error("Error fetching sessions:", error);
			res.status(500).json({ error: "Failed to fetch sessions" });
		}
	}
);

// GET - Get a single session with full details
router.get(
	"/events/:eventIdOrSlug/sessions/:sessionId/details",
	authenticate,
	async (req: EventAuthenticatedRequest, res: Response) => {
		try {
			const { eventIdOrSlug, sessionId } = req.params;
			const user = req.user;

			// Find event by slug or ID
			const event = await prisma.event.findFirst({
				where: {
					OR: [{ slug: eventIdOrSlug }, { id: eventIdOrSlug }],
				},
			});

			if (!event) {
				return res.status(404).json({ error: "Event not found" });
			}

			const session = await prisma.performanceSession.findUnique({
				where: { id: sessionId },
				include: {
					field: true,
					materialChecks: true,
				},
			});

			if (!session || session.field.eventId !== event.id) {
				return res.status(404).json({ error: "Session not found" });
			}

			// Fetch materials for the material checks
			const materialIds = session.materialChecks.map((mc) => mc.materialId);
			const materials = await prisma.eventMaterial.findMany({
				where: { id: { in: materialIds } },
			});
			const materialMap = new Map(materials.map((m) => [m.id, m]));

			// Fetch assessment categories for material grouping
			const categoryIds = [...new Set(materials.map((m) => m.eventAssessmentCategoryId))];
			const eventCategories = await prisma.eventAssessmentCategory.findMany({
				where: { id: { in: categoryIds } },
				include: { assessmentCategory: true },
			});
			const categoryMap = new Map(
				eventCategories.map((c) => [c.id, c.assessmentCategory])
			);

			// Attach material data to each check with category info
			const materialChecksWithMaterial = session.materialChecks.map((mc) => {
				const material = materialMap.get(mc.materialId);
				return {
					...mc,
					material: material ? {
						...material,
						category: categoryMap.get(material.eventAssessmentCategoryId) || null,
					} : null,
				};
			});

			// If user is PESERTA, verify they own this session
			if (user?.role === "PESERTA") {
				const participation = await prisma.eventParticipation.findFirst({
					where: {
						eventId: event.id,
						userId: user.userId,
					},
					include: {
						groups: true,
					},
				});

				const groupIds = participation?.groups.map((g) => g.id) || [];
				if (!groupIds.includes(session.participantId)) {
					return res.status(403).json({ error: "Access denied" });
				}
			}

			// Get participant details
			const participant = await prisma.participationGroup.findUnique({
				where: { id: session.participantId },
				include: {
					schoolCategory: true,
					participation: {
						select: {
							schoolName: true,
							user: {
								select: {
									id: true,
									name: true,
								},
							},
						},
					},
				},
			});

			res.json({
				...session,
				materialChecks: materialChecksWithMaterial,
				participant,
			});
		} catch (error) {
			console.error("Error fetching session details:", error);
			res.status(500).json({ error: "Failed to fetch session details" });
		}
	}
);

export default router;
