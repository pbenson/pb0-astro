import { useCallback, useMemo, useRef, useState } from 'react';
import { format } from 'd3-format';
import { useChartPalette } from '../shared/chartTokens';
import './tspEuclidean.css';
import {
  bestRoute,
  circleLayout,
  enumerateRoutes,
  minima,
  type RouteMetrics,
  type TspNode,
} from '../../utils/tsp';

const WIDTH = 520;
const HEIGHT = 420;
const NODE_RADIUS = 19;
/** Keeps a dragged node fully inside the frame. */
const MARGIN = NODE_RADIUS + 4;

const NODE_CHOICES = [3, 4, 5, 6, 7] as const;
const DEFAULT_NODES = 5;
/**
 * Chosen deliberately, not arbitrarily: on this layout the shortest tour and
 * the best search order use different edges, so both are visible at once. Many
 * layouts make them agree, or differ only in direction — which would draw the
 * two routes on top of each other and hide the point of the page.
 */
const DEFAULT_SEED = 5443;

const whole = format('.0f');
const key = (sequence: readonly number[]) => sequence.join('-');

function defaultLayout(count: number): TspNode[] {
  return circleLayout(count, HEIGHT * 0.36, WIDTH * 0.5, HEIGHT * 0.5);
}

/** Nudges the circle into an irregular shape, where the objectives disagree. */
function scatteredLayout(count: number, seed: number): TspNode[] {
  let state = seed >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return defaultLayout(count).map((node) => ({
    ...node,
    x: Math.min(WIDTH - MARGIN, Math.max(MARGIN, node.x + (random() - 0.5) * 150)),
    y: Math.min(HEIGHT - MARGIN, Math.max(MARGIN, node.y + (random() - 0.5) * 150)),
  }));
}

