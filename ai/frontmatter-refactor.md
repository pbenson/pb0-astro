# Spec: frontmatter-driven card catalog

Status: proposed
Scope: replace hand-authored card grids with grids generated from MDX frontmatter.
Non-goal: the work/play reorganization itself. This refactor is the prerequisite that
makes that reorg a data change instead of markup surgery.

## Why

31 MDX pages under `src/pages/**`. Every one of them is also listed, by hand, in
`src/pages/index.astro` (258 lines) and again in its section `index.astro`
(6 files, ~450 lines). Title and blurb live in two or three places per page.

The drift this predicts has already happened:

| Symptom | Evidence |
|---|---|
| Section index out of sync with home | `math/index.astro` lists 8 cards; home lists 10 (both TSP pages missing from the section page) |
| Orphan page | `puzzles/nessie2.mdx` exists, is linked from nowhere |
| Card title != page title | home card says "Ammann-Beenker"; `craft/amman-beenker.mdx` frontmatter says "Ammann-Beenker Tiling" |
| Blurb != description | home card: "Simulate correlated stock returns in the browser — without ever forming a covariance matrix"; frontmatter `description`: "Simulating multivariate normal asset returns without a covariance matrix" |
| Sparse metadata | 4 of 31 MDX files have `description`; 27 do not |

`SHOW_SECTIONS` (two copies, `index.astro` and `BaseLayout.astro`) exists only because
there is no data layer to ask which pages belong on the front door. It is a boolean that
can be flipped and pushed by accident.

## Approach

Keep file-based routing exactly as it is. Do **not** move pages into `src/content/` —
that would force dynamic routes and rewrite every URL. Instead:

1. Extend each MDX page's frontmatter with the fields the cards need.
2. Read them back with `import.meta.glob(..., { eager: true })`, which for MDX exposes
   `frontmatter` and `url`.
3. Render every grid from one `<CardGrid>` component.

## Frontmatter schema

Added to each of the 31 `src/pages/**/*.mdx` files:

```yaml
---
layout: ../../layouts/BaseLayout.astro     # unchanged
title: Asset Returns Monte Carlo           # unchanged — page <h1> / <title>
description: Simulating multivariate...    # unchanged — <meta description>; backfill the 27 missing
blurb: Simulate correlated stock returns in the browser — without ever forming a covariance matrix
section: finance                           # NOT inferred from directory — see below
tier: work                                 # work | play
order: 10                                  # within-section sort key
tech: [TypeScript, React]                  # optional; work pages only
source: https://github.com/...             # optional; work pages only
paper: https://...                         # optional; work pages only
draft: false                               # optional; true keeps it out of every grid
---
```

Field notes:

- **`blurb` is separate from `description`.** They differ today (see table above) and
  serve different jobs: `description` is the meta tag, `blurb` is the card copy.
  Do not collapse them.
- **`section` must be explicit, not derived from the directory.** Home currently files
  `/puzzles/slow-sort` under the *Games* heading. Directory-derived grouping would
  silently relocate it. `slow-sort.mdx` gets `section: games` while staying at its
  current URL.
- **`order` is required to preserve today's rendering.** Current Math order is
  tsp-euclidean, tsp-probabilities, spectres, fern, multiplication-circle,
  spiral-circles, flw-circles, bresenham, izzy-triangles, quantiles — not alphabetical.
  Assign 10, 20, 30… so pages can be inserted later without renumbering.
- **`tier`**: `work` for the 2 finance pages and the 2 TSP pages (what pb0.dev publishes
  today); `play` for the other 27. This is the only field the future work/play reorg
  needs to touch.
- `tech` / `source` / `paper` are the recruiter-facing metadata. Optional now, populated
  for work pages when the hero/identity work lands.

## New files

### `src/lib/sections.ts`

Single registry for section identity and ordering, so headings stop being string
literals scattered across 7 files.

