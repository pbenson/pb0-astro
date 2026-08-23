import { describe, it, expect } from 'vitest';
import {
  logReturns,
  observationWeights,
  buildReturnMatrix,
  mulberry32,
  standardNormals,
  simulateReturns,
  historicalVolatility,
  standardDeviation,
  correlation,
  historicalCorrelation,
  assetPairs,
  type Weighting,
} from './assetReturns';

/** Reference implementation: the weighted covariance the paper's method avoids forming. */
function weightedCovariance(
  returnsByAsset: readonly (readonly number[])[],
  weighting: Weighting,
  i: number,
  j: number,
): number {
  const days = returnsByAsset[0].length;
  const weights = observationWeights(days, weighting);
  const mean = (asset: number) =>
    returnsByAsset[asset].reduce((acc, r, t) => acc + weights[t] * r, 0);

  const meanI = mean(i);
  const meanJ = mean(j);
  let cov = 0;
  for (let t = 0; t < days; t++) {
    cov += weights[t] * (returnsByAsset[i][t] - meanI) * (returnsByAsset[j][t] - meanJ);
  }
  return cov;
}

/** Deterministic pseudo-random return history, correlated across assets. */
function syntheticReturns(assets: number, days: number): number[][] {
  const rng = mulberry32(20250822);
  const shared = Array.from(standardNormals(days, rng));
  return Array.from({ length: assets }, (_, a) => {
    const idio = standardNormals(days, rng);
    const loading = 0.4 + 0.2 * a;
    return Array.from({ length: days }, (_, t) => 0.01 * (loading * shared[t] + idio[t]));
  });
}

describe('logReturns', () => {
  it('returns one fewer value than prices', () => {
    expect(logReturns([100, 101, 102])).toHaveLength(2);
  });

  it('computes continuously compounded returns', () => {
    const [r] = logReturns([100, 110]);
    expect(r).toBeCloseTo(Math.log(1.1), 12);
  });

  it('gives zero for an unchanged price', () => {
    expect(logReturns([50, 50])[0]).toBe(0);
  });

  it('is additive across periods, unlike simple returns', () => {
    const returns = logReturns([100, 120, 90]);
    const total = returns.reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(Math.log(90 / 100), 12);
  });
});

describe('observationWeights', () => {
  it('splits weight evenly under equal weighting', () => {
    const weights = observationWeights(4, { kind: 'equal' });
    expect([...weights]).toEqual([0.25, 0.25, 0.25, 0.25]);
  });

  it('sums to one under exponential weighting', () => {
    const weights = observationWeights(250, { kind: 'ewma', lambda: 0.94 });
    const total = [...weights].reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 12);
  });

  it('decays by lambda going back in time', () => {
    const weights = observationWeights(10, { kind: 'ewma', lambda: 0.94 });
    expect(weights[8] / weights[9]).toBeCloseTo(0.94, 12);
    expect(weights[0] / weights[1]).toBeCloseTo(0.94, 12);
  });

  it('weights the most recent day most heavily', () => {
    const weights = observationWeights(10, { kind: 'ewma', lambda: 0.94 });
    expect(weights[9]).toBeGreaterThan(weights[0]);
  });
});

describe('buildReturnMatrix', () => {
  it('rejects assets with mismatched history lengths', () => {
    expect(() => buildReturnMatrix([[0.01, 0.02], [0.01]], { kind: 'equal' })).toThrow(
      /same number/,
    );
  });

  it('rejects an empty history', () => {
    expect(() => buildReturnMatrix([[]], { kind: 'equal' })).toThrow(/at least one return/);
  });

  it('demeans each column, so weighted column sums vanish', () => {
    const returns = syntheticReturns(2, 60);
    const matrix = buildReturnMatrix(returns, { kind: 'equal' });
    for (const column of matrix.columns) {
      const sum = [...column].reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(0, 10);
    }
  });

  it("column inner product equals the asset's weighted variance", () => {
    const returns = syntheticReturns(3, 120);
    for (const weighting of [
      { kind: 'equal' } as const,
      { kind: 'ewma', lambda: 0.94 } as const,
    ]) {
      const matrix = buildReturnMatrix(returns, weighting);
      for (let asset = 0; asset < 3; asset++) {
        const variance = historicalVolatility(matrix, asset) ** 2;
        expect(variance).toBeCloseTo(weightedCovariance(returns, weighting, asset, asset), 14);
      }
    }
  });

  it("cross column inner product equals the assets' weighted covariance", () => {
    const returns = syntheticReturns(3, 120);
    const weighting = { kind: 'ewma', lambda: 0.94 } as const;
    const matrix = buildReturnMatrix(returns, weighting);

    let cov = 0;
    for (let t = 0; t < matrix.days; t++) {
      cov += matrix.columns[0][t] * matrix.columns[1][t];
    }
    expect(cov).toBeCloseTo(weightedCovariance(returns, weighting, 0, 1), 14);
  });
});

describe('standardNormals', () => {
  it('produces the requested count, including odd counts', () => {
    expect(standardNormals(7, mulberry32(1))).toHaveLength(7);
  });

  it('has approximately zero mean and unit variance', () => {
    const draws = standardNormals(100_000, mulberry32(7));
    const mean = [...draws].reduce((a, b) => a + b, 0) / draws.length;
    expect(mean).toBeCloseTo(0, 2);
    expect(standardDeviation(draws)).toBeCloseTo(1, 2);
  });
});

