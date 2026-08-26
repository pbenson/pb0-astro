/**
 * Swarm: a chain of particles easing along a rose curve.
 *
 * Ported from the 2025 p5 sketch at ~/github/cadhub/p5/swarm. The sketch
 * hard-codes every interesting number; the point of the port is to expose them,
 * so the arithmetic lives here where it can be tested and the component is left
 * to do nothing but draw.
 *
 * Coordinates are normalised: the figure lives in [0, 1] x [0, 1] and is centred
 * on (0.5, 0.5), so the drawing surface can be any size the page gives it.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

export type PathKind = 'rose' | 'ellipse';

/**
 * The fraction of the remaining distance a particle travels each frame.
 *
 * In the sketch this is the literal 0.1 inside Particle.moveTo. It is separate
 * from `ease` and the two compose — see {@link easeToward}.
 */
export const STEP = 0.1;

/** How far theta advances per frame. The sketch's thetaIncrement. */
export const THETA_INCREMENT = 0.01;

/**
 * Where the lead particle is being pulled at parameter `theta`.
 *
 * The sketch writes the rose as
 *
 *     x = (w/2) * (1 + 0.9 * cos(k*theta) * cos(theta))
 *     y = (h/2) * (1 + 0.9 * cos(k*theta) * sin(theta))
 *
 * which is easier to read as r = 0.9 * cos(k*theta) about the centre, in units
 * of half the width. Written that way the petal rule is visible rather than
 * buried: r = cos(k*theta) closes only after {@link turnsToClose} full turns.
 *
 * The ellipse is the sketch's commented-out alternative, kept as a selectable
 * path rather than left to rot as a dead comment.
 */
export function leadTarget(kind: PathKind, theta: number, petalScalar: number): Point {
  if (kind === 'ellipse') {
    return {
      x: 0.5 * (1 + 0.5 * Math.cos(theta)),
      y: 0.5 * (1 + 0.9 * Math.sin(theta)),
    };
  }
  const r = 0.9 * Math.cos(petalScalar * theta);
  return {
    x: 0.5 * (1 + r * Math.cos(theta)),
    y: 0.5 * (1 + r * Math.sin(theta)),
  };
}

/** Greatest common divisor of two non-negative integers. */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * `k` as a fraction p/q in lowest terms.
 *
 * The slider moves in steps of 0.25, so a denominator of 4 is always enough and
 * there is no need for continued fractions. Scaling by 4 and reducing keeps this
 * exact for every value the control can produce.
 */
export function asFraction(petalScalar: number): { p: number; q: number } {
  const scaled = Math.round(petalScalar * 4);
  const divisor = gcd(Math.abs(scaled), 4) || 1;
  return { p: scaled / divisor, q: 4 / divisor };
}

/**
 * How many full turns of theta the rose needs before it repeats.
 *
 * r = cos((p/q) * theta) is unchanged when theta grows by 2*pi*q, because the
 * argument grows by exactly 2*pi*p. So q turns always closes the curve. Some
 * p/q close sooner — the antipodal identity can fold the second half onto the
 * first — so this is an upper bound, and the honest thing to show a reader who
 * is watching the figure draw itself.
 */
export function turnsToClose(petalScalar: number): number {
  return asFraction(petalScalar).q;
}

/**
 * One frame of a particle's pursuit of its target.
 *
 * The sketch splits this across two methods and the composition is easy to
 * misread. `moveTowards` blends the particle's own position with the target's
 * using `ease`, and `moveTo` then travels {@link STEP} of the way to that blend.
 * The effective pull is therefore STEP * (1 - ease): at the sketch's ease = 0.5
 * a particle closes a twentieth of the gap per frame, not half of it.
 *
 * Higher `ease` means a slacker chain, which is the opposite of what the name
 * suggests. Kept as-is so the number matches the sketch it came from.
 */
export function easeToward(from: Point, target: Point, ease: number): Point {
  const blendX = from.x * ease + target.x * (1 - ease);
  const blendY = from.y * ease + target.y * (1 - ease);
  return {
    x: from.x + (blendX - from.x) * STEP,
    y: from.y + (blendY - from.y) * STEP,
  };
}

/**
 * Advance the whole chain one frame.
 *
 * Particle 0 chases the lead; particle i chases particle i-1. The update is
 * deliberately sequential rather than simultaneous — each follower sees where
 * the one ahead of it has *already moved to* this frame, which is what the
 * sketch does and what produces the tight fanning. Snapshotting first and
 * updating together gives a visibly looser, laggier chain.
 *
 * Returns a new array; the caller keeps the previous one to draw the segments.
 */
export function advanceChain(
  chain: readonly Point[],
  lead: Point,
  ease: number,
): Point[] {
  const next: Point[] = [];
  let ahead = lead;
  for (const particle of chain) {
    const moved = easeToward(particle, ahead, ease);
    next.push(moved);
    ahead = moved;
  }
  return next;
}

/**
 * Starting positions: scattered at random across the surface.
 *
 * The gathering of that scatter into a chain is the first few seconds of the
 * animation and a large part of why the sketch is worth watching, so it is kept
 * rather than tidied into a neat initial row.
 *
 * `random` is injected so tests can pin the layout.
 */
export function scatter(count: number, random: () => number = Math.random): Point[] {
  return Array.from({ length: count }, () => ({ x: random(), y: random() }));
}
