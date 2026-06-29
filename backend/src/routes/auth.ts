import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthUtils } from "../utils/auth";
import { UserRole, UserStatus } from "@prisma/client";
import { z } from "zod";
import crypto from "crypto";
import {
	registrationLimiter,
	loginLimiter,
	verificationLimiter,
	passwordResetLimiter,
} from "../middleware/rateLimiter";
import { verifyRecaptcha } from "../middleware/recaptcha";
import { GoogleAuthUtils } from "../utils/googleAuth";
import {
	authenticate,
	optionalAuthenticate,
	AuthenticatedRequest,
} from "../middleware/auth";
import { sendPasswordResetEmail, sendVerificationEmail } from "../utils/email";
import { getClientIp } from "../utils/clientIp";
import { logFailedLogin } from "../lib/securityLog";

const router = Router();

// Parse user agent to friendly device name
function parseDeviceName(ua: string): string {
	let browser = "Unknown Browser";
	let os = "Unknown OS";

	if (ua.includes("Firefox")) browser = "Firefox";
	else if (ua.includes("Edg/")) browser = "Edge";
	else if (ua.includes("Chrome")) browser = "Chrome";
	else if (ua.includes("Safari")) browser = "Safari";
	else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";

	if (ua.includes("Windows")) os = "Windows";
	else if (ua.includes("Mac OS")) os = "macOS";
	else if (ua.includes("Linux")) os = "Linux";
	else if (ua.includes("Android")) os = "Android";
	else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

	return `${browser} on ${os}`;
}

// Validation schemas
const registerSchema = z.object({
	email: z.string().email("Invalid email format"),
	password: z.string().min(8, "Password must be at least 8 characters"),
	name: z.string().min(1, "Name is required"),
	phone: z.string().optional(),
	institution: z.string().optional(),
});

const loginSchema = z.object({
	email: z.string().email("Invalid email format"),
	password: z.string().min(1, "Password is required"),
});

const forgotPasswordSchema = z.object({
	email: z.string().email("Invalid email format"),
});

