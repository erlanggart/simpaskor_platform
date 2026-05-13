import express, { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, optionalAuthenticate, AuthenticatedRequest } from "../middleware/auth";
import { uploadEventThumbnail, uploadJuknis } from "../middleware/upload";
import { computeEventStatus } from "../utils/eventStatus";

const router = express.Router();

const EVENT_PACKAGE_PRICES: Record<string, number> = {
	IKLAN: 0,
	TICKETING: 0,
	VOTING: 0,
	TICKETING_VOTING: 0,
	BRONZE: 500000,
	GOLD: 1500000,
};

function getEventPackageAmount(packageTier: string | null | undefined) {
	if (!packageTier) return 0;
	return EVENT_PACKAGE_PRICES[packageTier] ?? 0;
}

async function applyMitraReferral(
	tx: Prisma.TransactionClient,
	eventId: string,
	referralCode: string | null | undefined
) {
	const normalizedCode = referralCode?.trim().toUpperCase();

	if (!normalizedCode) {
		await tx.mitraCommission.deleteMany({ where: { eventId } });
		await tx.event.update({
			where: { id: eventId },
			data: { mitraProfileId: null },
		});
		return null;
	}

	const mitraProfile = await tx.mitraProfile.findUnique({
		where: { referralCode: normalizedCode },
		select: {
			id: true,
			referralCode: true,
			commissionPerEvent: true,
		},
	});

	if (!mitraProfile) {
		throw new Error("INVALID_MITRA_REFERRAL_CODE");
	}

	await tx.event.update({
		where: { id: eventId },
		data: { mitraProfileId: mitraProfile.id },
	});

	await tx.mitraCommission.upsert({
		where: { eventId },
		create: {
			eventId,
			mitraProfileId: mitraProfile.id,
			referralCode: mitraProfile.referralCode,
			amount: mitraProfile.commissionPerEvent,
		},
		update: {
			mitraProfileId: mitraProfile.id,
			referralCode: mitraProfile.referralCode,
			amount: mitraProfile.commissionPerEvent,
		},
	});

	return mitraProfile;
}

// GET /api/events - Get all published events with search and filters
router.get("/", async (req: Request, res: Response) => {
	try {
		const { search, location, featured, limit, offset, status } = req.query;
		const now = new Date();
		const andFilters: any[] = [];

		// Base filter: exclude DRAFT and CANCELLED
		const where: any = {
			status: { notIn: ["DRAFT", "CANCELLED"] },
		};

		// Status filter based on computed status
		if (status === "COMPLETED") {
			// Events that have ended
			where.endDate = { lt: now };
		} else if (status === "ONGOING") {
			// Events happening now
			where.startDate = { lte: now };
			where.endDate = { gte: now };
		} else {
			// Default: PUBLISHED - events that haven't ended yet
			where.endDate = { gte: now };
		}

		// Search filter
		if (search) {
			andFilters.push({
				OR: [
				{ title: { contains: search as string, mode: "insensitive" } },
				{ description: { contains: search as string, mode: "insensitive" } },
				{ organizer: { contains: search as string, mode: "insensitive" } },
				],
			});
		}

		// Location filter
		if (location) {
			andFilters.push({
				location: { contains: location as string, mode: "insensitive" },
			});
		}

		// Public "featured" events now follow the pinned/unggulan concept.
		if (featured === "true") {
			andFilters.push({
				OR: [{ isPinned: true }, { featured: true }],
			});
		}

		// Has poster/thumbnail filter
		const { hasPoster } = req.query;
		if (hasPoster === "true") {
			andFilters.push({
				thumbnail: { not: null },
			});
		}

		if (andFilters.length > 0) {
			where.AND = andFilters;
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
				_count: {
					select: {
						likes: true,
						comments: true,
					},
				},
			},
			orderBy: [
				{ isPinned: "desc" },
				{ pinnedOrder: "asc" },
				{ featured: "desc" },
				{ startDate: "asc" },
			],
			take: limit ? parseInt(limit as string) : undefined,
			skip: offset ? parseInt(offset as string) : undefined,
		});

		// Apply computed status to each event and flatten counts
		const eventsWithComputedStatus = events.map(event => ({
			...event,
			status: computeEventStatus(event),
			likesCount: event._count.likes,
			commentsCount: event._count.comments,
		}));

		res.json({
			data: eventsWithComputedStatus,
			total,
			limit: limit ? parseInt(limit as string) : events.length,
			offset: offset ? parseInt(offset as string) : 0,
		});
	} catch (error) {
		console.error("Error fetching events:", error);
		res.status(500).json({ message: "Failed to fetch events" });
	}
});

// GET /api/events/admin/all - Get ALL events for admin management (SuperAdmin only)
router.get(
	"/admin/all",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;

			if (!user || user.role !== "SUPERADMIN") {
				return res.status(403).json({
					message: "Only SuperAdmin can access all events",
				});
			}

			const { search, status: statusFilter, limit, offset } = req.query;

			const where: any = {};

			// Optional status filter
			if (statusFilter && statusFilter !== "all") {
				where.status = statusFilter as string;
			}

			// Search filter
			if (search) {
				where.OR = [
					{ title: { contains: search as string, mode: "insensitive" } },
					{ description: { contains: search as string, mode: "insensitive" } },
					{ organizer: { contains: search as string, mode: "insensitive" } },
					{ location: { contains: search as string, mode: "insensitive" } },
				];
			}

			// Get total count
			const total = await prisma.event.count({ where });

			// Get ALL events without date filtering
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
				orderBy: [{ isPinned: "desc" }, { pinnedOrder: "asc" }, { createdAt: "desc" }],
				take: limit ? parseInt(limit as string) : undefined,
				skip: offset ? parseInt(offset as string) : undefined,
			});

			// Apply computed status to each event
			const eventsWithComputedStatus = events.map(event => ({
				...event,
				status: computeEventStatus(event),
			}));

			res.json({
				data: eventsWithComputedStatus,
				total,
				limit: limit ? parseInt(limit as string) : events.length,
				offset: offset ? parseInt(offset as string) : 0,
			});
		} catch (error) {
			console.error("Error fetching all events for admin:", error);
			res.status(500).json({ message: "Failed to fetch events" });
		}
	}
);

