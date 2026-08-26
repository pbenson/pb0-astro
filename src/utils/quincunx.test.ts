import { describe, expect, it } from 'vitest';
import {
  binStandardDeviation,
  binomial,
  binomialPmf,
  dropBall,
  dropMany,
  emptyBins,
  expectedBin,
  pinPositions,
} from './quincunx';

/** A generator that hands back a fixed cycle, so a drop can be pinned exactly. */
const cycle = (values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('dropBall', () => {
  it('counts a right bounce for every row', () => {
    expect(dropBall(5, 0.5, () => 0)).toBe(5); // 0 < 0.5 every time: all right
    expect(dropBall(5, 0.5, () => 0.9)).toBe(0); // never right
  });

  it('lands in the bin matching the number of right bounces', () => {
    // right, left, right, left, right -> three rights
    expect(dropBall(5, 0.5, cycle([0.1, 0.9, 0.1, 0.9, 0.1]))).toBe(3);
  });

  it('sends MORE balls right as the bias rises', () => {
    // The defect this test exists for: the sketch compared random(1) > p, so a
    // higher "probability of going right" produced fewer right bounces. It is
    // invisible at p = 0.5, which is why it survived.
    const draw = () => 0.7;
    expect(dropBall(10, 0.9, draw)).toBe(10);
    expect(dropBall(10, 0.6, draw)).toBe(0);
  });

  it('is degenerate at the extremes', () => {
    expect(dropBall(8, 1, Math.random)).toBe(8);
    expect(dropBall(8, 0, Math.random)).toBe(0);
  });

  it('puts every ball in bin 0 when there are no rows', () => {
    expect(dropBall(0, 0.5, Math.random)).toBe(0);
  });
});

describe('binomial', () => {
  it.each([
    [4, 0, 1],
    [4, 1, 4],
    [4, 2, 6],
    [4, 3, 4],
    [4, 4, 1],
  ])('C(%i, %i) = %i — the row a reader can check by eye', (n, k, expected) => {
    expect(binomial(n, k)).toBe(expected);
  });

  it('is zero outside the row', () => {
    expect(binomial(5, -1)).toBe(0);
    expect(binomial(5, 6)).toBe(0);
  });

  it('stays exact at the largest row count on offer', () => {
    expect(binomial(24, 12)).toBe(2704156);
  });
});

describe('binomialPmf', () => {
  it('gives the 1:4:6:4:1 row as probabilities', () => {
    const pmf = binomialPmf(4, 0.5);
    expect(pmf.map((p) => p * 16)).toEqual([1, 4, 6, 4, 1].map((v) => expect.closeTo(v, 9)));
  });

  it('sums to one', () => {
    for (const rows of [1, 5, 12, 24]) {
      for (const p of [0.1, 0.5, 0.73]) {
        const total = binomialPmf(rows, p).reduce((s, v) => s + v, 0);
        expect(total).toBeCloseTo(1, 9);
      }
    }
  });

  it('peaks at n*p once the bias moves off a half', () => {
    const pmf = binomialPmf(20, 0.25);
    const peak = pmf.indexOf(Math.max(...pmf));
    expect(peak).toBe(5);
  });

  it('collapses onto one bin at the extremes', () => {
    expect(binomialPmf(6, 0)).toEqual([1, 0, 0, 0, 0, 0, 0]);
    expect(binomialPmf(6, 1)).toEqual([0, 0, 0, 0, 0, 0, 1]);
  });

  it('does not overflow or underflow at 24 rows', () => {
    for (const value of binomialPmf(24, 0.5)) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('moments', () => {
  it('matches the sampled mean', () => {
    const rows = 16;
    const p = 0.3;
    const counts = dropMany(emptyBins(rows), 20000, rows, p);
    const total = counts.reduce((s, v) => s + v, 0);
    const mean = counts.reduce((s, v, k) => s + v * k, 0) / total;
    // Standard error over 20k draws is well under 0.05.
    expect(mean).toBeCloseTo(expectedBin(rows, p), 0);
  });

  it('is widest at a fair bias', () => {
    expect(binStandardDeviation(10, 0.5)).toBeGreaterThan(binStandardDeviation(10, 0.1));
    expect(binStandardDeviation(10, 0)).toBe(0);
  });
});

describe('dropMany', () => {
  it('adds exactly the requested number of balls', () => {
    const counts = dropMany(emptyBins(6), 500, 6, 0.5);
    expect(counts.reduce((s, v) => s + v, 0)).toBe(500);
  });

  it('accumulates onto existing counts rather than replacing them', () => {
    const counts = emptyBins(3);
    dropMany(counts, 10, 3, 1);
    dropMany(counts, 5, 3, 1);
    expect(counts[3]).toBe(15);
  });

  it('never lands a ball outside the bins', () => {
    const rows = 9;
    const counts = dropMany(emptyBins(rows), 2000, rows, 0.5);
    expect(counts).toHaveLength(rows + 1);
    expect(counts.every((v) => v >= 0)).toBe(true);
  });
});

describe('pinPositions', () => {
  it('gives row r exactly r+1 pins', () => {
    expect(pinPositions(1)).toHaveLength(1);
    expect(pinPositions(4)).toHaveLength(1 + 2 + 3 + 4);
  });

  it('centres every row on the middle', () => {
    for (const rows of [3, 7, 12]) {
      const pins = pinPositions(rows);
      const byRow = new Map<number, number[]>();
      for (const pin of pins) {
        byRow.set(pin.y, [...(byRow.get(pin.y) ?? []), pin.x]);
      }
      for (const xs of byRow.values()) {
        const mean = xs.reduce((s, v) => s + v, 0) / xs.length;
        expect(mean).toBeCloseTo(0.5, 9);
      }
    }
  });

  it('keeps every pin inside the unit square', () => {
    for (const pin of pinPositions(MAX_ROWS_FOR_TEST)) {
      expect(pin.x).toBeGreaterThanOrEqual(0);
      expect(pin.x).toBeLessThanOrEqual(1);
      expect(pin.y).toBeGreaterThanOrEqual(0);
    }
  });
});

const MAX_ROWS_FOR_TEST = 24;
