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
- **Categories vs tags**: a category is the TYPE of food (cookies, soup); a tag is a keyword describing one dish. Both are managed on `/manage` ("Categories & Tags": add, rename, delete; deleting or renaming updates every recipe). Categories live in `data/taxonomy.json` (defaults in `src/lib/categories.ts`); a category counts as baking (scales by pan size) when its name sounds like baking; this is set automatically, there is no switch in the UI. The AI may only pick categories from that list and prefers existing tags. Never confuse the two in UI text or prompts.
- **Recipe page details**: oven, cook time, serves and pan size show as small tiles under the categories (only those filled in). The pan size is NOT shown in the ingredients panel; for a baking recipe with a pan, the Pan tile is a list that rescales the amounts (see Scaling). There are no "set pan size" links; the pencil in the header opens the editor. Saving a new or edited recipe returns to the home page.
- **Cook time**: `totalMinutes` is the baking/cooking time only, never preparation (prompt, `cookTime` from page data, form label "Cook min").
- **Ingredient editor**: one amount + one unit (g, ml, cups, tbsp, tsp, oz, pcs) per row, like the mockup, in 12px text. Touched rows are converted into cups/grams/ml on the server when saved (`src/lib/convert.ts`: Gemini, with a density table fallback); untouched rows keep their stored values.
- **Deleting** always asks first with `ConfirmDialog` (a page popup), never `window.confirm`, which phones and in-app browsers can block.
- **Units**: a three-way switch shows cups, grams or ml. Celsius only. Converted values are estimates marked `~` (Hebrew `כ־`); cups written in the source are exact. Never show "0.02 cups".
- **Tags are reviewed**: AI-suggested tags are not saved until the owner accepts them.
- **Instagram/Facebook**: only the public caption and photo can be read. Never automate the owner's login. If the recipe isn't in the caption, the owner pastes the author's comment.
- **Photos are copied into our own storage on save** (Instagram image links expire).
- **Scaling** (`src/lib/pan.ts`, `format.ts`, `RecipeView.tsx`): baking recipes scale by pan, cooking recipes by number of people. Both are `<select>` lists inside the details tiles. Pan list = the owner's table `PAN_PRESETS` (round 18-28 cm with their own areas, 28 cm = 615; loaf, square, rectangle, oven tray). Multiplier = new area / the recipe's own pan area (`panArea`: listed pans use the table, others pi 3.14 for round, length x width otherwise). A baking recipe without a pan cannot be converted (no list). Servings list = `SERVINGS_OPTIONS` 2,4,6,8,10 plus the recipe's own number. Seasonings (`isSeasoning`: salt, pepper, chili, strong spices/herbs) grow at most x1.5 when scaling UP by servings (`seasoningFactor`), never for pans; a note says so. Scaled amounts are exact (max 2 decimals, no fractions or rounding in `formatAmount` when factor is not 1). Pan sizes are always cm, never inches (Gemini prompt says so). A note under the ingredients shows the multiplier. Missing pan or servings are entered by hand in the edit screen.
- **Timers**: a time in a step (also Hebrew; "חצי שעה" = 30 min; 1 hour = 60 min) is a tappable timer in minutes:seconds. Starting one turns Awake on. The alarm is a chime synthesized in the page (`timer-store.ts`), not a system sound. Phones may pause the page when the screen locks, so the alarm is reliable only while the page is open.
- **Access (two passwords)**: the owner's password (`APP_PASSWORD`) gives full access. A separate **friends' password** gives VIEW-ONLY access to the whole site; the owner manages it on `/access` (see, copy, change, generate, turn off; it is stored AES-encrypted in the `site_settings` row `access`, see `src/lib/access.ts`). Changing or disabling it bumps an `epoch` that signs every friend out at once. Session cookie = `role.epoch.expires.signature`. Anyone without a valid cookie sees `PasswordGate`, a password window drawn over a blurred empty outline of the page at the SAME address (no redirect to a login page, so deep links work); the real page and its data are only rendered after login. `getRole()` returns owner/guest/null; `isAuthed()` means owner and guards every API that changes data; `isViewer()` allows owner or guest (photos). Friends get recipes without `notes`, `favorite` or `shareToken`, no add/edit/delete/share/heart/manage buttons, and owner pages redirect them home. Login is limited to 8 wrong tries per 15 minutes per address (`rate-limit.ts`, in memory). The whole site is `noindex`. Public pages are only `/s/[token]` (per-recipe share link). The share page gets recipes with `notes` and `favorite` stripped, because `RecipeView` is a client component and its props reach the visitor's browser.

## Design system (copied from the mockup; set once in `src/components/ui.ts` + `src/app/globals.css`, never per page)
- The mockup HTML is the reference for every color, size, height, border, font weight, margin, radius and hover/pressed effect. Read its Tailwind classes before restyling anything.
- Colors: orange `#ff5722` (pressed `#e64a19`), page `#fffefd` and grey `#f6f6f6` (the owner chose these), text `#111`, thin borders `#e2e8f0`, grey text `#64748b`, dark-grey chip text `#475569`. Dark mode follows the phone.
- `SiteHeader`: 61px, always left-to-right, thin line under it, pinned. Home: black "R." square + name left, "+ New" right. Recipe: back ("חזור") left; pencil, heart, Awake right. New/edit: Cancel left, title centre, orange Save right (the Save button submits the form through `form="recipe-form"`). Pages have 20px side padding.
- Buttons 12px radius, text-xs bold (orange / black / white-outlined / plain back); icon buttons 36px; cards, panels and step cards 16px with a thin border that turns black on hover/press; round category chips (selected = black); card badges 6px; recipe-page badges 8px. Fields are 12px radius with a thin border that turns black on focus, and use 16px text (14px makes phones zoom).
- Where the owner deviated from the mockup, the owner wins: card tags have regular weight and no border; the author line on cards; the heart sits on the card photo.
- The new/edit screens are left-to-right with English labels (as in the mockup); fields use `dir="auto"`.

