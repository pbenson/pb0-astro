import { useEffect, useRef } from "react"
import { bgColor } from "../../utils/darkMode"

export default function Bresenham() {
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    import('p5').then(p5 => {
      const sketch = (p5: any) => {
        const cellWidth = 40
        let xUser: number, yUser: number

        p5.setup = () => {
          p5.createCanvas(722, 362)
        }

        p5.draw = () => {
          const x = Math.floor(p5.mouseX / cellWidth)
          const y = Math.floor(p5.mouseY / cellWidth)
          if (x === xUser && y === yUser) return

          p5.background(bgColor())
          xUser = x
          yUser = y
          const x1 = 2
          const y1 = 1
          drawGrid()
          drawCell(xUser, yUser, p5.color(127, 0, 0, 127))
          const bCoords = bresenhamCoordinates(xUser, yUser, x1, y1)
          for (const pt of bCoords) {
            drawCell(pt.x, pt.y, p5.color(224))
          }
          drawCell(x1, y1, p5.color(0, 0, 127, 127))
        }

        const bresenhamCoordinates = (x: number, y: number, x2: number, y2: number) => {
          const coordinatesArray: { x: number; y: number }[] = []
          const dx = Math.abs(x2 - x)
          const dy = Math.abs(y2 - y)
          const sx = x < x2 ? 1 : -1
          const sy = y < y2 ? 1 : -1
          let err = dx - dy

          while (!(x === x2 && y === y2)) {
            const e2 = err << 1
            if (e2 > -dy) {
              err -= dy
              x += sx
            }
            if (e2 < dx) {
              err += dx
              y += sy
            }
            coordinatesArray.push({ x, y })
          }
          return coordinatesArray
        }

        const drawCell = (x: number, y: number, color_: any) => {
          p5.noStroke()
          p5.fill(color_)
          p5.rect(x * cellWidth, y * cellWidth, cellWidth, cellWidth)
        }

        const drawGrid = () => {
          p5.stroke(200, 50)
          p5.strokeWeight(1)
          for (let x = 1; x < p5.width; x += cellWidth) {
            p5.line(x, 0, x, p5.height)
          }
          for (let y = 1; y < p5.height; y += cellWidth) {
            p5.line(0, y, p5.width, y)
          }
        }
      }
      new p5.default(sketch, canvasRef.current)
    })
  }, [])

  return <div ref={canvasRef} />
}
