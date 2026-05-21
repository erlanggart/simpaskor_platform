import React, { lazy, Suspense, ComponentProps } from "react";
import { QRCodeSVG as QRCodeSVGType, QRCodeCanvas as QRCodeCanvasType } from "qrcode.react";

// Lazy chunks — qrcode.react is only fetched when a QR actually renders
// (after a successful ticket purchase), keeping it out of the initial
// ETicketingPage bundle.
const QRCodeSVGLazy = lazy(() =>
	import("qrcode.react").then((m) => ({ default: m.QRCodeSVG }))
);
const QRCodeCanvasLazy = lazy(() =>
	import("qrcode.react").then((m) => ({ default: m.QRCodeCanvas }))
);

const QrPlaceholder: React.FC<{ size?: number }> = ({ size = 180 }) => (
	<div
		style={{ width: size, height: size }}
		className="bg-gray-100 dark:bg-white/[0.04] rounded animate-pulse"
		aria-hidden
	/>
);

export const LazyQRCodeSVG: React.FC<ComponentProps<typeof QRCodeSVGType>> = (props) => (
	<Suspense fallback={<QrPlaceholder size={typeof props.size === "number" ? props.size : 180} />}>
		<QRCodeSVGLazy {...props} />
	</Suspense>
);

export const LazyQRCodeCanvas: React.FC<ComponentProps<typeof QRCodeCanvasType>> = (props) => (
	<Suspense fallback={null}>
		<QRCodeCanvasLazy {...props} />
	</Suspense>
);
