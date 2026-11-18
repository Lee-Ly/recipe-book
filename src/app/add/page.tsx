import AddRecipe from "@/components/AddRecipe";
import { getRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import PasswordGate from "@/components/PasswordGate";
import { getTaxonomy } from "@/lib/store";

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function AddPage({ searchParams }: PageProps<"/add">) {
  const sp = await searchParams;
  // When a link is shared from Instagram/WhatsApp/etc. to the installed app, it arrives as url/text/title.
  const shared = [first(sp.url), first(sp.text), first(sp.title)].filter(Boolean).join("\n");
  const sharedUrl = /https?:\/\/[^\s]+/.exec(shared)?.[0] ?? "";
  const sharedText = sharedUrl ? "" : first(sp.text);

  const role = await getRole();
  if (role !== "owner") {
    if (role === "guest") redirect("/");
    return <PasswordGate />;
  }

  const taxonomy = await getTaxonomy();
  return <AddRecipe initialUrl={sharedUrl} initialText={sharedText} categories={taxonomy.categories} tagPool={taxonomy.tags} />;
}
