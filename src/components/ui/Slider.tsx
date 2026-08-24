import { useState } from "react"

interface SliderProps {
  label: string
  sliderMin: number
  sliderMax: number
  initialValue: number
  stepSize?: number
  onChange?: (value: number) => void
  /**
   * Render the readout for a value. Use when the raw number is not what the
   * reader needs — a stepped scale whose positions stand for something else,
   * or a value that wants a unit.
   */
  formatValue?: (value: number) => string
}

export default function Slider(props: SliderProps) {
  const [value, setValue] = useState(props.initialValue)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value)
    setValue(newValue)
    if (props.onChange) {
      props.onChange(newValue)
    }
  }

  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ minWidth: '150px', fontWeight: 600 }}>{props.label}</span>
        <input
          type="range"
          style={{ width: '200px' }}
          value={value}
          onChange={handleChange}
          min={props.sliderMin}
          max={props.sliderMax}
          step={props.stepSize || 1}
          // Without this a screen reader announces the raw position — "0,
          // minimum 0, maximum 3" — while the page shows the formatted value.
          aria-valuetext={props.formatValue ? props.formatValue(value) : undefined}
        />
        <span style={{ minWidth: '50px', fontWeight: 600 }}>
          {props.formatValue ? props.formatValue(value) : value}
        </span>
      </label>
    </div>
  )
}
