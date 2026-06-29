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
			const role = req.query.role ? String(req.query.role) : undefined;
			const search = req.query.search ? String(req.query.search) : undefined;

			const where: any = {};
			if (userId) where.userId = userId;
			if (action) where.action = action;
			if (role) where.user = { role };
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

// GET /api/activity/users - users that have activity, grouped with counts (SUPERADMIN only)
router.get(
	"/users",
	authenticate,
	authorize("SUPERADMIN"),
	async (req: AuthenticatedRequest, res: Response): Promise<void | Response> => {
		try {
			const role = req.query.role ? String(req.query.role) : undefined;

			const grouped = await prisma.activityLog.groupBy({
				by: ["userId"],
				_count: { _all: true },
				_max: { createdAt: true },
			});

			const userIds = grouped.map((g) => g.userId);
			const users = await prisma.user.findMany({
				where: { id: { in: userIds }, ...(role ? { role: role as any } : {}) },
				select: { id: true, name: true, email: true, role: true },
			});
			const userMap = new Map(users.map((u) => [u.id, u]));

			const list = grouped
				.filter((g) => userMap.has(g.userId))
				.map((g) => ({
					...userMap.get(g.userId)!,
					count: g._count._all,
					lastActive: g._max.createdAt,
				}))
				.sort(
					(a, b) =>
						new Date(b.lastActive ?? 0).getTime() -
						new Date(a.lastActive ?? 0).getTime()
				);

			return res.json({ users: list });
		} catch (error) {
			console.error("List activity users error:", error);
			return res.status(500).json({ message: "Failed to load users" });
		}
	}
);

