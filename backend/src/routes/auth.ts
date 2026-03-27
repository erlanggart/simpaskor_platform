import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthUtils } from "../utils/auth";
import { UserRole, UserStatus } from "@prisma/client";
import { z } from "zod";
import crypto from "crypto";
import { registrationLimiter } from "../middleware/rateLimiter";
import { verifyRecaptcha } from "../middleware/recaptcha";
import { GoogleAuthUtils } from "../utils/googleAuth";

const router = Router();

// Validation schemas
const registerSchema = z.object({
	email: z.string().email("Invalid email format"),
	password: z.string().min(8, "Password must be at least 8 characters"),
	name: z.string().min(1, "Name is required"),
	role: z
		.enum(["PESERTA", "PELATIH", "JURI", "PANITIA"])
		.optional()
		.default("PESERTA"),
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

// Register endpoint
// Protected by rate limiting (3 attempts per hour per IP) and reCAPTCHA v3
router.post(
	"/register",
	registrationLimiter, // Apply rate limiting
	verifyRecaptcha, // Verify reCAPTCHA token
	async (req: Request, res: Response): Promise<void | Response> => {
		try {
			const validatedData = registerSchema.parse(req.body);

			// Check if user already exists
			const existingUser = await prisma.user.findUnique({
				where: { email: validatedData.email },
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
					email: validatedData.email,
					passwordHash,
					name: validatedData.name,
					role: validatedData.role as UserRole,
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
	async (req: Request, res: Response): Promise<void | Response> => {
		try {
			const validatedData = loginSchema.parse(req.body);

			// Find user by email
			const user = await prisma.user.findUnique({
				where: { email: validatedData.email },
				include: {
					profile: true,
				},
			});

			if (!user) {
				return res.status(401).json({
					error: "Login failed",
					message: "Invalid email or password",
				});
			}

			// Check password
			const isPasswordValid = await AuthUtils.comparePassword(
				validatedData.password,
				user.passwordHash
			);

			if (!isPasswordValid) {
				return res.status(401).json({
					error: "Login failed",
					message: "Invalid email or password",
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
	async (_req: Request, res: Response): Promise<void | Response> => {
		// In a real app, you might want to blacklist the token
		res.json({
			message: "Logout successful",
		});
	}
);

// Forgot Password - Request reset token
router.post(
	"/forgot-password",
	async (req: Request, res: Response): Promise<void | Response> => {
		try {
			const validatedData = forgotPasswordSchema.parse(req.body);

			// Find user by email
			const user = await prisma.user.findUnique({
				where: { email: validatedData.email },
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

			// In production, send email here
			// For now, we'll return the token in response (ONLY FOR DEVELOPMENT)
			console.log("Reset token for", user.email, ":", resetToken);
			console.log(
				"Reset link: http://localhost:5173/reset-password?token=" + resetToken
			);

			res.json({
				message: "If the email exists, a reset link has been sent",
				// Remove this in production:
				devToken: resetToken,
				devLink: `http://localhost:5173/reset-password?token=${resetToken}`,
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
