export type Tier = 'work' | 'play';

export interface Section {
  id: string;
  title: string;
  description: string;
  tier: Tier;
  order: number;
}

/**
 * Section identity and ordering. Work sections come first so that filtering by
 * tier yields a sensible order without re-sorting.
 */
const REGISTERED: Section[] = [
  {
    id: 'operations-research',
    title: 'Operations Research',
    description: 'Search and routing problems where the objective is expected time, not distance',
    tier: 'work',
    order: 10,
  },
  {
    id: 'finance',
    title: 'Finance',
    description: 'Simulation and credit risk, worked out in the browser',
    tier: 'work',
    order: 20,
  },
  {
    id: 'puzzles',
    title: 'Puzzles',
    description: 'Interactive tiling puzzles and pattern challenges',
    tier: 'play',
    order: 30,
  },
  {
    id: 'math',
    title: 'Recreational Math',
    description: 'Mathematical visualizations and explorations',
    tier: 'play',
    order: 25,
  },
  {
    id: 'animations',
    title: 'Animations',
    description: 'Interactive visual experiments and eye candy',
    tier: 'play',
    order: 60,
  },
  {
    id: 'craft',
    title: 'Craft',
    description: 'Physical craft projects with mathematical themes',
    tier: 'play',
    order: 80,
  },
  {
    id: 'games',
    title: 'Games',
    description: 'Interactive games and playable demos',
    tier: 'play',
    order: 90,
  },
];

// `order` is the single source of truth for sequence: sort here so that the
// exported array cannot disagree with the numbers written above it.
export const SECTIONS: readonly Section[] = [...REGISTERED].sort((a, b) => a.order - b.order);

const duplicate = SECTIONS.find((s, i) => i > 0 && SECTIONS[i - 1].order === s.order);
if (duplicate) {
  throw new Error(`Two sections share order ${duplicate.order}; see src/lib/sections.ts.`);
}

const BY_ID = new Map(SECTIONS.map((s) => [s.id, s]));

export function getSection(id: string): Section {
  const section = BY_ID.get(id);
  if (!section) {
    throw new Error(`Unknown section "${id}". Add it to SECTIONS in src/lib/sections.ts.`);
  }
  return section;
}

export function sectionsByTier(tier: Tier): Section[] {
  return SECTIONS.filter((s) => s.tier === tier);
}
