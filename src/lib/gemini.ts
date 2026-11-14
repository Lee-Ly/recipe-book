import { DEFAULT_CATEGORIES } from "./categories";
import type { Ingredient, Pan, RecipeDraft } from "./types";

const BASE = "https://generativelanguage.googleapis.com/v1beta";
// Google retires models often, so the name is configurable and we fall back to the moving alias.
const MODELS = [process.env.GEMINI_MODEL ?? "gemini-3.5-flash", "gemini-flash-latest"];

const SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    language: { type: "STRING" },
    ingredients: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          original: { type: "STRING" },
          cups: { type: "NUMBER", nullable: true },
          grams: { type: "NUMBER", nullable: true },
          ml: { type: "NUMBER", nullable: true },
          converted: { type: "BOOLEAN" },
        },
        required: ["name", "original", "converted"],
      },
    },
    steps: { type: "ARRAY", items: { type: "STRING" } },
    ovenCelsius: { type: "NUMBER", nullable: true },
    totalMinutes: { type: "NUMBER", nullable: true },
    servings: { type: "NUMBER", nullable: true },
    pan: {
      type: "OBJECT",
      nullable: true,
      properties: {
        shape: { type: "STRING", enum: ["round", "square", "rect"] },
        a: { type: "NUMBER" },
        b: { type: "NUMBER", nullable: true },
      },
      required: ["shape", "a"],
    },
    tags: { type: "ARRAY", items: { type: "STRING" } },
    categories: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["title", "language", "ingredients", "steps", "tags", "categories"],
};

function buildPrompt(text: string): string {
  const ids = DEFAULT_CATEGORIES.map((c) => c.id).join(", ");
  return `You extract a recipe from the text below into structured JSON.

Rules:
- Keep the recipe's original language (Hebrew stays Hebrew, English stays English) for the title, ingredient names, steps and tags. Never translate. Set "language" to "he", "en", etc.
- For each ingredient keep "original" = the amount as written (e.g. "1/4 כוס"). Fill cups, grams and ml as numbers. Use the amounts written in the source when they exist and set converted=false. Otherwise calculate them from the ingredient's real density (1 cup = 240 ml) and set converted=true. Use null when a value does not apply or cannot be known (e.g. "a pinch"). Only fill cups when the source gives the amount in cups, or the ingredient is naturally measured in cups (flour, sugar, oats, milk, oil). For teaspoons, tablespoons, pinches or single items leave cups null and give grams and/or ml instead. Fill ml only for liquids (water, milk, oil, syrup, cream, extracts); for dry or solid ingredients (flour, oats, nuts, sugar, butter) ml must be null.
- Temperatures in Celsius: convert Fahrenheit. Put the oven temperature in ovenCelsius. Keep a fan/turbo note inside the step text.
- totalMinutes = the realistic total time if the text allows, otherwise null.
- servings = the number of people or portions only if the text states it, otherwise null. pan = the baking pan only if the text states its size (convert inches to cm; round: a = diameter; square: a = side; rect: a = length, b = width), otherwise null. Never guess either.
- Suggest 3-8 short, useful tags in the recipe's language (ingredients, style, occasion, diet such as vegan or gluten-free).
- categories: choose 1-3 ids exactly from this list: ${ids}. Add "vegan" only if the recipe has no meat, fish, dairy, eggs or honey. Add "dairy" if it contains dairy.
- Do not invent ingredients or steps. If the text contains no recipe (no ingredients and no method), return empty ingredients and steps arrays.

Text:
${text.slice(0, 12000)}`;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.map(str).filter(Boolean) : [];
}

function normalizePan(v: unknown): Pan | null {
  const o = (v ?? {}) as Record<string, unknown>;
  const shape = o.shape;
  const a = num(o.a);
  if ((shape !== "round" && shape !== "square" && shape !== "rect") || !a || a <= 0) return null;
  const b = num(o.b);
  return { shape, a, b: shape === "rect" ? (b && b > 0 ? b : a) : null };
}

export function normalizeDraft(raw: Record<string, unknown>): RecipeDraft {
  const known = new Set(DEFAULT_CATEGORIES.map((c) => c.id));
  const ingredients: Ingredient[] = (Array.isArray(raw.ingredients) ? raw.ingredients : [])
    .map((i): Ingredient => {
      const o = (i ?? {}) as Record<string, unknown>;
      return {
        name: str(o.name),
        original: str(o.original),
        cups: (num(o.cups) ?? 0) >= 0.1 ? num(o.cups) : null, // "0.02 cups" of vanilla is not useful
        grams: num(o.grams),
        ml: num(o.ml),
        converted: o.converted === true,
      };
    })
    .filter((i) => i.name || i.original);
  return {
    title: str(raw.title),
    language: str(raw.language) || "en",
    author: str(raw.author),
    ingredients,
    steps: strings(raw.steps),
    ovenCelsius: num(raw.ovenCelsius),
    totalMinutes: num(raw.totalMinutes),
    servings: (num(raw.servings) ?? 0) > 0 ? num(raw.servings) : null,
    pan: normalizePan(raw.pan),
    tags: [...new Set(strings(raw.tags))],
    categories: [...new Set(strings(raw.categories).filter((c) => known.has(c)))],
  };
}

export function geminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return !!key && !key.startsWith("PASTE");
}

export async function structureWithGemini(text: string): Promise<RecipeDraft> {
  if (!geminiConfigured()) throw new Error("GEMINI_API_KEY is not set");
  let lastError = "unknown error";
  for (const model of MODELS) {
    try {
      const res = await fetch(`${BASE}/models/${model}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": process.env.GEMINI_API_KEY!, "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(text) }] }],
          generationConfig: { responseMimeType: "application/json", responseSchema: SCHEMA, temperature: 0.1 },
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) {
        lastError = `${model}: HTTP ${res.status}`;
        continue;
      }
      const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const out = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!out) {
        lastError = `${model}: empty response`;
        continue;
      }
      return normalizeDraft(JSON.parse(out) as Record<string, unknown>);
    } catch (err) {
      lastError = `${model}: ${err instanceof Error ? err.message : String(err)}`;
    }
  }
  throw new Error(lastError);
}
