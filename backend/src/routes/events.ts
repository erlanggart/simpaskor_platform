import express, { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { uploadEventThumbnail } from "../middleware/upload";

const router = express.Router();

// GET /api/events - Get all published events with search and filters
router.get("/", async (req: Request, res: Response) => {
	try {
		const { search, location, featured, limit, offset } = req.query;

		const where: any = {
			status: "PUBLISHED",
		};

		// Search filter
		if (search) {
			where.OR = [
				{ title: { contains: search as string, mode: "insensitive" } },
				{ description: { contains: search as string, mode: "insensitive" } },
				{ organizer: { contains: search as string, mode: "insensitive" } },
			];
		}

		// Location filter
		if (location) {
			where.location = { contains: location as string, mode: "insensitive" };
		}

		// Featured filter
		if (featured === "true") {
			where.featured = true;
		}

		// Get total count for pagination
		const total = await prisma.event.count({ where });

		// Get events
		const events = await prisma.event.findMany({
			where,
			include: {
				createdBy: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
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
			orderBy: [{ featured: "desc" }, { startDate: "asc" }],
			take: limit ? parseInt(limit as string) : undefined,
			skip: offset ? parseInt(offset as string) : undefined,
		});

		res.json({
			data: events,
			total,
			limit: limit ? parseInt(limit as string) : events.length,
			offset: offset ? parseInt(offset as string) : 0,
		});
	} catch (error) {
		console.error("Error fetching events:", error);
		res.status(500).json({ message: "Failed to fetch events" });
	}
});

// GET /api/events/featured - Get featured events
router.get("/featured", async (req: Request, res: Response) => {
	try {
		const { limit } = req.query;

		const events = await prisma.event.findMany({
			where: {
				status: "PUBLISHED",
				featured: true,
			},
			include: {
				createdBy: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
				assessmentCategories: {
					include: {
						assessmentCategory: true,
					},
				},
			},
			orderBy: {
				startDate: "asc",
			},
			take: limit ? parseInt(limit as string) : 6,
		});

		res.json(events);
	} catch (error) {
		console.error("Error fetching featured events:", error);
		res.status(500).json({ message: "Failed to fetch featured events" });
	}
});

// GET /api/events/pinned/carousel - Get pinned events for carousel
router.get("/pinned/carousel", async (req: Request, res: Response) => {
	try {
		const events = await prisma.event.findMany({
			where: {
				status: "PUBLISHED",
				isPinned: true,
			},
			select: {
				id: true,
				title: true,
				description: true,
				thumbnail: true,
				slug: true,
				startDate: true,
				endDate: true,
				location: true,
				venue: true,
				pinnedOrder: true,
			},
			orderBy: [{ pinnedOrder: "asc" }, { createdAt: "desc" }],
			take: 10, // Maximum 10 pinned events in carousel
		});

		res.json(events);
	} catch (error) {
		console.error("Error fetching pinned events:", error);
		res.status(500).json({ message: "Failed to fetch pinned events" });
	}
});

// POST /api/events/upload-thumbnail - Upload event thumbnail/poster
router.post(
	"/upload-thumbnail",
	authenticate,
	uploadEventThumbnail.single("thumbnail"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			if (!req.file) {
				return res.status(400).json({ message: "No file uploaded" });
			}

			// Return relative path for database storage
			const thumbnailPath = `/uploads/events/${req.file.filename}`;

			res.json({
				message: "Thumbnail uploaded successfully",
				thumbnailUrl: thumbnailPath,
			});
		} catch (error: any) {
			console.error("Error uploading thumbnail:", error);
			res.status(500).json({
				message: "Failed to upload thumbnail",
				error: error.message,
			});
		}
	}
);

// GET /api/events/my - Get events created by current user (Panitia)
router.get(
	"/my",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;

			if (!user) {
				return res.status(401).json({ message: "Unauthorized" });
			}

			// Get all events created by this user (including DRAFT)
			const events = await prisma.event.findMany({
				where: {
					createdById: user.userId,
				},
				include: {
					createdBy: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},
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
					coupon: {
						select: {
							id: true,
							code: true,
						},
					},
				},
				orderBy: {
					createdAt: "desc",
				},
			});

			res.json(events);
		} catch (error) {
			console.error("Error fetching user events:", error);
			res.status(500).json({ message: "Failed to fetch events" });
		}
	}
);