// GET /api/events/featured - Get featured events
router.get("/featured", async (req: Request, res: Response) => {
	try {
		const { limit } = req.query;
		const now = new Date();

		const events = await prisma.event.findMany({
			where: {
				status: { notIn: ["DRAFT", "CANCELLED"] },
				endDate: { gte: now },
				OR: [{ isPinned: true }, { featured: true }],
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
			orderBy: [
				{ isPinned: "desc" },
				{ pinnedOrder: "asc" },
				{ startDate: "asc" },
			],
			take: limit ? parseInt(limit as string) : 6,
		});

		// Apply computed status
		const eventsWithStatus = events.map(event => ({
			...event,
			status: computeEventStatus(event),
		}));

		res.json(eventsWithStatus);
	} catch (error) {
		console.error("Error fetching featured events:", error);
		res.status(500).json({ message: "Failed to fetch featured events" });
	}
});

// GET /api/events/pinned/carousel - Get pinned events for carousel
router.get("/pinned/carousel", async (req: Request, res: Response) => {
	try {
		const now = new Date();
		
		const events = await prisma.event.findMany({
			where: {
				status: { notIn: ["DRAFT", "CANCELLED"] },
				endDate: { gte: now },
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
				registrationDeadline: true,
				status: true,
				_count: {
					select: {
						likes: true,
						comments: true,
					},
				},
			},
			orderBy: [{ pinnedOrder: "asc" }, { createdAt: "desc" }],
			take: 10, // Maximum 10 pinned events in carousel
		});

		// Apply computed status
		const eventsWithStatus = events.map(event => ({
			...event,
			status: computeEventStatus(event),
			likesCount: event._count.likes,
			commentsCount: event._count.comments,
		}));

		res.json(eventsWithStatus);
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

			// Get all events created by this user that have completed the wizard
			const events = await prisma.event.findMany({
				where: {
					createdById: user.userId,
					wizardCompleted: true, // Only completed events
					OR: [
						{ paymentStatus: null },
						{ paymentStatus: { not: "DP_REQUESTED" } },
					],
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

			// Apply computed status to each event
			const eventsWithStatus = events.map(event => ({
				...event,
				status: computeEventStatus(event),
			}));

			res.json(eventsWithStatus);
		} catch (error) {
			console.error("Error fetching user events:", error);
			res.status(500).json({ message: "Failed to fetch events" });
		}
	}
);

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

// POST /api/events - Create new event (Panitia/SuperAdmin, requires coupon)
router.post(
	"/",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;

			if (!user || (user.role !== "PANITIA" && user.role !== "SUPERADMIN")) {
				return res.status(403).json({
					message: "Only Panitia or SuperAdmin can create events",
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
				province,
				city,
				venue,
				maxParticipants,
				registrationFee,
				organizer,
				contactPersonName,
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
				!province ||
				!city ||
				!assessmentCategoryIds ||
				!Array.isArray(assessmentCategoryIds) ||
				assessmentCategoryIds.length === 0
			) {
				return res.status(400).json({
					message:
						"Missing required fields: title, startDate, endDate, province, city, assessmentCategoryIds (must be a non-empty array)",
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
						province,
						city,
						venue,
						maxParticipants: totalMaxParticipants,
						currentParticipants: 0,
						registrationFee: registrationFee ? parseFloat(registrationFee) : 0,
						organizer,
						contactPersonName,
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

			if (!user || (user.role !== "PANITIA" && user.role !== "SUPERADMIN")) {
				return res.status(403).json({
					message: "Only Panitia or SuperAdmin can update events",
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
				province,
				city,
				venue,
				schoolCategoryLimits,
				registrationFee,
				organizer,
				contactPersonName,
				contactEmail,
				contactPhone,
				status,
				couponId,
			} = req.body;

			// Verify event exists and belongs to user
			const existingEvent = await prisma.event.findUnique({
				where: { id },
				select: { 
					createdById: true,
					paymentStatus: true,
					coupon: {
						select: {
							id: true,
							expiresAt: true,
						},
					},
				},
			});

			if (!existingEvent) {
				return res.status(404).json({
					message: "Event not found",
				});
			}

			if (existingEvent.paymentStatus === "DP_REQUESTED" && user.role !== "SUPERADMIN") {
				return res.status(403).json({
					message: "Event sedang menunggu konfirmasi DP dari admin.",
				});
			}

			if (existingEvent.createdById !== user.userId && user.role !== "SUPERADMIN") {
				return res.status(403).json({
					message: "You can only update your own events",
				});
			}

			// Check if event's coupon is expired - prevent editing settings
			if (existingEvent.coupon?.expiresAt && new Date(existingEvent.coupon.expiresAt) < new Date()) {
				return res.status(403).json({
					message: "Coupon sudah kadaluarsa. Pengaturan event tidak dapat diubah.",
					code: "COUPON_EXPIRED",
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

			// Note: No minimum participants validation - allow any positive value

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
				// Get existing assessment categories for this event
				const existingCategories = await tx.eventAssessmentCategory.findMany({
					where: { eventId: id },
					select: { id: true, assessmentCategoryId: true },
				});

				const existingCategoryMap = new Map(
					existingCategories.map((c) => [c.assessmentCategoryId, c.id])
				);

				// Find categories to add (new ones not in existing)
				const categoriesToAdd = assessmentCategoryIds.filter(
					(catId: string) => !existingCategoryMap.has(catId)
				);

				// Find EventAssessmentCategory IDs to remove (existing but not in new list)
				const categoriesToRemoveIds = existingCategories
					.filter((c) => !assessmentCategoryIds.includes(c.assessmentCategoryId))
					.map((c) => c.id);

				// Check if any category to remove has materials - only delete those without materials
				if (categoriesToRemoveIds.length > 0) {
					const materialsUsingCategories = await tx.eventMaterial.count({
						where: {
							eventId: id,
							eventAssessmentCategoryId: { in: categoriesToRemoveIds },
						},
					});

					if (materialsUsingCategories === 0) {
						await tx.eventAssessmentCategory.deleteMany({
							where: { id: { in: categoriesToRemoveIds } },
						});
					}
				}

				// Create new assessment category associations
				if (categoriesToAdd.length > 0) {
					await tx.eventAssessmentCategory.createMany({
						data: categoriesToAdd.map((catId: string) => ({
							eventId: id,
							assessmentCategoryId: catId,
						})),
					});
				}

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
						province,
						city,
						venue,
						maxParticipants: totalMaxParticipants,
						registrationFee: registrationFee ? parseFloat(registrationFee) : 0,
						organizer,
						contactPersonName,
						contactEmail,
						contactPhone,
						status: status || "DRAFT",
						couponId: couponId || null,
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

// PATCH /api/events/:id/status - Update event status only (Panitia only)
router.patch(
	"/:id/status",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;

			if (!user || (user.role !== "PANITIA" && user.role !== "SUPERADMIN")) {
				return res.status(403).json({
					message: "Only Panitia or SuperAdmin can update event status",
				});
			}

			const { id } = req.params;
			const { status } = req.body;

			if (!id) {
				return res.status(400).json({ message: "Event ID is required" });
			}

			// Validate status - only allow manual status changes to DRAFT, PUBLISHED, or CANCELLED
			// Other statuses (ONGOING, COMPLETED) are computed automatically based on dates
			const validStatuses = ["DRAFT", "PUBLISHED", "CANCELLED"];
			if (!status || !validStatuses.includes(status)) {
				return res.status(400).json({
					message: `Invalid status. Status hanya dapat diubah ke: Draft, Published, atau Cancelled. Status lainnya (Ongoing, Completed) dihitung otomatis berdasarkan tanggal.`,
				});
			}

			// Verify event exists and belongs to user
			const existingEvent = await prisma.event.findUnique({
				where: { id },
				select: {
					createdById: true,
					status: true,
					paymentStatus: true,
					packageTier: true,
					eventPayment: { select: { id: true, status: true } },
				},
			});

			if (!existingEvent) {
				return res.status(404).json({
					message: "Event not found",
				});
			}

			// DP events stay locked until SuperAdmin confirms them.
			if (existingEvent.paymentStatus === "DP_REQUESTED" && user.role !== "SUPERADMIN") {
				return res.status(403).json({
					message: "Event dengan pembayaran DP hanya bisa diubah oleh admin setelah DP dikonfirmasi.",
				});
			}

			if (existingEvent.createdById !== user.userId && user.role !== "SUPERADMIN") {
				return res.status(403).json({
					message: "You can only update status of your own events",
				});
			}

			const updatedEvent = await prisma.$transaction(async (tx) => {
				const updateData: any = { status };

				if (existingEvent.paymentStatus === "DP_REQUESTED" && user.role === "SUPERADMIN") {
					updateData.paymentStatus = "PAID";
					updateData.wizardStep = 0;
					updateData.wizardCompleted = true;

					if (existingEvent.packageTier) {
						await tx.eventPayment.upsert({
							where: { eventId: id },
							update: {
								status: "PAID",
								paidAt: new Date(),
								packageTier: existingEvent.packageTier as any,
								amount: getEventPackageAmount(existingEvent.packageTier),
								paymentType: "DP_CONFIRMED",
							},
							create: {
								eventId: id,
								userId: existingEvent.createdById,
								packageTier: existingEvent.packageTier as any,
								amount: getEventPackageAmount(existingEvent.packageTier),
								status: "PAID",
								paymentType: "DP_CONFIRMED",
								paidAt: new Date(),
							},
						});
					}
				}

				return tx.event.update({
					where: { id },
					data: updateData,
					select: {
						id: true,
						title: true,
						slug: true,
						status: true,
						paymentStatus: true,
					},
				});
			});

			res.json({
				message: `Event status updated to ${status}`,
				data: updatedEvent,
			});
		} catch (error: any) {
			console.error("Error updating event status:", error);
			res.status(500).json({
				message: "Failed to update event status",
				error: error.message,
			});
		}
	}
);

// GET /api/events/:id/participants-summary - Get public summary of registered schools/teams
router.get(
	"/:id/participants-summary",
	async (req: Request, res: Response) => {
		try {
			const { id } = req.params;

			if (!id) {
				return res.status(400).json({ error: "Event ID or slug is required" });
			}

			// Check if it's a UUID or slug
			const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

			// Check if event exists (by id or slug)
			const event = await prisma.event.findFirst({
				where: isUUID 
					? { id }
					: { slug: id },
			});

			if (!event) {
				return res.status(404).json({ error: "Event not found" });
			}

			// Get confirmed registrations with limited public info
			const registrations = await prisma.eventParticipation.findMany({
				where: {
					eventId: event.id,
					status: "CONFIRMED",
				},
				select: {
					id: true,
					schoolName: true,
					groups: {
						where: {
							status: "ACTIVE",
						},
						select: {
							id: true,
							groupName: true,
							schoolCategory: {
								select: {
									id: true,
									name: true,
								},
							},
						},
						orderBy: {
							createdAt: "asc",
						},
					},
				},
				orderBy: {
					createdAt: "asc",
				},
			});

			// Transform to simplified format
			const summary = registrations.map(reg => ({
				schoolName: reg.schoolName || "Tidak diketahui",
				teamCount: reg.groups.length,
				teams: reg.groups.map(g => ({
					name: g.groupName,
					category: g.schoolCategory?.name || null,
				})),
			}));

			res.json(summary);
		} catch (error) {
			console.error("Error fetching participants summary:", error);
			res.status(500).json({ error: "Failed to fetch participants summary" });
		}
	}
);

// GET /api/events/:id/registrations - Get all registrations for an event (supports both UUID and slug)
router.get(
	"/:id/registrations",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { id } = req.params;

			if (!id) {
				return res.status(400).json({ error: "Event ID or slug is required" });
			}

			// Check if it's a UUID or slug
			const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

			// Check if event exists (by id or slug)
			const event = await prisma.event.findFirst({
				where: isUUID 
					? { id }
					: { slug: id },
			});

			if (!event) {
				return res.status(404).json({ error: "Event not found" });
			}

			// Get all registrations for this event using the actual event ID
			const registrations = await prisma.eventParticipation.findMany({
				where: {
					eventId: event.id,
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

// ============================================================================
// DRAFT EVENT WIZARD ENDPOINTS
// ============================================================================

// GET /api/events/drafts - Get all draft events for current user (incomplete wizard)
router.get(
	"/drafts",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;

			if (!user) {
				return res.status(401).json({ message: "Unauthorized" });
			}

			const drafts = await prisma.event.findMany({
				where: {
					createdById: user.userId,
					wizardCompleted: false,
				},
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
					coupon: {
						select: {
							id: true,
							code: true,
						},
					},
					eventPayment: true,
				},
				orderBy: {
					updatedAt: "desc",
				},
			});

			res.json({ data: drafts });
		} catch (error) {
			console.error("Error fetching draft events:", error);
			res.status(500).json({ message: "Failed to fetch draft events" });
		}
	}
);

// GET /api/events/drafts/:id - Get single draft event
router.get(
	"/drafts/:id",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;
			const { id } = req.params;

			if (!user) {
				return res.status(401).json({ message: "Unauthorized" });
			}

			const draft = await prisma.event.findFirst({
				where: {
					id,
					createdById: user.userId,
				},
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
					coupon: {
						select: {
							id: true,
							code: true,
						},
					},
					eventPayment: true,
					mitraProfile: {
						select: {
							referralCode: true,
							commissionPerEvent: true,
						},
					},
					mitraCommission: true,
				},
			});

			if (!draft) {
				return res.status(404).json({ message: "Draft not found" });
			}

			res.json(draft);
		} catch (error) {
			console.error("Error fetching draft event:", error);
			res.status(500).json({ message: "Failed to fetch draft event" });
		}
	}
);

// POST /api/events/drafts - Create new draft event (Step 1)
router.post(
	"/drafts",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;

			if (!user || (user.role !== "PANITIA" && user.role !== "SUPERADMIN")) {
				return res.status(403).json({
					message: "Only Panitia or SuperAdmin can create events",
				});
			}

			const {
				title,
				description,
				startDate,
				endDate,
				registrationDeadline,
				province,
				city,
				venue,
				referralCode,
			} = req.body;

			// Validate required fields for step 1
			if (!title || !startDate || !endDate || !province || !city) {
				return res.status(400).json({
					message: "Missing required fields: title, startDate, endDate, province, city",
				});
			}

			// Generate slug from title
			const baseSlug = title
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-|-$/g, "");
			const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

			// Create draft event (no coupon required)
			const draft = await prisma.$transaction(async (tx) => {
				const createdDraft = await tx.event.create({
					data: {
						title,
						slug: uniqueSlug,
						description: description || null,
						startDate: new Date(startDate),
						endDate: new Date(endDate),
						registrationDeadline: registrationDeadline
							? new Date(registrationDeadline)
							: null,
						province,
						city,
						venue: venue || null,
						status: "DRAFT",
						wizardStep: 2, // Move to step 2
						wizardCompleted: false,
						createdById: user.userId,
					},
				});

				await applyMitraReferral(tx, createdDraft.id, referralCode);

				return tx.event.findUnique({
					where: { id: createdDraft.id },
					include: {
						mitraProfile: {
							select: {
								referralCode: true,
								commissionPerEvent: true,
							},
						},
						mitraCommission: true,
					},
				});
			});

			res.status(201).json({
				message: "Draft created successfully",
				event: draft,
			});
		} catch (error: any) {
			if (error?.message === "INVALID_MITRA_REFERRAL_CODE") {
				return res.status(400).json({
					message: "Kode referral mitra tidak ditemukan",
				});
			}
			console.error("Error creating draft event:", error);
			res.status(500).json({ message: "Failed to create draft event" });
		}
	}
);

// PATCH /api/events/drafts/:id/step2 - Update draft with Step 2 data (Categories)
router.patch(
	"/drafts/:id/step2",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;
			const id = req.params.id;

			if (!user) {
				return res.status(401).json({ message: "Unauthorized" });
			}

			if (!id) {
				return res.status(400).json({ message: "Event ID is required" });
			}

			const { packageTier, assessmentCategoryIds, schoolCategoryLimits } = req.body;

			// Verify ownership
			const existingDraft = await prisma.event.findFirst({
				where: {
					id,
					createdById: user.userId,
				},
			});

			if (!existingDraft) {
				return res.status(404).json({ message: "Draft not found" });
			}

			if (existingDraft.paymentStatus === "DP_REQUESTED" && user.role !== "SUPERADMIN") {
				return res.status(403).json({
					message: "Event sedang menunggu konfirmasi DP dari admin.",
				});
			}

			// Validate package tier
			const validTiers = ["IKLAN", "TICKETING", "VOTING", "TICKETING_VOTING", "BRONZE", "GOLD"];
			if (!packageTier || !validTiers.includes(packageTier)) {
				return res.status(400).json({
					message: "Valid package tier is required",
				});
			}

			// Only require categories for scoring packages
			const scoringTiers = ["BRONZE", "GOLD"];
			const needsCategories = scoringTiers.includes(packageTier);

			if (needsCategories) {
				// Validate assessment categories
				if (
					!assessmentCategoryIds ||
					!Array.isArray(assessmentCategoryIds) ||
					assessmentCategoryIds.length === 0
				) {
					return res.status(400).json({
						message: "At least one assessment category is required",
					});
				}

				// Validate school category limits
				if (
					!schoolCategoryLimits ||
					!Array.isArray(schoolCategoryLimits) ||
					schoolCategoryLimits.length === 0
				) {
					return res.status(400).json({
						message: "At least one school category limit is required",
					});
				}
			}

			// Update in transaction
			await prisma.$transaction(async (tx) => {
				if (needsCategories) {
				// Get existing assessment categories for this event
				const existingCategories = await tx.eventAssessmentCategory.findMany({
					where: { eventId: id },
					select: { id: true, assessmentCategoryId: true },
				});

				const existingCategoryMap = new Map(
					existingCategories.map((c) => [c.assessmentCategoryId, c.id])
				);

				// Find categories to add (new ones not in existing)
				const categoriesToAdd = assessmentCategoryIds.filter(
					(catId: string) => !existingCategoryMap.has(catId)
				);

				// Find EventAssessmentCategory IDs to remove (existing but not in new list)
				const categoriesToRemoveIds = existingCategories
					.filter((c) => !assessmentCategoryIds.includes(c.assessmentCategoryId))
					.map((c) => c.id);

				// Check if any category to remove has materials
				if (categoriesToRemoveIds.length > 0) {
					const materialsUsingCategories = await tx.eventMaterial.count({
						where: {
							eventId: id,
							eventAssessmentCategoryId: { in: categoriesToRemoveIds },
						},
					});

					// Only delete categories that have no materials
					if (materialsUsingCategories === 0) {
						await tx.eventAssessmentCategory.deleteMany({
							where: { id: { in: categoriesToRemoveIds } },
						});
					}
					// If there are materials, keep the categories to avoid orphaning them
				}

				// Create new assessment category associations
				if (categoriesToAdd.length > 0) {
					await tx.eventAssessmentCategory.createMany({
						data: categoriesToAdd.map((catId: string) => ({
							eventId: id,
							assessmentCategoryId: catId,
						})),
					});
				}
				} // end needsCategories

				// Delete existing school category limits
				if (needsCategories) {
				await tx.eventSchoolCategoryLimit.deleteMany({
					where: { eventId: id },
				});

				// Create new school category limits
				const validLimits = (schoolCategoryLimits || []).filter(
					(l: any) => l.categoryId && l.maxParticipants >= 1
				);

				if (validLimits.length > 0) {
					await tx.eventSchoolCategoryLimit.createMany({
						data: validLimits.map((limit: any) => ({
							eventId: id,
							schoolCategoryId: limit.categoryId,
							maxParticipants: limit.maxParticipants,
						})),
					});
				}
				}

				// Update wizard step and packageTier
				if (!existingDraft.wizardCompleted) {
					await tx.event.update({
						where: { id },
						data: {
							wizardStep: 3,
							packageTier: packageTier,
						},
					});
				} else {
					await tx.event.update({
						where: { id },
						data: {
							packageTier: packageTier,
						},
					});
				}
			});

			// Fetch updated draft
			const updatedDraft = await prisma.event.findUnique({
				where: { id },
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
			});

			res.json({
				message: "Step 2 saved successfully",
				event: updatedDraft,
			});
		} catch (error) {
			console.error("Error updating draft step 2:", error);
			res.status(500).json({ message: "Failed to update draft" });
		}
	}
);

// PATCH /api/events/drafts/:id/step3 - Update draft with Step 3 data (Poster, Fee, Documents)
router.patch(
	"/drafts/:id/step3",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;
			const { id } = req.params;

			if (!user) {
				return res.status(401).json({ message: "Unauthorized" });
			}

			if (!id) {
				return res.status(400).json({ message: "Event ID is required" });
			}

			const {
				thumbnail,
				juknisUrl,
				registrationFee,
				organizer,
				contactPersonName,
				contactEmail,
				contactPhone,
				status,
			} = req.body;

			// Verify ownership
			const existingDraft = await prisma.event.findFirst({
				where: {
					id,
					createdById: user.userId,
				},
			});

			if (!existingDraft) {
				return res.status(404).json({ message: "Draft not found" });
			}

			if (existingDraft.paymentStatus === "DP_REQUESTED" && user.role !== "SUPERADMIN") {
				return res.status(403).json({
					message: "Event sedang menunggu konfirmasi DP dari admin.",
				});
			}

			// Update draft with step 3 data - move to step 4 (payment)
			const updatedEvent = await prisma.event.update({
				where: { id },
				data: {
					thumbnail: thumbnail || null,
					juknisUrl: juknisUrl || null,
					registrationFee: registrationFee ? registrationFee : null,
					organizer: organizer || null,
					contactPersonName: contactPersonName || null,
					contactEmail: contactEmail || null,
					contactPhone: contactPhone || null,
					// Don't change status - stays DRAFT until payment
					// Move to step 4 for payment
					...(existingDraft.wizardCompleted ? {} : { wizardStep: 4 }),
				},
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
					eventPayment: true,
				},
			});

			res.json({
				message: "Step 3 saved successfully",
				event: updatedEvent,
			});
		} catch (error) {
			console.error("Error completing draft:", error);
			res.status(500).json({ message: "Failed to complete event creation" });
		}
	}
);

// PATCH /api/events/drafts/:id/step1 - Update Step 1 data (for going back)
router.patch(
	"/drafts/:id/step1",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;
			const { id } = req.params;

			if (!user) {
				return res.status(401).json({ message: "Unauthorized" });
			}

			if (!id) {
				return res.status(400).json({ message: "Event ID is required" });
			}

			const {
				title,
				description,
				startDate,
				endDate,
				registrationDeadline,
				province,
				city,
				venue,
				referralCode,
			} = req.body;

			// Verify ownership
			const existingDraft = await prisma.event.findFirst({
				where: {
					id,
					createdById: user.userId,
				},
			});

			if (!existingDraft) {
				return res.status(404).json({ message: "Draft not found" });
			}

			if (existingDraft.paymentStatus === "DP_REQUESTED" && user.role !== "SUPERADMIN") {
				return res.status(403).json({
					message: "Event sedang menunggu konfirmasi DP dari admin.",
				});
			}

			// Update step 1 data
			// Don't change wizardStep for completed events (edit mode)
			const updatedDraft = await prisma.$transaction(async (tx) => {
				await tx.event.update({
					where: { id },
					data: {
						title: title || existingDraft.title,
						description: description !== undefined ? description : existingDraft.description,
						startDate: startDate ? new Date(startDate) : existingDraft.startDate,
						endDate: endDate ? new Date(endDate) : existingDraft.endDate,
						registrationDeadline: registrationDeadline
							? new Date(registrationDeadline)
							: existingDraft.registrationDeadline,
						province: province || existingDraft.province,
						city: city || existingDraft.city,
						venue: venue !== undefined ? venue : existingDraft.venue,
						// Only update wizardStep for incomplete drafts
						...(existingDraft.wizardCompleted ? {} : { wizardStep: 2 }),
					},
				});

				if (referralCode !== undefined) {
					await applyMitraReferral(tx, id, referralCode);
				}

				return tx.event.findUnique({
					where: { id },
					include: {
						mitraProfile: {
							select: {
								referralCode: true,
								commissionPerEvent: true,
							},
						},
						mitraCommission: true,
					},
				});
			});

			res.json({
				message: "Step 1 updated successfully",
				event: updatedDraft,
			});
		} catch (error: any) {
			if (error?.message === "INVALID_MITRA_REFERRAL_CODE") {
				return res.status(400).json({
					message: "Kode referral mitra tidak ditemukan",
				});
			}
			console.error("Error updating draft step 1:", error);
			res.status(500).json({ message: "Failed to update draft" });
		}
	}
);

// DELETE /api/events/drafts/:id - Delete draft event
router.delete(
	"/drafts/:id",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;
			const { id } = req.params;

			if (!user) {
				return res.status(401).json({ message: "Unauthorized" });
			}

			// Verify ownership
			const existingDraft = await prisma.event.findFirst({
				where: {
					id,
					createdById: user.userId,
					wizardCompleted: false,
				},
			});

			if (!existingDraft) {
				return res.status(404).json({ message: "Draft not found" });
			}

			// Delete draft and restore coupon
			await prisma.$transaction([
				prisma.event.delete({
					where: { id },
				}),
				// Restore coupon if exists
				...(existingDraft.couponId
					? [
							prisma.eventCoupon.update({
								where: { id: existingDraft.couponId },
								data: {
									isUsed: false,
									usedById: null,
									usedAt: null,
								},
							}),
					  ]
					: []),
			]);

			res.json({ message: "Draft deleted successfully" });
		} catch (error) {
			console.error("Error deleting draft:", error);
			res.status(500).json({ message: "Failed to delete draft" });
		}
	}
);

