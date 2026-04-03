import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthUtils } from "../utils/auth";
import {
	authenticate,
	AuthenticatedRequest,
	requireSuperAdmin,
	requireOwnershipOrAdmin,
} from "../middleware/auth";
import { uploadAvatar } from "../middleware/upload";
import { UserRole } from "@prisma/client";
import { z } from "zod";

const router = Router();

// Validation schemas
const createUserSchema = z.object({
	email: z.string().email("Invalid email format"),
	password: z.string().min(8, "Password must be at least 8 characters"),
	name: z.string().min(1, "Name is required"),
	role: z.enum(["SUPERADMIN", "PANITIA", "JURI", "PESERTA", "PELATIH"]),
	phone: z.string().optional(),
	institution: z.string().optional(),
	status: z.enum(["ACTIVE", "INACTIVE", "PENDING", "SUSPENDED"]).optional(),
});

const updateUserSchema = z.object({
	firstName: z.string().min(1).optional(),
	lastName: z.string().min(1).optional(),
	phone: z.string().optional(),
	role: z
		.enum(["SUPERADMIN", "PANITIA", "JURI", "PESERTA", "PELATIH"])
		.optional(),
	status: z.enum(["ACTIVE", "INACTIVE", "PENDING", "SUSPENDED"]).optional(),
});

const updateProfileSchema = z.object({
	name: z.string().min(1).optional(),
	email: z.string().email().optional(),
	phone: z.string().optional(),
	bio: z.string().optional(),
	institution: z.string().optional(),
	address: z.string().optional(),
	city: z.string().optional(),
	province: z.string().optional(),
	birthDate: z.string().optional(),
	gender: z.string().optional(),
});

const updatePasswordSchema = z.object({
	currentPassword: z.string().min(6),
	newPassword: z.string().min(6),
});

// Get all users (Admin only)
router.get(
	"/",
	authenticate,
	requireSuperAdmin,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { page = 1, limit = 10, role, status, search } = req.query;

			const where: any = {};

			if (role) where.role = role;
			if (status) where.status = status;
			if (search) {
				where.OR = [
					{ firstName: { contains: search as string, mode: "insensitive" } },
					{ lastName: { contains: search as string, mode: "insensitive" } },
					{ email: { contains: search as string, mode: "insensitive" } },
				];
			}

			const users = await prisma.user.findMany({
				where,
				include: {
					profile: true,
				},
				skip: (Number(page) - 1) * Number(limit),
				take: Number(limit),
				orderBy: { createdAt: "desc" },
			});

			const total = await prisma.user.count({ where });

			res.json({
				users: users.map((user) => AuthUtils.sanitizeUser(user)),
				pagination: {
					page: Number(page),
					limit: Number(limit),
					total,
					pages: Math.ceil(total / Number(limit)),
				},
			});
		} catch (error) {
			console.error("Get users error:", error);
			res.status(500).json({
				error: "Failed to fetch users",
				message: "Internal server error",
			});
		}
	}
);

// Create new user (SuperAdmin only)
router.post(
	"/",
	authenticate,
	requireSuperAdmin,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const validatedData = createUserSchema.parse(req.body);

			// Check if user already exists
			const existingUser = await prisma.user.findUnique({
				where: { email: validatedData.email },
			});

			if (existingUser) {
				return res.status(400).json({
					error: "User creation failed",
					message: "User with this email already exists",
				});
			}

			// Hash password
			const passwordHash = await AuthUtils.hashPassword(validatedData.password);

			// Create user with profile
			const user = await prisma.user.create({
				data: {
					email: validatedData.email,
					passwordHash,
					name: validatedData.name,
					role: validatedData.role as UserRole,
					phone: validatedData.phone,
					status: validatedData.status || "PENDING",
					emailVerified: false, // Needs admin verification
					profile: {
						create: {
							institution: validatedData.institution,
						},
					},
				},
				include: {
					profile: true,
				},
			});

			res.status(201).json({
				message: "User created successfully",
				user: AuthUtils.sanitizeUser(user),
			});
		} catch (error) {
			if (error instanceof z.ZodError) {
				return res.status(400).json({
					error: "Validation error",
					details: error.errors,
				});
			}

			console.error("Create user error:", error);
			res.status(500).json({
				error: "User creation failed",
				message: "Internal server error",
			});
		}
	}
);

