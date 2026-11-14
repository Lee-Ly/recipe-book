export interface Ingredient {
  name: string;
  /** The amount exactly as written in the source, e.g. "1/4 כוס" */
  original: string;
  cups: number | null;
  grams: number | null;
  ml: number | null;
  /** true when grams/ml/cups were calculated rather than written in the source */
  converted: boolean;
}

/** A baking pan. Sizes in centimetres: round = diameter (a), square = side (a), rect = length (a) x width (b). */
export interface Pan {
  shape: "round" | "square" | "rect";
  a: number;
  b: number | null;
}

/** What extraction produces and the review form edits. */
export interface RecipeDraft {
  title: string;
  /** ISO code of the recipe's language: "he", "en", ... */
  language: string;
  /** Who made the recipe: "@instagram_name", a website name, or typed by hand. Empty when unknown. */
  author: string;
  ingredients: Ingredient[];
  steps: string[];
  ovenCelsius: number | null;
  totalMinutes: number | null;
  /** Number of people the recipe serves (used to scale cooking recipes) */
  servings: number | null;
  /** The pan the recipe was written for (used to scale baking recipes) */
  pan: Pan | null;
  tags: string[];
  categories: string[];
}

export interface Recipe extends RecipeDraft {
  id: string;
  sourceUrl: string;
  /** File name inside data/images, or null when there is no photo */
  image: string | null;
  /** Unguessable token for the public read-only link; null when not shared */
  shareToken: string | null;
  favorite: boolean;
  /** The owner's private notes; never shown on the public share page */
  notes: string;
  createdAt: string;
}

export interface ExtractResult {
  draft: RecipeDraft;
  imageUrl: string | null;
  sourceUrl: string;
  /** true when Gemini structured the recipe, false when the basic fallback did */
  usedAi: boolean;
  /** true when no ingredients were found, so the UI should ask for pasted text */
  needsText: boolean;
  notice: string | null;
}
