import AddRecipe from "@/components/AddRecipe";
import { requireAuth } from "@/lib/auth";

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function AddPage({ searchParams }: PageProps<"/add">) {
  const sp = await searchParams;
  // When a link is shared from Instagram/WhatsApp/etc. to the installed app, it arrives as url/text/title.
  const shared = [first(sp.url), first(sp.text), first(sp.title)].filter(Boolean).join("\n");
  const sharedUrl = /https?:\/\/[^\s]+/.exec(shared)?.[0] ?? "";
  const sharedText = sharedUrl ? "" : first(sp.text);

  const back = new URLSearchParams();
  for (const k of ["url", "text", "title"]) if (first(sp[k])) back.set(k, first(sp[k]));
  await requireAuth(back.size > 0 ? `/add?${back}` : "/add");

  return <AddRecipe initialUrl={sharedUrl} initialText={sharedText} />;
}
