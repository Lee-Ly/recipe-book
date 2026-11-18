import type { Recipe } from "./types";

/** Where recipes, settings and photos physically live. `store.ts` picks one: Supabase when configured, local files otherwise. */
export interface Backend {
  listRecipes(): Promise<Partial<Recipe>[]>;
  getRecipe(id: string): Promise<Partial<Recipe> | null>;
  getRecipeByToken(token: string): Promise<Partial<Recipe> | null>;
  saveRecipe(recipe: Recipe): Promise<void>;
  /** Removes the recipe only; its photo is removed separately. */
  deleteRecipe(id: string): Promise<void>;
  /** Small JSON settings by key: "taxonomy" (categories and tags), "access" (friends' password). */
  readSetting<T>(key: string): Promise<T | null>;
  writeSetting(key: string, value: unknown): Promise<void>;
  putImage(name: string, data: Buffer, contentType: string): Promise<void>;
  deleteImage(name: string): Promise<void>;
  getImage(name: string): Promise<Buffer | null>;
}
