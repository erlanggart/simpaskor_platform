import express from "express";
import { authenticate, AuthenticatedRequest, requirePanitia } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import {
	createSnapTransaction,
	generateMidtransOrderId,
	isMidtransConfigured,
	PaymentPrefix,
	coreApi,
	resolvePaymentStatus,
} from "../lib/midtrans";

const router = express.Router();

// Validation schema for group
const groupSchema = z.object({
	groupName: z.string().min(1, "Group name is required"),
	schoolCategoryId: z.string().uuid("School category is required"),
	teamMembers: z.number().min(1, "Team members must be at least 1"),
	memberNames: z.string().optional(), // JSON stringified array of member names
	memberData: z.string().optional(), // JSON stringified array of member details with photos
	notes: z.string().optional(),
});

// Validation schema for registration
const registrationSchema = z.object({
	eventId: z.string().uuid(),
	schoolName: z.string().min(1, "School name is required"),
	supportingDoc: z.string().optional(), // URL to supporting document
	groups: z.array(groupSchema).min(1, "At least one group is required"),
});

// GET /api/registrations/event/:eventId - Get all registrations for an event (for panitia/admin)
router.get(
	"/event/:eventId",
	authenticate,
	requirePanitia,
	async (req: AuthenticatedRequest, res) => {
		try {
			const userId = req.user!.userId;
			const userRole = req.user!.role;
			const { eventId } = req.params;
			const { status } = req.query;

			// Check if event exists and user has access
			// SUPERADMIN can access all events, PANITIA can only access events they created
			const eventWhereClause: any = { id: eventId };
			if (userRole !== "SUPERADMIN") {
				eventWhereClause.createdById = userId;
			}

			const event = await prisma.event.findFirst({
				where: eventWhereClause,
			});

			if (!event) {
				return res.status(404).json({ error: "Event not found or no access" });
			}

			// Build where clause based on status filter
			const whereClause: any = { eventId };
			if (status && typeof status === "string") {
				whereClause.status = status;
			}

			const registrations = await prisma.eventParticipation.findMany({
				where: whereClause,
				include: {
					user: {
						select: {
							id: true,
							name: true,
							email: true,
							phone: true,
							profile: {
								select: {
									institution: true,
									city: true,
									province: true,
								},
							},
						},
					},
					schoolCategory: true,
					groups: {
						include: {
							schoolCategory: true,
						},
						orderBy: [
							{ orderNumber: "asc" },
							{ createdAt: "asc" },
						],
					},
				},
				orderBy: {
					createdAt: "desc",
				},
			});

			res.json(registrations);
		} catch (error) {
			console.error("Error fetching event registrations:", error);
			res.status(500).json({ error: "Failed to fetch event registrations" });
		}
	}
);

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
					// Include all groups (active and cancelled) so users can see their history
					orderBy: {
						createdAt: "asc",
					},
					include: {
						schoolCategory: true,
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
					include: {
						schoolCategory: true,
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
					include: {
						schoolCategory: true,
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
		const existingRegistration = await prisma.eventParticipation.findFirst({
			where: {
				eventId: validatedData.eventId,
				userId,
			},
			include: {
				groups: true,
			},
		});

		// If active registration exists, reject
		if (existingRegistration && existingRegistration.status !== "CANCELLED") {
			return res.status(400).json({
				error: "You have already registered for this event",
				registration: existingRegistration,
			});
		}

		// Check school category limits for each category used
		const categoryUsage: Record<string, number> = {};
		for (const group of validatedData.groups) {
			categoryUsage[group.schoolCategoryId] = (categoryUsage[group.schoolCategoryId] || 0) + 1;
		}

		for (const [categoryId, count] of Object.entries(categoryUsage)) {
			const limit = event.schoolCategoryLimits.find(l => l.schoolCategoryId === categoryId);
			if (limit) {
				const currentCount = await prisma.participationGroup.count({
					where: {
						schoolCategoryId: categoryId,
						participation: {
							eventId: validatedData.eventId,
							status: "CONFIRMED", // Only count confirmed registrations
						},
						status: "ACTIVE",
					},
				});

				if (currentCount + count > limit.maxParticipants) {
					return res.status(400).json({
						error: `Registration limit exceeded for category ${limit.schoolCategory.name}. Available slots: ${
							limit.maxParticipants - currentCount
						}`,
					});
				}
			}
		}

		// Determine initial status based on whether event has fee
		const hasFee = event.registrationFee && Number(event.registrationFee) > 0;
		const initialStatus = hasFee ? "PENDING_PAYMENT" : "REGISTERED";

		let registration;

		// If cancelled registration exists, re-register by updating it
		if (existingRegistration && existingRegistration.status === "CANCELLED") {
			// Get old group IDs first
			const oldGroupIds = existingRegistration.groups.map(g => g.id);

			// Delete performance sessions linked to old groups (to avoid orphan data)
			if (oldGroupIds.length > 0) {
				await prisma.performanceSession.deleteMany({
					where: { participantId: { in: oldGroupIds } },
				});
			}

			// Delete old groups
			await prisma.participationGroup.deleteMany({
				where: { participationId: existingRegistration.id },
			});

			// Update the cancelled registration
			registration = await prisma.eventParticipation.update({
				where: { id: existingRegistration.id },
				data: {
					schoolName: validatedData.schoolName,
					supportingDoc: validatedData.supportingDoc,
					status: initialStatus,
					groups: {
						create: validatedData.groups.map((group) => ({
							groupName: group.groupName,
							schoolCategoryId: group.schoolCategoryId,
							teamMembers: group.teamMembers,
							memberNames: group.memberNames,
							memberData: group.memberData,
							notes: group.notes,
							status: "ACTIVE",
						})),
					},
				},
				include: {
					event: true,
					groups: {
						include: {
							schoolCategory: true,
						},
					},
				},
			});
		} else {
			// Create new registration
			registration = await prisma.eventParticipation.create({
				data: {
					eventId: validatedData.eventId,
					userId,
					schoolName: validatedData.schoolName,
					supportingDoc: validatedData.supportingDoc,
					status: initialStatus,
					groups: {
						create: validatedData.groups.map((group) => ({
							groupName: group.groupName,
							schoolCategoryId: group.schoolCategoryId,
							teamMembers: group.teamMembers,
							memberNames: group.memberNames,
							memberData: group.memberData,
							notes: group.notes,
							status: "ACTIVE",
						})),
					},
				},
				include: {
					event: true,
					groups: {
						include: {
							schoolCategory: true,
						},
					},
				},
			});
		}

		res.status(201).json({
			message: hasFee ? "Registration saved. Please complete payment." : "Registration successful",
			registration,
			paymentRequired: hasFee,
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			console.error("Zod Validation Error:", JSON.stringify(error.errors, null, 2));
			return res.status(400).json({
				error: "Validation error",
				details: error.errors,
			});
		}
		console.error("Error creating registration:", error);
		res.status(500).json({ error: "Failed to create registration" });
	}
});

// POST /api/registrations/:id/pay - Create/initiate Midtrans payment for registration
router.post("/:id/pay", authenticate, async (req: AuthenticatedRequest, res) => {
	try {
		const userId = req.user!.userId;
		const { id } = req.params;

		// Get registration
		const registration = await prisma.eventParticipation.findFirst({
			where: { id, userId },
			include: {
				event: true,
				user: true,
			},
		});

		if (!registration) {
			return res.status(404).json({ error: "Registration not found" });
		}

		// Check if event has fee
		const eventFee = registration.event.registrationFee;
		if (!eventFee || Number(eventFee) <= 0) {
			return res.status(400).json({ error: "Event does not have registration fee" });
		}

		// Check if payment already exists and is paid
		const existingPayment = await prisma.registrationPayment.findUnique({
			where: { participationId: id },
		});

		if (existingPayment && existingPayment.status === "PAID") {
			return res.status(400).json({ error: "Registration fee already paid" });
		}

		// If existing order ID exists, check Midtrans status first — payment may have settled but webhook missed
		if (existingPayment?.midtransOrderId && isMidtransConfigured) {
			try {
				const txStatus = await coreApi.transaction.status(existingPayment.midtransOrderId);
				const result = resolvePaymentStatus(txStatus.transaction_status, txStatus.fraud_status);
				if (result === "success") {
					// Payment already settled in Midtrans — update DB and return
					await prisma.$transaction(async (tx) => {
						await tx.registrationPayment.update({
							where: { id: existingPayment.id },
							data: {
								status: "PAID",
								paymentType: txStatus.payment_type || null,
								paidAt: new Date(txStatus.settlement_time || txStatus.transaction_time),
							},
						});
						await tx.eventParticipation.update({
							where: { id },
							data: { status: "REGISTERED" },
						});
					});
					return res.json({
						message: "Payment already completed",
						payment: {
							id: existingPayment.id,
							amount: existingPayment.amount,
							status: "PAID",
							midtransOrderId: existingPayment.midtransOrderId,
							snapToken: null,
							redirectUrl: null,
						},
					});
				}
			} catch {
				// Midtrans status check failed (e.g. 404 = order expired/not found) — generate new order ID
			}
		}

		// Generate new Midtrans order ID (always new to avoid duplicate order rejection)
		const midtransOrderId = generateMidtransOrderId(PaymentPrefix.REGISTRATION, registration.id);

		// Create or update payment record
		const payment = await prisma.registrationPayment.upsert({
			where: { participationId: id },
			update: {
				midtransOrderId,
				amount: Number(eventFee),
				status: "PENDING",
			},
			create: {
				participationId: registration.id,
				eventId: registration.eventId,
				userId,
				amount: Number(eventFee),
				status: "PENDING",
				midtransOrderId,
			},
		});

		// Generate Midtrans Snap token
		let snapToken: string | null = null;
		let redirectUrl: string | null = null;

		if (!isMidtransConfigured) {
			console.warn("Midtrans is not configured. Set MIDTRANS_SERVER_KEY and MIDTRANS_CLIENT_KEY in .env");
			return res.status(503).json({
				error: "Payment gateway not configured",
				message: "Midtrans belum dikonfigurasi. Hubungi admin untuk setup payment gateway.",
			});
		}

		try {
			const snapResult = await createSnapTransaction({
				orderId: midtransOrderId,
				grossAmount: Number(eventFee),
				customerName: registration.user.name || registration.user.email,
				customerEmail: registration.user.email,
				customerPhone: registration.user.phone || undefined,
				itemDetails: [
					{
						id: registration.eventId,
						price: Number(eventFee),
						quantity: 1,
						name: `Registrasi: ${registration.event.title}`,
					},
				],
			});
			snapToken = snapResult.token;
			redirectUrl = snapResult.redirectUrl;

			// Update payment with snap token
			await prisma.registrationPayment.update({
				where: { id: payment.id },
				data: { snapToken },
			});
		} catch (midtransError) {
			console.error("Midtrans Snap token generation failed:", midtransError);
			return res.status(500).json({ error: "Failed to create payment token" });
		}

		res.json({
			message: "Payment initiated",
			payment: {
				id: payment.id,
				amount: payment.amount,
				status: payment.status,
				midtransOrderId: payment.midtransOrderId,
				snapToken,
				redirectUrl,
			},
		});
	} catch (error) {
		console.error("Error initiating payment:", error);
		res.status(500).json({ error: "Failed to initiate payment" });
	}
});

// POST /api/registrations/:id/verify-payment - Verify payment status directly with Midtrans
router.post("/:id/verify-payment", authenticate, async (req: AuthenticatedRequest, res) => {
	try {
		const userId = req.user!.userId;
		const { id } = req.params;

		const payment = await prisma.registrationPayment.findFirst({
			where: { participationId: id, userId },
		});

		if (!payment) {
			return res.status(404).json({ error: "Payment not found" });
		}

		if (payment.status === "PAID") {
			return res.json({ status: "PAID", message: "Pembayaran sudah dikonfirmasi" });
		}

		if (!payment.midtransOrderId) {
			return res.status(400).json({ error: "No Midtrans order ID" });
		}

		// Check status directly with Midtrans
		const txStatus = await coreApi.transaction.status(payment.midtransOrderId);
		const result = resolvePaymentStatus(txStatus.transaction_status, txStatus.fraud_status);

		if (result === "success") {
			await prisma.$transaction(async (tx) => {
				await tx.registrationPayment.update({
					where: { id: payment.id },
					data: {
						status: "PAID",
						paymentType: txStatus.payment_type || null,
						paidAt: new Date(),
					},
				});
				await tx.eventParticipation.update({
					where: { id: payment.participationId },
					data: { status: "REGISTERED" },
				});
			});
			return res.json({ status: "PAID", message: "Pembayaran berhasil dikonfirmasi" });
		}

		res.json({ status: payment.status, midtransStatus: txStatus.transaction_status });
	} catch (error) {
		console.error("Error verifying payment:", error);
		res.status(500).json({ error: "Gagal memverifikasi pembayaran" });
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
								include: {
									schoolCategory: true,
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

			// Check school category limits for each category used
			const categoryUsage: Record<string, number> = {};
			for (const group of groups) {
				categoryUsage[group.schoolCategoryId] = (categoryUsage[group.schoolCategoryId] || 0) + 1;
			}

			for (const [categoryId, count] of Object.entries(categoryUsage)) {
				const limit = registration.event.schoolCategoryLimits.find(l => l.schoolCategoryId === categoryId);
				if (limit) {
					const currentCount = await prisma.participationGroup.count({
						where: {
							schoolCategoryId: categoryId,
							participation: {
								eventId: registration.eventId,
								status: "CONFIRMED", // Only count confirmed registrations
							},
							status: "ACTIVE",
						},
					});

					if (currentCount + count > limit.maxParticipants) {
						return res.status(400).json({
							error: `Registration limit exceeded for category ${limit.schoolCategory.name}. Available slots: ${
								limit.maxParticipants - currentCount
							}`,
						});
					}
				}
			}

			// Add new groups
			const newGroups = await prisma.participationGroup.createMany({
				data: groups.map((group) => ({
					participationId: registration.id,
					schoolCategoryId: group.schoolCategoryId,
					groupName: group.groupName,
					teamMembers: group.teamMembers,
					memberNames: group.memberNames,
					memberData: group.memberData,
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
					groups: {
						where: {
							status: "ACTIVE",
						},
						include: {
							schoolCategory: true,
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

// PATCH /api/registrations/:id/groups/:groupId/restore - Restore a cancelled group
router.patch(
	"/:id/groups/:groupId/restore",
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
					event: {
						include: {
							schoolCategoryLimits: {
								include: {
									schoolCategory: true,
								},
							},
						},
					},
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

			const group = registration.groups[0];

			if (!group) {
				return res.status(404).json({ error: "Group not found" });
			}

			if (group.status !== "CANCELLED") {
				return res.status(400).json({ error: "Group is not cancelled" });
			}

			// Check school category limits
			const limit = registration.event.schoolCategoryLimits.find(
				(l: { schoolCategoryId: string }) => l.schoolCategoryId === group.schoolCategoryId
			);

			if (limit && registration.status === "CONFIRMED") {
				const currentCount = await prisma.participationGroup.count({
					where: {
						schoolCategoryId: group.schoolCategoryId,
						participation: {
							eventId: registration.eventId,
							status: "CONFIRMED",
						},
						status: "ACTIVE",
					},
				});

				if (currentCount + 1 > limit.maxParticipants) {
					return res.status(400).json({
						error: `Cannot restore group. Category limit exceeded for ${limit.schoolCategory.name}. Available slots: ${
							limit.maxParticipants - currentCount
						}`,
					});
				}
			}

			// Update group status to ACTIVE
			await prisma.participationGroup.update({
				where: { id: groupId },
				data: {
					status: "ACTIVE",
				},
			});

			// If registration was confirmed, increase the count
			if (registration.status === "CONFIRMED") {
				await prisma.event.update({
					where: { id: registration.eventId },
					data: {
						currentParticipants: {
							increment: 1,
						},
					},
				});
			}

			res.json({ message: "Group restored successfully" });
		} catch (error) {
			console.error("Error restoring group:", error);
			res.status(500).json({ error: "Failed to restore group" });
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
						select: {
							id: true,
							schoolCategoryId: true,
						},
					},
					event: {
						include: {
							schoolCategoryLimits: {
								include: {
									schoolCategory: true,
								},
							},
						},
					},
				},
			});

			if (!registration) {
				return res.status(404).json({ error: "Registration not found" });
			}

			const oldStatus = registration.status;
			const activeGroupsCount = registration.groups.length;

			// If confirming, check if event has registration fee and payment is required
			if (status === "CONFIRMED" && oldStatus !== "CONFIRMED") {
				const eventFee = registration.event.registrationFee;
				if (eventFee && Number(eventFee) > 0) {
					const payment = await prisma.registrationPayment.findUnique({
						where: { participationId: registration.id },
					});
					if (!payment || payment.status !== "PAID") {
						return res.status(400).json({
							error: "Registrasi belum dibayar via Midtrans. Tidak bisa dikonfirmasi sebelum pembayaran diterima.",
						});
					}
				}
			}

			// Group counts by school category for proper limit updates
			const groupCountsByCategory: Record<string, number> = {};
			for (const group of registration.groups) {
				if (group.schoolCategoryId) {
					groupCountsByCategory[group.schoolCategoryId] = (groupCountsByCategory[group.schoolCategoryId] || 0) + 1;
				}
			}

			// Check if we need to update participant counts
			const wasConfirmed = oldStatus === "CONFIRMED";
			const willBeConfirmed = status === "CONFIRMED";

			// If changing TO confirmed, increment count
			if (!wasConfirmed && willBeConfirmed) {
				// Check school category limits before confirming
				for (const [categoryId, groupCount] of Object.entries(groupCountsByCategory)) {
					const limit = registration.event.schoolCategoryLimits.find(
						(l) => l.schoolCategoryId === categoryId
					);

					if (limit) {
						// Count current confirmed participants for this category
						const currentCount = await prisma.participationGroup.count({
							where: {
								schoolCategoryId: categoryId,
								participation: {
									eventId: registration.eventId,
									status: "CONFIRMED",
								},
								status: "ACTIVE",
							},
						});

						if (currentCount + groupCount > limit.maxParticipants) {
							return res.status(400).json({
								error: `Cannot confirm registration. Category limit exceeded for ${limit.schoolCategory.name}. Available slots: ${
									limit.maxParticipants - currentCount
								}`,
							});
						}
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

				// Increment currentParticipants in each SchoolCategoryLimit
				for (const [categoryId, groupCount] of Object.entries(groupCountsByCategory)) {
					const limitToUpdate = registration.event.schoolCategoryLimits.find(
						(l) => l.schoolCategoryId === categoryId
					);
					if (limitToUpdate) {
						await prisma.eventSchoolCategoryLimit.update({
							where: { id: limitToUpdate.id },
							data: {
								currentParticipants: {
									increment: groupCount,
								},
							},
						});
					}
				}

				// Assign order numbers to each group by school category
				for (const group of registration.groups) {
					// Get the maximum order number for this event and school category
					const maxOrderResult = await prisma.participationGroup.aggregate({
						_max: {
							orderNumber: true,
						},
						where: {
							schoolCategoryId: group.schoolCategoryId,
							participation: {
								eventId: registration.eventId,
								status: "CONFIRMED",
							},
							status: "ACTIVE",
							orderNumber: { not: null },
						},
					});

					const nextOrderNumber = (maxOrderResult._max.orderNumber || 0) + 1;

					await prisma.participationGroup.update({
						where: { id: group.id },
						data: { orderNumber: nextOrderNumber },
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

				// Decrement currentParticipants in each SchoolCategoryLimit
				for (const [categoryId, groupCount] of Object.entries(groupCountsByCategory)) {
					const limitToUpdate = registration.event.schoolCategoryLimits.find(
						(l) => l.schoolCategoryId === categoryId
					);
					if (limitToUpdate) {
						await prisma.eventSchoolCategoryLimit.update({
							where: { id: limitToUpdate.id },
							data: {
								currentParticipants: {
									decrement: groupCount,
								},
							},
						});
					}
				}

				// Clear order numbers for all groups in this registration
				for (const group of registration.groups) {
					await prisma.participationGroup.update({
						where: { id: group.id },
						data: { orderNumber: null },
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

// GET /api/registrations/event/:eventId/confirmed-groups - Get confirmed groups by school category for reordering
router.get(
	"/event/:eventId/confirmed-groups",
	authenticate,
	async (req: AuthenticatedRequest, res) => {
		try {
			const { eventId } = req.params;
			const { schoolCategoryId } = req.query;
			const userRole = req.user!.role;

			// Only PANITIA and SUPERADMIN can access this
			if (userRole !== "PANITIA" && userRole !== "SUPERADMIN") {
				return res.status(403).json({ error: "Access denied" });
			}

			const whereClause: any = {
				participation: {
					eventId,
					status: "CONFIRMED",
				},
				status: "ACTIVE",
			};

			if (schoolCategoryId && typeof schoolCategoryId === "string") {
				whereClause.schoolCategoryId = schoolCategoryId;
			}

			const groups = await prisma.participationGroup.findMany({
				where: whereClause,
				include: {
					schoolCategory: true,
					participation: {
						include: {
							user: {
								select: {
									id: true,
									name: true,
									email: true,
									profile: {
										select: {
											institution: true,
										},
									},
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

			res.json(groups);
		} catch (error) {
			console.error("Error fetching confirmed groups:", error);
			res.status(500).json({ error: "Failed to fetch confirmed groups" });
		}
	}
);

// PATCH /api/registrations/groups/reorder - Reorder groups (update order numbers)
router.patch(
	"/groups/reorder",
	authenticate,
	async (req: AuthenticatedRequest, res) => {
		try {
			const { orders } = req.body; // Array of { groupId, orderNumber }
			const userRole = req.user!.role;

			// Only PANITIA and SUPERADMIN can reorder
			if (userRole !== "PANITIA" && userRole !== "SUPERADMIN") {
				return res.status(403).json({ error: "Access denied" });
			}

			if (!Array.isArray(orders) || orders.length === 0) {
				return res.status(400).json({ error: "Invalid orders data" });
			}

			// Update order numbers for each group
			const updates = orders.map((order: { groupId: string; orderNumber: number }) =>
				prisma.participationGroup.update({
					where: { id: order.groupId },
					data: { orderNumber: order.orderNumber },
				})
			);

			await Promise.all(updates);

			res.json({ message: "Order numbers updated successfully" });
		} catch (error) {
			console.error("Error updating order numbers:", error);
			res.status(500).json({ error: "Failed to update order numbers" });
		}
	}
);

// PATCH /api/registrations/groups/:groupId/order - Update single group order number
router.patch(
	"/groups/:groupId/order",
	authenticate,
	async (req: AuthenticatedRequest, res) => {
		try {
			const { groupId } = req.params;
			const { orderNumber } = req.body;
			const userRole = req.user!.role;

			// Only PANITIA and SUPERADMIN can update order
			if (userRole !== "PANITIA" && userRole !== "SUPERADMIN") {
				return res.status(403).json({ error: "Access denied" });
			}

			if (typeof orderNumber !== "number" || orderNumber < 1) {
				return res.status(400).json({ error: "Invalid order number" });
			}

			// Get the group with participation info
			const group = await prisma.participationGroup.findUnique({
				where: { id: groupId },
				include: {
					participation: true,
				},
			});

			if (!group) {
				return res.status(404).json({ error: "Group not found" });
			}

			if (group.participation.status !== "CONFIRMED") {
				return res.status(400).json({ error: "Can only reorder confirmed participants" });
			}

			// Check if the new order number already exists for this event + school category
			const existingGroup = await prisma.participationGroup.findFirst({
				where: {
					schoolCategoryId: group.schoolCategoryId,
					participation: {
						eventId: group.participation.eventId,
						status: "CONFIRMED",
					},
					status: "ACTIVE",
					orderNumber: orderNumber,
					id: { not: groupId },
				},
			});

			if (existingGroup) {
				// If current group has an order number, swap with existing
				if (group.orderNumber !== null) {
					// Swap order numbers
					await prisma.$transaction([
						prisma.participationGroup.update({
							where: { id: existingGroup.id },
							data: { orderNumber: group.orderNumber },
						}),
						prisma.participationGroup.update({
							where: { id: groupId },
							data: { orderNumber: orderNumber },
						}),
					]);
				} else {
					// Current group has no order number - need to find next available for the existing group
					const maxOrderResult = await prisma.participationGroup.aggregate({
						_max: {
							orderNumber: true,
						},
						where: {
							schoolCategoryId: group.schoolCategoryId,
							participation: {
								eventId: group.participation.eventId,
								status: "CONFIRMED",
							},
							status: "ACTIVE",
							orderNumber: { not: null },
						},
					});
					const nextOrderForExisting = (maxOrderResult._max.orderNumber || 0) + 1;
					
					// Assign current group the desired number, move existing group to next available
					await prisma.$transaction([
						prisma.participationGroup.update({
							where: { id: existingGroup.id },
							data: { orderNumber: nextOrderForExisting },
						}),
						prisma.participationGroup.update({
							where: { id: groupId },
							data: { orderNumber: orderNumber },
						}),
					]);
				}
			} else {
				// Just update the order number
				await prisma.participationGroup.update({
					where: { id: groupId },
					data: { orderNumber: orderNumber },
				});
			}

			res.json({ message: "Order number updated successfully" });
		} catch (error) {
			console.error("Error updating order number:", error);
			res.status(500).json({ error: "Failed to update order number" });
		}
	}
);

export default router;
