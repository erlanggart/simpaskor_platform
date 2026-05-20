import { randomUUID } from "crypto";
import { prisma } from "./prisma";

export const TICKET_ADMIN_FEE_PER_TICKET = 2000;
export const REGISTRATION_ADMIN_FEE = 5000;
export const VOTING_ADMIN_FEE_PER_VOTE = 500;
export const VOTING_MAX_ADMIN_FEE = 10000;

export type AdminFeeSource = "ticket" | "voting" | "registration";

type ReconcileRow = {
	source: AdminFeeSource;
	sourceId: string;
	eventId: string | null;
	eventTitle: string | null;
	eventSlug: string | null;
	midtransOrderId: string;
	baseAmount: number;
	adminFee: number;
	quantity: number | null;
	voteCount: number | null;
	paymentType: string | null;
	paidAt: Date;
};

type RecordAdminFeeTransactionPayload = {
	source: AdminFeeSource;
	sourceId: string;
	eventId: string | null;
	eventTitle: string | null;
	eventSlug?: string | null;
	midtransOrderId: string;
	baseAmount: number;
	adminFee: number;
	quantity?: number | null;
	voteCount?: number | null;
	paymentType?: string | null;
	paidAt: Date;
};

export function calculateTicketAdminFee(quantity: number): number {
	return TICKET_ADMIN_FEE_PER_TICKET * quantity;
}

export function calculateVotingAdminFee(totalAmount: number, voteCount: number): number {
	if (totalAmount <= 0) return 0;
	return Math.min(VOTING_ADMIN_FEE_PER_VOTE * voteCount, VOTING_MAX_ADMIN_FEE);
}

export function calculateRegistrationAdminFee(): number {
	return REGISTRATION_ADMIN_FEE;
}

export async function recordAdminFeeTransaction(payload: RecordAdminFeeTransactionPayload): Promise<void> {
	if (payload.adminFee <= 0) return;

	await prisma.$executeRaw`
		INSERT INTO "admin_fee_transactions" (
			"id",
			"source",
			"source_id",
			"event_id",
			"event_title",
			"event_slug",
			"midtrans_order_id",
			"base_amount",
			"admin_fee",
			"quantity",
			"vote_count",
			"status",
			"payment_type",
			"paid_at",
			"updated_at"
		)
		VALUES (
			${randomUUID()},
			${payload.source},
			${payload.sourceId},
			${payload.eventId},
			${payload.eventTitle},
			${payload.eventSlug ?? null},
			${payload.midtransOrderId},
			${payload.baseAmount},
			${payload.adminFee},
			${payload.quantity ?? null},
			${payload.voteCount ?? null},
			${"PAID"},
			${payload.paymentType ?? null},
			${payload.paidAt},
			CURRENT_TIMESTAMP
		)
		ON CONFLICT ("midtrans_order_id") DO UPDATE SET
			"source" = EXCLUDED."source",
			"source_id" = EXCLUDED."source_id",
			"event_id" = EXCLUDED."event_id",
			"event_title" = EXCLUDED."event_title",
			"event_slug" = EXCLUDED."event_slug",
			"base_amount" = EXCLUDED."base_amount",
			"admin_fee" = EXCLUDED."admin_fee",
			"quantity" = EXCLUDED."quantity",
			"vote_count" = EXCLUDED."vote_count",
			"status" = EXCLUDED."status",
			"payment_type" = EXCLUDED."payment_type",
			"paid_at" = EXCLUDED."paid_at",
			"updated_at" = CURRENT_TIMESTAMP
	`;
}

