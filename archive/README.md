# Archive

Pages taken off the site but kept for reference. They are outside `src/pages/`,
so Astro does not route them and the catalog never sees them; the components
they import still live under `src/components/`.

- `pages/animations/eyes.mdx` — SVG eyes that follow the cursor
- `pages/animations/lissajous.mdx` — Scratch embed of parametric curves

To bring one back, move the file into `src/pages/<section>/` and give it a
`section` and a unique `order` for that section.
