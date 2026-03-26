import rateLimit from "express-rate-limit";
import { Request, Response } from "express";

// Rate limiter for registration endpoint
// Limits: 3 registrations per hour per IP address
export const registrationLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	max: 3, // Limit each IP to 3 registration requests per windowMs
	message: {
		error: "Too many registration attempts",
		message:
			"Terlalu banyak percobaan registrasi dari IP ini. Silakan coba lagi setelah 1 jam.",
		retryAfter: "1 hour",
	},
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
	// Skip successful requests (only count failed attempts)
	skipSuccessfulRequests: false,
	// Custom key generator to handle proxies
	keyGenerator: (req: Request): string => {
		// Try to get real IP from various headers (for proxy/load balancer support)
		const forwardedFor = req.headers["x-forwarded-for"];
		if (forwardedFor) {
			// x-forwarded-for can be a comma-separated list, get the first IP
			const ips = Array.isArray(forwardedFor)
				? forwardedFor[0]
				: forwardedFor.split(",")[0];
			return ips?.trim() || "unknown";
		}
		const realIp = req.headers["x-real-ip"];
		if (realIp) {
			const ip = Array.isArray(realIp) ? realIp[0] : realIp;
			return ip || "unknown";
		}
		// Fallback to req.ip
		return req.ip || "unknown";
	},
	// Custom handler for rate limit exceeded
	handler: (req: Request, res: Response) => {
		res.status(429).json({
			error: "Too many registration attempts",
			message:
				"Terlalu banyak percobaan registrasi dari IP ini. Silakan coba lagi setelah 1 jam.",
			retryAfter: "1 hour",
		});
	},
});

// General API rate limiter (can be used for other endpoints)
export const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Limit each IP to 100 requests per windowMs
	message: {
		error: "Too many requests",
		message: "Terlalu banyak permintaan. Silakan coba lagi nanti.",
	},
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: (req: Request): string => {
		const forwardedFor = req.headers["x-forwarded-for"];
		if (forwardedFor) {
			const ips = Array.isArray(forwardedFor)
				? forwardedFor[0]
				: forwardedFor.split(",")[0];
			return ips?.trim() || "unknown";
		}
		const realIp = req.headers["x-real-ip"];
		if (realIp) {
			const ip = Array.isArray(realIp) ? realIp[0] : realIp;
			return ip || "unknown";
		}
		return req.ip || "unknown";
	},
});