// GET /api/events/:slug - Get event by slug
router.get("/:slug", async (req: Request, res: Response) => {
	try {
		const { slug } = req.params;

		const event = await prisma.event.findFirst({
			where: {
				OR: [{ slug }, { id: slug }],
			},
			include: {
				createdBy: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
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
				coupon: true,
				participations: {
					select: {
						id: true,
						status: true,
						teamName: true,
						schoolName: true,
						totalScore: true,
						user: {
							select: {
								id: true,
								name: true,
							},
						},
						schoolCategory: {
							select: {
								id: true,
								name: true,
								description: true,
							},
						},
					},
				},
			},
		});

		if (!event) {
			return res.status(404).json({ message: "Event not found" });
		}

		res.json(event);
	} catch (error) {
		console.error("Error fetching event:", error);
		res.status(500).json({ message: "Failed to fetch event" });
	}
});

// GET /api/events/meta/assessment-categories - Get all active assessment categories
router.get(
	"/meta/assessment-categories",
	async (req: Request, res: Response) => {
		try {
			const categories = await prisma.assessmentCategory.findMany({
				where: {
					isActive: true,
				},
				orderBy: {
					order: "asc",
				},
			});

			res.json(categories);
		} catch (error) {
			console.error("Error fetching assessment categories:", error);
			res
				.status(500)
				.json({ message: "Failed to fetch assessment categories" });
		}
	}
);

// GET /api/events/meta/school-categories - Get all school categories
router.get("/meta/school-categories", async (req: Request, res: Response) => {
	try {
		const categories = await prisma.schoolCategory.findMany({
			where: {
				isActive: true,
			},
			orderBy: {
				order: "asc",
			},
		});

		res.json(categories);
	} catch (error) {
		console.error("Error fetching school categories:", error);
		res.status(500).json({ message: "Failed to fetch school categories" });
	}
});

// POST /api/events - Create new event (Panitia only, requires coupon)
router.post(
	"/",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;

			if (!user || user.role !== "PANITIA") {
				return res.status(403).json({
					message: "Only Panitia can create events",
				});
			}

			const {
				couponId,
				title,
				description,
				thumbnail, // Add thumbnail field
				assessmentCategoryIds, // Array of assessment category IDs
				schoolCategoryLimits, // Array of {categoryId, maxParticipants}
				startDate,
				endDate,
				registrationDeadline,
				location,
				venue,
				maxParticipants,
				registrationFee,
				organizer,
				contactEmail,
				contactPhone,
				status,
			} = req.body;

			// Validate coupon
			if (!couponId) {
				return res.status(400).json({
					message: "Coupon is required to create an event",
				});
			}

			const coupon = await prisma.eventCoupon.findUnique({
				where: { id: couponId },
			});

			if (!coupon) {
				return res.status(404).json({
					message: "Coupon not found",
				});
			}

			if (coupon.isUsed) {
				return res.status(400).json({
					message: "Coupon has already been used",
				});
			}

			// Check if coupon is assigned to this Panitia
			if (!coupon.assignedToEmail) {
				return res.status(403).json({
					message:
						"This coupon has not been assigned to any Panitia yet. Please contact admin.",
				});
			}

			if (coupon.assignedToEmail !== user.email) {
				return res.status(403).json({
					message:
						"This coupon is not assigned to you. You can only use coupons assigned to your account.",
				});
			}

			// Validate required fields
			if (
				!title ||
				!startDate ||
				!endDate ||
				!location ||
				!assessmentCategoryIds ||
				!Array.isArray(assessmentCategoryIds) ||
				assessmentCategoryIds.length === 0
			) {
				return res.status(400).json({
					message:
						"Missing required fields: title, startDate, endDate, location, assessmentCategoryIds (must be a non-empty array)",
				});
			}

			// Validate schoolCategoryLimits if provided
			if (schoolCategoryLimits) {
				if (!Array.isArray(schoolCategoryLimits)) {
					return res.status(400).json({
						message: "schoolCategoryLimits must be an array",
					});
				}

				// Remove duplicates and filter out invalid entries
				const uniqueCategoryIds = new Set<string>();
				const validLimits: {
					categoryId: string;
					maxParticipants: number;
				}[] = [];

				for (const limit of schoolCategoryLimits) {
					// Skip if invalid
					if (
						!limit.categoryId ||
						!limit.maxParticipants ||
						limit.maxParticipants < 1
					) {
						continue;
					}

					// Skip duplicates
					if (uniqueCategoryIds.has(limit.categoryId)) {
						console.warn(
							`Duplicate school category detected: ${limit.categoryId}, skipping...`
						);
						continue;
					}

					uniqueCategoryIds.add(limit.categoryId);
					validLimits.push(limit);
				}

				// Replace with cleaned array
				(req.body as any).schoolCategoryLimits = validLimits;
			}

			// Generate slug from title
			const slug = title
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-|-$/g, "");

			// Get cleaned schoolCategoryLimits after validation
			const cleanedSchoolLimits = (req.body as any).schoolCategoryLimits;

			// Calculate total maxParticipants from schoolCategoryLimits
			const totalMaxParticipants =
				cleanedSchoolLimits && cleanedSchoolLimits.length > 0
					? cleanedSchoolLimits.reduce(
							(sum: number, limit: { maxParticipants: number }) =>
								sum + limit.maxParticipants,
							0
					  )
					: null;

			// Create event and mark coupon as used in a transaction
			const event = await prisma.$transaction(async (tx) => {
				// Mark coupon as used
				await tx.eventCoupon.update({
					where: { id: couponId },
					data: {
						isUsed: true,
						usedById: user.userId,
						usedAt: new Date(),
					},
				});

				// Create event
				const newEvent = await tx.event.create({
					data: {
						title,
						slug,
						description,
						thumbnail: thumbnail || null, // Add thumbnail to event creation
						startDate: new Date(startDate),
						endDate: new Date(endDate),
						registrationDeadline: registrationDeadline
							? new Date(registrationDeadline)
							: null,
						location,
						venue,
						maxParticipants: totalMaxParticipants,
						currentParticipants: 0,
						registrationFee: registrationFee ? parseFloat(registrationFee) : 0,
						organizer,
						contactEmail,
						contactPhone,
						status: status || "DRAFT",
						featured: false,
						couponId: couponId,
						createdById: user.userId,
						assessmentCategories: {
							create: assessmentCategoryIds.map((catId: string) => ({
								assessmentCategoryId: catId,
							})),
						},
						schoolCategoryLimits:
							cleanedSchoolLimits && cleanedSchoolLimits.length > 0
								? {
										create: cleanedSchoolLimits.map(
											(limit: {
												categoryId: string;
												maxParticipants: number;
											}) => ({
												schoolCategoryId: limit.categoryId,
												maxParticipants: limit.maxParticipants,
											})
										),
								  }
								: undefined,
					},
					include: {
						createdBy: {
							select: {
								id: true,
								name: true,
								email: true,
							},
						},
						coupon: {
							select: {
								id: true,
								code: true,
							},
						},
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
				});

				return newEvent;
			});

			res.status(201).json({
				message: "Event created successfully",
				data: event,
			});
		} catch (error: any) {
			console.error("Error creating event:", error);
			res.status(500).json({
				message: "Failed to create event",
				error: error.message,
			});
		}
	}
);

