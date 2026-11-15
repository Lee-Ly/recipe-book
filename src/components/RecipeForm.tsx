"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { categoryName, type Category } from "@/lib/categories";
import { PAN_SHAPES } from "@/lib/pan";
import type { Ingredient, Pan, RecipeDraft } from "@/lib/types";
import { UNITS, type Unit } from "@/lib/units";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from "./icons";
import TagEditor from "./TagEditor";
import { btnDashed, btnGhost, btnText, categoryToggle, fieldLabel, inputCls, panelCls, rowCls } from "./ui";

export interface FormInitial extends RecipeDraft {
  sourceUrl: string;
  /** Photo found on the source page (create) */
  remoteImageUrl: string;
  /** Photo already stored for this recipe (edit) */
  storedImage: string | null;
  /** The owner's private notes */
  notes: string;
}

type Mode = { kind: "create" } | { kind: "edit"; id: string };

/**
 * One ingredient in the editor: an amount and one unit, as in the mockup. Rows the owner has not touched keep the
 * cups/grams/ml they came with; typed or changed rows are converted into the other units by the site when saved.
 */
interface IngredientRow {
  name: string;
  amount: string;
  unit: Unit;
  touched: boolean;
  original: string;
  cups: string;
  grams: string;
  ml: string;
  converted: boolean;
}

const short = (n: number) => String(Math.round(n * 100) / 100);

function toRow(i: Ingredient): IngredientRow {
  const base = { name: i.name, touched: false, original: i.original, cups: i.cups?.toString() ?? "", grams: i.grams?.toString() ?? "", ml: i.ml?.toString() ?? "", converted: i.converted };
  // Show the unit the source was written in, then grams, then ml, then cups.
  if (/כוס|cup/i.test(i.original) && i.cups != null) return { ...base, amount: short(i.cups), unit: "cups" };
  if (i.grams != null) return { ...base, amount: short(i.grams), unit: "g" };
  if (i.ml != null) return { ...base, amount: short(i.ml), unit: "ml" };
  if (i.cups != null) return { ...base, amount: short(i.cups), unit: "cups" };
  const lead = /^\s*(\d+(?:[.,]\d+)?)/.exec(i.original);
  return { ...base, amount: lead ? lead[1] : "", unit: "pcs" };
}

const emptyRow = (): IngredientRow => ({ name: "", amount: "", unit: "g", touched: true, original: "", cups: "", grams: "", ml: "", converted: false });

const toNumber = (s: string): number | null => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
};

