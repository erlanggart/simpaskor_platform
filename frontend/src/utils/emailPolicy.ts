export const GMAIL_ONLY_EMAIL_MESSAGE = "Email harus menggunakan domain gmail.com";

export function normalizeEmail(value: string): string {
	return value.trim().toLowerCase();
}

export function isGmailEmail(value: string): boolean {
	return /^[^\s@]+@gmail\.com$/.test(normalizeEmail(value));
}
