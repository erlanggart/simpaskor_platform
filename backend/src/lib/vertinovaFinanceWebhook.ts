import axios from "axios";
export {
	calculateRegistrationAdminFee,
	calculateTicketAdminFee,
	calculateVotingAdminFee,
} from "./adminFeeLedger";

const FALLBACK_VERTINOVA_FINANCE_WEBHOOK_URL = "https://vertinova.id/api/finance/webhooks/simpaskor";
const FALLBACK_VERTINOVA_FINANCE_API_KEY = "simpaskor-admin-fee-2026-7d4f6c9b2a8e41f0b5c3d9e7a1f8b6c4";

const VERTINOVA_FINANCE_WEBHOOK_URL =
	process.env.VERTINOVA_FINANCE_WEBHOOK_URL?.trim() || FALLBACK_VERTINOVA_FINANCE_WEBHOOK_URL;
const VERTINOVA_FINANCE_API_KEY =
	process.env.VERTINOVA_FINANCE_API_KEY?.trim() ||
	process.env.EXTERNAL_FINANCE_API_KEY?.trim() ||
	FALLBACK_VERTINOVA_FINANCE_API_KEY;

type VertinovaPaymentSuccessPayload = {
	orderId: string;
	amount: number;
	paidAt: string;
	description: string;
};

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
