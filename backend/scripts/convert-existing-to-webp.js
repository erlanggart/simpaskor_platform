/*
 * Run-once migration: convert existing uploaded images (JPG/PNG) to WebP and
 * point the database at the new .webp files.
 *
 * - Idempotent: rows already on .webp (or external URLs) are skipped; safe to
 *   re-run.
 * - Non-destructive: the original .jpg/.png files are KEPT (not deleted), so the
 *   DB can be reverted if needed. Clean them up later once verified.
 *
 * Run inside the backend container (which has sharp + prisma + /app/uploads):
 *   docker exec simpaskor_backend node /app/scripts/convert-existing-to-webp.js
 */
const { PrismaClient } = require("@prisma/client");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();
const APP_ROOT = process.cwd(); // /app in the container
const QUALITY = 80;

// [prismaModel, field]
const TARGETS = [
	["event", "thumbnail"],
	["product", "thumbnail"],
	["userProfile", "avatar"],
	["ticketTeam", "logoUrl"],
	["votingNominee", "nomineePhoto"],
	["guideSlide", "imageUrl"],
];

const isConvertible = (p) =>
	typeof p === "string" &&
	!/^https?:\/\//i.test(p) && // leave external URLs alone
	/\.(jpe?g|png)$/i.test(p);

function diskPath(dbPath) {
	// "/uploads/events/foo.jpg" -> "/app/uploads/events/foo.jpg"
	return path.join(APP_ROOT, dbPath.replace(/^\/+/, ""));
}

async function run() {
	let converted = 0;
	let skipped = 0;
	let missing = 0;
	let failed = 0;

	for (const [model, field] of TARGETS) {
		const rows = await prisma[model].findMany({
			where: { [field]: { not: null } },
			select: { id: true, [field]: true },
		});

		for (const row of rows) {
			const cur = row[field];
			if (!isConvertible(cur)) {
				skipped++;
				continue;
			}

			const newDbPath = cur.replace(/\.(jpe?g|png)$/i, ".webp");
			const src = diskPath(cur);
			const dst = diskPath(newDbPath);

			try {
				if (fs.existsSync(dst)) {
					// webp already exists (partial run / prior upload) — just fix DB
					await prisma[model].update({
						where: { id: row.id },
						data: { [field]: newDbPath },
					});
					converted++;
					continue;
				}

				if (!fs.existsSync(src)) {
					console.warn(`MISSING ${model}.${field} #${row.id}: ${cur}`);
					missing++;
					continue;
				}

				const buf = await sharp(src).rotate().webp({ quality: QUALITY }).toBuffer();
				await fs.promises.writeFile(dst, buf);
				await prisma[model].update({
					where: { id: row.id },
					data: { [field]: newDbPath },
				});
				converted++;
				console.log(`OK ${model}.${field} #${row.id}: ${cur} -> ${newDbPath}`);
			} catch (e) {
				console.error(`FAIL ${model}.${field} #${row.id} (${cur}): ${e.message}`);
				failed++;
			}
		}
	}

	console.log(
		`\nDONE. converted=${converted} skipped(non-jpg/png/url)=${skipped} missing=${missing} failed=${failed}`
	);
	await prisma.$disconnect();
}

run().catch((e) => {
	console.error(e);
	process.exit(1);
});
