import { useMemo, useState } from 'react';
import Slider from '../ui/Slider';
import { useChartPalette } from '../shared/chartTokens';
import {
  DEFAULT_MODEL,
  demandAt,
  horizonScan,
  settlingHorizon,
  solve,
  type Model,
} from '../../utils/capacityExpansion';

const W = 640;
const H = 300;
const HORIZON_H = 170;
const M = { top: 20, right: 14, bottom: 28, left: 42 };

/** Horizons the second panel scans, and the longest the first panel can show. */
const MAX_HORIZON = 60;
const SCAN_STEPS = 120;

export default function CapacityExpansion() {
  const palette = useChartPalette();
  const [horizon, setHorizon] = useState(20);
  const [scaleExponent, setScaleExponent] = useState(DEFAULT_MODEL.scaleExponent);
  const [rate, setRate] = useState(DEFAULT_MODEL.rate);
  const [growthExponent, setGrowthExponent] = useState(DEFAULT_MODEL.growthExponent);

  const model: Model = useMemo(
    () => ({ ...DEFAULT_MODEL, scaleExponent, rate, growthExponent }),
    [scaleExponent, rate, growthExponent],
  );

  const solution = useMemo(() => solve(model, horizon), [model, horizon]);
  const scan = useMemo(() => horizonScan(model, MAX_HORIZON, SCAN_STEPS), [model]);
  const settled = useMemo(() => settlingHorizon(scan), [scan]);

  // Both panels share a time axis so the horizon slider reads across them.
  const maxCapacity = Math.max(
    demandAt(model, horizon),
    solution.plan.capacities[solution.plan.capacities.length - 1] ?? 1,
  );
  const px = (t: number) => M.left + (t / horizon) * (W - M.left - M.right);
  const py = (c: number) => H - M.bottom - (c / maxCapacity) * (H - M.top - M.bottom);

  const demandPath = Array.from({ length: 121 }, (_, i) => {
    const t = (horizon * i) / 120;
    return `${px(t)},${py(demandAt(model, t))}`;
  }).join(' ');

  // The capacity staircase: flat until capacity binds, then a vertical jump.
  const steps: string[] = [];
  {
    let standing = 0;
    let at = 0;
    for (let i = 0; i < solution.plan.sizes.length; ++i) {
      const t = solution.plan.times[i];
      steps.push(`${px(at)},${py(standing)}`, `${px(t)},${py(standing)}`);
      standing = solution.plan.capacities[i];
      steps.push(`${px(t)},${py(standing)}`);
      at = t;
    }
    steps.push(`${px(horizon)},${py(standing)}`);
  }

  const menuMax = Math.max(...model.menu);
  const hx = (t: number) => M.left + (t / MAX_HORIZON) * (W - M.left - M.right);
  const hy = (s: number) =>
    HORIZON_H - M.bottom - (s / menuMax) * (HORIZON_H - M.top - M.bottom);

  const scanPath = scan
    .flatMap((point, i) => {
      const prev = scan[i - 1];
      const x = hx(point.horizon);
      return prev && prev.firstMove !== point.firstMove
        ? [`${x},${hy(prev.firstMove)}`, `${x},${hy(point.firstMove)}`]
        : [`${x},${hy(point.firstMove)}`];
    })
    .join(' ');

  return (
    <div className="capex">
      {/* The two panels together are the picture of this page; the sliders below
          are not, and sweeping them into the card thumbnail just makes it busy. */}
      <div className="capex-figures" data-thumbnail>
      <figure className="capex-panel">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={
          `Demand rising against a capacity staircase over ${horizon.toFixed(0)} years. ` +
          `${solution.plan.sizes.length} facilities built, sizes ${solution.plan.sizes.join(', ')}.`
        }>
          <line x1={M.left} y1={H - M.bottom} x2={W - M.right} y2={H - M.bottom}
                stroke={palette.rule} />
          <line x1={M.left} y1={M.top} x2={M.left} y2={H - M.bottom} stroke={palette.rule} />

          {/* Idle capacity: the gap between the staircase and the demand it serves. */}
          <polyline points={steps.join(' ')} fill="none" stroke={palette.distribution}
                    strokeWidth={2} />
          <polyline points={demandPath} fill="none" stroke={palette.positive}
                    strokeWidth={2} strokeDasharray="5 3" />

          {solution.plan.times.map((t, i) => (
            <circle key={i} cx={px(t)} cy={py(solution.plan.capacities[i])} r={3}
                    fill={palette.distribution} />
          ))}

          <text x={M.left} y={M.top + 2} fontSize={11} fill={palette.inkTertiary}>capacity</text>
          <text x={W - M.right} y={H - 8} fontSize={11} textAnchor="end"
                fill={palette.inkTertiary}>years</text>
        </svg>
        <figcaption>
          Capacity bought in lumps (solid) staying ahead of demand (dashed). The gap is
          idle plant.
        </figcaption>
      </figure>

      <figure className="capex-panel">
        <svg viewBox={`0 0 ${W} ${HORIZON_H}`} role="img" aria-label={
          `The first facility size chosen, plotted against how far ahead the planner looks. ` +
          (settled === null
            ? 'It has not settled within the horizons scanned.'
            : `It settles at a horizon of ${settled.toFixed(1)} years.`)
        }>
          <line x1={M.left} y1={HORIZON_H - M.bottom} x2={W - M.right}
                y2={HORIZON_H - M.bottom} stroke={palette.rule} />
          <line x1={M.left} y1={M.top} x2={M.left} y2={HORIZON_H - M.bottom}
                stroke={palette.rule} />

          {settled !== null && (
            <>
              <rect x={hx(settled)} y={M.top} width={W - M.right - hx(settled)}
                    height={HORIZON_H - M.top - M.bottom} fill={palette.distribution}
                    fillOpacity={0.08} />
              <line x1={hx(settled)} y1={M.top} x2={hx(settled)} y2={HORIZON_H - M.bottom}
                    stroke={palette.distribution} strokeWidth={1.5} strokeDasharray="4 3" />
              <text x={hx(settled) + 5} y={M.top + 11} fontSize={11}
                    fill={palette.distribution}>
                settles here
              </text>
            </>
          )}

          {/* Where the reader currently has the horizon slider. */}
          <line x1={hx(horizon)} y1={M.top} x2={hx(horizon)} y2={HORIZON_H - M.bottom}
                stroke={palette.error} strokeWidth={1} />

          {/* The step heights are facility sizes, so say which is which. */}
          {model.menu.map((s) => (
            <g key={s}>
              <line x1={M.left - 3} y1={hy(s)} x2={M.left} y2={hy(s)} stroke={palette.rule} />
              <text x={M.left - 6} y={hy(s) + 3.5} fontSize={10} textAnchor="end"
                    fill={palette.inkTertiary}>
                {s}
              </text>
            </g>
          ))}

          <polyline points={scanPath} fill="none" stroke={palette.ink} strokeWidth={1.8} />

          <text x={M.left} y={M.top - 2} fontSize={11} fill={palette.inkTertiary}>
            first build
          </text>
          <text x={W - M.right} y={HORIZON_H - 8} fontSize={11} textAnchor="end"
                fill={palette.inkTertiary}>
            horizon looked at, years
          </text>
        </svg>
        <figcaption>
          The only decision actually implemented — what to build now — against how far
          ahead you look.
        </figcaption>
      </figure>
      </div>

      <Slider label="Horizon considered" sliderMin={1} sliderMax={MAX_HORIZON}
              value={horizon} onChange={setHorizon}
              formatValue={(v) => `${v} years`} />
      <Slider label="Economies of scale" sliderMin={0.2} sliderMax={1} stepSize={0.05}
              value={scaleExponent} onChange={setScaleExponent}
              formatValue={(v) => v.toFixed(2)} />
      <Slider label="Discount rate" sliderMin={0.02} sliderMax={0.5} stepSize={0.02}
              value={rate} onChange={setRate}
              formatValue={(v) => `${(v * 100).toFixed(0)}%`} />
      <Slider label="Demand curvature" sliderMin={0.6} sliderMax={1.6} stepSize={0.1}
              value={growthExponent} onChange={setGrowthExponent}
              formatValue={(v) => v.toFixed(1)} />

      <p className="info">
        Build <strong data-testid="first-move">{solution.firstMove}</strong> now ·{' '}
        {solution.plan.sizes.length} facilit
        {solution.plan.sizes.length === 1 ? 'y' : 'ies'} to reach year {horizon} ·
        present value {solution.total.toFixed(3)} ·{' '}
        {settled === null
          ? 'the first decision is still moving at 60 years'
          : `the decision settles once you look ${settled.toFixed(1)} years ahead`}
      </p>
    </div>
  );
}
