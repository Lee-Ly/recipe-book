import { DEFAULT_CATEGORIES, isBakingName, type Category, type Taxonomy } from "./categories";
import type { Backend } from "./store-backend";
import { localBackend } from "./store-local";
import { createSupabaseBackend } from "./store-supabase";
import type { Recipe } from "./types";

// Everything the app saves or reads goes through this file.
// With SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set it uses Supabase (online); without them, local files in data/.
const backend: Backend =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? createSupabaseBackend(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY) : localBackend;

const IMAGE_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

/** Recipes saved before a field existed get its default. */
const withDefaults = (r: Partial<Recipe>) => ({ author: "", servings: null, pan: null, favorite: false, notes: "", ...r }) as Recipe;

export async function listRecipes(): Promise<Recipe[]> {
  const all = (await backend.listRecipes()).map(withDefaults);
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  const r = await backend.getRecipe(id);
  return r ? withDefaults(r) : null;
}

export async function getRecipeByToken(token: string): Promise<Recipe | null> {
  if (!token) return null;
  const r = await backend.getRecipeByToken(token);
  return r ? withDefaults(r) : null;
}

export async function upsertRecipe(recipe: Recipe): Promise<void> {
  await backend.saveRecipe(recipe);
}

export async function deleteRecipe(id: string): Promise<void> {
  const found = await backend.getRecipe(id);
  await backend.deleteRecipe(id);
  if (found?.image) await removeImage(found.image);
}

export function extensionForType(contentType: string): string | null {
  const t = contentType.split(";")[0].trim().toLowerCase();
  if (t === "image/jpeg" || t === "image/jpg") return "jpg";
  if (t === "image/png") return "png";
  if (t === "image/webp") return "webp";
  if (t === "image/gif") return "gif";
  return null;
}

export async function saveImage(recipeId: string, data: Buffer, ext: string): Promise<string> {
  const name = `${recipeId}-${Date.now()}.${ext}`;
  await backend.putImage(name, data, IMAGE_TYPES[ext] ?? "application/octet-stream");
  return name;
}

export async function removeImage(name: string): Promise<void> {
  if (!/^[\w-]+\.(jpg|png|webp|gif)$/.test(name)) return;
  await backend.deleteImage(name);
}

export async function readImage(name: string): Promise<{ data: Buffer; contentType: string } | null> {
  const match = /^[\w-]+\.(jpg|png|webp|gif)$/.exec(name);
  if (!match) return null;
  const data = await backend.getImage(name);
  return data ? { data, contentType: IMAGE_TYPES[match[1]] } : null;
}

// ---------- categories and tags ----------

/** All categories (the owner's list, or the defaults) and every tag in use or added by hand. */
export async function getTaxonomy(): Promise<Taxonomy> {
  const file = await backend.readTaxonomy();
  const recipes = await listRecipes();
  const categories: Category[] = file?.categories ?? DEFAULT_CATEGORIES.map((c) => ({ ...c }));
  // Categories typed by hand before the management page existed show up as their own entries.
  for (const r of recipes) for (const id of r.categories) if (!categories.some((c) => c.id === id)) categories.push({ id, name: id });
  const tags = new Set([...(file?.tags ?? []), ...recipes.flatMap((r) => r.tags)]);
  return { categories, tags: [...tags].sort((a, b) => a.localeCompare(b)) };
}

export type TaxonomyChange =
  | { op: "addCategory"; name: string }
  | { op: "renameCategory"; id: string; name: string }
  | { op: "deleteCategory"; id: string }
  | { op: "addTag"; name: string }
  | { op: "renameTag"; from: string; to: string }
  | { op: "deleteTag"; name: string };

/** Applies one change to the category/tag lists, and to every recipe that uses the renamed or removed item. */
export async function changeTaxonomy(change: TaxonomyChange): Promise<Taxonomy> {
  const tax = await getTaxonomy();
  const recipes = await listRecipes();
  const changed = new Set<Recipe>();
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

  if (change.op === "addCategory") {
    const name = change.name.trim();
    if (name && !tax.categories.some((c) => same(c.name, name))) tax.categories.push({ id: `c${Date.now().toString(36)}`, name, baking: isBakingName(name) });
  } else if (change.op === "renameCategory") {
    const name = change.name.trim();
    const c = tax.categories.find((x) => x.id === change.id);
    if (c && name) {
      c.name = name;
      if (isBakingName(name)) c.baking = true;
    }
  } else if (change.op === "deleteCategory") {
    tax.categories = tax.categories.filter((c) => c.id !== change.id);
    for (const r of recipes) {
      if (r.categories.includes(change.id)) {
        r.categories = r.categories.filter((id) => id !== change.id);
        changed.add(r);
      }
    }
  } else if (change.op === "addTag") {
    const name = change.name.trim().replace(/^#/, "");
    if (name && !tax.tags.some((t) => same(t, name))) tax.tags.push(name);
  } else if (change.op === "renameTag") {
    const to = change.to.trim().replace(/^#/, "");
    if (to) {
      tax.tags = [...new Set(tax.tags.map((t) => (t === change.from ? to : t)))];
      for (const r of recipes) {
        if (r.tags.includes(change.from)) {
          r.tags = [...new Set(r.tags.map((t) => (t === change.from ? to : t)))];
          changed.add(r);
        }
      }
    }
  } else if (change.op === "deleteTag") {
    tax.tags = tax.tags.filter((t) => t !== change.name);
    for (const r of recipes) {
      if (r.tags.includes(change.name)) {
        r.tags = r.tags.filter((t) => t !== change.name);
        changed.add(r);
      }
    }
  }

  await backend.writeTaxonomy(tax);
  for (const r of changed) await backend.saveRecipe(r);
  return tax;
}
