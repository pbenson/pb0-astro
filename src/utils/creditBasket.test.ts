import { describe, it, expect } from 'vitest';
import {
  binomialCoefficient,
  defaultDistribution,
  defaultVolatility,
  expectedDefaults,
  gaussLegendre,
  isSpecialCase,
  normalCdf,
  normalPdf,
  normalQuantile,
} from './creditBasket';

const sum = (xs: ArrayLike<number>) => {
  let total = 0;
  for (let i = 0; i < xs.length; i++) total += xs[i]!;
  return total;
};

describe('normalCdf', () => {
  it('is one half at zero', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 12);
  });

  it.each([
    [-3, 0.001349898], [-1.959964, 0.025], [-1, 0.158655254],
    [1, 0.841344746], [1.959964, 0.975], [3, 0.998650102],
  ])('matches the table at %f', (x, want) => {
    expect(normalCdf(x)).toBeCloseTo(want, 7);
  });

  it('is symmetric', () => {
    for (const x of [0.3, 1.1, 2.7]) {
      expect(normalCdf(-x)).toBeCloseTo(1 - normalCdf(x), 9);
    }
  });

  it('saturates in the tails without going out of range', () => {
    expect(normalCdf(-40)).toBeGreaterThanOrEqual(0);
    expect(normalCdf(40)).toBeLessThanOrEqual(1);
  });
});

describe('normalQuantile', () => {
  it('inverts normalCdf', () => {
    for (const p of [0.001, 0.01, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99, 0.999]) {
      expect(normalCdf(normalQuantile(p))).toBeCloseTo(p, 9);
    }
  });

  it('is zero at one half', () => {
    expect(normalQuantile(0.5)).toBeCloseTo(0, 12);
  });

  it('matches known quantiles', () => {
    expect(normalQuantile(0.975)).toBeCloseTo(1.959964, 5);
    expect(normalQuantile(0.05)).toBeCloseTo(-1.644854, 5);
  });
});

describe('normalPdf', () => {
  it('peaks at the standard height', () => {
    expect(normalPdf(0)).toBeCloseTo(1 / Math.sqrt(2 * Math.PI), 12);
  });
});

describe('binomialCoefficient', () => {
  it.each([[5, 0, 1], [5, 1, 5], [5, 2, 10], [5, 5, 1], [10, 5, 252], [20, 10, 184756]])(
    'C(%i,%i) = %i',
    (n, k, want) => {
      expect(binomialCoefficient(n, k)).toBeCloseTo(want, 6);
    },
  );

  it('is zero outside the range', () => {
    expect(binomialCoefficient(5, -1)).toBe(0);
    expect(binomialCoefficient(5, 6)).toBe(0);
  });
});

describe('gaussLegendre', () => {
  it('has weights summing to the width of the interval', () => {
    expect(sum(gaussLegendre(32).weights)).toBeCloseTo(1, 12);
  });

  it('integrates a polynomial exactly', () => {
    // Integral of x^5 over [0,1] is 1/6.
    const { nodes, weights } = gaussLegendre(8);
    let total = 0;
    for (let i = 0; i < nodes.length; i++) total += weights[i]! * Math.pow(nodes[i]!, 5);
    expect(total).toBeCloseTo(1 / 6, 12);
  });

  it('places every node inside the interval', () => {
    for (const node of gaussLegendre(16).nodes) {
      expect(node).toBeGreaterThan(0);
      expect(node).toBeLessThan(1);
    }
  });
});

