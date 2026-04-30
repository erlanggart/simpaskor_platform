import { Router, Response } from "express";
import { authenticate, authorize, AuthenticatedRequest } from "../middleware/auth";
import { UserRole } from "@prisma/client";
import { execFile, spawn } from "child_process";
import { randomUUID } from "crypto";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execFileAsync = promisify(execFile);
const router = Router();
const DEFAULT_BACKUP_TIMEOUT_MS = 30 * 60 * 1000;
const DEFAULT_BACKUP_FILE_RETENTION_HOURS = 24;

type BackupJobStatus = "running" | "completed" | "failed";

interface DatabaseConfig {
	host: string;
	port: string;
	user: string;
	password: string;
	database: string;
}

interface BackupJob {
	id: string;
	status: BackupJobStatus;
	filename: string;
	filePath: string;
	createdAt: string;
	updatedAt: string;
	finishedAt?: string;
	sizeBytes?: number;
	error?: string;
	pid?: number;
}

const backupJobs = new Map<string, BackupJob>();

function getBackupTimeoutMs(): number {
	const configuredTimeout = Number(process.env.BACKUP_TIMEOUT_MS);
	return Number.isFinite(configuredTimeout) && configuredTimeout > 0
		? configuredTimeout
		: DEFAULT_BACKUP_TIMEOUT_MS;
}

function getPgDumpCommand(): string {
	return process.env.PG_DUMP_PATH || "pg_dump";
}

function getPsqlCommand(): string {
	return process.env.PSQL_PATH || "psql";
}

function getBackupDir(): string {
	return process.env.BACKUP_DIR
		? path.resolve(process.env.BACKUP_DIR)
		: path.join(__dirname, "../../tmp/backups");
}

function getBackupFileRetentionMs(): number {
	const configuredHours = Number(process.env.BACKUP_FILE_RETENTION_HOURS);
	const retentionHours =
		Number.isFinite(configuredHours) && configuredHours > 0
			? configuredHours
			: DEFAULT_BACKUP_FILE_RETENTION_HOURS;

	return retentionHours * 60 * 60 * 1000;
}

function buildDatabaseEnv(db: DatabaseConfig): Record<string, string> {
	const env: Record<string, string> = { ...process.env as Record<string, string> };
	if (db.password) {
		env.PGPASSWORD = db.password;
	}

	return env;
}

function buildPgDumpArgs(db: DatabaseConfig): string[] {
	return [
		"-h", db.host,
		"-p", db.port,
		"-U", db.user,
		"-d", db.database,
		"--no-owner",
		"--no-acl",
		"-F", "p",
	];
}

function createBackupFilename(database: string): string {
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
	const safeDatabaseName = database.replace(/[^a-zA-Z0-9_-]/g, "_");
	return `backup_${safeDatabaseName}_${timestamp}.sql`;
}

function getBackupFileSize(job: BackupJob): number | undefined {
	try {
		return fs.statSync(job.filePath).size;
	} catch {
		return job.sizeBytes;
	}
}

function toPublicBackupJob(job: BackupJob) {
	return {
		id: job.id,
		status: job.status,
		filename: job.filename,
		createdAt: job.createdAt,
		updatedAt: job.updatedAt,
		finishedAt: job.finishedAt,
		sizeBytes: getBackupFileSize(job),
		error: job.error,
	};
}

function cleanupExpiredBackupJobs(): void {
	const retentionMs = getBackupFileRetentionMs();
	const now = Date.now();

	for (const [jobId, job] of backupJobs) {
		if (job.status === "running") {
			continue;
		}

		const createdAt = new Date(job.createdAt).getTime();
		if (Number.isNaN(createdAt) || now - createdAt <= retentionMs) {
			continue;
		}

		backupJobs.delete(jobId);
		fs.rm(job.filePath, { force: true }, (error) => {
			if (error) {
				console.warn("Failed to cleanup backup file:", error);
			}
		});
	}
}

