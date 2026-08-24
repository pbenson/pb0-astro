import { useId, useMemo, useState } from 'react';
import Slider from "../ui/Slider"
import { axisBottom } from 'd3-axis';
import { scaleBand, scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import { format } from 'd3-format';
import { useEffect, useRef } from 'react';
import { useChartPalette } from '../shared/chartTokens';
import './creditBasket.css';
import {
  defaultDistribution,
  defaultVolatility,
  expectedDefaults,
  isSpecialCase,
} from '../../utils/creditBasket';

const WIDTH = 620;
const HEIGHT = 300;
const MARGIN = { top: 16, right: 16, bottom: 42, left: 52 } as const;

const percent = format('.1%');
const twoDecimals = format('.2f');

export default function CreditBasket() {
  const palette = useChartPalette();
  const axisRef = useRef<SVGGElement>(null);
  // Ids must be unique per instance: hardcoding them breaks the label
  // associations as soon as the component appears twice on a page.
  const id = useId();

  const [names, setNames] = useState(10);
  const [probability, setProbability] = useState(0.5);
  const [correlation, setCorrelation] = useState(0.5);

  const distribution = useMemo(
    () => defaultDistribution(names, probability, correlation),
    [names, probability, correlation],
  );

  const special = isSpecialCase(probability, correlation, 5e-3);
  const uniformHeight = 1 / (names + 1);

  const x = useMemo(
    () =>
      scaleBand<number>()
        .domain(Array.from({ length: names + 1 }, (_, j) => j))
        .range([MARGIN.left, WIDTH - MARGIN.right])
        .padding(0.18),
    [names],
  );

  const y = useMemo(() => {
    const tallest = Math.max(...distribution, uniformHeight * 1.35);
    return scaleLinear()
      .domain([0, tallest])
      .nice()
      .range([HEIGHT - MARGIN.bottom, MARGIN.top]);
  }, [distribution, uniformHeight]);

  useEffect(() => {
    if (!axisRef.current) return;
    // Thin the tick labels when the basket is large enough to crowd them.
    const step = names > 20 ? 5 : names > 12 ? 2 : 1;
    const axis = select(axisRef.current);
    axis.call(
      axisBottom(x)
        .tickSize(4)
        .tickValues(x.domain().filter((value) => value % step === 0)),
    );
    axis.select('.domain').remove();
  }, [x, names]);

  const mean = expectedDefaults(distribution);
  const volatility = defaultVolatility(distribution);
  const baseline = HEIGHT - MARGIN.bottom;

  const summary =
    `Distribution of the number of defaults in a basket of ${names} names, each defaulting ` +
    `with probability ${percent(probability)} and pairwise asset correlation ` +
    `${percent(correlation)}. Expected defaults ${twoDecimals(mean)}, standard deviation ` +
    `${twoDecimals(volatility)}.` +
    (special ? ' At this setting the distribution is flat.' : '');

  return (
    <div className="basket">
      <div className="controls">
        <Slider
          label="Names in the basket"
          sliderMin={2}
          sliderMax={30}
          value={names}
          onChange={setNames}
        />

        <Slider
          label="Default probability"
          sliderMin={0.01}
          sliderMax={0.99}
          stepSize={0.01}
          value={probability}
          onChange={setProbability}
          formatValue={percent}
        />

        <Slider
          label="Asset correlation"
          sliderMin={0}
          sliderMax={1}
          stepSize={0.01}
          value={correlation}
          onChange={setCorrelation}
          formatValue={percent}
        />

        <button
          type="button"
          onClick={() => {
            setProbability(0.5);
            setCorrelation(0.5);
          }}
        >
          Go to the special case
        </button>
      </div>

      <figure>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={summary}>
          <line
            x1={MARGIN.left}
            x2={WIDTH - MARGIN.right}
            y1={baseline}
            y2={baseline}
            stroke={palette.ruleEmphasis}
          />

          {/* The uniform height the special case predicts: 1/(n+1). */}
          <line
            x1={MARGIN.left}
            x2={WIDTH - MARGIN.right}
            y1={y(uniformHeight)}
            y2={y(uniformHeight)}
            stroke={special ? palette.positive : palette.inkTertiary}
            strokeWidth={special ? 2 : 1}
            strokeDasharray="4 4"
            opacity={special ? 1 : 0.5}
          />
          <text
            x={WIDTH - MARGIN.right}
            y={y(uniformHeight) - 6}
            textAnchor="end"
            className="reference"
            fill={special ? palette.positive : palette.inkTertiary}
          >
            1/(n+1) = {percent(uniformHeight)}
          </text>

          {Array.from(distribution, (value, j) => (
            <rect
              key={j}
              x={x(j) ?? 0}
              y={y(value)}
              width={x.bandwidth()}
              height={Math.max(0, baseline - y(value))}
              fill={special ? palette.positive : palette.distribution}
              opacity={special ? 0.95 : 0.75}
            >
              {/* One interpolated child: multiple children make React emit
                  comment separators, which the browser strips inside <title>,
                  and hydration then reports a mismatch. */}
              <title>{`${j} ${j === 1 ? 'default' : 'defaults'}: ${percent(value)}`}</title>
            </rect>
          ))}

          <g ref={axisRef} transform={`translate(0, ${baseline})`} className="axis" />
          <text
            x={(MARGIN.left + WIDTH - MARGIN.right) / 2}
            y={HEIGHT - 6}
            textAnchor="middle"
            className="axis-title"
            fill={palette.inkSecondary}
          >
            Number of defaults
          </text>
        </svg>

        <figcaption>
          <span>
            E[defaults] <strong>{twoDecimals(mean)}</strong>
          </span>
          <span>
            σ <strong>{twoDecimals(volatility)}</strong>
          </span>
          <span className="note">
            {special
              ? 'Flat: every outcome from 0 to n is equally likely.'
              : 'The mean stays at n·p however you move the correlation — only the shape changes.'}
          </span>
        </figcaption>
      </figure>
    </div>
  );
}
