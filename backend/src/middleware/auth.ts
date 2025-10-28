import { Request, Response, NextFunction } from "express";
import { AuthUtils, JWTPayload } from "../utils/auth";
import { UserRole } from "@prisma/client";

export interface AuthenticatedRequest extends Request {
	user?: JWTPayload;
}

export const authenticate = (
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction
) => {
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
		next();
	} catch (error) {
		return res.status(401).json({
			error: "Access denied",
			message: "Invalid token",
		});
	}
};

export const authorize = (...allowedRoles: UserRole[]) => {
	return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

// Middleware untuk mengecek ownership atau admin
export const requireOwnershipOrAdmin = (
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction
) => {
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
