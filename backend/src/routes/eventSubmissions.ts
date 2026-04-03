import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, authorize, AuthenticatedRequest } from "../middleware/auth";
import { AuthUtils } from "../utils/auth";
import rateLimit from "express-rate-limit";

const router = Router();
const prisma = new PrismaClient();

// Rate limit for public submission: 5 per hour per IP
const submissionLimiter = rateLimit({
	windowMs: 60 * 60 * 1000,
	max: 5,
	message: {
		error: "Too many submissions",
		message: "Terlalu banyak pendaftaran. Silakan coba lagi nanti.",
	},
	standardHeaders: true,
	legacyHeaders: false,
	skip: (req) => process.env.NODE_ENV === "development",
});

// ==========================================
// PUBLIC: Submit event registration
// ==========================================
router.post("/", submissionLimiter, async (req: Request, res: Response) => {
	try {
		const { namaPanitia, email, phone, namaEvent, lokasiEvent, namaInstansi, packageTier } = req.body;

		// Validation
		if (!namaPanitia || !email || !namaEvent || !lokasiEvent || !namaInstansi || !packageTier) {
			return res.status(400).json({
				error: "Validation error",
				message: "Semua field wajib diisi.",
			});
		}

		if (!AuthUtils.isValidEmail(email)) {
			return res.status(400).json({
				error: "Validation error",
				message: "Format email tidak valid.",
			});
		}

		if (!["BRONZE", "SILVER", "GOLD"].includes(packageTier)) {
			return res.status(400).json({
				error: "Validation error",
				message: "Paket tidak valid.",
			});
		}

		// Sanitize inputs (trim + limit length)
		const sanitize = (str: string, maxLen: number) => str.trim().slice(0, maxLen);

		const submission = await prisma.eventSubmission.create({
			data: {
				namaPanitia: sanitize(namaPanitia, 200),
				email: sanitize(email, 255).toLowerCase(),
				phone: phone ? sanitize(phone, 20) : null,
				namaEvent: sanitize(namaEvent, 300),
				lokasiEvent: sanitize(lokasiEvent, 500),
				namaInstansi: sanitize(namaInstansi, 300),
				packageTier,
			},
		});

		res.status(201).json({
			message: "Pendaftaran event berhasil dikirim.",
			submission: {
				id: submission.id,
				namaEvent: submission.namaEvent,
				packageTier: submission.packageTier,
				status: submission.status,
			},
		});
	} catch (error) {
		console.error("Error creating event submission:", error);
		res.status(500).json({ error: "Failed to create event submission" });
	}
});

// ==========================================
// ADMIN: Get all event submissions
// ==========================================
router.get(
	"/",
	authenticate,
	authorize("SUPERADMIN"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { status, packageTier, page = "1", limit = "20" } = req.query;

			const where: any = {};
			if (status) where.status = String(status);
			if (packageTier) where.packageTier = String(packageTier);

			const pageNum = Math.max(1, parseInt(String(page)));
			const limitNum = Math.min(100, Math.max(1, parseInt(String(limit))));

			const [submissions, total] = await Promise.all([
				prisma.eventSubmission.findMany({
					where,
					orderBy: { createdAt: "desc" },
					skip: (pageNum - 1) * limitNum,
					take: limitNum,
				}),
				prisma.eventSubmission.count({ where }),
			]);

			res.json({
				submissions,
				pagination: {
					page: pageNum,
					limit: limitNum,
					total,
					totalPages: Math.ceil(total / limitNum),
				},
			});
		} catch (error) {
			console.error("Error fetching event submissions:", error);
			res.status(500).json({ error: "Failed to fetch event submissions" });
		}
	}
);

// ==========================================
// ADMIN: Update submission status
// ==========================================
router.put(
	"/:id",
	authenticate,
	authorize("SUPERADMIN"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { id } = req.params;
			const { status, notes } = req.body;

			if (status && !["PENDING", "CONTACTED", "CONFIRMED", "REJECTED"].includes(status)) {
				return res.status(400).json({
					error: "Validation error",
					message: "Status tidak valid.",
				});
			}

			// Fetch current submission to check current state
			const currentSubmission = await prisma.eventSubmission.findUnique({ where: { id } });
			if (!currentSubmission) {
				return res.status(404).json({ error: "Submission not found" });
			}

			let createdUser = null;
			let generatedPassword = null;

			// Auto-create PANITIA account when status changes to CONFIRMED
			if (status === "CONFIRMED" && currentSubmission.status !== "CONFIRMED") {
				// Check if account already exists for this email
				const existingUser = await prisma.user.findUnique({
					where: { email: currentSubmission.email },
				});

				if (existingUser) {
					// Link existing user to submission
					createdUser = existingUser;
				} else {
					// Generate password and create new PANITIA account
					generatedPassword = AuthUtils.generateRandomPassword(12);
					const passwordHash = await AuthUtils.hashPassword(generatedPassword);

					createdUser = await prisma.user.create({
						data: {
							email: currentSubmission.email,
							passwordHash,
							name: currentSubmission.namaPanitia,
							phone: currentSubmission.phone,
							role: "PANITIA",
							status: "ACTIVE",
							emailVerified: true,
						},
					});
				}
			}

			const submission = await prisma.eventSubmission.update({
				where: { id },
				data: {
					...(status && { status }),
					...(notes !== undefined && { notes }),
					...(createdUser && { createdUserId: createdUser.id }),
				},
			});

			res.json({
				message: "Submission updated",
				submission,
				...(createdUser && {
					createdAccount: {
						id: createdUser.id,
						email: createdUser.email,
						name: createdUser.name,
						role: createdUser.role,
						isExisting: !generatedPassword,
						...(generatedPassword && { generatedPassword }),
					},
				}),
			});
		} catch (error) {
			console.error("Error updating event submission:", error);
			res.status(500).json({ error: "Failed to update event submission" });
		}
	}
);

// ==========================================
// ADMIN: Delete submission
// ==========================================
router.delete(
	"/:id",
	authenticate,
	authorize("SUPERADMIN"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { id } = req.params;
			await prisma.eventSubmission.delete({ where: { id } });
			res.json({ message: "Submission deleted" });
		} catch (error) {
			console.error("Error deleting event submission:", error);
			res.status(500).json({ error: "Failed to delete event submission" });
		}
	}
);

export default router;
