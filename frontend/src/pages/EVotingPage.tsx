import React, { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion, Reorder } from "framer-motion";
import { api } from "../utils/api";
import { config } from "../utils/config";
import { useAuth } from "../hooks/useAuth";
import { usePayment } from "../hooks/usePayment";
import { VotingEvent } from "../types/voting";
import {
	LuArrowLeft,
	LuArrowRight,
	LuCalendar,
	LuChevronLeft,
	LuChevronRight,
	LuCircleCheck,
	LuClock,
	LuCrown,
	LuMapPin,
	LuMedal,
	LuSearch,
	LuSparkles,
	LuThumbsUp,
	LuTicket,
	LuTrophy,
	LuUser,
	LuUsers,
	LuVolume2,
	LuVolumeX,
	LuX,
	LuZap,
} from "react-icons/lu";
import Swal from "sweetalert2";
import VoteGuideCard from "../components/landing/VoteGuideCard";
import LiveAlertSystem, { LiveAlert, GiftBoostType } from "../components/voting/LiveAlertSystem";

const LIVE_VOTE_CTA = "Dukung kandidat favoritmu sekarang dan tampilkan pesan dukungan terbaikmu di live voting!";
const BUYER_MESSAGE_MAX_LEN = 140;


// ---------------------------------------------------------------------------
// Voting Arena helpers — kept local so the page stays self-contained per the
// brief (no new files). All visual chrome lives in LandingPage.css under the
// `.evoting-arena` scope.
// ---------------------------------------------------------------------------

type CountdownParts = { days: number; hours: number; minutes: number; seconds: number; totalMs: number };

const computeCountdown = (target: Date | null): CountdownParts | null => {
	if (!target) return null;
	const diff = target.getTime() - Date.now();
	if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 };
	const days = Math.floor(diff / 86_400_000);
	const hours = Math.floor((diff % 86_400_000) / 3_600_000);
	const minutes = Math.floor((diff % 3_600_000) / 60_000);
	const seconds = Math.floor((diff % 60_000) / 1000);
	return { days, hours, minutes, seconds, totalMs: diff };
};

/** Tick once per second to drive the countdown HUD. */
const useCountdown = (target: Date | null): CountdownParts | null => {
	const [parts, setParts] = useState<CountdownParts | null>(() => computeCountdown(target));
	useEffect(() => {
		setParts(computeCountdown(target));
		if (!target) return undefined;
		const id = window.setInterval(() => setParts(computeCountdown(target)), 1000);
		return () => window.clearInterval(id);
	}, [target]);
	return parts;
};

const ARENA_SOUND_STORAGE_KEY = "voting-arena-sound";

/**
 * Sound effect placeholder. Wires up two named slots ("vote", "rankup") with
 * empty <audio> tags so the team can drop in MP3s later without code changes.
 * Mute state persists per-device in localStorage.
 */
const useArenaSound = () => {
	const [muted, setMuted] = useState<boolean>(() => {
		if (typeof window === "undefined") return true;
		return window.localStorage.getItem(ARENA_SOUND_STORAGE_KEY) !== "on";
	});
	const refs = useRef<Record<string, HTMLAudioElement | null>>({});

	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem(ARENA_SOUND_STORAGE_KEY, muted ? "off" : "on");
	}, [muted]);

	const play = useCallback((key: "vote" | "rankup") => {
		if (muted) return;
		const el = refs.current[key];
		if (!el || !el.src) return;
		try {
			el.currentTime = 0;
			void el.play();
		} catch {
			/* ignore: missing asset or autoplay block */
		}
	}, [muted]);

	const register = useCallback((key: string) => (el: HTMLAudioElement | null) => {
		refs.current[key] = el;
	}, []);

	return { muted, setMuted, play, register };
};

/** Detect rank changes between two ordered nominee snapshots (by id). */
const diffRanks = (prev: string[], next: string[]) => {
	const prevIdx = new Map(prev.map((id, idx) => [id, idx]));
	const deltas = new Map<string, number>();
	next.forEach((id, idx) => {
		const before = prevIdx.get(id);
		if (before === undefined) return;
		const change = before - idx; // positive = moved up
		if (change !== 0) deltas.set(id, change);
	});
	return deltas;
};

const padTime = (n: number) => String(Math.max(0, n)).padStart(2, "0");

// ----- Gift Voting catalog -----
// Keep this in sync with GIFT_CATALOG in backend/src/routes/voting.ts.
type GiftType = "lion" | "rocket" | "bear" | "flame";
interface GiftDef { type: GiftType; emoji: string; label: string; votes: number; tone: string; }
const GIFTS: GiftDef[] = [
	{ type: "flame", emoji: "🔥", label: "Api", votes: 10, tone: "is-flame" },
	{ type: "bear", emoji: "🐻", label: "Beruang", votes: 20, tone: "is-bear" },
	{ type: "rocket", emoji: "🚀", label: "Roket", votes: 50, tone: "is-rocket" },
	{ type: "lion", emoji: "🦁", label: "Singa", votes: 100, tone: "is-lion" },
];

