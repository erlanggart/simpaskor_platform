import nodemailer from "nodemailer";
import QRCode from "qrcode";

const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST || "smtp.gmail.com",
	port: parseInt(process.env.SMTP_PORT || "587"),
	secure: process.env.SMTP_SECURE === "true",
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS,
	},
});

const EMAIL_FROM = process.env.EMAIL_FROM || process.env.SMTP_USER || "noreply@simpaskor.id";

export async function sendTicketEmail(params: {
	to: string;
	buyerName: string;
	ticketCode: string;
	eventTitle: string;
	eventDate: string;
	venue: string | null;
	city: string | null;
	quantity: number;
	totalAmount: number;
	qrImageBase64: string;
}) {
	const formattedDate = new Date(params.eventDate).toLocaleDateString("id-ID", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});

	const location = [params.venue, params.city].filter(Boolean).join(", ") || "-";
	const formattedAmount =
		params.totalAmount === 0
			? "GRATIS"
			: new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(params.totalAmount);

	const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:#dc2626;padding:24px 32px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">🎫 E-Ticket Simpaskor</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;color:#111827;font-size:16px;">Halo <strong>${params.buyerName}</strong>,</p>
          <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">Berikut tiket elektronik Anda untuk event:</p>

          <h2 style="margin:0 0 16px;color:#111827;font-size:18px;">${params.eventTitle}</h2>

          <!-- QR Code -->
          <div style="text-align:center;margin:0 0 16px;">
            <img src="cid:qrcode" alt="QR Code Tiket" style="width:200px;height:200px;border:1px solid #e5e7eb;border-radius:12px;padding:8px;background:#fff;" />
          </div>

          <!-- Ticket Code -->
          <div style="text-align:center;margin:0 0 24px;">
            <span style="display:inline-block;background:#fef2f2;color:#dc2626;font-size:22px;font-weight:700;font-family:monospace;padding:8px 20px;border-radius:8px;letter-spacing:2px;">
              ${params.ticketCode}
            </span>
          </div>

          <!-- Details table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;padding:16px;margin:0 0 24px;">
            <tr><td style="padding:8px 16px;color:#6b7280;font-size:13px;">Tanggal</td><td style="padding:8px 16px;color:#111827;font-size:13px;font-weight:600;text-align:right;">${formattedDate}</td></tr>
            <tr><td style="padding:8px 16px;color:#6b7280;font-size:13px;">Lokasi</td><td style="padding:8px 16px;color:#111827;font-size:13px;font-weight:600;text-align:right;">${location}</td></tr>
            <tr><td style="padding:8px 16px;color:#6b7280;font-size:13px;">Jumlah</td><td style="padding:8px 16px;color:#111827;font-size:13px;font-weight:600;text-align:right;">${params.quantity} tiket</td></tr>
            <tr><td style="padding:8px 16px;color:#6b7280;font-size:13px;">Total</td><td style="padding:8px 16px;color:#111827;font-size:13px;font-weight:600;text-align:right;">${formattedAmount}</td></tr>
          </table>

          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">Tunjukkan QR code ini saat masuk venue. Simpan email ini sebagai bukti pembelian.</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:11px;">&copy; ${new Date().getFullYear()} Simpaskor. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

	// Extract base64 image data (remove data:image/png;base64, prefix if present)
	const base64Data = params.qrImageBase64.replace(/^data:image\/\w+;base64,/, "");

	await transporter.sendMail({
		from: `"Simpaskor E-Ticket" <${EMAIL_FROM}>`,
		to: params.to,
		subject: `🎫 E-Ticket: ${params.eventTitle}`,
		html,
		attachments: [
			{
				filename: "qrcode.png",
				content: Buffer.from(base64Data, "base64"),
				cid: "qrcode",
			},
		],
	});
}

/**
 * Generate QR code as base64 PNG data URL (server-side)
 */
async function generateQRCodeBase64(data: string): Promise<string> {
	return QRCode.toDataURL(data, {
		width: 300,
		margin: 2,
		errorCorrectionLevel: "H",
	});
}

/**
 * Send ticket email with server-generated QR code (called from webhook)
 */
export async function sendTicketEmailFromServer(params: {
	to: string;
	buyerName: string;
	ticketCode: string;
	eventTitle: string;
	eventDate: string;
	venue: string | null;
	city: string | null;
	quantity: number;
	totalAmount: number;
}) {
	const qrImageBase64 = await generateQRCodeBase64(params.ticketCode);
	await sendTicketEmail({ ...params, qrImageBase64 });
}

/**
 * Send voting purchase code email after successful payment
 */
export async function sendVotingPurchaseEmail(params: {
	to: string;
	buyerName: string;
	purchaseCode: string;
	eventTitle: string;
	voteCount: number;
	totalAmount: number;
}) {
	const formattedAmount =
		params.totalAmount === 0
			? "GRATIS"
			: new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(params.totalAmount);

	const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:#dc2626;padding:24px 32px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">🗳️ E-Voting Simpaskor</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;color:#111827;font-size:16px;">Halo <strong>${params.buyerName}</strong>,</p>
          <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">Pembayaran vote Anda berhasil! Berikut kode vote Anda:</p>

          <h2 style="margin:0 0 16px;color:#111827;font-size:18px;">${params.eventTitle}</h2>

          <!-- Purchase Code -->
          <div style="text-align:center;margin:0 0 24px;">
            <span style="display:inline-block;background:#fef2f2;color:#dc2626;font-size:26px;font-weight:700;font-family:monospace;padding:12px 24px;border-radius:8px;letter-spacing:3px;">
              ${params.purchaseCode}
            </span>
          </div>

          <!-- Details table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;padding:16px;margin:0 0 24px;">
            <tr><td style="padding:8px 16px;color:#6b7280;font-size:13px;">Jumlah Vote</td><td style="padding:8px 16px;color:#111827;font-size:13px;font-weight:600;text-align:right;">${params.voteCount} vote</td></tr>
            <tr><td style="padding:8px 16px;color:#6b7280;font-size:13px;">Total Pembayaran</td><td style="padding:8px 16px;color:#111827;font-size:13px;font-weight:600;text-align:right;">${formattedAmount}</td></tr>
          </table>

          <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:12px 16px;margin:0 0 16px;">
            <p style="margin:0;color:#92400e;font-size:13px;font-weight:600;">⚠️ Penting:</p>
            <p style="margin:4px 0 0;color:#92400e;font-size:13px;">Gunakan kode di atas saat melakukan vote pada halaman E-Voting. Simpan email ini sebagai bukti pembelian.</p>
          </div>

          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">Masukkan kode ini di halaman voting untuk memberikan vote Anda.</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:11px;">&copy; ${new Date().getFullYear()} Simpaskor. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

	await transporter.sendMail({
		from: `"Simpaskor E-Voting" <${EMAIL_FROM}>`,
		to: params.to,
		subject: `🗳️ Kode Vote: ${params.eventTitle}`,
		html,
	});
}