// POST /api/events/upload-juknis - Upload juknis document
router.post(
	"/upload-juknis",
	authenticate,
	uploadJuknis.single("juknis"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			if (!req.file) {
				return res.status(400).json({ message: "No file uploaded" });
			}

			// Return relative path for database storage
			const juknisPath = `/uploads/events/${req.file.filename}`;

			res.json({
				message: "Juknis uploaded successfully",
				juknisUrl: juknisPath,
			});
		} catch (error: any) {
			console.error("Error uploading juknis:", error);
			res.status(500).json({
				message: "Failed to upload juknis",
				error: error.message,
			});
		}
	}
);

// GET /api/events/:id/leaderboard - Public leaderboard for completed events
router.get("/:id/leaderboard", async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		if (!id) {
			return res.status(400).json({ error: "Event ID or slug is required" });
		}
		const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

		const event = await prisma.event.findFirst({
			where: isUUID ? { id } : { slug: id },
			include: {
				assessmentCategories: {
					include: {
						assessmentCategory: {
							select: { id: true, name: true, order: true },
						},
					},
					orderBy: { assessmentCategory: { order: "asc" } },
				},
			},
		});

		if (!event) {
			return res.status(404).json({ error: "Event not found" });
		}

		// Only allow leaderboard for completed events
		const status = computeEventStatus(event);
		if (status !== "COMPLETED") {
			return res.status(400).json({ error: "Leaderboard only available for completed events" });
		}

		// Get participants with groups
		const participants = await prisma.eventParticipation.findMany({
			where: {
				eventId: event.id,
				status: { in: ["REGISTERED", "CONFIRMED", "ATTENDED"] },
			},
			include: {
				user: { select: { id: true, name: true } },
				groups: {
					where: { status: "ACTIVE" },
					include: {
						schoolCategory: { select: { id: true, name: true } },
					},
					orderBy: { orderNumber: "asc" },
				},
			},
		});

		// Flatten to groups
		const participantGroups: Array<{
			id: string;
			teamName: string;
			schoolName: string;
			schoolCategory: { id: string; name: string } | null;
			orderNumber: number | null;
		}> = [];
		participants.forEach((p) => {
			if (p.groups.length > 0) {
				p.groups.forEach((g) => {
					participantGroups.push({
						id: g.id,
						teamName: g.groupName,
						schoolName: p.schoolName || "Tidak diketahui",
						schoolCategory: g.schoolCategory,
						orderNumber: g.orderNumber,
					});
				});
			} else {
				participantGroups.push({
					id: p.id,
					teamName: p.user.name,
					schoolName: p.schoolName || "Tidak diketahui",
					schoolCategory: null,
					orderNumber: null,
				});
			}
		});

		// Get juries
		const juries = await prisma.juryEventAssignment.findMany({
			where: { eventId: event.id, status: "CONFIRMED" },
			include: {
				jury: { select: { id: true, name: true } },
				assignedCategories: { select: { assessmentCategoryId: true } },
			},
		});

		// Get material evaluations
		const materialEvaluations = await prisma.materialEvaluation.findMany({
			where: { eventId: event.id },
			select: { participantId: true, juryId: true, materialId: true, score: true, isSkipped: true },
		});

		// Get evaluations
		const evaluations = await prisma.evaluation.findMany({
			where: { eventId: event.id },
			select: { participantId: true, assessmentCategoryId: true, juryId: true, score: true, maxScore: true },
		});

		// Get event materials
		const eventMaterials = await prisma.eventMaterial.findMany({
			where: { eventId: event.id },
			select: { id: true, eventAssessmentCategoryId: true },
		});

		// Get extra nilai
		const extraNilaiList = await prisma.extraNilai.findMany({
			where: { eventId: event.id },
			select: { participantId: true, type: true, scope: true, assessmentCategoryId: true, value: true },
		});

		const materialToCategoryMap = new Map(eventMaterials.map((m) => [m.id, m.eventAssessmentCategoryId]));

		// Group material evaluations
		const materialEvalsByParticipant = materialEvaluations.reduce((acc, me) => {
			const categoryId = materialToCategoryMap.get(me.materialId);
			if (!categoryId) return acc;
			const key = `${me.participantId}:${categoryId}:${me.juryId}`;
			if (!acc[key]) acc[key] = { totalScore: 0, count: 0 };
			if (!me.isSkipped && me.score !== null) {
				acc[key].totalScore += me.score;
				acc[key].count += 1;
			}
			return acc;
		}, {} as Record<string, { totalScore: number; count: number }>);

		// Build evaluation map
		const evaluationMap = new Map<string, number>();
		evaluations.forEach((e) => {
			evaluationMap.set(`${e.participantId}:${e.assessmentCategoryId}:${e.juryId}`, e.score);
		});

		// Group extra nilai
		const extraNilaiByParticipant: Record<string, typeof extraNilaiList> = {};
		extraNilaiList.forEach((en) => {
			if (!extraNilaiByParticipant[en.participantId]) extraNilaiByParticipant[en.participantId] = [];
			extraNilaiByParticipant[en.participantId]!.push(en);
		});

		// Compute scores for each participant group
		const leaderboard = participantGroups.map((pg) => {
			let grandTotal = 0;

			event.assessmentCategories.forEach((eac) => {
				juries.forEach((juryAssignment) => {
					const assignedCategoryIds = juryAssignment.assignedCategories.map((ac) => ac.assessmentCategoryId);
					if (!assignedCategoryIds.includes(eac.assessmentCategoryId)) return;

					const evalKey = `${pg.id}:${eac.assessmentCategoryId}:${juryAssignment.jury.id}`;
					const evalScore = evaluationMap.get(evalKey);
					if (evalScore !== undefined) {
						grandTotal += evalScore;
						return;
					}

					const materialKey = `${pg.id}:${eac.id}:${juryAssignment.jury.id}`;
					const materialEval = materialEvalsByParticipant[materialKey];
					if (materialEval && materialEval.count > 0) {
						grandTotal += materialEval.totalScore;
					}
				});
			});

			// Apply extra nilai
			const participantExtraNilai = extraNilaiByParticipant[pg.id] || [];
			participantExtraNilai.forEach((en) => {
				grandTotal += en.type === "PUNISHMENT" ? -en.value : en.value;
			});

			return {
				id: pg.id,
				teamName: pg.teamName,
				schoolName: pg.schoolName,
				schoolCategory: pg.schoolCategory,
				orderNumber: pg.orderNumber,
				grandTotal,
			};
		});

		// Sort by grandTotal descending
		leaderboard.sort((a, b) => b.grandTotal - a.grandTotal);

		// Get unique school categories
		const schoolCategories = [...new Map(
			leaderboard
				.filter((l) => l.schoolCategory)
				.map((l) => [l.schoolCategory!.id, l.schoolCategory!])
		).values()];

		res.json({
			event: { id: event.id, title: event.title, slug: event.slug },
			categories: event.assessmentCategories.map((eac) => ({
				id: eac.assessmentCategoryId,
				name: eac.assessmentCategory.name,
			})),
			schoolCategories,
			leaderboard,
		});
	} catch (error) {
		console.error("Error fetching leaderboard:", error);
		res.status(500).json({ error: "Failed to fetch leaderboard" });
	}
});

