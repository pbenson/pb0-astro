import { useCallback, useEffect, useRef, useState } from 'react';
import Slider from '../ui/Slider';
import { useChartPalette } from '../shared/chartTokens';
import {
  advanceChain,
  leadTarget,
  scatter,
  THETA_INCREMENT,
  turnsToClose,
  type PathKind,
  type Point,
} from '../../utils/swarm';

/**
 * Drawn on a canvas rather than in SVG, unlike most of the sketches here.
 *
 * The picture is the accumulated smear of every segment ever drawn, not the
 * current positions — there is no scene to re-render, and an SVG would grow by
 * ninety elements a frame until it died. The trail *is* the retained canvas, and
 * the fade is a translucent rectangle painted over it. Never call clearRect in
 * the animation loop: that is the effect, not a leak.
 *
 * p5 would work and is already a dependency, but it buys nothing here — three
 * lines of canvas 2D are the whole mechanism — and it would cost a second
 * animation lifecycle to tear down.
 */

/** Fixed drawing surface. Displayed size is whatever the container allows. */
const RESOLUTION = 720;

/** Frames run in one go for a reader who has asked for no animation. */
const STATIC_FRAMES = 2600;

interface Params {
  followers: number;
  ease: number;
  /** 1-30, the sketch's alpha. Lower fades slower, so trails last longer. */
  fade: number;
  petalScalar: number;
  path: PathKind;
}

const DEFAULTS: Params = {
  followers: 90,
  ease: 0.5,
  fade: 3,
  petalScalar: 1.5,
  path: 'rose',
};

/** Mutable state of one run, kept out of React so a frame costs no re-render. */
interface Run {
  chain: Point[];
  previous: Point[];
  lead: Point;
  theta: number;
}

function startRun(followers: number): Run {
  const chain = scatter(followers);
  const [lead] = scatter(1);
  return { chain, previous: chain, lead, theta: 0 };
}

export default function Swarm() {
  const palette = useChartPalette();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runRef = useRef<Run>(startRun(DEFAULTS.followers));
  const paramsRef = useRef<Params>(DEFAULTS);

  const [params, setParams] = useState<Params>(DEFAULTS);
  const [running, setRunning] = useState(true);
  const [generation, setGeneration] = useState(0);

  // The loop reads parameters through a ref so that moving a slider does not
  // restart the animation — the chain keeps its positions and simply responds.
  paramsRef.current = params;

  const set = useCallback(<K extends keyof Params>(key: K, value: Params[K]) => {
    setParams((current) => ({ ...current, [key]: value }));
  }, []);

  /** Wipe the surface and scatter a fresh chain. */
  const restart = useCallback(() => {
    runRef.current = startRun(paramsRef.current.followers);
    setGeneration((g) => g + 1);
  }, []);

  // A changed follower count needs a new chain; everything else is live.
  useEffect(() => {
    runRef.current = startRun(params.followers);
    setGeneration((g) => g + 1);
  }, [params.followers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    // Repaint the ground on every restart and on a theme flip. Trails already
    // drawn carry the old ink, and fading them out gradually would leave the
    // wrong colour smeared under the new one for several seconds.
    context.fillStyle = palette.surface;
    context.fillRect(0, 0, RESOLUTION, RESOLUTION);

    const drawFrame = () => {
      const run = runRef.current;
      const { ease, fade, petalScalar, path } = paramsRef.current;

      context.fillStyle = palette.surface;
      context.globalAlpha = fade / 255;
      context.fillRect(0, 0, RESOLUTION, RESOLUTION);
      context.globalAlpha = 1;

      run.previous = run.chain;
      run.chain = advanceChain(run.chain, run.lead, ease);

      run.theta += THETA_INCREMENT;
      // The lead eases toward the curve rather than sitting on it, exactly as
      // the sketch does. It therefore lags, and the figure drawn is a softened,
      // slightly smaller rose than r = 0.9*cos(k*theta). Assigning the target
      // straight to run.lead gives a sharper, larger figure and a different
      // picture; the lag is the sketch's look and is kept on purpose.
      const target = leadTarget(path, run.theta, petalScalar);
      run.lead = {
        x: run.lead.x + (target.x - run.lead.x) * 0.1,
        y: run.lead.y + (target.y - run.lead.y) * 0.1,
      };

      context.strokeStyle = palette.distribution;
      context.lineWidth = 1;
      context.beginPath();
      for (let i = 0; i < run.chain.length; ++i) {
        const from = run.previous[i];
        const to = run.chain[i];
        context.moveTo(from.x * RESOLUTION, from.y * RESOLUTION);
        context.lineTo(to.x * RESOLUTION, to.y * RESOLUTION);
      }
      context.stroke();
    };

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      // Draw the finished figure in one go rather than animating toward it, so
      // the page still shows what it is about without anything moving.
      for (let i = 0; i < STATIC_FRAMES; ++i) drawFrame();
      return;
    }

    if (!running) return;

    let frame = requestAnimationFrame(function loop() {
      drawFrame();
      frame = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(frame);
  }, [running, generation, palette]);

  const turns = turnsToClose(params.petalScalar);

  return (
    <div className="swarm">
      <canvas
        ref={canvasRef}
        width={RESOLUTION}
        height={RESOLUTION}
        className="swarm-canvas"
        data-thumbnail
        role="img"
        aria-label={
          `A chain of ${params.followers} particles trailing a lead particle ` +
          (params.path === 'rose'
            ? `around a rose curve with petal scalar ${params.petalScalar}.`
            : 'around an ellipse.')
        }
      />

      <div className="controls">
        <button type="button" className="button" onClick={() => setRunning((r) => !r)}>
          {running ? 'Pause' : 'Run'}
        </button>
        <button type="button" className="button" onClick={restart}>
          Restart
        </button>
        <button
          type="button"
          className="button"
          onClick={() => set('path', params.path === 'rose' ? 'ellipse' : 'rose')}
        >
          {params.path === 'rose' ? 'Trace an ellipse' : 'Trace a rose'}
        </button>
      </div>

      <Slider
        label="Followers"
        sliderMin={5}
        sliderMax={200}
        stepSize={5}
        value={params.followers}
        onChange={(v) => set('followers', v)}
      />
      <Slider
        label="Slack"
        sliderMin={0}
        sliderMax={0.9}
        stepSize={0.05}
        value={params.ease}
        onChange={(v) => set('ease', v)}
        formatValue={(v) => v.toFixed(2)}
      />
      <Slider
        label="Trail persistence"
        sliderMin={1}
        sliderMax={30}
        value={params.fade}
        onChange={(v) => set('fade', v)}
        // The control reads as persistence but the number is the fade alpha, so
        // a bigger alpha means a shorter trail. Invert the readout rather than
        // the slider, which would put the sketch's own 3 at the far end.
        formatValue={(v) => `${(31 - v).toString()}`}
      />
      <Slider
        label="Petal scalar k"
        sliderMin={0.25}
        sliderMax={6}
        stepSize={0.25}
        value={params.petalScalar}
        onChange={(v) => set('petalScalar', v)}
        formatValue={(v) => v.toFixed(2)}
      />

      <p className="info">
        {params.path === 'rose' ? (
          <>
            r = 0.9·cos({params.petalScalar}·θ) — closes after {turns} full turn
            {turns === 1 ? '' : 's'} of θ.
          </>
        ) : (
          <>An ellipse, the sketch's other path.</>
        )}
      </p>
    </div>
  );
}
