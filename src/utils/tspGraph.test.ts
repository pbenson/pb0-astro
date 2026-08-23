import { describe, it, expect } from 'vitest';
import {
  bestRoute,
  enumerateRoutes,
  expectedCost,
  minima,
  nodesFromWeights,
  randomCosts,
  routeCost,
  withEdgeCost,
  type CostMatrix,
  type GraphNode,
} from './tspGraph';
import { GOLDEN_GRAPH } from './tspGraph.golden';

const key = (sequence: readonly number[]) => sequence.join('-');

function nodesOf(probabilities: readonly number[]): GraphNode[] {
  return probabilities.map((p, label) => ({ label, p }));
}

/** Symmetric matrix from the upper triangle, written row by row. */
function matrix(rows: readonly (readonly number[])[]): CostMatrix {
  return rows;
}

describe('routeCost', () => {
  it('sums the edges of the tour', () => {
    const costs = matrix([
      [0, 2, 5],
      [2, 0, 4],
      [5, 4, 0],
    ]);
    expect(routeCost(costs, [0, 1, 2, 0])).toBe(2 + 4 + 5);
  });

  it('is unchanged by reversing the tour', () => {
    const costs = randomCosts(5, 99);
    expect(routeCost(costs, [0, 1, 2, 3, 4, 0])).toBe(routeCost(costs, [0, 4, 3, 2, 1, 0]));
  });
});

describe('expectedCost', () => {
  const costs = matrix([
    [0, 3, 10],
    [3, 0, 6],
    [10, 6, 0],
  ]);

  it('pays only the first leg when the object is certainly at the first node', () => {
    const nodes = nodesOf([0, 1, 0]);
    // Out to node 1, find it, and back: 3 + 3.
    expect(expectedCost(costs, nodes, [0, 1, 2, 0])).toBeCloseTo(6, 12);
  });

  it('discounts the later legs by the chance the search is still running', () => {
    const nodes = nodesOf([0, 0.25, 0.75]);
    // 3 out; then with p=0.25 pay 3 home, with 0.75 pay 6 on and 10 home.
    expect(expectedCost(costs, nodes, [0, 1, 2, 0])).toBeCloseTo(
      3 + 0.25 * 3 + 0.75 * 6 + 0.75 * 10,
      12,
    );
  });

  it('never exceeds the tour cost, which pays every leg unconditionally', () => {
    const graphCosts = randomCosts(6, 4242);
    const nodes = nodesFromWeights([3, 1, 4, 1, 5]);
    for (const route of enumerateRoutes(graphCosts, nodes)) {
      expect(route.expectedCost).toBeLessThanOrEqual(route.cost + 1e-9);
    }
  });

  it('ignores an edge that the search can never reach', () => {
    const nodes = nodesOf([0, 1, 0]);
    const detoured = withEdgeCost(costs, 1, 2, 1000);
    expect(expectedCost(detoured, nodes, [0, 1, 2, 0])).toBeCloseTo(6, 12);
  });
});

describe('enumerateRoutes', () => {
  it('produces (n-1)! routes, each starting and ending at home', () => {
    const routes = enumerateRoutes(randomCosts(5, 7), nodesFromWeights([1, 1, 1, 1]));
    expect(routes).toHaveLength(24);
    for (const route of routes) {
      expect(route.sequence[0]).toBe(0);
      expect(route.sequence.at(-1)).toBe(0);
    }
  });

  it('needs at least three nodes to have anything to order', () => {
    expect(enumerateRoutes(randomCosts(2, 1), nodesFromWeights([1]))).toEqual([]);
  });
});