export default function TspEuclidean() {
  const palette = useChartPalette();
  const svgRef = useRef<SVGSVGElement>(null);

  const [count, setCount] = useState<number>(DEFAULT_NODES);
  const [nodes, setNodes] = useState<TspNode[]>(() => scatteredLayout(DEFAULT_NODES, DEFAULT_SEED));
  const [dragging, setDragging] = useState<number | null>(null);
  const [showOptimalOnly, setShowOptimalOnly] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [shuffle, setShuffle] = useState(0);

  const routes = useMemo(() => enumerateRoutes(nodes), [nodes]);
  const best = useMemo(() => minima(routes), [routes]);
  const cheapestTour = useMemo(() => bestRoute(routes, 'cost'), [routes]);
  const bestSearch = useMemo(() => bestRoute(routes, 'expectedCost'), [routes]);

  const objectivesAgree =
    cheapestTour !== undefined &&
    bestSearch !== undefined &&
    Math.abs(cheapestTour.expectedCost - bestSearch.expectedCost) < 1e-9;

  const visible = useMemo(() => {
    if (!showOptimalOnly) return routes;
    return routes.filter(
      (route) =>
        route.cost <= best.cost ||
        route.expectedCost <= best.expectedCost ||
        route.expectedCostNoReturn <= best.expectedCostNoReturn,
    );
  }, [routes, showOptimalOnly, best]);

  /** Routes drawn on the graph: the selected one, or both optima. */
  const drawn = useMemo(() => {
    if (selected !== null) {
      const route = routes.find((r) => key(r.sequence) === selected);
      if (route) return [{ route, color: palette.mark, label: 'selected' }];
    }
    const out: { route: RouteMetrics; color: string; label: string }[] = [];
    if (cheapestTour) out.push({ route: cheapestTour, color: palette.negative, label: 'shortest tour' });
    if (bestSearch && !objectivesAgree) {
      out.push({ route: bestSearch, color: palette.positive, label: 'best search order' });
    }
    return out;
  }, [selected, routes, cheapestTour, bestSearch, objectivesAgree, palette]);

  const changeCount = (next: number) => {
    setCount(next);
    setNodes(scatteredLayout(next, DEFAULT_SEED + shuffle));
    setSelected(null);
  };

  const reshuffle = () => {
    const next = shuffle + 1;
    setShuffle(next);
    setNodes(scatteredLayout(count, DEFAULT_SEED + next));
    setSelected(null);
  };

  const pointToSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * WIDTH,
      y: ((clientY - rect.top) / rect.height) * HEIGHT,
    };
  }, []);

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (dragging === null) return;
    const point = pointToSvg(event.clientX, event.clientY);
    if (!point) return;
    setNodes((current) =>
      current.map((node) =>
        node.label === dragging
          ? {
              ...node,
              x: Math.min(WIDTH - MARGIN, Math.max(MARGIN, point.x)),
              y: Math.min(HEIGHT - MARGIN, Math.max(MARGIN, point.y)),
            }
          : node,
      ),
    );
  };

  /** Arrow-key nudging, so the layout is reachable without a pointer. */
  const onNodeKeyDown = (event: React.KeyboardEvent<SVGGElement>, label: number) => {
    const step = event.shiftKey ? 20 : 4;
    const deltas: Record<string, [number, number]> = {
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
    };
    const delta = deltas[event.key];
    if (!delta) return;
    event.preventDefault();
    setNodes((current) =>
      current.map((node) =>
        node.label === label
          ? {
              ...node,
              x: Math.min(WIDTH - MARGIN, Math.max(MARGIN, node.x + delta[0])),
              y: Math.min(HEIGHT - MARGIN, Math.max(MARGIN, node.y + delta[1])),
            }
          : node,
      ),
    );
  };

  const summary =
    cheapestTour && bestSearch
      ? `Graph of ${count} locations. The shortest tour is ${key(cheapestTour.sequence)} at length ` +
        `${whole(cheapestTour.cost)}; the best search order is ${key(bestSearch.sequence)} at an ` +
        `expected cost of ${whole(bestSearch.expectedCost)}.`
      : `Graph of ${count} locations.`;

  return (
    <div className="tsp">
      <div className="controls">
        <div className="control">
          <label htmlFor="tsp-count">Locations</label>
          <select
            id="tsp-count"
            value={count}
            onChange={(event) => changeCount(Number(event.target.value))}
          >
            {NODE_CHOICES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={showOptimalOnly}
            onChange={(event) => setShowOptimalOnly(event.target.checked)}
          />
          Optimal routes only
        </label>

        <button type="button" onClick={reshuffle}>
          Rearrange
        </button>
        {selected !== null && (
          <button type="button" onClick={() => setSelected(null)}>
            Clear selection
          </button>
        )}
      </div>

      <div className="board">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          // Not role="img": that declares a single indivisible image, and this
          // graph contains focusable node handles. A labelled group keeps the
          // summary while leaving the children reachable.
          role="group"
          aria-label={summary}
          onPointerMove={onPointerMove}
          onPointerUp={() => setDragging(null)}
          onPointerLeave={() => setDragging(null)}
        >
          {/* Every pairwise edge, recessive: the graph is complete. */}
          {nodes.map((from, i) =>
            nodes.slice(i + 1).map((to) => (
              <line
                key={`${from.label}-${to.label}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={palette.rule}
                strokeWidth={1}
              />
            )),
          )}

          {drawn.map(({ route, color }) => (
            <g key={key(route.sequence)}>
              <polyline
                points={route.sequence
                  .map((label) => `${nodes[label]!.x},${nodes[label]!.y}`)
                  .join(' ')}
                fill="none"
                stroke={color}
                strokeWidth={2.5}
                strokeLinejoin="round"
                opacity={0.85}
              />
            </g>
          ))}

          {nodes.map((node) => {
            const isHome = node.label === 0;
            return (
              <g
                key={node.label}
                className="node"
                tabIndex={0}
                role="button"
                aria-label={
                  isHome
                    ? 'Home. Drag or use arrow keys to move.'
                    : `Location ${node.label}, probability ${node.p.toFixed(2)}. Drag or use arrow keys to move.`
                }
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture?.(event.pointerId);
                  setDragging(node.label);
                }}
                onKeyDown={(event) => onNodeKeyDown(event, node.label)}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={NODE_RADIUS}
                  fill={isHome ? palette.distribution : palette.surface}
                  stroke={isHome ? palette.distribution : palette.inkTertiary}
                  strokeWidth={2}
                />
                <text
                  x={node.x}
                  y={node.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="node-label"
                  fill={isHome ? palette.surface : palette.ink}
                >
                  {isHome ? '⌂' : node.label}
                </text>
                {!isHome && (
                  <text
                    x={node.x}
                    y={node.y + NODE_RADIUS + 12}
                    textAnchor="middle"
                    className="node-prob"
                    fill={palette.inkTertiary}
                  >
                    p={node.p.toFixed(2)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        <div className="key">
          {selected !== null ? (
            <span>
              <i style={{ background: palette.mark }} /> selected route
            </span>
          ) : (
            <>
              <span>
                <i style={{ background: palette.negative }} /> shortest tour
              </span>
              {objectivesAgree ? (
                <span className="agree">best search order is the same route here</span>
              ) : (
                <span>
                  <i style={{ background: palette.positive }} /> best search order
                </span>
              )}
            </>
          )}
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <caption>
            {visible.length.toLocaleString()} of {routes.length.toLocaleString()} routes
            {showOptimalOnly && routes.length !== visible.length ? ' (optima only)' : ''}. Select a
            row to draw it.
          </caption>
          <thead>
            <tr>
              <th scope="col">Route</th>
              <th scope="col">Tour length</th>
              <th scope="col">E[cost]</th>
              <th scope="col">E[cost] no return</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((route) => {
              const id = key(route.sequence);
              return (
                <tr
                  key={id}
                  className={selected === id ? 'selected' : undefined}
                  onClick={() => setSelected(selected === id ? null : id)}
                >
                  <th scope="row">
                    <button type="button">{id}</button>
                  </th>
                  <td className={route.cost <= best.cost ? 'best' : undefined}>
                    {whole(route.cost)}
                  </td>
                  <td className={route.expectedCost <= best.expectedCost ? 'best' : undefined}>
                    {whole(route.expectedCost)}
                  </td>
                  <td
                    className={
                      route.expectedCostNoReturn <= best.expectedCostNoReturn ? 'best' : undefined
                    }
                  >
                    {whole(route.expectedCostNoReturn)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
