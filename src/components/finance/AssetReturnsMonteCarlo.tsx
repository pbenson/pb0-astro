import { useMemo, useState } from 'react';
import { quantile } from 'd3-array';
import Histogram from './Histogram';
import Correlogram from './Correlogram';
import { useChartPalette } from '../shared/chartTokens';
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

const SIMULATION_CHOICES = [1_000, 10_000, 50_000] as const;
const RISKMETRICS_LAMBDA = 0.94;
/** Fewer bins than a full-width panel: each small multiple is a third as wide. */
const BIN_COUNT = 34;

/** Percentile used for the value-at-risk marker: a one-day 95% VaR. */
const VAR_PERCENTILE = 0.05;

export default function AssetReturnsMonteCarlo() {
  const [weightingKind, setWeightingKind] = useState<'equal' | 'ewma'>('equal');
  const [simulations, setSimulations] = useState<number>(10_000);
  const [seed, setSeed] = useState(20250822);
  const palette = useChartPalette();

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

  // One x domain for every panel and every scatter, so width means the same
  // thing everywhere on the page.
  const domain = useMemo<[number, number]>(() => {
    const widest = Math.max(...panels.map((p) => p.volatility));
    const edge = Math.ceil(4 * widest * 100) / 100;
    return [-edge, edge];
  }, [panels]);

  const days = snapshot.dates.length;
  const tickers = snapshot.assets.map((a) => a.ticker);

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
            palette={palette}
            valueAtRisk={panels[i].valueAtRisk}
            volatility={panels[i].volatility}
            annotateVaR={i === 0}
          />
        ))}
      </div>

      <p className="chart-note">
        One shared axis, one hue: the three distributions differ only in width. Solid
        bars fall below the 5th percentile, left of the dashed one-day 95% value at
        risk.
      </p>

      <h3>What the histograms cannot show</h3>

      <p>
        Three near-identical bells, and yet these assets do not move independently.
        A marginal distribution is silent about joint behavior — and joint behavior is
        the whole reason a portfolio is not simply the sum of its risks. The matrix
        below is the same simulation, viewed as pairs.
      </p>

      <Correlogram
        simulated={panels.map((p) => p.values)}
        matrix={matrix}
        tickers={tickers}
        domain={domain}
        palette={palette}
      />

      <p className="chart-note">
        The bars land on their ticks: <code>r = R'z</code> reproduces the historical
        correlations without ever estimating one. Sampling error is the only gap, and
        it shrinks as you raise the number of simulations.
      </p>
    </div>
  );
}
