# Recipe Book

A personal recipe book. The owner pastes a link (Instagram, Facebook or any recipe page) or recipe text; the app extracts the recipe, the owner reviews it (tags, categories, amounts), and it is saved. Only the owner can add or edit. Any recipe can be shared through an unguessable read-only link.

**Guiding principle**: simple over feature-rich. The site is **Hebrew, right-to-left by default**; English recipes are the exception.

The product requirements live in the PRD (a Claude Doc, "Recipe Book – PRD": https://claude.ai/artifact/5WedFys6kA5v7px5RWozob). The owner edits it too. After every design or behaviour change, update the PRD so it stays the source of truth.

## How we work
- The owner reviews **page by page** and sends numbered change requests. Do exactly those, check them in the browser at phone width (375px), then update the PRD.
- The Gemini mockup (`Documents/Jobs/Product Management/Recipe Book project/mise_mobile_first_utilitarian_recipe_app.html`) is a **layout reference only**. Where the owner's later instructions differ from it, the owner wins.
- Buttons, labels and form texts are still English except where the owner gave Hebrew wording. Do not translate more until the owner decides.

## Stack
Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4. This Next.js version has breaking changes: read `node_modules/next/dist/docs/` before using an API you are unsure about (see AGENTS.md). Run with `npm run dev` (http://localhost:3000). Fonts: DM Sans, with Open Sans for Hebrew (DM Sans has no Hebrew letters).

## Rules that matter
- **Keep the recipe's language**: Hebrew stays Hebrew, English stays English (title, ingredients, steps, tags, category labels on recipes). Never translate recipe content.
- **Direction**: `<html dir="rtl" lang="he">`. The shared header is always `dir="ltr"`. A recipe sets its own direction by language. Use `dir="auto"` or `<bdi>` on user text; use logical Tailwind classes (`ps/pe/ms/me/start/end`), not left/right, except where a corner must be physical (the card heart is `right-*`).
- **Units**: a three-way switch shows cups, grams or ml. Celsius only. Converted values are estimates marked `~` (Hebrew `כ־`); cups written in the source are exact. Never show "0.02 cups".
- **Tags are reviewed**: AI-suggested tags are not saved until the owner accepts them.
- **Instagram/Facebook**: only the public caption and photo can be read. Never automate the owner's login. If the recipe isn't in the caption, the owner pastes the author's comment.
- **Photos are copied into our own storage on save** (Instagram image links expire).
- **Scaling**: baking recipes scale by pan size (`src/lib/pan.ts`, `panFactor` is a plain area ratio for now: the owner will supply the real rules), cooking recipes by number of people. Missing pan size or servings are entered by hand in the edit screen. Odd amounts (1.5 eggs) are fine.
- **Timers**: a time in a step (also Hebrew; "חצי שעה" = 30 min; 1 hour = 60 min) is a tappable timer in minutes:seconds. Starting one turns Awake on. The alarm is a chime synthesized in the page (`timer-store.ts`), not a system sound. Phones may pause the page when the screen locks, so the alarm is reliable only while the page is open.
- **Auth**: single owner password (`APP_PASSWORD`), signed cookie. Public pages are only `/s/[token]` and `/login`. The share page gets recipes with `notes` and `favorite` stripped, because `RecipeView` is a client component and its props reach the visitor's browser.

## Design system (set once in `src/components/ui.ts`, never per page)
- Colors in `src/app/globals.css`: orange `#ff5722` (accent, from the mockup), background `#fffefd`, fields/grey `#f6f6f6`, thin border `#e6e4e2`, chip text dark grey `#4a4846` (never black). Dark mode follows the phone.
- Header: `SiteHeader` on every page: same height, thin line under it, pinned, always left-to-right. Logo "Recipe Book." left and "+ New" right on home; "חזור" back button left on other pages.
- Buttons and fields: 12px radius (`rounded-xl`). Cards and panels: 16px with a thin border. Category chips in rows: fully round, bold dark grey, thin border. Category badge: 6px, bold, border. Tag badge: 6px, regular text, no border. Fields get a thin near-black border on focus.
- Method steps are bordered cards; the current step has a black border.

## Layout
- `src/lib/extract.ts`: link fetch, page parsing, Gemini, fallback parser, author guess
- `src/lib/gemini.ts`: Gemini call, prompt and `normalizeDraft` (model via `GEMINI_MODEL`, falls back to `gemini-flash-latest`)
- `src/lib/store.ts`: **all** storage (currently `data/recipes.json` + `data/images/`). Swap this one file to move to a hosted database. Old records get defaults for new fields when read.
- `src/lib/steps.ts` (time detection), `pan.ts` (baking), `format.ts` (amounts and Hebrew/English labels), `timer-store.ts` (timers, chime, wake lock), `categories.ts`
- `src/components/`: `ui.ts` (shared styles), `SiteHeader`, `Header` (home), `BackButton`, `RecipeBar` (recipe header), `RecipeBrowser` (home), `RecipeView`, `RecipeForm`, `TagEditor`, `TimerDock`
- `src/app/api/recipes/[id]`: PUT (full save), PATCH (favorite, notes), DELETE
- `scripts/`: manual Gemini test script and a sample recipe

## Env (`.env.local`, never committed)
`GEMINI_API_KEY`, `APP_PASSWORD`, `SESSION_SECRET`, optional `GEMINI_MODEL`.

## Not done yet
- Pages reviewed so far: home and recipe. Still to review with the owner: add/edit recipe screen, login, share page.
- Hebrew translation of the remaining English buttons and labels (waiting for the owner's decision).
- The owner's pan-size conversion rules.
- Hosted database and image storage (Supabase), deployment (Vercel), image resizing, a login rate limiter. The local `data/` folder only works on one machine. Android share-into-app and install need the site online over HTTPS.
- Temporary Windows firewall rule "Recipe Book dev (3000)" can be removed when no longer needed.
