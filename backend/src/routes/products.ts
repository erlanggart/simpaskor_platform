import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, authorize, optionalAuthenticate, AuthenticatedRequest } from "../middleware/auth";
import { uploadProductImage } from "../middleware/upload";

const router = Router();
const prisma = new PrismaClient();

// ==========================================
// PUBLIC ROUTES
// ==========================================

// GET /api/products - List all active products (public)
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { search, page = "1", limit = "12" } = req.query;
		const pageNum = Math.max(1, parseInt(page as string));
		const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
		const skip = (pageNum - 1) * limitNum;

		const where: any = { status: "ACTIVE" };

		if (search) {
			where.OR = [
				{ name: { contains: search as string, mode: "insensitive" } },
				{ description: { contains: search as string, mode: "insensitive" } },
			];
		}

		const [products, total] = await Promise.all([
			prisma.product.findMany({
				where,
				orderBy: { createdAt: "desc" },
				skip,
				take: limitNum,
			}),
			prisma.product.count({ where }),
		]);

		res.json({
			data: products,
			total,
			page: pageNum,
			totalPages: Math.ceil(total / limitNum),
		});
	} catch (error) {
		console.error("Error fetching products:", error);
		res.status(500).json({ error: "Gagal memuat produk" });
	}
});

// ==========================================
// ADMIN ROUTES (SUPERADMIN only)
// ==========================================

// GET /api/products/admin/all - List all products for admin (includes inactive)
// NOTE: Must be before /:id to avoid "admin" matching the :id param
router.get("/admin/all", authenticate, authorize("SUPERADMIN"), async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { search, status, page = "1", limit = "20" } = req.query;
		const pageNum = Math.max(1, parseInt(page as string));
		const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
		const skip = (pageNum - 1) * limitNum;

		const where: any = {};

		if (status) {
			where.status = status;
		}

		if (search) {
			where.OR = [
				{ name: { contains: search as string, mode: "insensitive" } },
				{ description: { contains: search as string, mode: "insensitive" } },
			];
		}

		const [products, total] = await Promise.all([
			prisma.product.findMany({
				where,
				orderBy: { createdAt: "desc" },
				skip,
				take: limitNum,
				include: {
					_count: { select: { orderItems: true } },
				},
			}),
			prisma.product.count({ where }),
		]);

		res.json({
			data: products,
			total,
			page: pageNum,
			totalPages: Math.ceil(total / limitNum),
		});
	} catch (error) {
		console.error("Error fetching admin products:", error);
		res.status(500).json({ error: "Gagal memuat produk" });
	}
});

// GET /api/products/:id - Get product detail (public)
router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
	try {
		const product = await prisma.product.findUnique({
			where: { id: req.params.id },
		});

		if (!product) {
			return res.status(404).json({ error: "Produk tidak ditemukan" });
		}

		res.json(product);
	} catch (error) {
		console.error("Error fetching product:", error);
		res.status(500).json({ error: "Gagal memuat produk" });
	}
});

// POST /api/products - Create product (SUPERADMIN only)
router.post(
	"/",
	authenticate,
	authorize("SUPERADMIN"),
	uploadProductImage.single("thumbnail"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { name, description, price, stock } = req.body;

			if (!name || price === undefined) {
				return res.status(400).json({ error: "Nama dan harga wajib diisi" });
			}

			const parsedPrice = parseFloat(price);
			const parsedStock = parseInt(stock) || 0;

			if (isNaN(parsedPrice) || parsedPrice < 0) {
				return res.status(400).json({ error: "Harga tidak valid" });
			}
			if (parsedStock < 0) {
				return res.status(400).json({ error: "Stok tidak valid" });
			}

			const thumbnail = req.file ? `/uploads/products/${req.file.filename}` : null;

			const product = await prisma.product.create({
				data: {
					name: name.trim(),
					description: description?.trim() || null,
					price: parsedPrice,
					stock: parsedStock,
					thumbnail,
					status: parsedStock > 0 ? "ACTIVE" : "OUT_OF_STOCK",
				},
			});

			res.status(201).json(product);
		} catch (error) {
			console.error("Error creating product:", error);
			res.status(500).json({ error: "Gagal membuat produk" });
		}
	}
);

// PUT /api/products/:id - Update product (SUPERADMIN only)
router.put(
	"/:id",
	authenticate,
	authorize("SUPERADMIN"),
	uploadProductImage.single("thumbnail"),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { id } = req.params;
			const { name, description, price, stock, status } = req.body;

			const existing = await prisma.product.findUnique({ where: { id } });
			if (!existing) {
				return res.status(404).json({ error: "Produk tidak ditemukan" });
			}

			const data: any = {};
			if (name !== undefined) data.name = name.trim();
			if (description !== undefined) data.description = description.trim() || null;
			if (price !== undefined) {
				const parsedPrice = parseFloat(price);
				if (isNaN(parsedPrice) || parsedPrice < 0) {
					return res.status(400).json({ error: "Harga tidak valid" });
				}
				data.price = parsedPrice;
			}
			if (stock !== undefined) {
				const parsedStock = parseInt(stock);
				if (isNaN(parsedStock) || parsedStock < 0) {
					return res.status(400).json({ error: "Stok tidak valid" });
				}
				data.stock = parsedStock;
			}
			if (status !== undefined) {
				if (!["ACTIVE", "INACTIVE", "OUT_OF_STOCK"].includes(status)) {
					return res.status(400).json({ error: "Status tidak valid" });
				}
				data.status = status;
			}
			if (req.file) {
				data.thumbnail = `/uploads/products/${req.file.filename}`;
			}

			const product = await prisma.product.update({
				where: { id },
				data,
			});

			res.json(product);
		} catch (error) {
			console.error("Error updating product:", error);
			res.status(500).json({ error: "Gagal mengupdate produk" });
		}
	}
);

// PATCH /api/products/:id/stock - Update stock only (SUPERADMIN only)
router.patch("/:id/stock", authenticate, authorize("SUPERADMIN"), async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { stock } = req.body;

		if (stock === undefined || isNaN(parseInt(stock)) || parseInt(stock) < 0) {
			return res.status(400).json({ error: "Stok tidak valid" });
		}

		const parsedStock = parseInt(stock);

		const product = await prisma.product.update({
			where: { id },
			data: {
				stock: parsedStock,
				status: parsedStock === 0 ? "OUT_OF_STOCK" : "ACTIVE",
			},
		});

		res.json(product);
	} catch (error) {
		console.error("Error updating stock:", error);
		res.status(500).json({ error: "Gagal mengupdate stok" });
	}
});

// DELETE /api/products/:id - Delete product (SUPERADMIN only)
router.delete("/:id", authenticate, authorize("SUPERADMIN"), async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;

		const existing = await prisma.product.findUnique({
			where: { id },
			include: { _count: { select: { orderItems: true } } },
		});

		if (!existing) {
			return res.status(404).json({ error: "Produk tidak ditemukan" });
		}

		if (existing._count.orderItems > 0) {
			// Soft delete - set to INACTIVE instead
			await prisma.product.update({
				where: { id },
				data: { status: "INACTIVE" },
			});
			return res.json({ message: "Produk dinonaktifkan karena memiliki pesanan terkait" });
		}

		await prisma.product.delete({ where: { id } });
		res.json({ message: "Produk berhasil dihapus" });
	} catch (error) {
		console.error("Error deleting product:", error);
		res.status(500).json({ error: "Gagal menghapus produk" });
	}
});

export default router;
