"use client";

import { useState } from "react";
import { btnGhost, inputCls, tagChip } from "./ui";

interface Props {
  tags: string[];
  suggested: string[];
  onChange: (tags: string[], suggested: string[]) => void;
}

const iconBtn = "-me-2 flex h-9 w-9 items-center justify-center text-muted active:text-foreground";

/** Accepted tags are solid chips (✕ removes). Suggestions are outlined chips: tap to accept, ✕ to dismiss. */
export default function TagEditor({ tags, suggested, onChange }: Props) {
  const [draft, setDraft] = useState("");

  function add() {
    const t = draft.trim().replace(/^#/, "");
    setDraft("");
    if (!t || tags.includes(t)) return;
    onChange([...tags, t], suggested.filter((s) => s !== t));
  }

  return (
    <div className="flex flex-col gap-3">
      {tags.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Accepted tags">
          {tags.map((t) => (
            <li key={t} className={`${tagChip} bg-accent pe-2 ps-4 font-medium text-accent-fg`}>
              <span dir="auto">#{t}</span>
              <button type="button" aria-label={`Remove tag ${t}`} onClick={() => onChange(tags.filter((x) => x !== t), suggested)} className="flex h-9 w-7 items-center justify-center opacity-80">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {suggested.length > 0 && (
        <div>
          <p className="mb-2 flex items-center justify-between text-sm text-muted">
            Suggested: tap to accept
            <button type="button" className="min-h-9 px-1 font-medium text-accent" onClick={() => onChange([...tags, ...suggested.filter((s) => !tags.includes(s))], [])}>
              Accept all
            </button>
          </p>
          <ul className="flex flex-wrap gap-2" aria-label="Suggested tags">
            {suggested.map((t) => (
              <li key={t} className={`${tagChip} border border-dashed border-muted pe-1 ps-4`}>
                <button type="button" dir="auto" className="min-h-9" onClick={() => onChange([...tags, t], suggested.filter((x) => x !== t))} aria-label={`Accept tag ${t}`}>
                  + #{t}
                </button>
                <button type="button" aria-label={`Dismiss suggestion ${t}`} onClick={() => onChange(tags, suggested.filter((x) => x !== t))} className={iconBtn}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2">
        <input
          dir="auto"
          placeholder="Add your own tag"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className={inputCls}
        />
        <button type="button" onClick={add} className={btnGhost}>
          Add
        </button>
      </div>
    </div>
  );
}
