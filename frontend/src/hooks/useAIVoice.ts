import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// useAIVoice — drives the donation-alert popup audio:
//   1) emoji-boost SFX (lion roar, rocket, flame, lightning, crown, ...) via
//      either a real MP3 in /public/sfx/<key>.mp3 OR a procedural Web Audio
//      fallback so the feature works even before the SFX library is filled
//   2) AI voice narration via the browser's SpeechSynthesis API (free, no
//      API key, supports id-ID), with a queue so concurrent popups don't
//      collide
//
// Web Speech API is hand-picked for v1 — zero infrastructure, instant, no
// recurring cost. Swap to ElevenLabs/Google TTS later by replacing the
// `speak()` body with a fetch+Howler call that streams premium audio.
// ---------------------------------------------------------------------------

export type EmojiBoostKey = "lion" | "rocket" | "flame" | "lightning" | "crown" | "bear" | "soldier";

export interface NarrationRequest {
	/** Played first — short SFX matching the emoji boost (auman singa, dll). */
	sfxKey?: EmojiBoostKey | "popup-open";
	/** Lines spoken sequentially by the TTS engine. Skip nulls. */
	lines: Array<string | null | undefined>;
	/** Optional fixed total cap so a popup that fires for ~5s also caps voice. */
	maxDurationMs?: number;
}

interface QueueItem extends NarrationRequest {
	id: string;
	enqueuedAt: number;
	/** Resolved when this narration finishes (or is silently skipped). */
	onDone: () => void;
}

const STORAGE_KEY = "voting-arena-voice";
const SFX_PATH = "/sfx";
type VoiceGender = "female" | "male";
const DEFAULT_LOCALE = "id-ID";
const PROCEDURAL_VOLUME = 0.45;

// Map our keys → (preferred MP3 file, fallback procedural spec).
const SFX_LIBRARY: Record<string, { file: string; fallback: (ctx: AudioContext, master: GainNode) => number }> = {
	lion: {
		file: `${SFX_PATH}/lion-roar.mp3`,
		// Deep growl: low sawtooth + noise burst, slow tail.
		fallback: (ctx, master) => proceduralRoar(ctx, master, { freqStart: 110, freqEnd: 70, duration: 1.1 }),
	},
	rocket: {
		file: `${SFX_PATH}/rocket.mp3`,
		fallback: (ctx, master) => proceduralWhoosh(ctx, master, { freqStart: 220, freqEnd: 1800, duration: 1.0 }),
	},
	flame: {
		file: `${SFX_PATH}/flame.mp3`,
		fallback: (ctx, master) => proceduralFlame(ctx, master, { duration: 0.9 }),
	},
	lightning: {
		file: `${SFX_PATH}/lightning.mp3`,
		fallback: (ctx, master) => proceduralLightning(ctx, master, { duration: 1.1 }),
	},
	crown: {
		file: `${SFX_PATH}/crown.mp3`,
		fallback: (ctx, master) => proceduralChime(ctx, master, { duration: 1.0 }),
	},
	bear: {
		file: `${SFX_PATH}/bear.mp3`,
		fallback: (ctx, master) => proceduralRoar(ctx, master, { freqStart: 160, freqEnd: 95, duration: 0.7 }),
	},
	soldier: {
		file: `${SFX_PATH}/soldier.mp3`,
		fallback: (ctx, master) => proceduralSnare(ctx, master, { duration: 0.5 }),
	},
	"popup-open": {
		file: `${SFX_PATH}/popup-open.mp3`,
		fallback: (ctx, master) => proceduralWhoosh(ctx, master, { freqStart: 320, freqEnd: 880, duration: 0.32 }),
	},
};

const readStored = <T,>(key: string, parse: (v: string) => T, fallback: T): T => {
	if (typeof window === "undefined") return fallback;
	const raw = window.localStorage.getItem(key);
	if (raw == null) return fallback;
	try { return parse(raw); } catch { return fallback; }
};

