/**
 * The search-order problem on a general graph.
 *
 * The Euclidean version of this page (see `tsp.ts`) puts the locations on a map
 * and reads the travel costs off the plane. Here the costs are just numbers on
 * the edges of a complete graph: they need not come from any geometry, so they
 * need not obey the triangle inequality, and the probabilities of finding the
 * object need not be equal.
 *
 * Ported from the p5.js sketch `tsp-w-prob`. The expectation is the sketch's,
 * with one cancelling division removed: it computed a conditional probability
 * and immediately multiplied it back out. The tests check the port against
 * values the sketch itself produced.
 *
 * The sketch drew a probability under every node but always set them uniform;
 * unequal probabilities are the generalisation this port adds, and the formula
 * it inherits already handles them.
 */
import { permutations } from './tsp';

export interface GraphNode {
  readonly label: number;
  /** Probability the object is here. Home is 0; the rest sum to 1. */
  readonly p: number;
}

/** Symmetric matrix of edge costs; the diagonal is unused. */
export type CostMatrix = readonly (readonly number[])[];

export interface GraphRouteMetrics {
  /** Node labels, starting and ending at home. */
  readonly sequence: readonly number[];
  /** Total cost of the whole tour: the travelling salesman's objective. */
  readonly cost: number;
  /** Expected cost paid before getting home again. */
  readonly expectedCost: number;
}

export function edgeCost(costs: CostMatrix, from: number, to: number): number {
  return costs[from]![to]!;
}

/** Total cost of the tour: the travelling salesman objective. */
export function routeCost(costs: CostMatrix, sequence: readonly number[]): number {
  let total = 0;
  for (let i = 1; i < sequence.length; i++) {
    total += edgeCost(costs, sequence[i - 1]!, sequence[i]!);
  }
  return total;
}

/**
 * Expected cost paid, including the trip home once the object is found.
 *
 * Walking the sequence, at each node either the object is there — with
 * probability `p` — and the trip home is paid, or it is not, and the leg to the
 * next node is paid, weighted by the chance the search is still running. The
 * last searched node is covered by the same term: the leg to its "next" node is
 * the closing leg home.
 */
export function expectedCost(
  costs: CostMatrix,
  nodes: readonly GraphNode[],
  sequence: readonly number[],
): number {
  const home = sequence[0]!;
  let total = edgeCost(costs, home, sequence[1]!);
  let probNotFound = 1;

  for (let i = 1; i < sequence.length - 1; i++) {
    const current = nodes[sequence[i]!]!;
    const toNext = edgeCost(costs, sequence[i]!, sequence[i + 1]!);
    const toHome = edgeCost(costs, sequence[i]!, home);

    probNotFound -= current.p;
    total += toNext * probNotFound + toHome * current.p;
  }
  return total;
}

/**
 * Every route through the nodes, measured both ways.
 *
 * There are `(n-1)!` of them, so the interactive version caps the node count:
 * brute force is exact, and exactness is the point, but it is not cheap.
 */
export function enumerateRoutes(
  costs: CostMatrix,
  nodes: readonly GraphNode[],
): GraphRouteMetrics[] {
  if (nodes.length < 3) return [];

  const others = nodes.slice(1).map((node) => node.label);
  return permutations(others).map((middle) => {
    const sequence = [nodes[0]!.label, ...middle, nodes[0]!.label];
    return {
      sequence,
      cost: routeCost(costs, sequence),
      expectedCost: expectedCost(costs, nodes, sequence),
    };
  });
}

export type GraphObjective = 'cost' | 'expectedCost';

/** The best value of each objective across a set of routes. */
export function minima(routes: readonly GraphRouteMetrics[]): Record<GraphObjective, number> {
  return {
    cost: Math.min(...routes.map((r) => r.cost)),
    expectedCost: Math.min(...routes.map((r) => r.expectedCost)),
  };
}

/** The first route achieving the best value of an objective. */
export function bestRoute(
  routes: readonly GraphRouteMetrics[],
  objective: GraphObjective,
): GraphRouteMetrics | undefined {
  let best: GraphRouteMetrics | undefined;
  for (const route of routes) {
    if (best === undefined || route[objective] < best[objective]) best = route;
  }
  return best;
}

/** Probabilities from non-negative weights, scaled to sum to one. Home gets 0. */
export function nodesFromWeights(weights: readonly number[]): GraphNode[] {
  const total = weights.reduce((sum, w) => sum + Math.max(0, w), 0);
  return [
    { label: 0, p: 0 },
    ...weights.map((w, i) => ({
      label: i + 1,
      p: total > 0 ? Math.max(0, w) / total : 1 / weights.length,
    })),
  ];
}

/** A small deterministic generator, so a layout can be reproduced from a seed. */
function randomFrom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Random symmetric edge costs, in the sketch's own range of `1` to `2n`.
 *
 * Nothing forces these to obey the triangle inequality, which is exactly the
 * freedom a graph has and a map does not.
 */
export function randomCosts(count: number, seed: number): number[][] {
  const random = randomFrom(seed);
  const costs = Array.from({ length: count }, () => new Array<number>(count).fill(0));
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      const cost = 1 + Math.floor(random() * 2 * count);
      costs[i]![j] = cost;
      costs[j]![i] = cost;
    }
  }
  return costs;
}

/** A copy of `costs` with one edge — and its mirror image — set to `value`. */
export function withEdgeCost(
  costs: CostMatrix,
  from: number,
  to: number,
  value: number,
): number[][] {
  const next = costs.map((row) => row.slice());
  next[from]![to] = value;
  next[to]![from] = value;
  return next;
}