const UNIT_WORDS: [RegExp, Unit][] = [
  [/^(g|gr|gram|grams|גרם|גר)$/i, "g"],
  [/^(ml|מ"ל|מ״ל)$/i, "ml"],
  [/^(cup|cups|כוס|כוסות)$/i, "cups"],
  [/^(tbsp|כף|כפות)$/i, "tbsp"],
  [/^(tsp|כפית|כפיות)$/i, "tsp"],
  [/^oz$/i, "oz"],
  [/^(pcs|pc|יחידה|יחידות)$/i, "pcs"],
];

/** "350g potato gnocchi", "2 כוסות קמח", "3 eggs" -> a row. A line without a leading number becomes just a name. */
function parseBulkLine(line: string): IngredientRow {
  const m = /^([\d.,/]+)\s*(\S+)?\s*(.*)$/.exec(line);
  if (!m) return { ...emptyRow(), name: line };
  const [a, b] = m[1].split("/");
  const n = b ? Number(a) / Number(b) : Number(a.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return { ...emptyRow(), name: line };
  const token = m[2] ?? "";
  const hit = UNIT_WORDS.find(([re]) => re.test(token));
  const name = hit ? m[3] : [token, m[3]].filter(Boolean).join(" ");
  return { ...emptyRow(), name: name || line, amount: short(n), unit: hit ? hit[1] : "pcs" };
}

const stepBtn = "flex h-7 w-7 items-center justify-center rounded-lg border border-line text-chip-text transition hover:border-foreground active:border-foreground disabled:opacity-30";

export default function RecipeForm({
  initial,
  mode,
  categories,
  tagPool,
  formId = "recipe-form",
}: {
  initial: FormInitial;
  mode: Mode;
  categories: Category[];
  tagPool: string[];
  formId?: string;
}) {
  const router = useRouter();
  const editing = mode.kind === "edit";
  const [title, setTitle] = useState(initial.title);
  const [sourceUrl, setSourceUrl] = useState(initial.sourceUrl);
  const [rows, setRows] = useState<IngredientRow[]>(initial.ingredients.length ? initial.ingredients.map(toRow) : [emptyRow()]);
  const [steps, setSteps] = useState<string[]>(initial.steps.length ? initial.steps : [""]);
  const [author, setAuthor] = useState(initial.author);
  const [notes, setNotes] = useState(initial.notes);
  const [oven, setOven] = useState(initial.ovenCelsius?.toString() ?? "");
  const [minutes, setMinutes] = useState(initial.totalMinutes?.toString() ?? "");
  const [servings, setServings] = useState(initial.servings?.toString() ?? "");
  const [panShape, setPanShape] = useState<Pan["shape"] | "">(initial.pan?.shape ?? "");
  const [panA, setPanA] = useState(initial.pan?.a.toString() ?? "");
  const [panB, setPanB] = useState(initial.pan?.b?.toString() ?? "");
  // When creating, suggested tags wait for your approval; when editing they are already accepted.
  const [tags, setTags] = useState<string[]>(editing ? initial.tags : []);
  const [suggested, setSuggested] = useState<string[]>(editing ? [] : initial.tags);
  const [selected, setSelected] = useState<string[]>(initial.categories);
  const [file, setFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const shownImage = removeImage ? null : (preview ?? (initial.storedImage ? `/api/img/${initial.storedImage}` : initial.remoteImageUrl || null));
  const he = initial.language === "he";
  // The recipe's own categories that no longer exist in the list are still shown, so nothing is lost silently.
  const pickable = [...categories, ...selected.filter((id) => !categories.some((c) => c.id === id)).map((id) => ({ id, name: id }))];

  function setRow(i: number, patch: Partial<IngredientRow>) {
    // Changing an amount or unit means the other units must be recalculated when saving.
    const touches = "amount" in patch || "unit" in patch;
    setRows((cur) => cur.map((r, idx) => (idx === i ? { ...r, ...patch, ...(touches ? { touched: true } : {}) } : r)));
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

  function parseBulk() {
    const lines = bulkText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    setRows((cur) => [...cur.filter((r) => r.name.trim() || r.amount.trim()), ...lines.map(parseBulkLine)]);
    setBulkText("");
    setBulkOpen(false);
  }

  function toggleCategory(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((c) => c !== id) : [...cur, id]));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!title.trim()) {
      setError("Please enter a recipe title.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setBusy(true);
    setError("");
    const ingredients = rows
      .filter((r) => r.name.trim() || r.amount.trim() || (!r.touched && r.original.trim()))
      .map((r) =>
        r.touched
          ? { name: r.name.trim(), amount: r.amount.trim(), unit: r.unit, convert: true }
          : { name: r.name.trim(), original: r.original.trim(), cups: toNumber(r.cups), grams: toNumber(r.grams), ml: toNumber(r.ml), converted: r.converted },
      );
    const cleanSteps = steps.map((s) => s.trim()).filter(Boolean);
    const a = toNumber(panA);
    const pan: Pan | null = panShape && a && a > 0 ? { shape: panShape, a, b: panShape === "rect" ? (toNumber(panB) ?? a) : null } : null;
    // A recipe typed by hand has no detected language, so it follows the letters used.
    const typedHebrew = /[֐-׿]/.test([title, ...rows.map((r) => r.name), ...cleanSteps].join(" "));
    const language = typedHebrew ? "he" : initial.title ? initial.language : "en";
    const data = {
      title: title.trim(),
      language,
      author: author.trim(),
      notes: notes.trim(),
      ingredients,
      steps: cleanSteps,
      ovenCelsius: toNumber(oven),
      totalMinutes: toNumber(minutes),
      servings: toNumber(servings),
      pan,
      tags,
      categories: selected,
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
      router.push("/"); // back to the home page after saving
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the recipe.");
      setBusy(false);
    }
  }

  return (
    <form id={formId} onSubmit={save} className="space-y-5">
      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}

      {/* Essentials */}
      <div className={`${panelCls} space-y-4 p-4`}>
        <div>
          <span className={fieldLabel}>Photo</span>
          <div className="aspect-video w-full overflow-hidden rounded-xl border border-line bg-card">
            {shownImage ? <img src={shownImage} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-muted-2">No photo</div>}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <label className={`${btnGhost} cursor-pointer py-2`}>
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
                className={btnText}
                onClick={() => {
                  setFile(null);
                  setRemoveImage(true);
                }}
              >
                Remove
              </button>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="title" className={fieldLabel}>
            Recipe Title *
          </label>
          <input id="title" dir="auto" placeholder="e.g., Crispy Garlic Chili Noodles" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
        </div>

        <div>
          <label htmlFor="author" className={fieldLabel}>
            Author
          </label>
          <input id="author" dir="auto" placeholder="Instagram name or website" value={author} onChange={(e) => setAuthor(e.target.value)} className={inputCls} />
        </div>

        <div>
          <span className={fieldLabel}>Categories</span>
          <p className="-mt-0.5 mb-2 text-[11px] text-muted">The type of food, for example cookies or soup. Used to browse recipes.</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Categories">
            {pickable.map((c) => {
              const on = selected.includes(c.id);
              return (
                <button key={c.id} type="button" aria-pressed={on} onClick={() => toggleCategory(c.id)} className={categoryToggle(on)}>
                  {on ? "✓ " : ""}
                  {categoryName(pickable, c.id, he ? "he" : "en")}
                </button>
              );
            })}
          </div>
          <Link href="/manage" className={`${btnText} mt-2 inline-block`}>
            Manage categories &amp; tags
          </Link>
        </div>

        <div>
          <span className={fieldLabel}>Tags</span>
          <p className="-mt-0.5 mb-2 text-[11px] text-muted">Keywords that describe this dish, for example spicy or 15 minutes. Used to search recipes.</p>
          <TagEditor
            tags={tags}
            suggested={suggested}
            available={tagPool}
            onChange={(t, s) => {
              setTags(t);
              setSuggested(s);
            }}
          />
        </div>

        <div>
          <label htmlFor="source" className={fieldLabel}>
            Source link
          </label>
          <input id="source" dir="ltr" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} className={inputCls} />
        </div>
      </div>

      {/* Details */}
      <div className={`${panelCls} space-y-3 p-4`}>
        <h2 className="text-sm font-bold">Details</h2>
        <div className="grid grid-cols-3 gap-2">
          <label>
            <span className={fieldLabel}>Oven °C</span>
            <input type="number" inputMode="numeric" min="0" value={oven} onChange={(e) => setOven(e.target.value)} className={inputCls} />
          </label>
          <label>
            <span className={fieldLabel}>Cook min</span>
            <input type="number" inputMode="numeric" min="0" value={minutes} onChange={(e) => setMinutes(e.target.value)} className={inputCls} />
          </label>
          <label>
            <span className={fieldLabel}>Serves</span>
            <input type="number" inputMode="numeric" min="1" value={servings} onChange={(e) => setServings(e.target.value)} className={inputCls} />
          </label>
        </div>
        <p className="text-[11px] text-muted">Cook min is the baking or cooking time only, not preparation.</p>
        <div>
          <span className={fieldLabel}>Pan size (for baking)</span>
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
                <span className="text-xs font-bold text-muted">cm</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Ingredients */}
      <div className={`${panelCls} space-y-3 p-4`}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">Ingredients</h2>
          <button type="button" onClick={() => setBulkOpen(!bulkOpen)} className={btnText}>
            Paste Bulk List
          </button>
        </div>
        <p className="text-[11px] text-muted">Type one amount and unit. Cups, grams and ml are worked out for you when you save.</p>

        {bulkOpen && (
          <div className={`${rowCls} space-y-2 p-3`}>
            <textarea dir="auto" rows={3} value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder={"350g potato gnocchi\n55g unsalted butter\n2 כוסות קמח"} className="w-full rounded-lg border border-line p-2 text-xs outline-none focus:border-foreground" />
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setBulkOpen(false)} className="px-2.5 py-1 text-xs font-semibold text-muted">
                Close
              </button>
              <button type="button" onClick={parseBulk} className="rounded-lg bg-foreground px-3 py-1 text-xs font-bold text-background">
                Parse Lines
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className={`flex items-center gap-1.5 p-2 ${rowCls}`}>
              <input aria-label="Amount" dir="ltr" inputMode="decimal" placeholder="Amt" value={r.amount} onChange={(e) => setRow(i, { amount: e.target.value })} className="w-14 rounded-lg bg-accent-soft px-2 py-1.5 text-center text-xs font-bold tabular-nums text-foreground outline-none" />
              <select aria-label="Unit" value={r.unit} onChange={(e) => setRow(i, { unit: e.target.value as Unit })} className="rounded-lg bg-accent-soft px-1.5 py-1.5 text-xs font-bold text-ink-2 outline-none">
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <input aria-label="Ingredient name" dir="auto" placeholder="Ingredient name..." value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} className="min-w-0 flex-1 bg-transparent px-1.5 py-1.5 text-xs font-medium text-foreground outline-none placeholder:font-normal placeholder:text-muted-2" />
              <button type="button" aria-label="Remove ingredient" onClick={() => setRows(rows.length > 1 ? rows.filter((_, idx) => idx !== i) : [emptyRow()])} className="p-1 text-muted-2 transition hover:text-rose-600 active:text-rose-600">
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <button type="button" onClick={() => setRows([...rows, emptyRow()])} className={btnDashed}>
          <PlusIcon className="h-3.5 w-3.5 text-accent" />
          <span>Add Ingredient</span>
        </button>
      </div>

      {/* Method */}
      <div className={`${panelCls} space-y-3 p-4`}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">Method Steps</h2>
          <span className="text-[10px] text-muted">Time phrases auto-create timers</span>
        </div>

        <div className="space-y-2.5">
          {steps.map((s, i) => (
            <div key={i} className={`${rowCls} space-y-2 p-3`}>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-foreground text-[11px] text-background">{i + 1}</span>
                  <span>Step {i + 1}</span>
                </span>
                <div className="flex items-center gap-1">
                  <button type="button" aria-label="Move step up" title="Move Step Up" disabled={i === 0} onClick={() => moveStep(i, -1)} className={stepBtn}>
                    <ArrowUpIcon className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" aria-label="Move step down" title="Move Step Down" disabled={i === steps.length - 1} onClick={() => moveStep(i, 1)} className={stepBtn}>
                    <ArrowDownIcon className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" aria-label="Delete step" title="Delete Step" onClick={() => setSteps(steps.length > 1 ? steps.filter((_, idx) => idx !== i) : [""])} className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-muted-2 transition hover:border-rose-200 hover:text-rose-600 active:border-rose-200 active:text-rose-600">
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <textarea aria-label={`Step ${i + 1}`} dir="auto" rows={2} placeholder="Describe this cooking step..." value={s} onChange={(e) => setStep(i, e.target.value)} className="w-full rounded-lg border border-line bg-accent-soft/70 p-2.5 text-base leading-relaxed outline-none transition focus:border-foreground focus:bg-card" />
            </div>
          ))}
        </div>

        <button type="button" onClick={() => setSteps([...steps, ""])} className={btnDashed}>
          <PlusIcon className="h-3.5 w-3.5 text-accent" />
          <span>Add Step</span>
        </button>
      </div>

      {/* Notes */}
      <div className={`${panelCls} space-y-3 p-4`}>
        <h2 className="text-sm font-bold">Notes</h2>
        <textarea aria-label="Notes" dir="auto" rows={4} placeholder="Your own notes about this recipe..." value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border border-line bg-card p-2.5 text-base leading-relaxed outline-none transition focus:border-foreground" />
      </div>
    </form>
  );
}
