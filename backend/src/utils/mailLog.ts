import type { Transporter } from "nodemailer";
import { prisma } from "../lib/prisma";

// Every outgoing email belongs to one of these. Keep in sync with the
// descriptions shown on the superadmin Mail page.
export type MailCategory = "VERIFICATION" | "PASSWORD_RESET" | "TICKET";

interface MailOptions {
	from: string;
	to: string;
	subject: string;
	html?: string;
	text?: string;
	attachments?: any[];
}

// Send an email and record the attempt (success or failure) so the superadmin
// can track usage against the SMTP daily limit. Logging is best-effort and
// never masks a real send error — it's fire-and-forget and the original error
// still propagates to the caller.
// Who triggered the email — the account name and (when known) its user id.
// Guest ticket/voting buyers have no userId, only a name.
interface MailMeta {
	userId?: string | null;
	name?: string | null;
}

export async function sendAndLog(
	transporter: Transporter,
	options: MailOptions,
	category: MailCategory,
	meta: MailMeta = {}
): Promise<void> {
	try {
		await transporter.sendMail(options);
		void logEmail(category, options, "SENT", null, meta);
	} catch (err: any) {
		void logEmail(category, options, "FAILED", String(err?.message || err), meta);
		throw err;
	}
}

function logEmail(
	category: MailCategory,
	options: MailOptions,
	status: "SENT" | "FAILED",
	error: string | null,
	meta: MailMeta
) {
	return prisma.emailLog
		.create({
			data: {
				category,
				recipient: options.to,
				recipientName: meta.name ?? null,
				userId: meta.userId ?? null,
				subject: options.subject,
				status,
				error,
			},
		})
		.catch(() => {});
}
