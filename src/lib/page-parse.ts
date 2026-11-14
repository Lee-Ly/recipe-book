export interface PageInfo {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  /** Recipe text taken from the page's embedded schema.org data, if present */
  recipeText: string | null;
  /** Visible text of the page, used when there is no embedded recipe */
  bodyText: string;
}

const ENTITIES: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n: string) => ENTITIES[n.toLowerCase()] ?? m);
}

function metaContent(html: string, key: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const k = /(?:property|name)=["']([^"']+)["']/i.exec(tag)?.[1];
    if (k?.toLowerCase() !== key) continue;
    const c = /content=("([^"]*)"|'([^']*)')/i.exec(tag);
    const value = c?.[2] ?? c?.[3];
    if (value) return decodeEntities(value).trim();
  }
  return null;
}

function asArray<T>(v: T | T[] | undefined | null): T[] {
  return v == null ? [] : Array.isArray(v) ? v : [v];
}

type Json = Record<string, unknown>;

function findRecipeNode(node: unknown): Json | null {
  if (Array.isArray(node)) {
    for (const n of node) {
      const f = findRecipeNode(n);
      if (f) return f;
    }
    return null;
  }
  if (node && typeof node === "object") {
    const obj = node as Json;
    const types = asArray(obj["@type"] as string | string[] | undefined);
    if (types.includes("Recipe")) return obj;
    return findRecipeNode(obj["@graph"]);
  }
  return null;
}

function instructionLines(v: unknown): string[] {
  return asArray(v as unknown).flatMap((item): string[] => {
    if (typeof item === "string") return [item];
    if (item && typeof item === "object") {
      const o = item as Json;
      if (o.itemListElement) return instructionLines(o.itemListElement);
      if (typeof o.text === "string") return [o.text];
      if (typeof o.name === "string") return [o.name];
    }
    return [];
  });
}

function imageFrom(v: unknown): string | null {
  const first = asArray(v as unknown)[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && typeof (first as Json).url === "string") return (first as Json).url as string;
  return null;
}

function isoDurationToMinutes(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i.exec(v);
  if (!m) return null;
  return Number(m[1] ?? 0) * 1440 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) || null;
}

function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|head)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

export function parsePage(html: string): PageInfo {
  let recipe: Json | null = null;
  const scripts = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const s of scripts) {
    try {
      recipe = findRecipeNode(JSON.parse(decodeEntities(s[1].trim())));
    } catch {
      /* ignore malformed JSON-LD */
    }
    if (recipe) break;
  }

  const title = metaContent(html, "og:title") ?? /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1]?.trim() ?? null;
  let recipeText: string | null = null;
  let imageUrl = metaContent(html, "og:image");

  if (recipe) {
    const ingredients = asArray(recipe.recipeIngredient as string[] | string | undefined).map((s) => decodeEntities(String(s)));
    const steps = instructionLines(recipe.recipeInstructions).map(decodeEntities);
    const minutes = isoDurationToMinutes(recipe.totalTime);
    recipeText = [
      `Title: ${decodeEntities(String(recipe.name ?? title ?? ""))}`,
      recipe.recipeYield ? `Yield: ${asArray(recipe.recipeYield as string).join(" ")}` : "",
      minutes ? `Total time: ${minutes} minutes` : "",
      "Ingredients:",
      ...ingredients,
      "Instructions:",
      ...steps,
    ]
      .filter(Boolean)
      .join("\n");
    imageUrl = imageFrom(recipe.image) ?? imageUrl;
  }

  return {
    title,
    description: metaContent(html, "og:description") ?? metaContent(html, "description"),
    imageUrl,
    recipeText,
    bodyText: stripTags(html).slice(0, 12000),
  };
}