const resetPasswordSchema = z.object({
	token: z.string().min(1, "Token is required"),
	newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

const generateMitraReferralCode = async (name: string) => {
	const initials = name
		.trim()
		.split(/\s+/)
		.map((part) => part[0])
		.join("")
		.slice(0, 4)
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, "") || "MTR";

	for (let attempt = 0; attempt < 8; attempt += 1) {
		const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
		const code = `MTR-${initials}-${suffix}`;
		const existing = await prisma.mitraProfile.findUnique({
			where: { referralCode: code },
			select: { id: true },
		});

		if (!existing) return code;
	}

	return `MTR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
};

// Generate a fresh email-verification token, store its hash on the user, and
// send the verification link. Returns nothing — email failures are logged but
// don't block the caller (the user can resend).
const issueVerificationEmail = async (
	userId: string,
	email: string,
	name: string
): Promise<void> => {
	const rawToken = crypto.randomBytes(32).toString("hex");
	const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
	const expiry = new Date(Date.now() + 24 * 3600000); // 24 hours

	await prisma.user.update({
		where: { id: userId },
		data: { verifyToken: tokenHash, verifyTokenExpiry: expiry },
	});

	try {
		await sendVerificationEmail(email, name, rawToken, userId);
	} catch (emailError) {
		console.error("Failed to send verification email:", emailError);
	}
};

// Register endpoint
// Protected by rate limiting (3 attempts per hour per IP) and reCAPTCHA v3
router.post(
	"/register",
	registrationLimiter, // Apply rate limiting
	verifyRecaptcha, // Verify reCAPTCHA token
	async (req: Request, res: Response): Promise<void | Response> => {
		try {
			const validatedData = registerSchema.parse(req.body);
			const normalizedEmail = validatedData.email.trim().toLowerCase();

			// Check if user already exists
			const existingUser = await prisma.user.findUnique({
				where: { email: normalizedEmail },
			});

			if (existingUser) {
				return res.status(400).json({
					error: "Registration failed",
					message: "User with this email already exists",
				});
			}

			// Hash password
			const passwordHash = await AuthUtils.hashPassword(validatedData.password);

			// Create user with profile
			const user = await prisma.user.create({
				data: {
					email: normalizedEmail,
					passwordHash,
					name: validatedData.name,
					role: UserRole.PESERTA,
					phone: validatedData.phone,
					status: UserStatus.PENDING,
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

			// Generate token
			const token = AuthUtils.generateToken({
				userId: user.id,
				email: user.email,
				role: user.role,
				name: user.name,
			});

			res.status(201).json({
				message: "Registration successful",
				user: AuthUtils.sanitizeUser(user),
				token,
			});
		} catch (error) {
			if (error instanceof z.ZodError) {
				return res.status(400).json({
					error: "Validation error",
					details: error.errors,
				});
			}

			console.error("Registration error:", error);
			res.status(500).json({
				error: "Registration failed",
				message: "Internal server error",
			});
		}
	}
);

// Google OAuth endpoint
// Verify Google ID token and create/login user
router.post(
	"/google",
	async (req: Request, res: Response): Promise<void | Response> => {
		try {
			const { credential } = req.body;

			if (!credential) {
				return res.status(400).json({
					error: "Google authentication failed",
					message: "No credential provided",
				});
			}

			// Verify Google token and get user info
			const googleUser = await GoogleAuthUtils.verifyGoogleToken(credential);

			// Find or create user
			const { user, token, isNewUser } = await GoogleAuthUtils.findOrCreateGoogleUser(
				googleUser
			);

			res.json({
				message: isNewUser
					? "Berhasil mendaftar dengan Google"
					: "Google authentication successful",
				user,
				token,
				isNewUser,
			});
		} catch (error: any) {
			console.error("Google authentication error:", error);
			res.status(500).json({
				error: "Google authentication failed",
				message: error.message || "Internal server error",
			});
		}
	}
);

// Login endpoint
router.post(
	"/login",
	loginLimiter,
	async (req: Request, res: Response): Promise<void | Response> => {
		try {
			const validatedData = loginSchema.parse(req.body);
			const normalizedEmail = validatedData.email.trim().toLowerCase();

			// Find user by email
			const user = await prisma.user.findUnique({
				where: { email: normalizedEmail },
				include: {
					profile: true,
				},
			});

			if (!user) {
				return res.status(401).json({
					error: "Login failed",
					message: "Email salah atau belum terdaftar",
					field: "email",
				});
			}

			// Check password
			const isPasswordValid = await AuthUtils.comparePassword(
				validatedData.password,
				user.passwordHash
			);

			if (!isPasswordValid) {
				logFailedLogin(req, user.id, user.email);
				return res.status(401).json({
					error: "Login failed",
					message: "Password salah",
					field: "password",
				});
			}

			// Check if user is active
			if (
				user.status !== UserStatus.ACTIVE &&
				user.status !== UserStatus.PENDING
			) {
				return res.status(403).json({
					error: "Login failed",
					message: "Account is suspended or inactive",
				});
			}

			// Update last login
			await prisma.user.update({
				where: { id: user.id },
				data: { lastLogin: new Date() },
			});

			// Generate token
			const token = AuthUtils.generateToken({
				userId: user.id,
				email: user.email,
				role: user.role,
				name: user.name,
			});

			// Store session with device info
			const userAgentStr = req.headers["user-agent"] || "Unknown";
			const ipAddress = getClientIp(req) || "Unknown";
			const deviceName = parseDeviceName(userAgentStr);

			const expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + 7);

			const session = await prisma.userSession.create({
				data: {
					userId: user.id,
					token,
					ipAddress,
					userAgent: userAgentStr,
					deviceName,
					expiresAt,
				},
			});

			// Record login activity (fire-and-forget)
			void prisma.activityLog
				.create({
					data: {
						userId: user.id,
						sessionId: session.id,
						action: "LOGIN",
						description: `Login sebagai ${user.role}`,
						method: "POST",
						path: "/api/auth/login",
						statusCode: 200,
						ipAddress,
						userAgent: userAgentStr,
					},
				})
				.catch(() => {});

			res.json({
				message: "Login successful",
				user: AuthUtils.sanitizeUser(user),
				token,
			});
		} catch (error) {
			if (error instanceof z.ZodError) {
				return res.status(400).json({
					error: "Validation error",
					details: error.errors,
				});
			}

			console.error("Login error:", error);
			res.status(500).json({
				error: "Login failed",
				message: "Internal server error",
			});
		}
	}
);

// Logout endpoint (optional - for token blacklisting)
router.post(
	"/logout",
	optionalAuthenticate,
	async (req: AuthenticatedRequest, res: Response): Promise<void | Response> => {
		try {
			const authHeader = req.headers.authorization || "";
			const token = authHeader.substring(7);
			if (req.user) {
				const session = await prisma.userSession.findUnique({
					where: { token },
					select: { id: true },
				});
				void prisma.activityLog
					.create({
						data: {
							userId: req.user.userId,
							sessionId: session?.id,
							action: "LOGOUT",
							description: "Logout",
							method: "POST",
							path: "/api/auth/logout",
							statusCode: 200,
						},
					})
					.catch(() => {});
			}
		} catch {
			// ignore
		}
		res.json({
			message: "Logout successful",
		});
	}
);

// Reverse geocode coordinates to a human-readable place name (best-effort)
async function reverseGeocode(
	lat: number,
	lng: number
): Promise<string | null> {
	try {
		const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=14&accept-language=id`;
		const resp = await fetch(url, {
			headers: { "User-Agent": "simpaskor-platform/1.0" },
		});
		if (!resp.ok) return null;
		const data: any = await resp.json();
		return data?.display_name || null;
	} catch {
		return null;
	}
}

