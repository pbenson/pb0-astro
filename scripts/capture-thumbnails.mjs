/**
 * Captures a thumbnail per catalog page for the home and section card grids.
 *
 *   npm run build && npm run thumbs
 *
 * Routes come from the built home page, so the set of thumbnails always
 * matches the set of cards. Each route is shot twice, once per colour scheme,
 * because the sketches draw themselves in the current theme and a dark canvas
 * on cream paper looks broken. CardGrid swaps the pair with CSS.
 *
 * Requires the preview server on 4322 (the same one the e2e suite uses):
 *   npx astro preview --port 4322 --background
 */

import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.THUMB_BASE ?? 'http://localhost:4322';
const OUT = 'public/thumbs';
const WIDTH = 480;               // final width on disk; cards render ~260-400px wide
const SHOT = { width: 960, height: 720 };
const THEMES = /** @type {const} */ (['light', 'dark']);

// Padding colour when a shot is not 4:3 — the paper token for each theme, so
// the letterbox is invisible against the card rather than a black bar.
const PAPER = { light: 'F5F2EB', dark: '1E1E1C' };

/**
 * Pages that need a nudge before they are worth photographing, and pages that
 * are not worth photographing at all. A card with no thumbnail falls back to
 * title and blurb, which beats a picture of an empty grid or a Scratch splash
 * screen: the honest answer is that these pages only exist once you play them.
 */
const OVERRIDES = {
  // The sketch idles until the button runs the enumeration.
  '/math/izzy-triangles': { click: 'button:has-text("Count")', wait: 2500 },
  '/games/space-rocks': { skip: true },      // Scratch iframe, shows a splash
  '/puzzles/celtic-knots': { skip: true },   // empty board until you place tiles
  '/puzzles/nessies': { skip: true },
  '/puzzles/nessie2': { skip: true },
  '/puzzles/slow-sort': { skip: true },
  '/math/rotating-links': { skip: true },     // segments only move once configured
  '/math/bresenham': { skip: true },
};

/** Card routes, in home page order, skipping anything off-site. */
function routes() {
  const html = readFileSync('dist/index.html', 'utf8');
  const hrefs = [...html.matchAll(/<a href="([^"]+)" class="card"/g)].map(m => m[1]);
  return [...new Set(hrefs.filter(h => h.startsWith('/')))];
}