```ts
export interface Section {
  id: string;
  title: string;
  description: string;   // used as the section index page subtitle
  tier: 'work' | 'play';
  order: number;
}

export const SECTIONS: Section[] = [ /* puzzles, math, games, animations, physics,
                                        finance, craft — order per current home page */ ];
```

Home section order today: Puzzles, Math, Games, Animations, Physics, Finance,
Cherry Arbor Design, Craft. The Math split (below) replaces `math` with two sections.
Resulting registry order: Operations Research, Finance, Cherry Arbor Design, Puzzles,
Recreational Math, Games, Animations, Physics, Craft — work sections first, so the
reorg's `tier` filter yields a sensible order on both pages without re-sorting.

### `src/lib/catalog.ts`

```ts
export interface CatalogEntry {
  url: string;
  title: string;
  blurb: string;
  section: string;
  tier: 'work' | 'play';
  order: number;
  tech?: string[];
  source?: string;
  paper?: string;
}

export function allEntries(): CatalogEntry[];              // sorted, drafts excluded
export function entriesBySection(sectionId: string): CatalogEntry[];
export function entriesByTier(tier: 'work' | 'play'): CatalogEntry[];
```

Implementation: `import.meta.glob('../pages/**/*.mdx', { eager: true })`. The glob
pattern is resolved relative to `catalog.ts`, so the file must live at `src/lib/`.
Sort by `(section.order, entry.order)`.

Validation runs at module load and **throws**, failing the build:

- missing `blurb`, `section`, `tier`, or `order`
- `section` not present in `SECTIONS`
- `tier` not `work` | `play`
- duplicate `(section, order)` pair

A build that fails loudly is the point — it is what replaces the hand-maintained lists.

### `src/components/ui/CardGrid.astro`

Props: `entries: CatalogEntry[]`. Emits exactly the current markup —
`<div class="card-grid">` of `<a class="card"><h3>…</h3><p>…</p></a>` — so the existing
CSS and the Playwright snapshots are unaffected. The `.card-grid` / `.card` CSS,
currently duplicated in all 7 index files, moves here.

Optional prop `showMeta` (default false) renders the `tech` / `source` / `paper` line.
Off for this refactor; the work/play reorg turns it on for work cards.

### `src/components/ui/ExternalCard.astro` (or a 3-line data file)

Cherry Arbor Design is an external link to `cherryarbordesign.pb0.dev`, not an MDX page,
so it has no frontmatter to read. Keep it hand-authored on the home page between the
Finance and Craft sections.

## Rewrites

- `src/pages/index.astro`: 258 lines → roughly 30. Map `SECTIONS` to
  `<h2>{section.title}</h2><CardGrid entries={entriesBySection(section.id)} />`.
  Delete its `SHOW_SECTIONS` const and every `{SHOW_SECTIONS && (...)}` wrapper — the
  gate becomes a `tier` filter in the reorg that follows.
- `src/pages/{animations,craft,games,math,physics,puzzles}/index.astro`: each becomes
  heading + subtitle from `SECTIONS` + one `<CardGrid>`. Note this *changes* the Math
  section page — it will gain the two TSP cards it is currently missing. That is a
  bug fix, and it will move the `math` Playwright snapshot if one exists.
- `src/layouts/BaseLayout.astro`: leave `SHOW_SECTIONS` alone in this pass. It gates
  nav links, and nav is the reorg's business, not this refactor's.

## Migration order

1. Add `src/lib/sections.ts`, `src/lib/catalog.ts`, `CardGrid.astro`.
2. Add frontmatter to all 31 MDX files. Source `blurb` from the **home page** card copy
   (the most complete list), `title` from existing frontmatter. Where a home card title
   disagrees with frontmatter `title` (Ammann-Beenker), keep the frontmatter title —
   one title per page from here on.
3. List `puzzles/nessie2.mdx` (see "Resolved: nessie2" below). `section: puzzles`,
   `order` immediately after Nessies.