// GET /api/events/:slug - Get event by slug (MUST BE LAST - catches all unmatched routes)
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
				juryAssignments: {
					where: {
						status: "CONFIRMED",
					},
					select: {
						id: true,
						status: true,
						jury: {
							select: {
								id: true,
								name: true,
								profile: {
									select: {
										avatar: true,
										institution: true,
									},
								},
							},
						},
						assignedCategories: {
							select: {
								assessmentCategory: {
									select: {
										id: true,
										name: true,
									},
								},
							},
						},
					},
				},
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
						groups: {
							where: { status: "ACTIVE" },
							select: {
								id: true,
								groupName: true,
								orderNumber: true,
								schoolCategory: {
									select: { id: true, name: true },
								},
							},
							orderBy: { orderNumber: "asc" },
						},
					},
				},
			},
		});

		if (!event) {
			return res.status(404).json({ message: "Event not found" });
		}

		// Compute actual currentParticipants from all non-cancelled participations' active groups
		// This prevents overbooking by showing accurate remaining slots
		const activeParticipations = event.participations.filter(
			(p) => p.status !== "CANCELLED"
		);
		const totalActiveGroups = activeParticipations.reduce(
			(sum, p) => sum + p.groups.length, 0
		);

		// Compute currentParticipants per school category (all non-cancelled)
		const categoryCountMap: Record<string, number> = {};
		activeParticipations.forEach((p) => {
			p.groups.forEach((g) => {
				if (g.schoolCategory) {
					categoryCountMap[g.schoolCategory.id] = (categoryCountMap[g.schoolCategory.id] || 0) + 1;
				}
			});
		});

		const schoolCategoryLimitsWithCount = event.schoolCategoryLimits.map((limit) => ({
			...limit,
			currentParticipants: categoryCountMap[limit.schoolCategoryId] || 0,
		}));

		// Apply computed status
		const eventWithStatus = {
			...event,
			status: computeEventStatus(event),
			currentParticipants: totalActiveGroups,
			schoolCategoryLimits: schoolCategoryLimitsWithCount,
		};

		res.json(eventWithStatus);
	} catch (error) {
		console.error("Error fetching event:", error);
		res.status(500).json({ message: "Failed to fetch event" });
	}
});

