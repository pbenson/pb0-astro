import { describe, it, expect } from 'vitest';
import {
  bestRoute,
  circleLayout,
  distance,
  enumerateRoutes,
  expectedCost,
  expectedCostNoReturn,
  minima,
  permutations,
  routeCost,
  type TspNode,
} from './tsp';
import { GOLDEN } from './tsp.golden';

const key = (sequence: readonly number[]) => sequence.join('-');

function uniform(points: readonly [number, number][]): TspNode[] {
  const p = 1 / (points.length - 1);
  return points.map(([x, y], label) => ({ label, x, y, p: label === 0 ? 0 : p }));
}

describe('permutations', () => {
  it('produces n! orderings', () => {
    expect(permutations([1, 2, 3, 4])).toHaveLength(24);
  });

  it('produces each ordering exactly once', () => {
    const seen = new Set(permutations([1, 2, 3, 4]).map((p) => p.join()));
    expect(seen.size).toBe(24);
  });

  it('handles the degenerate sizes', () => {
    expect(permutations([])).toEqual([]);
    expect(permutations([7])).toEqual([[7]]);
  });
});

describe('distance', () => {
  it('is Euclidean', () => {
    const a: TspNode = { label: 0, x: 0, y: 0, p: 0 };
    const b: TspNode = { label: 1, x: 3, y: 4, p: 1 };
    expect(distance(a, b)).toBe(5);
  });
});

describe('routeCost', () => {
  it('sums the legs of the tour', () => {
    // A 3-4-5 right triangle walked as home -> 1 -> 2 -> home.
    const nodes = uniform([[0, 0], [3, 0], [3, 4]]);
    expect(routeCost(nodes, [0, 1, 2, 0])).toBe(3 + 4 + 5);
  });

  it('is unchanged by reversing the tour', () => {
    const nodes = uniform([[0, 0], [3, 0], [3, 4], [0, 4]]);
    expect(routeCost(nodes, [0, 1, 2, 3, 0])).toBeCloseTo(routeCost(nodes, [0, 3, 2, 1, 0]), 12);
  });
});

describe('expectedCost', () => {
  it('is the first leg plus the trip home when there is one place to look', () => {
    // With a single search node the object is certainly there: drive out, drive back.
    const nodes: TspNode[] = [
      { label: 0, x: 0, y: 0, p: 0 },
      { label: 1, x: 10, y: 0, p: 1 },
    ];
    expect(expectedCost(nodes, [0, 1, 0])).toBeCloseTo(20, 12);
  });

  it('never exceeds the full tour, since the search can stop early', () => {
    const nodes = uniform([[0, 0], [30, 0], [30, 40], [0, 40]]);
    for (const route of enumerateRoutes(nodes)) {
      expect(route.expectedCost).toBeLessThanOrEqual(route.cost + 1e-9);
    }
  });

  it('differs from the no-return variant by exactly the last drive home', () => {
    const nodes = uniform([[184, 378.3], [356.2, 387.7], [251.1, 99.5], [189.3, 122]]);
    for (const route of enumerateRoutes(nodes)) {
      const last = nodes[route.sequence[route.sequence.length - 2]!]!;
      const lastLegHome = distance(last, nodes[0]!) * last.p;
      expect(route.expectedCost - route.expectedCostNoReturn).toBeCloseTo(lastLegHome, 9);
    }
  });

  it('prefers searching the near node first when two are equally likely', () => {
    // Home at the origin, a close node and a far one on the same ray.
    const nodes: TspNode[] = [
      { label: 0, x: 0, y: 0, p: 0 },
      { label: 1, x: 10, y: 0, p: 0.5 },
      { label: 2, x: 100, y: 0, p: 0.5 },
    ];
    const near = expectedCost(nodes, [0, 1, 2, 0]);
    const far = expectedCost(nodes, [0, 2, 1, 0]);
    expect(near).toBeLessThan(far);
    // Both tours have identical length; only the search order differs.
    expect(routeCost(nodes, [0, 1, 2, 0])).toBeCloseTo(routeCost(nodes, [0, 2, 1, 0]), 12);
  });
});