function startBackupJob(job: BackupJob, db: DatabaseConfig): void {
	const env = buildDatabaseEnv(db);
	const pgDumpCommand = getPgDumpCommand();
	const dumpProcess = spawn(pgDumpCommand, buildPgDumpArgs(db), {
		env,
		stdio: ["ignore", "pipe", "pipe"],
	});
	const outputStream = fs.createWriteStream(job.filePath, { encoding: "utf8" });

	job.pid = dumpProcess.pid;
	job.updatedAt = new Date().toISOString();

	let stderr = "";
	let processClosed = false;
	let outputFinished = false;
	let exitCode: number | null = null;
	let exitSignal: NodeJS.Signals | null = null;
	let settled = false;
	let timeout: NodeJS.Timeout | undefined;

	const fail = (message: string, error?: unknown) => {
		if (settled) {
			return;
		}

		settled = true;
		if (timeout) {
			clearTimeout(timeout);
		}

		if (error) {
			console.error("Backup job error:", error);
		} else {
			console.error("Backup job error:", message);
		}

		job.status = "failed";
		job.error = message;
		job.finishedAt = new Date().toISOString();
		job.updatedAt = job.finishedAt;

		outputStream.destroy();
		fs.rm(job.filePath, { force: true }, (rmError) => {
			if (rmError) {
				console.warn("Failed to cleanup failed backup file:", rmError);
			}
		});
	};

	timeout = setTimeout(() => {
		if (settled) {
			return;
		}

		if (!dumpProcess.killed) {
			dumpProcess.kill("SIGTERM");
		}

		fail(`Backup melebihi batas waktu ${Math.round(getBackupTimeoutMs() / 60000)} menit`);
	}, getBackupTimeoutMs());

	const completeIfReady = () => {
		if (settled || !processClosed || !outputFinished) {
			return;
		}

		if (exitCode !== 0) {
			const message = stderr.trim()
				|| `pg_dump gagal dengan code ${exitCode ?? "unknown"}${exitSignal ? ` signal ${exitSignal}` : ""}`;
			fail(message);
			return;
		}

		settled = true;
		if (timeout) {
			clearTimeout(timeout);
		}

		const stats = fs.statSync(job.filePath);
		job.status = "completed";
		job.sizeBytes = stats.size;
		job.finishedAt = new Date().toISOString();
		job.updatedAt = job.finishedAt;

		if (stderr.trim()) {
			console.warn("pg_dump stderr:", stderr);
		}
	};

	dumpProcess.on("error", (error) => {
		const message =
			error.message.includes("ENOENT")
				? `${pgDumpCommand} tidak ditemukan. Pastikan PostgreSQL client tools terinstall, tersedia di PATH server, atau set PG_DUMP_PATH.`
				: error.message;
		fail(message, error);
	});

	dumpProcess.stderr.setEncoding("utf8");
	dumpProcess.stderr.on("data", (chunk: string) => {
		stderr += chunk;
		if (stderr.length > 20000) {
			stderr = stderr.slice(-20000);
		}
	});

	outputStream.on("error", (error) => {
		if (!dumpProcess.killed) {
			dumpProcess.kill("SIGTERM");
		}

		fail(`Gagal menulis file backup: ${error.message}`, error);
	});

	outputStream.on("finish", () => {
		outputFinished = true;
		completeIfReady();
	});

	dumpProcess.on("close", (code, signal) => {
		processClosed = true;
		exitCode = code;
		exitSignal = signal;
		completeIfReady();
	});

	dumpProcess.stdout.pipe(outputStream);
}

// All routes require SUPERADMIN
router.use(authenticate, authorize(UserRole.SUPERADMIN));