// PATCH /api/events/:id/pin - Toggle pin status (SuperAdmin only)
// PATCH /api/events/:id - Update an event (Panitia only)
router.patch(
	"/:id",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;

			if (!user || user.role !== "PANITIA") {
				return res.status(403).json({
					message: "Only Panitia can update events",
				});
			}

			const { id } = req.params;
			const {
				title,
				description,
				thumbnail,
				assessmentCategoryIds,
				startDate,
				endDate,
				registrationDeadline,
				location,
				venue,
				schoolCategoryLimits,
				registrationFee,
				organizer,
				contactEmail,
				contactPhone,
				status,
				couponId,
			} = req.body;

			// Verify event exists and belongs to user
			const existingEvent = await prisma.event.findUnique({
				where: { id },
				select: { createdById: true },
			});

			if (!existingEvent) {
				return res.status(404).json({
					message: "Event not found",
				});
			}

			if (existingEvent.createdById !== user.userId) {
				return res.status(403).json({
					message: "You can only update your own events",
				});
			}

			// Validation
			if (!title || title.trim().length === 0) {
				return res.status(400).json({
					message: "Event title is required",
				});
			}

			if (!startDate || !endDate) {
				return res.status(400).json({
					message: "Start date and end date are required",
				});
			}

			if (new Date(startDate) > new Date(endDate)) {
				return res.status(400).json({
					message: "End date cannot be earlier than start date",
				});
			}

			if (!assessmentCategoryIds || assessmentCategoryIds.length === 0) {
				return res.status(400).json({
					message: "At least one assessment category is required",
				});
			}

			if (!schoolCategoryLimits || schoolCategoryLimits.length === 0) {
				return res.status(400).json({
					message: "At least one school category with limit is required",
				});
			}

			// Validate minimum participants (20)
			for (const limit of schoolCategoryLimits) {
				if (limit.maxParticipants < 20) {
					return res.status(400).json({
						message: "Minimum participants per school category is 20",
					});
				}
			}

			if (!contactEmail || !/\S+@\S+\.\S+/.test(contactEmail)) {
				return res.status(400).json({
					message: "Valid contact email is required",
				});
			}

			// Remove duplicates from schoolCategoryLimits
			const uniqueLimits = Array.from(
				new Set(schoolCategoryLimits.map((limit: any) => limit.categoryId))
			).map((categoryId) =>
				schoolCategoryLimits.find(
					(limit: any) => limit.categoryId === categoryId
				)
			);

			// Calculate total maxParticipants from schoolCategoryLimits
			const totalMaxParticipants = uniqueLimits.reduce(
				(sum: number, limit: any) => sum + limit.maxParticipants,
				0
			);

			// Update event in transaction
			const updatedEvent = await prisma.$transaction(async (tx) => {
				// Delete existing assessment categories
				await tx.eventAssessmentCategory.deleteMany({
					where: { eventId: id },
				});

				// Delete existing school category limits
				await tx.eventSchoolCategoryLimit.deleteMany({
					where: { eventId: id },
				});

				// Update event
				const event = await tx.event.update({
					where: { id },
					data: {
						title,
						description,
						thumbnail,
						startDate: new Date(startDate),
						endDate: new Date(endDate),
						registrationDeadline: registrationDeadline
							? new Date(registrationDeadline)
							: null,
						location,
						venue,
						maxParticipants: totalMaxParticipants,
						registrationFee: registrationFee ? parseFloat(registrationFee) : 0,
						organizer,
						contactEmail,
						contactPhone,
						status: status || "DRAFT",
						couponId: couponId || null,
						assessmentCategories: {
							create: assessmentCategoryIds.map((catId: string) => ({
								assessmentCategoryId: catId,
							})),
						},
						schoolCategoryLimits: {
							create: uniqueLimits.map((limit: any) => ({
								schoolCategoryId: limit.categoryId,
								maxParticipants: limit.maxParticipants,
							})),
						},
					},
					include: {
						createdBy: {
							select: {
								id: true,
								name: true,
								email: true,
							},
						},
						assessmentCategories: true,
						schoolCategoryLimits: {
							include: {
								schoolCategory: true,
							},
						},
						coupon: true,
					},
				});

				return event;
			});

			res.json({
				message: "Event updated successfully",
				data: updatedEvent,
			});
		} catch (error: any) {
			console.error("Error updating event:", error);
			res.status(500).json({
				message: "Failed to update event",
				error: error.message,
			});
		}
	}
);

