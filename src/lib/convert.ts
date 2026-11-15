import { callGemini, geminiConfigured } from "./gemini";
import type { Ingredient } from "./types";
import type { Unit } from "./units";

export interface ConvertInput {
  name: string;
  amount: number;
  unit: Unit;
}

type Amounts = Pick<Ingredient, "cups" | "grams" | "ml">;

/** Grams in one cup (240 ml) of common ingredients, English and Hebrew names. `liquid` ingredients also get ml. */
const DENSITY: { match: RegExp; gramsPerCup: number; liquid?: boolean }[] = [
  { match: /brown sugar|סוכר חום/i, gramsPerCup: 213 },
  { match: /powdered sugar|icing sugar|confectioner|אבקת סוכר/i, gramsPerCup: 120 },
  { match: /sugar|סוכר/i, gramsPerCup: 200 },
  { match: /flour|קמח/i, gramsPerCup: 125 },
  { match: /butter|חמאה|מרגרינה/i, gramsPerCup: 227 },
  { match: /oil|שמן/i, gramsPerCup: 218, liquid: true },
  { match: /milk|חלב/i, gramsPerCup: 245, liquid: true },
  { match: /water|מים/i, gramsPerCup: 237, liquid: true },
  { match: /cream|שמנת/i, gramsPerCup: 240, liquid: true },
  { match: /honey|דבש/i, gramsPerCup: 340, liquid: true },
  { match: /maple|סירופ|silan|סילאן/i, gramsPerCup: 322, liquid: true },
  { match: /vanilla|וניל|extract|תמצית/i, gramsPerCup: 208, liquid: true },
  { match: /yogurt|יוגורט|labane|לבנה/i, gramsPerCup: 245 },
  { match: /oat|שיבולת/i, gramsPerCup: 90 },
  { match: /cocoa|קקאו/i, gramsPerCup: 85 },
  { match: /chocolate|שוקולד/i, gramsPerCup: 170 },
  { match: /almond|שקד/i, gramsPerCup: 140 },
  { match: /walnut|אגוז|pecan|פקאן/i, gramsPerCup: 115 },
  { match: /rice|אורז/i, gramsPerCup: 185 },
  { match: /baking powder|baking soda|אבקת אפייה|אבקת אפיה|סודה/i, gramsPerCup: 230 },
  { match: /salt|מלח/i, gramsPerCup: 288 },
  { match: /tahini|טחינה|peanut butter|חמאת בוטנים/i, gramsPerCup: 250 },
];

const ML_PER_CUP = 240;
const clean = (n: number) => Math.round(n * 100) / 100;

/** Offline conversion from a density table. Returns nulls for anything it cannot know. */
export function convertLocally({ name, amount, unit }: ConvertInput): Amounts {
  const d = DENSITY.find((x) => x.match.test(name));
  const gPerMl = d ? d.gramsPerCup / ML_PER_CUP : null;
  const out: Amounts = { cups: null, grams: null, ml: null };
  const fromMl = (ml: number, allowCups: boolean) => {
    if (d?.liquid) out.ml = clean(ml);
    if (gPerMl) out.grams = clean(ml * gPerMl);
    if (allowCups && ml / ML_PER_CUP >= 0.1) out.cups = clean(ml / ML_PER_CUP);
  };
  if (unit === "g" || unit === "oz") {
    const g = unit === "oz" ? amount * 28.35 : amount;
    out.grams = clean(g);
    if (gPerMl) fromMl(g / gPerMl, true);
    out.grams = clean(g);
  } else if (unit === "ml") {
    out.ml = clean(amount);
    fromMl(amount, true);
    out.ml = clean(amount);
  } else if (unit === "cups") {
    out.cups = clean(amount);
    fromMl(amount * ML_PER_CUP, false);
  } else if (unit === "tbsp" || unit === "tsp") {
    // Spoons are small amounts: give ml for liquids and grams, but no "0.06 cups".
    fromMl(amount * (unit === "tbsp" ? 15 : 5), false);
  }
  return out;
}

const SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      cups: { type: "NUMBER", nullable: true },
      grams: { type: "NUMBER", nullable: true },
      ml: { type: "NUMBER", nullable: true },
    },
  },
};

function prompt(items: ConvertInput[]): string {
  const list = items.map((i, n) => `${n + 1}. ${i.name} - ${i.amount} ${i.unit}`).join("\n");
  return `Convert each cooking ingredient amount into cups, grams and ml, using the ingredient's real density (1 cup = 240 ml, 1 tbsp = 15 ml, 1 tsp = 5 ml, 1 oz = 28.35 g). Return one object per ingredient, in the same order.
- Keep the amount that was given exactly; fill the other units.
- cups only for ingredients naturally measured in cups (flour, sugar, oats, milk, oil...), and never for tsp/tbsp amounts; use null when it is under 0.1 cup.
- ml only for liquids (water, milk, oil, syrup, cream, extracts); for dry or solid ingredients ml must be null.
- Use null when a value does not apply or cannot be known (for example pcs of eggs).

Ingredients (name may be Hebrew):
${list}`;
}

/** Fills cups / grams / ml for each item: Gemini when available, the density table otherwise. */
export async function convertIngredients(items: ConvertInput[]): Promise<Amounts[]> {
  const fallback = items.map(convertLocally);
  if (items.length === 0 || !geminiConfigured()) return fallback;
  try {
    const out = (await callGemini(prompt(items), SCHEMA)) as Partial<Amounts>[];
    if (!Array.isArray(out) || out.length !== items.length) return fallback;
    const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);
    return out.map((o, i) => {
      const got: Amounts = { cups: n(o.cups), grams: n(o.grams), ml: n(o.ml) };
      const it = items[i];
      // The amount the owner typed is always kept exactly as typed.
      if (it.unit === "g") got.grams = it.amount;
      if (it.unit === "ml") got.ml = it.amount;
      if (it.unit === "cups") got.cups = it.amount;
      if (it.unit === "oz") got.grams = clean(it.amount * 28.35);
      if (got.cups != null && got.cups < 0.1) got.cups = null;
      return got;
    });
  } catch (err) {
    console.error("Gemini conversion failed, used the density table:", err instanceof Error ? err.message : err);
    return fallback;
  }
}