// Backfill the ledger with any PAID source rows that don't yet have a matching
// admin_fee_transactions entry. Keeps lifetime totals authoritative on the
// ledger so consumers do not need to re-run formulas client side.
export async function reconcileAdminFeeLedger(): Promise<{
	ticket: number;
	voting: number;
	registration: number;
}> {
	const missingTickets = await prisma.$queryRaw<ReconcileRow[]>`
		SELECT
			'ticket'::text AS "source",
			tp."id" AS "sourceId",
			tp."event_id" AS "eventId",
			e."title" AS "eventTitle",
			e."slug" AS "eventSlug",
			tp."midtrans_order_id" AS "midtransOrderId",
			tp."total_amount"::double precision AS "baseAmount",
			(${TICKET_ADMIN_FEE_PER_TICKET}::int * tp."quantity")::double precision AS "adminFee",
			tp."quantity" AS "quantity",
			NULL::int AS "voteCount",
			tp."payment_type" AS "paymentType",
			COALESCE(tp."paid_at", tp."updated_at", tp."created_at") AS "paidAt"
		FROM "ticket_purchases" tp
		INNER JOIN "events" e ON e."id" = tp."event_id"
		LEFT JOIN "admin_fee_transactions" af ON af."midtrans_order_id" = tp."midtrans_order_id"
		WHERE tp."status" IN ('PAID', 'USED')
			AND tp."total_amount" > 0
			AND tp."midtrans_order_id" IS NOT NULL
			AND af."id" IS NULL
	`;

	const missingVoting = await prisma.$queryRaw<ReconcileRow[]>`
		SELECT
			'voting'::text AS "source",
			vp."id" AS "sourceId",
			vp."event_id" AS "eventId",
			e."title" AS "eventTitle",
			e."slug" AS "eventSlug",
			vp."midtrans_order_id" AS "midtransOrderId",
			vp."total_amount"::double precision AS "baseAmount",
			LEAST(
				${VOTING_ADMIN_FEE_PER_VOTE}::int * vp."vote_count",
				${VOTING_MAX_ADMIN_FEE}::int
			)::double precision AS "adminFee",
			NULL::int AS "quantity",
			vp."vote_count" AS "voteCount",
			vp."payment_type" AS "paymentType",
			COALESCE(vp."paid_at", vp."updated_at", vp."created_at") AS "paidAt"
		FROM "voting_purchases" vp
		INNER JOIN "events" e ON e."id" = vp."event_id"
		LEFT JOIN "admin_fee_transactions" af ON af."midtrans_order_id" = vp."midtrans_order_id"
		WHERE vp."status" = 'PAID'
			AND vp."total_amount" > 0
			AND vp."midtrans_order_id" IS NOT NULL
			AND af."id" IS NULL
	`;

	const missingRegistration = await prisma.$queryRaw<ReconcileRow[]>`
		SELECT
			'registration'::text AS "source",
			rp."id" AS "sourceId",
			rp."event_id" AS "eventId",
			e."title" AS "eventTitle",
			e."slug" AS "eventSlug",
			rp."midtrans_order_id" AS "midtransOrderId",
			rp."amount"::double precision AS "baseAmount",
			${REGISTRATION_ADMIN_FEE}::double precision AS "adminFee",
			NULL::int AS "quantity",
			NULL::int AS "voteCount",
			rp."payment_type" AS "paymentType",
			COALESCE(rp."paid_at", rp."updated_at", rp."created_at") AS "paidAt"
		FROM "registration_payments" rp
		INNER JOIN "events" e ON e."id" = rp."event_id"
		LEFT JOIN "admin_fee_transactions" af ON af."midtrans_order_id" = rp."midtrans_order_id"
		WHERE rp."status" = 'PAID'
			AND rp."amount" > 0
			AND rp."midtrans_order_id" IS NOT NULL
			AND af."id" IS NULL
	`;

	const all = [...missingTickets, ...missingVoting, ...missingRegistration];
	for (const row of all) {
		await recordAdminFeeTransaction({
			source: row.source,
			sourceId: row.sourceId,
			eventId: row.eventId,
			eventTitle: row.eventTitle,
			eventSlug: row.eventSlug,
			midtransOrderId: row.midtransOrderId,
			baseAmount: Number(row.baseAmount),
			adminFee: Number(row.adminFee),
			quantity: row.quantity,
			voteCount: row.voteCount,
			paymentType: row.paymentType,
			paidAt: row.paidAt,
		});
	}

	return {
		ticket: missingTickets.length,
		voting: missingVoting.length,
		registration: missingRegistration.length,
	};
}
