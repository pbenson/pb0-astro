/**
 * Refresh the vendored daily price snapshot used by the Asset Returns Monte Carlo page.
 *
 *   node scripts/fetch-prices.mjs
 *
 * Pulls ~1 year of daily adjusted closes from Yahoo Finance and writes
 * src/data/asset-prices.json. All tickers are US-listed, so every bar is a
 * 4pm America/New_York close -- the observations line up without any snapping.
 *
 * The output is committed to the repo on purpose: the page is statically built,
 * and vendoring keeps the simulation reproducible and the build independent of
 * a third-party endpoint.
 */
import { writeFileSync } from 'node:fs';

const ASSETS = [
  { ticker: 'AAPL', name: 'Apple' },
  { ticker: 'MMM', name: '3M' },
  { ticker: 'JPM', name: 'JPMorgan Chase' },
];

const RANGE = '1y';

async function fetchSeries(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${RANGE}&interval=1d`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`${ticker}: HTTP ${res.status}`);

  const result = (await res.json()).chart?.result?.[0];
  if (!result) throw new Error(`${ticker}: no result in response`);

  const adjclose = result.indicators?.adjclose?.[0]?.adjclose;
  if (!adjclose) throw new Error(`${ticker}: no adjusted close series`);

  const byDate = new Map();
  result.timestamp.forEach((ts, i) => {
    const close = adjclose[i];
    if (close == null) return; // Yahoo emits nulls for halted/missing sessions
    byDate.set(new Date(ts * 1000).toISOString().slice(0, 10), close);
  });
  return byDate;
}

const series = await Promise.all(ASSETS.map((a) => fetchSeries(a.ticker)));

// Keep only dates present for every asset, so row t of the return matrix is one
// shared trading day across all columns.
const dates = [...series[0].keys()]
  .filter((d) => series.every((s) => s.has(d)))
  .sort();

const snapshot = {
  source: 'Yahoo Finance chart API (adjusted close)',
  fetchedAt: new Date().toISOString().slice(0, 10),
  note: 'Daily adjusted closes at the 4pm America/New_York session close. Adjusted for splits and dividends.',
  dates,
  assets: ASSETS.map((asset, i) => ({
    ...asset,
    closes: dates.map((d) => Number(series[i].get(d).toFixed(4))),
  })),
};

writeFileSync(
  new URL('../src/data/asset-prices.json', import.meta.url),
  JSON.stringify(snapshot, null, 2) + '\n',
);

console.log(`Wrote ${dates.length} aligned sessions (${dates[0]} .. ${dates.at(-1)}) for ${ASSETS.map((a) => a.ticker).join(', ')}`);
