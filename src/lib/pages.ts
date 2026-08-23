import { buildCatalog, bySection, byTier, populatedSections, type CatalogEntry, type PageModule } from './catalog';
import type { Section, Tier } from './sections';

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

export type { CatalogEntry };
