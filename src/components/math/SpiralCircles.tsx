import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"

const CANVAS_SIZE = 720
const LERP_SPEED = 0.08
const SNAP_THRESHOLD = 0.005

const thetas = [
  NaN, NaN, NaN,
  2.2370357592, 1.690740556088, 1.346225635485, 1.114714132, 0.9497695138815,
  0.8267295394, 0.73160150059, 0.6559358759532, 0.594354841077, 0.5432826604,
  0.50025345048, 0.46351357846, 0.4317828209, 0.404105253357, 0.379752938,
  0.3581620132, 0.33888899, 0.321580343
]

const r = [
  NaN, NaN, NaN,
  0.346014339243348, 0.616038496178049, 0.754085616915337, 0.830528365033698,
  0.876606597342786, 0.906331406145771, 0.926555137302952, 0.940909350392327,
  0.951452388985578, 0.959417498553245, 0.965578489553767, 0.970440119116661,
  0.974342694038705, 0.97752224708866, 0.980146602245517, 0.982337628655265,
  0.984185581045006, 0.985758410809943
]

const monoFont =
  "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace"

const t = {
  ink: "var(--ink)",
  inkSecondary: "var(--ink-secondary)",
  gridTeal: "var(--grid-teal)",
  rule: "var(--rule)",
}

interface CircleData {
  cx: number
  cy: number
  r: number
}

function lerpLookup(table: number[], n: number): number {
  const lo = Math.floor(n)
  const hi = Math.ceil(n)
  if (lo === hi) return table[lo]
  const frac = n - lo
  return table[lo] * (1 - frac) + table[hi] * frac
}

function computeCircles(n: number): CircleData[] {
  const theta = lerpLookup(thetas, n)
  const radiusScalar = lerpLookup(r, n)
  const center = CANVAS_SIZE / 2
  const pixelsPerUnit = CANVAS_SIZE * 3
  const distanceBetweenCentersScalar = Math.sqrt(
    (1 - radiusScalar * Math.cos(theta)) ** 2 +
    (radiusScalar * Math.sin(theta)) ** 2
  )

  const circles: CircleData[] = []
  let radius = pixelsPerUnit
  let circleDiameter = (2 * radius * distanceBetweenCentersScalar) / (1 + radiusScalar)
  let angle = 0

  while (circleDiameter > 0.5) {
    circles.push({
      cx: center + radius * Math.cos(angle),
      cy: center - radius * Math.sin(angle),
      r: circleDiameter / 2,
    })
    angle += theta
    radius *= radiusScalar
    circleDiameter *= radiusScalar
  }

  return circles
}

export default function SpiralCircles() {
  const [target, setTarget] = useState(6)
  const [animated, setAnimated] = useState(6)
  const animatedRef = useRef(6)
  const rafRef = useRef(0)

  const animate = useCallback(() => {
    const current = animatedRef.current
    const goal = target
    const diff = goal - current

    if (Math.abs(diff) < SNAP_THRESHOLD) {
      animatedRef.current = goal
      setAnimated(goal)
      return
    }

    animatedRef.current = current + diff * LERP_SPEED
    setAnimated(animatedRef.current)
    rafRef.current = requestAnimationFrame(animate)
  }, [target])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [animate])

  const circles = useMemo(() => computeCircles(animated), [animated])

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: t.inkSecondary,
    marginBottom: "6px",
    fontFamily: monoFont,
  }

  return (
    <div>
      <style>{`
        .sc-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px; height: 16px; border-radius: 50%;
          background: var(--grid-teal); border: none; cursor: pointer;
          margin-top: -6px;
        }
        .sc-slider::-moz-range-thumb {
          width: 16px; height: 16px; border-radius: 50%;
          background: var(--grid-teal); border: none; cursor: pointer;
        }
        .sc-slider::-webkit-slider-runnable-track {
          height: 4px; border-radius: 2px; background: var(--rule);
        }
        .sc-slider::-moz-range-track {
          height: 4px; border-radius: 2px; background: var(--rule);
        }
      `}</style>

      <div style={{ marginBottom: 16 }}>
        <span style={labelStyle}>circles per revolution</span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input
            type="range"
            className="sc-slider"
            min={3}
            max={20}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            style={{
              flex: 1,
              WebkitAppearance: "none",
              appearance: "none" as never,
              background: "transparent",
              cursor: "pointer",
            }}
            aria-label="Circles per revolution"
          />
          <span
            style={{
              fontFamily: monoFont,
              fontWeight: 700,
              fontSize: 16,
              color: t.ink,
              minWidth: 28,
              textAlign: "right",
            }}
          >
            {target}
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
        width="100%"
        style={{ maxWidth: "720px", display: "block", margin: "0 auto" }}
      >
        <rect width={CANVAS_SIZE} height={CANVAS_SIZE} style={{ fill: "var(--paper)" }} />
        {circles.map((c, i) => (
          <circle
            key={i}
            cx={c.cx}
            cy={c.cy}
            r={c.r}
            fill="rgba(0, 100, 240, 0.59)"
          />
        ))}
      </svg>
    </div>
  )
}
