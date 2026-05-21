import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../utils/api";
import { useAuth } from "./useAuth";

const SESSION_KEY = "simpaskor_live_session_id";
const HEARTBEAT_INTERVAL_MS = 15_000;

const getOrCreateSessionId = (): string => {
	try {
		const existing = sessionStorage.getItem(SESSION_KEY);
		if (existing) return existing;
		const id =
			typeof crypto !== "undefined" && "randomUUID" in crypto
				? crypto.randomUUID()
				: `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
		sessionStorage.setItem(SESSION_KEY, id);
		return id;
	} catch {
		// Storage blocked — fall back to a per-tab random id
		return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
	}
};

/**
 * Sends a heartbeat ping to /api/visitors/heartbeat every 15s so the backend
 * knows this browser tab is alive. Used to power the super-admin live-visitor
 * widget. Pings stop when the tab is hidden and resume when it becomes visible.
 */
export const useLiveVisitorHeartbeat = () => {
	const location = useLocation();
	const { user } = useAuth();
	const sessionIdRef = useRef<string>("");
	const lastPathRef = useRef<string>("");

	if (!sessionIdRef.current) sessionIdRef.current = getOrCreateSessionId();

	useEffect(() => {
		const sessionId = sessionIdRef.current;
		let cancelled = false;
		let handle: number | null = null;
		let idleHandle: number | null = null;
		let startTimeout: number | null = null;

		const ping = () => {
			if (cancelled) return;
			const path = lastPathRef.current || location.pathname;
			api
				.post(
					"/visitors/heartbeat",
					{
						sessionId,
						page: path,
						role: user?.role || null,
						userId: user?.id || null,
					},
					{
						timeout: 8_000,
						silent: true,
					}
				)
				.catch(() => {
					// Silently ignore — heartbeat is best-effort
				});
		};

		const tick = () => {
			if (document.visibilityState === "visible") ping();
		};

		// Defer the first heartbeat past the initial paint so it doesn't
		// compete with critical landing API requests. Use requestIdleCallback
		// when available, otherwise a small setTimeout fallback.
		const start = () => {
			if (cancelled) return;
			tick();
			handle = window.setInterval(tick, HEARTBEAT_INTERVAL_MS);
		};

		const requestIdle = (window as any).requestIdleCallback as
			| ((cb: () => void, opts?: { timeout: number }) => number)
			| undefined;
		if (requestIdle) {
			idleHandle = requestIdle(start, { timeout: 3000 });
		} else {
			startTimeout = window.setTimeout(start, 2000);
		}

		const onVisibilityChange = () => {
			if (document.visibilityState === "visible") ping();
		};
		document.addEventListener("visibilitychange", onVisibilityChange);

		// Best-effort: notify backend when tab is closing. Beacon survives navigation.
		const onUnload = () => {
			try {
				const blob = new Blob([JSON.stringify({ sessionId })], { type: "application/json" });
				navigator.sendBeacon?.(`${api.defaults.baseURL || ""}/visitors/leave`, blob);
			} catch {
				// ignore
			}
		};
		window.addEventListener("pagehide", onUnload);

		return () => {
			cancelled = true;
			if (handle !== null) window.clearInterval(handle);
			if (startTimeout !== null) window.clearTimeout(startTimeout);
			if (idleHandle !== null && (window as any).cancelIdleCallback) {
				(window as any).cancelIdleCallback(idleHandle);
			}
			document.removeEventListener("visibilitychange", onVisibilityChange);
			window.removeEventListener("pagehide", onUnload);
		};
	}, [user?.id, user?.role]);

	// Track route changes so the next heartbeat reports the new page immediately
	useEffect(() => {
		lastPathRef.current = location.pathname;
	}, [location.pathname]);
};
