# ATLAS — Design Spec (Fall 2026 redesign)

Status: draft for approval. Nothing in `src/` has been changed yet.

---

## 1. Audit of the current UI

| Current file | What it is today | Maps to |
|---|---|---|
| `pages/Home.jsx` | SaaS hero, stats band, "How it works", framer-motion reveals | **Landing + gate** (rewrite) |
| `pages/Browse.jsx` + `components/StateGrid.jsx` | 50-state tile grid ("Coming soon") | Removed; replaced by **Directory** market filter. `/browse` redirects to `/directory` |
| `pages/BrowseState.jsx` + `components/FirmCard.jsx` + `components/FirmFilters.jsx` | Per-state card list with filters | **Directory** table + filter bar (rewrite; filter logic reused) |
| `pages/FirmDetail.jsx` (533 lines) | Full page: AI brief, tracker, document generator | **Firm detail panel** (rewrite). AI brief, tracker, doc generator move behind flags. `/firm/:id` opens the panel over the directory |
| `components/LoadingSkeleton.jsx` | Shimmer cards | Replaced by hairline placeholder rows |
| `components/NavBar.jsx` | Dark bar: Browse · Pricing · Sign In | **Global nav** (rewrite) |
| — | No footer component (inline in Home) | **Footer** (new) |
| — | — | **Calendar** `/calendar` (new) |
| — | — | **Templates** `/templates` (new) |
| `pages/Login.jsx`, `Signup.jsx`, `Onboarding.jsx`, `Settings.jsx`, `context/AuthContext.jsx` | Supabase auth flow + profile | Flag `accounts` (off) |
| `pages/Dashboard.jsx`, `KanbanBoard/Card/Drawer.jsx`, `hooks/useUserFirms.js` | Application tracker | Flag `tracker` (off) |
| `components/DocumentGenerator.jsx`, `ProfileForm.jsx`, `lib/ai.js` | AI cover letters, briefs | Flag `aiDocs` (off) |
| `pages/Pricing.jsx` (stub), `components/UpgradePrompt.jsx`, `lib/stripe.js` (stub) | Paid tier | Flag `paid` (off) |
| `components/DeadlineBar.jsx`, `ToastProvider.jsx`, `hooks/useFirms.js`, `useAuth.js` | Empty stubs | Leave alone |
| `App.css` | Leftover Vite template CSS, unused | Delete |
| `assets/hero.png`, `react.svg`, `vite.svg` | Template assets | Unused; leave |

Flags live in one file, `src/lib/flags.js`, all `false`. Flagged routes and nav links don't render. Flagged modules are imported lazily, so their code isn't in the bundle when the flag is off.

---

## 2. Design tokens

### CSS variables (`src/index.css`)

```css
:root {
  /* color */
  --paper:          #F7F4EC;
  --surface:        #FBF9F4;
  --ink:            #1A1A1A;
  --muted:          #5C5A55;
  --rule:           #D9D4C7;
  --accent:         #7A1F2B;
  --accent-hover:   #5E1620;
  --status-yes:     #2F5D3A;
  --status-unknown: #8A6A1F;
  --status-no:      #5C5A55;

  /* type */
  --font-serif: 'Newsreader', Georgia, serif;
  --font-sans:  'IBM Plex Sans', system-ui, sans-serif;
  --font-mono:  'IBM Plex Mono', ui-monospace, monospace;
  --text-xs: 13px;  --text-sm: 15px;  --text-base: 17px;
  --text-lg: 21px;  --text-xl: 28px;  --text-2xl: 40px;
  --leading: 1.55;
  --tracking-caps: 0.06em;

  /* space */
  --s1: 4px;  --s2: 8px;  --s3: 12px; --s4: 16px;
  --s5: 24px; --s6: 32px; --s7: 48px; --s8: 64px;
  --content-max: 1120px;

  /* shape + motion */
  --radius: 2px;            /* 0–3px only */
  --hairline: 1px solid var(--rule);
  --ease: cubic-bezier(.2,0,0,1);
  --dur: 140ms;
}
```

