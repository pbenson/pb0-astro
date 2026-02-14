import { useEffect, useRef, useState } from "react"
import Point from "./Point"
import LabeledInput from "./LabeledInput"
import { bgColor, strokeColorRgb } from "../../../utils/darkMode"
import { limitToLR } from "../../../utils/limitToLR"

interface FLSProps {
  initialTurns: string
}

export default function FixedLengthSegments(props: FLSProps) {
  const sketchRef = useRef(null);
  const [turns, setTurns] = useState(props.initialTurns || "LRL");

  useEffect(() => {
    let myp5: any = null;
    import('p5').then(p5 => {
      const s = (p5: any) => {
        let endPoints: Point[] = []
        let startingFrameCount = p5.frameCount
        let oldBackgroundColor = ''

        p5.setup = () => {
          p5.createCanvas(600, 600)
        }

        p5.draw = () => {
          if (bgColor() != oldBackgroundColor) {
            p5.background(bgColor())
            oldBackgroundColor = bgColor()
            startingFrameCount = p5.frameCount
            endPoints = []
          }
          const relativeFrameCount = p5.frameCount - startingFrameCount
          const theta: number = (relativeFrameCount * p5.PI) / 200
          if (theta > p5.TWO_PI) {
            return
          }

          p5.translate(p5.width / 2, p5.height / 2)
          p5.scale(1, -1)
          p5.stroke(...strokeColorRgb(), 10)
          const segmentLength = (Math.min(p5.width, p5.height) / 2 / turns.length) * 0.9

          let rotation = 0
          let x = -segmentLength
          let y = 0
          let nextX = 0
          let nextY = 0
          for (let i = 0; i < turns.length; ++i) {
            rotation += turns.charAt(i) === "L" ? theta : -theta
            x = nextX
            y = nextY
            nextX = x + segmentLength * Math.cos(rotation)
            nextY = y + segmentLength * Math.sin(rotation)
            p5.line(x, y, nextX, nextY)
            p5.ellipse(nextX, nextY, 1, 1)
          }
          endPoints.push(new Point(nextX, nextY))
          endPoints.forEach((p) => p.draw(p5))
        }
      }
      myp5 = new p5.default(s, sketchRef.current);
    });
    return () => {
      if (myp5) myp5.remove();
    };
  }, [turns]);

  return (
    <div className="center">
      <LabeledInput
        label="turns"
        id="turnSequence"
        value={turns}
        onChange={(e) => setTurns(limitToLR(e.target.value))}
      />
      <div ref={sketchRef} />
    </div>
  )
}
