"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useState } from "react";
import { categoryName, type Category } from "@/lib/categories";
import { formatAmount, formatDuration, LABELS, type UnitMode } from "@/lib/format";
import { LAST_VIEWED_KEY } from "@/lib/last-viewed";
import { isSeasoning, matchPreset, PAN_PRESETS, panArea, SERVINGS_OPTIONS, seasoningFactor } from "@/lib/pan";
import { splitStepTimes } from "@/lib/steps";
import { startTimer } from "@/lib/timer-store";
import type { Pan, Recipe } from "@/lib/types";
import { CheckIcon, TimerIcon } from "./icons";
import TileSelect, { type TileOption } from "./TileSelect";
import { btnDark, btnGhost, btnText, categoryPill, cardCls, fieldLabel, inputCls, panelCls, rowCls, sectionTitle, tagPill } from "./ui";

const UNITS: UnitMode[] = ["cups", "grams", "ml"];

/** "עגולה 20 ס״מ", "Round 20 cm", "20 × 30 cm". */
function panText(pan: Pan, he: boolean): string {
  const unit = he ? "ס״מ" : "cm";
  if (pan.shape === "rect") return he ? `⁦${pan.a}×${pan.b ?? pan.a}⁩ ${unit}` : `${pan.a} × ${pan.b ?? pan.a} ${unit}`;
  const shape = he ? (pan.shape === "round" ? LABELS.he.round : LABELS.he.square) : pan.shape === "round" ? LABELS.en.round : LABELS.en.square;
  return `${shape} ${pan.a} ${unit}`;
}

/** "314 סמ״ר" / "314 cm²" (rounded to a whole number). */
function areaText(area: number, he: boolean): string {
  return `${Math.round(area)} ${he ? "סמ״ר" : "cm²"}`;
}

