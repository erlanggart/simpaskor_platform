export interface Product {
	id: string;
	name: string;
	description: string | null;
	price: number;
	stock: number;
	thumbnail: string | null;
	status: "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK";
	createdAt: string;
	updatedAt: string;
	_count?: {
		orderItems: number;
	};
}

export interface OrderItem {
	id: string;
	orderId: string;
	productId: string;
	quantity: number;
	price: number;
	product: Product;
}

export interface Order {
	id: string;
	userId: string;
	totalAmount: number;
	status: "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "COMPLETED" | "CANCELLED";
	notes: string | null;
	createdAt: string;
	updatedAt: string;
	items: OrderItem[];
	user?: {
		id: string;
		name: string;
		email: string;
	};
}

export interface CartItem {
	product: Product;
	quantity: number;
}
