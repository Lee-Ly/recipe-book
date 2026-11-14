import { parseWithRules } from "./fallback-parser";
import { geminiConfigured, structureWithGemini } from "./gemini";
import { parsePage, type PageInfo } from "./page-parse";
import { isSocialHost, parsePublicUrl, safeFetch } from "./safe-fetch";
import type { ExtractResult } from "./types";

/** Instagram wraps the caption: `431 likes, 71 comments - user on Nov 10, 2026: "caption"`. */
function cleanSocialCaption(description: string): string {
  const m = /:\s*["“]([\s\S]*)["”]\.?\s*$/.exec(description);
  return (m?.[1] ?? description).trim();
}

/** The Instagram name, or the website, when it can be told. Empty otherwise (the owner can type it). */
function guessAuthor(url: URL | null, page: PageInfo | null): string {
  if (!url) return "";
  const host = url.hostname.replace(/^www\./, "");
  if (/(^|\.)instagram\.com$/.test(host)) {
    const m = /[-–]\s*([\w.]+)\s+on\s+[A-Z][a-z]+\s+\d/.exec(page?.description ?? "");
    return m ? `@${m[1]}` : "";
  }
  return isSocialHost(url.hostname) ? "" : host;
}

export async function extractRecipe(rawUrl: string, pastedText: string): Promise<ExtractResult> {
  const url = rawUrl.trim() ? parsePublicUrl(rawUrl) : null;
  let page: PageInfo | null = null;
  let notice: string | null = null;

  if (url) {
    try {
      const res = await safeFetch(url);
      if (res.ok) page = parsePage(await res.text());
      else notice = `The site answered with an error (${res.status}).`;
    } catch (err) {
      notice = err instanceof Error && err.name === "TimeoutError" ? "The site took too long to answer." : "Couldn't open that link.";
    }
  }

  const social = url ? isSocialHost(url.hostname) : false;
  const pasted = pastedText.trim();
  let source = pasted;
  if (!source && page?.recipeText) source = page.recipeText;
  if (!source && page) {
    const caption = social ? cleanSocialCaption(page.description ?? "") : page.bodyText;
    source = [page.title, caption].filter(Boolean).join("\n");
  }

  const fallbackTitle = page?.title ?? "";
  let usedAi = false;
  let draft = parseWithRules(source, fallbackTitle);

  if (source && geminiConfigured()) {
    try {
      draft = await structureWithGemini(source);
      usedAi = true;
    } catch (err) {
      console.error("Gemini extraction failed:", err instanceof Error ? err.message : err);
      notice = "The AI helper was unavailable, so a basic parser was used. Please check the details carefully.";
    }
  } else if (source && !geminiConfigured()) {
    notice = "No Gemini key is set, so a basic parser was used.";
  }

  if (!draft.title) draft.title = fallbackTitle;
  if (!draft.author) draft.author = guessAuthor(url, page);
  const needsText = draft.ingredients.length === 0;
  if (needsText && !notice) {
    notice = social
      ? "No recipe in the post's caption. If the author wrote it in a comment, paste that comment in the box above, then tap Read again."
      : "No recipe found on that page. You can paste the recipe text in the box above, then tap Read again.";
  }

  return {
    draft,
    imageUrl: page?.imageUrl ?? null,
    sourceUrl: url?.toString() ?? "",
    usedAi,
    needsText,
    notice,
  };
}
