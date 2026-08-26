import { describe, expect, it } from 'vitest';
import {
  AXIOM,
  MAX_LEVEL,
  ORIGIN,
  PHI,
  RULES,
  rotate72,
  skeleton,
  step,
  tiling,
  toPlane,
} from './penrose';

/**
 * The sketch's own method — rewrite the whole string, then walk it — kept here
 * as an oracle for the recursive descent the page actually uses.
 */
function byStringRewriting(level: number) {
  const expand = (s: string) =>
    [...s].map((c) => (RULES[c] ?? ('+-[]'.includes(c) ? c : ''))).join('');
  let s = expand(AXIOM);
  for (let i = 0; i < level; ++i) s = expand(s);

  let direction = 0;
  let position = ORIGIN;
  const stack: { position: typeof ORIGIN; direction: number }[] = [];
  const edges = new Set<string>();
  for (const c of s) {
    if (c === '+') direction = (direction + 9) % 10;
    else if (c === '-') direction = (direction + 1) % 10;
    else if (c === '[') stack.push({ position, direction });
    else if (c === ']') {
      const saved = stack.pop()!;
      position = saved.position;
      direction = saved.direction;
    } else if (c === 'F') {
      const next = step(position, direction);
      const a = position.join(',');
      const b = next.join(',');
      edges.add(a < b ? `${a}|${b}` : `${b}|${a}`);
      position = next;
    }
  }
  return edges;
}

describe('step', () => {
  it('returns to where it started after ten steps round the compass', () => {
    let position = ORIGIN;
    for (let d = 0; d < 10; ++d) position = step(position, d);
    expect(position).toEqual(ORIGIN);
  });

  it('treats opposite directions as exact negatives', () => {
    for (let d = 0; d < 10; ++d) {
      expect(step(step(ORIGIN, d), d + 5)).toEqual(ORIGIN);
    }
  });

  it('is exact where floating point would not be', () => {
    // Ten thousand steps around a pentagon land back on the origin exactly.
    // The same walk in floats accumulates error and never closes.
    let position = ORIGIN;
    for (let i = 0; i < 10000; ++i) position = step(position, i % 10);
    expect(position).toEqual(ORIGIN);
  });

  it('places the lattice where the angles say', () => {
    const east = toPlane(step(ORIGIN, 0));
    expect(east.x).toBeCloseTo(1, 12);
    expect(east.y).toBeCloseTo(0, 12);
    const up36 = toPlane(step(ORIGIN, 1));
    expect(up36.x).toBeCloseTo(Math.cos(Math.PI / 5), 12);
    expect(up36.y).toBeCloseTo(Math.sin(Math.PI / 5), 12);
  });

  it('wraps directions outside 0-9', () => {
    expect(step(ORIGIN, 10)).toEqual(step(ORIGIN, 0));
    expect(step(ORIGIN, -1)).toEqual(step(ORIGIN, 9));
  });
});

describe('skeleton', () => {
  it('agrees with rewriting the whole string', () => {
    for (let level = 0; level <= 3; ++level) {
      const recursive = new Set(
        skeleton(level).edges.map(({ a, b }) => (a < b ? `${a}|${b}` : `${b}|${a}`)),
      );
      expect(recursive).toEqual(byStringRewriting(level));
    }
  });

  it('grows the counts the sketch produces', () => {
    expect(skeleton(0).vertices.size).toBe(11);
    expect(skeleton(0).edges).toHaveLength(15);
    expect(skeleton(1).vertices.size).toBe(31);
    expect(skeleton(1).edges).toHaveLength(50);
  });

  it('satisfies Euler at every level, so the graph is connected and planar', () => {
    for (let level = 0; level <= 4; ++level) {
      const { vertices, edges } = skeleton(level);
      const { rhombi } = tiling(level);
      // V - E + F = 2, counting the outer face the tiling drops.
      expect(vertices.size - edges.length + (rhombi.length + 1)).toBe(2);
    }
  });
});

describe('rotate72', () => {
  it('is the identity after five turns', () => {
    for (const start of [[1, 0, 0, 0], [3, -2, 5, 1], [0, 0, 0, -7]] as const) {
      let position: readonly [number, number, number, number] = start;
      for (let i = 0; i < 5; ++i) position = rotate72(position);
      expect(position).toEqual(start);
    }
  });

  it('turns the plane by 72 degrees', () => {
    const before = toPlane([1, 0, 0, 0]);
    const after = toPlane(rotate72([1, 0, 0, 0]));
    const angle = Math.atan2(after.y, after.x) - Math.atan2(before.y, before.x);
    expect(angle).toBeCloseTo((2 * Math.PI) / 5, 9);
    expect(Math.hypot(after.x, after.y)).toBeCloseTo(Math.hypot(before.x, before.y), 9);
  });
});

describe('tiling', () => {
  it('finds only rhombi, one tile per bounded face', () => {
    const counts = [0, 1, 2, 3, 4, 5, 6].map((level) => tiling(level).rhombi.length);
    expect(counts).toEqual([5, 20, 60, 170, 470, 1290, 3470]);
  });

  it('splits every tile into exactly one of the two kinds', () => {
    for (let level = 0; level <= 4; ++level) {
      const { rhombi, thin, thick } = tiling(level);
      expect(thin + thick).toBe(rhombi.length);
    }
  });

  it('starts with five thick rhombi around the centre', () => {
    // The first inflation is five 72-degree rhombi, short diagonal
    // 2*sin(36) = 1.176. The thin tile, short diagonal 0.618, only appears at
    // the next level — which is what makes the ratio start at infinity and
    // fall toward phi from above rather than climbing to it.
    const { thin, thick } = tiling(0);
    expect(thick).toBe(5);
    expect(thin).toBe(0);
  });

  it('gives every tile four unit sides', () => {
    for (const rhombus of tiling(2).rhombi) {
      expect(rhombus.points).toHaveLength(4);
      for (let i = 0; i < 4; ++i) {
        const from = rhombus.points[i];
        const to = rhombus.points[(i + 1) % 4];
        expect(Math.hypot(to.x - from.x, to.y - from.y)).toBeCloseTo(1, 9);
      }
    }
  });

  it('drives thick over thin toward the golden ratio', () => {
    const ratios = [2, 3, 4, 5, 6].map((level) => {
      const { thin, thick } = tiling(level);
      return thick / thin;
    });
    // Monotone, and closing on phi rather than merely near it.
    for (let i = 1; i < ratios.length; ++i) {
      expect(ratios[i]).toBeGreaterThan(ratios[i - 1]);
      expect(Math.abs(ratios[i] - PHI)).toBeLessThan(Math.abs(ratios[i - 1] - PHI));
    }
    expect(ratios[ratios.length - 1]).toBeCloseTo(PHI, 1);
  });

  it('is invariant under a 72 degree turn, exactly', () => {
    // The five-fold symmetry the axiom promises, checked on the integer
    // lattice rather than on rounded plane coordinates.
    for (let level = 0; level <= 3; ++level) {
      const { vertices } = skeleton(level);
      for (const position of vertices.values()) {
        expect(vertices.has(rotate72(position).join(','))).toBe(true);
      }
    }
  });

  it('builds the deepest level the page offers', () => {
    const deepest = tiling(MAX_LEVEL);
    expect(deepest.rhombi.length).toBe(3470);
    expect(deepest.thin + deepest.thick).toBe(3470);
  });
});
