import { useEffect, useRef, useState } from "react"
import { strokeColor } from "../../utils/darkMode"
import Slider from "../ui/Slider"

export default function FlwCircles() {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [depth, setDepth] = useState(5)
  const [numCirclesPerRing, setNumCirclesPerRing] = useState(5)
  const [scale, setScale] = useState(0.63)

  useEffect(() => {
    let myp5: any = null

    import('p5').then(p5 => {
      const s = (p5: any) => {
        p5.setup = () => {
          p5.createCanvas(720, 720)
          drawImageOnly()
          p5.noLoop()
        }

        const drawImageOnly = () => {
          p5.push()
          p5.stroke(strokeColor())
          p5.translate(p5.width * 0.5, p5.height * 0.5)
          p5.noFill()
          let size = p5.width * 0.45

          for (let d = 0; d < depth; ++d) {
            drawLayer(size)
            p5.rotate(p5.PI / numCirclesPerRing)
            size *= scale
          }
          p5.pop()
        }

        const drawLayer = (size: number) => {
          let circRadius = 1.0
          let polyVertexDistFromCenter = circRadius / Math.sin(p5.PI / numCirclesPerRing)
          const scaleToScreenFactor = size / (polyVertexDistFromCenter + circRadius)
          circRadius *= scaleToScreenFactor
          polyVertexDistFromCenter *= scaleToScreenFactor
          const diameter = circRadius * 2

          for (let circCtr = 0; circCtr < numCirclesPerRing; ++circCtr) {
            p5.ellipse(polyVertexDistFromCenter, 0, diameter, diameter)
            p5.rotate(p5.TWO_PI / numCirclesPerRing)
          }
          return polyVertexDistFromCenter - circRadius
        }
      }
      myp5 = new p5.default(s, canvasRef.current)
    })

    return () => {
      if (myp5) myp5.remove()
    }
  }, [depth, numCirclesPerRing, scale])

  return (
    <div>
      <Slider
        label="depth"
        sliderMin={1}
        sliderMax={30}
        initialValue={5}
        onChange={(value) => setDepth(value)}
      />
      <Slider
        label="# circles"
        sliderMin={3}
        sliderMax={50}
        initialValue={5}
        onChange={(value) => setNumCirclesPerRing(value)}
      />
      <Slider
        label="scale"
        sliderMin={0.1}
        sliderMax={0.99}
        initialValue={0.63}
        stepSize={0.001}
        onChange={(value) => setScale(value)}
      />
      <div ref={canvasRef} />
    </div>
  )
}
