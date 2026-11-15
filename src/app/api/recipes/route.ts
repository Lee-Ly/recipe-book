import { randomUUID } from "node:crypto";
import { isAuthed, unauthorized } from "@/lib/auth";
import { readRecipeForm, storeImageFor } from "@/lib/recipe-input";
import { upsertRecipe } from "@/lib/store";
import type { Recipe } from "@/lib/types";

/** Allow up to 60 seconds: reading a recipe or converting amounts calls the AI. */
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await isAuthed())) return unauthorized();
  try {
    const input = await readRecipeForm(req);
    const id = randomUUID();
    const image = await storeImageFor(id, input);
    const recipe: Recipe = {
      ...input.draft,
      id,
      sourceUrl: input.sourceUrl,
      image: image.name,
      shareToken: null,
      favorite: false,
      notes: input.notes ?? "",
      createdAt: new Date().toISOString(),
    };
    await upsertRecipe(recipe);
    return Response.json({ id, imageWarning: image.warning });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Couldn't save." }, { status: 400 });
  }
}