/** The website name of a link, for recipes that have no author. */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
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
export default function RecipeView({ recipe, categories, shareToken, readOnly = false }: { recipe: Recipe; categories: Category[]; shareToken?: string; readOnly?: boolean }) {
  const he = recipe.language === "he";
  const labels = he ? LABELS.he : LABELS.en;
  const owner = !shareToken;
  const [unit, setUnit] = useState<UnitMode>("grams");
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [current, setCurrent] = useState<number | null>(null);
  const [people, setPeople] = useState(recipe.servings ?? 0);
  const originalPreset = recipe.pan ? matchPreset(recipe.pan) : undefined;
  const [panId, setPanId] = useState(originalPreset?.id ?? "original");

  useEffect(() => {
    if (!owner) return;
    try {
      localStorage.setItem(LAST_VIEWED_KEY, recipe.id);
    } catch {
      /* storage blocked: "Continue cooking" just won't remember */
    }
  }, [owner, recipe.id]);

    // A recipe that states a pan is scaled by pan (whatever its category); otherwise by the number of people.
  const canScalePan = !!recipe.pan;
  const canScalePeople = !canScalePan && !!recipe.servings;
  const chosenPan = PAN_PRESETS.find((p) => p.id === panId);
  const factor = canScalePan && recipe.pan && chosenPan ? chosenPan.area / panArea(recipe.pan) : canScalePeople && recipe.servings ? people / recipe.servings : 1;
  const panOptions: TileOption[] = [
    ...(!originalPreset && recipe.pan ? [{ value: "original", label: panText(recipe.pan, he), hint: areaText(panArea(recipe.pan), he), original: true }] : []),
    ...PAN_PRESETS.map((p) => ({ value: p.id, label: he ? p.he : p.en, hint: areaText(p.area, he), original: p.id === originalPreset?.id })),
  ];
  const seasoningsAdjusted = canScalePeople && factor > 1.5 && recipe.ingredients.some((i) => isSeasoning(i.name));
  const peopleCounts = [...new Set([...SERVINGS_OPTIONS, recipe.servings ?? 0])].filter((n) => n > 0).sort((a, b) => a - b);

  const imageSrc = recipe.image ? `/api/img/${recipe.image}${shareToken ? `?t=${shareToken}` : ""}` : null;
  const byline = recipe.author || hostOf(recipe.sourceUrl);
  // The recipe's details, shown as small tiles under the categories. Only the ones that are filled in.
  const details: { label: string; value: string; control?: "pan" | "people" }[] = [
    recipe.ovenCelsius != null ? { label: labels.oven, value: `${recipe.ovenCelsius}°C` } : null,
    recipe.totalMinutes ? { label: labels.time, value: formatDuration(recipe.totalMinutes, recipe.language) } : null,
    recipe.servings ? { label: labels.serves, value: String(recipe.servings), control: canScalePeople ? ("people" as const) : undefined } : null,
    recipe.pan ? { label: labels.pan, value: panText(recipe.pan, he), control: canScalePan ? ("pan" as const) : undefined } : null,
  ].filter((d): d is NonNullable<typeof d> => d !== null);
  const progress = he ? `${checked.size} מתוך ${recipe.ingredients.length} ${labels.prepped}` : `${checked.size} of ${recipe.ingredients.length} ${labels.prepped}`;

  function toggle(i: number) {
    setChecked((cur) => {
      const next = new Set(cur);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <article dir={he ? "rtl" : "ltr"} className="mx-auto max-w-2xl space-y-6 pt-4">
      {imageSrc && (
        <div className="aspect-video w-full overflow-hidden rounded-2xl border border-line bg-accent-soft shadow-sm">
          <img src={imageSrc} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <div className="space-y-2.5">
        <h1 className="text-2xl font-bold leading-tight">{recipe.title}</h1>
        {byline && (
          <p className="text-sm font-medium text-muted">
            <bdi>{byline}</bdi>
          </p>
        )}
        {recipe.categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {recipe.categories.map((c) => (
              <span key={c} className={categoryPill}>
                {categoryName(categories, c, recipe.language)}
              </span>
            ))}
          </div>
        )}
      </div>

      {details.length > 0 && (
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {details.map((d) => (
            <div key={d.label} className="rounded-xl border border-line bg-accent-soft px-3 py-2">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-muted">{d.label}</dt>
              <dd className="mt-0.5 text-sm font-bold">
                {d.control === "pan" ? (
                  <TileSelect label={labels.pan} originalLabel={he ? "מקורי" : "original"} value={panId} onChange={setPanId} options={panOptions} />
                ) : d.control === "people" ? (
                  <TileSelect label={labels.serves} originalLabel={he ? "מקורי" : "original"} value={String(people)} onChange={(v) => setPeople(Number(v))} options={peopleCounts.map((n) => ({ value: String(n), label: String(n), original: n === recipe.servings }))} />
                ) : (
                  <bdi>{d.value}</bdi>
                )}
                {d.control === "pan" && recipe.pan && factor !== 1 && (
                  <span className="mt-0.5 block text-[10px] font-medium text-muted">
                    <bdi>{`${he ? "מקורי" : "Original"}: ${panText(recipe.pan, he)} · ${areaText(panArea(recipe.pan), he)}`}</bdi>
                  </span>
                )}
                {d.control === "people" && recipe.servings && people !== recipe.servings && (
                  <span className="mt-0.5 block text-[10px] font-medium text-muted">
                    <bdi>{`${he ? "מקורי" : "Original"}: ${recipe.servings}`}</bdi>
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}

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
            </div>
          </div>

          <ul className="space-y-2">
            {recipe.ingredients.map((ing, i) => {
              const amount = formatAmount(ing, recipe.language, unit, canScalePeople && isSeasoning(ing.name) ? seasoningFactor(factor) : factor);
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
                    {amount && <bdi className="inline-block w-[76px] shrink-0 text-start text-xs font-bold tabular-nums text-accent">{amount}</bdi>}
                    <span className={`text-sm font-medium ${on ? "text-muted line-through" : ""}`}>{ing.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {recipe.ingredients.some((i) => i.converted) && <p className="text-[11px] text-muted">{labels.estimate}</p>}
          {factor !== 1 && (
            <p className="text-[11px] text-muted">
              <bdi>×{Math.round(factor * 100) / 100}</bdi>
              {seasoningsAdjusted ? (he ? " · מלח ותבלינים הוגדלו עד ×1.5 בלבד. טעמו והתאימו." : " · Salt and spices grow by 1.5x at most. Taste and adjust.") : ""}
            </p>
          )}
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
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold ${active ? "bg-accent text-white" : "bg-foreground text-background"}`}>{i + 1}</span>
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

      {owner && !readOnly && <Notes id={recipe.id} initial={recipe.notes} he={he} />}

      {recipe.tags.length > 0 && (
        <section>
          <h2 className={fieldLabel}>{labels.tags}</h2>
          <div className="flex flex-wrap items-center gap-1.5">
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
        </section>
      )}

      {recipe.sourceUrl && (
        <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" dir="ltr" className="block truncate text-xs text-muted underline">
          {recipe.sourceUrl}
        </a>
      )}
    </article>
  );
}
