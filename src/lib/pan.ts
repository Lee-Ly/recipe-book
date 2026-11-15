import type { Category } from "./categories";
import type { Pan } from "./types";

/** A recipe is a baking recipe (scaled by pan size instead of servings) when one of its categories is marked as baking. */
export function isBaking(recipeCategories: string[], categories: Category[]): boolean {
  return recipeCategories.some((id) => categories.find((c) => c.id === id)?.baking);
}

export const PAN_SHAPES: { id: Pan["shape"]; label: string }[] = [
  { id: "round", label: "Round" },
  { id: "square", label: "Square" },
  { id: "rect", label: "Rectangle" },
];

export function panArea(pan: Pan): number {
  if (pan.shape === "round") return Math.PI * (pan.a / 2) ** 2;
  if (pan.shape === "square") return pan.a * pan.a;
  return pan.a * (pan.b ?? pan.a);
}

export function panLabel(pan: Pan): string {
  if (pan.shape === "round") return `Round ${pan.a} cm`;
  if (pan.shape === "square") return `Square ${pan.a} cm`;
  return `${pan.a} × ${pan.b ?? pan.a} cm`;
}

/**
 * How much to multiply the amounts when baking in a different pan.
 * TODO: this is plain area ratio. The owner will provide their own conversion rules; replace this one function.
 */
export function panFactor(from: Pan, to: Pan): number {
  const a = panArea(from);
  return a > 0 ? panArea(to) / a : 1;
}
