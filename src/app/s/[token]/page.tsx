import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RecipeView from "@/components/RecipeView";
import { getRecipeByToken } from "@/lib/store";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function SharedRecipePage({ params }: PageProps<"/s/[token]">) {
  const { token } = await params;
  const recipe = await getRecipeByToken(token);
  if (!recipe) notFound();
  // RecipeView is a client component, so everything passed here reaches the visitor's browser: keep private fields out.
  return <RecipeView recipe={{ ...recipe, notes: "", favorite: false, sourceUrl: recipe.sourceUrl }} shareToken={token} />;
}
