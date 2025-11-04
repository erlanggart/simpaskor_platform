import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthUtils } from "../utils/auth";
import { UserRole, UserStatus } from "@prisma/client";
import { z } from "zod";

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

// Register endpoint
router.post(
	"/register",
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
