// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// https://astro.build/config
export default defineConfig({
  integrations: [react(), mdx()],

  // Math is typeset by KaTeX during the build, so pages ship plain HTML and CSS
  // with no math JavaScript at runtime and no flash of unstyled formulas.
  // The MDX integration inherits this markdown config.
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [
      [
        rehypeKatex,
        {
          // Emit MathML alongside the styled HTML, so assistive technology gets
          // real math rather than a pile of positioned spans.
          output: 'htmlAndMathml',
          // Surface mistakes at build time instead of rendering them in red.
          strict: 'warn',
          throwOnError: false,
        },
      ],
    ],
  },
});
