"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { categoryName, type Category } from "@/lib/categories";
import { LAST_VIEWED_KEY } from "@/lib/last-viewed";
import { ArrowLeftIcon, ArrowRightIcon, HeartIcon, MenuIcon, SearchIcon, XIcon } from "./icons";
import { btnDark, btnGhost, btnPrimary, cardCls, categoryBadge, filterChip, searchCls, tagBadge } from "./ui";

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

function countLabel(n: number): string {
  return n === 1 ? "מתכון אחד" : `${n} מתכונים`;
}

export default function RecipeBrowser({ recipes, categories, initialQuery = "", readOnly = false }: { recipes: CardData[]; categories: Category[]; initialQuery?: string; readOnly?: boolean }) {
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [favs, setFavs] = useState<Record<string, boolean>>(() => Object.fromEntries(recipes.map((r) => [r.id, r.favorite])));
  const lastId = useSyncExternalStore(subscribeStorage, readLastViewed, () => null);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of recipes) for (const id of r.categories) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
  }, [recipes]);
  const usedCategories = categories.filter((c) => counts.has(c.id));
  const hasFavorites = recipes.some((r) => favs[r.id]);
  const nameOf = (id: string) => categoryName(categories, id, "he");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^#/, "");
    return recipes.filter((r) => {
      if (filter === FAVORITES ? !favs[r.id] : filter && !r.categories.includes(filter)) return false;
      if (!q) return true;
      return [r.title, ...r.tags, ...r.categories.map(nameOf), ...r.ingredients].some((s) => s.toLowerCase().includes(q));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipes, query, filter, favs, categories]);

  const totalPages = visible.length <= FIRST_PAGE ? 1 : 1 + Math.ceil((visible.length - FIRST_PAGE) / NEXT_PAGES);
  const current = Math.min(page, totalPages);
  const start = current === 1 ? 0 : FIRST_PAGE + (current - 2) * NEXT_PAGES;
  const shown = visible.slice(start, current === 1 ? FIRST_PAGE : start + NEXT_PAGES);
  const resume = !query && !filter ? recipes.find((r) => r.id === lastId) : undefined;
  const heading = filter === FAVORITES ? "מועדפים" : filter ? nameOf(filter) : "כל המתכונים";

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
    <div className="space-y-5 pt-4">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute start-3.5 top-3.5 h-4 w-4 text-muted-2" />
          <input type="search" dir="rtl" value={query} onChange={(e) => changeQuery(e.target.value)} placeholder="חפש מתכון" aria-label="חפש מתכון" className={searchCls} />
        </div>
        <button type="button" onClick={() => setMenuOpen(true)} className={`${btnGhost} h-[46px] px-3`} aria-haspopup="dialog">
          <MenuIcon className="h-4 w-4" />
          <span>קטגוריות</span>
        </button>
      </div>

      <div className="no-scrollbar -mx-5 flex items-center gap-2 overflow-x-auto px-5 pb-0.5" role="group" aria-label="Categories">
        <button type="button" onClick={() => changeFilter(null)} aria-pressed={filter === null} className={filterChip(filter === null)}>
          הכל
        </button>
        {hasFavorites && (
          <button type="button" onClick={() => changeFilter(filter === FAVORITES ? null : FAVORITES)} aria-pressed={filter === FAVORITES} className={filterChip(filter === FAVORITES)}>
            ♥ מועדפים
          </button>
        )}
        {usedCategories.map((c) => (
          <button key={c.id} type="button" onClick={() => changeFilter(filter === c.id ? null : c.id)} aria-pressed={filter === c.id} className={filterChip(filter === c.id)}>
            {c.name}
          </button>
        ))}
      </div>

      {resume && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-foreground p-3.5 text-background shadow-md">
          <Link href={`/recipes/${resume.id}`} className="flex min-w-0 flex-1 items-center gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-white/10">
              {resume.image ? <img src={`/api/img/${resume.image}`} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-lg opacity-60">🍽️</div>}
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-accent">המשך מתכון</span>
              <h3 dir="auto" className="truncate text-sm font-bold">
                {resume.title}
              </h3>
            </div>
          </Link>
          <Link href={`/recipes/${resume.id}`} className={btnPrimary}>
            המשך
          </Link>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <h2 className="text-base font-bold">{heading}</h2>
        <span className="text-xs font-medium tabular-nums text-muted">{countLabel(visible.length)}</span>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-line bg-accent-soft p-8 text-center">
          <p className="text-sm font-bold">אין תוצאות</p>
          {(query || filter) && (
            <button
              type="button"
              className={`${btnDark} mt-3`}
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
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5 lg:grid-cols-4">
            {shown.map((r) => (
              <li key={r.id} className="relative">
                <Link href={`/recipes/${r.id}`} className={`group block p-3 ${cardCls}`}>
                  <div className="aspect-[4/3] overflow-hidden rounded-xl border border-line/50 bg-accent-soft">
                    {r.image ? (
                      <img src={`/api/img/${r.image}`} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl opacity-60" aria-hidden>
                        🍽️
                      </div>
                    )}
                  </div>
                  <h3 dir="auto" className="mt-2.5 line-clamp-2 text-sm font-bold leading-snug transition group-hover:text-accent group-active:text-accent">
                    {r.title}
                  </h3>
                  {r.author && (
                    <p dir={r.language === "he" ? "rtl" : "ltr"} className="mt-0.5 truncate text-xs font-light text-muted">
                      <bdi>{r.author}</bdi>
                    </p>
                  )}
                  <p dir={r.language === "he" ? "rtl" : "ltr"} className="mt-2 flex flex-wrap gap-1">
                    {r.categories[0] && <span className={categoryBadge}>{categoryName(categories, r.categories[0], r.language)}</span>}
                    {r.tags.slice(0, 3).map((t) => (
                      <span key={t} className={tagBadge}>
                        {t}
                      </span>
                    ))}
                  </p>
                </Link>
                {!readOnly && (
                <button
                  type="button"
                  onClick={() => toggleFavorite(r.id)}
                  aria-pressed={!!favs[r.id]}
                  aria-label={favs[r.id] ? `Remove ${r.title} from favorites` : `Add ${r.title} to favorites`}
                  className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-card/90 backdrop-blur transition hover:border-accent active:border-accent"
                >
                  <HeartIcon filled={!!favs[r.id]} className={`h-4 w-4 transition ${favs[r.id] ? "text-accent" : "text-muted-2"}`} />
                </button>
                )}
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <nav aria-label="Pages" className="flex items-center justify-between gap-3 pb-4 pt-2">
              <button type="button" disabled={current <= 1} onClick={() => goTo(current - 1)} className={btnGhost}>
                <ArrowRightIcon className="h-3.5 w-3.5 ltr:hidden" />
                <ArrowLeftIcon className="h-3.5 w-3.5 rtl:hidden" />
                <span>Prev Page</span>
              </button>
              <span className="text-xs font-semibold tabular-nums text-muted">
                Page {current} of {totalPages}
              </span>
              <button type="button" disabled={current >= totalPages} onClick={() => goTo(current + 1)} className={`${btnDark} px-4 py-2.5`}>
                <span>Next Page</span>
                <ArrowLeftIcon className="h-3.5 w-3.5 ltr:hidden" />
                <ArrowRightIcon className="h-3.5 w-3.5 rtl:hidden" />
              </button>
            </nav>
          )}
        </>
      )}

      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setMenuOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="קטגוריות" className="absolute inset-x-0 bottom-0 mx-auto max-h-[75vh] max-w-2xl overflow-y-auto rounded-t-3xl bg-background p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">קטגוריות</h2>
              <button type="button" aria-label="Close" onClick={() => setMenuOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:bg-accent-soft active:bg-accent-soft">
                <XIcon />
              </button>
            </div>
            <ul className="space-y-1.5">
              {[{ id: null as string | null, name: "כל המתכונים", count: recipes.length }, ...categories.map((c) => ({ id: c.id as string | null, name: c.name, count: counts.get(c.id) ?? 0 }))].map((row) => (
                <li key={row.id ?? "all"}>
                  <button
                    type="button"
                    onClick={() => {
                      changeFilter(row.id);
                      setMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-start text-sm font-semibold transition ${filter === row.id ? "border-foreground bg-foreground text-background" : "border-line bg-card hover:border-foreground active:border-foreground"}`}
                  >
                    <span>{row.name}</span>
                    <span className={`text-xs tabular-nums ${filter === row.id ? "opacity-70" : "text-muted"}`}>{row.count}</span>
                  </button>
                </li>
              ))}
            </ul>
            {!readOnly && (
              <Link href="/manage" className="mt-4 block text-center text-xs font-bold text-accent hover:underline">
                ניהול קטגוריות ותגיות
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
