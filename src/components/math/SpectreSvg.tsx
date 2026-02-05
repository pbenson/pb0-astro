import { useState, useRef, useCallback, useEffect } from "react"

const SIDE_LENGTH = 100
const CONTROL_DIAMETER = 12
const STROKE_WIDTH = 2

// Rotation at each vertex as multiples of π/6
const turnMultiplesOfPiSixths = [-2, 3, -2, -3, -2, 3, -2, 0, -2, -3, 2, -3, 2, -3]

interface Point {
  x: number
  y: number
}

// Compute all vertices of the spectre shape
function computeVertices(): Point[] {
  const vertices: Point[] = [{ x: 0, y: 0 }]
  let angle = 0
  let x = 0
  let y = 0

  for (let i = 0; i < turnMultiplesOfPiSixths.length; i++) {
    // Move along current direction
    x += SIDE_LENGTH * Math.cos(angle)
    y += SIDE_LENGTH * Math.sin(angle)
    vertices.push({ x, y })

    // Rotate for next edge
    angle += (turnMultiplesOfPiSixths[i] * Math.PI) / 6
  }

  return vertices
}

// Transform control point based on edge direction and flip state
function transformControlPoint(
  cp: Point,
  start: Point,
  end: Point,
  flipped: boolean
): Point {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const len = Math.sqrt(dx * dx + dy * dy)
  const ux = dx / len // unit vector along edge
  const uy = dy / len
  const nx = -uy // normal vector (perpendicular)
  const ny = ux

  // cp is in "canonical" coordinates where edge goes from (0,0) to (SIDE_LENGTH, 0)
  // Transform to actual edge position
  let localX = cp.x
  let localY = cp.y

  if (flipped) {
    localX = SIDE_LENGTH - cp.x
    localY = -cp.y
  }

  return {
    x: start.x + (localX / SIDE_LENGTH) * dx + (localY / SIDE_LENGTH) * (nx * len),
    y: start.y + (localX / SIDE_LENGTH) * dy + (localY / SIDE_LENGTH) * (ny * len),
  }
}

// Inverse transform: from world coordinates back to canonical edge coordinates
function inverseTransformControlPoint(
  world: Point,
  start: Point,
  end: Point,
  flipped: boolean
): Point {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const len = Math.sqrt(dx * dx + dy * dy)

  // Vector from start to world point
  const wx = world.x - start.x
  const wy = world.y - start.y

  // Project onto edge direction and normal
  const ux = dx / len
  const uy = dy / len
  const nx = -uy
  const ny = ux

  let localX = (wx * ux + wy * uy) * (SIDE_LENGTH / len)
  let localY = (wx * nx + wy * ny) * (SIDE_LENGTH / len)

  if (flipped) {
    localX = SIDE_LENGTH - localX
    localY = -localY
  }

  return { x: localX, y: localY }
}

