"use client";

import { usePathname } from "next/navigation";
import { addMinute, dismissTimer, restartTimer, togglePause, useTimers, type Timer } from "@/lib/timer-store";
import { RotateIcon, XIcon } from "./icons";

function clock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

const small = "rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition";

function TimerCard({ t }: { t: Timer }) {
  const paused = t.endsAt == null && !t.done;
  return (
    <div
      dir="ltr"
      role={t.done ? "alert" : undefined}
      className={`pointer-events-auto flex items-center justify-between gap-2 rounded-2xl border bg-foreground/95 px-3.5 py-2.5 text-background shadow-xl backdrop-blur ${
        t.done ? "border-accent ring-2 ring-accent/40" : "border-white/15"
      }`}
    >
      <div className="min-w-0">
        <span dir="auto" className="block truncate text-[10px] font-bold uppercase tracking-wider text-muted-2">
          {t.label}
        </span>
        <span className={`text-lg font-bold tabular-nums ${t.done ? "animate-pulse text-accent" : paused ? "opacity-60" : ""}`}>{t.done ? "DONE!" : clock(t.leftMs)}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button type="button" onClick={() => restartTimer(t.id)} aria-label="Restart timer" className={`${small} inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 active:bg-white/20`}>
          <RotateIcon className="h-3.5 w-3.5 text-accent" />
          <span>Restart</span>
        </button>
        <button type="button" onClick={() => addMinute(t.id)} aria-label="Add one minute" className={`${small} bg-white/10 px-2 tabular-nums hover:bg-white/20 active:bg-white/20`}>
          +1m
        </button>
        {!t.done && (
          <button type="button" onClick={() => togglePause(t.id)} className={`${small} bg-accent text-accent-fg hover:bg-accent-hover active:bg-accent-hover`}>
            {paused ? "Resume" : "Pause"}
          </button>
        )}
        <button type="button" onClick={() => dismissTimer(t.id)} aria-label="Dismiss timer" className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-2 transition hover:bg-white/10 hover:text-background active:bg-white/10">
          <XIcon />
        </button>
      </div>
    </div>
  );
}

/** Floating timers. Sticky across pages; hidden on the edit screens so they don't cover the form. */
export default function TimerDock() {
  const timers = useTimers();
  const pathname = usePathname();
  if (timers.length === 0 || pathname.startsWith("/add") || pathname.endsWith("/edit")) return null;
  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md flex-col gap-2">
      {timers.map((t) => (
        <TimerCard key={t.id} t={t} />
      ))}
    </div>
  );
}
