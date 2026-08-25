import { describe, expect, it } from 'vitest';
import {
  allOrmats,
  CELLS,
  coverCount,
  FULL_MASK,
  isOrmat,
  judge,
  minimalCovers,
  minimumCover,
  orSum,
  OVERLAY_MASKS,
  OVERLAYS,
  popcount,
  puzzleTemplates,
  SIZE,
} from './ormat';

/**
 * The facts asserted here are Brian Hayes's, from "The Ormat Game"
 * (bit-player, 16 August 2010). They are the reason the page is worth having,
 * so they are pinned rather than trusted.
 */

describe('the overlays', () => {
  it('are the six 3x3 grids with one dot per row and column', () => {
    expect(OVERLAYS).toHaveLength(6);
    for (const p of OVERLAYS) {
      expect(new Set(p).size).toBe(SIZE); // one dot per column
      expect(p).toHaveLength(SIZE); // one dot per row
    }
  });

  it('each lay down exactly three dots', () => {
    for (const mask of OVERLAY_MASKS) expect(popcount(mask)).toBe(SIZE);
  });

  it('are all different', () => {
    expect(new Set(OVERLAY_MASKS).size).toBe(6);
  });
});

describe('which templates are ormats', () => {
  const ormats = allOrmats();

  it('there are six with three dots — the overlays themselves', () => {
    const three = ormats.filter((m) => popcount(m) === 3);
    expect(three).toHaveLength(6);
    expect(new Set(three)).toEqual(new Set(OVERLAY_MASKS));
    for (const m of three) expect(minimumCover(m)).toBe(1);
  });

  it('there are NONE with four dots', () => {
    // Hayes: "There can be no permutations that differ from one another in
    // just one element." Superimposing overlays gives three, five or six dots
    // — never four. This is the fact the page exists to show.
    expect(ormats.filter((m) => popcount(m) === 4)).toHaveLength(0);
  });

  it('produces every count from three to nine except four', () => {
    // Hayes says superimposing overlays gives "three, five or six dots, but
    // never four" — that is about the small cases he walks through. Over all
    // 512 templates the achievable counts are 3, 5, 6, 7, 8, 9: four is the
    // only gap, and the only count above two that cannot be made.
    const sizes = [...new Set(ormats.map(popcount))].sort((a, b) => a - b);
    expect(sizes).toEqual([3, 5, 6, 7, 8, 9]);
  });

  it('rejects a template with fewer than three coloured cells', () => {
    for (let m = 0; m <= FULL_MASK; ++m) {
      if (popcount(m) < 3) expect(isOrmat(m)).toBe(false);
    }
  });
});

describe('the full template', () => {
  it('needs exactly three overlays', () => {
    expect(minimumCover(FULL_MASK)).toBe(3);
  });

  it('can be covered in exactly two ways', () => {
    // Hayes gives them as a+d+e and b+c+f. The letters depend on how the
    // overlays are ordered, so what is checked is the count — two — and that
    // the two covers share no overlay, which is what makes them a partition.
    expect(coverCount(FULL_MASK)).toBe(2);
    const [first, second] = minimalCovers(FULL_MASK);
    expect(new Set([...first, ...second]).size).toBe(6);
  });

  it('is covered by three overlays with no dot doubled up', () => {
    for (const cover of minimalCovers(FULL_MASK)) {
      const dots = cover.reduce((n, i) => n + popcount(OVERLAY_MASKS[i]), 0);
      expect(dots).toBe(CELLS); // nine dots on nine cells: an exact partition
    }
  });
});

describe('the single-blank templates — the trap in the wager', () => {
  const singleBlank = [...Array(CELLS).keys()].map((i) => FULL_MASK & ~(1 << i));

  it('there are nine of them and each is an ormat', () => {
    expect(singleBlank).toHaveLength(9);
    for (const m of singleBlank) expect(isOrmat(m)).toBe(true);
  });

  it('each needs FOUR overlays — more than the full grid needs', () => {
    for (const m of singleBlank) expect(minimumCover(m)).toBe(4);
    expect(minimumCover(FULL_MASK)).toBe(3);
  });

  it('each has exactly one minimal cover', () => {
    // Hayes: "the only covering that works requires four overlays".
    for (const m of singleBlank) expect(coverCount(m)).toBe(1);
  });
});

describe('judging a choice', () => {
  const template = FULL_MASK;

  it('calls an empty choice empty', () => {
    expect(judge(template, []).verdict).toBe('empty');
  });

  it('calls a minimal cover minimal', () => {
    const cover = minimalCovers(template)[0];
    const result = judge(template, cover);
    expect(result.verdict).toBe('minimal');
    expect(result.uncovered).toBe(0);
    expect(result.spilled).toBe(0);
  });

  it('calls a correct but wasteful cover "covers"', () => {
    const cover = minimalCovers(template)[0];
    const extra = [...new Set([...cover, ...[0, 1, 2, 3, 4, 5]])];
    const result = judge(template, extra);
    expect(result.verdict).toBe('covers');
    expect(extra.length).toBeGreaterThan(result.minimum!);
  });

  it('reports a dot on a blank cell as a spill, and says which', () => {
    // One overlay alone against a single-dot-short template: pick a template
    // that excludes a cell the chosen overlay covers.
    const chosen = [0];
    const blankCell = OVERLAY_MASKS[0] & -OVERLAY_MASKS[0]; // lowest set bit
    const narrower = FULL_MASK & ~blankCell;
    const result = judge(narrower, chosen);
    expect(result.verdict).toBe('spills');
    expect(result.spilled).toBe(blankCell);
  });

  it('reports uncovered cells when the choice falls short', () => {
    const result = judge(FULL_MASK, [0]);
    expect(result.verdict).toBe('incomplete');
    expect(popcount(result.uncovered)).toBe(CELLS - SIZE);
  });
});

describe('puzzle supply', () => {
  it('offers coverable templates of at least three cells', () => {
    const coverable = puzzleTemplates({ coverable: true });
    expect(coverable.length).toBeGreaterThan(0);
    for (const m of coverable) {
      expect(popcount(m)).toBeGreaterThanOrEqual(3);
      expect(isOrmat(m)).toBe(true);
    }
  });

  it('offers uncoverable templates too, for the no-solution button', () => {
    const impossible = puzzleTemplates({ coverable: false });
    expect(impossible.length).toBeGreaterThan(0);
    for (const m of impossible) {
      expect(popcount(m)).toBeGreaterThanOrEqual(3);
      expect(minimumCover(m)).toBeNull();
    }
  });

  it('every coverable template really is the OR of its minimal cover', () => {
    for (const m of puzzleTemplates({ coverable: true })) {
      for (const cover of minimalCovers(m)) expect(orSum(cover)).toBe(m);
    }
  });
});
