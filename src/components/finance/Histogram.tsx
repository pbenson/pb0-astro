import { useEffect, useMemo, useRef } from 'react';
import { axisBottom } from 'd3-axis';
import { bin } from 'd3-array';
import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import { format } from 'd3-format';

const WIDTH = 560;
const HEIGHT = 190;
const MARGIN = { top: 12, right: 16, bottom: 34, left: 16 } as const;

const percent = format('+.2%');

export interface HistogramProps {
  /** Simulated one-day log returns for a single asset. */
  readonly values: Float64Array;
  /** Shared across assets so the three panels can be compared by eye. */
  readonly domain: readonly [number, number];
  readonly binCount: number;
  readonly label: string;
  readonly ticker: string;
  readonly color: string;
  /** Return at the 5th percentile of the simulation -- the one-day 95% VaR. */
  readonly valueAtRisk: number;
  readonly volatility: number;
}

export default function Histogram({
  values,
  domain,
  binCount,
  label,
  ticker,
  color,
  valueAtRisk,
  volatility,
}: HistogramProps) {
  const axisRef = useRef<SVGGElement>(null);

  const x = useMemo(
    () =>
      scaleLinear()
        .domain([domain[0], domain[1]])
        .range([MARGIN.left, WIDTH - MARGIN.right]),
    [domain],
  );

  const bins = useMemo(() => {
    const thresholds = x.ticks(binCount);
    return bin<number, number>()
      .domain([domain[0], domain[1]])
      .thresholds(thresholds)(Array.from(values));
  }, [values, x, binCount, domain]);

  const y = useMemo(() => {
    const tallest = Math.max(...bins.map((b) => b.length), 1);
    return scaleLinear()
      .domain([0, tallest])
      .range([HEIGHT - MARGIN.bottom, MARGIN.top]);
  }, [bins]);

  useEffect(() => {
    if (!axisRef.current) return;
    select(axisRef.current).call(
      axisBottom(x)
        .ticks(7)
        .tickFormat((d) => format('.0%')(d as number)),
    );
  }, [x]);

  const summary =
    `Histogram of simulated one-day returns for ${label}. ` +
    `Daily volatility ${percent(volatility).replace('+', '')}, ` +
    `95% one-day value at risk ${percent(valueAtRisk)}.`;

  return (
    <figure className="histogram">
      <figcaption>
        <span className="ticker" style={{ color }}>
          {ticker}
        </span>
        <span className="name">{label}</span>
        <span className="stats">
          <span>
            σ <strong>{format('.2%')(volatility)}</strong>
          </span>
          <span>
            95% VaR <strong>{percent(valueAtRisk)}</strong>
          </span>
        </span>
      </figcaption>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={summary}>
        {bins.map((b, i) => {
          const x0 = x(b.x0 ?? 0);
          const x1 = x(b.x1 ?? 0);
          const top = y(b.length);
          return (
            <rect
              key={i}
              x={x0}
              y={top}
              width={Math.max(0, x1 - x0 - 1)}
              height={HEIGHT - MARGIN.bottom - top}
              fill={color}
              opacity={(b.x1 ?? 0) <= valueAtRisk ? 1 : 0.55}
            />
          );
        })}

        <line
          x1={x(valueAtRisk)}
          x2={x(valueAtRisk)}
          y1={MARGIN.top}
          y2={HEIGHT - MARGIN.bottom}
          stroke="var(--mark-error)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
        <line
          x1={x(0)}
          x2={x(0)}
          y1={MARGIN.top}
          y2={HEIGHT - MARGIN.bottom}
          stroke="var(--ink-tertiary)"
          strokeWidth={1}
        />

        <g
          ref={axisRef}
          transform={`translate(0, ${HEIGHT - MARGIN.bottom})`}
          className="axis"
        />
      </svg>
    </figure>
  );
}
