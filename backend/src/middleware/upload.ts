import multer from "multer";
import path from "path";
import fs from "fs";

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
const fileFilter = (req: any, file: any, cb: any) => {
	const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];

	if (allowedTypes.includes(file.mimetype)) {
		cb(null, true);
	} else {
		cb(new Error("Invalid file type. Only JPG, JPEG and PNG are allowed."));
	}
};

// Create multer upload instance for banners
export const uploadBanner = multer({
	storage: bannerStorage,
	fileFilter: fileFilter,
	limits: {
		fileSize: 10 * 1024 * 1024, // 10MB max file size
	},
});

// Create multer upload instance for event thumbnails
export const uploadEventThumbnail = multer({
	storage: eventThumbnailStorage,
	fileFilter: fileFilter,
	limits: {
		fileSize: 10 * 1024 * 1024, // 10MB max file size
	},
});
