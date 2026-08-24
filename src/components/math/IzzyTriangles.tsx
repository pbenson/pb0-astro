import { useCallback, useEffect, useRef, useState } from "react"
import Slider from "../ui/Slider"
import { useChartPalette } from "../shared/chartTokens"
import {
  canonical,
  COLOURING_COUNT,
  isDistinct,
  LAST_COLOURING,
} from "./izzyLogic"

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

/**
 * Frames per second the slider can select. The slowest is a quarter of the
 * original fixed rate of 2/s and is the default: at 2/s the run was over
 * before a reader could take in which pattern had just appeared.
 */
const SPEEDS: readonly number[] = [0.5, 1, 2, 4]
const SPEED_LABELS = ['\u00bc\u00d7', '\u00bd\u00d7', '1\u00d7', '2\u00d7']
const DEFAULT_SPEED_INDEX = 0

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
  const [progress, setProgress] = useState(0)
  // p5 arrives through a dynamic import. Until it lands there is nothing to
  // drive, and a click would be swallowed in silence.
  const [ready, setReady] = useState(false)
  // The chosen speed lives here, not only in the sketch: p5 arrives through a
  // dynamic import, so a slider moved before it resolves would otherwise write
  // to nothing and the choice would be silently lost.
  const speedRef = useRef(SPEEDS[DEFAULT_SPEED_INDEX])

  // The sketch outlives any one render, so it reads the palette through a ref
  // rather than closing over the value it was built with.
  const palette = useChartPalette()
  const paletteRef = useRef(palette)
  paletteRef.current = palette

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
        let speed = SPEEDS[DEFAULT_SPEED_INDEX]
        /** Gallery slot holding the orbit representative of a repeat, or -1. */
        let matchedSlot = -1

        // The sketch owns the animation; React owns the button. These two hooks
        // are the whole of the traffic between them.
        sketchRef.current = {
          start() {
            colouring = 0
            distinct = []
            matchedSlot = -1
            running = true
            p5.frameRate(speed)
            p5.loop()
          },
          stop() {
            running = false
            p5.noLoop()
          },
          setSpeed(fps: number) {
            // Only while running. Calling p5.frameRate() on a stopped sketch
            // leaves it stopped, and the following p5.loop() does not revive
            // it — the run then sits at frame zero forever.
            speed = fps
            if (running) p5.frameRate(fps)
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
              if (slot === matchedSlot) {
                // The colouring on the stage is a turn of this one. Ring it so
                // the repeat is visibly a repeat OF something, not just a miss.
                p5.push()
                p5.noFill()
                p5.stroke(paletteRef.current.positive)
                p5.strokeWeight(2.5)
                p5.circle(cx, cy, radius * 2.1)
                p5.pop()
              }
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
          p5.frameRate(speed)
          p5.noLoop() // idle until the button says otherwise
        }

        p5.draw = () => {
          // Record before painting. The gallery is drawn from `distinct`, so a
          // colouring added after the paint is only shown by the NEXT frame —
          // and the last colouring, 63, has no next frame: it stops the loop.
          // That left the 24th slot permanently empty.
          if (running) {
            if (isDistinct(colouring)) {
              if (distinct.length < DISTINCT_TOTAL) distinct.push(colouring)
              matchedSlot = -1
            } else {
              matchedSlot = distinct.indexOf(canonical(colouring))
            }
          }

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

          setProgress(colouring + 1)

          if (colouring >= LAST_COLOURING) {
            running = false
            matchedSlot = -1
            p5.noLoop()
            setCounting(false)
            return
          }
          ++colouring
        }
      }

      instance = new p5.default(sketch, canvasRef.current ?? undefined)
      setReady(true)
    })

    return () => {
      cancelled = true
      setReady(false)
      sketchRef.current = null
      instance?.remove()
    }
  }, [showGallery])

  const startCounting = useCallback(() => {
    if (!sketchRef.current) return
    setProgress(0)
    setCounting(true)
    sketchRef.current.setSpeed(speedRef.current)
    sketchRef.current.start()
  }, [])

  const changeSpeed = useCallback((index: number) => {
    speedRef.current = SPEEDS[index] ?? SPEEDS[DEFAULT_SPEED_INDEX]
    sketchRef.current?.setSpeed(speedRef.current)
  }, [])

  return (
    <div>
      <div className="controls">
        <button
          type="button"
          className="button"
          onClick={startCounting}
          disabled={counting || !ready}
        >
          {/* A full pass is over two minutes at the slowest speed, so the
              button carries progress rather than a bare "Counting…". */}
          {counting ? `Counting… ${progress}/${COLOURING_COUNT}` : 'Count'}
        </button>
        <Slider
          label="Speed"
          sliderMin={0}
          sliderMax={SPEEDS.length - 1}
          initialValue={DEFAULT_SPEED_INDEX}
          onChange={changeSpeed}
          formatValue={(index) => SPEED_LABELS[index] ?? ''}
        />
      </div>
      <div ref={canvasRef} />
    </div>
  )
}
