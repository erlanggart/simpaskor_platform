import { Router, Response } from "express";
import { authenticate, authorize, AuthenticatedRequest } from "../middleware/auth";
import { UserRole } from "@prisma/client";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);
const router = Router();

// All routes require SUPERADMIN
router.use(authenticate, authorize(UserRole.SUPERADMIN));

// Parse DATABASE_URL to get connection details
function parseDatabaseUrl(): {
	host: string;
	port: string;
	user: string;
	password: string;
	database: string;
} {
	const url = process.env.DATABASE_URL || "";
	const match = url.match(
		/postgresql:\/\/([^:]+)(?::([^@]*))?@([^:]+):(\d+)\/(.+)/
	);
	if (!match) {
		throw new Error("Invalid DATABASE_URL format");
	}
	const user = match[1] || "";
	const password = match[2] || "";
	const host = match[3] || "";
	const port = match[4] || "";
	const database: string = (match[5] || "").split("?")[0] || "";
	return { user, password, host, port, database };
}

// ─── Download Database Backup (pg_dump) ───────────────────────
router.get(
	"/download",
	async (req: AuthenticatedRequest, res: Response): Promise<void | Response> => {
		try {
			const db = parseDatabaseUrl();
			const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
			const filename = `backup_${db.database}_${timestamp}.sql`;
			const tmpDir = path.join(__dirname, "../../tmp");
			const tmpFile = path.join(tmpDir, filename);

			// Ensure tmp dir exists
			if (!fs.existsSync(tmpDir)) {
				fs.mkdirSync(tmpDir, { recursive: true });
			}

			// Build pg_dump command
			const env: Record<string, string> = { ...process.env as Record<string, string> };
			if (db.password) {
				env.PGPASSWORD = db.password;
			}

			const cmd = `pg_dump -h ${db.host} -p ${db.port} -U ${db.user} -d ${db.database} --no-owner --no-acl -F p`;

			const { stdout, stderr } = await execAsync(cmd, {
				env,
				maxBuffer: 100 * 1024 * 1024, // 100MB
			});

			if (stderr && !stderr.includes("WARNING")) {
				console.error("pg_dump stderr:", stderr);
			}

			// Write to temp file
			fs.writeFileSync(tmpFile, stdout, "utf-8");

			// Send file
			res.setHeader("Content-Type", "application/sql");
			res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
			
			const fileStream = fs.createReadStream(tmpFile);
			fileStream.pipe(res);
			fileStream.on("end", () => {
				// Cleanup temp file
				fs.unlinkSync(tmpFile);
			});
		} catch (error: any) {
			console.error("Backup download error:", error);
			res.status(500).json({
				error: "Gagal membuat backup database",
				message: error.message,
			});
		}
	}
);

// ─── Restore Database from SQL file ───────────────────────────
router.post(
	"/restore",
	async (req: AuthenticatedRequest, res: Response): Promise<void | Response> => {
		try {
			const { sqlContent } = req.body;

			if (!sqlContent || typeof sqlContent !== "string") {
				return res.status(400).json({ error: "SQL content is required" });
			}

			// Limit size to 100MB
			if (sqlContent.length > 100 * 1024 * 1024) {
				return res.status(400).json({ error: "File terlalu besar (max 100MB)" });
			}

			const db = parseDatabaseUrl();
			const tmpDir = path.join(__dirname, "../../tmp");
			const tmpFile = path.join(tmpDir, `restore_${Date.now()}.sql`);

			// Ensure tmp dir exists
			if (!fs.existsSync(tmpDir)) {
				fs.mkdirSync(tmpDir, { recursive: true });
			}

			// Write SQL to temp file
			fs.writeFileSync(tmpFile, sqlContent, "utf-8");

			const env: Record<string, string> = { ...process.env as Record<string, string> };
			if (db.password) {
				env.PGPASSWORD = db.password;
			}

			const cmd = `psql -h ${db.host} -p ${db.port} -U ${db.user} -d ${db.database} -f "${tmpFile}"`;

			await execAsync(cmd, {
				env,
				maxBuffer: 100 * 1024 * 1024,
			});

			// Cleanup
			fs.unlinkSync(tmpFile);

			res.json({ message: "Database berhasil di-restore" });
		} catch (error: any) {
			console.error("Restore error:", error);
			res.status(500).json({
				error: "Gagal restore database",
				message: error.message,
			});
		}
	}
);

// ─── Get Database Info ────────────────────────────────────────
router.get(
	"/info",
	async (req: AuthenticatedRequest, res: Response): Promise<void | Response> => {
		try {
			const { PrismaClient } = require("@prisma/client");
			const prisma = new PrismaClient();

			// Get database size
			const sizeResult = await prisma.$queryRaw`
				SELECT pg_size_pretty(pg_database_size(current_database())) as size
			`;

			// Get table count
			const tableCount = await prisma.$queryRaw`
				SELECT count(*)::int as count FROM information_schema.tables 
				WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
			`;

			// Get table sizes
			const tableSizes = await prisma.$queryRaw`
				SELECT 
					tablename as name,
					pg_size_pretty(pg_total_relation_size(quote_ident(tablename)::text)) as size,
					(SELECT count(*)::int FROM information_schema.columns WHERE table_name = tablename)::int as columns
				FROM pg_tables 
				WHERE schemaname = 'public' 
				ORDER BY pg_total_relation_size(quote_ident(tablename)::text) DESC
				LIMIT 20
			`;

			await prisma.$disconnect();

			res.json({
				databaseSize: (sizeResult as any[])[0]?.size || "Unknown",
				tableCount: Number((tableCount as any[])[0]?.count || 0),
				tables: tableSizes,
			});
		} catch (error: any) {
			console.error("DB info error:", error);
			res.status(500).json({ error: "Gagal mengambil info database" });
		}
	}
);

export default router;