export const useAIVoice = () => {
	const [muted, setMutedState] = useState<boolean>(() => readStored(`${STORAGE_KEY}:muted`, (v) => v === "true", false));
	const [volume, setVolumeState] = useState<number>(() => readStored(`${STORAGE_KEY}:volume`, (v) => Math.min(1, Math.max(0, Number(v))), 0.85));
	const [gender, setGenderState] = useState<VoiceGender>(() => readStored(`${STORAGE_KEY}:gender`, (v) => (v === "male" ? "male" : "female"), "female"));
	// `busy` is true while a narration is being processed OR the queue still
	// has items. LiveAlertSystem gates popup transitions on this — a new popup
	// only mounts after the previous popup's full narration completes.
	const [busy, setBusy] = useState(false);

	const audioCtxRef = useRef<AudioContext | null>(null);
	const masterGainRef = useRef<GainNode | null>(null);
	const mp3CacheRef = useRef<Map<string, AudioBuffer | "missing">>(new Map());
	const queueRef = useRef<QueueItem[]>([]);
	const processingRef = useRef(false);
	const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
	const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

	// Persist preferences.
	useEffect(() => { window.localStorage.setItem(`${STORAGE_KEY}:muted`, String(muted)); }, [muted]);
	useEffect(() => { window.localStorage.setItem(`${STORAGE_KEY}:volume`, String(volume)); }, [volume]);
	useEffect(() => { window.localStorage.setItem(`${STORAGE_KEY}:gender`, gender); }, [gender]);

	// Apply volume + mute to master gain node live.
	useEffect(() => {
		const g = masterGainRef.current;
		if (!g) return;
		g.gain.setTargetAtTime(muted ? 0 : volume, audioCtxRef.current?.currentTime ?? 0, 0.05);
	}, [muted, volume]);

	// Load available voices for id-ID once they're populated by the browser.
	useEffect(() => {
		if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
		const refresh = () => { voicesRef.current = window.speechSynthesis.getVoices(); };
		refresh();
		window.speechSynthesis.onvoiceschanged = refresh;
		return () => { window.speechSynthesis.onvoiceschanged = null; };
	}, []);

	const ensureCtx = useCallback(() => {
		if (audioCtxRef.current) return audioCtxRef.current;
		const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
		if (!Ctor) return null;
		const ctx = new Ctor();
		const master = ctx.createGain();
		master.gain.value = muted ? 0 : volume;
		master.connect(ctx.destination);
		audioCtxRef.current = ctx;
		masterGainRef.current = master;
		return ctx;
	}, [muted, volume]);

	// Resume context on first user gesture (browsers require it for autoplay).
	useEffect(() => {
		const unlock = () => {
			const ctx = ensureCtx();
			if (ctx && ctx.state === "suspended") void ctx.resume();
		};
		window.addEventListener("pointerdown", unlock, { once: true });
		window.addEventListener("keydown", unlock, { once: true });
		return () => {
			window.removeEventListener("pointerdown", unlock);
			window.removeEventListener("keydown", unlock);
		};
	}, [ensureCtx]);

	const loadMp3 = useCallback(async (url: string): Promise<AudioBuffer | null> => {
		const cached = mp3CacheRef.current.get(url);
		if (cached === "missing") return null;
		if (cached) return cached;
		const ctx = ensureCtx();
		if (!ctx) return null;
		try {
			const res = await fetch(url, { cache: "force-cache" });
			if (!res.ok) throw new Error(String(res.status));
			const arr = await res.arrayBuffer();
			const buf = await ctx.decodeAudioData(arr);
			mp3CacheRef.current.set(url, buf);
			return buf;
		} catch {
			mp3CacheRef.current.set(url, "missing");
			return null;
		}
	}, [ensureCtx]);

	const playSfx = useCallback(async (key: NarrationRequest["sfxKey"]): Promise<number> => {
		if (!key || muted) return 0;
		const ctx = ensureCtx();
		if (!ctx) return 0;
		if (ctx.state === "suspended") {
			try { await ctx.resume(); } catch { /* noop */ }
		}
		const entry = SFX_LIBRARY[key];
		if (!entry) return 0;
		const master = masterGainRef.current!;
		const buf = await loadMp3(entry.file);
		if (buf) {
			const src = ctx.createBufferSource();
			src.buffer = buf;
			const gain = ctx.createGain();
			gain.gain.value = 0.85;
			src.connect(gain).connect(master);
			src.start();
			return buf.duration * 1000;
		}
		// Fallback: synthesize procedurally.
		const durationSec = entry.fallback(ctx, master);
		return durationSec * 1000;
	}, [ensureCtx, loadMp3, muted]);

	const pickVoice = useCallback((wanted: VoiceGender): SpeechSynthesisVoice | null => {
		const voices = voicesRef.current;
		if (!voices.length) return null;
		const idVoices = voices.filter((v) => v.lang?.toLowerCase().startsWith("id"));
		const enVoices = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
		const pool = idVoices.length ? idVoices : enVoices.length ? enVoices : voices;
		// Heuristic: browsers seldom expose gender — match by common voice names.
		const femaleHints = ["female", "wanita", "perempuan", "ayu", "damayanti", "google indonesia", "siti", "Microsoft Andika", "zira", "samantha"];
		const maleHints = ["male", "pria", "laki", "ardi", "rama", "google bahasa", "Microsoft Bambang"];
		const hints = wanted === "female" ? femaleHints : maleHints;
		const match = pool.find((v) => hints.some((h) => v.name.toLowerCase().includes(h.toLowerCase())));
		return match ?? pool[0] ?? null;
	}, []);

	const speakLine = useCallback((text: string): Promise<void> => {
		return new Promise<void>((resolve) => {
			if (muted || typeof window === "undefined" || !("speechSynthesis" in window)) return resolve();
			const utter = new SpeechSynthesisUtterance(text);
			utter.lang = DEFAULT_LOCALE;
			utter.volume = Math.min(1, Math.max(0, volume));
			utter.rate = 1.05;
			utter.pitch = gender === "female" ? 1.15 : 0.92;
			const voice = pickVoice(gender);
			if (voice) utter.voice = voice;
			let settled = false;
			const done = () => { if (settled) return; settled = true; resolve(); };
			utter.onend = done;
			utter.onerror = done;
			currentUtteranceRef.current = utter;
			try {
				window.speechSynthesis.speak(utter);
			} catch {
				done();
			}
			// Hard cap fallback — some browsers swallow onend.
			window.setTimeout(done, 6500);
		});
	}, [gender, muted, pickVoice, volume]);

	const drainQueue = useCallback(async () => {
		if (processingRef.current) return;
		processingRef.current = true;
		setBusy(true);
		try {
			while (queueRef.current.length > 0) {
				const item = queueRef.current.shift()!;
				try {
					const startedAt = performance.now();
					const sfxMs = await playSfx(item.sfxKey);
					// Wait until the SFX is mostly done before the voice starts so
					// they don't muddy each other (overlap by 120ms feels natural).
					if (sfxMs > 0) await new Promise((r) => setTimeout(r, Math.max(0, sfxMs - 120)));
					for (const line of item.lines) {
						if (!line) continue;
						if (item.maxDurationMs && performance.now() - startedAt > item.maxDurationMs) break;
						await speakLine(line);
					}
					// Small gap so the next popup doesn't blink in mid-syllable.
					await new Promise((r) => setTimeout(r, 160));
				} finally {
					// Always resolve the caller's promise even if SFX/TTS errored —
					// LiveAlertSystem awaits this to dismiss the popup, so an
					// unresolved promise would freeze the queue.
					try { item.onDone(); } catch { /* noop */ }
				}
			}
		} finally {
			processingRef.current = false;
			setBusy(false);
		}
	}, [playSfx, speakLine]);

	/**
	 * Enqueue a narration. Returns a Promise that resolves AFTER the SFX +
	 * all TTS lines for this request complete (or are skipped via mute/cap).
	 * LiveAlertSystem awaits this to gate the popup transition — guaranteeing
	 * the AI voice finishes reading the buyer's message before the next popup.
	 */
	const enqueue = useCallback((req: NarrationRequest): Promise<void> => {
		return new Promise<void>((resolve) => {
			const id = `narr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
			queueRef.current.push({ ...req, id, enqueuedAt: Date.now(), onDone: resolve });
			// Cap queue at 8 — under heavy burst, oldest pending narrations
			// (which the user already missed visually) are dropped so the
			// queue stays bounded. We resolve their promises immediately so
			// the popup queue doesn't deadlock.
			if (queueRef.current.length > 8) {
				const dropped = queueRef.current.splice(0, queueRef.current.length - 8);
				dropped.forEach((d) => { try { d.onDone(); } catch { /* noop */ } });
			}
			void drainQueue();
		});
	}, [drainQueue]);

	const flush = useCallback(() => {
		// Resolve every pending narration so awaiting callers can move on.
		const pending = queueRef.current;
		queueRef.current = [];
		pending.forEach((p) => { try { p.onDone(); } catch { /* noop */ } });
		if (typeof window !== "undefined" && "speechSynthesis" in window) {
			try { window.speechSynthesis.cancel(); } catch { /* noop */ }
		}
	}, []);

	const setMuted = useCallback((next: boolean | ((prev: boolean) => boolean)) => {
		setMutedState((prev) => {
			const value = typeof next === "function" ? (next as (p: boolean) => boolean)(prev) : next;
			if (value) flush();
			return value;
		});
	}, [flush]);

	return {
		muted,
		setMuted,
		volume,
		setVolume: setVolumeState,
		gender,
		setGender: setGenderState,
		busy,
		enqueue,
		flush,
		playSfx,
	} as const;
};

// ---------------------------------------------------------------------------
// Procedural Web Audio SFX — invoked only when the matching MP3 file is
// missing. They return the duration in seconds so the queue can schedule the
// TTS line right after the SFX tail.
// ---------------------------------------------------------------------------

function proceduralRoar(ctx: AudioContext, master: GainNode, { freqStart, freqEnd, duration }: { freqStart: number; freqEnd: number; duration: number; }): number {
	const now = ctx.currentTime;
	const osc = ctx.createOscillator();
	osc.type = "sawtooth";
	osc.frequency.setValueAtTime(freqStart, now);
	osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), now + duration);
	const gain = ctx.createGain();
	gain.gain.setValueAtTime(0.001, now);
	gain.gain.exponentialRampToValueAtTime(PROCEDURAL_VOLUME, now + 0.07);
	gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
	const lp = ctx.createBiquadFilter();
	lp.type = "lowpass";
	lp.frequency.value = 900;
	osc.connect(lp).connect(gain).connect(master);
	osc.start(now);
	osc.stop(now + duration + 0.05);

	// Noise layer for grit
	const noise = makeNoiseSource(ctx, duration);
	const noiseGain = ctx.createGain();
	noiseGain.gain.setValueAtTime(0.18, now);
	noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
	const bp = ctx.createBiquadFilter();
	bp.type = "bandpass";
	bp.frequency.value = 480;
	bp.Q.value = 0.7;
	noise.connect(bp).connect(noiseGain).connect(master);
	noise.start(now);
	noise.stop(now + duration + 0.05);
	return duration;
}

function proceduralWhoosh(ctx: AudioContext, master: GainNode, { freqStart, freqEnd, duration }: { freqStart: number; freqEnd: number; duration: number; }): number {
	const now = ctx.currentTime;
	const osc = ctx.createOscillator();
	osc.type = "triangle";
	osc.frequency.setValueAtTime(freqStart, now);
	osc.frequency.exponentialRampToValueAtTime(Math.max(60, freqEnd), now + duration);
	const gain = ctx.createGain();
	gain.gain.setValueAtTime(0.001, now);
	gain.gain.exponentialRampToValueAtTime(PROCEDURAL_VOLUME, now + 0.05);
	gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
	osc.connect(gain).connect(master);
	osc.start(now);
	osc.stop(now + duration + 0.05);

	const noise = makeNoiseSource(ctx, duration);
	const noiseGain = ctx.createGain();
	noiseGain.gain.setValueAtTime(0.22, now);
	noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
	const hp = ctx.createBiquadFilter();
	hp.type = "highpass";
	hp.frequency.value = 600;
	noise.connect(hp).connect(noiseGain).connect(master);
	noise.start(now);
	noise.stop(now + duration + 0.05);
	return duration;
}

function proceduralFlame(ctx: AudioContext, master: GainNode, { duration }: { duration: number; }): number {
	const now = ctx.currentTime;
	const noise = makeNoiseSource(ctx, duration);
	const filter = ctx.createBiquadFilter();
	filter.type = "bandpass";
	filter.frequency.value = 1500;
	filter.Q.value = 0.6;
	const gain = ctx.createGain();
	gain.gain.setValueAtTime(0.001, now);
	gain.gain.exponentialRampToValueAtTime(PROCEDURAL_VOLUME, now + 0.08);
	gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
	noise.connect(filter).connect(gain).connect(master);
	noise.start(now);
	noise.stop(now + duration + 0.05);
	return duration;
}

function proceduralLightning(ctx: AudioContext, master: GainNode, { duration }: { duration: number; }): number {
	const now = ctx.currentTime;
	// Initial crack
	const crackNoise = makeNoiseSource(ctx, 0.2);
	const crackGain = ctx.createGain();
	crackGain.gain.setValueAtTime(PROCEDURAL_VOLUME * 1.1, now);
	crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
	crackNoise.connect(crackGain).connect(master);
	crackNoise.start(now);
	crackNoise.stop(now + 0.22);
	// Low rumble tail
	const rumble = ctx.createOscillator();
	rumble.type = "sawtooth";
	rumble.frequency.setValueAtTime(70, now);
	rumble.frequency.exponentialRampToValueAtTime(40, now + duration);
	const rumbleGain = ctx.createGain();
	rumbleGain.gain.setValueAtTime(0.001, now);
	rumbleGain.gain.exponentialRampToValueAtTime(PROCEDURAL_VOLUME * 0.5, now + 0.1);
	rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
	rumble.connect(rumbleGain).connect(master);
	rumble.start(now);
	rumble.stop(now + duration + 0.05);
	return duration;
}

function proceduralChime(ctx: AudioContext, master: GainNode, { duration }: { duration: number; }): number {
	const now = ctx.currentTime;
	// Major triad C5, E5, G5
	[523.25, 659.25, 783.99].forEach((freq, idx) => {
		const osc = ctx.createOscillator();
		osc.type = "sine";
		osc.frequency.value = freq;
		const gain = ctx.createGain();
		const start = now + idx * 0.07;
		gain.gain.setValueAtTime(0.001, start);
		gain.gain.exponentialRampToValueAtTime(PROCEDURAL_VOLUME * 0.7, start + 0.04);
		gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
		osc.connect(gain).connect(master);
		osc.start(start);
		osc.stop(start + duration + 0.05);
	});
	return duration;
}

function proceduralSnare(ctx: AudioContext, master: GainNode, { duration }: { duration: number; }): number {
	const now = ctx.currentTime;
	const noise = makeNoiseSource(ctx, duration);
	const hp = ctx.createBiquadFilter();
	hp.type = "highpass";
	hp.frequency.value = 1800;
	const gain = ctx.createGain();
	gain.gain.setValueAtTime(PROCEDURAL_VOLUME, now);
	gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
	noise.connect(hp).connect(gain).connect(master);
	noise.start(now);
	noise.stop(now + duration + 0.05);
	return duration;
}

function makeNoiseSource(ctx: AudioContext, durationSec: number): AudioBufferSourceNode {
	const length = Math.ceil(ctx.sampleRate * (durationSec + 0.05));
	const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
	const src = ctx.createBufferSource();
	src.buffer = buffer;
	return src;
}
