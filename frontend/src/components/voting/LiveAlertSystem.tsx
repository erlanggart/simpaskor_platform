import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
	LuVolume2,
	LuVolumeX,
	LuSettings2,
	LuSparkles,
	LuFlame,
	LuRocket,
	LuZap,
	LuCrown,
	LuShield,
} from "react-icons/lu";
import { useAIVoice, EmojiBoostKey } from "../../hooks/useAIVoice";

// ---------------------------------------------------------------------------
// LiveAlertSystem — donation-alert-style popup overlay for the E-Voting page.
//
// Visible footprint:
//   • One **large centered popup** at a time (priority queue picks the next).
//   • Below it, a vertical **mini-feed** of the last 6 alerts (last-30s window).
//   • Floating **control panel** (volume / mute / fx toggle / voice gender).
//
// Drive it by passing fresh `incoming` alerts via the parent. The component
// dedupes by id, merges spam from the same buyer within 1500ms, and prioritizes
// higher voteCount alerts (a 1000-vote Lion overrides a 10-vote Soldier even
// if the Soldier arrived first).
// ---------------------------------------------------------------------------

export type GiftBoostType = EmojiBoostKey | null;

export interface LiveAlert {
	id: string;
	buyerName: string;
	buyerMessage: string | null;
	voteCount: number;
	nomineeName: string;
	giftType: GiftBoostType;
	ts: number;
}

interface Props {
	incoming: LiveAlert[];
	/** Suppress popups entirely (e.g. when an event hasn't started). */
	paused?: boolean;
}

interface ResolvedGiftMeta {
	key: EmojiBoostKey;
	emoji: string;
	label: string;
	tone: string;
	gradient: string;
	accent: string;
	icon: React.ReactNode;
}

const GIFT_META: Record<EmojiBoostKey, ResolvedGiftMeta> = {
	lion:      { key: "lion",      emoji: "🦁", label: "Singa",   tone: "gold",   gradient: "from-amber-400 via-orange-500 to-rose-500",       accent: "#ffba2b", icon: <LuCrown /> },
	rocket:    { key: "rocket",    emoji: "🚀", label: "Roket",   tone: "cyan",   gradient: "from-cyan-400 via-sky-500 to-indigo-600",         accent: "#22d3ee", icon: <LuRocket /> },
	flame:     { key: "flame",     emoji: "🔥", label: "Api",     tone: "ember",  gradient: "from-orange-400 via-red-500 to-rose-600",         accent: "#fb923c", icon: <LuFlame /> },
	lightning: { key: "lightning", emoji: "⚡", label: "Petir",   tone: "violet", gradient: "from-yellow-300 via-fuchsia-500 to-indigo-600",   accent: "#a78bfa", icon: <LuZap /> },
	crown:     { key: "crown",     emoji: "👑", label: "Crown",   tone: "royal",  gradient: "from-amber-300 via-yellow-400 to-amber-600",      accent: "#facc15", icon: <LuCrown /> },
	bear:      { key: "bear",      emoji: "🐻", label: "Beruang", tone: "brown",  gradient: "from-amber-700 via-orange-600 to-amber-500",      accent: "#f59e0b", icon: <LuShield /> },
	soldier:   { key: "soldier",   emoji: "🪖", label: "Tentara", tone: "olive",  gradient: "from-emerald-500 via-teal-600 to-slate-700",      accent: "#34d399", icon: <LuShield /> },
};

const ANIMATION_PREF_KEY = "voting-arena-fx";

const resolveGift = (giftType: GiftBoostType, voteCount: number): ResolvedGiftMeta => {
	if (giftType && GIFT_META[giftType]) return GIFT_META[giftType];
	// Heuristic when no explicit gift: scale impact by vote count.
	if (voteCount >= 100) return GIFT_META.lion;
	if (voteCount >= 50) return GIFT_META.rocket;
	if (voteCount >= 25) return GIFT_META.flame;
	if (voteCount >= 10) return GIFT_META.lightning;
	if (voteCount >= 5) return GIFT_META.bear;
	return GIFT_META.soldier;
};

/** Format vote count as 1.2K-style for the headline. */
const formatVotes = (n: number): string => {
	if (n >= 1000) return new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(n);
	return n.toLocaleString("id-ID");
};

/** Priority score — bigger vote = higher priority. */
const score = (a: LiveAlert) => a.voteCount;

