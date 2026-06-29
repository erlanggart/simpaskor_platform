import rateLimit from "express-rate-limit";
import { Request, Response } from "express";

// Resolve the real client IP through proxy/load-balancer headers.
const ipKey = (req: Request): string => {
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
};

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

// Rate limiter for login & password-reset endpoints (brute-force protection).
// Only FAILED attempts count (skipSuccessfulRequests), so legitimate users who
// log in correctly are never blocked — but password guessing / credential
// stuffing / login flooding (e.g. k6) is stopped after a handful of failures.
export const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 20, // 20 FAILED attempts per 15 min per IP
	standardHeaders: true,
	legacyHeaders: false,
	skipSuccessfulRequests: true,
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
	handler: (req: Request, res: Response) => {
		res.status(429).json({
			error: "Too many attempts",
			message:
				"Terlalu banyak percobaan login gagal. Silakan coba lagi setelah 15 menit.",
			retryAfter: "15 minutes",
		});
	},
});

// Email-verification throttle: one verification email per IP per 15 minutes.
// Stops an IP from spinning up many fresh accounts and blasting verify emails.
// Shared across select-role and resend-verification so the window is global.
export const verificationLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 1,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: ipKey,
	// Peserta selection sends no email, so it must not consume the budget.
	skip: (req: Request) => req.body?.role === "PESERTA",
	handler: (_req: Request, res: Response) => {
		res.status(429).json({
			error: "Too many verification requests",
			message:
				"Permintaan email verifikasi terlalu sering. Tunggu 15 menit sebelum mencoba lagi.",
			retryAfter: "15 minutes",
		});
	},
});

// Password-reset throttle: one reset email per email address per 30 minutes,
// so a given account can't be spammed with reset links.
export const passwordResetLimiter = rateLimit({
	windowMs: 30 * 60 * 1000, // 30 minutes
	max: 1,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: (req: Request): string => {
		const email = req.body?.email;
		return typeof email === "string" && email
			? `reset:${email.trim().toLowerCase()}`
			: ipKey(req);
	},
	handler: (_req: Request, res: Response) => {
		res.status(429).json({
			error: "Too many reset requests",
			message:
				"Email reset password baru saja dikirim. Tunggu 30 menit sebelum meminta lagi.",
			retryAfter: "30 minutes",
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
