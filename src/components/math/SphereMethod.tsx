import { useCallback, useMemo, useRef, useState } from 'react';
import Slider from '../ui/Slider';
import { useChartPalette } from '../shared/chartTokens';
import {
  centeringStep,
  delta,
  dot,
  isFeasible,
  iterate,
  objectiveTouchPoint,
  touchingPoints,
  type Constraint,
  type Vec,
} from '../../utils/sphereMethod';

/** The four-constraint example from the 2023 sketch, in a·x >= b form. */
const CONSTRAINTS: Constraint[] = [
  { a: { x: -1, y: -1 }, b: -3 },
  { a: { x: 2, y: -1 }, b: -5 },
  { a: { x: -1, y: 2 }, b: -5 },
  { a: { x: 1, y: 2 }, b: -3 },
];

/** Minimise c·x. */
const C: Vec = { x: -1, y: 5 };

const START: Vec = { x: 0.1, y: 0.1 };

const SIZE = 520;

/** The feasible region as a polygon, for shading. */
function feasibleVertices(cs: readonly Constraint[]): Vec[] {
  const points: Vec[] = [];
  for (let i = 0; i < cs.length; ++i) {
    for (let j = i + 1; j < cs.length; ++j) {
      const [p, q] = [cs[i], cs[j]];
      const det = p.a.x * q.a.y - p.a.y * q.a.x;
      if (Math.abs(det) < 1e-12) continue;
      const v = {
        x: (p.b * q.a.y - q.b * p.a.y) / det,
        y: (p.a.x * q.b - q.a.x * p.b) / det,
      };
      if (isFeasible(cs, v, 1e-9)) points.push(v);
    }
  }
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
  return points.sort(
    (p, q) => Math.atan2(p.y - cy, p.x - cx) - Math.atan2(q.y - cy, q.x - cx),
  );
}

/** Endpoints of a facet line, clipped to the viewport. */
function facetLine(c: Constraint, span: number): [Vec, Vec] {
  if (Math.abs(c.a.y) < 1e-12) {
    const x = c.b / c.a.x;
    return [{ x, y: -span }, { x, y: span }];
  }
  const at = (x: number) => ({ x, y: (c.b - c.a.x * x) / c.a.y });
  return [at(-span), at(span)];
}