// Get user by ID
router.get(
	"/:userId",
	authenticate,
	requireOwnershipOrAdmin,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { userId } = req.params;

			const user = await prisma.user.findUnique({
				where: { id: userId },
				include: {
					profile: true,
					participations: {
						include: {
							event: true,
						},
					},
				},
			});

			if (!user) {
				return res.status(404).json({
					error: "User not found",
					message: "User with this ID does not exist",
				});
			}

			res.json({
				user: AuthUtils.sanitizeUser(user),
			});
		} catch (error) {
			console.error("Get user error:", error);
			res.status(500).json({
				error: "Failed to fetch user",
				message: "Internal server error",
			});
		}
	}
);

// Update own profile (authenticated user)
router.put(
	"/profile",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const userId = req.user?.userId;
			if (!userId) {
				return res.status(401).json({
					error: "Unauthorized",
					message: "User not authenticated",
				});
			}

			const validatedData = updateProfileSchema.parse(req.body);

			// Extract user fields and profile fields
			const { name, email, phone, ...profileData } = validatedData;

			// Update user basic info
			const userUpdate: any = {};
			if (name) userUpdate.name = name;
			if (phone !== undefined) userUpdate.phone = phone;

			const user = await prisma.user.update({
				where: { id: userId },
				data: userUpdate,
				include: { profile: true },
			});

			// Update or create profile
			if (Object.keys(profileData).length > 0) {
				await prisma.userProfile.upsert({
					where: { userId },
					update: {
						...profileData,
						birthDate: profileData.birthDate
							? new Date(profileData.birthDate)
							: undefined,
					},
					create: {
						userId,
						...profileData,
						birthDate: profileData.birthDate
							? new Date(profileData.birthDate)
							: undefined,
					},
				});
			}

			// Fetch updated user with profile
			const updatedUser = await prisma.user.findUnique({
				where: { id: userId },
				include: { profile: true },
			});

			res.json({
				message: "Profile updated successfully",
				user: AuthUtils.sanitizeUser(updatedUser!),
			});
		} catch (error) {
			if (error instanceof z.ZodError) {
				return res.status(400).json({
					error: "Validation error",
					details: error.errors,
				});
			}

			console.error("Update profile error:", error);
			res.status(500).json({
				error: "Failed to update profile",
				message: "Internal server error",
			});
		}
	}
);

// Update password (authenticated user)
router.put(
	"/password",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const userId = req.user?.userId;
			if (!userId) {
				return res.status(401).json({
					error: "Unauthorized",
					message: "User not authenticated",
				});
			}

			const { currentPassword, newPassword } = updatePasswordSchema.parse(
				req.body
			);

			// Get current user
			const user = await prisma.user.findUnique({
				where: { id: userId },
			});

			if (!user) {
				return res.status(404).json({
					error: "User not found",
					message: "User does not exist",
				});
			}

			// Verify current password
			const isValidPassword = await AuthUtils.comparePassword(
				currentPassword,
				user.passwordHash
			);

			if (!isValidPassword) {
				return res.status(400).json({
					error: "Invalid password",
					message: "Current password is incorrect",
				});
			}

			// Hash new password
			const newPasswordHash = await AuthUtils.hashPassword(newPassword);

			// Update password
			await prisma.user.update({
				where: { id: userId },
				data: {
					passwordHash: newPasswordHash,
				},
			});

			res.json({
				message: "Password updated successfully",
			});
		} catch (error) {
			if (error instanceof z.ZodError) {
				return res.status(400).json({
					error: "Validation error",
					details: error.errors,
				});
			}

			console.error("Update password error:", error);
			res.status(500).json({
				error: "Failed to update password",
				message: "Internal server error",
			});
		}
	}
);

// Update user (Admin or owner)
router.put(
	"/:userId",
	authenticate,
	requireOwnershipOrAdmin,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { userId } = req.params;
			const validatedData = updateUserSchema.parse(req.body);

			// Only superadmin can change role and status
			if (
				(validatedData.role || validatedData.status) &&
				req.user?.role !== UserRole.SUPERADMIN
			) {
				return res.status(403).json({
					error: "Forbidden",
					message: "Only superadmin can change role and status",
				});
			}

			const user = await prisma.user.update({
				where: { id: userId },
				data: validatedData,
				include: {
					profile: true,
				},
			});

			res.json({
				message: "User updated successfully",
				user: AuthUtils.sanitizeUser(user),
			});
		} catch (error) {
			if (error instanceof z.ZodError) {
				return res.status(400).json({
					error: "Validation error",
					details: error.errors,
				});
			}

			console.error("Update user error:", error);
			res.status(500).json({
				error: "Failed to update user",
				message: "Internal server error",
			});
		}
	}
);

