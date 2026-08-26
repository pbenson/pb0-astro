/**
 * The quincunx, or Galton board: balls fall through a triangular lattice of
 * pins, bouncing left or right at each row, and pile up in bins at the bottom.
 *
 * Ported from the p5 sketch at ~/github/cadhub/p5/quincunx. The sketch keeps
 * the bias hard-coded at a half and — because of an inverted comparison — would
 * have run backwards the moment it was exposed as a control. It is exposed here,
 * so the arithmetic lives in this file where it can be tested.
 *
 * A ball that goes right `k` times out of `n` rows lands in bin `k`, so bin
 * counts are binomial. That is the whole point of the machine, and the page
 * draws the exact binomial over the empirical bars to show it.
 */

/** Rows of pins the reader can choose between. */
export const MIN_ROWS = 1;
export const MAX_ROWS = 24;

/**
 * Which bin one ball lands in.
 *
 * `random` is injected so a drop can be pinned in tests. The comparison is
 * `random() < p`, so a larger `p` sends more balls right — the sketch had this
 * the other way round (`random(1) > probabilityOfGoingRight`), which is
 * invisible at p = 0.5 and exactly backwards anywhere else.
 */
export function dropBall(
  rows: number,
  probabilityOfGoingRight: number,
  random: () => number = Math.random,
): number {
  let bin = 0;
  for (let row = 0; row < rows; ++row) {
    if (random() < probabilityOfGoingRight) ++bin;
  }
  return bin;
}

/** Binomial coefficient C(n, k), exact for the row counts this page offers. */
export function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  const half = Math.min(k, n - k);
  let result = 1;
  for (let i = 0; i < half; ++i) {
    // Multiply before dividing by a factor that is guaranteed to divide
    // exactly, so the running value stays an integer the whole way.
    result = (result * (n - i)) / (i + 1);
  }
  return result;
}

/**
 * The exact distribution the machine is sampling: P(bin = k) for k = 0..rows.
 *
 * Computed in logs and exponentiated, so that 24 rows does not overflow through
 * a 2^24 intermediate on the way to a probability under one.
 */
export function binomialPmf(rows: number, probabilityOfGoingRight: number): number[] {
  const p = probabilityOfGoingRight;
  return Array.from({ length: rows + 1 }, (_, k) => {
    if (p === 0) return k === 0 ? 1 : 0;
    if (p === 1) return k === rows ? 1 : 0;
    const logProbability =
      Math.log(binomial(rows, k)) + k * Math.log(p) + (rows - k) * Math.log(1 - p);
    return Math.exp(logProbability);
  });
}

/** Mean bin, n*p — where the peak sits once the bias is moved off a half. */
export const expectedBin = (rows: number, probabilityOfGoingRight: number): number =>
  rows * probabilityOfGoingRight;

/** Standard deviation of the bin, sqrt(n*p*(1-p)). */
export const binStandardDeviation = (
  rows: number,
  probabilityOfGoingRight: number,
): number =>
  Math.sqrt(rows * probabilityOfGoingRight * (1 - probabilityOfGoingRight));

/**
 * Drop `count` balls at once and add them to `counts` in place.
 *
 * Sampling the whole batch rather than animating it is what makes ten thousand
 * balls bearable; the animation is a separate concern and only ever shows a
 * handful in flight.
 */
export function dropMany(
  counts: number[],
  count: number,
  rows: number,
  probabilityOfGoingRight: number,
  random: () => number = Math.random,
): number[] {
  for (let i = 0; i < count; ++i) {
    ++counts[dropBall(rows, probabilityOfGoingRight, random)];
  }
  return counts;
}

/** A fresh, empty set of bins for the given number of rows. */
export const emptyBins = (rows: number): number[] => new Array<number>(rows + 1).fill(0);

/**
 * Pin positions for `rows` rows, in a unit-width triangle centred on x = 0.5.
 *
 * Row r holds r+1 pins. Rows are spaced by sqrt(3)/2 of the pin separation, so
 * the lattice is equilateral — the sketch's rowSeparation.
 */
export function pinPositions(rows: number): { x: number; y: number }[] {
  const pins: { x: number; y: number }[] = [];
  const spacing = 1 / (rows + 1);
  for (let row = 0; row < rows; ++row) {
    for (let i = 0; i <= row; ++i) {
      pins.push({
        x: 0.5 + (i - row / 2) * spacing,
        y: (row + 0.5) * spacing * (Math.sqrt(3) / 2),
      });
    }
  }
  return pins;
}