// GET /api/activity/users/:userId - full per-user monitoring detail (SUPERADMIN only)
router.get(
	"/users/:userId",
	authenticate,
	authorize("SUPERADMIN"),
	async (req: AuthenticatedRequest, res: Response): Promise<void | Response> => {
		try {
			const userId = String(req.params.userId);
			const user = await prisma.user.findUnique({
				where: { id: userId },
				select: {
					id: true,
					name: true,
					email: true,
					role: true,
					status: true,
					lastLogin: true,
					createdAt: true,
				},
			});
			if (!user) {
				return res.status(404).json({ message: "User not found" });
			}

			const since30d = new Date(Date.now() - 30 * 86_400_000);
			const [logs, sessions, failedLogins, accessDenied] = await Promise.all([
				prisma.activityLog.findMany({
					where: { userId },
					orderBy: { createdAt: "desc" },
					take: 100,
					include: {
						session: {
							select: {
								deviceName: true,
								ipAddress: true,
								latitude: true,
								longitude: true,
								locationLabel: true,
							},
						},
					},
				}),
				prisma.userSession.findMany({
					where: { userId, createdAt: { gte: since30d } },
					orderBy: { lastActive: "desc" },
					take: 50,
				}),
				prisma.activityLog.findMany({
					where: { userId, action: "FAILED_LOGIN" },
					orderBy: { createdAt: "desc" },
					take: 30,
				}),
				prisma.activityLog.findMany({
					where: { userId, action: "ACCESS_DENIED" },
					orderBy: { createdAt: "desc" },
					take: 30,
				}),
			]);

			return res.json({
				user,
				logs,
				sessions,
				security: { failedLogins, accessDenied },
			});
		} catch (error) {
			console.error("User detail error:", error);
			return res.status(500).json({ message: "Failed to load user detail" });
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

// ---- Security monitoring (SUPERADMIN only) ----

const userSelect = {
	select: { id: true, name: true, email: true, role: true },
} as const;

// Great-circle distance in km between two coordinates.
const haversineKm = (
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number
): number => {
	const R = 6371;
	const toRad = (d: number) => (d * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(a));
};

// ponytail: heuristic thresholds — tune if they flag too much/little
const TRAVEL_MIN_KM = 100; // ignore short hops (GPS jitter)
const TRAVEL_MAX_KMH = 700; // faster than a commercial flight => impossible
const MULTI_IP_MIN = 3; // distinct IPs in 24h to flag
const MASS_DELETE_MIN = 10; // deletes per user in 24h to flag

router.get(
	"/security",
	authenticate,
	authorize("SUPERADMIN"),
	async (_req: AuthenticatedRequest, res: Response): Promise<void | Response> => {
		try {
			const now = Date.now();
			const since7d = new Date(now - 7 * 86_400_000);
			const since24h = new Date(now - 86_400_000);
			const since30d = new Date(now - 30 * 86_400_000);

			const [failedLogins, accessDenied, sessions, deleteLogs] =
				await Promise.all([
					prisma.activityLog.findMany({
						where: { action: "FAILED_LOGIN", createdAt: { gte: since7d } },
						orderBy: { createdAt: "desc" },
						take: 50,
						include: { user: userSelect },
					}),
					prisma.activityLog.findMany({
						where: { action: "ACCESS_DENIED", createdAt: { gte: since7d } },
						orderBy: { createdAt: "desc" },
						take: 50,
						include: { user: userSelect },
					}),
					prisma.userSession.findMany({
						where: { createdAt: { gte: since30d } },
						orderBy: { createdAt: "asc" },
						include: { user: userSelect },
					}),
					prisma.activityLog.findMany({
						where: { action: "DELETE", createdAt: { gte: since24h } },
						orderBy: { createdAt: "desc" },
						include: { user: userSelect },
					}),
				]);

			// Group sessions per user (already ascending by createdAt)
			const byUser = new Map<string, typeof sessions>();
			for (const s of sessions) {
				const arr = byUser.get(s.userId) || [];
				arr.push(s);
				byUser.set(s.userId, arr);
			}

			const newDevice: any[] = [];
			const impossibleTravel: any[] = [];
			const multiIp: any[] = [];

			for (const list of byUser.values()) {
				const seenDevices = new Set<string>();
				const seenIps = new Set<string>();
				let isFirst = true;

				for (const s of list) {
					const dev = s.deviceName || "";
					const ip = s.ipAddress || "";
					const newDev = !!dev && !seenDevices.has(dev);
					const newLoc = !!ip && !seenIps.has(ip);
					// Only flag established accounts (not their very first login)
					// and only recent sessions.
					if (!isFirst && s.createdAt >= since7d && (newDev || newLoc)) {
						newDevice.push({
							user: s.user,
							deviceName: s.deviceName,
							ipAddress: s.ipAddress,
							locationLabel: s.locationLabel,
							at: s.createdAt,
							newDevice: newDev,
							newLocation: newLoc,
						});
					}
					if (dev) seenDevices.add(dev);
					if (ip) seenIps.add(ip);
					isFirst = false;
				}

				// Impossible travel between consecutive geolocated sessions
				const geo = list.filter(
					(s) => s.latitude != null && s.longitude != null
				);
				for (let i = 1; i < geo.length; i++) {
					const a = geo[i - 1]!;
					const b = geo[i]!;
					const dist = haversineKm(
						a.latitude!,
						a.longitude!,
						b.latitude!,
						b.longitude!
					);
					const hours =
						(b.createdAt.getTime() - a.createdAt.getTime()) / 3_600_000;
					if (hours > 0 && dist >= TRAVEL_MIN_KM) {
						const speed = dist / hours;
						if (speed > TRAVEL_MAX_KMH) {
							impossibleTravel.push({
								user: b.user,
								from: { label: a.locationLabel, at: a.createdAt },
								to: { label: b.locationLabel, at: b.createdAt },
								distanceKm: Math.round(dist),
								hours: +hours.toFixed(2),
								speedKmh: Math.round(speed),
							});
						}
					}
				}

				// Many distinct IPs for one account within 24h
				const ips24 = new Set(
					list
						.filter((s) => s.createdAt >= since24h && s.ipAddress)
						.map((s) => s.ipAddress as string)
				);
				if (ips24.size >= MULTI_IP_MIN) {
					multiIp.push({
						user: list[0]!.user,
						ipCount: ips24.size,
						ips: [...ips24],
					});
				}
			}

			// Mass delete: group DELETE logs (last 24h) per user
			const delByUser = new Map<string, typeof deleteLogs>();
			for (const l of deleteLogs) {
				const arr = delByUser.get(l.userId) || [];
				arr.push(l);
				delByUser.set(l.userId, arr);
			}
			const massDelete: any[] = [];
			for (const logs of delByUser.values()) {
				if (logs.length >= MASS_DELETE_MIN) {
					massDelete.push({
						user: logs[0]!.user,
						count: logs.length,
						lastAt: logs[0]!.createdAt,
						samples: logs.slice(0, 5).map((l) => ({
							description: l.description,
							path: l.path,
							at: l.createdAt,
						})),
					});
				}
			}

			const riskyIds = new Set<string>();
			[...newDevice, ...impossibleTravel, ...multiIp, ...massDelete].forEach(
				(x) => x.user && riskyIds.add(x.user.id)
			);

			return res.json({
				stats: {
					failedLogins24h: failedLogins.filter((l) => l.createdAt >= since24h)
						.length,
					accessDenied24h: accessDenied.filter((l) => l.createdAt >= since24h)
						.length,
					riskyAccounts: riskyIds.size,
				},
				failedLogins,
				accessDenied,
				anomalies: { newDevice, impossibleTravel, multiIp },
				massDelete,
			});
		} catch (error) {
			console.error("Security monitor error:", error);
			return res.status(500).json({ message: "Failed to load security data" });
		}
	}
);

export default router;
