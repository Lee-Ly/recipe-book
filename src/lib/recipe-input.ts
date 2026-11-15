import { convertIngredients, type ConvertInput } from "./convert";
import { normalizeDraft } from "./gemini";
import { extensionForType, saveImage } from "./store";
import { parsePublicUrl, safeFetch } from "./safe-fetch";
import type { RecipeDraft } from "./types";
import { UNITS, type Unit } from "./units";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export interface RecipeForm {
  draft: RecipeDraft;
  sourceUrl: string;
  imageUrl: string;
  removeImage: boolean;
  file: File | null;
}

/**
 * Ingredients typed or changed in the editor arrive as one amount and one unit (`convert: true`).
 * Here the site fills in the other units (cups, grams, ml) so the owner never has to type them.
 */
async function convertTypedIngredients(raw: unknown[]): Promise<void> {
  const jobs: { row: Record<string, unknown>; input: ConvertInput }[] = [];
  for (const r of raw) {
    const row = (r ?? {}) as Record<string, unknown>;
    if (row.convert !== true) continue;
    const amount = Number(row.amount);
    const unit = row.unit as Unit;
    if (!Number.isFinite(amount) || amount <= 0 || !UNITS.includes(unit)) {
      // Nothing usable was typed (no amount): keep just the name.
      row.cups = row.grams = row.ml = null;
      row.original = "";
      row.converted = false;
      continue;
    }
    jobs.push({ row, input: { name: String(row.name ?? ""), amount, unit } });
  }
  const results = await convertIngredients(jobs.map((j) => j.input));
  jobs.forEach(({ row, input }, i) => {
    Object.assign(row, results[i]);
    row.original = `${input.amount} ${input.unit}`;
    // "pcs" has nothing to convert; every other unit leaves estimates in the units that were not typed.
    row.converted = input.unit !== "pcs";
  });
}

export async function readRecipeForm(req: Request): Promise<RecipeForm> {
  const form = await req.formData();
  const raw = form.get("data");
  if (typeof raw !== "string") throw new Error("Missing recipe data.");
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  if (Array.isArray(parsed.ingredients)) await convertTypedIngredients(parsed.ingredients);
  const draft = normalizeDraft(parsed);
  if (!draft.title) throw new Error("A recipe needs a title.");
  const file = form.get("file");
  return {
    draft,
    sourceUrl: typeof parsed.sourceUrl === "string" ? parsed.sourceUrl : "",
    imageUrl: typeof parsed.imageUrl === "string" ? parsed.imageUrl : "",
    removeImage: parsed.removeImage === true,
    file: file instanceof File && file.size > 0 ? file : null,
  };
}

/** Stores the uploaded photo, or downloads the one found on the page. Returns null on any failure. */
export async function storeImageFor(
  recipeId: string,
  input: Pick<RecipeForm, "file" | "imageUrl">,
): Promise<{ name: string | null; warning: string | null }> {
  try {
    if (input.file) {
      const ext = extensionForType(input.file.type);
      if (!ext) return { name: null, warning: "The photo must be a JPG, PNG, WebP or GIF." };
      if (input.file.size > MAX_IMAGE_BYTES) return { name: null, warning: "The photo is larger than 8 MB." };
      return { name: await saveImage(recipeId, Buffer.from(await input.file.arrayBuffer()), ext), warning: null };
    }
    if (input.imageUrl) {
      const res = await safeFetch(parsePublicUrl(input.imageUrl));
      const ext = extensionForType(res.headers.get("content-type") ?? "");
      if (!res.ok || !ext) return { name: null, warning: "Couldn't download the photo from the link." };
      const data = Buffer.from(await res.arrayBuffer());
      if (data.length > MAX_IMAGE_BYTES) return { name: null, warning: "The photo is larger than 8 MB." };
      return { name: await saveImage(recipeId, data, ext), warning: null };
    }
  } catch {
    return { name: null, warning: "Couldn't save the photo." };
  }
  return { name: null, warning: null };
}
