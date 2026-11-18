import { convertLocally } from "./convert";
import type { Ingredient, Pan, RecipeDraft } from "./types";
import type { Unit } from "./units";

// A heading may carry a few more words, such as "מצרכים למתכון :" or "Ingredients for the cake".
const INGREDIENT_HEADS = /^(מצרכים|מרכיבים|רכיבים|ingredients?)(\s+\S+){0,3}\s*:?$/i;
const STEP_HEADS = /^(אופן ההכנה|הוראות הכנה|הכנה|אופן הכנה|instructions?|directions?|method|steps?)(\s+\S+){0,2}\s*:?$/i;
const LOOKS_LIKE_AMOUNT = /^(\d|[¼½¾⅓⅔]|קורט|כף|כפית|חצי|רבע|שלוש|שתי|a pinch|pinch)/i;
/** Remarks after the method: "** the cake keeps 5 days", "Tip: ...", "Note: ...". */
const NOTE_LINE = /^(\*+|הערה|הערות|טיפ|טיפים|note|notes|tip|tips)\s*:?\s*/i;
/** Lines that are only a sign-off, not a step. */
const SIGN_OFF = /^(בתאבון|בהצלחה|enjoy|bon app[eé]tit)\W*$/i;

const FRACTIONS: Record<string, number> = { "¼": 0.25, "½": 0.5, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3, חצי: 0.5, רבע: 0.25 };
const UNIT_WORD = "כוסות|כוס|כפות|כף|כפיות|כפית|גרם|גר|מ\"ל|מ״ל|ml|ק\"ג|ק״ג|קילו|ליטר|יחידות|יחידה|g|kg|cups?|tbsp|tsp";
const QTY = "\\d+(?:[.,]\\d+)?\\s*[¼½¾⅓⅔]|\\d+\\s*/\\s*\\d+|\\d+(?:[.,]\\d+)?|[¼½¾⅓⅔]|חצי|רבע";
/** amount, optional unit, optional "(70 גרם)", then the name. */
const INGREDIENT_LINE = new RegExp(`^(${QTY})\\s*(${UNIT_WORD})?(?=\\s|$|\\()\\s*(?:\\(\\s*([^)]*?)\\s*\\))?\\s*(.*)$`, "i");

