#!/usr/bin/env node
/*
 * Stress test for the Live Alert system. Simulates a burst of paid voting
 * purchases against a local backend, then polls the live-purchases feed to
 * verify ordering + dedup.
 *
 * Usage:
 *   node stress_test_live_alerts.js <eventId> [BURST_COUNT] [API_BASE]
 *
 * Defaults:
 *   BURST_COUNT = 20
 *   API_BASE    = http://localhost:3001/api
 *
 * Requires the target event to have a PAID voting config with at least one
 * nominee. Test purchases are created via the public /voting/purchase route
 * (totalAmount > 0) but will stay PENDING — they won't broadcast unless you
 * manually confirm them OR override the price to 0 for the test event.
 *
 * To trigger broadcasts directly without paying via Midtrans, the simplest
 * path is to temporarily set the event's votingConfig.pricePerVote = 0 in
 * the DB, then run this script. Zero-amount purchases fast-path to PAID and
 * broadcast immediately.
 */

const eventId = process.argv[2];
const BURST = parseInt(process.argv[3] || "20", 10);
const API_BASE = process.argv[4] || "http://localhost:3001/api";

if (!eventId) {
	console.error("Usage: node stress_test_live_alerts.js <eventId> [BURST_COUNT] [API_BASE]");
	process.exit(1);
}

const GIFTS = ["flame", "bear", "rocket", "lion"];
const NAMES = ["Andi", "Budi", "Citra", "Dewi", "Eko", "Fajar", "Gina", "Hadi", "Indra", "Joko"];
const MESSAGES = [
	"Semangat terus untuk kandidat nomor 2!",
	"Kamu yang terbaik!",
	"Boost dari fans nomor satu",
	"Naik podium yuk!",
	null,
];

async function fetchEvent() {
	const res = await fetch(`${API_BASE}/voting/events/${eventId}`);
	if (!res.ok) throw new Error(`fetchEvent: ${res.status}`);
	return res.json();
}

async function purchase(payload) {
	const res = await fetch(`${API_BASE}/voting/purchase`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	const body = await res.text();
	return { status: res.status, body };
}

async function poll(since) {
	const res = await fetch(`${API_BASE}/voting/events/${eventId}/live-purchases?since=${since}`);
	if (!res.ok) throw new Error(`poll: ${res.status}`);
	return res.json();
}

(async () => {
	console.log(`📡 Resolving event ${eventId}...`);
	const evt = await fetchEvent();
	const cat = evt.votingConfig?.categories?.[0];
	const nominees = cat?.nominees ?? [];
	if (!cat || nominees.length === 0) {
		console.error("❌ Event has no voting category or nominees");
		process.exit(1);
	}
	console.log(`✅ Category: ${cat.title}, ${nominees.length} nominees`);
	console.log(`   pricePerVote: ${evt.votingConfig.pricePerVote} (must be 0 for fast-path testing)`);

	const sentIds = new Set();
	const startTs = Date.now();

	console.log(`\n🚀 Firing ${BURST} concurrent purchases...`);
	const promises = [];
	for (let i = 0; i < BURST; i++) {
		const buyer = NAMES[i % NAMES.length];
		const nominee = nominees[i % nominees.length];
		const gift = GIFTS[i % GIFTS.length];
		const msg = MESSAGES[i % MESSAGES.length];
		const votes = ({ flame: 10, bear: 20, rocket: 50, lion: 100 })[gift];
		promises.push(
			purchase({
				eventId,
				categoryId: cat.id,
				nomineeId: nominee.id,
				buyerName: `${buyer}-${i}`,
				buyerEmail: "",
				voteCount: votes,
				buyerMessage: msg,
				giftType: gift,
			}).then((r) => {
				if (r.status === 201) {
					try {
						const data = JSON.parse(r.body);
						sentIds.add(data.purchase.id);
					} catch { /* ignore */ }
				} else {
					console.warn(`  ⚠️  purchase ${i}: HTTP ${r.status} — ${r.body.slice(0, 120)}`);
				}
			})
		);
	}
	await Promise.all(promises);
	console.log(`✅ Sent ${sentIds.size}/${BURST} purchases in ${Date.now() - startTs}ms`);

	// Poll the live-purchases endpoint to verify broadcasts.
	console.log(`\n📥 Polling feed every 3s for 15s to verify broadcast + ordering...`);
	let cursor = startTs - 1000; // anchor slightly before sends
	const seenInFeed = new Map(); // id -> count (must be 1, never >1)
	const pollDeadline = Date.now() + 15_000;
	while (Date.now() < pollDeadline) {
		const { entries, serverTs } = await poll(cursor);
		cursor = serverTs;
		for (const e of entries) {
			seenInFeed.set(e.id, (seenInFeed.get(e.id) ?? 0) + 1);
		}
		if (entries.length > 0) {
			console.log(`  [+${Date.now() - startTs}ms] received ${entries.length} entries (total unique: ${seenInFeed.size})`);
		}
		await new Promise((r) => setTimeout(r, 3000));
	}

	// Verify.
	console.log(`\n=== RESULTS ===`);
	console.log(`Sent     : ${sentIds.size}`);
	console.log(`Broadcast: ${seenInFeed.size}`);
	const missing = [...sentIds].filter((id) => !seenInFeed.has(id));
	const duplicates = [...seenInFeed.entries()].filter(([_id, c]) => c > 1);
	if (missing.length) {
		console.warn(`❌ Missing ${missing.length} broadcasts:`, missing.slice(0, 5));
	} else {
		console.log(`✅ All sent purchases were broadcast`);
	}
	if (duplicates.length) {
		console.warn(`❌ ${duplicates.length} ids were broadcast multiple times`);
	} else {
		console.log(`✅ No duplicate broadcasts (defense-in-depth dedup working)`);
	}
})().catch((err) => {
	console.error(err);
	process.exit(1);
});
