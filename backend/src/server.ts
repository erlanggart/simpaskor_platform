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
import settingsRoutes from "./routes/settings";
import backupRoutes from "./routes/backup";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
	helmet({
		crossOriginResourcePolicy: { policy: "cross-origin" },
		// Disable X-Frame-Options to allow PDF embedding in iframe
		frameguard: false,
	})
);

// CORS configuration
const allowedOrigins = [
	"http://localhost:5173",
	"http://localhost:5174",
	"https://localhost:5173",
	"https://localhost:5174",
	...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
	...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL.replace("http://", "https://")] : []),
];
app.use(
	cors({
		origin: allowedOrigins,
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
		exposedHeaders: ["Content-Range", "X-Content-Range"],
		maxAge: 600, // 10 minutes
	})
);

// Rate limiting - Lebih longgar untuk development
const RATE_LIMIT_WINDOW_MS = 1 * 60 * 1000; // 1 minute
const limiter = rateLimit({
	windowMs: RATE_LIMIT_WINDOW_MS,
	max: 200, // limit each IP to 200 requests per minute (lebih dari cukup untuk development)
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
	// Skip rate limiting jika NODE_ENV === 'development'
	skip: (req) => process.env.NODE_ENV === 'development',
	// Custom handler untuk rate limit exceeded dengan message yang lebih informatif
	handler: (req, res) => {
		res.status(429).json({
			error: "Too many requests",
			message: "Terlalu banyak permintaan. Silakan tunggu sebentar dan coba lagi.",
			retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000), // in seconds
		});
	},
});
app.use(limiter);

// Increase body size limit for base64 image uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
app.use("/api/orders", orderRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/voting", votingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/registration-payments", registrationPaymentRoutes);
app.use("/api/guides", guideRoutes);
app.use("/api/event-submissions", eventSubmissionRoutes);
app.use("/api/event-payments", eventPaymentRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/backup", backupRoutes);

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