// ============================================
// EVENT COMMENTS & LIKES
// ============================================

// GET /api/events/:id/comments - Get all comments for an event (public)
router.get("/:id/comments", async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		// Find event by ID or slug
		const event = await prisma.event.findFirst({
			where: {
				OR: [
					{ id },
					{ slug: id },
				],
			},
		});

		if (!event) {
			return res.status(404).json({ message: "Event not found" });
		}

		const comments = await prisma.eventComment.findMany({
			where: { eventId: event.id },
			include: {
				user: {
					select: {
						id: true,
						name: true,
						email: true,
						role: true,
						profile: {
							select: {
								avatar: true,
								institution: true,
							},
						},
					},
				},
			},
			orderBy: { createdAt: "desc" },
		});

		res.json(comments);
	} catch (error) {
		console.error("Error fetching comments:", error);
		res.status(500).json({ message: "Failed to fetch comments" });
	}
});

// POST /api/events/:id/comments - Add a comment (requires auth)
router.post(
	"/:id/comments",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { id } = req.params;
			const { content } = req.body;
			const userId = req.user!.userId;

			if (!content || content.trim().length === 0) {
				return res.status(400).json({ message: "Content is required" });
			}

			if (content.length > 1000) {
				return res.status(400).json({ message: "Comment too long (max 1000 characters)" });
			}

			// Check if event exists (by ID or slug)
			const event = await prisma.event.findFirst({
				where: {
					OR: [
						{ id },
						{ slug: id },
					],
				},
			});

			if (!event) {
				return res.status(404).json({ message: "Event not found" });
			}

			const comment = await prisma.eventComment.create({
				data: {
					eventId: event.id,
					userId,
					content: content.trim(),
				},
				include: {
					user: {
						select: {
							id: true,
							name: true,
							email: true,
							role: true,
							profile: {
								select: {
									avatar: true,
									institution: true,
								},
							},
						},
					},
				},
			});

			res.status(201).json(comment);
		} catch (error) {
			console.error("Error creating comment:", error);
			res.status(500).json({ message: "Failed to create comment" });
		}
	}
);

