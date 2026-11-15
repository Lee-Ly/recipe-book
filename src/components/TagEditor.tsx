"use client";

import { useId, useState } from "react";
import { btnDark, btnText, inputCls } from "./ui";

interface Props {
  tags: string[];
  suggested: string[];
  /** Every tag that already exists on the site, offered while typing */
  available: string[];
  onChange: (tags: string[], suggested: string[]) => void;
}

/**
 * Tags as in the mockup: an input with a black "+ Add" button, accepted tags as white chips with ×.
 * Suggested tags are dashed chips: tap one to accept it.
 */
export default function TagEditor({ tags, suggested, available, onChange }: Props) {
  const [draft, setDraft] = useState("");
  const listId = useId();

  function add() {
    const t = draft.trim().replace(/^#/, "");
    setDraft("");
    if (!t || tags.some((x) => x.toLowerCase() === t.toLowerCase())) return;
    onChange([...tags, t], suggested.filter((s) => s !== t));
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <input
          dir="auto"
          list={listId}
          placeholder="Add a tag (e.g., Spicy, Comfort)..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className={`${inputCls} min-w-0 flex-1 py-2`}
        />
        <datalist id={listId}>
          {available
            .filter((t) => !tags.includes(t))
            .map((t) => (
              <option key={t} value={t} />
            ))}
        </datalist>
        <button type="button" onClick={add} className={btnDark}>
          + Add
        </button>
      </div>

      <div className="flex min-h-[26px] flex-wrap gap-1.5" aria-label="Accepted tags">
        {tags.length === 0 ? (
          <span className="text-[11px] italic text-muted-2">No tags added yet</span>
        ) : (
          tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1 text-xs font-semibold">
              <span dir="auto">{t}</span>
              <button type="button" aria-label={`Remove tag ${t}`} onClick={() => onChange(tags.filter((x) => x !== t), suggested)} className="font-bold text-muted-2 transition hover:text-accent active:text-accent">
                &times;
              </button>
            </span>
          ))
        )}
      </div>

      {suggested.length > 0 && (
        <div className="space-y-1.5">
          <p className="flex items-center justify-between text-[11px] font-medium text-muted">
            <span>Suggested: tap a tag to accept it</span>
            <button type="button" className={btnText} onClick={() => onChange([...tags, ...suggested.filter((s) => !tags.includes(s))], [])}>
              Accept all
            </button>
          </p>
          <div className="flex flex-wrap gap-1.5" aria-label="Suggested tags">
            {suggested.map((t) => (
              <button
                key={t}
                type="button"
                dir="auto"
                aria-label={`Accept tag ${t}`}
                onClick={() => onChange([...tags, t], suggested.filter((x) => x !== t))}
                className="inline-flex items-center rounded-lg border border-dashed border-line-strong bg-card px-2.5 py-1 text-xs font-semibold text-chip-text transition hover:border-foreground hover:text-foreground active:border-foreground active:text-foreground"
              >
                + {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
