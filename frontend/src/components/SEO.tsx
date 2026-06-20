import { useEffect } from "react";
import { absoluteUrl, getSiteUrl } from "../utils/seo";

type JsonLd = Record<string, unknown> | Record<string, unknown>[];

interface SEOProps {
	title: string;
	description: string;
	path?: string;
	image?: string | null;
	type?: "website" | "article" | "event";
	jsonLd?: JsonLd | null;
	noindex?: boolean;
}

const JSON_LD_ID = "simpaskor-jsonld";

const setMetaTag = (
	attribute: "name" | "property",
	key: string,
	content: string
) => {
	let tag = document.head.querySelector<HTMLMetaElement>(
		`meta[${attribute}="${key}"]`
	);

	if (!tag) {
		tag = document.createElement("meta");
		tag.setAttribute(attribute, key);
		document.head.appendChild(tag);
	}

	tag.setAttribute("content", content);
};

const setCanonical = (href: string) => {
	let tag = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

	if (!tag) {
		tag = document.createElement("link");
		tag.setAttribute("rel", "canonical");
		document.head.appendChild(tag);
	}

	tag.setAttribute("href", href);
};

const setJsonLd = (jsonLd: JsonLd | null | undefined) => {
	const existing = document.getElementById(JSON_LD_ID);

	if (!jsonLd) {
		existing?.remove();
		return;
	}

	const script =
		existing instanceof HTMLScriptElement
			? existing
			: document.createElement("script");

	script.id = JSON_LD_ID;
	script.type = "application/ld+json";
	script.textContent = JSON.stringify(jsonLd);

	if (!existing) {
		document.head.appendChild(script);
	}
};

const SEO: React.FC<SEOProps> = ({
	title,
	description,
	path = "/",
	image = "/simpaskor.png",
	type = "website",
	jsonLd,
	noindex = false,
}) => {
	useEffect(() => {
		const siteUrl = getSiteUrl();
		const pageUrl = absoluteUrl(path, siteUrl);
		const imageUrl = image ? absoluteUrl(image, siteUrl) : absoluteUrl("/simpaskor.png", siteUrl);
		const pageTitle = title.includes("Simpaskor") ? title : `${title} | Simpaskor`;

		document.title = pageTitle;
		setCanonical(pageUrl);

		setMetaTag("name", "description", description);
		setMetaTag("name", "robots", noindex ? "noindex, nofollow" : "index, follow");

		setMetaTag("property", "og:type", type);
		setMetaTag("property", "og:url", pageUrl);
		setMetaTag("property", "og:title", pageTitle);
		setMetaTag("property", "og:description", description);
		setMetaTag("property", "og:image", imageUrl);

		setMetaTag("property", "og:site_name", "Simpaskor");
		setMetaTag("property", "og:locale", "id_ID");

		setMetaTag("name", "twitter:card", "summary_large_image");
		setMetaTag("name", "twitter:url", pageUrl);
		setMetaTag("name", "twitter:title", pageTitle);
		setMetaTag("name", "twitter:description", description);
		setMetaTag("name", "twitter:image", imageUrl);

		setJsonLd(jsonLd);
	}, [description, image, jsonLd, noindex, path, title, type]);

	return null;
};

export default SEO;
