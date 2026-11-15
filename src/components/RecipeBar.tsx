"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setAwake, useAwake, useAwakeSupported } from "@/lib/timer-store";
import BackButton from "./BackButton";
import { HeartIcon, PencilIcon, SunIcon } from "./icons";
import SiteHeader from "./SiteHeader";
import { btnIcon } from "./ui";

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
            <PencilIcon />
          </Link>
          <button type="button" onClick={toggleFavorite} aria-pressed={favorite} aria-label={favorite ? "Remove from favorites" : "Add to favorites"} className={btnIcon}>
            <HeartIcon filled={favorite} className={`h-4 w-4 transition ${favorite ? "text-accent" : "text-muted"}`} />
          </button>
          <button
            type="button"
            onClick={() => setAwake(!awake)}
            disabled={!awakeSupported}
            aria-pressed={awake}
            title={awakeSupported ? "Keep the screen on while cooking" : "This browser can't keep the screen on"}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold text-foreground transition disabled:opacity-40 ${awake ? "border-foreground bg-card" : "border-line bg-accent-soft"}`}
          >
            <span className={`h-2 w-2 rounded-full ${awake ? "animate-pulse bg-emerald-500" : "bg-line-strong"}`} aria-hidden />
            <SunIcon className="h-3.5 w-3.5 text-accent" />
            <span>Awake</span>
          </button>
        </>
      }
    />
  );
}
