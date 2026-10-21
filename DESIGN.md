# FIRMWARD — Design Spec

Status: **documents the live system** as implemented in `src/index.css` and `tailwind.config.cjs`.

> This supersedes the Fall 2026 "printed directory" draft (paper `#F7F4EC` + crimson `#7A1F2B` +
> Newsreader serif), which was never implemented. The shipped site is a **green app** on a near-white
> canvas. A later brief proposed navy/gold; that was declined — green stays. If you change the palette,
> change it in `src/index.css` (the CSS variables) and update this file in the same commit.

---

## 1. Design tokens

### Color (`src/index.css` `:root` → `tailwind.config.cjs`)

| CSS variable | Value | Tailwind token | Use |
|---|---|---|---|
| `--app-bg` | `#F6F7F5` | `canvas` | Page background |
| `--app-surface` | `#FFFFFF` | `card` | Cards, sheets, inputs |
| `--app-text` | `#14181F` | `fg` | Body + headings (~16:1 on canvas) |
| `--app-text-2` | `#5B6470` | `fg-2` | Secondary text (~5.6:1, AA) |
| `--app-border` | `#E3E6E8` | `line` | Hairline dividers, borders |
| `--app-brand` | `#1F5C45` | `brand` | Links, primary buttons, active state (~7.8:1 white-on-brand) |
| `--app-brand-hover` | `#174A37` | `brand-hover` | Hover for brand fills |
| `--app-brand-tint` | `#E7F0EC` | `brand-tint` | Selected rows, badges, `::selection` |

**Status colors** carry a base shade (dots/borders), a `-text` shade tuned to meet AA on the tint, and a
`-bg` tint. Status marks always pair color with a **word** — never color alone.

| Status | base | `-text` | `-bg` | Token prefix |
|---|---|---|---|---|
| Open | `#1F7A4D` | `#1A6B43` | `#E9F3EE` | `st-open*` |
| Soon | `#B7791F` | `#8A5A12` | `#FBF1E2` | `st-soon*` |
| Closed | `#8A9099` | `#646B73` | `#EFF1F3` | `st-closed*` |
| Unknown | `#5B6470` | — | `#EFF1F3` | `st-unknown*` |

### Type

- **Hanken Grotesk** — everything (`font-sans`, `font-app`; both map to it).
- **JetBrains Mono** — dates, counts, windows (`font-data`, `font-mono`); `.data` sets `tabular-nums`.
- **Newsreader** — document previews only (resumes, letters, templates), via `.doc-sheet` and `font-doc`.

Scale (size / line-height), tokens `t12`–`t32`: 12/16 · 14/20 · 16/24 · 20/28 · 24/30 · 32/38. Use only
these steps.

### Shape, elevation, space, motion

- **Radius:** `none`, `DEFAULT`/`app` = 6px, `pill` = 999px (badges/avatars only).
- **Shadow:** `none`, and `pop` (`0 8px 28px …`) — the single elevation, for sheets/popovers.
- **Max width:** `max-app` = 1280px. Outer gutters `px-4` (mobile) / `px-6` (desktop).
- **Motion:** default 150ms `cubic-bezier(.2,0,0,1)`. `prefers-reduced-motion` zeroes all
  transition/animation durations (base layer in `index.css`).
- **Focus:** `2px solid var(--app-brand)` with 2px offset on every focusable element (`:focus-visible`).

---

## 2. Layout & components

**Voice.** Calm, credible career tool for law students and new grads — not a guru funnel. Left-aligned
content, hairline rules over cards/shadows, the green accent reserved for links, the primary button and
active filters.

**Shell** (`src/App.jsx`): `FoundingBanner` → `AppNav` → routed page → `Footer`, wrapped in
`SessionProvider` / `AccessProvider` / `MyListProvider`. A "Skip to content" link targets `#main`.

**Primitives.**
- `components/app/controls` — `Button` (primary = brand fill/white text; secondary = `line` border/`fg`
  text; min 44px tall on mobile), fields, etc. Reuse these; don't hand-roll buttons.
- `AppNav` / `Footer` — global chrome.
- `components/explore/FirmDetail` — the live firm panel (opened from Explore and `/firms/:slug`).
- Status marks: 9px square + word, built from the `st-*` tokens.
- `Sheet`-style panels use the `pop` shadow and trap focus / close on Esc.

**States.** Loading = hairline placeholder rows (no shimmer). Empty = a sentence + "Clear filters".
Error = names what failed ("Couldn't load the firm list. Check your connection and reload.").

**Print.** `.no-print` hides nav/footer/filters; `data-print='doc'` isolates a `[data-printable]` sheet
and prints ink on white. Used by the calendar, templates and document previews.

---

## 3. Feature flags (`src/lib/flags.js`) — all off

Pre-pivot features, lazy-loaded so their code stays out of the public bundle while off:

| Flag | Covers |
|---|---|
| `accounts` | Login, signup, onboarding, settings, profile form |
| `tracker` | Application kanban (Dashboard, `Kanban*`) |
| `aiDocs` | AI briefs + document generation (server-side via `api/ai.js`) |
| `paid` | The legacy `$20` pricing / upgrade prompts |

The self-serve **Pro** tier (`/pro`, `$4.99/mo`, Stripe via `api/billing.js`) is a *separate* product that
is **not** flag-gated by the above; it sits beneath the coaching ladder (Sprint / Membership / Placement).

**Legacy styling debt:** the old brown/gold inline palette (`#1a1710`/`#c4a55a` …) survives only in
flag-gated or orphaned files (`pages/FirmDetail.jsx` and its `DocumentGenerator`/`LoadingSkeleton`,
the `Kanban*` components, `ProfileForm`, legacy `Login`/`Signup`). None render on the live site. They
should be converted to the tokens above (or deleted, for the orphaned `pages/FirmDetail.jsx`) before any
flag is turned back on.

---

## 4. Data model (as migrated)

Relevant Supabase migrations (`supabase/migrations/`):

- **007 — signups + "Hires for".** `signups` table (one row per marketing-form submission: `kind` ∈
  subscribe/workshop/placement, email, name, class_year, role_sought, UTM, `details jsonb`, `ip_hash`),
  RLS on (API-only read/write). Adds `hires_for text[]` to `firms` and `offices`, and `roles text[]` to
  `listings`. Values: `1l-summer`, `2l-summer`, `post-grad`, `entry-lateral`; empty array = unknown.
  `hires_1l` (`yes`/`unknown`/`no`) is kept; `hires_for` is the broader field the map filters on.
- **009 — entry-level postings.** Adds `associate` to the allowed `listings.posting_type` values (new-grad
  / 0–2yr roles).
- **010 — gated private fields (applied; live).** `anon` can read only public firm columns
  (`id, name, slug, state, city, size, practice_areas, firm_type, last_verified_at, source`) and minimal
  office columns; `listings` are fully gated. Everything else comes from `GET /api/catalog/private` for
  unlocked or signed-in visitors. Signed-in students keep full read access.

So the data layer for the map's "Hires for" field, stage filter and gated fields already exists; the
remaining work is frontend + the `/api/catalog/private` surface.