router.patch(
	"/:id/pin",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;

			if (!user || user.role !== "SUPERADMIN") {
				return res.status(403).json({
					message: "Only SuperAdmin can pin/unpin events",
				});
			}

			const { id } = req.params;
			const { isPinned, pinnedOrder } = req.body;

			// Get current event
			const event = await prisma.event.findUnique({
				where: { id },
			});

			if (!event) {
				return res.status(404).json({
					message: "Event not found",
				});
			}

			// Update pinned status
			const updatedEvent = await prisma.event.update({
				where: { id },
				data: {
					isPinned: isPinned !== undefined ? isPinned : event.isPinned,
					pinnedOrder:
						pinnedOrder !== undefined ? pinnedOrder : event.pinnedOrder,
				},
				select: {
					id: true,
					title: true,
					isPinned: true,
					pinnedOrder: true,
				},
			});

			res.json({
				message: `Event ${
					updatedEvent.isPinned ? "pinned" : "unpinned"
				} successfully`,
				data: updatedEvent,
			});
		} catch (error: any) {
			console.error("Error updating pin status:", error);
			res.status(500).json({
				message: "Failed to update pin status",
				error: error.message,
			});
		}
	}
);

// GET /api/events/:id/registrations - Get all registrations for an event
router.get(
	"/:id/registrations",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { id } = req.params;

			// Check if event exists
			const event = await prisma.event.findUnique({
				where: { id },
			});

			if (!event) {
				return res.status(404).json({ error: "Event not found" });
			}

			// Get all registrations for this event
			const registrations = await prisma.eventParticipation.findMany({
				where: {
					eventId: id,
				},
				include: {
					user: {
						select: {
							id: true,
							name: true,
							email: true,
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
			console.error("Error fetching event registrations:", error);
			res.status(500).json({ error: "Failed to fetch registrations" });
		}
	}
);

export default router;
