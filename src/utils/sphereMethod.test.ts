import { describe, expect, it } from 'vitest';
import {
  bestDescent,
  centeringStep,
  delta,
  descentCandidates,
  distanceToFacet,
  dot,
  isFeasible,
  iterate,
  descentCycle,
  maxStep,
  nearTouchingPoint,
  objectiveTouchPoint,
  projectOntoFacet,
  slack,
  touchingPoints,
  touchingSet,
  type Constraint,
  type Vec,
} from './sphereMethod';

/**
 * The four-constraint example from the 2023 sketch. In a·x >= b form:
 *   -x - y >= -3      2x - y >= -5     -x + 2y >= -5      x + 2y >= -3
 * a bounded quadrilateral containing the origin.
 */
const EXAMPLE: Constraint[] = [
  { a: { x: -1, y: -1 }, b: -3 },
  { a: { x: 2, y: -1 }, b: -5 },
  { a: { x: -1, y: 2 }, b: -5 },
  { a: { x: 1, y: 2 }, b: -3 },
];

/** The sketch's objective, min c·x. */
const C: Vec = { x: -1, y: 5 };

/** A square of side 2 centred on the origin, where every answer is by hand. */
const SQUARE: Constraint[] = [
  { a: { x: 1, y: 0 }, b: -1 },
  { a: { x: -1, y: 0 }, b: -1 },
  { a: { x: 0, y: 1 }, b: -1 },
  { a: { x: 0, y: -1 }, b: -1 },
];

const ORIGIN: Vec = { x: 0, y: 0 };

describe('feasibility and slack', () => {
  it('puts the origin inside both examples', () => {
    expect(isFeasible(EXAMPLE, ORIGIN)).toBe(true);
    expect(isFeasible(SQUARE, ORIGIN)).toBe(true);
  });

  it('rejects a point outside', () => {
    expect(isFeasible(SQUARE, { x: 2, y: 0 })).toBe(false);
  });

  it('reads slack as zero exactly on a facet', () => {
    expect(slack(SQUARE[0], { x: -1, y: 0 })).toBeCloseTo(0, 12);
  });

  it('normalises distance by the constraint normal, not its scale', () => {
    const plain: Constraint = { a: { x: 1, y: 0 }, b: 0 };
    const scaled: Constraint = { a: { x: 10, y: 0 }, b: 0 };
    const x = { x: 3, y: 0 };
    expect(distanceToFacet(plain, x)).toBeCloseTo(3, 12);
    expect(distanceToFacet(scaled, x)).toBeCloseTo(3, 12);
  });
});

describe('delta', () => {
  it('is the inradius at the centre of the square', () => {
    expect(delta(SQUARE, ORIGIN)).toBeCloseTo(1, 12);
  });

  it('shrinks as the centre approaches a facet', () => {
    expect(delta(SQUARE, { x: 0.5, y: 0 })).toBeCloseTo(0.5, 12);
    expect(delta(SQUARE, { x: 0.9, y: 0 })).toBeCloseTo(0.1, 12);
  });

  it('is zero on the boundary', () => {
    expect(delta(SQUARE, { x: 1, y: 0 })).toBeCloseTo(0, 12);
  });
});

describe('touching set', () => {
  it('holds all four facets at the centre of the square', () => {
    expect(touchingSet(SQUARE, ORIGIN)).toEqual([0, 1, 2, 3]);
  });

  it('narrows to the nearest facet once the centre moves off', () => {
    // Moving in +x approaches the facet -x >= -1, which is index 1.
    expect(touchingSet(SQUARE, { x: 0.5, y: 0 })).toEqual([1]);
  });

  it('jumps as the centre crosses a line of equidistance', () => {
    const before = touchingSet(SQUARE, { x: 0.2, y: 0.1 });
    const after = touchingSet(SQUARE, { x: 0.1, y: 0.2 });
    expect(before).not.toEqual(after);
    // On the diagonal itself two facets tie — the jump is a genuine
    // discontinuity, not a rounding artefact.
    expect(touchingSet(SQUARE, { x: 0.15, y: 0.15 })).toHaveLength(2);
  });
});

