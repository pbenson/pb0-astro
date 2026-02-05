import { useEffect, useRef } from "react"

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

interface IzzyProps {
  showUniqueCount?: boolean
}

export default function IzzyTriangles({ showUniqueCount = false }: IzzyProps) {
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    import('p5').then(p5 => {
      const sketch = (p5: any) => {
        let izzyNumber = 0
        let uniqueCombinations = 0
        const outerTriSideLength = p5.width * 0.4

        p5.setup = () => {
          p5.createCanvas(480, 480)
          p5.frameRate(2)
        }

        p5.draw = () => {
          if (izzyNumber > 63) izzyNumber = 0

          p5.translate(p5.width / 2, p5.height * 0.6)
          p5.scale(1, -1)
          p5.noStroke()

          let izzyCopy = izzyNumber
          p5.fill(255, 0, 0)
          p5.ellipse(0, 0, 5, 5)

          triangles.forEach((triangle) => {
            const tri = triangle.scale(p5.width * 0.4)
            const p0 = tri.vertices[0]
            const p1 = tri.vertices[1]
            const p2 = tri.vertices[2]

            p5.fill(izzyCopy % 2 === 0 ? 255 : 0)
            p5.triangle(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y)

            p5.noFill()
            p5.stroke(127, 20)
            izzyCopy = Math.floor(izzyCopy / 2)
          })

          if (showUniqueCount) {
            let testNumber = izzyNumber
            let isNew = true
            for (let i = 0; i < 3; ++i) {
              testNumber = Math.floor(testNumber / 4) + (testNumber % 4) * 16
              if (testNumber < izzyNumber) isNew = false
            }
            if (isNew) {
              ++uniqueCombinations
              p5.textSize(32)
              p5.fill(128)
              p5.scale(1, -1)
              p5.text('' + uniqueCombinations, -p5.textWidth('' + uniqueCombinations) / 2, p5.height * 0.1)
            }
          }
          ++izzyNumber
        }
      }
      new p5.default(sketch, canvasRef.current)
    })
  }, [showUniqueCount])

  return <div ref={canvasRef} />
}