const locationSchema = z.object({
	latitude: z.number().min(-90).max(90).optional(),
	longitude: z.number().min(-180).max(180).optional(),
	accuracy: z.number().optional(),
	status: z.enum(["GRANTED", "DENIED"]).default("GRANTED"),
});

// Save geolocation for the current session (mandatory location gate)
router.post(
	"/location",
	authenticate,
	async (req: AuthenticatedRequest, res: Response): Promise<void | Response> => {
		try {
			const data = locationSchema.parse(req.body);
			const authHeader = req.headers.authorization || "";
			const token = authHeader.substring(7);

			const session = await prisma.userSession.findUnique({
				where: { token },
				select: { id: true },
			});
			if (!session) {
				return res.status(404).json({ message: "Session not found" });
			}

			let locationLabel: string | null = null;
			if (
				data.status === "GRANTED" &&
				typeof data.latitude === "number" &&
				typeof data.longitude === "number"
			) {
				locationLabel = await reverseGeocode(data.latitude, data.longitude);
			}

			await prisma.userSession.update({
				where: { id: session.id },
				data: {
					latitude: data.latitude ?? null,
					longitude: data.longitude ?? null,
					accuracy: data.accuracy ?? null,
					locationLabel,
					locationStatus: data.status,
					locationAt: new Date(),
				},
			});

			void prisma.activityLog
				.create({
					data: {
						userId: req.user!.userId,
						sessionId: session.id,
						action: "OTHER",
						description:
							data.status === "GRANTED"
								? `Mengaktifkan lokasi${
										locationLabel ? `: ${locationLabel}` : ""
								  }`
								: "Menolak izin lokasi",
						method: "POST",
						path: "/api/auth/location",
						statusCode: 200,
					},
				})
				.catch(() => {});

			return res.json({ message: "Location saved", locationLabel });
		} catch (error) {
			if (error instanceof z.ZodError) {
				return res
					.status(400)
					.json({ error: "Validation error", details: error.errors });
			}
			console.error("Save location error:", error);
			return res.status(500).json({ message: "Failed to save location" });
		}
	}
);

