import express from "express";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { z } from "zod";

const router = express.Router();

// Validation schema for group
const groupSchema = z.object({
	groupName: z.string().min(1, "Group name is required"),
	teamMembers: z.number().min(1, "Team members must be at least 1"),
	notes: z.string().optional(),
});

// Validation schema for registration
const registrationSchema = z.object({
	eventId: z.string().uuid(),
	schoolCategoryId: z.string().uuid(),
	schoolName: z.string().min(1, "School name is required"),
	groups: z.array(groupSchema).min(1, "At least one group is required"),
});

// GET /api/registrations/my - Get user's registrations
router.get("/my", authenticate, async (req: AuthenticatedRequest, res) => {
	try {
		const userId = req.user!.userId;

		const registrations = await prisma.eventParticipation.findMany({
			where: { userId },
			include: {
				event: {
					include: {
						schoolCategoryLimits: {
							include: {
								schoolCategory: true,
							},
						},
					},
				},
				schoolCategory: true,
				groups: {
					where: {
						status: "ACTIVE",
					},
					orderBy: {
						createdAt: "asc",
					},
				},
			},
			orderBy: {
				createdAt: "desc",
			},
		});

		res.json(registrations);
	} catch (error) {
		console.error("Error fetching registrations:", error);
		res.status(500).json({ error: "Failed to fetch registrations" });
	}
});

// GET /api/registrations/:id - Get registration detail
router.get("/:id", authenticate, async (req: AuthenticatedRequest, res) => {
	try {
		const userId = req.user!.userId;
		const { id } = req.params;

		const registration = await prisma.eventParticipation.findFirst({
			where: {
				id,
				userId,
			},
			include: {
				event: {
					include: {
						schoolCategoryLimits: {
							include: {
								schoolCategory: true,
							},
						},
					},
				},
				schoolCategory: true,
				groups: {
					where: {
						status: "ACTIVE",
					},
					orderBy: {
						createdAt: "asc",
					},
				},
			},
		});

		if (!registration) {
			return res.status(404).json({ error: "Registration not found" });
		}

		res.json(registration);
	} catch (error) {
		console.error("Error fetching registration:", error);
		res.status(500).json({ error: "Failed to fetch registration" });
	}
});