const slugOf = route => route.replace(/^\/|\/$/g, '').replace(/\//g, '-');

const CROP = { width: 640, height: 480 };   // 4:3, cropped out of the viewport

/**
 * The interesting part of a page is its sketch, not its prose. Finds the first
 * visual element and returns a 4:3 window of the viewport centred on it —
 * a window rather than the element itself, because several pages draw a grid
 * of small tiles (Cipra Loops is sixteen 125px SVGs) where any single element
 * is meaningless and the arrangement is the picture.
 *
 * Returns null for pages with nothing drawn, whose canvas only appears once
 * the visitor starts playing.
 */
async function region(page) {
  // Rank by kind before size: a page's own sketch is a canvas or an svg, while
  // an <img> is usually illustration inside the prose (the Spiral Circles page
  // explains reflection with a photo of two puppies, which is emphatically not
  // its thumbnail). Within a kind, the biggest one is the picture.
  const KINDS = ['canvas', 'svg', 'figure', 'img'];
  const boxes = await page.evaluate((kinds) => {
    const found = [];
    for (const el of document.querySelectorAll('main canvas, main svg, main img, main figure, main .plot')) {
      const r = el.getBoundingClientRect();
      // Thresholds are deliberately low: some sketches are wide and short (the
      // Quantiles number line is 600x100) or are grids of small tiles (Cipra
      // Loops is sixteen 125px SVGs), and both are still the whole point.
      if (r.width < 110 || r.height < 80) continue;
      const kind = kinds.indexOf(el.tagName.toLowerCase());
      found.push({ kind: kind === -1 ? kinds.length : kind, area: r.width * r.height });
    }
    return found;
  }, KINDS);
  if (!boxes.length) return null;

  let best = 0;
  boxes.forEach((b, i) => {
    const winner = boxes[best];
    if (b.kind < winner.kind || (b.kind === winner.kind && b.area > winner.area)) best = i;
  });

  const target = page
    .locator('main canvas, main svg, main img, main figure, main .plot')
    .nth(await page.evaluate(({ kinds, pick }) => {
      // Re-walk in DOM order to turn the chosen entry back into an index the
      // locator can address, applying the same filter as above.
      let seen = -1;
      const all = document.querySelectorAll('main canvas, main svg, main img, main figure, main .plot');
      for (let i = 0; i < all.length; i++) {
        const r = all[i].getBoundingClientRect();
        if (r.width < 110 || r.height < 80) continue;
        seen++;
        if (seen === pick) return i;
      }
      return 0;
    }, { kinds: KINDS, pick: best }));

  await target.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(200);
  const box = await target.boundingBox();
  if (!box) return null;

  // A sketch smaller than the crop window gets shot through that window, so it
  // keeps a little of the page around it. A sketch bigger than the window is
  // shot whole and scaled down — cropping a window out of it would show one
  // corner of the drawing, which reads as a mistake rather than a detail.
  // Also shoot wide-and-short sketches whole: a 640x480 window centred on the
  // Quantiles number line is four fifths prose.
  if (box.width > CROP.width || box.height > CROP.height || box.width / box.height > 2.5) {
    return { element: target };
  }

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  return {
    clip: {
      x: Math.round(Math.min(Math.max(0, cx - CROP.width / 2), SHOT.width - CROP.width)),
      y: Math.round(Math.min(Math.max(0, cy - CROP.height / 2), SHOT.height - CROP.height)),
      width: CROP.width,
      height: CROP.height,
    },
  };
}

const list = routes();
if (!list.length) {
  console.error('No card routes found in dist/index.html — run `npm run build` first.');
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
let captured = 0;
const fellBack = [];

for (const theme of THEMES) {
  const context = await browser.newContext({ colorScheme: theme, viewport: SHOT });
  const page = await context.newPage();

  for (const route of list) {
    const override = OVERRIDES[route] ?? {};
    if (override.skip) continue;

    const file = join(OUT, `${slugOf(route)}-${theme}.png`);
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
    // p5 sketches mount on a dynamic import and draw over several frames.
    await page.waitForTimeout(1200);

    if (override.click) {
      await page.locator(override.click).first().click().catch(() => {});
      await page.waitForTimeout(override.wait ?? 1500);
    }

    const target = await region(page);
    if (!target && theme === 'light') fellBack.push(route);

    if (target?.element) {
      await target.element.screenshot({ path: file });
    } else {
      await page.screenshot({
        path: file,
        clip: target?.clip ?? { x: 0, y: 0, width: CROP.width, height: CROP.height },
      });
    }

    // Down to card width, then centre-crop to a common 4:3 so the grid stays
    // even. A window shot is already 4:3, so the crop is a no-op for those.
    execFileSync('sips', ['-Z', String(WIDTH), file], { stdio: 'ignore' });
    execFileSync(
      'sips',
      ['-p', String(Math.round(WIDTH * 0.75)), String(WIDTH), '--padColor', PAPER[theme], file],
      { stdio: 'ignore' },
    );
    captured++;
    process.stdout.write(`  ${theme}  ${route}\n`);
  }

  await context.close();
}

await browser.close();

const skipped = list.filter(r => OVERRIDES[r]?.skip);
console.log(`\n${captured} thumbnails in ${OUT}/ (${list.length - skipped.length} routes x ${THEMES.length} themes)`);
if (skipped.length) {
  console.log(`\nSkipped — nothing is drawn until the visitor plays:`);
  for (const route of skipped) console.log(`  ${route}`);
}
if (fellBack.length) {
  console.log(`\nNo sketch found on these — cropped the top of the page instead:`);
  for (const route of fellBack) console.log(`  ${route}`);
}
