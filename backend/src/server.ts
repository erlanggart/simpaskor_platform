import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

// Import routes
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());

// CORS configuration for development
app.use(
	cors({
		origin: ["http://localhost:5173", "http://localhost:5174"],
		credentials: true,
	})
);

// Rate limiting
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/", (req, res) => {
	res.json({
		message: "Welcome to Simpaskor Platform API",
		version: "1.0.0",
		status: "running",
		endpoints: {
			auth: "/api/auth",
			users: "/api/users",
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
