import { isAuthed, unauthorized } from "@/lib/auth";
import { readRecipeForm, storeImageFor } from "@/lib/recipe-input";
import { deleteRecipe, getRecipe, removeImage, upsertRecipe } from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  if (!(await isAuthed())) return unauthorized();
  const { id } = await params;
  const existing = await getRecipe(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });
  try {
    const input = await readRecipeForm(req);
    let image = existing.image;
    let warning: string | null = null;
    if (input.file || (input.imageUrl && !existing.image)) {
      const stored = await storeImageFor(id, input);
      warning = stored.warning;
      if (stored.name) {
        if (existing.image) await removeImage(existing.image);
        image = stored.name;
      }
    } else if (input.removeImage && existing.image) {
      await removeImage(existing.image);
      image = null;
    }
    await upsertRecipe({ ...existing, ...input.draft, sourceUrl: input.sourceUrl, image });
    return Response.json({ id, imageWarning: warning });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Couldn't save." }, { status: 400 });
  }
}

/** Small changes made from the recipe page: the heart and the notes. */
export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await isAuthed())) return unauthorized();
  const { id } = await params;
  const existing = await getRecipe(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { favorite?: unknown; notes?: unknown };
  const next = { ...existing };
  if (typeof body.favorite === "boolean") next.favorite = body.favorite;
  if (typeof body.notes === "string") next.notes = body.notes.slice(0, 5000);
  await upsertRecipe(next);
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await isAuthed())) return unauthorized();
  const { id } = await params;
  await deleteRecipe(id);
  return Response.json({ ok: true });
}
