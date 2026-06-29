import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import type { Request, Response, NextFunction } from "express";

// Ensure upload directories exist
const ensureDir = (dir: string) => {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
};

// Configure storage for banners
const bannerStorage = multer.diskStorage({
	destination: (req: any, file: any, cb: any) => {
		const dir = "uploads/banners/";
		ensureDir(dir);
		cb(null, dir);
	},
	filename: (req: any, file: any, cb: any) => {
		// Generate unique filename: timestamp-randomstring.ext
		const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
		cb(null, "banner-" + uniqueSuffix + path.extname(file.originalname));
	},
});

// Configure storage for event thumbnails/posters
const eventThumbnailStorage = multer.diskStorage({
	destination: (req: any, file: any, cb: any) => {
		const dir = "uploads/events/";
		ensureDir(dir);
		cb(null, dir);
	},
	filename: (req: any, file: any, cb: any) => {
		// Generate unique filename: event-timestamp-randomstring.ext
		const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
		cb(null, "event-" + uniqueSuffix + path.extname(file.originalname));
	},
});

// File filter - only allow images
const imageFilter = (req: any, file: any, cb: any) => {
	const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

	if (allowedTypes.includes(file.mimetype)) {
		cb(null, true);
	} else {
		cb(new Error("Invalid file type. Only JPG, JPEG, PNG and WEBP are allowed."));
	}
};

// File filter - only allow PDF
const pdfFilter = (req: any, file: any, cb: any) => {
	if (file.mimetype === "application/pdf") {
		cb(null, true);
	} else {
		cb(new Error("Invalid file type. Only PDF is allowed."));
	}
};

// Configure storage for juknis documents
const juknisStorage = multer.diskStorage({
	destination: (req: any, file: any, cb: any) => {
		const dir = "uploads/events/";
		ensureDir(dir);
		cb(null, dir);
	},
	filename: (req: any, file: any, cb: any) => {
		const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
		cb(null, "juknis-" + uniqueSuffix + path.extname(file.originalname));
	},
});

// Configure storage for registration supporting documents
const registrationDocStorage = multer.diskStorage({
	destination: (req: any, file: any, cb: any) => {
		const dir = "uploads/registrations/";
		ensureDir(dir);
		cb(null, dir);
	},
	filename: (req: any, file: any, cb: any) => {
		const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
		cb(null, "doc-" + uniqueSuffix + path.extname(file.originalname));
	},
});

// File filter for documents (PDF, JPG, PNG)
const documentFilter = (req: any, file: any, cb: any) => {
	const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];

	if (allowedTypes.includes(file.mimetype)) {
		cb(null, true);
	} else {
		cb(new Error("Invalid file type. Only PDF, JPG, and PNG are allowed."));
	}
};

// Create multer upload instance for banners
export const uploadBanner = multer({
	storage: bannerStorage,
	fileFilter: imageFilter,
	limits: {
		fileSize: 10 * 1024 * 1024, // 10MB max file size
	},
});

// Create multer upload instance for event thumbnails
export const uploadEventThumbnail = multer({
	storage: eventThumbnailStorage,
	fileFilter: imageFilter,
	limits: {
		fileSize: 5 * 1024 * 1024, // 5MB max file size
	},
});

// Create multer upload instance for juknis PDFs
export const uploadJuknis = multer({
	storage: juknisStorage,
	fileFilter: pdfFilter,
	limits: {
		fileSize: 10 * 1024 * 1024, // 10MB max file size
	},
});

// Create multer upload instance for registration documents
export const uploadDocument = multer({
	storage: registrationDocStorage,
	fileFilter: documentFilter,
	limits: {
		fileSize: 5 * 1024 * 1024, // 5MB max file size
	},
});

// Configure storage for product images
const productStorage = multer.diskStorage({
	destination: (req: any, file: any, cb: any) => {
		const dir = "uploads/products/";
		ensureDir(dir);
		cb(null, dir);
	},
	filename: (req: any, file: any, cb: any) => {
		const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
		cb(null, "product-" + uniqueSuffix + path.extname(file.originalname));
	},
});

// Create multer upload instance for product images
export const uploadProductImage = multer({
	storage: productStorage,
	fileFilter: imageFilter,
	limits: {
		fileSize: 5 * 1024 * 1024, // 5MB max file size
	},
});

// Configure storage for avatar images
const avatarStorage = multer.diskStorage({
	destination: (req: any, file: any, cb: any) => {
		const dir = "uploads/avatars/";
		ensureDir(dir);
		cb(null, dir);
	},
	filename: (req: any, file: any, cb: any) => {
		const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
		cb(null, "avatar-" + uniqueSuffix + path.extname(file.originalname));
	},
});

// Create multer upload instance for avatars
export const uploadAvatar = multer({
	storage: avatarStorage,
	fileFilter: imageFilter,
	limits: {
		fileSize: 2 * 1024 * 1024, // 2MB max file size
	},
});

