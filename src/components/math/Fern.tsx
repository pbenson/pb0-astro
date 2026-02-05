import { useEffect, useRef } from "react"

export default function Fern() {
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    import('p5').then(p5 => {
      const sketch = (p5: any) => {
        let x = 0, y = 0
        const xMin = -2.182, xMax = 2.6558
        const yMin = 0, yMax = 9.9983
        let xScale: number, yScale: number

        const ITERATIONS_PER_FRAME = 1000

        function f1(x_n: number, y_n: number) {
          return { x: 0, y: 0.2 * y_n }
        }

        function f2(x_n: number, y_n: number) {
          return {
            x: 0.87 * x_n + 0.04 * y_n,
            y: -0.04 * x_n + 0.86 * y_n + 1.6
          }
        }

        function f3(x_n: number, y_n: number) {
          return {
            x: 0.2 * x_n - 0.26 * y_n,
            y: 0.23 * x_n + 0.22 * y_n + 1.6
          }
        }

        function f4(x_n: number, y_n: number) {
          return {
            x: -0.15 * x_n + 0.28 * y_n,
            y: 0.26 * x_n + 0.24 * y_n + 0.44
          }
        }

        p5.setup = () => {
          p5.createCanvas(750, 1000)
          const shrinkFactor = 0.75
          xScale = (p5.width / (xMax - xMin)) * shrinkFactor
          yScale = (p5.height / (yMax - yMin)) * shrinkFactor
        }

        p5.draw = () => {
          if (p5.frameCount > 1200) return
          p5.stroke(0, 127, 0)
          p5.translate((1.1 * p5.width * (0 - xMin)) / (xMax - xMin), p5.height * 0.9)
          for (let i = 0; i < ITERATIONS_PER_FRAME; ++i) {
            p5.point(x * xScale, -y * yScale)
            const r = Math.random()
            let f
            if (r < 0.01) f = f1
            else if (r < 0.86) f = f2
            else if (r < 0.93) f = f3
            else f = f4
            const xy = f(x, y)
            x = xy.x
            y = xy.y
          }
        }
      }
      new p5.default(sketch, canvasRef.current)
    })
  }, [])

  return <div ref={canvasRef} />
}
