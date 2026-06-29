import type { Request } from "express";
import { prisma } from "./prisma";
import { getClientIp } from "../utils/clientIp";

type ReqWithUser = Request & { user?: { userId: string } };

// Fire-and-forget — never block the request, never throw on logging failure.
// ActivityLog.userId is required (FK), so events without a known user are skipped.

export const logAccessDenied = (req: ReqWithUser, reason: string): void => {
	const userId = req.user?.userId;
	if (!userId) return;
	const path = (req.originalUrl || "").split("?")[0];
	void prisma.activityLog
		.create({
			data: {
				userId,
				action: "ACCESS_DENIED",
				description: reason,
				method: req.method,
				path,
				statusCode: 403,
				ipAddress: getClientIp(req),
				userAgent: (req.headers["user-agent"] as string) || undefined,
			},
		})
		.catch(() => {});
};

export const logFailedLogin = (
	req: Request,
	userId: string,
	email: string
): void => {
	void prisma.activityLog
		.create({
			data: {
				userId,
				action: "FAILED_LOGIN",
				description: `Login gagal: password salah (${email})`,
				method: "POST",
				path: "/api/auth/login",
				statusCode: 401,
				ipAddress: getClientIp(req),
				userAgent: (req.headers["user-agent"] as string) || undefined,
			},
		})
		.catch(() => {});
};
