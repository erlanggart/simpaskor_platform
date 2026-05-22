import midtransClient from "midtrans-client";

const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

export const isMidtransConfigured = !!(process.env.MIDTRANS_SERVER_KEY && process.env.MIDTRANS_CLIENT_KEY);

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

export function getFrontendBaseUrl(): string {
	const fallbackUrl = isProduction ? "https://simpaskor.id" : "http://localhost:5173";
	return (process.env.FRONTEND_URL || fallbackUrl).replace(/\/+$/, "");
}

function buildFrontendUrl(pathname: string): string {
	const safePath = pathname.startsWith("/") ? pathname : `/${pathname}`;
	return `${getFrontendBaseUrl()}${safePath}`;
}

// Payment type prefixes for generating unique Midtrans order IDs
export const PaymentPrefix = {
	ORDER: "ORD",
	TICKET: "TKT",
	VOTING: "VOT",
	REGISTRATION: "REG",
	EVENT: "EVT",
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
 * QRIS MDR fee rate (0.7%)
 * This fee is added on top of the original amount so the buyer pays the fee,
 * not deducted from the seller's revenue.
 */
export const QRIS_FEE_RATE = 0.007;

/**
 * Calculate gross amount including QRIS fee passed to the buyer.
 * Returns the total amount to charge and the fee portion.
 */
export function calculateQrisFee(originalAmount: number): { grossAmount: number; fee: number } {
	if (originalAmount <= 0) return { grossAmount: 0, fee: 0 };
	const grossAmount = Math.ceil(originalAmount / (1 - QRIS_FEE_RATE));
	const fee = grossAmount - originalAmount;
	return { grossAmount, fee };
}

/**
 * Create Midtrans Snap transaction token
 * - Payment restricted to QRIS only
 * - QRIS fee (0.7% MDR) added on top so buyer pays the processing fee
 */
export async function createSnapTransaction(params: {
	orderId: string;
	grossAmount: number;
	customerName: string;
	customerEmail: string;
	customerPhone?: string;
	adminFee?: number;
	finishRedirectPath?: string;
	finishRedirectUrl?: string;
	itemDetails: Array<{
		id: string;
		price: number;
		quantity: number;
		name: string;
	}>;
}) {
	const adminFee = params.adminFee || 0;
	const baseAmount = params.grossAmount + adminFee;

	// Calculate QRIS fee on total (original + admin fee)
	const { grossAmount: totalWithFee, fee } = calculateQrisFee(baseAmount);

	const items: Array<{ id: string; price: number; quantity: number; name: string }> = params.itemDetails.map((item) => ({
		id: item.id,
		price: Math.round(item.price),
		quantity: item.quantity,
		name: item.name.substring(0, 50), // Midtrans name limit
	}));

	// Add admin fee as separate line item
	if (adminFee > 0) {
		items.push({
			id: "ADMIN_FEE",
			price: adminFee,
			quantity: 1,
			name: "Biaya Admin",
		});
	}

	// Add QRIS fee as separate line item so buyer sees it transparently
	if (fee > 0) {
		items.push({
			id: "QRIS_FEE",
			price: fee,
			quantity: 1,
			name: "Biaya Layanan QRIS (0.7%)",
		});
	}

	const finishRedirectUrl = params.finishRedirectUrl || buildFrontendUrl(params.finishRedirectPath || "/payment/success");

	const transactionDetails: any = {
		transaction_details: {
			order_id: params.orderId,
			gross_amount: totalWithFee,
		},
		customer_details: {
			first_name: params.customerName,
			email: params.customerEmail,
			phone: params.customerPhone || "",
		},
		item_details: items,
		enabled_payments: ["other_qris"],
		callbacks: {
			finish: finishRedirectUrl,
		},
	};

	const transaction = await snap.createTransaction(transactionDetails);
	return {
		token: transaction.token as string,
		redirectUrl: transaction.redirect_url as string,
	};
}

/**
 * Cancel a pending Midtrans transaction so the QRIS token is invalidated
 * on Midtrans' side as soon as the buyer abandons the popup.
 *
 * Best-effort: failures are logged but never thrown — our own DB row is
 * still moved to CANCELLED, and the daily expiry sweep handles the rest.
 */
export async function cancelMidtransTransaction(midtransOrderId: string): Promise<void> {
	if (!isMidtransConfigured || !midtransOrderId) return;
	try {
		await coreApi.transaction.cancel(midtransOrderId);
	} catch (err: any) {
		// Common cases that are not real failures:
		//  - 404: Midtrans never received this order (token not used)
		//  - 412 / "cannot be canceled": already settled, expired, or cancelled
		const status = err?.httpStatusCode || err?.ApiResponse?.status_code;
		if (status === 404 || status === 412 || status === "404" || status === "412") {
			return;
		}
		console.warn(`[Midtrans] Failed to cancel ${midtransOrderId}:`, err?.message || err);
	}
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
