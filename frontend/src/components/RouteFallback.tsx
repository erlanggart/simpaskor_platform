/**
 * Spinner sized to fill the content area of a layout (NOT the whole screen).
 *
 * Used as the Suspense fallback *inside* each layout, around <Outlet />, so
 * that while a lazily-loaded page chunk downloads the sidebar/header stay
 * mounted and only the content region shows a spinner. This replaces the old
 * single full-screen black fallback in App.tsx that made every navigation
 * blank the entire shell (perceived as a "freeze" before the page appeared).
 */
export const RouteFallback = () => (
	<div className="w-full min-h-[60vh] flex items-center justify-center">
		<div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
	</div>
);

export default RouteFallback;
