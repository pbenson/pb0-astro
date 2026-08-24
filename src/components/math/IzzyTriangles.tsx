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
  showUniqueCount?: boolean
}

export default function IzzyTriangles({ showUniqueCount = false }: IzzyProps) {
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
        let distinctSoFar = 0
        let running = false

        // The sketch owns the animation; React owns the button. These two hooks
        // are the whole of the traffic between them.
        sketchRef.current = {
          start() {
            colouring = 0
            distinctSoFar = 0
            running = true
            p5.loop()
          },
          stop() {
            running = false
            p5.noLoop()
          },
        }

        p5.setup = () => {
          p5.createCanvas(480, 480)
          p5.frameRate(2)
          p5.noLoop() // idle until the button says otherwise
        }

        p5.draw = () => {
          // Nothing else clears the canvas, and the triangle only repaints its
          // own area — without this the tally digits pile up on each other.
          p5.clear()
          p5.translate(p5.width / 2, p5.height * 0.6)
          p5.scale(1, -1)
          p5.noStroke()

          let remaining = colouring
          triangles.forEach((triangle) => {
            const tri = triangle.scale(p5.width * 0.4)
            const [p0, p1, p2] = tri.vertices

            p5.fill(remaining % 2 === 0 ? 255 : 0)
            p5.triangle(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y)

            p5.noFill()
            p5.stroke(127, 20)
            remaining = Math.floor(remaining / 2)
          })

          if (running && isDistinct(colouring)) ++distinctSoFar

          if (showUniqueCount) {
            // Drawn every frame, not only on the distinct ones, so the tally
            // stays legible while a repeat is on screen.
            const label = '' + distinctSoFar
            p5.textSize(32)
            p5.fill(128)
            p5.scale(1, -1)
            p5.text(label, -p5.textWidth(label) / 2, p5.height * 0.1)
          }

          if (!running) return

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
  }, [showUniqueCount])

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
