import express, { Request } from "express";
import { prisma } from "../lib/prisma";

const router = express.Router();

const STATIC_SITEMAP_PATHS = [
	{ path: "/", changefreq: "daily", priority: "1.0" },
	{ path: "/events", changefreq: "daily", priority: "0.9" },
	{ path: "/e-ticketing", changefreq: "weekly", priority: "0.7" },
	{ path: "/e-voting", changefreq: "weekly", priority: "0.7" },
	{ path: "/marketplace", changefreq: "weekly", priority: "0.6" },
	{ path: "/mitra", changefreq: "monthly", priority: "0.5" },
	{ path: "/juries", changefreq: "weekly", priority: "0.5" },
	{ path: "/pelatih", changefreq: "weekly", priority: "0.5" },
	{ path: "/klasemen", changefreq: "daily", priority: "0.6" },
	{ path: "/packages", changefreq: "monthly", priority: "0.5" },
] as const;

const escapeXml = (value: string) =>
	value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");

const normalizeOrigin = (value: string) => {
	const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
	return withProtocol.replace(/\/+$/, "");
};

const getPublicSiteUrl = (req: Request) => {
	const configuredUrl = process.env.PUBLIC_SITE_URL || process.env.FRONTEND_URL;
	if (configuredUrl) return normalizeOrigin(configuredUrl);

	const host = req.get("x-forwarded-host") || req.get("host") || "simpaskor.id";
	const protocol = req.get("x-forwarded-proto") || req.protocol || "https";
	return normalizeOrigin(`${protocol}://${host}`);
};

const buildUrl = (siteUrl: string, path: string) => {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return `${siteUrl}${normalizedPath}`;
};

router.get("/robots.txt", (req, res) => {
	const siteUrl = getPublicSiteUrl(req);

	res.type("text/plain");
	res.setHeader("Cache-Control", "public, max-age=3600");
	res.send(
		[
			"User-agent: *",
			"Allow: /",
			"Disallow: /admin/",
			"Disallow: /panitia/",
			"Disallow: /peserta/",
			"Disallow: /juri/",
			"Disallow: /pelatih/",
			"Disallow: /mitra/dashboard",
			"",
			`Sitemap: ${siteUrl}/sitemap.xml`,
			"",
		].join("\n")
	);
});

router.get("/sitemap.xml", async (req, res) => {
	try {
		const siteUrl = getPublicSiteUrl(req);
		const [events, ticketedEvents, votingEvents] = await Promise.all([
			prisma.event.findMany({
				where: { status: { notIn: ["DRAFT", "CANCELLED"] } },
				select: { id: true, slug: true, updatedAt: true },
				orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
				take: 50000,
			}),
			prisma.event.findMany({
				where: {
					status: { notIn: ["DRAFT", "CANCELLED"] },
					ticketConfig: { isNot: null },
				},
				select: { id: true, slug: true, updatedAt: true },
				orderBy: [{ updatedAt: "desc" }],
				take: 10000,
			}),
			prisma.event.findMany({
				where: {
					status: { notIn: ["DRAFT", "CANCELLED"] },
					votingConfig: { isNot: null },
				},
				select: { id: true, slug: true, updatedAt: true },
				orderBy: [{ updatedAt: "desc" }],
				take: 10000,
			}),
		]);

		const now = new Date().toISOString();
		const staticUrls = STATIC_SITEMAP_PATHS.map((item) => ({
			loc: buildUrl(siteUrl, item.path),
			lastmod: now,
			changefreq: item.changefreq,
			priority: item.priority,
		}));

		const eventUrls = events.map((event) => ({
			loc: buildUrl(siteUrl, `/events/${event.slug || event.id}`),
			lastmod: event.updatedAt.toISOString(),
			changefreq: "weekly" as const,
			priority: "0.8",
		}));

		// Ticketing events: canonical at /events/:slug but also appear in /e-ticketing
		const ticketingEventUrls = ticketedEvents
			.filter((e) => !events.find((ev) => ev.id === e.id)) // avoid dupes already in eventUrls
			.map((event) => ({
				loc: buildUrl(siteUrl, `/events/${event.slug || event.id}`),
				lastmod: event.updatedAt.toISOString(),
				changefreq: "daily" as const,
				priority: "0.85",
			}));

		// Voting events: canonical at /events/:slug but also appear in /e-voting
		const votingEventUrls = votingEvents
			.filter(
				(e) =>
					!events.find((ev) => ev.id === e.id) &&
					!ticketedEvents.find((te) => te.id === e.id)
			)
			.map((event) => ({
				loc: buildUrl(siteUrl, `/events/${event.slug || event.id}`),
				lastmod: event.updatedAt.toISOString(),
				changefreq: "daily" as const,
				priority: "0.85",
			}));

		const urlEntries = [...staticUrls, ...ticketingEventUrls, ...votingEventUrls, ...eventUrls]
			.map(
				(item) => [
					"  <url>",
					`    <loc>${escapeXml(item.loc)}</loc>`,
					`    <lastmod>${escapeXml(item.lastmod)}</lastmod>`,
					`    <changefreq>${item.changefreq}</changefreq>`,
					`    <priority>${item.priority}</priority>`,
					"  </url>",
				].join("\n")
			)
			.join("\n");

		const sitemap = [
			'<?xml version="1.0" encoding="UTF-8"?>',
			'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
			urlEntries,
			"</urlset>",
			"",
		].join("\n");

		res.type("application/xml");
		res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600");
		res.send(sitemap);
	} catch (error) {
		console.error("Error generating sitemap:", error);
		res.status(500).type("text/plain").send("Failed to generate sitemap");
	}
});

export default router;