Contrast checks (on `--paper` #F7F4EC):
ink 15.8:1 · muted 6.3:1 · accent 9.3:1 · status-yes 7.0:1 · status-unknown 4.6:1 (passes AA) · status-no 6.3:1. White on accent: 10.2:1. `--rule` is 1.3:1, which is fine for decorative dividers but too low for input borders, so form fields use `--muted` borders (6.3:1, above the 3:1 non-text minimum).

### Tailwind theme (`tailwind.config.cjs`)

Colors are mapped to the variables (`paper`, `surface`, `ink`, `muted`, `rule`, `accent`, `status-*`). `fontFamily` becomes serif/sans/mono as above. `fontSize` uses only the six scale steps. `borderRadius` is limited to `none`, `DEFAULT` (2px) and `sm` (3px), and `full` is removed. `boxShadow` is limited to `none` and `drawer`. `spacing` stays at Tailwind defaults, which already match the 4/8/12/16/24/32/48/64 scale. The final sweep greps for anything off-scale.

### Fonts

Google Fonts: Newsreader (opsz, 400/600, plus 400 italic), IBM Plex Sans (400/500) and IBM Plex Mono (400/500). These replace EB Garamond, Cormorant and DM Mono. Mono text uses `font-variant-numeric: tabular-nums`.

---

## 3. Short spec

**Voice of the page.** It should read like a printed directory: a masthead, a thin rule, then the data. Use serif type for names and headings, sans for UI, and mono for anything countable (counts, dates, windows). Labels use small caps (`font-variant-caps: all-small-caps; letter-spacing: var(--tracking-caps)`), and the accent appears only on links, the primary button and active filters.

**Layout.** Content is left-aligned, with a max width of 1120px and outer gutters of 24px (mobile) or 48px (desktop). Sections are divided by hairline rules, never by cards or shadows.

**Primitives.** Each one is built once and reused everywhere.
- `Rule`: a 1px divider. One variant has a centered section label ("01 — Dallas").
- `SmallCaps`: label text.
- `StatusMark`: a 9px square plus a word ("■ Yes"). It always carries text and never relies on color alone.
- `Tag`: a rectangular filter toggle with a 2px radius and a 1px rule border. When active it has an accent border and accent text, with an `aria-pressed` attribute.
- `TextLink`: accent color, underline on hover. External links get "↗" and `rel="noopener"`.
- `Button`: a primary variant (accent fill, white text) and a secondary variant (rule border, ink text). No pill shapes. Minimum height is 44px on mobile.
- `Field`/`Select`: 1px `--muted` border, `--surface` fill and a sans-serif label in small caps above.
- `Sheet`: a right-side panel on desktop (480px) and full-screen on mobile. This is the only element with a shadow. It traps focus and closes on Esc.

**Interaction.** Focus is a `2px solid var(--accent)` outline with a 2px offset on every focusable element. Motion is limited to opacity and translate at 120–160ms, and `prefers-reduced-motion` turns it off entirely. framer-motion is removed from the public pages.

**States.**
- Loading: five rows of 1px rules at 44px intervals, with no animation.
- Empty: "No firms match these filters." plus a "Clear filters" link.
- Error: "Couldn't load the firm list. Check your connection and reload the page." It names what failed.

**Mobile (375px).** There is no horizontal scroll. Each table row becomes a stacked entry, and filters move into a "Filter" button that opens a bottom sheet. On the landing page the form comes first.

**Print.** The calendar and templates have a print stylesheet that hides the nav, footer and filters and prints ink on white.

---

## 4. Data-model gaps (UI needs these)

The brief needs fields the current `firms` table doesn't have:

| UI needs | Today | Proposal |
|---|---|---|
| Hires 1Ls: Yes / Unknown / No | `has_1l_program boolean default false`, so "false" mixes "no" with "we don't know" | Add `hires_1l text check (in 'yes','unknown','no') default 'unknown'`. Backfill true→yes, false→unknown |
| Firm type (boutique / mid-size / plaintiff / regional / government) | Not stored | Add `firm_type text` |
| Practice focus | `practice_areas text[]` | Show the first two entries, or "—" |
| Size | `size text` (131 of 584 filled) | Use as-is, or "—" |
| Last verified + source | `last_scraped_at` only | Add `last_verified_at date`, `source text` |
| Email signups | No table | Add a `signups` table (name, email, school, class_year, target_market, target_firm_type, created_at) with an insert-only RLS policy for anon users |

Data coverage today (`scripts/output/firms.json`): 584 firms. 75 are marked 1L = yes, 11 have window dates, and 45 have apply links. Austin has 4 firms. Most Dallas and Houston entries are large regional firms rather than boutiques. The design will hold up with sparse data, but the table will show mostly "Unknown" and "—" until the data is filled in.