describe('defaultDistribution', () => {
  it.each([
    [10, 0.3, 0], [10, 0.3, 0.25], [10, 0.3, 0.5], [10, 0.3, 0.9],
    [5, 0.5, 0.5], [20, 0.1, 0.7], [3, 0.9, 0.15],
  ])('is a probability distribution for n=%i p=%f rho=%f', (n, p, rho) => {
    const distribution = defaultDistribution(n, p, rho);
    expect(distribution).toHaveLength(n + 1);
    for (const value of distribution) expect(value).toBeGreaterThanOrEqual(0);
    expect(sum(distribution)).toBeCloseTo(1, 12);
  });

  it('reduces to the binomial when names are independent', () => {
    const n = 10;
    const p = 0.3;
    const distribution = defaultDistribution(n, p, 0);
    for (let j = 0; j <= n; j++) {
      const want = binomialCoefficient(n, j) * Math.pow(p, j) * Math.pow(1 - p, n - j);
      expect(distribution[j]!).toBeCloseTo(want, 12);
    }
  });

  it('approaches the binomial as correlation approaches zero', () => {
    // The gap is real, not numerical: a small rho still perturbs the latent
    // returns, and the effect scales as sqrt(rho). So the test asserts that the
    // gap shrinks with rho rather than pretending it vanishes.
    const n = 8;
    const p = 0.4;
    const independent = defaultDistribution(n, p, 0);

    const gapAt = (rho: number) => {
      const correlated = defaultDistribution(n, p, rho);
      let worst = 0;
      for (let j = 0; j <= n; j++) {
        worst = Math.max(worst, Math.abs(correlated[j]! - independent[j]!));
      }
      return worst;
    };

    const coarse = gapAt(1e-4);
    const fine = gapAt(1e-6);
    const finer = gapAt(1e-8);

    expect(coarse).toBeLessThan(1e-3);
    expect(fine).toBeLessThan(coarse);
    expect(finer).toBeLessThan(fine);
    // sqrt(rho) scaling: a hundredfold drop in rho gives roughly tenfold in gap.
    expect(coarse / fine).toBeGreaterThan(5);
  });

  it('collapses to a two point distribution at perfect correlation', () => {
    const distribution = defaultDistribution(10, 0.3, 1);
    expect(distribution[0]!).toBeCloseTo(0.7, 12);
    expect(distribution[10]!).toBeCloseTo(0.3, 12);
    for (let j = 1; j < 10; j++) expect(distribution[j]!).toBeCloseTo(0, 12);
  });

  it('leaves the mean at n*p whatever the correlation', () => {
    // Correlation reshapes the distribution; it never moves the mean, because
    // the marginal default probability of each name is untouched.
    for (const rho of [0, 0.2, 0.5, 0.8, 0.99]) {
      expect(expectedDefaults(defaultDistribution(12, 0.35, rho))).toBeCloseTo(12 * 0.35, 10);
    }
  });

  it('spreads the distribution wider as correlation rises', () => {
    const volatilities = [0, 0.25, 0.5, 0.75].map((rho) =>
      defaultVolatility(defaultDistribution(15, 0.3, rho)),
    );
    for (let i = 1; i < volatilities.length; i++) {
      expect(volatilities[i]!).toBeGreaterThan(volatilities[i - 1]!);
    }
  });

  it('rejects invalid parameters', () => {
    expect(() => defaultDistribution(0, 0.5, 0.5)).toThrow(RangeError);
    expect(() => defaultDistribution(2.5, 0.5, 0.5)).toThrow(RangeError);
    expect(() => defaultDistribution(5, 1.5, 0.5)).toThrow(RangeError);
    expect(() => defaultDistribution(5, 0.5, -0.1)).toThrow(RangeError);
  });

  it('handles the degenerate default probabilities', () => {
    expect(defaultDistribution(6, 0, 0.5)[0]!).toBeCloseTo(1, 12);
    expect(defaultDistribution(6, 1, 0.5)[6]!).toBeCloseTo(1, 12);
  });
});

describe("the article's special case", () => {
  // Benson, RiskMetrics Journal Vol 6 No 1 (Winter 2005): with p = 1/2 and
  // rho = 1/2 the number of defaults is uniform on 0..n, whatever n is.
  it.each([1, 2, 3, 5, 8, 10, 15, 20, 30])('is flat at 1/(n+1) for n=%i', (n) => {
    const distribution = defaultDistribution(n, 0.5, 0.5);
    for (let j = 0; j <= n; j++) {
      expect(distribution[j]!).toBeCloseTo(1 / (n + 1), 12);
    }
  });

  it('is not flat if only the probability is one half', () => {
    const distribution = defaultDistribution(10, 0.5, 0.3);
    expect(distribution[5]!).toBeGreaterThan(distribution[0]! * 1.5);
  });

  it('is not flat if only the correlation is one half', () => {
    const distribution = defaultDistribution(10, 0.2, 0.5);
    expect(distribution[0]!).toBeGreaterThan(distribution[10]! * 1.5);
  });

  it('matches the beta integral it reduces to', () => {
    // Pr[N=j] = C(n,j) * B(n-j+1, j+1) = 1/(n+1).
    const n = 7;
    const distribution = defaultDistribution(n, 0.5, 0.5);
    for (let j = 0; j <= n; j++) {
      const beta =
        (binomialCoefficient(n, j) * factorial(n - j) * factorial(j)) / factorial(n + 1);
      expect(distribution[j]!).toBeCloseTo(beta, 12);
    }
  });
});

function factorial(n: number): number {
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

describe('quadrature holds up at the hard corners', () => {
  // Both of these were wrong at some point while building this: a near-step
  // integrand at high correlation, and a transition wider than the interval
  // at low correlation.
  it.each([0.001, 0.01, 0.9, 0.99, 0.999])('stays exact at rho=%f', (rho) => {
    const n = 25;
    const p = 0.8;
    const distribution = defaultDistribution(n, p, rho);
    expect(sum(distribution)).toBeCloseTo(1, 12);
    expect(expectedDefaults(distribution)).toBeCloseTo(n * p, 9);
  });
});

describe('isSpecialCase', () => {
  it('recognises p = rho = 1/2', () => {
    expect(isSpecialCase(0.5, 0.5)).toBe(true);
    expect(isSpecialCase(0.5, 0.4)).toBe(false);
    expect(isSpecialCase(0.4, 0.5)).toBe(false);
  });
});
