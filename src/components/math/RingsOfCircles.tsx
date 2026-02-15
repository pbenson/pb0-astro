import { useEffect, useRef, useState } from "react"
import { bgColor } from "../../utils/darkMode"
import Slider from "../ui/Slider"

const framesPerDilation = 120

export default function RingsOfCircles() {
  const sketchRef = useRef<HTMLDivElement>(null)

  const [circlesPerRing, setCirclesPerRing] = useState(6)
  const [showSpiral, setShowSpiral] = useState(false)
  const [animateDilation, setAnimateDilation] = useState(false)

  useEffect(() => {
    let myp5: any = null

    import('p5').then(p5 => {
      const s = (p5: any) => {
        let dilationCount = 0

        p5.setup = () => {
          p5.createCanvas(720, 720)
        }

        p5.draw = () => {
          p5.background(bgColor())
          p5.translate(p5.width / 2, p5.height / 2)
          p5.noFill()
          const beta = Math.PI / circlesPerRing
          const a = Math.pow(Math.sin(beta), -2) - 1
          const b = -2.0 * (Math.sin(beta) + 1 / Math.tan(beta))
          const c = Math.pow(Math.cos(beta), 2)
          const reductionFactor = (-b - Math.sqrt(b * b - 4 * a * c)) / 2.0 / a / Math.sin(beta)
          let scaling = 1
          if (animateDilation) {
            const framesFromStartOfCycle = p5.frameCount % framesPerDilation
            if (framesFromStartOfCycle === 0) {
              ++dilationCount
            }
            scaling = Math.pow(
              1.0 / reductionFactor,
              (2.0 * framesFromStartOfCycle) / framesPerDilation
            )
          }
          const ringRadius = 2 * (p5.dist(0, 0, p5.width, p5.height) / reductionFactor) * scaling
          let circleDiameter = 2 * Math.tan(beta) * ringRadius
          let circleCenterRadius = (1 / Math.cos(beta)) * ringRadius
          while (circleCenterRadius > 0.5) {
            p5.noStroke()
            for (let i = 0; i < circlesPerRing; ++i) {
              const isPartOfSpiral = showSpiral && (i === dilationCount % circlesPerRing)
              if (isPartOfSpiral) {
                p5.fill(127, 0, 0)
              } else {
                p5.fill(252, 102, 0)
              }
              p5.ellipse(circleCenterRadius, 0, circleDiameter, circleDiameter)
              p5.rotate((2 * Math.PI) / circlesPerRing)
            }
            p5.rotate(Math.PI / circlesPerRing)
            circleDiameter *= reductionFactor
            circleCenterRadius *= reductionFactor
          }
        }
      }
      myp5 = new p5.default(s, sketchRef.current)
    })

    return () => {
      if (myp5) {
        myp5.remove()
      }
    }
  }, [circlesPerRing, showSpiral, animateDilation])

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

        <input
          type="checkbox"
          checked={showSpiral}
          onChange={() => setShowSpiral(!showSpiral)} />
        &nbsp; Show spiral &nbsp; &nbsp;

        <input
          type="checkbox"
          checked={animateDilation}
          onChange={() => setAnimateDilation(!animateDilation)} />
        &nbsp; Animate dilation
      </div>

      <div ref={sketchRef} />
    </>
  )
}
