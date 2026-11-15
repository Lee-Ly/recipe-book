import { promises as fs } from "node:fs";
import path from "node:path";
import { DEFAULT_CATEGORIES, type Category, type Taxonomy } from "./categories";
import type { Recipe } from "./types";

// Local JSON storage. Everything goes through this file so it can be swapped
// for a hosted database (Supabase) without touching the rest of the app.
const DATA_DIR = path.join(process.cwd(), "data");
const RECIPES_FILE = path.join(DATA_DIR, "recipes.json");
const IMAGE_DIR = path.join(DATA_DIR, "images");
const TAXONOMY_FILE = path.join(DATA_DIR, "taxonomy.json");

const IMAGE_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

let writeQueue: Promise<unknown> = Promise.resolve();

function serialize<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.catch(() => undefined);
  return run;
}

async function readAll(): Promise<Recipe[]> {
  try {
    const rows = JSON.parse(await fs.readFile(RECIPES_FILE, "utf8")) as Partial<Recipe>[];
    // Recipes saved before a field existed get its default.
    return rows.map((r) => ({ author: "", servings: null, pan: null, favorite: false, notes: "", ...r }) as Recipe);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(recipes: Recipe[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${RECIPES_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(recipes, null, 2), "utf8");
  await fs.rename(tmp, RECIPES_FILE);
}

export async function listRecipes(): Promise<Recipe[]> {
  const all = await readAll();
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  return (await readAll()).find((r) => r.id === id) ?? null;
}

export async function getRecipeByToken(token: string): Promise<Recipe | null> {
  if (!token) return null;
  return (await readAll()).find((r) => r.shareToken === token) ?? null;
}

export function upsertRecipe(recipe: Recipe): Promise<void> {
  return serialize(async () => {
    const all = await readAll();
    const i = all.findIndex((r) => r.id === recipe.id);
    if (i >= 0) all[i] = recipe;
    else all.push(recipe);
    await writeAll(all);
  });
}

export function deleteRecipe(id: string): Promise<void> {
  return serialize(async () => {
    const all = await readAll();
    const found = all.find((r) => r.id === id);
    await writeAll(all.filter((r) => r.id !== id));
    if (found?.image) await removeImage(found.image);
  });
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
  await fs.mkdir(IMAGE_DIR, { recursive: true });
  const name = `${recipeId}-${Date.now()}.${ext}`;
  await fs.writeFile(path.join(IMAGE_DIR, name), data);
  return name;
}

export async function removeImage(name: string): Promise<void> {
  if (!/^[\w-]+\.(jpg|png|webp|gif)$/.test(name)) return;
  await fs.rm(path.join(IMAGE_DIR, name), { force: true });
}

export async function readImage(name: string): Promise<{ data: Buffer; contentType: string } | null> {
  const match = /^[\w-]+\.(jpg|png|webp|gif)$/.exec(name);
  if (!match) return null;
  try {
    const data = await fs.readFile(path.join(IMAGE_DIR, name));
    return { data, contentType: IMAGE_TYPES[match[1]] };
  } catch {
    return null;
  }
}

// ---------- categories and tags ----------

async function readTaxonomyFile(): Promise<Partial<Taxonomy> | null> {
  try {
    return JSON.parse(await fs.readFile(TAXONOMY_FILE, "utf8")) as Partial<Taxonomy>;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

/** All categories (the owner's list, or the defaults) and every tag in use or added by hand. */
export async function getTaxonomy(): Promise<Taxonomy> {
  const file = await readTaxonomyFile();
  const recipes = await readAll();
  const categories: Category[] = file?.categories ?? DEFAULT_CATEGORIES.map((c) => ({ ...c }));
  // Categories typed by hand before the management page existed show up as their own entries.
  for (const r of recipes) for (const id of r.categories) if (!categories.some((c) => c.id === id)) categories.push({ id, name: id });
  const tags = new Set([...(file?.tags ?? []), ...recipes.flatMap((r) => r.tags)]);
  return { categories, tags: [...tags].sort((a, b) => a.localeCompare(b)) };
}

export type TaxonomyChange =
  | { op: "addCategory"; name: string; baking?: boolean }
  | { op: "renameCategory"; id: string; name: string }
  | { op: "setBaking"; id: string; baking: boolean }
  | { op: "deleteCategory"; id: string }
  | { op: "addTag"; name: string }
  | { op: "renameTag"; from: string; to: string }
  | { op: "deleteTag"; name: string };

/** Applies one change to the category/tag lists, and to every recipe that uses the renamed or removed item. */
export function changeTaxonomy(change: TaxonomyChange): Promise<Taxonomy> {
  return serialize(async () => {
    const tax = await getTaxonomy();
    const recipes = await readAll();
    let recipesChanged = false;
    const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

    if (change.op === "addCategory") {
      const name = change.name.trim();
      if (name && !tax.categories.some((c) => same(c.name, name))) tax.categories.push({ id: `c${Date.now().toString(36)}`, name, baking: change.baking === true });
    } else if (change.op === "renameCategory") {
      const name = change.name.trim();
      const c = tax.categories.find((x) => x.id === change.id);
      if (c && name) c.name = name;
    } else if (change.op === "setBaking") {
      const c = tax.categories.find((x) => x.id === change.id);
      if (c) c.baking = change.baking;
    } else if (change.op === "deleteCategory") {
      tax.categories = tax.categories.filter((c) => c.id !== change.id);
      for (const r of recipes) {
        if (r.categories.includes(change.id)) {
          r.categories = r.categories.filter((id) => id !== change.id);
          recipesChanged = true;
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
            recipesChanged = true;
          }
        }
      }
    } else if (change.op === "deleteTag") {
      tax.tags = tax.tags.filter((t) => t !== change.name);
      for (const r of recipes) {
        if (r.tags.includes(change.name)) {
          r.tags = r.tags.filter((t) => t !== change.name);
          recipesChanged = true;
        }
      }
    }

    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = `${TAXONOMY_FILE}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(tax, null, 2), "utf8");
    await fs.rename(tmp, TAXONOMY_FILE);
    if (recipesChanged) await writeAll(recipes);
    return tax;
  });
}