// Display timing is now voice-driven: popup stays on screen until the AI
// narration finishes reading the buyer's message. These constants only act
// as MIN / MAX safety bounds.
//   - MIN: guarantees the popup is visible long enough to read even when
//          the narration was muted or trivially short
//   - MAX: hard cap in case a hung TTS would otherwise freeze the queue
const POPUP_MIN_DISPLAY_MS = 2200;
const POPUP_MAX_DISPLAY_MS = 14000;

const LiveAlertSystem: React.FC<Props> = ({ incoming, paused }) => {
	const voice = useAIVoice();
	const [fxEnabled, setFxEnabled] = useState<boolean>(() => {
		if (typeof window === "undefined") return true;
		return window.localStorage.getItem(ANIMATION_PREF_KEY) !== "off";
	});
	const [controlsOpen, setControlsOpen] = useState(false);

	useEffect(() => {
		window.localStorage.setItem(ANIMATION_PREF_KEY, fxEnabled ? "on" : "off");
	}, [fxEnabled]);

	// Dedup + priority queue. Internal state, mutated when `incoming` changes.
	const [queue, setQueue] = useState<LiveAlert[]>([]);
	const [activeAlert, setActiveAlert] = useState<LiveAlert | null>(null);
	const [activeLifetime, setActiveLifetime] = useState<number>(POPUP_MIN_DISPLAY_MS);
	const [feed, setFeed] = useState<LiveAlert[]>([]);
	const seenIdsRef = useRef<Set<string>>(new Set());

	// Ingest new alerts into queue. Dedup is purely by `id` — legitimate
	// burst purchases from the same buyer (e.g. multiple sequential Boost
	// taps) must NOT be silently dropped. Backend ring buffer already
	// guarantees stable purchase ids, frontend just refuses replays.
	useEffect(() => {
		if (!incoming.length) return;
		const fresh: LiveAlert[] = [];
		for (const alert of incoming) {
			if (!alert?.id || seenIdsRef.current.has(alert.id)) continue;
			seenIdsRef.current.add(alert.id);
			fresh.push(alert);
		}
		if (fresh.length === 0) return;
		// Cap the seen set so it doesn't grow unbounded over a long session.
		if (seenIdsRef.current.size > 500) {
			seenIdsRef.current = new Set(Array.from(seenIdsRef.current).slice(-300));
		}
		setQueue((prev) => {
			const next = [...prev, ...fresh];
			// Sort by priority desc, then ts asc (earliest first within same tier).
			next.sort((a, b) => score(b) - score(a) || a.ts - b.ts);
			return next.slice(0, 30);
		});
		setFeed((prev) => {
			const merged = [...fresh, ...prev];
			return merged.slice(0, 8);
		});
	}, [incoming]);

	// Pull next alert from queue when active slot opens. ALSO gated on voice
	// idleness — if the previous popup's AI narration is still reading the
	// buyer's message, we wait. Guarantees zero mid-sentence cut-offs.
	useEffect(() => {
		if (paused || activeAlert) return;
		if (voice.busy) return;
		if (queue.length === 0) return;
		const next = queue[0];
		if (!next) return;
		setQueue(queue.slice(1));
		setActiveAlert(next);
	}, [activeAlert, queue, paused, voice.busy]);

	// Drive narration + auto-dismiss when an alert becomes active.
	//
	// Under burst load: lifetime shrinks adaptively so a 10-alert backlog
	// drains in ~33s instead of 52s. Voice queue is FLUSHED before each new
	// narration so audio always matches the visible popup (no lag-behind
	// speech for a popup that already vanished).
	// CRITICAL: depend ONLY on `activeAlert` (and the stable enqueue ref) —
	// NOT on the `voice` object literal. useAIVoice returns a fresh object
	// every render, so including it in deps caused this effect to cleanup
	// on EVERY render (each busy state change triggers a re-render), setting
	// `cancelled=true` permanently and preventing the dismiss path from
	// ever firing → popup stuck on the first alert forever.
	const voiceEnqueue = voice.enqueue;
	useEffect(() => {
		if (!activeAlert) return;
		const gift = resolveGift(activeAlert.giftType, activeAlert.voteCount);
		// Per user spec: voice reads gift name (ONLY when buyer picked an
		// explicit preset gift — not when they typed a custom vote count),
		// then vote count + buyer + nominee, then the buyer's message. The
		// CTA stays purely visual; never narrated.
		const hasExplicitGift = activeAlert.giftType !== null && activeAlert.giftType !== undefined;
		const lines = [
			hasExplicitGift ? `Boost ${gift.label}!` : null,
			`${activeAlert.buyerName} menambahkan ${formatVotes(activeAlert.voteCount)} vote untuk ${activeAlert.nomineeName}.`,
			activeAlert.buyerMessage ? `Pesan: ${activeAlert.buyerMessage}.` : null,
		];
		setActiveLifetime(POPUP_MAX_DISPLAY_MS);
		const startedAt = Date.now();
		let cancelled = false;
		let dismissTimer: number | null = null;

		const dismiss = () => {
			if (cancelled) return;
			const elapsed = Date.now() - startedAt;
			const remaining = Math.max(0, POPUP_MIN_DISPLAY_MS - elapsed);
			dismissTimer = window.setTimeout(() => {
				if (!cancelled) setActiveAlert(null);
			}, remaining);
		};

		// Hard safety timer — speechSynthesis sometimes hangs on long-idle
		// tabs. Without this the queue would freeze forever.
		const hardTimer = window.setTimeout(() => {
			if (!cancelled) setActiveAlert(null);
		}, POPUP_MAX_DISPLAY_MS);

		voiceEnqueue({ sfxKey: gift.key, lines, maxDurationMs: POPUP_MAX_DISPLAY_MS - 1500 })
			.then(dismiss)
			.catch(() => {
				if (!cancelled) setActiveAlert(null);
			});

		return () => {
			cancelled = true;
			if (dismissTimer != null) window.clearTimeout(dismissTimer);
			window.clearTimeout(hardTimer);
		};
	}, [activeAlert, voiceEnqueue]);

	// Prune mini-feed entries older than 30s.
	useEffect(() => {
		const id = window.setInterval(() => {
			setFeed((prev) => prev.filter((e) => Date.now() - e.ts < 30_000));
		}, 4000);
		return () => window.clearInterval(id);
	}, []);

	const activeMeta = activeAlert ? resolveGift(activeAlert.giftType, activeAlert.voteCount) : null;

	const onDismiss = useCallback(() => setActiveAlert(null), []);

	return (
		<>
			{/* Active large popup */}
			<AnimatePresence>
				{activeAlert && activeMeta && (
					<LivePopupCard
						alert={activeAlert}
						meta={activeMeta}
						fxEnabled={fxEnabled}
						lifetimeMs={activeLifetime}
						onDismiss={onDismiss}
					/>
				)}
			</AnimatePresence>

			{/* Mini feed (side rail) */}
			<MiniAlertRail feed={feed} fxEnabled={fxEnabled} />

			{/* Floating audio + fx controls */}
			<AudioControlPanel
				voice={voice}
				fxEnabled={fxEnabled}
				setFxEnabled={setFxEnabled}
				open={controlsOpen}
				setOpen={setControlsOpen}
			/>
		</>
	);
};