// Update user profile
router.put(
	"/:userId/profile",
	authenticate,
	requireOwnershipOrAdmin,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { userId } = req.params;
			const validatedData = updateProfileSchema.parse(req.body);

			const profile = await prisma.userProfile.upsert({
				where: { userId },
				update: {
					...validatedData,
					birthDate: validatedData.birthDate
						? new Date(validatedData.birthDate)
						: undefined,
				},
				create: {
					user: {
						connect: { id: userId },
					},
					...validatedData,
					birthDate: validatedData.birthDate
						? new Date(validatedData.birthDate)
						: undefined,
				},
				include: {
					user: true,
				},
			});

			res.json({
				message: "Profile updated successfully",
				profile,
			});
		} catch (error) {
			if (error instanceof z.ZodError) {
				return res.status(400).json({
					error: "Validation error",
					details: error.errors,
				});
			}

			console.error("Update profile error:", error);
			res.status(500).json({
				error: "Failed to update profile",
				message: "Internal server error",
			});
		}
	}
);

// Delete avatar (authenticated user) — must be before /:userId to avoid param conflict
router.delete(
	"/avatar",
	authenticate,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const userId = req.user?.userId;
			if (!userId) {
				return res.status(401).json({
					error: "Unauthorized",
					message: "User not authenticated",
				});
			}

			await prisma.userProfile.update({
				where: { userId },
				data: { avatar: null },
			});

			res.json({
				message: "Avatar deleted successfully",
			});
		} catch (error) {
			console.error("Delete avatar error:", error);
			res.status(500).json({
				error: "Failed to delete avatar",
				message: "Internal server error",
			});
		}
	}
);

// Delete user (Superadmin only)
router.delete(
	"/:userId",
	authenticate,
	requireSuperAdmin,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { userId } = req.params;

			const user = await prisma.user.findUnique({
				where: { id: userId },
			});

			if (!user) {
				return res.status(404).json({
					error: "Not found",
					message: "User not found",
				});
			}

			// Don't allow deleting other superadmin accounts
			if (user.role === UserRole.SUPERADMIN && req.user?.userId !== userId) {
				return res.status(403).json({
					error: "Forbidden",
					message: "Cannot delete other superadmin accounts",
				});
			}

			// Don't allow deleting yourself
			if (req.user?.userId === userId) {
				return res.status(403).json({
					error: "Forbidden",
					message: "Cannot delete your own account",
				});
			}

			// Check if user created events (block deletion if events have participants)
			const createdEvents = await prisma.event.findMany({
				where: { createdById: userId },
				include: { _count: { select: { participations: true } } },
			});
			const eventsWithParticipants = createdEvents.filter(
				(e) => e._count.participations > 0
			);
			if (eventsWithParticipants.length > 0) {
				return res.status(400).json({
					error: "Cannot delete user",
					message: `User has created ${eventsWithParticipants.length} event(s) with active participants. Reassign or delete those events first.`,
				});
			}

			// Use transaction to clean up all FK references then delete user
			await prisma.$transaction(async (tx) => {
				// Delete evaluations by this jury
				await tx.evaluation.deleteMany({ where: { juryId: userId } });
				await tx.materialEvaluation.deleteMany({ where: { juryId: userId } });

				// Nullify coupon references
				await tx.eventCoupon.updateMany({
					where: { usedById: userId },
					data: { usedById: null, isUsed: false },
				});

				// Delete coupons created by this admin (only if unused)
				await tx.eventCoupon.deleteMany({
					where: { createdByAdminId: userId, isUsed: false },
				});
				// Reassign used coupons created by this admin to the requesting superadmin
				await tx.eventCoupon.updateMany({
					where: { createdByAdminId: userId },
					data: { createdByAdminId: req.user!.userId },
				});

				// Delete events created by this user (only those with no participants, already checked above)
				await tx.event.deleteMany({ where: { createdById: userId } });

				// Delete the user (cascade handles: profile, sessions, participations, juryAssignments, comments, likes, orders, ticketPurchases)
				await tx.user.delete({ where: { id: userId } });
			});

			res.json({
				message: "User deleted successfully",
			});
		} catch (error) {
			console.error("Delete user error:", error);
			res.status(500).json({
				error: "Failed to delete user",
				message: "Internal server error",
			});
		}
	}
);