## Layout
- `src/lib/extract.ts`: link fetch, page parsing, Gemini, fallback parser, author guess
- `src/lib/gemini.ts`: Gemini call, prompt and `normalizeDraft` (model via `GEMINI_MODEL`, falls back to `gemini-flash-latest`)
- `src/lib/store.ts`: **all** storage. Uses Supabase (`store-supabase.ts`: tables `recipes` and `site_settings`, private bucket `recipe-images`, schema in `supabase/schema.sql`) when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set, otherwise local files in `data/` (`store-local.ts`). Both implement `store-backend.ts`. Old records get defaults for new fields when read.
- `src/lib/access.ts` (friends' password), `auth.ts` (roles, cookies), `rate-limit.ts`, `src/components/PasswordGate.tsx`, `AccessSettings.tsx`, `src/app/access/`, `src/app/api/access`
- `src/lib/convert.ts` (unit conversion on save), `categories.ts` (category/tag types), `units.ts`, `steps.ts` (time detection), `pan.ts` (baking), `format.ts` (amounts and Hebrew/English labels), `timer-store.ts` (timers, chime, wake lock), `categories.ts`
- `src/app/manage/` + `ManageTaxonomy.tsx` (Categories & Tags page), `src/app/api/taxonomy`, `ConfirmDialog.tsx`
- `src/components/`: `ui.ts` (shared styles), `SiteHeader`, `Header` (home), `BackButton`, `RecipeBar` (recipe header), `RecipeBrowser` (home), `RecipeView`, `RecipeForm`, `TagEditor`, `TimerDock`
- `src/app/api/recipes/[id]`: PUT (full save), PATCH (favorite, notes), DELETE
- `scripts/`: manual Gemini test script and a sample recipe

## Env (`.env.local`, never committed)
`GEMINI_API_KEY`, `APP_PASSWORD`, `SESSION_SECRET`, `SUPABASE_URL` (the `https://<project>.supabase.co` address, NOT the dashboard link), `SUPABASE_SERVICE_ROLE_KEY` (the secret key, server only), optional `GEMINI_MODEL`. `.env.vercel` (git-ignored) holds the production values to import in Vercel; the production site password differs from the local one.

## Not done yet
- Check automatic ingredient conversions on real recipes (estimates); fix cook times of recipes saved before the cook-time rule (the granola has 95 min).
- All three screens were rebuilt to follow the mockup on 2026-11-15; the owner reviews page by page for remaining differences. Login and the share page have had less attention.
- Hebrew translation of the remaining English buttons and labels (waiting for the owner's decision).
- The owner's pan-size conversion rules.
- **Vercel deployment: next step.** The Vercel account was created with the owner's old work email; they updated their GitHub primary email and asked Vercel support (2026-11-15) to change the Vercel email. Until support answers, they could not deploy. Then: import `Lee-Ly/recipe-book` (private repo), paste `.env.vercel` into Environment Variables, do NOT add the Supabase integration (we use our own `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`), Deploy, test on the phone. If Vercel complains that it cannot match the commit author to a GitHub account, make sure `lee.hasidim@gmail.com` (the git author email) is a verified email on the GitHub account, or re-author the commits. `vercel.json` pins Frankfurt. Image resizing is still missing: Vercel rejects uploads over about 4.5 MB (photos downloaded from a link are fine). A login rate limiter is missing. Android share-into-app and install need the online HTTPS site. Code: github.com/Lee-Ly/recipe-book (private).
- `scripts/migrate-to-supabase.mjs` copied the local data/ folder to Supabase once; `data/` is now only a backup.
- Temporary Windows firewall rule "Recipe Book dev (3000)" can be removed when no longer needed.

## Import from a web page without recipe data
`parsePage` (`src/lib/page-parse.ts`) uses the page's schema.org Recipe when there is one. Otherwise `focusRecipeText` keeps only the recipe part of the page text (from about 700 characters before the word "ingredients/מצרכים" until the comments, related recipes, or a repeated hidden print copy), after dropping nav, header, footer, aside and form. It used to send the first 12,000 characters, which were the site menu. `callGemini` retries both models once after an overloaded answer (HTTP 429/5xx). The no-AI fallback parser accepts headings with extra words ("מצרכים למתכון") and reads a pan from "בקוטר 24" or "20×30 cm".

## Import details (added after the first real web recipe)
- Gemini models: `gemini-3.5-flash`, `gemini-flash-latest`, then `gemini-flash-lite-latest`, each pass retried once on 429/5xx. The AI's schema has `notes` (author's remarks after the method, not steps) and the prompt says sub-headings like "לעוגה:" are not ingredients. `draft.notes` fills the owner's Notes box on the review screen.
- The no-AI parser (`fallback-parser.ts`) now reads amount, unit and "(70 גרם)" for each ingredient, fills the other units from the density table, skips lines ending with ":", moves lines starting with `*`/"הערה"/"טיפ" to notes, drops "בתאבון", and reads baking time ("זמן אפיה: 40-45 דקות" = 45) and the pan.
- Recipe page: a recipe that states a pan is scaled by pan whatever its category (otherwise by servings). Pan options show cm² and mark the original; a line under the tile shows the original while another size is chosen. The selects use `autoComplete="off"` so a browser refresh never restores an old choice (the choice is never saved).