// Forgot Password - Request reset token
router.post(
	"/forgot-password",
	loginLimiter,
	passwordResetLimiter,
	async (req: Request, res: Response): Promise<void | Response> => {
		try {
			const validatedData = forgotPasswordSchema.parse(req.body);
			const normalizedEmail = validatedData.email.trim().toLowerCase();

			// Find user by email
			const user = await prisma.user.findUnique({
				where: { email: normalizedEmail },
			});

			// Always return success to prevent email enumeration
			if (!user) {
				return res.json({
					message: "If the email exists, a reset link has been sent",
				});
			}

			// Generate reset token
			const resetToken = crypto.randomBytes(32).toString("hex");
			const resetTokenHash = crypto
				.createHash("sha256")
				.update(resetToken)
				.digest("hex");
			const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

			// Save token to user
			await prisma.user.update({
				where: { id: user.id },
				data: {
					resetToken: resetTokenHash,
					resetTokenExpiry: resetTokenExpiry,
				},
			});

			// Send password reset email
			try {
				await sendPasswordResetEmail(user.email, user.name, resetToken, user.id);
			} catch (emailError) {
				console.error("Failed to send password reset email:", emailError);
				// Don't expose email errors to client, but log for debugging
			}

			res.json({
				message: "If the email exists, a reset link has been sent",
			});
		} catch (error) {
			if (error instanceof z.ZodError) {
				return res.status(400).json({
					error: "Validation error",
					details: error.errors,
				});
			}

			console.error("Forgot password error:", error);
			res.status(500).json({
				error: "Request failed",
				message: "Internal server error",
			});
		}
	}
);

// Reset Password - Verify token and update password
router.post(
	"/reset-password",
	loginLimiter,
	async (req: Request, res: Response): Promise<void | Response> => {
		try {
			const validatedData = resetPasswordSchema.parse(req.body);

			// Hash the provided token to compare with stored hash
			const resetTokenHash = crypto
				.createHash("sha256")
				.update(validatedData.token)
				.digest("hex");

			// Find user with valid token
			const user = await prisma.user.findFirst({
				where: {
					resetToken: resetTokenHash,
					resetTokenExpiry: {
						gte: new Date(), // Token not expired
					},
				},
			});

			if (!user) {
				return res.status(400).json({
					error: "Invalid or expired reset token",
					message: "Please request a new password reset link",
				});
			}

			// Hash new password
			const passwordHash = await AuthUtils.hashPassword(
				validatedData.newPassword
			);

			// Update password and clear reset token
			await prisma.user.update({
				where: { id: user.id },
				data: {
					passwordHash: passwordHash,
					resetToken: null,
					resetTokenExpiry: null,
				},
			});

			res.json({
				message: "Password successfully reset",
			});
		} catch (error) {
			if (error instanceof z.ZodError) {
				return res.status(400).json({
					error: "Validation error",
					details: error.errors,
				});
			}

			console.error("Reset password error:", error);
			res.status(500).json({
				error: "Reset failed",
				message: "Internal server error",
			});
		}
	}
);

// Select role for new users (status PENDING)
router.patch(
	"/select-role",
	verificationLimiter,
	authenticate,
	async (req: AuthenticatedRequest, res: Response): Promise<void | Response> => {
		try {
			const schema = z.object({
				role: z.enum(["PESERTA", "JURI", "PELATIH", "PANITIA", "MITRA"]),
			});

			const { role } = schema.parse(req.body);
			const userId = req.user?.userId;

			if (!userId) {
				return res.status(401).json({ error: "Unauthorized" });
			}

			const user = await prisma.user.findUnique({
				where: { id: userId },
			});

			if (!user) {
				return res.status(404).json({ error: "User not found" });
			}

			if (user.status !== UserStatus.PENDING) {
				return res.status(400).json({
					error: "Role already selected",
					message: "Anda sudah memilih role sebelumnya",
				});
			}

			// PESERTA can enter directly; every other role must confirm their
			// email first to keep fake accounts out of the panel/jury/payout flows.
			const needsVerification = role !== "PESERTA";

			const updatedUser = await prisma.$transaction(async (tx) => {
				const nextUser = await tx.user.update({
					where: { id: userId },
					data: {
						role: role as UserRole,
						status: UserStatus.ACTIVE,
						// Peserta needs no verification — mark it so the gate skips them.
						emailVerified: needsVerification ? false : true,
					},
					include: { profile: true, mitraProfile: true },
				});

				if (role === "MITRA" && !nextUser.mitraProfile) {
					const referralCode = await generateMitraReferralCode(nextUser.name);
					return tx.user.update({
						where: { id: userId },
						data: {
							mitraProfile: {
								create: {
									referralCode,
								},
							},
						},
						include: { profile: true, mitraProfile: true },
					});
				}

				return nextUser;
			});

			if (needsVerification) {
				await issueVerificationEmail(
					updatedUser.id,
					updatedUser.email,
					updatedUser.name
				);
			}

			// Generate new token with updated role
			const token = AuthUtils.generateToken({
				userId: updatedUser.id,
				email: updatedUser.email,
				role: updatedUser.role,
				name: updatedUser.name,
			});

			res.json({
				message: needsVerification
					? "Role berhasil dipilih. Cek email untuk verifikasi."
					: "Role berhasil dipilih",
				needsVerification,
				user: AuthUtils.sanitizeUser(updatedUser),
				token,
			});
		} catch (error) {
			if (error instanceof z.ZodError) {
				return res.status(400).json({
					error: "Validation error",
					details: error.errors,
				});
			}
			console.error("Select role error:", error);
			res.status(500).json({ error: "Internal server error" });
		}
	}
);

