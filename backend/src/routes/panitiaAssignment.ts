import express, { Response } from "express";
import { PrismaClient } from "@prisma/client";
import {
	authenticate,
	requirePanitia,
	AuthenticatedRequest,
} from "../middleware/auth";

const router = express.Router();
const prisma = new PrismaClient();

// Get current active assignment for logged-in panitia
router.get(
	"/current",
	authenticate,
	requirePanitia,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const userId = req.user!.userId;

			const assignment = await prisma.panitiaEventAssignment.findFirst({
				where: {
					panitiaId: userId,
					isActive: true,
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
						},
					},
				},
				orderBy: {
					assignedAt: "desc",
				},
			});

			res.json(assignment);
		} catch (error) {
			console.error("Error fetching current assignment:", error);
			res.status(500).json({ message: "Gagal mengambil assignment" });
		}
	}
);

// Assign panitia to an event (supports both UUID and slug)
router.post(
	"/assign/:eventIdOrSlug",
	authenticate,
	requirePanitia,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const userId = req.user!.userId;
			const eventIdOrSlug = req.params.eventIdOrSlug;

			if (!eventIdOrSlug) {
				return res.status(400).json({ message: "Event ID atau slug diperlukan" });
			}

			// Check if it's a UUID or slug
			const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventIdOrSlug);

			// Check if event exists (by id or slug)
			const event = await prisma.event.findFirst({
				where: isUUID 
					? { id: eventIdOrSlug }
					: { slug: eventIdOrSlug },
			});

			if (!event) {
				return res.status(404).json({ message: "Event tidak ditemukan" });
			}

			const eventId = event.id;

			// Check if event was created by this panitia
			if (event.createdById !== userId) {
				return res
					.status(403)
					.json({ message: "Anda tidak memiliki akses ke event ini" });
			}

			// Check if already assigned
			const existingAssignment = await prisma.panitiaEventAssignment.findUnique(
				{
					where: {
						panitiaId_eventId: {
							panitiaId: userId,
							eventId: eventId,
						},
					},
				}
			);

			if (existingAssignment) {
				// If exists but not active, reactivate it
				if (!existingAssignment.isActive) {
					// First deactivate all other assignments
					await prisma.panitiaEventAssignment.updateMany({
						where: {
							panitiaId: userId,
							isActive: true,
							NOT: {
								id: existingAssignment.id,
							},
						},
						data: {
							isActive: false,
							leftAt: new Date(),
						},
					});

					// Then reactivate this one
					const updated = await prisma.panitiaEventAssignment.update({
						where: { id: existingAssignment.id },
						data: {
							isActive: true,
							leftAt: null,
						},
						include: {
							event: true,
						},
					});
					return res.json(updated);
				}
				return res
					.status(400)
					.json({ message: "Anda sudah mengelola event ini" });
			}

			// Deactivate all other assignments for this panitia (excluding this event which doesn't exist yet)
			await prisma.panitiaEventAssignment.updateMany({
				where: {
					panitiaId: userId,
					isActive: true,
				},
				data: {
					isActive: false,
					leftAt: new Date(),
				},
			});

			// Create new assignment
			const assignment = await prisma.panitiaEventAssignment.create({
				data: {
					panitiaId: userId,
					eventId: eventId,
					isActive: true,
				},
				include: {
					event: true,
				},
			});

			res.json(assignment);
		} catch (error) {
			console.error("Error assigning panitia to event:", error);
			res.status(500).json({ message: "Gagal assign ke event" });
		}
	}
);

// Leave event (deactivate assignment)
router.post(
	"/leave",
	authenticate,
	requirePanitia,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const userId = req.user!.userId;

			// Find active assignment
			const assignment = await prisma.panitiaEventAssignment.findFirst({
				where: {
					panitiaId: userId,
					isActive: true,
				},
			});

			if (!assignment) {
				return res
					.status(404)
					.json({ message: "Tidak ada event aktif yang dikelola" });
			}

			// Deactivate assignment
			await prisma.panitiaEventAssignment.update({
				where: { id: assignment.id },
				data: {
					isActive: false,
					leftAt: new Date(),
				},
			});

			res.json({ message: "Berhasil keluar dari pengelolaan event" });
		} catch (error) {
			console.error("Error leaving event:", error);
			res.status(500).json({ message: "Gagal keluar dari event" });
		}
	}
);

// Get all assignments history for logged-in panitia
router.get(
	"/history",
	authenticate,
	requirePanitia,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const userId = req.user!.userId;

			const assignments = await prisma.panitiaEventAssignment.findMany({
				where: {
					panitiaId: userId,
				},
				include: {
					event: {
						select: {
							id: true,
							title: true,
							startDate: true,
							endDate: true,
							status: true,
							thumbnail: true,
						},
					},
				},
				orderBy: {
					assignedAt: "desc",
				},
			});

			res.json(assignments);
		} catch (error) {
			console.error("Error fetching assignment history:", error);
			res.status(500).json({ message: "Gagal mengambil riwayat assignment" });
		}
	}
);

export default router;
