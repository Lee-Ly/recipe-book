// The site's shared look. Every page builds on these, so a change here changes the whole site.
// Radii follow the mockup: buttons and inputs 12px (rounded-xl), cards and panels 16px (rounded-2xl),
// small badges 6px (rounded-md). 16px text and 44px+ targets keep phones from zooming and easy to tap.

/** Text fields: thin grey border, turning thin and near-black when focused. */
export const inputCls =
  "w-full min-h-12 rounded-xl border border-line bg-accent-soft px-4 py-2.5 text-base text-foreground outline-none placeholder:text-muted focus:border-foreground";

export const btnPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-6 text-base font-bold text-accent-fg active:opacity-80 disabled:opacity-50";

export const btnGhost =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-accent-soft px-5 text-sm font-medium text-foreground active:opacity-80 disabled:opacity-50";

/** Square icon-only button (heart, pencil, ...). */
export const btnIcon =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-accent-soft text-foreground active:opacity-70 disabled:opacity-50";

export const btnText = "inline-flex min-h-11 items-center px-1 text-sm font-medium text-accent active:opacity-70 disabled:opacity-50";

/** Category chip in a row (home filter, category picker): fully round, bold dark-grey text, thin border. */
export function filterChip(active: boolean): string {
  return `inline-flex min-h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-4 text-sm font-bold ${
    active ? "border-accent bg-accent text-accent-fg" : "border-line bg-accent-soft text-chip-text active:opacity-70"
  }`;
}

/** A recipe's category shown as a badge (cards, recipe page). */
export const categoryBadge =
  "inline-block whitespace-nowrap rounded-md border border-line bg-foreground/8 px-2 py-0.5 text-[11px] font-bold text-chip-text";

/** A recipe's tag shown as a badge (cards, recipe page): regular text, no border. */
export const tagBadge = "inline-block whitespace-nowrap rounded-md bg-accent-soft px-2 py-0.5 text-[11px] font-normal text-muted";

/** A tag in the tag editor, which needs a bigger tap target than the badge. */
export const tagChip = "inline-flex min-h-9 items-center gap-1 whitespace-nowrap rounded-lg px-3 text-sm";

/** Recipe cards, step cards. */
export const cardCls = "rounded-2xl border border-line bg-card";

/** Grey information panels (scaling, sharing, notices). */
export const panelCls = "rounded-2xl border border-line bg-accent-soft";

/** The header every page shares: always left-to-right, same height, one line underneath. */
export const siteHeaderCls =
  "sticky top-0 z-30 -mx-4 mb-4 flex items-center justify-between gap-2 border-b border-line bg-background px-4 pb-3 pt-3";

/** Title text in the header (the logo and page titles). */
export const headerTitleCls = "text-xl font-bold tracking-tight";