// POST /api/registrations - Create new registration with groups
router.post("/", authenticate, async (req: AuthenticatedRequest, res) => {
	try {
		const userId = req.user!.userId;
		const validatedData = registrationSchema.parse(req.body);

		// Check if event exists and is published
		const event = await prisma.event.findUnique({
			where: { id: validatedData.eventId },
			include: {
				schoolCategoryLimits: {
					where: {
						schoolCategoryId: validatedData.schoolCategoryId,
					},
				},
			},
		});

		if (!event) {
			return res.status(404).json({ error: "Event not found" });
		}

		if (event.status !== "PUBLISHED") {
			return res
				.status(400)
				.json({ error: "Event is not open for registration" });
		}

		// Check registration deadline
		if (event.registrationDeadline && new Date() > event.registrationDeadline) {
			return res
				.status(400)
				.json({ error: "Registration deadline has passed" });
		}

		// Check if user already registered for this event
		const existingRegistration = await prisma.eventParticipation.findUnique({
			where: {
				eventId_userId: {
					eventId: validatedData.eventId,
					userId,
				},
			},
			include: {
				groups: {
					where: {
						status: "ACTIVE",
					},
				},
			},
		});

		if (existingRegistration) {
			return res.status(400).json({
				error: "You have already registered for this event",
				registration: existingRegistration,
			});
		}

		// Check school category limit
		const limit = event.schoolCategoryLimits[0];
		if (limit) {
			const currentCount = await prisma.participationGroup.count({
				where: {
					participation: {
						eventId: validatedData.eventId,
						schoolCategoryId: validatedData.schoolCategoryId,
						status: "CONFIRMED", // Only count confirmed registrations
					},
					status: "ACTIVE",
				},
			});

			const totalGroupsToAdd = validatedData.groups.length;

			if (currentCount + totalGroupsToAdd > limit.maxParticipants) {
				return res.status(400).json({
					error: `Registration limit exceeded for this category. Available slots: ${
						limit.maxParticipants - currentCount
					}`,
				});
			}
		}

		// Create registration with groups
		const registration = await prisma.eventParticipation.create({
			data: {
				eventId: validatedData.eventId,
				userId,
				schoolCategoryId: validatedData.schoolCategoryId,
				schoolName: validatedData.schoolName,
				status: "REGISTERED",
				groups: {
					create: validatedData.groups.map((group) => ({
						groupName: group.groupName,
						teamMembers: group.teamMembers,
						notes: group.notes,
						status: "ACTIVE",
					})),
				},
			},
			include: {
				event: true,
				schoolCategory: true,
				groups: true,
			},
		});

		// DON'T update current participants count here
		// Only update when status is changed to CONFIRMED by panitia

		res.status(201).json({
			message: "Registration successful",
			registration,
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({
				error: "Validation error",
				details: error.errors,
			});
		}
		console.error("Error creating registration:", error);
		res.status(500).json({ error: "Failed to create registration" });
	}
});

// POST /api/registrations/:id/groups - Add more groups to existing registration
router.post(
	"/:id/groups",
	authenticate,
	async (req: AuthenticatedRequest, res) => {
		try {
			const userId = req.user!.userId;
			const { id } = req.params;
			const groups = z.array(groupSchema).parse(req.body);

			// Check if registration exists and belongs to user
			const registration = await prisma.eventParticipation.findFirst({
				where: {
					id,
					userId,
				},
				include: {
					event: {
						include: {
							schoolCategoryLimits: {
								where: {
									schoolCategoryId: { not: undefined },
								},
							},
						},
					},
					groups: {
						where: {
							status: "ACTIVE",
						},
					},
				},
			});

			if (!registration) {
				return res.status(404).json({ error: "Registration not found" });
			}

			// Check if event is still accepting registrations
			if (
				registration.event.registrationDeadline &&
				new Date() > registration.event.registrationDeadline
			) {
				return res
					.status(400)
					.json({ error: "Registration deadline has passed" });
			}

			// Check school category limit
			const limit = registration.event.schoolCategoryLimits.find(
				(l) => l.schoolCategoryId === registration.schoolCategoryId
			);

			if (limit) {
				const currentCount = await prisma.participationGroup.count({
					where: {
						participation: {
							eventId: registration.eventId,
							schoolCategoryId: registration.schoolCategoryId,
							status: "CONFIRMED", // Only count confirmed registrations
						},
						status: "ACTIVE",
					},
				});

				if (currentCount + groups.length > limit.maxParticipants) {
					return res.status(400).json({
						error: `Registration limit exceeded. Available slots: ${
							limit.maxParticipants - currentCount
						}`,
					});
				}
			}

			// Add new groups
			const newGroups = await prisma.participationGroup.createMany({
				data: groups.map((group) => ({
					participationId: registration.id,
					groupName: group.groupName,
					teamMembers: group.teamMembers,
					notes: group.notes,
					status: "ACTIVE",
				})),
			});

			// DON'T update event participants count here
			// Only update when status is CONFIRMED

			// Fetch updated registration
			const updatedRegistration = await prisma.eventParticipation.findUnique({
				where: { id },
				include: {
					event: true,
					schoolCategory: true,
					groups: {
						where: {
							status: "ACTIVE",
						},
					},
				},
			});

			res.json({
				message: "Groups added successfully",
				registration: updatedRegistration,
			});
		} catch (error) {
			if (error instanceof z.ZodError) {
				return res.status(400).json({
					error: "Validation error",
					details: error.errors,
				});
			}
			console.error("Error adding groups:", error);
			res.status(500).json({ error: "Failed to add groups" });
		}
	}
);

// DELETE /api/registrations/:id/groups/:groupId - Cancel a group
router.delete(
	"/:id/groups/:groupId",
	authenticate,
	async (req: AuthenticatedRequest, res) => {
		try {
			const userId = req.user!.userId;
			const { id, groupId } = req.params;

			// Check if registration exists and belongs to user
			const registration = await prisma.eventParticipation.findFirst({
				where: {
					id,
					userId,
				},
				include: {
					groups: {
						where: {
							id: groupId,
						},
					},
				},
			});

			if (!registration) {
				return res.status(404).json({ error: "Registration not found" });
			}

			if (registration.groups.length === 0) {
				return res.status(404).json({ error: "Group not found" });
			}

			// Update group status to CANCELLED
			await prisma.participationGroup.update({
				where: { id: groupId },
				data: {
					status: "CANCELLED",
				},
			});

			// DON'T decrease participants count here
			// Only decrease if registration was CONFIRMED

			// If registration was confirmed, decrease the count
			if (registration.status === "CONFIRMED") {
				await prisma.event.update({
					where: { id: registration.eventId },
					data: {
						currentParticipants: {
							decrement: 1,
						},
					},
				});
			}

			res.json({ message: "Group cancelled successfully" });
		} catch (error) {
			console.error("Error cancelling group:", error);
			res.status(500).json({ error: "Failed to cancel group" });
		}
	}
);

// DELETE /api/registrations/:id - Cancel entire registration
router.delete("/:id", authenticate, async (req: AuthenticatedRequest, res) => {
	try {
		const userId = req.user!.userId;
		const { id } = req.params;

		// Check if registration exists and belongs to user
		const registration = await prisma.eventParticipation.findFirst({
			where: {
				id,
				userId,
			},
			include: {
				groups: {
					where: {
						status: "ACTIVE",
					},
				},
			},
		});

		if (!registration) {
			return res.status(404).json({ error: "Registration not found" });
		}

		const activeGroupsCount = registration.groups.length;

		// Update registration status
		await prisma.eventParticipation.update({
			where: { id },
			data: {
				status: "CANCELLED",
				groups: {
					updateMany: {
						where: {
							status: "ACTIVE",
						},
						data: {
							status: "CANCELLED",
						},
					},
				},
			},
		});

		// Only decrease participants count if registration was CONFIRMED
		if (registration.status === "CONFIRMED") {
			await prisma.event.update({
				where: { id: registration.eventId },
				data: {
					currentParticipants: {
						decrement: activeGroupsCount,
					},
				},
			});
		}

		res.json({ message: "Registration cancelled successfully" });
	} catch (error) {
		console.error("Error cancelling registration:", error);
		res.status(500).json({ error: "Failed to cancel registration" });
	}
});

// PATCH /api/registrations/:id/status - Update registration status (for panitia/admin)
router.patch(
	"/:id/status",
	authenticate,
	async (req: AuthenticatedRequest, res) => {
		try {
			const { id } = req.params;
			const { status } = req.body;
			const userRole = req.user!.role;

			// Only PANITIA and SUPERADMIN can update status
			if (userRole !== "PANITIA" && userRole !== "SUPERADMIN") {
				return res
					.status(403)
					.json({ error: "Only panitia or admin can update registration status" });
			}

			// Validate status
			if (!["REGISTERED", "CONFIRMED", "CANCELLED"].includes(status)) {
				return res.status(400).json({ error: "Invalid status value" });
			}

			// Get registration
			const registration = await prisma.eventParticipation.findUnique({
				where: { id },
				include: {
					groups: {
						where: {
							status: "ACTIVE",
						},
					},
					event: {
						include: {
							schoolCategoryLimits: true,
						},
					},
				},
			});

			if (!registration) {
				return res.status(404).json({ error: "Registration not found" });
			}

			const oldStatus = registration.status;
			const activeGroupsCount = registration.groups.length;

			// Check if we need to update participant counts
			const wasConfirmed = oldStatus === "CONFIRMED";
			const willBeConfirmed = status === "CONFIRMED";

			// If changing TO confirmed, increment count
			if (!wasConfirmed && willBeConfirmed) {
				// Check school category limit before confirming
				const limit = registration.event.schoolCategoryLimits.find(
					(l) => l.schoolCategoryId === registration.schoolCategoryId
				);

				if (limit) {
					// Count current confirmed participants for this category
					const currentCount = await prisma.participationGroup.count({
						where: {
							participation: {
								eventId: registration.eventId,
								schoolCategoryId: registration.schoolCategoryId,
								status: "CONFIRMED",
							},
							status: "ACTIVE",
						},
					});

					if (currentCount + activeGroupsCount > limit.maxParticipants) {
						return res.status(400).json({
							error: `Cannot confirm registration. Category limit exceeded. Available slots: ${
								limit.maxParticipants - currentCount
							}`,
						});
					}
				}

				// Increment currentParticipants in Event
				await prisma.event.update({
					where: { id: registration.eventId },
					data: {
						currentParticipants: {
							increment: activeGroupsCount,
						},
					},
				});

				// Increment currentParticipants in SchoolCategoryLimit
				const limitToUpdate = registration.event.schoolCategoryLimits.find(
					(l) => l.schoolCategoryId === registration.schoolCategoryId
				);
				if (limitToUpdate) {
					await prisma.eventSchoolCategoryLimit.update({
						where: { id: limitToUpdate.id },
						data: {
							currentParticipants: {
								increment: activeGroupsCount,
							},
						},
					});
				}
			}
			// If changing FROM confirmed to something else, decrement count
			else if (wasConfirmed && !willBeConfirmed) {
				// Decrement currentParticipants in Event
				await prisma.event.update({
					where: { id: registration.eventId },
					data: {
						currentParticipants: {
							decrement: activeGroupsCount,
						},
					},
				});

				// Decrement currentParticipants in SchoolCategoryLimit
				const limitToUpdate = registration.event.schoolCategoryLimits.find(
					(l) => l.schoolCategoryId === registration.schoolCategoryId
				);
				if (limitToUpdate) {
					await prisma.eventSchoolCategoryLimit.update({
						where: { id: limitToUpdate.id },
						data: {
							currentParticipants: {
								decrement: activeGroupsCount,
							},
						},
					});
				}
			}

			// Update registration status
			const updatedRegistration = await prisma.eventParticipation.update({
				where: { id },
				data: {
					status,
					updatedAt: new Date(),
				},
				include: {
					user: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},
					schoolCategory: true,
					groups: {
						where: {
							status: "ACTIVE",
						},
					},
				},
			});

			res.json({
				message: "Registration status updated successfully",
				data: updatedRegistration,
			});
		} catch (error) {
			console.error("Error updating registration status:", error);
			res.status(500).json({ error: "Failed to update registration status" });
		}
	}
);

export default router;
