// One-time move of the local data/ folder (recipes, categories/tags, photos) into Supabase.
// Safe to run again: recipes and photos are replaced, never duplicated.
// Usage (from the project folder):  node scripts/migrate-to-supabase.mjs
import { createClient } from "@supabase/supabase-js";
import { promises as fs } from "node:fs";
import path from "node:path";

const env = {};
for (const line of (await fs.readFile(".env.local", "utf8")).split(/\r?\n/)) {
  const i = line.indexOf("=");
  if (i > 0 && !line.startsWith("#")) env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}
if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");

const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const TYPES = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };

const readJson = async (file, fallback) => {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return fallback;
    throw err;
  }
};

const recipes = await readJson("data/recipes.json", []);
let photos = 0;
for (const r of recipes) {
  if (r.image) {
    const file = path.join("data", "images", r.image);
    try {
      const bytes = await fs.readFile(file);
      const { error } = await db.storage.from("recipe-images").upload(r.image, bytes, { contentType: TYPES[r.image.split(".").pop()] ?? "application/octet-stream", upsert: true });
      if (error) throw new Error(error.message);
      photos++;
    } catch (err) {
      console.log(`  photo for "${r.title}" not moved: ${err.message}`);
    }
  }
  const { error } = await db.from("recipes").upsert({ id: r.id, share_token: r.shareToken ?? null, created_at: r.createdAt, data: r });
  if (error) throw new Error(`recipe "${r.title}": ${error.message}`);
}

const taxonomy = await readJson("data/taxonomy.json", null);
if (taxonomy) {
  const { error } = await db.from("site_settings").upsert({ key: "taxonomy", data: taxonomy });
  if (error) throw new Error(`categories and tags: ${error.message}`);
}

const { count } = await db.from("recipes").select("id", { count: "exact", head: true });
console.log(`Moved ${recipes.length} recipe(s) and ${photos} photo(s)${taxonomy ? ", plus your categories and tags" : ""}. Supabase now holds ${count} recipe(s).`);
