import { useId, useMemo, useState } from 'react';
import { format } from 'd3-format';
import { useChartPalette } from '../shared/chartTokens';
import './tspProbabilities.css';
import {
  bestRoute,
  enumerateRoutes,
  minima,
  nodesFromWeights,
  randomCosts,
  withEdgeCost,
  type CostMatrix,
  type GraphRouteMetrics,
} from '../../utils/tspGraph';

const WIDTH = 520;
const HEIGHT = 420;
const NODE_RADIUS = 22;
const RING_RADIUS = HEIGHT * 0.36;

const NODE_CHOICES = [3, 4, 5, 6] as const;
const DEFAULT_NODES = 5;
/**
 * Chosen, not arbitrary: on this cost matrix the cheapest tour and the best
 * search order are different routes, and the gap between them is wide enough to
 * read off the table at a glance.
 */
const DEFAULT_SEED = 24;
/** Weights behind the default probabilities: unequal, and steeply so. */
const DEFAULT_WEIGHTS = [10, 5, 3, 2, 2, 1];

const MAX_COST = 99;

const oneDecimal = format('.1f');
const percent = format('.0%');
const key = (sequence: readonly number[]) => sequence.join('-');

/** Where a node sits on the ring. Home is at the right, the rest run round. */
function position(label: number, count: number): { x: number; y: number } {
  const angle = (2 * Math.PI * label) / count;
  return {
    x: WIDTH * 0.5 + RING_RADIUS * Math.cos(angle),
    y: HEIGHT * 0.5 - RING_RADIUS * Math.sin(angle),
  };
}

interface Leg {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly arrow: string;
  readonly step: number;
}

const ARROW_LENGTH = 11;
const ARROW_WIDTH = 6;

/**
 * The legs of a route, nudged sideways by `offset` so two routes sharing an
 * edge stay separately readable rather than drawing on top of each other.
 */
function legsOf(sequence: readonly number[], count: number, offset: number): Leg[] {
  const legs: Leg[] = [];
  for (let i = 1; i < sequence.length; i++) {
    const from = position(sequence[i - 1]!, count);
    const to = position(sequence[i]!, count);

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const px = -uy * offset;
    const py = ux * offset;

    // Stop short of the node circles, so the arrowheads stay visible.
    const x1 = from.x + ux * NODE_RADIUS + px;
    const y1 = from.y + uy * NODE_RADIUS + py;
    const x2 = to.x - ux * NODE_RADIUS + px;
    const y2 = to.y - uy * NODE_RADIUS + py;

    const ax = x1 + (x2 - x1) * 0.62;
    const ay = y1 + (y2 - y1) * 0.62;
    legs.push({
      x1,
      y1,
      x2,
      y2,
      step: i,
      arrow: [
        `${ax + ux * ARROW_LENGTH * 0.5},${ay + uy * ARROW_LENGTH * 0.5}`,
        `${ax - ux * ARROW_LENGTH * 0.5 - uy * ARROW_WIDTH},${ay - uy * ARROW_LENGTH * 0.5 + ux * ARROW_WIDTH}`,
        `${ax - ux * ARROW_LENGTH * 0.5 + uy * ARROW_WIDTH},${ay - uy * ARROW_LENGTH * 0.5 - ux * ARROW_WIDTH}`,
      ].join(' '),
    });
  }
  return legs;
}

/** Every unordered pair of nodes: the edges of the complete graph. */
function pairs(count: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) out.push([i, j]);
  }
  return out;
}

