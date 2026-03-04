import express, { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, authorize } from "../middleware/auth";

const router = express.Router();

// GET /api/coupons - Get all coupons (Admin only)
router.get(
	"/",
	authenticate,
	authorize("SUPERADMIN"),
	async (req: Request, res: Response) => {
		try {
			const { status, search, limit, offset } = req.query;

			const where: any = {};

			// Filter by status
			if (status === "used") {
				where.isUsed = true;
			} else if (status === "unused") {
				where.isUsed = false;
			}

			// Search by code or description
			if (search) {
				where.OR = [
					{ code: { contains: search as string, mode: "insensitive" } },
					{ description: { contains: search as string, mode: "insensitive" } },
				];
			}

			const total = await prisma.eventCoupon.count({ where });

			const coupons = await prisma.eventCoupon.findMany({
				where,
				include: {
					createdByAdmin: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},
					usedBy: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},
					events: {
						select: {
							id: true,
							title: true,
							slug: true,
							status: true,
						},
					},
				},
				orderBy: { createdAt: "desc" },
				take: limit ? parseInt(limit as string) : undefined,
				skip: offset ? parseInt(offset as string) : undefined,
			});

			// Add computed isExpired field
			const couponsWithExpiry = coupons.map(coupon => ({
				...coupon,
				isExpired: coupon.expiresAt ? new Date(coupon.expiresAt) < new Date() : false,
			}));

			res.json({
				data: couponsWithExpiry,
				total,
				limit: limit ? parseInt(limit as string) : coupons.length,
				offset: offset ? parseInt(offset as string) : 0,
			});
		} catch (error) {
			console.error("Error fetching coupons:", error);
			res.status(500).json({ message: "Failed to fetch coupons" });
		}
	}
);

// GET /api/coupons/my - Get available coupons (Panitia)
router.get(
	"/my",
	authenticate,
	authorize("PANITIA"),
	async (req: Request, res: Response) => {
		try {
			const user = (req as any).user;

			// Show only coupons assigned to this Panitia user and unused
			const coupons = await prisma.eventCoupon.findMany({
				where: {
					assignedToEmail: user.email,
					isUsed: false,
				},
				orderBy: { createdAt: "desc" },
			});

			// Add computed isExpired field and filter out expired coupons
			const validCoupons = coupons
				.map(coupon => ({
					...coupon,
					isExpired: coupon.expiresAt ? new Date(coupon.expiresAt) < new Date() : false,
				}))
				.filter(coupon => !coupon.isExpired);

			res.json(validCoupons);
		} catch (error) {
			console.error("Error fetching available coupons:", error);
			res.status(500).json({ message: "Failed to fetch available coupons" });
		}
	}
);

// POST /api/coupons - Create new coupon (Admin only)
router.post(
	"/",
	authenticate,
	authorize("SUPERADMIN"),
	async (req: Request, res: Response) => {
		try {
			const user = (req as any).user;
			const { code, description, expiresAt } = req.body;

			// Validate required fields
			if (!code) {
				return res.status(400).json({ message: "Coupon code is required" });
			}

			// Check if code already exists
			const existing = await prisma.eventCoupon.findUnique({
				where: { code },
			});

			if (existing) {
				return res.status(400).json({ message: "Coupon code already exists" });
			}

			const coupon = await prisma.eventCoupon.create({
				data: {
					code,
					description,
					expiresAt: expiresAt ? new Date(expiresAt) : null,
					createdByAdminId: user.userId,
				},
				include: {
					createdByAdmin: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},
				},
			});

			res.status(201).json(coupon);
		} catch (error) {
			console.error("Error creating coupon:", error);
			res.status(500).json({ message: "Failed to create coupon" });
		}
	}
);

// POST /api/coupons/:code/validate - Validate coupon (Panitia)
router.post(
	"/:code/validate",
	authenticate,
	authorize("PANITIA"),
	async (req: Request, res: Response) => {
		try {
			const { code } = req.params;

			const coupon = await prisma.eventCoupon.findUnique({
				where: { code },
			});

			if (!coupon) {
				return res.status(404).json({
					valid: false,
					message: "Coupon tidak ditemukan",
				});
			}

			if (coupon.isUsed) {
				return res.status(400).json({
					valid: false,
					message: "Coupon sudah digunakan",
				});
			}

			// Check if coupon is expired
			const isExpired = coupon.expiresAt ? new Date(coupon.expiresAt) < new Date() : false;
			if (isExpired) {
				return res.status(400).json({
					valid: false,
					message: "Coupon sudah kadaluarsa",
				});
			}

			res.json({
				valid: true,
				message: "Coupon valid",
				coupon: {
					id: coupon.id,
					code: coupon.code,
					description: coupon.description,
					expiresAt: coupon.expiresAt,
				},
			});
		} catch (error) {
			console.error("Error validating coupon:", error);
			res.status(500).json({
				valid: false,
				message: "Gagal memvalidasi coupon",
			});
		}
	}
);

// PATCH /api/coupons/:id - Update coupon (Admin only - for assigning to Panitia)
router.patch(
	"/:id",
	authenticate,
	authorize("SUPERADMIN"),
	async (req: Request, res: Response) => {
		try {
			const { id } = req.params;
			const { description, assignedToEmail, expiresAt } = req.body;

			const coupon = await prisma.eventCoupon.findUnique({
				where: { id },
			});

			if (!coupon) {
				return res.status(404).json({ message: "Coupon not found" });
			}

			if (coupon.isUsed) {
				return res.status(400).json({
					message: "Cannot update coupon that has already been used",
				});
			}

			// If assigning to email, validate that user exists and is PANITIA
			if (
				assignedToEmail !== undefined &&
				assignedToEmail !== null &&
				assignedToEmail !== ""
			) {
				const user = await prisma.user.findUnique({
					where: { email: assignedToEmail },
				});

				if (!user) {
					return res.status(404).json({
						message: "User with this email not found",
					});
				}

				if (user.role !== "PANITIA") {
					return res.status(400).json({
						message: "Coupons can only be assigned to Panitia users",
					});
				}
			}

			const updatedCoupon = await prisma.eventCoupon.update({
				where: { id },
				data: {
					...(description !== undefined && { description }),
					...(assignedToEmail !== undefined && {
						assignedToEmail: assignedToEmail || null,
					}),
					...(expiresAt !== undefined && {
						expiresAt: expiresAt ? new Date(expiresAt) : null,
					}),
				},
			});

			res.json({
				message: "Coupon updated successfully",
				data: updatedCoupon,
			});
		} catch (error) {
			console.error("Error updating coupon:", error);
			res.status(500).json({ message: "Failed to update coupon" });
		}
	}
);

// DELETE /api/coupons/:id - Delete coupon (Admin only)
router.delete(
	"/:id",
	authenticate,
	authorize("SUPERADMIN"),
	async (req: Request, res: Response) => {
		try {
			const { id } = req.params;

			const coupon = await prisma.eventCoupon.findUnique({
				where: { id },
				include: {
					events: true,
				},
			});

			if (!coupon) {
				return res.status(404).json({ message: "Coupon not found" });
			}

			if (coupon.events.length > 0) {
				return res.status(400).json({
					message: "Cannot delete coupon that has been used to create events",
				});
			}

			await prisma.eventCoupon.delete({
				where: { id },
			});

			res.json({ message: "Coupon deleted successfully" });
		} catch (error) {
			console.error("Error deleting coupon:", error);
			res.status(500).json({ message: "Failed to delete coupon" });
		}
	}
);

export default router;
