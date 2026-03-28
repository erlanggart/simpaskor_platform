import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../utils/api";

declare global {
	interface Window {
		snap?: {
			pay: (
				token: string,
				callbacks: {
					onSuccess?: (result: any) => void;
					onPending?: (result: any) => void;
					onError?: (result: any) => void;
					onClose?: () => void;
				}
			) => void;
		};
	}
}

interface MidtransConfig {
	clientKey: string;
	isProduction: boolean;
}

/**
 * Hook to load Midtrans Snap.js and trigger payments
 */
export function usePayment() {
	const [isLoading, setIsLoading] = useState(false);
	const [isSnapReady, setIsSnapReady] = useState(false);
	const configRef = useRef<MidtransConfig | null>(null);

	// Load Snap.js on mount
	useEffect(() => {
		let cancelled = false;

		const loadSnap = async () => {
			try {
				// Fetch client key from backend
				const res = await api.get("/payments/client-key");
				const { clientKey, isProduction } = res.data;

				if (cancelled || !clientKey) return;
				configRef.current = { clientKey, isProduction };

				const snapUrl = isProduction
					? "https://app.midtrans.com/snap/snap.js"
					: "https://app.sandbox.midtrans.com/snap/snap.js";

				// Check if already loaded
				const existingScript = document.querySelector(`script[src="${snapUrl}"]`);
				if (existingScript) {
					setIsSnapReady(!!window.snap);
					return;
				}

				// Load the script
				const script = document.createElement("script");
				script.src = snapUrl;
				script.setAttribute("data-client-key", clientKey);
				script.onload = () => {
					if (!cancelled) setIsSnapReady(true);
				};
				script.onerror = () => {
					console.error("Failed to load Midtrans Snap.js");
				};
				document.head.appendChild(script);
			} catch (err) {
				console.error("Failed to fetch Midtrans config:", err);
			}
		};

		loadSnap();
		return () => {
			cancelled = true;
		};
	}, []);

	/**
	 * Open Midtrans Snap payment popup
	 */
	const pay = useCallback(
		(
			snapToken: string,
			callbacks?: {
				onSuccess?: (result: any) => void;
				onPending?: (result: any) => void;
				onError?: (result: any) => void;
				onClose?: () => void;
			}
		) => {
			if (!window.snap) {
				console.error("Snap.js not loaded yet");
				return;
			}

			setIsLoading(true);

			window.snap.pay(snapToken, {
				onSuccess: (result: any) => {
					setIsLoading(false);
					callbacks?.onSuccess?.(result);
				},
				onPending: (result: any) => {
					setIsLoading(false);
					callbacks?.onPending?.(result);
				},
				onError: (result: any) => {
					setIsLoading(false);
					callbacks?.onError?.(result);
				},
				onClose: () => {
					setIsLoading(false);
					callbacks?.onClose?.();
				},
			});
		},
		[]
	);

	return { pay, isLoading, isSnapReady };
}