export default LiveAlertSystem;

// ---------------------------------------------------------------------------
// LivePopupCard — the cinematic alert. Mounted via AnimatePresence so the
// enter/exit transitions feel smooth even when alerts arrive back-to-back.
// ---------------------------------------------------------------------------
interface LivePopupCardProps {
	alert: LiveAlert;
	meta: ResolvedGiftMeta;
	fxEnabled: boolean;
	lifetimeMs: number;
	onDismiss: () => void;
}

const LivePopupCard: React.FC<LivePopupCardProps> = ({ alert, meta, fxEnabled, lifetimeMs, onDismiss }) => {
	const particleCount = fxEnabled ? 14 : 0;
	const particles = useMemo(
		() => Array.from({ length: particleCount }, (_, i) => ({
			id: i,
			delay: Math.random() * 0.4,
			x: Math.random() * 320 - 160,
			y: Math.random() * 220 - 110,
			scale: 0.6 + Math.random() * 0.8,
		})),
		[particleCount, alert.id]
	);

	return (
		<motion.div
			key={alert.id}
			className="live-alert-popup-wrap"
			initial={{ opacity: 0, y: -40, scale: 0.85 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			exit={{ opacity: 0, y: -24, scale: 0.92 }}
			transition={{ type: "spring", stiffness: 320, damping: 26 }}
			role="status"
			aria-live="polite"
		>
			<div className={`live-alert-popup is-${meta.tone}`} onClick={onDismiss}>
				{/* Backdrop gradient + radial glow */}
				<div className={`live-alert-glow bg-gradient-to-br ${meta.gradient}`} aria-hidden />
				<div className="live-alert-shine" aria-hidden />

				{/* Particle layer */}
				{fxEnabled && (
					<div className="live-alert-particles" aria-hidden>
						{particles.map((p) => (
							<motion.span
								key={p.id}
								className="live-alert-particle"
								style={{ background: meta.accent }}
								initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
								animate={{ opacity: [0, 1, 0], x: p.x, y: p.y, scale: p.scale }}
								transition={{ duration: 1.6, delay: p.delay, ease: "easeOut" }}
							/>
						))}
					</div>
				)}

				{/* Per-emoji signature overlay */}
				{fxEnabled && <EmojiSignatureFx meta={meta} />}

				{/* Header strip */}
				<div className="live-alert-head">
					<span className="live-alert-live-dot" />
					<span className="live-alert-chip">LIVE BOOST</span>
					<span className="live-alert-gift-pill">
						<span className="live-alert-gift-icon">{meta.icon}</span>
						{meta.label}
					</span>
				</div>

				{/* Body */}
				<div className="live-alert-body">
					<motion.div
						className="live-alert-emoji"
						initial={{ scale: 0.5, rotate: -8 }}
						animate={fxEnabled ? { scale: [0.5, 1.18, 1], rotate: [-8, 6, 0] } : { scale: 1, rotate: 0 }}
						transition={{ duration: 0.7, ease: "easeOut" }}
					>
						{meta.emoji}
					</motion.div>
					<div className="live-alert-text">
						<div className="live-alert-buyer" title={alert.buyerName}>{alert.buyerName}</div>
						<div className="live-alert-line">
							menambahkan
							<motion.span
								className="live-alert-votes"
								style={{ color: meta.accent, textShadow: `0 0 22px ${meta.accent}66` }}
								initial={{ scale: 0.6 }}
								animate={{ scale: 1 }}
								transition={{ delay: 0.15, type: "spring", stiffness: 320 }}
							>
								{formatVotes(alert.voteCount)}
							</motion.span>
							vote
						</div>
						<div className="live-alert-target" title={alert.nomineeName}>
							→ <span>{alert.nomineeName}</span>
						</div>
					</div>
				</div>

				{/* Buyer message (if any) */}
				{alert.buyerMessage && (
					<motion.div
						className="live-alert-message"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.25 }}
					>
						<LuSparkles className="h-3.5 w-3.5 opacity-80" />
						<span>“{alert.buyerMessage}”</span>
					</motion.div>
				)}

				{/* Progress bar — visual countdown to dismiss */}
				<motion.div
					className="live-alert-progress"
					initial={{ scaleX: 1 }}
					animate={{ scaleX: 0 }}
					transition={{ duration: lifetimeMs / 1000, ease: "linear" }}
					style={{ background: meta.accent }}
				/>
			</div>
		</motion.div>
	);
};

