"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { categoryFilterLabel, categoryLabel } from "@/lib/categories";
import { LAST_VIEWED_KEY } from "@/lib/last-viewed";
import { btnGhost, btnPrimary, cardCls, categoryBadge, filterChip, inputCls, panelCls, tagBadge } from "./ui";

export interface CardData {
  id: string;
  title: string;
  language: string;
  image: string | null;
  tags: string[];
  categories: string[];
  author: string;
  favorite: boolean;
  ingredients: string[];
}

/** First page shows 6 recipes, every later page 10. */
const FIRST_PAGE = 6;
const NEXT_PAGES = 10;
const FAVORITES = "__favorites";

function countBy(items: string[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function subscribeStorage(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

function readLastViewed(): string | null {
  try {
    return localStorage.getItem(LAST_VIEWED_KEY);
  } catch {
    return null;
  }
}

function Heart({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-[18px] w-[18px] ${on ? "fill-accent text-accent" : "fill-none text-foreground/70"}`} stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export default function RecipeBrowser({ recipes, initialQuery = "" }: { recipes: CardData[]; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [favs, setFavs] = useState<Record<string, boolean>>(() => Object.fromEntries(recipes.map((r) => [r.id, r.favorite])));
  const lastId = useSyncExternalStore(subscribeStorage, readLastViewed, () => null);

  const categories = useMemo(() => countBy(recipes.flatMap((r) => r.categories)), [recipes]);
  const hasFavorites = recipes.some((r) => favs[r.id]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^#/, "");
    return recipes.filter((r) => {
      if (filter === FAVORITES ? !favs[r.id] : filter && !r.categories.includes(filter)) return false;
      if (!q) return true;
      return [r.title, ...r.tags, ...r.categories, ...r.ingredients].some((s) => s.toLowerCase().includes(q));
    });
  }, [recipes, query, filter, favs]);

  const totalPages = visible.length <= FIRST_PAGE ? 1 : 1 + Math.ceil((visible.length - FIRST_PAGE) / NEXT_PAGES);
  const current = Math.min(page, totalPages);
  const start = current === 1 ? 0 : FIRST_PAGE + (current - 2) * NEXT_PAGES;
  const shown = visible.slice(start, current === 1 ? FIRST_PAGE : start + NEXT_PAGES);
  const resume = !query && !filter ? recipes.find((r) => r.id === lastId) : undefined;

  function changeQuery(v: string) {
    setQuery(v);
    setPage(1);
  }

  function changeFilter(v: string | null) {
    setFilter(v);
    setPage(1);
  }

  function goTo(p: number) {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleFavorite(id: string) {
    const next = !favs[id];
    setFavs((f) => ({ ...f, [id]: next }));
    try {
      const res = await fetch(`/api/recipes/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ favorite: next }) });
      if (!res.ok) throw new Error();
    } catch {
      setFavs((f) => ({ ...f, [id]: !next }));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        dir="rtl"
        value={query}
        onChange={(e) => changeQuery(e.target.value)}
        placeholder="חפש מתכון"
        aria-label="חפש מתכון"
        className={inputCls}
      />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Categories">
        <button type="button" onClick={() => changeFilter(null)} aria-pressed={filter === null} className={filterChip(filter === null)}>
          הכל
        </button>
        {hasFavorites && (
          <button type="button" onClick={() => changeFilter(filter === FAVORITES ? null : FAVORITES)} aria-pressed={filter === FAVORITES} className={filterChip(filter === FAVORITES)}>
            ♥ מועדפים
          </button>
        )}
        {categories.map(([id]) => (
          <button key={id} type="button" onClick={() => changeFilter(filter === id ? null : id)} aria-pressed={filter === id} className={filterChip(filter === id)}>
            {categoryFilterLabel(id)}
          </button>
        ))}
      </div>

      {resume && (
        <Link href={`/recipes/${resume.id}`} className={`flex items-center gap-3 ${panelCls} p-2.5 pe-4 active:opacity-80`}>
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-line">
            {resume.image ? <img src={`/api/img/${resume.image}`} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xl opacity-60">🍽️</div>}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-accent">המשך מתכון</p>
            <p dir="auto" className="truncate text-[15px] font-bold">
              {resume.title}
            </p>
          </div>
          <span className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-accent-fg">המשך</span>
        </Link>
      )}

      {visible.length === 0 ? (
        <div className="py-16 text-center text-muted">
          <p>אין תוצאות</p>
          {(query || filter) && (
            <button
              type="button"
              className="mt-1 min-h-11 text-accent underline"
              onClick={() => {
                changeQuery("");
                changeFilter(null);
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4">
            {shown.map((r) => (
              <li key={r.id} className={`relative ${cardCls} p-2`}>
                <Link href={`/recipes/${r.id}`} className="group block">
                  <div className="aspect-[4/3] overflow-hidden rounded-xl bg-accent-soft">
                    {r.image ? (
                      <img src={`/api/img/${r.image}`} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl opacity-60" aria-hidden>
                        🍽️
                      </div>
                    )}
                  </div>
                  <h2 dir="auto" className="mt-2.5 line-clamp-2 px-1 text-[15px] font-bold leading-snug">
                    {r.title}
                  </h2>
                  {r.author && (
                    <p dir={r.language === "he" ? "rtl" : "ltr"} className="mt-0.5 truncate px-1 text-xs font-light text-muted">
                      <bdi>{r.author}</bdi>
                    </p>
                  )}
                  <p dir={r.language === "he" ? "rtl" : "ltr"} className="mt-2 flex max-h-14 flex-wrap gap-1 overflow-hidden px-1 pb-1">
                    {r.categories[0] && <span className={categoryBadge}>{categoryLabel(r.categories[0], r.language)}</span>}
                    {r.tags.slice(0, 3).map((t) => (
                      <span key={t} className={tagBadge}>
                        {t}
                      </span>
                    ))}
                  </p>
                </Link>
                <button
                  type="button"
                  onClick={() => toggleFavorite(r.id)}
                  aria-pressed={!!favs[r.id]}
                  aria-label={favs[r.id] ? `Remove ${r.title} from favorites` : `Add ${r.title} to favorites`}
                  className="absolute right-3.5 top-3.5 flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-background/90 backdrop-blur active:scale-95"
                >
                  <Heart on={!!favs[r.id]} />
                </button>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <nav aria-label="Pages" className="flex items-center justify-between gap-3 pt-2">
              <button type="button" disabled={current <= 1} onClick={() => goTo(current - 1)} className={btnGhost}>
                <span aria-hidden className="inline-block rtl:rotate-180">←</span> Prev
              </button>
              <span className="text-sm text-muted tabular-nums">
                Page {current} of {totalPages}
              </span>
              <button type="button" disabled={current >= totalPages} onClick={() => goTo(current + 1)} className={`${btnPrimary} min-h-11 text-sm`}>
                Next <span aria-hidden className="inline-block rtl:rotate-180">→</span>
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