// Upload avatar (authenticated user)
router.post(
	"/avatar",
	authenticate,
	uploadAvatar.single("avatar"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const userId = req.user?.userId;
			if (!userId) {
				return res.status(401).json({
					error: "Unauthorized",
					message: "User not authenticated",
				});
			}

			if (!req.file) {
				return res.status(400).json({
					error: "No file uploaded",
					message: "Please select an image file",
				});
			}

			const avatarUrl = `/uploads/avatars/${req.file.filename}`;

			// Delete old avatar file if exists
			const existingProfile = await prisma.userProfile.findUnique({
				where: { userId },
				select: { avatar: true },
			});
			if (existingProfile?.avatar) {
				const fs = await import("fs");
				const path = await import("path");
				const oldPath = path.join(__dirname, "../../", existingProfile.avatar.replace(/^\//, ""));
				if (fs.existsSync(oldPath)) {
					fs.unlinkSync(oldPath);
				}
			}

			await prisma.userProfile.upsert({
				where: { userId },
				update: { avatar: avatarUrl },
				create: {
					userId,
					avatar: avatarUrl,
				},
			});

			res.json({
				message: "Avatar uploaded successfully",
				avatarUrl,
			});
		} catch (error) {
			console.error("Upload avatar error:", error);
			res.status(500).json({
				error: "Failed to upload avatar",
				message: "Internal server error",
			});
		}
	}
);

// Verify/Unverify user (SuperAdmin only)
router.patch(
	"/:userId/verify",
	authenticate,
	requireSuperAdmin,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { userId } = req.params;

			const user = await prisma.user.findUnique({
				where: { id: userId },
			});

			if (!user) {
				return res.status(404).json({
					error: "User not found",
					message: "User with this ID does not exist",
				});
			}

			const newVerified = !user.emailVerified;
			const updatedUser = await prisma.user.update({
				where: { id: userId },
				data: {
					emailVerified: newVerified,
					status: newVerified ? "ACTIVE" : "PENDING",
				},
				include: { profile: true },
			});

			res.json({
				message: newVerified
					? "User berhasil diverifikasi"
					: "Verifikasi user dicabut",
				user: AuthUtils.sanitizeUser(updatedUser),
			});
		} catch (error) {
			console.error("Verify user error:", error);
			res.status(500).json({
				error: "Failed to verify user",
				message: "Internal server error",
			});
		}
	}
);

// Pin/Unpin jury (SuperAdmin only)
router.patch(
	"/:userId/pin",
	authenticate,
	requireSuperAdmin,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { userId } = req.params;

			const user = await prisma.user.findUnique({
				where: { id: userId },
			});

			if (!user) {
				return res.status(404).json({
					error: "User not found",
					message: "User with this ID does not exist",
				});
			}

			if (user.role !== UserRole.JURI) {
				return res.status(400).json({
					error: "Invalid operation",
					message: "Hanya juri yang bisa di-pin/unpin",
				});
			}

			const updatedUser = await prisma.user.update({
				where: { id: userId },
				data: { isPinned: !user.isPinned },
				include: { profile: true },
			});

			res.json({
				message: updatedUser.isPinned
					? "Juri berhasil di-pin"
					: "Pin juri dicabut",
				user: AuthUtils.sanitizeUser(updatedUser),
			});
		} catch (error) {
			console.error("Pin jury error:", error);
			res.status(500).json({
				error: "Failed to pin/unpin jury",
				message: "Internal server error",
			});
		}
	}
);

