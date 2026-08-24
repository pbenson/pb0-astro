/**
 * Geometry for the Sphere Method for linear programming.
 *
 * The problem is min c·x subject to Ax >= b. Everything here is 2-D, which is
 * the point: the method's moving parts are geometric, and in two dimensions a
 * reader can watch them rather than take them on faith.
 *
 * Ported from a 2023 p5 sketch (archive/sphere-method-p5). The arithmetic is
 * the same; the structure is pure functions so it can be tested without a
 * canvas.
 */

export interface Vec {
  x: number;
  y: number;
}

/** One constraint a·x >= b. The facetal hyperplane is a·x = b. */
export interface Constraint {
  a: Vec;
  b: number;
}

export const dot = (u: Vec, v: Vec): number => u.x * v.x + u.y * v.y;
export const norm = (v: Vec): number => Math.hypot(v.x, v.y);
export const add = (u: Vec, v: Vec): Vec => ({ x: u.x + v.x, y: u.y + v.y });
export const sub = (u: Vec, v: Vec): Vec => ({ x: u.x - v.x, y: u.y - v.y });
export const scale = (v: Vec, k: number): Vec => ({ x: v.x * k, y: v.y * k });

/** Signed slack a·x - b. Non-negative exactly when the constraint holds. */
export const slack = (c: Constraint, x: Vec): number => dot(c.a, x) - c.b;

/** Perpendicular distance from x to the facet a·x = b. */
export const distanceToFacet = (c: Constraint, x: Vec): number =>
  Math.abs(slack(c, x)) / norm(c.a);

export const isFeasible = (cs: readonly Constraint[], x: Vec, tolerance = 0): boolean =>
  cs.every((c) => slack(c, x) >= -tolerance);

/**
 * delta(x): the radius of the largest ball centred at x that fits inside the
 * feasible region — the smallest distance from x to any facet.
 */
export function delta(cs: readonly Constraint[], x: Vec): number {
  return cs.reduce((r, c) => Math.min(r, distanceToFacet(c, x)), Infinity);
}

/**
 * T(x): the touching set — indices of the constraints whose facets the ball
 * B(x) actually touches. Usually one; more at a point equidistant from
 * several facets, which is where the set jumps as x moves.
 */
export function touchingSet(
  cs: readonly Constraint[],
  x: Vec,
  tolerance = 1e-9,
): number[] {
  const r = delta(cs, x);
  const touching: number[] = [];
  cs.forEach((c, i) => {
    if (distanceToFacet(c, x) - r < tolerance) touching.push(i);
  });
  return touching;
}

/** Orthogonal projection of x onto the facet of constraint c. */
export function projectOntoFacet(c: Constraint, x: Vec): Vec {
  return sub(x, scale(c.a, slack(c, x) / dot(c.a, c.a)));
}

/** The touching points x^i: where B(x) meets each facet in T(x). */
export function touchingPoints(cs: readonly Constraint[], x: Vec): Vec[] {
  return touchingSet(cs, x).map((i) => projectOntoFacet(cs[i], x));
}

/**
 * The bottom point: slide the objective plane down the -c direction until it
 * first touches the ball. That contact point is the best point of the ball.
 */
export function objectiveTouchPoint(cs: readonly Constraint[], c: Vec, x: Vec): Vec {
  return sub(x, scale(c, delta(cs, x) / norm(c)));
}

/**
 * The near touching point (1-eps)x^i + eps.x — a step back from a touching
 * point toward the centre. The iterate has to stay strictly inside the region,
 * and a touching point sits exactly on the boundary.
 */
export function nearTouchingPoint(touching: Vec, centre: Vec, eps: number): Vec {
  return add(scale(touching, 1 - eps), scale(centre, eps));
}

/**
 * How far x can travel along direction d before leaving the region, and which
 * constraint stops it. Returns null when nothing does — unbounded that way.
 */
export function maxStep(
  cs: readonly Constraint[],
  x: Vec,
  d: Vec,
): { t: number; blocking: number } | null {
  let best: { t: number; blocking: number } | null = null;
  cs.forEach((c, i) => {
    const rate = dot(c.a, d);
    // Moving parallel to a facet, or away from it, never runs into it.
    if (rate >= -1e-12) return;
    const t = -slack(c, x) / rate;
    if (t >= 0 && (best === null || t < best.t)) best = { t, blocking: i };
  });
  return best;
}

/** One candidate move considered during a descent step. */
export interface DescentCandidate {
  /** Where the ray starts — a near touching point, or the centre itself. */
  from: Vec;
  direction: Vec;
  /** Furthest feasible point along the ray, pulled back inside by eps. */
  to: Vec;
  objective: number;
  /** Which touching point this came from, or null for the -c direction. */
  touchingIndex: number | null;
}

/**
 * A descent step in the spirit of the method: from the current centre, look
 * along the line from each touching point through the centre, and along -c.
 * Run each ray to the boundary, step back inside by eps, and keep the best by
 * objective value.
 *
 * The objective is linear, so the best point on a segment is always an
 * endpoint — there is nothing to search along the way.
 */
