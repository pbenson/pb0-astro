import React, { useEffect, useMemo, useRef, useState } from "react"

const CANVAS_SIZE = 720
const FRAMES_PER_DILATION = 120
const DIAGONAL = Math.sqrt(CANVAS_SIZE * CANVAS_SIZE + CANVAS_SIZE * CANVAS_SIZE)
const ORANGE = "#fc6600"
const SPIRAL_RED = "#7f0000"

const monoFont =
  "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace"

const t = {
  paperRaised: "var(--paper-raised)",
  ink: "var(--ink)",
  inkSecondary: "var(--ink-secondary)",
  gridTeal: "var(--grid-teal)",
  gridTealBg: "var(--grid-teal-bg)",
  rule: "var(--rule)",
}

interface CircleData {
  cx: number
  cy: number
  r: number
  fill: string
}

function computeReductionFactor(circlesPerRing: number): number {
  const beta = Math.PI / circlesPerRing
  const sinB = Math.sin(beta)
  const cosB = Math.cos(beta)
  const a = Math.pow(sinB, -2) - 1
  const b = -2.0 * (sinB + cosB / sinB)
  const c = cosB * cosB
  return (-b - Math.sqrt(b * b - 4 * a * c)) / (2.0 * a * sinB)
}

function computeCircles(
  circlesPerRing: number,
  scaling: number,
  dilationCount: number,
  showSpiral: boolean,
): CircleData[] {
  const beta = Math.PI / circlesPerRing
  const reductionFactor = computeReductionFactor(circlesPerRing)
  const ringRadius = 2 * (DIAGONAL / reductionFactor) * scaling
  let circleDiameter = 2 * Math.tan(beta) * ringRadius
  let circleCenterRadius = (1 / Math.cos(beta)) * ringRadius
  const circles: CircleData[] = []
  const center = CANVAS_SIZE / 2
  let cumulativeRotation = 0

  while (circleCenterRadius > 0.5) {
    for (let i = 0; i < circlesPerRing; i++) {
      const angle = cumulativeRotation + (i * 2 * Math.PI) / circlesPerRing
      const cx = center + circleCenterRadius * Math.cos(angle)
      const cy = center + circleCenterRadius * Math.sin(angle)
      const r = circleDiameter / 2
      const isPartOfSpiral = showSpiral && i === dilationCount % circlesPerRing
      circles.push({ cx, cy, r, fill: isPartOfSpiral ? SPIRAL_RED : ORANGE })
    }
    cumulativeRotation += Math.PI / circlesPerRing
    circleDiameter *= reductionFactor
    circleCenterRadius *= reductionFactor
  }

  return circles
}

export default function RingsOfCircles() {
  const [circlesPerRing, setCirclesPerRing] = useState(6)
  const [showSpiral, setShowSpiral] = useState(false)
  const [animateDilation, setAnimateDilation] = useState(false)
  const [scaling, setScaling] = useState(1)

  const animFrameRef = useRef<number>(0)
  const frameCountRef = useRef(0)
  const dilationCountRef = useRef(0)

  // Animation loop
  useEffect(() => {
    if (!animateDilation) {
      frameCountRef.current = 0
      dilationCountRef.current = 0
      setScaling(1)
      return
    }

    const reductionFactor = computeReductionFactor(circlesPerRing)

    const tick = () => {
      frameCountRef.current++
      const framesFromStartOfCycle =
        frameCountRef.current % FRAMES_PER_DILATION
      if (framesFromStartOfCycle === 0) {
        dilationCountRef.current++
      }
      const newScaling = Math.pow(
        1.0 / reductionFactor,
        (2.0 * framesFromStartOfCycle) / FRAMES_PER_DILATION,
      )
      setScaling(newScaling)
      animFrameRef.current = requestAnimationFrame(tick)
    }

    animFrameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [animateDilation, circlesPerRing])

  const circles = useMemo(
    () =>
      computeCircles(
        circlesPerRing,
        scaling,
        dilationCountRef.current,
        showSpiral,
      ),
    [circlesPerRing, scaling, showSpiral],
  )

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

  const toggleBase: React.CSSProperties = {
    height: 36,
    padding: "0 18px",
    borderRadius: 4,
    cursor: "pointer",
    fontFamily: monoFont,
    fontWeight: 600,
    fontSize: 13,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    transition: "background 0.1s, border-color 0.1s",
  }

  const toggleOff: React.CSSProperties = {
    ...toggleBase,
    background: t.paperRaised,
    color: t.ink,
    border: `1px solid ${t.rule}`,
  }

  const toggleOn: React.CSSProperties = {
    ...toggleBase,
    background: t.gridTealBg,
    color: t.gridTeal,
    border: `1px solid ${t.gridTeal}`,
  }

  return (
    <>
      <style>{`
        .roc-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px; height: 16px; border-radius: 50%;
          background: var(--grid-teal); border: none; cursor: pointer;
          margin-top: -6px;
        }
        .roc-slider::-moz-range-thumb {
          width: 16px; height: 16px; border-radius: 50%;
          background: var(--grid-teal); border: none; cursor: pointer;
        }
        .roc-slider::-webkit-slider-runnable-track {
          height: 4px; border-radius: 2px; background: var(--rule);
        }
        .roc-slider::-moz-range-track {
          height: 4px; border-radius: 2px; background: var(--rule);
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 16 }}>
        <div>
          <span style={labelStyle}>circles per ring</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input
              type="range"
              className="roc-slider"
              min={3}
              max={60}
              value={circlesPerRing}
              onChange={(e) => setCirclesPerRing(Number(e.target.value))}
              style={{
                flex: 1,
                WebkitAppearance: "none",
                appearance: "none" as never,
                background: "transparent",
                cursor: "pointer",
              }}
              aria-label="Circles per ring"
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
              {circlesPerRing}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <div
            role="button"
            tabIndex={0}
            style={showSpiral ? toggleOn : toggleOff}
            onClick={() => setShowSpiral(!showSpiral)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                setShowSpiral(!showSpiral)
              }
            }}
            aria-pressed={showSpiral}
          >
            Show spiral
          </div>
          <div
            role="button"
            tabIndex={0}
            style={animateDilation ? toggleOn : toggleOff}
            onClick={() => setAnimateDilation(!animateDilation)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                setAnimateDilation(!animateDilation)
              }
            }}
            aria-pressed={animateDilation}
          >
            Animate dilation
          </div>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
        width="100%"
        style={{ maxWidth: "720px", display: "block", margin: "0 auto" }}
      >
        <rect width={CANVAS_SIZE} height={CANVAS_SIZE} style={{ fill: "var(--paper)" }} />
        {circles.map((c, i) => (
          <circle key={i} cx={c.cx} cy={c.cy} r={c.r} fill={c.fill} />
        ))}
      </svg>
    </>
  )
}
