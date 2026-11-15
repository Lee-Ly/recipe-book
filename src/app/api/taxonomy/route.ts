import { isAuthed, unauthorized } from "@/lib/auth";
import { changeTaxonomy, type TaxonomyChange } from "@/lib/store";

/** One change to the category / tag lists (add, rename, delete); returns the updated lists. */
export async function POST(req: Request) {
  if (!(await isAuthed())) return unauthorized();
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  let change: TaxonomyChange | null = null;
  switch (body?.op) {
    case "addCategory":
      change = { op: "addCategory", name: s(body.name), baking: body.baking === true };
      break;
    case "renameCategory":
      change = { op: "renameCategory", id: s(body.id), name: s(body.name) };
      break;
    case "setBaking":
      change = { op: "setBaking", id: s(body.id), baking: body.baking === true };
      break;
    case "deleteCategory":
      change = { op: "deleteCategory", id: s(body.id) };
      break;
    case "addTag":
      change = { op: "addTag", name: s(body.name) };
      break;
    case "renameTag":
      change = { op: "renameTag", from: s(body.from), to: s(body.to) };
      break;
    case "deleteTag":
      change = { op: "deleteTag", name: s(body.name) };
      break;
  }
  if (!change) return Response.json({ error: "Unknown change." }, { status: 400 });
  return Response.json(await changeTaxonomy(change));
}
