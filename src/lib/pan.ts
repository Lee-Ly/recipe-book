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

/** The owner's pan list. Areas (cm²) are the owner's own table, so the multipliers match it exactly. */
export interface PanPreset {
  id: string;
  he: string;
  en: string;
  pan: Pan;
  area: number;
}

const roundPan = (a: number, area: number): PanPreset => ({ id: `round-${a}`, he: `${a} ס״מ`, en: `${a} cm`, pan: { shape: "round", a, b: null }, area });
const boxPan = (id: string, he: string, en: string, a: number, b: number): PanPreset => ({
  id,
  // The size is wrapped in an isolate (U+2066 ... U+2069) so "30×10" is not shown backwards in right-to-left text.
  he: `${he ? `${he} ` : ""}⁦${a}×${b}⁩ ס״מ`,
  en: `${en ? `${en} ` : ""}${a}×${b} cm`,
  pan: { shape: a === b ? "square" : "rect", a, b: a === b ? null : b },
  area: a * b,
});

export const PAN_PRESETS: PanPreset[] = [
  roundPan(18, 254),
  roundPan(20, 314),
  roundPan(22, 380),
  roundPan(24, 452),
  roundPan(26, 531),
  roundPan(28, 615),
  boxPan("loaf", "אינגליש קייק", "Loaf", 30, 10),
  boxPan("square-20", "", "", 20, 20),
  boxPan("square-24", "", "", 24, 24),
  boxPan("rect-30x20", "", "", 30, 20),
  boxPan("rect-32x25", "", "", 32, 25),
  boxPan("rect-35x25", "", "", 35, 25),
  boxPan("oven-tray", "תבנית תנור", "Oven tray", 40, 32),
];

/** The listed pan that is the same pan (a rectangle matches in either direction), or undefined. */
export function matchPreset(pan: Pan): PanPreset | undefined {
  const dims = (p: Pan) => (p.shape === "round" ? [p.a] : [p.a, p.b ?? p.a].sort((x, y) => x - y));
  const mine = dims(pan).join();
  return PAN_PRESETS.find((p) => (p.pan.shape === "round") === (pan.shape === "round") && dims(p.pan).join() === mine);
}

/** Base area in cm². Listed pans use the owner's table; others use pi = 3.14 for round and length x width otherwise. */
export function panArea(pan: Pan): number {
  const listed = matchPreset(pan);
  if (listed) return listed.area;
  if (pan.shape === "round") return 3.14 * (pan.a / 2) ** 2;
  return pan.a * (pan.b ?? pan.a);
}

export function panLabel(pan: Pan): string {
  if (pan.shape === "round") return `Round ${pan.a} cm`;
  if (pan.shape === "square") return `Square ${pan.a} cm`;
  return `${pan.a} × ${pan.b ?? pan.a} cm`;
}

/** New pan area / original pan area: multiply every ingredient by this. */
export function panFactor(from: Pan, to: Pan): number {
  const a = panArea(from);
  return a > 0 ? panArea(to) / a : 1;
}

/** The servings the owner can pick when scaling a cooking recipe. */
export const SERVINGS_OPTIONS = [2, 4, 6, 8, 10];

/** Ingredients that should not grow in step with the servings (salt, pepper, chili, strong spices and herbs). */
const SEASONING = /מלח|פלפל|צ'ילי|צילי|פפריקה|כמון|כורכום|קינמון|קארי|אורגנו|טימין|רוזמרין|זעתר|בהרט|תבלין|\b(salt|pepper|chili|chilli|paprika|cumin|turmeric|cinnamon|curry|oregano|thyme|rosemary|za'?atar|spice|seasoning)\b/i;

export function isSeasoning(name: string): boolean {
  return SEASONING.test(name);
}

/** Seasonings grow at most 1.5x when a recipe is scaled up (taste and adjust); scaling down stays proportional. */
export function seasoningFactor(factor: number): number {
  return Math.min(factor, 1.5);
}
