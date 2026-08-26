import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MODEL,
  demandAt,
  exhaustionTime,
  horizonScan,
  installCost,
  settlingHorizon,
  solve,
  type Model,
} from './capacityExpansion';

const model = (overrides: Partial<Model> = {}): Model => ({ ...DEFAULT_MODEL, ...overrides });

describe('demand', () => {
  it('grows linearly when the exponent is one', () => {
    const m = model({ growth: 2, growthExponent: 1 });
    expect(demandAt(m, 0)).toBe(0);
    expect(demandAt(m, 5)).toBe(10);
  });

  it('bends with the exponent', () => {
    expect(demandAt(model({ growthExponent: 2 }), 3)).toBeCloseTo(9, 12);
    expect(demandAt(model({ growthExponent: 0.5 }), 9)).toBeCloseTo(3, 12);
  });

  it('inverts exactly, so capacity tells you the clock', () => {
    for (const growthExponent of [0.7, 1, 1.4]) {
      const m = model({ growthExponent, growth: 1.3 });
      for (const t of [0, 0.5, 4, 17]) {
        expect(exhaustionTime(m, demandAt(m, t))).toBeCloseTo(t, 9);
      }
    }
  });

  it('never returns a negative time for a negative capacity', () => {
    expect(exhaustionTime(model(), -5)).toBe(0);
  });
});

describe('installCost', () => {
  it('rewards building big when the scale exponent is below one', () => {
    const m = model({ scaleExponent: 0.6 });
    const perUnitSmall = installCost(m, 1, 0) / 1;
    const perUnitLarge = installCost(m, 8, 0) / 8;
    expect(perUnitLarge).toBeLessThan(perUnitSmall);
  });

  it('removes the scale economy at an exponent of one', () => {
    const m = model({ scaleExponent: 1 });
    expect(installCost(m, 8, 0) / 8).toBeCloseTo(installCost(m, 1, 0), 12);
  });

  it('discounts later building', () => {
    const m = model();
    expect(installCost(m, 3, 50)).toBeLessThan(installCost(m, 3, 0));
  });
});

describe('solve', () => {
  it('always buys enough capacity to reach the horizon', () => {
    for (const horizon of [1, 5, 12, 30]) {
      const m = model();
      const { plan } = solve(m, horizon);
      const finalCapacity = plan.capacities[plan.capacities.length - 1] ?? 0;
      expect(finalCapacity).toBeGreaterThanOrEqual(demandAt(m, horizon));
    }
  });

  it('never lets demand outrun capacity in between', () => {
    const m = model();
    const { plan } = solve(m, 25);
    let standing = 0;
    for (let i = 0; i < plan.sizes.length; ++i) {
      // Each facility is installed exactly when the previous capacity binds.
      expect(plan.times[i]).toBeCloseTo(exhaustionTime(m, standing), 9);
      standing += plan.sizes[i];
      expect(plan.capacities[i]).toBe(standing);
    }
  });

  it('reports a total that is the sum of what it spent', () => {
    const { plan, total } = solve(model(), 20);
    expect(plan.total).toBeCloseTo(total, 9);
    expect(plan.costs.reduce((s, v) => s + v, 0)).toBeCloseTo(total, 9);
  });

  it('builds one small facility for a horizon it can reach in one step', () => {
    // Demand at t = 1 is 1 unit, and the smallest facility covers it. Buying
    // anything larger is capacity that is never used before the horizon.
    const { firstMove, plan } = solve(model(), 1);
    expect(firstMove).toBe(1);
    expect(plan.sizes).toEqual([1]);
  });

  it('prefers bigger facilities as economies of scale strengthen', () => {
    const weak = solve(model({ scaleExponent: 0.95 }), 40).firstMove;
    const strong = solve(model({ scaleExponent: 0.3 }), 40).firstMove;
    expect(strong).toBeGreaterThan(weak);
  });

  it('prefers smaller facilities as the discount rate rises', () => {
    // A high rate makes the future cheap, so deferring beats buying ahead.
    const patient = solve(model({ rate: 0.02 }), 40).firstMove;
    const impatient = solve(model({ rate: 0.5 }), 40).firstMove;
    expect(impatient).toBeLessThanOrEqual(patient);
  });

  it('breaks ties toward the smaller facility, whatever order the menu is in', () => {
    const forwards = solve(model({ menu: [1, 2, 3, 5, 8] }), 18);
    const backwards = solve(model({ menu: [8, 5, 3, 2, 1] }), 18);
    expect(backwards.firstMove).toBe(forwards.firstMove);
    expect(backwards.total).toBeCloseTo(forwards.total, 9);
  });
});

describe('horizonScan', () => {
  it('settles on one first move and then stops changing', () => {
    const points = horizonScan(model(), 60, 60);
    const settled = settlingHorizon(points);
    expect(settled).not.toBeNull();

    const final = points[points.length - 1].firstMove;
    for (const point of points) {
      if (point.horizon >= (settled as number)) expect(point.firstMove).toBe(final);
    }
  });

  it('starts small and ends large', () => {
    const points = horizonScan(model(), 60, 60);
    expect(points[0].firstMove).toBe(1);
    expect(points[points.length - 1].firstMove).toBeGreaterThan(points[0].firstMove);
  });

  it('does not have to settle monotonically', () => {
    // Bent demand makes the first decision jump up, back down and up again
    // before it locks. This is the reason "look further ahead" is not a
    // substitute for knowing when you are allowed to stop.
    const points = horizonScan(model({ growthExponent: 1.4 }), 60, 60);
    const moves = points.map((p) => p.firstMove);
    const fellBack = moves.some((v, i) => i > 0 && v < moves[i - 1]);
    expect(fellBack).toBe(true);
  });

  it('reports no settling horizon while the decision is still moving', () => {
    // Only two horizons, and they disagree: nothing has settled yet.
    expect(settlingHorizon([
      { horizon: 1, firstMove: 1 },
      { horizon: 2, firstMove: 2 },
    ])).toBeNull();
  });

  it('finds the first horizon of the final run, not the last', () => {
    expect(settlingHorizon([
      { horizon: 1, firstMove: 1 },
      { horizon: 2, firstMove: 3 },
      { horizon: 3, firstMove: 8 },
      { horizon: 4, firstMove: 8 },
      { horizon: 5, firstMove: 8 },
    ])).toBe(3);
  });

  it('handles an empty scan', () => {
    expect(settlingHorizon([])).toBeNull();
  });
});
