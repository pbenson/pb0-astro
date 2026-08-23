import { useMemo, type ReactElement } from 'react';
import { format } from 'd3-format';
import { scaleLinear } from 'd3-scale';
import type { ChartPalette } from './chartTokens';
import {
  correlation,
  historicalCorrelation,
  type ReturnMatrix,
} from '../../utils/assetReturns';

const CELL = 148;
const GAP = 6;
const PAD = 12;
/** Wider inset for the coefficient cells, leaving room for the scale end labels. */
const COEFFICIENT_PAD = 30;
/** Plotting every draw would be a solid blob; this many shows the shape. */
const SCATTER_POINTS = 1200;

const coefficient = format('.2f');

export interface CorrelogramProps {
  readonly simulated: readonly Float64Array[];
  readonly matrix: ReturnMatrix;
  readonly tickers: readonly string[];
  readonly domain: readonly [number, number];
  readonly palette: ChartPalette;
}

export default function Correlogram({
  simulated,
  matrix,
  tickers,
  domain,
  palette,
}: CorrelogramProps) {
  const n = tickers.length;
  const size = n * CELL + (n - 1) * GAP;

  const position = (index: number) => index * (CELL + GAP);

  // Shared with the histograms above, so a cloud's width means the same thing here.
  const scale = useMemo(
    () =>
      scaleLinear()
        .domain([domain[0], domain[1]])
        .range([PAD, CELL - PAD]),
    [domain],
  );

  /** Every draw is jointly consistent, so index i of each series shares one z. */
  const stride = Math.max(1, Math.floor(simulated[0].length / SCATTER_POINTS));

  const pairs = useMemo(() => {
    const table = new Map<string, { simulated: number; historical: number }>();
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        table.set(`${i}-${j}`, {
          simulated: correlation(simulated[i], simulated[j]),
          historical: historicalCorrelation(matrix, i, j),
        });
      }
    }
    return table;
  }, [simulated, matrix, n]);

  const summary = [...pairs.entries()]
    .map(([key, value]) => {
      const [i, j] = key.split('-').map(Number);
      return `${tickers[i]} and ${tickers[j]}: simulated ${coefficient(value.simulated)}, historical ${coefficient(value.historical)}`;
    })
    .join('. ');

  /** Half-width of the coefficient scale: |r| = 1 reaches the arm's end. */
  const armLength = (CELL - 2 * COEFFICIENT_PAD) / 2;

  return (
    <figure className="correlogram">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Correlation matrix of simulated one-day returns. ${summary}.`}
      >
        {tickers.map((rowTicker, row) =>
          tickers.map((colTicker, col) => {
            const key = `${row}-${col}`;
            const tx = position(col);
            const ty = position(row);

            if (row === col) {
              return (
                <g key={key} transform={`translate(${tx}, ${ty})`}>
                  <text
                    x={CELL / 2}
                    y={CELL / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="diagonal-label"
                    fill={palette.ink}
                  >
                    {rowTicker}
                  </text>
                </g>
              );
            }

            if (row > col) {
              // Lower triangle: the joint cloud. A tilted cloud IS the correlation.
              const xs = simulated[col];
              const ys = simulated[row];
              const points: ReactElement[] = [];
              for (let k = 0; k < xs.length; k += stride) {
                points.push(
                  <circle key={k} cx={scale(xs[k])} cy={CELL - scale(ys[k])} r={1} />,
                );
              }
              return (
                <g key={key} transform={`translate(${tx}, ${ty})`}>
                  <rect
                    width={CELL}
                    height={CELL}
                    fill="none"
                    stroke={palette.rule}
                    strokeWidth={1}
                  />
                  <line
                    x1={scale(0)}
                    x2={scale(0)}
                    y1={PAD}
                    y2={CELL - PAD}
                    stroke={palette.rule}
                  />
                  <line
                    x1={PAD}
                    x2={CELL - PAD}
                    y1={CELL - scale(0)}
                    y2={CELL - scale(0)}
                    stroke={palette.rule}
                  />
                  <g fill={palette.mark} opacity={0.34}>
                    {points}
                  </g>
                </g>
              );
            }

            // Upper triangle: the coefficient, encoded by position on a shared
            // scale. Length carries magnitude, color only reinforces sign.
            const value = pairs.get(`${row}-${col}`)!;
            const pole = value.simulated < 0 ? palette.negative : palette.positive;
            const centre = CELL / 2;
            const barY = CELL / 2 + 16;
            const simX = centre + value.simulated * armLength;
            const histX = centre + value.historical * armLength;

            return (
              <g key={key} transform={`translate(${tx}, ${ty})`}>
                <text
                  x={centre}
                  y={CELL / 2 - 12}
                  textAnchor="middle"
                  className="coefficient"
                  fill={palette.ink}
                >
                  {coefficient(value.simulated)}
                </text>

                <line
                  x1={centre - armLength}
                  x2={centre + armLength}
                  y1={barY}
                  y2={barY}
                  stroke={palette.rule}
                  strokeWidth={1}
                />
                {/* Selective labeling: the scale is stated once, on the first
                    coefficient cell a reader meets, not repeated in all three. */}
                {row === 0 && col === 1 && (
                  <>
                    <text
                      x={centre - armLength - 5}
                      y={barY}
                      textAnchor="end"
                      dominantBaseline="central"
                      className="scale-label"
                      fill={palette.inkTertiary}
                    >
                      −1
                    </text>
                    <text
                      x={centre + armLength + 5}
                      y={barY}
                      textAnchor="start"
                      dominantBaseline="central"
                      className="scale-label"
                      fill={palette.inkTertiary}
                    >
                      +1
                    </text>
                  </>
                )}
                <rect
                  x={Math.min(centre, simX)}
                  y={barY - 5}
                  width={Math.abs(simX - centre)}
                  height={10}
                  fill={pole}
                />
                <line
                  x1={centre}
                  x2={centre}
                  y1={barY - 9}
                  y2={barY + 9}
                  stroke={palette.inkTertiary}
                  strokeWidth={1}
                />
                {/* Historical value as a tick on the same scale: the simulation's target. */}
                <line
                  x1={histX}
                  x2={histX}
                  y1={barY - 11}
                  y2={barY + 11}
                  stroke={palette.ink}
                  strokeWidth={1.5}
                />
                <text
                  x={centre}
                  y={barY + 26}
                  textAnchor="middle"
                  className="cell-note"
                  fill={palette.inkTertiary}
                >
                  historical {coefficient(value.historical)}
                </text>
              </g>
            );
          }),
        )}
      </svg>

      <figcaption>
        Below the diagonal, each panel plots one asset's simulated return against
        another's — a tilted cloud <em>is</em> correlation. Both axes span the same
        ±{format('.0%')(domain[1])} range as the histograms above, plotted from a
        {' '}{SCATTER_POINTS.toLocaleString()}-point sample of the run. Above the
        diagonal, the bar gives the simulated coefficient on a −1 to +1 scale; the upright tick
        marks the historical value the simulation is reproducing.
      </figcaption>
    </figure>
  );
}