export default function SpectreSvg() {
  const svgRef = useRef<SVGSVGElement>(null)
  // Default positions on the line = no curvature (straight edges)
  const [cp1, setCp1] = useState<Point>({ x: SIDE_LENGTH / 3, y: 0 })
  const [cp2, setCp2] = useState<Point>({ x: (2 * SIDE_LENGTH) / 3, y: 0 })
  const [dragging, setDragging] = useState<'cp1' | 'cp2' | null>(null)

  const vertices = computeVertices()

  // Get control point positions in world coords for bounds calculation
  const firstStart = vertices[0]
  const firstEnd = vertices[1]
  const worldCp1 = transformControlPoint(cp1, firstStart, firstEnd, false)
  const worldCp2 = transformControlPoint(cp2, firstStart, firstEnd, false)

  // Include control points in bounds calculation
  const allPoints = [...vertices, worldCp1, worldCp2]
  const minX = Math.min(...allPoints.map(v => v.x))
  const maxX = Math.max(...allPoints.map(v => v.x))
  const minY = Math.min(...allPoints.map(v => v.y))
  const maxY = Math.max(...allPoints.map(v => v.y))
  const padding = 30
  const width = maxX - minX + padding * 2
  const height = maxY - minY + padding * 2
  const offsetX = -minX + padding
  const offsetY = -minY + padding

  const getMousePos = useCallback((e: React.MouseEvent | MouseEvent): Point => {
    if (!svgRef.current) return { x: 0, y: 0 }
    const rect = svgRef.current.getBoundingClientRect()
    const scaleX = width / rect.width
    const scaleY = height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX - offsetX,
      y: (e.clientY - rect.top) * scaleY - offsetY,
    }
  }, [width, height, offsetX, offsetY])

  const handleMouseDown = useCallback((e: React.MouseEvent, which: 'cp1' | 'cp2') => {
    e.preventDefault()
    setDragging(which)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return
    const pos = getMousePos(e)

    // First edge: from vertices[0] to vertices[1], not flipped
    const start = vertices[0]
    const end = vertices[1]
    const localPos = inverseTransformControlPoint(pos, start, end, false)

    if (dragging === 'cp1') {
      setCp1(localPos)
    } else {
      setCp2(localPos)
    }
  }, [dragging, getMousePos, vertices])

  const handleMouseUp = useCallback(() => {
    setDragging(null)
  }, [])

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [dragging, handleMouseMove, handleMouseUp])

  // Build the path
  let pathD = `M ${vertices[0].x + offsetX} ${vertices[0].y + offsetY}`
  let flipped = false

  for (let i = 0; i < turnMultiplesOfPiSixths.length; i++) {
    const start = vertices[i]
    const end = vertices[i + 1]

    // When flipped, swap cp1 and cp2 (in addition to mirroring done in transformControlPoint)
    const firstCp = flipped ? cp2 : cp1
    const secondCp = flipped ? cp1 : cp2

    const worldCp1 = transformControlPoint(firstCp, start, end, flipped)
    const worldCp2 = transformControlPoint(secondCp, start, end, flipped)

    pathD += ` C ${worldCp1.x + offsetX} ${worldCp1.y + offsetY}, ${worldCp2.x + offsetX} ${worldCp2.y + offsetY}, ${end.x + offsetX} ${end.y + offsetY}`

    flipped = !flipped
  }

  pathD += ' Z'

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', maxWidth: 600, maxHeight: 500, cursor: dragging ? 'grabbing' : 'default' }}
    >
      {/* Main shape */}
      <path
        d={pathD}
        fill="rgba(255, 200, 100, 0.3)"
        stroke="rgb(255, 127, 0)"
        strokeWidth={STROKE_WIDTH}
      />

      {/* Control point 1 handle line */}
      <line
        x1={firstStart.x + offsetX}
        y1={firstStart.y + offsetY}
        x2={worldCp1.x + offsetX}
        y2={worldCp1.y + offsetY}
        stroke="rgba(255, 0, 0, 0.5)"
        strokeWidth={1}
      />

      {/* Control point 2 handle line */}
      <line
        x1={firstEnd.x + offsetX}
        y1={firstEnd.y + offsetY}
        x2={worldCp2.x + offsetX}
        y2={worldCp2.y + offsetY}
        stroke="rgba(0, 0, 255, 0.5)"
        strokeWidth={1}
      />

      {/* Control point 1 */}
      <circle
        cx={worldCp1.x + offsetX}
        cy={worldCp1.y + offsetY}
        r={CONTROL_DIAMETER / 2}
        fill="rgba(255, 0, 0, 0.3)"
        stroke="rgba(255, 0, 0, 0.8)"
        strokeWidth={1}
        style={{ cursor: 'grab' }}
        onMouseDown={(e) => handleMouseDown(e, 'cp1')}
      />

      {/* Control point 2 */}
      <circle
        cx={worldCp2.x + offsetX}
        cy={worldCp2.y + offsetY}
        r={CONTROL_DIAMETER / 2}
        fill="rgba(0, 0, 255, 0.3)"
        stroke="rgba(0, 0, 255, 0.8)"
        strokeWidth={1}
        style={{ cursor: 'grab' }}
        onMouseDown={(e) => handleMouseDown(e, 'cp2')}
      />
    </svg>
  )
}
