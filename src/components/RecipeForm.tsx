"use client";

/* eslint-disable @next/next/no-img-element */
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { categoryLabel, DEFAULT_CATEGORIES } from "@/lib/categories";
import { PAN_SHAPES } from "@/lib/pan";
import type { Ingredient, Pan, RecipeDraft } from "@/lib/types";
import TagEditor from "./TagEditor";
import { btnGhost, btnPrimary, btnText, filterChip, inputCls } from "./ui";

export interface FormInitial extends RecipeDraft {
  sourceUrl: string;
  /** Photo found on the source page (create) */
  remoteImageUrl: string;
  /** Photo already stored for this recipe (edit) */
  storedImage: string | null;
}

type Mode = { kind: "create" } | { kind: "edit"; id: string };

interface IngredientRow {
  name: string;
  original: string;
  cups: string;
  grams: string;
  ml: string;
  converted: boolean;
}

const toRow = (i: Ingredient): IngredientRow => ({
  name: i.name,
  original: i.original,
  cups: i.cups?.toString() ?? "",
  grams: i.grams?.toString() ?? "",
  ml: i.ml?.toString() ?? "",
  converted: i.converted,
});

const toNumber = (s: string): number | null => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
};

const emptyRow: IngredientRow = { name: "", original: "", cups: "", grams: "", ml: "", converted: false };

const sectionTitle = "mb-2 block text-sm font-semibold";

