import { useEffect, useRef, useState } from "react"
import { bgColor } from "../../utils/darkMode"
import Slider from "../ui/Slider"

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

export default function SpiralCircles() {
  const sketchRef = useRef<HTMLDivElement>(null)
  const [circlesPerRevolution, setCirclesPerRevolution] = useState(6)

  useEffect(() => {
    let myp5: any = null

    import('p5').then(p5 => {
      const s = (p5: any) => {
        p5.setup = () => {
          p5.createCanvas(720, 720)
        }

        p5.draw = () => {
          p5.background(bgColor())
          const theta = thetas[circlesPerRevolution]
          const radiusScalar = r[circlesPerRevolution]

          p5.translate(p5.width / 2, p5.height / 2)
          p5.scale(1, -1)
          p5.noFill()

          let pixelsPerUnit = p5.width * 3
          let angle = 0
          const distanceBetweenCentersScalar = Math.sqrt(
            (1 - radiusScalar * Math.cos(theta)) ** 2 +
            (radiusScalar * Math.sin(theta)) ** 2
          )
          let radius = pixelsPerUnit
          let circleDiameter = (2 * radius * distanceBetweenCentersScalar) / (1 + radiusScalar)

          while (circleDiameter > 0.5) {
            p5.noStroke()
            const xCenter = radius * Math.cos(angle)
            const yCenter = radius * Math.sin(angle)
            p5.fill(0, 100, 240, 150)
            p5.ellipse(xCenter, yCenter, circleDiameter, circleDiameter)
            angle += theta
            radius *= radiusScalar
            circleDiameter *= radiusScalar
          }
        }
      }
      myp5 = new p5.default(s, sketchRef.current)
    })

    return () => {
      if (myp5) myp5.remove()
    }
  }, [circlesPerRevolution])

  return (
    <div>
      <Slider
        label="Circles per revolution"
        sliderMin={3}
        sliderMax={20}
        initialValue={circlesPerRevolution}
        onChange={(value) => setCirclesPerRevolution(value)}
      />
      <div ref={sketchRef} />
    </div>
  )
}
