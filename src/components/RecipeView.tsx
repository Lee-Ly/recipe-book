"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useState } from "react";
import { categoryLabel } from "@/lib/categories";
import { formatAmount, formatDuration, LABELS, type UnitMode } from "@/lib/format";
import { LAST_VIEWED_KEY } from "@/lib/last-viewed";
import { isBaking, panFactor } from "@/lib/pan";
import { splitStepTimes } from "@/lib/steps";
import { startTimer } from "@/lib/timer-store";
import type { Pan, Recipe } from "@/lib/types";
import { cardCls, categoryBadge, inputCls, panelCls, tagBadge } from "./ui";

const UNITS: UnitMode[] = ["cups", "grams", "ml"];
const smallBtn = "inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-bold active:opacity-70";

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div dir="ltr" className="inline-flex rounded-xl border border-line bg-accent-soft p-1" role="group">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={`min-h-9 rounded-lg px-3.5 text-sm font-bold ${value === o.id ? "bg-background shadow-sm" : "text-muted"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

interface PanDraft {
  shape: Pan["shape"];
  a: string;
  b: string;
}

const toPanDraft = (p: Pan): PanDraft => ({ shape: p.shape, a: String(p.a), b: String(p.b ?? p.a) });

function parsePanDraft(d: PanDraft): Pan | null {
  const a = parseFloat(d.a);
  const b = parseFloat(d.b);
  if (!(a > 0)) return null;
  if (d.shape === "rect") return b > 0 ? { shape: "rect", a, b } : null;
  return { shape: d.shape, a, b: null };
}

/** Baking recipes scale by pan size, cooking recipes by number of people. Nothing here is saved. */
function Scaler({ recipe, editable, onFactor }: { recipe: Recipe; editable: boolean; onFactor: (f: number) => void }) {
  const labels = recipe.language === "he" ? LABELS.he : LABELS.en;
  const baking = isBaking(recipe.categories);
  const [pan, setPan] = useState<PanDraft | null>(recipe.pan ? toPanDraft(recipe.pan) : null);
  const [people, setPeople] = useState(recipe.servings ?? 0);

  function applyPan(next: PanDraft | null) {
    setPan(next);
    const parsed = next ? parsePanDraft(next) : null;
    onFactor(recipe.pan && parsed ? panFactor(recipe.pan, parsed) : 1);
  }

  function applyPeople(n: number) {
    setPeople(n);
    onFactor(recipe.servings ? n / recipe.servings : 1);
  }

  const editLink = editable && (
    <Link href={`/recipes/${recipe.id}/edit`} className="text-sm font-medium text-accent">
      {baking ? labels.setPan : labels.setServings}
    </Link>
  );

  if (baking) {
    if (!recipe.pan || !pan) return editLink ? <div className="mb-4">{editLink}</div> : null;
    const changed = JSON.stringify(pan) !== JSON.stringify(toPanDraft(recipe.pan));
    return (
      <div className={`mb-4 ${panelCls} p-3`} dir="ltr">
        <p className="mb-2 text-sm text-muted" dir={recipe.language === "he" ? "rtl" : "ltr"}>
          {labels.bakingIn}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Pan shape"
            value={pan.shape}
            onChange={(e) => applyPan({ ...pan, shape: e.target.value as Pan["shape"] })}
            className="min-h-11 rounded-xl bg-background px-3 text-base"
          >
            <option value="round">{LABELS.en.round}</option>
            <option value="square">{LABELS.en.square}</option>
            <option value="rect">{LABELS.en.rect}</option>
          </select>
          <input aria-label="Pan size in cm" inputMode="decimal" type="number" min="1" step="any" value={pan.a} onChange={(e) => applyPan({ ...pan, a: e.target.value })} className="min-h-11 w-20 rounded-xl bg-background px-3 text-base" />
          {pan.shape === "rect" && (
            <>
              <span className="text-muted">×</span>
              <input aria-label="Pan width in cm" inputMode="decimal" type="number" min="1" step="any" value={pan.b} onChange={(e) => applyPan({ ...pan, b: e.target.value })} className="min-h-11 w-20 rounded-xl bg-background px-3 text-base" />
            </>
          )}
          <span className="text-sm text-muted">cm</span>
          {changed && (
            <button type="button" onClick={() => applyPan(toPanDraft(recipe.pan!))} className="ms-auto text-sm font-medium text-accent">
              {labels.reset}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!recipe.servings) return editLink ? <div className="mb-4">{editLink}</div> : null;
  return (
    <div className={`mb-4 flex items-center justify-between ${panelCls} p-3 ps-4`}>
      <span className="text-sm text-muted">{labels.serves}</span>
      <div dir="ltr" className="flex items-center gap-1">
        <button type="button" aria-label="Fewer people" disabled={people <= 1} onClick={() => applyPeople(people - 1)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-background text-xl disabled:opacity-40">
          −
        </button>
        <span className="min-w-8 text-center text-lg font-semibold tabular-nums">{people}</span>
        <button type="button" aria-label="More people" onClick={() => applyPeople(people + 1)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-background text-xl">
          +
        </button>
      </div>
    </div>
  );
}

function Notes({ id, initial, he }: { id: string; initial: string; he: boolean }) {
  const labels = he ? LABELS.he : LABELS.en;
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/recipes/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ notes: draft }) });
      if (!res.ok) throw new Error();
      setSaved(draft);
      setEditing(false);
    } catch {
      setError("Couldn't save the note.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{labels.notes}</h2>
        {!editing && saved && (
          <button type="button" onClick={() => setEditing(true)} className="min-h-11 px-1 text-sm font-medium text-accent">
            {labels.edit}
          </button>
        )}
      </div>
      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea dir="auto" rows={4} autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} className={inputCls} />
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={save} className={`${smallBtn} bg-accent text-accent-fg`}>
              {labels.save}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(saved);
                setEditing(false);
              }}
              className={`${smallBtn} bg-accent-soft`}
            >
              {labels.cancel}
            </button>
          </div>
        </div>
      ) : saved ? (
        <p dir="auto" className="whitespace-pre-wrap text-[17px] leading-relaxed">
          {saved}
        </p>
      ) : (
        <button type="button" onClick={() => setEditing(true)} className={`${smallBtn} bg-accent-soft`}>
          + {labels.addNote}
        </button>
      )}
    </section>
  );
}

/**
 * The recipe itself. Used by the owner (shareToken undefined) and by the public share page,
 * which gets read-only content without notes.
 */
export default function RecipeView({ recipe, shareToken }: { recipe: Recipe; shareToken?: string }) {
  const he = recipe.language === "he";
  const labels = he ? LABELS.he : LABELS.en;
  const owner = !shareToken;
  const [unit, setUnit] = useState<UnitMode>("grams");
  const [factor, setFactor] = useState(1);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [current, setCurrent] = useState<number | null>(null);

  useEffect(() => {
    if (!owner) return;
    try {
      localStorage.setItem(LAST_VIEWED_KEY, recipe.id);
    } catch {
      /* storage blocked: "Continue cooking" just won't remember */
    }
  }, [owner, recipe.id]);

  const imageSrc = recipe.image ? `/api/img/${recipe.image}${shareToken ? `?t=${shareToken}` : ""}` : null;
  const facts = [
    recipe.ovenCelsius != null ? `${labels.oven} ${recipe.ovenCelsius}°C` : "",
    recipe.totalMinutes ? formatDuration(recipe.totalMinutes, recipe.language) : "",
  ].filter(Boolean);

  function toggle(i: number) {
    setChecked((cur) => {
      const next = new Set(cur);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <article dir={he ? "rtl" : "ltr"} className="mx-auto max-w-2xl">
      {imageSrc && (
        <img src={imageSrc} alt="" className="-mx-4 mb-5 aspect-[4/3] w-[calc(100%+2rem)] max-w-none object-cover sm:mx-0 sm:w-full sm:rounded-2xl" />
      )}

      <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight">{recipe.title}</h1>
      {recipe.author && (
        <p className="mt-1 text-sm text-muted">
          <bdi>{recipe.author}</bdi>
        </p>
      )}
      {facts.length > 0 && (
        <p className="mt-2 text-sm text-muted">
          {facts.map((f, i) => (
            <span key={f}>
              {i > 0 && " · "}
              <bdi>{f}</bdi>
            </span>
          ))}
        </p>
      )}

      {(recipe.categories.length > 0 || recipe.tags.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {recipe.categories.map((c) => (
            <span key={c} className={categoryBadge}>
              {categoryLabel(c, recipe.language)}
            </span>
          ))}
          {recipe.tags.map((t) =>
            owner ? (
              <Link key={t} href={`/?q=${encodeURIComponent(t)}`} className={tagBadge}>
                {t}
              </Link>
            ) : (
              <span key={t} className={tagBadge}>
                {t}
              </span>
            ),
          )}
        </div>
      )}

      {recipe.ingredients.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">{labels.ingredients}</h2>
            <Segmented value={unit} onChange={setUnit} options={UNITS.map((u) => ({ id: u, label: labels.units[u] }))} />
          </div>
          <Scaler recipe={recipe} editable={owner} onFactor={setFactor} />
          <ul className="flex flex-col">
            {recipe.ingredients.map((ing, i) => {
              const amount = formatAmount(ing, recipe.language, unit, factor);
              const on = checked.has(i);
              return (
                <li key={i}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggle(i)}
                    className={`flex min-h-12 w-full items-center gap-3 border-b border-line py-2 text-start ${on ? "opacity-45" : ""}`}
                  >
                    <span aria-hidden className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-sm leading-none ${on ? "border-accent bg-accent text-accent-fg" : "border-muted/50"}`}>
                      {on && "✓"}
                    </span>
                    <span className={`text-[17px] leading-snug ${on ? "line-through" : ""}`}>
                      {amount && (
                        <bdi className="me-2 font-semibold text-accent">
                          {amount}
                        </bdi>
                      )}
                      {ing.name}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {recipe.ingredients.some((i) => i.converted) && <p className="mt-3 text-xs text-muted">{labels.estimate}</p>}
        </section>
      )}

      {recipe.steps.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">{labels.steps}</h2>
          <ol className="flex flex-col gap-3">
            {recipe.steps.map((step, i) => {
              const active = current === i;
              return (
                <li
                  key={i}
                  tabIndex={0}
                  aria-current={active ? "step" : undefined}
                  onClick={() => setCurrent(active ? null : i)}
                  onKeyDown={(e) => {
                    if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      setCurrent(active ? null : i);
                    }
                  }}
                  className={`flex cursor-pointer gap-4 ${cardCls} p-3.5 ${active ? "border-foreground ring-2 ring-foreground/10" : ""}`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base font-semibold ${active ? "bg-accent text-accent-fg" : "bg-accent-soft text-accent"}`}>{i + 1}</span>
                  <span className="pt-0.5 text-[17px] leading-relaxed">
                    {splitStepTimes(step).map((p, k) =>
                      "seconds" in p ? (
                        <button
                          key={k}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            startTimer(`${i + 1}. ${recipe.title}`, p.seconds);
                          }}
                          className="mx-0.5 inline-flex min-h-8 items-center gap-1 rounded-lg bg-accent/15 px-2.5 font-semibold text-accent active:bg-accent active:text-accent-fg"
                        >
                          <span aria-hidden>⏱</span>
                          <bdi>{p.text}</bdi>
                        </button>
                      ) : (
                        <span key={k}>{p.text}</span>
                      ),
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {owner && <Notes id={recipe.id} initial={recipe.notes} he={he} />}

      {recipe.sourceUrl && (
        <p dir="ltr" className="mt-8 truncate text-sm text-muted">
          <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
            {labels.source}
          </a>
        </p>
      )}
    </article>
  );
}