// Parse DATABASE_URL to get connection details
function parseDatabaseUrl(): DatabaseConfig {
	const rawUrl = process.env.DATABASE_URL || "";
	let url: URL;

	try {
		url = new URL(rawUrl);
	} catch {
		throw new Error("Invalid DATABASE_URL format");
	}

	if (!["postgresql:", "postgres:"].includes(url.protocol)) {
		throw new Error("DATABASE_URL must use postgres:// or postgresql://");
	}

	const user = decodeURIComponent(url.username);
	const password = decodeURIComponent(url.password);
	const host = url.hostname;
	const port = url.port || "5432";
	const database = decodeURIComponent(url.pathname.replace(/^\//, ""));

	if (!user || !host || !database) {
		throw new Error("DATABASE_URL is missing user, host, or database name");
	}

	return { user, password, host, port, database };
}

// Background backup jobs write SQL files first, then expose a download when ready.
router.post(
	"/jobs",
	async (req: AuthenticatedRequest, res: Response): Promise<void | Response> => {
		try {
			cleanupExpiredBackupJobs();

			const runningJob = Array.from(backupJobs.values()).find(
				(job) => job.status === "running"
			);

			if (runningJob) {
				return res.status(409).json({
					error: "Backup sedang berjalan",
					message: "Tunggu proses backup yang sedang berjalan sampai selesai.",
					job: toPublicBackupJob(runningJob),
				});
			}

			const db = parseDatabaseUrl();
			const backupDir = getBackupDir();
			fs.mkdirSync(backupDir, { recursive: true });

			const now = new Date().toISOString();
			const filename = createBackupFilename(db.database);
			const job: BackupJob = {
				id: randomUUID(),
				status: "running",
				filename,
				filePath: path.join(backupDir, filename),
				createdAt: now,
				updatedAt: now,
			};

			backupJobs.set(job.id, job);
			startBackupJob(job, db);

			return res.status(202).json({
				message: "Backup sedang dibuat di background",
				job: toPublicBackupJob(job),
			});
		} catch (error: any) {
			console.error("Start backup job error:", error);
			return res.status(500).json({
				error: "Gagal memulai backup database",
				message: error.message,
			});
		}
	}
);

router.get(
	"/jobs",
	async (req: AuthenticatedRequest, res: Response): Promise<void | Response> => {
		cleanupExpiredBackupJobs();

		const jobs = Array.from(backupJobs.values())
			.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
			.map(toPublicBackupJob);

		return res.json({ jobs });
	}
);

router.get(
	"/jobs/:jobId",
	async (req: AuthenticatedRequest, res: Response): Promise<void | Response> => {
		const { jobId } = req.params;
		if (!jobId) {
			return res.status(400).json({ error: "Backup job id is required" });
		}

		const job = backupJobs.get(jobId);

		if (!job) {
			return res.status(404).json({ error: "Backup job tidak ditemukan" });
		}

		return res.json({ job: toPublicBackupJob(job) });
	}
);

router.get(
	"/jobs/:jobId/download",
	async (req: AuthenticatedRequest, res: Response): Promise<void | Response> => {
		const { jobId } = req.params;
		if (!jobId) {
			return res.status(400).json({ error: "Backup job id is required" });
		}

		const job = backupJobs.get(jobId);

		if (!job) {
			return res.status(404).json({ error: "Backup job tidak ditemukan" });
		}

		if (job.status === "running") {
			return res.status(409).json({
				error: "Backup masih diproses",
				job: toPublicBackupJob(job),
			});
		}

		if (job.status === "failed") {
			return res.status(400).json({
				error: "Backup gagal",
				message: job.error || "Backup gagal dibuat",
				job: toPublicBackupJob(job),
			});
		}

		if (!fs.existsSync(job.filePath)) {
			job.status = "failed";
			job.error = "File backup tidak ditemukan di server";
			job.updatedAt = new Date().toISOString();

			return res.status(404).json({
				error: "File backup tidak ditemukan di server",
				job: toPublicBackupJob(job),
			});
		}

		const stats = fs.statSync(job.filePath);
		req.setTimeout(getBackupTimeoutMs());
		res.setTimeout(getBackupTimeoutMs());
		res.setHeader("Content-Type", "application/sql; charset=utf-8");
		res.setHeader("Content-Length", stats.size);
		res.setHeader("Cache-Control", "no-store");

		return res.download(job.filePath, job.filename, (error) => {
			if (error) {
				console.error("Backup file download error:", error);
				if (!res.headersSent) {
					res.status(500).json({
						error: "Gagal mengunduh file backup",
						message: error.message,
					});
				}
			}
		});
	}
);

// ─── Download Database Backup (pg_dump) ───────────────────────
router.get(
	"/download",
	async (req: AuthenticatedRequest, res: Response): Promise<void | Response> => {
		try {
			const backupTimeoutMs = getBackupTimeoutMs();
			req.setTimeout(backupTimeoutMs);
			res.setTimeout(backupTimeoutMs);

			const db = parseDatabaseUrl();
			const filename = createBackupFilename(db.database);
			const env = buildDatabaseEnv(db);

			const pgDumpCommand = getPgDumpCommand();
			const dumpProcess = spawn(pgDumpCommand, buildPgDumpArgs(db), {
				env,
				stdio: ["ignore", "pipe", "pipe"],
			});

			let stderr = "";
			let processClosed = false;
			let errorSent = false;
			let clientAborted = false;

			const sendBackupError = (message: string, error?: unknown) => {
				if (errorSent) {
					return;
				}
				errorSent = true;

				if (error) {
					console.error("Backup download error:", error);
				} else {
					console.error("Backup download error:", message);
				}

				if (!res.headersSent) {
					res.removeHeader("Content-Type");
					res.removeHeader("Content-Disposition");
					return res.status(500).json({
						error: "Gagal membuat backup database",
						message,
					});
				}

				if (!res.destroyed) {
					res.destroy(error instanceof Error ? error : new Error(message));
				}
			};

			dumpProcess.on("error", (error) => {
				processClosed = true;
				const message =
					error.message.includes("ENOENT")
						? `${pgDumpCommand} tidak ditemukan. Pastikan PostgreSQL client tools terinstall, tersedia di PATH server, atau set PG_DUMP_PATH.`
						: error.message;
				sendBackupError(message, error);
			});

			dumpProcess.stderr.setEncoding("utf8");
			dumpProcess.stderr.on("data", (chunk: string) => {
				stderr += chunk;
				if (stderr.length > 20000) {
					stderr = stderr.slice(-20000);
				}
			});

			res.setHeader("Content-Type", "application/sql; charset=utf-8");
			res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
			res.setHeader("Cache-Control", "no-store");
			res.setHeader("X-Accel-Buffering", "no");

			dumpProcess.stdout.pipe(res, { end: false });

			res.on("close", () => {
				if (!res.writableEnded && !processClosed && !dumpProcess.killed) {
					clientAborted = true;
					dumpProcess.kill("SIGTERM");
				}
			});

			dumpProcess.on("close", (code, signal) => {
				processClosed = true;

				if (code === 0) {
					if (stderr.trim()) {
						console.warn("pg_dump stderr:", stderr);
					}
					res.end();
					return;
				}

				if (clientAborted) {
					return;
				}

				const message = stderr.trim()
					|| `pg_dump gagal dengan code ${code ?? "unknown"}${signal ? ` signal ${signal}` : ""}`;
				sendBackupError(message);
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

			await execFileAsync(getPsqlCommand(), ["-h", db.host, "-p", db.port, "-U", db.user, "-d", db.database, "-f", tmpFile], {
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
