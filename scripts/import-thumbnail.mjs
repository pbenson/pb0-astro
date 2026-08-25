/**
 * Imports a hand-supplied thumbnail for a page the capture cannot photograph.
 *
 *   node scripts/import-thumbnail.mjs <route> <image.png>
 *
 * The Nessie puzzles start with an empty board, so a screenshot of the page
 * shows nothing worth looking at — the picture only exists once someone has
 * placed tiles. Rather than fake it in the capture, a real screenshot of a
 * played board is imported here and marked `manual` in capture-thumbnails.mjs
 * so the capture leaves it alone.
 *
 * Two files are written, light and dark. The supplied image is a light-theme
 * screenshot, so the dark one is made by keying out the cream ground and
 * compositing what is left onto the dark paper token. That works because the
 * tiles are saturated and the ground is not — including the gaps *between*
 * tiles, which are ground showing through and should go dark too.
 */

import sharp from 'sharp';
import { basename } from 'node:path';

const PAPER = { light: { r: 245, g: 242, b: 235 }, dark: { r: 30, g: 30, b: 28 } };
const WIDTH = 480;

/** A pixel is ground if it is bright and close to grey. */
function isGround(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max > 180 && max - min < 26;
}

const [route, source] = process.argv.slice(2);
if (!route || !source) {
  console.error('usage: node scripts/import-thumbnail.mjs <route> <image.png>');
  process.exit(1);
}

const slug = route.replace(/^\/|\/$/g, '').replace(/\//g, '-');
const image = sharp(source).ensureAlpha();
const { width, height } = await image.metadata();
const { data } = await image.raw().toBuffer({ resolveWithObject: true });

for (const theme of ['light', 'dark']) {
  const paper = PAPER[theme];
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += 4) {
    if (!isGround(out[i], out[i + 1], out[i + 2])) continue;
    // Keep the ground's own shading — the graph-paper rules are slightly
    // darker than the paper — by carrying its luminance across as a tint.
    const shade = (out[i] + out[i + 1] + out[i + 2]) / 3 / 255;
    const lift = theme === 'dark' ? 1 - shade : shade;
    const mix = theme === 'dark' ? 1 + (1 - lift) * 0.35 : 1;
    out[i] = Math.min(255, paper.r * mix);
    out[i + 1] = Math.min(255, paper.g * mix);
    out[i + 2] = Math.min(255, paper.b * mix);
  }

  const file = `public/thumbs/${slug}-${theme}.png`;
  await sharp(out, { raw: { width, height, channels: 4 } })
    .resize({ width: WIDTH, withoutEnlargement: true })
    .png()
    .toFile(file);
  console.log(`${theme.padEnd(5)} ${file}  from ${basename(source)}`);
}
