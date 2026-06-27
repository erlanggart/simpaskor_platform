import { PrismaClient } from "@prisma/client";

/**
 * Soft-delete (trash) support for events.
 *
 * Events are never physically removed by the normal "delete" action — instead
 * `deletedAt` is set. This extension transparently appends `deletedAt: null` to
 * every list-style read on the `event` model (findMany / findFirst / count /
 * aggregate / groupBy) so trashed events disappear from all existing queries
 * without having to touch each call site.
 *
 * A query can opt out (e.g. the Trash page, restore, permanent delete) simply
 * by mentioning `deletedAt` explicitly in its `where` clause.
 *
 * Note: `findUnique`/`findUniqueOrThrow` are intentionally NOT filtered (their
 * `where` only accepts unique fields), so fetching a specific event by id/slug
 * still works for restore and admin tooling.
 */
function applyEventTrashFilter(args: any) {
	args.where = args.where ?? {};
	if (!("deletedAt" in args.where)) {
		args.where.deletedAt = null;
	}
	return args;
}

function createPrismaClient() {
	const base = new PrismaClient({
		log: process.env.NODE_ENV === "production"
			? ["error"] // Production: only errors
			: ["warn", "error"], // Development: warnings and errors only
		// Uncomment line below for debugging queries:
		// log: ["query", "info", "warn", "error"],
	});

	return base.$extends({
		name: "softDeleteEvents",
		query: {
			event: {
				async findMany({ args, query }) {
					return query(applyEventTrashFilter(args));
				},
				async findFirst({ args, query }) {
					return query(applyEventTrashFilter(args));
				},
				async findFirstOrThrow({ args, query }) {
					return query(applyEventTrashFilter(args));
				},
				async count({ args, query }) {
					return query(applyEventTrashFilter(args));
				},
				async aggregate({ args, query }) {
					return query(applyEventTrashFilter(args));
				},
				async groupBy({ args, query }) {
					return query(applyEventTrashFilter(args));
				},
			},
		},
	});
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
	prisma: ExtendedPrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

/**
 * Transaction client type for the extended Prisma client. Use this instead of
 * `Prisma.TransactionClient` for helpers that receive a `tx` from
 * `prisma.$transaction(...)`, since the soft-delete extension changes the
 * delegate types.
 */
export type PrismaTransactionClient = Omit<
	typeof prisma,
	"$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