4. Rewrite the 7 index pages.
5. `npm run build` — catalog validation must pass.
6. `npm run test:e2e` — home snapshots should be byte-identical; expect a diff only on
   the math section page (the two added TSP cards).

## Verification

- Unit test (`src/lib/catalog.test.ts`, vitest is already set up):
  - every MDX file under `src/pages/**` appears in the catalog or is `draft: true`
    — this is the orphan check that would have caught `nessie2`
  - counts per section match expected
  - validation throws on a fixture missing `blurb` / with an unknown `section`
- E2E: existing `e2e/navigation.spec.ts` unchanged; home snapshots unchanged.

## What this buys the reorg

After this lands, the work/play split is:

- `tier: 'work'` on 4 pages, `tier: 'play'` on the rest — already set by step 2
- home renders `entriesByTier('work')`
- new `/playground/index.astro` renders `entriesByTier('play')` grouped by section
- both `SHOW_SECTIONS` constants deleted; nothing left to flip by accident

No card markup is touched at that point.


## Resolved: nessie2

`src/pages/puzzles/nessie2.mdx` is a real, maintained page, not dead weight:

- own component tree `src/components/puzzles/nessie2/` (logic, tests, CSS, TSX)
- own unit tests in `nessie2Logic.test.ts`, covered by `7d91ce3` (85 puzzle tests)
- a dedicated fix commit, `c1fe0e9 "remove grab cursor from Nessie 2 tiling area"`
- `git log -S nessie2 -- src/pages/index.astro` returns nothing: it was **never**
  added to the home grid. Pure oversight, not a deliberate hide.

It is also not a duplicate of `nessies.mdx`. Nessies is the fixed 2:1 parallelogram
monotile; Nessie 2 generalizes it to arbitrary polygons defined by a turn sequence in
multiples of 60 degrees. Same A/B edge-matching rule, strictly broader tile space.
`craft/nessie.mdx` is a third, unrelated thing — a prose/photo page about the physical
tiles, no puzzle component.

Decision: **list it**, `section: puzzles`, ordered directly after Nessies, `blurb`:
"A generalized tiling puzzle with polygons defined by turn sequences". Needs a `title`
review only in that "Nessie 2" reads as a sequel; consider "Nessie Generalized" if the
sequel framing is not wanted.

## Math split

`math` becomes two sections. The two traveling-repairman pages are the only `tier: work`
math, and they do not belong under the same heading as Barnsley ferns.

| Section id | Title | Tier | Pages |
|---|---|---|---|
| `operations-research` | Operations Research | work | tsp-euclidean, tsp-probabilities |
| `math` | Recreational Math | play | spectres, fern, multiplication-circle, spiral-circles, flw-circles, bresenham, izzy-triangles, quantiles |

Naming: prefer **Operations Research** over "Applied Math". It is the accurate field
name for the minimum-latency / traveling-repairman problem these two pages actually
solve, it is a term a recruiter or ATS matches on, and it does not overlap with the
recreational pages the way "Applied Math" would.

### URLs

`section` is explicit and decoupled from the directory, so relabeling requires **no file
moves**. Two options:

- **A (recommended): keep URLs.** Pages stay at `/math/tsp-euclidean` and
  `/math/tsp-probabilities`, grouped under the Operations Research heading. Zero risk,
  no redirects, no broken inbound links. Add `src/pages/operations-research/index.astro`
  as the section index — it lists entries by `section`, so it works even though the MDX
  files live under `src/pages/math/`.
- **B: move to `/operations-research/*`.** Nicer URL on a resume-linked page. Costs a
  file move, `redirects` entries in `astro.config.mjs` for the two old paths, and a
  check that the host serves them the way you want (static builds emit meta-refresh).

Take A now; B is a clean follow-up if the URLs end up on a printed resume.

### Consequence for the section index pages

`src/pages/math/index.astro` becomes Recreational Math and loses the two TSP cards it
never had anyway. This removes the drift noted in the Why table — the fix is now the
split rather than an addition, so the `math` snapshot moves either way.
