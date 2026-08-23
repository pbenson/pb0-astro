/**
 * Distribution of the number of defaults in a homogeneous credit basket.
 *
 * The Gaussian copula model: each of `n` names defaults when its latent asset
 * return falls below a threshold, every name defaults with the same probability
 * `p`, and every pair of names has the same asset correlation `rho`. A single
 * market factor M drives the correlation:
 *
 *     R_k = sqrt(rho) * M + sqrt(1 - rho) * Z_k
 *
 * Conditional on M = m the names are independent, so the count is binomial with
 * a shifted probability, and the unconditional distribution integrates that
 * binomial over the market factor.
 *
 * Implements Pete Benson, "Distribution of Defaults in a Credit Basket: An
 * Interesting Special Case", RiskMetrics Journal, Vol. 6 No. 1, Winter 2005.
 */

/** Standard normal density. */
export function normalPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Standard normal CDF, using Hart's rational approximation.
 *
 * Accurate to near machine precision across the whole range, unlike the
 * Chebyshev `erfc` fits that only reach about 1e-7. That matters here: the
 * threshold Phi^-1(p) feeds every subsequent step, and the article's result is
 * an exact identity that deserves to be reproduced as one.
 */
export function normalCdf(x: number): number {
  const z = Math.abs(x);
  let c: number;

  if (z > 37) {
    c = 0;
  } else {
    const e = Math.exp((-z * z) / 2);
    if (z < 7.07106781186547) {
      let numerator = 3.52624965998911e-2 * z + 0.700383064443688;
      numerator = numerator * z + 6.37396220353165;
      numerator = numerator * z + 33.912866078383;
      numerator = numerator * z + 112.079291497871;
      numerator = numerator * z + 221.213596169931;
      numerator = numerator * z + 220.206867912376;

      let denominator = 8.83883476483184e-2 * z + 1.75566716318264;
      denominator = denominator * z + 16.064177579207;
      denominator = denominator * z + 86.7807322029461;
      denominator = denominator * z + 296.564248779674;
      denominator = denominator * z + 637.333633378831;
      denominator = denominator * z + 793.826512519948;
      denominator = denominator * z + 440.413735824752;

      c = (e * numerator) / denominator;
    } else {
      // Continued fraction for the far tail.
      let build = z + 0.65;
      build = z + 4 / build;
      build = z + 3 / build;
      build = z + 2 / build;
      build = z + 1 / build;
      c = e / (build * 2.506628274631);
    }
  }

  return x > 0 ? 1 - c : c;
}

/**
 * Inverse standard normal CDF (the probit), via Acklam's rational
 * approximation with one Halley refinement.
 *
 * The refinement is what takes it from ~1e-9 to full double precision, which
 * matters because the threshold Phi^-1(p) is the input to everything else.
 */
