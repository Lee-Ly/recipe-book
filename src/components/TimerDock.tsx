"use client";

import { usePathname } from "next/navigation";
import { addMinute, dismissTimer, restartTimer, togglePause, useTimers, type Timer } from "@/lib/timer-store";

function clock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const btn = "flex h-10 min-w-10 items-center justify-center rounded-xl px-2 text-sm font-semibold active:opacity-70";

function TimerPill({ t }: { t: Timer }) {
  const paused = t.endsAt == null && !t.done;
  return (
    <div
      dir="ltr"
      className={`pointer-events-auto flex items-center gap-1 rounded-2xl py-2 ps-4 pe-2 shadow-lg shadow-black/15 ${t.done ? "bg-accent text-accent-fg" : "bg-foreground text-background"}`}
      role={t.done ? "alert" : undefined}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] leading-tight opacity-70">{t.done ? "Time's up" : t.label}</p>
        <p className={`text-xl font-semibold leading-tight tabular-nums ${paused ? "opacity-60" : ""}`}>{clock(t.leftMs)}</p>
      </div>
      {!t.done && (
        <button type="button" onClick={() => togglePause(t.id)} aria-label={paused ? "Resume timer" : "Pause timer"} className={`${btn} bg-white/15`}>
          {paused ? "▶" : "❚❚"}
        </button>
      )}
      <button type="button" onClick={() => restartTimer(t.id)} aria-label="Restart timer" className={`${btn} bg-white/15`}>
        ↺
      </button>
      <button type="button" onClick={() => addMinute(t.id)} aria-label="Add one minute" className={`${btn} bg-white/15`}>
        +1m
      </button>
      <button type="button" onClick={() => dismissTimer(t.id)} aria-label="Close timer" className={btn}>
        ✕
      </button>
    </div>
  );
}

/** Floating timers. Sticky across pages; hidden on the edit screens so they don't cover the Save bar. */
export default function TimerDock() {
  const timers = useTimers();
  const pathname = usePathname();
  if (timers.length === 0 || pathname.startsWith("/add") || pathname.endsWith("/edit")) return null;
  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md flex-col gap-2">
      {timers.map((t) => (
        <TimerPill key={t.id} t={t} />
      ))}
    </div>
  );
}
