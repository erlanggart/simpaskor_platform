import { randomUUID } from "crypto";
import { prisma } from "./prisma";

export const TICKET_ADMIN_FEE_PER_TICKET = 2000;
export const REGISTRATION_ADMIN_FEE = 5000;
export const VOTING_ADMIN_FEE_PER_VOTE = 500;
export const VOTING_MAX_ADMIN_FEE = 10000;

export type AdminFeeSource = "ticket" | "voting" | "registration";

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
