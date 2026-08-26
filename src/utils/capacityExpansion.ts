/**
 * Capacity expansion over a planning horizon.
 *
 * Demand grows without bound; capacity is bought in durable lumps from a fixed
 * menu of sizes; bigger lumps cost less per unit. The question this file exists
 * to answer is not "what is the best infinite schedule" but the practical one
 * underneath it, in Robert Smith's words:
 *
 *   "One of the planner's greatest dilemmas is how long a horizon time to
 *    select so that end of horizon effects do not distort the first capacity
 *    deployment decision. It is of course this first decision which is the only
 *    one implemented and therefore the critical one."
 *
 * WHAT THIS IS AND IS NOT. This is the simplest model that exhibits that
 * dilemma — Manne's setting with a discrete menu, solved by dynamic programming
 * over a finite horizon. It is not Bean and Smith's algorithm, and the page
 * says so. Their contribution is that a solution horizon can be found and its
 * first decision proved optimal for the infinite problem *without* leaning on
 * special structure. Here you can watch the first decision settle; there it is
 * a theorem.
 *
 * Costs:
 *   building size s at time t costs  K * s^scaleExponent * exp(-rate * t)
 * in present value, with scaleExponent below 1 giving the economies of scale
 * that make waiting and building big attractive, and `rate` the net of discount
 * against cost escalation. Escalation is not carried separately because it only
 * ever appears netted against the discount rate — which is exactly why the
 * stochastic companion paper can say that uncertainty is equivalent to
 * discounting at a lower rate.
 */

export interface Model {
  /** Facility sizes available, in capacity units. Positive integers. */
  readonly menu: readonly number[];
  /** Demand at time t is `growth * t ** growthExponent`. */
  readonly growth: number;
  /**
   * 1 is Manne's linear demand. Anything else is what makes the problem
   * interesting: with linear demand the problem looks identical from every
   * capacity level, so the optimal infinite policy simply repeats one size
   * forever and there is nothing for a horizon to settle. Bend the demand and
   * that self-similarity breaks.
   */
  readonly growthExponent: number;
  /** Net of discount against cost escalation. Must be positive to converge. */
  readonly rate: number;
  /** Cost of one unit of capacity, before economies of scale. */
  readonly unitCost: number;
  /** Below 1, bigger is cheaper per unit. At 1 there is no scale economy. */
  readonly scaleExponent: number;
}

export const DEFAULT_MODEL: Model = {
  menu: [1, 2, 3, 5, 8],
  growth: 1,
  growthExponent: 1,
  rate: 0.12,
  unitCost: 1,
  scaleExponent: 0.6,
};

/** Demand at time `t`. */
export const demandAt = (model: Model, t: number): number =>
  model.growth * Math.pow(Math.max(0, t), model.growthExponent);

/**
 * When capacity `c` runs out — the moment the next facility has to be ready.
 *
 * Demand is strictly increasing, so this is just its inverse. With capacity
 * binding exactly at this instant there is no decision about *when* to build,
 * only about what: costs are discounted, so building earlier than necessary is
 * never worth it, and building later is not allowed.
 */
export const exhaustionTime = (model: Model, c: number): number =>
  Math.pow(Math.max(0, c) / model.growth, 1 / model.growthExponent);

/** Present value at time zero of installing `size` when capacity `c` runs out. */
export function installCost(model: Model, size: number, c: number): number {
  const t = exhaustionTime(model, c);
  return model.unitCost * Math.pow(size, model.scaleExponent) * Math.exp(-model.rate * t);
}

export interface Plan {
  /** Sizes built, in order. */
  readonly sizes: readonly number[];
  /** The time each was installed. */
  readonly times: readonly number[];
  /** Capacity standing after each installation. */
  readonly capacities: readonly number[];
  /** Present value of each installation. */
  readonly costs: readonly number[];
  /** Total present value. */
  readonly total: number;
}

