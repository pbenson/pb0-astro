/**
 * Renders public/og.png, the 1200x630 card that Slack, iMessage and social
 * cards show for any page on the site.
 *
 *   npm run og
 *
 * Kept as a script rather than a hand-made asset so the card cannot drift from
 * the site's own tagline, palette and mark — all three are duplicated below on
 * purpose, because the card renders standalone with no stylesheet to inherit.
 */

import { chromium } from '@playwright/test';

const TAGLINE = 'Problems from work and play, made playable';
const SUBLINE = 'Quantitative finance · Operations research · Mathematics';

// --paper / --ink / --grid-teal from public/styles/global.css, light theme.
const html = `
<html><body style="margin:0">
  <div style="
    width:1200px;height:630px;box-sizing:border-box;
    background:#f5f2eb;color:#2a2a28;
    padding:90px 96px;display:flex;flex-direction:column;justify-content:space-between;
    font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">

    <svg viewBox="0 0 24 24" width="86" height="86" fill="none"
         stroke="hsl(165,45%,38%)" stroke-width="1.4">
      <circle cx="8" cy="16" r="6"/><circle cx="17" cy="9.5" r="3.4"/><circle cx="21.4" cy="4.6" r="1.8"/>
    </svg>

    <div>
      <div style="font-size:66px;font-weight:600;line-height:1.15;letter-spacing:-0.5px;max-width:20ch">
        ${TAGLINE}
      </div>
      <div style="font-size:29px;color:#5c5a54;margin-top:34px">${SUBLINE}</div>
    </div>

    <div style="font-size:27px;color:#8a8780">pb0.dev</div>
  </div>
</body></html>`;

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1200, height: 630 } })).newPage();
await page.setContent(html, { waitUntil: 'load' });
await page.screenshot({ path: 'public/og.png' });
await browser.close();

console.log('public/og.png written (1200x630)');
