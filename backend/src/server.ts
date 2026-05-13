import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import path from "path";

// Import routes
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import eventRoutes from "./routes/events";
import couponRoutes from "./routes/coupons";
import assessmentCategoryRoutes from "./routes/assessmentCategories";
import schoolCategoryRoutes from "./routes/schoolCategories";
import registrationRoutes from "./routes/registrations";
import uploadRoutes from "./routes/upload";
import juryRoutes from "./routes/juries";
import evaluationRoutes from "./routes/evaluations";
import materialRoutes from "./routes/materials";
import juaraCategoryRoutes from "./routes/juaraCategories";
import performanceFieldRoutes from "./routes/performanceFields";
import adminStatsRoutes from "./routes/adminStats";
import productRoutes from "./routes/products";
import orderRoutes from "./routes/orders";
import ticketRoutes from "./routes/tickets";
import votingRoutes from "./routes/voting";
import paymentRoutes from "./routes/payments";
import registrationPaymentRoutes from "./routes/registrationPayments";
import guideRoutes from "./routes/guides";
import eventSubmissionRoutes from "./routes/eventSubmissions";
import eventPaymentRoutes from "./routes/eventPayments";
import visitorRoutes from "./routes/visitors";
import settingsRoutes from "./routes/settings";
import backupRoutes from "./routes/backup";
import disbursementRoutes from "./routes/disbursements";
import externalFinanceRoutes from "./routes/externalFinance";
import mitraRoutes from "./routes/mitra";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
	helmet({
		crossOriginResourcePolicy: { policy: "cross-origin" },
		// Allow iframe embedding only for upload previews
		frameguard: { action: "sameorigin" },
	})
);

// CORS configuration - strict whitelist
const allowedOrigins = [
	"http://localhost:5173",
	"http://localhost:5174",
	"https://localhost:5173",
	"https://localhost:5174",
	...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
	...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL.replace("http://", "https://")] : []),
	...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim()) : []),
].filter(Boolean);

app.use(
	cors((req, callback) => {
		const corsOptions = {
			origin: (origin: string | undefined, originCallback: (err: Error | null, allow?: boolean) => void) => {
				// Allow requests with no origin (server-to-server, webhooks)
				if (!origin) return originCallback(null, true);
				if (req.path.startsWith("/api/external") || allowedOrigins.includes(origin)) {
					originCallback(null, true);
				} else {
					originCallback(new Error("Not allowed by CORS"));
				}
			},
			credentials: true,
			methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
			allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
			exposedHeaders: ["Content-Range", "X-Content-Range"],
			maxAge: 600, // 10 minutes
		};

		callback(null, corsOptions);
	})
);

// Rate limiting - Global limiter untuk semua request
const RATE_LIMIT_WINDOW_MS = 1 * 60 * 1000; // 1 minute
const limiter = rateLimit({
	windowMs: RATE_LIMIT_WINDOW_MS,
	max: 1000, // 1000 requests per minute (SPA makes many concurrent API calls per page)
	standardHeaders: true,
	legacyHeaders: false,
	// Skip rate limiting for GET requests (browsing), voting flows, and in development
	skip: (req) => process.env.NODE_ENV === 'development' || req.method === 'GET' || req.path.startsWith("/api/voting"),
	handler: (req, res) => {
		res.status(429).json({
			error: "Too many requests",
			message: "Terlalu banyak permintaan. Silakan tunggu sebentar dan coba lagi.",
			retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
		});
	},
});
app.use(limiter);

// Increase body size limit for base64 image uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Stricter rate limiters for payment/purchase endpoints (only for write operations)
const paymentLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 30, // 30 write requests per minute
	standardHeaders: true,
	legacyHeaders: false,
	// Only count POST/PUT/PATCH/DELETE (write operations), skip GET (browsing)
	skip: (req) => {
		if (req.method === 'GET') return true;

		const isAdminEmailResend =
			req.baseUrl === "/api/tickets" &&
			req.path.startsWith("/admin/resend-email/");

		return isAdminEmailResend;
	},
	message: { error: "Terlalu banyak permintaan transaksi. Silakan tunggu sebentar." },
});

const webhookLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 300,
	standardHeaders: true,
	legacyHeaders: false,
});

// Serve static files for uploads with proper headers for iframe embedding
app.use("/uploads", (req, res, next) => {
	// Remove X-Frame-Options to allow embedding (CSP takes precedence)
	res.removeHeader("X-Frame-Options");
	// Allow embedding in iframe from frontend origins
	res.setHeader("Content-Security-Policy", "frame-ancestors 'self' http://localhost:5173 http://localhost:5174 http://localhost:3001");
	next();
}, express.static(path.join(__dirname, "../uploads")));

// Routes
app.get("/", (req, res) => {
	res.json({
		message: "Welcome to Simpaskor Platform API",
		version: "1.0.0",
		status: "running",
		endpoints: {
			auth: "/api/auth",
			users: "/api/users",
			events: "/api/events",
			coupons: "/api/coupons",
			assessmentCategories: "/api/assessment-categories",
			schoolCategories: "/api/school-categories",
			registrations: "/api/registrations",
			juries: "/api/juries",
			health: "/api/health",
		},
	});
});

app.get("/api/health", (req, res) => {
	res.json({
		status: "OK",
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
		database: "connected",
	});
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/assessment-categories", assessmentCategoryRoutes);
app.use("/api/school-categories", schoolCategoryRoutes);
app.use("/api/registrations", registrationRoutes);
// Increase timeout for file upload routes to 120 seconds
app.use("/api/upload", (req, res, next) => {
	req.setTimeout(120000);
	res.setTimeout(120000);
	next();
}, uploadRoutes);
app.use("/api/juries", juryRoutes);
app.use("/api/evaluations", evaluationRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/juara-categories", juaraCategoryRoutes);
app.use("/api/performance", performanceFieldRoutes);
app.use("/api/admin", adminStatsRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", paymentLimiter, orderRoutes);
app.use("/api/tickets", paymentLimiter, ticketRoutes);
app.use("/api/voting", votingRoutes);
app.use("/api/payments", webhookLimiter, paymentRoutes);
app.use("/api/registration-payments", paymentLimiter, registrationPaymentRoutes);
app.use("/api/guides", guideRoutes);
app.use("/api/event-submissions", eventSubmissionRoutes);
app.use("/api/event-payments", eventPaymentRoutes);
app.use("/api/visitors", visitorRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/backup", backupRoutes);
app.use("/api/disbursements", disbursementRoutes);
app.use("/api/external", externalFinanceRoutes);
app.use("/api/mitra", mitraRoutes);

// Error handling middleware
app.use(
	(
		err: Error,
		req: express.Request,
		res: express.Response,
		next: express.NextFunction
	) => {
		console.error(err.stack);
		res.status(500).json({
			error: "Something went wrong!",
			message:
				process.env.NODE_ENV === "development"
					? err.message
					: "Internal server error",
		});
	}
);

// 404 handler
app.use("*", (req, res) => {
	res.status(404).json({
		error: "Route not found",
	});
});

app.listen(PORT, () => {
	console.log(`🚀 Server running on port ${PORT}`);
	console.log(`📡 API available at http://localhost:${PORT}`);
	console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
});
