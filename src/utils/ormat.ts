/**
 * The Ormat game, after Brian Hayes, "The Ormat Game", bit-player,
 * 16 August 2010.
 *
 * A *template* is a k x k grid of coloured and blank cells. An *overlay* is a
 * permutation matrix — one dot in every row and every column. The task is to
 * choose as few overlays as possible whose dots cover every coloured cell and
 * no blank one. Dots may pile up on a coloured cell; a dot on a blank cell is
 * what makes a choice wrong.
 *
 * A template that can be covered at all is an *ormat*: the Boolean OR of some
 * set of permutation matrices. Not every grid is one.
 *
 * Everything here is bitmasks over k*k cells, row-major, bit (r * k + c).
 * At k = 3 that is 9 bits and 512 templates, so every question is answered by
 * enumeration rather than by cleverness.
 */

export const SIZE = 3;
export const CELLS = SIZE * SIZE;
export const FULL_MASK = (1 << CELLS) - 1;

/** Column chosen in each row, for one permutation. */
export type Permutation = readonly number[];

function permutationsOf(n: number): number[][] {
  if (n === 0) return [[]];
  const out: number[][] = [];
  for (const rest of permutationsOf(n - 1)) {
    for (let i = 0; i <= rest.length; ++i) {
      out.push([...rest.slice(0, i), n - 1, ...rest.slice(i)]);
    }
  }
  return out;
}

/**
 * The overlays, in lexicographic order of their column sequence, so the
 * labelling is reproducible rather than incidental. At k = 3 there are 3! = 6
 * of them, and Hayes notes these are the only 3x3 grids with one dot per row
 * and column.
 */
export const OVERLAYS: readonly Permutation[] = permutationsOf(SIZE)
  .map((p) => p.slice())
  .sort((a, b) => a.findIndex((v, i) => v !== b[i]) === -1
    ? 0
    : a[a.findIndex((v, i) => v !== b[i])] - b[a.findIndex((v, i) => v !== b[i])]);

/** An overlay as a bitmask of the cells its dots occupy. */
export function overlayMask(p: Permutation): number {
  let mask = 0;
  p.forEach((col, row) => {
    mask |= 1 << (row * SIZE + col);
  });
  return mask;
}

export const OVERLAY_MASKS: readonly number[] = OVERLAYS.map(overlayMask);

/** Overlay labels a, b, c… as the article uses. */
export const OVERLAY_LABELS: readonly string[] = OVERLAYS.map((_, i) =>
  String.fromCharCode(97 + i),
);

export const popcount = (mask: number): number => {
  let n = 0;
  for (let m = mask; m; m &= m - 1) ++n;
  return n;
};

/** The template a chosen set of overlays produces: their Boolean OR. */
export function orSum(chosen: readonly number[]): number {
  return chosen.reduce((mask, i) => mask | OVERLAY_MASKS[i], 0);
}

export type Verdict =
  | 'empty'          // nothing chosen yet
  | 'spills'         // a dot lands on a blank cell
  | 'incomplete'     // no dot on some coloured cell
  | 'covers'         // a correct covering, but not with the fewest overlays
  | 'minimal';       // a correct covering using as few overlays as possible

export interface Judgement {
  verdict: Verdict;
  /** Coloured cells still uncovered. */
  uncovered: number;
  /** Blank cells a dot has landed on. */
  spilled: number;
  /** Fewest overlays that cover this template, or null if it is not an ormat. */
  minimum: number | null;
  /** How many distinct sets achieve that minimum — Cipra's second question. */
  ways: number;
}

/**
 * Every subset of overlays, grouped by the template it produces. Computed once:
 * 2^6 = 64 subsets, so the whole game is a lookup.
 */
const BY_TEMPLATE = (() => {
  const best = new Map<number, { minimum: number; ways: number; covers: number[][] }>();
  for (let subset = 1; subset < 1 << OVERLAY_MASKS.length; ++subset) {
    const chosen: number[] = [];
    for (let i = 0; i < OVERLAY_MASKS.length; ++i) if (subset & (1 << i)) chosen.push(i);
    const template = orSum(chosen);
    const entry = best.get(template);
    if (!entry || chosen.length < entry.minimum) {
      best.set(template, { minimum: chosen.length, ways: 1, covers: [chosen] });
    } else if (chosen.length === entry.minimum) {
      entry.ways += 1;
      entry.covers.push(chosen);
    }
  }
  return best;
})();

/** Can this template be covered at all? */
export const isOrmat = (template: number): boolean => BY_TEMPLATE.has(template);

/** Fewest overlays needed, or null when the template is not an ormat. */
export const minimumCover = (template: number): number | null =>
  BY_TEMPLATE.get(template)?.minimum ?? null;

/** How many distinct minimal covers exist. */
export const coverCount = (template: number): number =>
  BY_TEMPLATE.get(template)?.ways ?? 0;

/** The minimal covers themselves, as lists of overlay indices. */
export const minimalCovers = (template: number): number[][] =>
  BY_TEMPLATE.get(template)?.covers.map((c) => c.slice()) ?? [];

/** Every template that can be covered, in increasing number of coloured cells. */
export function allOrmats(): number[] {
  return [...BY_TEMPLATE.keys()].sort((a, b) => popcount(a) - popcount(b) || a - b);
}

/** Judge a reader's choice against a template. */
export function judge(template: number, chosen: readonly number[]): Judgement {
  const covered = orSum(chosen);
  const minimum = minimumCover(template);
  const ways = coverCount(template);
  const uncovered = template & ~covered;
  const spilled = covered & ~template;

  let verdict: Verdict;
  if (chosen.length === 0) verdict = 'empty';
  else if (spilled) verdict = 'spills';
  else if (uncovered) verdict = 'incomplete';
  else verdict = minimum !== null && chosen.length === minimum ? 'minimal' : 'covers';

  return { verdict, uncovered, spilled, minimum, ways };
}

/**
 * Templates worth setting as puzzles: at least three coloured cells, since
 * nothing smaller can be covered — every overlay lays down exactly three dots.
 */
export function puzzleTemplates(options: { coverable: boolean }): number[] {
  const out: number[] = [];
  for (let template = 0; template <= FULL_MASK; ++template) {
    if (popcount(template) < SIZE) continue;
    if (isOrmat(template) === options.coverable) out.push(template);
  }
  return out;
}