// DELETE /api/events/:id/comments/:commentId - Delete a comment (owner or admin)
router.delete(
	"/:id/comments/:commentId",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { commentId } = req.params;
			const userId = req.user!.userId;
			const userRole = req.user!.role;

			const comment = await prisma.eventComment.findUnique({
				where: { id: commentId },
			});

			if (!comment) {
				return res.status(404).json({ message: "Comment not found" });
			}

			// Only owner or admin can delete
			if (comment.userId !== userId && userRole !== "SUPERADMIN" && userRole !== "PANITIA") {
				return res.status(403).json({ message: "Not authorized to delete this comment" });
			}

			await prisma.eventComment.delete({
				where: { id: commentId },
			});

			res.json({ message: "Comment deleted successfully" });
		} catch (error) {
			console.error("Error deleting comment:", error);
			res.status(500).json({ message: "Failed to delete comment" });
		}
	}
);

// GET /api/events/:id/likes - Get like count and user's like status
router.get("/:id/likes", optionalAuthenticate, async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const userId = (req as AuthenticatedRequest).user?.userId;

		// Find event by ID or slug
		const event = await prisma.event.findFirst({
			where: {
				OR: [
					{ id },
					{ slug: id },
				],
			},
		});

		if (!event) {
			return res.status(404).json({ message: "Event not found" });
		}

		const likeCount = await prisma.eventLike.count({
			where: { eventId: event.id },
		});

		let isLiked = false;
		if (userId) {
			const userLike = await prisma.eventLike.findUnique({
				where: {
					eventId_userId: {
						eventId: event.id,
						userId,
					},
				},
			});
			isLiked = !!userLike;
		}

		res.json({ count: likeCount, isLiked });
	} catch (error) {
		console.error("Error fetching likes:", error);
		res.status(500).json({ message: "Failed to fetch likes" });
	}
});