export default function SphereMethod() {
  const palette = useChartPalette();
  const svgRef = useRef<SVGSVGElement>(null);

  const [centre, setCentre] = useState<Vec>(START);
  const [pinned, setPinned] = useState(true);
  const [eps, setEps] = useState(0.2);
  const [best, setBest] = useState<Vec>(START);
  const [trail, setTrail] = useState<Vec[]>([START]);

  const region = useMemo(() => feasibleVertices(CONSTRAINTS), []);

  // Fit the view to the region with a margin, rather than guessing a window.
  const view = useMemo(() => {
    const xs = region.map((v) => v.x);
    const ys = region.map((v) => v.y);
    const pad = 0.9;
    const span = Math.max(
      Math.max(...xs) - Math.min(...xs),
      Math.max(...ys) - Math.min(...ys),
    ) + pad * 2;
    return {
      cx: (Math.max(...xs) + Math.min(...xs)) / 2,
      cy: (Math.max(...ys) + Math.min(...ys)) / 2,
      scale: SIZE / span,
    };
  }, [region]);

  const sx = (x: number) => SIZE / 2 + (x - view.cx) * view.scale;
  const sy = (y: number) => SIZE / 2 - (y - view.cy) * view.scale;
  const SCALE = view.scale;
  const UNITS = SIZE / view.scale;
  const radius = delta(CONSTRAINTS, centre);
  const inside = isFeasible(CONSTRAINTS, centre);
  const touching = inside ? touchingPoints(CONSTRAINTS, centre) : [];
  const bottom = inside ? objectiveTouchPoint(CONSTRAINTS, C, centre) : null;

  const step = useCallback(() => {
    setCentre((current) => {
      const result = iterate(CONSTRAINTS, C, current, eps, best);
      // Land on a centred point, not on the end of the descent cycle. The
      // cycle converges onto the boundary, where the ball has zero radius and
      // there is nothing to look at; centering is what the next iteration
      // would do first anyway.
      const settled = centeringStep(CONSTRAINTS, result.next);
      setBest(result.best);
      setTrail((t) => [...t, ...result.path, settled]);
      return settled;
    });
  }, [eps, best]);

  const reset = useCallback(() => {
    setCentre(START);
    setBest(START);
    setTrail([START]);
    setPinned(true);
  }, []);

  const toWorld = (event: React.PointerEvent<SVGSVGElement>): Vec => {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * SIZE;
    const py = ((event.clientY - rect.top) / rect.height) * SIZE;
    return {
      x: (px - SIZE / 2) / view.scale + view.cx,
      y: (SIZE / 2 - py) / view.scale + view.cy,
    };
  };

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width="100%"
        style={{ maxWidth: SIZE, touchAction: 'none', cursor: pinned ? 'default' : 'crosshair' }}
        role="img"
        aria-label={
          `Feasible region with the largest inscribed ball at (${centre.x.toFixed(2)}, ` +
          `${centre.y.toFixed(2)}), radius ${radius.toFixed(2)}, objective ${dot(C, centre).toFixed(2)}.`
        }
        onPointerMove={(e) => {
          if (!pinned) setCentre(toWorld(e));
        }}
        onPointerDown={(e) => {
          setPinned((p) => !p);
          if (pinned) setCentre(toWorld(e));
        }}
      >
        <polygon
          points={region.map((v) => `${sx(v.x)},${sy(v.y)}`).join(' ')}
          fill={palette.rule}
          stroke={palette.inkTertiary}
          strokeWidth={1}
        />

        {CONSTRAINTS.map((c, i) => {
          const [p, q] = facetLine(c, UNITS);
          return (
            <line
              key={i}
              x1={sx(p.x)}
              y1={sy(p.y)}
              x2={sx(q.x)}
              y2={sy(q.y)}
              stroke={palette.inkTertiary}
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.5}
            />
          );
        })}

        {/* The path of iterates, so a run leaves a visible trace. */}
        {trail.length > 1 && (
          <polyline
            points={trail.map((v) => `${sx(v.x)},${sy(v.y)}`).join(' ')}
            fill="none"
            stroke={palette.mark}
            strokeWidth={1.5}
            opacity={0.55}
          />
        )}

        {inside && (
          <>
            <circle
              cx={sx(centre.x)}
              cy={sy(centre.y)}
              r={radius * SCALE}
              fill="none"
              stroke={palette.distribution}
              strokeWidth={2}
            />

            {/* Objective plane, tangent to the ball at the bottom point. */}
            {bottom && (
              <>
                <line
                  x1={sx(bottom.x - C.y * UNITS)}
                  y1={sy(bottom.y + C.x * UNITS)}
                  x2={sx(bottom.x + C.y * UNITS)}
                  y2={sy(bottom.y - C.x * UNITS)}
                  stroke={palette.positive}
                  strokeWidth={1.5}
                />
                <circle cx={sx(bottom.x)} cy={sy(bottom.y)} r={4} fill={palette.positive} />
              </>
            )}

            {touching.map((tp, i) => (
              <g key={i}>
                <line
                  x1={sx(tp.x)}
                  y1={sy(tp.y)}
                  x2={sx(centre.x)}
                  y2={sy(centre.y)}
                  stroke={palette.negative}
                  strokeWidth={1}
                />
                <circle cx={sx(tp.x)} cy={sy(tp.y)} r={3.5} fill={palette.negative} />
              </g>
            ))}

            <circle cx={sx(centre.x)} cy={sy(centre.y)} r={3.5} fill={palette.ink} />
          </>
        )}

        <circle cx={sx(best.x)} cy={sy(best.y)} r={5} fill="none" stroke={palette.ink} strokeWidth={2} />
      </svg>

      <div className="controls">
        <button type="button" className="button" onClick={step}>
          Iterate
        </button>
        <button type="button" className="button" onClick={reset}>
          Reset
        </button>
        <button type="button" className="button" onClick={() => setPinned((p) => !p)}>
          {pinned ? 'Follow the pointer' : 'Pin the centre'}
        </button>
      </div>

      <Slider
        label="ε (step back)"
        sliderMin={0.02}
        sliderMax={0.5}
        stepSize={0.02}
        value={eps}
        onChange={setEps}
        formatValue={(v) => v.toFixed(2)}
      />

      <p className="info">
        δ(x) = {radius.toFixed(3)} · touching set {touching.length} constraint
        {touching.length === 1 ? '' : 's'} · objective at the centre {dot(C, centre).toFixed(3)} ·
        best so far {dot(C, best).toFixed(3)}
      </p>
    </div>
  );
}
