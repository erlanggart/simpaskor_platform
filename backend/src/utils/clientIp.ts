import { Request } from "express";

/**
 * Resolve the real client IP.
 *
 * We rely on Express's own X-Forwarded-For resolution (req.ip), which is
 * correct as long as `trust proxy` is configured with the infrastructure
 * subnets (see server.ts). This is preferred over reading X-Real-IP or the
 * raw X-Forwarded-For directly because:
 *   - X-Real-IP in this deployment is set by an intermediate proxy to its own
 *     address (172.168.20.23), not the client.
 *   - The left-most X-Forwarded-For entry is client-spoofable unless filtered
 *     against trusted proxies — which is exactly what req.ip already does.
 *
 * IPv6-mapped IPv4 (::ffff:1.2.3.4) is normalized to 1.2.3.4.
 */
export function getClientIp(req: Request): string | undefined {
	const ip = req.ip || req.socket.remoteAddress;
	if (!ip) return undefined;
	const v = ip.trim().replace(/^::ffff:/i, "");
	return v || undefined;
}
