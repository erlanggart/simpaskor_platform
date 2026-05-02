import express, { Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";

const router = express.Router();

// Middleware to check if user is PANITIA managing the event
const requirePanitiaForEvent = async (
	req: AuthenticatedRequest,
	res: Response,
	next: () => void
) => {
	const user = req.user;
	const eventId = req.params.eventId || req.body.eventId;

	if (!user) {
		return res.status(401).json({ error: "Unauthorized" });
	}

	// SuperAdmin can manage any event
	if (user.role === "SUPERADMIN") {
		return next();
	}

	if (user.role !== "PANITIA") {
		return res.status(403).json({ error: "Only Panitia can manage juries" });
	}

	// Check if panitia owns this event (created by them)
	const event = await prisma.event.findFirst({
		where: {
			id: eventId,
			createdById: user.userId,
		},
	});

	if (!event) {
		return res.status(403).json({ error: "You are not managing this event" });
	}

	next();
};

// GET /api/juries - Get all active verified juries with pagination and search
router.get("/", authenticate, async (req: AuthenticatedRequest, res) => {
	try {
		const user = req.user;

		if (!user || (user.role !== "PANITIA" && user.role !== "SUPERADMIN")) {
			return res.status(403).json({ error: "Access denied" });
		}

		// Pagination and search params
		const page = parseInt(req.query.page as string) || 1;
		const limit = parseInt(req.query.limit as string) || 10;
		const search = (req.query.search as string) || "";
		const excludeEventId = req.query.excludeEventId as string; // Exclude juries already assigned to this event

		const skip = (page - 1) * limit;

		// Build where clause
		const whereClause: any = {
			role: "JURI",
			status: "ACTIVE",
			emailVerified: true,
		};

		// Add search condition
		if (search) {
			whereClause.OR = [
				{ name: { contains: search, mode: "insensitive" } },
				{ email: { contains: search, mode: "insensitive" } },
				{ profile: { institution: { contains: search, mode: "insensitive" } } },
			];
		}

		// Exclude juries already assigned to an event
		if (excludeEventId) {
			whereClause.NOT = {
				juryAssignments: {
					some: {
						eventId: excludeEventId,
					},
				},
			};
		}

		// Get total count
		const total = await prisma.user.count({ where: whereClause });

		const juries = await prisma.user.findMany({
			where: whereClause,
			select: {
				id: true,
				name: true,
				email: true,
				phone: true,
				createdAt: true,
				profile: {
					select: {
						avatar: true,
						institution: true,
						city: true,
						province: true,
					},
				},
			},
			orderBy: {
				name: "asc",
			},
			skip,
			take: limit,
		});

		res.json({
			data: juries,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		console.error("Error fetching juries:", error);
		res.status(500).json({ error: "Failed to fetch juries" });
	}
});

// GET /api/juries/event/:eventId - Get juries assigned to an event
router.get(
	"/event/:eventId",
	authenticate,
	requirePanitiaForEvent,
	async (req: AuthenticatedRequest, res) => {
		try {
			const { eventId } = req.params;

			const assignments = await prisma.juryEventAssignment.findMany({
				where: {
					eventId,
				},
				include: {
					jury: {
						select: {
							id: true,
							name: true,
							email: true,
							phone: true,
							profile: {
								select: {
									avatar: true,
									institution: true,
								},
							},
						},
					},
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
				orderBy: {
					invitedAt: "desc",
				},
			});

			res.json(assignments);
		} catch (error) {
			console.error("Error fetching event juries:", error);
			res.status(500).json({ error: "Failed to fetch event juries" });
		}
	}
);

// POST /api/juries/invite - Invite a jury to an event
router.post(
	"/invite",
	authenticate,
	async (req: AuthenticatedRequest, res) => {
		try {
			const user = req.user;
			const { eventId, juryId, categoryIds, notes } = req.body;

			if (!user || (user.role !== "PANITIA" && user.role !== "SUPERADMIN")) {
				return res.status(403).json({ error: "Access denied" });
			}

			// Check if panitia owns this event (skip for superadmin)
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
			}

			// Validate jury exists and is active
			const jury = await prisma.user.findFirst({
				where: {
					id: juryId,
					role: "JURI",
					status: "ACTIVE",
					emailVerified: true,
				},
			});

			if (!jury) {
				return res.status(404).json({ error: "Jury not found or not active" });
			}

			// Validate event exists
			const event = await prisma.event.findUnique({
				where: { id: eventId },
				include: {
					assessmentCategories: {
						select: {
							assessmentCategoryId: true,
						},
					},
				},
			});

			if (!event) {
				return res.status(404).json({ error: "Event not found" });
			}

			// Validate categories belong to this event
			const validCategoryIds = event.assessmentCategories.map(
				(c) => c.assessmentCategoryId
			);
			const invalidCategories = categoryIds.filter(
				(id: string) => !validCategoryIds.includes(id)
			);

			if (invalidCategories.length > 0) {
				return res.status(400).json({
					error: "Some categories are not part of this event",
					invalidCategories,
				});
			}

			// Check if jury is already invited
			const existingAssignment = await prisma.juryEventAssignment.findUnique({
				where: {
					juryId_eventId: {
						juryId,
						eventId,
					},
				},
			});

			if (existingAssignment) {
				return res.status(400).json({
					error: "Jury has already been invited to this event",
					status: existingAssignment.status,
				});
			}

			// Create assignment with categories
			const assignment = await prisma.juryEventAssignment.create({
				data: {
					juryId,
					eventId,
					notes,
					assignedCategories: {
						create: categoryIds.map((categoryId: string) => ({
							assessmentCategoryId: categoryId,
						})),
					},
				},
				include: {
					jury: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},
					assignedCategories: {
						include: {
							assessmentCategory: true,
						},
					},
				},
			});

			res.status(201).json({
				message: "Jury invited successfully",
				assignment,
			});
		} catch (error) {
			console.error("Error inviting jury:", error);
			res.status(500).json({ error: "Failed to invite jury" });
		}
	}
);

// DELETE /api/juries/assignments/:id - Remove jury from event (Panitia)
router.delete(
	"/assignments/:id",
	authenticate,
	async (req: AuthenticatedRequest, res) => {
		try {
			const user = req.user;
			const { id } = req.params;

			if (!user || (user.role !== "PANITIA" && user.role !== "SUPERADMIN")) {
				return res.status(403).json({ error: "Access denied" });
			}

			const assignment = await prisma.juryEventAssignment.findUnique({
				where: { id },
				include: {
					event: true,
				},
			});

			if (!assignment) {
				return res.status(404).json({ error: "Assignment not found" });
			}

			// Check if panitia owns this event
			if (user.role === "PANITIA") {
				const event = await prisma.event.findFirst({
					where: {
						id: assignment.eventId,
						createdById: user.userId,
					},
				});

				if (!event) {
					return res.status(403).json({ error: "You are not managing this event" });
				}
			}

			// Delete assignment
			await prisma.juryEventAssignment.delete({
				where: { id },
			});

			res.json({ message: "Jury removed from event successfully" });
		} catch (error) {
			console.error("Error removing jury:", error);
			res.status(500).json({ error: "Failed to remove jury" });
		}
	}
);

// ============================================================================
// JURY ENDPOINTS (for JURI role)
// ============================================================================

// GET /api/juries/my-invitations - Get jury's pending invitations
router.get(
	"/my-invitations",
	authenticate,
	async (req: AuthenticatedRequest, res) => {
		try {
			const user = req.user;

			if (!user || user.role !== "JURI") {
				return res.status(403).json({ error: "Access denied" });
			}

			const invitations = await prisma.juryEventAssignment.findMany({
				where: {
					juryId: user.userId,
					status: "PENDING",
				},
				include: {
					event: {
						select: {
							id: true,
							title: true,
							slug: true,
							thumbnail: true,
							startDate: true,
							endDate: true,
							location: true,
							venue: true,
							organizer: true,
							status: true,
						},
					},
					assignedCategories: {
						include: {
							assessmentCategory: {
								select: {
									id: true,
									name: true,
									description: true,
								},
							},
						},
					},
				},
				orderBy: {
					invitedAt: "desc",
				},
			});

			res.json(invitations);
		} catch (error) {
			console.error("Error fetching invitations:", error);
			res.status(500).json({ error: "Failed to fetch invitations" });
		}
	}
);

// GET /api/juries/my-events - Get jury's confirmed events
router.get(
	"/my-events",
	authenticate,
	async (req: AuthenticatedRequest, res) => {
		try {
			const user = req.user;

			if (!user || user.role !== "JURI") {
				return res.status(403).json({ error: "Access denied" });
			}

			const events = await prisma.juryEventAssignment.findMany({
				where: {
					juryId: user.userId,
					status: "CONFIRMED",
				},
				include: {
					event: {
						select: {
							id: true,
							title: true,
							slug: true,
							thumbnail: true,
							description: true,
							startDate: true,
							endDate: true,
							location: true,
							venue: true,
							organizer: true,
							status: true,
							currentParticipants: true,
						},
					},
					assignedCategories: {
						include: {
							assessmentCategory: {
								select: {
									id: true,
									name: true,
									description: true,
								},
							},
						},
					},
				},
				orderBy: {
					respondedAt: "desc",
				},
			});

			res.json(events);
		} catch (error) {
			console.error("Error fetching jury events:", error);
			res.status(500).json({ error: "Failed to fetch events" });
		}
	}
);

// PATCH /api/juries/invitations/:id/respond - Accept or reject invitation
router.patch(
	"/invitations/:id/respond",
	authenticate,
	async (req: AuthenticatedRequest, res) => {
		try {
			const user = req.user;
			const { id } = req.params;
			const { accept, rejectionReason } = req.body;

			if (!user || user.role !== "JURI") {
				return res.status(403).json({ error: "Access denied" });
			}

			const assignment = await prisma.juryEventAssignment.findFirst({
				where: {
					id,
					juryId: user.userId,
					status: "PENDING",
				},
				include: {
					event: {
						select: {
							id: true,
							title: true,
						},
					},
				},
			});

			if (!assignment) {
				return res.status(404).json({ error: "Invitation not found or already responded" });
			}

			const updatedAssignment = await prisma.juryEventAssignment.update({
				where: { id },
				data: {
					status: accept ? "CONFIRMED" : "REJECTED",
					respondedAt: new Date(),
					rejectionReason: accept ? null : rejectionReason,
				},
				include: {
					event: {
						select: {
							id: true,
							title: true,
						},
					},
					assignedCategories: {
						include: {
							assessmentCategory: true,
						},
					},
				},
			});

			res.json({
				message: accept
					? "Invitation accepted successfully"
					: "Invitation declined",
				assignment: updatedAssignment,
			});
		} catch (error) {
			console.error("Error responding to invitation:", error);
			res.status(500).json({ error: "Failed to respond to invitation" });
		}
	}
);

// GET /api/juries/events/:eventIdOrSlug - Get jury's specific event details (accepts ID or slug)
router.get(
	"/events/:eventIdOrSlug",
	authenticate,
	async (req: AuthenticatedRequest, res) => {
		try {
			const user = req.user;
			const { eventIdOrSlug } = req.params;

			if (!user || user.role !== "JURI") {
				return res.status(403).json({ error: "Access denied" });
			}

			// Find event by slug or ID
			const event = await prisma.event.findFirst({
				where: {
					OR: [
						{ slug: eventIdOrSlug },
						{ id: eventIdOrSlug },
					],
				},
			});

			if (!event) {
				return res.status(404).json({ error: "Event not found" });
			}

			const assignment = await prisma.juryEventAssignment.findFirst({
				where: {
					juryId: user.userId,
					eventId: event.id,
					status: "CONFIRMED",
				},
				include: {
					event: {
						include: {
							assessmentCategories: {
								include: {
									assessmentCategory: true,
								},
							},
							schoolCategoryLimits: {
								include: {
									schoolCategory: true,
								},
							},
							createdBy: {
								select: {
									id: true,
									name: true,
									email: true,
								},
							},
						},
					},
					assignedCategories: {
						include: {
							assessmentCategory: true,
						},
					},
				},
			});

			if (!assignment) {
				return res.status(404).json({ error: "Event assignment not found" });
			}

			res.json(assignment);
		} catch (error) {
			console.error("Error fetching event details:", error);
			res.status(500).json({ error: "Failed to fetch event details" });
		}
	}
);

// GET /api/juries/events/:eventIdOrSlug/peserta - Get participants for juri's assigned event
router.get(
	"/events/:eventIdOrSlug/peserta",
	authenticate,
	async (req: AuthenticatedRequest, res) => {
		try {
			const user = req.user;
			const { eventIdOrSlug } = req.params;

			if (!user || user.role !== "JURI") {
				return res.status(403).json({ error: "Access denied" });
			}

			// Find event by slug or ID
			const event = await prisma.event.findFirst({
				where: {
					OR: [
						{ slug: eventIdOrSlug },
						{ id: eventIdOrSlug },
					],
				},
			});

			if (!event) {
				return res.status(404).json({ error: "Event not found" });
			}

			// Verify juri is assigned to this event
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

			// Get participants with their groups
			const participants = await prisma.eventParticipation.findMany({
				where: {
					eventId: event.id,
					status: {
						in: ["REGISTERED", "CONFIRMED", "ATTENDED"],
					},
					user: {
						role: "PESERTA",
					},
					groups: {
						some: {
							status: "ACTIVE",
						},
					},
				},
				include: {
					user: {
						select: {
							id: true,
							name: true,
							email: true,
							phone: true,
							profile: {
								select: {
									avatar: true,
									institution: true,
								},
							},
						},
					},
					schoolCategory: {
						select: {
							id: true,
							name: true,
						},
					},
					groups: {
						where: {
							status: "ACTIVE",
						},
						include: {
							schoolCategory: {
								select: {
									id: true,
									name: true,
								},
							},
						},
						orderBy: [
							{ orderNumber: "asc" },
							{ createdAt: "asc" },
						],
					},
				},
				orderBy: [
					{ createdAt: "asc" },
				],
			});

			// Transform the data to parse memberNames JSON and flatten groups for easier frontend consumption
			const result = participants.flatMap((p) => {
				// If participant has groups, return one entry per group
				if (p.groups && p.groups.length > 0) {
					return p.groups.map((group) => {
						let members: string[] = [];
						try {
							if (group.memberNames) {
								members = JSON.parse(group.memberNames);
							}
						} catch {
							members = [];
						}
						return {
							id: group.id, // Use group ID as the main ID for assessment
							participationId: p.id,
							teamName: group.groupName,
							status: p.status,
							schoolCategory: group.schoolCategory as { id: string; name: string } | null,
							members,
							teamMembers: group.teamMembers,
							orderNumber: group.orderNumber,
							registrant: {
								id: p.user.id,
								name: p.user.name,
								email: p.user.email,
								institution: p.schoolName || p.user.profile?.institution || null,
							},
						};
					});
				}
				return [];
			});

			res.json(result);
		} catch (error) {
			console.error("Error fetching participants:", error);
			res.status(500).json({ error: "Failed to fetch participants" });
		}
	}
);

export default router;
