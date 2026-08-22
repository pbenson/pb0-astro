import { useMemo, useState } from 'react';
import { quantile } from 'd3-array';
import Histogram from './Histogram';
import './assetReturnsMonteCarlo.css';
import snapshot from '../../data/asset-prices.json';
import {
  buildReturnMatrix,
  historicalVolatility,
  logReturns,
  mulberry32,
  simulateReturns,
  type Weighting,
} from '../../utils/assetReturns';

const COLORS = ['var(--segment-b)', 'var(--mark-warning)', 'var(--grid-teal)'] as const;
const SIMULATION_CHOICES = [1_000, 10_000, 50_000] as const;
const RISKMETRICS_LAMBDA = 0.94;
const BIN_COUNT = 60;

/** Percentile used for the value-at-risk marker: a one-day 95% VaR. */
const VAR_PERCENTILE = 0.05;

export default function AssetReturnsMonteCarlo() {
  const [weightingKind, setWeightingKind] = useState<'equal' | 'ewma'>('equal');
  const [simulations, setSimulations] = useState<number>(10_000);
  const [seed, setSeed] = useState(20250822);

  const historicalReturns = useMemo(
    () => snapshot.assets.map((asset) => logReturns(asset.closes)),
    [],
  );

  const weighting: Weighting = useMemo(
    () =>
      weightingKind === 'equal'
        ? { kind: 'equal' }
        : { kind: 'ewma', lambda: RISKMETRICS_LAMBDA },
    [weightingKind],
  );

  const matrix = useMemo(
    () => buildReturnMatrix(historicalReturns, weighting),
    [historicalReturns, weighting],
  );

  const simulated = useMemo(
    () => simulateReturns(matrix, simulations, mulberry32(seed)),
    [matrix, simulations, seed],
  );

  const panels = useMemo(
    () =>
      simulated.map((values, i) => {
        const sorted = Float64Array.from(values).sort();
        return {
          values,
          valueAtRisk: quantile(sorted, VAR_PERCENTILE) ?? 0,
          volatility: historicalVolatility(matrix, i),
        };
      }),
    [simulated, matrix],
  );

  // One x domain for all three panels, so relative risk is legible at a glance.
  const domain = useMemo<[number, number]>(() => {
    const widest = Math.max(...panels.map((p) => p.volatility));
    const edge = Math.ceil(4 * widest * 100) / 100;
    return [-edge, edge];
  }, [panels]);

  const days = snapshot.dates.length;

  return (
    <div className="mc">
      <div className="controls">
        <fieldset>
          <legend>Weighting of historical observations</legend>
          <label>
            <input
              type="radio"
              name="weighting"
              value="equal"
              checked={weightingKind === 'equal'}
              onChange={() => setWeightingKind('equal')}
            />
            Equal
          </label>
          <label>
            <input
              type="radio"
              name="weighting"
              value="ewma"
              checked={weightingKind === 'ewma'}
              onChange={() => setWeightingKind('ewma')}
            />
            Exponential (λ = {RISKMETRICS_LAMBDA})
          </label>
        </fieldset>

        <div className="control">
          <label htmlFor="simulations">Simulations</label>
          <select
            id="simulations"
            value={simulations}
            onChange={(e) => setSimulations(Number(e.target.value))}
          >
            {SIMULATION_CHOICES.map((n) => (
              <option key={n} value={n}>
                {n.toLocaleString()}
              </option>
            ))}
          </select>
        </div>

        <button type="button" onClick={() => setSeed((s) => s + 1)}>
          Draw again
        </button>
      </div>

      <p className="provenance">
        {days.toLocaleString()} aligned trading sessions, {snapshot.dates[0]} to{' '}
        {snapshot.dates[days - 1]}. {snapshot.source}.
      </p>

      <div className="panels">
        {snapshot.assets.map((asset, i) => (
          <Histogram
            key={asset.ticker}
            values={panels[i].values}
            domain={domain}
            binCount={BIN_COUNT}
            label={asset.name}
            ticker={asset.ticker}
            color={COLORS[i % COLORS.length]}
            valueAtRisk={panels[i].valueAtRisk}
            volatility={panels[i].volatility}
          />
        ))}
      </div>

      <p className="legend">
        Solid bars fall below the 5th percentile — the dashed line marks the one-day
        95% value at risk. All three panels share an x-axis, so a wider spread means a
        riskier asset.
      </p>
    </div>
  );
}