// Verify email — token comes from the link in the verification email.
// No auth required: the token itself is the proof, so the link works from any
// browser/device the user opens it in.
router.post(
	"/verify-email",
	async (req: Request, res: Response): Promise<void | Response> => {
		try {
			const { token } = z.object({ token: z.string().min(1) }).parse(req.body);

			const tokenHash = crypto
				.createHash("sha256")
				.update(token)
				.digest("hex");

			const user = await prisma.user.findFirst({
				where: {
					verifyToken: tokenHash,
					verifyTokenExpiry: { gte: new Date() },
				},
				include: { profile: true },
			});

			if (!user) {
				return res.status(400).json({
					error: "Invalid or expired verification token",
					message: "Link verifikasi tidak valid atau sudah kedaluwarsa.",
				});
			}

			const updatedUser = await prisma.user.update({
				where: { id: user.id },
				data: {
					emailVerified: true,
					verifyToken: null,
					verifyTokenExpiry: null,
				},
				include: { profile: true },
			});

			// Fresh token so the frontend immediately sees the verified user.
			const newToken = AuthUtils.generateToken({
				userId: updatedUser.id,
				email: updatedUser.email,
				role: updatedUser.role,
				name: updatedUser.name,
			});

			res.json({
				message: "Email berhasil diverifikasi",
				user: AuthUtils.sanitizeUser(updatedUser),
				token: newToken,
			});
		} catch (error) {
			if (error instanceof z.ZodError) {
				return res
					.status(400)
					.json({ error: "Validation error", details: error.errors });
			}
			console.error("Verify email error:", error);
			res.status(500).json({ error: "Internal server error" });
		}
	}
);

// Resend the verification email for the logged-in (still-unverified) user.
router.post(
	"/resend-verification",
	verificationLimiter,
	authenticate,
	async (req: AuthenticatedRequest, res: Response): Promise<void | Response> => {
		try {
			const userId = req.user?.userId;
			if (!userId) {
				return res.status(401).json({ error: "Unauthorized" });
			}

			const user = await prisma.user.findUnique({ where: { id: userId } });
			if (!user) {
				return res.status(404).json({ error: "User not found" });
			}

			if (user.emailVerified) {
				return res.json({ message: "Email sudah terverifikasi" });
			}

			await issueVerificationEmail(user.id, user.email, user.name);

			res.json({ message: "Email verifikasi telah dikirim ulang" });
		} catch (error) {
			console.error("Resend verification error:", error);
			res.status(500).json({ error: "Internal server error" });
		}
	}
);

// Get current user profile
router.get(
	"/me",
	async (_req: Request, res: Response): Promise<void | Response> => {
		// This will be implemented with middleware later
		res.json({
			message: "Profile endpoint - requires authentication middleware",
		});
	}
);

export default router;
