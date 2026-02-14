# Pete's Notebook — Design System

## Intent

**Who:** Curious people — mathematicians, teachers, parents, grandparents, puzzle lovers, artists. They arrive to explore, play, and learn. Some are returning Cherry Arbor Design customers reconnecting with familiar work. Others discover it fresh.

**What they do:** Browse interactive math visualizations, manipulate tilings and puzzles, explore craft products. The primary activity is hands-on interaction with mathematical ideas.

**How it should feel:** Like a workbench covered in graph paper. Warm, tactile, unhurried. The kind of place where you sketch in the margins and lose track of time. Not precious, not corporate. The visualizations are the star — everything else recedes. There's a quality of handmade craft, of Baltic birch and wool felt, that carries through even in digital form.

## Direction

Digital workbench notebook. Surfaces feel like materials — slate, graph paper, wood. The warmth of Cherry Arbor Design's physical products (German felt, birch wood, handmade tiles) informs the color temperature and texture. Dark mode feels like chalkboard, not SaaS dashboard. Light mode feels like cream paper, not white UI.

## Domain Concepts

Graph paper, sketchbooks, workshop tables, chalkboard, compass-and-straightedge, tiling floors, mathematical notation, craft studio, Baltic birch, wool felt, museum interactive exhibits.

## Color Palette

### Foundation

Rooted in workshop materials — graphite, slate, cream paper, birch.

| Token | Light | Dark | Why |
|-------|-------|------|-----|
| `--ink` | `#2a2a28` | `#e2dfd8` | Graphite pencil on paper / chalk on slate |
| `--ink-secondary` | `#5c5a54` | `#a8a49c` | Softer pencil marks |
| `--ink-tertiary` | `#8a8780` | `#706d66` | Margin notes, metadata |
| `--ink-muted` | `#b0ada6` | `#4a4843` | Ghost marks, disabled |
| `--paper` | `#f5f2eb` | `#1e1e1c` | Cream paper / dark slate |
| `--paper-raised` | `#faf8f3` | `#26261f` | Card surface — slightly lifted |
| `--paper-inset` | `#edeae2` | `#18181a` | Inputs — pressed into surface |
| `--rule` | `rgba(90, 85, 75, 0.12)` | `rgba(200, 195, 185, 0.10)` | Graph paper grid lines — barely there |
| `--rule-emphasis` | `rgba(90, 85, 75, 0.25)` | `rgba(200, 195, 185, 0.20)` | Section dividers |

### Accent

| Token | Light | Dark | Why |
|-------|-------|------|-----|
| `--grid-teal` | `hsl(165, 45%, 38%)` | `hsl(165, 45%, 48%)` | Engineering graph paper grid color — the existing accent, earned |
| `--grid-teal-hover` | `hsl(165, 45%, 32%)` | `hsl(165, 45%, 55%)` | Hover state |

### Semantic

| Token | Light | Dark | Why |
|-------|-------|------|-----|
| `--mark-success` | `hsl(150, 40%, 38%)` | `hsl(150, 40%, 48%)` | Moss green — natural |
| `--mark-warning` | `hsl(38, 60%, 48%)` | `hsl(38, 55%, 52%)` | Amber — old wooden rulers |
| `--mark-error` | `hsl(4, 50%, 48%)` | `hsl(4, 45%, 55%)` | Red pencil correction |

### Segment Colors (visualization)

| Token | Value | Why |
|-------|-------|-----|
| `--segment-a` | `rgba(225, 180, 90, 0.85)` | Warm birch/amber — Cherry Arbor wood |
| `--segment-b` | `rgba(100, 175, 200, 0.85)` | Cool blueprint blue |

## Depth Strategy

**Borders only.** Subtle, low-opacity `--rule` borders define edges. No drop shadows. This is a workbench — things sit flat on the surface. Separation comes from the paper/surface color shifts, not lift.

Exception: modals use a single soft shadow for overlay context.

## Surfaces

Three levels, minimal jumps:
1. `--paper` — base canvas
2. `--paper-raised` — cards, nav, elevated containers
3. `--paper-inset` — inputs, code blocks, recessed areas

Sidebar uses same background as canvas with `--rule` border separation. No color fragmentation.

## Typography

| Role | Spec | Why |
|------|------|-----|
| **Headlines** | Weight 600, tight tracking (-0.01em) | Pencil-pressed headings — present but not shouting |
| **Body** | Weight 400, line-height 1.65 | Comfortable reading like a well-set notebook |
| **Labels/Meta** | Weight 500, slightly smaller, uppercase tracking (0.04em) | Printed labels on a workshop drawer |
| **Data/Code** | Monospace, tabular nums | Graph paper precision |

Font stack: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` — keep system fonts. The character comes from weight, spacing, and color, not a decorative typeface. Legibility across the broad audience (grandparents to developers) matters more than personality in the letterforms.

## Spacing

Base unit: `0.5rem` (8px)

| Scale | Value | Use |
|-------|-------|-----|
| `--space-1` | `0.25rem` | Icon gaps, tight pairs |
| `--space-2` | `0.5rem` | Within components |
| `--space-3` | `0.75rem` | Component padding |
| `--space-4` | `1rem` | Between related items |
| `--space-6` | `1.5rem` | Between groups |
| `--space-8` | `2rem` | Section separation |
| `--space-12` | `3rem` | Major page sections |

## Border Radius

| Scale | Value | Use |
|-------|-------|-----|
| `--radius-sm` | `4px` | Inputs, buttons — slightly softened, not rounded |
| `--radius-md` | `6px` | Cards — like slightly worn paper corners |
| `--radius-lg` | `10px` | Modals |

Leaning sharp. This is a workshop, not a toy store.

## Signature Element

A faint graph-paper grid texture underlying the interactive canvas areas. The visualizations sit on this surface, grounding them as constructions-in-progress rather than floating demos. This subtle pattern connects the digital experience to the physical graph paper and workshop table where Cherry Arbor products are designed.

## Cards

Cards are notebook pages — `--paper-raised` background, `--rule` border, minimal radius. No hover lift animation. Hover state: border shifts to `--rule-emphasis`. Content-specific internal layouts — a puzzle card doesn't look like a product card.

## Interactive States

| State | Treatment |
|-------|-----------|
| Default | `--rule` border |
| Hover | `--rule-emphasis` border, slight background warm |
| Focus | `--grid-teal` ring (2px) |
| Active | `--grid-teal` background at 10% opacity |
| Disabled | `--ink-muted` text, reduced opacity |

## Dark Mode

Default. Feels like chalkboard/slate. Borders carry more weight than in light mode since shadows are invisible. Semantic colors slightly desaturated. `--paper` is warm dark (`#1e1e1c`), not blue-black.

## Cherry Arbor Design Context

When displaying CAD products and craft content:
- Product imagery is the centerpiece — large, well-lit
- Descriptions carry the scholarly-yet-warm Cherry Arbor voice
- Material callouts (Baltic birch, German wool felt) are first-class information
- Mathematical context (who discovered it, why it matters) accompanies each product
- No active store — these are archive/portfolio presentations, not buy-now pages
