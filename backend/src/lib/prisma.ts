import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		log: process.env.NODE_ENV === "production" 
			? ["error"] // Production: only errors
			: ["warn", "error"], // Development: warnings and errors only
		// Uncomment line below for debugging queries:
		// log: ["query", "info", "warn", "error"],
	});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
