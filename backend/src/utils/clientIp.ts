import { Request } from "express";

/**
 * Resolve the real client IP behind the nginx reverse-proxy chain.
 *
 * Order of preference:
 *  1. X-Real-IP — set by the immediate (trusted) nginx. After the container
 *     nginx real_ip config this is the actual client IP.
 *  2. First entry of X-Forwarded-For — the original client appended by the
 *     first proxy in the chain.
 *  3. req.ip / socket.remoteAddress — last-resort fallback.
 *
 * IPv6-mapped IPv4 (::ffff:1.2.3.4) is normalized to 1.2.3.4.
 */
export function getClientIp(req: Request): string | undefined {
	const normalize = (ip?: string | null): string | undefined => {
		if (!ip) return undefined;
		const v = ip.trim().replace(/^::ffff:/i, "");
		return v || undefined;
	};

	const realIp = req.headers["x-real-ip"];
	if (typeof realIp === "string" && realIp.trim()) {
		return normalize(realIp);
	}

	const xff = req.headers["x-forwarded-for"];
	if (xff) {
		const raw = Array.isArray(xff) ? xff[0] : xff;
		const first = raw ? raw.split(",")[0] : undefined;
		const normalized = normalize(first);
		if (normalized) return normalized;
	}

	return normalize(req.ip || req.socket.remoteAddress);
}
