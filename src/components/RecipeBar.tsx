"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setAwake, useAwake, useAwakeSupported } from "@/lib/timer-store";
import BackButton from "./BackButton";
import SiteHeader from "./SiteHeader";
import { btnGhost, btnIcon } from "./ui";

/** Header of the recipe page: back on the left; edit, favorite and screen-awake on the right. */
export default function RecipeBar({ id, favorite: initialFavorite }: { id: string; favorite: boolean }) {
  const router = useRouter();
  const [favorite, setFavorite] = useState(initialFavorite);
  const awake = useAwake();
  const awakeSupported = useAwakeSupported();

  async function toggleFavorite() {
    const next = !favorite;
    setFavorite(next);
    try {
      const res = await fetch(`/api/recipes/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ favorite: next }) });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setFavorite(!next);
    }
  }

  return (
    <SiteHeader
      left={<BackButton />}
      right={
        <>
          <Link href={`/recipes/${id}/edit`} aria-label="Edit recipe" className={btnIcon}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
          </Link>
          <button type="button" onClick={toggleFavorite} aria-pressed={favorite} aria-label={favorite ? "Remove from favorites" : "Add to favorites"} className={btnIcon}>
            <svg viewBox="0 0 24 24" className={`h-5 w-5 ${favorite ? "fill-accent text-accent" : "fill-none"}`} stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setAwake(!awake)}
            disabled={!awakeSupported}
            aria-pressed={awake}
            title={awakeSupported ? "Keep the screen on while cooking" : "This browser can't keep the screen on"}
            className={`${btnGhost} gap-2 px-3 font-bold`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${awake ? "bg-accent" : "bg-muted/50"}`} aria-hidden />
            Awake
          </button>
        </>
      }
    />
  );
}