// Get user detail with role-specific data (SuperAdmin only)
router.get(
	"/:userId/detail",
	authenticate,
	requireSuperAdmin,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { userId } = req.params;

			const user = await prisma.user.findUnique({
				where: { id: userId },
				include: {
					profile: true,
				},
			});

			if (!user) {
				return res.status(404).json({
					error: "User not found",
					message: "User with this ID does not exist",
				});
			}

			let roleData: any = {};

			if (user.role === UserRole.PANITIA) {
				// Get events created by this panitia
				const events = await prisma.event.findMany({
					where: { createdById: userId },
					select: {
						id: true,
						title: true,
						slug: true,
						status: true,
						startDate: true,
						endDate: true,
						currentParticipants: true,
						maxParticipants: true,
						thumbnail: true,
					},
					orderBy: { createdAt: "desc" },
				});

				// Get coupons assigned to this panitia's email
				const coupons = await prisma.eventCoupon.findMany({
					where: { assignedToEmail: user.email },
					select: {
						id: true,
						code: true,
						description: true,
						isUsed: true,
						usedAt: true,
						expiresAt: true,
						events: {
							select: {
								id: true,
								title: true,
								slug: true,
							},
						},
					},
					orderBy: { createdAt: "desc" },
				});

				roleData = { events, coupons };
			} else if (user.role === UserRole.PESERTA) {
				// Get event participations
				const participations = await prisma.eventParticipation.findMany({
					where: { userId },
					select: {
						id: true,
						status: true,
						teamName: true,
						schoolName: true,
						totalScore: true,
						rank: true,
						createdAt: true,
						event: {
							select: {
								id: true,
								title: true,
								slug: true,
								status: true,
								startDate: true,
								endDate: true,
								thumbnail: true,
							},
						},
					},
					orderBy: { createdAt: "desc" },
				});

				roleData = { participations };
			} else if (user.role === UserRole.JURI) {
				// Get jury event assignments
				const juryAssignments = await prisma.juryEventAssignment.findMany({
					where: { juryId: userId },
					select: {
						id: true,
						status: true,
						invitedAt: true,
						respondedAt: true,
						notes: true,
						event: {
							select: {
								id: true,
								title: true,
								slug: true,
								status: true,
								startDate: true,
								endDate: true,
								thumbnail: true,
							},
						},
						assignedCategories: {
							select: {
								id: true,
								assessmentCategory: {
									select: {
										name: true,
									},
								},
							},
						},
					},
					orderBy: { createdAt: "desc" },
				});

				roleData = { juryAssignments };
			} else if (user.role === UserRole.PELATIH) {
				// Get participations where they might be linked as coach
				// For now, pelatih has no specific relations
				roleData = {};
			}

			res.json({
				user: AuthUtils.sanitizeUser(user),
				roleData,
			});
		} catch (error) {
			console.error("Get user detail error:", error);
			res.status(500).json({
				error: "Failed to fetch user detail",
				message: "Internal server error",
			});
		}
	}
);

// Reset user password (SuperAdmin only)
router.post(
	"/:userId/reset-password",
	authenticate,
	requireSuperAdmin,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { userId } = req.params;

			const user = await prisma.user.findUnique({
				where: { id: userId },
			});

			if (!user) {
				return res.status(404).json({
					error: "User not found",
					message: "User with this ID does not exist",
				});
			}

			// Reset password to default
			const defaultPassword = "SIMPASKOR";
			const passwordHash = await AuthUtils.hashPassword(defaultPassword);

			await prisma.user.update({
				where: { id: userId },
				data: { passwordHash },
			});

			res.json({
				message: `Password berhasil direset untuk ${user.name}`,
			});
		} catch (error) {
			console.error("Reset password error:", error);
			res.status(500).json({
				error: "Failed to reset password",
				message: "Internal server error",
			});
		}
	}
);

// Get public statistics (no auth required) - for landing page
router.get("/public/stats", async (req, res: Response) => {
	try {
		const now = new Date();

		// Get juri count and list (only pinned juries for landing page)
		const juries = await prisma.user.findMany({
			where: {
				role: UserRole.JURI,
				status: "ACTIVE",
				isPinned: true,
			},
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
			orderBy: { createdAt: "desc" },
			take: 12, // Limit to 12 juries for display
		});

		// Get peserta count
		const pesertaCount = await prisma.user.count({
			where: {
				role: UserRole.PESERTA,
				status: "ACTIVE",
			},
		});

		// Get available/ongoing events count (events that haven't ended)
		const availableEventsCount = await prisma.event.count({
			where: {
				status: { notIn: ["DRAFT", "CANCELLED"] },
				endDate: { gte: now },
			},
		});

		// Get completed events count (events that have ended)
		const completedEventsCount = await prisma.event.count({
			where: {
				status: { notIn: ["DRAFT", "CANCELLED"] },
				endDate: { lt: now },
			},
		});

		// Total published events (all non-draft, non-cancelled)
		const totalEventsCount = availableEventsCount + completedEventsCount;

		// Get total juri count
		const juriCount = await prisma.user.count({
			where: {
				role: UserRole.JURI,
				status: "ACTIVE",
			},
		});

		// Get pinned pelatih for landing page
		const pelatihList = await prisma.user.findMany({
			where: {
				role: UserRole.PELATIH,
				status: "ACTIVE",
				isPinned: true,
			},
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
			orderBy: { createdAt: "desc" },
			take: 12,
		});

		res.json({
			juries: juries.map((juri) => ({
				id: juri.id,
				name: juri.name,
				avatar: juri.profile?.avatar || null,
				institution: juri.profile?.institution || null,
			})),
			pelatih: pelatihList.map((p) => ({
				id: p.id,
				name: p.name,
				avatar: p.profile?.avatar || null,
				institution: p.profile?.institution || null,
			})),
			stats: {
				juriCount,
				pesertaCount,
				eventsCount: totalEventsCount,
				availableEventsCount,
				completedEventsCount,
			},
		});
	} catch (error) {
		console.error("Get public stats error:", error);
		res.status(500).json({
			error: "Failed to fetch public stats",
			message: "Internal server error",
		});
	}
});

