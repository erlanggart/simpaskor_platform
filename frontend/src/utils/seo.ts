import { config } from "./config";

export const getSiteUrl = () => {
	const rawUrl = config.seo.siteUrl || "https://simpaskor.id";
	const withProtocol = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
	return withProtocol.replace(/\/+$/, "");
};

export const absoluteUrl = (value: string, baseUrl = getSiteUrl()) => {
	if (/^https?:\/\//i.test(value)) return value;
	const normalizedBase = baseUrl.replace(/\/+$/, "");
	const normalizedPath = value.startsWith("/") ? value : `/${value}`;
	return `${normalizedBase}${normalizedPath}`;
};

export const stripHtml = (value: string) =>
	value
		.replace(/<[^>]*>/g, " ")
		.replace(/\s+/g, " ")
		.trim();

export const truncateText = (value: string, maxLength = 155) => {
	const cleanValue = stripHtml(value);
	if (cleanValue.length <= maxLength) return cleanValue;
	return `${cleanValue.slice(0, maxLength - 3).trim()}...`;
};
