import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";

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

export default router;