// Get all juries (public, no auth) - for "View All Juries" page
router.get("/public/juries", async (req, res: Response) => {
	try {
		const juries = await prisma.user.findMany({
			where: {
				role: UserRole.JURI,
			},
			select: {
				id: true,
				name: true,
				status: true,
				isPinned: true,
				profile: {
					select: {
						avatar: true,
						institution: true,
						city: true,
						bio: true,
					},
				},
			},
			orderBy: { name: "asc" },
		});

		res.json({
			juries: juries.map((juri) => ({
				id: juri.id,
				name: juri.name,
				status: juri.status,
				isPinned: juri.isPinned,
				avatar: juri.profile?.avatar || null,
				institution: juri.profile?.institution || null,
				city: juri.profile?.city || null,
				bio: juri.profile?.bio || null,
			})),
		});
	} catch (error) {
		console.error("Get all juries error:", error);
		res.status(500).json({
			error: "Failed to fetch juries",
			message: "Internal server error",
		});
	}
});

// Get juri detail with event history (public, no auth)
router.get("/public/juries/:id", async (req, res: Response) => {
	try {
		const { id } = req.params;

		const juri = await prisma.user.findFirst({
			where: {
				id,
				role: UserRole.JURI,
			},
			select: {
				id: true,
				name: true,
				profile: {
					select: {
						avatar: true,
						institution: true,
						city: true,
						province: true,
						bio: true,
					},
				},
				juryAssignments: {
					where: {
						status: "CONFIRMED",
					},
					select: {
						id: true,
						invitedAt: true,
						event: {
							select: {
								id: true,
								title: true,
								slug: true,
								thumbnail: true,
								startDate: true,
								endDate: true,
								location: true,
								status: true,
							},
						},
						assignedCategories: {
							select: {
								assessmentCategory: {
									select: {
										name: true,
									},
								},
							},
						},
					},
					orderBy: {
						event: {
							startDate: "desc",
						},
					},
				},
			},
		});

		if (!juri) {
			return res.status(404).json({ error: "Juri not found" });
		}

		res.json({
			id: juri.id,
			name: juri.name,
			avatar: juri.profile?.avatar || null,
			institution: juri.profile?.institution || null,
			city: juri.profile?.city || null,
			province: juri.profile?.province || null,
			bio: juri.profile?.bio || null,
			eventHistory: juri.juryAssignments.map((a) => ({
				eventId: a.event.id,
				title: a.event.title,
				slug: a.event.slug,
				thumbnail: a.event.thumbnail,
				startDate: a.event.startDate,
				endDate: a.event.endDate,
				location: a.event.location,
				status: a.event.status,
				categories: a.assignedCategories.map((c) => c.assessmentCategory.name),
			})),
		});
	} catch (error) {
		console.error("Get juri detail error:", error);
		res.status(500).json({
			error: "Failed to fetch juri detail",
			message: "Internal server error",
		});
	}
});

// Get all pelatih (public, no auth) - for "View All Pelatih" page
router.get("/public/pelatih", async (req, res: Response) => {
	try {
		const pelatih = await prisma.user.findMany({
			where: {
				role: UserRole.PELATIH,
			},
			select: {
				id: true,
				name: true,
				status: true,
				isPinned: true,
				profile: {
					select: {
						avatar: true,
						institution: true,
						city: true,
						bio: true,
					},
				},
			},
			orderBy: { name: "asc" },
		});

		res.json({
			pelatih: pelatih.map((p) => ({
				id: p.id,
				name: p.name,
				status: p.status,
				isPinned: p.isPinned,
				avatar: p.profile?.avatar || null,
				institution: p.profile?.institution || null,
				city: p.profile?.city || null,
				bio: p.profile?.bio || null,
			})),
		});
	} catch (error) {
		console.error("Get all pelatih error:", error);
		res.status(500).json({
			error: "Failed to fetch pelatih",
			message: "Internal server error",
		});
	}
});

export default router;