export function normalQuantile(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
             1.383577518672690e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
             6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
             -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
             3.754408661907416];

  const low = 0.02425;
  let x: number;

  if (p < low) {
    const q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
        ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  } else if (p <= 1 - low) {
    const q = p - 0.5;
    const r = q * q;
    x = ((((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q) /
        (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
         ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  }

  // Halley step against the CDF, to polish the approximation.
  const error = normalCdf(x) - p;
  const u = error * Math.sqrt(2 * Math.PI) * Math.exp((x * x) / 2);
  return x - u / (1 + (x * u) / 2);
}

/** Binomial coefficient, computed multiplicatively to avoid large factorials. */
export function binomialCoefficient(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  const j = Math.min(k, n - k);
  let result = 1;
  for (let i = 0; i < j; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return result;
}

/** Gauss-Legendre nodes and weights on [0, 1], by Newton iteration. */
export function gaussLegendre(count: number): { nodes: Float64Array; weights: Float64Array } {
  const nodes = new Float64Array(count);
  const weights = new Float64Array(count);

  for (let i = 0; i < count; i++) {
    // Chebyshev starting guess for the i-th root of the Legendre polynomial.
    let x = Math.cos((Math.PI * (i + 0.75)) / (count + 0.5));
    let derivative = 0;

    for (let iteration = 0; iteration < 100; iteration++) {
      let p0 = 1;
      let p1 = 0;
      for (let j = 0; j < count; j++) {
        const p2 = p1;
        p1 = p0;
        p0 = ((2 * j + 1) * x * p1 - j * p2) / (j + 1);
      }
      derivative = (count * (x * p0 - p1)) / (x * x - 1);
      const dx = p0 / derivative;
      x -= dx;
      if (Math.abs(dx) < 1e-15) break;
    }

    // Map from [-1, 1] to [0, 1].
    nodes[i] = (x + 1) / 2;
    weights[i] = 1 / ((1 - x * x) * derivative * derivative);
  }
  return { nodes, weights };
}

/** Below this the model is treated as independent, above it as fully coupled. */
const RHO_EPSILON = 1e-9;

/**
 * The market factor is integrated over [-8, 8] rather than the whole line.
 *
 * Beyond eight standard deviations the normal density contributes less than
 * 1e-15, and truncating lets Gauss-Legendre work on an integrand that is
 * analytic and bounded, where it converges exponentially. Substituting
 * u = Phi(m) to reach a finite interval instead would push Phi^-1(u) to
 * infinity at both ends, leaving an endpoint singularity and only algebraic
 * convergence -- measurably worse: the mean was still wrong at 1e-6 with four
 * times as many nodes.
 */
const MARKET_LIMIT = 8;
/** Nodes per panel of the composite rule. */
const QUADRATURE_NODES = 24;

const quadrature = gaussLegendre(QUADRATURE_NODES);

/**
 * Panel boundaries for the market integral.
 *
 * As rho approaches one the conditional default probability becomes a step in
 * m, switching over a width of about sqrt(1-rho)/sqrt(rho) around
 * m* = Phi^-1(p)/sqrt(rho). A single fixed rule cannot resolve that -- at
 * rho = 0.99 one 96-node panel put the mean out by 2e-2. Since both the
 * location and the width are known in closed form, the panels are placed on
 * them instead of hoping for the best.
 */
function marketPanels(threshold: number, rho: number): number[] {
  const centre = threshold / Math.sqrt(rho);
  const width = Math.sqrt(1 - rho) / Math.sqrt(rho);

  // A baseline grid, so the rule never becomes coarse when the transition is
  // wide (at rho near zero the width exceeds the whole interval and every
  // transition-based boundary falls outside it).
  const candidates = [-6, -4, -3, -2, -1, 0, 1, 2, 3, 4, 6];
  for (const multiple of [-12, -6, -3, -1.5, -0.5, 0, 0.5, 1.5, 3, 6, 12]) {
    candidates.push(centre + multiple * width);
  }

  const inside = candidates
    .filter((value) => value > -MARKET_LIMIT && value < MARKET_LIMIT)
    .sort((a, b) => a - b);

  const bounds = [-MARKET_LIMIT, ...inside, MARKET_LIMIT];
  // Drop panels too thin to be worth a rule of their own.
  return bounds.filter((value, i) => i === 0 || value - bounds[i - 1]! > 1e-12);
}

/**
 * Probability of exactly `j` defaults, for `j = 0 .. n`.
 *
 *     Pr[N = j] = C(n,j) * Integral p(m)^j (1 - p(m))^(n-j) phi(m) dm
 *     p(m)      = Phi( (Phi^-1(p) - m sqrt(rho)) / sqrt(1 - rho) )
 *
 * where p(m) is the default probability conditional on the market factor, under
 * which the names are independent and the count is binomial.
 */
export function defaultDistribution(n: number, p: number, rho: number): Float64Array {
  if (!Number.isInteger(n) || n < 1) throw new RangeError('n must be a positive integer');
  if (!(p >= 0 && p <= 1)) throw new RangeError('p must lie in [0, 1]');
  if (!(rho >= 0 && rho <= 1)) throw new RangeError('rho must lie in [0, 1]');

  const result = new Float64Array(n + 1);

  // Perfect correlation: every name shares one fate, so the basket is a coin flip.
  if (rho >= 1 - RHO_EPSILON) {
    result[0] = 1 - p;
    result[n] = p;
    if (n === 0) result[0] = 1;
    return result;
  }

  // Independence: the plain binomial.
  if (rho <= RHO_EPSILON) {
    for (let j = 0; j <= n; j++) {
      result[j] = binomialCoefficient(n, j) * Math.pow(p, j) * Math.pow(1 - p, n - j);
    }
    return result;
  }

  if (p <= 0) { result[0] = 1; return result; }
  if (p >= 1) { result[n] = 1; return result; }

  const threshold = normalQuantile(p);
  const scale = Math.sqrt(rho);
  const denominator = Math.sqrt(1 - rho);

  const { nodes, weights } = quadrature;
  const panels = marketPanels(threshold, rho);

  for (let panel = 1; panel < panels.length; panel++) {
    const from = panels[panel - 1]!;
    const span = panels[panel]! - from;

    for (let k = 0; k < nodes.length; k++) {
      const m = from + span * nodes[k]!;
      // The default probability conditional on the market factor.
      const q = normalCdf((threshold - m * scale) / denominator);
      const weight = weights[k]! * span * normalPdf(m);

      for (let j = 0; j <= n; j++) {
        result[j] += weight * Math.pow(q, j) * Math.pow(1 - q, n - j);
      }
    }
  }

  for (let j = 0; j <= n; j++) {
    result[j] *= binomialCoefficient(n, j);
  }
  return result;
}

/** Expected number of defaults. Equals n*p for every rho — correlation moves
 *  the shape of the distribution, never its mean. */
export function expectedDefaults(distribution: ArrayLike<number>): number {
  let total = 0;
  for (let j = 0; j < distribution.length; j++) total += j * distribution[j]!;
  return total;
}

/** Standard deviation of the number of defaults, which correlation does move. */
export function defaultVolatility(distribution: ArrayLike<number>): number {
  const mean = expectedDefaults(distribution);
  let variance = 0;
  for (let j = 0; j < distribution.length; j++) {
    variance += distribution[j]! * (j - mean) * (j - mean);
  }
  return Math.sqrt(variance);
}

/** True at the special case the article identifies: p = 1/2 and rho = 1/2. */
export function isSpecialCase(p: number, rho: number, tolerance = 1e-9): boolean {
  return Math.abs(p - 0.5) < tolerance && Math.abs(rho - 0.5) < tolerance;
}
