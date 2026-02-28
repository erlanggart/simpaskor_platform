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
