export interface CategoryDef {
  id: string;
  en: string;
  he: string;
}

export const DEFAULT_CATEGORIES: CategoryDef[] = [
  { id: "cookies", en: "Cookies", he: "עוגיות" },
  { id: "cake", en: "Cake", he: "עוגות" },
  { id: "bread", en: "Bread", he: "לחמים ומאפים" },
  { id: "dairy", en: "Dairy", he: "חלבי" },
  { id: "vegan", en: "Vegan", he: "טבעוני" },
  { id: "dessert", en: "Dessert", he: "קינוחים" },
  { id: "breakfast", en: "Breakfast", he: "ארוחת בוקר" },
  { id: "snack", en: "Snack", he: "חטיפים" },
  { id: "main", en: "Main dish", he: "מנות עיקריות" },
  { id: "soup", en: "Soup", he: "מרקים" },
  { id: "salad", en: "Salad", he: "סלטים" },
];

/** Label for a category id in the recipe's language. Custom categories are shown as typed. */
export function categoryLabel(id: string, language: string): string {
  const def = DEFAULT_CATEGORIES.find((c) => c.id === id);
  if (!def) return id;
  return language === "he" ? def.he : def.en;
}

/** Hebrew-only label used on the home filter chips. Custom categories are shown as typed. */
export function categoryFilterLabel(id: string): string {
  const def = DEFAULT_CATEGORIES.find((c) => c.id === id);
  return def ? def.he : id;
}