// POST /api/events/:id/likes - Toggle like (requires auth)
router.post(
	"/:id/likes",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { id } = req.params;
			const userId = req.user!.userId;

			// Check if event exists (by ID or slug)
			const event = await prisma.event.findFirst({
				where: {
					OR: [
						{ id },
						{ slug: id },
					],
				},
			});

			if (!event) {
				return res.status(404).json({ message: "Event not found" });
			}

			// Check if already liked
			const existingLike = await prisma.eventLike.findUnique({
				where: {
					eventId_userId: {
						eventId: event.id,
						userId,
					},
				},
			});

			let isLiked: boolean;

			if (existingLike) {
				// Unlike
				await prisma.eventLike.delete({
					where: { id: existingLike.id },
				});
				isLiked = false;
			} else {
				// Like
				await prisma.eventLike.create({
					data: {
						eventId: event.id,
						userId,
					},
				});
				isLiked = true;
			}

			// Get new count
			const count = await prisma.eventLike.count({
				where: { eventId: event.id },
			});

			res.json({ count, isLiked });
		} catch (error) {
			console.error("Error toggling like:", error);
			res.status(500).json({ message: "Failed to toggle like" });
		}
	}
);

// DELETE /api/events/:id - Delete event (SuperAdmin only)
router.delete(
	"/:id",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user;
			const { id } = req.params;

			if (!user || user.role !== "SUPERADMIN") {
				return res.status(403).json({
					message: "Only SuperAdmin can delete events",
				});
			}

			const event = await prisma.event.findUnique({
				where: { id },
			});

			if (!event) {
				return res.status(404).json({ message: "Event not found" });
			}

			// Delete event (cascade will handle related records)
			await prisma.$transaction([
				prisma.event.delete({
					where: { id },
				}),
				// Restore coupon if exists
				...(event.couponId
					? [
							prisma.eventCoupon.update({
								where: { id: event.couponId },
								data: {
									isUsed: false,
									usedById: null,
									usedAt: null,
								},
							}),
					  ]
					: []),
			]);

			res.json({ message: "Event deleted successfully" });
		} catch (error) {
			console.error("Error deleting event:", error);
			res.status(500).json({ message: "Failed to delete event" });
		}
	}
);

export default router;