/** Smooth integer ticker for KPI numbers — pure RAF, no dep. */
const ArenaCounter: React.FC<{ value: number; duration?: number }> = ({ value, duration = 700 }) => {
	const [display, setDisplay] = useState(value);
	const fromRef = useRef(value);
	const startRef = useRef(0);
	const rafRef = useRef<number | null>(null);
	useEffect(() => {
		fromRef.current = display;
		startRef.current = performance.now();
		if (rafRef.current) cancelAnimationFrame(rafRef.current);
		const step = (now: number) => {
			const t = Math.min(1, (now - startRef.current) / duration);
			const eased = 1 - Math.pow(1 - t, 3);
			setDisplay(Math.round(fromRef.current + (value - fromRef.current) * eased));
			if (t < 1) rafRef.current = requestAnimationFrame(step);
		};
		rafRef.current = requestAnimationFrame(step);
		return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [value, duration]);
	return <>{display.toLocaleString("id-ID")}</>;
};

/** Countdown HUD strip — days, hours, minutes, seconds. */
const ArenaCountdownStrip: React.FC<{ target: Date | null; label: string }> = ({ target, label }) => {
	const parts = useCountdown(target);
	if (!target || !parts) {
		return (
			<div className="mt-6">
				<p className="arena-chrome text-[10px] font-extrabold uppercase tracking-[0.24em] text-slate-400">{label}</p>
				<p className="arena-numeric mt-1 text-lg font-black text-slate-200">Tanpa batas waktu</p>
			</div>
		);
	}
	const urgent = parts.totalMs > 0 && parts.totalMs < 60 * 60 * 1000;
	return (
		<div className="mt-6">
			<p className="arena-chrome mb-2 text-[10px] font-extrabold uppercase tracking-[0.24em] text-slate-400">{label}</p>
			<div className={`arena-countdown ${urgent ? "is-urgent" : ""}`}>
				<div className="arena-countdown-unit">
					<div className="arena-countdown-value">{padTime(parts.days)}</div>
					<div className="arena-countdown-label">Hari</div>
				</div>
				<div className="arena-countdown-unit">
					<div className="arena-countdown-value">{padTime(parts.hours)}</div>
					<div className="arena-countdown-label">Jam</div>
				</div>
				<div className="arena-countdown-unit">
					<div className="arena-countdown-value">{padTime(parts.minutes)}</div>
					<div className="arena-countdown-label">Menit</div>
				</div>
				<div className="arena-countdown-unit">
					<div className="arena-countdown-value">{padTime(parts.seconds)}</div>
					<div className="arena-countdown-label">Detik</div>
				</div>
			</div>
		</div>
	);
};

const VOTING_ADMIN_FEE_PER_VOTE = 500;
const VOTING_MAX_ADMIN_FEE = 10000;
const QRIS_MAX_TRANSACTION = 10_000_000;

const calculateVotingAdminFee = (subtotal: number, voteCount: number) => {
	if (subtotal <= 0) return 0;
	return Math.min(VOTING_ADMIN_FEE_PER_VOTE * voteCount, VOTING_MAX_ADMIN_FEE);
};

const calculateMaxVoteCount = (pricePerVote: number) => {
	if (!pricePerVote || pricePerVote <= 0) return Number.POSITIVE_INFINITY;
	return Math.max(1, Math.floor((QRIS_MAX_TRANSACTION - VOTING_MAX_ADMIN_FEE) / pricePerVote));
};

const EVotingPage: React.FC = () => {
	const { user } = useAuth();
	const { pay, isSnapReady } = usePayment();
	const [events, setEvents] = useState<VotingEvent[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);

	// Voting detail view
	const [selectedEvent, setSelectedEvent] = useState<VotingEvent | null>(null);
	const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
	const [nomineeSearch, setNomineeSearch] = useState("");
	const [voting, setVoting] = useState(false);
	const [votedNominees, setVotedNominees] = useState<Set<string>>(new Set());

	// ----- Voting Arena state -----
	const arenaSound = useArenaSound();
	const [rankDeltas, setRankDeltas] = useState<Map<string, number>>(new Map());
	const [flashNomineeIds, setFlashNomineeIds] = useState<Set<string>>(new Set());
	const [voteFeed, setVoteFeed] = useState<Array<{ id: string; text: string; tone: "vote" | "rankup"; ts: number }>>([]);
	const [confettiBursts, setConfettiBursts] = useState<Array<{ id: string; left: number; top: number }>>([]);
	const [rankUpAlert, setRankUpAlert] = useState<{ name: string; rank: number } | null>(null);
	const prevRankRef = useRef<string[]>([]);
	const prevVoteRef = useRef<Map<string, number>>(new Map());
	const deltaTimerRef = useRef<number | null>(null);
	const tickerSeqRef = useRef(0);
	// Nominees the user actively backed this session — used to gate the
	// rank-up celebration burst so we don't pop modals for unrelated movement.
	const myInterestRef = useRef<Set<string>>(new Set());
	const rankUpTimerRef = useRef<number | null>(null);

	// Defined early so the gift handlers below can close over them without
	// hitting a temporal-dead-zone error when TypeScript inspects const usage.
	const pushTickerEntry = useCallback((text: string, tone: "vote" | "rankup") => {
		tickerSeqRef.current += 1;
		const id = `feed-${Date.now()}-${tickerSeqRef.current}`;
		setVoteFeed((prev) => [{ id, text, tone, ts: Date.now() }, ...prev].slice(0, 8));
	}, []);

	const fireConfetti = useCallback((origin?: { x: number; y: number }) => {
		const burstId = `cf-${Date.now()}`;
		setConfettiBursts((prev) => [...prev, { id: burstId, left: origin?.x ?? window.innerWidth / 2, top: origin?.y ?? window.innerHeight / 2 }]);
		window.setTimeout(() => {
			setConfettiBursts((prev) => prev.filter((b) => b.id !== burstId));
		}, 1700);
	}, []);

	// ----- Gift effect state (animation-only; gifts are now paid presets) -----
	const [flyingGifts, setFlyingGifts] = useState<Array<{ id: string; emoji: string; from: { x: number; y: number }; to: { x: number; y: number } }>>([]);
	const [receivingAura, setReceivingAura] = useState<Map<string, GiftType>>(new Map());
	const [bouncingNominee, setBouncingNominee] = useState<string | null>(null);
	const [flamePulseNominee, setFlamePulseNominee] = useState<string | null>(null);
	const [lionShow, setLionShow] = useState<{ emoji: string; ts: number } | null>(null);
	const [rocketShow, setRocketShow] = useState<number | null>(null);
	const [shaking, setShaking] = useState(false);
	const recentGiftsRef = useRef<Array<{ nomineeId: string; ts: number }>>([]);
	const [trendingNomineeId, setTrendingNomineeId] = useState<string | null>(null);
	const nomineeCardRefs = useRef<Map<string, HTMLElement | null>>(new Map());

	/**
	 * Visualize a received gift on the target nominee + fire the gift-specific
	 * signature effect (lion full-screen, rocket streak, bear bounce, soldier
	 * pulse). Called both when WE send a gift AND when someone else's gift
	 * arrives via polling.
	 */
	const playGiftEffect = useCallback((nomineeId: string, type: GiftType, fromEl?: HTMLElement | null) => {
		// Aura ring on the target card.
		setReceivingAura((prev) => new Map(prev).set(nomineeId, type));
		window.setTimeout(() => {
			setReceivingAura((prev) => {
				const next = new Map(prev);
				if (next.get(nomineeId) === type) next.delete(nomineeId);
				return next;
			});
		}, 1700);

		// Flying emoji from gift card -> nominee card.
		const fromRect = fromEl?.getBoundingClientRect();
		const toEl = nomineeCardRefs.current.get(nomineeId);
		const toRect = toEl?.getBoundingClientRect();
		if (fromRect && toRect) {
			const flyId = `fly-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
			const def = GIFTS.find((g) => g.type === type);
			setFlyingGifts((prev) => [...prev, {
				id: flyId,
				emoji: def?.emoji ?? "🎁",
				from: { x: fromRect.left + fromRect.width / 2, y: fromRect.top + fromRect.height / 2 },
				to: { x: toRect.left + toRect.width / 2, y: toRect.top + toRect.height / 2 },
			}]);
			window.setTimeout(() => {
				setFlyingGifts((prev) => prev.filter((f) => f.id !== flyId));
			}, 900);
		}

		// Signature per-gift effect.
		if (type === "lion") {
			setLionShow({ emoji: "🦁", ts: Date.now() });
			setShaking(true);
			window.setTimeout(() => setShaking(false), 480);
			window.setTimeout(() => setLionShow(null), 1500);
			fireConfetti();
		} else if (type === "rocket") {
			setRocketShow(Date.now());
			window.setTimeout(() => setRocketShow(null), 1100);
		} else if (type === "bear") {
			setBouncingNominee(nomineeId);
			window.setTimeout(() => setBouncingNominee((cur) => (cur === nomineeId ? null : cur)), 720);
		} else if (type === "flame") {
			setFlamePulseNominee(nomineeId);
			window.setTimeout(() => setFlamePulseNominee((cur) => (cur === nomineeId ? null : cur)), 800);
		}

		// Track for trending calc.
		recentGiftsRef.current = [...recentGiftsRef.current.filter((e) => Date.now() - e.ts < 60_000), { nomineeId, ts: Date.now() }];
	}, [fireConfetti]);

	/**
	 * Send a gift to the currently-selected target nominee. Optimistic UI:
	 * bump local voteCount, fire effects, then call API. On failure, revert.
	 */
	// Reset target nominee + visual state when leaving the detail view.
	useEffect(() => {
		if (!selectedEvent) {
			setFlyingGifts([]);
			setReceivingAura(new Map());
			setBouncingNominee(null);
			setFlamePulseNominee(null);
			setLionShow(null);
			setRocketShow(null);
			setShaking(false);
			recentGiftsRef.current = [];
			setTrendingNomineeId(null);
		}
	}, [selectedEvent]);

	// Recompute trending nominee every 5s based on recent gift activity.
	useEffect(() => {
		const compute = () => {
			const cutoff = Date.now() - 60_000;
			recentGiftsRef.current = recentGiftsRef.current.filter((e) => e.ts > cutoff);
			const counts = new Map<string, number>();
			for (const e of recentGiftsRef.current) {
				counts.set(e.nomineeId, (counts.get(e.nomineeId) ?? 0) + 1);
			}
			let topId: string | null = null;
			let topCount = 0;
			for (const [id, c] of counts) {
				if (c > topCount && c >= 2) { topId = id; topCount = c; }
			}
			setTrendingNomineeId(topId);
		};
		compute();
		const id = window.setInterval(compute, 5_000);
		return () => window.clearInterval(id);
	}, []);

	// Purchase modal (for paid voting)
	const [showPurchaseModal, setShowPurchaseModal] = useState(false);
	const [buyerName, setBuyerName] = useState("");
	const buyerEmail = "";
	const buyerPhone = "";
	const [voteCount, setVoteCount] = useState(1);
	const [purchasing, setPurchasing] = useState(false);
	// Live alert popup payload — short support message. The active gift
	// preset is DERIVED from voteCount (single source of truth) so a
	// "click gift then change vote count" flow never carries the old gift
	// label to the AI voice narration.
	const [buyerMessage, setBuyerMessage] = useState("");
	const selectedGiftType: GiftType | null = (() => {
		const match = GIFTS.find((g) => g.votes === voteCount);
		return match?.type ?? null;
	})();

	// Realtime live-purchase popup feed (polled every ~3s).
	const [liveAlerts, setLiveAlerts] = useState<LiveAlert[]>([]);
	const liveSinceRef = useRef<number>(0);
	const [paymentVerifying, setPaymentVerifying] = useState(false);

	// Hide mobile bottom nav while the purchase modal is open so the floating
	// nav doesn't cover the modal's sticky "Beli Vote" footer.
	useEffect(() => {
		if (showPurchaseModal) {
			document.body.classList.add("purchase-modal-open");
			return () => document.body.classList.remove("purchase-modal-open");
		}
		// Reset message + vote count when modal closes so the next purchase
		// flow starts clean (selectedGiftType is derived from voteCount so
		// it auto-resets when voteCount goes back to 1).
		setBuyerMessage("");
		setVoteCount(1);
		return undefined;
	}, [showPurchaseModal]);

	// Hide global nav chrome inside the voting arena so the live popup +
	// floating dashboard button never collide. Restored on exit.
	useEffect(() => {
		if (!selectedEvent) return undefined;
		document.body.classList.add("voting-arena-open");
		return () => document.body.classList.remove("voting-arena-open");
	}, [selectedEvent]);

	const [paidVoteTarget, setPaidVoteTarget] = useState<{ categoryId: string; nomineeId: string } | null>(null);
	const maxVoteCount = calculateMaxVoteCount(selectedEvent?.votingConfig?.pricePerVote || 0);
	const normalizeVoteCount = (value: string) => {
		const parsed = Math.max(1, parseInt(value, 10) || 1);
		return Number.isFinite(maxVoteCount) ? Math.min(maxVoteCount, parsed) : parsed;
	};

	useEffect(() => {
		if (Number.isFinite(maxVoteCount) && voteCount > maxVoteCount) {
			setVoteCount(maxVoteCount);
		}
	}, [maxVoteCount, voteCount]);

	useEffect(() => {
		setNomineeSearch("");
	}, [selectedEvent?.id, selectedCategoryId]);

	const fetchEvents = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const params: any = { page, limit: 25 };
			if (search) params.search = search;

			const res = await api.get("/voting/events", { params });
			setEvents(res.data.data);
			setTotalPages(res.data.totalPages);
		} catch (err: any) {
			console.error("Error fetching voting events:", err);
			setError(err.response?.data?.error || err.message || "Gagal memuat data event voting");
		} finally {
			setLoading(false);
		}
	}, [page, search]);

	useEffect(() => {
		fetchEvents();
	}, [fetchEvents]);

	const fetchEventDetail = async (eventId: string, opts: { silent?: boolean; pickFirstCategory?: boolean } = {}) => {
		try {
			const res = await api.get(`/voting/events/${eventId}`, opts.silent ? { silent: true } : undefined);
			setSelectedEvent(res.data);
			if (opts.pickFirstCategory && res.data.votingConfig?.categories?.length > 0) {
				setSelectedCategoryId((current) => current ?? res.data.votingConfig.categories[0].id);
			}
		} catch {
			if (!opts.silent) Swal.fire("Error", "Gagal memuat detail voting", "error");
		}
	};

	// Wrapper used by the original entry path — keeps category auto-pick + error toast.
	const fetchEventDetailInitial = (eventId: string) => fetchEventDetail(eventId, { pickFirstCategory: true });

	// Background poll: every 12s while detail view is open + tab visible. Diffs
	// snapshots vs. previous to emit ticker entries and rank-delta chips.
	useEffect(() => {
		if (!selectedEvent) {
			prevRankRef.current = [];
			prevVoteRef.current = new Map();
			myInterestRef.current = new Set();
			setRankDeltas(new Map());
			setFlashNomineeIds(new Set());
			setVoteFeed([]);
			setRankUpAlert(null);
			if (rankUpTimerRef.current) { window.clearTimeout(rankUpTimerRef.current); rankUpTimerRef.current = null; }
			return undefined;
		}
		const eventId = selectedEvent.id;
		let cancelled = false;
		const tick = async () => {
			if (document.visibilityState !== "visible") return;
			try {
				const res = await api.get(`/voting/events/${eventId}`, { silent: true });
				if (cancelled) return;
				setSelectedEvent(res.data);
			} catch {
				/* swallow — keep last good snapshot */
			}
		};
		const id = window.setInterval(tick, 12_000);
		return () => {
			cancelled = true;
			window.clearInterval(id);
		};
	}, [selectedEvent?.id]);

	// Realtime live-purchase popup poller. Hits a lightweight endpoint every
	// 3s with `since=lastSeen`, so each viewer sees brand-new paid purchases
	// the moment they're confirmed without needing a WebSocket. Reset feed
	// + cursor when leaving the detail view or switching events.
	useEffect(() => {
		if (!selectedEvent) {
			setLiveAlerts([]);
			liveSinceRef.current = 0;
			return undefined;
		}
		const eventId = selectedEvent.id;
		// Server's clock — use first poll's `serverTs` as the "since" anchor so
		// we never replay alerts from before we opened the page.
		let cancelled = false;
		let inFlight = false;
		const tick = async () => {
			if (document.visibilityState !== "visible") return;
			// Skip overlapping fetches under slow network. Without this guard,
			// two ticks fired 3s apart with a 5s response would both read the
			// same stale cursor and fetch overlapping ranges (id-dedup absorbs
			// it but wastes bandwidth + server CPU).
			if (inFlight) return;
			inFlight = true;
			try {
				const res = await api.get(`/voting/events/${eventId}/live-purchases`, {
					params: { since: liveSinceRef.current },
					silent: true,
				});
				if (cancelled) return;
				const serverTs = Number(res.data?.serverTs) || Date.now();
				const entries = Array.isArray(res.data?.entries) ? res.data.entries : [];
				if (liveSinceRef.current === 0) {
					// First poll: skip historical entries (avoid replay), just bookmark.
					liveSinceRef.current = serverTs;
					return;
				}
				liveSinceRef.current = serverTs;
				if (entries.length === 0) return;
				const mapped: LiveAlert[] = entries.map((e: any) => ({
					id: String(e.id ?? `${e.ts}-${e.buyerName}`),
					buyerName: String(e.buyerName ?? "Anonim"),
					buyerMessage: e.buyerMessage ? String(e.buyerMessage) : null,
					voteCount: Number(e.voteCount) || 0,
					nomineeName: String(e.nomineeName ?? "Nominee"),
					// Preserve null when backend stored no explicit gift (custom
					// vote count). LiveAlertSystem uses this to skip the
					// "Boost X!" narration line — only visual fallback emoji.
					giftType: (e.giftType as GiftBoostType) ?? null,
					ts: Number(e.ts) || Date.now(),
				}));
				setLiveAlerts((prev) => {
					const known = new Set(prev.map((p) => p.id));
					const fresh = mapped.filter((m) => !known.has(m.id));
					if (fresh.length === 0) return prev;
					// Keep only the last 24 entries; LiveAlertSystem maintains its own
					// dedupe + lifetime windows, so this is just memory hygiene.
					return [...fresh, ...prev].slice(0, 24);
				});
			} catch {
				/* swallow — polling is best-effort */
			} finally {
				inFlight = false;
			}
		};
		void tick();
		const id = window.setInterval(tick, 3000);
		return () => {
			cancelled = true;
			window.clearInterval(id);
		};
	}, [selectedEvent?.id]);

	// Diff sorted nominees of the active category to emit rank deltas, flashes,
	// and ticker entries whenever the snapshot changes.
	useEffect(() => {
		const category = selectedEvent?.votingConfig?.categories.find((c) => c.id === selectedCategoryId);
		const nominees = category?.nominees ?? [];
		const sorted = [...nominees].sort((a, b) => b.voteCount - a.voteCount);
		const nextOrder = sorted.map((n) => n.id);

		if (prevRankRef.current.length === 0) {
			prevRankRef.current = nextOrder;
			prevVoteRef.current = new Map(sorted.map((n) => [n.id, n.voteCount]));
			return;
		}

		const deltas = diffRanks(prevRankRef.current, nextOrder);
		const flashes = new Set<string>();
		sorted.forEach((n) => {
			const before = prevVoteRef.current.get(n.id) ?? n.voteCount;
			const diff = n.voteCount - before;
			if (diff > 0) {
				flashes.add(n.id);
				pushTickerEntry(`+${diff} vote → ${n.nomineeName}`, "vote");
			}
		});
		deltas.forEach((change, id) => {
			const nominee = sorted.find((n) => n.id === id);
			if (!nominee) return;
			const direction = change > 0 ? "naik" : "turun";
			pushTickerEntry(`${nominee.nomineeName} ${direction} ${Math.abs(change)} peringkat`, change > 0 ? "rankup" : "vote");
			if (change > 0) arenaSound.play("rankup");

			// Personal celebration burst: only when one of MY backed nominees
			// jumps up. Always preempt the previous alert so the latest wins.
			if (change > 0 && myInterestRef.current.has(id)) {
				const newRank = nextOrder.indexOf(id) + 1;
				setRankUpAlert({ name: nominee.nomineeName, rank: newRank });
				if (rankUpTimerRef.current) window.clearTimeout(rankUpTimerRef.current);
				rankUpTimerRef.current = window.setTimeout(() => setRankUpAlert(null), 2800);
				// Extra confetti burst from center for the celebration.
				fireConfetti();
			}
		});

		if (deltas.size > 0) setRankDeltas(deltas);
		if (flashes.size > 0) setFlashNomineeIds(flashes);

		// Auto-clear delta chips + flash after a short window.
		if (deltaTimerRef.current) window.clearTimeout(deltaTimerRef.current);
		deltaTimerRef.current = window.setTimeout(() => {
			setRankDeltas(new Map());
			setFlashNomineeIds(new Set());
		}, 4500);

		prevRankRef.current = nextOrder;
		prevVoteRef.current = new Map(sorted.map((n) => [n.id, n.voteCount]));
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedEvent, selectedCategoryId, pushTickerEntry, arenaSound]);

	// Drop oldest ticker entries after 14s so the panel doesn't grow forever.
	useEffect(() => {
		if (voteFeed.length === 0) return undefined;
		const id = window.setInterval(() => {
			setVoteFeed((prev) => prev.filter((e) => Date.now() - e.ts < 14_000));
		}, 2000);
		return () => window.clearInterval(id);
	}, [voteFeed.length]);

	const openVotingEvent = (eventId: string) => {
		setPaidVoteTarget(null);
		setShowPurchaseModal(false);
		setVotedNominees(new Set());
		setSelectedCategoryId(null);
		fetchEventDetailInitial(eventId);
	};

	const formatDate = (date: string) => {
		return new Date(date).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("id-ID", {
			style: "currency",
			currency: "IDR",
			minimumFractionDigits: 0,
		}).format(amount);
	};

	const getVotingOrderSummary = () => {
		const subtotal = (selectedEvent?.votingConfig?.pricePerVote || 0) * voteCount;
		const adminFee = calculateVotingAdminFee(subtotal, voteCount);
		return {
			subtotal,
			adminFee,
			totalBeforeQris: subtotal + adminFee,
		};
	};

	const handleFreeVote = async (categoryId: string, nomineeId: string, sourceEl?: HTMLElement | null) => {
		const result = await Swal.fire({
			title: "Konfirmasi Vote",
			text: "Apakah Anda yakin ingin memberikan vote?",
			icon: "question",
			showCancelButton: true,
			confirmButtonText: "Vote!",
			cancelButtonText: "Batal",
			confirmButtonColor: "#00bcd4",
			background: "#0a0d22",
			color: "#e6ecff",
		});

		if (!result.isConfirmed) return;

		try {
			setVoting(true);
			await api.post("/voting/vote", {
				categoryId,
				nomineeId,
				voterName: user?.name || undefined,
				voterEmail: user?.email || undefined,
			});

			setVotedNominees((prev) => new Set([...prev, nomineeId]));
			myInterestRef.current.add(nomineeId);

			// Celebrate — confetti from the button's position + sound + toast.
			let origin: { x: number; y: number } | undefined;
			if (sourceEl) {
				const r = sourceEl.getBoundingClientRect();
				origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
			}
			fireConfetti(origin);
			arenaSound.play("vote");
			pushTickerEntry("Vote kamu masuk arena!", "vote");

			Swal.fire({
				title: "Vote Masuk Arena!",
				icon: "success",
				timer: 1300,
				showConfirmButton: false,
				background: "#0a0d22",
				color: "#e6ecff",
			});

			if (selectedEvent) fetchEventDetail(selectedEvent.id, { silent: true });
		} catch (err: any) {
			Swal.fire("Gagal", err.response?.data?.error || "Gagal melakukan vote", "error");
		} finally {
			setVoting(false);
		}
	};

	const handlePaidVote = async (categoryId: string, nomineeId: string) => {
		setPaidVoteTarget({ categoryId, nomineeId });
		setShowPurchaseModal(true);
	};

	const handlePurchaseVotes = async () => {
		if (!selectedEvent || !buyerName.trim()) {
			Swal.fire("Error", "Nama wajib diisi", "error");
			return;
		}
		if (!paidVoteTarget) {
			Swal.fire("Pilih Nominee", "Pilih nominee yang ingin diberi vote terlebih dahulu", "warning");
			return;
		}
		// Email is optional and unrestricted — gifts/votes only need a name.

		const targetCategory = selectedEvent.votingConfig?.categories.find((category) => category.id === paidVoteTarget.categoryId);
		const targetNominee = targetCategory?.nominees?.find((nominee) => nominee.id === paidVoteTarget.nomineeId);
		if (!targetCategory || !targetNominee) {
			Swal.fire("Gagal", "Nominee tidak ditemukan. Muat ulang halaman lalu coba lagi.", "error");
			return;
		}

		try {
			setPurchasing(true);
			// Send giftType ONLY when the buyer selected an explicit preset
			// (selectedGiftType is derived from voteCount). Custom vote counts
			// send no giftType so the popup narration skips "Boost X!" and
			// speaks just the vote count + buyer + nominee + message.
			const res = await api.post("/voting/purchase", {
				eventId: selectedEvent.id,
				categoryId: paidVoteTarget.categoryId,
				nomineeId: paidVoteTarget.nomineeId,
				buyerName: buyerName.trim(),
				buyerEmail: buyerEmail.trim(),
				buyerPhone: buyerPhone.trim() || undefined,
				voteCount,
				buyerMessage: buyerMessage.trim().slice(0, BUYER_MESSAGE_MAX_LEN) || undefined,
				giftType: selectedGiftType ?? undefined,
			});

			const { snapToken, purchaseCode, totalAmount } = res.data.purchase;
			const purchaseId = res.data.purchase.id;
			const adminFee = res.data.purchase.adminFee ?? calculateVotingAdminFee(totalAmount, voteCount);
			const paymentAmount = res.data.purchase.paymentAmount ?? totalAmount + adminFee;

			if (snapToken && isSnapReady && totalAmount > 0) {
				setShowPurchaseModal(false);

				const onSuccess = async () => {
					setPaymentVerifying(true);
					Swal.fire({
						title: "Memverifikasi Pembayaran",
						html: `<div class="text-left space-y-2">
							<p>Pembayaran berhasil di Midtrans. Server sedang memastikan status transaksi dan memasukkan vote.</p>
							<p class="text-sm text-gray-500">Mohon tunggu sebentar, jangan tutup halaman ini.</p>
						</div>`,
						allowOutsideClick: false,
						allowEscapeKey: false,
						showConfirmButton: false,
						didOpen: () => Swal.showLoading(),
					});
					try {
						const confirmRes = await api.post("/voting/confirm-payment", {
							purchaseCode,
							email: buyerEmail.trim(),
							waitMs: 15000,
						});
						if (confirmRes.data.status !== "PAID") {
							throw new Error(confirmRes.data.message || "Pembayaran vote belum dikonfirmasi");
						}
						const confirmedVoteCount = confirmRes.data.appliedVotes || confirmRes.data.voteCount || voteCount;
						myInterestRef.current.add(targetNominee.id);
						setPaidVoteTarget(null);
						setPaymentVerifying(false);
						Swal.close();
						const buyerLabel = buyerName.trim() || "Anonim";
						setLiveAlerts((prev) => {
							const alert: LiveAlert = {
								id: String(purchaseId),
								buyerName: buyerLabel,
								buyerMessage: buyerMessage.trim().slice(0, BUYER_MESSAGE_MAX_LEN) || null,
								voteCount: confirmedVoteCount,
								nomineeName: targetNominee.nomineeName,
								giftType: selectedGiftType ?? null,
								ts: Date.now(),
							};
							return [alert, ...prev.filter((item) => item.id !== alert.id)].slice(0, 24);
						});
						// Fire the matching gift signature animation if the vote count
						// hits one of the preset gift values (Singa=100, Roket=50,
						// Beruang=20, Tentara=10). Otherwise fall back to confetti.
						const matchedGift = GIFTS.find((g) => g.votes === confirmedVoteCount);
						if (matchedGift) {
							playGiftEffect(targetNominee.id, matchedGift.type);
							arenaSound.play(matchedGift.type === "lion" ? "rankup" : "vote");
							pushTickerEntry(`${matchedGift.emoji} ${buyerName.trim() || "Anonim"} kirim ${matchedGift.label} (+${matchedGift.votes}) → ${targetNominee.nomineeName}`, "rankup");
						} else {
							fireConfetti();
							arenaSound.play("vote");
							pushTickerEntry(`Boost ${confirmedVoteCount} vote → ${targetNominee.nomineeName}`, "rankup");
						}
						Swal.fire({
							title: "Vote Berhasil!",
							text: `${confirmedVoteCount} vote masuk untuk ${targetNominee.nomineeName}.`,
							icon: "success",
							toast: true,
							position: "top-end",
							timer: 2200,
							showConfirmButton: false,
							timerProgressBar: true,
						});
						fetchEventDetail(selectedEvent.id);
					} catch (err: any) {
						await Swal.fire({
							title: "Menunggu Konfirmasi Pembayaran",
							html: `<div class="text-left space-y-2">
								<p>Pembayaran sudah terlihat berhasil di Midtrans, tetapi server belum menerima status final.</p>
								<p class="text-sm text-gray-500">Vote hanya akan dimasukkan setelah server berhasil memverifikasi transaksi dari Midtrans. Coba cek lagi beberapa detik lagi.</p>
							</div>`,
							icon: "info",
							confirmButtonColor: "#dc2626",
						});
						console.error("Voting payment confirmation pending:", err);
					} finally {
						setPaymentVerifying(false);
					}
				};
				const onError = () => {
					Swal.fire("Pembayaran Gagal", "Pembayaran tidak berhasil. Vote tidak aktif.", "error");
				};
				let unfinishedPromptOpen = false;
				const handleUnfinishedPayment = () => {
					if (unfinishedPromptOpen) return;
					unfinishedPromptOpen = true;
					Swal.fire({
						title: "Pembayaran Belum Selesai",
						html: `<p>QRIS belum dibayar atau popup pembayaran ditutup.</p>
							<p class="text-sm text-gray-500 mt-2">Lanjutkan pembayaran sekarang, atau batalkan transaksi supaya tidak tersimpan sebagai pending.</p>`,
						icon: "warning",
						showCancelButton: true,
						confirmButtonText: "Lanjutkan Pembayaran",
						confirmButtonColor: "#dc2626",
						cancelButtonText: "Batalkan & Hanguskan",
						cancelButtonColor: "#6b7280",
						reverseButtons: true,
						allowOutsideClick: false,
						allowEscapeKey: false,
					}).then(async (swalResult) => {
						unfinishedPromptOpen = false;
						if (swalResult.isConfirmed) {
							pay(snapToken, { onSuccess, onPending: handleUnfinishedPayment, onError, onClose: handleUnfinishedPayment });
							return;
						}
						if (swalResult.dismiss === Swal.DismissReason.cancel) {
							try {
								await api.post("/voting/cancel-pending", { purchaseId, purchaseCode });
								setPaidVoteTarget(null);
								if (selectedEvent) fetchEventDetail(selectedEvent.id, { silent: true });
								Swal.fire({
									title: "Transaksi Dihanguskan",
									text: "Pembelian vote telah dibatalkan.",
									icon: "success",
									confirmButtonColor: "#dc2626",
								});
							} catch (err: any) {
								Swal.fire(
									"Gagal Membatalkan",
									err?.response?.data?.error || "Tidak dapat membatalkan transaksi. Silakan coba lagi.",
									"error"
								);
							}
						}
					});
				};

				// Open Midtrans Snap payment popup
				pay(snapToken, { onSuccess, onPending: handleUnfinishedPayment, onError, onClose: handleUnfinishedPayment });
			} else if (totalAmount === 0) {
				setShowPurchaseModal(false);
				setPaidVoteTarget(null);
				Swal.fire({
					title: res.data.message,
					html: `<div class="text-left space-y-2">
						<p><strong>Nominee:</strong> ${targetNominee.nomineeName}</p>
						<p><strong>Jumlah Vote:</strong> ${voteCount}</p>
						<p><strong>Subtotal Vote:</strong> ${formatCurrency(totalAmount)}</p>
						<p><strong>Biaya Admin:</strong> ${formatCurrency(adminFee)}</p>
						<p><strong>Total sebelum QRIS:</strong> ${formatCurrency(paymentAmount)}</p>
						<p class="text-sm text-gray-500 mt-3">Vote langsung masuk ke nominee pilihan Anda.</p>
					</div>`,
					icon: "success",
					confirmButtonColor: "#dc2626",
				});
				fetchEventDetail(selectedEvent.id);
			} else {
				setShowPurchaseModal(false);
				Swal.fire({
					title: "Pembayaran Belum Siap",
					html: `<div class="text-left space-y-2">
						<p>Pesanan vote sudah dibuat, tetapi halaman pembayaran belum bisa dibuka.</p>
						<p><strong>Total sebelum QRIS:</strong> ${formatCurrency(paymentAmount)}</p>
						<p class="text-sm text-gray-500 mt-3">Muat ulang halaman lalu coba beli lagi, atau hubungi panitia jika kendala berlanjut.</p>
					</div>`,
					icon: "warning",
					confirmButtonColor: "#dc2626",
				});
			}
		} catch (err: any) {
			Swal.fire("Gagal", err.response?.data?.error || "Gagal memesan vote", "error");
		} finally {
			setPurchasing(false);
		}
	};

	const formatShortDate = (date: string) => {
		return new Date(date).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "short",
		});
	};

	const getImageUrl = (imageUrl: string | null): string => {
		if (!imageUrl) return "";
		if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;
		return `${config.api.backendUrl}${imageUrl}`;
	};

	const openNomineePhotoPreview = (nominee: { nomineeName: string; nomineeSubtitle?: string | null; nomineePhoto?: string | null }) => {
		if (!nominee.nomineePhoto) return;

		Swal.fire({
			title: nominee.nomineeName,
			text: nominee.nomineeSubtitle || undefined,
			imageUrl: getImageUrl(nominee.nomineePhoto),
			imageAlt: nominee.nomineeName,
			showCloseButton: true,
			confirmButtonText: "Tutup",
			confirmButtonColor: "#dc2626",
			width: "min(92vw, 720px)",
			customClass: {
				popup: "voting-photo-preview-popup",
				image: "voting-photo-preview-image",
			},
		});
	};

	const getVotingStatus = (event: VotingEvent) => {
		if (!event.votingConfig) return { text: "Tidak tersedia", color: "gray" };
		const now = new Date();
		if (event.votingConfig.startDate && new Date(event.votingConfig.startDate) > now) {
			return { text: "Segera", color: "amber" };
		}
		if (event.votingConfig.endDate && new Date(event.votingConfig.endDate) < now) {
			return { text: "Selesai", color: "red" };
		}
		return { text: "Buka", color: "green" };
	};

	const isVotingOpen = (event: VotingEvent): boolean => {
		if (!event.votingConfig) return false;
		const now = new Date();
		if (event.votingConfig.startDate && new Date(event.votingConfig.startDate) > now) return false;
		if (event.votingConfig.endDate && new Date(event.votingConfig.endDate) < now) return false;
		return true;
	};

	const getVotingStatusBadge = (event: VotingEvent): { label: string; className: string } => {
		const status = getVotingStatus(event);
		switch (status.color) {
			case "green":
				return { label: "Buka", className: "bg-emerald-500/90 text-white" };
			case "amber":
				return { label: "Segera", className: "bg-amber-500/90 text-white" };
			case "red":
				return { label: "Selesai", className: "bg-slate-700/[0.85] text-white" };
			default:
				return { label: "Vote", className: "bg-red-500/90 text-white" };
		}
	};

	const getVotingPriceLabel = (event: VotingEvent): string => {
		if (!event.votingConfig) return "Voting tidak tersedia";
		if (event.votingConfig.isPaid) {
			return `${formatCurrency(event.votingConfig.pricePerVote)}/vote`;
		}
		return "Gratis Vote";
	};

	const filteredEvents = events;

	const getEventNomineeCount = (event: VotingEvent) =>
		event.votingConfig?.categories.reduce(
			(total, category) => total + (category._count?.nominees ?? category.nominees?.length ?? 0),
			0
		) || 0;

	const getEventVoteCount = (event: VotingEvent) =>
		event.votingConfig?.categories.reduce(
			(total, category) =>
				total + (category._count?.votes ?? category.nominees?.reduce((sum, nominee) => sum + nominee.voteCount, 0) ?? 0),
			0
		) || 0;

	const formatCompactNumber = (value: number) =>
		new Intl.NumberFormat("id-ID", {
			notation: value >= 10000 ? "compact" : "standard",
			maximumFractionDigits: 1,
		}).format(value);

	const getEventLocationLabel = (event: VotingEvent) => event.city || event.venue || event.location || "Online";

	const currentCategory = selectedEvent?.votingConfig?.categories.find((c) => c.id === selectedCategoryId);
	const sortedNominees = [...(currentCategory?.nominees || [])].sort((a, b) => b.voteCount - a.voteCount);
	const podiumNominees = sortedNominees.slice(0, 3);
	const remainingNominees = sortedNominees.slice(3);
	const nomineeSearchQuery = nomineeSearch.trim().toLowerCase();
	const isNomineeSearchActive = nomineeSearchQuery.length > 0;
	const searchedNominees = isNomineeSearchActive
		? sortedNominees.filter((nominee, index) => {
			const rank = index + 1;
			return [
				nominee.nomineeName,
				nominee.nomineeSubtitle || "",
				`#${rank}`,
				`${rank}`,
			].some((value) => value.toLowerCase().includes(nomineeSearchQuery));
		})
		: [];
	const leaderboardNominees = isNomineeSearchActive ? searchedNominees : remainingNominees;
	const podiumOrder = podiumNominees;
	const categoryVoteCount = sortedNominees.reduce((total, nominee) => total + nominee.voteCount, 0);
	const selectedPaidCategory = selectedEvent?.votingConfig?.categories.find((category) => category.id === paidVoteTarget?.categoryId);
	const selectedPaidNominee = selectedPaidCategory?.nominees?.find((nominee) => nominee.id === paidVoteTarget?.nomineeId);

	// Event detail / voting view
	if (selectedEvent) {
		const votingOrderSummary = getVotingOrderSummary();
		const selectedEventBadge = getVotingStatusBadge(selectedEvent);
		const selectedEventImage = selectedEvent.thumbnail ? getImageUrl(selectedEvent.thumbnail) : "";
		const selectedEventNomineeCount = getEventNomineeCount(selectedEvent);
		const selectedEventVoteCount = getEventVoteCount(selectedEvent);

		const votingStatus = getVotingStatus(selectedEvent);
		const arenaOpen = isVotingOpen(selectedEvent);
		const countdownTarget = arenaOpen
			? (selectedEvent.votingConfig?.endDate ? new Date(selectedEvent.votingConfig.endDate) : null)
			: (votingStatus.color === "amber" && selectedEvent.votingConfig?.startDate
				? new Date(selectedEvent.votingConfig.startDate)
				: null);

		return (
			<div className={`evoting-arena min-h-screen ${shaking ? "is-shaking" : ""}`}>
				{/* Background layers — purely decorative, all pointer-events:none. */}
				<div className="evoting-arena-orb is-cyan" />
				<div className="evoting-arena-orb is-violet" />
				<div className="evoting-arena-orb is-ember" />
				<div className="evoting-arena-grid" />
				<div className="evoting-arena-stars" />
				<div className="evoting-arena-scanlines" />

				{/* Sound effect placeholders — drop in MP3 src later, controlled by useArenaSound. */}
				<audio ref={arenaSound.register("vote")} preload="none" />
				<audio ref={arenaSound.register("rankup")} preload="none" />

				<main className="arena-main-shell relative z-10 mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-5 md:py-8">
					{/* Top HUD strip: back + LIVE + sound */}
					<div className="arena-top-strip mb-5 flex items-center justify-between gap-3">
						<button
							onClick={() => { setSelectedEvent(null); setSelectedCategoryId(null); setVotedNominees(new Set()); setPaidVoteTarget(null); setShowPurchaseModal(false); }}
							className="arena-sound-toggle hover:!text-white"
						>
							<LuArrowLeft className="h-4 w-4" />
							<span className="hidden sm:inline">Kembali ke Arena</span>
							<span className="sm:hidden">Kembali</span>
						</button>
						<div className="flex items-center gap-2">
							{arenaOpen && (
								<span className="inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-[10px] font-extrabold tracking-[0.22em] uppercase text-rose-200 arena-chrome">
									<span className="arena-live-dot" /> LIVE
								</span>
							)}
							<button
								type="button"
								onClick={() => arenaSound.setMuted((m) => !m)}
								className="arena-sound-toggle"
								aria-label={arenaSound.muted ? "Aktifkan suara" : "Matikan suara"}
							>
								{arenaSound.muted ? <LuVolumeX className="h-3.5 w-3.5" /> : <LuVolume2 className="h-3.5 w-3.5" />}
								<span className="hidden sm:inline">{arenaSound.muted ? "Sound Off" : "Sound On"}</span>
							</button>
						</div>
					</div>

					{/* Arena Hero */}
					<section className="arena-hero arena-hud arena-cut relative mb-6 overflow-hidden rounded-[1.5rem] p-4 sm:p-6 lg:p-7">
						<span className="arena-bracket tl" />
						<span className="arena-bracket tr" />
						<span className="arena-bracket bl" />
						<span className="arena-bracket br" />
						{selectedEventImage && (
							<>
								<img
									src={selectedEventImage}
									alt=""
									aria-hidden
									className="absolute inset-0 h-full w-full object-cover opacity-25"
								/>
								<div className="absolute inset-0 bg-gradient-to-r from-[#040616]/90 via-[#070a22]/70 to-transparent" />
							</>
						)}
						<div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
							<div className="flex flex-col justify-between">
								<div>
									<div className="arena-hero-badges mb-4 flex flex-wrap items-center gap-2">
										<span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.22em] text-cyan-100 arena-chrome">
											<LuZap className="h-3.5 w-3.5" /> Grand Arena · {selectedEventBadge.label}
										</span>
										<span className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-300/30 bg-fuchsia-500/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.22em] text-fuchsia-100 arena-chrome">
											<LuTicket className="h-3.5 w-3.5" /> {getVotingPriceLabel(selectedEvent)}
										</span>
									</div>
									<h1 className="arena-hero-title arena-numeric max-w-3xl text-3xl font-black leading-[1.05] text-white sm:text-4xl lg:text-[2.75rem]" style={{ textShadow: "0 0 28px rgba(0,229,255,0.18)" }}>
										{selectedEvent.title}
									</h1>
									{selectedEvent.description && (
										<p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300/90 line-clamp-2">
											{selectedEvent.description}
										</p>
									)}
									<div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-300">
										<span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1">
											<LuCalendar className="h-3.5 w-3.5 text-cyan-300" /> {formatDate(selectedEvent.startDate)}
										</span>
										<span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1">
											<LuMapPin className="h-3.5 w-3.5 text-fuchsia-300" /> {getEventLocationLabel(selectedEvent)}
										</span>
									</div>
								</div>

								{/* Countdown */}
								<ArenaCountdownStrip target={countdownTarget} label={arenaOpen ? "Berakhir Dalam" : (votingStatus.color === "amber" ? "Mulai Dalam" : "Telah Selesai")} />
							</div>

							{/* KPI grid */}
							<div className="arena-hero-kpis grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-2 xl:grid-cols-3">
								<div className="arena-kpi">
									<div className="arena-kpi-label">Kategori</div>
									<div className="arena-kpi-value">{selectedEvent.votingConfig?.categories.length || 0}</div>
								</div>
								<div className="arena-kpi">
									<div className="arena-kpi-label">Nominee</div>
									<div className="arena-kpi-value">{selectedEventNomineeCount}</div>
								</div>
								<div className="arena-kpi">
									<div className="arena-kpi-label">Total Vote</div>
									<div className="arena-kpi-value" style={{ color: "#6cffc6", textShadow: "0 0 18px rgba(34,245,167,0.35)" }}>
										<ArenaCounter value={selectedEventVoteCount} />
									</div>
								</div>
							</div>
						</div>
					</section>

					{/* Status banner (only when closed/not-open) */}
					{!arenaOpen && (
						<div className={`arena-status-banner mb-5 ${votingStatus.color === "red" ? "is-closed" : ""}`}>
							<LuClock className="h-4 w-4" />
							<span>
								{votingStatus.color === "amber"
									? `Arena belum dibuka${selectedEvent.votingConfig?.startDate ? ` · ${new Date(selectedEvent.votingConfig.startDate).toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}` : ""}`
									: "Pertandingan telah usai · pemenang telah ditentukan"}
							</span>
						</div>
					)}

					{/* Category selector */}
					{selectedEvent.votingConfig?.categories && selectedEvent.votingConfig.categories.length > 1 && (
						<div className="mb-5 flex gap-2 overflow-x-auto pb-1">
							{selectedEvent.votingConfig.categories.map((cat) => (
								<button
									key={cat.id}
									onClick={() => setSelectedCategoryId(cat.id)}
									className={`arena-cat-pill ${selectedCategoryId === cat.id ? "is-active" : ""}`}
								>
									{cat.title}
								</button>
							))}
						</div>
					)}

					{/* Category header */}
					{currentCategory && (
						<div className="arena-category-panel arena-hud mb-6 flex flex-col gap-4 rounded-2xl p-4 sm:p-5 sm:flex-row sm:items-end sm:justify-between">
							<div>
								<p className="arena-chrome text-[10px] font-extrabold uppercase tracking-[0.28em] text-cyan-300">Kategori Pertandingan</p>
								<h2 className="arena-numeric mt-1 text-2xl font-black text-white">{currentCategory.title}</h2>
								{currentCategory.description && (
									<p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">{currentCategory.description}</p>
								)}
							</div>
							<div className="grid grid-cols-2 gap-2 sm:min-w-[240px]">
								<div className="arena-kpi" style={{ padding: "0.7rem 0.85rem" }}>
									<div className="arena-kpi-label">Kontestan</div>
									<div className="arena-kpi-value" style={{ fontSize: "1.3rem" }}>{sortedNominees.length}</div>
								</div>
								<div className="arena-kpi" style={{ padding: "0.7rem 0.85rem" }}>
									<div className="arena-kpi-label">Vote</div>
									<div className="arena-kpi-value" style={{ fontSize: "1.3rem", color: "#6cffc6" }}>
										<ArenaCounter value={categoryVoteCount} />
									</div>
								</div>
							</div>
						</div>
					)}

					{/* Arena Podium (Top 3) + Leaderboard. The legacy right-rail Live Feed
					    has been promoted to a top-centered cinematic popup overlay
					    (LiveAlertSystem) + floating mini-rail rendered globally below. */}
					{sortedNominees.length > 0 ? (
						<div className="space-y-8">
							{/* Main column */}
							<div className="space-y-8">
								<div className="arena-podium">
									{podiumOrder.map((nominee, podiumIdx) => {
										const rank = sortedNominees.findIndex((item) => item.id === nominee.id) + 1;
										const isVoted = !selectedEvent.votingConfig?.isPaid && votedNominees.has(nominee.id);
										const maxVotes = sortedNominees[0]?.voteCount || 1;
										const pct = maxVotes > 0 ? (nominee.voteCount / maxVotes) * 100 : 0;
										const isFirst = rank === 1;
										const orderClass =
											rank === 1 ? "order-2 -mt-3 sm:-mt-5 md:-mt-10" : rank === 2 ? "order-1" : "order-3";
										const rankClass = rank === 1 ? "is-first" : rank === 2 ? "is-second" : "is-third";
										const badgeClass = rank === 1 ? "r1" : rank === 2 ? "r2" : "r3";
										const plinthH = isFirst ? "h-14 sm:h-20 md:h-24" : rank === 2 ? "h-11 sm:h-16 md:h-20" : "h-9 sm:h-12 md:h-16";
										const gapToLeader = rank > 1 && sortedNominees[0] ? (sortedNominees[0].voteCount - nominee.voteCount) : 0;

										return (
											<div
												key={nominee.id}
												ref={(el) => { nomineeCardRefs.current.set(nominee.id, el); }}
												className={`arena-podium-card ${rankClass} ${orderClass} ${nominee.nomineePhoto ? "cursor-zoom-in" : ""} ${isVoted ? "ring-2 ring-emerald-400/70" : ""} ${bouncingNominee === nominee.id ? "arena-bear-bounce" : ""}`}
												style={{ animationDelay: `${podiumIdx * 110}ms` }}
												onClick={() => openNomineePhotoPreview(nominee)}
												onKeyDown={(event) => {
													if ((event.key === "Enter" || event.key === " ") && nominee.nomineePhoto) {
														event.preventDefault();
														openNomineePhotoPreview(nominee);
													}
												}}
												tabIndex={nominee.nomineePhoto ? 0 : undefined}
												aria-label={nominee.nomineePhoto ? `Preview foto ${nominee.nomineeName}` : undefined}
											>
												{receivingAura.get(nominee.id) && (
													<span className={`arena-recv-aura ${GIFTS.find((g) => g.type === receivingAura.get(nominee.id))?.tone ?? ""}`} />
												)}
												{flamePulseNominee === nominee.id && <span className="arena-flame-pulse" />}
												{trendingNomineeId === nominee.id && (
													<span className="absolute right-2 top-2 z-[3]"><span className="arena-trending">🔥 Trending</span></span>
												)}
												{isFirst && (
													<svg className="arena-crown" width="48" height="36" viewBox="0 0 48 36" fill="none" aria-hidden>
														<defs>
															<linearGradient id="arenaCrownGrad" x1="0" x2="0" y1="0" y2="1">
																<stop offset="0%" stopColor="#ffe26b" />
																<stop offset="60%" stopColor="#ffba2b" />
																<stop offset="100%" stopColor="#ff7a00" />
															</linearGradient>
														</defs>
														<path d="M4 30 L8 12 L18 22 L24 6 L30 22 L40 12 L44 30 Z" fill="url(#arenaCrownGrad)" stroke="rgba(0,0,0,0.25)" strokeWidth="0.6" />
														<circle cx="24" cy="6" r="2.5" fill="#fff8c2" />
														<circle cx="8" cy="12" r="2" fill="#fff8c2" />
														<circle cx="40" cy="12" r="2" fill="#fff8c2" />
														<rect x="3" y="30" width="42" height="3" rx="1.2" fill="#ff7a00" />
													</svg>
												)}

												<div className="relative p-2 sm:p-3 md:p-4">
													<div className="mb-2 flex items-center justify-between gap-1.5 sm:mb-3">
														<div className={`arena-podium-rankbadge ${badgeClass}`}>
															{isFirst ? <LuCrown className="h-3.5 w-3.5" /> : <LuMedal className="h-3.5 w-3.5" />}
															<span className="hidden min-[420px]:inline">JUARA</span> {rank}
														</div>
														<span className="arena-numeric text-[10px] font-extrabold text-cyan-200 sm:text-xs whitespace-nowrap">
															<ArenaCounter value={nominee.voteCount} /> <span className="text-slate-400">VOTE</span>
														</span>
													</div>

													<div className={`arena-podium-photo mx-auto ${isFirst ? "h-36 sm:h-48 md:h-64" : "h-32 sm:h-44 md:h-56"}`}>
														{nominee.nomineePhoto ? (
															<img
																src={nominee.nomineePhoto.startsWith("http") ? nominee.nomineePhoto : getImageUrl(nominee.nomineePhoto)}
																alt={nominee.nomineeName}
																loading="lazy"
																decoding="async"
															/>
														) : (
															<div className="flex h-full w-full items-center justify-center">
																<LuUser className="h-16 w-16 text-slate-500" />
															</div>
														)}
														<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-10 sm:px-3 sm:pb-3 md:px-4 md:pb-4 md:pt-12">
															<h3 className="arena-numeric truncate text-[11px] font-black leading-tight text-white sm:text-sm md:text-lg">{nominee.nomineeName}</h3>
															{nominee.nomineeSubtitle && (
																<p className="mt-0.5 truncate text-[10px] text-white/70 sm:text-xs">{nominee.nomineeSubtitle}</p>
															)}
														</div>
													</div>

													<div className="mt-3 md:mt-4">
														<div className="arena-bar">
															<div className={`arena-bar-fill ${badgeClass}`} style={{ width: `${pct}%` }} />
														</div>
														{!isFirst && gapToLeader > 0 && (
															<p className="arena-chrome mt-1.5 text-[10px] font-bold text-slate-400">
																−<span className="arena-numeric text-rose-300">{gapToLeader.toLocaleString("id-ID")}</span> dari juara 1
															</p>
														)}
													</div>

													<div className={`arena-podium-plinth ${badgeClass} ${plinthH}`}>
														<span className="text-xl sm:text-2xl md:text-3xl">#{rank}</span>
													</div>

													<button
														onClick={(event) => {
															event.stopPropagation();
															if (selectedEvent.votingConfig?.isPaid) {
																handlePaidVote(currentCategory!.id, nominee.id);
															} else {
																handleFreeVote(currentCategory!.id, nominee.id, event.currentTarget);
															}
														}}
														disabled={voting || isVoted || !arenaOpen}
														className={`arena-vote-btn mt-3 w-full md:mt-4 ${isVoted ? "is-voted" : ""} ${selectedEvent.votingConfig?.isPaid ? "is-paid" : ""}`}
													>
														{isVoted ? (
															<>
																<LuCircleCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
																Sudah Vote
															</>
														) : !arenaOpen ? (
															votingStatus.color === "amber" ? "Belum Dibuka" : "Telah Usai"
														) : (
															<>
																{selectedEvent.votingConfig?.isPaid ? <LuTicket className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <LuThumbsUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
																{selectedEvent.votingConfig?.isPaid ? "Beli Vote" : "Vote"}
															</>
														)}
													</button>
												</div>
											</div>
										);
									})}
								</div>

								{sortedNominees.length > 0 && (
									<div>
										<div className="arena-leaderboard-toolbar">
											<div className="arena-leaderboard-title">
												<h3 className="arena-chrome text-xs font-extrabold uppercase tracking-[0.28em] text-slate-400">
													{isNomineeSearchActive ? (
														<>Hasil Search <span className="text-cyan-300">Nominee</span></>
													) : (
														<>Leaderboard <span className="text-cyan-300">#{4} +</span></>
													)}
												</h3>
												<span className="arena-chrome text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
													{isNomineeSearchActive ? `${leaderboardNominees.length} hasil` : `${remainingNominees.length} kontestan`}
												</span>
											</div>
											<label className="arena-leaderboard-search">
												<span className="arena-leaderboard-search-icon">
													<LuSearch className="h-4 w-4" />
												</span>
												<input
													type="search"
													value={nomineeSearch}
													onChange={(event) => setNomineeSearch(event.target.value)}
													placeholder="Cari nominee..."
													aria-label="Cari nominee di leaderboard"
												/>
												{nomineeSearch && (
													<button
														type="button"
														onClick={() => setNomineeSearch("")}
														aria-label="Hapus pencarian nominee"
													>
														<LuX className="h-4 w-4" />
													</button>
												)}
											</label>
										</div>
										<Reorder.Group
											axis="y"
											values={leaderboardNominees}
											onReorder={() => { /* sort is data-driven; ignore drag */ }}
											className="space-y-2.5"
										>
											{leaderboardNominees.map((nominee, idx) => {
												const absoluteRank = sortedNominees.findIndex((item) => item.id === nominee.id);
												const rank = absoluteRank >= 0 ? absoluteRank + 1 : idx + 4;
												const isVoted = !selectedEvent.votingConfig?.isPaid && votedNominees.has(nominee.id);
												const maxVotes = sortedNominees[0]?.voteCount || 1;
												const pct = maxVotes > 0 ? (nominee.voteCount / maxVotes) * 100 : 0;
												const delta = rankDeltas.get(nominee.id) ?? 0;
												const flashing = flashNomineeIds.has(nominee.id);
												return (
													<Reorder.Item
														key={nominee.id}
														value={nominee}
														drag={false}
														layout
														transition={{ type: "spring", stiffness: 280, damping: 26 }}
														ref={(el: HTMLLIElement | null) => { nomineeCardRefs.current.set(nominee.id, el); }}
														className={`arena-row relative ${flashing ? "is-flash" : ""} ${nominee.nomineePhoto ? "cursor-zoom-in" : ""} ${bouncingNominee === nominee.id ? "arena-bear-bounce" : ""}`}
														onClick={() => openNomineePhotoPreview(nominee)}
													>
														{receivingAura.get(nominee.id) && (
															<span className={`arena-recv-aura ${GIFTS.find((g) => g.type === receivingAura.get(nominee.id))?.tone ?? ""}`} />
														)}
														{flamePulseNominee === nominee.id && <span className="arena-flame-pulse" />}
														<div className="arena-row-rank">#{rank}</div>
														<div className="arena-row-avatar">
															{nominee.nomineePhoto ? (
																<img
																	src={nominee.nomineePhoto.startsWith("http") ? nominee.nomineePhoto : getImageUrl(nominee.nomineePhoto)}
																	alt={nominee.nomineeName}
																	loading="lazy"
																	decoding="async"
																/>
															) : (
																<div className="flex h-full w-full items-center justify-center">
																	<LuUser className="h-6 w-6 text-slate-500" />
																</div>
															)}
														</div>
														<div className="arena-row-meta min-w-0">
															<div className="flex items-center gap-2">
																<h4 className="arena-row-name truncate">{nominee.nomineeName}</h4>
																<AnimatePresence>
																	{delta !== 0 && (
																		<motion.span
																			key={`${nominee.id}-${delta}`}
																			initial={{ opacity: 0, y: -4, scale: 0.7 }}
																			animate={{ opacity: 1, y: 0, scale: 1 }}
																			exit={{ opacity: 0, scale: 0.6 }}
																			className={`arena-delta ${delta > 0 ? "up" : "down"}`}
																		>
																			{delta > 0 ? "▲" : "▼"} {Math.abs(delta)}
																		</motion.span>
																	)}
																</AnimatePresence>
															</div>
															{nominee.nomineeSubtitle && (
																<p className="arena-row-sub truncate">{nominee.nomineeSubtitle}</p>
															)}
															<div className="mt-2 flex items-center gap-2">
																<div className="arena-bar flex-1">
																	<div className="arena-bar-fill" style={{ width: `${pct}%` }} />
																</div>
																<span className="arena-numeric min-w-[3rem] text-right text-xs font-bold text-cyan-200">
																	<ArenaCounter value={nominee.voteCount} />
																</span>
															</div>
														</div>
														<button
															onClick={(event) => {
																event.stopPropagation();
																if (selectedEvent.votingConfig?.isPaid) {
																	handlePaidVote(currentCategory!.id, nominee.id);
																} else {
																	handleFreeVote(currentCategory!.id, nominee.id, event.currentTarget);
																}
															}}
															disabled={voting || isVoted || !arenaOpen}
															className={`arena-vote-btn ${isVoted ? "is-voted" : ""} ${selectedEvent.votingConfig?.isPaid ? "is-paid" : ""}`}
														>
															{isVoted ? (
																<><LuCircleCheck className="h-4 w-4" /> Voted</>
															) : !arenaOpen ? (
																votingStatus.color === "amber" ? "Tunggu" : "Tutup"
															) : (
																<>
																	{selectedEvent.votingConfig?.isPaid ? <LuTicket className="h-4 w-4" /> : <LuThumbsUp className="h-4 w-4" />}
																	{selectedEvent.votingConfig?.isPaid ? "Beli" : "Vote"}
																</>
															)}
														</button>
													</Reorder.Item>
												);
											})}
										</Reorder.Group>
										{isNomineeSearchActive && leaderboardNominees.length === 0 && (
											<div className="arena-leaderboard-empty">
												<LuSearch className="h-5 w-5" />
												<span>Tidak ada nominee cocok.</span>
											</div>
										)}
									</div>
								)}
							</div>

						</div>
					) : (
						<div className="arena-hud rounded-2xl py-12 text-center text-slate-400">
							<LuThumbsUp className="mx-auto mb-3 h-12 w-12 opacity-50" />
							<p>Belum ada kontestan untuk kategori ini</p>
						</div>
					)}

					{/* Gift Voting — flying emoji projectiles from gift button to nominee. */}
					<AnimatePresence>
						{flyingGifts.map((fly) => (
							<motion.div
								key={fly.id}
								className="arena-gift-fly"
								initial={{ left: fly.from.x - 18, top: fly.from.y - 18, opacity: 0, scale: 0.4, rotate: -12 }}
								animate={{
									left: fly.to.x - 18,
									top: fly.to.y - 18,
									opacity: [0, 1, 1, 0],
									scale: [0.4, 1.4, 1, 0.6],
									rotate: [-12, 18, -8, 0],
								}}
								exit={{ opacity: 0 }}
								transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1], times: [0, 0.2, 0.8, 1] }}
							>
								{fly.emoji}
							</motion.div>
						))}
					</AnimatePresence>

					{/* Lion full-screen celebration */}
					<AnimatePresence>
						{lionShow && (
							<>
								<div className="arena-lion-veil" key={`lion-veil-${lionShow.ts}`} />
								<div className="arena-lion-emoji" key={`lion-emoji-${lionShow.ts}`}>{lionShow.emoji}</div>
							</>
						)}
					</AnimatePresence>

					{/* Rocket diagonal streak */}
					<AnimatePresence>
						{rocketShow !== null && (
							<div className="arena-rocket-streak" key={`rocket-${rocketShow}`}>🚀</div>
						)}
					</AnimatePresence>

					{/* Rank-up celebration burst — pops when a nominee the user backed
					    rises in the leaderboard. Auto-dismisses after ~2.8s. */}
					<AnimatePresence>
						{rankUpAlert && (
							<motion.div
								key={`rankup-${rankUpAlert.name}-${rankUpAlert.rank}`}
								className="arena-rankup"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								onClick={() => setRankUpAlert(null)}
							>
								<motion.div
									className="arena-rankup-card"
									initial={{ scale: 0.6, y: 30 }}
									animate={{ scale: 1, y: 0 }}
									exit={{ scale: 0.85, opacity: 0 }}
									transition={{ type: "spring", stiffness: 260, damping: 22 }}
								>
									<div className="arena-chrome text-[11px] font-extrabold uppercase tracking-[0.32em] text-amber-200">
										Rank Up
									</div>
									<div className="arena-rankup-rank">#{rankUpAlert.rank}</div>
									<p className="arena-numeric mt-1 text-lg font-extrabold text-white">
										{rankUpAlert.name}
									</p>
									<p className="mt-2 text-xs text-slate-300">
										Jagoan kamu naik peringkat! 🏆
									</p>
								</motion.div>
							</motion.div>
						)}
					</AnimatePresence>

					{/* Confetti layer (rendered above content) */}
					<div className="pointer-events-none fixed inset-0 z-[70]">
						<AnimatePresence>
							{confettiBursts.flatMap((burst) => (
								Array.from({ length: 22 }).map((_, i) => {
									const angle = (Math.PI * 2 * i) / 22 + (Math.random() - 0.5) * 0.4;
									const dist = 90 + Math.random() * 90;
									const cx = Math.cos(angle) * dist;
									const cy = Math.sin(angle) * dist - 40;
									const emoji = ["🎉", "✨", "⭐", "🏆", "🔥", "💎"][i % 6];
									return (
										<span
											key={`${burst.id}-${i}`}
											className="arena-confetti"
											style={{
												left: burst.left,
												top: burst.top,
												// CSS custom props for the @keyframes destination.
												// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
												...({ "--cx": `${cx}px`, "--cy": `${cy}px`, "--cr": `${Math.random() * 360}deg` } as React.CSSProperties),
											}}
										>
											{emoji}
										</span>
									);
								})
							))}
						</AnimatePresence>
					</div>

					{/* Arena Purchase Modal — boss-fight loadout panel */}
					{showPurchaseModal && (() => {
						// Predict rank-after-purchase: clone current sorted list, bump target's
						// voteCount by `voteCount`, re-rank, compare to current rank.
						const target = selectedPaidNominee;
						const currentRank = target ? sortedNominees.findIndex((n) => n.id === target.id) + 1 : 0;
						let predictedRank = currentRank;
						if (target && currentRank > 0) {
							const hypothesis = sortedNominees.map((n) =>
								n.id === target.id ? { ...n, voteCount: n.voteCount + voteCount } : n
							);
							hypothesis.sort((a, b) => b.voteCount - a.voteCount);
							predictedRank = hypothesis.findIndex((n) => n.id === target.id) + 1;
						}
						const movedUp = currentRank > 0 && predictedRank < currentRank;

						return (
							<div
								className="arena-modal-backdrop"
								onClick={() => { setShowPurchaseModal(false); setPaidVoteTarget(null); }}
							>
								<div className="arena-modal" onClick={(e) => e.stopPropagation()}>
									<div className="arena-modal-handle"><span /></div>

									<div className="arena-modal-header">
										<button
											type="button"
											onClick={() => { setShowPurchaseModal(false); setPaidVoteTarget(null); }}
											className="arena-modal-close"
											aria-label="Tutup"
										>
											<LuX className="h-5 w-5" />
										</button>
										<div className="flex items-start gap-3 pr-10">
											<div className="arena-modal-icon">
												<LuZap className="h-5 w-5" />
											</div>
											<div className="min-w-0">
												<p className="arena-chrome text-[10px] font-extrabold uppercase tracking-[0.24em] text-cyan-200">Power-Up Loadout</p>
												<h2 className="arena-numeric text-lg font-black leading-tight text-white sm:text-xl">
													Boost Vote Arena
												</h2>
												<p className="line-clamp-1 text-xs text-slate-400 sm:text-sm">{selectedEvent.title}</p>
											</div>
										</div>
									</div>

									<div className="arena-modal-body">
										{selectedPaidNominee && (
											<div className="arena-target-card">
												<div className="target-avatar">
													{selectedPaidNominee.nomineePhoto ? (
														<img
															src={selectedPaidNominee.nomineePhoto.startsWith("http") ? selectedPaidNominee.nomineePhoto : getImageUrl(selectedPaidNominee.nomineePhoto)}
															alt={selectedPaidNominee.nomineeName}
														/>
													) : (
														<div className="flex h-full w-full items-center justify-center"><LuUser className="h-6 w-6 text-slate-500" /></div>
													)}
												</div>
												<div className="target-meta">
													<div className="target-label">🎯 Target Boost</div>
													<div className="target-name">{selectedPaidNominee.nomineeName}</div>
													{selectedPaidNominee.nomineeSubtitle && (
														<p className="mt-0.5 truncate text-[11px] text-slate-400">{selectedPaidNominee.nomineeSubtitle}</p>
													)}
												</div>
												{currentRank > 0 && (
													<div className="target-rank">#{currentRank}</div>
												)}
											</div>
										)}

										{movedUp && (
											<div className="arena-rank-pred">
												<LuTrophy className="h-4 w-4 text-amber-300" />
												<span>
													Boost ini bisa dorong <strong className="text-white">{selectedPaidNominee?.nomineeName}</strong> ke{" "}
													<span className="arena-numeric font-extrabold text-emerald-300">rank #{predictedRank}</span>!
												</span>
											</div>
										)}
										{!movedUp && currentRank > 0 && (
											<div className="arena-rank-pred is-flat">
												<LuZap className="h-4 w-4" />
												<span>Posisi tetap <span className="arena-numeric font-bold text-white">#{currentRank}</span> — tambah vote lagi untuk salip lawan.</span>
											</div>
										)}

										<div>
											<div className="arena-section-head">Pilih Gift Power-Up</div>
											<div className="arena-gift-grid">
												{GIFTS.map((g) => {
													const isMax = Number.isFinite(maxVoteCount) && g.votes > maxVoteCount;
													const active = selectedGiftType === g.type;
													return (
														<button
															key={g.type}
															type="button"
															onClick={() => {
																// selectedGiftType is derived from voteCount,
																// so setting voteCount alone is enough.
																setVoteCount(isMax ? Math.floor(maxVoteCount) : g.votes);
															}}
															disabled={isMax}
															className={`arena-gift-card ${g.tone} ${active ? "is-active" : ""}`}
															title={`${g.label} = ${g.votes} vote`}
														>
															<span className="emoji">{g.emoji}</span>
															<span className="label">{g.label}</span>
															<span className="votes">+{g.votes}</span>
														</button>
													);
												})}
											</div>
											<p className="mt-2 text-[11px] text-slate-400">
												Tap gift untuk auto-isi jumlah, atau atur custom di bawah ↓
											</p>
										</div>

										<div>
											<div className="arena-section-head">Atur Jumlah Vote</div>
											<div className="flex items-stretch gap-2">
												<button
													type="button"
													onClick={() => setVoteCount((v) => Math.max(1, v - 1))}
													className="arena-secondary-btn"
													aria-label="Kurangi"
												>−</button>
												<input
													type="number"
													min={1}
													step={1}
													max={Number.isFinite(maxVoteCount) ? maxVoteCount : undefined}
													value={voteCount}
													onChange={(e) => setVoteCount(normalizeVoteCount(e.target.value))}
													className="arena-input flex-1 text-center text-lg arena-numeric"
													style={{ fontFamily: "Orbitron, system-ui, sans-serif" }}
												/>
												<button
													type="button"
													onClick={() => setVoteCount((v) => {
														const next = v + 1;
														return Number.isFinite(maxVoteCount) ? Math.min(maxVoteCount, next) : next;
													})}
													className="arena-secondary-btn"
													aria-label="Tambah"
												>+</button>
											</div>
											{Number.isFinite(maxVoteCount) && (
												<p className="mt-1.5 text-[11px] text-slate-500">
													Maksimal <span className="arena-numeric text-cyan-300">{maxVoteCount.toLocaleString("id-ID")}</span> vote per pembelian (batas QRIS Rp {QRIS_MAX_TRANSACTION.toLocaleString("id-ID")}).
												</p>
											)}
										</div>

										<div>
											<div className="arena-section-head">Nama Pengirim</div>
											<label className="arena-input-label"><LuUser className="h-3.5 w-3.5" /> Nama *</label>
											<input
												type="text"
												value={buyerName}
												onChange={(e) => setBuyerName(e.target.value)}
												className="arena-input"
												placeholder="Nama lengkap (tampil di live feed)"
											/>
											<div className="live-alert-cta mt-2">
												<LuSparkles className="live-alert-cta-icon h-4 w-4" />
												<span>{LIVE_VOTE_CTA}</span>
											</div>
										</div>

										<div>
											<div className="arena-section-head">Pesan Dukungan (opsional)</div>
											<label className="arena-input-label"><LuSparkles className="h-3.5 w-3.5" /> Pesan</label>
											<textarea
												value={buyerMessage}
												onChange={(e) => setBuyerMessage(e.target.value.slice(0, BUYER_MESSAGE_MAX_LEN))}
												maxLength={BUYER_MESSAGE_MAX_LEN}
												rows={2}
												className="arena-input"
												placeholder="Contoh: Semangat terus untuk kandidat nomor 2!"
												style={{ resize: "none", fontFamily: "inherit" }}
											/>
											<p className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
												<span>Pesan dibacakan oleh AI voice saat popup live tampil.</span>
												<span className="arena-numeric text-cyan-200">{buyerMessage.length}/{BUYER_MESSAGE_MAX_LEN}</span>
											</p>
										</div>

										<div className="arena-summary">
											<div className="arena-summary-row">
												<span className="label">Harga / vote</span>
												<span className="value">{formatCurrency(selectedEvent.votingConfig?.pricePerVote || 0)}</span>
											</div>
											<div className="arena-summary-row">
												<span className="label">Subtotal vote</span>
												<span className="value">{formatCurrency(votingOrderSummary.subtotal)}</span>
											</div>
											<div className="arena-summary-row">
												<span className="label">Biaya admin</span>
												<span className="value">{formatCurrency(votingOrderSummary.adminFee)}</span>
											</div>
											<div className="arena-summary-row is-total">
												<span className="label">Total sebelum QRIS</span>
												<span className="value">{formatCurrency(votingOrderSummary.totalBeforeQris)}</span>
											</div>
											<p className="pt-0.5 text-[11px] text-slate-500">
												Biaya layanan QRIS dapat ditambahkan di halaman pembayaran.
											</p>
										</div>
									</div>

									<div className="arena-modal-footer">
										<div className="min-w-0">
											<p className="arena-chrome text-[10px] font-extrabold uppercase tracking-[0.22em] text-slate-500">Total · {voteCount} vote</p>
											<p className="arena-numeric truncate text-xl font-black text-cyan-200 leading-tight" style={{ textShadow: "0 0 14px rgba(0,229,255,0.35)" }}>
												{formatCurrency(votingOrderSummary.totalBeforeQris)}
											</p>
										</div>
										<div className="flex shrink-0 items-center gap-2">
											<button
												type="button"
												onClick={() => { setShowPurchaseModal(false); setPaidVoteTarget(null); }}
												className="arena-secondary-btn"
											>
												Batal
											</button>
											<button
												type="button"
												onClick={handlePurchaseVotes}
												disabled={purchasing}
												className="arena-vote-btn is-paid"
												style={{ padding: "0.7rem 1.3rem" }}
											>
												{purchasing ? (
													<>
														<svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
															<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
															<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
														</svg>
														Memproses
													</>
												) : (
													<>
														<LuZap className="h-4 w-4" />
														Boost Sekarang
													</>
												)}
											</button>
										</div>
									</div>
								</div>
							</div>
						);
					})()}
				</main>

				{/* Live Alert overlay — donation-alert-style popup queue, mini-rail,
				    and floating audio controls. Drives AI voice + emoji SFX every
				    time a paid purchase confirms (polled every 3s). */}
				<LiveAlertSystem
					incoming={liveAlerts}
					paused={!arenaOpen || paymentVerifying}
				/>
			</div>
		);
	}

	// Event list view
	return (
		<div className="evoting-page-shell min-h-screen transition-colors">
			<div className="evoting-flow-lines" />
			<main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 md:py-10">
				<section className="evoting-hero-card relative mb-8 overflow-hidden rounded-[2rem] border border-white/70 bg-white/[0.82] p-4 shadow-2xl shadow-slate-200/70 backdrop-blur-2xl sm:p-6 lg:p-8 dark:border-white/[0.08] dark:bg-white/[0.035] dark:shadow-black/25">
					<div className="evoting-hero-grid" />
					<div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-stretch">
						<div className="flex min-h-[310px] flex-col justify-between">
							<div>
								<div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-200/70 bg-red-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-red-600 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-300">
									<LuSparkles className="h-3.5 w-3.5" />
									Voting Publik
								</div>
								<h1 className="max-w-3xl text-4xl font-black leading-none tracking-normal text-slate-950 sm:text-5xl lg:text-6xl dark:text-white">
									E-Voting
								</h1>
								<p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base dark:text-slate-300">
									Pilih event, lihat kandidat unggulan, dan dukung nominee favorit secara langsung.
								</p>
							</div>

							<div className="mt-7 grid grid-cols-3 gap-2 sm:max-w-xl sm:gap-3">
								<div className="evoting-mini-stat">
									<LuTrophy className="h-4 w-4 text-amber-500" />
									<span>{events.length}</span>
									<p>Event</p>
								</div>
								<div className="evoting-mini-stat">
									<LuUsers className="h-4 w-4 text-teal-500" />
									<span>{events.reduce((total, event) => total + getEventNomineeCount(event), 0)}</span>
									<p>Nominee</p>
								</div>
								<div className="evoting-mini-stat">
									<LuThumbsUp className="h-4 w-4 text-red-500" />
									<span>{formatCompactNumber(events.reduce((total, event) => total + getEventVoteCount(event), 0))}</span>
									<p>Vote</p>
								</div>
							</div>
						</div>

						<div className="space-y-4">
							<div className="rounded-3xl border border-slate-200/70 bg-white/[0.88] p-3 shadow-xl shadow-slate-200/80 backdrop-blur-xl dark:border-white/[0.08] dark:bg-slate-950/[0.45] dark:shadow-black/20">
								<div className="relative mb-3">
									<LuSearch className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
									<input
										type="text"
										value={search}
										onChange={(e) => { setSearch(e.target.value); setPage(1); }}
										placeholder="Cari event atau kota..."
										className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-10 text-sm font-medium text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-red-300 focus:bg-white focus:ring-4 focus:ring-red-500/10 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-white dark:focus:border-red-400/40 dark:focus:bg-white/[0.07]"
									/>
									{search && (
										<button
											onClick={() => { setSearch(""); setPage(1); }}
											className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/[0.08] dark:hover:text-slate-200"
										>
											<LuX className="w-4 h-4" />
										</button>
									)}
								</div>

							</div>
							<VoteGuideCard />
						</div>
					</div>
				</section>

				<div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<p className="text-[11px] font-black uppercase tracking-[0.24em] text-red-500 dark:text-red-300">Daftar Event</p>
						<h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
							{filteredEvents.length > 0 ? `${filteredEvents.length} event tersedia` : "Event tidak ditemukan"}
						</h2>
					</div>
				</div>

				{/* Events Grid */}
				{loading ? (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{Array.from({ length: 8 }).map((_, i) => (
							<div
								key={i}
								className="overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/70 shadow-sm backdrop-blur-xl animate-pulse dark:border-white/[0.06] dark:bg-white/[0.035]"
							>
								<div className="aspect-[16/11] bg-slate-200/70 dark:bg-white/[0.06]" />
								<div className="p-4 space-y-3">
									<div className="h-4 bg-slate-200/80 dark:bg-white/[0.06] rounded w-3/4" />
									<div className="h-3 bg-slate-200/80 dark:bg-white/[0.06] rounded w-1/2" />
									<div className="h-10 bg-slate-200/80 dark:bg-white/[0.06] rounded-xl w-full" />
								</div>
							</div>
						))}
					</div>
				) : filteredEvents.length === 0 ? (
					<div className="text-center py-16">
						<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center">
							<LuThumbsUp className="w-8 h-8 text-gray-400 dark:text-gray-500" />
						</div>
						{error ? (
							<>
								<p className="text-red-500 dark:text-red-400 text-sm font-medium mb-1">Gagal Memuat Data</p>
								<p className="text-gray-500 dark:text-gray-400 text-xs">{error}</p>
								<button onClick={fetchEvents} className="mt-3 text-xs text-blue-500 hover:underline">Coba Lagi</button>
							</>
						) : (
							<p className="text-gray-500 dark:text-gray-400 text-sm">Tidak ada event voting yang ditemukan</p>
						)}
					</div>
				) : (
					<>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
							{filteredEvents.map((event) => {
								const badge = getVotingStatusBadge(event);
								const votePriceLabel = getVotingPriceLabel(event);
								const eventNominees = getEventNomineeCount(event);
								const eventVotes = getEventVoteCount(event);
								return (
									<button
										key={event.id}
										onClick={() => openVotingEvent(event.id)}
										className="evoting-event-card group relative overflow-hidden rounded-[1.5rem] border border-white/75 bg-white text-left shadow-lg shadow-slate-200/75 transition-all duration-300 hover:-translate-y-1 hover:border-red-200 hover:shadow-2xl hover:shadow-slate-300/70 dark:border-white/[0.08] dark:bg-white/[0.035] dark:shadow-black/20 dark:hover:border-red-400/25"
									>
										<div className="relative aspect-[16/11] w-full overflow-hidden bg-[linear-gradient(135deg,#fef2f2_0%,#ecfeff_100%)] dark:bg-[linear-gradient(135deg,rgba(127,29,29,0.22),rgba(15,118,110,0.18))]">
											{event.thumbnail ? (
												<img
													src={getImageUrl(event.thumbnail)}
													alt={event.title}
													className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
													loading="lazy"
												/>
											) : (
												<div className="w-full h-full flex items-center justify-center">
													<LuTrophy className="w-10 h-10 text-slate-400/[0.45] dark:text-slate-500" />
												</div>
											)}
											<div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/[0.78] to-transparent" />
											<div className="absolute left-3 top-3">
												<span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black shadow-lg backdrop-blur-xl ${badge.className}`}>
													{badge.label}
												</span>
											</div>
											<div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 text-white">
												<span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-white/[0.16] px-2.5 py-1 text-[11px] font-bold backdrop-blur-xl">
													<LuMapPin className="h-3.5 w-3.5 flex-shrink-0" />
													<span className="truncate">{getEventLocationLabel(event)}</span>
												</span>
												<span className="rounded-full bg-white/[0.16] px-2.5 py-1 text-[11px] font-bold backdrop-blur-xl">
													{formatShortDate(event.startDate)}
												</span>
											</div>
										</div>

										<div className="flex min-h-[190px] flex-col p-4">
											<h4 className="text-lg font-black leading-tight text-slate-950 line-clamp-2 dark:text-white">
												{event.title}
											</h4>
											<div className="mt-3 grid grid-cols-2 gap-2">
												<div className="rounded-2xl bg-slate-100 px-3 py-2 dark:bg-white/[0.06]">
													<p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Nominee</p>
													<p className="mt-0.5 text-sm font-black text-slate-800 dark:text-slate-100">{eventNominees}</p>
												</div>
												<div className="rounded-2xl bg-red-50 px-3 py-2 dark:bg-red-500/10">
													<p className="text-[10px] font-bold uppercase tracking-[0.16em] text-red-400">Vote</p>
													<p className="mt-0.5 text-sm font-black text-red-600 dark:text-red-300">{formatCompactNumber(eventVotes)}</p>
												</div>
											</div>
											<div className="mt-auto flex items-center justify-between gap-3 pt-4">
												<p className="text-sm font-black text-red-600 dark:text-red-300">
													{votePriceLabel}
												</p>
												<span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-white transition-transform group-hover:translate-x-1 dark:bg-white dark:text-slate-950">
													<LuArrowRight className="h-4 w-4" />
												</span>
											</div>
										</div>
									</button>
								);
							})}
						</div>

						{/* Pagination */}
						{totalPages > 1 && (
							<div className="flex items-center justify-center gap-3 mt-8">
								<button
									onClick={() => setPage((p) => Math.max(1, p - 1))}
									disabled={page === 1}
									className="w-8 h-8 rounded-full bg-gray-200/50 dark:bg-white/[0.06] border border-gray-300/50 dark:border-white/10 text-gray-500 dark:text-gray-400 flex items-center justify-center hover:bg-gray-300/50 dark:hover:bg-white/[0.12] transition-colors disabled:opacity-30 disabled:pointer-events-none"
								>
									<LuChevronLeft className="w-4 h-4" />
								</button>

								<div className="flex gap-1.5">
									{Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
										if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) {
											return (
												<button
													key={p}
													onClick={() => setPage(p)}
													className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
														p === page
															? "bg-red-500 text-white"
															: "bg-gray-200/50 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300 hover:bg-gray-300/50 dark:hover:bg-white/[0.12]"
													}`}
												>
													{p}
												</button>
											);
										} else if (p === page - 2 || p === page + 2) {
											return (
												<span key={p} className="w-8 h-8 flex items-center justify-center text-gray-400 dark:text-gray-500 text-xs">
													...
												</span>
											);
										}
										return null;
									})}
								</div>

								<button
									onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
									disabled={page === totalPages}
									className="w-8 h-8 rounded-full bg-gray-200/50 dark:bg-white/[0.06] border border-gray-300/50 dark:border-white/10 text-gray-500 dark:text-gray-400 flex items-center justify-center hover:bg-gray-300/50 dark:hover:bg-white/[0.12] transition-colors disabled:opacity-30 disabled:pointer-events-none"
								>
									<LuChevronRight className="w-4 h-4" />
								</button>
							</div>
						)}
					</>
				)}
			</main>
		</div>
	);
};

export default EVotingPage;
