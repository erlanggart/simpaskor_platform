import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, authorize, AuthenticatedRequest } from "../middleware/auth";
import {
	createSnapTransaction,
	generateMidtransOrderId,
	PaymentPrefix,
} from "../lib/midtrans";

const router = Router();
const prisma = new PrismaClient();

// ==========================================
// USER ROUTES (authenticated)
// ==========================================

// POST /api/orders - Create order (any authenticated user)
router.post("/", authenticate, async (req: AuthenticatedRequest, res: Response) => {
	try {
		const userId = req.user!.userId;
		const { items, notes } = req.body;

		if (!items || !Array.isArray(items) || items.length === 0) {
			return res.status(400).json({ error: "Minimal 1 item diperlukan" });
		}

		// Validate and collect product data
		const productIds = items.map((item: any) => item.productId);
		const products = await prisma.product.findMany({
			where: { id: { in: productIds }, status: "ACTIVE" },
		});

		if (products.length !== productIds.length) {
			return res.status(400).json({ error: "Beberapa produk tidak tersedia" });
		}

		// Validate stock
		for (const item of items) {
			const product = products.find((p) => p.id === item.productId);
			if (!product) {
				return res.status(400).json({ error: `Produk tidak ditemukan` });
			}
			const qty = parseInt(item.quantity);
			if (!qty || qty < 1) {
				return res.status(400).json({ error: "Jumlah tidak valid" });
			}
			if (product.stock < qty) {
				return res.status(400).json({
					error: `Stok ${product.name} tidak mencukupi (tersedia: ${product.stock})`,
				});
			}
		}

		// Calculate total
		let totalAmount = 0;
		const orderItems = items.map((item: any) => {
			const product = products.find((p) => p.id === item.productId)!;
			const qty = parseInt(item.quantity);
			totalAmount += product.price * qty;
			return {
				productId: product.id,
				quantity: qty,
				price: product.price,
			};
		});

		// Create order WITHOUT reducing stock (stock will be reduced after payment confirmed via webhook)
		const order = await prisma.$transaction(async (tx) => {
			// Create order
			const newOrder = await tx.order.create({
				data: {
					userId,
					totalAmount,
					notes: notes?.trim() || null,
					items: {
						create: orderItems,
					},
				},
				include: {
					items: { include: { product: true } },
					user: { select: { name: true, email: true } },
				},
			});

			return newOrder;
		});

		// Generate Midtrans Snap token for payment
		let snapToken: string | null = null;
		let midtransOrderId: string | null = null;
		try {
			midtransOrderId = generateMidtransOrderId(PaymentPrefix.ORDER, order.id);
			const snapResult = await createSnapTransaction({
				orderId: midtransOrderId,
				grossAmount: totalAmount,
				customerName: order.user?.name || "Customer",
				customerEmail: order.user?.email || "",
				itemDetails: order.items.map((item: any) => ({
					id: item.productId,
					price: item.price,
					quantity: item.quantity,
					name: item.product?.name || "Product",
				})),
			});
			snapToken = snapResult.token;

			// Save Midtrans data to order
			await prisma.order.update({
				where: { id: order.id },
				data: { midtransOrderId, snapToken },
			});
		} catch (midtransError) {
			console.error("Midtrans Snap token generation failed:", midtransError);
			// Order is still created with PENDING status; admin can handle manually
		}

		res.status(201).json({ ...order, snapToken, midtransOrderId });
	} catch (error) {
		console.error("Error creating order:", error);
		res.status(500).json({ error: "Gagal membuat pesanan" });
	}
});

// GET /api/orders/my - Get current user's orders
router.get("/my", authenticate, async (req: AuthenticatedRequest, res: Response) => {
	try {
		const userId = req.user!.userId;

		const orders = await prisma.order.findMany({
			where: { userId },
			include: {
				items: { include: { product: true } },
			},
			orderBy: { createdAt: "desc" },
		});

		res.json(orders);
	} catch (error) {
		console.error("Error fetching orders:", error);
		res.status(500).json({ error: "Gagal memuat pesanan" });
	}
});

// GET /api/orders/my/:id - Get order detail
router.get("/my/:id", authenticate, async (req: AuthenticatedRequest, res: Response) => {
	try {
		const userId = req.user!.userId;

		const order = await prisma.order.findFirst({
			where: { id: req.params.id, userId },
			include: {
				items: { include: { product: true } },
			},
		});

		if (!order) {
			return res.status(404).json({ error: "Pesanan tidak ditemukan" });
		}

		res.json(order);
	} catch (error) {
		console.error("Error fetching order:", error);
		res.status(500).json({ error: "Gagal memuat pesanan" });
	}
});

// ==========================================
// ADMIN ROUTES (SUPERADMIN only)
// ==========================================

// GET /api/orders/admin/all - List all orders
router.get("/admin/all", authenticate, authorize("SUPERADMIN"), async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { status, page = "1", limit = "20" } = req.query;
		const pageNum = Math.max(1, parseInt(page as string));
		const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
		const skip = (pageNum - 1) * limitNum;

		const where: any = {};
		if (status) where.status = status;

		const [orders, total] = await Promise.all([
			prisma.order.findMany({
				where,
				include: {
					user: { select: { id: true, name: true, email: true } },
					items: { include: { product: { select: { id: true, name: true, thumbnail: true } } } },
				},
				orderBy: { createdAt: "desc" },
				skip,
				take: limitNum,
			}),
			prisma.order.count({ where }),
		]);

		res.json({
			data: orders,
			total,
			page: pageNum,
			totalPages: Math.ceil(total / limitNum),
		});
	} catch (error) {
		console.error("Error fetching admin orders:", error);
		res.status(500).json({ error: "Gagal memuat pesanan" });
	}
});

// PATCH /api/orders/admin/:id/status - Update order status
router.patch("/admin/:id/status", authenticate, authorize("SUPERADMIN"), async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { status } = req.body;

		const validStatuses = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED"];
		if (!status || !validStatuses.includes(status)) {
			return res.status(400).json({ error: "Status tidak valid" });
		}

		const order = await prisma.order.findUnique({
			where: { id },
			include: { items: true },
		});

		if (!order) {
			return res.status(404).json({ error: "Pesanan tidak ditemukan" });
		}

		// Prevent confirming orders that haven't been paid via Midtrans
		if (status === "CONFIRMED" && !order.paidAt && order.status === "PENDING") {
			return res.status(400).json({ error: "Pesanan belum dibayar via Midtrans. Tidak bisa dikonfirmasi sebelum pembayaran diterima." });
		}

		// If cancelling, restore stock
		if (status === "CANCELLED" && order.status !== "CANCELLED") {
			await prisma.$transaction(async (tx) => {
				for (const item of order.items) {
					await tx.product.update({
						where: { id: item.productId },
						data: {
							stock: { increment: item.quantity },
							status: "ACTIVE",
						},
					});
				}
				await tx.order.update({
					where: { id },
					data: { status },
				});
			});
		} else {
			await prisma.order.update({
				where: { id },
				data: { status },
			});
		}

		const updated = await prisma.order.findUnique({
			where: { id },
			include: {
				user: { select: { id: true, name: true, email: true } },
				items: { include: { product: true } },
			},
		});

		res.json(updated);
	} catch (error) {
		console.error("Error updating order status:", error);
		res.status(500).json({ error: "Gagal mengupdate status pesanan" });
	}
});

export default router;
