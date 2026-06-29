import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import {
	authenticate,
	authorize,
	AuthenticatedRequest,
} from "../middleware/auth";

const router = Router();

// Categories must match MailCategory in utils/mailLog.ts.
const CATEGORIES = ["VERIFICATION", "PASSWORD_RESET", "TICKET"] as const;

// GET /api/admin/mail - Outgoing email usage for SuperAdmin.
// Shows volume per window/category and how close we are to the SMTP daily limit.
router.get(
	"/",
	authenticate,
	authorize("SUPERADMIN"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const now = new Date();
			const startOfToday = new Date(
				now.getFullYear(),
				now.getMonth(),
				now.getDate()
			);
			const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

			const category =
				typeof req.query.category === "string" ? req.query.category : undefined;
			const limit = Math.min(Number(req.query.limit) || 100, 500);

			const [
				allByCat,
				todayByCat,
				monthByCat,
				failedByCat,
				totalAll,
				totalToday,
				totalMonth,
				failedToday,
				recent,
			] = await Promise.all([
				prisma.emailLog.groupBy({ by: ["category"], _count: { id: true } }),
				prisma.emailLog.groupBy({
					by: ["category"],
					_count: { id: true },
					where: { createdAt: { gte: startOfToday } },
				}),
				prisma.emailLog.groupBy({
					by: ["category"],
					_count: { id: true },
					where: { createdAt: { gte: startOfMonth } },
				}),
				prisma.emailLog.groupBy({
					by: ["category"],
					_count: { id: true },
					where: { status: "FAILED" },
				}),
				prisma.emailLog.count(),
				prisma.emailLog.count({ where: { createdAt: { gte: startOfToday } } }),
				prisma.emailLog.count({ where: { createdAt: { gte: startOfMonth } } }),
				prisma.emailLog.count({
					where: { status: "FAILED", createdAt: { gte: startOfToday } },
				}),
				prisma.emailLog.findMany({
					where: category ? { category } : undefined,
					orderBy: { createdAt: "desc" },
					take: limit,
				}),
			]);

			const count = (
				rows: { category: string; _count: { id: number } }[],
				cat: string
			) => rows.find((r) => r.category === cat)?._count.id ?? 0;

			const byCategory = CATEGORIES.map((cat) => ({
				category: cat,
				all: count(allByCat, cat),
				today: count(todayByCat, cat),
				month: count(monthByCat, cat),
				failed: count(failedByCat, cat),
			}));

			// Daily send cap and the threshold at which we warn the admin.
			// Both configurable via env; defaults: 300/day, warn at 200.
			const dailyLimit = Number(process.env.SMTP_DAILY_LIMIT) || 300;
			const warnThreshold = Number(process.env.SMTP_DAILY_WARN) || 200;

			res.json({
				dailyLimit,
				warnThreshold,
				totals: { all: totalAll, today: totalToday, month: totalMonth },
				failedToday,
				byCategory,
				recent,
			});
		} catch (error) {
			console.error("Mail usage error:", error);
			res.status(500).json({ error: "Internal server error" });
		}
	}
);

export default router;
