# Archive

Pages taken off the site but kept for reference. They are outside `src/pages/`,
so Astro does not route them and the catalog never sees them; the components
they import still live under `src/components/`.

**Not the same as the shelf.** There are three states for a page that is not on
the front, in order of severity:

| State | Builds? | Reachable? | Listed? |
|---|---|---|---|
| `shelved: true` in frontmatter | yes | yes | on `/shelf` |
| `draft: true` in frontmatter | yes | yes | nowhere |
| here, in `archive/` | no | no | nowhere |

Reach for the shelf first: it keeps the page readable and findable, and it comes
back by deleting one line. This directory is for pages that should stop existing
as far as the site is concerned.

- `pages/animations/eyes.mdx` — SVG eyes that follow the cursor
- `pages/animations/lissajous.mdx` — Scratch embed of parametric curves

To bring one back, move the file into `src/pages/<section>/` and give it a
`section` and a unique `order` for that section.
