import { useMemo, useState } from 'react';
import Slider from '../ui/Slider';
import { useChartPalette } from '../shared/chartTokens';
import { MAX_LEVEL, PHI, tiling } from '../../utils/penrose';

const SIZE = 620;
const PAD = 8;

export default function PenroseP3() {
  const palette = useChartPalette();
  const [level, setLevel] = useState(3);
  const [filled, setFilled] = useState(true);

  // Every level is rebuilt from scratch, so memoise: level 6 walks 7,105 edges
  // and traverses every face, which is not something to redo on a repaint.
  const figure = useMemo(() => tiling(level), [level]);

  const { bounds } = figure;
  const span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  const scale = (SIZE - PAD * 2) / span;
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  const sx = (x: number) => SIZE / 2 + (x - cx) * scale;
  // SVG y grows downward; flipping here keeps the figure the way the turtle
  // drew it rather than mirrored.
  const sy = (y: number) => SIZE / 2 - (y - cy) * scale;

  const ratio = figure.thin === 0 ? null : figure.thick / figure.thin;

  return (
    <div className="penrose">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="penrose-figure"
        data-thumbnail
        role="img"
        aria-label={
          `A Penrose rhombus tiling at inflation level ${level}: ` +
          `${figure.thick} thick tiles and ${figure.thin} thin ones.`
        }
      >
        {figure.rhombi.map((rhombus, i) => (
          <polygon
            key={i}
            points={rhombus.points.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ')}
            fill={
              filled
                ? rhombus.kind === 'thick'
                  ? palette.distribution
                  : palette.positive
                : 'none'
            }
            fillOpacity={filled ? 0.55 : 0}
            stroke={palette.inkSecondary}
            strokeWidth={level > 4 ? 0.4 : 0.8}
            strokeLinejoin="round"
            data-kind={rhombus.kind}
          />
        ))}
      </svg>

      <div className="controls">
        <button type="button" className="button" onClick={() => setFilled((f) => !f)}>
          {filled ? 'Outlines only' : 'Fill the tiles'}
        </button>
      </div>

      <Slider
        label="Inflation level"
        sliderMin={0}
        sliderMax={MAX_LEVEL}
        value={level}
        onChange={setLevel}
      />

      <p className="info">
        {figure.rhombi.length.toLocaleString()} tiles ·{' '}
        <span style={{ color: palette.distribution }}>{figure.thick.toLocaleString()} thick</span>{' '}
        ·{' '}
        <span style={{ color: palette.positive }}>{figure.thin.toLocaleString()} thin</span>
        {ratio !== null && (
          <>
            {' '}· thick ÷ thin = {ratio.toFixed(4)}, against φ = {PHI.toFixed(4)}
          </>
        )}
      </p>
    </div>
  );
}
