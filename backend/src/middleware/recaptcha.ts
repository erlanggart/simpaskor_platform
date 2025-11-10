import { Request, Response, NextFunction } from "express";
import axios from "axios";

// reCAPTCHA v3 verification middleware
export const verifyRecaptcha = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void | Response> => {
	try {
		// Skip reCAPTCHA in development mode
		if (process.env.NODE_ENV === 'development') {
			console.log('⚠️  reCAPTCHA verification skipped (development mode)');
			return next();
		}

		const recaptchaToken = req.body.recaptchaToken;

		// Check if token is provided
		if (!recaptchaToken) {
			return res.status(400).json({
				error: "reCAPTCHA verification required",
				message: "Token reCAPTCHA tidak ditemukan. Silakan refresh halaman.",
			});
		}

		// Get secret key from environment
		const secretKey = process.env.RECAPTCHA_SECRET_KEY;
		if (!secretKey) {
			console.error("RECAPTCHA_SECRET_KEY is not configured");
			return res.status(500).json({
				error: "Server configuration error",
				message: "Konfigurasi keamanan server tidak lengkap.",
			});
		}

		// Verify token with Google reCAPTCHA API
		const verificationUrl = "https://www.google.com/recaptcha/api/siteverify";
		const response = await axios.post(
			verificationUrl,
			{},
			{
				params: {
					secret: secretKey,
					response: recaptchaToken,
					remoteip: req.ip, // Optional: IP address of the user
				},
			}
		);

		const { success, score, action } = response.data;

		// Check if verification was successful
		if (!success) {
			return res.status(400).json({
				error: "reCAPTCHA verification failed",
				message: "Verifikasi reCAPTCHA gagal. Silakan coba lagi.",
			});
		}

		// reCAPTCHA v3 returns a score (0.0 - 1.0)
		// 1.0 is very likely a good interaction, 0.0 is very likely a bot
		// Threshold: 0.5 (adjust based on your needs)
		const threshold = 0.5;
		if (score < threshold) {
			console.warn(
				`Low reCAPTCHA score detected: ${score} for IP: ${req.ip}, Action: ${action}`
			);
			return res.status(400).json({
				error: "Suspicious activity detected",
				message:
					"Aktivitas mencurigakan terdeteksi. Jika Anda bukan bot, silakan coba lagi atau hubungi administrator.",
			});
		}

		// Optional: Verify the action matches (e.g., 'register')
		if (action && action !== "register") {
			return res.status(400).json({
				error: "Invalid reCAPTCHA action",
				message: "Tindakan reCAPTCHA tidak valid.",
			});
		}

		// Log successful verification
		console.log(
			`reCAPTCHA verified successfully - Score: ${score}, Action: ${action}, IP: ${req.ip}`
		);

		// Remove recaptchaToken from body before passing to next middleware
		delete req.body.recaptchaToken;

		// Verification passed, continue to next middleware
		next();
	} catch (error) {
		console.error("reCAPTCHA verification error:", error);
		return res.status(500).json({
			error: "reCAPTCHA verification error",
			message:
				"Terjadi kesalahan saat memverifikasi reCAPTCHA. Silakan coba lagi.",
		});
	}
};
