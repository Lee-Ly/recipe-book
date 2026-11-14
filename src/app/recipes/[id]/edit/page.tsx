import { notFound } from "next/navigation";
import BackButton from "@/components/BackButton";
import RecipeForm from "@/components/RecipeForm";
import SiteHeader from "@/components/SiteHeader";
import { headerTitleCls } from "@/components/ui";
import { requireAuth } from "@/lib/auth";
import { getRecipe } from "@/lib/store";

export default async function EditRecipePage({ params }: PageProps<"/recipes/[id]/edit">) {
  await requireAuth();
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();
  return (
    <>
      <SiteHeader left={<BackButton fallback={`/recipes/${id}`} />} right={<span className={headerTitleCls}>Edit recipe</span>} />
      <div className="mx-auto max-w-2xl">
        <RecipeForm mode={{ kind: "edit", id }} initial={{ ...recipe, remoteImageUrl: "", storedImage: recipe.image }} />
      </div>
    </>
  );
}