// ---------------------------------------------------------------------------
// EmojiSignatureFx — emoji-specific visual flourishes that play over the
// popup card (golden shake for lion, rocket trail, lightning flash, etc).
// ---------------------------------------------------------------------------
const EmojiSignatureFx: React.FC<{ meta: ResolvedGiftMeta }> = ({ meta }) => {
	if (meta.key === "lion") {
		return <span className="live-alert-fx-lion" aria-hidden />;
	}
	if (meta.key === "rocket") {
		return (
			<motion.span
				className="live-alert-fx-rocket-trail"
				aria-hidden
				initial={{ x: -120, opacity: 0 }}
				animate={{ x: 240, opacity: [0, 1, 0] }}
				transition={{ duration: 0.9, ease: "easeOut" }}
			/>
		);
	}
	if (meta.key === "flame") {
		return <span className="live-alert-fx-flame" aria-hidden />;
	}
	if (meta.key === "lightning") {
		return (
			<motion.span
				className="live-alert-fx-lightning"
				aria-hidden
				initial={{ opacity: 0 }}
				animate={{ opacity: [0, 1, 0, 1, 0] }}
				transition={{ duration: 0.6, times: [0, 0.1, 0.25, 0.4, 1] }}
			/>
		);
	}
	if (meta.key === "crown") {
		return <span className="live-alert-fx-crown" aria-hidden />;
	}
	return null;
};

