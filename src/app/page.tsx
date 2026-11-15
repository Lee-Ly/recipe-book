import Link from "next/link";
import Header from "@/components/Header";
import RecipeBrowser, { type CardData } from "@/components/RecipeBrowser";
import { btnPrimary } from "@/components/ui";
import { requireAuth } from "@/lib/auth";
import { getTaxonomy, listRecipes } from "@/lib/store";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  await requireAuth();
  const recipes = await listRecipes();
  const taxonomy = await getTaxonomy();
  const q = (await searchParams).q;

  const cards: CardData[] = recipes.map((r) => ({
    id: r.id,
    title: r.title,
    language: r.language,
    image: r.image,
    tags: r.tags,
    categories: r.categories,
    author: r.author,
    favorite: r.favorite,
    ingredients: r.ingredients.map((i) => i.name),
  }));

  return (
    <>
      <Header />
      {recipes.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <p className="text-5xl">🍰</p>
          <h1 className="text-xl font-semibold">Your recipe book is empty</h1>
          <p className="text-muted">Paste a link to your first recipe and it will show up here.</p>
          <Link href="/add" className={btnPrimary}>
            Add your first recipe
          </Link>
        </div>
      ) : (
        <RecipeBrowser recipes={cards} categories={taxonomy.categories} initialQuery={typeof q === "string" ? q : ""} />
      )}
    </>
  );
}
