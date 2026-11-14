"use client";

import { useEffect, useState } from "react";
import type { ExtractResult } from "@/lib/types";
import BackButton from "./BackButton";
import RecipeForm from "./RecipeForm";
import SiteHeader from "./SiteHeader";
import { btnGhost, btnPrimary, headerTitleCls, inputCls, panelCls } from "./ui";

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

export default function AddRecipe({ initialUrl = "", initialText = "" }: { initialUrl?: string; initialText?: string }) {
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

  async function paste() {
    try {
      const clip = (await navigator.clipboard.readText()).trim();
      if (/^https?:\/\//i.test(clip)) setUrl(clip.split(/\s/)[0]);
      else if (clip) {
        setText(clip);
        setShowText(true);
      }
    } catch {
      setError("Couldn't read the clipboard. Paste into the field instead.");
    }
  }

  return (
    <>
      <SiteHeader left={<BackButton />} right={<span className={headerTitleCls}>New recipe</span>} />
      <div className="mx-auto flex max-w-2xl flex-col gap-6">

      <form onSubmit={extract} className="flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            id="url"
            dir="ltr"
            inputMode="url"
            autoComplete="off"
            aria-label="Recipe link"
            placeholder="Paste a link"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={`${inputCls} min-h-12`}
          />
          <button type="button" onClick={paste} className={`${btnGhost} min-h-12 shrink-0`}>
            Paste
          </button>
        </div>
        <p className="-mt-1 text-sm text-muted">Instagram, Facebook or any recipe page</p>

        {showText ? (
          <textarea
            id="text"
            dir="auto"
            rows={5}
            aria-label="Recipe text"
            placeholder="Paste the recipe text here, for example the author's comment"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={inputCls}
          />
        ) : (
          <button type="button" onClick={() => setShowText(true)} className="min-h-11 self-start text-sm font-medium text-accent">
            Or paste the recipe text instead
          </button>
        )}

        <button type="submit" disabled={busy || (!url.trim() && !text.trim())} className={btnPrimary}>
          {busy ? "Reading the recipe…" : result ? "Read again" : "Read recipe"}
        </button>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </form>

      {result && (
        <>
          {result.notice && (
            <p role="status" className={`${panelCls} px-4 py-3 text-sm`}>
              {result.notice}
            </p>
          )}
          <RecipeForm
            key={round}
            mode={{ kind: "create" }}
            initial={{ ...result.draft, sourceUrl: result.sourceUrl, remoteImageUrl: result.imageUrl ?? "", storedImage: null }}
          />
        </>
      )}
      </div>
    </>
  );
}
