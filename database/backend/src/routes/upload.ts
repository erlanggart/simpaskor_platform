import express from "express";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { uploadDocument } from "../middleware/upload";

const router = express.Router();

// POST /api/upload/document - Upload a document (for registration supporting docs)
router.post(
	"/document",
	authenticate,
	uploadDocument.single("file"),
	async (req: AuthenticatedRequest, res) => {
		try {
			if (!req.file) {
				return res.status(400).json({ error: "No file uploaded" });
			}

			// Return the URL path to the uploaded file
			const url = `/uploads/registrations/${req.file.filename}`;

			res.json({
				message: "Document uploaded successfully",
				url,
				filename: req.file.filename,
				originalName: req.file.originalname,
				size: req.file.size,
			});
		} catch (error) {
			console.error("Error uploading document:", error);
			res.status(500).json({ error: "Failed to upload document" });
		}
	}
);

export default router;
