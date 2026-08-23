/**
 * Values captured from the original p5.js sketch `tsp-w-prob` by running its own
 * node.js / edge.js / route.js under Node against fixed fixtures. The port must
 * reproduce them, not merely agree with itself.
 *
 * `uniform4` is the shape the sketch itself drew: equal probabilities on every
 * node. `skewed5` is the case the sketch could compute but never showed —
 * unequal probabilities, and a layout where the cheapest tour and the best
 * search order are different routes.
 */
export interface GoldenGraphRoute {
  readonly sequence: readonly number[];
  readonly cost: number;
  readonly expectedCost: number;
}

export interface GoldenGraphCase {
  /** Index 0 is home, whose probability is zero. */
  readonly probabilities: readonly number[];
  readonly costs: readonly (readonly number[])[];
  readonly routes: readonly GoldenGraphRoute[];
}

export const GOLDEN_GRAPH: Record<string, GoldenGraphCase> = {
  uniform4: {
    probabilities: [0, 0.3333333333333333, 0.3333333333333333, 0.3333333333333333],
    costs: [
      [0, 5, 9, 3],
      [5, 0, 7, 11],
      [9, 7, 0, 2],
      [3, 11, 2, 0],
    ],
    routes: [
      { sequence: [0, 1, 2, 3, 0], cost: 17, expectedCost: 16 },
      { sequence: [0, 1, 3, 2, 0], cost: 27, expectedCost: 18.666666666666668 },
      { sequence: [0, 2, 1, 3, 0], cost: 30, expectedCost: 23.000000000000004 },
      { sequence: [0, 2, 3, 1, 0], cost: 27, expectedCost: 19.666666666666668 },
      { sequence: [0, 3, 1, 2, 0], cost: 30, expectedCost: 18.333333333333336 },
      { sequence: [0, 3, 2, 1, 0], cost: 17, expectedCost: 12.333333333333336 },
    ],
  },
  skewed5: {
    probabilities: [0, 0.5, 0.25, 0.15, 0.1],
    costs: [
      [0, 4, 10, 3, 1],
      [4, 0, 6, 2, 3],
      [10, 6, 0, 5, 9],
      [3, 2, 5, 0, 8],
      [1, 3, 9, 8, 0],
    ],
    routes: [
      { sequence: [0, 1, 2, 3, 4, 0], cost: 24, expectedCost: 14.1 },
      { sequence: [0, 1, 2, 4, 3, 0], cost: 30, expectedCost: 15.5 },
      { sequence: [0, 1, 3, 2, 4, 0], cost: 21, expectedCost: 12.7 },
      { sequence: [0, 1, 3, 4, 2, 0], cost: 33, expectedCost: 15.1 },
      { sequence: [0, 1, 4, 2, 3, 0], cost: 24, expectedCost: 14.899999999999999 },
      { sequence: [0, 1, 4, 3, 2, 0], cost: 30, expectedCost: 15 },
      { sequence: [0, 2, 1, 3, 4, 0], cost: 27, expectedCost: 20.85 },
      { sequence: [0, 2, 1, 4, 3, 0], cost: 30, expectedCost: 21.5 },
      { sequence: [0, 2, 3, 1, 4, 0], cost: 21, expectedCost: 20.3 },
      { sequence: [0, 2, 3, 4, 1, 0], cost: 30, expectedCost: 25.1 },
      { sequence: [0, 2, 4, 1, 3, 0], cost: 27, expectedCost: 24.05 },
      { sequence: [0, 2, 4, 3, 1, 0], cost: 33, expectedCost: 28 },
      { sequence: [0, 3, 1, 2, 4, 0], cost: 21, expectedCost: 12.75 },
      { sequence: [0, 3, 1, 4, 2, 0], cost: 27, expectedCost: 13.049999999999999 },
      { sequence: [0, 3, 2, 1, 4, 0], cost: 18, expectedCost: 16.200000000000003 },
      { sequence: [0, 3, 2, 4, 1, 0], cost: 24, expectedCost: 19.2 },
      { sequence: [0, 3, 4, 1, 2, 0], cost: 30, expectedCost: 18.6 },
      { sequence: [0, 3, 4, 2, 1, 0], cost: 30, expectedCost: 24.6 },
      { sequence: [0, 4, 1, 2, 3, 0], cost: 18, expectedCost: 11.9 },
      { sequence: [0, 4, 1, 3, 2, 0], cost: 21, expectedCost: 10.799999999999999 },
      { sequence: [0, 4, 2, 1, 3, 0], cost: 21, expectedCost: 18.349999999999998 },
      { sequence: [0, 4, 2, 3, 1, 0], cost: 21, expectedCost: 18.4 },
      { sequence: [0, 4, 3, 1, 2, 0], cost: 27, expectedCost: 16.25 },
      { sequence: [0, 4, 3, 2, 1, 0], cost: 24, expectedCost: 20 },
    ],
  },
};