// ---------------------------------------------------------------------------
// MiniAlertRail — small side feed of the last few alerts. Slides on the right
// side of the viewport on desktop, hidden on tiny mobile.
// ---------------------------------------------------------------------------
const MiniAlertRail: React.FC<{ feed: LiveAlert[]; fxEnabled: boolean }> = ({ feed, fxEnabled }) => {
	return (
		<div className="live-alert-rail" aria-label="Aktivitas vote terkini">
			<AnimatePresence initial={false}>
				{feed.slice(0, 6).map((alert) => {
					const meta = resolveGift(alert.giftType, alert.voteCount);
					return (
						<motion.div
							key={alert.id}
							layout={fxEnabled}
							initial={{ opacity: 0, x: 60, scale: 0.95 }}
							animate={{ opacity: 1, x: 0, scale: 1 }}
							exit={{ opacity: 0, x: 40, scale: 0.94 }}
							transition={{ type: "spring", stiffness: 360, damping: 30 }}
							className={`live-alert-rail-item is-${meta.tone}`}
						>
							<span className="live-alert-rail-emoji">{meta.emoji}</span>
							<div className="live-alert-rail-meta">
								<div className="live-alert-rail-buyer">{alert.buyerName}</div>
								<div className="live-alert-rail-line">
									<span style={{ color: meta.accent }}>+{formatVotes(alert.voteCount)}</span>
									<span className="opacity-60"> · {alert.nomineeName}</span>
								</div>
							</div>
						</motion.div>
					);
				})}
			</AnimatePresence>
		</div>
	);
};

// ---------------------------------------------------------------------------
// AudioControlPanel — collapsible floating panel. Mute, volume, voice gender,
// fx toggle. Persists choices via the useAIVoice hook + localStorage.
// ---------------------------------------------------------------------------
interface AudioControlPanelProps {
	voice: ReturnType<typeof useAIVoice>;
	fxEnabled: boolean;
	setFxEnabled: (next: boolean) => void;
	open: boolean;
	setOpen: (next: boolean) => void;
}

const AudioControlPanel: React.FC<AudioControlPanelProps> = ({ voice, fxEnabled, setFxEnabled, open, setOpen }) => {
	return (
		<div className="live-alert-controls">
			<button
				type="button"
				className="live-alert-controls-fab"
				aria-label={voice.muted ? "Aktifkan suara live alert" : "Matikan suara live alert"}
				onClick={() => voice.setMuted((m) => !m)}
			>
				{voice.muted ? <LuVolumeX className="h-4 w-4" /> : <LuVolume2 className="h-4 w-4" />}
			</button>
			<button
				type="button"
				className="live-alert-controls-fab"
				aria-label="Buka pengaturan live alert"
				onClick={() => setOpen(!open)}
			>
				<LuSettings2 className="h-4 w-4" />
			</button>
			<AnimatePresence>
				{open && (
					<motion.div
						className="live-alert-controls-panel"
						initial={{ opacity: 0, y: 8, scale: 0.95 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 8, scale: 0.95 }}
						transition={{ duration: 0.18 }}
					>
						<div className="live-alert-controls-row">
							<label className="live-alert-controls-label">Volume</label>
							<input
								type="range"
								min={0}
								max={1}
								step={0.05}
								value={voice.volume}
								onChange={(e) => voice.setVolume(parseFloat(e.target.value))}
								className="live-alert-controls-range"
								aria-label="Atur volume live alert"
							/>
							<span className="live-alert-controls-value">{Math.round(voice.volume * 100)}</span>
						</div>
						<div className="live-alert-controls-row">
							<label className="live-alert-controls-label">Suara AI</label>
							<div className="live-alert-controls-segmented">
								<button
									type="button"
									className={voice.gender === "female" ? "is-active" : ""}
									onClick={() => voice.setGender("female")}
								>
									Wanita
								</button>
								<button
									type="button"
									className={voice.gender === "male" ? "is-active" : ""}
									onClick={() => voice.setGender("male")}
								>
									Pria
								</button>
							</div>
						</div>
						<div className="live-alert-controls-row">
							<label className="live-alert-controls-label">Efek Animasi</label>
							<button
								type="button"
								className={`live-alert-controls-pill ${fxEnabled ? "is-on" : ""}`}
								onClick={() => setFxEnabled(!fxEnabled)}
							>
								{fxEnabled ? "Aktif" : "Nonaktif"}
							</button>
						</div>
						<p className="live-alert-controls-hint">
							Suara &amp; popup hanya tampil saat ada vote berbayar masuk. Mute apabila ingin fokus pada layar.
						</p>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};
