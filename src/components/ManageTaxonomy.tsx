"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Taxonomy } from "@/lib/categories";
import ConfirmDialog from "./ConfirmDialog";
import { PlusIcon, TrashIcon } from "./icons";
import { btnDark, inputCls, panelCls, rowCls } from "./ui";

type Pending = { kind: "category"; id: string; name: string; count: number } | { kind: "tag"; name: string; count: number };

const nameField = "min-w-0 flex-1 rounded-lg bg-transparent px-1.5 py-1.5 text-sm font-medium text-foreground outline-none transition focus:bg-accent-soft";
const countBadge = "min-w-7 rounded-md bg-accent-soft px-2 py-0.5 text-center text-[11px] font-bold tabular-nums text-muted";
const trashBtn = "p-1 text-muted-2 transition hover:text-rose-600 active:text-rose-600";

/** Add, rename and delete the categories (types of food) and tags (keywords) available on the site. */
export default function ManageTaxonomy({
  initial,
  categoryCounts,
  tagCounts,
}: {
  initial: Taxonomy;
  categoryCounts: Record<string, number>;
  tagCounts: Record<string, number>;
}) {
  const router = useRouter();
  const [tax, setTax] = useState<Taxonomy>(initial);
  const [newCategory, setNewCategory] = useState("");
  const [newTag, setNewTag] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(body: Record<string, unknown>) {
    setError("");
    try {
      const res = await fetch("/api/taxonomy", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      setTax((await res.json()) as Taxonomy);
      router.refresh();
    } catch {
      setError("Couldn't save the change. Try again.");
    }
  }

  async function confirmDelete() {
    if (!pending) return;
    setBusy(true);
    await send(pending.kind === "category" ? { op: "deleteCategory", id: pending.id } : { op: "deleteTag", name: pending.name });
    setBusy(false);
    setPending(null);
  }

  return (
    <div className="space-y-5">
      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}

      {/* Categories */}
      <section className={`${panelCls} space-y-3 p-4`}>
        <div>
          <h2 className="text-sm font-bold">Categories</h2>
          <p className="text-[11px] text-muted">The type of food (cookies, soup, dessert...). Recipes are browsed by category.</p>
        </div>

        <form
          className="flex items-center gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newCategory.trim()) return;
            await send({ op: "addCategory", name: newCategory });
            setNewCategory("");
          }}
        >
          <input dir="auto" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category" aria-label="New category" className={`${inputCls} min-w-0 flex-1 py-2`} />
          <button type="submit" className={btnDark}>
            <PlusIcon className="h-3.5 w-3.5" />
            Add
          </button>
        </form>

        <ul className="space-y-2">
          {tax.categories.map((c) => (
            <li key={c.id} className={`flex items-center gap-2 p-2 ${rowCls}`}>
              <span className={countBadge} title="Recipes in this category">
                {categoryCounts[c.id] ?? 0}
              </span>
              <input
                key={c.name}
                dir="auto"
                defaultValue={c.name}
                aria-label={`Rename ${c.name}`}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== c.name) void send({ op: "renameCategory", id: c.id, name: v });
                  else e.target.value = c.name;
                }}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                className={nameField}
              />
              <button type="button" aria-label={`Delete ${c.name}`} onClick={() => setPending({ kind: "category", id: c.id, name: c.name, count: categoryCounts[c.id] ?? 0 })} className={trashBtn}>
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
          {tax.categories.length === 0 && <li className="text-[11px] italic text-muted-2">No categories yet</li>}
        </ul>
      </section>

      {/* Tags */}
      <section className={`${panelCls} space-y-3 p-4`}>
        <div>
          <h2 className="text-sm font-bold">Tags</h2>
          <p className="text-[11px] text-muted">Keywords that describe a dish (spicy, 15 minutes...). Used to search and offered when you add a recipe.</p>
        </div>

        <form
          className="flex items-center gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newTag.trim()) return;
            await send({ op: "addTag", name: newTag });
            setNewTag("");
          }}
        >
          <input dir="auto" value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="New tag" aria-label="New tag" className={`${inputCls} min-w-0 flex-1 py-2`} />
          <button type="submit" className={btnDark}>
            <PlusIcon className="h-3.5 w-3.5" />
            Add
          </button>
        </form>

        <ul className="space-y-2">
          {tax.tags.map((t) => (
            <li key={t} className={`flex items-center gap-2 p-2 ${rowCls}`}>
              <span className={countBadge} title="Recipes with this tag">
                {tagCounts[t] ?? 0}
              </span>
              <input
                key={t}
                dir="auto"
                defaultValue={t}
                aria-label={`Rename tag ${t}`}
                onBlur={(e) => {
                  const v = e.target.value.trim().replace(/^#/, "");
                  if (v && v !== t) void send({ op: "renameTag", from: t, to: v });
                  else e.target.value = t;
                }}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                className={nameField}
              />
              <button type="button" aria-label={`Delete tag ${t}`} onClick={() => setPending({ kind: "tag", name: t, count: tagCounts[t] ?? 0 })} className={trashBtn}>
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
          {tax.tags.length === 0 && <li className="text-[11px] italic text-muted-2">No tags yet</li>}
        </ul>
      </section>

      <ConfirmDialog
        open={!!pending}
        title={pending ? `Delete "${pending.name}"?` : ""}
        message={pending ? `It will be removed from ${pending.count} recipe${pending.count === 1 ? "" : "s"}. This can't be undone.` : undefined}
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
