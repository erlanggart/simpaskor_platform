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
import panitiaAssignmentRoutes from "./routes/panitiaAssignment";
import registrationRoutes from "./routes/registrations";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
	helmet({
		crossOriginResourcePolicy: { policy: "cross-origin" },
	})
);

// CORS configuration for development
app.use(
	cors({
		origin: ["http://localhost:5173", "http://localhost:5174"],
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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

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
			panitiaAssignment: "/api/panitia-assignment",
			registrations: "/api/registrations",
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
app.use("/api/panitia-assignment", panitiaAssignmentRoutes);
app.use("/api/registrations", registrationRoutes);

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
