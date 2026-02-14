import { useEffect, useRef, useState } from "react"
import { inDarkMode, bgColor } from "../../utils/darkMode"
import Slider from "../ui/Slider"
import Input from "../shared/Input"

const dotSize = 10
const tickFormatter = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 3 })

interface Props {
  showNumberOfData: boolean
  observations?: string
}

export default function QuantileExplorer(props: Props) {
  const sketchRef = useRef(null);
  const [numberData, setNumberData] = useState(5)
  const [numBuckets, setNumBuckets] = useState(4)
  const [observations, setObservations] = useState(props.observations || "50, 100,100,100,300,300")

  const { showNumberOfData } = props

  useEffect(() => {
    let myp5: any = null;
    import('p5').then(p5 => {
      const s = (p5: any) => {
        let observationCount: number

        const color1 = inDarkMode() ? [255, 200, 60] : [255, 140, 0, 200]
        const color2 = inDarkMode() ? [200, 200, 255] : [0, 80, 200, 200]
        let oneBasedColorIndices: number[] = []

        p5.setup = () => {
          p5.createCanvas(600, 100)
          if (observations !== undefined) {
            applyObservations()
          }
        }

        const actualNumberData = () => {
          if (showNumberOfData) {
            return numberData
          }
          return observationCount
        }

        const applyObservations = () => {
          const observationData = observations
            .trim()
            .replace(/\n/g, ' ')
            .replace(/\t/g, ' ')
            .replace(/,/g, ' ')
            .replace(/\s+/g, ' ')
            .split(' ')
            .map((x) => parseInt(x))
            .sort((a, b) => a - b)
          oneBasedColorIndices = []
          let previousObservation = observationData[0]
          for (let i = 1; i < observationData.length; ++i) {
            const observation = observationData[i]
            if (observation > previousObservation) {
              oneBasedColorIndices.push(i)
            }
            previousObservation = observation
          }
          observationCount = observationData.length
        }

        p5.draw = () => {
          p5.background(bgColor())
          p5.translate(0, p5.height / 2)

          const xLeft = p5.width * 0.1
          const xRight = p5.width - xLeft
          const axisLength = xRight - xLeft
          const tick = axisLength / numBuckets
          const tickHeight = tick / 15

          p5.strokeWeight(2)
          p5.stroke(192, 80)
          p5.line(xLeft, 0, xRight, 0)
          for (let i = 0; i <= numBuckets; ++i) {
            const x = xLeft + tick * i
            p5.line(x, tickHeight, x, -tickHeight)
          }

          p5.noStroke()
          p5.fill(127)
          p5.textSize(16)
          for (let i = 0; i < numBuckets - 1; ++i) {
            const label = tickFormatter.format((i + 1.0) / numBuckets)
            p5.text(label, xLeft + tick * (i + 1) - p5.textWidth(label) * 0.5, 25)
          }

          p5.textSize(20)
          for (let i = 0; i < numBuckets; ++i) {
            const label = '' + (i + 1)
            p5.text(label, xLeft + tick * (i + 0.5) - p5.textWidth(label) * 0.5, -20)
          }
          p5.textSize(12)

          const indicesToChange = showNumberOfData
            ? Array.from(Array(actualNumberData() + 1).keys())
            : oneBasedColorIndices.map((index) => index + 1)
          p5.noStroke()
          let useColor1 = true
          for (let i = 1; i <= actualNumberData(); ++i) {
            if (indicesToChange.includes(i)) {
              useColor1 = !useColor1
            }
            if (useColor1) {
              p5.fill(...color1)
            } else {
              p5.fill(...color2)
            }
            let x = xLeft + (axisLength / (actualNumberData() + 1)) * i
            p5.rectMode(p5.CENTER)
            if (useColor1) {
              p5.ellipse(x, 0, dotSize, dotSize)
            } else {
              p5.push()
              p5.translate(x, 0)
              p5.rect(0, 0, dotSize * 0.89, dotSize * 0.89)
              p5.pop()
            }
          }
        }
      }
      myp5 = new p5.default(s, sketchRef.current);
    });
    return () => {
      if (myp5) myp5.remove();
    };
  }, [numberData, numBuckets, observations]);

  return (
    <div>
      <div ref={sketchRef} />
      <Slider
        label="number of quantiles"
        sliderMin={2}
        sliderMax={10}
        initialValue={numBuckets}
        onChange={(value: number) => setNumBuckets(value)}
      />
      {showNumberOfData && (
        <Slider
          label="number of data"
          sliderMin={1}
          sliderMax={10}
          initialValue={numberData}
          onChange={(value: number) => setNumberData(value)}
        />
      )}
      {!showNumberOfData && (
        <Input
          label="observations"
          id="observations"
          value={observations}
          onChange={e => setObservations(e.target.value)}
        />
      )}
    </div>
  )
}
