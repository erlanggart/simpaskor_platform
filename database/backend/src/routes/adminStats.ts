import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import {
	authenticate,
	authorize,
	AuthenticatedRequest,
} from "../middleware/auth";

const router = Router();

// GET /api/admin/stats - Dashboard statistics for SuperAdmin
router.get(
	"/stats",
	authenticate,
	authorize("SUPERADMIN"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			// Run all count queries in parallel
			const [
				totalUsers,
				usersByRole,
				usersByStatus,
				totalEvents,
				eventsByStatus,
				totalRegistrations,
				registrationsByStatus,
				totalCoupons,
				usedCoupons,
				totalAssessmentCategories,
				totalSchoolCategories,
				totalEvaluations,
				totalComments,
				totalLikes,
				recentUsers,
				recentEvents,
				recentRegistrations,
				upcomingEvents,
			] = await Promise.all([
				// Users
				prisma.user.count(),
				prisma.user.groupBy({ by: ["role"], _count: { id: true } }),
				prisma.user.groupBy({ by: ["status"], _count: { id: true } }),

				// Events
				prisma.event.count(),
				prisma.event.groupBy({ by: ["status"], _count: { id: true } }),

				// Registrations
				prisma.eventParticipation.count(),
				prisma.eventParticipation.groupBy({
					by: ["status"],
					_count: { id: true },
				}),

				// Coupons
				prisma.eventCoupon.count(),
				prisma.eventCoupon.count({ where: { isUsed: true } }),

				// Categories
				prisma.assessmentCategory.count(),
				prisma.schoolCategory.count(),

				// Activity
				prisma.evaluation.count(),
				prisma.eventComment.count(),
				prisma.eventLike.count(),

				// Recent users (last 7 days)
				prisma.user.findMany({
					where: {
						createdAt: {
							gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
						},
					},
					select: {
						id: true,
						name: true,
						email: true,
						role: true,
						status: true,
						createdAt: true,
					},
					orderBy: { createdAt: "desc" },
					take: 10,
				}),

				// Recent events
				prisma.event.findMany({
					select: {
						id: true,
						title: true,
						slug: true,
						status: true,
						createdAt: true,
						createdBy: {
							select: { name: true, email: true },
						},
					},
					orderBy: { createdAt: "desc" },
					take: 10,
				}),

				// Recent registrations
				prisma.eventParticipation.findMany({
					select: {
						id: true,
						status: true,
						createdAt: true,
						user: {
							select: { name: true, email: true },
						},
						event: {
							select: { title: true, slug: true },
						},
					},
					orderBy: { createdAt: "desc" },
					take: 10,
				}),

				// Upcoming events
				prisma.event.findMany({
					where: {
						startDate: { gte: new Date() },
						status: { in: ["PUBLISHED", "ONGOING"] },
					},
					select: {
						id: true,
						title: true,
						slug: true,
						startDate: true,
						endDate: true,
						venue: true,
						city: true,
						status: true,
						_count: {
							select: { participations: true },
						},
					},
					orderBy: { startDate: "asc" },
					take: 5,
				}),
			]);

			// Transform groupBy results into objects
			const roleMap: Record<string, number> = {};
			usersByRole.forEach((r) => {
				roleMap[r.role] = r._count.id;
			});

			const statusMap: Record<string, number> = {};
			usersByStatus.forEach((s) => {
				statusMap[s.status] = s._count.id;
			});

			const eventStatusMap: Record<string, number> = {};
			eventsByStatus.forEach((e) => {
				eventStatusMap[e.status] = e._count.id;
			});

			const regStatusMap: Record<string, number> = {};
			registrationsByStatus.forEach((r) => {
				regStatusMap[r.status] = r._count.id;
			});

			res.json({
				users: {
					total: totalUsers,
					byRole: roleMap,
					byStatus: statusMap,
					recent: recentUsers,
				},
				events: {
					total: totalEvents,
					byStatus: eventStatusMap,
					recent: recentEvents,
					upcoming: upcomingEvents,
				},
				registrations: {
					total: totalRegistrations,
					byStatus: regStatusMap,
					recent: recentRegistrations,
				},
				coupons: {
					total: totalCoupons,
					used: usedCoupons,
					available: totalCoupons - usedCoupons,
				},
				categories: {
					assessment: totalAssessmentCategories,
					school: totalSchoolCategories,
				},
				activity: {
					evaluations: totalEvaluations,
					comments: totalComments,
					likes: totalLikes,
				},
			});
		} catch (error) {
			console.error("Admin stats error:", error);
			res.status(500).json({
				error: "Failed to fetch admin statistics",
			});
		}
	}
);

export default router;
