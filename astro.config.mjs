// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// https://astro.build/config
export default defineConfig({
  // The published origin. Astro.site drives rel=canonical, og:url and the
  // absolute share image URL in BaseLayout; without it those are omitted
  // rather than emitted as relative URLs no crawler can resolve.
  site: 'https://pb0.dev',

  integrations: [
    react({
      // Restore the node_modules exclusion that @vitejs/plugin-react applies by
      // default. It reads `exclude ?? defaultExcludeRE`, so any value replaces
      // the default rather than adding to it — and @astrojs/react always passes
      // one (/\.astro$/). The default is therefore always lost, and Babel ends
      // up transforming Vite's pre-bundled deps: the react-dom client chunk is
      // over 500KB, which is what prints
      //   [BABEL] Note: The code generator has deoptimised the styling of ...
      // Nothing under node_modules ships JSX here, so skipping it is free.
      exclude: [/\/node_modules\//],
    }),
    mdx(),
  ],

  vite: {
    optimizeDeps: {
      // p5 is only reached through a dynamic import inside a component, so the
      // dev server would not discover it until the first visit to a sketch
      // page — then re-optimize and invalidate every module graph already in
      // the browser, which surfaces as "504 Outdated Optimize Dep" and dead
      // controls that a reload does not fix. Pre-bundle it at startup instead.
      include: ['p5'],
    },
  },

  // Math is typeset by KaTeX during the build, so pages ship plain HTML and CSS
  // with no math JavaScript at runtime and no flash of unstyled formulas.
  // The MDX integration inherits this markdown config.
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [
        [
          rehypeKatex,
          {
            // Emit MathML alongside the styled HTML, so assistive technology
            // gets real math rather than a pile of positioned spans.
            output: 'htmlAndMathml',
            // Surface mistakes at build time instead of rendering them in red.
            strict: 'warn',
            throwOnError: false,
          },
        ],
      ],
    }),
  },
});