function parseQty(text: string): number | null {
  const t = text.trim();
  if (FRACTIONS[t] != null) return FRACTIONS[t];
  const mixed = /^(\d+)\s*([¼½¾⅓⅔])$/.exec(t);
  if (mixed) return Number(mixed[1]) + FRACTIONS[mixed[2]];
  const frac = /^(\d+)\s*\/\s*(\d+)$/.exec(t);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** The editor unit and the amount in it for a written unit word, or null for a plain count. */
function toUnit(word: string | undefined, qty: number): { unit: Unit; amount: number } | null {
  if (!word) return null;
  if (/^(כוס|כוסות|cups?)$/i.test(word)) return { unit: "cups", amount: qty };
  if (/^(כף|כפות|tbsp)$/i.test(word)) return { unit: "tbsp", amount: qty };
  if (/^(כפית|כפיות|tsp)$/i.test(word)) return { unit: "tsp", amount: qty };
  if (/^(גרם|גר|g)$/i.test(word)) return { unit: "g", amount: qty };
  if (/^(ק"ג|ק״ג|קילו|kg)$/i.test(word)) return { unit: "g", amount: qty * 1000 };
  if (/^(מ"ל|מ״ל|ml)$/i.test(word)) return { unit: "ml", amount: qty };
  if (/^ליטר$/.test(word)) return { unit: "ml", amount: qty * 1000 };
  return null; // יחידה / יחידות: a count
}

/** "⅓ כוס ( 70 גרם) סוכר לבן" -> name "סוכר לבן", cups 0.33, grams 70. Missing units are worked out from a density table. */
function parseIngredient(line: string): Ingredient {
  const plain: Ingredient = { name: line, original: "", cups: null, grams: null, ml: null, converted: false };
  const m = INGREDIENT_LINE.exec(line);
  if (!m) return plain;
  const qty = parseQty(m[1]);
  if (qty == null || qty <= 0) return plain;
  const name = m[4].trim();
  if (!name) return plain;

  const out: Ingredient = { name, original: [m[1], m[2], m[3] ? `(${m[3]})` : ""].filter(Boolean).join(" "), cups: null, grams: null, ml: null, converted: false };
  const written: { unit: Unit; amount: number }[] = [];
  const main = toUnit(m[2], qty);
  if (main) written.push(main);
  const inner = m[3] ? /^(\d+(?:[.,]\d+)?)\s*(\S+)$/.exec(m[3].trim()) : null;
  if (inner) {
    const extra = toUnit(inner[2], Number(inner[1].replace(",", ".")));
    if (extra) written.push(extra);
  }
  for (const w of written) {
    if (w.unit === "cups") out.cups = Math.round(w.amount * 100) / 100;
    if (w.unit === "g") out.grams = w.amount;
    if (w.unit === "ml") out.ml = w.amount;
  }
  // Fill the units the line did not give. Spoons only give grams / ml.
  const base = written.find((w) => w.unit === "g") ?? written.find((w) => w.unit === "ml") ?? written[0];
  if (base) {
    const derived = convertLocally({ name, amount: base.amount, unit: base.unit });
    for (const key of ["cups", "grams", "ml"] as const) {
      if (out[key] == null && derived[key] != null) {
        out[key] = derived[key];
        out.converted = true;
      }
    }
  }
  return out;
}

function fahrenheitToCelsius(text: string): { text: string; celsius: number | null } {
  let celsius: number | null = null;
  const converted = text.replace(/(\d{3})\s*°?\s*F\b/g, (_, f: string) => {
    const c = Math.round(((Number(f) - 32) * 5) / 9 / 5) * 5;
    celsius ??= c;
    return `${c}°C`;
  });
  return { text: converted, celsius };
}

/** A pan written in the text, always in cm: "קוטר 24" / "diameter 24" is round, "20×30" is a rectangle. */
function findPan(text: string): Pan | null {
  const round = /(?:בקוטר|קוטר|diameter)\s*(\d{2})/i.exec(text);
  if (round) return { shape: "round", a: Number(round[1]), b: null };
  const box = /(\d{2})\s*[x×*]\s*(\d{2})\s*(?:ס["״]?מ|cm)/i.exec(text);
  if (box) return Number(box[1]) === Number(box[2]) ? { shape: "square", a: Number(box[1]), b: null } : { shape: "rect", a: Number(box[1]), b: Number(box[2]) };
  return null;
}

/** "זמן אפיה: 40-45 דקות" -> 45 (the longer end of a range). Only baking or cooking time, never preparation. */
function findBakeMinutes(text: string): number | null {
  const m = /(?:זמן\s+(?:אפ(?:י|יי)ה|בישול)|baking time|cook(?:ing)? time)\s*:?\s*(\d+)(?:\s*[-–]\s*(\d+))?\s*(דקות|דק|min)/i.exec(text);
  return m ? Number(m[2] ?? m[1]) : null;
}

/**
 * Basic, no-AI parser used when Gemini is unavailable. It splits the text into ingredients, steps and notes,
 * reads amounts and units, and works out the missing cups / grams / ml from a density table.
 */
export function parseWithRules(text: string, fallbackTitle: string): RecipeDraft {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const hebrew = /[֐-׿]/.test(text);

  let title = fallbackTitle;
  let mode: "ingredients" | "steps" | null = null;
  let sawHeading = false;
  const ingredientLines: string[] = [];
  const stepLines: string[] = [];
  const noteLines: string[] = [];
  const loose: string[] = [];

  lines.forEach((line, i) => {
    if (INGREDIENT_HEADS.test(line)) {
      mode = "ingredients";
      sawHeading = true;
    } else if (STEP_HEADS.test(line)) {
      mode = "steps";
      sawHeading = true;
    } else if (mode === "ingredients") ingredientLines.push(line);
    else if (mode === "steps") stepLines.push(line);
    else if (i === 0 && !LOOKS_LIKE_AMOUNT.test(line) && line.length < 80) title = line;
    else loose.push(line);
  });

  if (ingredientLines.length === 0) {
    if (stepLines.length > 0) {
      // Only the method has a heading (common: a list of amounts, then "אופן ההכנה"), so what came before is the ingredients.
      ingredientLines.push(...loose);
    } else if (!sawHeading) {
      // No headings at all: lines that start like an amount are ingredients, the rest are steps.
      for (const line of loose) (LOOKS_LIKE_AMOUNT.test(line) ? ingredientLines : stepLines).push(line);
    }
  }

  // Remarks and sign-offs after the method are not steps. 
  const methodLines = stepLines.filter((line) => {
    if (NOTE_LINE.test(line)) {
      noteLines.push(line.replace(NOTE_LINE, "").trim());
      return false;
    }
    return !SIGN_OFF.test(line);
  });

  let ovenCelsius: number | null = null;
  const steps = methodLines.map((s) => {
    const { text: t, celsius } = fahrenheitToCelsius(s);
    ovenCelsius ??= celsius;
    const c = /(\d{2,3})\s*(?:°\s*C|מעלות|degrees)/i.exec(t);
    if (c) ovenCelsius ??= Number(c[1]);
    return t;
  });

  // A line that ends with ":" is a sub-heading ("לעוגה:"), not an ingredient.
  const ingredients: Ingredient[] = ingredientLines.filter((line) => !/[:：]$/.test(line)).map(parseIngredient);

  return {
    title,
    language: hebrew ? "he" : "en",
    author: "",
    ingredients,
    steps,
    ovenCelsius,
    totalMinutes: findBakeMinutes(text),
    servings: null,
    pan: findPan(text),
    tags: [],
    categories: [],
    notes: noteLines.join("\n"),
  };
}