export interface Solution {
  /** The size to build now — the only decision actually implemented. */
  readonly firstMove: number;
  readonly plan: Plan;
  /** Present value of meeting demand out to the horizon. */
  readonly total: number;
}

/**
 * Cheapest way to keep up with demand until `horizon`, by dynamic programming
 * on standing capacity.
 *
 * The state is capacity alone. Cost accumulates along a path rather than
 * steering it, because the moment to build is pinned by when capacity binds —
 * so knowing how much capacity you have tells you both what demand you face and
 * what time it is.
 *
 * Menu sizes are whole numbers, so reachable capacities are whole numbers too
 * and the table is exact rather than sampled.
 */
export function solve(model: Model, horizon: number): Solution {
  const needed = demandAt(model, horizon);
  const largest = Math.max(...model.menu);
  const size = Math.ceil(needed) + largest + 1;

  const cost = new Float64Array(size).fill(Infinity);
  const choice = new Int32Array(size).fill(-1);

  for (let c = size - 1; c >= 0; --c) {
    if (c >= needed) {
      // Capacity already covers demand all the way to the horizon: nothing
      // more to buy, and nothing beyond the horizon is counted. That omission
      // is the end-of-horizon effect the whole exercise is about.
      cost[c] = 0;
      continue;
    }
    let best = Infinity;
    let bestSize = -1;
    for (const s of model.menu) {
      const next = c + s;
      const value = installCost(model, s, c) + (next < size ? cost[next] : 0);
      // A strict improvement only, so ties go to the smaller size and the
      // answer does not depend on the order of the menu.
      if (value < best - 1e-12) {
        best = value;
        bestSize = s;
      }
    }
    cost[c] = best;
    choice[c] = bestSize;
  }

  const sizes: number[] = [];
  const times: number[] = [];
  const capacities: number[] = [];
  const costs: number[] = [];
  let c = 0;
  while (c < needed && choice[c] > 0) {
    const s = choice[c];
    times.push(exhaustionTime(model, c));
    costs.push(installCost(model, s, c));
    sizes.push(s);
    c += s;
    capacities.push(c);
  }

  return {
    firstMove: choice[0] > 0 ? choice[0] : 0,
    total: cost[0],
    plan: {
      sizes,
      times,
      capacities,
      costs,
      total: costs.reduce((sum, v) => sum + v, 0),
    },
  };
}

export interface HorizonPoint {
  readonly horizon: number;
  readonly firstMove: number;
}

/**
 * The first decision as a function of how far ahead you look.
 *
 * For short horizons it wanders — there is no point buying capacity you will
 * never use, so a short horizon argues for a small facility. As the horizon
 * lengthens it settles, and past the settling point looking further changes
 * nothing. That settling point is the whole subject.
 *
 * It does not have to settle monotonically. With demand bent away from linear
 * the first move can jump up, back down and up again before it locks, which is
 * precisely why "look a long way ahead" is not a substitute for knowing when
 * you may stop.
 */
export function horizonScan(
  model: Model,
  maxHorizon: number,
  steps: number,
): HorizonPoint[] {
  const points: HorizonPoint[] = [];
  for (let i = 1; i <= steps; ++i) {
    const horizon = (maxHorizon * i) / steps;
    points.push({ horizon, firstMove: solve(model, horizon).firstMove });
  }
  return points;
}

/**
 * The shortest horizon after which the first decision never changes again,
 * across the horizons scanned.
 *
 * Null when it is still moving at the far end of the scan, which is the honest
 * answer: this is evidence about the horizons looked at, not a proof about all
 * of them. Establishing the real thing is what the paper is for.
 */
export function settlingHorizon(points: readonly HorizonPoint[]): number | null {
  if (!points.length) return null;
  const final = points[points.length - 1].firstMove;
  let index = points.length - 1;
  while (index > 0 && points[index - 1].firstMove === final) --index;
  return index === points.length - 1 ? null : points[index].horizon;
}
