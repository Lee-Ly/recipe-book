import { createClient } from "@supabase/supabase-js";
import type { Backend } from "./store-backend";
import type { Recipe } from "./types";

const BUCKET = "recipe-images";

/** Recipes and settings in Supabase tables, photos in a private Storage bucket. Only used on the server, with the secret key. */
export function createSupabaseBackend(url: string, secretKey: string): Backend {
  const db = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const check = (what: string, error: { message: string } | null) => {
    if (error) throw new Error(`Supabase ${what} failed: ${error.message}`);
  };

  return {
    async listRecipes() {
      const { data, error } = await db.from("recipes").select("data").order("created_at", { ascending: false });
      check("listing recipes", error);
      return (data ?? []).map((row) => row.data as Partial<Recipe>);
    },
    async getRecipe(id) {
      const { data, error } = await db.from("recipes").select("data").eq("id", id).maybeSingle();
      check("reading a recipe", error);
      return data ? (data.data as Partial<Recipe>) : null;
    },
    async getRecipeByToken(token) {
      const { data, error } = await db.from("recipes").select("data").eq("share_token", token).maybeSingle();
      check("reading a shared recipe", error);
      return data ? (data.data as Partial<Recipe>) : null;
    },
    async saveRecipe(recipe) {
      const { error } = await db.from("recipes").upsert({ id: recipe.id, share_token: recipe.shareToken, created_at: recipe.createdAt, data: recipe });
      check("saving a recipe", error);
    },
    async deleteRecipe(id) {
      const { error } = await db.from("recipes").delete().eq("id", id);
      check("deleting a recipe", error);
    },
    async readSetting<T>(key: string) {
      const { data, error } = await db.from("site_settings").select("data").eq("key", key).maybeSingle();
      check(`reading setting ${key}`, error);
      return data ? (data.data as T) : null;
    },
    async writeSetting(key, value) {
      const { error } = await db.from("site_settings").upsert({ key, data: value });
      check(`saving setting ${key}`, error);
    },
    async putImage(name, data, contentType) {
      const { error } = await db.storage.from(BUCKET).upload(name, data, { contentType, upsert: true });
      check("uploading a photo", error);
    },
    async deleteImage(name) {
      const { error } = await db.storage.from(BUCKET).remove([name]);
      check("deleting a photo", error);
    },
    async getImage(name) {
      const { data, error } = await db.storage.from(BUCKET).download(name);
      if (error || !data) return null;
      return Buffer.from(await data.arrayBuffer());
    },
  };
}
