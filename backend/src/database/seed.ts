import { PrismaClient, UserRole, UserStatus } from "@prisma/client";
import { AuthUtils } from "../utils/auth";

const prisma = new PrismaClient();

async function main() {
	console.log("🌱 Starting seed...");

	// Create superadmin user
	const superadminPassword = "Admin123!";
	const superadmin = await prisma.user.upsert({
		where: { email: "superadmin@simpaskor.com" },
		update: {},
		create: {
			email: "superadmin@simpaskor.com",
			passwordHash: await AuthUtils.hashPassword(superadminPassword),
			firstName: "Super",
			lastName: "Admin",
			role: UserRole.SUPERADMIN,
			status: UserStatus.ACTIVE,
			emailVerified: true,
			profile: {
				create: {
					bio: "System Administrator",
					institution: "Simpaskor Platform",
				},
			},
		},
		include: {
			profile: true,
		},
	});

	// Create panitia user
	const panitiaPassword = "Panitia123!";
	const panitia = await prisma.user.upsert({
		where: { email: "panitia@simpaskor.com" },
		update: {},
		create: {
			email: "panitia@simpaskor.com",
			passwordHash: await AuthUtils.hashPassword(panitiaPassword),
			firstName: "Panitia",
			lastName: "Event",
			role: UserRole.PANITIA,
			status: UserStatus.ACTIVE,
			emailVerified: true,
			profile: {
				create: {
					bio: "Event Organizer",
					institution: "Simpaskor Organization",
				},
			},
		},
	});

	// Create juri user
	const juriPassword = "Juri123!";
	const juri = await prisma.user.upsert({
		where: { email: "juri@simpaskor.com" },
		update: {},
		create: {
			email: "juri@simpaskor.com",
			passwordHash: await AuthUtils.hashPassword(juriPassword),
			firstName: "Dr. Juri",
			lastName: "Evaluator",
			role: UserRole.JURI,
			status: UserStatus.ACTIVE,
			emailVerified: true,
			profile: {
				create: {
					bio: "Expert Evaluator",
					institution: "University of Indonesia",
				},
			},
		},
	});

	// Create pelatih user
	const pelatihPassword = "Pelatih123!";
	const pelatih = await prisma.user.upsert({
		where: { email: "pelatih@simpaskor.com" },
		update: {},
		create: {
			email: "pelatih@simpaskor.com",
			passwordHash: await AuthUtils.hashPassword(pelatihPassword),
			firstName: "Coach",
			lastName: "Trainer",
			role: UserRole.PELATIH,
			status: UserStatus.ACTIVE,
			emailVerified: true,
			profile: {
				create: {
					bio: "Professional Coach",
					institution: "Training Institute",
				},
			},
		},
	});

	// Create peserta user
	const pesertaPassword = "Peserta123!";
	const peserta = await prisma.user.upsert({
		where: { email: "peserta@simpaskor.com" },
		update: {},
		create: {
			email: "peserta@simpaskor.com",
			passwordHash: await AuthUtils.hashPassword(pesertaPassword),
			firstName: "Student",
			lastName: "Participant",
			role: UserRole.PESERTA,
			status: UserStatus.ACTIVE,
			emailVerified: true,
			profile: {
				create: {
					bio: "Enthusiastic participant",
					institution: "Local High School",
				},
			},
		},
	});

	// Create sample event
	const event = await prisma.event.upsert({
		where: { id: "sample-event-id" },
		update: {},
		create: {
			id: "sample-event-id",
			title: "Programming Competition 2024",
			description: "Annual programming competition for students",
			startDate: new Date("2024-12-01"),
			endDate: new Date("2024-12-03"),
			location: "Jakarta Convention Center",
			maxParticipants: 100,
			status: "PUBLISHED",
			createdById: panitia.id,
		},
	});

	console.log("✅ Seed completed successfully!");
	console.log("\n📧 Default Accounts Created:");
	console.log(`Superadmin: ${superadmin.email} / ${superadminPassword}`);
	console.log(`Panitia: ${panitia.email} / ${panitiaPassword}`);
	console.log(`Juri: ${juri.email} / ${juriPassword}`);
	console.log(`Pelatih: ${pelatih.email} / ${pelatihPassword}`);
	console.log(`Peserta: ${peserta.email} / ${pesertaPassword}`);
	console.log(`\n🎉 Event Created: ${event.title}`);
}

main()
	.catch((e) => {
		console.error("❌ Seed failed:", e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
