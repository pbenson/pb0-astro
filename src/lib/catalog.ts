import { getSection, SECTIONS, type Section, type Tier } from './sections';

export interface CatalogEntry {
  url: string;
  title: string;
  blurb: string;
  section: string;
  tier: Tier;
  order: number;
  tech?: string[];
  source?: string;
  paper?: string;
  /**
   * On the shelf: built and reachable, but kept off the card grids and listed
   * on /shelf instead. Orthogonal to section and tier, so a shelved page keeps
   * its own identity and can be brought back by deleting one line.
   *
   * Distinct from the two neighbouring states:
   *   `draft: true`  — built and reachable, but on no list at all.
   *   `archive/`     — outside src/pages, so it does not build.
   */
  shelved: boolean;
}

/** Shape of an eagerly globbed MDX page: frontmatter plus the route Astro assigns it. */
export interface PageModule {
  url?: string;
  frontmatter?: Record<string, unknown>;
}

const TIERS: readonly Tier[] = ['work', 'play'];

function fail(id: string, problem: string): never {
  throw new Error(`Catalog: ${id} ${problem}. See ai/frontmatter-refactor.md for the schema.`);
}

function requireString(id: string, fm: Record<string, unknown>, field: string): string {
  const value = fm[field];
  if (typeof value !== 'string' || value.trim() === '') {
    fail(id, `is missing frontmatter "${field}"`);
  }
  return value;
}

function optionalString(fm: Record<string, unknown>, field: string): string | undefined {
  const value = fm[field];
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

/**
 * Turn globbed MDX modules into the sorted card catalog, rejecting anything the
 * card grids cannot render. Validation throws so a malformed page fails the
 * build rather than quietly vanishing from a grid — the failure mode this
 * catalog exists to remove.
 */
export function buildCatalog(modules: Record<string, PageModule>): CatalogEntry[] {
  const entries: CatalogEntry[] = [];
  const seen = new Map<string, string>();

  for (const [path, mod] of Object.entries(modules)) {
    const fm = mod.frontmatter ?? {};
    if (fm.draft === true) continue;

    const url = mod.url ?? fm.url;
    if (typeof url !== 'string') {
      fail(path, 'has no url — is it outside src/pages?');
    }

    const title = requireString(path, fm, 'title');
    const blurb = requireString(path, fm, 'blurb');
    const section = requireString(path, fm, 'section');
    const tier = requireString(path, fm, 'tier') as Tier;
    const order = fm.order;

    const parent = getSection(section); // throws on an unknown section id
    if (!TIERS.includes(tier)) {
      fail(path, `has tier "${tier}", expected one of ${TIERS.join(' | ')}`);
    }
    if (tier !== parent.tier) {
      fail(path, `is tier "${tier}" but sits in section "${section}", which is tier "${parent.tier}"`);
    }
    if (typeof order !== 'number' || !Number.isFinite(order)) {
      fail(path, 'is missing a numeric frontmatter "order"');
    }

    const key = `${section}#${order}`;
    const clash = seen.get(key);
    if (clash) {
      fail(path, `reuses order ${order} in section "${section}", already held by ${clash}`);
    }
    seen.set(key, path);

    const tech = Array.isArray(fm.tech) ? (fm.tech as string[]) : undefined;

    if (fm.shelved !== undefined && typeof fm.shelved !== 'boolean') {
      fail(path, `has shelved "${String(fm.shelved)}", expected true or false`);
    }

    entries.push({
      url,
      title,
      blurb,
      section,
      tier,
      order,
      tech,
      source: optionalString(fm, 'source'),
      paper: optionalString(fm, 'paper'),
      shelved: fm.shelved === true,
    });
  }

  const sectionOrder = new Map(SECTIONS.map((s) => [s.id, s.order]));
  return entries.sort((a, b) => {
    const bySection = sectionOrder.get(a.section)! - sectionOrder.get(b.section)!;
    return bySection !== 0 ? bySection : a.order - b.order;
  });
}

/**
 * On display: everything the card grids show.
 *
 * The shelf is subtracted here rather than at each call site, so a new grid
 * cannot forget to do it and quietly put a shelved page back on the front.
 */
export const onDisplay = (entries: CatalogEntry[]): CatalogEntry[] =>
  entries.filter((e) => !e.shelved);

/** Shelved entries, in the same section-then-order sequence as the catalog. */
export const shelved = (entries: CatalogEntry[]): CatalogEntry[] =>
  entries.filter((e) => e.shelved);

export function bySection(entries: CatalogEntry[], sectionId: string): CatalogEntry[] {
  getSection(sectionId);
  return onDisplay(entries).filter((e) => e.section === sectionId);
}

export function byTier(entries: CatalogEntry[], tier: Tier): CatalogEntry[] {
  return onDisplay(entries).filter((e) => e.tier === tier);
}

/**
 * Sections of the given tier that have entries on display, in registry order.
 *
 * A section whose every page is shelved drops out of the grids entirely rather
 * than rendering an empty heading.
 */
export function populatedSections(entries: CatalogEntry[], tier?: Tier): Section[] {
  const used = new Set(onDisplay(entries).map((e) => e.section));
  return SECTIONS.filter((s) => used.has(s.id) && (tier === undefined || s.tier === tier));
}
