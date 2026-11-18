import { isViewer } from "@/lib/auth";
import { listRecipes, readImage } from "@/lib/store";

/** Serves a recipe photo to the owner, to a friend who is logged in, or to anyone holding that recipe's share token. */
export async function GET(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!(await isViewer())) {
    const token = new URL(req.url).searchParams.get("t") ?? "";
    const shared = token ? (await listRecipes()).find((r) => r.shareToken === token && r.image === name) : null;
    if (!shared) return new Response("Not found", { status: 404 });
  }
  const img = await readImage(name);
  if (!img) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(img.data), {
    headers: { "content-type": img.contentType, "cache-control": "private, max-age=3600" },
  });
}