export function descentCandidates(
  cs: readonly Constraint[],
  c: Vec,
  centre: Vec,
  eps: number,
): DescentCandidate[] {
  const rays: { from: Vec; direction: Vec; touchingIndex: number | null }[] = [];

  touchingPoints(cs, centre).forEach((tp, i) => {
    const direction = sub(centre, tp);
    if (norm(direction) < 1e-12) return;
    // Start at the NEAR touching point, not the touching point itself. The
    // touching point lies on a facet, and a ray leaving it can run along that
    // facet — every point of which has delta 0, so the ball vanishes and the
    // method has nothing left to work with.
    rays.push({ from: nearTouchingPoint(tp, centre, eps), direction, touchingIndex: i });
  });
  // The steepest direction is always worth considering alongside them.
  rays.push({ from: centre, direction: scale(c, -1), touchingIndex: null });

  const candidates: DescentCandidate[] = [];
  for (const ray of rays) {
    const step = maxStep(cs, ray.from, ray.direction);
    if (!step) continue;
    const boundary = add(ray.from, scale(ray.direction, step.t));
    // Pull back off the boundary so the iterate stays strictly interior.
    const to = nearTouchingPoint(boundary, ray.from, eps);
    candidates.push({ ...ray, to, objective: dot(c, to) });
  }
  return candidates;
}

/** The best candidate by objective, or null when none improves on the centre. */
export function bestDescent(
  cs: readonly Constraint[],
  c: Vec,
  centre: Vec,
  eps: number,
): DescentCandidate | null {
  const here = dot(c, centre);
  let best: DescentCandidate | null = null;
  for (const candidate of descentCandidates(cs, c, centre, eps)) {
    if (candidate.objective < here - 1e-12 && (!best || candidate.objective < best.objective)) {
      best = candidate;
    }
  }
  return best;
}

/**
 * A centering step: move toward the point of locally largest inscribed ball.
 * The ball grows fastest away from the facets it already touches, so step
 * along the sum of the outward normals of T(x) and keep what improves delta.
 *
 * This is a plain hill climb on delta, not the paper's centering procedure.
 * It is enough to show what centering is *for* — a bigger ball gives the
 * descent step more room — without importing the machinery.
 */
export function centeringStep(
  cs: readonly Constraint[],
  centre: Vec,
  stepFraction = 0.5,
): Vec {
  const touching = touchingSet(cs, centre);
  let direction: Vec = { x: 0, y: 0 };
  for (const i of touching) {
    const c = cs[i];
    direction = add(direction, scale(c.a, 1 / norm(c.a)));
  }
  const length = norm(direction);
  if (length < 1e-12) return centre;

  const unit = scale(direction, 1 / length);
  let best = centre;
  let bestRadius = delta(cs, centre);

  // Scale the trial step by the distance to the FURTHEST facet, not by the
  // current radius. On the boundary the radius is zero, and a step
  // proportional to it is no step at all — centering could never recover from
  // a point the descent cycle had walked onto the boundary.
  const reach = cs.reduce((d, c) => Math.max(d, distanceToFacet(c, centre)), 0);
  for (let t = reach * stepFraction; t > reach * 1e-4; t /= 2) {
    const trial = add(centre, scale(unit, t));
    const radius = delta(cs, trial);
    if (isFeasible(cs, trial) && radius > bestRadius) {
      best = trial;
      bestRadius = radius;
      break;
    }
  }
  return best;
}

/**
 * A descent cycle: descent steps one after another, each from where the last
 * landed, until none improves or the cap is reached.
 *
 * Running a cycle rather than a single step matters. A lone descent step
 * followed by centering can lose ground — centering pulls back toward the
 * middle of the region, which is good for the next ball and bad for the
 * objective — so the iterate settles well short of the optimum.
 */
export function descentCycle(
  cs: readonly Constraint[],
  c: Vec,
  from: Vec,
  eps: number,
  maxSteps = 12,
): { path: Vec[]; end: Vec } {
  const path: Vec[] = [from];
  let current = from;
  for (let i = 0; i < maxSteps; ++i) {
    const step = bestDescent(cs, c, current, eps);
    if (!step) break;
    current = step.to;
    path.push(current);
  }
  return { path, end: current };
}

/**
 * One iteration: centre, then run a descent cycle.
 *
 * `best` is the answer the method reports — the best point by objective seen
 * so far. Centering deliberately moves away from the objective, so the last
 * point visited is not in general the best one.
 */
export function iterate(
  cs: readonly Constraint[],
  c: Vec,
  centre: Vec,
  eps: number,
  bestSoFar?: Vec,
): { centered: Vec; next: Vec; path: Vec[]; best: Vec } {
  const centered = centeringStep(cs, centre);
  const { path, end } = descentCycle(cs, c, centered, eps);
  const incumbent = bestSoFar ?? centre;
  const best = dot(c, end) < dot(c, incumbent) ? end : incumbent;
  return { centered, next: end, path, best };
}
