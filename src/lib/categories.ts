/**
 * A category is the TYPE of food (cookies, cake, soup...). A tag is a keyword that describes one dish (spicy, 15 minutes...).
 * The owner manages both on the "Categories & Tags" page; recipes store category ids and tag texts.
 */
export interface Category {
  id: string;
  /** Name shown on the site (Hebrew by default) */
  name: string;
  /** Optional English name, used for recipes written in English */
  en?: string;
  /** Baking categories scale by pan size; the others scale by number of people */
  baking?: boolean;
}

/** Categories a new site starts with. */
export const DEFAULT_CATEGORIES: Category[] = [
  { id: "cookies", name: "עוגיות", en: "Cookies", baking: true },
  { id: "cake", name: "עוגות", en: "Cake", baking: true },
  { id: "bread", name: "לחמים ומאפים", en: "Bread", baking: true },
  { id: "dairy", name: "חלבי", en: "Dairy" },
  { id: "vegan", name: "טבעוני", en: "Vegan" },
  { id: "dessert", name: "קינוחים", en: "Dessert", baking: true },
  { id: "breakfast", name: "ארוחת בוקר", en: "Breakfast" },
  { id: "snack", name: "חטיפים", en: "Snack" },
  { id: "main", name: "מנות עיקריות", en: "Main dish" },
  { id: "soup", name: "מרקים", en: "Soup" },
  { id: "salad", name: "סלטים", en: "Salad" },
];

const BAKING_WORDS = /עוג|לחם|מאפ|בצק|קינוח|פאי|טארט|cake|cookie|bread|pastr|dough|dessert|\bpie|tart|muffin/i;

/** Whether a category name sounds like baking (cake, cookies, bread, dessert...). New categories get the baking setting from this. */
export function isBakingName(name: string): boolean {
  return BAKING_WORDS.test(name);
}

export interface Taxonomy {
  categories: Category[];
  /** Every tag available on the site */
  tags: string[];
}

/** Name of a category for a recipe in `language`; unknown ids are shown as they are. */
export function categoryName(categories: Category[], id: string, language: string): string {
  const c = categories.find((x) => x.id === id);
  if (!c) return id;
  return language !== "he" && c.en ? c.en : c.name;
}
