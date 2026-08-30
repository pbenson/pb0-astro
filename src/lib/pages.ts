import {
  buildCatalog,
  bySection,
  byTier,
  populatedSections,
  shelved,
  type CatalogEntry,
  type PageModule,
} from './catalog';
import { getSection, type Section, type Tier } from './sections';

// Eager glob so the catalog is built at build time, not requested at runtime.
// Kept out of catalog.ts: MDX needs the Astro toolchain to transform, and the
// unit tests run under a plain Vite config that has no MDX plugin.
const modules = import.meta.glob<PageModule>('../pages/**/*.mdx', { eager: true });

export const catalog: CatalogEntry[] = buildCatalog(modules);

export function entriesBySection(sectionId: string): CatalogEntry[] {
  return bySection(catalog, sectionId);
}

export function entriesByTier(tier: Tier): CatalogEntry[] {
  return byTier(catalog, tier);
}

export function sectionsWithEntries(tier?: Tier): Section[] {
  return populatedSections(catalog, tier);
}

/**
 * Shelved pages grouped under the section each one still belongs to.
 *
 * Being on the shelf does not change what a page is about, so /shelf keeps the
 * usual section headings rather than inventing a flat list.
 */
export function shelvedBySection(): { section: Section; entries: CatalogEntry[] }[] {
  const groups = new Map<string, CatalogEntry[]>();
  for (const entry of shelved(catalog)) {
    groups.set(entry.section, [...(groups.get(entry.section) ?? []), entry]);
  }
  return [...groups.entries()]
    .map(([id, entries]) => ({ section: getSection(id), entries }))
    .sort((a, b) => a.section.order - b.section.order);
}

/** How many pages are on the shelf — the home page footer says so. */
export const shelvedCount = (): number => shelved(catalog).length;

export type { CatalogEntry };
