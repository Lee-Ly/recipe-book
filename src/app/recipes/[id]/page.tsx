import { notFound } from "next/navigation";
import DeleteButton from "@/components/DeleteButton";
import RecipeBar from "@/components/RecipeBar";
import RecipeView from "@/components/RecipeView";
import ShareControls from "@/components/ShareControls";
import { requireAuth } from "@/lib/auth";
import { getRecipe, getTaxonomy } from "@/lib/store";

export default async function RecipePage({ params }: PageProps<"/recipes/[id]">) {
  await requireAuth();
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();
  const taxonomy = await getTaxonomy();

  return (
    <>
      <RecipeBar id={recipe.id} favorite={recipe.favorite} />
      <div className="mx-auto max-w-2xl">
        <RecipeView recipe={recipe} categories={taxonomy.categories} />
        <div className="mt-10 flex flex-col gap-2 border-t border-line pt-4">
          <ShareControls id={recipe.id} initialToken={recipe.shareToken} />
          <DeleteButton id={recipe.id} title={recipe.title} />
        </div>
      </div>
    </>
  );
}
