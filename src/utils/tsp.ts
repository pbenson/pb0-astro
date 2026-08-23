/**
 * The search-order problem on a Euclidean graph.
 *
 * You are at home (node 0). One object is hidden at exactly one of the other
 * nodes, node `i` with probability `p_i`. You drive from node to node looking
 * for it, and when you find it you drive home. Which order should you search in?
 *
 * The travelling salesman asks a different question — the shortest tour through
 * every node — and the two answers usually differ. A search order wants cheap
 * stops early, because every later leg is discounted by the chance the search
 * has already ended.
 *
 * Ported from the p5.js sketch, preserving its arithmetic exactly so the two
 * agree to the last bit.
 */

export interface TspNode {
  readonly label: number;
  readonly x: number;
  readonly y: number;
  /** Probability the object is here. Home is 0; the rest sum to 1. */
  readonly p: number;
}

export interface RouteMetrics {
  /** Node labels, starting and ending at home. */
  readonly sequence: readonly number[];
  /** Length of the whole tour: the travelling salesman's objective. */
  readonly cost: number;
  /** Expected distance driven before getting home again. */
  readonly expectedCost: number;
  /** As above, without the final drive home from the last node searched. */
  readonly expectedCostNoReturn: number;
}

export function distance(a: TspNode, b: TspNode): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Every ordering of `items`, in the sketch's original order. */
export function permutations<T>(items: readonly T[]): T[][] {
  if (items.length === 0) return [];
  if (items.length === 1) return [[items[0]!]];

  const all: T[][] = [];
  for (let i = 0; i < items.length; i++) {
    const rest = items.slice();
    rest.splice(i, 1);
    for (const tail of permutations(rest)) {
      all.push([items[i]!, ...tail]);
    }
  }
  return all;
}

/** Total length of the tour: the travelling salesman objective. */
export function routeCost(nodes: readonly TspNode[], sequence: readonly number[]): number {
  let total = 0;
  for (let i = 1; i < sequence.length; i++) {
    total += distance(nodes[sequence[i - 1]!]!, nodes[sequence[i]!]!);
  }
  return total;
}

/**
 * Expected distance driven, including the drive home once the object is found.
 *
 * Walking the sequence, at each node either the object is there — with the
 * unconditional probability `p` — and the trip home is paid, or it is not, and
 * the leg to the next node is paid, weighted by the chance the search is still
 * running.
 */
export function expectedCost(nodes: readonly TspNode[], sequence: readonly number[]): number {
  const home = nodes[sequence[0]!]!;
  let total = distance(home, nodes[sequence[1]!]!);
  let probNotFound = 1;

  for (let i = 1; i < sequence.length - 1; i++) {
    const current = nodes[sequence[i]!]!;
    const toNext = distance(current, nodes[sequence[i + 1]!]!);
    const toHome = distance(current, home);

    const probNotFoundSoFar = probNotFound;
    const probFound = current.p / probNotFound;
    probNotFound -= current.p;

    total += toNext * probNotFound + toHome * probNotFoundSoFar * probFound;
  }
  return total;
}

/**
 * The same expectation with the last node's drive home omitted.
 *
 * Reaching the final node means the object must be there, so this variant asks
 * what the search costs if you do not have to come back from it.
 */
export function expectedCostNoReturn(
  nodes: readonly TspNode[],
  sequence: readonly number[],
): number {
  const home = nodes[sequence[0]!]!;
  let total = distance(home, nodes[sequence[1]!]!);
  let probNotFound = 1;

  for (let i = 1; i < sequence.length - 2; i++) {
    const current = nodes[sequence[i]!]!;
    const toNext = distance(current, nodes[sequence[i + 1]!]!);
    const toHome = distance(current, home);

    const probNotFoundSoFar = probNotFound;
    const probFound = current.p / probNotFound;
    probNotFound -= current.p;

    total += toNext * probNotFound + toHome * probNotFoundSoFar * probFound;
  }
  return total;
}

/**
 * Every route through the nodes, measured three ways.
 *
 * There are `(n-1)!` of them, which is why the interactive version caps at
 * seven nodes: 720 rows is already more than a page wants to show.
 */
export function enumerateRoutes(nodes: readonly TspNode[]): RouteMetrics[] {
  if (nodes.length < 3) return [];

  const others = nodes.slice(1).map((node) => node.label);
  return permutations(others).map((middle) => {
    const sequence = [nodes[0]!.label, ...middle, nodes[0]!.label];
    return {
      sequence,
      cost: routeCost(nodes, sequence),
      expectedCost: expectedCost(nodes, sequence),
      expectedCostNoReturn: expectedCostNoReturn(nodes, sequence),
    };
  });
}

export type Objective = 'cost' | 'expectedCost' | 'expectedCostNoReturn';

/** The best value of each objective across a set of routes. */
export function minima(routes: readonly RouteMetrics[]): Record<Objective, number> {
  return {
    cost: Math.min(...routes.map((r) => r.cost)),
    expectedCost: Math.min(...routes.map((r) => r.expectedCost)),
    expectedCostNoReturn: Math.min(...routes.map((r) => r.expectedCostNoReturn)),
  };
}

/** The first route achieving the best value of an objective. */
export function bestRoute(
  routes: readonly RouteMetrics[],
  objective: Objective,
): RouteMetrics | undefined {
  let best: RouteMetrics | undefined;
  for (const route of routes) {
    if (best === undefined || route[objective] < best[objective]) best = route;
  }
  return best;
}

/** Nodes evenly spaced on a circle, home at angle zero, uniform probabilities. */
export function circleLayout(count: number, radius: number, cx: number, cy: number): TspNode[] {
  const p = 1 / (count - 1);
  const nodes: TspNode[] = [{ label: 0, x: cx + radius, y: cy, p: 0 }];
  for (let i = 1; i < count; i++) {
    const angle = (2 * Math.PI * i) / count;
    nodes.push({
      label: i,
      x: cx + radius * Math.cos(angle),
      y: cy - radius * Math.sin(angle),
      p,
    });
  }
  return nodes;
}
