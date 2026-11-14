import type { Ingredient, RecipeDraft } from "./types";

const INGREDIENT_HEADS = /^(מצרכים|מרכיבים|רכיבים|ingredients?)\s*:?$/i;
const STEP_HEADS = /^(אופן ההכנה|הוראות הכנה|הכנה|אופן הכנה|instructions?|directions?|method|steps?)\s*:?$/i;
const LOOKS_LIKE_AMOUNT = /^(\d|[¼½¾⅓⅔]|קורט|כף|כפית|חצי|רבע|שלוש|שתי|a pinch|pinch)/i;

function fahrenheitToCelsius(text: string): { text: string; celsius: number | null } {
  let celsius: number | null = null;
  const converted = text.replace(/(\d{3})\s*°?\s*F\b/g, (_, f: string) => {
    const c = Math.round(((Number(f) - 32) * 5) / 9 / 5) * 5;
    celsius ??= c;
    return `${c}°C`;
  });
  return { text: converted, celsius };
}

/**
 * Basic, no-AI parser used when Gemini is unavailable. It only splits the text into
 * ingredients and steps; amounts are not converted, so the review screen asks you to fill them in.
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

  let ovenCelsius: number | null = null;
  const steps = stepLines.map((s) => {
    const { text: t, celsius } = fahrenheitToCelsius(s);
    ovenCelsius ??= celsius;
    const c = /(\d{2,3})\s*(?:°\s*C|מעלות|degrees)/i.exec(t);
    if (c) ovenCelsius ??= Number(c[1]);
    return t;
  });

  const ingredients: Ingredient[] = ingredientLines.map((line) => ({
    name: line,
    original: "",
    cups: null,
    grams: null,
    ml: null,
    converted: false,
  }));

  return {
    title,
    language: hebrew ? "he" : "en",
    author: "",
    ingredients,
    steps,
    ovenCelsius,
    totalMinutes: null,
    servings: null,
    pan: null,
    tags: [],
    categories: [],
  };
}
