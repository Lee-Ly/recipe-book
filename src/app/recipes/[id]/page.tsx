import { notFound } from "next/navigation";
import DeleteButton from "@/components/DeleteButton";
import PasswordGate from "@/components/PasswordGate";
import RecipeBar from "@/components/RecipeBar";
import RecipeView from "@/components/RecipeView";
import ShareControls from "@/components/ShareControls";
import { getRole } from "@/lib/auth";
import { getRecipe, getTaxonomy } from "@/lib/store";

export default async function RecipePage({ params }: PageProps<"/recipes/[id]">) {
  const role = await getRole();
  if (!role) return <PasswordGate />;
  const owner = role === "owner";
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();
  const taxonomy = await getTaxonomy();
  // RecipeView is a client component, so everything passed to it reaches the browser: friends get no private fields.
  const shown = owner ? recipe : { ...recipe, notes: "", favorite: false, shareToken: null };

  return (
    <>
      <RecipeBar id={recipe.id} favorite={recipe.favorite} readOnly={!owner} />
      <div className="mx-auto max-w-2xl">
        <RecipeView recipe={shown} categories={taxonomy.categories} readOnly={!owner} />
        {owner && (
          <div className="mt-10 flex flex-col gap-2 border-t border-line pt-4">
            <ShareControls id={recipe.id} initialToken={recipe.shareToken} />
            <DeleteButton id={recipe.id} title={recipe.title} />
          </div>
        )}
      </div>
    </>
  );
}
