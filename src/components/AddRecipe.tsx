"use client";

import { useEffect, useState } from "react";
import type { Category } from "@/lib/categories";
import type { ExtractResult, RecipeDraft } from "@/lib/types";
import BackButton from "./BackButton";
import { LinkIcon } from "./icons";
import RecipeForm from "./RecipeForm";
import SiteHeader from "./SiteHeader";
import { btnPrimary, panelCls } from "./ui";

const EMPTY_DRAFT: RecipeDraft = {
  title: "",
  language: "he",
  author: "",
  ingredients: [],
  steps: [],
  ovenCelsius: null,
  totalMinutes: null,
  servings: null,
  pan: null,
  tags: [],
  categories: [],
};

async function requestExtract(url: string, text: string): Promise<ExtractResult> {
  const res = await fetch("/api/extract", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url, text }),
  });
  const json = (await res.json()) as ExtractResult & { error?: string };
  if (!res.ok) throw new Error(json.error ?? "Extraction failed.");
  return json;
}

const darkField =
  "w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-base text-background outline-none transition placeholder:text-muted-2 focus:border-accent";

export default function AddRecipe({ initialUrl = "", initialText = "", categories, tagPool }: { initialUrl?: string; initialText?: string; categories: Category[]; tagPool: string[] }) {
  const autoStart = !!(initialUrl || initialText);
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState(initialText);
  // A shared link starts reading right away, so the page opens already busy.
  const [busy, setBusy] = useState(autoStart);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [round, setRound] = useState(0);
  const [showText, setShowText] = useState(!!initialText);

  function done(r: ExtractResult) {
    setResult(r);
    setRound((n) => n + 1);
    if (r.needsText) setShowText(true);
  }

  useEffect(() => {
    if (!autoStart) return;
    requestExtract(initialUrl, initialText)
      .then(done)
      .catch((err) => setError(err instanceof Error ? err.message : "Extraction failed."))
      .finally(() => setBusy(false));
    // Runs once for a shared link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function extract(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      done(await requestExtract(url, text));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SiteHeader
        left={<BackButton variant="cancel" />}
        center={<h1 className="text-base font-bold">New Recipe</h1>}
        right={
          <button type="submit" form="recipe-form" className={btnPrimary}>
            Save
          </button>
        }
      />
      <div dir="ltr" className="mx-auto max-w-2xl space-y-5 pb-4 pt-4">
        {/* Import from link */}
        <form onSubmit={extract} className="space-y-3 rounded-2xl bg-foreground p-4 text-background shadow-sm">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-bold">Import Recipe from Link</h2>
          </div>
          <div className="flex items-center gap-2">
            <input id="url" dir="ltr" inputMode="url" autoComplete="off" aria-label="Recipe link" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} className={`${darkField} min-w-0 flex-1`} />
            <button type="submit" disabled={busy || (!url.trim() && !text.trim())} className={btnPrimary}>
              {busy ? "Reading…" : result ? "Read again" : "Import"}
            </button>
          </div>
          {showText ? (
            <textarea id="text" dir="auto" rows={4} aria-label="Recipe text" placeholder="Paste the recipe text here, for example the author's comment" value={text} onChange={(e) => setText(e.target.value)} className={`${darkField} leading-relaxed`} />
          ) : (
            <button type="button" onClick={() => setShowText(true)} className="text-[11px] font-bold text-accent hover:underline">
              Or paste the recipe text instead
            </button>
          )}
          {error && (
            <p role="alert" className="text-xs font-semibold text-red-300">
              {error}
            </p>
          )}
        </form>

        {result?.notice && (
          <p role="status" className={`${panelCls} px-4 py-3 text-xs leading-relaxed`}>
            {result.notice}
          </p>
        )}

        <RecipeForm
          key={round}
          mode={{ kind: "create" }}
          categories={categories}
          tagPool={tagPool}
          initial={
            result
              ? { ...result.draft, sourceUrl: result.sourceUrl, remoteImageUrl: result.imageUrl ?? "", storedImage: null, notes: result.draft.notes ?? "" }
              : { ...EMPTY_DRAFT, sourceUrl: "", remoteImageUrl: "", storedImage: null, notes: "" }
          }
        />
      </div>
    </>
  );
}
