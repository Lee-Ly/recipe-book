import { isAuthed, unauthorized } from "@/lib/auth";
import { extractRecipe } from "@/lib/extract";

/** Allow up to 60 seconds: reading a recipe or converting amounts calls the AI. */
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await isAuthed())) return unauthorized();
  const body = (await req.json().catch(() => ({}))) as { url?: unknown; text?: unknown };
  const url = typeof body.url === "string" ? body.url : "";
  const text = typeof body.text === "string" ? body.text : "";
  if (!url.trim() && !text.trim()) {
    return Response.json({ error: "Paste a link or the recipe text." }, { status: 400 });
  }
  try {
    return Response.json(await extractRecipe(url, text));
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Extraction failed." }, { status: 400 });
  }
}
