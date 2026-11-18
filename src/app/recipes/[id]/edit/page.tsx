import { notFound, redirect } from "next/navigation";
import BackButton from "@/components/BackButton";
import RecipeForm from "@/components/RecipeForm";
import SiteHeader from "@/components/SiteHeader";
import { btnPrimary } from "@/components/ui";
import { getRole } from "@/lib/auth";
import PasswordGate from "@/components/PasswordGate";
import { getRecipe, getTaxonomy } from "@/lib/store";

export default async function EditRecipePage({ params }: PageProps<"/recipes/[id]/edit">) {
  const role = await getRole();
  if (role !== "owner") {
    if (role === "guest") redirect("/");
    return <PasswordGate />;
  }
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();
  const taxonomy = await getTaxonomy();
  return (
    <>
      <SiteHeader
        left={<BackButton variant="cancel" fallback={`/recipes/${id}`} />}
        center={<h1 className="text-base font-bold">Edit Recipe</h1>}
        right={
          <button type="submit" form="recipe-form" className={btnPrimary}>
            Save
          </button>
        }
      />
      <div dir="ltr" className="mx-auto max-w-2xl pb-4 pt-4">
        <RecipeForm mode={{ kind: "edit", id }} categories={taxonomy.categories} tagPool={taxonomy.tags} initial={{ ...recipe, remoteImageUrl: "", storedImage: recipe.image }} />
      </div>
    </>
  );
}
