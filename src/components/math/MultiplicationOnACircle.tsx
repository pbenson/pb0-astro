import { useEffect, useRef, useState } from "react"
import { bgColor, strokeColorRgb } from "../../utils/darkMode"

interface EValueEvent extends React.ChangeEvent<HTMLInputElement> {}

const eValue = (e: EValueEvent): number => Number(e.target.value)

interface CircleSliderProps {
  label: string
  min: number
  max: number
  step: number
  onChange: (e: EValueEvent) => void
  valueGetter: () => string | number
}

function CircleSlider(props: CircleSliderProps) {
  return (
    <div style={{ marginBottom: '0.5rem' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ minWidth: '100px' }}>{props.label}</span>
        <input
          type="range"
          style={{ width: '200px' }}
          value={props.valueGetter()}
          onChange={props.onChange}
          min={props.min}
          max={props.max}
          step={props.step}
        />
        <span style={{ minWidth: '50px' }}>{props.valueGetter()}</span>
      </label>
    </div>
  )
}

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
      myp5 = new p5.default(s, sketchRef.current)
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

      <CircleSlider
        label="modulus"
        min={3}
        max={210}
        step={1}
        onChange={e => setModulus(eValue(e))}
        valueGetter={() => modulus}
      />

      <CircleSlider
        label="numerator"
        min={1}
        max={100}
        step={1}
        onChange={e => setNum(eValue(e))}
        valueGetter={() => num}
      />

      <CircleSlider
        label="denominator"
        min={1}
        max={12}
        step={2}
        onChange={e => setDen(eValue(e))}
        valueGetter={() => den}
      />

      <CircleSlider
        label="opacity"
        min={0}
        max={255}
        step={1}
        onChange={e => setOp(eValue(e))}
        valueGetter={() => op}
      />

      <CircleSlider
        label="separation"
        min={0}
        max={1}
        step={0.01}
        onChange={e => setSep(eValue(e))}
        valueGetter={() => sep}
      />

      <CircleSlider
        label="size"
        min={0.1}
        max={4}
        step={0.01}
        onChange={e => setSz(eValue(e))}
        valueGetter={() => sz}
      />
    </div>
  )
}
