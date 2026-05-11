import type { PackageTier } from "../types/eventWizard";
import { getPackageName, getPackagePriceLabel } from "./packagePricing";

export const ADMIN_WHATSAPP_NUMBER = "6285111209133";

export interface DPWhatsAppEvent {
	title?: string | null;
	packageTier?: PackageTier | string | null;
	packageName?: string | null;
	packagePriceLabel?: string | null;
	startDate?: string | Date | null;
	endDate?: string | Date | null;
	province?: string | null;
	city?: string | null;
	venue?: string | null;
	mode?: "dp" | "negotiation";
}

function formatDate(value: string | Date | null | undefined): string | null {
	if (!value) return null;

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;

	return date.toLocaleDateString("id-ID", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});
}

function formatSchedule(startDate: DPWhatsAppEvent["startDate"], endDate: DPWhatsAppEvent["endDate"]): string {
	const start = formatDate(startDate);
	const end = formatDate(endDate);

	if (start && end && start !== end) return `${start} - ${end}`;
	return start || end || "-";
}

function formatLocation(event: DPWhatsAppEvent): string {
	return [event.venue, event.city, event.province]
		.filter((part): part is string => Boolean(part && part.trim()))
		.join(", ") || "-";
}

export function buildDPWhatsAppMessage(event: DPWhatsAppEvent): string {
	const tier = event.packageTier;
	const packageName = event.packageName || getPackageName(tier);
	const packagePriceLabel = event.packagePriceLabel || getPackagePriceLabel(tier);
	const isNegotiation = event.mode === "negotiation";

	return [
		"Halo Admin Simpaskor!",
		"",
		isNegotiation
			? "Saya ingin melakukan negosiasi harga dan bagi hasil untuk event."
			: "Saya ingin mendaftarkan event dengan sistem DP (Down Payment).",
		"",
		`*Nama Event:* ${event.title || "-"}`,
		`*Paket Dipilih:* ${packageName} (${packagePriceLabel})`,
		`*Waktu Pelaksanaan:* ${formatSchedule(event.startDate, event.endDate)}`,
		`*Lokasi Event:* ${formatLocation(event)}`,
		"",
		isNegotiation
			? "Mohon informasi lebih lanjut untuk kesepakatan harga dan persentase bagi hasil. Terima kasih!"
			: "Mohon informasi lebih lanjut untuk proses DP dan pembuatan event. Terima kasih!",
	].join("\n");
}

export function buildDPWhatsAppUrl(event: DPWhatsAppEvent): string {
	return `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(buildDPWhatsAppMessage(event))}`;
}