describe('projection and touching points', () => {
  it('projects onto a facet, landing on it', () => {
    const p = projectOntoFacet(SQUARE[0], { x: 0.3, y: 0.4 });
    expect(slack(SQUARE[0], p)).toBeCloseTo(0, 12);
    expect(p.y).toBeCloseTo(0.4, 12);
  });

  it('puts every touching point at distance delta from the centre', () => {
    const x = { x: 0.3, y: -0.2 };
    const r = delta(EXAMPLE, x);
    for (const tp of touchingPoints(EXAMPLE, x)) {
      expect(Math.hypot(tp.x - x.x, tp.y - x.y)).toBeCloseTo(r, 9);
    }
  });

  it('gives one touching point per member of the touching set', () => {
    expect(touchingPoints(SQUARE, ORIGIN)).toHaveLength(4);
    expect(touchingPoints(SQUARE, { x: 0.5, y: 0 })).toHaveLength(1);
  });
});

describe('objective touch point', () => {
  it('sits on the ball, delta away from the centre', () => {
    const x = { x: 0.2, y: 0.1 };
    const bottom = objectiveTouchPoint(EXAMPLE, C, x);
    expect(Math.hypot(bottom.x - x.x, bottom.y - x.y)).toBeCloseTo(delta(EXAMPLE, x), 9);
  });

  it('is the best point of the ball by objective value', () => {
    const x = { x: 0.2, y: 0.1 };
    const r = delta(EXAMPLE, x);
    const bottom = dot(C, objectiveTouchPoint(EXAMPLE, C, x));
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 16) {
      const onBall = { x: x.x + r * Math.cos(angle), y: x.y + r * Math.sin(angle) };
      expect(dot(C, onBall)).toBeGreaterThanOrEqual(bottom - 1e-9);
    }
  });
});

describe('near touching point', () => {
  it('is the touching point at eps 0 and the centre at eps 1', () => {
    const tp = { x: 1, y: 0 };
    expect(nearTouchingPoint(tp, ORIGIN, 0)).toEqual(tp);
    expect(nearTouchingPoint(tp, ORIGIN, 1)).toEqual(ORIGIN);
  });

  it('stays strictly inside for any eps above zero', () => {
    const tp = { x: 1, y: 0 };
    for (const eps of [0.01, 0.2, 0.5]) {
      const near = nearTouchingPoint(tp, ORIGIN, eps);
      expect(delta(SQUARE, near)).toBeGreaterThan(0);
    }
  });
});

describe('maxStep', () => {
  it('measures the distance to the blocking facet', () => {
    const step = maxStep(SQUARE, ORIGIN, { x: 1, y: 0 });
    expect(step).not.toBeNull();
    expect(step!.t).toBeCloseTo(1, 12);
    expect(step!.blocking).toBe(1);
  });

  it('returns null when nothing blocks the direction', () => {
    // A single constraint x >= -1, moving in +x, never meets its facet.
    expect(maxStep([SQUARE[0]], ORIGIN, { x: 1, y: 0 })).toBeNull();
  });

  it('lands exactly on the boundary', () => {
    const d = { x: 1, y: 1 };
    const step = maxStep(SQUARE, ORIGIN, d)!;
    const landed = { x: d.x * step.t, y: d.y * step.t };
    expect(delta(SQUARE, landed)).toBeCloseTo(0, 9);
  });
});

describe('descent', () => {
  const start = { x: 0.1, y: 0.1 };

  it('offers a candidate per touching point plus the steepest direction', () => {
    const candidates = descentCandidates(EXAMPLE, C, start, 0.2);
    expect(candidates.length).toBeGreaterThanOrEqual(2);
    expect(candidates.some((k) => k.touchingIndex === null)).toBe(true);
  });

  it('keeps every candidate strictly inside the region', () => {
    for (const candidate of descentCandidates(EXAMPLE, C, start, 0.2)) {
      expect(isFeasible(EXAMPLE, candidate.to, 1e-9)).toBe(true);
      expect(delta(EXAMPLE, candidate.to)).toBeGreaterThan(0);
    }
  });

  it('improves the objective or reports nothing', () => {
    const best = bestDescent(EXAMPLE, C, start, 0.2);
    expect(best).not.toBeNull();
    expect(best!.objective).toBeLessThan(dot(C, start));
  });
});

