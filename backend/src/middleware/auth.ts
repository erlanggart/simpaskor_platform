import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AuthUtils, JWTPayload } from "../utils/auth";
import { UserRole } from "@prisma/client";

const PRESENCE_HEARTBEAT_MS = 60 * 1000;
const presenceHeartbeatCache = new Map<string, number>();

const touchUserPresence = (userId: string) => {
	const now = Date.now();
	const lastHeartbeat = presenceHeartbeatCache.get(userId) || 0;

	if (now - lastHeartbeat < PRESENCE_HEARTBEAT_MS) {
		return;
	}

	presenceHeartbeatCache.set(userId, now);

	void prisma.user
		.update({
			where: { id: userId },
			data: { lastLogin: new Date(now) },
		})
		.catch(() => {
			presenceHeartbeatCache.delete(userId);
		});
};

// Update session lastActive timestamp
const sessionHeartbeatCache = new Map<string, number>();

const touchSessionPresence = (token: string) => {
	const now = Date.now();
	const lastHeartbeat = sessionHeartbeatCache.get(token) || 0;

	if (now - lastHeartbeat < PRESENCE_HEARTBEAT_MS) {
		return;
	}

	sessionHeartbeatCache.set(token, now);

	void prisma.userSession
		.update({
			where: { token },
			data: { lastActive: new Date(now) },
		})
		.catch(() => {
			sessionHeartbeatCache.delete(token);
		});
};

export interface AuthenticatedRequest extends Request {
	user?: JWTPayload;
}

export const authenticate = (
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction
): Response | void => {
	try {
		const authHeader = req.headers.authorization;

		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return res.status(401).json({
				error: "Access denied",
				message: "No token provided",
			});
		}

		const token = authHeader.substring(7);
		const decoded = AuthUtils.verifyToken(token);

		req.user = decoded;
		touchUserPresence(decoded.userId);
		touchSessionPresence(token);
		next();
	} catch (error) {
		return res.status(401).json({
			error: "Access denied",
			message: "Invalid token",
		});
	}
};

// Optional authentication - doesn't fail if no token, but sets user if valid token exists
export const optionalAuthenticate = (
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction
): void => {
	try {
		const authHeader = req.headers.authorization;

		if (authHeader && authHeader.startsWith("Bearer ")) {
			const token = authHeader.substring(7);
			const decoded = AuthUtils.verifyToken(token);
			req.user = decoded;
			touchUserPresence(decoded.userId);
		}
	} catch (error) {
		// Silently ignore invalid tokens for optional auth
	}
	next();
};

export const authorize = (...allowedRoles: UserRole[]) => {
	return (
		req: AuthenticatedRequest,
		res: Response,
		next: NextFunction
	): Response | void => {
		if (!req.user) {
			return res.status(401).json({
				error: "Access denied",
				message: "Authentication required",
			});
		}

		const userRole = req.user.role as UserRole;
		const hasPermission = allowedRoles.some((role) => role === userRole);

		if (!hasPermission) {
			return res.status(403).json({
				error: "Forbidden",
				message: "Insufficient permissions",
			});
		}

		next();
	};
};

// Middleware khusus untuk role-based access
export const requireSuperAdmin = authorize(UserRole.SUPERADMIN);
export const requirePanitia = authorize(UserRole.SUPERADMIN, UserRole.PANITIA);
export const requireJuri = authorize(
	UserRole.SUPERADMIN,
	UserRole.PANITIA,
	UserRole.JURI
);
export const requirePelatih = authorize(
	UserRole.SUPERADMIN,
	UserRole.PANITIA,
	UserRole.PELATIH
);
export const requirePeserta = authorize(
	UserRole.SUPERADMIN,
	UserRole.PANITIA,
	UserRole.PESERTA
);
export const requireMitra = authorize(UserRole.SUPERADMIN, UserRole.MITRA);

// Middleware untuk mengecek ownership atau admin
export const requireOwnershipOrAdmin = (
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction
): Response | void => {
	if (!req.user) {
		return res.status(401).json({
			error: "Access denied",
			message: "Authentication required",
		});
	}

	const resourceUserId = req.params.userId || req.body.userId;
	const isOwner = req.user.userId === resourceUserId;
	const isAdmin =
		req.user.role === UserRole.SUPERADMIN || req.user.role === UserRole.PANITIA;

	if (!isOwner && !isAdmin) {
		return res.status(403).json({
			error: "Forbidden",
			message: "You can only access your own resources",
		});
	}

	next();
};