export default function TspProbabilities() {
  const palette = useChartPalette();
  // Ids are per-instance: several copies of this control could share a page,
  // and duplicate ids would point every label at the first one's input.
  const uid = useId();

  const [count, setCount] = useState<number>(DEFAULT_NODES);
  const [costs, setCosts] = useState<CostMatrix>(() => randomCosts(DEFAULT_NODES, DEFAULT_SEED));
  const [weights, setWeights] = useState<number[]>(() => DEFAULT_WEIGHTS.slice(0, DEFAULT_NODES - 1));
  const [showOptimalOnly, setShowOptimalOnly] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [shuffle, setShuffle] = useState(0);

  const nodes = useMemo(() => nodesFromWeights(weights), [weights]);
  const routes = useMemo(() => enumerateRoutes(costs, nodes), [costs, nodes]);
  const best = useMemo(() => minima(routes), [routes]);
  const cheapestTour = useMemo(() => bestRoute(routes, 'cost'), [routes]);
  const bestSearch = useMemo(() => bestRoute(routes, 'expectedCost'), [routes]);

  const objectivesAgree =
    cheapestTour !== undefined &&
    bestSearch !== undefined &&
    key(cheapestTour.sequence) === key(bestSearch.sequence);

  const visible = useMemo(() => {
    if (!showOptimalOnly) return routes;
    return routes.filter(
      (route) => route.cost <= best.cost || route.expectedCost <= best.expectedCost,
    );
  }, [routes, showOptimalOnly, best]);

  /** Routes drawn on the graph: the selected one, or both optima. */
  const drawn = useMemo(() => {
    if (selected !== null) {
      const route = routes.find((r) => key(r.sequence) === selected);
      if (route) return [{ route, color: palette.mark, label: 'selected' }];
    }
    const out: { route: GraphRouteMetrics; color: string; label: string }[] = [];
    if (cheapestTour) {
      out.push({ route: cheapestTour, color: palette.negative, label: 'cheapest tour' });
    }
    if (bestSearch && !objectivesAgree) {
      out.push({ route: bestSearch, color: palette.positive, label: 'best search order' });
    }
    return out;
  }, [selected, routes, cheapestTour, bestSearch, objectivesAgree, palette]);

  const changeCount = (next: number) => {
    setCount(next);
    setCosts(randomCosts(next, DEFAULT_SEED + shuffle));
    setWeights(DEFAULT_WEIGHTS.slice(0, next - 1));
    setSelected(null);
  };

  const reshuffle = () => {
    const next = shuffle + 1;
    setShuffle(next);
    setCosts(randomCosts(count, DEFAULT_SEED + next));
    setSelected(null);
  };

  const levelProbabilities = () => setWeights(weights.map(() => 1));

  const setCost = (from: number, to: number, value: number) => {
    setCosts((current) => withEdgeCost(current, from, to, Math.max(0, Math.min(MAX_COST, value))));
    setSelected(null);
  };

  const setWeight = (index: number, value: number) => {
    setWeights((current) => current.map((w, i) => (i === index ? Math.max(0, value) : w)));
    setSelected(null);
  };

  const summary =
    cheapestTour && bestSearch
      ? `Complete graph on ${count} nodes. The cheapest tour is ${key(cheapestTour.sequence)} ` +
        `costing ${cheapestTour.cost}; the best search order is ${key(bestSearch.sequence)} at an ` +
        `expected cost of ${oneDecimal(bestSearch.expectedCost)}.`
      : `Complete graph on ${count} nodes.`;

  return (
    <div className="tspg">
      <div className="controls">
        <div className="control">
          <label htmlFor={`${uid}-count`}>Locations</label>
          <select
            id={`${uid}-count`}
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
          New costs
        </button>
        <button type="button" onClick={levelProbabilities}>
          Equal probabilities
        </button>
        {selected !== null && (
          <button type="button" onClick={() => setSelected(null)}>
            Clear selection
          </button>
        )}
      </div>

      <div className="board">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={summary}>
          {/* Every edge of the complete graph, with its cost. */}
          {pairs(count).map(([i, j]) => {
            const from = position(i, count);
            const to = position(j, count);
            return (
              <g key={`${i}-${j}`}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={palette.rule}
                  strokeWidth={1}
                />
                <text
                  // A third of the way along, not the midpoint: two edges of the
                  // complete graph can share a midpoint, and their labels would
                  // then overlap.
                  x={from.x + (to.x - from.x) * 0.32}
                  y={from.y + (to.y - from.y) * 0.32}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="cost-label"
                  fill={palette.inkSecondary}
                >
                  {costs[i]![j]}
                </text>
              </g>
            );
          })}

          {drawn.map(({ route, color }, routeIndex) => {
            const offset = drawn.length > 1 ? (routeIndex === 0 ? -4 : 4) : 0;
            return (
              <g key={key(route.sequence)}>
                {legsOf(route.sequence, count, offset).map((leg) => (
                  <g key={leg.step}>
                    <line
                      x1={leg.x1}
                      y1={leg.y1}
                      x2={leg.x2}
                      y2={leg.y2}
                      stroke={color}
                      strokeWidth={2.5}
                      strokeLinecap="round"
                    />
                    <polygon points={leg.arrow} fill={color} />
                  </g>
                ))}
              </g>
            );
          })}

          {nodes.map((node) => {
            const isHome = node.label === 0;
            const { x, y } = position(node.label, count);
            return (
              <g key={node.label}>
                <circle
                  cx={x}
                  cy={y}
                  r={NODE_RADIUS}
                  fill={isHome ? palette.distribution : palette.surface}
                  stroke={isHome ? palette.distribution : palette.inkTertiary}
                  strokeWidth={2}
                />
                <text
                  x={x}
                  y={isHome ? y : y - 4}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="node-label"
                  fill={isHome ? palette.surface : palette.ink}
                >
                  {isHome ? '⌂' : node.label}
                </text>
                {!isHome && (
                  <text
                    x={x}
                    y={y + 9}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="prob-label"
                    fill={palette.inkSecondary}
                  >
                    {percent(node.p)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        <div className="key">
          {drawn.map(({ route, color, label }) => (
            <div className="key-row" key={label}>
              <span className="key-name" style={{ color }}>
                {label}
              </span>
              <span className="sequence">
                {route.sequence.map((node, i) => (
                  <span key={`${node}-${i}`}>
                    {i > 0 && <b style={{ color }}>→</b>}
                    <em>{node === 0 ? '⌂' : node}</em>
                  </span>
                ))}
              </span>
              {/* The numbers, not just the route: most edits leave the optimal
                  routes where they are and move only these, and without them
                  the graph looks inert when the arithmetic has in fact moved. */}
              <span className="numbers">
                tour <strong>{route.cost}</strong> · E[cost]{' '}
                <strong>{oneDecimal(route.expectedCost)}</strong>
              </span>
            </div>
          ))}
          {objectivesAgree && selected === null && (
            <p className="agree">
              The cheapest tour is the best search order here — change a cost or a probability to
              pull them apart.
            </p>
          )}
        </div>
      </div>

      <div className="editors">
        <fieldset>
          <legend>Edge costs</legend>
          <div className="grid">
            {pairs(count).map(([i, j]) => {
              const id = `${uid}-cost-${i}-${j}`;
              return (
                <div className="field" key={id}>
                  <label htmlFor={id}>
                    {i === 0 ? '⌂' : i}–{j}
                  </label>
                  <input
                    id={id}
                    type="number"
                    min={0}
                    max={MAX_COST}
                    step={1}
                    value={costs[i]![j]}
                    onChange={(event) => setCost(i, j, Number(event.target.value))}
                  />
                </div>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend>Probability weights</legend>
          <div className="grid">
            {weights.map((weight, index) => {
              const id = `${uid}-weight-${index + 1}`;
              return (
                <div className="field" key={id}>
                  <label htmlFor={id}>{index + 1}</label>
                  <input
                    id={id}
                    type="number"
                    min={0}
                    max={99}
                    step={1}
                    value={weight}
                    onChange={(event) => setWeight(index, Number(event.target.value))}
                  />
                  <span className="derived">{percent(nodes[index + 1]!.p)}</span>
                </div>
              );
            })}
          </div>
          <p className="note">Weights are scaled to sum to one; only their ratios matter.</p>
        </fieldset>
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
              <th scope="col">Tour cost</th>
              <th scope="col">E[cost]</th>
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
                  <td className={route.cost <= best.cost ? 'best' : undefined}>{route.cost}</td>
                  <td className={route.expectedCost <= best.expectedCost ? 'best' : undefined}>
                    {oneDecimal(route.expectedCost)}
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
