import { useState } from "react"

import SpanLabel from "@site/src/components/SpanLabel/label"

interface SliderProps extends Readonly<{
    label: string
    sliderMin: number
    sliderMax: number
    initialValue: number
    stepSize?: number
    onChange?: (value: number) => void
}> { }

export default function Slider(props: SliderProps) {
    const [value, setValue] = useState(props.initialValue);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = Number(e.target.value);
        setValue(newValue);
        if (props.onChange) {
            props.onChange(newValue);
        }
    };

    return (
        <>
            <label className="center">
                <span ><strong>{props.label} &nbsp;</strong></span>
                <input
                    id={props.label}
                    type="range"
                    className="width-300"
                    value={value}
                    onChange={handleChange}
                    min={props.sliderMin}
                    max={props.sliderMax}
                    step={props.stepSize || 1}
                />
                <span style={{ marginLeft: '10px', fontWeight: 'bold' }}>{value}</span>
            </label>
        </>
    );
}