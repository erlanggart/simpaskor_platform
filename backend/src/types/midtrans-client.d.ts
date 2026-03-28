declare module "midtrans-client" {
	export interface Config {
		isProduction: boolean;
		serverKey: string;
		clientKey: string;
	}

	export interface TransactionDetails {
		transaction_details: {
			order_id: string;
			gross_amount: number;
		};
		customer_details?: {
			first_name?: string;
			last_name?: string;
			email?: string;
			phone?: string;
		};
		item_details?: Array<{
			id: string;
			price: number;
			quantity: number;
			name: string;
		}>;
		credit_card?: Record<string, unknown>;
	}

	export interface TransactionResponse {
		token: string;
		redirect_url: string;
	}

	export interface StatusResponse {
		transaction_id: string;
		order_id: string;
		gross_amount: string;
		payment_type: string;
		transaction_status: string;
		fraud_status: string;
		status_code: string;
		signature_key: string;
		transaction_time: string;
		settlement_time?: string;
	}

	export class Snap {
		constructor(config: Config);
		createTransaction(params: TransactionDetails): Promise<TransactionResponse>;
		createTransactionToken(params: TransactionDetails): Promise<string>;
		createTransactionRedirectUrl(params: TransactionDetails): Promise<string>;
	}

	export class CoreApi {
		constructor(config: Config);
		charge(params: Record<string, unknown>): Promise<Record<string, unknown>>;
		capture(params: Record<string, unknown>): Promise<Record<string, unknown>>;
		cardRegister(params: Record<string, unknown>): Promise<Record<string, unknown>>;
		cardToken(params: Record<string, unknown>): Promise<Record<string, unknown>>;
		cardPointInquiry(tokenId: string): Promise<Record<string, unknown>>;
		transaction: {
			status(orderId: string): Promise<StatusResponse>;
			statusb2b(orderId: string): Promise<Record<string, unknown>>;
			approve(orderId: string): Promise<Record<string, unknown>>;
			deny(orderId: string): Promise<Record<string, unknown>>;
			cancel(orderId: string): Promise<Record<string, unknown>>;
			expire(orderId: string): Promise<Record<string, unknown>>;
			refund(orderId: string, params?: Record<string, unknown>): Promise<Record<string, unknown>>;
			refundDirect(orderId: string, params?: Record<string, unknown>): Promise<Record<string, unknown>>;
			notification(notification: Record<string, unknown>): Promise<StatusResponse>;
		};
	}

	const midtransClient: {
		Snap: typeof Snap;
		CoreApi: typeof CoreApi;
	};

	export default midtransClient;
}
