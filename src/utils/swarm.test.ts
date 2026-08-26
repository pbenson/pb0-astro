import { describe, expect, it } from 'vitest';
import {
  advanceChain,
  asFraction,
  easeToward,
  leadTarget,
  scatter,
  STEP,
  turnsToClose,
  type Point,
} from './swarm';

/** The sketch's own arithmetic, written out longhand, as an oracle. */
function sketchMove(from: Point, target: Point, ease: number): Point {
  const blendX = from.x * ease + target.x * (1 - ease);
  const blendY = from.y * ease + target.y * (1 - ease);
  const dx = blendX - from.x;
  const dy = blendY - from.y;
  return { x: from.x + dx * 0.1, y: from.y + dy * 0.1 };
}

describe('easeToward', () => {
  it('reproduces the sketch move exactly', () => {
    const from = { x: 0.2, y: 0.7 };
    const target = { x: 0.9, y: 0.1 };
    expect(easeToward(from, target, 0.5)).toEqual(sketchMove(from, target, 0.5));
  });

  it('closes STEP * (1 - ease) of the gap, not `ease` of it', () => {
    const from = { x: 0, y: 0 };
    const target = { x: 1, y: 0 };
    // The trap this test exists to guard: reading ease = 0.5 as "half way"
    // overstates the motion tenfold.
    expect(easeToward(from, target, 0.5).x).toBeCloseTo(STEP * 0.5, 12);
    expect(easeToward(from, target, 0).x).toBeCloseTo(STEP, 12);
  });

  it('does not move a particle already on its target', () => {
    const p = { x: 0.4, y: 0.4 };
    expect(easeToward(p, p, 0.5)).toEqual(p);
  });

  it('leaves a particle still when ease is 1 — a fully slack chain', () => {
    const from = { x: 0.1, y: 0.2 };
    expect(easeToward(from, { x: 1, y: 1 }, 1)).toEqual(from);
  });
});

describe('advanceChain', () => {
  it('lets each follower see the one ahead of it already moved', () => {
    const chain = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ];
    const lead = { x: 1, y: 0 };
    const [first, second] = advanceChain(chain, lead, 0.5);

    expect(first).toEqual(easeToward(chain[0], lead, 0.5));
    // Not easeToward(chain[1], chain[0]) — the second particle chases the
    // first's NEW position. If this ever reads 0 the update went simultaneous.
    expect(second).toEqual(easeToward(chain[1], first, 0.5));
    expect(second.x).toBeGreaterThan(0);
  });

  it('returns a new array and leaves the input untouched', () => {
    const chain = [{ x: 0.5, y: 0.5 }];
    const next = advanceChain(chain, { x: 1, y: 1 }, 0.5);
    expect(next).not.toBe(chain);
    expect(chain[0]).toEqual({ x: 0.5, y: 0.5 });
  });

  it('handles an empty chain', () => {
    expect(advanceChain([], { x: 0, y: 0 }, 0.5)).toEqual([]);
  });
});

describe('leadTarget', () => {
  it('puts the rose on the centre when cos(k*theta) is zero', () => {
    // k = 1, theta = pi/2 makes r = 0, so the curve passes through the middle.
    expect(leadTarget('rose', Math.PI / 2, 1)).toEqual({ x: 0.5, y: 0.5 });
  });

  it('reaches the sketch extreme of 0.95 at theta = 0', () => {
    // r = 0.9 at theta = 0, so x = 0.5 * (1 + 0.9) = 0.95.
    const p = leadTarget('rose', 0, 1.5);
    expect(p.x).toBeCloseTo(0.95, 12);
    expect(p.y).toBeCloseTo(0.5, 12);
  });

  it('stays inside the unit square for every k the control offers', () => {
    for (let k = 0.25; k <= 6; k += 0.25) {
      for (let theta = 0; theta < 8 * Math.PI; theta += 0.01) {
        const { x, y } = leadTarget('rose', theta, k);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(1);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(1);
      }
    }
  });

  it('traces an ellipse centred on the middle', () => {
    expect(leadTarget('ellipse', 0, 1)).toEqual({ x: 0.75, y: 0.5 });
    expect(leadTarget('ellipse', Math.PI / 2, 1).y).toBeCloseTo(0.95, 12);
  });

  it('matches the original sketch formula', () => {
    const k = 1.5;
    const theta = 0.37;
    const petalMultiplier = Math.cos(k * theta);
    expect(leadTarget('rose', theta, k)).toEqual({
      x: 0.5 * (1 + 0.9 * petalMultiplier * Math.cos(theta)),
      y: 0.5 * (1 + 0.9 * petalMultiplier * Math.sin(theta)),
    });
  });
});

describe('asFraction', () => {
  it.each([
    [1, 1, 1],
    [1.5, 3, 2],
    [2, 2, 1],
    [2.25, 9, 4],
    [0.75, 3, 4],
    [3.5, 7, 2],
  ])('reduces %s to %i/%i', (k, p, q) => {
    expect(asFraction(k)).toEqual({ p, q });
  });
});

describe('turnsToClose', () => {
  it('closes an integer k in a single turn', () => {
    expect(turnsToClose(3)).toBe(1);
    expect(turnsToClose(4)).toBe(1);
  });

  it('needs two turns for the sketch default of 1.5', () => {
    expect(turnsToClose(1.5)).toBe(2);
  });

  it('needs four turns for a quarter denominator', () => {
    expect(turnsToClose(2.25)).toBe(4);
  });

  it('actually closes the curve it claims to', () => {
    for (let k = 0.25; k <= 6; k += 0.25) {
      const period = 2 * Math.PI * turnsToClose(k);
      for (const theta of [0, 0.3, 1.1, 2.9]) {
        const a = leadTarget('rose', theta, k);
        const b = leadTarget('rose', theta + period, k);
        expect(b.x).toBeCloseTo(a.x, 9);
        expect(b.y).toBeCloseTo(a.y, 9);
      }
    }
  });
});

describe('scatter', () => {
  it('places every particle inside the unit square', () => {
    for (const p of scatter(50)) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThan(1);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThan(1);
    }
  });

  it('takes its randomness from the caller, so a layout can be pinned', () => {
    const values = [0.1, 0.2, 0.3, 0.4];
    let i = 0;
    expect(scatter(2, () => values[i++])).toEqual([
      { x: 0.1, y: 0.2 },
      { x: 0.3, y: 0.4 },
    ]);
  });
});
