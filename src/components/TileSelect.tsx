"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface TileOption {
  value: string;
  label: string;
  /** Small, light text after the label (for example the area in cm²) */
  hint?: string;
  /** Marks the recipe's own value */
  original?: boolean;
}

/**
 * A dropdown for the recipe's detail tiles. Unlike a plain <select> it can show a small, light second line of text
 * (the pan's area) beside each choice, and a "original" badge on the recipe's own choice.
 */
export default function TileSelect({
  options,
  value,
  onChange,
  label,
  originalLabel,
}: {
  options: TileOption[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  originalLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center justify-between gap-1.5 rounded-md py-0.5 text-start font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
      >
        <span className="min-w-0">
          <bdi>{current?.label}</bdi>
          {current?.hint && (
            <span className="ms-1.5 text-[10px] font-medium text-muted">
              <bdi>{current.hint}</bdi>
            </span>
          )}
        </span>
        <svg aria-hidden viewBox="0 0 12 12" className={`h-3 w-3 shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 4.5 6 8l3.5-3.5" />
        </svg>
      </button>
      {open && (
        <ul id={listId} role="listbox" aria-label={label} className="absolute start-0 top-full z-30 mt-1.5 max-h-72 min-w-[13rem] overflow-auto rounded-xl border border-line bg-card p-1 shadow-lg">
          {options.map((o) => {
            const selected = o.value === value;
            return (
              <li key={o.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-start text-sm transition ${selected ? "bg-accent-soft font-bold" : "font-medium hover:bg-accent-soft active:bg-accent-soft"}`}
                >
                  <span>
                    <bdi>{o.label}</bdi>
                    {o.hint && (
                      <span className="ms-1.5 text-[10px] font-medium text-muted">
                        <bdi>{o.hint}</bdi>
                      </span>
                    )}
                  </span>
                  {o.original && <span className="shrink-0 rounded-md border border-line bg-card px-1.5 py-0.5 text-[10px] font-bold text-muted">{originalLabel}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
