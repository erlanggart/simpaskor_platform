import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export interface JWTPayload {
	userId: string;
	email: string;
	role: UserRole;
	name: string;
}

export class AuthUtils {
	static async hashPassword(password: string): Promise<string> {
		const saltRounds = 12;
		return bcrypt.hash(password, saltRounds);
	}

	static async comparePassword(
		password: string,
		hashedPassword: string
	): Promise<boolean> {
		return bcrypt.compare(password, hashedPassword);
	}

	static generateToken(payload: JWTPayload): string {
		return jwt.sign(payload, JWT_SECRET, {
			expiresIn: JWT_EXPIRES_IN,
			issuer: "simpaskor-platform",
			audience: "simpaskor-users",
		} as jwt.SignOptions);
	}

	static verifyToken(token: string): JWTPayload {
		try {
			return jwt.verify(token, JWT_SECRET, {
				issuer: "simpaskor-platform",
				audience: "simpaskor-users",
			} as jwt.VerifyOptions) as JWTPayload;
		} catch (error) {
			throw new Error("Invalid or expired token");
		}
	}

	static generateRandomPassword(length: number = 12): string {
		const charset =
			"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
		let password = "";
		for (let i = 0; i < length; i++) {
			password += charset.charAt(Math.floor(Math.random() * charset.length));
		}
		return password;
	}

	static isValidEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}

	static isValidPassword(password: string): boolean {
		// Minimal 8 karakter, harus ada huruf dan angka
		const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
		return passwordRegex.test(password);
	}

	static sanitizeUser(user: any) {
		const { passwordHash, ...sanitizedUser } = user;
		return sanitizedUser;
	}
}
