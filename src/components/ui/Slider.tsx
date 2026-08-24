import { useState, type ReactNode } from "react"

interface SliderProps {
  /** Shown beside the track. A node, so a label can carry its own emphasis. */
  label: ReactNode
  sliderMin: number
  sliderMax: number
  stepSize?: number
  onChange?: (value: number) => void
  /**
   * Starting position when the slider owns its value. Ignored when `value` is
   * given — that makes the component controlled.
   */
  initialValue?: number
  /**
   * Drive the slider from the parent's state. Needed wherever something other
   * than the slider can change the number: a reset button, a linked control,
   * a value clamped after the fact.
   */
  value?: number
  /**
   * Render the readout for a value. Use when the raw number is not what the
   * reader needs — a stepped scale whose positions stand for something else,
   * or a value that wants a unit.
   */
  formatValue?: (value: number) => string
  /** Set when the readout is carried by the label instead of the right column. */
  hideValue?: boolean
  /** Falls back to the label; set it when the label is not a plain string. */
  ariaLabel?: string
}

export default function Slider(props: SliderProps) {
  const [ownValue, setOwnValue] = useState(props.initialValue ?? props.sliderMin)
  const controlled = props.value !== undefined
  const value = controlled ? (props.value as number) : ownValue

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value)
    if (!controlled) setOwnValue(newValue)
    props.onChange?.(newValue)
  }

  const readout = props.formatValue ? props.formatValue(value) : String(value)

  return (
    <div className="slider">
      <label className="slider-row">
        <span className="slider-label">{props.label}</span>
        <input
          type="range"
          className="slider-track"
          value={value}
          onChange={handleChange}
          min={props.sliderMin}
          max={props.sliderMax}
          step={props.stepSize || 1}
          aria-label={props.ariaLabel ?? (typeof props.label === "string" ? undefined : "Slider")}
          // Without this a screen reader announces the raw position — "0,
          // minimum 0, maximum 3" — while the page shows the formatted value.
          aria-valuetext={props.formatValue ? readout : undefined}
        />
        {!props.hideValue && <span className="slider-value">{readout}</span>}
      </label>
    </div>
  )
}