// Configure storage for guide slide images
const guideSlideStorage = multer.diskStorage({
	destination: (req: any, file: any, cb: any) => {
		const dir = "uploads/guides/";
		ensureDir(dir);
		cb(null, dir);
	},
	filename: (req: any, file: any, cb: any) => {
		const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
		cb(null, "guide-" + uniqueSuffix + path.extname(file.originalname));
	},
});

// Create multer upload instance for guide slide images
export const uploadGuideSlide = multer({
	storage: guideSlideStorage,
	fileFilter: imageFilter,
	limits: {
		fileSize: 5 * 1024 * 1024, // 5MB max file size
	},
});

// Configure storage for voting nominee photos
const nomineePhotoStorage = multer.diskStorage({
	destination: (req: any, file: any, cb: any) => {
		const dir = "uploads/nominees/";
		ensureDir(dir);
		cb(null, dir);
	},
	filename: (req: any, file: any, cb: any) => {
		const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
		cb(null, "nominee-" + uniqueSuffix + path.extname(file.originalname));
	},
});

// Create multer upload instance for nominee photos
export const uploadNomineePhoto = multer({
	storage: nomineePhotoStorage,
	fileFilter: imageFilter,
	limits: {
		fileSize: 3 * 1024 * 1024, // 3MB max file size
	},
});

// Configure storage for ticketing team logos
const ticketTeamLogoStorage = multer.diskStorage({
	destination: (req: any, file: any, cb: any) => {
		const dir = "uploads/ticket-teams/";
		ensureDir(dir);
		cb(null, dir);
	},
	filename: (req: any, file: any, cb: any) => {
		const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
		cb(null, "ticket-team-" + uniqueSuffix + path.extname(file.originalname));
	},
});

export const uploadTicketTeamLogo = multer({
	storage: ticketTeamLogoStorage,
	fileFilter: imageFilter,
	limits: {
		fileSize: 3 * 1024 * 1024,
	},
});

// Error-handling middleware for multer upload failures.
// Mount immediately after a multer middleware in a route chain to translate
// raw multer / fileFilter errors into clear JSON responses for the client.
export const handleUploadError = (
	err: any,
	_req: Request,
	res: Response,
	next: NextFunction
) => {
	if (err instanceof multer.MulterError) {
		if (err.code === "LIMIT_FILE_SIZE") {
			return res.status(400).json({
				error: "Ukuran foto terlalu besar. Maksimal 3 MB.",
			});
		}
		return res.status(400).json({
			error: `Gagal mengunggah file: ${err.message}`,
		});
	}
	if (typeof err?.message === "string" && err.message.startsWith("Invalid file type")) {
		return res.status(400).json({
			error: "Format foto tidak didukung. Gunakan JPG, JPEG, PNG, atau WEBP.",
		});
	}
	return next(err);
};

// ─── WebP conversion ──────────────────────────────────────────────
// Every uploaded image is re-encoded to WebP. This (a) shrinks files served on
// the landing page, and (b) hardens security: re-encoding through sharp strips
// metadata and guarantees the stored file is a real raster image — anything
// that isn't a decodable image (a disguised script, SVG, etc.) is rejected.
const WEBP_QUALITY = 80;

async function convertFileToWebp(file: Express.Multer.File): Promise<void> {
	const inputPath = file.path;
	const dir = path.dirname(inputPath);
	const baseNoExt = path.basename(file.filename, path.extname(file.filename));
	const webpName = `${baseNoExt}.webp`;
	const webpPath = path.join(dir, webpName);

	// Decode fully to a buffer first, so we can safely overwrite even when the
	// source already has a .webp name (input path == output path).
	const buffer = await sharp(inputPath)
		.rotate() // honour EXIF orientation before stripping metadata
		.webp({ quality: WEBP_QUALITY })
		.toBuffer();

	await fs.promises.writeFile(webpPath, buffer);
	if (path.resolve(inputPath) !== path.resolve(webpPath)) {
		await fs.promises.unlink(inputPath).catch(() => {});
	}

	file.filename = webpName;
	file.path = webpPath;
	file.mimetype = "image/webp";
	file.size = buffer.length;
}

function collectFiles(req: Request): Express.Multer.File[] {
	if (req.file) return [req.file];
	if (!req.files) return [];
	return Array.isArray(req.files)
		? req.files
		: Object.values(req.files).flat();
}

// Express middleware: run AFTER a multer image uploader. Converts the uploaded
// image(s) to WebP; if a file is not a valid image, deletes it and returns 400.
export const convertToWebp = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const files = collectFiles(req);
	if (files.length === 0) return next();

	try {
		for (const file of files) {
			await convertFileToWebp(file);
		}
		return next();
	} catch {
		// Invalid/corrupt image — clean up temp files and reject.
		await Promise.all(
			files.map((f) => (f?.path ? fs.promises.unlink(f.path).catch(() => {}) : Promise.resolve()))
		);
		return res.status(400).json({
			error: "File gambar tidak valid atau rusak. Gunakan JPG, PNG, atau WEBP.",
		});
	}
};