describe('against the original sketch', () => {
  for (const [name, golden] of Object.entries(GOLDEN_GRAPH)) {
    describe(name, () => {
      const nodes = nodesOf(golden.probabilities);
      const routes = enumerateRoutes(golden.costs, nodes);
      const byKey = new Map(routes.map((route) => [key(route.sequence), route]));

      it('enumerates the same routes', () => {
        expect(routes).toHaveLength(golden.routes.length);
        expect([...byKey.keys()]).toEqual(golden.routes.map((route) => key(route.sequence)));
      });

      it('reproduces every tour cost and expectation', () => {
        for (const expected of golden.routes) {
          const actual = byKey.get(key(expected.sequence))!;
          expect(actual.cost).toBe(expected.cost);
          expect(actual.expectedCost).toBeCloseTo(expected.expectedCost, 12);
        }
      });
    });
  }

  it('finds the cheapest tour and the best search order to be different routes', () => {
    // The point of the page: on skewed5 the two objectives pick different rows.
    const golden = GOLDEN_GRAPH.skewed5!;
    const routes = enumerateRoutes(golden.costs, nodesOf(golden.probabilities));
    const cheapest = bestRoute(routes, 'cost')!;
    const search = bestRoute(routes, 'expectedCost')!;
    expect(key(cheapest.sequence)).not.toBe(key(search.sequence));
    // Strictly, not by a tie: the search order is the dearer tour of the two,
    // and still the cheaper search.
    expect(search.cost).toBeGreaterThan(cheapest.cost);
    expect(search.expectedCost).toBeLessThan(cheapest.expectedCost);
  });
});

describe('minima and bestRoute', () => {
  const routes = enumerateRoutes(randomCosts(5, 2024), nodesFromWeights([4, 3, 2, 1]));

  it('reports the best value of each objective', () => {
    const best = minima(routes);
    expect(best.cost).toBe(Math.min(...routes.map((r) => r.cost)));
    expect(best.expectedCost).toBeCloseTo(Math.min(...routes.map((r) => r.expectedCost)), 12);
  });

  it('returns a route achieving that value', () => {
    const best = minima(routes);
    expect(bestRoute(routes, 'cost')!.cost).toBe(best.cost);
    expect(bestRoute(routes, 'expectedCost')!.expectedCost).toBeCloseTo(best.expectedCost, 12);
  });

  it('has nothing to return when there are no routes', () => {
    expect(bestRoute([], 'cost')).toBeUndefined();
  });
});

describe('nodesFromWeights', () => {
  it('puts home first with no probability', () => {
    const nodes = nodesFromWeights([1, 1, 2]);
    expect(nodes[0]).toEqual({ label: 0, p: 0 });
    expect(nodes.map((n) => n.label)).toEqual([0, 1, 2, 3]);
  });

  it('scales the weights to sum to one', () => {
    const nodes = nodesFromWeights([1, 1, 2]);
    expect(nodes.slice(1).map((n) => n.p)).toEqual([0.25, 0.25, 0.5]);
  });

  it('falls back to uniform when every weight is zero', () => {
    expect(nodesFromWeights([0, 0]).slice(1).map((n) => n.p)).toEqual([0.5, 0.5]);
  });

  it('treats a negative weight as zero', () => {
    expect(nodesFromWeights([-5, 1]).slice(1).map((n) => n.p)).toEqual([0, 1]);
  });
});

describe('randomCosts', () => {
  it('is symmetric, positive, and bounded by the sketch’s range', () => {
    const costs = randomCosts(6, 31337);
    for (let i = 0; i < 6; i++) {
      for (let j = i + 1; j < 6; j++) {
        expect(costs[i]![j]).toBe(costs[j]![i]);
        expect(costs[i]![j]).toBeGreaterThanOrEqual(1);
        expect(costs[i]![j]).toBeLessThanOrEqual(12);
      }
    }
  });

  it('repeats for a repeated seed and differs for a different one', () => {
    expect(randomCosts(5, 8)).toEqual(randomCosts(5, 8));
    expect(randomCosts(5, 8)).not.toEqual(randomCosts(5, 9));
  });

  it('need not obey the triangle inequality — these are not distances', () => {
    // A graph is free to make the direct edge dearer than the detour.
    const costs = withEdgeCost(randomCosts(4, 1), 0, 1, 50);
    expect(costs[0]![1]).toBeGreaterThan(costs[0]![2]! + costs[2]![1]!);
  });
});

describe('withEdgeCost', () => {
  it('sets both halves of the edge and leaves the original alone', () => {
    const costs = randomCosts(4, 5);
    const updated = withEdgeCost(costs, 1, 3, 42);
    expect(updated[1]![3]).toBe(42);
    expect(updated[3]![1]).toBe(42);
    expect(costs[1]![3]).not.toBe(42);
  });
});
