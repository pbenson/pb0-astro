import { useCallback, useMemo, useState } from 'react';
import { useChartPalette } from '../shared/chartTokens';
import {
  coverCount,
  isOrmat,
  judge,
  minimalCovers,
  minimumCover,
  OVERLAY_LABELS,
  OVERLAY_MASKS,
  popcount,
  puzzleTemplates,
  SIZE,
  type Judgement,
} from '../../utils/ormat';

const CELL = 34;
const GAP = 3;
/** Every template worth setting, coverable or not — the button has to matter. */
function puzzlePool(): number[] {
  const coverable = puzzleTemplates({ coverable: true });
  const impossible = puzzleTemplates({ coverable: false });
  return [...coverable, ...impossible];
}

interface GridProps {
  template: number;
  dots?: number;
  uncovered?: number;
  spilled?: number;
  size?: number;
  palette: ReturnType<typeof useChartPalette>;
}

function Grid({ template, dots = 0, uncovered = 0, spilled = 0, size = CELL, palette }: GridProps) {
  const gap = size === CELL ? GAP : 2;
  const extent = SIZE * size + (SIZE - 1) * gap;
  return (
    <svg viewBox={`0 0 ${extent} ${extent}`} width={extent} height={extent} aria-hidden="true">
      {[...Array(SIZE * SIZE).keys()].map((i) => {
        const row = Math.floor(i / SIZE);
        const col = i % SIZE;
        const bit = 1 << i;
        const coloured = (template & bit) !== 0;
        return (
          <g key={i} transform={`translate(${col * (size + gap)}, ${row * (size + gap)})`}>
            <rect
              width={size}
              height={size}
              rx={3}
              fill={coloured ? palette.distribution : 'transparent'}
              fillOpacity={coloured ? 0.28 : 1}
              stroke={spilled & bit ? palette.error : palette.rule}
              strokeWidth={spilled & bit ? 2.5 : 1}
            />
            {(dots & bit) !== 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={size * 0.17}
                fill={spilled & bit ? palette.error : palette.ink}
              />
            )}
            {(uncovered & bit) !== 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={size * 0.17}
                fill="none"
                stroke={palette.ink}
                strokeWidth={1.5}
                strokeDasharray="2 2"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function OrmatGame() {
  const palette = useChartPalette();
  const pool = useMemo(puzzlePool, []);
  // Open on a template that takes two overlays: one is a giveaway, and the
  // interesting cases only make sense once a reader has combined a pair.
  const [template, setTemplate] = useState(
    () => pool.find((t) => minimumCover(t) === 2) ?? pool[0],
  );
  const [chosen, setChosen] = useState<number[]>([]);
  const [claimedNoSolution, setClaimedNoSolution] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const coverable = isOrmat(template);
  const result: Judgement = judge(template, chosen);
  const dots = chosen.reduce((mask, i) => mask | OVERLAY_MASKS[i], 0);

  const toggle = useCallback((index: number) => {
    setClaimedNoSolution(false);
    setRevealed(false);
    setChosen((current) =>
      current.includes(index) ? current.filter((i) => i !== index) : [...current, index],
    );
  }, []);

  const deal = useCallback(() => {
    setChosen([]);
    setClaimedNoSolution(false);
    setRevealed(false);
    setTemplate((current) => {
      let next = current;
      // A fresh template, never the one already on the board.
      while (next === current) next = pool[Math.floor(Math.random() * pool.length)];
      return next;
    });
  }, [pool]);

  // The wager: $3 for a correct covering, $1 per overlay used.
  const payout = result.verdict === 'minimal' || result.verdict === 'covers'
    ? 3 - chosen.length
    : null;

  let message: string;
  let tone: 'neutral' | 'good' | 'bad';
  if (claimedNoSolution) {
    if (coverable) {
      tone = 'bad';
      message = `This one can be covered — ${minimumCover(template)} overlays do it.`;
    } else {
      tone = 'good';
      message = 'Right: no set of overlays covers this template.';
    }
  } else if (result.verdict === 'empty') {
    tone = 'neutral';
    message = `${popcount(template)} coloured squares. Choose overlays.`;
  } else if (result.verdict === 'spills') {
    tone = 'bad';
    message = 'A dot has landed on a blank square.';
  } else if (result.verdict === 'incomplete') {
    tone = 'neutral';
    message = `${popcount(result.uncovered)} coloured square${popcount(result.uncovered) === 1 ? '' : 's'} still uncovered.`;
  } else if (result.verdict === 'covers') {
    tone = 'neutral';
    message = `A correct covering with ${chosen.length} overlays — but ${result.minimum} will do it.`;
  } else {
    tone = 'good';
    message = `Minimal: ${chosen.length} overlay${chosen.length === 1 ? '' : 's'}, and there ${
      result.ways === 1 ? 'is no other way' : `are ${result.ways} ways`
    }.`;
  }

  return (
    <div className="ormat">
      {/* The board and overlays together are the picture of this page. Each
          grid is too small for the thumbnail capture's size threshold, so the
          arrangement names itself. See scripts/capture-thumbnails.mjs. */}
      <div className="ormat-stage" data-thumbnail>
        <figure className="ormat-template">
          <Grid
            template={template}
            dots={dots}
            uncovered={result.verdict === 'incomplete' ? result.uncovered : 0}
            spilled={result.spilled}
            palette={palette}
          />
          <figcaption>Template</figcaption>
        </figure>

        <div className="ormat-overlays" role="group" aria-label="Overlays">
          {OVERLAY_MASKS.map((mask, i) => {
            const picked = chosen.includes(i);
            return (
              <button
                key={i}
                type="button"
                className={`ormat-overlay${picked ? ' is-picked' : ''}`}
                aria-pressed={picked}
                onClick={() => toggle(i)}
              >
                <Grid template={0} dots={mask} size={20} palette={palette} />
                <span>{OVERLAY_LABELS[i]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className={`ormat-message is-${tone}`} role="status">
        {message}
        {payout !== null && (
          <span className="ormat-payout">
            {' '}You win $3 and pay ${chosen.length}: {payout >= 0 ? `+$${payout}` : `−$${-payout}`}.
          </span>
        )}
      </p>

      <div className="controls">
        <button type="button" className="button" onClick={deal}>
          New template
        </button>
        <button type="button" className="button" onClick={() => setChosen([])}>
          Clear
        </button>
        <button
          type="button"
          className="button"
          onClick={() => {
            setChosen([]);
            setClaimedNoSolution(true);
          }}
        >
          No solution
        </button>
        <button type="button" className="button" onClick={() => setRevealed(true)}>
          Show me
        </button>
      </div>

      {revealed && (
        <p className="info">
          {coverable
            ? `Minimum ${minimumCover(template)} overlay${
                minimumCover(template) === 1 ? '' : 's'
              }, ${coverCount(template)} way${
                coverCount(template) === 1 ? '' : 's'
              }: ${minimalCovers(template)
                .map((cover) => cover.map((i) => OVERLAY_LABELS[i]).join(' + '))
                .join(', or ')}.`
            : 'This template is not an ormat: no set of overlays covers it.'}
        </p>
      )}
    </div>
  );
}