describe('simulateReturns', () => {
  it('is reproducible for a given seed', () => {
    const matrix = buildReturnMatrix(syntheticReturns(2, 50), { kind: 'equal' });
    const first = simulateReturns(matrix, 100, mulberry32(42));
    const second = simulateReturns(matrix, 100, mulberry32(42));
    expect([...first[0]]).toEqual([...second[0]]);
  });

  it('returns one series per asset of the requested length', () => {
    const matrix = buildReturnMatrix(syntheticReturns(3, 50), { kind: 'equal' });
    const simulated = simulateReturns(matrix, 500, mulberry32(1));
    expect(simulated).toHaveLength(3);
    expect(simulated[0]).toHaveLength(500);
  });

  it('reproduces each asset volatility without forming a covariance matrix', () => {
    const returns = syntheticReturns(3, 250);
    const matrix = buildReturnMatrix(returns, { kind: 'equal' });
    const simulated = simulateReturns(matrix, 40_000, mulberry32(2026));

    for (let asset = 0; asset < 3; asset++) {
      const target = historicalVolatility(matrix, asset);
      expect(standardDeviation(simulated[asset])).toBeCloseTo(target, 3);
    }
  });

  it('reproduces cross asset correlation', () => {
    const returns = syntheticReturns(3, 250);
    const matrix = buildReturnMatrix(returns, { kind: 'equal' });
    const simulated = simulateReturns(matrix, 40_000, mulberry32(99));

    const target =
      weightedCovariance(returns, { kind: 'equal' }, 0, 1) /
      Math.sqrt(
        weightedCovariance(returns, { kind: 'equal' }, 0, 0) *
          weightedCovariance(returns, { kind: 'equal' }, 1, 1),
      );

    expect(correlation(simulated[0], simulated[1])).toBeCloseTo(target, 2);
  });

  it('simulates a zero mean distribution', () => {
    const matrix = buildReturnMatrix(syntheticReturns(2, 250), { kind: 'equal' });
    const simulated = simulateReturns(matrix, 40_000, mulberry32(5));
    const mean = [...simulated[0]].reduce((a, b) => a + b, 0) / simulated[0].length;
    expect(Math.abs(mean)).toBeLessThan(0.1 * standardDeviation(simulated[0]));
  });

  it('honors exponential weighting when recent volatility differs', () => {
    // Quiet for a year, then a volatile final stretch. EWMA should see more risk.
    const days = 250;
    const rng = mulberry32(11);
    const draws = standardNormals(days, rng);
    const returns = [
      Array.from({ length: days }, (_, t) => (t < 200 ? 0.002 : 0.02) * draws[t]),
    ];

    const equal = historicalVolatility(buildReturnMatrix(returns, { kind: 'equal' }), 0);
    const ewma = historicalVolatility(
      buildReturnMatrix(returns, { kind: 'ewma', lambda: 0.94 }),
      0,
    );
    expect(ewma).toBeGreaterThan(equal);
  });
});

describe('historicalCorrelation', () => {
  it('is one for an asset against itself', () => {
    const matrix = buildReturnMatrix(syntheticReturns(2, 80), { kind: 'equal' });
    expect(historicalCorrelation(matrix, 0, 0)).toBeCloseTo(1, 12);
  });

  it('is symmetric', () => {
    const matrix = buildReturnMatrix(syntheticReturns(3, 80), { kind: 'equal' });
    expect(historicalCorrelation(matrix, 0, 2)).toBeCloseTo(
      historicalCorrelation(matrix, 2, 0),
      12,
    );
  });

  it('matches the weighted covariance computed the conventional way', () => {
    const returns = syntheticReturns(3, 150);
    const weighting = { kind: 'ewma', lambda: 0.94 } as const;
    const matrix = buildReturnMatrix(returns, weighting);

    const expected =
      weightedCovariance(returns, weighting, 0, 1) /
      Math.sqrt(
        weightedCovariance(returns, weighting, 0, 0) *
          weightedCovariance(returns, weighting, 1, 1),
      );

    expect(historicalCorrelation(matrix, 0, 1)).toBeCloseTo(expected, 12);
  });

  it('detects a deliberately anticorrelated pair', () => {
    const base = syntheticReturns(1, 100)[0];
    const matrix = buildReturnMatrix([base, base.map((r) => -r)], { kind: 'equal' });
    expect(historicalCorrelation(matrix, 0, 1)).toBeCloseTo(-1, 12);
  });

  it('is the target the simulation reproduces', () => {
    const matrix = buildReturnMatrix(syntheticReturns(3, 250), { kind: 'equal' });
    const simulated = simulateReturns(matrix, 40_000, mulberry32(31));
    expect(correlation(simulated[0], simulated[2])).toBeCloseTo(
      historicalCorrelation(matrix, 0, 2),
      2,
    );
  });
});

describe('assetPairs', () => {
  it('enumerates each unordered pair once', () => {
    expect(assetPairs(3)).toEqual([
      { i: 0, j: 1 },
      { i: 0, j: 2 },
      { i: 1, j: 2 },
    ]);
  });

  it('is empty for a single asset', () => {
    expect(assetPairs(1)).toEqual([]);
  });
});
