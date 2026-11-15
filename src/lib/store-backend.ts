import type { Taxonomy } from "./categories";
import type { Recipe } from "./types";

/** Where recipes, settings and photos physically live. `store.ts` picks one: Supabase when configured, local files otherwise. */
export interface Backend {
  listRecipes(): Promise<Partial<Recipe>[]>;
  getRecipe(id: string): Promise<Partial<Recipe> | null>;
  getRecipeByToken(token: string): Promise<Partial<Recipe> | null>;
  saveRecipe(recipe: Recipe): Promise<void>;
  /** Removes the recipe only; its photo is removed separately. */
  deleteRecipe(id: string): Promise<void>;
  readTaxonomy(): Promise<Partial<Taxonomy> | null>;
  writeTaxonomy(taxonomy: Taxonomy): Promise<void>;
  putImage(name: string, data: Buffer, contentType: string): Promise<void>;
  deleteImage(name: string): Promise<void>;
  getImage(name: string): Promise<Buffer | null>;
}
