// The site's shared look, copied from the mockup. Every page builds on these, so a change here changes the whole site.
// Sizes follow the mockup: text-xs buttons (px-3.5 py-2, 12px radius), 36px icon buttons, 16px-radius cards, 6-8px badges.
// Form fields use 16px text instead of the mockup's 14px, because phones zoom into smaller fields.

/** Text fields on the white or grey panels. */
export const inputCls =
  "w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-base font-medium text-foreground outline-none transition placeholder:font-normal placeholder:text-muted-2 focus:border-foreground";

/** The search field: grey, turning white with a black border when focused. */
export const searchCls =
  "w-full rounded-xl border border-line bg-accent-soft py-2.5 ps-10 pe-9 text-base text-foreground outline-none transition placeholder:text-muted-2 focus:border-foreground focus:bg-card";

/** Small uppercase label above a field. */
export const fieldLabel = "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted";

const btn = "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition disabled:pointer-events-none";

/** Orange main action (New, Save, Import, Resume). */
export const btnPrimary = `${btn} bg-accent px-3.5 py-2 text-accent-fg shadow-sm hover:bg-accent-hover active:bg-accent-hover disabled:opacity-50`;

/** Black action that turns orange (Add, Next). */
export const btnDark = `${btn} bg-foreground px-3.5 py-2 text-background hover:bg-accent hover:text-accent-fg active:bg-accent active:text-accent-fg disabled:opacity-35`;

/** White outlined button (Prev, Paste, Create share link). */
export const btnGhost = `${btn} border border-line-strong bg-card px-3.5 py-2.5 text-foreground hover:border-foreground active:border-foreground disabled:opacity-35`;

/** Plain back/cancel button in the header. */
export const btnBack = `${btn} px-2.5 py-1.5 text-foreground hover:bg-accent-soft active:bg-accent-soft`;

/** Square 36px icon button (heart, pencil). */
export const btnIcon =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line text-muted transition hover:border-accent active:border-accent disabled:opacity-50";

/** Small orange text link (Paste Bulk List, Accept all). */
export const btnText = "text-[11px] font-bold text-accent hover:underline active:underline disabled:opacity-50";

/** Dashed full-width add button (Add Ingredient, Add Step). */
export const btnDashed =
  "flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong bg-card py-2.5 text-xs font-bold text-foreground transition hover:border-foreground active:border-foreground";

/** Category chip in a row (home filter): fully round; the selected one is black. */
export function filterChip(active: boolean): string {
  return `shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold transition ${
    active ? "border-foreground bg-foreground text-background shadow-sm" : "border-line bg-accent-soft text-chip-text hover:text-foreground active:text-foreground"
  }`;
}

/** Selectable category in the edit form: 12px radius, black with a check when chosen. */
export function categoryToggle(active: boolean): string {
  return `rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
    active ? "border-foreground bg-foreground text-background" : "border-line bg-card text-chip-text hover:border-foreground active:border-foreground"
  }`;
}

/** A recipe's category on a card. */
export const categoryBadge = "inline-block rounded-md bg-foreground/8 px-2 py-0.5 text-[10px] font-semibold text-foreground";

/** A recipe's tag on a card: regular text, no border. */
export const tagBadge = "inline-block rounded-md bg-accent-soft px-2 py-0.5 text-[10px] font-normal text-chip-text";

/** Category and tag badges on the recipe page. */
export const categoryPill = "rounded-lg bg-foreground px-2.5 py-1 text-[11px] font-bold text-background";
export const tagPill = "rounded-lg border border-line bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-ink-2";

/** Recipe cards and step cards. */
export const cardCls = "rounded-2xl border border-line bg-card transition hover:border-foreground active:border-foreground";

/** Grey panels (ingredients, form sections, notes). */
export const panelCls = "rounded-2xl border border-line bg-accent-soft";

/** White row inside a grey panel (ingredient rows). */
export const rowCls = "rounded-xl border border-line bg-card";

/** The header every page shares: 61px tall, left-to-right, one line underneath, pinned. */
export const siteHeaderCls =
  "sticky top-0 z-30 -mx-5 flex h-[61px] items-center justify-between gap-2 border-b border-line bg-background/95 px-5 backdrop-blur";

/** Title text in the header (the logo). */
export const headerTitleCls = "text-xl font-bold tracking-tight";

/** Section heading inside a page or panel. */
export const sectionTitle = "text-base font-bold";
