import type { Ingredient } from "./types";

const FRACTIONS: [number, string][] = [
  [0.25, "¼"],
  [1 / 3, "⅓"],
  [0.5, "½"],
  [2 / 3, "⅔"],
  [0.75, "¾"],
];

export function formatCups(value: number): string {
  const whole = Math.floor(value + 0.02);
  const rest = value - whole;
  if (rest < 0.02) return String(whole);
  const frac = FRACTIONS.find(([n]) => Math.abs(n - rest) < 0.03);
  if (frac) return whole > 0 ? `${whole}${frac[1]}` : frac[1];
  return String(Math.round(value * 100) / 100);
}

function round(n: number): string {
  return n < 10 ? String(Math.round(n * 10) / 10) : String(Math.round(n));
}

export type UnitMode = "cups" | "grams" | "ml";

/**
 * One amount in the chosen unit, multiplied by `factor` when the recipe is scaled.
 * If the ingredient has no number in that unit (e.g. no cups for an egg) the next available unit is used.
 */
export function formatAmount(ing: Ingredient, language: string, unit: UnitMode = "grams", factor = 1): string {
  const he = language === "he";
  // Cups written in the source are exact; everything else is an estimate when the line was converted.
  const cupsWritten = /כוס|cup/i.test(ing.original);
  const gramsWritten = /גרם|\d\s*g(r|rams?)?\b/i.test(ing.original);
  const mlWritten = /מ"ל|מ״ל|\d\s*ml\b/i.test(ing.original);
  // Hebrew gets the word-prefix כ־ ("about"): a bare "~" can jump to the wrong side of a number in right-to-left text.
  const approx = (exact: boolean) => (ing.converted && !exact ? (he ? "כ־" : "~") : "");
  const order: UnitMode[] = [unit, ...(["grams", "ml", "cups"] as const).filter((u) => u !== unit)];
  for (const u of order) {
    const v = ing[u];
    if (v == null) continue;
    const n = v * factor;
    if (u === "cups") {
      const word = he ? (n > 1 ? "כוסות" : "כוס") : n > 1 ? "cups" : "cup";
      return `${approx(cupsWritten)}${formatCups(n)} ${word}`;
    }
    if (u === "grams") return `${approx(gramsWritten)}${round(n)} ${he ? "גרם" : "g"}`;
    return `${approx(mlWritten)}${round(n)} ${he ? "מ״ל" : "ml"}`;
  }
  // Nothing to convert (for example "2 pcs"): scale the number written in front.
  if (factor !== 1) {
    const m = /^(\d+(?:[.,]\d+)?)(.*)$/.exec(ing.original.trim());
    if (m) return `${Math.round(Number(m[1].replace(",", ".")) * factor * 100) / 100}${m[2]}`;
  }
  return ing.original;
}

export function formatDuration(minutes: number, language: string): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  const he = language === "he";
  const hUnit = he ? (h === 1 ? "שעה" : "שעות") : "h";
  const mUnit = he ? "דק׳" : "min";
  return [h ? `${h} ${hUnit}` : "", m ? `${m} ${mUnit}` : ""].filter(Boolean).join(" ");
}

export const LABELS = {
  he: {
    ingredients: "מצרכים", steps: "אופן ההכנה", oven: "תנור", time: "זמן אפייה/בישול", source: "מקור", estimate: "כ־ = המרה משוערת",
    units: { cups: "כוסות", grams: "גרם", ml: "מ״ל" }, serves: "מספר סועדים", pan: "תבנית", notes: "הערות", addNote: "הוספת הערה",
    tags: "תגיות", edit: "עריכה", save: "שמירה", cancel: "ביטול", setPan: "הגדרת גודל תבנית מקורי", setServings: "הגדרת מספר סועדים", bakingIn: "אופים בתבנית", reset: "איפוס",
    round: "עגולה", square: "מרובעת", rect: "מלבנית", prepped: "הוכנו",
  },
  en: {
    ingredients: "Ingredients", steps: "Method", oven: "Oven", time: "Cook time", source: "Source", estimate: "~ = estimated conversion",
    units: { cups: "Cups", grams: "Grams", ml: "ml" }, serves: "Serves", pan: "Pan", notes: "Notes", addNote: "Add a note",
    tags: "Tags", edit: "Edit", save: "Save", cancel: "Cancel", setPan: "Set the original pan size", setServings: "Set how many it serves", bakingIn: "Baking in", reset: "Reset",
    round: "Round", square: "Square", rect: "Rectangle", prepped: "prepped",
  },
};
