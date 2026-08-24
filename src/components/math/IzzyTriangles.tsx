import { useCallback, useEffect, useRef, useState } from "react"

class Point {
  x: number
  y: number
  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  rotate(angle: number) {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    return new Point(this.x * cos - this.y * sin, this.x * sin + this.y * cos)
  }
}

class Triangle {
  vertices: Point[]
  constructor(vertices: Point[]) {
    this.vertices = vertices
  }

  scale(factor: number) {
    return new Triangle(this.vertices.map(v => new Point(v.x * factor, v.y * factor)))
  }
}

const origin = new Point(0, 0)
const tipN = new Point(0, 1)
const thirdCircle = -2 * Math.PI / 3
const tipSE = tipN.rotate(thirdCircle)
const tipSW = tipSE.rotate(thirdCircle)
const mid = new Point(0.25 * Math.sqrt(3), 0.25)

const triangles = [
  new Triangle([origin, mid, tipN]),
  new Triangle([origin, mid, tipSE]),
  new Triangle([origin, mid.rotate(thirdCircle), tipSE]),
  new Triangle([origin, mid.rotate(thirdCircle), tipSW]),
  new Triangle([origin, mid.rotate(2 * thirdCircle), tipSW]),
  new Triangle([origin, mid.rotate(2 * thirdCircle), tipN]),
]

/** All six segments black: the last of the 64 colourings, and the 24th distinct one. */
const LAST_COLOURING = 63

/** A colouring is distinct if no third-of-a-turn rotation of it comes out smaller. */
function isDistinct(colouring: number) {
  let rotated = colouring
  for (let i = 0; i < 3; ++i) {
    rotated = Math.floor(rotated / 4) + (rotated % 4) * 16
    if (rotated < colouring) return false
  }
  return true
}

interface IzzyProps {
  /**
   * Show the gallery of distinct colourings beside the animation. Off for a
   * bare triangle, on for the enumeration.
   */
  showGallery?: boolean
}

/** The 24 distinct colourings lay out as four columns of six. */
const GALLERY_COLUMNS = 4
const GALLERY_ROWS = 6
const DISTINCT_TOTAL = GALLERY_COLUMNS * GALLERY_ROWS

export default function IzzyTriangles({ showGallery = false }: IzzyProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const sketchRef = useRef<any>(null)
  const [counting, setCounting] = useState(false)

  useEffect(() => {
    let instance: any = null
    let cancelled = false

    import('p5').then(p5 => {
      if (cancelled) return

      const sketch = (p5: any) => {
        let colouring = 0
        /** The distinct colourings found so far, in the order they turned up. */
        let distinct: number[] = []
        let running = false
        let width = 480
        let sideBySide = true

        // The sketch owns the animation; React owns the button. These two hooks
        // are the whole of the traffic between them.
        sketchRef.current = {
          start() {
            colouring = 0
            distinct = []
            running = true
            p5.loop()
          },
          stop() {
            running = false
            p5.noLoop()
          },
        }

        /** One colouring, drawn as six wedges around (cx, cy). */
        const paintColouring = (colouring: number, cx: number, cy: number, radius: number) => {
          p5.push()
          p5.translate(cx, cy)
          // The triangle geometry is defined with y pointing up.
          p5.scale(1, -1)
          p5.stroke(127, 90)
          p5.strokeWeight(1)

          let remaining = colouring
          for (const triangle of triangles) {
            const [p0, p1, p2] = triangle.scale(radius).vertices
            // Bit set means a black wedge; the hairline keeps a white wedge
            // visible against cream paper and a black one against slate.
            p5.fill(remaining % 2 === 0 ? 255 : 0)
            p5.triangle(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y)
            remaining = Math.floor(remaining / 2)
          }
          p5.pop()
        }

        /**
         * The tally, as a filling grid rather than a number: each distinct
         * colouring takes the next of 24 slots, so the picture shows which
         * patterns have turned up, not merely how many.
         */
        const paintGallery = (x: number, y: number, width: number, height: number) => {
          const cellW = width / GALLERY_COLUMNS
          const cellH = height / GALLERY_ROWS
          const radius = Math.min(cellW, cellH) * 0.44

          for (let slot = 0; slot < DISTINCT_TOTAL; ++slot) {
            const cx = x + (slot % GALLERY_COLUMNS + 0.5) * cellW
            const cy = y + (Math.floor(slot / GALLERY_COLUMNS) + 0.5) * cellH

            if (slot < distinct.length) {
              paintColouring(distinct[slot], cx, cy, radius)
            } else {
              // An empty slot still shows: the grid is a progress bar.
              p5.push()
              p5.noFill()
              p5.stroke(127, 45)
              p5.strokeWeight(1)
              p5.circle(cx, cy, radius * 1.5)
              p5.pop()
            }
          }
        }

        p5.setup = () => {
          const available = canvasRef.current?.offsetWidth ?? 480
          width = showGallery ? Math.max(360, Math.min(available, 880)) : 480
          sideBySide = showGallery && width >= 700
          // Stacked, the triangle needs less room above the gallery than it
          // gets side by side, where it shares the height with six rows.
          p5.createCanvas(width, showGallery && !sideBySide ? 820 : 480)
          p5.frameRate(2)
          p5.noLoop() // idle until the button says otherwise
        }

        p5.draw = () => {
          // Nothing else clears the canvas, and each colouring only repaints
          // its own wedges — without this they pile up on each other.
          p5.clear()

          const stageW = showGallery && sideBySide ? width * 0.52 : width
          paintColouring(
            colouring,
            stageW / 2,
            showGallery && !sideBySide ? 200 : 288,
            Math.min(stageW, 480) * 0.4,
          )

          if (showGallery) {
            if (sideBySide) {
              paintGallery(stageW, 40, width - stageW, 400)
            } else {
              paintGallery(0, 380, width, 430)
            }
          }

          if (!running) return

          if (isDistinct(colouring) && distinct.length < DISTINCT_TOTAL) {
            distinct.push(colouring)
          }

          if (colouring >= LAST_COLOURING) {
            running = false
            p5.noLoop()
            setCounting(false)
            return
          }
          ++colouring
        }
      }

      instance = new p5.default(sketch, canvasRef.current ?? undefined)
    })

    return () => {
      cancelled = true
      sketchRef.current = null
      instance?.remove()
    }
  }, [showGallery])

  const startCounting = useCallback(() => {
    if (!sketchRef.current) return
    setCounting(true)
    sketchRef.current.start()
  }, [])

  return (
    <div>
      <div className="controls">
        <button type="button" className="button" onClick={startCounting} disabled={counting}>
          {counting ? 'Counting…' : 'Count'}
        </button>
      </div>
      <div ref={canvasRef} />
    </div>
  )
}
