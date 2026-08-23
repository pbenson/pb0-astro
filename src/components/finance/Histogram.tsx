import { useEffect, useMemo, useRef, useState } from 'react';
import { axisBottom } from 'd3-axis';
import { bin } from 'd3-array';
import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import { format } from 'd3-format';
import type { ChartPalette } from './chartTokens';

const WIDTH = 300;
const HEIGHT = 168;
const MARGIN = { top: 10, right: 10, bottom: 30, left: 10 } as const;

const signedPercent = format('+.2%');
const plainPercent = format('.2%');
const axisPercent = format('.0%');

export interface HistogramProps {
  /** Simulated one-day log returns for a single asset. */
  readonly values: Float64Array;
  /** Shared across panels so the three can be compared by eye. */
  readonly domain: readonly [number, number];
  readonly binCount: number;
  readonly label: string;
  readonly ticker: string;
  readonly palette: ChartPalette;
  /** Return at the 5th percentile of the simulation -- the one-day 95% VaR. */
  readonly valueAtRisk: number;
  readonly volatility: number;
  /** The VaR marker is annotated in one panel only; the rest inherit the note. */
  readonly annotateVaR: boolean;
}

interface HoveredBin {
  readonly x0: number;
  readonly x1: number;
  readonly share: number;
  readonly left: number;
}

export default function Histogram({
  values,
  domain,
  binCount,
  label,
  ticker,
  palette,
  valueAtRisk,
  volatility,
  annotateVaR,
}: HistogramProps) {
  const axisRef = useRef<SVGGElement>(null);
  const [hovered, setHovered] = useState<HoveredBin | null>(null);

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
    const axis = select(axisRef.current);
    axis.call(axisBottom(x).ticks(5).tickSize(4).tickFormat((d) => axisPercent(d as number)));
    // Tufte: drop the axis spine, keep the ticks. The baseline is drawn separately
    // so the bars sit on a hairline rather than a rule competing with them.
    axis.select('.domain').remove();
  }, [x]);

  const baseline = HEIGHT - MARGIN.bottom;
  const summary =
    `Histogram of ${values.length.toLocaleString()} simulated one-day returns for ${label}. ` +
    `Daily volatility ${plainPercent(volatility)}, ` +
    `95% one-day value at risk ${signedPercent(valueAtRisk)}.`;

  return (
    <figure className="histogram">
      <figcaption>
        <span className="ticker">{ticker}</span>
        <span className="name">{label}</span>
      </figcaption>

      <div className="plot">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={summary}>
          <line
            x1={MARGIN.left}
            x2={WIDTH - MARGIN.right}
            y1={baseline}
            y2={baseline}
            stroke={palette.ruleEmphasis}
            strokeWidth={1}
          />

          {bins.map((b, i) => {
            const x0 = x(b.x0 ?? 0);
            const x1 = x(b.x1 ?? 0);
            const top = y(b.length);
            const inTail = (b.x1 ?? 0) <= valueAtRisk;
            return (
              <rect
                key={i}
                x={x0}
                y={top}
                // 1px surface gap between adjacent fills, never a stroke.
                width={Math.max(0.5, x1 - x0 - 1)}
                height={baseline - top}
                fill={palette.distribution}
                opacity={inTail ? 1 : 0.5}
              />
            );
          })}

          <line
            x1={x(0)}
            x2={x(0)}
            y1={MARGIN.top}
            y2={baseline}
            stroke={palette.inkTertiary}
            strokeWidth={1}
          />
          <line
            x1={x(valueAtRisk)}
            x2={x(valueAtRisk)}
            y1={MARGIN.top + 6}
            y2={baseline}
            stroke={palette.ink}
            strokeWidth={1}
            strokeDasharray="3 3"
          />

          {annotateVaR && (
            <text
              x={x(valueAtRisk) - 4}
              y={MARGIN.top + 4}
              textAnchor="end"
              className="annotation"
              fill={palette.inkSecondary}
            >
              95% VaR
            </text>
          )}

          {/* Hover targets span the full panel height, so thin tail bins stay reachable. */}
          {bins.map((b, i) => {
            const x0 = x(b.x0 ?? 0);
            const x1 = x(b.x1 ?? 0);
            return (
              <rect
                key={`hit-${i}`}
                x={x0}
                y={MARGIN.top}
                width={Math.max(1, x1 - x0)}
                height={baseline - MARGIN.top}
                fill="transparent"
                onMouseEnter={() =>
                  setHovered({
                    x0: b.x0 ?? 0,
                    x1: b.x1 ?? 0,
                    share: b.length / values.length,
                    left: ((x0 + x1) / 2 / WIDTH) * 100,
                  })
                }
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}

          <g ref={axisRef} transform={`translate(0, ${baseline})`} className="axis" />
        </svg>

        {hovered && (
          <div className="tooltip" style={{ left: `${hovered.left}%` }} role="status">
            <span className="range">
              {signedPercent(hovered.x0)} to {signedPercent(hovered.x1)}
            </span>
            <span className="share">{format('.1%')(hovered.share)} of draws</span>
          </div>
        )}
      </div>

      <div className="stats">
        <span>
          σ <strong>{plainPercent(volatility)}</strong>
        </span>
        <span>
          VaR <strong>{signedPercent(valueAtRisk)}</strong>
        </span>
      </div>
    </figure>
  );
}
