import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthUtils } from "../utils/auth";
import {
	authenticate,
	authorize,
	AuthenticatedRequest,
	requireSuperAdmin,
	requireOwnershipOrAdmin,
} from "../middleware/auth";
import { UserRole, UserStatus } from "@prisma/client";
import { z } from "zod";

const router = Router();

// Validation schemas
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
	bio: z.string().optional(),
	institution: z.string().optional(),
	address: z.string().optional(),
	city: z.string().optional(),
	province: z.string().optional(),
	birthDate: z.string().optional(),
	gender: z.enum(["MALE", "FEMALE"]).optional(),
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
					userId,
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

// Delete user (Superadmin only)
router.delete(
	"/:userId",
	authenticate,
	requireSuperAdmin,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { userId } = req.params;

			// Don't allow deleting superadmin
			const user = await prisma.user.findUnique({
				where: { id: userId },
			});

			if (user?.role === UserRole.SUPERADMIN && req.user?.userId !== userId) {
				return res.status(403).json({
					error: "Forbidden",
					message: "Cannot delete other superadmin accounts",
				});
			}

			await prisma.user.delete({
				where: { id: userId },
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

export default router;
