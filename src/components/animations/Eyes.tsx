import { useState } from "react"

const width = 600
const height = 200
const cxHead = width / 2
const cyHead = height / 2
const rHead = height / 2

class Circle {
  cx: number
  cy: number
  constructor(cx: number, cy: number) {
    this.cx = cx
    this.cy = cy
  }
}

const leftEye = new Circle(width * 0.4, height * 0.4)
const rightEye = new Circle(width * 0.6, height * 0.4)
const rEye = height * 0.15
const rPupil = rEye * 0.5

const dist = (a: Circle, b: Circle) => Math.sqrt((a.cx - b.cx) ** 2 + (a.cy - b.cy) ** 2)

const positionPupil = (event: any, eye: Circle, pupil: Circle, masking: boolean) => {
  const rect = event.currentTarget.getBoundingClientRect()
  const mouse = { cx: event.clientX - rect.x, cy: event.clientY - rect.y }
  const distMouseToEye = dist(mouse, eye)
  const maxPupilDistFromCenter = rEye - rPupil * (masking ? 0.2 : 1)
  let fractionOfDistance = 1
  if (distMouseToEye > maxPupilDistFromCenter) {
    fractionOfDistance = maxPupilDistFromCenter / distMouseToEye
  }
  return {
    cx: eye.cx + fractionOfDistance * (mouse.cx - eye.cx),
    cy: eye.cy + fractionOfDistance * (mouse.cy - eye.cy)
  }
}

interface Props {
  masking?: boolean
}

export default function Eyes({ masking = false }: Props) {
  const [leftPupil, setLeftPupil] = useState(new Circle(width * 0.4, height * 0.4))
  const [rightPupil, setRightPupil] = useState(rightEye)

  const handleMouseMove = (event: any) => {
    setLeftPupil(positionPupil(event, leftEye, leftPupil, masking))
    setRightPupil(positionPupil(event, rightEye, rightPupil, masking))
  }

  return (
    <div onMouseMove={handleMouseMove} style={{ cursor: 'crosshair' }}>
      <svg width={width} height={height}>
        <mask id="eyeMask">
          <circle cx={leftEye.cx} cy={leftEye.cy} r={rEye} fill="white" />
          <circle cx={rightEye.cx} cy={rightEye.cy} r={rEye} fill="white" />
        </mask>

        <circle cx={cxHead} cy={cyHead} r={rHead} fill="orange" />
        <circle cx={leftEye.cx} cy={leftEye.cy} r={rEye} fill="white" />
        <circle cx={rightEye.cx} cy={rightEye.cy} r={rEye} fill="white" />
        <circle cx={leftPupil.cx} cy={leftPupil.cy} r={rPupil} fill="green" mask="url(#eyeMask)" />
        <circle cx={rightPupil.cx} cy={rightPupil.cy} r={rPupil} fill="blue" mask="url(#eyeMask)" />
      </svg>
    </div>
  )
}
