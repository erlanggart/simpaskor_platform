import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, requireSuperAdmin, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

/**
 * Get today's date at midnight (UTC) for grouping visitors
 */
function getTodayDate(): Date {
	const now = new Date();
	return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/**
 * POST /api/visitors/track
 * Record a visit for today. Increments daily counter.
 */
router.post("/track", async (req: Request, res: Response) => {
	try {
		const today = getTodayDate();

		const record = await prisma.dailyVisitor.upsert({
			where: { date: today },
			update: { count: { increment: 1 } },
			create: { date: today, count: 1 },
		});

		res.json({ success: true, count: record.count });
	} catch (error) {
		console.error("Error tracking visitor:", error);
		res.status(500).json({ error: "Gagal mencatat kunjungan" });
	}
});

/**
 * GET /api/visitors/today
 * Get today's visitor count
 */
router.get("/today", async (req: Request, res: Response) => {
	try {
		const today = getTodayDate();

		const record = await prisma.dailyVisitor.findUnique({
			where: { date: today },
		});

		res.json({ count: record?.count || 0 });
	} catch (error) {
		console.error("Error fetching visitor count:", error);
		res.status(500).json({ error: "Gagal mengambil data pengunjung" });
	}
});

// ============================================================
// Live (real-time) visitor tracking
// In-memory store — lightweight, no DB writes per heartbeat.
// Sessions expire if no heartbeat in HEARTBEAT_TTL_MS.
// History snapshots power the admin sparkline (rolling 60 min).
// ============================================================

type LiveSession = {
	sessionId: string;
	lastSeen: number;
	page: string;
	role: string | null;
	userId: string | null;
	deviceType: "mobile" | "tablet" | "desktop";
	startedAt: number;
};

const liveSessions = new Map<string, LiveSession>();
const HEARTBEAT_TTL_MS = 35_000; // session active if last heartbeat < 35s ago
const MAX_LIVE_SESSIONS = 50_000; // hard cap to bound memory if abused

type Snapshot = { t: number; count: number };
const liveHistory: Snapshot[] = [];
const HISTORY_WINDOW_MS = 60 * 60 * 1000; // last hour
const SNAPSHOT_INTERVAL_MS = 15_000; // record snapshot every 15s

let peakActive = 0;
let peakAt: number | null = null;

// Cached /live response so concurrent admin polls don't recompute buckets.
// Sweep interval refreshes it; manual refresh button can force-recompute.
const LIVE_CACHE_TTL_MS = 2_000;
let liveCache: { computedAt: number; payload: object } | null = null;

const detectDeviceType = (userAgent: string): "mobile" | "tablet" | "desktop" => {
	if (!userAgent) return "desktop";
	const ua = userAgent.toLowerCase();
	if (/ipad|tablet/.test(ua)) return "tablet";
	if (/mobi|android|iphone|ipod/.test(ua)) return "mobile";
	return "desktop";
};

const sweepAndSnapshot = () => {
	const now = Date.now();
	for (const [id, sess] of liveSessions.entries()) {
		if (now - sess.lastSeen > HEARTBEAT_TTL_MS) liveSessions.delete(id);
	}
	const count = liveSessions.size;
	liveHistory.push({ t: now, count });
	while (liveHistory.length > 0 && (liveHistory[0]?.t ?? Infinity) < now - HISTORY_WINDOW_MS) liveHistory.shift();
	if (count > peakActive) {
		peakActive = count;
		peakAt = now;
	}
	// History changed → invalidate /live cache so the next poll gets fresh data
	liveCache = null;
};

// Kick off the sweep loop
const sweepHandle = setInterval(sweepAndSnapshot, SNAPSHOT_INTERVAL_MS);
sweepHandle.unref?.();

/**
 * POST /api/visitors/heartbeat
 * Public endpoint. Client pings ~ every 15-20s to indicate it's alive.
 */
router.post("/heartbeat", (req: Request, res: Response) => {
	try {
		const { sessionId, page, role, userId } = req.body || {};
		if (!sessionId || typeof sessionId !== "string" || sessionId.length > 80) {
			return res.status(400).json({ error: "invalid sessionId" });
		}
		const existing = liveSessions.get(sessionId);
		// Refuse new sessions when the cap is hit so a flood can't exhaust memory.
		// Existing sessions can still update so legitimate users stay tracked.
		if (!existing && liveSessions.size >= MAX_LIVE_SESSIONS) {
			return res.json({ ok: true, active: liveSessions.size, capped: true });
		}
		const now = Date.now();
		const userAgent = req.headers["user-agent"]?.toString() || "";
		liveSessions.set(sessionId, {
			sessionId,
			lastSeen: now,
			page: typeof page === "string" ? page.slice(0, 200) : "/",
			role: typeof role === "string" ? role.slice(0, 32) : null,
			userId: typeof userId === "string" ? userId.slice(0, 64) : null,
			deviceType: existing?.deviceType || detectDeviceType(userAgent),
			startedAt: existing?.startedAt || now,
		});
		// Track peak inline (cheaper than waiting for sweep loop)
		const size = liveSessions.size;
		if (size > peakActive) {
			peakActive = size;
			peakAt = now;
		}
		res.json({ ok: true, active: size });
	} catch (error) {
		console.error("Error recording heartbeat:", error);
		res.status(500).json({ error: "Heartbeat failed" });
	}
});

/**
 * POST /api/visitors/leave
 * Public endpoint. Best-effort beacon when user closes the tab.
 */
router.post("/leave", (req: Request, res: Response) => {
	try {
		const { sessionId } = req.body || {};
		if (typeof sessionId === "string") liveSessions.delete(sessionId);
		res.json({ ok: true });
	} catch {
		res.json({ ok: true });
	}
});

/**
 * GET /api/visitors/live
 * Super admin only. Returns the current live snapshot + rolling history.
 */
const computeLivePayload = () => {
	const now = Date.now();
	const pageBuckets = new Map<string, number>();
	const roleBuckets = new Map<string, number>();
	const deviceBuckets: Record<"mobile" | "tablet" | "desktop", number> = {
		mobile: 0,
		tablet: 0,
		desktop: 0,
	};
	let guests = 0;
	let returningAuthed = 0;

	for (const sess of liveSessions.values()) {
		pageBuckets.set(sess.page, (pageBuckets.get(sess.page) || 0) + 1);
		if (sess.role) {
			roleBuckets.set(sess.role, (roleBuckets.get(sess.role) || 0) + 1);
			returningAuthed += 1;
		} else {
			guests += 1;
		}
		deviceBuckets[sess.deviceType] += 1;
	}

	const topPages = Array.from(pageBuckets.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, 8)
		.map(([page, count]) => ({ page, count }));

	const byRole = Array.from(roleBuckets.entries())
		.sort((a, b) => b[1] - a[1])
		.map(([role, count]) => ({ role, count }));

	return {
		active: liveSessions.size,
		guests,
		authed: returningAuthed,
		devices: deviceBuckets,
		byRole,
		topPages,
		history: liveHistory.map((s) => ({ t: s.t, count: s.count })),
		peak: { count: peakActive, at: peakAt },
		ttlMs: HEARTBEAT_TTL_MS,
		snapshotIntervalMs: SNAPSHOT_INTERVAL_MS,
		windowMs: HISTORY_WINDOW_MS,
		now,
	};
};

router.get(
	"/live",
	authenticate,
	requireSuperAdmin,
	(_req: AuthenticatedRequest, res: Response) => {
		const now = Date.now();
		// Reuse the cached payload if it's fresh enough — concurrent admin polls
		// (or multiple super-admin tabs) hit the cache instead of recomputing.
		if (liveCache && now - liveCache.computedAt < LIVE_CACHE_TTL_MS) {
			res.json(liveCache.payload);
			return;
		}
		const payload = computeLivePayload();
		liveCache = { computedAt: now, payload };
		res.json(payload);
	}
);

export default router;
