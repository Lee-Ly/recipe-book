import { useSyncExternalStore } from "react";

// One timer store for the whole app, so timers keep running (and ringing) while you move between pages.
// Only imported by client components.

export interface Timer {
  id: string;
  label: string;
  /** Full length in ms (grows with +1 min) */
  totalMs: number;
  /** Time left in ms. For a running timer this is refreshed on every tick. */
  leftMs: number;
  /** When a running timer reaches zero; null while paused or finished */
  endsAt: number | null;
  done: boolean;
}

interface State {
  timers: Timer[];
  awake: boolean;
}

const KEY = "rb_timers";
const EMPTY: Timer[] = [];
let state: State = { timers: EMPTY, awake: false };
const listeners = new Set<() => void>();
let interval: ReturnType<typeof setInterval> | null = null;

function emit(next: Partial<State>) {
  state = { ...state, ...next };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify(state.timers));
    } catch {
      /* storage can be blocked; timers still work for this visit */
    }
  }
  syncTicking();
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/* ---------- sound: a small synthesized chime played inside the page ---------- */

let audio: AudioContext | null = null;

function unlockAudio() {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
  } catch {
    /* no audio available */
  }
}

function chime() {
  const ctx = audio;
  if (!ctx) return;
  const start = ctx.currentTime + 0.05;
  for (let rep = 0; rep < 3; rep++) {
    [880, 1174.66, 1567.98].forEach((freq, i) => {
      const t = start + rep * 1.1 + i * 0.16;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.75);
    });
  }
}

/* ---------- keep the screen on ---------- */

let lock: WakeLockSentinel | null = null;

async function acquireLock() {
  try {
    if (!("wakeLock" in navigator) || lock) return;
    const sentinel = await navigator.wakeLock.request("screen");
    lock = sentinel;
    sentinel.addEventListener("release", () => {
      if (lock === sentinel) lock = null;
    });
  } catch {
    /* refused (e.g. battery saver) */
  }
}

export function setAwake(on: boolean) {
  if (on) {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    void acquireLock();
  } else {
    void lock?.release();
    lock = null;
  }
  emit({ awake: on });
}

/* ---------- ticking ---------- */

function tick() {
  const now = Date.now();
  let rang = false;
  const timers = state.timers.map((t) => {
    if (t.endsAt == null) return t;
    const left = t.endsAt - now;
    if (left > 0) return { ...t, leftMs: left };
    rang = true;
    return { ...t, leftMs: 0, endsAt: null, done: true };
  });
  if (rang) chime();
  emit({ timers });
}

function syncTicking() {
  const running = state.timers.some((t) => t.endsAt != null);
  if (running && !interval) interval = setInterval(tick, 250);
  else if (!running && interval) {
    clearInterval(interval);
    interval = null;
  }
}

/* ---------- actions ---------- */

const update = (id: string, fn: (t: Timer) => Timer) => emit({ timers: state.timers.map((t) => (t.id === id ? fn(t) : t)) });

export function startTimer(label: string, seconds: number) {
  unlockAudio();
  const totalMs = seconds * 1000;
  const timer: Timer = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, label, totalMs, leftMs: totalMs, endsAt: Date.now() + totalMs, done: false };
  emit({ timers: [...state.timers, timer] });
  setAwake(true);
}

export function togglePause(id: string) {
  unlockAudio();
  update(id, (t) => {
    if (t.done) return t;
    if (t.endsAt != null) return { ...t, endsAt: null, leftMs: Math.max(0, t.endsAt - Date.now()) };
    return { ...t, endsAt: Date.now() + t.leftMs };
  });
}

export function restartTimer(id: string) {
  unlockAudio();
  update(id, (t) => ({ ...t, leftMs: t.totalMs, endsAt: Date.now() + t.totalMs, done: false }));
}

export function addMinute(id: string) {
  unlockAudio();
  update(id, (t) => {
    if (t.done) return { ...t, totalMs: 60000, leftMs: 60000, endsAt: Date.now() + 60000, done: false };
    return { ...t, totalMs: t.totalMs + 60000, leftMs: t.leftMs + 60000, endsAt: t.endsAt == null ? null : t.endsAt + 60000 };
  });
}

export function dismissTimer(id: string) {
  emit({ timers: state.timers.filter((t) => t.id !== id) });
}

/* ---------- hooks ---------- */

export const useTimers = (): Timer[] => useSyncExternalStore(subscribe, () => state.timers, () => EMPTY);
export const useAwake = (): boolean => useSyncExternalStore(subscribe, () => state.awake, () => false);
const noSubscribe = () => () => {};
export const useAwakeSupported = (): boolean =>
  useSyncExternalStore(noSubscribe, () => "wakeLock" in navigator, () => true);

/* ---------- start-up (browser only) ---------- */

if (typeof window !== "undefined") {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "[]") as Timer[];
    const now = Date.now();
    // A timer that ran out while the page was closed shows as finished, without ringing.
    const timers = saved.map((t) => (t.endsAt != null && t.endsAt <= now ? { ...t, leftMs: 0, endsAt: null, done: true } : t));
    state = { ...state, timers: timers.length ? timers : EMPTY };
    syncTicking();
  } catch {
    /* ignore corrupt saved timers */
  }
  // Phones only allow sound after a tap, so the first tap anywhere unlocks it.
  window.addEventListener("pointerdown", unlockAudio, { once: true });
  // The screen lock is dropped when the tab is hidden; take it again when you come back.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && state.awake) void acquireLock();
  });
}
