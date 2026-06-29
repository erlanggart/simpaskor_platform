import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import {
	authenticate,
	authorize,
	AuthenticatedRequest,
} from "../middleware/auth";
import { z } from "zod";
import { getClientIp } from "../utils/clientIp";

const router = Router();

// GET /api/activity/whoami - diagnostic: shows how the proxy chain reports the IP.
// Hit this from your phone (mobile data, outside the LAN) to see the real client IP.
router.get("/whoami", (req, res) => {
	res.json({
		resolvedClientIp: getClientIp(req),
		expressReqIp: req.ip,
		expressReqIps: req.ips, // full trusted chain Express parsed
		socketRemoteAddress: req.socket.remoteAddress,
		headers: {
			"x-real-ip": req.headers["x-real-ip"] || null,
			"x-forwarded-for": req.headers["x-forwarded-for"] || null,
			"x-forwarded-proto": req.headers["x-forwarded-proto"] || null,
		},
		trustProxySetting: req.app.get("trust proxy"),
	});
});

// POST /api/activity/page - record a client-side page view (any authenticated role)
const pageSchema = z.object({
	path: z.string().min(1).max(500),
	title: z.string().max(200).optional(),
});

router.post(
	"/page",
	authenticate,
	async (req: AuthenticatedRequest, res: Response): Promise<void | Response> => {
		try {
			const { path, title } = pageSchema.parse(req.body);
			const authHeader = req.headers.authorization || "";
			const token = authHeader.substring(7);
			const session = await prisma.userSession.findUnique({
				where: { token },
				select: { id: true },
			});

			await prisma.activityLog.create({
				data: {
					userId: req.user!.userId,
					sessionId: session?.id,
					action: "PAGE_VIEW",
					description: title ? `Buka halaman: ${title}` : `Buka ${path}`,
					method: "GET",
					path,
					statusCode: 200,
					ipAddress: getClientIp(req),
					userAgent: (req.headers["user-agent"] as string) || undefined,
				},
			});
			return res.json({ ok: true });
		} catch (error) {
			if (error instanceof z.ZodError) {
				return res
					.status(400)
					.json({ error: "Validation error", details: error.errors });
			}
			return res.status(500).json({ message: "Failed to log page view" });
		}
	}
);

// GET /api/activity - list activity logs (SUPERADMIN only)
router.get(
	"/",
	authenticate,
	authorize("SUPERADMIN"),
	async (req: AuthenticatedRequest, res: Response): Promise<void | Response> => {
		try {
			const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
			const limit = Math.min(
				100,
				Math.max(1, parseInt(String(req.query.limit || "50"), 10) || 50)
			);
			const skip = (page - 1) * limit;

			const userId = req.query.userId ? String(req.query.userId) : undefined;
			const action = req.query.action ? String(req.query.action) : undefined;
			const search = req.query.search ? String(req.query.search) : undefined;

			const where: any = {};
			if (userId) where.userId = userId;
			if (action) where.action = action;
			if (search) {
				where.OR = [
					{ description: { contains: search, mode: "insensitive" } },
					{ path: { contains: search, mode: "insensitive" } },
					{ user: { name: { contains: search, mode: "insensitive" } } },
					{ user: { email: { contains: search, mode: "insensitive" } } },
				];
			}

			const [logs, total] = await Promise.all([
				prisma.activityLog.findMany({
					where,
					orderBy: { createdAt: "desc" },
					skip,
					take: limit,
					include: {
						user: { select: { id: true, name: true, email: true, role: true } },
						session: {
							select: {
								deviceName: true,
								ipAddress: true,
								latitude: true,
								longitude: true,
								locationLabel: true,
								locationStatus: true,
							},
						},
					},
				}),
				prisma.activityLog.count({ where }),
			]);

			return res.json({
				logs,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			});
		} catch (error) {
			console.error("List activity error:", error);
			return res.status(500).json({ message: "Failed to load activity" });
		}
	}
);

// GET /api/activity/sessions - active sessions with location (SUPERADMIN only)
router.get(
	"/sessions",
	authenticate,
	authorize("SUPERADMIN"),
	async (_req: AuthenticatedRequest, res: Response): Promise<void | Response> => {
		try {
			const sessions = await prisma.userSession.findMany({
				where: { expiresAt: { gt: new Date() } },
				orderBy: { lastActive: "desc" },
				take: 200,
				include: {
					user: { select: { id: true, name: true, email: true, role: true } },
				},
			});
			return res.json({ sessions });
		} catch (error) {
			console.error("List sessions error:", error);
			return res.status(500).json({ message: "Failed to load sessions" });
		}
	}
);

export default router;
