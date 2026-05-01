import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST || "smtp.gmail.com",
	port: Number(process.env.SMTP_PORT) || 587,
	secure: Number(process.env.SMTP_PORT) === 465,
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS,
	},
});

const EMAIL_FROM = process.env.EMAIL_FROM || process.env.SMTP_USER || "noreply@simpaskor.id";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const APP_NAME = "Simpaskor";

export async function sendPasswordResetEmail(
	toEmail: string,
	userName: string,
	resetToken: string
): Promise<void> {
	const resetLink = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

	const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Reset Password - ${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">${APP_NAME}</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Sistem Paskibra Digital</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="margin:0 0 12px;color:#111827;font-size:20px;font-weight:700;">Reset Password</h2>
              <p style="margin:0 0 8px;color:#374151;font-size:15px;line-height:1.6;">Halo <strong>${userName}</strong>,</p>
              <p style="margin:0 0 28px;color:#6b7280;font-size:14px;line-height:1.7;">
                Kami menerima permintaan untuk mereset password akun Anda di ${APP_NAME}. 
                Klik tombol di bawah untuk melanjutkan. Link ini hanya berlaku selama <strong>1 jam</strong>.
              </p>
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="border-radius:10px;background:linear-gradient(135deg,#dc2626,#b91c1c);">
                    <a href="${resetLink}"
                       style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;border-radius:10px;letter-spacing:0.2px;">
                      Reset Password Sekarang
                    </a>
                  </td>
                </tr>
              </table>
              <!-- Fallback link -->
              <p style="margin:0 0 6px;color:#9ca3af;font-size:12px;">Atau salin link berikut ke browser Anda:</p>
              <p style="margin:0 0 28px;word-break:break-all;">
                <a href="${resetLink}" style="color:#dc2626;font-size:12px;text-decoration:underline;">${resetLink}</a>
              </p>
              <!-- Warning -->
              <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:14px 16px;margin-bottom:0;">
                <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">
                  ⚠️ Jika Anda tidak meminta reset password, abaikan email ini. Password Anda tidak akan berubah.
                </p>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                &copy; ${new Date().getFullYear()} ${APP_NAME}. Semua hak dilindungi.<br/>
                Email ini dikirim otomatis, mohon tidak membalas email ini.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
	`.trim();

	await transporter.sendMail({
		from: `"${APP_NAME}" <${EMAIL_FROM}>`,
		to: toEmail,
		subject: `Reset Password ${APP_NAME}`,
		html,
		text: `Halo ${userName},\n\nKlik link berikut untuk mereset password Anda (berlaku 1 jam):\n${resetLink}\n\nJika Anda tidak meminta reset password, abaikan email ini.\n\n- Tim ${APP_NAME}`,
	});
}