describe('enumerateRoutes', () => {
  it('produces (n-1)! routes', () => {
    expect(enumerateRoutes(circleLayout(5, 100, 0, 0))).toHaveLength(24);
    expect(enumerateRoutes(circleLayout(7, 100, 0, 0))).toHaveLength(720);
  });

  it('starts and ends every route at home', () => {
    for (const route of enumerateRoutes(circleLayout(5, 100, 0, 0))) {
      expect(route.sequence[0]).toBe(0);
      expect(route.sequence.at(-1)).toBe(0);
    }
  });

  it('visits every node exactly once in between', () => {
    for (const route of enumerateRoutes(circleLayout(5, 100, 0, 0))) {
      const middle = route.sequence.slice(1, -1);
      expect(new Set(middle).size).toBe(middle.length);
      expect([...middle].sort()).toEqual([1, 2, 3, 4]);
    }
  });

  it('returns nothing when there is nowhere to search', () => {
    expect(enumerateRoutes([{ label: 0, x: 0, y: 0, p: 0 }])).toEqual([]);
  });
});

describe('agreement with the original p5 sketch', () => {
  // The port must reproduce the archive's numbers exactly, not approximately.
  it.each(Object.keys(GOLDEN))('matches the golden values for n=%s', (n) => {
    const testCase = GOLDEN[n]!;
    const nodes = testCase.nodes.map((node) => ({ ...node }));
    const routes = enumerateRoutes(nodes);
    const byKey = new Map(routes.map((r) => [key(r.sequence), r]));

    expect(routes).toHaveLength(testCase.routes.length);
    for (const want of testCase.routes) {
      const got = byKey.get(key(want.sequence));
      expect(got, `route ${key(want.sequence)}`).toBeDefined();
      expect(got!.cost).toBe(want.cost);
      expect(got!.expectedCost).toBe(want.expectedCost);
      expect(got!.expectedCostNoReturn).toBe(want.expectedCostNoReturn);
    }
  });
});

describe('the cheapest tour is not the best search order', () => {
  it('separates on the layout the fixture was built from', () => {
    // This is the whole point of the page: a longer tour can be the better
    // search, because later legs are discounted by the chance of stopping early.
    const nodes = GOLDEN['5']!.nodes.map((node) => ({ ...node }));
    const routes = enumerateRoutes(nodes);

    const cheapest = bestRoute(routes, 'cost')!;
    const bestSearch = bestRoute(routes, 'expectedCost')!;

    expect(key(cheapest.sequence)).not.toBe(key(bestSearch.sequence));
    expect(bestSearch.cost).toBeGreaterThan(cheapest.cost);
    expect(bestSearch.expectedCost).toBeLessThan(cheapest.expectedCost);
  });

  it('agrees on a circle, where symmetry removes the tension', () => {
    // Comparing sequences would be wrong here: 0-1-2-3-4-0 and 0-4-3-2-1-0 are
    // the same cycle walked backwards, and which one wins a tie depends on
    // floating point. The claim is that the cheapest tour also attains the
    // lowest expected cost.
    const nodes = circleLayout(5, 200, 0, 0);
    const routes = enumerateRoutes(nodes);
    const cheapest = bestRoute(routes, 'cost')!;

    expect(cheapest.expectedCost).toBeCloseTo(minima(routes).expectedCost, 9);
  });
});

describe('minima', () => {
  it('reports the best value of each objective', () => {
    const routes = enumerateRoutes(GOLDEN['5']!.nodes.map((n) => ({ ...n })));
    const best = minima(routes);
    expect(best.cost).toBe(Math.min(...routes.map((r) => r.cost)));
    expect(best.expectedCost).toBe(Math.min(...routes.map((r) => r.expectedCost)));
  });
});

describe('circleLayout', () => {
  it('places home on the circle with zero probability', () => {
    const nodes = circleLayout(5, 100, 0, 0);
    expect(nodes[0]!.p).toBe(0);
    expect(nodes[0]!.x).toBeCloseTo(100, 12);
  });

  it('spreads the remaining probability uniformly', () => {
    const nodes = circleLayout(5, 100, 0, 0);
    const total = nodes.reduce((sum, node) => sum + node.p, 0);
    expect(total).toBeCloseTo(1, 12);
  });
});
