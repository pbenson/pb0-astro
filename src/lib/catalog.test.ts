import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildCatalog, bySection, byTier, populatedSections, type PageModule } from './catalog';
import { SECTIONS } from './sections';

const PAGES_DIR = join(process.cwd(), 'src/pages');

function mdxFiles(): string[] {
  const out: string[] = [];
  for (const dir of readdirSync(PAGES_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    for (const name of readdirSync(join(PAGES_DIR, dir.name))) {
      if (name.endsWith('.mdx')) out.push(`${dir.name}/${name}`);
    }
  }
  return out.sort();
}

/**
 * Minimal frontmatter reader. The real catalog is fed by an eager MDX glob,
 * which needs the Astro toolchain; these tests run under a plain Vite config,
 * so they read the same frontmatter off disk instead.
 */
function frontmatter(relPath: string): Record<string, unknown> {
  const src = readFileSync(join(PAGES_DIR, relPath), 'utf8');
  const end = src.indexOf('\n---', 4);
  const fm: Record<string, unknown> = {};
  for (const line of src.slice(4, end).split('\n')) {
    const match = /^([a-zA-Z]+):\s*(.*)$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    let value: unknown = rawValue.trim();
    if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    } else if (/^-?\d+$/.test(value as string)) {
      value = Number(value);
    }
    fm[key] = value;
  }
  return fm;
}

function realModules(): Record<string, PageModule> {
  const modules: Record<string, PageModule> = {};
  for (const rel of mdxFiles()) {
    modules[`../pages/${rel}`] = {
      url: `/${rel.replace(/\.mdx$/, '')}`,
      frontmatter: frontmatter(rel),
    };
  }
  return modules;
}

function stub(overrides: Record<string, unknown> = {}): Record<string, PageModule> {
  return {
    '../pages/math/example.mdx': {
      url: '/math/example',
      frontmatter: { title: 'Example', blurb: 'A blurb', section: 'math', tier: 'play', order: 999, ...overrides },
    },
  };
}

describe('catalog validation', () => {
  it('accepts a well-formed page', () => {
    expect(buildCatalog(stub())).toHaveLength(1);
  });

  it.each(['title', 'blurb', 'section', 'tier'])('rejects a page missing %s', (field) => {
    expect(() => buildCatalog(stub({ [field]: undefined }))).toThrow(field);
  });

  it('rejects an unknown section', () => {
    expect(() => buildCatalog(stub({ section: 'nope' }))).toThrow('Unknown section');
  });

  it('rejects a tier that disagrees with its section', () => {
    expect(() => buildCatalog(stub({ section: 'finance', tier: 'play' }))).toThrow('which is tier');
  });

  it('rejects an unknown tier', () => {
    expect(() => buildCatalog(stub({ tier: 'hobby' }))).toThrow('tier');
  });

  it('rejects a non-numeric order', () => {
    expect(() => buildCatalog(stub({ order: 'first' }))).toThrow('order');
  });

  it('rejects duplicate order within a section', () => {
    const modules = {
      ...stub(),
      '../pages/math/other.mdx': {
        url: '/math/other',
        frontmatter: { title: 'Other', blurb: 'b', section: 'math', tier: 'play', order: 999 },
      },
    };
    expect(() => buildCatalog(modules)).toThrow('reuses order');
  });

  it('skips drafts', () => {
    expect(buildCatalog(stub({ draft: true }))).toHaveLength(0);
  });
});

describe('the real pages', () => {
  const entries = buildCatalog(realModules());

  it('lists every MDX page — no orphans', () => {
    const listed = new Set(entries.map((e) => e.url));
    const expected = mdxFiles().map((f) => `/${f.replace(/\.mdx$/, '')}`);
    expect([...expected].filter((url) => !listed.has(url))).toEqual([]);
    expect(entries).toHaveLength(mdxFiles().length);
  });

  it('groups the operations research pages as work', () => {
    expect(bySection(entries, 'operations-research').map((e) => e.url)).toEqual([
      '/math/tsp-euclidean',
      '/math/tsp-probabilities',
      '/operations-research/sphere-method',
    ]);
    // Finance leads the work tier; section order lives in src/lib/sections.ts.
    expect(byTier(entries, 'work').map((e) => e.url)).toEqual([
      '/finance/asset-returns-monte-carlo',
      '/finance/credit-basket',
      '/math/quantiles',
      '/math/tsp-euclidean',
      '/math/tsp-probabilities',
      '/operations-research/sphere-method',
    ]);
  });

  it('keeps Slow Sort under Games despite living in /puzzles', () => {
    expect(bySection(entries, 'games').map((e) => e.url)).toContain('/puzzles/slow-sort');
    expect(bySection(entries, 'puzzles').map((e) => e.url)).not.toContain('/puzzles/slow-sort');
  });

  it('lists Nessie 2, which no grid linked before', () => {
    expect(entries.map((e) => e.url)).toContain('/puzzles/nessie2');
  });

  it('populates every registered section', () => {
    expect(populatedSections(entries).map((s) => s.id)).toEqual(SECTIONS.map((s) => s.id));
  });
});
