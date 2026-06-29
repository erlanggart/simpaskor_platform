import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AuthUtils, JWTPayload } from "../utils/auth";
import { getClientIp } from "../utils/clientIp";

interface ReqWithUser extends Request {
	user?: JWTPayload;
}

// Cache token -> sessionId to avoid a DB lookup on every request
const tokenSessionCache = new Map<string, string>();

const resolveSessionId = async (token: string): Promise<string | undefined> => {
	const cached = tokenSessionCache.get(token);
	if (cached) return cached;
	try {
		const session = await prisma.userSession.findUnique({
			where: { token },
			select: { id: true },
		});
		if (session) {
			tokenSessionCache.set(token, session.id);
			return session.id;
		}
	} catch {
		// ignore
	}
	return undefined;
};

// Paths we never log (noise / handled elsewhere / self-referential)
const SKIP_PREFIXES = [
	"/api/auth/login",
	"/api/auth/logout",
	"/api/auth/location",
	"/api/activity",
	"/api/visitors",
];

const ACTION_BY_METHOD: Record<string, string> = {
	POST: "CREATE",
	PUT: "UPDATE",
	PATCH: "UPDATE",
	DELETE: "DELETE",
};

const VERB_LABEL: Record<string, string> = {
	POST: "Membuat",
	PUT: "Mengubah",
	PATCH: "Mengubah",
	DELETE: "Menghapus",
};

// Turn "/api/events/123/voting" -> "Membuat data events › voting"
const describe = (method: string, path: string): string => {
	const segments = path
		.replace(/^\/api\//, "")
		.split("/")
		.filter((s) => s && !/^[0-9a-fA-F-]{8,}$/.test(s) && !/^\d+$/.test(s));
	const resource = segments.join(" › ") || "data";
	return `${VERB_LABEL[method] || "Aksi"} ${resource}`;
};

// Logs mutating, authenticated API requests (fire-and-forget).
export const activityLogger = (
	req: ReqWithUser,
	res: Response,
	next: NextFunction
): void => {
	const method = req.method.toUpperCase();

	// Only log mutations
	const action = ACTION_BY_METHOD[method];
	if (!action) {
		return next();
	}

	const path = req.originalUrl.split("?")[0] ?? req.originalUrl;
	if (SKIP_PREFIXES.some((p) => path.startsWith(p))) {
		return next();
	}

	// Decode token (don't block the request if invalid)
	let user: JWTPayload | undefined = req.user;
	const authHeader = req.headers.authorization;
	let token: string | undefined;
	if (authHeader && authHeader.startsWith("Bearer ")) {
		token = authHeader.substring(7);
		if (!user) {
			try {
				user = AuthUtils.verifyToken(token);
			} catch {
				user = undefined;
			}
		}
	}

	if (!user) {
		return next();
	}

	const ipAddress = getClientIp(req);
	const userAgent = req.headers["user-agent"] || undefined;
	const loggedUser = user;
	const loggedToken = token;

	res.on("finish", () => {
		// Skip failed auth/permission noise
		if (res.statusCode === 401 || res.statusCode === 403) return;

		void (async () => {
			const sessionId = loggedToken
				? await resolveSessionId(loggedToken)
				: undefined;
			await prisma.activityLog
				.create({
					data: {
						userId: loggedUser.userId,
						sessionId,
						action,
						description: describe(method, path),
						method,
						path,
						statusCode: res.statusCode,
						ipAddress,
						userAgent: userAgent as string | undefined,
					},
				})
				.catch(() => {});
		})();
	});

	next();
};