export default function RecipeForm({ initial, mode }: { initial: FormInitial; mode: Mode }) {
  const router = useRouter();
  const editing = mode.kind === "edit";
  const [title, setTitle] = useState(initial.title);
  const [sourceUrl, setSourceUrl] = useState(initial.sourceUrl);
  const [rows, setRows] = useState<IngredientRow[]>(initial.ingredients.map(toRow));
  const [steps, setSteps] = useState<string[]>(initial.steps.length ? initial.steps : [""]);
  const [author, setAuthor] = useState(initial.author);
  const [oven, setOven] = useState(initial.ovenCelsius?.toString() ?? "");
  const [minutes, setMinutes] = useState(initial.totalMinutes?.toString() ?? "");
  const [servings, setServings] = useState(initial.servings?.toString() ?? "");
  const [panShape, setPanShape] = useState<Pan["shape"] | "">(initial.pan?.shape ?? "");
  const [panA, setPanA] = useState(initial.pan?.a.toString() ?? "");
  const [panB, setPanB] = useState(initial.pan?.b?.toString() ?? "");
  // When creating, suggested tags wait for your approval; when editing they are already accepted.
  const [tags, setTags] = useState<string[]>(editing ? initial.tags : []);
  const [suggested, setSuggested] = useState<string[]>(editing ? [] : initial.tags);
  const [categories, setCategories] = useState<string[]>(initial.categories);
  const [customCategory, setCustomCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const shownImage = removeImage
    ? null
    : (preview ?? (initial.storedImage ? `/api/img/${initial.storedImage}` : initial.remoteImageUrl || null));

  const he = initial.language === "he";
  const allCategories = [...DEFAULT_CATEGORIES.map((c) => c.id), ...categories.filter((c) => !DEFAULT_CATEGORIES.some((d) => d.id === c))];

  function setRow(i: number, patch: Partial<IngredientRow>) {
    // Editing an amount means you've checked it, so it's no longer an estimate.
    const touchesAmount = "cups" in patch || "grams" in patch || "ml" in patch;
    setRows((cur) => cur.map((r, idx) => (idx === i ? { ...r, ...patch, ...(touchesAmount ? { converted: false } : {}) } : r)));
  }

  function setStep(i: number, text: string) {
    setSteps((cur) => cur.map((s, idx) => (idx === i ? text : s)));
  }

  function moveStep(i: number, dir: -1 | 1) {
    setSteps((cur) => {
      const j = i + dir;
      if (j < 0 || j >= cur.length) return cur;
      const next = [...cur];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function toggleCategory(id: string) {
    setCategories((cur) => (cur.includes(id) ? cur.filter((c) => c !== id) : [...cur, id]));
  }

  function addCustomCategory() {
    const c = customCategory.trim();
    if (c && !categories.includes(c)) setCategories([...categories, c]);
    setCustomCategory("");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please give the recipe a title.");
      return;
    }
    setBusy(true);
    setError("");
    const ingredients: Ingredient[] = rows
      .filter((r) => r.name.trim() || r.original.trim())
      .map((r) => ({
        name: r.name.trim(),
        original: r.original.trim(),
        cups: toNumber(r.cups),
        grams: toNumber(r.grams),
        ml: toNumber(r.ml),
        converted: r.converted,
      }));
    const a = toNumber(panA);
    const pan: Pan | null = panShape && a && a > 0 ? { shape: panShape, a, b: panShape === "rect" ? (toNumber(panB) ?? a) : null } : null;
    const data = {
      title: title.trim(),
      language: initial.language,
      author: author.trim(),
      ingredients,
      steps: steps.map((s) => s.trim()).filter(Boolean),
      ovenCelsius: toNumber(oven),
      totalMinutes: toNumber(minutes),
      servings: toNumber(servings),
      pan,
      tags,
      categories,
      sourceUrl: sourceUrl.trim(),
      imageUrl: removeImage || file ? "" : initial.remoteImageUrl,
      removeImage,
    };
    const body = new FormData();
    body.set("data", JSON.stringify(data));
    if (file) body.set("file", file);
    try {
      const res = await fetch(editing ? `/api/recipes/${mode.id}` : "/api/recipes", { method: editing ? "PUT" : "POST", body });
      const json = (await res.json()) as { id?: string; error?: string; imageWarning?: string | null };
      if (!res.ok || !json.id) throw new Error(json.error ?? "Couldn't save the recipe.");
      router.push(`/recipes/${json.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the recipe.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-8">
      <section>
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-accent-soft">
          {shownImage ? (
            <img src={shownImage} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted">No photo</div>
          )}
        </div>
        <div className="mt-2 flex gap-2">
          <label className={`${btnGhost} cursor-pointer`}>
            {shownImage ? "Change photo" : "Add photo"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setRemoveImage(false);
              }}
            />
          </label>
          {shownImage && (
            <button
              type="button"
              className={`${btnText} text-muted`}
              onClick={() => {
                setFile(null);
                setRemoveImage(true);
              }}
            >
              Remove
            </button>
          )}
        </div>
      </section>

      <section>
        <label htmlFor="title" className={sectionTitle}>
          Title
        </label>
        <input id="title" dir="auto" value={title} onChange={(e) => setTitle(e.target.value)} className={`${inputCls} min-h-12 text-lg font-semibold`} />
      </section>

      <section>
        <label htmlFor="author" className={sectionTitle}>
          Author <span className="font-normal text-muted">Instagram name or website</span>
        </label>
        <input id="author" dir="auto" placeholder="@name" value={author} onChange={(e) => setAuthor(e.target.value)} className={inputCls} />
      </section>

      <section>
        <span className={sectionTitle}>Ingredients</span>
        {rows.length === 0 && <p className="mb-2 text-sm text-muted">No ingredients yet.</p>}
        {rows.some((r) => r.converted) && <p className="mb-3 text-sm text-muted">Amounts were converted automatically (cups, grams, ml). Worth a quick check, especially for baking.</p>}
        <ul className="flex flex-col">
          {rows.map((r, i) => (
            <li key={i} className="border-b border-line py-3 first:pt-0">
              <div className="flex items-center gap-2">
                <input aria-label="Ingredient name" dir="auto" placeholder="Ingredient" value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} className={inputCls} />
                <button type="button" aria-label="Remove ingredient" onClick={() => setRows(rows.filter((_, idx) => idx !== i))} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted active:bg-accent-soft">
                  ✕
                </button>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(["cups", "grams", "ml"] as const).map((f) => (
                  <div key={f} className="relative">
                    <input
                      aria-label={f === "cups" ? "Cups" : f === "grams" ? "Grams" : "Milliliters"}
                      type="number"
                      dir="ltr"
                      inputMode="decimal"
                      step="any"
                      min="0"
                      value={r[f]}
                      onChange={(e) => setRow(i, { [f]: e.target.value })}
                      className={`${inputCls} pe-12 ps-3`}
                    />
                    <span aria-hidden className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted">
                      {f === "cups" ? "cup" : f === "grams" ? "g" : "ml"}
                    </span>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setRows([...rows, { ...emptyRow }])} className={`${btnText} mt-1`}>
          + Add ingredient
        </button>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <label className="text-sm font-semibold">
          Oven °C
          <input type="number" inputMode="numeric" min="0" value={oven} onChange={(e) => setOven(e.target.value)} className={`${inputCls} mt-2 font-normal`} />
        </label>
        <label className="text-sm font-semibold">
          Total minutes
          <input type="number" inputMode="numeric" min="0" value={minutes} onChange={(e) => setMinutes(e.target.value)} className={`${inputCls} mt-2 font-normal`} />
        </label>
        <label className="col-span-2 text-sm font-semibold">
          Serves <span className="font-normal text-muted">people, used to scale cooking recipes</span>
          <input type="number" inputMode="numeric" min="1" value={servings} onChange={(e) => setServings(e.target.value)} className={`${inputCls} mt-2 font-normal`} />
        </label>
      </section>

      <section>
        <span className={sectionTitle}>
          Pan size <span className="font-normal text-muted">used to scale baking recipes</span>
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Pan shape" value={panShape} onChange={(e) => setPanShape(e.target.value as Pan["shape"] | "")} className={`${inputCls} w-auto`}>
            <option value="">No pan</option>
            {PAN_SHAPES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          {panShape && (
            <>
              <input aria-label={panShape === "round" ? "Diameter in cm" : panShape === "square" ? "Side in cm" : "Length in cm"} type="number" inputMode="decimal" min="1" step="any" placeholder={panShape === "round" ? "Diameter" : panShape === "square" ? "Side" : "Length"} value={panA} onChange={(e) => setPanA(e.target.value)} className={`${inputCls} w-28`} />
              {panShape === "rect" && (
                <>
                  <span className="text-muted">×</span>
                  <input aria-label="Width in cm" type="number" inputMode="decimal" min="1" step="any" placeholder="Width" value={panB} onChange={(e) => setPanB(e.target.value)} className={`${inputCls} w-28`} />
                </>
              )}
              <span className="text-sm text-muted">cm</span>
            </>
          )}
        </div>
      </section>

      <section>
        <span className={sectionTitle}>
          Method <span className="font-normal text-muted">times like “10 minutes” become timers</span>
        </span>
        <ol className="flex flex-col gap-3">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-2.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">{i + 1}</span>
              <textarea aria-label={`Step ${i + 1}`} dir="auto" rows={2} value={s} onChange={(e) => setStep(i, e.target.value)} className={inputCls} />
              <div className="flex shrink-0 flex-col">
                <button type="button" aria-label="Move step up" disabled={i === 0} onClick={() => moveStep(i, -1)} className="flex h-8 w-9 items-center justify-center rounded-lg text-muted active:bg-accent-soft disabled:opacity-30">
                  ↑
                </button>
                <button type="button" aria-label="Move step down" disabled={i === steps.length - 1} onClick={() => moveStep(i, 1)} className="flex h-8 w-9 items-center justify-center rounded-lg text-muted active:bg-accent-soft disabled:opacity-30">
                  ↓
                </button>
                <button type="button" aria-label="Remove step" onClick={() => setSteps(steps.length > 1 ? steps.filter((_, idx) => idx !== i) : [""])} className="flex h-8 w-9 items-center justify-center rounded-lg text-muted active:bg-accent-soft">
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => setSteps([...steps, ""])} className={`${btnText} mt-1`}>
          + Add step
        </button>
      </section>

      <section>
        <span className={sectionTitle}>Category</span>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Categories">
          {allCategories.map((id) => {
            const on = categories.includes(id);
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleCategory(id)}
                className={filterChip(on)}
              >
                {categoryLabel(id, he ? "he" : "en")}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            dir="auto"
            placeholder="Add your own category"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomCategory();
              }
            }}
            className={inputCls}
          />
          <button type="button" onClick={addCustomCategory} className={btnGhost}>
            Add
          </button>
        </div>
      </section>

      <section>
        <span className={sectionTitle}>Tags</span>
        <TagEditor
          tags={tags}
          suggested={suggested}
          onChange={(t, s) => {
            setTags(t);
            setSuggested(s);
          }}
        />
      </section>

      <section>
        <label htmlFor="source" className={sectionTitle}>
          Source link
        </label>
        <input id="source" dir="ltr" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} className={inputCls} />
      </section>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="sticky bottom-0 -mx-4 flex flex-col gap-1 bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        {suggested.length > 0 && <p className="text-center text-xs text-muted">{suggested.length} suggested tag(s) not accepted won&apos;t be saved</p>}
        <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>
          {busy ? "Saving…" : editing ? "Save changes" : "Save"}
        </button>
      </div>
    </form>
  );
}
