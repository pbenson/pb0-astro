import { useCallback, useEffect, useRef, useState } from 'react';
import Slider from '../ui/Slider';
import { useChartPalette } from '../shared/chartTokens';
import {
  binStandardDeviation,
  binomial,
  binomialPmf,
  dropMany,
  emptyBins,
  expectedBin,
  MAX_ROWS,
  MIN_ROWS,
} from '../../utils/quincunx';

const WIDTH = 640;
const PIN_HEIGHT = 300;
const HIST_HEIGHT = 190;
const HEIGHT = PIN_HEIGHT + HIST_HEIGHT;

/** Rows a ball falls per second while it is being animated. */
const ROWS_PER_SECOND = 7;

/** Above this, a batch lands at once — ten thousand balls cannot be watched. */
const ANIMATION_LIMIT = 60;

const BATCHES = [1, 10, 100, 1000, 10000] as const;

/**
 * One ball in flight. Its decisions are drawn up front, so the bin the
 * animation walks it into is the bin the sampler chose — the picture and the
 * histogram can never disagree.
 */
interface Ball {
  id: number;
  decisions: boolean[];
  /** How far down the lattice it is, in rows. */
  progress: number;
}

let nextBallId = 0;

export default function Quincunx() {
  const palette = useChartPalette();

  const [rows, setRows] = useState(12);
  const [bias, setBias] = useState(0.5);
  const [batch, setBatch] = useState<number>(100);
  const [counts, setCounts] = useState<number[]>(() => emptyBins(12));
  const [balls, setBalls] = useState<Ball[]>([]);

  const ballsRef = useRef<Ball[]>([]);
  ballsRef.current = balls;

  // Either control invalidates every count taken before it moved: a new row
  // count changes how many bins there are, and a new bias would leave the bars
  // holding a mixture of two different distributions.
  useEffect(() => {
    setCounts(emptyBins(rows));
    setBalls([]);
  }, [rows, bias]);

  const drop = useCallback(() => {
    if (batch > ANIMATION_LIMIT) {
      setCounts((current) => dropMany([...current], batch, rows, bias));
      return;
    }
    const fresh: Ball[] = Array.from({ length: batch }, (_, i) => ({
      id: nextBallId++,
      decisions: Array.from({ length: rows }, () => Math.random() < bias),
      // Stagger the release rather than dropping the batch as one clump.
      progress: -i * 0.55,
    }));
    setBalls((current) => [...current, ...fresh]);
  }, [batch, rows, bias]);

  const reset = useCallback(() => {
    setCounts(emptyBins(rows));
    setBalls([]);
  }, [rows]);

  // Walk the in-flight balls down the lattice, binning each as it lands.
  useEffect(() => {
    if (!balls.length) return;
    let last = performance.now();
    let frame = requestAnimationFrame(function loop(now) {
      const elapsed = (now - last) / 1000;
      last = now;

      const landed: number[] = [];
      const flying: Ball[] = [];
      for (const ball of ballsRef.current) {
        const progress = ball.progress + elapsed * ROWS_PER_SECOND;
        if (progress >= ball.decisions.length) {
          landed.push(ball.decisions.filter(Boolean).length);
        } else {
          flying.push({ ...ball, progress });
        }
      }
      if (landed.length) {
        setCounts((current) => {
          const next = [...current];
          for (const bin of landed) ++next[bin];
          return next;
        });
      }
      setBalls(flying);
      if (flying.length) frame = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(frame);
    // Restarting whenever the list empties and refills is the point: the loop
    // runs only while something is falling.
  }, [balls.length > 0]);

  const spacing = WIDTH / (rows + 2);
  const rowGap = PIN_HEIGHT / (rows + 1);

  const pins: { x: number; y: number }[] = [];
  for (let row = 0; row < rows; ++row) {
    for (let i = 0; i <= row; ++i) {
      pins.push({ x: WIDTH / 2 + (i - row / 2) * spacing, y: (row + 1) * rowGap });
    }
  }

  /** Where a ball sits after `progress` rows of its own decision list. */
  function ballAt(ball: Ball) {
    const progress = Math.max(0, ball.progress);
    const row = Math.floor(progress);
    const fraction = progress - row;
    let offset = 0;
    for (let i = 0; i < row; ++i) offset += ball.decisions[i] ? 0.5 : -0.5;
    if (row < ball.decisions.length) {
      offset += (ball.decisions[row] ? 0.5 : -0.5) * fraction;
    }
    return { x: WIDTH / 2 + offset * spacing, y: progress * rowGap + rowGap / 2 };
  }

  const total = counts.reduce((sum, v) => sum + v, 0);
  const tallest = Math.max(1, ...counts);
  const pmf = binomialPmf(rows, bias);
  const binWidth = WIDTH / (rows + 1);
  const histTop = PIN_HEIGHT + 10;
  const histFloor = HEIGHT - 22;
  const histSpan = histFloor - histTop;

  // The exact curve is drawn on the same scale as the bars, so "the bars are
  // converging onto it" is something the reader can see rather than be told.
  const expectedHeight = (k: number) => (total === 0 ? 0 : (pmf[k] * total) / tallest * histSpan);

  const mean = expectedBin(rows, bias);
  const sd = binStandardDeviation(rows, bias);

  return (
    <div className="quincunx">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="quincunx-board"
        data-thumbnail
        role="img"
        aria-label={
          `A Galton board with ${rows} rows of pins. ${total} balls dropped so far, ` +
          `piling into ${rows + 1} bins.`
        }
      >
        {pins.map((pin, i) => (
          <circle key={i} cx={pin.x} cy={pin.y} r={2.6} fill={palette.inkTertiary} />
        ))}

        {balls.map((ball) => {
          const { x, y } = ballAt(ball);
          return <circle key={ball.id} cx={x} cy={y} r={3.6} fill={palette.error} />;
        })}

        {counts.map((count, k) => {
          const height = (count / tallest) * histSpan;
          const x = (k + 0.5) * binWidth - binWidth * 0.42;
          return (
            <g key={k}>
              <rect
                x={x}
                y={histFloor - height}
                width={binWidth * 0.84}
                height={height}
                fill={palette.distribution}
                fillOpacity={0.55}
                // Every bin carries its count, including the empty ones. The
                // printed labels are suppressed at zero and on wide boards, so
                // they cannot be read back as a distribution — position in the
                // label list is not the bin number.
                data-bin={k}
                data-count={count}
              />
              {rows <= 12 && count > 0 && (
                <text
                  x={(k + 0.5) * binWidth}
                  y={histFloor - height - 4}
                  textAnchor="middle"
                  fontSize={11}
                  fill={palette.inkSecondary}
                >
                  {count}
                </text>
              )}
            </g>
          );
        })}

        {total > 0 && (
          <polyline
            points={pmf
              .map((_, k) => `${(k + 0.5) * binWidth},${histFloor - expectedHeight(k)}`)
              .join(' ')}
            fill="none"
            stroke={palette.positive}
            strokeWidth={2}
          />
        )}

        <line
          x1={0}
          y1={histFloor}
          x2={WIDTH}
          y2={histFloor}
          stroke={palette.ruleEmphasis}
          strokeWidth={1}
        />
      </svg>

      <div className="controls">
        <button type="button" className="button button-accent" onClick={drop}>
          Drop {batch.toLocaleString()}
        </button>
        <button type="button" className="button" onClick={reset}>
          Reset
        </button>
        {BATCHES.map((size) => (
          <button
            key={size}
            type="button"
            className={`button${batch === size ? ' is-picked' : ''}`}
            aria-pressed={batch === size}
            onClick={() => setBatch(size)}
          >
            {size.toLocaleString()}
          </button>
        ))}
      </div>

      <Slider
        label="Rows of pins"
        sliderMin={MIN_ROWS}
        sliderMax={MAX_ROWS}
        value={rows}
        onChange={setRows}
      />
      <Slider
        label="Chance of bouncing right"
        sliderMin={0}
        sliderMax={1}
        stepSize={0.05}
        value={bias}
        onChange={setBias}
        formatValue={(v) => v.toFixed(2)}
      />

      <p className="info">
        {total.toLocaleString()} ball{total === 1 ? '' : 's'} dropped · expected bin{' '}
        {mean.toFixed(2)} · standard deviation {sd.toFixed(2)}
        {rows <= 6 && (
          <>
            {' '}· exact row {Array.from({ length: rows + 1 }, (_, k) => binomial(rows, k)).join(':')}
          </>
        )}
      </p>
    </div>
  );
}
