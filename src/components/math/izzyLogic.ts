/**
 * The colouring arithmetic behind the Izzy triangle enumeration, kept apart
 * from the sketch so it can be tested without a canvas.
 *
 * A colouring is six bits, one per wedge of an equilateral triangle cut by its
 * medians. The figure has three-fold symmetry, so the colourings fall into
 * orbits under a third of a turn.
 */

/** All six segments black: the last of the 64 colourings, and the 24th distinct one. */
export const LAST_COLOURING = 63

/** Colourings in a full pass. */
export const COLOURING_COUNT = LAST_COLOURING + 1

/** A third of a turn moves each wedge two places, so the six-bit pattern rotates by two. */
export function rotate(colouring: number) {
  return Math.floor(colouring / 4) + (colouring % 4) * 16
}

/**
 * The smallest of a colouring's three rotations — the representative that
 * stands for its whole orbit, and the one the gallery holds.
 */
export function canonical(colouring: number) {
  let smallest = colouring
  let rotated = colouring
  for (let i = 0; i < 2; ++i) {
    rotated = rotate(rotated)
    if (rotated < smallest) smallest = rotated
  }
  return smallest
}

/** A colouring is distinct if it is the representative of its own orbit. */
export function isDistinct(colouring: number) {
  return canonical(colouring) === colouring
}

/** Every distinct colouring, in the order a pass over 0..63 meets them. */
export function distinctColourings() {
  const found: number[] = []
  for (let colouring = 0; colouring <= LAST_COLOURING; ++colouring) {
    if (isDistinct(colouring)) found.push(colouring)
  }
  return found
}
