import { describe, expect, it } from 'vitest';
import {
  canonical,
  COLOURING_COUNT,
  distinctColourings,
  isDistinct,
  LAST_COLOURING,
  rotate,
} from './izzyLogic';

describe('rotate', () => {
  it('returns to the start after three turns', () => {
    for (let c = 0; c <= LAST_COLOURING; ++c) {
      expect(rotate(rotate(rotate(c)))).toBe(c);
    }
  });

  it('keeps every rotation inside six bits', () => {
    for (let c = 0; c <= LAST_COLOURING; ++c) {
      expect(rotate(c)).toBeGreaterThanOrEqual(0);
      expect(rotate(c)).toBeLessThanOrEqual(LAST_COLOURING);
    }
  });

  it('fixes the colourings with no black and all black', () => {
    expect(rotate(0)).toBe(0);
    expect(rotate(LAST_COLOURING)).toBe(LAST_COLOURING);
  });
});

describe('canonical', () => {
  it('is constant across an orbit', () => {
    for (let c = 0; c <= LAST_COLOURING; ++c) {
      expect(canonical(rotate(c))).toBe(canonical(c));
      expect(canonical(rotate(rotate(c)))).toBe(canonical(c));
    }
  });

  it('is itself distinct — canonical is idempotent', () => {
    for (let c = 0; c <= LAST_COLOURING; ++c) {
      expect(isDistinct(canonical(c))).toBe(true);
      expect(canonical(canonical(c))).toBe(canonical(c));
    }
  });

  it('picks the smallest member of the orbit', () => {
    for (let c = 0; c <= LAST_COLOURING; ++c) {
      expect(canonical(c)).toBe(Math.min(c, rotate(c), rotate(rotate(c))));
    }
  });
});

describe('distinctColourings', () => {
  const distinct = distinctColourings();

  it('finds 24 — Burnside over the three rotations, (64 + 4 + 4) / 3', () => {
    expect(distinct).toHaveLength(24);
  });

  it('ends on the all-black colouring, the one the gallery used to drop', () => {
    expect(distinct.at(-1)).toBe(LAST_COLOURING);
  });

  it('starts on the all-white colouring', () => {
    expect(distinct[0]).toBe(0);
  });

  it('covers all 64 colourings exactly once between them', () => {
    const orbits = new Set<number>();
    for (let c = 0; c < COLOURING_COUNT; ++c) orbits.add(canonical(c));
    expect([...orbits].sort((a, b) => a - b)).toEqual(distinct);
  });

  it('gives every repeat a representative already in the gallery', () => {
    for (let c = 0; c < COLOURING_COUNT; ++c) {
      if (isDistinct(c)) continue;
      // The representative must appear before the repeat, or the highlight
      // would point at a slot the gallery has not filled yet.
      expect(distinct.indexOf(canonical(c))).toBeGreaterThanOrEqual(0);
      expect(canonical(c)).toBeLessThan(c);
    }
  });
});