describe('iteration', () => {
  it('never leaves the feasible region', () => {
    let x: Vec = { x: 0.1, y: 0.1 };
    for (let i = 0; i < 40; ++i) {
      x = iterate(EXAMPLE, C, x, 0.2).next;
      expect(isFeasible(EXAMPLE, x, 1e-9)).toBe(true);
    }
  });

  it('improves the incumbent monotonically, though the iterate wanders', () => {
    let x: Vec = { x: 0.1, y: 0.1 };
    let best: Vec = x;
    let bestValue = dot(C, best);
    let iterateWentUp = false;

    for (let i = 0; i < 40; ++i) {
      const previous = dot(C, x);
      const step = iterate(EXAMPLE, C, x, 0.2, best);
      x = step.next;
      best = step.best;

      // The incumbent is the method's answer, and it never gets worse.
      const value = dot(C, best);
      expect(value).toBeLessThanOrEqual(bestValue + 1e-9);
      bestValue = value;

      if (dot(C, x) > previous + 1e-9) iterateWentUp = true;
    }

    // And the iterate itself is NOT monotone: centering moves away from the
    // objective on purpose, to buy a bigger ball for the next descent. That
    // is why the method carries an incumbent rather than just its position.
    expect(iterateWentUp).toBe(true);
  });

  it('approaches the true optimum of the example', () => {
    // The LP is small enough to solve by enumerating the vertices.
    const vertices: Vec[] = [];
    for (let i = 0; i < EXAMPLE.length; ++i) {
      for (let j = i + 1; j < EXAMPLE.length; ++j) {
        const [p, q] = [EXAMPLE[i], EXAMPLE[j]];
        const det = p.a.x * q.a.y - p.a.y * q.a.x;
        if (Math.abs(det) < 1e-12) continue;
        const v = {
          x: (p.b * q.a.y - q.b * p.a.y) / det,
          y: (p.a.x * q.b - q.a.x * p.b) / det,
        };
        if (isFeasible(EXAMPLE, v, 1e-9)) vertices.push(v);
      }
    }
    const optimum = Math.min(...vertices.map((v) => dot(C, v)));

    let x: Vec = { x: 0.1, y: 0.1 };
    let best: Vec = x;
    for (let i = 0; i < 60; ++i) {
      const step = iterate(EXAMPLE, C, x, 0.05, best);
      x = step.next;
      best = step.best;
    }

    // It stays strictly interior, so it approaches the optimum without ever
    // reaching it — that is the method, not a shortcoming of the port.
    expect(dot(C, best)).toBeGreaterThan(optimum);
    expect(dot(C, best) - optimum).toBeLessThan(0.01);
  });

  it('recovers when a descent cycle walks the point onto the boundary', () => {
    // Repeated "run to the boundary, back off by eps" converges onto the
    // boundary, where delta is 0. Centering has to be able to step away from
    // there — scaling its trial step by the current radius meant it could not,
    // and the whole method stalled one cycle in.
    const onBoundary = { x: 0.7233333333333961, y: -1.8616666666665258 };
    expect(delta(EXAMPLE, onBoundary)).toBeLessThan(1e-6);

    const recovered = centeringStep(EXAMPLE, onBoundary);
    expect(delta(EXAMPLE, recovered)).toBeGreaterThan(1e-3);
  });

  it('keeps every point of a descent cycle strictly inside', () => {
    // A ray starting at a touching point can run along that point's own
    // facet, and every point of that facet has delta 0. Rays start at the
    // near touching point instead.
    const { path } = descentCycle(EXAMPLE, C, { x: 0.2, y: 0.3 }, 0.05);
    expect(path.length).toBeGreaterThan(1);
    for (const point of path) {
      expect(delta(EXAMPLE, point)).toBeGreaterThan(0);
    }
  });

  it('centering grows the ball, or leaves it alone', () => {
    for (const start of [{ x: 0.6, y: 0.2 }, { x: -0.4, y: 0.5 }, { x: 0.1, y: -0.7 }]) {
      const after = centeringStep(EXAMPLE, start);
      expect(delta(EXAMPLE, after)).toBeGreaterThanOrEqual(delta(EXAMPLE, start) - 1e-12);
    }
  });
});
