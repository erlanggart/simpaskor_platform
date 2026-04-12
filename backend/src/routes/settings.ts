import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthUtils } from "../utils/auth";
import { authenticate, authorize, AuthenticatedRequest } from "../middleware/auth";
import { UserRole } from "@prisma/client";
import { z } from "zod";

const router = Router();

// All routes require SUPERADMIN
router.use(authenticate, authorize(UserRole.SUPERADMIN));

// ─── Change Password ─────────────────────────────────────────
const changePasswordSchema = z.object({
	currentPassword: z.string().min(1, "Current password is required"),
	newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

router.put(
	"/password",
	async (req: AuthenticatedRequest, res: Response): Promise<void | Response> => {
		try {
			const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

			const user = await prisma.user.findUnique({
				where: { id: req.user!.userId },
			});

			if (!user) {
				return res.status(404).json({ error: "User not found" });
			}

			const isValid = await AuthUtils.comparePassword(currentPassword, user.passwordHash);
			if (!isValid) {
				return res.status(400).json({ error: "Password lama salah" });
			}

			if (!AuthUtils.isValidPassword(newPassword)) {
				return res.status(400).json({
					error: "Password baru harus minimal 8 karakter, mengandung huruf dan angka",
				});
			}

			const passwordHash = await AuthUtils.hashPassword(newPassword);
			await prisma.user.update({
				where: { id: req.user!.userId },
				data: { passwordHash },
			});

			res.json({ message: "Password berhasil diubah" });
		} catch (error) {
			if (error instanceof z.ZodError) {
				return res.status(400).json({ error: "Validation error", details: error.errors });
			}
			console.error("Change password error:", error);
			res.status(500).json({ error: "Internal server error" });
		}
	}
);

// ─── Change Email ─────────────────────────────────────────────
const changeEmailSchema = z.object({
	newEmail: z.string().email("Invalid email format"),
	password: z.string().min(1, "Password is required for verification"),
});

router.put(
	"/email",
	async (req: AuthenticatedRequest, res: Response): Promise<void | Response> => {
		try {
			const { newEmail, password } = changeEmailSchema.parse(req.body);

			const user = await prisma.user.findUnique({
				where: { id: req.user!.userId },
			});

			if (!user) {
				return res.status(404).json({ error: "User not found" });
			}

			const isValid = await AuthUtils.comparePassword(password, user.passwordHash);
			if (!isValid) {
				return res.status(400).json({ error: "Password salah" });
			}

			// Check if email already taken
			const existing = await prisma.user.findUnique({
				where: { email: newEmail.trim().toLowerCase() },
			});
			if (existing && existing.id !== user.id) {
				return res.status(400).json({ error: "Email sudah digunakan akun lain" });
			}

			await prisma.user.update({
				where: { id: req.user!.userId },
				data: { email: newEmail.trim().toLowerCase() },
			});

			// Generate new token with updated email
			const token = AuthUtils.generateToken({
				userId: user.id,
				email: newEmail.trim().toLowerCase(),
				role: user.role,
				name: user.name,
			});

			res.json({
				message: "Email berhasil diubah",
				email: newEmail.trim().toLowerCase(),
				token,
			});
		} catch (error) {
			if (error instanceof z.ZodError) {
				return res.status(400).json({ error: "Validation error", details: error.errors });
			}
			console.error("Change email error:", error);
			res.status(500).json({ error: "Internal server error" });
		}
	}
);

// ─── Get Active Sessions / Devices ────────────────────────────
router.get(
	"/sessions",
	async (req: AuthenticatedRequest, res: Response): Promise<void | Response> => {
		try {
			const sessions = await prisma.userSession.findMany({
				where: {
					userId: req.user!.userId,
					expiresAt: { gt: new Date() },
				},
				select: {
					id: true,
					ipAddress: true,
					userAgent: true,
					deviceName: true,
					lastActive: true,
					createdAt: true,
				},
				orderBy: { lastActive: "desc" },
			});

			// Identify current session by matching token
			const currentToken = req.headers.authorization?.substring(7);
			let currentSessionId: string | null = null;

			if (currentToken) {
				const currentSession = await prisma.userSession.findUnique({
					where: { token: currentToken },
					select: { id: true },
				});
				currentSessionId = currentSession?.id || null;
			}

			const sessionsWithCurrent = sessions.map((s) => ({
				...s,
				isCurrent: s.id === currentSessionId,
			}));

			res.json({ sessions: sessionsWithCurrent });
		} catch (error) {
			console.error("Get sessions error:", error);
			res.status(500).json({ error: "Internal server error" });
		}
	}
);

// ─── Revoke a Session (Force Logout) ──────────────────────────
router.delete(
	"/sessions/:sessionId",
	async (req: AuthenticatedRequest, res: Response): Promise<void | Response> => {
		try {
			const { sessionId } = req.params;

			const session = await prisma.userSession.findFirst({
				where: {
					id: sessionId,
					userId: req.user!.userId,
				},
			});

			if (!session) {
				return res.status(404).json({ error: "Session not found" });
			}

			await prisma.userSession.delete({ where: { id: sessionId } });

			res.json({ message: "Device berhasil di-logout" });
		} catch (error) {
			console.error("Revoke session error:", error);
			res.status(500).json({ error: "Internal server error" });
		}
	}
);

// ─── Revoke All Other Sessions ────────────────────────────────
router.delete(
	"/sessions",
	async (req: AuthenticatedRequest, res: Response): Promise<void | Response> => {
		try {
			const currentToken = req.headers.authorization?.substring(7);

			await prisma.userSession.deleteMany({
				where: {
					userId: req.user!.userId,
					token: { not: currentToken || "" },
				},
			});

			res.json({ message: "Semua device lain berhasil di-logout" });
		} catch (error) {
			console.error("Revoke all sessions error:", error);
			res.status(500).json({ error: "Internal server error" });
		}
	}
);

export default router;
