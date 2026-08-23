/**
 * Monte Carlo simulation of multivariate-normal asset log returns, following the
 * method in Benson & Zangari, "A general approach to calculating VaR without
 * volatilities and correlations" (RiskMetrics Monitor, Q2 1997).
 *
 * The covariance matrix is never formed or factored. Given a T x N matrix R of
 * weighted, demeaned log returns whose rows are trading days and columns are
 * assets, a single draw is
 *
 *     z ~ N(0, I_T)          one standard normal per DAY
 *     r = R' z               an N-vector of simulated asset returns
 *
 * which has covariance R'R -- exactly the weighted sample covariance of the
 * historical returns. Cost is O(T*N) per draw rather than the O(N^3) of a
 * Cholesky factorization, and the advantage grows as N outruns T.
 */

/** How historical observations are weighted when estimating the distribution. */
export type Weighting =
  | { readonly kind: 'equal' }
  /** RiskMetrics exponential weighting; lambda is the daily decay factor. */
  | { readonly kind: 'ewma'; readonly lambda: number };

/** Historical weighted returns, held column-major as columns[asset][day]. */
export interface ReturnMatrix {
  readonly columns: readonly Float64Array[];
  readonly days: number;
}

/** Continuously compounded (log) returns from a price series. */
export function logReturns(closes: readonly number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push(Math.log(closes[i] / closes[i - 1]));
  }
  return returns;
}

/**
 * Observation weights, most recent day last, normalized to sum to 1.
 *
 * Equal weighting gives every day 1/T. Exponential weighting gives day t a
 * weight proportional to lambda^(age in days), so the most recent day carries
 * the most information. RiskMetrics uses lambda = 0.94 for daily data.
 */
export function observationWeights(days: number, weighting: Weighting): Float64Array {
  const weights = new Float64Array(days);
  if (weighting.kind === 'equal') {
    weights.fill(1 / days);
    return weights;
  }

  const { lambda } = weighting;
  let total = 0;
  for (let t = 0; t < days; t++) {
    const age = days - 1 - t;
    const w = Math.pow(lambda, age);
    weights[t] = w;
    total += w;
  }
  for (let t = 0; t < days; t++) {
    weights[t] /= total;
  }
  return weights;
}

/**
 * Build the weighted return matrix R whose rows are scaled by sqrt(weight).
 *
 * Scaling by the square root is what lets a plain N(0, I) draw reproduce the
 * weighted covariance: R'R = sum_t w_t r_t r_t'. Under equal weighting the
 * scale factor is 1/sqrt(T), recovering the R'z/sqrt(T) form in the paper.
 *
 * Returns are demeaned, so simulated returns are centered on zero -- the
 * standard convention for one-day risk, where estimated drift is noise.
 */
export function buildReturnMatrix(
  returnsByAsset: readonly (readonly number[])[],
  weighting: Weighting,
): ReturnMatrix {
  if (returnsByAsset.length === 0) throw new Error('need at least one asset');

  const days = returnsByAsset[0].length;
  if (returnsByAsset.some((r) => r.length !== days)) {
    throw new Error('all assets must have the same number of return observations');
  }
  if (days === 0) throw new Error('need at least one return observation');

  const weights = observationWeights(days, weighting);
  const scales = new Float64Array(days);
  for (let t = 0; t < days; t++) {
    scales[t] = Math.sqrt(weights[t]);
  }

  const columns = returnsByAsset.map((returns) => {
    // Demean with the same weights used for the covariance, so the weighted
    // mean of each column is zero.
    let mean = 0;
    for (let t = 0; t < days; t++) {
      mean += weights[t] * returns[t];
    }

    const column = new Float64Array(days);
    for (let t = 0; t < days; t++) {
      column[t] = scales[t] * (returns[t] - mean);
    }
    return column;
  });

  return { columns, days };
}

/** Deterministic PRNG, so a given seed always yields the same simulation. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal draws via the Box-Muller transform. */
export function standardNormals(count: number, uniform: () => number): Float64Array {
  const draws = new Float64Array(count);
  for (let i = 0; i < count; i += 2) {
    // Guard against log(0); uniform() can return exactly 0.
    const u1 = Math.max(uniform(), Number.MIN_VALUE);
    const u2 = uniform();
    const radius = Math.sqrt(-2 * Math.log(u1));
    const angle = 2 * Math.PI * u2;
    draws[i] = radius * Math.cos(angle);
    if (i + 1 < count) draws[i + 1] = radius * Math.sin(angle);
  }
  return draws;
}

/**
 * Simulate one-day log returns: `simulations` draws of r = R'z.
 *
 * Returns one array per asset, each holding `simulations` simulated returns.
 * The draws are jointly consistent -- entry i of every asset's array comes from
 * the same z, so the correlation structure is preserved across assets.
 */
export function simulateReturns(
  matrix: ReturnMatrix,
  simulations: number,
  uniform: () => number,
): Float64Array[] {
  const { columns, days } = matrix;
  const output = columns.map(() => new Float64Array(simulations));

  for (let s = 0; s < simulations; s++) {
    const z = standardNormals(days, uniform);
    for (let asset = 0; asset < columns.length; asset++) {
      const column = columns[asset];
      let sum = 0;
      for (let t = 0; t < days; t++) {
        sum += column[t] * z[t];
      }
      output[asset][s] = sum;
    }
  }

  return output;
}

/**
 * Weighted historical standard deviation of an asset's returns, read straight
 * off the return matrix: the column's own inner product. Used to annotate the
 * histograms with the target the simulation should reproduce.
 */
export function historicalVolatility(matrix: ReturnMatrix, asset: number): number {
  const column = matrix.columns[asset];
  let sumSquares = 0;
  for (let t = 0; t < column.length; t++) {
    sumSquares += column[t] * column[t];
  }
  return Math.sqrt(sumSquares);
}

/** Sample standard deviation of simulated returns (mean is zero by construction). */
export function standardDeviation(values: ArrayLike<number>): number {
  let mean = 0;
  for (let i = 0; i < values.length; i++) mean += values[i];
  mean /= values.length;

  let sumSquares = 0;
  for (let i = 0; i < values.length; i++) {
    const d = values[i] - mean;
    sumSquares += d * d;
  }
  return Math.sqrt(sumSquares / (values.length - 1));
}

/** Correlation between two equal-length simulated (zero-mean) series. */
export function correlation(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let sumAB = 0;
  let sumAA = 0;
  let sumBB = 0;
  for (let i = 0; i < a.length; i++) {
    sumAB += a[i] * b[i];
    sumAA += a[i] * a[i];
    sumBB += b[i] * b[i];
  }
  return sumAB / Math.sqrt(sumAA * sumBB);
}

/**
 * Weighted historical correlation between two assets, read straight off the
 * return matrix as the normalized inner product of two columns.
 *
 * This is the one number the simulation must reproduce but a marginal histogram
 * cannot show, so the correlogram compares it against the simulated value.
 */
export function historicalCorrelation(matrix: ReturnMatrix, i: number, j: number): number {
  const a = matrix.columns[i];
  const b = matrix.columns[j];
  return correlation(a, b);
}

/** Every unordered pair of asset indices, in stable (i < j) order. */
export function assetPairs(count: number): { readonly i: number; readonly j: number }[] {
  const pairs: { i: number; j: number }[] = [];
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      pairs.push({ i, j });
    }
  }
  return pairs;
}
