import { useEffect, useRef, useState } from "react"
import { bgColor, strokeColorRgb } from "../../utils/darkMode"
import Slider from "../ui/Slider"

export default function MultiplicationOnACircle() {
  const sketchRef = useRef<HTMLDivElement>(null)
  const [modulus, setModulus] = useState(10)
  const [num, setNum] = useState(2)
  const [den, setDen] = useState(1)
  const [op, setOp] = useState(50)
  const [sep, setSep] = useState(0)
  const [sz, setSz] = useState(2)

  useEffect(() => {
    let myp5: any = null

    import('p5').then(p5 => {
      const s = (p5: any) => {
        p5.setup = () => {
          p5.createCanvas(600, 400)
          p5.background(bgColor())
          p5.drawCircleOnly()
          p5.noLoop()
        }

        const func = (x: number) => x

        p5.drawCircleOnly = () => {
          p5.noFill()
          p5.push()
          p5.stroke(...strokeColorRgb(), op)
          let r = p5.width * 0.15
          const mod = modulus
          const multiplier = num / den
          p5.translate(p5.width / 2, p5.height / 2)
          p5.scale(1, -1)
          r *= sz
          const xShift = r * sep
          const diameter = 2 * r
          p5.ellipse(-xShift, 0, diameter, diameter)
          p5.ellipse(xShift, 0, diameter, diameter)
          for (let i = 0; i < mod * den; ++i) {
            const fracOfCirc = i / modulus
            const a1 = fracOfCirc * Math.PI * 2
            let a1MutatedByFunc: number
            if (fracOfCirc < 0.5) {
              a1MutatedByFunc = ((func(fracOfCirc * 2) - func(0)) / (func(1) - func(0))) * Math.PI
            } else {
              a1MutatedByFunc =
                (2 - (func((1 - fracOfCirc) * 2) - func(0)) / (func(1) - func(0))) * Math.PI
            }
            const a2 = a1MutatedByFunc * multiplier

            const x1 = r * Math.cos(a1) - xShift
            const y1 = r * Math.sin(a1)
            const x2 = r * Math.cos(a2) + xShift
            const y2 = r * Math.sin(a2)
            const xMid = (x1 + x2) / 2
            const yMid = (y1 + y2) / 2
            const segmentScale = 1
            p5.line(
              xMid + (x1 - xMid) * segmentScale,
              yMid + (y1 - yMid) * segmentScale,
              xMid + (x2 - xMid) * segmentScale,
              yMid + (y2 - yMid) * segmentScale
            )
          }
          p5.pop()
        }
      }

      if (myp5) {
        myp5.remove()
      }
      myp5 = new p5.default(s, sketchRef.current ?? undefined)
    })

    return () => {
      if (myp5) {
        myp5.remove()
      }
    }
  }, [modulus, num, den, op, sep, sz])

  return (
    <div>
      <div ref={sketchRef} />

      <Slider
        label="modulus"
        sliderMin={3}
        sliderMax={210}
        stepSize={1}
        value={modulus}
        onChange={setModulus}
      />

      <Slider
        label="numerator"
        sliderMin={1}
        sliderMax={100}
        stepSize={1}
        value={num}
        onChange={setNum}
      />

      <Slider
        label="denominator"
        sliderMin={1}
        sliderMax={12}
        stepSize={2}
        value={den}
        onChange={setDen}
      />

      <Slider
        label="opacity"
        sliderMin={0}
        sliderMax={255}
        stepSize={1}
        value={op}
        onChange={setOp}
      />

      <Slider
        label="separation"
        sliderMin={0}
        sliderMax={1}
        stepSize={0.01}
        value={sep}
        onChange={setSep}
      />

      <Slider
        label="size"
        sliderMin={0.1}
        sliderMax={4}
        stepSize={0.01}
        value={sz}
        onChange={setSz}
      />

    </div>
  )
}
