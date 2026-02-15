import { useEffect, useMemo, useRef, useState } from "react"
import { bgColor, onDarkModeChange } from "../../utils/darkMode"
import Slider from "../ui/Slider"

const CANVAS_SIZE = 720
const FRAMES_PER_DILATION = 120
const DIAGONAL = Math.sqrt(CANVAS_SIZE * CANVAS_SIZE + CANVAS_SIZE * CANVAS_SIZE)
const ORANGE = "#fc6600"
const SPIRAL_RED = "#7f0000"

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
  const [bg, setBg] = useState(() =>
    typeof document !== "undefined" ? bgColor() : "#1a1a1a",
  )

  const animFrameRef = useRef<number>(0)
  const frameCountRef = useRef(0)
  const dilationCountRef = useRef(0)

  // Subscribe to dark mode changes
  useEffect(() => {
    setBg(bgColor())
    return onDarkModeChange(() => setBg(bgColor()))
  }, [])

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

  return (
    <>
      <div className="center">
        <Slider
          label="Circles per ring"
          sliderMin={3}
          sliderMax={60}
          initialValue={circlesPerRing}
          onChange={(value: number) => setCirclesPerRing(value)}
        />

        <label
          htmlFor="roc-show-spiral"
          style={{ marginRight: "1rem", cursor: "pointer" }}
        >
          <input
            id="roc-show-spiral"
            type="checkbox"
            checked={showSpiral}
            onChange={() => setShowSpiral(!showSpiral)}
          />{" "}
          Show spiral
        </label>

        <label htmlFor="roc-animate-dilation" style={{ cursor: "pointer" }}>
          <input
            id="roc-animate-dilation"
            type="checkbox"
            checked={animateDilation}
            onChange={() => setAnimateDilation(!animateDilation)}
          />{" "}
          Animate dilation
        </label>
      </div>

      <svg
        viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
        width="100%"
        style={{ maxWidth: "720px", display: "block", margin: "0 auto" }}
      >
        <rect width={CANVAS_SIZE} height={CANVAS_SIZE} fill={bg} />
        {circles.map((c, i) => (
          <circle key={i} cx={c.cx} cy={c.cy} r={c.r} fill={c.fill} />
        ))}
      </svg>
    </>
  )
}
