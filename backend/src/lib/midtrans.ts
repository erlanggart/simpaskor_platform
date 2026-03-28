import midtransClient from "midtrans-client";

const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

// Snap client for creating payment tokens
export const snap = new midtransClient.Snap({
	isProduction,
	serverKey: process.env.MIDTRANS_SERVER_KEY || "",
	clientKey: process.env.MIDTRANS_CLIENT_KEY || "",
});

// Core API client for checking transaction status
export const coreApi = new midtransClient.CoreApi({
	isProduction,
	serverKey: process.env.MIDTRANS_SERVER_KEY || "",
	clientKey: process.env.MIDTRANS_CLIENT_KEY || "",
});

export const MIDTRANS_CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY || "";
export const MIDTRANS_IS_PRODUCTION = isProduction;

// Payment type prefixes for generating unique Midtrans order IDs
export const PaymentPrefix = {
	ORDER: "ORD",
	TICKET: "TKT",
	VOTING: "VOT",
	REGISTRATION: "REG",
} as const;

/**
 * Generate a unique Midtrans order ID
 * Format: PREFIX-<uuid>-<timestamp>
 */
export function generateMidtransOrderId(prefix: string, id: string): string {
	const timestamp = Date.now().toString(36).toUpperCase();
	// Use first 8 chars of UUID to keep it manageable
	const shortId = id.replace(/-/g, "").substring(0, 8).toUpperCase();
	return `${prefix}-${shortId}-${timestamp}`;
}

/**
 * Create Midtrans Snap transaction token
 */
export async function createSnapTransaction(params: {
	orderId: string;
	grossAmount: number;
	customerName: string;
	customerEmail: string;
	customerPhone?: string;
	itemDetails: Array<{
		id: string;
		price: number;
		quantity: number;
		name: string;
	}>;
}) {
	const transactionDetails = {
		transaction_details: {
			order_id: params.orderId,
			gross_amount: Math.round(params.grossAmount), // Midtrans requires integer
		},
		customer_details: {
			first_name: params.customerName,
			email: params.customerEmail,
			phone: params.customerPhone || "",
		},
		item_details: params.itemDetails.map((item) => ({
			id: item.id,
			price: Math.round(item.price),
			quantity: item.quantity,
			name: item.name.substring(0, 50), // Midtrans name limit
		})),
	};

	const transaction = await snap.createTransaction(transactionDetails);
	return {
		token: transaction.token as string,
		redirectUrl: transaction.redirect_url as string,
	};
}

/**
 * Verify Midtrans notification signature
 * Uses SHA-512 hash of order_id + status_code + gross_amount + server_key
 */
export function verifySignature(notification: {
	order_id: string;
	status_code: string;
	gross_amount: string;
	signature_key: string;
}): boolean {
	const crypto = require("crypto");
	const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
	const hash = crypto
		.createHash("sha512")
		.update(
			notification.order_id +
				notification.status_code +
				notification.gross_amount +
				serverKey
		)
		.digest("hex");
	return hash === notification.signature_key;
}

/**
 * Determine payment status from Midtrans transaction status
 */
export function resolvePaymentStatus(
	transactionStatus: string,
	fraudStatus?: string
): "success" | "pending" | "failed" | "expired" {
	if (transactionStatus === "capture") {
		return fraudStatus === "accept" ? "success" : "pending";
	}
	if (transactionStatus === "settlement") {
		return "success";
	}
	if (
		transactionStatus === "cancel" ||
		transactionStatus === "deny" ||
		transactionStatus === "refund" ||
		transactionStatus === "partial_refund"
	) {
		return "failed";
	}
	if (transactionStatus === "expire") {
		return "expired";
	}
	return "pending";
}
