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
import { CheckIcon, TimerIcon } from "./icons";
import { btnDark, btnGhost, btnText, categoryPill, cardCls, inputCls, panelCls, rowCls, sectionTitle, tagPill } from "./ui";

const UNITS: UnitMode[] = ["cups", "grams", "ml"];

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
    <section className={`${panelCls} space-y-3 p-4`}>
      <div className="flex items-center justify-between">
        <h2 className={sectionTitle}>{labels.notes}</h2>
        {!editing && saved && (
          <button type="button" onClick={() => setEditing(true)} className={btnText}>
            {labels.edit}
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea dir="auto" rows={4} autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} className={`${inputCls} font-normal leading-relaxed`} />
          {error && (
            <p role="alert" className="text-xs text-red-600">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={save} className={btnDark}>
              {labels.save}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(saved);
                setEditing(false);
              }}
              className={btnGhost}
            >
              {labels.cancel}
            </button>
          </div>
        </div>
      ) : saved ? (
        <p dir="auto" className="whitespace-pre-wrap text-sm leading-relaxed">
          {saved}
        </p>
      ) : (
        <button type="button" onClick={() => setEditing(true)} className={btnGhost}>
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
  const baking = isBaking(recipe.categories);
  const [unit, setUnit] = useState<UnitMode>("grams");
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [current, setCurrent] = useState<number | null>(null);
  const [pan, setPan] = useState<PanDraft | null>(recipe.pan ? toPanDraft(recipe.pan) : null);
  const [people, setPeople] = useState(recipe.servings ?? 0);

  useEffect(() => {
    if (!owner) return;
    try {
      localStorage.setItem(LAST_VIEWED_KEY, recipe.id);
    } catch {
      /* storage blocked: "Continue cooking" just won't remember */
    }
  }, [owner, recipe.id]);

  const panParsed = pan ? parsePanDraft(pan) : null;
  const factor = baking ? (recipe.pan && panParsed ? panFactor(recipe.pan, panParsed) : 1) : recipe.servings ? people / recipe.servings : 1;
  const panChanged = !!recipe.pan && !!pan && JSON.stringify(pan) !== JSON.stringify(toPanDraft(recipe.pan));

  const imageSrc = recipe.image ? `/api/img/${recipe.image}${shareToken ? `?t=${shareToken}` : ""}` : null;
  const facts = [
    recipe.ovenCelsius != null ? `${labels.oven} ${recipe.ovenCelsius}°C` : "",
    recipe.totalMinutes ? formatDuration(recipe.totalMinutes, recipe.language) : "",
  ].filter(Boolean);
  const progress = he ? `${checked.size} מתוך ${recipe.ingredients.length} ${labels.prepped}` : `${checked.size} of ${recipe.ingredients.length} ${labels.prepped}`;

  function toggle(i: number) {
    setChecked((cur) => {
      const next = new Set(cur);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const missingLink = owner && (baking ? !recipe.pan : !recipe.servings) && (
    <Link href={`/recipes/${recipe.id}/edit`} className={btnText}>
      {baking ? labels.setPan : labels.setServings}
    </Link>
  );

  return (
    <article dir={he ? "rtl" : "ltr"} className="mx-auto max-w-2xl space-y-6 pt-4">
      {imageSrc && (
        <div className="aspect-video w-full overflow-hidden rounded-2xl border border-line bg-accent-soft shadow-sm">
          <img src={imageSrc} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <div className="space-y-2.5">
        <h1 className="text-2xl font-bold leading-tight">{recipe.title}</h1>
        {(recipe.author || facts.length > 0) && (
          <p className="text-sm text-muted">
            {[recipe.author, ...facts].filter(Boolean).map((f, i) => (
              <span key={f}>
                {i > 0 && " · "}
                <bdi>{f}</bdi>
              </span>
            ))}
          </p>
        )}
        {(recipe.categories.length > 0 || recipe.tags.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {recipe.categories.map((c) => (
              <span key={c} className={categoryPill}>
                {categoryLabel(c, recipe.language)}
              </span>
            ))}
            {recipe.tags.map((t) =>
              owner ? (
                <Link key={t} href={`/?q=${encodeURIComponent(t)}`} className={`${tagPill} transition hover:border-foreground active:border-foreground`}>
                  {t}
                </Link>
              ) : (
                <span key={t} className={tagPill}>
                  {t}
                </span>
              ),
            )}
          </div>
        )}
      </div>

      {recipe.ingredients.length > 0 && (
        <section className={`${panelCls} space-y-3.5 p-4`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className={sectionTitle}>{labels.ingredients}</h2>
              <span className="text-[11px] font-medium tabular-nums text-muted">{progress}</span>
            </div>
            <div className="flex items-center gap-2" dir="ltr">
              <div className="inline-flex rounded-lg border border-line bg-card p-0.5 text-[11px] font-bold" role="group">
                {UNITS.map((u) => (
                  <button
                    key={u}
                    type="button"
                    aria-pressed={unit === u}
                    onClick={() => setUnit(u)}
                    className={`rounded-md px-2 py-1 transition ${unit === u ? "bg-foreground text-background" : "text-chip-text hover:text-foreground active:text-foreground"}`}
                  >
                    {labels.units[u]}
                  </button>
                ))}
              </div>
              {!baking && recipe.servings ? (
                <div className="inline-flex items-center rounded-lg border border-line bg-card px-1.5 py-0.5 text-xs font-bold tabular-nums">
                  <button type="button" aria-label="Fewer people" disabled={people <= 1} onClick={() => setPeople(people - 1)} className="flex h-6 w-6 items-center justify-center text-chip-text hover:text-accent active:text-accent disabled:opacity-40">
                    &minus;
                  </button>
                  <span className="px-1.5">{people}</span>
                  <button type="button" aria-label="More people" onClick={() => setPeople(people + 1)} className="flex h-6 w-6 items-center justify-center text-chip-text hover:text-accent active:text-accent">
                    &plus;
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {baking && recipe.pan && pan && (
            <div dir="ltr" className={`flex flex-wrap items-center gap-2 p-2 ${rowCls}`}>
              <span className="px-1 text-[11px] font-bold text-muted">{he ? "Baking in" : labels.bakingIn}</span>
              <select aria-label="Pan shape" value={pan.shape} onChange={(e) => setPan({ ...pan, shape: e.target.value as Pan["shape"] })} className="rounded-lg bg-accent-soft px-2 py-1.5 text-base font-bold text-ink-2 outline-none">
                <option value="round">{LABELS.en.round}</option>
                <option value="square">{LABELS.en.square}</option>
                <option value="rect">{LABELS.en.rect}</option>
              </select>
              <input aria-label="Pan size in cm" inputMode="decimal" type="number" min="1" step="any" value={pan.a} onChange={(e) => setPan({ ...pan, a: e.target.value })} className="w-16 rounded-lg bg-accent-soft px-2 py-1.5 text-center text-base font-bold tabular-nums outline-none" />
              {pan.shape === "rect" && (
                <>
                  <span className="text-muted">×</span>
                  <input aria-label="Pan width in cm" inputMode="decimal" type="number" min="1" step="any" value={pan.b} onChange={(e) => setPan({ ...pan, b: e.target.value })} className="w-16 rounded-lg bg-accent-soft px-2 py-1.5 text-center text-base font-bold tabular-nums outline-none" />
                </>
              )}
              <span className="text-[11px] font-bold text-muted">cm</span>
              {panChanged && (
                <button type="button" onClick={() => setPan(toPanDraft(recipe.pan!))} className={`${btnText} ms-auto`}>
                  {labels.reset}
                </button>
              )}
            </div>
          )}
          {missingLink}

          <ul className="space-y-2">
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
                    className={`flex min-h-[48px] w-full select-none items-center gap-3 px-3.5 py-2.5 text-start transition ${rowCls} ${on ? "border-line/60 opacity-50" : "hover:border-foreground active:border-foreground"}`}
                  >
                    <span aria-hidden className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${on ? "border-foreground bg-foreground text-background" : "border-line-strong bg-card"}`}>
                      {on && <CheckIcon className="h-3.5 w-3.5" />}
                    </span>
                    {amount && (
                      <bdi className="min-w-[68px] text-xs font-bold tabular-nums text-accent">{amount}</bdi>
                    )}
                    <span className={`text-sm font-medium ${on ? "text-muted line-through" : ""}`}>{ing.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {recipe.ingredients.some((i) => i.converted) && <p className="text-[11px] text-muted">{labels.estimate}</p>}
        </section>
      )}

      {recipe.steps.length > 0 && (
        <section className="space-y-3">
          <h2 className={sectionTitle}>{labels.steps}</h2>
          <div className="space-y-3">
            {recipe.steps.map((step, i) => {
              const active = current === i;
              return (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  aria-current={active ? "step" : undefined}
                  onClick={() => setCurrent(active ? null : i)}
                  onKeyDown={(e) => {
                    if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      setCurrent(active ? null : i);
                    }
                  }}
                  className={`cursor-pointer p-4 ${cardCls} ${active ? "border-foreground shadow-sm ring-2 ring-foreground/10" : "hover:border-line-strong active:border-line-strong"}`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold text-white ${active ? "bg-accent" : "bg-foreground text-background"}`}>{i + 1}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? "text-accent" : "text-muted-2"}`}>{he ? (active ? "שלב נוכחי" : `שלב ${i + 1}`) : active ? "Active Step" : `Step ${i + 1}`}</span>
                  </div>
                  <p className="text-sm leading-relaxed">
                    {splitStepTimes(step).map((p, k) =>
                      "seconds" in p ? (
                        <button
                          key={k}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            startTimer(`${i + 1}. ${recipe.title}`, p.seconds);
                          }}
                          className="mx-0.5 inline-flex items-center gap-1 rounded-lg bg-accent/15 px-2.5 py-0.5 text-xs font-bold text-accent transition hover:bg-accent hover:text-accent-fg active:bg-accent active:text-accent-fg"
                        >
                          <TimerIcon className="h-3.5 w-3.5" />
                          <bdi>{p.text}</bdi>
                        </button>
                      ) : (
                        <span key={k}>{p.text}</span>
                      ),
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {owner && <Notes id={recipe.id} initial={recipe.notes} he={he} />}

      {recipe.sourceUrl && (
        <p dir="ltr" className="truncate text-xs text-muted">
          <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
            {labels.source}
          </a>
        </p>
      )}
    </article>
  );
}
