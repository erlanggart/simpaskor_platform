import { Router, Response } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { authenticate, AuthenticatedRequest, authorize } from "../middleware/auth";
import { UserRole } from "@prisma/client";

const router = Router();

const COMMISSION_PER_EVENT = 200000;

const generateReferralCode = async (name: string) => {
	const initials = name
		.trim()
		.split(/\s+/)
		.map((part) => part[0])
		.join("")
		.slice(0, 4)
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, "") || "MTR";

	for (let attempt = 0; attempt < 8; attempt += 1) {
		const code = `MTR-${initials}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
		const existing = await prisma.mitraProfile.findUnique({
			where: { referralCode: code },
			select: { id: true },
		});

		if (!existing) return code;
	}

	return `MTR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
};

const ensureMitraProfile = async (userId: string) => {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		include: { mitraProfile: true },
	});

	if (!user) return null;
	if (user.mitraProfile) return user.mitraProfile;

	const referralCode = await generateReferralCode(user.name);
	return prisma.mitraProfile.create({
		data: {
			userId,
			referralCode,
			commissionPerEvent: COMMISSION_PER_EVENT,
		},
	});
};

router.get(
	"/me",
	authenticate,
	authorize(UserRole.MITRA),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const userId = req.user?.userId;
			if (!userId) return res.status(401).json({ message: "Unauthorized" });

			const profile = await ensureMitraProfile(userId);
			if (!profile) return res.status(404).json({ message: "Mitra profile not found" });

			const commissions = await prisma.mitraCommission.findMany({
				where: { mitraProfileId: profile.id },
				orderBy: { createdAt: "desc" },
				include: {
					event: {
						select: {
							id: true,
							title: true,
							slug: true,
							status: true,
							startDate: true,
							city: true,
							province: true,
							packageTier: true,
						},
					},
				},
			});

			const totalEvents = commissions.length;
			const totalPending = commissions
				.filter((commission) => commission.status === "PENDING" || commission.status === "APPROVED")
				.reduce((sum, commission) => sum + commission.amount, 0);
			const totalPaid = commissions
				.filter((commission) => commission.status === "PAID")
				.reduce((sum, commission) => sum + commission.amount, 0);

			res.json({
				profile,
				stats: {
					totalEvents,
					totalPending,
					totalPaid,
					commissionPerEvent: profile.commissionPerEvent,
				},
				commissions,
			});
		} catch (error) {
			console.error("Get mitra profile error:", error);
			res.status(500).json({ message: "Failed to load mitra profile" });
		}
	}
);

router.get("/public/rules", (_req, res) => {
	res.json({
		commissionPerEvent: COMMISSION_PER_EVENT,
		rules: [
			"Setiap mitra mendapatkan kode referral unik.",
			"Kode referral dapat digunakan panitia saat membuat event.",
			"Setiap event yang menggunakan kode referral memberikan komisi Rp200.000 kepada mitra.",
		],
	});
});

export default router;
