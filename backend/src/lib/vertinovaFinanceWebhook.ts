import axios from "axios";

const TICKET_ADMIN_FEE_PER_TICKET = 2000;
const REGISTRATION_ADMIN_FEE = 5000;
const VOTING_ADMIN_FEE_PER_VOTE = 500;
const VOTING_MAX_ADMIN_FEE = 10000;
const VERTINOVA_FINANCE_WEBHOOK_URL = "https://vertinova.id/api/finance/webhooks/simpaskor";
const VERTINOVA_FINANCE_API_KEY = "simpaskor-admin-fee-2026-7d4f6c9b2a8e41f0b5c3d9e7a1f8b6c4";

type VertinovaPaymentSuccessPayload = {
	orderId: string;
	amount: number;
	paidAt: string;
	description: string;
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

export async function sendVertinovaPaymentSuccessWebhook(payload: VertinovaPaymentSuccessPayload): Promise<void> {
	if (payload.amount <= 0) {
		console.warn(`[Vertinova] Skipping webhook for ${payload.orderId}: amount must be greater than 0`);
		return;
	}

	try {
		await axios.post(VERTINOVA_FINANCE_WEBHOOK_URL, payload, {
			headers: {
				"Content-Type": "application/json",
				"X-API-Key": VERTINOVA_FINANCE_API_KEY,
			},
			timeout: 10000,
		});
		console.log(`[Vertinova] Payment success webhook sent for ${payload.orderId}`);
	} catch (error: any) {
		const status = error.response?.status;
		const response = error.response?.data;
		console.error(`[Vertinova] Failed to send webhook for ${payload.orderId}`, {
			status,
			response,
			message: error.message,
		});
	}
}
