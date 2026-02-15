import { useEffect, useRef, useState } from "react"
import Point from "./Point"
import TurnToggleRow from "./TurnToggleRow"
import NumberInputRow from "./NumberInputRow"
import { bgColor, strokeColorRgb } from "../../../utils/darkMode"

interface VLSProps {
  initialTurns: string
  initialLengths: string
}

function parseLengths(s: string): number[] {
  return s.split(",").map(v => parseInt(v, 10) || 1)
}

export default function VariableLengthSegments(props: VLSProps) {
  const sketchRef = useRef(null);
  const [turns, setTurns] = useState(props.initialTurns || "LRR");
  const [lengths, setLengths] = useState<number[]>(() => parseLengths(props.initialLengths || "2,1,3"));

  const handleAdd = () => {
    setLengths(prev => [...prev, 1]);
  };

  const handleRemove = (index: number) => {
    setLengths(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    let myp5: any = null;
    import('p5').then(p5 => {
      const s = (p5: any) => {
        let endPoints: Point[] = []
        let startingFrameCount = p5.frameCount
        let oldBackgroundColor = ''

        p5.setup = () => {
          p5.createCanvas(900, 600)
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

          p5.translate(p5.width * 0.3, p5.height / 2)
          p5.scale(1, -1)
          p5.stroke(...strokeColorRgb(), 10)
          const unitSegmentLength =
            (Math.min(p5.width, p5.height) / 2 / lengths.reduce((a: number, b: number) => a + b, 0)) * 0.9

          let rotation = 0
          let x = 0
          let y = 0
          let nextX = 0
          let nextY = 0
          for (let i = 0; i < turns.length; ++i) {
            rotation += turns.charAt(i) === "L" ? theta : -theta
            x = nextX
            y = nextY
            const segmentUnits = lengths[i] ?? 1
            nextX = x + segmentUnits * unitSegmentLength * Math.cos(rotation)
            nextY = y + segmentUnits * unitSegmentLength * Math.sin(rotation)
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
  }, [turns, lengths]);

  return (
    <div className="center">
      <TurnToggleRow turns={turns} onChange={setTurns} onAdd={handleAdd} onRemove={handleRemove} />
      <NumberInputRow label="lengths" values={lengths} onChange={setLengths} />
      <div ref={sketchRef} />
    </div>
  )
}
