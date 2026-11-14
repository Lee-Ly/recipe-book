import { randomBytes } from "node:crypto";
import { isAuthed, unauthorized } from "@/lib/auth";
import { getRecipe, upsertRecipe } from "@/lib/store";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return unauthorized();
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) return Response.json({ error: "Not found" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { enabled?: unknown; regenerate?: unknown };
  const enabled = body.enabled === true;
  const shareToken = enabled ? (body.regenerate === true || !recipe.shareToken ? randomBytes(18).toString("base64url") : recipe.shareToken) : null;
  await upsertRecipe({ ...recipe, shareToken });
  return Response.json({ shareToken });
}
