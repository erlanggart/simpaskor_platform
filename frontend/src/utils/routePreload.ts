/**
 * Route chunk pre-loading.
 *
 * Every page in App.tsx is `lazy()`-loaded, so the first navigation to a route
 * has to download its JS chunk before anything renders. By warming that chunk
 * on link hover/focus (a few hundred ms before the click), navigation feels
 * instant — by the time the user clicks, the chunk is usually already parsed.
 *
 * Each entry maps a pathname matcher to the SAME dynamic import used by the
 * corresponding `lazy(...)` call in App.tsx. The factory is referenced (not
 * awaited) — the browser caches the module promise, so the later `lazy()` for
 * the real navigation resolves immediately.
 *
 * Safety: a stale or wrong entry is harmless — it only warms (or fails to warm)
 * a chunk and never affects routing. Keep the import paths in sync with App.tsx.
 */

type Importer = () => Promise<unknown>;

// Ordered: first matching test wins. Use functions so we can match both exact
// paths and event-scoped paths (which contain a dynamic :slug segment).
const ROUTE_IMPORTERS: Array<{ test: (p: string) => boolean; load: Importer }> = [
	// ---- SuperAdmin ----
	{ test: (p) => p === "/admin/dashboard", load: () => import("../pages/admin/Dashboard") },
	{ test: (p) => p.startsWith("/admin/users"), load: () => import("../pages/admin/UserManagement") },
	{ test: (p) => p.startsWith("/admin/assessment-categories"), load: () => import("../pages/admin/AssessmentCategoryManagement") },
	{ test: (p) => p === "/admin/events", load: () => import("../pages/admin/EventManagement") },
	{ test: (p) => p.startsWith("/admin/products"), load: () => import("../pages/admin/ProductManagement") },
	{ test: (p) => p.startsWith("/admin/orders"), load: () => import("../pages/admin/OrderManagement") },
	{ test: (p) => p.startsWith("/admin/guides"), load: () => import("../pages/admin/GuideManagement") },
	{ test: (p) => p.startsWith("/admin/packages"), load: () => import("../pages/admin/PackageManagement") },
	{ test: (p) => p.startsWith("/admin/revenue-share"), load: () => import("../pages/admin/RevenueShareManagement") },
	{ test: (p) => p.startsWith("/admin/disbursements"), load: () => import("../pages/admin/DisbursementManagement") },
	{ test: (p) => p.startsWith("/admin/api-integration"), load: () => import("../pages/admin/ApiIntegration") },
	{ test: (p) => p.startsWith("/admin/settings"), load: () => import("../pages/admin/Settings") },
	{ test: (p) => p.startsWith("/admin/backup"), load: () => import("../pages/admin/Backup") },

	// ---- Event-scoped (panitia + admin share these page components) ----
	{ test: (p) => /\/events\/[^/]+\/peserta$/.test(p), load: () => import("../pages/panitia/EventParticipantManagement") },
	{ test: (p) => /\/events\/[^/]+\/juri$/.test(p), load: () => import("../pages/panitia/ManageJury") },
	{ test: (p) => /\/events\/[^/]+\/materi$/.test(p), load: () => import("../pages/panitia/ManageMateri") },
	{ test: (p) => /\/events\/[^/]+\/juara$/.test(p), load: () => import("../pages/panitia/ManageJuara") },
	{ test: (p) => /\/events\/[^/]+\/field-rechecking$/.test(p), load: () => import("../pages/panitia/FieldRechecking") },
	{ test: (p) => /\/events\/[^/]+\/rekapitulasi$/.test(p), load: () => import("../pages/panitia/EventRecap") },
	{ test: (p) => /\/events\/[^/]+\/ticketing$/.test(p), load: () => import("../pages/panitia/EventTicketing") },
	{ test: (p) => /\/events\/[^/]+\/voting$/.test(p), load: () => import("../pages/panitia/EventVoting") },
	{ test: (p) => /\/events\/[^/]+\/disbursement$/.test(p), load: () => import("../pages/panitia/EventDisbursement") },
	{ test: (p) => /\/panitia\/events\/[^/]+\/manage$/.test(p), load: () => import("../pages/panitia/ManageEvent") },

	// ---- Panitia (pre-assign) ----
	{ test: (p) => p === "/panitia/dashboard", load: () => import("../pages/panitia/Dashboard") },
	{ test: (p) => p === "/panitia/events-list", load: () => import("../pages/panitia/Events") },
	{ test: (p) => p === "/panitia/panduan", load: () => import("../pages/panitia/Panduan") },

	// ---- Juri (pre-assign) ----
	{ test: (p) => p === "/juri/dashboard", load: () => import("../pages/juri/Dashboard") },
	{ test: (p) => p === "/juri/invitations", load: () => import("../pages/juri/Invitations") },
	{ test: (p) => p === "/juri/events", load: () => import("../pages/juri/MyEvents") },
	{ test: (p) => /\/juri\/events\/[^/]+\/info$/.test(p), load: () => import("../pages/juri/EventInfo") },
	{ test: (p) => /\/juri\/events\/[^/]+\/materi$/.test(p), load: () => import("../pages/juri/EventMateri") },
	{ test: (p) => /\/juri\/events\/[^/]+\/peserta$/.test(p), load: () => import("../pages/juri/EventPeserta") },
	{ test: (p) => /\/juri\/events\/[^/]+\/penilaian$/.test(p), load: () => import("../pages/juri/EventPenilaian") },

	// ---- Peserta ----
	{ test: (p) => p === "/peserta/dashboard", load: () => import("../pages/peserta/Dashboard") },
	{ test: (p) => p === "/peserta/events", load: () => import("../pages/peserta/EventsAvailable") },
	{ test: (p) => p === "/peserta/registrations", load: () => import("../pages/peserta/Registrations") },
	{ test: (p) => p.startsWith("/peserta/assessment-history"), load: () => import("../pages/peserta/AssessmentHistory") },

	// ---- Shared ----
	{ test: (p) => p.endsWith("/profile"), load: () => import("../pages/Profile") },
];

// Avoid kicking off the same import twice in a single session.
const warmed = new Set<string>();

/** Warm the JS chunk for the page that `pathname` will render. Best-effort. */
export function preloadRoute(pathname: string): void {
	if (!pathname || warmed.has(pathname)) return;
	const match = ROUTE_IMPORTERS.find((entry) => entry.test(pathname));
	if (!match) return;
	warmed.add(pathname);
	// Swallow rejections — a failed warm just means the real navigation pays
	// the normal load cost; it must never surface as an error.
	void match.load().catch(() => warmed.delete(pathname));
}
